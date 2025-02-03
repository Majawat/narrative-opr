// Run the function after the DOM content is loaded
document.addEventListener("DOMContentLoaded", loadJSON);

function loadJSON() {
  const jsonURL = "assets/leaderboard.json";
  const leaderboardTable = document.getElementById("leaderboard-table");
  const leaderboardLoading = document.getElementById("leaderboard-loading");
  const leaderboardError = document.getElementById("leaderboard-error");
  const tbody = document.querySelector("#leaderboard-table tbody");

  tbody.innerHTML = ""; // Clear any existing rows

  fetch(jsonURL)
    .then((response) => response.json())
    .then((data) => {
      document.getElementById("basePointsValue").textContent = data.basePoints;
      const processedData = processLeaderboard(data);
      displayLeaderboard(processedData);
    });
}

function processLeaderboard(data) {
  const processedData = [];
  let highestAP = 0;

  for (const army of data.armies) {
    const row = {
      player: army.player,
      army: army.army,
      armyURL: army.armyURL,
      victoryPoints: 2 * army.wins + army.earnedVP,
      wins: army.wins,
      losses: army.losses,
      objectives: army.objectives,
      availablePoints:
        data.basePoints +
        army.wins * 150 +
        army.losses * 300 +
        army.objectives * 75 +
        army.earnedPts,
      underdogPoints: 0, //placeholder
    };
    if (row.availablePoints > highestAP) highestAP = row.availablePoints;
    processedData.push(row);
  }

  processedData.forEach((row) => {
    row.underdogPoints = Math.floor((highestAP - row.availablePoints) / 50);
  });

  processedData
    .sort((a, b) => b.victoryPoints - a.victoryPoints)
    .forEach((row, index) => {
      row.position = index + 1;
    });
  return processedData;
}

function displayLeaderboard(processedData) {
  const tbody = document.querySelector("#leaderboard-table tbody");
  tbody.innerHTML = "";
  for (const row of processedData) {
    console.log(row.armyURL);
    let armyLink = row.army;
    if (row.armyURL) {
      armyLink =
        '<a href="armies.html#' + row.armyURL + '">' + row.army + "</a>";
      row.army = armyLink;
    } else {
      armyLink.href = "armies.html";
      armyLink.textContent = row.army;
      row.army = armyLink;
    }

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style="text-align: center">${row.position}</td>
      <td>${row.player}</td>
      <td>${row.army}</td>
      <td style="text-align: center">${row.victoryPoints}</td>
      <td style="text-align: center">${row.wins}</td>
      <td style="text-align: center">${row.losses}</td>
      <td style="text-align: center">${row.objectives}</td>
      <td style="text-align: center">${row.availablePoints}</td>
      <td style="text-align: center">${row.underdogPoints}</td>
    `;
    tbody.appendChild(tr);
  }
}

//TODO: create SORT TABLE FUNCTION
