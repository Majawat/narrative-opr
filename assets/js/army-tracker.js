// Global variables
let armyData = null;
let campaignData = null;
let doctrinesData = null;
let currentRound = 1;
let selectedDoctrines = ["universal"]; // Universal is always selected
let availableCommandPoints = 0;
let availableUnderdogPoints = 0;
let maxArmyPoints = 0;
let allowedArmyPoints = 0;

// Initialize the page
async function initPage() {
  // Get the army ID from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const armyId = urlParams.get("id");

  if (!armyId) {
    // Show army selector instead of just an error
    await showArmySelector();
    return;
  }

  try {
    // Show loading spinner
    document.getElementById("loading-spinner").classList.remove("d-none");

    // Load all necessary data
    await Promise.all([loadCampaignData(), loadDoctrinesData()]);

    // Now load army data (which depends on campaign data)
    await loadArmyData(armyId);

    // Process and display data
    renderArmyHeader();
    calculatePoints();
    renderUnitCards();

    // Render doctrines last - they're less important
    renderDoctrineSelection();

    // Load saved state from localStorage
    loadSavedState();

    // Add UI event listeners
    setupGlobalEventListeners();

    // Hide loading spinner
    document.getElementById("loading-spinner").classList.add("d-none");
  } catch (error) {
    console.error("Error initializing page:", error);
    showError("Failed to load data. Please try again.");
  }
}

// Set up global event listeners
function setupGlobalEventListeners() {
  // Round management
  document
    .getElementById("start-new-round-btn")
    ?.addEventListener("click", startNewRound);

  // Command points and Underdog points
  setupPointsListeners();

  // Add listeners for the responsive design
  setupResponsiveListeners();
}

// Set up listeners for responsive design
function setupResponsiveListeners() {
  // Add a collapse toggle for unit cards on mobile
  const toggleButtons = document.querySelectorAll(".unit-card .card-header");
  toggleButtons.forEach((header) => {
    header.addEventListener("click", (event) => {
      // Only handle clicks on the header itself, not on buttons within it
      if (
        event.target === header ||
        event.target.closest(".unit-stats") === null
      ) {
        const card = header.closest(".unit-card");
        const body = card.querySelector(".card-body");

        // Toggle collapse on mobile only
        if (window.innerWidth < 768) {
          if (body.style.display === "none") {
            body.style.display = "block";
          } else {
            body.style.display = "none";
          }
        }
      }
    });
  });
}

// Call this function when the DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  initPage();
});

// Load army data from API
async function loadArmyData(armyId) {
  try {
    // Get the army details from the campaign data first
    const campaignResponse = await fetch("assets/json/campaign.json");
    if (!campaignResponse.ok) throw new Error("Failed to load campaign data");
    campaignData = await campaignResponse.json();

    // Find the army in campaign data to get the armyForgeID
    const army = campaignData.armies.find((a) => a.armyURL === armyId);
    if (!army) throw new Error("Army not found in campaign data");

    // Check if we have cached data for this army
    const cachedData = localStorage.getItem(`army-forge-data-${armyId}`);
    if (cachedData) {
      armyData = JSON.parse(cachedData);
      console.log("Army data loaded from cache:", armyData);
      return;
    }

    // Fetch from army-forge API
    const response = await fetch(
      `https://army-forge.onepagerules.com/api/tts?id=${army.armyForgeID}`
    );
    if (!response.ok) throw new Error("Failed to load army data from API");

    armyData = await response.json();
    console.log("Army data loaded from API:", armyData);

    // Cache the data
    localStorage.setItem(`army-forge-data-${armyId}`, JSON.stringify(armyData));
  } catch (error) {
    console.error("Error loading army data:", error);
    throw error;
  }
}

// Load campaign data
async function loadCampaignData() {
  try {
    const response = await fetch("assets/json/campaign.json");
    if (!response.ok) throw new Error("Failed to load campaign data");

    campaignData = await response.json();
    console.log("Campaign data loaded:", campaignData);
  } catch (error) {
    console.error("Error loading campaign data:", error);
    throw error;
  }
}

// Load doctrines data
async function loadDoctrinesData() {
  try {
    const response = await fetch("assets/json/doctrines.json");
    if (!response.ok) throw new Error("Failed to load doctrines data");

    doctrinesData = await response.json();
    console.log("Doctrines data loaded:", doctrinesData);
  } catch (error) {
    console.error("Error loading doctrines data:", error);
    throw error;
  }
}

