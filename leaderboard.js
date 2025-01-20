// Set the base points (this can be updated easily)
const basePoints = 1000;

function loadCSV() {
  // Display the base points on the page
  document.getElementById("basePointsValue").textContent = basePoints;

  fetch("leaderboard.csv")
    .then((response) => response.text())
    .then((data) => {
      const rows = data.split("\n").slice(1); // Skip the header
      const tbody = document.querySelector("#leaderboard tbody");
      tbody.innerHTML = ""; // Clear any existing rows
      const rowData = [];

      // Track the highest available points (AP)
      let highestAP = 0;

      rows.forEach((row) => {
        const cols = row.split(",");

        // Skip rows that don't have valid data
        if (cols.length < 5) return; // Ensure at least Player Name, Army Name, Wins, Losses, Special Objectives

        // Ensure no undefined or empty values in cols
        const trimmedCols = cols.map((col) => (col ? col.trim() : ""));

        // Ensure we have valid Wins, Losses, and Special Objectives (numeric)
        const wins = parseInt(trimmedCols[2], 10);
        const losses = parseInt(trimmedCols[3], 10);
        const specialObjectives = parseInt(trimmedCols[4], 10);

        if (isNaN(wins) || isNaN(losses) || isNaN(specialObjectives)) return; // Skip rows with invalid numbers

        // Calculate Victory Points (VP) and Available Points (AP)
        const vp = 2 * wins; // VP = 2 x Wins
        const ap =
          basePoints + wins * 150 + losses * 300 + specialObjectives * 75; // AP = BasePoints + (Wins * 150) + (Losses * 300) + (Special Objectives * 75)

        // Update the highest available points (AP) if necessary
        if (ap > highestAP) highestAP = ap;

        // Create row object with calculated values
        const rowObj = {
          cols: trimmedCols,
          wins: wins,
          losses: losses,
          specialObjectives: specialObjectives,
          vp: vp, // Add VP to row data
          ap: ap, // Add AP to row data
          position: 0, // Placeholder for position
          underdogPoints: 0, // Placeholder for underdog points
        };

        rowData.push(rowObj);
      });

      // Calculate underdog points for each player based on the highest AP
      rowData.forEach((row) => {
        row.underdogPoints = Math.floor((highestAP - row.ap) / 50); // Calculate underdog points
      });

      // Sort by custom score (VP / (Wins + Losses)) and set positions
      rowData
        .sort((a, b) => {
          const aScore = (2 * a.wins) / (a.wins + a.losses);
          const bScore = (2 * b.wins) / (b.wins + b.losses);
          return bScore - aScore; // Descending order
        })
        .forEach((row, index) => {
          row.position = index + 1;

          // Create table row and append to tbody
          const tr = document.createElement("tr");
          tr.innerHTML = `
          <td>${row.position}</td>
          <td>${row.cols[0]}</td>
          <td>${row.cols[1]}</td>
          <td>${row.wins}</td>
          <td>${row.losses}</td>
          <td>${row.specialObjectives}</td>
          <td>${row.vp}</td>
          <td>${row.ap}</td>
          <td>${row.underdogPoints}</td>
        `;
          tbody.appendChild(tr);
        });
    });
}

function sortTable(columnIndex) {
  const table = document.getElementById("leaderboard");
  const tbody = table.tBodies[0];
  const rows = Array.from(tbody.rows);
  let direction = table.getAttribute("data-sort-direction");

  // Determine the sort direction
  if (table.getAttribute("data-sort-column") == columnIndex) {
    direction = direction === "asc" ? "desc" : "asc";
  } else {
    direction = "desc";
  }

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
  document.querySelectorAll("th").forEach((th, index) => {
    th.classList.remove("sort-asc", "sort-desc");
    if (index === columnIndex) {
      th.classList.add(direction === "asc" ? "sort-asc" : "sort-desc");
    }
  });
}

// Run the function after the DOM content is loaded
document.addEventListener("DOMContentLoaded", loadCSV);
