document.addEventListener("DOMContentLoaded", async () => {
  const localJsonURL = "assets/json/campaign.json";
  const armyForgeId = document.getElementById("army-forge-id").textContent;
  const localStorageKey = `armyData_${armyForgeId}`;
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
        document.getElementById("army-backstory").innerHTML = army.backstory;
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

    // Display unit type, amount, and cost
    const unitCardType = document.createElement("p");
    unitCardType.classList.add("mb-0");
    let unitCount = unit.size;
    if (unit.combined) {
      unitCount = unitCount * 2;
      const unitCardCombined = document.createElement("div");
      unitCardCombined.classList.add("mb-0");
      unitCardCombined.textContent = "Combined Unit";
      unitCardBasics.appendChild(unitCardCombined);
    } else {
      unitCount = unit.size;
    }
    unitCardType.textContent =
      unit.name + " [" + unitCount + "] - " + unit.cost + "pts";
    unitCardBasics.appendChild(unitCardType);

    // Display if unit is joined to another unit
    if (unit.joinToUnit) {
      const unitCardJoined = document.createElement("p");
      unitCardJoined.classList.add("mb-0");
      for (const remoteUnit of remoteData.units) {
        if (remoteUnit.selectionId === unit.joinToUnit) {
          unitCardJoined.textContent = "Joined to " + remoteUnit.customName;
          unitCardBasics.appendChild(unitCardJoined);
        }
      }
    }

    // Display base size
    const unitCardBase = document.createElement("p");
    unitCardBase.classList.add("mb-0", "text-muted", "small");
    unitCardBase.innerHTML = `<i class="bi bi-circle-fill"></i> ${unit.bases.round}mm | <i class="bi bi-square-fill"></i> ${unit.bases.square}mm`;
    unitCardBasics.appendChild(unitCardBase);

    unitCardHeader.appendChild(unitCardBasics);

    // Create stat container
    const unitCardStats = document.createElement("div");
    unitCardStats.classList.add("stat-container");

    // Create stat group for quality
    const unitQualityGroup = document.createElement("div");
    unitQualityGroup.classList.add("stat-group");
    const iconQuality = document.createElement("span");
    iconQuality.innerHTML = icons.quality;
    unitQualityGroup.appendChild(iconQuality);
    const unitQualityLabel = document.createElement("p");
    unitQualityLabel.classList.add("stat-label");
    unitQualityLabel.textContent = "Quality";
    unitQualityGroup.appendChild(unitQualityLabel);
    const unitQualityValue = document.createElement("p");
    unitQualityValue.classList.add("stat-value-high");
    unitQualityValue.textContent = unit.quality + "+";
    unitQualityGroup.appendChild(unitQualityValue);
    unitCardStats.appendChild(unitQualityGroup);

    // Create stat group for defense
    const unitDefenseGroup = document.createElement("div");
    unitDefenseGroup.classList.add("stat-group");
    const iconDefense = document.createElement("span");
    iconDefense.innerHTML = icons.defense;
    unitDefenseGroup.appendChild(iconDefense);
    const unitDefenseLabel = document.createElement("p");
    unitDefenseLabel.classList.add("stat-label");
    unitDefenseLabel.textContent = "Defense";
    unitDefenseGroup.appendChild(unitDefenseLabel);
    const unitDefenseValue = document.createElement("p");
    unitDefenseValue.classList.add("stat-value");
    unitDefenseValue.textContent = unit.defense;
    unitDefenseGroup.appendChild(unitDefenseValue);
    unitCardStats.appendChild(unitDefenseGroup);

    // Create stat group for Tough
    for (const rule of unit.rules) {
      if (rule.name === "Tough") {
        const unitToughGroup = document.createElement("div");
        unitToughGroup.classList.add("stat-group");
        const iconTough = document.createElement("span");
        iconTough.innerHTML = icons.tough;
        unitToughGroup.appendChild(iconTough);
        const unitToughLabel = document.createElement("p");
        unitToughLabel.classList.add("stat-label");
        unitToughLabel.textContent = "Tough";
        unitToughGroup.appendChild(unitToughLabel);
        const unitToughValue = document.createElement("p");
        unitToughValue.classList.add("stat-value");
        unitToughValue.textContent = rule.rating;
        unitToughGroup.appendChild(unitToughValue);
        unitCardStats.appendChild(unitToughGroup);
      }
    }

    unitCardHeader.appendChild(unitCardStats);

    // Display traits
    const unitTraitsContainer = document.createElement("div");
    unitTraitsContainer.classList.add("mb-3");
    const unitTraits = document.createElement("div");
    unitTraits.classList.add("d-flex", "flex-wrap", "gap-1");
    for (const rule of unit.rules) {
      const traitSpan = document.createElement("span");
      traitSpan.classList.add("badge", "bg-secondary");
      traitSpan.textContent = rule.name;
      unitTraits.appendChild(traitSpan);
    }
    unitTraitsContainer.appendChild(unitTraits);
    unitCardBody.appendChild(unitTraitsContainer);

    // Display weapons
    const unitWeaponsContainer = document.createElement("div");
    unitWeaponsContainer.classList.add("p-2", "table-responsive");
    const unitWeaponsTable = document.createElement("table");
    unitWeaponsTable.classList.add(
      "table",
      "table-sm",
      "table-hover",
      "table-striped",
      "table-body"
    );
    const unitWeaponsHeader = document.createElement("thead");
    const unitWeaponsHeaderRow = document.createElement("tr");
    unitWeaponsHeaderRow.style.textAlign = "center";
    const unitWeaponsHeaderName = document.createElement("th");
    unitWeaponsHeaderName.textContent = "Weapon";
    unitWeaponsHeaderRow.appendChild(unitWeaponsHeaderName);
    const unitWeaponsHeaderRange = document.createElement("th");
    unitWeaponsHeaderRange.textContent = "Range";
    unitWeaponsHeaderRow.appendChild(unitWeaponsHeaderRange);
    const unitWeaponsHeaderAttack = document.createElement("th");
    unitWeaponsHeaderAttack.textContent = "Attack";
    unitWeaponsHeaderRow.appendChild(unitWeaponsHeaderAttack);
    const unitWeaponsHeaderAP = document.createElement("th");
    unitWeaponsHeaderAP.textContent = "AP";
    unitWeaponsHeaderRow.appendChild(unitWeaponsHeaderAP);
    const unitWeaponsHeaderSpecial = document.createElement("th");
    unitWeaponsHeaderSpecial.textContent = "Special";
    unitWeaponsHeaderRow.appendChild(unitWeaponsHeaderSpecial);
    unitWeaponsHeader.appendChild(unitWeaponsHeaderRow);

    const unitWeaponsBody = document.createElement("tbody");
    for (const weapon of unit.weapons) {
      const unitWeaponsBodyRow = document.createElement("tr");
      const unitWeaponsBodyName = document.createElement("td");
      unitWeaponsBodyName.textContent = weapon.name;
      unitWeaponsBodyRow.appendChild(unitWeaponsBodyName);
      const unitWeaponsBodyRange = document.createElement("td");
      unitWeaponsBodyRange.style.textAlign = "center";
      unitWeaponsBodyRange.textContent = weapon.range || "-";
      unitWeaponsBodyRow.appendChild(unitWeaponsBodyRange);
      const unitWeaponsBodyAttack = document.createElement("td");
      unitWeaponsBodyAttack.style.textAlign = "center";
      unitWeaponsBodyAttack.textContent = weapon.attacks || "-";
      unitWeaponsBodyRow.appendChild(unitWeaponsBodyAttack);
      const unitWeaponsBodyAP = document.createElement("td");
      unitWeaponsBodyAP.style.textAlign = "center";
      unitWeaponsBodyAP.textContent = "AP" + weapon.ap || "-";
      unitWeaponsBodyRow.appendChild(unitWeaponsBodyAP);
      const unitWeaponsBodySpecial = document.createElement("td");
      unitWeaponsBodySpecial.style.textAlign = "center";
      if (weapon.specialRules.length > 0) {
        for (const special of weapon.specialRules) {
          if (special.name === "AP") continue;
          {
            unitWeaponsBodySpecial.textContent = special.name || "-";
            unitWeaponsBodyRow.appendChild(unitWeaponsBodySpecial);
          }
        }
      } else {
        unitWeaponsBodySpecial.textContent = "-";
        unitWeaponsBodyRow.appendChild(unitWeaponsBodySpecial);
      }
      unitWeaponsBody.appendChild(unitWeaponsBodyRow);
    }
    unitWeaponsTable.appendChild(unitWeaponsHeader);
    unitWeaponsTable.appendChild(unitWeaponsBody);
    unitWeaponsContainer.appendChild(unitWeaponsTable);
    unitCardBody.appendChild(unitWeaponsContainer);

    return unitCol;
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
