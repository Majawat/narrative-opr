// Fetch data when the DOM is fully loaded
document.addEventListener("DOMContentLoaded", () => {
  fetch("https://army-forge.onepagerules.com/api/tts?id=vMzljLVC6ZGv")
    .then((response) => response.json())
    .then((data) => {
      // Process and display the data
      console.log(data);

      displayUnits(data);
    })
    .catch((error) => console.error("Error fetching JSON:", error));
});

function displayUnits(army) {
  const container = document.getElementById("unit-card-container");

  for (const unit of army.units) {
    console.log(unit);
  }
}
