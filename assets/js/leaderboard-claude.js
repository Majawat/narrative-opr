// Constants
const CONFIG = {
  basePoints: 1000,
  pointsMultipliers: {
    win: 150,
    loss: 300,
    specialObjective: 75,
  },
  defaultSortDirections: {
    0: "asc", // Position
    1: "asc", // Player
    2: "asc", // Army
    3: "desc", // Victory Points
    4: "desc", // Wins
    5: "asc", // Losses
    6: "desc", // Special Objectives
    7: "desc", // Available Points
    8: "desc", // Underdog Points
  },
  underdogPointsDivisor: 50,
  victoryPointsPerWin: 2,
};

// Data processing utilities
class LeaderboardProcessor {
  static calculateVictoryPoints(wins, earnedVP) {
    return CONFIG.victoryPointsPerWin * wins + earnedVP;
  }

  static calculateAvailablePoints(
    wins,
    losses,
    specialObjectives,
    earnedPoints
  ) {
    return (
      CONFIG.basePoints +
      wins * CONFIG.pointsMultipliers.win +
      losses * CONFIG.pointsMultipliers.loss +
      specialObjectives * CONFIG.pointsMultipliers.specialObjective +
      earnedPoints
    );
  }

  static calculateUnderdogPoints(playerAP, highestAP) {
    return Math.floor((highestAP - playerAP) / CONFIG.underdogPointsDivisor);
  }

  static createArmyUrl(armyName) {
    return `armies.html#${armyName.toLowerCase().replace(/\s+/g, "-")}`;
  }
}

// Main leaderboard class
class Leaderboard {
  constructor() {
    this.table = document.getElementById("leaderboard-table");
    this.tbody = this.table.querySelector("tbody");
    this.loadingEl = document.getElementById("leaderboard-loading");
    this.errorEl = document.getElementById("leaderboard-error");
    this.basePointsEl = document.getElementById("basePointsValue");
  }

  async initialize() {
    try {
      this.showLoading();
      this.displayBasePoints();
      const data = await this.fetchLeaderboardData();
      const processedData = this.processData(data);
      this.renderTable(processedData);
      this.hideLoading();
    } catch (error) {
      console.error("Leaderboard initialization failed:", error);
      this.showError();
    }
  }

  async fetchLeaderboardData() {
    try {
      const response = await fetch("/assets/leaderboard.csv");
      if (!response.ok) throw new Error("Failed to fetch leaderboard data");
      const text = await response.text();
      return text.split("\n").slice(1); // Skip header
    } catch (error) {
      throw new Error(`Failed to load leaderboard: ${error.message}`);
    }
  }

  processData(rows) {
    let highestAP = 0;
    const processedRows = rows
      .map((row) => {
        const cols = row.split(",").map((col) => (col ? col.trim() : ""));
        if (!this.isValidRow(cols)) return null;

        const { wins, losses, specialObjectives, earnedVP, earnedPoints } =
          this.parseNumericValues(cols);

        const vp = LeaderboardProcessor.calculateVictoryPoints(wins, earnedVP);
        const ap = LeaderboardProcessor.calculateAvailablePoints(
          wins,
          losses,
          specialObjectives,
          earnedPoints
        );

        highestAP = Math.max(highestAP, ap);

        return {
          playerName: cols[0],
          armyName: cols[1],
          wins,
          losses,
          specialObjectives,
          vp,
          ap,
          position: 0,
          underdogPoints: 0,
        };
      })
      .filter((row) => row !== null);

    // Calculate positions and underdog points
    return this.calculateFinalScores(processedRows, highestAP);
  }

  isValidRow(cols) {
    return cols.length >= 7 && cols.every((col) => col !== undefined);
  }

  parseNumericValues(cols) {
    return {
      wins: parseInt(cols[2], 10) || 0,
      losses: parseInt(cols[3], 10) || 0,
      specialObjectives: parseInt(cols[4], 10) || 0,
      earnedVP: parseInt(cols[5], 10) || 0,
      earnedPoints: parseInt(cols[6], 10) || 0,
    };
  }

