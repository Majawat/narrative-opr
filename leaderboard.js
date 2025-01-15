// Set the base points (this can be updated easily)
const basePoints = 800;

function loadCSV() {
  fetch("leaderboard.csv")
    .then((response) => response.text())
    .then((data) => {
      const rows = data.split("\n").slice(1); // Skip the header
      const tbody = document.querySelector("#leaderboard tbody");
      tbody.innerHTML = ""; // Clear any existing rows
      const rowData = [];

      rows.forEach((row) => {
        const cols = row.split(",");

        // Skip rows that don't have valid data
        if (cols.length < 4) return; // Ensure at least Player Name, Army Name, Wins, Losses

        // Ensure no undefined or empty values in cols
        const trimmedCols = cols.map((col) => (col ? col.trim() : ""));

        // Ensure we have valid Wins and Losses (numeric)
        const wins = parseInt(trimmedCols[2], 10);
        const losses = parseInt(trimmedCols[3], 10);

        if (isNaN(wins) || isNaN(losses)) return; // Skip rows with invalid numbers for Wins or Losses

        // Calculate Victory Points (VP) and Available Points (AP)
        const vp = 2 * wins; // VP = 2 x Wins
        const ap = basePoints + wins * 150 + losses * 300; // AP = BasePoints + (Wins * 150) + (Losses * 300)

        // Create row object with calculated values
        const rowObj = {
          cols: trimmedCols,
          wins: wins,
          losses: losses,
          vp: vp, // Add VP to row data
          ap: ap, // Add AP to row data
          position: 0, // Placeholder for position
        };

        rowData.push(rowObj);
      });

      // Sort by custom score (VP / (Wins + Losses)) and set positions
      rowData.sort((a, b) => {
        const aScore = (2 * a.wins) / (a.wins + a.losses);
        const bScore = (2 * b.wins) / (b.wins + b.losses);
        return bScore - aScore; // Descending order
      });

      rowData.forEach((row, index) => {
        row.position = index + 1; // Set position
        const tr = document.createElement("tr");

        // Add Position column
        const tdPosition = document.createElement("td");
        tdPosition.textContent = row.position;
        tr.appendChild(tdPosition);

        // Add Player Name
        const tdPlayerName = document.createElement("td");
        tdPlayerName.textContent = row.cols[0]; // Player Name
        tr.appendChild(tdPlayerName);

        // Add Army Name
        const tdArmyName = document.createElement("td");
        tdArmyName.textContent = row.cols[1]; // Army Name
        tr.appendChild(tdArmyName);

        // Add Victory Points (VP)
        const tdVP = document.createElement("td");
        tdVP.textContent = row.vp; // Victory Points
        tr.appendChild(tdVP);

        // Add Wins
        const tdWins = document.createElement("td");
        tdWins.textContent = row.wins;
        tr.appendChild(tdWins);

        // Add Losses
        const tdLosses = document.createElement("td");
        tdLosses.textContent = row.losses;
        tr.appendChild(tdLosses);

        // Add Available Points (AP)
        const tdAP = document.createElement("td");
        tdAP.textContent = row.ap; // Available Points
        tr.appendChild(tdAP);

        tbody.appendChild(tr);
      });
    });
}

function sortTable(columnIndex) {
  const table = document.getElementById("leaderboard");
  const tbody = table.tBodies[0];

  // Check if the tbody contains rows
  if (!tbody || tbody.rows.length === 0) {
    console.error("No rows to sort.");
    return; // No rows to sort
  }

  const rows = Array.from(tbody.rows);
  let direction = table.getAttribute("data-sort-direction");

  // Set default sort direction based on the column index
  // Player Name (0) and Army Name (1) should be sorted in ascending by default
  if (columnIndex === 0 || columnIndex === 1) {
    if (!direction || direction === "desc") {
      direction = "asc";
    } else {
      direction = "desc";
    }
  } else {
    // For other columns, the default should be descending
    if (!direction || direction === "asc") {
      direction = "desc";
    } else {
      direction = "asc";
    }
  }

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

  rows.forEach((row) => tbody.appendChild(row)); // Reattach sorted rows
  table.setAttribute("data-sort-direction", direction);

  // Update sort indicators
  document
    .querySelectorAll("th")
    .forEach((th) => th.classList.remove("sort-asc", "sort-desc"));
  const header = document.querySelectorAll("th")[columnIndex];
  header.classList.add(direction === "asc" ? "sort-asc" : "sort-desc");
}

// Load CSV and populate the table on page load
window.onload = loadCSV;
