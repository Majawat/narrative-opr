document.addEventListener("DOMContentLoaded", async () => {
  const localJsonURL = "assets/json/campaign.json";
  const armyForgeId = document.getElementById("army-forge-id").textContent;
  const cacheDuration = 3600000;
  const refreshButton = document.getElementById("refresh-button");

  refreshButton.addEventListener("click", handleRefreshData);

  initializeArmy();

  async function initializeArmy() {
    const localData = await fetchLocalData(localJsonURL);
    displayArmyDetails(localData);
    const remoteData = await fetchRemoteData(armyForgeId, cacheDuration);
    displayAllUnits(remoteData);
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

  function displayArmyDetails(campaignData) {
    for (const army of campaignData.armies) {
      if (army.armyForgeID === armyForgeId) {
        document.getElementById("army-name").textContent = army.armyName;
        document.getElementById("army-image").src = army.image;
        document.getElementById(
          "army-image"
        ).style.addProperty = `object-position: ${army.imagePosition}`;
        document.getElementById("player-title").textContent = army.playerTitle;
        document.getElementById("player-name").textContent = army.player;
        document.getElementById("army-tagline").textContent = army.tagline;
        document.getElementById("army-summary").textContent = army.summary;
        document.getElementById("army-backstory").textContent = army.backstory;
      }
    }
  }

  async function fetchRemoteData(armyForgeId, cacheDuration) {
    // Check local storage first
    // If exists and fresh enough, return cached data
    // Otherwise fetch from API
    // Store in cache with timestamp
    // Return parsed data
    const remoteJsonURL = `https://army-forge.onepagerules.com/api/tts?id=${armyForgeId}`;
    const localStorageKey = `armyData_${armyForgeId}`;
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
    } else {
      console.log("No cached data found, fetching new data...");
      try {
        const remoteResponse = await fetch(remoteJsonURL);
        const remoteData = await remoteResponse.json();
        console.log("Remote data:", remoteData);
        const cacheObject = {
          data: remoteData,
          fetchedAt: Date.now(),
        };
        localStorage.setItem(localStorageKey, JSON.stringify(cacheObject));
        console.log("New data:", remoteData);
        return remoteData;
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    }
  }

  function displayAllUnits(remoteData) {
    // Clear existing unit display
    // Loop through units and call displayUnitCard
    const unitsContainer = document.getElementById("units-container");

    unitsContainer.innerHTML = "";
    for (const unit of remoteData.units) {
      const unitCard = createUnitCard(unit, remoteData);
      unitsContainer.appendChild(unitCard);
    }
  }

  function createUnitCard(unit, remoteData) {
    // Create/update single card with unit details
    // Handle weapons list
    // Handle special rules
    // Calculate and show base requirements
    // return card DOM element
    const unitCol = document.createElement("div");
    unitCol.classList.add("col");
    unitCol.id = "unit-" + unit.id;

    // Create card
    const unitCard = document.createElement("div");
    unitCard.classList.add("card", "h-100");
    unitCol.appendChild(unitCard);

    // Create card body
    const unitCardBody = document.createElement("div");
    unitCardBody.classList.add("card-body");
    unitCard.appendChild(unitCardBody);

    // Create card header
    const unitCardHeader = document.createElement("div");
    unitCardHeader.classList.add(
      "d-flex",
      "justify-content-between",
      "align-items-center",
      "align-items-start",
      "mb-3"
    );
    unitCardBody.appendChild(unitCardHeader);

    // Create card basics div
    const unitCardBasics = document.createElement("div");
    const unitCardName = document.createElement("h4");
    unitCardName.classList.add("mb-1");

    // Display custom name if exists, else unit name
    unitCardName.textContent = unit.customName || unit.name;
    unitCardBasics.appendChild(unitCardName);

    // Display XP badge
    const unitCardXP = document.createElement("span");
    unitCardXP.classList.add("xp-badge");
    unitCardXP.innerHTML = `<i class="bi bi-star-fill"></i> ${unit.xp} XP`;
    unitCardName.appendChild(unitCardXP);

    // Display unit type, #, and cost
    const unitCardType = document.createElement("p");
    unitCardType.classList.add("mb-0");
    unitCardType.textContent =
      unit.name + " [" + unit.size + "] - " + unit.cost + "pts";
    unitCardBasics.appendChild(unitCardType);

    // Display if unit is joined to another unit
    if (unit.joinToUnit) {
      const unitCardJoined = document.createElement("p");
      unitCardJoined.classList.add("mb-0");
      for (const remoteUnit of remoteData.units) {
        console.log(remoteUnit.selectionId, unit.joinToUnit);
        if (remoteUnit.selectionId === unit.joinToUnit) {
          unitCardJoined.textContent = "Joined to " + remoteUnit.customName;
          unitCardBasics.appendChild(unitCardJoined);
        }
      }
    }

    unitCardHeader.appendChild(unitCardBasics);

    return unitCol;
  }

  function handleRefreshData() {
    console.log("Refreshing data...");
    clearCachedData(currentArmyId);
    initializeArmy(currentArmyId);
  }
});
