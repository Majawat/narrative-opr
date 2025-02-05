document.addEventListener("DOMContentLoaded", () => {
  const armyForgeId = document.getElementById("army-forge-id").textContent;
  const localStorageKey = `armyData_${armyForgeId}`;
  const cacheDuration = 3600000;
  const armyFetched = document.getElementById("last-fetched");
  const refreshButton = document.getElementById("refresh-data");

  // Function to process and display the data
  function processData(data) {
    // Clear existing units before displaying new ones
    const container = document.getElementById("unit-container");
    container.innerHTML = "";

    displayArmy(data);
    displayUnits(data);
  }

  // Function to fetch and cache data
  function fetchAndCacheData() {
    const apiUrl = `https://army-forge.onepagerules.com/api/tts?id=${armyForgeId}`;

    fetch(apiUrl)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        const cacheObject = {
          data: data,
          fetchedAt: Date.now(),
        };
        localStorage.setItem(localStorageKey, JSON.stringify(cacheObject));

        if (armyFetched) {
          armyFetched.textContent = new Date(Date.now()).toLocaleString();
        }

        processData(data);
      })
      .catch((error) => {
        console.error("Fetch error:", error);
        alert(`Failed to refresh data: ${error.message}`);
      });
  }

  // Function to load cached or fetch new data
  function loadData() {
    const now = Date.now();
    const cachedDataString = localStorage.getItem(localStorageKey);

    if (cachedDataString) {
      try {
        const cachedDataObj = JSON.parse(cachedDataString);
        const lastFetchTime = cachedDataObj.fetchedAt;

        if (now - lastFetchTime < cacheDuration) {
          console.log(
            "Using cached data from " + new Date(lastFetchTime).toLocaleString()
          );

          if (armyFetched) {
            armyFetched.textContent = new Date(lastFetchTime).toLocaleString();
          }

          processData(cachedDataObj.data);
          return;
        }
      } catch (e) {
        console.error("Error parsing cached data:", e);
      }
    }

    // If no valid cached data, fetch new data
    fetchAndCacheData();
  }

  // Attach event listener with multiple methods to ensure it works
  function attachRefreshListener() {
    if (refreshButton) {
      refreshButton.addEventListener("click", function (event) {
        event.preventDefault();
        console.log("Refresh button clicked directly");

        // Remove cached data
        localStorage.removeItem(localStorageKey);

        // Fetch fresh data
        handleRefresh();
      });
    } else {
      console.error("Refresh button not found!");
    }
  }

  // Dedicated refresh handler
  function handleRefresh(event) {
    console.log("Refresh attempt triggered");

    // Prevent any default actions
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    // Clear localStorage for this specific army
    localStorage.removeItem(localStorageKey);

    // Force a fresh fetch
    fetchAndCacheData();
  }

  // Initial setup
  attachRefreshListener();
  loadData();
});

// Rest of the original display functions remain the same...

function displayArmy(army) {
  const jsonURL = "assets/campaign.json";
  fetch(jsonURL).then((response) => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  });
  document.getElementById("army-name").textContent = army.name;
}