  calculateFinalScores(rows, highestAP) {
    return rows
      .map((row) => ({
        ...row,
        underdogPoints: LeaderboardProcessor.calculateUnderdogPoints(
          row.ap,
          highestAP
        ),
      }))
      .sort((a, b) => {
        const aScore = (2 * a.wins) / (a.wins + a.losses || 1);
        const bScore = (2 * b.wins) / (b.wins + b.losses || 1);
        return bScore - aScore;
      })
      .map((row, index) => ({ ...row, position: index + 1 }));
  }

  renderTable(data) {
    this.tbody.innerHTML = data.map((row) => this.createTableRow(row)).join("");
  }

  createTableRow(row) {
    const armyUrl = LeaderboardProcessor.createArmyUrl(row.armyName);
    return `
      <tr>
        <td class="text-align-center">${row.position}</td>
        <td>${row.playerName}</td>
        <td><a href="${armyUrl}">${row.armyName}</a></td>
        <td class="text-align-center">${row.vp}</td>
        <td class="text-align-center">${row.wins}</td>
        <td class="text-align-center">${row.losses}</td>
        <td class="text-align-center">${row.specialObjectives}</td>
        <td class="text-align-center">${row.ap}</td>
        <td class="text-align-center">${row.underdogPoints}</td>
      </tr>
    `;
  }

  sortTable(columnIndex) {
    const rows = Array.from(this.tbody.rows);
    const currentDirection = this.table.getAttribute("data-sort-direction");
    const newDirection = this.getNewSortDirection(
      columnIndex,
      currentDirection
    );

    rows.sort((a, b) => this.compareCells(a, b, columnIndex, newDirection));

    this.updateTableAfterSort(rows, columnIndex, newDirection);
  }

  getNewSortDirection(columnIndex, currentDirection) {
    if (this.table.getAttribute("data-sort-column") == columnIndex) {
      return currentDirection === "asc" ? "desc" : "asc";
    }
    return CONFIG.defaultSortDirections[columnIndex] || "desc";
  }

  compareCells(rowA, rowB, columnIndex, direction) {
    const aText = rowA.cells[columnIndex].innerText.trim();
    const bText = rowB.cells[columnIndex].innerText.trim();
    const aValue = isNaN(aText) ? aText.toLowerCase() : parseFloat(aText);
    const bValue = isNaN(bText) ? bText.toLowerCase() : parseFloat(bText);

    return direction === "asc"
      ? this.compareValues(aValue, bValue)
      : this.compareValues(bValue, aValue);
  }

  compareValues(a, b) {
    return a < b ? -1 : a > b ? 1 : 0;
  }

  updateTableAfterSort(sortedRows, columnIndex, direction) {
    sortedRows.forEach((row) => this.tbody.appendChild(row));
    this.table.setAttribute("data-sort-direction", direction);
    this.table.setAttribute("data-sort-column", columnIndex);
    this.updateSortIndicators(columnIndex, direction);
  }

  updateSortIndicators(columnIndex, direction) {
    document.querySelectorAll("th.sortable").forEach((th, index) => {
      th.classList.remove("sort-asc", "sort-desc");
      if (index === columnIndex) {
        th.classList.add(direction === "asc" ? "sort-asc" : "sort-desc");
      }
    });
  }

  showLoading() {
    this.loadingEl?.classList.remove("d-none");
    this.errorEl?.classList.add("d-none");
    this.table?.classList.add("d-none");
  }

  hideLoading() {
    this.loadingEl?.classList.add("d-none");
    this.table?.classList.remove("d-none");
  }

  showError() {
    this.loadingEl?.classList.add("d-none");
    this.errorEl?.classList.remove("d-none");
    this.table?.classList.add("d-none");
  }

  displayBasePoints() {
    if (this.basePointsEl) {
      this.basePointsEl.textContent = CONFIG.basePoints;
    }
  }
}

// Initialize the leaderboard
document.addEventListener("DOMContentLoaded", () => {
  const leaderboard = new Leaderboard();
  leaderboard.initialize();

  // Add event listeners for sorting
  document.querySelectorAll("th.sortable").forEach((th, index) => {
    th.addEventListener("click", () => leaderboard.sortTable(index));
  });
});
