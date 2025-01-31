// Fetch data when the DOM is fully loaded
document.addEventListener("DOMContentLoaded", () => {
  fetch("https://army-forge.onepagerules.com/api/tts?id=vMzljLVC6ZGv")
    .then((response) => response.json())
    .then((data) => {
      // Process and display the data
      displayUnits(data);
    })
    .catch((error) => console.error("Error fetching JSON:", error));
});

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
      <h5 class="card-subtitle mb-2 text-muted">${unit.name} [${unit.size}]</h5>      
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
          <i class="bi bi-heart-fill" style="font-size: 1.5rem; color: #dc3545"></i>
          <p class="mb-0">Tough</p>
          <p class="fw-bold">${rule.rating}</p>
        </div>`;
      }
    }
    unitDivText += `
    <div class="d-flex justify-content-center mb-3">
      <div class="mx-2 text-center">
        <i class="bi bi-star-fill" style="font-size: 1.5rem; color: #ffc107"></i>
        <p class="mb-0">Quality</p>
        <p class="fw-bold">${unit.quality}+</p>
      </div>
      <div class="mx-2 text-center">
        <i
          class="bi bi-shield-shaded"
          style="font-size: 1.5rem; color: #17a2b8"
        ></i>
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
