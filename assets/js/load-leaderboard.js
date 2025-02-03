// Run the function after the DOM content is loaded
document.addEventListener("DOMContentLoaded", loadJSON);

function loadJSON() {
  document.getElementById("basePointsValue").textContent = basePoints;
  const jsonURL = "assets/leaderboard.json";
  const tbody = document.querySelector("#leaderboard-table tbody");
  tbody.innerHTML = ""; // Clear any existing rows
  const rowData = [];

  fetch(jsonURL)
    .then((response) => response.json())
    .then((data) => {
      //do stuff with loaded data
      displayLeaderboard(data);
    });
}

function displayLeaderboard(data) {
  for (const army of data.armies) {
    const row = document.createElement("tr");
    
  }
}