// Render the army header with information from campaign data
function renderArmyHeader() {
  if (!armyData || !campaignData) return;

  // Find the army in campaign data
  const army = campaignData.armies.find((a) => a.armyForgeID === armyData.id);
  if (!army) return;

  const headerContainer = document.getElementById("army-header");

  // Create image background with a gradient overlay
  headerContainer.style.backgroundImage = `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.7)), url(${army.image})`;
  headerContainer.style.backgroundSize = "cover";
  headerContainer.style.backgroundPosition = army.imagePosition || "center";
  headerContainer.style.color = "white";
  headerContainer.style.textShadow = "1px 1px 3px rgba(0, 0, 0, 0.8)";
  headerContainer.style.padding = "3rem 2rem";
  headerContainer.style.borderRadius = "0.5rem";
  headerContainer.style.marginBottom = "2rem";

  // Create army info content
  headerContainer.innerHTML = `
        <div class="row">
            <div class="col-md-8">
                <h1>${army.armyName}</h1>
                <h4 class="text-muted">${army.tagline}</h4>
                <div class="mt-3">
                    <span class="badge bg-primary me-2">${army.player}</span>
                    <span class="badge bg-secondary me-2">${army.playerTitle}</span>
                    <span class="badge bg-info me-2">W: ${army.wins}</span>
                    <span class="badge bg-danger me-2">L: ${army.losses}</span>
                    <span class="badge bg-success me-2">Objectives: ${army.objectives}</span>
                </div>
                <div class="mt-3 army-summary p-3">
                    <p>${army.summary}</p>
                </div>
                <button class="btn btn-sm btn-outline-light mt-2" type="button" data-bs-toggle="collapse" data-bs-target="#armyBio" aria-expanded="false" aria-controls="armyBio">
                    Show Full Backstory
                </button>
                <div class="collapse mt-3" id="armyBio">
                    <div class="card card-body bg-dark">
                        ${army.backstory}
                    </div>
                </div>
            </div>
            <div class="col-md-4">
                <div class="card bg-dark">
                    <div class="card-body">
                        <h5 class="card-title">Army Stats</h5>
                        <div id="points-stats">
                            <p>Loading points data...</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Calculate all points-related information
function calculatePoints() {
  if (!armyData || !campaignData) return;

  const army = campaignData.armies.find((a) => a.armyForgeID === armyData.id);
  if (!army) return;

  // Calculate points used by the army
  const pointsUsed = calculateArmyPoints();

  // Calculate available points based on campaign performance
  allowedArmyPoints =
    campaignData.basePoints +
    army.wins * 150 +
    army.losses * 300 +
    army.objectives * 75 +
    army.earnedPts;

  // Find the army with the most points
  const allArmyPoints = campaignData.armies.map((a) => {
    const points =
      a.basePoints +
      a.wins * 150 +
      a.losses * 300 +
      a.objectives * 75 +
      a.earnedPts;
    return points;
  });
  maxArmyPoints = Math.max(...allArmyPoints);

  // Find the army with the least points
  const minArmyPoints = Math.min(...allArmyPoints);

  // Calculate command points: 4 CP per 1000 points
  availableCommandPoints = 4 * Math.floor(pointsUsed / 1000);

  // Calculate underdog points: 1 per 50pts difference from highest army
  availableUnderdogPoints =
    pointsUsed < maxArmyPoints
      ? Math.floor((maxArmyPoints - pointsUsed) / 50)
      : 0;

  // Check if the army is over the allowed points or exceeds the minimum army by more than 250
  const isOverAllowedPoints = pointsUsed > allowedArmyPoints;
  const isOverMinimumArmyLimit = pointsUsed > minArmyPoints + 250;

  // Update the points stats in the header
  const pointsContainer = document.getElementById("points-stats");
  pointsContainer.innerHTML = `
        <div class="mb-3">
            <div class="d-flex justify-content-between">
                <span>Points Used:</span>
                <span class="${
                  isOverAllowedPoints || isOverMinimumArmyLimit
                    ? "text-danger"
                    : "text-success"
                }">${pointsUsed}</span>
            </div>
            <div class="d-flex justify-content-between">
                <span>Allowed Points:</span>
                <span>${allowedArmyPoints}</span>
            </div>
            <div class="progress mt-1" style="height: 10px;">
                <div class="progress-bar ${
                  isOverAllowedPoints ? "bg-danger" : "bg-success"
                }" role="progressbar" 
                    style="width: ${Math.min(
                      (pointsUsed / allowedArmyPoints) * 100,
                      100
                    )}%;" 
                    aria-valuenow="${pointsUsed}" 
                    aria-valuemin="0" 
                    aria-valuemax="${allowedArmyPoints}">
                </div>
            </div>
        </div>
        <div class="mb-3">
            <div class="d-flex justify-content-between align-items-center">
                <span>Command Points:</span>
                <div class="btn-group" role="group">
                    <button class="btn btn-sm btn-outline-secondary" id="cp-decrease">-</button>
                    <span class="badge bg-primary mx-2 fs-6" id="cp-counter">${availableCommandPoints}</span>
                    <button class="btn btn-sm btn-outline-secondary" id="cp-increase">+</button>
                </div>
            </div>
        </div>
        <div class="mb-3">
            <div class="d-flex justify-content-between align-items-center">
                <span>Underdog Points:</span>
                <div class="btn-group" role="group">
                    <button class="btn btn-sm btn-outline-secondary" id="up-decrease">-</button>
                    <span class="badge bg-warning mx-2 fs-6" id="up-counter">${availableUnderdogPoints}</span>
                    <button class="btn btn-sm btn-outline-secondary" id="up-increase">+</button>
                </div>
            </div>
        </div>
        ${
          isOverAllowedPoints || isOverMinimumArmyLimit
            ? `<div class="alert alert-danger mt-3 mb-0">
                ${
                  isOverAllowedPoints
                    ? "<p>Army exceeds allowed points!</p>"
                    : ""
                }
                ${
                  isOverMinimumArmyLimit
                    ? "<p>Army exceeds minimum army by more than 250 points!</p>"
                    : ""
                }
            </div>`
            : ""
        }
    `;
}

// Calculate total points used by the army
function calculateArmyPoints() {
  if (!armyData) return 0;

  let totalPoints = 0;

  // If we have processed units, use those
  if (armyData.processedUnits) {
    // Get all units that aren't joined to another unit
    const rootUnits = armyData.processedUnits.filter(
      (unit) => !unit.joinToUnit
    );

    rootUnits.forEach((unit) => {
      // Add the unit's cost
      totalPoints += calculateUnitPoints(unit);

      // Add costs for any joined units
      const joinedUnits = armyData.processedUnits.filter(
        (u) => u.joinToUnit === unit.selectionId
      );
      joinedUnits.forEach((joinedUnit) => {
        totalPoints += calculateUnitPoints(joinedUnit);
      });
    });
  } else {
    // Use the original units if processedUnits doesn't exist
    // This is your original implementation
    const rootUnits = armyData.units.filter((unit) => !unit.joinToUnit);

    rootUnits.forEach((unit) => {
      totalPoints += calculateUnitPoints(unit);

      const joinedUnits = armyData.units.filter(
        (u) => u.joinToUnit === unit.selectionId
      );
      joinedUnits.forEach((joinedUnit) => {
        totalPoints += calculateUnitPoints(joinedUnit);
      });
    });
  }

  return totalPoints;
}

// Calculate points for a single unit, including upgrades
function calculateUnitPoints(unit) {
  // Start with base cost
  let unitPoints = unit.cost || 0;

  // Add points from selected upgrades
  if (unit.selectedUpgrades && unit.selectedUpgrades.length > 0) {
    unit.selectedUpgrades.forEach((upgrade) => {
      if (upgrade.option && upgrade.option.costs) {
        const cost = upgrade.option.costs.find(
          (cost) => cost.unitId === unit.id
        );
        if (cost) {
          unitPoints += cost.cost;
        }
      }
    });
  }

  return unitPoints;
}

// Render the doctrine selection UI
function renderDoctrineSelection() {
  if (!doctrinesData || !doctrinesData.doctrines) return;

  const doctrineContainer = document.getElementById("doctrine-selection");

  // Get available doctrines for selection
  const availableDoctrines = doctrinesData.doctrines.filter(
    (d) => d.id !== "universal"
  );

  // Create a dropdown for selecting the second doctrine
  doctrineContainer.innerHTML = `
      <h2 class="mb-3">Doctrines</h2>
      <p>Select one doctrine in addition to the Universal Doctrine.</p>
      
      <div class="mb-3">
        <label for="doctrine-selector" class="form-label">Select Doctrine:</label>
        <select class="form-select" id="doctrine-selector">
          <option value="">-- Select a Doctrine --</option>
          ${availableDoctrines
            .map(
              (doctrine) =>
                `<option value="${doctrine.id}" ${
                  selectedDoctrines.includes(doctrine.id) ? "selected" : ""
                }>
              ${doctrine.name}
            </option>`
            )
            .join("")}
        </select>
      </div>
      
      <div class="row row-cols-1 row-cols-md-2 g-4" id="selected-doctrines">
        <!-- Universal Doctrine (always shown) -->
        ${createDoctrineCard(
          doctrinesData.doctrines.find((d) => d.id === "universal"),
          true
        )}
        
        <!-- Selected Doctrine (if any) -->
        ${selectedDoctrines
          .filter((id) => id !== "universal")
          .map((id) =>
            createDoctrineCard(doctrinesData.doctrines.find((d) => d.id === id))
          )
          .join("")}
      </div>
    `;

  // Add event listener to the doctrine selector
  document
    .getElementById("doctrine-selector")
    .addEventListener("change", function () {
      const selectedId = this.value;
      toggleDoctrine(selectedId);
    });
}

// Create a single doctrine card
function createDoctrineCard(doctrine) {
  if (!doctrine) return "";

  return `
      <div class="col">
        <div class="card h-100 doctrine-card doctrine-selected" data-doctrine="${
          doctrine.id
        }">
          <div class="card-header bg-${doctrine.color}">
            <h5 class="card-title mb-0 text-white">
              <i class="bi ${doctrine.icon}"></i> ${doctrine.name}
            </h5>
          </div>
          <div class="card-body">
            <div class="stratagems-list">
              ${doctrine.stratagems
                .map(
                  (stratagem) => `
                <div class="stratagem mb-2">
                  <div class="d-flex justify-content-between align-items-center">
                    <span class="stratagem-name fw-bold">${stratagem.name}</span>
                    <span class="badge bg-secondary">${stratagem.cost} CP</span>
                  </div>
                  <p class="mb-0 small">${stratagem.description}</p>
                </div>
              `
                )
                .join("")}
            </div>
          </div>
        </div>
      </div>
    `;
}

// Toggle a doctrine selection
function toggleDoctrine(doctrineId) {
  // Universal doctrine is always selected and can't be toggled
  if (doctrineId === "universal") return;

  // Always start with universal doctrine
  selectedDoctrines = ["universal"];

  // Add the new doctrine if one was selected
  if (doctrineId) {
    selectedDoctrines.push(doctrineId);
  }

  // Save selected doctrines to local storage
  saveDoctrines();

  // Re-render the selected doctrines
  renderSelectedDoctrines();

  // Show toast notification
  if (doctrineId) {
    const selectedDoctrine = doctrinesData.doctrines.find(
      (d) => d.id === doctrineId
    );
    if (selectedDoctrine) {
      showToast(`Doctrine selected: ${selectedDoctrine.name}`, "success");
    } else {
      showToast(`Doctrine selected`, "success");
    }
  }
}

// Render just the selected doctrines
function renderSelectedDoctrines() {
  const container = document.getElementById("selected-doctrines");
  if (!container) return;

  // Get the universal doctrine and the selected doctrine
  const universalDoctrine = doctrinesData.doctrines.find(
    (d) => d.id === "universal"
  );
  const selectedDoctrineIds = selectedDoctrines.filter(
    (id) => id !== "universal"
  );
  const selectedDoctrine =
    selectedDoctrineIds.length > 0
      ? doctrinesData.doctrines.find((d) => d.id === selectedDoctrineIds[0])
      : null;

  // Generate HTML for the cards
  let html = "";

  // Add universal doctrine
  if (universalDoctrine) {
    html += createDoctrineCard(universalDoctrine);
  }

  // Add selected doctrine if any
  if (selectedDoctrine) {
    html += createDoctrineCard(selectedDoctrine);
  }

  // Update the container
  container.innerHTML = html;
}

// Save selected doctrines to local storage
function saveDoctrines() {
  const armyId = armyData?.id;
  if (!armyId) return;

  localStorage.setItem(
    `${armyId}-doctrines`,
    JSON.stringify(selectedDoctrines)
  );
}

// Set up listeners for Command Points and Underdog Points
function setupPointsListeners() {
  // Calculate maximum CP and UP
  const maxCommandPoints = 4 * Math.floor(calculateArmyPoints() / 1000);
  const maxUnderdogPoints = Math.floor(
    (maxArmyPoints - calculateArmyPoints()) / 50
  );

  // Command Points
  document.getElementById("cp-decrease")?.addEventListener("click", () => {
    if (availableCommandPoints > 0) {
      availableCommandPoints--;
      document.getElementById("cp-counter").textContent =
        availableCommandPoints;
      localStorage.setItem(
        `${armyData.id}-command-points`,
        availableCommandPoints
      );
      showToast("Command Point spent", "info");
    }
  });

  document.getElementById("cp-increase")?.addEventListener("click", () => {
    if (availableCommandPoints < maxCommandPoints) {
      availableCommandPoints++;
      document.getElementById("cp-counter").textContent =
        availableCommandPoints;
      localStorage.setItem(
        `${armyData.id}-command-points`,
        availableCommandPoints
      );
      showToast("Command Point gained", "success");
    } else {
      showToast("Maximum Command Points reached!", "warning");
    }
  });

  // Underdog Points
  document.getElementById("up-decrease")?.addEventListener("click", () => {
    if (availableUnderdogPoints > 0) {
      availableUnderdogPoints--;
      document.getElementById("up-counter").textContent =
        availableUnderdogPoints;
      localStorage.setItem(
        `${armyData.id}-underdog-points`,
        availableUnderdogPoints
      );
      showToast("Underdog Point spent", "info");
    }
  });

  document.getElementById("up-increase")?.addEventListener("click", () => {
    if (availableUnderdogPoints < maxUnderdogPoints) {
      availableUnderdogPoints++;
      document.getElementById("up-counter").textContent =
        availableUnderdogPoints;
      localStorage.setItem(
        `${armyData.id}-underdog-points`,
        availableUnderdogPoints
      );
      showToast("Underdog Point gained", "success");
    } else {
      showToast("Maximum Underdog Points reached!", "warning");
    }
  });
}

// Set up morale test UI
function setupMoraleTest(unitId) {
  const unit = armyData.units.find((u) => u.selectionId === unitId);
  if (!unit) return;

  const unitStatus = getUnitStatus(unitId);

  // If the unit is already Shaken, it automatically fails morale tests
  if (unitStatus.shaken) {
    showToast(
      "Unit is already Shaken and automatically fails morale tests",
      "warning"
    );
    return;
  }

  // Get the card and show the result buttons
  const card = document.getElementById(`unit-${unitId}`);
  if (!card) return;

  const moraleTestButton = card.querySelector('[data-action="morale-test"]');
  const passedButton = card.querySelector('[data-action="morale-passed"]');
  const failedButton = card.querySelector('[data-action="morale-failed"]');

  if (moraleTestButton && passedButton && failedButton) {
    moraleTestButton.style.display = "none";
    passedButton.style.display = "inline-block";
    failedButton.style.display = "inline-block";
  }

  // Show toast with instructions
  showToast(
    `Roll for morale test (need ${unit.quality}+). Click Passed or Failed based on your roll.`,
    "info"
  );
}

// Handle morale test result
function handleMoraleResult(unitId, passed) {
  const unit = armyData.units.find((u) => u.selectionId === unitId);
  if (!unit) return;

  const unitStatus = getUnitStatus(unitId);
  const card = document.getElementById(`unit-${unitId}`);

  // Hide result buttons and show the test button again
  const moraleTestButton = card.querySelector('[data-action="morale-test"]');
  const passedButton = card.querySelector('[data-action="morale-passed"]');
  const failedButton = card.querySelector('[data-action="morale-failed"]');

  if (moraleTestButton && passedButton && failedButton) {
    moraleTestButton.style.display = "inline-block";
    passedButton.style.display = "none";
    failedButton.style.display = "none";
  }

  if (passed) {
    showToast(
      `Unit ${unit.customName || unit.name} passed morale test!`,
      "success"
    );
  } else {
    // Check if unit is below half strength
    const isHalfStrength = isUnitBelowHalfStrength(unitId);

    if (isHalfStrength) {
      unitStatus.routed = true;
      unitStatus.shaken = true;
      showToast(
        `Unit ${
          unit.customName || unit.name
        } failed morale test and is below half strength - it Routs!`,
        "danger"
      );
    } else {
      unitStatus.shaken = true;
      showToast(
        `Unit ${
          unit.customName || unit.name
        } failed morale test and becomes Shaken!`,
        "warning"
      );
    }

    saveUnitStatus(unitId, unitStatus);
    updateUnitStatusDisplay(unitId);
  }
}

// Check if a unit is below half strength
function isUnitBelowHalfStrength(unitId) {
  const unit = armyData.units.find((u) => u.selectionId === unitId);
  if (!unit) return false;

  const healthData = getUnitHealth(unitId);
  const unitSize = unit.size || 1;
  const toughValue = getToughValue(unit);

  // For a single model with Tough
  if (unitSize === 1 && toughValue > 0) {
    if (!healthData.wounds) return false;
    const woundedCount = healthData.wounds.filter((wound) => wound).length;
    return woundedCount >= Math.ceil(toughValue / 2);
  }

  // For a single model without Tough
  if (unitSize === 1 && toughValue <= 1) {
    return !healthData.alive;
  }

  // For multi-model unit
  if (!healthData.models) return false;
  const deadCount = healthData.models.filter((model) => !model).length;
  return deadCount >= Math.ceil(unitSize / 2);
}

// Add health tracker event listeners
function addHealthTrackerListeners() {
  // Single model alive/dead toggle
  document
    .querySelectorAll('[data-action="set-alive"], [data-action="set-dead"]')
    .forEach((button) => {
      button.addEventListener("click", () => {
        const unitId = button.dataset.unit;
        const isAlive = button.dataset.action === "set-alive";
        const healthData = getUnitHealth(unitId);

        healthData.alive = isAlive;
        saveUnitHealth(unitId, healthData);

        // Update UI: Toggle buttons
        const aliveButton = document.querySelector(
          `[data-action="set-alive"][data-unit="${unitId}"]`
        );
        const deadButton = document.querySelector(
          `[data-action="set-dead"][data-unit="${unitId}"]`
        );

        if (aliveButton && deadButton) {
          aliveButton.className = `btn btn-sm ${
            isAlive ? "btn-success" : "btn-secondary"
          }`;
          deadButton.className = `btn btn-sm ${
            !isAlive ? "btn-danger" : "btn-secondary"
          }`;
        }

        // Update UI: Progress bar
        const progressBar = document.querySelector(
          `.single-model-health .progress-bar[aria-valuenow]`
        );
        if (progressBar) {
          progressBar.style.width = isAlive ? "100%" : "0%";
          progressBar.setAttribute("aria-valuenow", isAlive ? "1" : "0");
          progressBar.className = `progress-bar ${
            isAlive ? "bg-success" : "bg-danger"
          }`;
        }
      });
    });

  // Multi-wound model wound/heal
  document
    .querySelectorAll('[data-action="wound"], [data-action="heal"]')
    .forEach((button) => {
      button.addEventListener("click", () => {
        const unitId = button.dataset.unit;
        const unit = armyData.units.find((u) => u.selectionId === unitId);
        if (!unit) return;

        const toughValue = getToughValue(unit);
        const healthData = getUnitHealth(unitId);

        if (!healthData.wounds) {
          healthData.wounds = Array(toughValue).fill(false);
        }

        const woundedCount = healthData.wounds.filter((wound) => wound).length;
        const isWounding = button.dataset.action === "wound";

        if (isWounding && woundedCount < toughValue) {
          // Add a wound
          const firstUnwoundedIndex = healthData.wounds.findIndex(
            (wound) => !wound
          );
          if (firstUnwoundedIndex !== -1) {
            healthData.wounds[firstUnwoundedIndex] = true;
          }
        } else if (!isWounding && woundedCount > 0) {
          // Heal a wound
          const lastWoundedIndex = [...healthData.wounds]
            .reverse()
            .findIndex((wound) => wound);
          if (lastWoundedIndex !== -1) {
            healthData.wounds[toughValue - 1 - lastWoundedIndex] = false;
          }
        }

        saveUnitHealth(unitId, healthData);

        // Get new wounded count
        const newWoundedCount = healthData.wounds.filter(
          (wound) => wound
        ).length;
        const currentWounds = toughValue - newWoundedCount;
        const healthPercentage = (currentWounds / toughValue) * 100;

        // Update HP text
        const hpCurrentElement = button
          .closest(".multi-wound-model")
          .querySelector(".hp-current");
        if (hpCurrentElement) {
          hpCurrentElement.textContent = currentWounds;
        }

        // Update progress bar
        const progressBar = button
          .closest(".multi-wound-model")
          .querySelector(".progress-bar");
        if (progressBar) {
          progressBar.style.width = `${healthPercentage}%`;
          progressBar.setAttribute("aria-valuenow", currentWounds);

          // Update color based on health percentage
          progressBar.classList.remove("bg-success", "bg-warning", "bg-danger");
          if (healthPercentage > 66) {
            progressBar.classList.add("bg-success");
          } else if (healthPercentage > 33) {
            progressBar.classList.add("bg-warning");
          } else {
            progressBar.classList.add("bg-danger");
          }
        }
      });
    });

  // Multi-model unit kill/revive
  document
    .querySelectorAll(
      '[data-action="kill-model"], [data-action="revive-model"]'
    )
    .forEach((button) => {
      button.addEventListener("click", () => {
        const unitId = button.dataset.unit;
        const unit = armyData.units.find((u) => u.selectionId === unitId);
        if (!unit) return;

        const unitSize = unit.size || 1;
        const healthData = getUnitHealth(unitId);

        if (!healthData.models) {
          healthData.models = Array(unitSize).fill(true);
        }

        const aliveCount = healthData.models.filter((model) => model).length;
        const isKilling = button.dataset.action === "kill-model";

        if (isKilling && aliveCount > 0) {
          // Kill a model
          const lastAliveIndex = [...healthData.models]
            .reverse()
            .findIndex((model) => model);
          if (lastAliveIndex !== -1) {
            healthData.models[unitSize - 1 - lastAliveIndex] = false;
          }
        } else if (!isKilling && aliveCount < unitSize) {
          // Revive a model
          const firstDeadIndex = healthData.models.findIndex((model) => !model);
          if (firstDeadIndex !== -1) {
            healthData.models[firstDeadIndex] = true;
          }
        }

        saveUnitHealth(unitId, healthData);

        // Update UI
        const newAliveCount = healthData.models.filter((model) => model).length;

        // Update counter
        const counterSpan = document.querySelector(
          `.models-counter[data-unit="${unitId}"] span, .multi-model-unit span.fw-bold`
        );
        if (counterSpan) {
          counterSpan.textContent = `${newAliveCount}/${unitSize}`;
        }

        // Update progress bar
        const progressBar = document.querySelector(
          `.multi-model-unit .progress-bar`
        );
        if (progressBar) {
          progressBar.style.width = `${(newAliveCount / unitSize) * 100}%`;
          progressBar.setAttribute("aria-valuenow", newAliveCount);
        }

        // Update model cards/buttons
        updateModelCardStatuses(unitId, healthData.models);
      });
    });

  // Individual model toggle buttons
  document
    .querySelectorAll('[data-action="toggle-model"]')
    .forEach((button) => {
      button.addEventListener("click", () => {
        const unitId = button.dataset.unit;
        const modelIndex = parseInt(button.dataset.model);
        const unit = armyData.units.find((u) => u.selectionId === unitId);
        if (!unit || isNaN(modelIndex)) return;

        const healthData = getUnitHealth(unitId);

        if (!healthData.models) {
          healthData.models = Array(unit.size).fill(true);
        }

        // Toggle model status
        healthData.models[modelIndex] = !healthData.models[modelIndex];
        saveUnitHealth(unitId, healthData);

        // Update button appearance
        const isAlive = healthData.models[modelIndex];
        button.textContent = isAlive ? "Alive" : "Dead";
        button.classList.remove("btn-success", "btn-danger");
        button.classList.add(isAlive ? "btn-success" : "btn-danger");

        // Update card appearance
        const card = button.closest(".model-card");
        if (card) {
          card.classList.remove("model-alive-card", "model-dead-card");
          card.classList.add(isAlive ? "model-alive-card" : "model-dead-card");
        }

        // Update counter and progress bar
        const unitSize = unit.size || 1;
        const aliveCount = healthData.models.filter((m) => m).length;

        const counterSpan = document.querySelector(
          `.models-counter[data-unit="${unitId}"] span, .multi-model-unit span.fw-bold`
        );
        if (counterSpan) {
          counterSpan.textContent = `${aliveCount}/${unitSize}`;
        }

        const progressBar = document.querySelector(
          `.multi-model-unit .progress-bar`
        );
        if (progressBar) {
          progressBar.style.width = `${(aliveCount / unitSize) * 100}%`;
          progressBar.setAttribute("aria-valuenow", aliveCount);
        }
      });
    });
}

// Helper function to update model card statuses
function updateModelCardStatuses(unitId, modelStatuses) {
  if (!modelStatuses) return;

  modelStatuses.forEach((isAlive, index) => {
    // Find the toggle button for this model
    const button = document.querySelector(
      `[data-action="toggle-model"][data-unit="${unitId}"][data-model="${index}"]`
    );
    if (button) {
      button.textContent = isAlive ? "Alive" : "Dead";
      button.classList.remove("btn-success", "btn-danger");
      button.classList.add(isAlive ? "btn-success" : "btn-danger");

      // Update card appearance
      const card = button.closest(".model-card");
      if (card) {
        card.classList.remove("model-alive-card", "model-dead-card");
        card.classList.add(isAlive ? "model-alive-card" : "model-dead-card");
      }
    }
  });
}

// Handle melee events
function setupMeleeListeners() {
  // In melee toggle
  document.querySelectorAll('[data-action="in-melee"]').forEach((button) => {
    button.addEventListener("click", () => {
      const unitId = button.dataset.unit;
      const unitStatus = getUnitStatus(unitId);

      unitStatus.inMelee = !unitStatus.inMelee;
      saveUnitStatus(unitId, unitStatus);

      // Toggle button state
      button.classList.toggle("btn-outline-warning");
      button.classList.toggle("btn-warning");

      showToast(
        `Unit ${unitStatus.inMelee ? "entered" : "left"} melee`,
        "info"
      );
    });
  });

  // Strike back toggle
  document.querySelectorAll('[data-action="strike-back"]').forEach((button) => {
    button.addEventListener("click", () => {
      const unitId = button.dataset.unit;
      const unitStatus = getUnitStatus(unitId);

      unitStatus.hasStruckBack = !unitStatus.hasStruckBack;
      saveUnitStatus(unitId, unitStatus);

      // Toggle button state
      button.classList.toggle("btn-outline-info");
      button.classList.toggle("btn-info");

      showToast(
        `Unit ${
          unitStatus.hasStruckBack ? "has struck back" : "can strike back"
        }`,
        "info"
      );
    });
  });

  // Won melee
  document.querySelectorAll('[data-action="won-melee"]').forEach((button) => {
    button.addEventListener("click", () => {
      const unitId = button.dataset.unit;
      const unit = armyData.units.find((u) => u.selectionId === unitId);
      if (!unit) return;

      showToast(`${unit.customName || unit.name} won melee!`, "success");
    });
  });

  // Lost melee
  document.querySelectorAll('[data-action="lost-melee"]').forEach((button) => {
    button.addEventListener("click", () => {
      const unitId = button.dataset.unit;
      const unit = armyData.units.find((u) => u.selectionId === unitId);
      if (!unit) return;

      showToast(
        `${unit.customName || unit.name} lost melee - take a morale test!`,
        "warning"
      );
      setupMoraleTest(unitId);
    });
  });
}

// Add morale test listeners
function setupMoraleListeners() {
  // Initiate morale test
  document.querySelectorAll('[data-action="morale-test"]').forEach((button) => {
    button.addEventListener("click", () => {
      const unitId = button.dataset.unit;
      setupMoraleTest(unitId);
    });
  });

  // Morale test passed
  document
    .querySelectorAll('[data-action="morale-passed"]')
    .forEach((button) => {
      button.addEventListener("click", () => {
        const unitId = button.dataset.unit;
        handleMoraleResult(unitId, true);
      });
    });

  // Morale test failed
  document
    .querySelectorAll('[data-action="morale-failed"]')
    .forEach((button) => {
      button.addEventListener("click", () => {
        const unitId = button.dataset.unit;
        handleMoraleResult(unitId, false);
      });
    });
}
// Load selected doctrines from local storage
function loadDoctrines() {
  const armyId = armyData?.id;
  if (!armyId) return;

  const savedDoctrines = localStorage.getItem(`${armyId}-doctrines`);
  if (savedDoctrines) {
    try {
      selectedDoctrines = JSON.parse(savedDoctrines);

      // Ensure Universal is always included
      if (!selectedDoctrines.includes("universal")) {
        selectedDoctrines.push("universal");
      }

      console.log("Loaded doctrines from localStorage:", selectedDoctrines);

      // Update the dropdown selection to match loaded doctrines
      const selector = document.getElementById("doctrine-selector");
      if (selector) {
        // Find the non-universal doctrine
        const nonUniversalDoctrine = selectedDoctrines.find(
          (id) => id !== "universal"
        );
        if (nonUniversalDoctrine) {
          selector.value = nonUniversalDoctrine;
        } else {
          selector.value = "";
        }
      }

      // Update the doctrine cards display
      renderSelectedDoctrines();
    } catch (error) {
      console.error("Error parsing saved doctrines:", error);
      selectedDoctrines = ["universal"]; // Fallback to just universal
    }
  }
}

// Render all unit cards
function renderUnitCards() {
  if (!armyData || !armyData.units) return;

  const unitsContainer = document.getElementById("unit-cards-container");
  unitsContainer.innerHTML = ""; // Clear existing content

  // Process combined units first
  processCombinedUnits();

  // Use either processed units (with combined units merged) or original units
  const unitsToRender = armyData.processedUnits || armyData.units;

  // Organize units by hierarchy (root units and their joined units)
  const rootUnits = unitsToRender.filter((unit) => !unit.joinToUnit);

  rootUnits.forEach((rootUnit) => {
    // Find and add any joined units
    const joinedUnits = unitsToRender.filter(
      (unit) => unit.joinToUnit === rootUnit.selectionId
    );

    if (joinedUnits.length > 0) {
      // Create a joined unit card group
      createJoinedUnitGroup(rootUnit, joinedUnits, unitsContainer);
    } else {
      // Create a regular unit card
      const unitCard = createUnitCard(rootUnit);
      unitsContainer.appendChild(unitCard);
    }
  });

  // Add all event listeners
  addUnitCardEventListeners();
  // Add model name editing listeners
  addModelNameEditingListeners();
}

// Create a joined unit group
function createJoinedUnitGroup(rootUnit, joinedUnits, container) {
  // Create the main container
  const groupContainer = document.createElement("div");
  groupContainer.className = "joined-unit-group mb-4";
  groupContainer.id = `unit-group-${rootUnit.selectionId}`;

  // Create the main unit card with all its info
  const mainCard = createUnitCard(rootUnit);
  mainCard.classList.add("main-unit-card");
  groupContainer.appendChild(mainCard);

  // Create a joined units container
  const joinedContainer = document.createElement("div");
  joinedContainer.className = "joined-units ms-4 mt-2";

  // Add joined units info
  const joinedInfo = document.createElement("div");
  joinedInfo.className = "joined-info alert alert-warning py-2";
  joinedInfo.innerHTML = `
      <small>
        <i class="bi bi-info-circle-fill me-2"></i>
        Joined units use the base unit's Defense (${rootUnit.defense}+), 
        but the whole unit uses the Heroes' Quality (${Math.min(
          ...joinedUnits.map((u) => u.quality)
        )}+) 
        for Morale tests.
      </small>
    `;
  joinedContainer.appendChild(joinedInfo);

  // Add each joined unit
  joinedUnits.forEach((joinedUnit) => {
    const joinedCard = createUnitCard(joinedUnit, true);
    joinedContainer.appendChild(joinedCard);
  });

  groupContainer.appendChild(joinedContainer);
  container.appendChild(groupContainer);
}

// Create a single unit card
function createUnitCard(unit, isJoined = false) {
  const icons = {
    quality: `
      <svg
        class="stat-icon"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
      >
        <path
          style="fill: #ad3e25"
          d="m8 0 1.669.864 1.858.282.842 1.68 1.337 1.32L13.4 6l.306 1.854-1.337 1.32-.842 1.68-1.858.282L8 12l-1.669-.864-1.858-.282-.842-1.68-1.337-1.32L2.6 6l-.306-1.854 1.337-1.32.842-1.68L6.331.864z"
        />
        <path
          style="fill: #f9ddb7"
          d="M4 11.794V16l4-1 4 1v-4.206l-2.018.306L8 13.126 6.018 12.1z"
        />
      </svg>`,
    defense: `
      <svg
        class="stat-icon"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
      >
        <path
          style="fill: #005f83"
          d="M5.072.56C6.157.265 7.31 0 8 0s1.843.265 2.928.56c1.11.3 2.229.655 2.887.87a1.54 1.54 0 0 1 1.044 1.262c.596 4.477-.787 7.795-2.465 9.99a11.8 11.8 0 0 1-2.517 2.453 7 7 0 0 1-1.048.625c-.28.132-.581.24-.829.24s-.548-.108-.829-.24a7 7 0 0 1-1.048-.625 11.8 11.8 0 0 1-2.517-2.453C1.928 10.487.545 7.169 1.141 2.692A1.54 1.54 0 0 1 2.185 1.43 63 63 0 0 1 5.072.56"
        />
      </svg>`,
    tough: `
      <svg
        class="stat-icon"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
      >
        <path
          style="fill: #dc3545"
          d="M8 1.314C12.438-3.248 23.534 4.735 8 15-7.534 4.736 3.562-3.248 8 1.314"
        />
      </svg>`,
  };

  // Calculate points for this unit
  const unitPoints = calculateUnitPoints(unit);

  // Determine if this is a combined unit
  const isCombined = unit.combined;

  // Get unit status
  const unitStatus = getUnitStatus(unit.selectionId);

  // Create card container
  const card = document.createElement("div");
  card.className = `card unit-card mb-3 ${isJoined ? "unit-joined" : ""} ${
    isCombined ? "unit-combined" : ""
  }`;
  card.id = `unit-${unit.selectionId}`;
  card.dataset.unitId = unit.id;
  card.dataset.selectionId = unit.selectionId;

  // Add status indicator class
  if (unitStatus.shaken) card.classList.add("unit-shaken");
  if (unitStatus.fatigued) card.classList.add("unit-fatigued");
  if (unitStatus.routed) card.classList.add("unit-routed");

  // Create card header
  const header = document.createElement("div");
  header.className =
    "card-header d-flex justify-content-between align-items-center";

  const customName = unit.customName || unit.name;
  header.innerHTML = `
      <div>
        <div class="d-flex align-items-center gap-2">
          <h4 class="mb-0">${customName}</h4>
          ${
            unitStatus.shaken
              ? '<span class="badge bg-warning">Shaken</span>'
              : ""
          }
          ${
            unitStatus.fatigued
              ? '<span class="badge bg-secondary">Fatigued</span>'
              : ""
          }
          ${
            unitStatus.routed
              ? '<span class="badge bg-danger">Routed</span>'
              : ""
          }
        </div>
        <div class="unit-meta">
          <span class="badge bg-secondary me-1">XP: ${unit.xp}</span>
          <span class="badge bg-info me-1">${unit.name}</span>
          <span class="badge bg-primary me-1">${unitPoints} pts</span>
          ${isJoined ? '<span class="badge bg-warning me-1">Joined</span>' : ""}
          ${
            isCombined
              ? `
            <div class="mt-1 small text-muted">
              Combined unit (${unit.combinedUnits || 0} units)
              ${
                unit.originalUnits
                  ? `<span class="ms-2">Original units: ${unit.originalUnits
                      .map((u) => u.customName || u.name)
                      .join(", ")}</span>`
                  : ""
              }
            </div>`
              : ""
          }
        </div>
      </div>
      <div class="unit-stats hstack gap-2">
        <div class="stat-pill stat-quality" title="Quality - Roll this or higher to hit">
          ${icons.quality}
          <span class="stat-value">${unit.quality}+</span>
        </div>
        <div class="stat-pill stat-defense" title="Defense - Roll this or higher to block hits">
          ${icons.defense}
          <span class="stat-value">${unit.defense}+</span>
        </div>
        ${
          getToughValue(unit) > 0
            ? `
            <div class="stat-pill stat-tough" title="Tough - Unit has ${getToughValue(
              unit
            )} wounds">
              ${icons.tough}
              <span class="stat-value">${getToughValue(unit)}</span>
            </div>
            `
            : ""
        }
      </div>
    `;

  // Create card body with no tabs
  const body = document.createElement("div");
  body.className = "card-body";

  // Create the body content without tabs
  body.innerHTML = `
      <div class="row mb-3">
        <div class="col-md-6">
          <div class="unit-size">
            <strong>Size:</strong> ${unit.size} model${
    unit.size !== 1 ? "s" : ""
  }
          </div>
          <div class="unit-base-size">
            <strong>Base Size:</strong> ${getBaseSize(unit)}
          </div>
          <div class="unit-morale-threshold">
            <strong>Morale Test:</strong> Required if unit has ${getMoraleThreshold(
              unit
            )} or fewer ${unit.size === 1 ? "wounds" : "models"} remaining
          </div>
        </div>
        <div class="col-md-6">
          <div class="unit-special-rules">
            <strong>Special Rules:</strong>
            <div class="rules-list mt-1">
              ${createRulesList(unit)}
            </div>
          </div>
        </div>
      </div>
  
      <!-- Weapons Section -->
      <div class="section mb-3">
        <h5 class="section-title">Weapons</h5>
        ${createWeaponsTable(unit)}
      </div>
      
      <!-- Health Section -->
      <div class="section mb-3">
        <h5 class="section-title">Health</h5>
        ${createHealthTracker(unit)}
      </div>
      
      <!-- Status Section -->
      <div class="section mb-3">
        <h5 class="section-title">Status</h5>
        <div class="status-toggles mb-2 d-flex flex-wrap gap-2">
          <button class="btn btn-sm ${
            unitStatus.shaken ? "btn-warning" : "btn-outline-warning"
          } status-toggle" 
            data-status="shaken" data-unit="${unit.selectionId}">Shaken</button>
          <button class="btn btn-sm ${
            unitStatus.fatigued ? "btn-secondary" : "btn-outline-secondary"
          } status-toggle" 
            data-status="fatigued" data-unit="${
              unit.selectionId
            }">Fatigued</button>
          <button class="btn btn-sm ${
            unitStatus.routed ? "btn-danger" : "btn-outline-danger"
          } status-toggle" 
            data-status="routed" data-unit="${unit.selectionId}">Routed</button>
        </div>
        
        <div class="unit-activation mb-3">
          <h6>Activation</h6>
          <div class="activation-buttons d-flex flex-wrap gap-2 mb-2">
            <button class="btn btn-sm btn-outline-secondary activation-button ${
              unitStatus.action === "hold" ? "btn-secondary" : ""
            }" 
              data-action="hold" data-unit="${unit.selectionId}" ${
    unitStatus.shaken ? "disabled" : ""
  }>Hold</button>
            <button class="btn btn-sm btn-outline-success activation-button ${
              unitStatus.action === "advance" ? "btn-success" : ""
            }" 
              data-action="advance" data-unit="${unit.selectionId}" ${
    unitStatus.shaken ? "disabled" : ""
  }>Advance</button>
            <button class="btn btn-sm btn-outline-primary activation-button ${
              unitStatus.action === "rush" ? "btn-primary" : ""
            }" 
              data-action="rush" data-unit="${unit.selectionId}" ${
    unitStatus.shaken ? "disabled" : ""
  }>Rush</button>
            <button class="btn btn-sm btn-outline-danger activation-button ${
              unitStatus.action === "charge" ? "btn-danger" : ""
            }" 
              data-action="charge" data-unit="${unit.selectionId}" ${
    unitStatus.shaken ? "disabled" : ""
  }>Charge</button>
          </div>
        </div>
        
        <div class="unit-melee mb-3">
          <h6>Melee</h6>
          <div class="melee-buttons d-flex flex-wrap gap-2 mb-2">
            <button class="btn btn-sm btn-outline-warning melee-button ${
              unitStatus.inMelee ? "btn-warning" : ""
            }" 
              data-action="in-melee" data-unit="${unit.selectionId}" ${
    unitStatus.shaken ? "disabled" : ""
  }>In Melee</button>
            <button class="btn btn-sm btn-outline-info melee-button ${
              unitStatus.hasStruckBack ? "btn-info" : ""
            }" 
              data-action="strike-back" data-unit="${unit.selectionId}" ${
    unitStatus.shaken ? "disabled" : ""
  }>Strike Back</button>
            
            <button class="btn btn-sm btn-outline-success melee-button" 
              data-action="won-melee" data-unit="${unit.selectionId}" ${
    unitStatus.shaken ? "disabled" : ""
  }>Won Melee</button>
            <button class="btn btn-sm btn-outline-danger melee-button" 
              data-action="lost-melee" data-unit="${unit.selectionId}" ${
    unitStatus.shaken ? "disabled" : ""
  }>Lost Melee</button>
          </div>
        </div>
        
        <div class="unit-morale">
          <h6>Morale Test</h6>
          <div class="morale-buttons d-flex flex-wrap gap-2 mb-2">
            <button class="btn btn-sm btn-outline-warning morale-button" 
              data-action="morale-test" data-unit="${unit.selectionId}" ${
    unitStatus.shaken ? "disabled" : ""
  }>Take Morale Test</button>
            <button class="btn btn-sm btn-outline-success morale-result-button" 
              data-action="morale-passed" data-unit="${
                unit.selectionId
              }" style="display: none;">Passed</button>
            <button class="btn btn-sm btn-outline-danger morale-result-button" 
              data-action="morale-failed" data-unit="${
                unit.selectionId
              }" style="display: none;">Failed</button>
          </div>
        </div>
      </div>
      
      ${
        hasCaster(unit)
          ? `
          <!-- Spells Section -->
          <div class="section mb-3">
            <h5 class="section-title">Spells (Caster ${getCasterLevel(
              unit
            )})</h5>
            <div class="spell-tokens mb-3">
              <div class="spell-token-container d-flex gap-2 mb-2" data-max="${getCasterLevel(
                unit
              )}" data-unit="${unit.selectionId}">
                ${Array(getCasterLevel(unit))
                  .fill()
                  .map(
                    (_, i) => `
                    <div class="spell-token ${
                      getSpellTokenStatus(unit.selectionId, i) ? "spent" : ""
                    }" 
                      data-token="${i}" data-unit="${unit.selectionId}"></div>
                  `
                  )
                  .join("")}
              </div>
              <button class="btn btn-sm btn-outline-primary" data-action="reset-tokens" data-unit="${
                unit.selectionId
              }">
                Reset Tokens
              </button>
            </div>
          </div>
          `
          : ""
      }
    `;

  // Assemble the card
  card.appendChild(header);
  card.appendChild(body);

  return card;
}

// Get spell token status
function getSpellTokenStatus(unitId, tokenIndex) {
  const key = `unit-tokens-${armyData.id}-${unitId}`;
  const savedTokens = localStorage.getItem(key);

  if (!savedTokens) return false;

  const spentTokens = JSON.parse(savedTokens);
  return tokenIndex < spentTokens.length ? spentTokens[tokenIndex] : false;
}

// Spell token event listeners
function setupSpellTokenListeners() {
  // Spell tokens click
  document.querySelectorAll(".spell-token").forEach((token) => {
    token.addEventListener("click", () => {
      token.classList.toggle("spent");
      const unitId = token.dataset.unit;
      saveSpellTokens(unitId);

      showToast(
        "Spell token " +
          (token.classList.contains("spent") ? "spent" : "restored"),
        token.classList.contains("spent") ? "warning" : "success"
      );
    });
  });

  // Reset spell tokens
  document
    .querySelectorAll('[data-action="reset-tokens"]')
    .forEach((button) => {
      button.addEventListener("click", () => {
        const unitId = button.dataset.unit;
        resetSpellTokens(unitId);

        showToast("Spell tokens reset", "success");
      });
    });
}

// Create health tracker
function createHealthTracker(unit) {
  // Determine total number of models and wounds
  const unitSize = unit.size || 1;
  const toughValue = getToughValue(unit);
  const unitId = unit.selectionId;

  // Get health from localStorage
  const healthData = getUnitHealth(unitId);

  // Common function to determine health percentage and color class
  const getHealthStatus = (current, max) => {
    const healthPercentage = (current / max) * 100;
    let colorClass = "bg-success";

    if (healthPercentage <= 33) {
      colorClass = "bg-danger";
    } else if (healthPercentage <= 66) {
      colorClass = "bg-warning";
    }

    return { percentage: healthPercentage, colorClass };
  };

  if (unitSize === 1 && toughValue <= 1) {
    // Single model with 1 wound
    const isAlive = healthData.alive !== false;
    const { percentage, colorClass } = getHealthStatus(isAlive ? 1 : 0, 1);

    return `
      <div class="single-model-health">
        <div class="d-flex align-items-center gap-3 mb-2">
          <div class="btn-group" role="group">
            <button class="btn btn-sm ${
              isAlive ? "btn-success" : "btn-secondary"
            }" 
              data-action="set-alive" data-unit="${unitId}">Alive</button>
            <button class="btn btn-sm ${
              !isAlive ? "btn-danger" : "btn-secondary"
            }" 
              data-action="set-dead" data-unit="${unitId}">Dead</button>
          </div>
          <div class="progress flex-grow-1" style="height: 20px;">
            <div class="progress-bar ${colorClass}" role="progressbar" 
              style="width: ${percentage}%" 
              aria-valuenow="${
                isAlive ? 1 : 0
              }" aria-valuemin="0" aria-valuemax="1">
            </div>
          </div>
        </div>
      </div>
    `;
  } else if (unitSize === 1 && toughValue > 1) {
    // Single model with multiple wounds (Tough)
    const currentWounds = healthData.wounds
      ? toughValue - healthData.wounds.filter((w) => w).length
      : toughValue;

    const { percentage, colorClass } = getHealthStatus(
      currentWounds,
      toughValue
    );

    return `
      <div class="multi-wound-model">
        <div class="d-flex align-items-center gap-3 mb-2">
          <div class="wounds-counter d-flex align-items-center">
            <button class="btn btn-sm btn-outline-danger" data-action="wound" data-unit="${unitId}">
              <i class="bi bi-dash"></i>
            </button>
            <div class="d-flex flex-column align-items-center mx-2">
              <div class="hp-text">
                <span class="hp-current">${currentWounds}</span>/<span class="hp-max">${toughValue}</span>
              </div>
            </div>
            <button class="btn btn-sm btn-outline-success" data-action="heal" data-unit="${unitId}">
              <i class="bi bi-plus"></i>
            </button>
          </div>
          <div class="progress flex-grow-1" style="height: 20px;">
            <div class="progress-bar ${colorClass}" role="progressbar" 
              style="width: ${percentage}%" 
              aria-valuenow="${currentWounds}" aria-valuemin="0" aria-valuemax="${toughValue}">
            </div>
          </div>
        </div>
      </div>
    `;
  } else {
    // Multiple models
    const aliveModels = healthData.models
      ? healthData.models.filter((m) => m).length
      : unitSize;

    const { percentage, colorClass } = getHealthStatus(aliveModels, unitSize);

    return `
      <div class="multi-model-unit">
        <div class="d-flex align-items-center gap-3 mb-2">
          <div class="models-counter d-flex align-items-center">
            <button class="btn btn-sm btn-outline-danger" data-action="kill-model" data-unit="${unitId}">-</button>
            <span class="mx-2 fw-bold">${aliveModels}/${unitSize}</span>
            <button class="btn btn-sm btn-outline-success" data-action="revive-model" data-unit="${unitId}">+</button>
          </div>
          <div class="progress flex-grow-1" style="height: 20px;">
            <div class="progress-bar ${colorClass}" role="progressbar" 
              style="width: ${percentage}%" 
              aria-valuenow="${aliveModels}" aria-valuemin="0" aria-valuemax="${unitSize}">
            </div>
          </div>
        </div>
        
        <div class="models-grid">
          ${Array(unitSize)
            .fill()
            .map((_, i) => {
              const isAlive = healthData.models
                ? healthData.models[i] !== false
                : true;
              const modelNames = getModelNames(unitId);
              const modelName = modelNames[i] || `Model ${i + 1}`;
              return `
                <div class="card model-card ${
                  isAlive ? "model-alive-card" : "model-dead-card"
                }">
                  <div class="card-header d-flex justify-content-between align-items-center py-1 px-2">
                    <span class="model-name" data-model="${i}" data-unit="${unitId}">${modelName}</span>
                    <button class="btn btn-sm p-0 btn-edit-name" data-model="${i}" data-unit="${unitId}">
                      <i class="bi bi-pencil-fill"></i>
                    </button>
                  </div>
                  <div class="card-body p-2 text-center">
                    <button class="btn btn-sm ${
                      isAlive ? "btn-success" : "btn-danger"
                    } model-toggle-btn" 
                      data-model="${i}" data-unit="${unitId}" data-action="toggle-model">
                      ${isAlive ? "Alive" : "Dead"}
                    </button>
                  </div>
                </div>
              `;
            })
            .join("")}
        </div>
      </div>
    `;
  }
}

// Get a unit's health status
function getUnitHealth(unitId) {
  const key = `unit-health-${armyData.id}-${unitId}`;
  let health = JSON.parse(localStorage.getItem(key));

  if (!health) {
    // Initialize default health based on unit type
    const unit = armyData.processedUnits
      ? armyData.processedUnits.find((u) => u.selectionId === unitId)
      : armyData.units.find((u) => u.selectionId === unitId);
    if (!unit) return {};

    const unitSize = unit.size || 1;
    const toughValue = getToughValue(unit);

    health = {};

    if (unitSize === 1 && toughValue <= 1) {
      health.alive = true;
    } else if (unitSize === 1 && toughValue > 1) {
      health.wounds = Array(toughValue).fill(false); // false = not wounded
    } else {
      health.models = Array(unitSize).fill(true); // true = alive
    }
  }

  return health;
}

// Helper functions

// Add model name editing listeners
function addModelNameEditingListeners() {
  document.querySelectorAll(".btn-edit-name").forEach((button) => {
    button.addEventListener("click", (e) => {
      e.stopPropagation();
      const modelIndex = parseInt(button.dataset.model);
      const unitId = button.dataset.unit;
      const nameElement = button.previousElementSibling; // Get the name span element
      const currentName = nameElement.textContent;

      // Create input field
      const input = document.createElement("input");
      input.type = "text";
      input.className = "form-control form-control-sm model-name-input";
      input.value = currentName;

      // Replace name with input
      nameElement.innerHTML = "";
      nameElement.appendChild(input);
      input.focus();

      // Handle saving
      const saveModelNameChange = () => {
        const newName = input.value.trim() || `Model ${modelIndex + 1}`;
        nameElement.textContent = newName;
        saveModelName(unitId, modelIndex, newName);
      };

      // Save on enter key
      input.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          saveModelNameChange();
        }
      });

      // Save on blur (clicking away)
      input.addEventListener("blur", saveModelNameChange);
    });
  });
}

// Get custom model names for a unit
function getModelNames(unitId) {
  const key = `model-names-${armyData.id}-${unitId}`;
  const savedNames = localStorage.getItem(key);
  return savedNames ? JSON.parse(savedNames) : {};
}

// Save a custom model name
function saveModelName(unitId, modelIndex, name) {
  const key = `model-names-${armyData.id}-${unitId}`;
  const names = getModelNames(unitId);
  names[modelIndex] = name;
  localStorage.setItem(key, JSON.stringify(names));
}

// Create rules list
function createRulesList(unit) {
  // Combine all rules from base unit and upgrades
  const allRules = [...(unit.rules || [])];

  // Add rules from upgrades
  if (unit.loadout) {
    unit.loadout.forEach((item) => {
      if (item.type === "ArmyBookItem" && item.content) {
        item.content.forEach((content) => {
          if (content.type === "ArmyBookRule") {
            // Check if rule is already in the list
            const exists = allRules.some((rule) => rule.id === content.id);
            if (!exists) {
              allRules.push({
                id: content.id,
                name: content.name,
                rating: content.rating,
                label: content.rating
                  ? `${content.name}(${content.rating})`
                  : content.name,
              });
            }
          }
        });
      }
    });
  }

  if (allRules.length === 0) {
    return '<p class="text-muted">None</p>';
  }

  return `
        <div class="d-flex flex-wrap gap-1">
            ${allRules
              .map(
                (rule) => `
                <span class="badge bg-secondary allow-definitions">${
                  rule.label || rule.name
                }</span>
            `
              )
              .join("")}
        </div>
    `;
}

// Create weapons table
function createWeaponsTable(unit) {
  // Process unit's weapons, accounting for upgrades
  const processedWeapons = processUnitWeapons(unit);

  if (processedWeapons.length === 0) {
    return '<p class="text-muted">No weapons</p>';
  }

  return `
        <div class="table-responsive">
            <table class="table table-sm table-striped weapons-table">
                <thead>
                    <tr>
                        <th>Weapon</th>
                        <th>Range</th>
                        <th>Attacks</th>
                        <th>Special Rules</th>
                    </tr>
                </thead>
                <tbody>
                    ${processedWeapons
                      .map(
                        (weapon) => `
                        <tr>
                            <td>${weapon.name}${
                          weapon.count > 1 ? ` (×${weapon.count})` : ""
                        }</td>
                            <td>${weapon.range || "0"}"</td>
                            <td>A${weapon.attacks}</td>
                            <td class="allow-definitions">${getWeaponSpecialRules(
                              weapon
                            )}</td>
                        </tr>
                    `
                      )
                      .join("")}
                </tbody>
            </table>
        </div>
    `;
}

// Process unit weapons
function processUnitWeapons(unit) {
  const processedWeapons = [];

  // Process loadout weapons if available
  if (unit.loadout && unit.loadout.length > 0) {
    unit.loadout.forEach((item) => {
      if (item.type === "ArmyBookWeapon") {
        const existingWeapon = processedWeapons.find(
          (w) =>
            w.name === item.name &&
            w.range === item.range &&
            w.attacks === item.attacks &&
            areSameSpecialRules(w.specialRules, item.specialRules)
        );

        if (existingWeapon) {
          existingWeapon.count += item.count || 1;
        } else {
          processedWeapons.push({ ...item });
        }
      }
    });
  }
  // Fall back to unit.weapons if no loadout
  else if (unit.weapons && unit.weapons.length > 0) {
    unit.weapons.forEach((weapon) => {
      const existingWeapon = processedWeapons.find(
        (w) =>
          w.name === weapon.name &&
          w.range === weapon.range &&
          w.attacks === weapon.attacks &&
          areSameSpecialRules(w.specialRules, weapon.specialRules)
      );

      if (existingWeapon) {
        existingWeapon.count += weapon.count || 1;
      } else {
        processedWeapons.push({ ...weapon });
      }
    });
  }

  return processedWeapons;
}

// Check if two sets of special rules are the same
function areSameSpecialRules(rules1, rules2) {
  if (!rules1 && !rules2) return true;
  if (!rules1 || !rules2) return false;
  if (rules1.length !== rules2.length) return false;

  for (let i = 0; i < rules1.length; i++) {
    const rule1 = rules1[i];
    const rule2 = rules2.find((r) => r.name === rule1.name);

    if (!rule2) return false;
    if (rule1.rating !== rule2.rating) return false;
  }

  return true;
}

// Get weapon special rules
function getWeaponSpecialRules(weapon) {
  if (!weapon.specialRules || weapon.specialRules.length === 0) {
    return "-";
  }

  return weapon.specialRules
    .map((rule) => {
      if (rule.rating) {
        return `${rule.name}(${rule.rating})`;
      }
      return rule.name;
    })
    .join(", ");
}

// Create health tracker
function createHealthTracker(unit) {
  // Determine total number of models and wounds
  const unitSize = unit.size || 1;
  const toughValue = getToughValue(unit);
  const unitId = unit.selectionId;

  // Get health from localStorage
  const healthData = getUnitHealth(unitId);

  if (unitSize === 1 && toughValue <= 1) {
    // Single model with 1 wound
    const isAlive = healthData.alive !== false;

    return `
        <div class="single-model-health d-flex align-items-center gap-2">
          <div class="btn-group" role="group">
            <button class="btn btn-sm ${
              isAlive ? "btn-success" : "btn-secondary"
            }" 
              data-action="set-alive" data-unit="${unitId}">Alive</button>
            <button class="btn btn-sm ${
              !isAlive ? "btn-danger" : "btn-secondary"
            }" 
              data-action="set-dead" data-unit="${unitId}">Dead</button>
          </div>
        </div>
      `;
  } else if (unitSize === 1 && toughValue > 1) {
    // Single model with multiple wounds (Tough)
    const currentWounds = healthData.wounds
      ? toughValue - healthData.wounds.filter((w) => w).length
      : toughValue;

    return `
      <div class="multi-wound-model">
        <div class="d-flex align-items-center">
          <button class="btn btn-sm btn-outline-danger" data-action="wound" data-unit="${unitId}">
            <i class="bi bi-dash"></i>
          </button>
          <div class="d-flex flex-column align-items-center mx-2">
            <div class="hp-text">
              <span class="hp-current">${currentWounds}</span>/<span class="hp-max">${toughValue}</span>
            </div>
            <div class="progress" style="width: 60px; height: 6px;">
              <div class="progress-bar hp-progress-bar bg-success" 
                style="width: ${(currentWounds / toughValue) * 100}%;">
              </div>
            </div>
          </div>
          <button class="btn btn-sm btn-outline-success" data-action="heal" data-unit="${unitId}">
            <i class="bi bi-plus"></i>
          </button>
        </div>
      </div>
    `;
  } else {
    // Multiple models
    const aliveModels = healthData.models
      ? healthData.models.filter((m) => m).length
      : unitSize;

    return `
      <div class="multi-model-unit">
        <div class="d-flex align-items-center gap-3 mb-3">
          <div class="models-counter d-flex align-items-center">
            <button class="btn btn-sm btn-outline-danger" data-action="kill-model" data-unit="${unitId}">-</button>
            <span class="mx-2 fw-bold">${aliveModels}/${unitSize}</span>
            <button class="btn btn-sm btn-outline-success" data-action="revive-model" data-unit="${unitId}">+</button>
          </div>
          <div class="progress flex-grow-1" style="height: 20px;">
            <div class="progress-bar bg-success" role="progressbar" 
              style="width: ${(aliveModels / unitSize) * 100}%" 
              aria-valuenow="${aliveModels}" aria-valuemin="0" aria-valuemax="${unitSize}">
            </div>
          </div>
        </div>
        
        <div class="models-grid">
          ${Array(unitSize)
            .fill()
            .map((_, i) => {
              const isAlive = healthData.models
                ? healthData.models[i] !== false
                : true;
              const modelNames = getModelNames(unitId);
              const modelName = modelNames[i] || `Model ${i + 1}`;
              return `
                <div class="card model-card ${
                  isAlive ? "model-alive-card" : "model-dead-card"
                }">
                  <div class="card-header d-flex justify-content-between align-items-center py-1 px-2">
                    <span class="model-name" data-model="${i}" data-unit="${unitId}">${modelName}</span>
                    <button class="btn btn-sm p-0 btn-edit-name" data-model="${i}" data-unit="${unitId}">
                      <i class="bi bi-pencil-fill"></i>
                    </button>
                  </div>
                  <div class="card-body p-2 text-center">
                    <button class="btn btn-sm ${
                      isAlive ? "btn-success" : "btn-danger"
                    } model-toggle-btn" 
                      data-model="${i}" data-unit="${unitId}" data-action="toggle-model">
                      ${isAlive ? "Alive" : "Dead"}
                    </button>
                  </div>
                </div>
              `;
            })
            .join("")}
        </div>
      </div>
      `;
  }
}

// Get tough value
function getToughValue(unit) {
  if (!unit.rules) return 0;

  const toughRule = unit.rules.find((rule) => rule.name === "Tough");
  return toughRule ? parseInt(toughRule.rating) : 0;
}

// Check if unit has Caster
function hasCaster(unit) {
  return getCasterLevel(unit) > 0;
}

// Get caster level
function getCasterLevel(unit) {
  if (!unit.rules) return 0;

  const casterRule = unit.rules.find((rule) => rule.name === "Caster");
  return casterRule ? parseInt(casterRule.rating) : 0;
}

// Get base size
function getBaseSize(unit) {
  if (!unit.bases) return "None";

  const bases = [];
  if (unit.bases.round) bases.push(`Round ${unit.bases.round}mm`);
  if (unit.bases.square) bases.push(`Square ${unit.bases.square}mm`);

  return bases.length > 0 ? bases.join(" or ") : "None";
}

// Get morale threshold
function getMoraleThreshold(unit) {
  // For single models with Tough, it's half their Tough value
  const toughValue = getToughValue(unit);
  if (unit.size === 1 && toughValue > 0) {
    return Math.ceil(toughValue / 2);
  }

  // For multi-model units, it's half their size
  return Math.ceil(unit.size / 2);
}

// Add all unit card event listeners
function addUnitCardEventListeners() {
  // Health tracking
  addHealthTrackerListeners();

  // Status toggles
  document.querySelectorAll(".status-toggle").forEach((button) => {
    button.addEventListener("click", () => {
      // Only allow toggling if unit is not shaken or this is the shaken toggle
      const unitId = button.dataset.unit;
      const status = button.dataset.status;
      const unitStatus = getUnitStatus(unitId);

      if (unitStatus.shaken && status !== "shaken") {
        showToast("Cannot change status while unit is Shaken", "warning");
        return;
      }

      toggleUnitStatus(unitId, status);

      // Toggle button appearance
      if (status === "shaken") {
        button.classList.toggle("btn-outline-warning");
        button.classList.toggle("btn-warning");
      } else if (status === "fatigued") {
        button.classList.toggle("btn-outline-secondary");
        button.classList.toggle("btn-secondary");
      } else if (status === "routed") {
        button.classList.toggle("btn-outline-danger");
        button.classList.toggle("btn-danger");
      }
    });
  });

  // Activation buttons
  document.querySelectorAll(".activation-button").forEach((button) => {
    button.addEventListener("click", () => {
      const unitId = button.dataset.unit;
      const unitStatus = getUnitStatus(unitId);

      // Don't allow activation if unit is shaken
      if (unitStatus.shaken) {
        showToast("Cannot activate while unit is Shaken", "warning");
        return;
      }

      activateUnit(unitId, button.dataset.action);

      // Update button appearances
      const unitCard = document.getElementById(`unit-${unitId}`);
      unitCard.querySelectorAll(".activation-button").forEach((btn) => {
        const type = btn.dataset.action;
        btn.classList.remove(
          "btn-secondary",
          "btn-success",
          "btn-primary",
          "btn-danger"
        );
        btn.classList.add(
          `btn-outline-${
            type === "hold"
              ? "secondary"
              : type === "advance"
              ? "success"
              : type === "rush"
              ? "primary"
              : "danger"
          }`
        );
      });

      // Add the active class to clicked button
      const type = button.dataset.action;
      button.classList.remove(
        `btn-outline-${
          type === "hold"
            ? "secondary"
            : type === "advance"
            ? "success"
            : type === "rush"
            ? "primary"
            : "danger"
        }`
      );
      button.classList.add(
        type === "hold"
          ? "btn-secondary"
          : type === "advance"
          ? "btn-success"
          : type === "rush"
          ? "btn-primary"
          : "btn-danger"
      );
    });
  });

  // Setup morale listeners
  setupMoraleListeners();

  // Setup melee listeners
  setupMeleeListeners();

  // Setup spell token listeners
  setupSpellTokenListeners();
}

// Unit status functions

// Toggle a unit's status
function toggleUnitStatus(unitId, status) {
  const unitStatus = getUnitStatus(unitId);
  unitStatus[status] = !unitStatus[status];

  // If unit is routed, it is also shaken
  if (status === "routed" && unitStatus.routed) {
    unitStatus.shaken = true;
  }

  saveUnitStatus(unitId, unitStatus);
}

// Set a unit as activated
function activateUnit(unitId, action) {
  const unitStatus = getUnitStatus(unitId);
  unitStatus.activated = true;
  unitStatus.action = action;

  // If the unit was Shaken, it stays idle for one activation
  if (unitStatus.shaken) {
    unitStatus.shaken = false; // Clear shaken status after activation
  }

  saveUnitStatus(unitId, unitStatus);
}

// Get a unit's status
function getUnitStatus(unitId) {
  const key = `unit-status-${armyData.id}-${unitId}`;
  let status = JSON.parse(localStorage.getItem(key));

  if (!status) {
    status = {
      activated: false,
      action: null,
      shaken: false,
      fatigued: false,
      routed: false,
      hasStruckBack: false,
    };
  }

  return status;
}

// Save a unit's status
function saveUnitStatus(unitId, status) {
  const key = `unit-status-${armyData.id}-${unitId}`;
  localStorage.setItem(key, JSON.stringify(status));
}

// Save a unit's health data
function saveUnitHealth(unitId, healthData) {
  const key = `unit-health-${armyData.id}-${unitId}`;
  localStorage.setItem(key, JSON.stringify(healthData));
}

// Save spell tokens for a unit
function saveSpellTokens(unitId) {
  const card = document.getElementById(`unit-${unitId}`);
  if (!card) return;

  const tokens = card.querySelectorAll(".spell-token");
  const spentTokens = Array.from(tokens).map((token) =>
    token.classList.contains("spent")
  );

  const key = `unit-tokens-${armyData.id}-${unitId}`;
  localStorage.setItem(key, JSON.stringify(spentTokens));
}

// Reset spell tokens for a unit
function resetSpellTokens(unitId) {
  const card = document.getElementById(`unit-${unitId}`);
  if (!card) return;

  const tokens = card.querySelectorAll(".spell-token");
  tokens.forEach((token) => token.classList.remove("spent"));

  const key = `unit-tokens-${armyData.id}-${unitId}`;
  localStorage.setItem(key, JSON.stringify(Array(tokens.length).fill(false)));
}

// Take a morale test
function takeMoraleTest(unitId) {
  const unit = armyData.units.find((u) => u.selectionId === unitId);
  if (!unit) return;

  const unitStatus = getUnitStatus(unitId);
  const resultDiv = document.querySelector(`.morale-result-${unitId}`);

  // Check if results div exists
  if (!resultDiv) {
    console.error(`Could not find morale result div for unit ${unitId}`);
    return;
  }

  // If the unit is already Shaken, it automatically fails morale tests
  if (unitStatus.shaken) {
    resultDiv.innerHTML =
      '<div class="alert alert-danger">Unit is already Shaken - automatically fails morale test</div>';
    resultDiv.style.display = "block";
    return;
  }

  // Roll for morale test
  const roll = Math.floor(Math.random() * 6) + 1;
  const quality = unit.quality;
  const passed = roll >= quality;

  // Display result
  if (passed) {
    resultDiv.innerHTML = `<div class="alert alert-success">Passed! Rolled a ${roll} (needed ${quality}+)</div>`;
  } else {
    resultDiv.innerHTML = `<div class="alert alert-danger">Failed! Rolled a ${roll} (needed ${quality}+)</div>`;

    // Use the isUnitBelowHalfStrength function for consistency
    const isHalfStrength = isUnitBelowHalfStrength(unitId);

    if (isHalfStrength) {
      resultDiv.innerHTML +=
        '<div class="alert alert-danger">Unit is below half strength - it Routs!</div>';
      unitStatus.routed = true;
      unitStatus.shaken = true;
    } else {
      resultDiv.innerHTML +=
        '<div class="alert alert-warning">Unit becomes Shaken</div>';
      unitStatus.shaken = true;
    }

    saveUnitStatus(unitId, unitStatus);
    updateUnitStatusDisplay(unitId);
  }

  resultDiv.style.display = "block";
}

// Update a unit's status display
function updateUnitStatusDisplay(unitId) {
  const card = document.getElementById(`unit-${unitId}`);
  if (!card) return;

  const unitStatus = getUnitStatus(unitId);

  // Update status toggles
  for (const status of ["shaken", "fatigued", "routed"]) {
    const button = card.querySelector(`[data-status="${status}"]`);
    if (button) {
      if (unitStatus[status]) {
        button.classList.remove(
          `btn-outline-warning`,
          `btn-outline-secondary`,
          `btn-outline-danger`
        );
        button.classList.add(
          status === "shaken"
            ? "btn-warning"
            : status === "fatigued"
            ? "btn-secondary"
            : "btn-danger"
        );
      } else {
        button.classList.remove(`btn-warning`, `btn-secondary`, `btn-danger`);
        button.classList.add(
          status === "shaken"
            ? "btn-outline-warning"
            : status === "fatigued"
            ? "btn-outline-secondary"
            : "btn-outline-danger"
        );
      }
    }
  }

  // Update activation buttons
  if (unitStatus.activated) {
    const actionButton = card.querySelector(
      `[data-action="${unitStatus.action}"]`
    );
    if (actionButton) {
      card.querySelectorAll(".activation-button").forEach((btn) => {
        btn.classList.remove(
          "btn-secondary",
          "btn-success",
          "btn-primary",
          "btn-danger"
        );
        btn.classList.add(
          "btn-outline-secondary",
          "btn-outline-success",
          "btn-outline-primary",
          "btn-outline-danger"
        );
      });

      actionButton.classList.remove(
        "btn-outline-secondary",
        "btn-outline-success",
        "btn-outline-primary",
        "btn-outline-danger"
      );
      switch (unitStatus.action) {
        case "hold":
          actionButton.classList.add("btn-secondary");
          break;
        case "advance":
          actionButton.classList.add("btn-success");
          break;
        case "rush":
          actionButton.classList.add("btn-primary");
          break;
        case "charge":
          actionButton.classList.add("btn-danger");
          break;
      }
    }
  }

  // Update strike back button
  const strikeBackButton = card.querySelector('[data-action="strike-back"]');
  if (strikeBackButton) {
    if (unitStatus.hasStruckBack) {
      strikeBackButton.classList.remove("btn-outline-info");
      strikeBackButton.classList.add("btn-info");
    } else {
      strikeBackButton.classList.remove("btn-info");
      strikeBackButton.classList.add("btn-outline-info");
    }
  }
}

// Resolve melee combat
function resolveMelee(unitId) {
  const card = document.getElementById(`unit-${unitId}`);
  if (!card) return;

  const woundsCaused =
    parseInt(card.querySelector(`#wounds-caused-${unitId}`).value) || 0;
  const woundsTaken =
    parseInt(card.querySelector(`#wounds-taken-${unitId}`).value) || 0;
  const resultDiv = document.querySelector(`.morale-result-${unitId}`);

  // Determine result
  let result = "";

  if (woundsCaused > woundsTaken) {
    result = `<div class="alert alert-success">Victory! Caused ${woundsCaused} wounds, took ${woundsTaken}</div>`;
  } else if (woundsTaken > woundsCaused) {
    result = `<div class="alert alert-danger">Defeat! Caused ${woundsCaused} wounds, took ${woundsTaken}</div>`;
    result +=
      '<div class="alert alert-warning">Unit must take a morale test</div>';
    takeMoraleTest(unitId);
  } else {
    result = `<div class="alert alert-info">Draw! Both sides caused ${woundsCaused} wounds</div>`;
  }

  resultDiv.innerHTML = result;
  resultDiv.style.display = "block";

  // Set unit as fatigued if it's the second melee in a round
  const unitStatus = getUnitStatus(unitId);
  if (unitStatus.hasFoughtInMelee) {
    unitStatus.fatigued = true;
  } else {
    unitStatus.hasFoughtInMelee = true;
  }

  saveUnitStatus(unitId, unitStatus);
  updateUnitStatusDisplay(unitId);
}