function displayUnits(army) {
  const container = document.getElementById("unit-container");

  for (const unit of army.units) {
    if (!unit.customName) {
      unit.customName = unit.name;
      unit.name = "";
    }

    const unitDiv = document.createElement("div");

    let unitDivText = `
      <div class="accordion" id="unitAccordion${unit.selectionId}">
        <div class="accordion-item">
          <h3 class="accordion-header" id="heading${unit.selectionId}">
            <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapse${unit.selectionId}" aria-expanded="false" aria-controls="collapse${unit.id}">
              ${unit.customName}
              <small class="text-muted ms-2">${unit.name} [${unit.size}] - ${unit.cost}pts.</small>
            </button>
          </h3>
          <div id="collapse${unit.selectionId}" class="accordion-collapse collapse" aria-labelledby="heading${unit.selectionId}" data-bs-parent="#unitAccordion${unit.selectionId}">
          <div class="accordion-body"><div class="card-body">`;
    if (unit.joinToUnit) {
      for (const joinToUnit of army.units) {
        if (joinToUnit.selectionId === unit.joinToUnit) {
          if (!joinToUnit.customName) {
            joinToUnit.customName = joinToUnit.name;
          }
          unitDivText += `
                  <p >Joined to: ${joinToUnit.customName}</p>`;
        }
      }
    }
    unitDivText += `  
            <div class="unit-card card p-4 bg-body rounded">
    `;

    let toughHTML = "";
    for (const rule of unit.rules) {
      if (rule.name === "Tough") {
        toughHTML = `
        <div class="mx-2 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="32" fill="#dc3545" class="bi bi-heart-fill" viewBox="0 0 16 16">
            <path fill-rule="evenodd" d="M8 1.314C12.438-3.248 23.534 4.735 8 15-7.534 4.736 3.562-3.248 8 1.314"/>
          </svg>
          <p class="mb-0">Tough</p>
          <p class="fw-bold">${rule.rating}</p>
        </div>`;
      }
    }
    unitDivText += `
    <div class="d-flex justify-content-center mb-3">
      <div class="mx-2 text-center">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="32" fill="currentColor" class="bi bi-award-fill" viewBox="0 0 16 16">
        <path style="fill: #ad3e25" d="m8 0 1.669.864 1.858.282.842 1.68 1.337 1.32L13.4 6l.306 1.854-1.337 1.32-.842 1.68-1.858.282L8 12l-1.669-.864-1.858-.282-.842-1.68-1.337-1.32L2.6 6l-.306-1.854 1.337-1.32.842-1.68L6.331.864z"/>
        <path style="fill: #f9ddb7" d="M4 11.794V16l4-1 4 1v-4.206l-2.018.306L8 13.126 6.018 12.1z"/>
      </svg>
        <p class="mb-0">Quality</p>
        <p class="fw-bold">${unit.quality}+</p>
      </div>
      <div class="mx-2 text-center">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="32" fill="#005f83" class="bi bi-shield-fill" viewBox="0 0 16 16">
          <path d="M5.072.56C6.157.265 7.31 0 8 0s1.843.265 2.928.56c1.11.3 2.229.655 2.887.87a1.54 1.54 0 0 1 1.044 1.262c.596 4.477-.787 7.795-2.465 9.99a11.8 11.8 0 0 1-2.517 2.453 7 7 0 0 1-1.048.625c-.28.132-.581.24-.829.24s-.548-.108-.829-.24a7 7 0 0 1-1.048-.625 11.8 11.8 0 0 1-2.517-2.453C1.928 10.487.545 7.169 1.141 2.692A1.54 1.54 0 0 1 2.185 1.43 63 63 0 0 1 5.072.56"/>
        </svg>
        <p class="mb-0">Defense</p>
        <p class="fw-bold">${unit.defense}+</p>
      </div>
      ${toughHTML}</div>`;

    unitDivText += `<p class="d-flex flex-wrap justify-content-center">${unit.rules
      .map(
        (rule) => `<span class="badge bg-secondary m-1">${rule.label}</span>`
      )
      .join("")}</p>`;
    unitDivText += `</div></div>`;

    unitDivText += `
    <div class="unit-card card p-4 bg-body rounded">
      <h4>Weapons</h4>
      <table class="table table-sm table-hover table-striped table-body table-responsive">
        <thead>
          <th>Weapon</th>
          <th>Range</th>
          <th>Attack</th>
          <th>AP</th>
          <th>Special</th>
        </thead>
        <tbody>
          ${Object.values(
            unit.loadout
              .filter((weapon) => weapon.type === "ArmyBookWeapon")
              .reduce((acc, weapon) => {
                const key = weapon.label || weapon.name;
                if (acc[key]) {
                  acc[key].count += weapon.count;
                } else {
                  acc[key] = { ...weapon };
                }
                return acc;
              }, {})
          )
            .map((weapon) => {
              const rules = weapon.specialRules || [];
              const ap =
                rules
                  .filter((r) => r.name === "AP")
                  .map((r) => r.rating)
                  .join("") || "-";
              const specials =
                rules
                  .filter((r) => r.type === "ArmyBookRule" && r.name !== "AP")
                  .map((r) => r.name)
                  .join(", ") || "-";

              return `<tr>
                <td>${weapon.count}x ${weapon.name}</td>
                <td style="text-align: center">${
                  weapon.range ? `${weapon.range}"` : "-"
                }</td>
                <td style="text-align: center">A${weapon.attacks}</td>
                <td style="text-align: center">${ap}</td>
                <td style="text-align: center">${specials}</td>
              </tr>`;
            })
            .join("")}
        </tbody>
       </table>
       ${
         unit.loadout.filter((upgrade) => upgrade.type === "ArmyBookItem")
           .length > 0
           ? `
        <h4>Upgrades</h4>
        <table class="table table-sm table-hover table-striped table-body">
          <thead>
            <th>Upgrade</th>
            <th>Special</th>
          </thead>
          <tbody>
            ${unit.loadout
              .filter((upgrade) => upgrade.type === "ArmyBookItem")
              .map((upgrade) => {
                const rules = upgrade.specialRules || [];
                const specials =
                  rules
                    .filter((r) => r.type === "ArmyBookRule")
                    .map((r) => r.name)
                    .join(", ") || "-";
                return `<tr>
                  <td>${upgrade.name}</td>
                  <td>${upgrade.content
                    .map((itemName) => itemName.name)
                    .join(", ")}</td>
                </tr>`;
              })
              .join("")}
          </tbody>
        </table>
      `
           : ""
       }
          </div>
        </div>
     </div>  `;

    unitDiv.innerHTML = unitDivText;
    const armyModified = document.getElementById("last-modified");
    armyModified.textContent = new Date(army.modified).toLocaleString();

    container.appendChild(unitDiv);
  }
}
