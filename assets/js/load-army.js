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

    displayRules(remoteData.specialRules);
    addNavLinks(localData);
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
                        <td>${spell.effect}</td>
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

    // Calculate unit size with any modifications from combined
    let unitCount = unit.size;
    if (unit.combined) {
      unitCount *= 2;
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

    // Collect all weapons (both direct and from items)
    const allWeapons = [];

    // Add direct weapons from loadout
    const directWeapons = unit.loadout.filter(
      (item) => item.type === "ArmyBookWeapon"
    );
    allWeapons.push(...directWeapons);

    // Add weapons from item content
    unit.loadout.forEach((item) => {
      if (item.type === "ArmyBookItem" && item.content) {
        const weaponsFromItem = item.content.filter(
          (content) => content.type === "ArmyBookWeapon"
        );
        allWeapons.push(...weaponsFromItem);
      }
    });

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
      text: `${unit.name} [${unitCount}] - ${totalCost}pts`,
    });
    unitCardBasics.appendChild(unitCardType);

    // Combined unit notice (if applicable)
    if (unit.combined) {
      const unitCardCombined = createEl("div", {
        classes: ["mb-0"],
        text: "Combined Unit",
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
            classes: ["badge", "bg-secondary"],
            text: rule,
          })
        );
      });
    unitTraitsContainer.appendChild(unitTraits);
    unitCardBody.appendChild(unitTraitsContainer);

    // ===== WEAPONS SECTION (inside card-body) =====
    const weaponsHeader = createEl("h4", { text: "Weapons" });
    unitCardBody.appendChild(weaponsHeader);

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

    // Build the table header for weapons
    const weaponsThead = createEl("thead");
    const weaponsHeaderRow = createEl("tr");
    ["Weapon", "Range", "Attack", "AP", "Special"].forEach((text) => {
      weaponsHeaderRow.appendChild(createEl("th", { text }));
    });
    weaponsThead.appendChild(weaponsHeaderRow);
    weaponsTable.appendChild(weaponsThead);

    // Build the table body for weapons
    const weaponsTbody = createEl("tbody", {
      classes: ["table-group-divider"],
    });

    // Function to format weapon special rules
    const formatSpecialRules = (specialRules) => {
      if (!specialRules || !specialRules.length) return "-";

      return (
        specialRules
          .filter((rule) => rule.name.toUpperCase() !== "AP")
          .map((rule) => rule.name + (rule.rating ? `(${rule.rating})` : ""))
          .join(", ") || "-"
      );
    };

    // Function to get AP value from special rules
    const getAPValue = (specialRules) => {
      if (!specialRules || !specialRules.length) return "-";

      const apRule = specialRules.find((rule) => rule.name === "AP");
      return apRule ? apRule.rating : "-";
    };

    // Collect and format all weapons for display
    allWeapons.forEach((weapon) => {
      const row = createEl("tr");

      // Weapon cell (e.g., "Heavy Spear")
      row.appendChild(createEl("td", { text: weapon.name }));

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
      specialCell.textContent = formatSpecialRules(weapon.specialRules);
      row.appendChild(specialCell);

      weaponsTbody.appendChild(row);
    });

    weaponsTable.appendChild(weaponsTbody);
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
      upgrades.forEach((upgrade) => {
        const row = createEl("tr");

        // Upgrade name cell
        row.appendChild(createEl("td", { text: upgrade.name }));

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
        row.appendChild(upgradeSpecialCell);

        upgradesTbody.appendChild(row);
      });
      upgradesTable.appendChild(upgradesTbody);
      unitCardBody.appendChild(upgradesTable);
    }

    return unitCol;
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