// Handle spell casting
function castSpell(unitId) {
  const card = document.getElementById(`unit-${unitId}`);
  if (!card) return;

  // Check if there are available spell tokens
  const tokens = card.querySelectorAll(".spell-token");
  const availableTokens = Array.from(tokens).filter(
    (token) => !token.classList.contains("spent")
  );

  if (availableTokens.length === 0) {
    const resultDiv = document.querySelector(`.spell-result-${unitId}`);
    resultDiv.innerHTML =
      '<div class="alert alert-danger">No spell tokens available!</div>';
    resultDiv.style.display = "block";
    return;
  }

  // Get casting roll
  const castingRoll =
    parseInt(card.querySelector(`#casting-roll-${unitId}`).value) || 4;

  // Spend a token
  availableTokens[0].classList.add("spent");
  saveSpellTokens(unitId);

  // Show result
  const resultDiv = document.querySelector(`.spell-result-${unitId}`);
  resultDiv.innerHTML = `<div class="alert alert-info">Cast with roll of ${castingRoll}</div>`;
  resultDiv.style.display = "block";
}

// Save all unit states to localStorage
function saveAllStates() {
  // Save current round
  localStorage.setItem(`${armyData.id}-current-round`, currentRound);

  // Save selected doctrines
  saveDoctrines();
}

