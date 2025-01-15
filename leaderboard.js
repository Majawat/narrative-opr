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
        if (cols.length > 1) {
          // Ensure not an empty row
          const rowObj = {
            cols: cols.map((col) => col.trim()),
            position: 0, // Placeholder for position
          };
          rowData.push(rowObj);
        }
      });

      // Log the rowData to ensure it's populated correctly
      console.log("Loaded Data:", rowData);

      // Sort by custom score (VP / (Wins + Losses)) and set positions
      rowData.sort((a, b) => {
        const aVP = parseFloat(a.cols[2]);
        const aWins = parseFloat(a.cols[3]);
        const aLosses = parseFloat(a.cols[4]);
        const bVP = parseFloat(b.cols[2]);
        const bWins = parseFloat(b.cols[3]);
        const bLosses = parseFloat(b.cols[4]);

        const aScore = aVP / (aWins + aLosses);
        const bScore = bVP / (bWins + bLosses);

        return bScore - aScore; // Descending order
      });

      // Log after sorting
      console.log("Sorted Data:", rowData);

      rowData.forEach((row, index) => {
        row.position = index + 1; // Set position
        const tr = document.createElement("tr");
        const tdPosition = document.createElement("td");
        tdPosition.textContent = row.position;
        tr.appendChild(tdPosition);

        row.cols.forEach((col) => {
          const td = document.createElement("td");
          td.textContent = col;
          tr.appendChild(td);
        });

        tbody.appendChild(tr);
      });
    });
}

function sortTable(columnIndex) {
  const table = document.getElementById("leaderboard");
  const tbody = table.tBodies[0];

  // Log tbody state before sorting
  console.log("Table state before sorting:", tbody);

  // Check if the tbody contains rows
  if (!tbody || tbody.rows.length === 0) {
    console.error("No rows to sort.");
    return; // No rows to sort
  }

  const rows = Array.from(tbody.rows);
  let direction = table.getAttribute("data-sort-direction");

  // Always sort by descending first
  if (!direction || direction === "asc") {
    direction = "desc";
  } else {
    direction = "asc";
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

  // Log rows after sorting
  console.log("Rows after sorting:", rows);

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
