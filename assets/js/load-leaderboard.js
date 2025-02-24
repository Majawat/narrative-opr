const leaderboardTable = document.getElementById("leaderboard-container");
const leaderboardLoading = document.getElementById("leaderboard-loading");
const leaderboardError = document.getElementById("leaderboard-error");

// Run the function after the DOM content is loaded
document.addEventListener("DOMContentLoaded", () => {
  leaderboardLoading.classList.replace("d-none", "d-flex");
  leaderboardTable.style.display = "none";
  leaderboardError.style.display = "none";

  loadJSON();

  leaderboardLoading.classList.replace("d-flex", "d-none");
  leaderboardTable.style.display = "block";
  leaderboardError.style.display = "none";
});

function loadJSON() {
  const jsonURL = "assets//json/campaign.json";

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
      armyName: army.armyName,
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
      underdogPoints: 0,
      parallelPoints: 0,
    };
    if (row.availablePoints > highestAP) highestAP = row.availablePoints;
    processedData.push(row);
  }

  processedData.forEach((row) => {
    row.underdogPoints = Math.floor((highestAP - row.availablePoints) / 50);
    row.parallelPoints = row.victoryPoints / (row.wins + row.losses);
  });

  processedData
    .sort((a, b) => b.parallelPoints - a.parallelPoints)
    .forEach((row, index) => {
      row.position = index + 1;
    });
  return processedData;
}

function displayLeaderboard(processedData) {
  const tbody = document.querySelector("#leaderboard-table tbody");
  tbody.innerHTML = "";
  for (const row of processedData) {
    let armyLink = row.army;
    if (row.armyURL) {
      armyLink = '<a href="' + row.armyURL + '.html">' + row.armyName + "</a>";
      row.army = armyLink;
    } else {
      row.army = row.armyName;
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

function sortTable(columnIndex) {
  const table = document.getElementById("leaderboard-table");
  const tbody = table.tBodies[0];
  const rows = Array.from(tbody.rows);
  let direction = table.getAttribute("data-sort-direction");

  const defaultSortDirections = {
    0: "asc", // Position
    1: "asc", // Player
    2: "asc", // Army
    3: "desc", // Victory Points
    4: "desc", // Wins
    5: "asc", // Losses
    6: "desc", // Special Objectives Completed
    7: "desc", // Available Points
    8: "desc", // Underdog Points
  };

  // Determine the sort direction
  if (table.getAttribute("data-sort-column") == columnIndex) {
    direction = direction === "asc" ? "desc" : "asc";
  } else {
    direction = defaultSortDirections[columnIndex] || "desc";
  }

  console.log("Sorting by column", columnIndex, "in", direction, "order");

  // Sort the rows
  rows.sort((a, b) => {
    const aText = a.cells[columnIndex].innerText.trim();
    const bText = b.cells[columnIndex].innerText.trim();
    const aValue = isNaN(aText) ? aText.toLowerCase() : parseFloat(aText);
    const bValue = isNaN(bText) ? bText.toLowerCase() : parseFloat(bText);

    if (aValue < bValue) {
      return direction === "asc" ? -1 : 1;
    }
    if (aValue > bValue) {
      return direction === "asc" ? 1 : -1;
    }
    return 0;
  });

  // Reattach sorted rows
  rows.forEach((row) => tbody.appendChild(row));

  // Update sort direction and column
  table.setAttribute("data-sort-direction", direction);
  table.setAttribute("data-sort-column", columnIndex);

  // Update sort indicators
  document.querySelectorAll("th.sortable").forEach((th, index) => {
    th.classList.remove("sort-asc", "sort-desc");
    if (index === columnIndex) {
      th.classList.add(direction === "asc" ? "sort-asc" : "sort-desc");
    }
  });
}