// Load saved state from localStorage
function loadSavedState() {
  const armyId = armyData?.id;
  if (!armyId) return;

  // Load current round
  const savedRound = localStorage.getItem(`${armyId}-current-round`);
  if (savedRound) {
    currentRound = parseInt(savedRound);
  }

  // Load CP and UP
  const savedCP = localStorage.getItem(`${armyId}-command-points`);
  if (savedCP) {
    availableCommandPoints = parseInt(savedCP);
    const cpCounter = document.getElementById("cp-counter");
    if (cpCounter) {
      cpCounter.textContent = availableCommandPoints;
    }
  }

  const savedUP = localStorage.getItem(`${armyId}-underdog-points`);
  if (savedUP) {
    availableUnderdogPoints = parseInt(savedUP);
    const upCounter = document.getElementById("up-counter");
    if (upCounter) {
      upCounter.textContent = availableUnderdogPoints;
    }
  }

  // Load selected doctrines
  loadDoctrines();

  // Load unit statuses
  armyData.units.forEach((unit) => {
    loadUnitStatus(unit.selectionId);
  });

  // Update round display
  updateRoundDisplay();
}

// Load a unit's health from localStorage
function loadUnitHealth(unitId) {
  const key = `unit-health-${armyData.id}-${unitId}`;
  const savedHealth = localStorage.getItem(key);

  if (!savedHealth) return;

  const health = JSON.parse(savedHealth);
  const card = document.getElementById(`unit-${unitId}`);
  if (!card) return;

  // Load single model toggle health
  if (health.alive !== undefined) {
    const toggleHealth = card.querySelector(".toggle-health");
    if (toggleHealth) {
      if (health.alive) {
        toggleHealth.classList.remove("btn-danger");
        toggleHealth.classList.add("btn-success");
        toggleHealth.textContent = "Alive";
      } else {
        toggleHealth.classList.remove("btn-success");
        toggleHealth.classList.add("btn-danger");
        toggleHealth.textContent = "Dead";
      }
    }
  }

  // Load multi-wound model health
  if (health.wounds) {
    const healthPoints = card.querySelectorAll(".health-point");
    if (healthPoints.length === health.wounds.length) {
      healthPoints.forEach((point, index) => {
        if (health.wounds[index]) {
          point.classList.add("wounded");
        } else {
          point.classList.remove("wounded");
        }
      });
    }
  }

  // Load multiple models health
  if (health.models) {
    const modelButtons = card.querySelectorAll(".toggle-model-health");
    if (modelButtons.length === health.models.length) {
      modelButtons.forEach((button, index) => {
        if (health.models[index]) {
          button.classList.remove("btn-danger");
          button.classList.add("btn-success");
          button.textContent = "Alive";
        } else {
          button.classList.remove("btn-success");
          button.classList.add("btn-danger");
          button.textContent = "Dead";
        }
      });
    }
  }
}

