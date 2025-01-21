document.addEventListener("DOMContentLoaded", function () {
  const armyInfoContainer = document.getElementById("army-info");
  const url = "/armies/ashenPact.txt";

  fetch(url)
    .then((response) => response.text())
    .then((data) => {
      const lines = data.split("\n").filter((line) => line.trim() !== "");
      let content = "";

      if (lines.length > 0) {
        // Parse the header
        const header = lines[0];
        const headerMatch = header.match(
          /^\s*\+\+\s*(.+?)\s*-\s*(.+?)\s*\[(.+?)\]\s*\+\+\s*$/
        );

        if (headerMatch) {
          const armyName = headerMatch[1];
          const factions = headerMatch[2];
          const gameSystemAndPoints = headerMatch[3];

          content += `
              <h2>${armyName}</h2>
              <p><strong>Factions:</strong> ${factions}</p>
              <p><strong>Game System and Points:</strong> ${gameSystemAndPoints}</p>
              <hr />
            `;
        } else {
          console.error("Header regex did not match");
        }

        // Parse the units
        for (let i = 1; i < lines.length; i++) {
          const unitLine = lines[i];
          const unitMatch = unitLine.match(
            /^(.+?) \[(\d+)\] (Q\d\+ D\d\+) \| (\d+pts) \| (.+)/
          );

          if (unitMatch) {
            const unitName = unitMatch[1];
            const unitModels = unitMatch[2];
            const unitStats = unitMatch[3];
            const unitPoints = unitMatch[4];
            const unitKeywords = unitMatch[5];

            content += `
                <h3>${unitName}</h3>
                <p><strong>Models:</strong> ${unitModels}</p>
                <p><strong>Stats:</strong> ${unitStats}</p>
                <p><strong>Points:</strong> ${unitPoints}</p>
                <p><strong>Keywords:</strong> ${unitKeywords}</p>
              `;

            // Check if the next line contains weapons
            if (i + 1 < lines.length && lines[i + 1].match(/^\d+x/)) {
              const weaponsLine = lines[++i];
              content += `<p><strong>Weapons:</strong> ${weaponsLine}</p>`;
            }

            content += "<hr />";
          } else {
            console.log("Unit regex did not match");
          }
        }
      } else {
        console.error("No lines found in the file");
      }
      // Insert content into the container
      if (armyInfoContainer) {
        armyInfoContainer.innerHTML = content;
        if (window.autoWrapDefinitions) {
          window.autoWrapDefinitions();
        } else {
          console.error("autoWrapDefinitions function not found");
        }
      } else {
        console.error("army-info container not found");
      }
    })
    .catch((error) => {
      console.error("Error fetching army information:", error);
      if (armyInfoContainer) {
        armyInfoContainer.innerHTML = "<p>Error loading army information.</p>";
      }
    });
});
