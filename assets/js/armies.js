// Load campaign data and generate army cards
async function loadArmies() {
  try {
    // Show loading
    document.getElementById("armies-loading").classList.remove("d-none");

    // Load campaign data
    const response = await fetch("assets/json/campaign.json");
    if (!response.ok) throw new Error("Failed to load campaign data");

    const campaignData = await response.json();

    // Hide loading and error
    document.getElementById("armies-loading").classList.add("d-none");
    document.getElementById("armies-error").classList.add("d-none");

    // Render army cards
    renderArmyCards(campaignData.armies);
  } catch (error) {
    console.error("Error loading armies:", error);

    // Hide loading and show error
    document.getElementById("armies-loading").classList.add("d-none");
    document.getElementById("armies-error").classList.remove("d-none");
  }
}

// Render army cards
function renderArmyCards(armies) {
  const container = document.getElementById("armies-container");

  // Sort armies by name
  armies.sort((a, b) => a.armyName.localeCompare(b.armyName));

  // Create army cards
  const armyCardsHtml = armies
    .map((army) => {
      // Get army ID from the armyForgeID
      const armyId = army.armyForgeID.toLowerCase();
      const filename = army.armyURL || armyId;

      return `
            <div class="col-md-6 col-lg-4 mb-4">
                <div class="card h-100 army-card">
                    <div class="card-img-top army-card-image" style="
                        background-image: url('${army.image}');
                        background-position: ${army.imagePosition || "center"};
                        height: 200px;
                    "></div>
                    <div class="card-body">
                        <h5 class="card-title">${army.armyName}</h5>
                        <h6 class="card-subtitle mb-2 text-muted">${
                          army.player
                        } (${army.playerTitle})</h6>
                        <p class="card-text">${army.tagline}</p>
                        <div class="mt-3">
                            <span class="badge bg-info me-1">W: ${
                              army.wins
                            }</span>
                            <span class="badge bg-danger me-1">L: ${
                              army.losses
                            }</span>
                            <span class="badge bg-success me-1">Objectives: ${
                              army.objectives
                            }</span>
                        </div>
                    </div>
                    <div class="card-footer">
                        <a href="army-tracker.html?id=${filename}" class="btn btn-primary">View Army</a>
                    </div>
                </div>
            </div>
        `;
    })
    .join("");

  container.innerHTML = `
        <div class="row">
            ${armyCardsHtml}
        </div>
    `;
}

// Load armies when the DOM is ready
document.addEventListener("DOMContentLoaded", loadArmies);
