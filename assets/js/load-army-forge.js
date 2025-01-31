// Fetch data when the DOM is fully loaded
document.addEventListener("DOMContentLoaded", () => {
  const armyForgeId = document.getElementById("army-forge-id").textContent;
  fetch("https://army-forge.onepagerules.com/api/tts?id=" + armyForgeId)
    .then((response) => response.json())
    .then((data) => {
      // Process and display the data
      displayArmy(data);
      displayUnits(data);
    })
    .catch((error) => console.error("Error fetching JSON:", error));
});

function displayArmy(army) {
  document.getElementById("army-name").textContent = army.name;
}

function displayUnits(army) {
  const container = document.getElementById("unit-container");

  for (const unit of army.units) {
    const unitDiv = document.createElement("div");
    unitDiv.classList.add("unit-card", "card", "p-4", "bg-body", "rounded");

    var unitDivText = `
      <div class="row">
      <div class="card mb-4 mb-sm-0 bg-body text-body border-0 col-md-4">
      <div class="card-body">
      <h3 class="card-title">${unit.customName}</h3>
      <h5 class="card-subtitle mb-2 text-muted">${unit.name} [${unit.size}] - <small class="text-muted">${unit.cost}pts.</small></h5>      
    `;

    if (unit.joinToUnit) {
      for (const joinToUnit of army.units) {
        if (joinToUnit.selectionId === unit.joinToUnit) {
          unitDivText += `
      <p class="card-text">Joined to: ${joinToUnit.customName}</p>`;
        }
      }
    }
    var toughHTML = "";
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
    <div class="col-md-8">
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

    container.appendChild(unitDiv);
  }
}