// Load a unit's status from localStorage
function loadUnitStatus(unitId) {
  const status = getUnitStatus(unitId);
  updateUnitStatusDisplay(unitId);
}

// Load spell tokens for a unit from localStorage
function loadSpellTokens(unitId) {
  const key = `unit-tokens-${armyData.id}-${unitId}`;
  const savedTokens = localStorage.getItem(key);

  if (!savedTokens) return;

  const spentTokens = JSON.parse(savedTokens);
  const card = document.getElementById(`unit-${unitId}`);
  if (!card) return;

  const tokens = card.querySelectorAll(".spell-token");
  if (tokens.length === spentTokens.length) {
    tokens.forEach((token, index) => {
      if (spentTokens[index]) {
        token.classList.add("spent");
      } else {
        token.classList.remove("spent");
      }
    });
  }
}

// Round management
function startNewRound() {
  currentRound++;
  localStorage.setItem(`${armyData.id}-current-round`, currentRound);

  // Reset unit activations
  armyData.units.forEach((unit) => {
    const unitStatus = getUnitStatus(unit.selectionId);
    unitStatus.activated = false;
    unitStatus.action = null;
    unitStatus.hasFoughtInMelee = false;
    unitStatus.hasStruckBack = false;
    saveUnitStatus(unit.selectionId, unitStatus);

    // Reset all activation buttons to their outline state
    const card = document.getElementById(`unit-${unit.selectionId}`);
    if (card) {
      card.querySelectorAll(".activation-button").forEach((button) => {
        button.classList.remove(
          "btn-secondary",
          "btn-success",
          "btn-primary",
          "btn-danger"
        );
        button.classList.add(
          "btn-outline-secondary",
          "btn-outline-success",
          "btn-outline-primary",
          "btn-outline-danger"
        );
      });

      // Reset melee buttons
      card
        .querySelector('[data-action="in-melee"]')
        ?.classList.remove("btn-warning");
      card
        .querySelector('[data-action="in-melee"]')
        ?.classList.add("btn-outline-warning");
      card
        .querySelector('[data-action="strike-back"]')
        ?.classList.remove("btn-info");
      card
        .querySelector('[data-action="strike-back"]')
        ?.classList.add("btn-outline-info");

      // Hide melee result div
      // Use this pattern for all similar issues:
      const meleeResultElement = document.querySelector(
        `.melee-result-${unit.selectionId}`
      );
      if (meleeResultElement) {
        meleeResultElement.style.display = "none";
      }

      const moraleResultElement = document.querySelector(
        `.morale-result-${unit.selectionId}`
      );
      if (moraleResultElement) {
        moraleResultElement.style.display = "none";
      }
    }
  });

  // Reset spell tokens for all casters
  armyData.units.forEach((unit) => {
    if (hasCaster(unit)) {
      resetSpellTokens(unit.selectionId);
    }
  });

  // Update the UI
  updateRoundDisplay();

  // Show toast notification
  showToast(`Round ${currentRound} started!`, "success");
}

