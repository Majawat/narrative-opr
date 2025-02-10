document.addEventListener("DOMContentLoaded", () => {
  const armiesContainer = document.getElementById("armiesContainer");
  const jsonURL = "assets/campaign.json";

  const tooltipTriggerList = document.querySelectorAll(
    '[data-bs-toggle="tooltip"]'
  );
  const tooltipList = [...tooltipTriggerList].map(
    (tooltipTriggerEl) => new bootstrap.Tooltip(tooltipTriggerEl)
  );

  armiesContainer.innerHTML = `<div class="alert alert-info" role="alert">Loading Army Data...</div>`;

  fetch(jsonURL)
    .then((response) => {
      if (!response.ok) {
        armiesContainer.innerHTML = `<div class="alert alert-danger" role="alert">Failed to load Army Data. Please try again later.</div>`;
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      armiesContainer.innerHTML = "";
      for (army of data.armies) {
        let armyContent = `
        <section
          id="${army.armyURL}"
          class="mb-5 col-12 col-md-6 col-lg-5 nav-scroll-top mx-auto"
        >`;
        armyContent += `<div class="card border-secondary">`;
        armyContent += `            <img
              src="${army.image}"
              class="card-img-top img-fluid"
              loading="eager"
              style="
                width: 100%;
                height: 250px;
                object-fit: cover;
                object-position: ${army.imagePosition};
              "
              alt="The ${army.armyName} Army"
            />`;
        armyContent += `<div class="card-header bg-gradient bg-dark text-light">
              <h2 class="mb-0">${army.armyName}</h2>`;

        if (army.faction[0].alias) {
          for (faction of army.faction) {
            console.log(faction.alias, faction.name);
            armyContent += `<span class="badge me-1 text-bg-info" data-bs-toggle="tooltip" data-bs-title="${faction.name}">${faction.alias}</span>`;
          }
        } else {
          for (faction of army.faction) {
            armyContent += `<span class="badge me-1 text-bg-info">${faction}</span>`;
          }
        }

        armyContent += `</div>`;

        armyContent += `<div class="card-body">
              <h3 class="card-title text-secondary">
                ${army.playerTitle}
                <span class="text-body fw-bold">${army.player}</span>
              </h3>
              <p class="lead mb-3 text-muted">
                ${army.tagline}
              </p>`;
        armyContent += `<p>${army.summary}</p>`;

        if (army.armyURL == null) {
          armyContent += `<div class="text-end mt-3"> <a href="" class="btn btn-outline-primary disabled">View Full Army Details</a> </div>`;
        } else {
          armyContent += `<div class="text-end mt-3"> <a href="${army.armyURL}.html" class="btn btn-primary">View Full Army Details</a> </div>`;
        }

        armiesContainer.innerHTML += armyContent;
        const tooltipTriggerList = document.querySelectorAll(
          '[data-bs-toggle="tooltip"]'
        );
        const tooltipList = [...tooltipTriggerList].map(
          (tooltipTriggerEl) => new bootstrap.Tooltip(tooltipTriggerEl)
        );
      }
    });
});
