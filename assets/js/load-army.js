document.addEventListener("DOMContentLoaded", async () => {
  const localJsonURL = "assets/json/campaign.json";
  const armyForgeId = document.getElementById("army-forge-id").textContent;
  const localStorageKey = `armyData_${armyForgeId}`;
  const tabStorageKey = `activeTab_${armyForgeId}`;
  const cacheDuration = 3600000;
  const refreshButton = document.getElementById("refresh-button");

  // Constants for action types
  const ACTIONS = {
    NONE: "none",
    HOLD: "hold",
    ADVANCE: "advance",
    RUSH: "rush",
    CHARGE: "charge",
    UNSHAKEN: "unshaken",
    CHARGED_IN_MELEE: "charged_in_melee",
  };

  // Morale status constants
  const MORALE_STATUS = {
    READY: "ready",
    SHAKEN: "shaken",
    ROUTED: "routed",
  };

  // Add fatigue constants
  const FATIGUE_STATUS = {
    FRESH: "fresh",
    FATIGUED: "fatigued",
  };

  // Add these functions for fatigue tracking
  function saveUnitFatigueStatus(
    unitId,
    armyId,
    status = FATIGUE_STATUS.FRESH
  ) {
    const key = `fatigue_${armyId}_${unitId}`;
    localStorage.setItem(key, status);
  }

  function getUnitFatigueStatus(unitId, armyId) {
    const key = `fatigue_${armyId}_${unitId}`;
    const status = localStorage.getItem(key) || FATIGUE_STATUS.FRESH;
    return status;
  }

  function resetAllFatigueStatuses(armyId) {
    const unitCards = document.querySelectorAll("[id^='unit-']");

    unitCards.forEach((card) => {
      const unitId = card.id.replace("unit-", "");
      // Reset fatigue status
      saveUnitFatigueStatus(unitId, armyId, FATIGUE_STATUS.FRESH);

      // Update UI
      updateFatigueStatusUI(card, FATIGUE_STATUS.FRESH);
    });
  }

  /**
   * Update the fatigue status UI
   * @param {HTMLElement} unitCard - The unit card element
   * @param {string} fatigueStatus - Fatigue status (from FATIGUE_STATUS object)
   */
  function updateFatigueStatusUI(unitCard, fatigueStatus) {
    // Find the fatigue badge
    const fatigueBadge = unitCard.querySelector(".fatigue-badge");
    if (!fatigueBadge) return;

    // Update based on fatigue status
    if (fatigueStatus === FATIGUE_STATUS.FATIGUED) {
      fatigueBadge.className = "fatigue-badge btn btn-sm btn-warning w-50";
      fatigueBadge.innerHTML = '<i class="bi bi-battery-half"></i> Fatigued';
    } else {
      fatigueBadge.className = "fatigue-badge btn btn-sm btn-success w-50";
      fatigueBadge.innerHTML = '<i class="bi bi-lightning-charge"></i> Fresh';
    }
  }

  /**
   * Process a unit being charged in melee
   * @param {string} unitId - Unit's selection ID
   * @param {string} armyId - Army ID
   */
  function processChargedInMelee(unitId, armyId) {
    // Get the unit card
    const unitCard = document.getElementById(`unit-${unitId}`);
    if (!unitCard) return;

    // Get unit data
    const cacheKey = `armyData_${armyId}`;
    const cachedData = JSON.parse(localStorage.getItem(cacheKey));
    if (!cachedData || !cachedData.data) return;

    const unit = cachedData.data.units.find((u) => u.selectionId === unitId);
    if (!unit) return;

    // Show strike back prompt
    showStrikeBackPrompt(unitId, armyId, unit.customName || unit.name);
  }

  /**
   * Show prompt asking if unit struck back when charged
   * @param {string} unitId - Unit's selection ID
   * @param {string} armyId - Army ID
   * @param {string} unitName - Name of the unit
   */
  function showStrikeBackPrompt(unitId, armyId, unitName) {
    const toastContainer = document.getElementById("toast-container");
    if (!toastContainer) return;

    const toast = document.createElement("div");
    toast.className =
      "toast strike-back-toast align-items-center bg-body border-0";
    toast.role = "alert";
    toast.ariaLive = "assertive";
    toast.ariaAtomic = "true";
    toast.style.marginBottom = "10px";

    toast.innerHTML = `
    <div class="d-flex flex-column">
      <div class="toast-header bg-dark text-white">
        <strong class="me-auto">Strike Back</strong>
        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
      <div class="toast-body">
        <p><strong>${unitName}</strong> was charged in melee. Did this unit strike back?</p>
        <div class="d-flex justify-content-between">
          <button class="btn btn-success strike-back-yes-btn">Yes, Struck Back</button>
          <button class="btn btn-secondary strike-back-no-btn">No, Did Not Strike</button>
        </div>
      </div>
    </div>
  `;

    toastContainer.appendChild(toast);
    const bsToast = new bootstrap.Toast(toast, { autohide: false });
    bsToast.show();

    // Add event listeners for buttons
    const strikeBackYesButton = toast.querySelector(".strike-back-yes-btn");
    const strikeBackNoButton = toast.querySelector(".strike-back-no-btn");

    strikeBackYesButton.addEventListener("click", function () {
      // Unit struck back, so mark as fatigued
      saveUnitFatigueStatus(unitId, armyId, FATIGUE_STATUS.FATIGUED);
      updateFatigueStatusUI(
        document.getElementById(`unit-${unitId}`),
        FATIGUE_STATUS.FATIGUED
      );

      // Show notification about fatigue
      showToast(
        "Unit Fatigued",
        `${unitName} is now fatigued and will only hit on 6s in melee for the rest of this round.`,
        "warning"
      );

      // Show melee result prompt
      showMeleeResultPrompt(unitId, armyId, unitName);

      // Close this toast
      bsToast.hide();
      setTimeout(() => toastContainer.removeChild(toast), 500);
    });

    strikeBackNoButton.addEventListener("click", function () {
      // Unit did not strike back, but still need to check melee result
      showMeleeResultPrompt(unitId, armyId, unitName);

      // Close this toast
      bsToast.hide();
      setTimeout(() => toastContainer.removeChild(toast), 500);
    });
  }

  // Define handleRefreshData early to avoid reference error
  function handleRefreshData() {
    console.log("Refreshing data...");
    clearCachedData(localStorageKey);
    initializeArmy();
  }

  function clearCachedData(localStorageKey) {
    localStorage.removeItem(localStorageKey);
  }

  // Get all tab elements
  const tabElements = document.querySelectorAll('[data-bs-toggle="tab"]');

  // Initialize tabs with stored value or default to 'nav-units'
  const storedTab = localStorage.getItem(tabStorageKey);
  if (storedTab) {
    // Find the tab button for the stored tab
    const tabButton = document.querySelector(
      `[data-bs-target="#${storedTab}"]`
    );
    if (tabButton) {
      // Create a new bootstrap tab instance and show it
      const tab = new bootstrap.Tab(tabButton);
      tab.show();
    }
  }

  // Add event listener for tab changes
  tabElements.forEach((tabElement) => {
    tabElement.addEventListener("shown.bs.tab", (event) => {
      // Get the ID of the newly activated tab pane
      const activeTabId = event.target
        .getAttribute("data-bs-target")
        .replace("#", "");
      // Store it in localStorage
      localStorage.setItem(tabStorageKey, activeTabId);
    });
  });

  // Add the refresh button event listener AFTER defining handleRefreshData
  refreshButton.addEventListener("click", handleRefreshData);

  // Start the initialization
  initializeArmy();

  /**
   * Gets the AP value string from weapon special rules
   * @param {Array} specialRules - Special rules array from a weapon
   * @returns {string} - AP value or empty string if none
   */
  function getAPValueString(specialRules) {
    if (!specialRules || !specialRules.length) return "";

    const apRule = specialRules.find((rule) => rule.name === "AP");
    return apRule ? apRule.rating : "";
  }

  /**
   * Gets the Tough value for a unit, combining base and upgrade values
   * @param {Object} unit - The unit object
   * @returns {number} - Total Tough value
   */
  function getToughValue(unit) {
    // Check base rules for Tough
    const baseToughRule = unit.rules.find((rule) => rule.name === "Tough");
    let toughValue =
      baseToughRule && baseToughRule.rating
        ? parseInt(baseToughRule.rating)
        : 0;

    // Check loadout items for additional Tough values
    if (unit.loadout) {
      for (const item of unit.loadout) {
        // Direct content array in loadout items
        if (item.content && Array.isArray(item.content)) {
          for (const contentItem of item.content) {
            if (contentItem.name === "Tough" && contentItem.rating) {
              toughValue += parseInt(contentItem.rating);
            }
          }
        }
      }
    }

    return toughValue;
  }

  /**
   * Calculates total hit points for a unit
   * @param {Object} unit - The unit object
   * @returns {number} - Total hit points
   */
  function calculateTotalHitPoints(unit) {
    // Get the model count
    const modelCount = parseInt(unit.size) || 1;

    // Use our fixed getToughValue function to get the correct tough value
    const toughValue = getToughValue(unit);

    // Calculate total hit points
    if (toughValue > 0) {
      // For units with Tough, each model has Tough value as HP
      return modelCount * toughValue;
    } else {
      // For units without Tough, each model has 1 HP
      return modelCount;
    }
  }

  /**
   * Formats special rules into a string (excluding AP)
   * @param {Array} specialRules - Special rules array from a weapon
   * @returns {string} - Formatted special rules string or empty string if none
   */
  function formatSpecialRulesString(specialRules) {
    if (!specialRules || !specialRules.length) return "";

    return specialRules
      .filter((rule) => rule.name.toUpperCase() !== "AP")
      .map((rule) => rule.name + (rule.rating ? `(${rule.rating})` : ""))
      .join(",");
  }

  /**
   * Gets the AP value from weapon special rules for display
   * @param {Array} specialRules - Special rules array from a weapon
   * @returns {string} - AP value or "-" if none
   */
  function getAPValue(specialRules) {
    if (!specialRules || !specialRules.length) return "-";

    const apRule = specialRules.find((rule) => rule.name === "AP");
    return apRule ? apRule.rating : "-";
  }

  /**
   * Formats special rules for display, excluding AP
   * @param {Array} specialRules - Special rules array from a weapon
   * @returns {string} - Formatted special rules or "-" if none
   */
  function formatSpecialRules(specialRules) {
    if (!specialRules || !specialRules.length) return "-";

    return (
      specialRules
        .filter((rule) => rule.name.toUpperCase() !== "AP")
        .map((rule) => rule.name + (rule.rating ? `(${rule.rating})` : ""))
        .join(", ") || "-"
    );
  }

  /**
   * Handles refreshing data from API
   */
  function handleRefreshData() {
    console.log("Refreshing data...");
    clearCachedData(localStorageKey);
    initializeArmy();
  }

  /**
   * Clears cached data
   * @param {string} localStorageKey - Storage key to clear
   */
  function clearCachedData(localStorageKey) {
    localStorage.removeItem(localStorageKey);
  }

  /**
   * Collects and processes all weapons from a unit, combining duplicates
   * @param {Object} unit - The unit object from the Army Forge data
   * @returns {Array} - Array of processed weapon objects with proper counts
   */
  function collectAndProcessWeapons(unit) {
    // Collect all weapons from all sources
    const allWeapons = [];

    // Step 1: Add direct weapons from loadout
    if (unit.loadout) {
      const directWeapons = unit.loadout.filter(
        (item) => item.type === "ArmyBookWeapon"
      );
      allWeapons.push(...directWeapons);

      // Step 2: Add weapons from item content (like Forest Dragon's weapons)
      unit.loadout.forEach((item) => {
        if (item.type === "ArmyBookItem" && item.content) {
          const weaponsFromItem = item.content.filter(
            (content) => content.type === "ArmyBookWeapon"
          );
          allWeapons.push(...weaponsFromItem);
        }
      });
    }

    // Step 3: Create a map to combine identical weapons
    const weaponMap = {};

    // Calculate the multiplier for combined units
    const combinedMultiplier = unit.isCombinedUnit ? unit.combinedCount : 1;

    allWeapons.forEach((weapon) => {
      // Create a unique key for each weapon type
      // This key combines all relevant properties that would make weapons distinct
      const weaponKey = [
        weapon.name,
        weapon.range || 0,
        weapon.attacks || 1,
        getAPValueString(weapon.specialRules),
        formatSpecialRulesString(weapon.specialRules),
      ].join("|");

      // Calculate the weapon count considering combined units
      const weaponCount = weapon.count || 1;

      if (!weaponMap[weaponKey]) {
        // First time seeing this weapon - create entry with count
        weaponMap[weaponKey] = {
          ...weapon,
          count: weaponCount * combinedMultiplier,
        };
      } else {
        // This is a duplicate - add to the count
        weaponMap[weaponKey].count += weaponCount * combinedMultiplier;
      }
    });

    // Step 4: Convert the map back to an array and sort by weapon name
    return Object.values(weaponMap).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }

  /**
   * Creates the weapons table HTML for display in the unit card
   * @param {Array} processedWeapons - Array of processed weapon objects
   * @returns {HTMLElement} - The weapons table element
   */
  function createWeaponsTable(processedWeapons) {
    // Helper for element creation
    const createEl = (
      tag,
      { classes = [], text = "", html = "", id = "" } = {}
    ) => {
      const el = document.createElement(tag);
      if (classes.length) el.classList.add(...classes);
      if (id) el.id = id;
      if (text) el.textContent = text;
      if (html) el.innerHTML = html;
      return el;
    };

    // Create the weapons table with styling classes
    const weaponsTable = createEl("table", {
      classes: [
        "table",
        "table-sm",
        "table-hover",
        "table-striped",
        "table-body",
        "table-responsive",
      ],
    });

    // Build the table header
    const weaponsThead = createEl("thead");
    const weaponsHeaderRow = createEl("tr");
    ["Weapon", "Range", "Attack", "AP", "Special"].forEach((text) => {
      weaponsHeaderRow.appendChild(createEl("th", { text }));
    });
    weaponsThead.appendChild(weaponsHeaderRow);
    weaponsTable.appendChild(weaponsThead);

    // Build the table body
    const weaponsTbody = createEl("tbody", {
      classes: ["table-group-divider"],
    });

    // Add rows for each processed weapon
    processedWeapons.forEach((weapon) => {
      const row = createEl("tr");

      // Weapon cell (e.g., "4x Shotgun")
      const weaponCount = weapon.count > 1 ? `${weapon.count}× ` : "";
      row.appendChild(createEl("td", { text: `${weaponCount}${weapon.name}` }));

      // Range cell (centered)
      const rangeCell = createEl("td", {
        text: weapon.range ? `${weapon.range}"` : "-",
      });
      rangeCell.style.textAlign = "center";
      row.appendChild(rangeCell);

      // Attack cell (centered, prefixed with "A")
      const attackCell = createEl("td", {
        text: weapon.attacks ? `A${weapon.attacks}` : "-",
      });
      attackCell.style.textAlign = "center";
      row.appendChild(attackCell);

      // AP cell (centered)
      const apCell = createEl("td");
      apCell.style.textAlign = "center";
      apCell.textContent = getAPValue(weapon.specialRules);
      row.appendChild(apCell);

      // Special cell (centered, joining special rule names that aren't AP)
      const specialCell = createEl("td");
      specialCell.style.textAlign = "center";
      specialCell.classList.add("allow-definitions");
      specialCell.textContent = formatSpecialRules(weapon.specialRules);
      row.appendChild(specialCell);

      weaponsTbody.appendChild(row);
    });

    weaponsTable.appendChild(weaponsTbody);
    return weaponsTable;
  }

  /**
   * Store current hit points for a unit
   * @param {string} unitId - Unit's selection ID
   * @param {string} armyId - Army ID
   * @param {number} currentHP - Current hit points
   * @param {number} maxHP - Maximum hit points
   */
  function saveHitPoints(unitId, armyId, currentHP, maxHP) {
    const key = `hit_points_${armyId}_${unitId}`;
    localStorage.setItem(
      key,
      JSON.stringify({
        current: currentHP,
        max: maxHP,
      })
    );
  }

  /**
   * Get current hit points for a unit
   * @param {string} unitId - Unit's selection ID
   * @param {string} armyId - Army ID
   * @returns {Object|null} - Hit points data or null if not found
   */
  function getHitPoints(unitId, armyId) {
    const key = `hit_points_${armyId}_${unitId}`;
    const storedHP = localStorage.getItem(key);

    if (storedHP) {
      return JSON.parse(storedHP);
    }
    return null;
  }

  /**
   * Initialize hit points for a unit
   * @param {Object} unit - The unit object
   * @param {string} armyId - Army ID
   * @returns {Object} - Hit points data
   */
  function initializeHitPoints(unit, armyId) {
    const unitId = unit.selectionId;
    const toughValue = getToughValue(unit);
    const modelCount = parseInt(unit.size) || 1;
    const maxHP = calculateTotalHitPoints(unit);

    // Check if we already have hit points stored
    const storedHP = getHitPoints(unitId, armyId);

    if (!storedHP) {
      // Initialize at full health
      saveHitPoints(unitId, armyId, maxHP, maxHP);
      return { current: maxHP, max: maxHP };
    }

    // If max HP has changed (unit was upgraded/downgraded),
    // reset current HP to new max
    if (storedHP.max !== maxHP) {
      saveHitPoints(unitId, armyId, maxHP, maxHP);
      return { current: maxHP, max: maxHP };
    }

    return storedHP;
  }

  /**
   * Reset all units' hit points to full
   * @param {string} armyId - Army ID
   */
  function resetAllHitPoints(armyId) {
    const unitCards = document.querySelectorAll("[id^='unit-']");

    unitCards.forEach((card) => {
      const unitId = card.id.replace("unit-", "");
      const hpData = getHitPoints(unitId, armyId);

      if (hpData) {
        // Reset to max HP
        saveHitPoints(unitId, armyId, hpData.max, hpData.max);

        // Update UI
        const hpDisplay = card.querySelector(".hp-current");
        if (hpDisplay) {
          hpDisplay.textContent = hpData.max;
        }

        // Update progress bar
        const progressBar = card.querySelector(".hp-progress-bar");
        if (progressBar) {
          progressBar.style.width = "100%";
          progressBar.classList.remove("bg-danger", "bg-warning");
          progressBar.classList.add("bg-success");
        }

        // Remove the red border from the card
        const cardElement = card.querySelector(".card");
        if (cardElement) {
          cardElement.classList.remove("border-danger");
        }
      }
    });
  }

  /**
   * Add hit points UI to unit card
   * @param {HTMLElement} unitCard - The unit card element
   * @param {Object} unit - The unit object
   * @param {string} armyForgeId - Army ID
   */
  function addHitPointsUI(unitCard, unit, armyForgeId) {
    // Initialize hit points
    const hpData = initializeHitPoints(unit, armyForgeId);
    const modelCount = parseInt(unit.size) || 1;
    const toughValue = getToughValue(unit);
    const unitId = unit.selectionId;

    // Create hit points container
    const hpContainer = document.createElement("div");
    hpContainer.className =
      "hit-points-container d-flex justify-content-between align-items-center mb-2";

    // Create HP label
    let hpLabel = document.createElement("span");
    if (toughValue > 0) {
      hpLabel.innerHTML = `<i class="bi bi-heart-fill text-danger"></i> HP (${modelCount} models, Tough ${toughValue})`;
    } else {
      hpLabel.innerHTML = `<i class="bi bi-heart-fill text-danger"></i> HP (${modelCount} models)`;
    }
    hpContainer.appendChild(hpLabel);

    // Create HP controls
    const hpControls = document.createElement("div");
    hpControls.className = "d-flex align-items-center";

    // Decrease HP button
    const decreaseBtn = document.createElement("button");
    decreaseBtn.className = "btn btn-sm btn-danger me-2";
    decreaseBtn.innerHTML = "<i class='bi bi-dash'></i>";
    decreaseBtn.addEventListener("click", function () {
      if (hpData.current > 0) {
        hpData.current--;
        saveHitPoints(unitId, armyForgeId, hpData.current, hpData.max);
        updateHPDisplay();
      }
    });
    hpControls.appendChild(decreaseBtn);

    // HP display
    const hpDisplay = document.createElement("div");
    hpDisplay.className = "d-flex flex-column align-items-center me-2";

    const hpText = document.createElement("div");
    hpText.className = "hp-text";
    hpText.innerHTML = `<span class="hp-current">${hpData.current}</span>/<span class="hp-max">${hpData.max}</span>`;
    hpDisplay.appendChild(hpText);

    // Progress bar
    const progressContainer = document.createElement("div");
    progressContainer.className = "progress";
    progressContainer.style.width = "60px";
    progressContainer.style.height = "6px";

    const progressBar = document.createElement("div");
    progressBar.className = "progress-bar hp-progress-bar";
    progressBar.style.width = `${(hpData.current / hpData.max) * 100}%`;

    // Set color based on health percentage
    const healthPercent = (hpData.current / hpData.max) * 100;
    if (healthPercent <= 25) {
      progressBar.classList.add("bg-danger");
    } else if (healthPercent <= 60) {
      progressBar.classList.add("bg-warning");
    } else {
      progressBar.classList.add("bg-success");
    }

    progressContainer.appendChild(progressBar);
    hpDisplay.appendChild(progressContainer);
    hpControls.appendChild(hpDisplay);

    // Increase HP button
    const increaseBtn = document.createElement("button");
    increaseBtn.className = "btn btn-sm btn-success";
    increaseBtn.innerHTML = "<i class='bi bi-plus'></i>";
    increaseBtn.addEventListener("click", function () {
      if (hpData.current < hpData.max) {
        hpData.current++;
        saveHitPoints(unitId, armyForgeId, hpData.current, hpData.max);
        updateHPDisplay();
      }
    });
    hpControls.appendChild(increaseBtn);

    hpContainer.appendChild(hpControls);

    // Function to update HP display
    function updateHPDisplay() {
      const currentHP = hpContainer.querySelector(".hp-current");
      currentHP.textContent = hpData.current;

      // Update progress bar
      const progressBar = hpContainer.querySelector(".hp-progress-bar");
      progressBar.style.width = `${(hpData.current / hpData.max) * 100}%`;

      // Update progress bar color
      progressBar.classList.remove("bg-danger", "bg-warning", "bg-success");
      const healthPercent = (hpData.current / hpData.max) * 100;
      if (healthPercent <= 25) {
        progressBar.classList.add("bg-danger");
      } else if (healthPercent <= 60) {
        progressBar.classList.add("bg-warning");
      } else {
        progressBar.classList.add("bg-success");
      }

      // Update unit card appearance based on health
      if (hpData.current === 0) {
        unitCard.classList.add("border-danger");
      } else {
        unitCard.classList.remove("border-danger");
      }
    }

    // Find or create card footer
    let unitCardFooter = unitCard.querySelector(".card-footer");
    if (!unitCardFooter) {
      unitCardFooter = document.createElement("div");
      unitCardFooter.className = "card-footer";
      unitCard.appendChild(unitCardFooter);
    }

    // Add hit points container to footer
    unitCardFooter.appendChild(hpContainer);
  }

  /**
   * Add hit points UI for a hero that's joined to a unit
   * @param {HTMLElement} unitCard - The unit card element
   * @param {Object} hero - The hero object
   * @param {Object} unit - The unit object the hero is joined to
   * @param {string} armyForgeId - Army ID
   */
  function addHeroHitPointsUI(unitCard, hero, unit, armyForgeId) {
    // Initialize hit points
    const hpData = initializeHitPoints(hero, armyForgeId);
    const toughValue = getToughValue(hero);
    const heroId = hero.selectionId;
    const unitHpData = getHitPoints(unit.selectionId, armyForgeId);

    // Create hit points container
    const hpContainer = document.createElement("div");
    hpContainer.className =
      "hero-hit-points-container d-flex justify-content-between align-items-center mb-2";

    // Create HP label
    let hpLabel = document.createElement("span");
    hpLabel.innerHTML = `<i class="bi bi-heart-fill text-danger"></i> ${
      hero.customName || hero.name
    } HP (Tough ${toughValue})`;
    hpContainer.appendChild(hpLabel);

    // Create HP controls
    const hpControls = document.createElement("div");
    hpControls.className = "d-flex align-items-center";

    // Decrease HP button
    const decreaseBtn = document.createElement("button");
    decreaseBtn.className = "btn btn-sm btn-danger me-2";
    decreaseBtn.innerHTML = "<i class='bi bi-dash'></i>";
    decreaseBtn.disabled = unitHpData.current > 0; // Disable if unit still has HP
    decreaseBtn.addEventListener("click", function () {
      if (hpData.current > 0) {
        hpData.current--;
        saveHitPoints(heroId, armyForgeId, hpData.current, hpData.max);
        updateHPDisplay();

        // Update the card border color based on both unit and hero HP
        updateCardBorder();
      }
    });
    hpControls.appendChild(decreaseBtn);

    // HP display
    const hpDisplay = document.createElement("div");
    hpDisplay.className = "d-flex flex-column align-items-center me-2";

    const hpText = document.createElement("div");
    hpText.className = "hp-text";
    hpText.innerHTML = `<span class="hp-current">${hpData.current}</span>/<span class="hp-max">${hpData.max}</span>`;
    hpDisplay.appendChild(hpText);

    // Progress bar
    const progressContainer = document.createElement("div");
    progressContainer.className = "progress";
    progressContainer.style.width = "60px";
    progressContainer.style.height = "6px";

    const progressBar = document.createElement("div");
    progressBar.className = "progress-bar hp-progress-bar";
    progressBar.style.width = `${(hpData.current / hpData.max) * 100}%`;

    // Set color based on health percentage
    const healthPercent = (hpData.current / hpData.max) * 100;
    if (healthPercent <= 25) {
      progressBar.classList.add("bg-danger");
    } else if (healthPercent <= 60) {
      progressBar.classList.add("bg-warning");
    } else {
      progressBar.classList.add("bg-success");
    }

    progressContainer.appendChild(progressBar);
    hpDisplay.appendChild(progressContainer);
    hpControls.appendChild(hpDisplay);

    // Increase HP button
    const increaseBtn = document.createElement("button");
    increaseBtn.className = "btn btn-sm btn-success";
    increaseBtn.innerHTML = "<i class='bi bi-plus'></i>";
    increaseBtn.disabled = unitHpData.current > 0; // Disable if unit still has HP
    increaseBtn.addEventListener("click", function () {
      if (hpData.current < hpData.max) {
        hpData.current++;
        saveHitPoints(heroId, armyForgeId, hpData.current, hpData.max);
        updateHPDisplay();

        // Update the card border color based on both unit and hero HP
        updateCardBorder();
      }
    });
    hpControls.appendChild(increaseBtn);

    hpContainer.appendChild(hpControls);

    // Function to update HP display
    function updateHPDisplay() {
      const currentHP = hpContainer.querySelector(".hp-current");
      currentHP.textContent = hpData.current;

      // Update progress bar
      const progressBar = hpContainer.querySelector(".hp-progress-bar");
      progressBar.style.width = `${(hpData.current / hpData.max) * 100}%`;

      // Update progress bar color
      progressBar.classList.remove("bg-danger", "bg-warning", "bg-success");
      const healthPercent = (hpData.current / hpData.max) * 100;
      if (healthPercent <= 25) {
        progressBar.classList.add("bg-danger");
      } else if (healthPercent <= 60) {
        progressBar.classList.add("bg-warning");
      } else {
        progressBar.classList.add("bg-success");
      }
    }

    // Function to update card border based on both unit and hero HP
    function updateCardBorder() {
      const cardElement = unitCard.querySelector(".card");
      const unitHpCurrent = getHitPoints(unit.selectionId, armyForgeId).current;
      const heroHpCurrent = getHitPoints(heroId, armyForgeId).current;

      // Only show red border if both unit and hero HP are 0
      if (unitHpCurrent === 0 && heroHpCurrent === 0) {
        unitCard.classList.add("border-danger");
      } else {
        unitCard.classList.remove("border-danger");
      }
    }

    // Find or create card footer
    let unitCardFooter = unitCard.querySelector(".card-footer");
    if (!unitCardFooter) {
      unitCardFooter = document.createElement("div");
      unitCardFooter.className = "card-footer";
      unitCard.appendChild(unitCardFooter);
    }

    // Add hit points container to footer
    unitCardFooter.appendChild(hpContainer);

    // Add an event listener to the unit's HP to enable/disable hero HP controls
    const unitHpContainer = unitCard.querySelector(".hit-points-container");
    if (unitHpContainer) {
      // Initial check for unit HP
      checkUnitHP();

      // Add listeners to unit HP buttons
      const unitDecreaseBtn = unitHpContainer.querySelector(".btn-danger");
      if (unitDecreaseBtn) {
        unitDecreaseBtn.addEventListener("click", function () {
          checkUnitHP();
          updateCardBorder();
        });
      }

      const unitIncreaseBtn = unitHpContainer.querySelector(".btn-success");
      if (unitIncreaseBtn) {
        unitIncreaseBtn.addEventListener("click", function () {
          checkUnitHP();
          updateCardBorder();
        });
      }
    }

    // Function to check unit HP and enable/disable hero HP controls
    function checkUnitHP() {
      setTimeout(() => {
        const unitHpData = getHitPoints(unit.selectionId, armyForgeId);
        const heroButtons = hpContainer.querySelectorAll("button");

        if (unitHpData.current === 0) {
          // Enable hero HP buttons
          heroButtons.forEach((btn) => (btn.disabled = false));
        } else {
          // Disable hero HP buttons
          heroButtons.forEach((btn) => (btn.disabled = true));
        }
      }, 100); // Small delay to ensure HP data is updated
    }

    // Initial border update
    updateCardBorder();
  }

  /**
   * Check if a unit has the Caster special rule
   * @param {Object} unit - The unit object
   * @returns {boolean} - True if the unit has the Caster rule
   */
  function hasCasterRule(unit) {
    // Check for Caster in unit's own rules
    if (unit.rules && unit.rules.some((rule) => rule.name === "Caster")) {
      return true;
    }

    // Check for Caster in upgrade content
    if (unit.loadout) {
      for (const item of unit.loadout) {
        if (item.content) {
          for (const contentItem of item.content) {
            if (
              contentItem.type === "ArmyBookRule" &&
              contentItem.name === "Caster"
            ) {
              return true;
            }
          }
        }
      }
    }

    return false;
  }

  /**
   * Get spell token count for a unit
   * @param {string} unitId - Unit's selection ID
   * @param {string} armyId - Army ID
   * @returns {number} - Number of spell tokens
   */
  function getSpellTokens(unitId, armyId) {
    const key = `spell_tokens_${armyId}_${unitId}`;
    const tokens = localStorage.getItem(key);
    return tokens !== null ? parseInt(tokens) : 0;
  }

  /**
   * Save spell token count for a unit
   * @param {string} unitId - Unit's selection ID
   * @param {string} armyId - Army ID
   * @param {number} tokens - Number of tokens
   */
  function saveSpellTokens(unitId, armyId, tokens) {
    const key = `spell_tokens_${armyId}_${unitId}`;
    // Cap tokens at maximum of 6
    const cappedTokens = Math.min(tokens, 6);
    localStorage.setItem(key, cappedTokens);
  }

  /**
   * Update spell token display
   * @param {HTMLElement} counterElement - The counter element to update
   * @param {number} tokens - Number of tokens
   */
  function updateSpellTokenDisplay(counterElement, tokens) {
    counterElement.textContent = tokens;
  }

  /**
   * Reset spell tokens for all casters
   * @param {string} armyId - Army ID
   * @param {number} defaultTokens - Default number of tokens (default: 3)
   */
  function resetAllSpellTokens(armyId, defaultTokens = 3) {
    const MAX_TOKENS = 6;
    // Cap default tokens to maximum
    const cappedDefaultTokens = Math.min(defaultTokens, MAX_TOKENS);

    // Get all spell token containers
    const tokenContainers = document.querySelectorAll(".spell-token-container");

    tokenContainers.forEach((container) => {
      const unitId = container.dataset.unitId;
      const counterElement = container.querySelector(".token-count");
      const increaseBtn = container.querySelector(".btn-success");

      // Reset to default token count (capped at max)
      saveSpellTokens(unitId, armyId, cappedDefaultTokens);
      updateSpellTokenDisplay(counterElement, cappedDefaultTokens);

      // Update increase button state
      if (increaseBtn) {
        increaseBtn.disabled = cappedDefaultTokens >= MAX_TOKENS;
      }
    });
  }

  /**
   * Add spell token UI to a unit card
   * @param {HTMLElement} unitCard - The unit card element
   * @param {Object} unit - The unit object
   * @param {string} armyForgeId - Army ID
   */
  function addSpellTokenUI(unitCard, unit, armyForgeId) {
    // Get current token count
    const tokens = getSpellTokens(unit.selectionId, armyForgeId);
    const MAX_TOKENS = 6;

    // Create spell token container
    const tokenContainer = document.createElement("div");
    tokenContainer.className =
      "spell-token-container d-flex justify-content-between align-items-center mb-2";
    tokenContainer.dataset.unitId = unit.selectionId;

    // Create spell token label
    const tokenLabel = document.createElement("span");
    tokenLabel.innerHTML =
      "<i class='bi bi-stars'></i> Spell Tokens <small class='text-muted'>(Max 6)</small>";
    tokenContainer.appendChild(tokenLabel);

    // Create token counter with buttons
    const tokenControls = document.createElement("div");
    tokenControls.className = "d-flex align-items-center";

    // Decrease button
    const decreaseBtn = document.createElement("button");
    decreaseBtn.className = "btn btn-sm btn-danger me-2";
    decreaseBtn.innerHTML = "<i class='bi bi-dash'></i>";
    decreaseBtn.addEventListener("click", function () {
      const currentTokens = getSpellTokens(unit.selectionId, armyForgeId);
      if (currentTokens > 0) {
        const newTokens = currentTokens - 1;
        saveSpellTokens(unit.selectionId, armyForgeId, newTokens);
        updateSpellTokenDisplay(tokenCounter, newTokens);
        // Enable increase button if below max
        if (newTokens < MAX_TOKENS) {
          increaseBtn.disabled = false;
        }
      }
    });
    tokenControls.appendChild(decreaseBtn);

    // Token counter
    const tokenCounter = document.createElement("span");
    tokenCounter.className =
      "d-flex flex-column align-items-center me-2 token-count";
    tokenCounter.style.minWidth = "30px";
    tokenCounter.textContent = tokens;
    tokenControls.appendChild(tokenCounter);

    // Increase button
    const increaseBtn = document.createElement("button");
    increaseBtn.className = "btn btn-sm btn-success";
    increaseBtn.innerHTML = "<i class='bi bi-plus'></i>";
    // Disable if already at max tokens
    increaseBtn.disabled = tokens >= MAX_TOKENS;
    increaseBtn.addEventListener("click", function () {
      const currentTokens = getSpellTokens(unit.selectionId, armyForgeId);
      if (currentTokens < MAX_TOKENS) {
        const newTokens = currentTokens + 1;
        saveSpellTokens(unit.selectionId, armyForgeId, newTokens);
        updateSpellTokenDisplay(tokenCounter, newTokens);
        // Disable button if max reached
        if (newTokens >= MAX_TOKENS) {
          increaseBtn.disabled = true;
        }
      }
    });
    tokenControls.appendChild(increaseBtn);

    tokenContainer.appendChild(tokenControls);

    // Find the footer or create one if it doesn't exist
    let unitCardFooter = unitCard.querySelector(".card-footer");
    if (!unitCardFooter) {
      unitCardFooter = document.createElement("div");
      unitCardFooter.className = "card-footer";
      unitCard.appendChild(unitCardFooter);
    }

    // Add the token container to the footer
    unitCardFooter.appendChild(tokenContainer);
  }

  /**
   * Store unit activation details
   * @param {string} unitId - Unit's selection ID
   * @param {string} armyId - Army ID
   * @param {string} action - Action type (from ACTIONS object)
   * @param {boolean} isActivated - Whether the unit is activated
   */
  function saveUnitActivation(
    unitId,
    armyId,
    action = ACTIONS.NONE,
    isActivated = false
  ) {
    const key = `activation_${armyId}_${unitId}`;
    localStorage.setItem(
      key,
      JSON.stringify({
        activated: isActivated,
        action: action,
        timestamp: Date.now(),
      })
    );
  }

  /**
   * Get unit activation details
   * @param {string} unitId - Unit's selection ID
   * @param {string} armyId - Army ID
   * @returns {Object} - Activation data
   */
  function getUnitActivation(unitId, armyId) {
    const key = `activation_${armyId}_${unitId}`;
    const status = localStorage.getItem(key);

    if (!status) {
      return {
        activated: false,
        action: ACTIONS.NONE,
        timestamp: null,
      };
    }

    return JSON.parse(status);
  }

  /**
   * Store unit morale status
   * @param {string} unitId - Unit's selection ID
   * @param {string} armyId - Army ID
   * @param {string} status - Morale status (from MORALE_STATUS object)
   */
  function saveUnitMoraleStatus(unitId, armyId, status = MORALE_STATUS.READY) {
    const key = `morale_${armyId}_${unitId}`;
    localStorage.setItem(key, status);
  }

  /**
   * Get unit morale status
   * @param {string} unitId - Unit's selection ID
   * @param {string} armyId - Army ID
   * @returns {string} - Morale status
   */
  function getUnitMoraleStatus(unitId, armyId) {
    const key = `morale_${armyId}_${unitId}`;
    const status = localStorage.getItem(key) || MORALE_STATUS.READY;
    return status;
  }

  /**
   * Determine if a unit should take a morale test (at half strength or less)
   * @param {Object} unit - The unit object
   * @param {number} currentHP - Current hit points
   * @param {number} maxHP - Maximum hit points
   * @returns {boolean} - True if unit should take morale test
   */
  function shouldTakeMoraleTest(unit, currentHP, maxHP) {
    // For single model units with tough, check if HP is at half or less of tough value
    if (parseInt(unit.size) === 1 && getToughValue(unit) > 0) {
      return currentHP <= maxHP / 2;
    }

    // For multi-model units, check if model count is at half or less
    return currentHP <= maxHP / 2;
  }

  /**
   * Reset all unit activations for the current army
   * @param {string} armyId - Army ID
   */
  function resetAllActivations(armyId) {
    const unitCards = document.querySelectorAll("[id^='unit-']");

    unitCards.forEach((card) => {
      const unitId = card.id.replace("unit-", "");
      // Reset activation status
      saveUnitActivation(unitId, armyId);

      // Update UI
      updateActivationUI(card, ACTIONS.NONE, false);
    });
  }

  /**
   * Reset all unit morale statuses
   * @param {string} armyId - Army ID
   */
  function resetAllMoraleStatuses(armyId) {
    const unitCards = document.querySelectorAll("[id^='unit-']");

    unitCards.forEach((card) => {
      const unitId = card.id.replace("unit-", "");
      // Reset morale status
      saveUnitMoraleStatus(unitId, armyId, MORALE_STATUS.READY);

      // Update UI
      updateMoraleStatusUI(card, MORALE_STATUS.READY);
    });
  }

  /**
   * Update the activation UI based on action and activation state
   * @param {HTMLElement} unitCard - The unit card element
   * @param {string} action - Action type (from ACTIONS object)
   * @param {boolean} isActivated - Whether the unit is activated
   */
  function updateActivationUI(unitCard, action, isActivated) {
    const activationContainer = unitCard.querySelector(".activation-container");
    if (!activationContainer) return;

    // Get action button container
    const actionButtonContainer = activationContainer.querySelector(
      ".action-button-container"
    );

    if (isActivated) {
      // Unit is activated - show completed action
      actionButtonContainer.style.display = "none";

      const completedAction =
        activationContainer.querySelector(".completed-action");
      completedAction.style.display = "block";

      // Set appropriate action text and icon
      let actionText, actionIcon;
      switch (action) {
        case ACTIONS.HOLD:
          actionText = "Hold";
          actionIcon = "bi-shield-fill";
          completedAction.className =
            "completed-action btn btn-sm btn-outline-primary w-100";
          break;
        case ACTIONS.ADVANCE:
          actionText = "Advance";
          actionIcon = "bi-arrow-right-circle-fill";
          completedAction.className =
            "completed-action btn btn-sm btn-outline-success w-100";
          break;
        case ACTIONS.RUSH:
          actionText = "Rush";
          actionIcon = "bi-lightning-fill";
          completedAction.className =
            "completed-action btn btn-sm btn-outline-warning w-100";
          break;
        case ACTIONS.CHARGE:
          actionText = "Charge";
          actionIcon = "bi-flag-fill";
          completedAction.className =
            "completed-action btn btn-sm btn-outline-danger w-100";
          break;
        case ACTIONS.UNSHAKEN:
          actionText = "Unshaken";
          actionIcon = "bi-emoji-neutral-fill";
          completedAction.className =
            "completed-action btn btn-sm btn-outline-info w-100";
          break;
        default:
          actionText = "Activated";
          actionIcon = "bi-check-circle-fill";
          completedAction.className =
            "completed-action btn btn-sm btn-outline-secondary w-100";
      }

      completedAction.innerHTML = `<i class="bi ${actionIcon}"></i> ${actionText}`;
    } else {
      // Unit is not activated - show action buttons
      actionButtonContainer.style.display = "flex";

      const completedAction =
        activationContainer.querySelector(".completed-action");
      completedAction.style.display = "none";
    }
  }

  /**
   * Update the morale status UI
   * @param {HTMLElement} unitCard - The unit card element
   * @param {string} moraleStatus - Morale status (from MORALE_STATUS object)
   */
  function updateMoraleStatusUI(unitCard, moraleStatus) {
    const moraleContainer = unitCard.querySelector(".morale-status-container");
    if (!moraleContainer) return;

    const moraleLabel = moraleContainer.querySelector(".morale-status-label");

    // Update based on morale status
    switch (moraleStatus) {
      case MORALE_STATUS.SHAKEN:
        moraleLabel.className =
          "morale-status-label btn btn-sm btn-danger w-50";
        moraleLabel.innerHTML =
          '<i class="bi bi-exclamation-triangle"></i> Shaken';
        break;
      case MORALE_STATUS.ROUTED:
        moraleLabel.className = "morale-status-label btn btn-sm btn-dark w-50";
        moraleLabel.innerHTML = '<i class="bi bi-x-circle"></i> Routed';
        // Apply additional styling to the whole card to indicate routed
        unitCard.classList.add("border-dark", "opacity-50");
        break;
      default: // READY
        moraleLabel.className =
          "morale-status-label btn btn-sm btn-success w-50";
        moraleLabel.innerHTML = '<i class="bi bi-shield-fill"></i> Ready';
        // Remove any routed styling
        unitCard.classList.remove("border-dark", "opacity-50");
    }
  }

  /**
   * Process unit action selection
   * @param {string} unitId - Unit's selection ID
   * @param {string} armyId - Army ID
   * @param {string} action - Action type (from ACTIONS object)
   */
  function processUnitAction(unitId, armyId, action) {
    // Get the unit card
    const unitCard = document.getElementById(`unit-${unitId}`);
    if (!unitCard) return;

    // Get unit and hit point data
    const cacheKey = `armyData_${armyId}`;
    const cachedData = JSON.parse(localStorage.getItem(cacheKey));
    if (!cachedData || !cachedData.data) return;

    const unit = cachedData.data.units.find((u) => u.selectionId === unitId);
    if (!unit) return;

    const hpData = getHitPoints(unitId, armyId);
    if (!hpData) return;

    // Get current morale status
    const currentMoraleStatus = getUnitMoraleStatus(unitId, armyId);

    // Special case for UNSHAKEN action
    if (action === ACTIONS.UNSHAKEN) {
      if (currentMoraleStatus === MORALE_STATUS.SHAKEN) {
        // Unit is no longer shaken
        saveUnitMoraleStatus(unitId, armyId, MORALE_STATUS.READY);
        updateMoraleStatusUI(unitCard, MORALE_STATUS.READY);
      }

      // Save activation with UNSHAKEN action
      saveUnitActivation(unitId, armyId, action, true);
      updateActivationUI(unitCard, action, true);
      return;
    }

    // Check if unit is shaken (can only do UNSHAKEN action)
    if (
      currentMoraleStatus === MORALE_STATUS.SHAKEN &&
      action !== ACTIONS.UNSHAKEN
    ) {
      showToast(
        "Shaken Unit",
        "This unit is shaken and can only perform the Unshaken action.",
        "warning"
      );
      return;
    }

    // Check if it's a CHARGE action (handle charging specific logic)
    if (action === ACTIONS.CHARGE) {
      // Mark unit as fatigued when charging
      saveUnitFatigueStatus(unitId, armyId, FATIGUE_STATUS.FATIGUED);
      updateFatigueStatusUI(unitCard, FATIGUE_STATUS.FATIGUED);

      // Show notification about fatigue
      showToast(
        "Unit Fatigued",
        `${
          unit.customName || unit.name
        } is now fatigued and will only hit on 6s in melee for the rest of this round.`,
        "warning"
      );

      // Show melee result prompt
      showMeleeResultPrompt(unitId, armyId, unit.customName || unit.name);

      // Save activation
      saveUnitActivation(unitId, armyId, action, true);
      updateActivationUI(unitCard, action, true);
      return;
    }

    // For other actions, mark as activated and save the action
    saveUnitActivation(unitId, armyId, action, true);
    updateActivationUI(unitCard, action, true);

    // Check if morale test is needed (unit at half strength)
    if (shouldTakeMoraleTest(unit, hpData.current, hpData.max)) {
      showMoraleTestPrompt(unitId, armyId, unit.customName || unit.name, false);
    }
  }

  /**
   * Show prompt to select which unit is being charged
   * @param {string} unitId - Charging unit's selection ID
   * @param {string} armyId - Army ID
   * @param {string} unitName - Name of the charging unit
   */
  function showChargeTargetPrompt(unitId, armyId, unitName) {
    const toastContainer = document.getElementById("toast-container");
    if (!toastContainer) return;

    // Get all units except the charging one
    const otherUnitCards = Array.from(
      document.querySelectorAll("[id^='unit-']")
    )
      .filter((card) => card.id !== `unit-${unitId}`)
      .filter((card) => {
        // Filter out routed units
        const unitId = card.id.replace("unit-", "");
        const moraleStatus = getUnitMoraleStatus(unitId, armyId);
        return moraleStatus !== MORALE_STATUS.ROUTED;
      });

    // If no other units, show melee result prompt directly
    if (otherUnitCards.length === 0) {
      showMeleeResultPrompt(unitId, armyId, unitName);
      return;
    }

    const toast = document.createElement("div");
    toast.className =
      "toast charge-target-toast align-items-center bg-body border-0";
    toast.role = "alert";
    toast.ariaLive = "assertive";
    toast.ariaAtomic = "true";
    toast.style.marginBottom = "10px";

    toast.innerHTML = `
    <div class="d-flex flex-column">
      <div class="toast-header bg-danger text-white">
        <strong class="me-auto">Charge Target</strong>
        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
      <div class="toast-body">
        <p><strong>${unitName}</strong> is charging. Which unit is being charged?</p>
        <div class="list-group mb-2" id="target-unit-list">
          ${otherUnitCards
            .map((card) => {
              const targetUnitId = card.id.replace("unit-", "");
              const unitHeader = card.querySelector(".card-header");
              const unitName = unitHeader
                ? unitHeader.textContent.trim()
                : "Unknown Unit";
              return `<button type="button" class="list-group-item list-group-item-action target-unit-btn" data-target-id="${targetUnitId}">${unitName}</button>`;
            })
            .join("")}
        </div>
      </div>
    </div>
  `;

    toastContainer.appendChild(toast);
    const bsToast = new bootstrap.Toast(toast, { autohide: false });
    bsToast.show();

    // Add event listeners for target buttons
    const targetButtons = toast.querySelectorAll(".target-unit-btn");
    targetButtons.forEach((button) => {
      button.addEventListener("click", function () {
        const targetUnitId = this.dataset.targetId;
        // Mark target unit as charged (for strike back)
        trackChargedUnit(targetUnitId, armyId);
        // Show melee result prompt
        showMeleeResultPrompt(unitId, armyId, unitName);
        // Close target selection toast
        bsToast.hide();
        setTimeout(() => toastContainer.removeChild(toast), 500);
      });
    });
  }

  /**
   * Process melee result
   * @param {string} unitId - Unit's selection ID
   * @param {string} armyId - Army ID
   * @param {boolean} won - Whether the unit won the melee
   */
  function processMeleeResult(unitId, armyId, won) {
    // Get the unit card and data
    const unitCard = document.getElementById(`unit-${unitId}`);
    if (!unitCard) return;

    const cacheKey = `armyData_${armyId}`;
    const cachedData = JSON.parse(localStorage.getItem(cacheKey));
    if (!cachedData || !cachedData.data) return;

    const unit = cachedData.data.units.find((u) => u.selectionId === unitId);
    if (!unit) return;

    const hpData = getHitPoints(unitId, armyId);
    if (!hpData) return;

    if (!won) {
      // Lost melee - need morale test
      showMoraleTestPrompt(
        unitId,
        armyId,
        unit.customName || unit.name | "Unit",
        true
      );
    }
  }

  /**
   * Process morale test result
   * @param {string} unitId - Unit's selection ID
   * @param {string} armyId - Army ID
   * @param {boolean} passed - Whether the unit passed the morale test
   * @param {boolean} fromMelee - Whether the test was from losing a melee
   */
  function processMoraleTestResult(unitId, armyId, passed, fromMelee = false) {
    // Get the unit card and data
    const unitCard = document.getElementById(`unit-${unitId}`);
    if (!unitCard) return;

    const cacheKey = `armyData_${armyId}`;
    const cachedData = JSON.parse(localStorage.getItem(cacheKey));
    if (!cachedData || !cachedData.data) return;

    const unit = cachedData.data.units.find((u) => u.selectionId === unitId);
    if (!unit) return;

    const hpData = getHitPoints(unitId, armyId);
    if (!hpData) return;

    if (passed) {
      // Passed morale test, no effects
      showToast(
        "Morale Test Passed",
        `${unit.customName || unit.name | "Unit"} passed the morale test!`,
        "success"
      );
      return;
    }

    // Failed morale test
    const atHalfStrength = shouldTakeMoraleTest(
      unit,
      hpData.current,
      hpData.max
    );

    if (fromMelee && atHalfStrength) {
      // Unit lost melee and is at half strength - it routs
      saveUnitMoraleStatus(unitId, armyId, MORALE_STATUS.ROUTED);
      updateMoraleStatusUI(unitCard, MORALE_STATUS.ROUTED);
      showToast(
        "Unit Routed",
        `${
          unit.customName || unit.name | "Unit"
        } has routed and is removed from play!`,
        "danger"
      );
    } else {
      // Unit becomes shaken
      saveUnitMoraleStatus(unitId, armyId, MORALE_STATUS.SHAKEN);
      updateMoraleStatusUI(unitCard, MORALE_STATUS.SHAKEN);
      showToast(
        "Unit Shaken",
        `${unit.customName || unit.name | "Unit"} is now shaken!`,
        "warning"
      );
    }
  }

  /**
   * Show melee result prompt
   * @param {string} unitId - Unit's selection ID
   * @param {string} armyId - Army ID
   * @param {string} unitName - Name of the unit
   */
  function showMeleeResultPrompt(unitId, armyId, unitName) {
    const toastContainer = document.getElementById("toast-container");
    if (!toastContainer) return;

    const toast = document.createElement("div");
    toast.className =
      "toast melee-result-toast align-items-center bg-body border-0";
    toast.role = "alert";
    toast.ariaLive = "assertive";
    toast.ariaAtomic = "true";
    toast.style.marginBottom = "10px";

    toast.innerHTML = `
    <div class="d-flex flex-column">
      <div class="toast-header">
        <strong class="me-auto">Melee Result</strong>
        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
      <div class="toast-body">
        <p><strong>${unitName}</strong> charged into melee. What was the result?</p>
        <div class="d-flex justify-content-between">
          <button class="btn btn-success melee-won-btn">Won Melee</button>
          <button class="btn btn-danger melee-lost-btn">Lost Melee</button>
        </div>
      </div>
    </div>
  `;

    toastContainer.appendChild(toast);
    const bsToast = new bootstrap.Toast(toast, { autohide: false });
    bsToast.show();

    // Add event listeners for buttons
    const wonButton = toast.querySelector(".melee-won-btn");
    const lostButton = toast.querySelector(".melee-lost-btn");

    wonButton.addEventListener("click", function () {
      processMeleeResult(unitId, armyId, true);
      bsToast.hide();
      setTimeout(() => toastContainer.removeChild(toast), 500);
    });

    lostButton.addEventListener("click", function () {
      processMeleeResult(unitId, armyId, false);
      bsToast.hide();
      setTimeout(() => toastContainer.removeChild(toast), 500);
    });
  }

  /**
   * Show morale test prompt
   * @param {string} unitId - Unit's selection ID
   * @param {string} armyId - Army ID
   * @param {string} unitName - Name of the unit
   * @param {boolean} fromMelee - Whether the test is from losing a melee
   */
  function showMoraleTestPrompt(unitId, armyId, unitName, fromMelee = false) {
    const toastContainer = document.getElementById("toast-container");
    if (!toastContainer) return;

    const toast = document.createElement("div");
    toast.className =
      "toast morale-test-toast align-items-center bg-body border-0";
    toast.role = "alert";
    toast.ariaLive = "assertive";
    toast.ariaAtomic = "true";
    toast.style.marginBottom = "10px";

    let reason = fromMelee ? "lost a melee" : "is at half strength or less";

    toast.innerHTML = `
    <div class="d-flex flex-column">
      <div class="toast-header bg-warning-subtle text-warning-emphasis">
        <strong class="me-auto">Morale Test Required</strong>
        <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
      <div class="toast-body bg-body text-body">
        <p><i class="bi bi-exclamation-triangle me-1"></i> <strong>${unitName}</strong> ${reason}.</p>
        <p class="mb-2">Take a Quality test for Morale. Did the unit pass?</p>
        <div class="d-flex justify-content-between">
          <button class="btn btn-success morale-passed-btn">Passed</button>
          <button class="btn btn-danger morale-failed-btn">Failed</button>
        </div>
      </div>
    </div>
  `;

    toastContainer.appendChild(toast);
    const bsToast = new bootstrap.Toast(toast, { autohide: false });
    bsToast.show();

    // Add event listeners for buttons
    const passedButton = toast.querySelector(".morale-passed-btn");
    const failedButton = toast.querySelector(".morale-failed-btn");

    passedButton.addEventListener("click", function () {
      processMoraleTestResult(unitId, armyId, true, fromMelee);
      bsToast.hide();
      setTimeout(() => toastContainer.removeChild(toast), 500);
    });

    failedButton.addEventListener("click", function () {
      processMoraleTestResult(unitId, armyId, false, fromMelee);
      bsToast.hide();
      setTimeout(() => toastContainer.removeChild(toast), 500);
    });
  }

  /**
   * Show a toast notification
   * @param {string} title - Toast title
   * @param {string} message - Toast message
   * @param {string} type - Toast type (primary, success, danger, etc.)
   */
  function showToast(title, message, type = "primary") {
    const toastContainer = document.getElementById("toast-container");
    if (!toastContainer) return;

    const toast = document.createElement("div");
    toast.className = `toast align-items-center text-bg-${type} border-0`;
    toast.role = "alert";
    toast.ariaLive = "assertive";
    toast.ariaAtomic = "true";
    toast.style.marginBottom = "10px";

    toast.innerHTML = `
      <div class="d-flex flex-column">
        <div class="toast-header bg-${type}-subtle text-${type}-emphasis">
          <strong class="me-auto">${title}</strong>
          <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
        <div class="toast-body bg-body text-body">
          ${message}
        </div>
      </div>
    `;

    toastContainer.appendChild(toast);
    const bsToast = new bootstrap.Toast(toast, { delay: 5000 });
    bsToast.show();

    // Auto-remove after hiding
    toast.addEventListener("hidden.bs.toast", function () {
      toastContainer.removeChild(toast);
    });
  }

  /**
   * Add morale and action UI to unit card
   * @param {HTMLElement} unitCard - The unit card element
   * @param {Object} unit - The unit object
   * @param {string} armyForgeId - Army ID
   */
  function addMoraleAndActionUI(unitCard, unit, armyForgeId) {
    // Get the card footer or create one if it doesn't exist
    let unitCardFooter = unitCard.querySelector(".card-footer");
    if (!unitCardFooter) {
      unitCardFooter = document.createElement("div");
      unitCardFooter.className = "card-footer";
      unitCard.appendChild(unitCardFooter);
    }

    // Get current morale status
    const moraleStatus = getUnitMoraleStatus(unit.selectionId, armyForgeId);

    // Get current fatigue status
    const fatigueStatus = getUnitFatigueStatus(unit.selectionId, armyForgeId);

    // Create morale status container
    const moraleContainer = document.createElement("div");
    moraleContainer.className =
      "morale-status-container d-flex justify-content-between align-items-center mb-2";

    // Add label
    const moraleLabel = document.createElement("span");
    moraleLabel.innerHTML = "<i class='bi bi-shield-fill'></i> Status";
    moraleContainer.appendChild(moraleLabel);

    // Create morale status badge
    const moraleStatusLabel = document.createElement("button");
    moraleStatusLabel.className =
      "morale-status-label btn btn-sm btn-success w-100";
    moraleStatusLabel.innerHTML = `<i class="bi bi-shield-fill"></i> Ready`;
    moraleStatusLabel.disabled = true; // This is just for display

    moraleContainer.appendChild(moraleStatusLabel);
    unitCardFooter.appendChild(moraleContainer);

    // Update initial morale status
    updateMoraleStatusUI(unitCard, moraleStatus);

    // Add fatigue status container
    const fatigueContainer = document.createElement("div");
    fatigueContainer.className =
      "fatigue-status-container d-flex justify-content-between align-items-center mb-2";

    // Add fatigue label
    const fatigueLabel = document.createElement("span");
    fatigueLabel.innerHTML = "<i class='bi bi-battery-half'></i> Fatigue";
    fatigueContainer.appendChild(fatigueLabel);

    // Create fatigue status badge
    const fatigueBadge = document.createElement("button");
    fatigueBadge.className = "fatigue-badge btn btn-sm btn-success w-50";
    fatigueBadge.innerHTML = `<i class="bi bi-lightning-charge"></i> Fresh`;
    fatigueBadge.disabled = true; // This is just for display

    // Add tooltip to explain fatigue
    fatigueBadge.setAttribute("data-bs-toggle", "tooltip");
    fatigueBadge.setAttribute("data-bs-placement", "top");
    fatigueBadge.setAttribute(
      "title",
      "Fatigued units only hit on unmodified rolls of 6 in melee"
    );

    fatigueContainer.appendChild(fatigueBadge);
    unitCardFooter.appendChild(fatigueContainer);

    // Update initial fatigue status
    updateFatigueStatusUI(unitCard, fatigueStatus);

    // Add activation container
    const activationContainer = document.createElement("div");
    activationContainer.className = "activation-container mb-2";

    // Get current activation status
    const activation = getUnitActivation(unit.selectionId, armyForgeId);

    // Create action buttons container
    const actionButtonContainer = document.createElement("div");
    actionButtonContainer.className =
      "action-button-container d-flex flex-wrap gap-1";

    // Hold button
    const holdButton = document.createElement("button");
    holdButton.className = "btn btn-sm btn-outline-primary flex-grow-1";
    holdButton.innerHTML = `<i class="bi bi-shield-fill"></i> Hold`;
    holdButton.addEventListener("click", function () {
      processUnitAction(unit.selectionId, armyForgeId, ACTIONS.HOLD);
    });
    actionButtonContainer.appendChild(holdButton);

    // Advance button
    const advanceButton = document.createElement("button");
    advanceButton.className = "btn btn-sm btn-outline-success flex-grow-1";
    advanceButton.innerHTML = `<i class="bi bi-arrow-right-circle-fill"></i> Advance`;
    advanceButton.addEventListener("click", function () {
      processUnitAction(unit.selectionId, armyForgeId, ACTIONS.ADVANCE);
    });
    actionButtonContainer.appendChild(advanceButton);

    // Rush button
    const rushButton = document.createElement("button");
    rushButton.className = "btn btn-sm btn-outline-warning flex-grow-1";
    rushButton.innerHTML = `<i class="bi bi-lightning-fill"></i> Rush`;
    rushButton.addEventListener("click", function () {
      processUnitAction(unit.selectionId, armyForgeId, ACTIONS.RUSH);
    });
    actionButtonContainer.appendChild(rushButton);

    // Charge button
    const chargeButton = document.createElement("button");
    chargeButton.className = "btn btn-sm btn-outline-danger flex-grow-1";
    chargeButton.innerHTML = `<i class="bi bi-flag-fill"></i> Charge`;
    chargeButton.addEventListener("click", function () {
      processUnitAction(unit.selectionId, armyForgeId, ACTIONS.CHARGE);
    });
    actionButtonContainer.appendChild(chargeButton);

    // Unshaken button
    const unshakenButton = document.createElement("button");
    unshakenButton.className = "btn btn-sm btn-outline-info flex-grow-1";
    unshakenButton.innerHTML = `<i class="bi bi-emoji-neutral-fill"></i> Unshake`;
    unshakenButton.addEventListener("click", function () {
      processUnitAction(unit.selectionId, armyForgeId, ACTIONS.UNSHAKEN);
    });
    actionButtonContainer.appendChild(unshakenButton);

    // Charged In Melee button (new)
    const chargedInMeleeButton = document.createElement("button");
    chargedInMeleeButton.className =
      "btn btn-sm btn-outline-danger flex-grow-1";
    chargedInMeleeButton.innerHTML = `<i class="bi bi-shield-x"></i> Was Charged`;
    chargedInMeleeButton.addEventListener("click", function () {
      processChargedInMelee(unit.selectionId, armyForgeId);
    });
    actionButtonContainer.appendChild(chargedInMeleeButton);

    activationContainer.appendChild(actionButtonContainer);

    // Create completed action indicator (hidden initially)
    const completedAction = document.createElement("button");
    completedAction.className =
      "completed-action btn btn-sm btn-outline-secondary w-100";
    completedAction.innerHTML = `<i class="bi bi-check-circle-fill"></i> Activated`;
    completedAction.style.display = "none";
    completedAction.addEventListener("click", function () {
      // Reset just this unit's activation when clicked
      saveUnitActivation(unit.selectionId, armyForgeId);
      updateActivationUI(unitCard, ACTIONS.NONE, false);
    });

    activationContainer.appendChild(completedAction);
    unitCardFooter.appendChild(activationContainer);

    // Update initial activation status
    updateActivationUI(unitCard, activation.action, activation.activated);

    // Add morale info panel
    addMoraleInfoToUnitCard(unitCard, unit);

    // Initialize tooltip
    new bootstrap.Tooltip(fatigueBadge);
  }

  /**
   * Process a unit striking back in melee
   * @param {string} unitId - Unit's selection ID
   * @param {string} armyId - Army ID
   */
  function processStrikeBack(unitId, armyId) {
    // Get the unit card
    const unitCard = document.getElementById(`unit-${unitId}`);
    if (!unitCard) return;

    // Get unit data
    const cacheKey = `armyData_${armyId}`;
    const cachedData = JSON.parse(localStorage.getItem(cacheKey));
    if (!cachedData || !cachedData.data) return;

    const unit = cachedData.data.units.find((u) => u.selectionId === unitId);
    if (!unit) return;

    // Mark unit as fatigued
    saveUnitFatigueStatus(unitId, armyId, FATIGUE_STATUS.FATIGUED);
    updateFatigueStatusUI(unitCard, FATIGUE_STATUS.FATIGUED);

    // Show fatigue notification
    showToast(
      "Unit Fatigued",
      `${
        unit.customName || unit.name
      } is now fatigued and will only hit on 6s in melee for the rest of this round.`,
      "warning"
    );

    // Show melee result prompt (same as we do for a charge)
    showMeleeResultPrompt(unitId, armyId, unit.customName || unit.name);

    // Hide strike back button
    hideStrikeBackButton(unitId);
  }

  /**
   * Show strike back button for a unit that was charged
   * @param {string} unitId - Unit's selection ID that was charged
   */
  function showStrikeBackButton(unitId) {
    const unitCard = document.getElementById(`unit-${unitId}`);
    if (!unitCard) return;

    const strikeBackBtn = unitCard.querySelector(".strike-back-btn");
    if (strikeBackBtn) {
      strikeBackBtn.classList.remove("d-none");
    }
  }

  /**
   * Hide strike back button
   * @param {string} unitId - Unit's selection ID
   */
  function hideStrikeBackButton(unitId) {
    const unitCard = document.getElementById(`unit-${unitId}`);
    if (!unitCard) return;

    const strikeBackBtn = unitCard.querySelector(".strike-back-btn");
    if (strikeBackBtn) {
      strikeBackBtn.classList.add("d-none");
    }
  }

  /**
   * Track a unit being charged for Strike Back purposes
   * @param {string} chargedUnitId - Unit's selection ID that was charged
   * @param {string} armyId - Army ID
   */
  function trackChargedUnit(chargedUnitId, armyId) {
    const key = `charged_${armyId}_${chargedUnitId}`;
    localStorage.setItem(key, Date.now().toString());

    // Show strike back button on the charged unit
    showStrikeBackButton(chargedUnitId);
  }

  /**
   * Check if a unit was charged recently
   * @param {string} unitId - Unit's selection ID
   * @param {string} armyId - Army ID
   * @returns {boolean} - Whether the unit was charged
   */
  function wasUnitCharged(unitId, armyId) {
    const key = `charged_${armyId}_${unitId}`;
    return localStorage.getItem(key) !== null;
  }

  /**
   * Clear charged status for a unit
   * @param {string} unitId - Unit's selection ID
   * @param {string} armyId - Army ID
   */
  function clearChargedStatus(unitId, armyId) {
    const key = `charged_${armyId}_${unitId}`;
    localStorage.removeItem(key);
  }

  /**
   * Clear all charged statuses
   * @param {string} armyId - Army ID
   */
  function clearAllChargedStatuses(armyId) {
    const keys = Object.keys(localStorage).filter((key) =>
      key.startsWith(`charged_${armyId}_`)
    );
    keys.forEach((key) => localStorage.removeItem(key));
  }

  /**
   * Add morale info panel to the unit card
   * @param {HTMLElement} unitCard - The unit card element
   * @param {Object} unit - The unit object
   */
  function addMoraleInfoToUnitCard(unitCard, unit) {
    let modelCount = parseInt(unit.size) || 1;
    const toughValue = getToughValue(unit);

    // Check if this is a joined unit by looking for hero-hit-points-container
    const isJoinedUnit =
      unitCard.querySelector(".hero-hit-points-container") !== null;

    // For joined units, add +1 to model count to account for the hero
    if (isJoinedUnit) {
      modelCount += 1;
    }

    // Calculate morale threshold based on model count or tough value
    const moraleThreshold =
      modelCount === 1 && toughValue > 0
        ? Math.floor(toughValue / 2)
        : Math.floor(modelCount / 2);

    const moraleInfo = document.createElement("div");
    moraleInfo.className = "alert alert-secondary mt-2 mb-0 py-2";
    moraleInfo.innerHTML = `
      <small>
        <i class="bi bi-info-circle-fill me-1"></i> 
        <strong>Morale Test:</strong> Required if unit has ${moraleThreshold} or fewer 
        ${modelCount === 1 && toughValue > 0 ? "HP" : "models"} remaining.
      </small>
    `;

    unitCard.querySelector(".card-body").appendChild(moraleInfo);
  }

  /**
   * Add "Reset Buttons" to UI
   */
  function addResetButtons() {
    const armyForgeId = document.getElementById("army-forge-id").textContent;
    const container = document.getElementById("share-link-container");

    if (!container) return;

    // Add round counter
    const roundCounter = document.createElement("div");
    roundCounter.className = "alert alert-secondary mb-3";
    roundCounter.innerHTML = `
      <div class="d-flex justify-content-between align-items-center">
        <h5 class="mb-0"><i class="bi bi-clock"></i> Round: <span id="round-number">1</span></h5>
        <button class="btn btn-sm btn-primary" id="next-round-btn">
          <i class="bi bi-arrow-right-circle"></i> Next Round
        </button>
      </div>
    `;
    container.appendChild(roundCounter);

    // Add event listener for next round button

    const nextRoundBtn = document.getElementById("next-round-btn");
    nextRoundBtn.addEventListener("click", function () {
      // Increment round number
      const roundNumber = document.getElementById("round-number");
      const currentRound = parseInt(roundNumber.textContent);
      roundNumber.textContent = currentRound + 1;

      // Reset all activations
      resetAllActivations(armyForgeId);

      // Reset all fatigue statuses
      resetAllFatigueStatuses(armyForgeId);

      // Add spell tokens to all casters (using existing function)
      addAllCasterTokens(armyForgeId);

      // Show toast
      showToast(
        "New Round",
        `Round ${
          currentRound + 1
        } has begun. All units are ready and fresh, and Casters have received new spell tokens.`,
        "primary"
      );
    });

    // Create reset buttons container
    const resetButtonsContainer = document.createElement("div");
    resetButtonsContainer.className = "d-flex flex-wrap gap-2 mb-3";

    // Create reset activations button
    const resetActivationsBtn = document.createElement("button");
    resetActivationsBtn.className = "btn btn-sm btn-warning";
    resetActivationsBtn.innerHTML = `<i class="bi bi-arrow-repeat"></i> Reset All Activations`;
    resetActivationsBtn.addEventListener("click", function () {
      resetAllActivations(armyForgeId);
    });
    resetButtonsContainer.appendChild(resetActivationsBtn);

    // Create reset morale button
    const resetMoraleBtn = document.createElement("button");
    resetMoraleBtn.className = "btn btn-sm btn-secondary";
    resetMoraleBtn.innerHTML = `<i class="bi bi-shield-fill"></i> Reset Morale Status`;
    resetMoraleBtn.addEventListener("click", function () {
      resetAllMoraleStatuses(armyForgeId);
    });
    resetButtonsContainer.appendChild(resetMoraleBtn);

    // Create reset fatigue button
    const resetFatigueBtn = document.createElement("button");
    resetFatigueBtn.className = "btn btn-sm btn-info";
    resetFatigueBtn.innerHTML = `<i class="bi bi-battery-full"></i> Reset Fatigue`;
    resetFatigueBtn.addEventListener("click", function () {
      resetAllFatigueStatuses(armyForgeId);
    });
    resetButtonsContainer.appendChild(resetFatigueBtn);

    // Create reset hit points button
    const resetHPBtn = document.createElement("button");
    resetHPBtn.className = "btn btn-sm btn-danger";
    resetHPBtn.innerHTML = "<i class='bi bi-heart-fill'></i> Reset All HP";
    resetHPBtn.addEventListener("click", function () {
      resetAllHitPoints(armyForgeId);
    });
    resetButtonsContainer.appendChild(resetHPBtn);

    // Create reset spell tokens button
    const resetTokensBtn = document.createElement("button");
    resetTokensBtn.className = "btn btn-sm btn-light";
    resetTokensBtn.innerHTML = "<i class='bi bi-stars'></i> Reset Spell Tokens";
    resetTokensBtn.addEventListener("click", function () {
      resetAllSpellTokens(armyForgeId, 0);
    });
    resetButtonsContainer.appendChild(resetTokensBtn);

    // Create new button for adding caster tokens
    const addCasterTokensBtn = document.createElement("button");
    addCasterTokensBtn.className = "btn btn-sm btn-success";
    addCasterTokensBtn.innerHTML =
      "<i class='bi bi-plus-circle'></i> Add Spell Tokens";
    addCasterTokensBtn.addEventListener("click", function () {
      addAllCasterTokens(armyForgeId);
    });
    resetButtonsContainer.appendChild(addCasterTokensBtn);

    // Add buttons container
    container.appendChild(resetButtonsContainer);
  }

  /**
   * Add Command Points and Underdog Points UI
   * @param {Object} remoteData - The army data from Army Forge
   */
  function addPointsTrackingUI(remoteData) {
    // Calculate total points used in the current army
    let totalPointsUsed = calculateArmyPoints(remoteData);

    // Calculate Command Points (4 × points/1000, rounded down)
    const maxCommandPoints = 4 * Math.floor(totalPointsUsed / 1000);

    // Get the highest army value among all armies
    calculateHighestArmyValue(totalPointsUsed).then((highestArmyData) => {
      const highestArmyValue = highestArmyData.points;
      const highestArmyName = highestArmyData.name;
      const pointsDifference = Math.max(0, highestArmyValue - totalPointsUsed);
      const maxUnderdogPoints = Math.floor(pointsDifference / 50);

      // Create and add the UI elements
      addPointsUI(
        totalPointsUsed,
        maxCommandPoints,
        maxUnderdogPoints,
        highestArmyValue,
        highestArmyName,
        pointsDifference
      );
    });

    /**
     * Calculate the total points used in an army
     * @param {Object} army - The army data
     * @returns {number} - Total points used
     */
    function calculateArmyPoints(army) {
      let totalPoints = 0;

      if (army.units) {
        for (const unit of army.units) {
          totalPoints += unit.cost;

          // Add costs from upgrades
          if (unit.selectedUpgrades) {
            unit.selectedUpgrades.forEach((upgrade) => {
              if (upgrade.option && upgrade.option.costs) {
                upgrade.option.costs.forEach((cost) => {
                  if (cost.unitId === unit.id) {
                    // For combined units, multiply the upgrade cost by the number of combined units
                    const multiplier = unit.isCombinedUnit
                      ? unit.combinedCount
                      : 1;
                    totalPoints += cost.cost * multiplier;
                  }
                });
              }
            });
          }
        }
      }

      return totalPoints;
    }

    /**
     * Calculate the highest army value among all armies
     * @param {number} currentArmyPoints - Points for the current army
     * @returns {Promise<Object>} - Object with the highest army points and name
     */
    async function calculateHighestArmyValue(currentArmyPoints) {
      try {
        // Fetch the campaign.json to get all army IDs
        const campaignResponse = await fetch("assets/json/campaign.json");
        const campaignData = await campaignResponse.json();

        let highestValue = {
          points: currentArmyPoints,
          name: "This Army",
        };

        // Process each army in the campaign
        const armyPromises = campaignData.armies.map(async (army) => {
          // Skip the current army
          if (army.armyForgeID === armyForgeId) {
            return highestValue;
          }

          try {
            // Fetch army data from the cached storage or API
            const armyStorageKey = `armyData_${army.armyForgeID}`;
            let armyData;

            // Try to get from localStorage first
            const cachedData = localStorage.getItem(armyStorageKey);
            if (cachedData) {
              const parsedCache = JSON.parse(cachedData);
              armyData = parsedCache.data;
            } else {
              // If not in localStorage, fetch from API
              const armyResponse = await fetch(
                `https://army-forge.onepagerules.com/api/tts?id=${army.armyForgeID}`
              );
              armyData = await armyResponse.json();
            }

            // Calculate total points for this army
            const armyPoints = calculateArmyPoints(armyData);

            // Update highest value if needed
            if (armyPoints > highestValue.points) {
              highestValue = {
                points: armyPoints,
                name: army.armyName,
              };
            }

            return highestValue;
          } catch (error) {
            console.error(`Error fetching army ${army.armyForgeID}:`, error);
            return highestValue;
          }
        });

        // Wait for all army calculations to complete
        await Promise.all(armyPromises);

        return highestValue;
      } catch (error) {
        console.error("Error calculating highest army value:", error);
        return {
          points: currentArmyPoints,
          name: "This Army",
        };
      }
    }

    /**
     * Add the points tracking UI to the page
     * @param {number} totalPointsUsed - Total points used in current army
     * @param {number} maxCommandPoints - Maximum Command Points
     * @param {number} maxUnderdogPoints - Maximum Underdog Points
     * @param {number} highestArmyValue - Highest army value
     * @param {string} highestArmyName - Name of the highest value army
     * @param {number} pointsDifference - Point difference from highest army
     */
    function addPointsUI(
      totalPointsUsed,
      maxCommandPoints,
      maxUnderdogPoints,
      highestArmyValue,
      highestArmyName,
      pointsDifference
    ) {
      // Get reference to the container where we'll add these UI elements
      const container = document.getElementById("share-link-container");
      if (!container) return;

      // Create a card for points tracking
      const pointsTrackingCard = document.createElement("div");
      pointsTrackingCard.className = "card mb-3";

      // Add points summary header
      const pointsHeader = document.createElement("div");
      pointsHeader.className =
        "card-header d-flex justify-content-between align-items-center";
      pointsHeader.innerHTML = `
      <h5 class="mb-0">Army Points Summary</h5>
      <span class="badge bg-primary fs-6">${totalPointsUsed} pts</span>
    `;
      pointsTrackingCard.appendChild(pointsHeader);

      // Add Command Points and Underdog Points trackers
      const pointsBody = document.createElement("div");
      pointsBody.className = "card-body";

      // Load stored points from localStorage or use max values as defaults
      const storedCommandPoints =
        localStorage.getItem(`command_points_${armyForgeId}`) !== null
          ? parseInt(localStorage.getItem(`command_points_${armyForgeId}`))
          : maxCommandPoints;
      const storedUnderdogPoints =
        localStorage.getItem(`underdog_points_${armyForgeId}`) !== null
          ? parseInt(localStorage.getItem(`underdog_points_${armyForgeId}`))
          : maxUnderdogPoints;

      // Command Points tracker
      const commandPointsTracker = createPointsTracker(
        "Command Points",
        storedCommandPoints,
        maxCommandPoints,
        "command_points"
      );

      // Underdog Points tracker
      const underdogPointsTracker = createPointsTracker(
        "Underdog Points",
        storedUnderdogPoints,
        maxUnderdogPoints,
        "underdog_points"
      );

      pointsBody.appendChild(commandPointsTracker);
      pointsBody.appendChild(underdogPointsTracker);

      // Add additional info about highest army value and underdog calculation
      if (maxUnderdogPoints > 0) {
        const infoText = document.createElement("div");
        infoText.className = "small text-muted mt-2";
        infoText.innerHTML = `<i class="bi bi-info-circle"></i> Underdog points calculated based on ${pointsDifference} pt difference from the highest army (${highestArmyName}: ${highestArmyValue} pts).`;
        pointsBody.appendChild(infoText);
      }

      pointsTrackingCard.appendChild(pointsBody);

      // Add the card to the container
      container.prepend(pointsTrackingCard);
    }

    /**
     * Helper function to create points tracker UI with HP-bar style
     * @param {string} label - The label for the points type
     * @param {number} current - Current points value
     * @param {number} max - Maximum points value
     * @param {string} storageKey - Key prefix for localStorage
     * @returns {HTMLElement} - The points tracker element
     */
    function createPointsTracker(label, current, max, storageKey) {
      const container = document.createElement("div");
      container.className = "mb-3";

      const labelRow = document.createElement("div");
      labelRow.className =
        "d-flex justify-content-between align-items-center mb-2";
      labelRow.innerHTML = `<label>${label}</label>`;

      // Create HP-style display container
      const hpContainer = document.createElement("div");
      hpContainer.className =
        "d-flex justify-content-between align-items-center";

      // Decrease button
      const decreaseBtn = document.createElement("button");
      decreaseBtn.className = "btn btn-sm btn-danger me-2";
      decreaseBtn.innerHTML = "<i class='bi bi-dash'></i>";
      decreaseBtn.addEventListener("click", function () {
        if (current > 0) {
          current--;
          savePoints();
          updateDisplay();
        }
      });

      // HP display
      const hpDisplay = document.createElement("div");
      hpDisplay.className = "d-flex flex-column align-items-center me-2";

      const hpText = document.createElement("div");
      hpText.className = "hp-text";
      hpText.innerHTML = `<span class="hp-current">${current}</span>/<span class="hp-max">${max}</span>`;
      hpDisplay.appendChild(hpText);

      // Progress bar
      const progressContainer = document.createElement("div");
      progressContainer.className = "progress";
      progressContainer.style.width = "60px";
      progressContainer.style.height = "6px";

      const progressBar = document.createElement("div");
      progressBar.className = "progress-bar hp-progress-bar";
      progressBar.id = `${storageKey}-bar`;
      updateProgressBar();

      progressContainer.appendChild(progressBar);
      hpDisplay.appendChild(progressContainer);

      // Increase button
      const increaseBtn = document.createElement("button");
      increaseBtn.className = "btn btn-sm btn-success";
      increaseBtn.innerHTML = "<i class='bi bi-plus'></i>";
      increaseBtn.addEventListener("click", function () {
        if (current < max) {
          current++;
          savePoints();
          updateDisplay();
        }
      });

      // Add elements to container
      hpContainer.appendChild(decreaseBtn);
      hpContainer.appendChild(hpDisplay);
      hpContainer.appendChild(increaseBtn);

      container.appendChild(labelRow);
      container.appendChild(hpContainer);

      // Save points to localStorage
      function savePoints() {
        localStorage.setItem(`${storageKey}_${armyForgeId}`, current);
      }

      // Update progress bar based on current value
      function updateProgressBar() {
        progressBar.style.width = `${(current / Math.max(1, max)) * 100}%`;

        // Update progress bar color based on percentage
        progressBar.classList.remove("bg-danger", "bg-warning", "bg-success");
        const percentage = (current / Math.max(1, max)) * 100;
        if (percentage <= 25) {
          progressBar.classList.add("bg-danger");
        } else if (percentage <= 60) {
          progressBar.classList.add("bg-warning");
        } else {
          progressBar.classList.add("bg-success");
        }
      }

      // Update the entire display
      function updateDisplay() {
        hpText.innerHTML = `<span class="hp-current">${current}</span>/<span class="hp-max">${max}</span>`;
        updateProgressBar();
        decreaseBtn.disabled = current <= 0;
        increaseBtn.disabled = current >= max;
      }

      // Initial update of button states
      decreaseBtn.disabled = current <= 0;
      increaseBtn.disabled = current >= max;

      return container;
    }
  }

  /**
   * Add Caster(X) tokens to all casters in the army
   * @param {string} armyId - Army ID
   */
  function addAllCasterTokens(armyId) {
    // Get cached army data
    const cacheKey = `armyData_${armyId}`;
    const cachedData = JSON.parse(localStorage.getItem(cacheKey));
    if (!cachedData || !cachedData.data) {
      showToast("Data Error", "Could not find army data", "danger");
      return;
    }

    // Get all spell token containers
    const tokenContainers = document.querySelectorAll(".spell-token-container");
    const MAX_TOKENS = 6;

    // Keep track of which units received tokens
    const updatedUnits = [];

    // Loop through each caster unit
    tokenContainers.forEach((container) => {
      const unitId = container.dataset.unitId;
      const counterElement = container.querySelector(".token-count");
      const increaseBtn = container.querySelector(".btn-success");

      // Find the unit in the cached data
      const unit = cachedData.data.units.find((u) => u.selectionId === unitId);
      if (!unit) return;

      // Find the Caster(X) rule to determine how many tokens to add
      let casterLevel = getCasterLevel(unit);

      if (casterLevel > 0) {
        // Get current tokens and add caster level
        const currentTokens = getSpellTokens(unitId, armyId);
        // Cap at maximum tokens
        const newTokens = Math.min(currentTokens + casterLevel, MAX_TOKENS);

        // Update tokens
        saveSpellTokens(unitId, armyId, newTokens);
        updateSpellTokenDisplay(counterElement, newTokens);

        // Update increase button state
        if (increaseBtn) {
          increaseBtn.disabled = newTokens >= MAX_TOKENS;
        }

        // Add to updated units list
        updatedUnits.push({
          name: unit.customName || unit.name,
          casterLevel: casterLevel,
          oldTokens: currentTokens,
          newTokens: newTokens,
          capped: newTokens === MAX_TOKENS,
        });
      }
    });

    // Create detailed toast message
    if (updatedUnits.length > 0) {
      let toastMessage = "Added tokens to:<br>";
      updatedUnits.forEach((unit) => {
        let statusMsg = unit.capped ? ` (max ${MAX_TOKENS})` : "";
        toastMessage += `<strong>${unit.name}</strong>: +${Math.min(
          unit.casterLevel,
          MAX_TOKENS - unit.oldTokens
        )} tokens (${unit.oldTokens} → ${unit.newTokens})${statusMsg}<br>`;
      });

      showDetailedToast("Spell Tokens Added", toastMessage, "success");
    } else {
      showDetailedToast(
        "No Casters Found",
        "No units with the Caster special rule were found",
        "warning"
      );
    }
  }

  /**
   * Show a detailed toast notification with HTML content
   * @param {string} title - Toast title
   * @param {string} htmlMessage - Toast message (HTML)
   * @param {string} type - Toast type (primary, success, danger, etc.)
   */
  function showDetailedToast(title, htmlMessage, type = "primary") {
    const toastContainer = document.getElementById("toast-container");
    if (!toastContainer) return;

    const toast = document.createElement("div");
    toast.className = `toast align-items-center border-0`;
    toast.role = "alert";
    toast.ariaLive = "assertive";
    toast.ariaAtomic = "true";
    toast.style.marginBottom = "10px";

    toast.innerHTML = `
      <div class="d-flex flex-column">
         <div class="toast-header bg-${type}-subtle text-${type}-emphasis">
          <strong class="me-auto">${title}</strong>
          <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
        <div class="toast-body bg-body text-body">
        ${htmlMessage}
        </div>
      </div>
    `;

    toastContainer.appendChild(toast);
    const bsToast = new bootstrap.Toast(toast, { delay: 7000 }); // Longer delay for more text
    bsToast.show();

    // Auto-remove after hiding
    toast.addEventListener("hidden.bs.toast", function () {
      toastContainer.removeChild(toast);
    });
  }

  /**
   * Get the Caster level (X) from a unit
   * @param {Object} unit - The unit object
   * @returns {number} - Caster level, or 0 if not a caster
   */
  function getCasterLevel(unit) {
    // Check unit's own rules for Caster(X)
    if (unit.rules) {
      const casterRule = unit.rules.find((rule) => rule.name === "Caster");
      if (casterRule && casterRule.rating) {
        return parseInt(casterRule.rating);
      }
    }

    // Check loadout items for Caster(X)
    if (unit.loadout) {
      for (const item of unit.loadout) {
        if (item.content) {
          for (const contentItem of item.content) {
            if (contentItem.name === "Caster" && contentItem.rating) {
              return parseInt(contentItem.rating);
            }
          }
        }
      }
    }

    return 0;
  }

  /**
   * Initialize the army display by fetching and processing data
   */
  async function initializeArmy() {
    const localData = await fetchLocalData(localJsonURL);
    displayArmyDetails(localData);
    const remoteData = await fetchRemoteData(
      armyForgeId,
      localStorageKey,
      cacheDuration
    );

    displayAllUnits(remoteData);
    const baseTotals = tallyBaseCounts(remoteData.units);
    displayBaseCounts(baseTotals);
    displaySpells(localData);

    displayRules(remoteData.specialRules);
    addNavLinks(localData);

    // Add points tracking UI
    addPointsTrackingUI(remoteData);

    // Add reset buttons
    addResetButtons();

    // Initialize selected stratagem display if available
    initializeSelectedStratagem(armyForgeId);
  }

  /**
   * Initialize the display of a previously selected stratagem
   * @param {string} armyId - Army ID
   */
  function initializeSelectedStratagem(armyId) {
    const storageKey = `stratagem_${armyId}`;
    const savedStratagemId = localStorage.getItem(storageKey);

    // If a stratagem is saved and the stratagems.js is loaded,
    // it will handle displaying the stratagem
    if (
      savedStratagemId &&
      typeof window.displayActiveStratagems === "function"
    ) {
      window.displayActiveStratagems(savedStratagemId);
    }
  }
  //Fuck with Alex
  if (armyForgeId === "Xo19MAwQPGbs") {
    addUnitFixingProgressBar(remoteData.units);
  }

  // Add this to the load-army.js file for the Roughnecks
  function addUnitFixingProgressBar(unitList) {
    if (armyForgeId === "Xo19MAwQPGbs") {
      // Roughnecks ID
      // Randomize unitname
      let randomUnitName =
        unitList[Math.floor(Math.random() * unitList.length)].customName;
      // Add some funny messages
      const fixingMessages = [
        `Retraining ${randomUnitName} to recognize which end of a rifle fires...`,
        `Teaching ${randomUnitName} how to walk and chew gum simultaneously...`,
        `Upgrading ${randomUnitName}'s courage subroutines...`,
        `Patching ${randomUnitName}'s GPS navigation...`,
        `Fixing weird units that make Cody's code break...`,
        `Explaining to ${randomUnitName} what 'stealth' actually means...`,
        `Refactoring Cody's anger management issues at Alex...`,
        `Debugging ${randomUnitName}'s unusual code exceptions...`,
      ];

      // Create a progress bar element
      const progressElement = document.createElement("div");
      progressElement.className =
        "position-fixed bottom-0 start-0 end-0 d-none";
      progressElement.style.zIndex = "1050";
      progressElement.innerHTML = `
        <div class="bg-dark text-light p-2">
          <div class="d-flex justify-content-between align-items-center mb-1">
            <span id="fixing-message">Working on Roughnecks weird units...</span>
            <small id="fixing-percentage">0%</small>
          </div>
          <div class="progress" style="height: 10px;">
            <div id="fixing-progress-bar" class="progress-bar progress-bar-striped progress-bar-animated bg-warning" style="width: 0%"></div>
          </div>
        </div>
      `;

      document.body.appendChild(progressElement);

      // Randomly trigger the progress bar
      setTimeout(() => {
        const randomChance = Math.random();
        if (randomChance < 0.4) {
          // 40% chance to show
          progressElement.classList.remove("d-none");

          const progressBar = document.getElementById("fixing-progress-bar");
          const percentageText = document.getElementById("fixing-percentage");
          const messageText = document.getElementById("fixing-message");

          let progress = 0;
          const randomMessage =
            fixingMessages[Math.floor(Math.random() * fixingMessages.length)];
          messageText.textContent = randomMessage;

          // Update progress slowly
          const interval = setInterval(() => {
            progress += Math.random() * 5;
            if (progress >= 95) {
              clearInterval(interval);

              // Get stuck at 99% for a while
              progressBar.style.width = "99%";
              percentageText.textContent = "99%";
              messageText.textContent =
                "Error: Roughneck units cannot be fully fixed, they're just broken like that.";
              progressBar.classList.replace("bg-warning", "bg-danger");

              // Finally hide after a delay
              setTimeout(() => {
                progressElement.classList.add("d-none");
              }, 5000);
            } else {
              progressBar.style.width = `${progress}%`;
              percentageText.textContent = `${Math.round(progress)}%`;
            }
          }, 300);
        }
      }, 10000); // Try 10 seconds after page load
    }
  }

  /**
   * Fetch local campaign data
   * @param {string} localJsonURL - URL to the campaign JSON file
   * @returns {Object} - Parsed campaign data
   */
  async function fetchLocalData(localJsonURL) {
    // Load from campaign.json
    // Return parsed data
    try {
      const localResponse = await fetch(localJsonURL);
      const campaignData = await localResponse.json();
      console.log("Campaign data:", campaignData);
      return campaignData;
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  }

  /**
   * Display spells for the current army
   * @param {Object} campaignData - The campaign data
   */
  async function displaySpells(campaignData) {
    for (const army of campaignData.armies) {
      if (army.armyForgeID === armyForgeId) {
        // Create an object to store spells by faction
        const factionSpells = {};

        // Fetch spells for each faction
        const factionPromises = army.faction.map(async (faction) => {
          const factionBookURL =
            "https://army-forge.onepagerules.com/api/army-books/" +
            faction.id +
            "?gameSystem=" +
            faction.gameSystem;

          try {
            const bookData = await fetchFactionBook(factionBookURL);

            // Store the faction name and its spells
            if (bookData && bookData.spells && bookData.spells.length > 0) {
              // Sort the spells by threshold (lowest first)
              const sortedSpells = bookData.spells.sort((a, b) => {
                // Extract threshold numbers (e.g., "4+" becomes 4)
                const thresholdA = a.threshold;
                const thresholdB = b.threshold;
                return thresholdA - thresholdB;
              });

              factionSpells[bookData.name || faction.id] = sortedSpells;
            }

            return bookData;
          } catch (error) {
            console.error("Error fetching faction book:", error);
            return null;
          }
        });

        // Wait for all faction promises to resolve
        await Promise.all(factionPromises);

        // Now display the spells organized by faction
        displaySpellsByFaction(factionSpells);
      }
    }
  }

  /**
   * Display spells organized by faction
   * @param {Object} factionSpells - Object with faction names as keys and spell arrays as values
   */
  function displaySpellsByFaction(factionSpells) {
    const spellsContainer = document.getElementById("spells-container");
    spellsContainer.innerHTML = "";

    const spellsHtml = `
      ${Object.entries(factionSpells)
        .map(
          ([factionName, spells]) => `
        <div class="col">
          <div class="card">
          <div class="card-header">
            <h5 class="mb-0">${factionName} Spells</h5>
          </div>
          <div class="card-body">
            <div class="table-responsive">
              <table class="table table-sm table-hover table-striped">
                <thead>
                  <tr>
                    <th>Spell</th>
                    <th>Effect</th>
                  </tr>
                </thead>
                <tbody class="table-group-divider">
                  ${spells
                    .map(
                      (spell) => `
                    <tr>
                      <td><span class="badge bg-secondary rounded-pill">${spell.threshold}</span> ${spell.name}</td>
                      <td class="allow-definitions">${spell.effect}</td>
                    </tr>
                  `
                    )
                    .join("")}
                </tbody>
              </table>
            </div>
          </div>
        </div></div>
      `
        )
        .join("")}
  `;

    spellsContainer.innerHTML = spellsHtml;
  }

  /**
   * Fetch data for a specific faction
   * @param {string} factionBookURL - URL to the faction book API
   * @returns {Object|null} - Parsed faction data or null on error
   */
  async function fetchFactionBook(factionBookURL) {
    try {
      const bookResponse = await fetch(factionBookURL);
      const bookData = await bookResponse.json();
      return bookData;
    } catch (error) {
      console.error("Error fetching factionbook:", error);
      return null;
    }
  }

  /**
   * Display army details on the page
   * @param {Object} campaignData - The campaign data
   */
  function displayArmyDetails(campaignData) {
    for (const army of campaignData.armies) {
      if (army.armyForgeID === armyForgeId) {
        // Display army details on page
        document.getElementById("army-name").textContent = army.armyName;
        document.getElementById("army-image").src = army.image;
        document.getElementById("army-image").style.objectPosition =
          army.imagePosition;
        document.getElementById("player-title").textContent = army.playerTitle;
        document.getElementById("player-name").textContent = army.player;
        document.getElementById("army-tagline").textContent = army.tagline;
        document.getElementById("army-summary").textContent = army.summary;
        document.getElementById("army-backstory").innerHTML = army.backstory;
        document.title = `${army.armyName} | The Convergence Protocol`;
      }
    }
  }

  /**
   * Fetch remote data from Army Forge API, using cache when possible
   * @param {string} armyForgeId - Army Forge ID
   * @param {string} localStorageKey - Key for localStorage
   * @param {number} cacheDuration - Duration in ms before cache expires
   * @returns {Object} - The army data
   */
  async function fetchRemoteData(armyForgeId, localStorageKey, cacheDuration) {
    // Check local storage first. If exists and fresh enough, return cached data
    // Otherwise fetch from API, Store in cache with timestamp and return parsed data

    const remoteJsonURL = `https://army-forge.onepagerules.com/api/tts?id=${armyForgeId}`;
    console.log("Remote data:", remoteJsonURL);
    console.log(
      "Share link: https://army-forge.onepagerules.com/share?id=" + armyForgeId
    );
    const cachedData = JSON.parse(localStorage.getItem(localStorageKey));

    if (cachedData) {
      const lastFetchTime = new Date(cachedData.fetchedAt);
      if (Date.now() - lastFetchTime < cacheDuration) {
        console.log(
          "Using cached data from:",
          lastFetchTime.toLocaleString(),
          cachedData.data
        );
        return cachedData.data;
      }
    }

    try {
      const remoteResponse = await fetch(remoteJsonURL);
      const remoteData = await remoteResponse.json();
      const cacheObject = {
        data: remoteData,
        fetchedAt: Date.now(),
      };
      localStorage.setItem(localStorageKey, JSON.stringify(cacheObject));
      console.log("Fetched new data:", remoteData);
      return remoteData;
    } catch (error) {
      console.error("Error fetching data:", error);
      return error;
    }
  }

  /**
   * Display all units from the remote data, properly handling combined units
   * @param {Object} remoteData - The army data from Army Forge
   */
  function displayAllUnits(remoteData) {
    // Clear existing unit display
    const unitsContainer = document.getElementById("units-container");
    const shareButton = document.getElementById("share-link-container");
    unitsContainer.innerHTML = "";

    shareButton.innerHTML = `<a class="btn btn-outline-primary w-100 mb-3" href="https://army-forge.onepagerules.com/share?id=${armyForgeId}" target="_blank"id="share-button" type="button"><i class="bi bi-box-arrow-up-right me-1 opacity-75" role="img" aria-label="external link icon"></i>Army Forge link</a>`;

    // Track units by selectionId to handle combined units and joined heroes
    const displayedUnitsIds = new Set();
    const combinedUnits = new Map();
    const joinedHeroes = new Map();

    // First pass: Identify combined units and joined heroes
    for (const unit of remoteData.units) {
      if (unit.combined && unit.joinToUnit) {
        // This is a secondary unit in a combined pair
        if (!combinedUnits.has(unit.joinToUnit)) {
          combinedUnits.set(unit.joinToUnit, []);
        }
        combinedUnits.get(unit.joinToUnit).push(unit);
      } else if (unit.joinToUnit) {
        // This is a hero joined to a unit
        if (!joinedHeroes.has(unit.joinToUnit)) {
          joinedHeroes.set(unit.joinToUnit, []);
        }
        joinedHeroes.get(unit.joinToUnit).push(unit);
      }
    }

    // Second pass: Create unit cards
    for (const unit of remoteData.units) {
      // Skip if already processed
      if (displayedUnitsIds.has(unit.selectionId)) {
        continue;
      }

      // Is this unit a hero joined to another unit?
      let isJoinedHero = false;
      for (const [hostId, heroes] of joinedHeroes.entries()) {
        if (heroes.some((hero) => hero.selectionId === unit.selectionId)) {
          isJoinedHero = true;
          break;
        }
      }

      // Skip heroes that join other units - they'll be shown in joined cards
      if (isJoinedHero) {
        displayedUnitsIds.add(unit.selectionId);
        continue;
      }

      // Handle combined units
      if (unit.combined && !unit.joinToUnit) {
        const secondaryUnits = combinedUnits.get(unit.selectionId) || [];

        // Mark all secondaries as displayed
        secondaryUnits.forEach((secondary) => {
          displayedUnitsIds.add(secondary.selectionId);
        });

        // Create merged unit
        const mergedUnit = {
          ...unit,
          size: (parseInt(unit.size) * (secondaryUnits.length + 1)).toString(),
          cost: unit.cost * (secondaryUnits.length + 1),
          isCombinedUnit: true,
          combinedCount: secondaryUnits.length + 1,
          xp: unit.xp,
        };

        displayedUnitsIds.add(unit.selectionId);
        const unitCard = createUnitCard(mergedUnit, remoteData);
        unitsContainer.appendChild(unitCard);
      }
      // Handle units with joined heroes
      else if (joinedHeroes.has(unit.selectionId)) {
        const heroes = joinedHeroes.get(unit.selectionId);

        // Mark this unit and all its heroes as displayed
        displayedUnitsIds.add(unit.selectionId);
        heroes.forEach((hero) => {
          displayedUnitsIds.add(hero.selectionId);
        });

        // Create joined unit card
        const joinedCard = createJoinedUnitCard(unit, heroes, remoteData);
        unitsContainer.appendChild(joinedCard);
      }
      // Handle regular units
      else {
        displayedUnitsIds.add(unit.selectionId);
        const unitCard = createUnitCard(unit, remoteData);
        unitsContainer.appendChild(unitCard);
      }
    }
  }

  /**
   * Add navigation links for other armies
   * @param {Object} localData - The campaign data
   */
  function addNavLinks(localData) {
    const armyNav = document.getElementById("army-nav-links");
    armyNav.innerHTML = "";

    localData.armies.forEach((army) => {
      if (army.armyURL) {
        const navLink = document.createElement("li");
        navLink.className = "nav-item col-6 col-lg-auto";
        const link = document.createElement("a");
        link.className = "nav-link py-2 px-0 px-lg-2";
        link.href = `${army.armyURL + ".html"}`;
        link.textContent = army.armyName;
        navLink.appendChild(link);
        armyNav.appendChild(navLink);
      }
    });
  }

  /**
   * Count the different base sizes used in the army
   * @param {Array} units - Array of unit objects
   * @returns {Object} - Object with round and square base counts
   */
  function tallyBaseCounts(units) {
    // Separate objects to track round and square bases
    const roundBaseCounts = {};
    const squareBaseCounts = {};

    for (const unit of units) {
      if (!unit.size) continue; // Skip if missing required data

      const quantity = parseInt(unit.size) || 0;
      if (quantity === 0) continue; // Skip if invalid quantity

      // Check if unit has any upgrades that modify its base size
      let finalBases = { ...unit.bases };

      // Look through the loadout for items that might change the base size
      if (unit.loadout) {
        for (const item of unit.loadout) {
          if (item.type === "ArmyBookItem" && item.bases) {
            // This item modifies the base size
            finalBases = item.bases;
            break; // Typically only one upgrade would modify base size
          }
        }
      }

      // Now count with the potentially modified base size
      if (finalBases.round) {
        const roundSize = finalBases.round.toString();
        roundBaseCounts[roundSize] =
          (roundBaseCounts[roundSize] || 0) + quantity;
      }

      if (finalBases.square) {
        const squareSize = finalBases.square.toString();
        squareBaseCounts[squareSize] =
          (squareBaseCounts[squareSize] || 0) + quantity;
      }
    }

    return {
      round: roundBaseCounts,
      square: squareBaseCounts,
    };
  }

  /**
   * Display base counts in the bases tab
   * @param {Object} baseTotals - Object with round and square base counts
   */
  function displayBaseCounts(baseTotals) {
    const basesContainer = document.getElementById("nav-bases");

    // Sort the base sizes for better display
    const sortedRoundBases = Object.entries(baseTotals.round).sort((a, b) => {
      // Extract numeric values for proper sorting
      const getNumbersFromSize = (size) => {
        const numbers = size.match(/\d+/g);
        return numbers ? numbers.map((n) => parseInt(n)) : [0];
      };

      const aValues = getNumbersFromSize(a[0]);
      const bValues = getNumbersFromSize(b[0]);

      // Compare first number, if equal, compare second number
      if (
        aValues[0] === bValues[0] &&
        aValues.length > 1 &&
        bValues.length > 1
      ) {
        return aValues[1] - bValues[1];
      }
      return aValues[0] - bValues[0];
    });

    const sortedSquareBases = Object.entries(baseTotals.square).sort((a, b) => {
      const getNumbersFromSize = (size) => {
        const numbers = size.match(/\d+/g);
        return numbers ? numbers.map((n) => parseInt(n)) : [0];
      };

      const aValues = getNumbersFromSize(a[0]);
      const bValues = getNumbersFromSize(b[0]);

      if (
        aValues[0] === bValues[0] &&
        aValues.length > 1 &&
        bValues.length > 1
      ) {
        return aValues[1] - bValues[1];
      }
      return aValues[0] - bValues[0];
    });

    const html = `
      <div class="py-3">
        <div class="card p-3 bg-body col-md-8 rounded mx-auto">
          <div class="row">
            <!-- Round Bases Table -->
            <div class="col-md-6">
              <h6 class="text-center mb-3">Round Bases</h6>
              <table class="table table-sm table-hover table-responsive">
                <thead>
                  <tr>
                    <th>Base Size</th>
                    <th class="text-center">Count</th>
                  </tr>
                </thead>
                <tbody class="table-group-divider">
                  ${sortedRoundBases
                    .map(
                      ([size, count]) => `
                      <tr>
                        <td>${size}mm</td>
                        <td class="text-center">${count}</td>
                      </tr>
                    `
                    )
                    .join("")}
                </tbody>
                <tfoot>
                  <tr>
                    <td class="text-end"><small><strong>Total</strong></small></td>
                    <td class="text-center">
                      <small>${Object.values(baseTotals.round).reduce(
                        (a, b) => a + b,
                        0
                      )}</small>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
  
            <!-- Square Bases Table -->
            <div class="col-md-6">
              <h6 class="text-center mb-3">Square Bases</h6>
              <table class="table table-sm table-hover table-responsive">
                <thead>
                  <tr>
                    <th>Base Size</th>
                    <th class="text-center">Count</th>
                  </tr>
                </thead>
                <tbody class="table-group-divider">
                  ${sortedSquareBases
                    .map(
                      ([size, count]) => `
                      <tr>
                        <td>${size}mm</td>
                        <td class="text-center">${count}</td>
                      </tr>
                    `
                    )
                    .join("")}
                </tbody>
                <tfoot>
                  <tr>
                    <td class="text-end"><small><strong>Total</strong></small></td>
                    <td class="text-center">
                      <small>${Object.values(baseTotals.square).reduce(
                        (a, b) => a + b,
                        0
                      )}</small>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;

    basesContainer.innerHTML = html;
  }

  /**
   * Display special rules in the rules tab
   * @param {Array} specialRules - Array of special rule objects
   */
  function displayRules(specialRules) {
    const rulesContainer = document.getElementById("nav-rules");

    // Sort rules alphabetically by name
    const sortedRules = [...specialRules].sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    // Create the HTML structure
    const html = `
  <div class="container-fluid py-4">
    <div class="py-4">
      <input
        type="text"
        class="form-control mb-3"
        id="searchRules"
        placeholder="Search rules..."
      />

      <dl class="row" id="rulesList">
        ${sortedRules
          .map(
            (rule) => `
          <dt class="col-sm-3">${rule.name}</dt>
          <dd class="col-sm-9">${rule.description}</dd>
        `
          )
          .join("")}
      </dl>
    </div>
    </div>
  `;

    rulesContainer.innerHTML = html;

    // Add search functionality
    const searchInput = document.getElementById("searchRules");
    searchInput.addEventListener("input", (e) => {
      const searchTerm = e.target.value.toLowerCase();
      const dtElements = document.querySelectorAll("#rulesList dt");
      const ddElements = document.querySelectorAll("#rulesList dd");

      for (let i = 0; i < dtElements.length; i++) {
        const ruleName = dtElements[i].textContent.toLowerCase();
        const ruleDescription = ddElements[i].textContent.toLowerCase();
        const matches =
          ruleName.includes(searchTerm) || ruleDescription.includes(searchTerm);

        dtElements[i].style.display = matches ? "" : "none";
        ddElements[i].style.display = matches ? "" : "none";
      }
    });
  }

  /**
   * Create a unit card for display, with proper handling of combined units
   * @param {Object} unit - The unit object
   * @param {Object} remoteData - The complete army data
   * @returns {HTMLElement} - The unit card element
   */
  function createUnitCard(unit, remoteData) {
    // Define your icons
    const icons = {
      quality: `<svg class="stat-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
          <path style="fill: #ad3e25" d="m8 0 1.669.864 1.858.282.842 1.68 1.337 1.32L13.4 6l.306 1.854-1.337 1.32-.842 1.68-1.858.282L8 12l-1.669-.864-1.858-.282-.842-1.68-1.337-1.32L2.6 6l-.306-1.854 1.337-1.32.842-1.68L6.331.864z"/>
          <path style="fill: #f9ddb7" d="M4 11.794V16l4-1 4 1v-4.206l-2.018.306L8 13.126 6.018 12.1z"/>
      </svg>`,
      defense: `<svg class="stat-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
          <path style="fill: #005f83" d="M5.072.56C6.157.265 7.31 0 8 0s1.843.265 2.928.56c1.11.3 2.229.655 2.887.87a1.54 1.54 0 0 1 1.044 1.262c.596 4.477-.787 7.795-2.465 9.99a11.8 11.8 0 0 1-2.517 2.453 7 7 0 0 1-1.048.625c-.28.132-.581.24-.829.24s-.548-.108-.829-.24a7 7 0 0 1-1.048-.625 11.8 11.8 0 0 1-2.517-2.453C1.928 10.487.545 7.169 1.141 2.692A1.54 1.54 0 0 1 2.185 1.43 63 63 0 0 1 5.072.56"/>
      </svg>`,
      tough: `<svg class="stat-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
          <path style="fill: #dc3545" d="M8 1.314C12.438-3.248 23.534 4.735 8 15-7.534 4.736 3.562-3.248 8 1.314"/>
      </svg>`,
    };

    // Helper for element creation
    const createEl = (
      tag,
      { classes = [], text = "", html = "", id = "" } = {}
    ) => {
      const el = document.createElement(tag);
      if (classes.length) el.classList.add(...classes);
      if (id) el.id = id;
      if (text) el.textContent = text;
      if (html) el.innerHTML = html;
      return el;
    };

    // Calculate the actual unit count based on combined status
    const isCombined = unit.isCombinedUnit === true;
    const combinedCount = unit.combinedCount || 1;
    const baseUnitCount = parseInt(unit.size) || 0;

    // For a combined unit, the size is already multiplied in displayAllUnits
    const actualUnitCount = baseUnitCount;

    // Calculate the total cost of the unit including all upgrades
    let totalCost = unit.cost;
    if (unit.selectedUpgrades) {
      unit.selectedUpgrades.forEach((upgrade) => {
        if (upgrade.option && upgrade.option.costs) {
          upgrade.option.costs.forEach((costItem) => {
            if (costItem.unitId === unit.id) {
              // For combined units, multiply the upgrade cost by the number of combined units
              const multiplier = unit.isCombinedUnit ? unit.combinedCount : 1;
              totalCost += costItem.cost * multiplier;
            }
          });
        }
      });
    }

    // Get modified base sizes from upgrades
    let baseSizes = { ...unit.bases };
    for (const item of unit.loadout) {
      if (item.type === "ArmyBookItem" && item.bases) {
        // Update base sizes if the upgrade provides them
        baseSizes = item.bases;
        break; // Typically only one upgrade would modify base size
      }
    }

    // Calculate final Defense value
    let finalDefenseValue = unit.defense;
    for (const item of unit.loadout) {
      if (item.type === "ArmyBookItem" && item.content) {
        for (const contentItem of item.content) {
          if (contentItem.name === "Defense" && contentItem.rating) {
            // Defense rule from upgrades is typically a bonus
            finalDefenseValue -= parseInt(contentItem.rating);
          }
        }
      }
    }

    // Calculate final Tough value
    let finalToughValue = 0;
    // Check base rules for Tough
    const baseToughRule = unit.rules.find((rule) => rule.name === "Tough");
    if (baseToughRule && baseToughRule.rating) {
      finalToughValue = parseInt(baseToughRule.rating);
    }

    // Add Tough values from upgrades
    for (const item of unit.loadout) {
      if (item.type === "ArmyBookItem" && item.content) {
        for (const contentItem of item.content) {
          if (contentItem.name === "Tough" && contentItem.rating) {
            finalToughValue += parseInt(contentItem.rating);
          }
        }
      }
    }

    // Collect all special rules from base rules and upgrades
    const specialRules = new Set();
    // Add base rules
    unit.rules.forEach((rule) => {
      specialRules.add(rule.name + (rule.rating ? `(${rule.rating})` : ""));
    });

    // Add rules from loadout items
    unit.loadout.forEach((item) => {
      if (item.content) {
        item.content.forEach((contentItem) => {
          if (contentItem.name && contentItem.type === "ArmyBookRule") {
            specialRules.add(
              contentItem.name +
                (contentItem.rating ? `(${contentItem.rating})` : "")
            );
          }
        });
      }
    });

    // Process weapons with the new function
    const processedWeapons = collectAndProcessWeapons(unit);

    // Create the outer column container
    const unitCol = createEl("div", {
      classes: ["col", "nav-scroll-top"],
      id: "unit-" + unit.selectionId,
    });

    // Create card container and card body
    const unitCard = createEl("div", { classes: ["card", "h-100"] });
    unitCol.appendChild(unitCard);
    const unitCardHead = createEl("div", { classes: ["card-header"] });
    unitCard.appendChild(unitCardHead);
    const unitCardBody = createEl("div", { classes: ["card-body"] });
    unitCard.appendChild(unitCardBody);

    // Create card header container
    const unitCardHeader = createEl("div", {
      classes: [
        "d-flex",
        "justify-content-between",
        "align-items-center",
        "align-items-start",
        "mb-3",
      ],
    });
    unitCardBody.appendChild(unitCardHeader);

    // Create the basics section (name, XP, type, cost, etc.)
    const unitCardBasics = createEl("div");

    const unitCardNameContainer = createEl("div", {
      classes: [
        "d-flex",
        "align-items-center",
        "mb-1",
        "w-100",
        "justify-content-between",
      ],
    });

    // Unit name and XP badge
    const unitCardName = createEl("h4", {
      classes: ["mb-0", "me-2"],
      text: unit.customName || unit.name,
    });
    const unitCardXP = createEl("span", {
      classes: ["xp-badge"],
      html: `<i class="bi bi-star-fill"></i> ${unit.xp} XP`,
    });

    unitCardNameContainer.appendChild(unitCardName);
    unitCardNameContainer.appendChild(unitCardXP);
    unitCardHead.appendChild(unitCardNameContainer);

    // Unit type, amount, and cost
    const unitCardType = createEl("p", {
      classes: ["mb-0"],
      text: `${unit.name} [${actualUnitCount}] - ${totalCost}pts`,
    });
    unitCardBasics.appendChild(unitCardType);

    // Combined unit notice (if applicable)
    if (isCombined) {
      const unitCardCombined = createEl("div", {
        classes: ["mb-0", "text-warning"],
        text: `Combined Unit (${combinedCount}× Basic Units)`,
      });
      unitCardBasics.appendChild(unitCardCombined);
    }

    // Joined unit (if applicable)
    if (unit.joinToUnit) {
      const joinedUnit = remoteData.units.find(
        (remoteUnit) => remoteUnit.selectionId === unit.joinToUnit
      );
      if (joinedUnit) {
        const unitCardJoined = createEl("p", {
          classes: ["mb-0"],
          text: "Joined to ",
        });
        const unitJoinedLink = createEl("a", {
          classes: ["text-decoration-none"],
          text: joinedUnit.customName || joinedUnit.name,
        });
        unitJoinedLink.href = `#unit-${joinedUnit.selectionId}`;
        unitCardJoined.appendChild(unitJoinedLink);
        unitCardBasics.appendChild(unitCardJoined);
      }
    }

    // Base size info
    const unitCardBase = createEl("p", {
      classes: ["mb-0", "text-muted", "small"],
      html: `<i class="bi bi-circle-fill"></i> ${baseSizes.round}mm | <i class="bi bi-square-fill"></i> ${baseSizes.square}mm`,
    });
    unitCardBasics.appendChild(unitCardBase);

    unitCardHeader.appendChild(unitCardBasics);

    // Create stat container
    const unitCardStats = createEl("div", { classes: ["stat-container"] });

    // Stat group: Quality
    const unitQualityGroup = createEl("div", { classes: ["stat-group"] });
    unitQualityGroup.appendChild(createEl("span", { html: icons.quality }));
    unitQualityGroup.appendChild(
      createEl("p", { classes: ["stat-label"], text: "Quality" })
    );
    unitQualityGroup.appendChild(
      createEl("p", { classes: ["stat-value-high"], text: unit.quality + "+" })
    );
    unitCardStats.appendChild(unitQualityGroup);

    // Stat group: Defense (adjusted for any Defense upgrades)
    const unitDefenseGroup = createEl("div", { classes: ["stat-group"] });
    unitDefenseGroup.appendChild(createEl("span", { html: icons.defense }));
    unitDefenseGroup.appendChild(
      createEl("p", { classes: ["stat-label"], text: "Defense" })
    );
    unitDefenseGroup.appendChild(
      createEl("p", { classes: ["stat-value"], text: finalDefenseValue + "+" })
    );
    unitCardStats.appendChild(unitDefenseGroup);

    // Stat group: Tough (if present, with combined value from all sources)
    if (finalToughValue > 0) {
      const unitToughGroup = createEl("div", { classes: ["stat-group"] });
      unitToughGroup.appendChild(createEl("span", { html: icons.tough }));
      unitToughGroup.appendChild(
        createEl("p", { classes: ["stat-label"], text: "Tough" })
      );
      unitToughGroup.appendChild(
        createEl("p", { classes: ["stat-value"], text: finalToughValue })
      );
      unitCardStats.appendChild(unitToughGroup);
    }

    unitCardHeader.appendChild(unitCardStats);

    // Create traits container with all special rules
    let hasDefenseBonus = false;
    const unitTraitsContainer = createEl("div", {
      classes: ["mb-3", "traits-container"],
    });
    const unitTraits = createEl("div", {
      classes: ["d-flex", "flex-wrap", "gap-1"],
    });
    Array.from(specialRules)
      .sort()
      .forEach((rule) => {
        if (rule.includes("Defense")) {
          hasDefenseBonus = true;
        }
        unitTraits.appendChild(
          createEl("span", {
            classes: ["badge", "bg-secondary", "allow-definitions"],
            text: rule,
          })
        );
      });
    if (hasDefenseBonus) {
      const disclaimerNote = createEl("div", {
        classes: ["small", "text-muted", "fst-italic", "mt-1"],
        html: `*Defense bonus from items is already included in the Defense stat.`,
      });
      unitTraitsContainer.appendChild(unitTraits);
      unitTraitsContainer.appendChild(disclaimerNote);
    } else {
      unitTraitsContainer.appendChild(unitTraits);
    }

    unitCardBody.appendChild(unitTraitsContainer);

    // ===== WEAPONS SECTION (inside card-body) =====
    const weaponsHeader = createEl("h4", { text: "Weapons" });
    unitCardBody.appendChild(weaponsHeader);

    // Use the new function to create the weapons table
    const weaponsTable = createWeaponsTable(processedWeapons);
    unitCardBody.appendChild(weaponsTable);

    // ===== UPGRADES SECTION (if available, inside card-body) =====
    const upgrades = unit.loadout.filter(
      (upgrade) => upgrade.type === "ArmyBookItem"
    );

    if (upgrades.length > 0) {
      const upgradesHeader = createEl("h4", { text: "Upgrades" });
      unitCardBody.appendChild(upgradesHeader);

      // Create the upgrades table with styling classes
      const upgradesTable = createEl("table", {
        classes: [
          "table",
          "table-sm",
          "table-hover",
          "table-striped",
          "table-body",
          "table-responsive",
        ],
      });

      // Build the table header for upgrades
      const upgradesThead = createEl("thead");
      const upgradesHeaderRow = createEl("tr");
      ["Upgrade", "Special"].forEach((text) => {
        upgradesHeaderRow.appendChild(createEl("th", { text }));
      });
      upgradesThead.appendChild(upgradesHeaderRow);
      upgradesTable.appendChild(upgradesThead);

      // Build the table body for upgrades
      const upgradesTbody = createEl("tbody", {
        classes: ["table-group-divider"],
      });

      // Process upgrades for display, combining duplicates
      const processedUpgrades = {};
      upgrades.forEach((upgrade) => {
        const upgradeKey = upgrade.name;

        if (!processedUpgrades[upgradeKey]) {
          processedUpgrades[upgradeKey] = { ...upgrade };
        } else {
          // For duplicates, combine counts
          processedUpgrades[upgradeKey].count =
            (processedUpgrades[upgradeKey].count || 1) + (upgrade.count || 1);
        }
      });

      Object.values(processedUpgrades).forEach((upgrade) => {
        const row = createEl("tr");

        // Upgrade name cell with count if needed
        const upgradeName =
          upgrade.count > 1
            ? `${upgrade.count}× ${upgrade.name}`
            : upgrade.name;
        row.appendChild(createEl("td", { text: upgradeName }));

        // Special cell: join upgrade content names (if any)
        let specialText = "-";
        if (Array.isArray(upgrade.content) && upgrade.content.length > 0) {
          // Filter out weapons as they're shown in the weapons table
          const specialRules = upgrade.content.filter(
            (item) => item.type === "ArmyBookRule"
          );
          if (specialRules.length > 0) {
            specialText = specialRules
              .map(
                (rule) => rule.name + (rule.rating ? `(${rule.rating})` : "")
              )
              .join(", ");
          }
        }

        const upgradeSpecialCell = createEl("td", { text: specialText });
        upgradeSpecialCell.classList.add("allow-definitions");
        row.appendChild(upgradeSpecialCell);

        upgradesTbody.appendChild(row);
      });

      upgradesTable.appendChild(upgradesTbody);
      unitCardBody.appendChild(upgradesTable);
    }

    // Add Hit Points UI
    addHitPointsUI(unitCard, unit, armyForgeId);

    // Add Morale and Action UI
    addMoraleAndActionUI(unitCard, unit, armyForgeId);

    // Add Spell Token UI for casters
    if (hasCasterRule(unit)) {
      addSpellTokenUI(unitCard, unit, armyForgeId);
    }

    return unitCol;
  }

  /**
   * Create a unified card for a unit with joined heroes
   * @param {Object} unit - The base unit object
   * @param {Array} heroes - Array of hero objects joined to this unit
   * @param {Object} remoteData - The complete army data
   * @returns {HTMLElement} - The unified unit card element
   */
  function createJoinedUnitCard(unit, heroes, remoteData) {
    // We'll focus on the first hero for simplicity
    const hero = heroes[0];

    // Define icons
    const icons = {
      quality: `<svg class="stat-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
        <path style="fill: #ad3e25" d="m8 0 1.669.864 1.858.282.842 1.68 1.337 1.32L13.4 6l.306 1.854-1.337 1.32-.842 1.68-1.858.282L8 12l-1.669-.864-1.858-.282-.842-1.68-1.337-1.32L2.6 6l-.306-1.854 1.337-1.32.842-1.68L6.331.864z"/>
        <path style="fill: #f9ddb7" d="M4 11.794V16l4-1 4 1v-4.206l-2.018.306L8 13.126 6.018 12.1z"/>
    </svg>`,
      defense: `<svg class="stat-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
        <path style="fill: #005f83" d="M5.072.56C6.157.265 7.31 0 8 0s1.843.265 2.928.56c1.11.3 2.229.655 2.887.87a1.54 1.54 0 0 1 1.044 1.262c.596 4.477-.787 7.795-2.465 9.99a11.8 11.8 0 0 1-2.517 2.453 7 7 0 0 1-1.048.625c-.28.132-.581.24-.829.24s-.548-.108-.829-.24a7 7 0 0 1-1.048-.625 11.8 11.8 0 0 1-2.517-2.453C1.928 10.487.545 7.169 1.141 2.692A1.54 1.54 0 0 1 2.185 1.43 63 63 0 0 1 5.072.56"/>
    </svg>`,
      tough: `<svg class="stat-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
        <path style="fill: #dc3545" d="M8 1.314C12.438-3.248 23.534 4.735 8 15-7.534 4.736 3.562-3.248 8 1.314"/>
    </svg>`,
    };

    // Helper for creating elements
    const createEl = (
      tag,
      { classes = [], text = "", html = "", id = "" } = {}
    ) => {
      const el = document.createElement(tag);
      if (classes.length) el.classList.add(...classes);
      if (id) el.id = id;
      if (text) el.textContent = text;
      if (html) el.innerHTML = html;
      return el;
    };

    // Calculate the total cost of the unit including all upgrades
    let unitTotalCost = unit.cost;
    if (unit.selectedUpgrades) {
      unit.selectedUpgrades.forEach((upgrade) => {
        if (upgrade.option && upgrade.option.costs) {
          upgrade.option.costs.forEach((costItem) => {
            if (costItem.unitId === unit.id) {
              unitTotalCost += costItem.cost;
            }
          });
        }
      });
    }

    // Calculate the total cost of the hero including all upgrades
    let heroTotalCost = hero.cost;
    if (hero.selectedUpgrades) {
      hero.selectedUpgrades.forEach((upgrade) => {
        if (upgrade.option && upgrade.option.costs) {
          upgrade.option.costs.forEach((costItem) => {
            if (costItem.unitId === hero.id) {
              heroTotalCost += costItem.cost;
            }
          });
        }
      });
    }

    // Calculate total stats
    const totalModelCount = parseInt(unit.size) + 1; // Unit models + Hero
    const totalCost = unitTotalCost + heroTotalCost;

    // Create the outer column container
    const unitCol = createEl("div", {
      classes: ["col", "nav-scroll-top"],
      id: "unit-" + unit.selectionId,
    });

    // Create card container
    const unitCard = createEl("div", { classes: ["card", "h-100"] });
    unitCol.appendChild(unitCard);

    // Create card header
    const unitCardHead = createEl("div", { classes: ["card-header"] });
    unitCard.appendChild(unitCardHead);

    // Create simplified header - just combined names and total count/points
    const unitCardNameContainer = createEl("div", {
      classes: [
        "d-flex",
        "align-items-center",
        "mb-1",
        "w-100",
        "justify-content-between",
      ],
    });

    // Combined unit name
    const unitCardName = createEl("h4", {
      classes: ["mb-0", "me-2"],
      text: `${hero.customName || hero.name} & ${unit.customName || unit.name}`,
    });

    unitCardNameContainer.appendChild(unitCardName);
    unitCardHead.appendChild(unitCardNameContainer);

    // Add the model count and total points
    const combinedInfo = createEl("p", {
      classes: ["mb-0"],
      text: `[${totalModelCount}] - ${totalCost}pts`,
    });
    unitCardHead.appendChild(combinedInfo);

    // Create the card body
    const unitCardBody = createEl("div", { classes: ["card-body"] });
    unitCard.appendChild(unitCardBody);

    // Joined unit reminder (improved wording)
    const joinedUnitReminder = createEl("div", {
      classes: ["alert", "alert-info", "py-2", "mb-3"],
      html: `<i class="bi bi-info-circle"></i> <strong>Joined Unit:</strong> Hero uses unit's Defense (${unit.defense}+) until unit models are removed. Unit may use Hero's Quality (${hero.quality}+) for Morale tests.`,
    });
    unitCardBody.appendChild(joinedUnitReminder);

    // ==== HERO SECTION ====
    const heroSection = createEl("div", {
      classes: ["mb-4", "border-bottom", "pb-3"],
    });

    // Hero header with name, type, and points (matching standard card layout)
    const heroCardHeader = createEl("div", {
      classes: [
        "d-flex",
        "justify-content-between",
        "align-items-center",
        "mb-3",
      ],
    });

    // Hero basics
    const heroBasics = createEl("div");

    // Hero name with XP badge
    const heroNameContainer = createEl("div", {
      classes: ["d-flex", "align-items-center", "mb-1"],
    });

    const heroName = createEl("h5", {
      classes: ["mb-0", "me-2"],
      text: hero.customName || hero.name,
    });
    heroNameContainer.appendChild(heroName);

    // Hero XP Badge next to name
    const heroXPBadge = createEl("span", {
      classes: ["xp-badge"],
      html: `<i class="bi bi-star-fill"></i> ${hero.xp} XP`,
    });
    heroNameContainer.appendChild(heroXPBadge);

    heroBasics.appendChild(heroNameContainer);

    // Hero type and points
    const heroTypePoints = createEl("p", {
      classes: ["mb-0"],
      text: `${hero.name} - ${heroTotalCost}pts`,
    });
    heroBasics.appendChild(heroTypePoints);

    // Hero base sizes
    const heroBaseSizes = createEl("p", {
      classes: ["mb-0", "text-muted", "small"],
      html: `<i class="bi bi-circle-fill"></i> ${hero.bases.round}mm | <i class="bi bi-square-fill"></i> ${hero.bases.square}mm`,
    });
    heroBasics.appendChild(heroBaseSizes);

    // Add hero basics to header
    heroCardHeader.appendChild(heroBasics);

    // Hero stats (matching standard card layout)
    const heroStatsContainer = createEl("div", { classes: ["stat-container"] });

    // Quality stat
    const heroQualityGroup = createEl("div", { classes: ["stat-group"] });
    heroQualityGroup.appendChild(createEl("span", { html: icons.quality }));
    heroQualityGroup.appendChild(
      createEl("p", { classes: ["stat-label"], text: "Quality" })
    );
    heroQualityGroup.appendChild(
      createEl("p", { classes: ["stat-value-high"], text: hero.quality + "+" })
    );
    heroStatsContainer.appendChild(heroQualityGroup);

    // Defense stat
    const heroDefenseGroup = createEl("div", { classes: ["stat-group"] });
    heroDefenseGroup.appendChild(createEl("span", { html: icons.defense }));
    heroDefenseGroup.appendChild(
      createEl("p", { classes: ["stat-label"], text: "Defense" })
    );
    heroDefenseGroup.appendChild(
      createEl("p", { classes: ["stat-value"], text: hero.defense + "+" })
    );
    heroStatsContainer.appendChild(heroDefenseGroup);

    // Tough stat (if present)
    const heroToughRule = hero.rules.find((rule) => rule.name === "Tough");
    if (heroToughRule) {
      const heroToughGroup = createEl("div", { classes: ["stat-group"] });
      heroToughGroup.appendChild(createEl("span", { html: icons.tough }));
      heroToughGroup.appendChild(
        createEl("p", { classes: ["stat-label"], text: "Tough" })
      );
      heroToughGroup.appendChild(
        createEl("p", { classes: ["stat-value"], text: heroToughRule.rating })
      );
      heroStatsContainer.appendChild(heroToughGroup);
    }

    // Add hero stats to header
    heroCardHeader.appendChild(heroStatsContainer);
    heroSection.appendChild(heroCardHeader);

    // Hero special rules
    const heroRulesContainer = createEl("div", { classes: ["mb-3"] });
    const heroRulesList = createEl("div", {
      classes: ["d-flex", "flex-wrap", "gap-1"],
    });

    // Add all hero rules
    hero.rules.forEach((rule) => {
      const ruleBadge = createEl("span", {
        classes: ["badge", "bg-secondary", "allow-definitions"],
        text: rule.name + (rule.rating ? `(${rule.rating})` : ""),
      });
      heroRulesList.appendChild(ruleBadge);
    });

    heroRulesContainer.appendChild(heroRulesList);
    heroSection.appendChild(heroRulesContainer);

    // Hero weapons
    const heroWeaponsHeader = createEl("h4", { text: "Weapons" });
    heroSection.appendChild(heroWeaponsHeader);

    const heroWeapons = collectAndProcessWeapons(hero);
    const heroWeaponsTable = createWeaponsTable(heroWeapons);
    heroSection.appendChild(heroWeaponsTable);

    // Hero upgrades (if any)
    const heroUpgrades = hero.loadout.filter(
      (upgrade) => upgrade.type === "ArmyBookItem"
    );

    if (heroUpgrades.length > 0) {
      const upgradesHeader = createEl("h4", { text: "Upgrades" });
      heroSection.appendChild(upgradesHeader);

      const upgradesTable = createEl("table", {
        classes: [
          "table",
          "table-sm",
          "table-hover",
          "table-striped",
          "table-body",
          "table-responsive",
        ],
      });

      // Build the table header for upgrades
      const upgradesThead = createEl("thead");
      const upgradesHeaderRow = createEl("tr");
      ["Upgrade", "Special"].forEach((text) => {
        upgradesHeaderRow.appendChild(createEl("th", { text }));
      });
      upgradesThead.appendChild(upgradesHeaderRow);
      upgradesTable.appendChild(upgradesThead);

      // Build the table body for upgrades
      const upgradesTbody = createEl("tbody", {
        classes: ["table-group-divider"],
      });

      // Process upgrades for display, combining duplicates
      const processedUpgrades = {};
      heroUpgrades.forEach((upgrade) => {
        const upgradeKey = upgrade.name;

        if (!processedUpgrades[upgradeKey]) {
          processedUpgrades[upgradeKey] = { ...upgrade };
        } else {
          // For duplicates, combine counts
          processedUpgrades[upgradeKey].count =
            (processedUpgrades[upgradeKey].count || 1) + (upgrade.count || 1);
        }
      });

      Object.values(processedUpgrades).forEach((upgrade) => {
        const row = createEl("tr");

        // Upgrade name cell with count if needed
        const upgradeName =
          upgrade.count > 1
            ? `${upgrade.count}× ${upgrade.name}`
            : upgrade.name;
        row.appendChild(createEl("td", { text: upgradeName }));

        // Special cell: join upgrade content names (if any)
        let specialText = "-";
        if (Array.isArray(upgrade.content) && upgrade.content.length > 0) {
          // Filter out weapons as they're shown in the weapons table
          const specialRules = upgrade.content.filter(
            (item) => item.type === "ArmyBookRule"
          );
          if (specialRules.length > 0) {
            specialText = specialRules
              .map(
                (rule) => rule.name + (rule.rating ? `(${rule.rating})` : "")
              )
              .join(", ");
          }
        }

        const upgradeSpecialCell = createEl("td", { text: specialText });
        upgradeSpecialCell.classList.add("allow-definitions");
        row.appendChild(upgradeSpecialCell);

        upgradesTbody.appendChild(row);
      });

      upgradesTable.appendChild(upgradesTbody);
      heroSection.appendChild(upgradesTable);
    }

    // Add hero section to card body
    unitCardBody.appendChild(heroSection);

    // ==== UNIT SECTION ====
    const unitSection = createEl("div", { classes: ["mb-3"] });

    // Unit header with name, type, and points (matching standard card layout)
    const unitCardHeader = createEl("div", {
      classes: [
        "d-flex",
        "justify-content-between",
        "align-items-center",
        "mb-3",
      ],
    });

    // Unit basics
    const unitBasics = createEl("div");

    // Unit name with XP badge
    const unitNameContainer = createEl("div", {
      classes: ["d-flex", "align-items-center", "mb-1"],
    });

    const unitName = createEl("h5", {
      classes: ["mb-0", "me-2"],
      text: unit.customName || unit.name,
    });
    unitNameContainer.appendChild(unitName);

    // Unit XP Badge next to name
    const unitXPBadge = createEl("span", {
      classes: ["xp-badge"],
      html: `<i class="bi bi-star-fill"></i> ${unit.xp} XP`,
    });
    unitNameContainer.appendChild(unitXPBadge);

    unitBasics.appendChild(unitNameContainer);

    // Unit type and points
    const unitTypePoints = createEl("p", {
      classes: ["mb-0"],
      text: `${unit.name} [${unit.size}] - ${unitTotalCost}pts`,
    });
    unitBasics.appendChild(unitTypePoints);

    // Unit base sizes
    const unitBaseSizes = createEl("p", {
      classes: ["mb-0", "text-muted", "small"],
      html: `<i class="bi bi-circle-fill"></i> ${unit.bases.round}mm | <i class="bi bi-square-fill"></i> ${unit.bases.square}mm`,
    });
    unitBasics.appendChild(unitBaseSizes);

    // Add unit basics to header
    unitCardHeader.appendChild(unitBasics);

    // Unit stats (matching standard card layout)
    const unitStatsContainer = createEl("div", { classes: ["stat-container"] });

    // Quality stat
    const unitQualityGroup = createEl("div", { classes: ["stat-group"] });
    unitQualityGroup.appendChild(createEl("span", { html: icons.quality }));
    unitQualityGroup.appendChild(
      createEl("p", { classes: ["stat-label"], text: "Quality" })
    );
    unitQualityGroup.appendChild(
      createEl("p", { classes: ["stat-value-high"], text: unit.quality + "+" })
    );
    unitStatsContainer.appendChild(unitQualityGroup);

    // Defense stat
    const unitDefenseGroup = createEl("div", { classes: ["stat-group"] });
    unitDefenseGroup.appendChild(createEl("span", { html: icons.defense }));
    unitDefenseGroup.appendChild(
      createEl("p", { classes: ["stat-label"], text: "Defense" })
    );
    unitDefenseGroup.appendChild(
      createEl("p", { classes: ["stat-value"], text: unit.defense + "+" })
    );
    unitStatsContainer.appendChild(unitDefenseGroup);

    // Add unit stats to header
    unitCardHeader.appendChild(unitStatsContainer);
    unitSection.appendChild(unitCardHeader);

    // Unit special rules
    const unitRulesContainer = createEl("div", { classes: ["mb-3"] });
    const unitRulesList = createEl("div", {
      classes: ["d-flex", "flex-wrap", "gap-1"],
    });

    // Add all unit rules
    unit.rules.forEach((rule) => {
      const ruleBadge = createEl("span", {
        classes: ["badge", "bg-secondary", "allow-definitions"],
        text: rule.name + (rule.rating ? `(${rule.rating})` : ""),
      });
      unitRulesList.appendChild(ruleBadge);
    });

    unitRulesContainer.appendChild(unitRulesList);
    unitSection.appendChild(unitRulesContainer);

    // Unit weapons
    const unitWeaponsHeader = createEl("h4", { text: "Weapons" });
    unitSection.appendChild(unitWeaponsHeader);

    const unitWeapons = collectAndProcessWeapons(unit);
    const unitWeaponsTable = createWeaponsTable(unitWeapons);
    unitSection.appendChild(unitWeaponsTable);

    // Unit upgrades (if any)
    const unitUpgrades = unit.loadout.filter(
      (upgrade) => upgrade.type === "ArmyBookItem"
    );

    if (unitUpgrades.length > 0) {
      const upgradesHeader = createEl("h4", { text: "Upgrades" });
      unitSection.appendChild(upgradesHeader);

      const upgradesTable = createEl("table", {
        classes: [
          "table",
          "table-sm",
          "table-hover",
          "table-striped",
          "table-body",
          "table-responsive",
        ],
      });

      // Build the table header for upgrades
      const upgradesThead = createEl("thead");
      const upgradesHeaderRow = createEl("tr");
      ["Upgrade", "Special"].forEach((text) => {
        upgradesHeaderRow.appendChild(createEl("th", { text }));
      });
      upgradesThead.appendChild(upgradesHeaderRow);
      upgradesTable.appendChild(upgradesThead);

      // Build the table body for upgrades
      const upgradesTbody = createEl("tbody", {
        classes: ["table-group-divider"],
      });

      // Process upgrades for display, combining duplicates
      const processedUpgrades = {};
      unitUpgrades.forEach((upgrade) => {
        const upgradeKey = upgrade.name;

        if (!processedUpgrades[upgradeKey]) {
          processedUpgrades[upgradeKey] = { ...upgrade };
        } else {
          // For duplicates, combine counts
          processedUpgrades[upgradeKey].count =
            (processedUpgrades[upgradeKey].count || 1) + (upgrade.count || 1);
        }
      });

      Object.values(processedUpgrades).forEach((upgrade) => {
        const row = createEl("tr");

        // Upgrade name cell with count if needed
        const upgradeName =
          upgrade.count > 1
            ? `${upgrade.count}× ${upgrade.name}`
            : upgrade.name;
        row.appendChild(createEl("td", { text: upgradeName }));

        // Special cell: join upgrade content names (if any)
        let specialText = "-";
        if (Array.isArray(upgrade.content) && upgrade.content.length > 0) {
          // Filter out weapons as they're shown in the weapons table
          const specialRules = upgrade.content.filter(
            (item) => item.type === "ArmyBookRule"
          );
          if (specialRules.length > 0) {
            specialText = specialRules
              .map(
                (rule) => rule.name + (rule.rating ? `(${rule.rating})` : "")
              )
              .join(", ");
          }
        }

        const upgradeSpecialCell = createEl("td", { text: specialText });
        upgradeSpecialCell.classList.add("allow-definitions");
        row.appendChild(upgradeSpecialCell);

        upgradesTbody.appendChild(row);
      });

      upgradesTable.appendChild(upgradesTbody);
      unitSection.appendChild(upgradesTable);
    }

    // Add unit section to card body
    unitCardBody.appendChild(unitSection);

    // Add HP and Activation UI
    addHitPointsUI(unitCard, unit, armyForgeId);
    addHeroHitPointsUI(unitCard, hero, unit, armyForgeId);
    addMoraleAndActionUI(unitCard, unit, armyForgeId);

    // Add Spell Token UI for casters
    if (hasCasterRule(hero)) {
      addSpellTokenUI(unitCard, hero, armyForgeId);
    }

    return unitCol;
  }
});
