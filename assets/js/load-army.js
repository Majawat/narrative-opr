document.addEventListener("DOMContentLoaded", async () => {
  const localJsonURL = "assets/json/campaign.json";
  const armyForgeId = document.getElementById("army-forge-id").textContent;
  const localStorageKey = `armyData_${armyForgeId}`;
  const tabStorageKey = `activeTab_${armyForgeId}`;
  const cacheDuration = 3600000;
  const refreshButton = document.getElementById("refresh-button");

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

  refreshButton.addEventListener("click", handleRefreshData);

  initializeArmy();

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

    addResetHitPointsButton();

    displayRules(remoteData.specialRules);
    addNavLinks(localData);

    // Add reset button to the share-link-container
    const resetButton = document.createElement("button");
    resetButton.className = "btn btn-sm btn-warning mb-3 ms-2";
    resetButton.innerHTML = `<i class="bi bi-arrow-repeat"></i> Reset All Activations`;
    resetButton.addEventListener("click", function () {
      resetAllActivations(armyForgeId);
    });

    addResetSpellTokensButton();
    addResetShakenStatusButton();

    // Add it next to the share button
    document.getElementById("share-link-container").appendChild(resetButton);
  }

  // Check if a unit has the Caster special rule
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

  // Get spell token count for a unit
  function getSpellTokens(unitId, armyId) {
    const key = `spell_tokens_${armyId}_${unitId}`;
    const tokens = localStorage.getItem(key);
    return tokens !== null ? parseInt(tokens) : 0;
  }

  // Save spell token count for a unit
  function saveSpellTokens(unitId, armyId, tokens) {
    const key = `spell_tokens_${armyId}_${unitId}`;
    localStorage.setItem(key, tokens);
  }

  // Update spell token display
  function updateSpellTokenDisplay(counterElement, tokens) {
    counterElement.textContent = tokens;
  }

  // Reset spell tokens for all casters
  function resetAllSpellTokens(armyId, defaultTokens = 3) {
    // Get all spell token containers
    const tokenContainers = document.querySelectorAll(".spell-token-container");

    tokenContainers.forEach((container) => {
      const unitId = container.dataset.unitId;
      const counterElement = container.querySelector(".token-count");

      // Reset to default token count
      saveSpellTokens(unitId, armyId, defaultTokens);
      updateSpellTokenDisplay(counterElement, defaultTokens);
    });
  }

  // Store whether a unit is shaken
  function saveUnitShakenStatus(unitId, armyId, isShaken) {
    const key = `shaken_${armyId}_${unitId}`;
    localStorage.setItem(key, isShaken);
  }

  // Get whether a unit is shaken
  function getUnitShakenStatus(unitId, armyId) {
    const key = `shaken_${armyId}_${unitId}`;
    const status = localStorage.getItem(key);
    return status === "true"; // Convert to boolean
  }

  // Determine if a unit should take a morale test (at half strength or less)
  function shouldTakeMoraleTest(unit, currentHP, maxHP) {
    // For single model units with tough, check if HP is at half or less of tough value
    if (parseInt(unit.size) === 1 && getToughValue(unit) > 0) {
      return currentHP <= maxHP / 2;
    }

    // For multi-model units, check if model count is at half or less
    return currentHP <= maxHP / 2;
  }

  // Reset all units' shaken status
  function resetAllShakenStatus(armyId) {
    const unitCards = document.querySelectorAll("[id^='unit-']");

    unitCards.forEach((card) => {
      const unitId = card.id.replace("unit-", "");
      // Set to not shaken
      saveUnitShakenStatus(unitId, armyId, false);

      // Update UI
      const shakenBadge = card.querySelector(".shaken-badge");
      if (shakenBadge) {
        shakenBadge.classList.remove("bg-danger");
        shakenBadge.classList.add("bg-success");
        shakenBadge.innerHTML = `<i class="bi bi-shield-fill"></i> Ready`;
      }
    });
  }

  // Toggle shaken status for a specific unit
  function toggleShakenStatus(unitId, armyId, badgeElement) {
    const currentStatus = getUnitShakenStatus(unitId, armyId);
    const newStatus = !currentStatus;

    // Update localStorage
    saveUnitShakenStatus(unitId, armyId, newStatus);

    // Update the UI
    if (newStatus) {
      // Unit is now shaken
      badgeElement.classList.remove("bg-success");
      badgeElement.classList.add("bg-danger");
      badgeElement.innerHTML = `<i class="bi bi-exclamation-triangle"></i> Shaken`;
    } else {
      // Unit is no longer shaken
      badgeElement.classList.remove("bg-danger");
      badgeElement.classList.add("bg-success");
      badgeElement.innerHTML = `<i class="bi bi-shield-fill"></i> Ready`;
    }
  }

  // Show a toast message for morale test
  function showMoraleTestPrompt(unitName) {
    const toastContainer = document.getElementById("toast-container");
    if (!toastContainer) return;

    const toast = document.createElement("div");
    toast.className = "toast align-items-center text-bg-warning border-0";
    toast.role = "alert";
    toast.ariaLive = "assertive";
    toast.ariaAtomic = "true";
    toast.style.marginBottom = "10px";
    toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">
        <i class="bi bi-exclamation-triangle me-2"></i>
        <strong>Morale Test Required!</strong> ${unitName} is at half strength or less.
        <p class="mb-0 small">Take a Quality test - if failed, mark the unit as Shaken.</p>
      </div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
    </div>
  `;

    toastContainer.appendChild(toast);
    const bsToast = new bootstrap.Toast(toast, { delay: 7000 });
    bsToast.show();
  }

  // Add morale info panel to the unit card
  function addMoraleInfoToUnitCard(unitCard, unit) {
    const modelCount = parseInt(unit.size) || 1;
    const toughValue = getToughValue(unit);
    const moraleThreshold =
      modelCount === 1 && toughValue > 0
        ? Math.ceil(toughValue / 2)
        : Math.ceil(modelCount / 2);

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

  // Add Shaken Status UI to the unit card
  function addShakenStatusUI(unitCard, unit, armyForgeId) {
    // Get the card footer or create one if it doesn't exist
    let unitCardFooter = unitCard.querySelector(".card-footer");
    if (!unitCardFooter) {
      unitCardFooter = document.createElement("div");
      unitCardFooter.className = "card-footer";
      unitCard.appendChild(unitCardFooter);
    }

    // Get the saved shaken status
    const isShaken = getUnitShakenStatus(unit.selectionId, armyForgeId);

    // Create container for shaken status
    const shakenContainer = document.createElement("div");
    shakenContainer.className =
      "d-flex justify-content-between align-items-center mb-2";

    // Add label
    const shakenLabel = document.createElement("span");
    shakenLabel.innerHTML = "<i class='bi bi-shield-fill'></i> Morale Status";
    shakenContainer.appendChild(shakenLabel);

    // Create shaken badge/button
    const shakenBadge = document.createElement("button");
    shakenBadge.className = `btn btn-sm ${
      isShaken ? "btn-danger" : "btn-success"
    } shaken-badge`;
    shakenBadge.innerHTML = isShaken
      ? `<i class="bi bi-exclamation-triangle"></i> Shaken`
      : `<i class="bi bi-shield-fill"></i> Ready`;

    // Add toggle functionality
    shakenBadge.addEventListener("click", function () {
      toggleShakenStatus(unit.selectionId, armyForgeId, this);
    });

    shakenContainer.appendChild(shakenBadge);
    unitCardFooter.appendChild(shakenContainer);
  }

  // Add reset shaken status button
  function addResetShakenStatusButton() {
    const armyForgeId = document.getElementById("army-forge-id").textContent;
    const container = document.getElementById("share-link-container");

    if (!container) return;

    // Create reset button
    const resetShakenBtn = document.createElement("button");
    resetShakenBtn.className = "btn btn-sm btn-secondary mb-3 ms-2";
    resetShakenBtn.innerHTML = `<i class="bi bi-shield-fill"></i> Reset Morale Status`;
    resetShakenBtn.addEventListener("click", function () {
      resetAllShakenStatus(armyForgeId);
    });

    // Add button to container
    container.appendChild(resetShakenBtn);
  }

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

  function displayAllUnits(remoteData) {
    // Clear existing unit display
    // Loop through units and call displayUnitCard
    const unitsContainer = document.getElementById("units-container");
    const shareButton = document.getElementById("share-link-container");
    unitsContainer.innerHTML = "";

    shareButton.innerHTML = `<a class=" btn btn-outline-primary w-100 mb-3" href="https://army-forge.onepagerules.com/share?id=${armyForgeId}" target="_blank"id="share-button" type="button"><i class="bi bi-box-arrow-up-right me-1 opacity-75" role="img" aria-label="external link icon"></i>Army Forge link</a>`;
    const displayedUnitsIds = new Set();

    for (const unit of remoteData.units) {
      if (displayedUnitsIds.has(unit.selectionId)) {
        continue;
      }
      displayedUnitsIds.add(unit.selectionId);
      const unitCard = createUnitCard(unit, remoteData);
      unitsContainer.appendChild(unitCard);
    }
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

      if (!weaponMap[weaponKey]) {
        // First time seeing this weapon - create entry with count
        weaponMap[weaponKey] = {
          ...weapon,
          count: weapon.count || 1,
        };
      } else {
        // This is a duplicate - add to the count
        weaponMap[weaponKey].count += weapon.count || 1;
      }
    });

    // Step 4: Convert the map back to an array and sort by weapon name
    return Object.values(weaponMap).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }

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
        if (item.content) {
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

  function calculateTotalHitPoints(unit) {
    const modelCount = parseInt(unit.size) || 1;
    const toughValue = getToughValue(unit);

    if (toughValue > 0) {
      // Units with Tough: modelCount * toughValue
      return modelCount * toughValue;
    } else {
      // Units without Tough: 1 HP per model
      return modelCount;
    }
  }

  // Store current hit points for a unit
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

  // Get current hit points for a unit
  function getHitPoints(unitId, armyId) {
    const key = `hit_points_${armyId}_${unitId}`;
    const storedHP = localStorage.getItem(key);

    if (storedHP) {
      return JSON.parse(storedHP);
    }
    return null;
  }

  // Initialize hit points for a unit
  function initializeHitPoints(unit, armyId) {
    const unitId = unit.selectionId;
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

  // Reset all units' hit points to full
  // Update the resetAllHitPoints function to remove the border-danger class

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

  // Add hit points UI to unit card
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

  // Add reset hit points button
  function addResetHitPointsButton() {
    const armyForgeId = document.getElementById("army-forge-id").textContent;
    const container = document.getElementById("share-link-container");

    if (!container) return;

    // Create reset hit points button
    const resetHPBtn = document.createElement("button");
    resetHPBtn.className = "btn btn-sm btn-danger mb-3 ms-2";
    resetHPBtn.innerHTML = "<i class='bi bi-heart-fill'></i> Reset All HP";
    resetHPBtn.addEventListener("click", function () {
      resetAllHitPoints(armyForgeId);
    });

    // Add button to container
    container.appendChild(resetHPBtn);
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

  // Store the unit activation status
  function saveActivationStatus(unitId, armyId, isActivated) {
    const key = `activation_${armyId}_${unitId}`;
    localStorage.setItem(key, isActivated);
  }

  // Get the unit activation status
  function getActivationStatus(unitId, armyId) {
    const key = `activation_${armyId}_${unitId}`;
    const status = localStorage.getItem(key);
    return status === "true"; // Convert to boolean
  }

  // Constants for action types
  const ACTIONS = {
    NONE: "none",
    HOLD: "hold",
    ADVANCE: "advance",
    RUSH: "rush",
    CHARGE: "charge",
    UNSHAKEN: "unshaken",
  };

  // Morale status constants
  const MORALE_STATUS = {
    READY: "ready",
    SHAKEN: "shaken",
    ROUTED: "routed",
  };

  // Store unit activation details
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

  // Get unit activation details
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

  // Store unit morale status
  function saveUnitMoraleStatus(unitId, armyId, status = MORALE_STATUS.READY) {
    const key = `morale_${armyId}_${unitId}`;
    localStorage.setItem(key, status);
  }

  // Get unit morale status
  function getUnitMoraleStatus(unitId, armyId) {
    const key = `morale_${armyId}_${unitId}`;
    const status = localStorage.getItem(key) || MORALE_STATUS.READY;
    return status;
  }

  // Determine if a unit should take a morale test (at half strength or less)
  function shouldTakeMoraleTest(unit, currentHP, maxHP) {
    // For single model units with tough, check if HP is at half or less of tough value
    if (parseInt(unit.size) === 1 && getToughValue(unit) > 0) {
      return currentHP <= maxHP / 2;
    }

    // For multi-model units, check if model count is at half or less
    return currentHP <= maxHP / 2;
  }

  // Reset all unit activations for the current army
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
          actionIcon = "bi-emoji-smile-fill";
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

  // Update the morale status UI
  function updateMoraleStatusUI(unitCard, moraleStatus) {
    const moraleContainer = unitCard.querySelector(".morale-status-container");
    if (!moraleContainer) return;

    const moraleLabel = moraleContainer.querySelector(".morale-status-label");

    // Update based on morale status
    switch (moraleStatus) {
      case MORALE_STATUS.SHAKEN:
        moraleLabel.className =
          "morale-status-label btn btn-sm btn-danger w-100";
        moraleLabel.innerHTML =
          '<i class="bi bi-exclamation-triangle"></i> Shaken';
        break;
      case MORALE_STATUS.ROUTED:
        moraleLabel.className = "morale-status-label btn btn-sm btn-dark w-100";
        moraleLabel.innerHTML = '<i class="bi bi-x-circle"></i> Routed';
        // Apply additional styling to the whole card to indicate routed
        unitCard.classList.add("border-dark", "opacity-50");
        break;
      default: // READY
        moraleLabel.className =
          "morale-status-label btn btn-sm btn-success w-100";
        moraleLabel.innerHTML = '<i class="bi bi-shield-fill"></i> Ready';
        // Remove any routed styling
        unitCard.classList.remove("border-dark", "opacity-50");
    }
  }

  // Process unit action selection
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

    // Check if it's a CHARGE action (show melee result prompt)
    if (action === ACTIONS.CHARGE) {
      // Save activation first
      saveUnitActivation(unitId, armyId, action, true);
      updateActivationUI(unitCard, action, true);

      // Show melee result prompt
      showMeleeResultPrompt(
        unitId,
        armyId,
        unit.name || unit.customName || "Unit"
      );
      return;
    }

    // For other actions, mark as activated and save the action
    saveUnitActivation(unitId, armyId, action, true);
    updateActivationUI(unitCard, action, true);

    // Check if morale test is needed (unit at half strength)
    if (shouldTakeMoraleTest(unit, hpData.current, hpData.max)) {
      showMoraleTestPrompt(
        unitId,
        armyId,
        unit.name || unit.customName || "Unit",
        false
      );
    }
  }

  // Process melee result
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
        unit.name || unit.customName || "Unit",
        true
      );
    }
  }

  // Process morale test result
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
        `${unit.name || unit.customName || "Unit"} passed the morale test!`,
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
          unit.name || unit.customName || "Unit"
        } has routed and is removed from play!`,
        "danger"
      );
    } else {
      // Unit becomes shaken
      saveUnitMoraleStatus(unitId, armyId, MORALE_STATUS.SHAKEN);
      updateMoraleStatusUI(unitCard, MORALE_STATUS.SHAKEN);
      showToast(
        "Unit Shaken",
        `${unit.name || unit.customName || "Unit"} is now shaken!`,
        "warning"
      );
    }
  }

  // Show melee result prompt
  function showMeleeResultPrompt(unitId, armyId, unitName) {
    const toastContainer = document.getElementById("toast-container");
    if (!toastContainer) return;

    const toast = document.createElement("div");
    toast.className =
      "toast melee-result-toast align-items-center text-bg-primary border-0";
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
        <p>${unitName} charged into melee. What was the result?</p>
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

  // Toggle activation status for a specific unit
  function toggleActivation(unitId, armyId, badgeElement) {
    const currentStatus = getActivationStatus(unitId, armyId);
    const newStatus = !currentStatus;

    // Update localStorage
    saveActivationStatus(unitId, armyId, newStatus);

    // Update the UI
    if (newStatus) {
      // Unit is now activated
      badgeElement.classList.remove("bg-success");
      badgeElement.classList.add("bg-danger");
      badgeElement.innerHTML = `<i class="bi bi-hourglass-split"></i> Activated`;

      // Check if morale test is needed
      const unitCard = document.getElementById(`unit-${unitId}`);
      if (unitCard) {
        // Find the corresponding unit in the remoteData
        const cacheKey = `armyData_${armyId}`;
        const cachedData = JSON.parse(localStorage.getItem(cacheKey));
        if (cachedData && cachedData.data) {
          const unit = cachedData.data.units.find(
            (u) => u.selectionId === unitId
          );
          if (unit) {
            const hpData = getHitPoints(unitId, armyId);
            if (
              hpData &&
              shouldTakeMoraleTest(unit, hpData.current, hpData.max)
            ) {
              showMoraleTestPrompt(unit.name || unit.customName || "Unit");
            }
          }
        }
      }
    } else {
      // Unit is now deactivated
      badgeElement.classList.remove("bg-danger");
      badgeElement.classList.add("bg-success");
      badgeElement.innerHTML = `<i class="bi bi-check"></i> Ready`;
    }
  }

  /**
   * How to use these functions in the createUnitCard function:
   *
   * 1. Replace the weapon processing with:
   *    const processedWeapons = collectAndProcessWeapons(unit);
   *
   * 2. Replace the weapon table creation with:
   *    const weaponsTable = createWeaponsTable(processedWeapons);
   *    unitCardBody.appendChild(weaponsTable);
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

    // Calculate the actual unit count based on whether it's combined
    const isCombined = unit.combined === true;
    const baseUnitCount = parseInt(unit.size) || 0;
    const actualUnitCount = isCombined ? baseUnitCount * 2 : baseUnitCount;

    // Calculate the total cost of the unit including all upgrades
    let totalCost = unit.cost;
    unit.selectedUpgrades.forEach((upgrade) => {
      if (upgrade.option && upgrade.option.costs) {
        upgrade.option.costs.forEach((costItem) => {
          if (costItem.unitId === unit.id) {
            totalCost += costItem.cost;
          }
        });
      }
    });

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
        text: "Combined Unit (2× Basic Units)",
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
    const unitTraitsContainer = createEl("div", { classes: ["mb-3"] });
    const unitTraits = createEl("div", {
      classes: ["d-flex", "flex-wrap", "gap-1"],
    });
    Array.from(specialRules)
      .sort()
      .forEach((rule) => {
        unitTraits.appendChild(
          createEl("span", {
            classes: ["badge", "bg-secondary", "allow-definitions"],
            text: rule,
          })
        );
      });
    unitTraitsContainer.appendChild(unitTraits);
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

    const unitCardFooter = createEl("div", { classes: ["card-footer"] });

    // Get the saved activation status
    const isActivated = getActivationStatus(unit.selectionId, armyForgeId);
    const activationContainer = createEl("div", {
      classes: [
        "d-flex",
        "justify-content-between",
        "align-items-center",
        "mb-2",
      ],
    });

    // Add label
    const activationLabel = createEl("span", {
      html: "<i class='bi bi-lightning'></i> Activation Status",
    });
    activationContainer.appendChild(activationLabel);

    // Create the activation badge
    const activationBadge = createEl("button", {
      classes: [
        "btn",
        "btn-sm",
        isActivated ? "btn-danger" : "btn-success",
        "activation-badge",
      ],
      html: isActivated
        ? `<i class="bi bi-hourglass-split"></i> Activated`
        : `<i class="bi bi-check"></i> Ready`,
    });

    // Add toggle functionality
    activationBadge.addEventListener("click", function () {
      toggleActivation(unit.selectionId, armyForgeId, this);
    });

    function addSpellTokenUI(unitCard, unit, armyForgeId) {
      // Only add for caster units
      if (!hasCasterRule(unit)) {
        return;
      }

      // Get current token count
      const tokens = getSpellTokens(unit.selectionId, armyForgeId);

      // Create spell token container
      const tokenContainer = document.createElement("div");
      tokenContainer.className =
        "spell-token-container d-flex justify-content-between align-items-center mb-2";
      tokenContainer.dataset.unitId = unit.selectionId;

      // Create spell token label
      const tokenLabel = document.createElement("span");
      tokenLabel.innerHTML = "<i class='bi bi-stars'></i> Spell Tokens";
      tokenContainer.appendChild(tokenLabel);

      // Create token counter with buttons
      const tokenControls = document.createElement("div");
      tokenControls.className = "btn-group btn-group-sm";

      // Decrease button
      const decreaseBtn = document.createElement("button");
      decreaseBtn.className = "btn btn-info btn-sm";
      decreaseBtn.innerHTML = "<i class='bi bi-dash'></i>";
      decreaseBtn.addEventListener("click", function () {
        const currentTokens = getSpellTokens(unit.selectionId, armyForgeId);
        if (currentTokens > 0) {
          const newTokens = currentTokens - 1;
          saveSpellTokens(unit.selectionId, armyForgeId, newTokens);
          updateSpellTokenDisplay(tokenCounter, newTokens);
        }
      });
      tokenControls.appendChild(decreaseBtn);

      // Token counter
      const tokenCounter = document.createElement("span");
      tokenCounter.className = "btn btn-sm btn-info token-count";
      tokenCounter.style.pointerEvents = "none";
      tokenCounter.textContent = tokens;
      tokenControls.appendChild(tokenCounter);

      // Increase button
      const increaseBtn = document.createElement("button");
      increaseBtn.className = "btn btn-sm btn-info";
      increaseBtn.innerHTML = "<i class='bi bi-plus'></i>";
      increaseBtn.addEventListener("click", function () {
        const currentTokens = getSpellTokens(unit.selectionId, armyForgeId);
        const newTokens = currentTokens + 1;
        saveSpellTokens(unit.selectionId, armyForgeId, newTokens);
        updateSpellTokenDisplay(tokenCounter, newTokens);
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

    activationContainer.appendChild(activationBadge);
    unitCardFooter.appendChild(activationContainer);
    unitCard.appendChild(unitCardFooter);

    // The addSpellTokenUI call will now add to this same footer
    addSpellTokenUI(unitCard, unit, armyForgeId);
    addHitPointsUI(unitCard, unit, armyForgeId);

    // Add Shaken Status UI to the card
    addShakenStatusUI(unitCard, unit, armyForgeId);

    // Add Morale Info to the card
    addMoraleInfoToUnitCard(unitCard, unit);

    return unitCol;
  }

  // Add "Reset Spell Tokens" button to UI
  function addResetSpellTokensButton() {
    const armyForgeId = document.getElementById("army-forge-id").textContent;
    const container = document.getElementById("share-link-container");

    if (!container) return;

    // Create reset tokens button
    const resetTokensBtn = document.createElement("button");
    resetTokensBtn.className = "btn btn-sm btn-info mb-3 ms-2";
    resetTokensBtn.innerHTML = "<i class='bi bi-stars'></i> Reset Spell Tokens";
    resetTokensBtn.addEventListener("click", function () {
      resetAllSpellTokens(armyForgeId, 0);
    });

    // Add button to container
    container.appendChild(resetTokensBtn);
  }

  // Reset all unit morale statuses
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

  // Show morale test prompt
  function showMoraleTestPrompt(unitId, armyId, unitName, fromMelee = false) {
    const toastContainer = document.getElementById("toast-container");
    if (!toastContainer) return;

    const toast = document.createElement("div");
    toast.className =
      "toast morale-test-toast align-items-center text-bg-warning border-0";
    toast.role = "alert";
    toast.ariaLive = "assertive";
    toast.ariaAtomic = "true";
    toast.style.marginBottom = "10px";

    let reason = fromMelee ? "lost a melee" : "is at half strength or less";

    toast.innerHTML = `
    <div class="d-flex flex-column">
      <div class="toast-header">
        <strong class="me-auto">Morale Test Required</strong>
        <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
      <div class="toast-body">
        <p><i class="bi bi-exclamation-triangle me-1"></i> ${unitName} ${reason}.</p>
        <p class="mb-2">Take a Quality test. Did the unit pass?</p>
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

  // Add generic toast helper
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
    <div class="d-flex">
      <div class="toast-body">
        <strong>${title}:</strong> ${message}
      </div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
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

  function handleRefreshData() {
    console.log("Refreshing data...");
    clearCachedData(localStorageKey);
    initializeArmy();
  }

  function clearCachedData(localStorageKey) {
    localStorage.removeItem(localStorageKey);
  }
});
