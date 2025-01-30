// the-ashen-pact.js
fetch("https://army-forge.onepagerules.com/api/tts?id=vMzljLVC6ZGv")
  .then((response) => response.json())
  .then((data) => {
    const ashenPactDiv = document.getElementById("ashen-pact");
    console.log(data);
    const armyData = data;

    // Display the army name and description
    const armyName = armyData.name;
    const armyURL = armyData.ttsURL;
    const armyDescription = armyData.description;
    ashenPactDiv.innerHTML += `
      <h2>${armyName}</h2>
      <p><a href="${armyURL}">${armyURL}</a></p>
      <p>${armyDescription}</p>
    `;

    // Display the units
    const units = armyData.units;
    units.forEach((unit) => {
      const unitName = unit.name;
      const unitRules = unit.rules;
      const unitWeapons = unit.weapons;
      ashenPactDiv.innerHTML += `
        <h3>${unitName}</h3>
                ${units.Defense}
          ${unitRules.map((upgrade) => `${upgrade.label} `).join("")}
        
        <ul>
          ${unitWeapons
            .map(
              (upgrade) => `<li>${unitWeapons.name} - ${upgrade.optionId}</li>`
            )
            .join("")}
        </ul>
      `;
    });
  })
  .catch((error) => console.error("Error loading JSON data:", error));