// Update the round display
function updateRoundDisplay() {
  const roundDisplay = document.getElementById("current-round");
  if (roundDisplay) {
    roundDisplay.textContent = currentRound;
  }
}

// Utility functions

// Process and merge combined units
function processCombinedUnits() {
  if (!armyData || !armyData.units) return;

  const processedUnits = [];
  const combinedGroups = {};
  const processedIds = new Set(); // Keep track of which units have been processed

  // First pass: identify combined units and create groups
  armyData.units.forEach((unit) => {
    // Skip if already processed
    if (processedIds.has(unit.selectionId)) return;

    if (unit.combined || unit.combinedWith) {
      const combinedId = unit.combinedWith || unit.selectionId;
      if (!combinedGroups[combinedId]) {
        combinedGroups[combinedId] = [];
      }
      combinedGroups[combinedId].push(unit);
      processedIds.add(unit.selectionId);
    } else {
      // Not part of a combined unit
      processedUnits.push(unit);
      processedIds.add(unit.selectionId);
    }
  });

  // Second pass: merge combined units
  Object.values(combinedGroups).forEach((group) => {
    if (group.length === 0) return;

    // Use the first unit as the base
    const baseUnit = group[0];
    const mergedUnit = { ...baseUnit };

    // Mark as combined and copy the original selection ID for reference
    mergedUnit.combined = true;
    mergedUnit.originalSelectionId = baseUnit.selectionId;

    // Initialize arrays for weapons, rules, etc.
    mergedUnit.weapons = baseUnit.weapons ? [...baseUnit.weapons] : [];
    mergedUnit.rules = baseUnit.rules ? [...baseUnit.rules] : [];
    mergedUnit.loadout = baseUnit.loadout ? [...baseUnit.loadout] : [];

    // Track original units for reference
    mergedUnit.originalUnits = group.map((u) => ({
      id: u.id,
      selectionId: u.selectionId,
      name: u.name,
      customName: u.customName,
    }));

    // Merge in data from other units in the group
    for (let i = 1; i < group.length; i++) {
      const unit = group[i];

      // Add size
      mergedUnit.size = (mergedUnit.size || 1) + (unit.size || 1);

      // Add weapons
      if (unit.weapons) {
        unit.weapons.forEach((weapon) => {
          const existingWeapon = mergedUnit.weapons.find(
            (w) =>
              w.name === weapon.name &&
              w.range === weapon.range &&
              w.attacks === weapon.attacks
          );

          if (existingWeapon) {
            existingWeapon.count =
              (existingWeapon.count || 1) + (weapon.count || 1);
          } else {
            mergedUnit.weapons.push({ ...weapon });
          }
        });
      }

      // Add rules (avoiding duplicates)
      if (unit.rules) {
        unit.rules.forEach((rule) => {
          const existingRule = mergedUnit.rules.find(
            (r) => r.name === rule.name && r.rating === rule.rating
          );
          if (!existingRule) {
            mergedUnit.rules.push({ ...rule });
          }
        });
      }

      // Add loadout items
      if (unit.loadout) {
        mergedUnit.loadout = [...mergedUnit.loadout, ...unit.loadout];
      }

      // Add points
      mergedUnit.cost = (mergedUnit.cost || 0) + (unit.cost || 0);

      // Merge XP
      mergedUnit.xp = Math.max(mergedUnit.xp || 0, unit.xp || 0);
    }

    // Add combined marker for UI
    mergedUnit.isCombinedUnit = true;
    mergedUnit.combinedUnits = group.length;

    // Create a descriptive custom name if not already present
    if (!mergedUnit.customName) {
      const unitNames = group.map((u) => u.customName || u.name);
      mergedUnit.customName = `Combined: ${unitNames.join(" + ")}`;
    }

    // Add to processed units
    processedUnits.push(mergedUnit);
  });

  // Update the army data with processed units
  armyData.processedUnits = processedUnits;

  console.log("Processed units:", processedUnits);
}

// Show army selector dropdown when no army ID is specified
async function showArmySelector() {
  try {
    // Show loading spinner
    document.getElementById("loading-spinner").classList.remove("d-none");

    // Load campaign data to get the list of armies
    const response = await fetch("assets/json/campaign.json");
    if (!response.ok) throw new Error("Failed to load campaign data");

    const campaignData = await response.json();
    const armies = campaignData.armies;

    // Hide loading spinner
    document.getElementById("loading-spinner").classList.add("d-none");

    // Get the container element
    const mainContainer = document.querySelector("main");

    // Create and add the army selector UI
    const selectorContainer = document.createElement("div");
    selectorContainer.className = "text-center py-5";
    selectorContainer.innerHTML = `
      <div class="alert alert-info mb-4">No army ID specified</div>
      <h3 class="mb-4">Select an Army</h3>
      <div class="row justify-content-center">
        <div class="col-md-6">
          <div class="card mb-4">
            <div class="card-body">
              <p class="mb-3">Please select an army to view its tracker:</p>
              <select id="army-selector" class="form-select mb-3">
                <option value="">-- Select an Army --</option>
                ${armies
                  .map(
                    (army) =>
                      `<option value="${army.armyURL}">${army.armyName} (${army.player})</option>`
                  )
                  .join("")}
              </select>
              <button id="go-to-army-btn" class="btn btn-primary" disabled>Go to Army Tracker</button>
            </div>
          </div>
        </div>
      </div>
    `;

    mainContainer.appendChild(selectorContainer);

    // Add event listener for the button
    document
      .getElementById("go-to-army-btn")
      .addEventListener("click", function () {
        const selectedArmy = document.getElementById("army-selector").value;
        if (selectedArmy) {
          window.location.href = `army-tracker.html?id=${selectedArmy}`;
        } else {
          showToast("Please select an army first", "warning");
        }
      });

    // Also add event listener for the select element to enable button when army is selected
    document
      .getElementById("army-selector")
      .addEventListener("change", function () {
        const selectedArmy = this.value;
        const goButton = document.getElementById("go-to-army-btn");
        goButton.disabled = !selectedArmy;

        if (selectedArmy) {
          // Optional: Auto-redirect when an army is selected
          // window.location.href = `army-tracker.html?id=${selectedArmy}`;
        }
      });
  } catch (error) {
    console.error("Error showing army selector:", error);
    showError("Failed to load army list. Please try again.");
  }
}

// Show error message
function showError(message) {
  const alertDiv = document.createElement("div");
  alertDiv.className = "alert alert-danger";
  alertDiv.setAttribute("role", "alert");
  alertDiv.textContent = message;

  document.querySelector("main").prepend(alertDiv);

  // Remove loading spinner
  document.getElementById("loading-spinner")?.classList.add("d-none");
}

// Show toast notification
function showToast(message, type = "primary") {
  const toastContainer = document.getElementById("toast-container");

  const toast = document.createElement("div");
  toast.className = `toast align-items-center text-bg-${type} border-0`;
  toast.setAttribute("role", "alert");
  toast.setAttribute("aria-live", "assertive");
  toast.setAttribute("aria-atomic", "true");

  toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                ${message}
            </div>
            <button type="button" class="btn-close me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    `;

  toastContainer.appendChild(toast);

  const bsToast = new bootstrap.Toast(toast);
  bsToast.show();

  // Automatically remove toast after it's hidden
  toast.addEventListener("hidden.bs.toast", () => {
    toast.remove();
  });
}

// Add event listeners for global actions
document
  .getElementById("start-new-round-btn")
  ?.addEventListener("click", startNewRound);

// Export utility functions for access in the console (debugging)
window.armyTracker = {
  startNewRound,
  resetSpellTokens,
  resetAll: function () {
    localStorage.clear();
    location.reload();
  },
};
