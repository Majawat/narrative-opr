// assets/js/load-missions.js

document.addEventListener("DOMContentLoaded", function () {
  loadMissions();
});

async function loadMissions() {
  try {
    // Fetch missions data
    const response = await fetch("assets/json/missions.json");
    if (!response.ok) {
      throw new Error("Failed to load missions data");
    }

    const missionsData = await response.json();
    const { missions } = missionsData;

    // Update missions navigation
    updateMissionsNavigation(missions);

    // Get missions container
    const missionsContainer = document.getElementById("missions-accordion");
    if (!missionsContainer) return;

    // Clear any existing content
    missionsContainer.innerHTML = "";

    // Process each mission
    for (const mission of missions) {
      // Create mission accordion item
      const missionItem = createMissionItem(mission);
      missionsContainer.appendChild(missionItem);

      // Load battle report if available
      if (mission.battleReportFile) {
        loadBattleReport(mission.number, mission.battleReportFile);
      }
    }

    // Open mission specified in URL hash if any
    checkUrlHashForMission();
  } catch (error) {
    console.error("Error loading missions:", error);
    displayErrorMessage(
      "Failed to load missions data. Please try again later."
    );
  }
}

function updateMissionsNavigation(missions) {
  const navDropdown = document.getElementById("missions-dropdown");
  if (!navDropdown) return;

  const dropdownMenu = document.getElementById("missions-nav-dropdown");
  if (!dropdownMenu) return;

  // Clear existing items except the "All Missions" link
  const firstItem = dropdownMenu.querySelector("li:first-child");
  const divider = dropdownMenu.querySelector("hr.dropdown-divider");
  dropdownMenu.innerHTML = "";

  // Add back the "All Missions" link and divider
  if (firstItem) dropdownMenu.appendChild(firstItem);
  if (divider) dropdownMenu.appendChild(divider);

  // Add mission links
  missions.forEach((mission) => {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.classList.add("dropdown-item");
    a.href = `#mission${mission.number}-item`;
    a.textContent = `Mission ${mission.number}: ${mission.title}`;
    li.appendChild(a);
    dropdownMenu.appendChild(li);
  });
}

function createMissionItem(mission) {
  const statusClass =
    mission.status === "completed"
      ? "mission-completed"
      : mission.status === "current"
      ? "mission-current"
      : "mission-upcoming";

  const dateText = mission.datetime
    ? new Date(mission.datetime).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : `${mission.month} - Date TBD`;

  const missionItem = document.createElement("div");
  missionItem.id = `mission${mission.number}-item`;
  missionItem.className = `accordion-item nav-scroll-top ${statusClass}`;

  // Default expanded state
  let isExpanded = mission.status === "current";

  missionItem.innerHTML = `
      <h2 class="accordion-header" id="panelsStayOpen-heading${mission.number}">
          <button class="accordion-button ${isExpanded ? "" : "collapsed"}" 
              type="button" 
              data-bs-toggle="collapse" 
              data-bs-target="#panelsStayOpen-collapse${mission.number}" 
              aria-expanded="${isExpanded ? "true" : "false"}" 
              aria-controls="panelsStayOpen-collapse${mission.number}">
              <a>
                  <h2>Mission ${mission.number}: ${mission.title}</h2>
                  <span id="mission${
                    mission.number
                  }-date">${dateText}</span> - ${mission.points}pts
              </a>
          </button>
      </h2>
      <div id="panelsStayOpen-collapse${mission.number}" 
          class="accordion-collapse collapse ${isExpanded ? "show" : ""}" 
          aria-labelledby="panelsStayOpen-heading${mission.number}">
          <div class="accordion-body" id="mission${mission.number}-content">
              ${
                mission.status === "completed" || mission.status === "current"
                  ? createTabNavigation(mission)
                  : ""
              }
              <div class="tab-content mt-3" id="mission${
                mission.number
              }TabsContent">
                  ${createTabPanes(mission)}
              </div>
          </div>
      </div>
  `;

  return missionItem;
}

function createTabNavigation(mission) {
  if (mission.status === "upcoming") return "";

  return `
  <ul class="nav nav-tabs" id="mission${mission.number}Tabs" role="tablist">
      ${
        mission.battleReportFile
          ? `
      <li class="nav-item" role="presentation">
          <button class="nav-link active" 
              id="battle-report${mission.number}-tab" 
              data-bs-toggle="tab" 
              data-bs-target="#battle-report${mission.number}" 
              type="button" role="tab" 
              aria-controls="battle-report${mission.number}" 
              aria-selected="true">
              Battle Report
          </button>
      </li>`
          : ""
      }
      <li class="nav-item" role="presentation">
          <button class="nav-link ${mission.battleReportFile ? "" : "active"}" 
              id="original-rules${mission.number}-tab" 
              data-bs-toggle="tab" 
              data-bs-target="#original-rules${mission.number}" 
              type="button" role="tab" 
              aria-controls="original-rules${mission.number}" 
              aria-selected="${mission.battleReportFile ? "false" : "true"}">
              Original Rules
          </button>
      </li>
  </ul>`;
}

function createTabPanes(mission) {
  let tabPanes = "";

  // Battle Report Tab (only for completed missions)
  if (mission.battleReportFile && mission.status === "completed") {
    tabPanes += `
      <div class="tab-pane fade show active" 
          id="battle-report${mission.number}" 
          role="tabpanel" 
          aria-labelledby="battle-report${mission.number}-tab">
          <div id="battle-report-content-${mission.number}">
              <p>Loading battle report...</p>
          </div>
      </div>`;
  }

  // Original Rules Tab
  tabPanes += `
  <div class="tab-pane fade ${
    mission.battleReportFile && mission.status === "completed"
      ? ""
      : "show active"
  }" 
      id="original-rules${mission.number}" 
      role="tabpanel" 
      aria-labelledby="original-rules${mission.number}-tab">
      ${createRulesContent(mission)}
  </div>`;

  return tabPanes;
}

function createRulesContent(mission) {
  if (mission.status === "upcoming" && !mission.overview) {
    return `<p>${
      mission.overview || "Mission details will be revealed soon."
    }</p>`;
  }

  let content = `<h3>Overview</h3>
      <p>${mission.overview}</p>`;

  if (mission.objective && mission.objective.primary) {
    content += `<h3>Objective</h3>`;

    if (mission.objective.primary) {
      if (
        mission.objective.secondary &&
        mission.objective.secondary.length > 0
      ) {
        content += `<h4>Primary Objective</h4>`;
      }
      content += `<p>${mission.objective.primary}</p>`;
    }

    if (mission.objective.secondary && mission.objective.secondary.length > 0) {
      content += `<h4>Secondary Objectives</h4>
          <ul>`;
      mission.objective.secondary.forEach((secondary) => {
        content += `<li>
                  <strong>${secondary.name}:</strong> ${secondary.description}
              </li>`;
      });
      content += `</ul>`;
    }
  }

  if (mission.specialRules && mission.specialRules.length > 0) {
    content += `<h3>Special Rules</h3>
      <ul>`;
    mission.specialRules.forEach((rule) => {
      // Use the HTML directly without converting newlines to <br>
      content += `<li>
              <strong>${rule.name}:</strong> ${rule.description}
          </li>`;
    });
    content += `</ul>`;
  }

  if (mission.terrainSuggestions && mission.terrainSuggestions.length > 0) {
    content += `<h3>Terrain Suggestions</h3>
      <ul>`;
    mission.terrainSuggestions.forEach((terrain) => {
      content += `<li>
              <strong>${terrain.name}:</strong> ${terrain.description}
          </li>`;
    });
    content += `</ul>`;
  }

  if (mission.deployment) {
    content += `<h3>Deployment</h3>
      <p>${mission.deployment}</p>`;
  }

  if (mission.scoringSystem && mission.scoringSystem.points) {
    content += `<h3>Scoring System</h3><ul>`;
    mission.scoringSystem.points.forEach((point) => {
      content += `<li>${point}</li>`;
    });
    content += `</ul>`;
  }

  if (mission.victoryConditions) {
    content += `<h3>Victory Conditions</h3>`;

    if (mission.victoryConditions.primary) {
      content += `<p>${mission.victoryConditions.primary}</p>`;
    }

    if (
      mission.victoryConditions.rewards &&
      mission.victoryConditions.rewards.length > 0
    ) {
      content += `<ul>`;
      mission.victoryConditions.rewards.forEach((reward) => {
        content += `<li>
                  <strong>${reward.condition}:</strong> ${reward.description}
              </li>`;
      });
      content += `</ul>`;
    }
  }

  return content;
}

async function loadBattleReport(missionNumber, battleReportFile) {
  try {
    const response = await fetch(battleReportFile);
    if (!response.ok) {
      throw new Error(
        `Failed to load battle report for mission ${missionNumber}`
      );
    }

    const battleReport = await response.json();
    const contentContainer = document.getElementById(
      `battle-report-content-${missionNumber}`
    );

    if (!contentContainer) return;

    let content = `<h3>${battleReport.title}</h3>`;

    // Add participants info if needed
    if (battleReport.participants && battleReport.participants.length > 0) {
      const winner = battleReport.participants.find(
        (p) => p.result === "winner"
      );
      if (winner) {
        content += `<p>In this battle, `;
        battleReport.participants.forEach((participant, index) => {
          if (index > 0) {
            content +=
              index === battleReport.participants.length - 1 ? " and " : ", ";
          }
          content += `<strong>${participant.army}</strong> (${participant.player})`;
        });
        content += ` faced off, with ${winner.player}'s ${winner.army} emerging victorious.</p>`;
      }
    }

    // Add rounds
    if (battleReport.rounds && battleReport.rounds.length > 0) {
      battleReport.rounds.forEach((round) => {
        content += `<h4>Round ${round.number}: ${round.title}</h4>
              <p>${round.description.replace(/\n/g, "</p><p>")}</p>`;
      });
    }

    // Add conclusion if available
    if (battleReport.conclusion) {
      content += `<h4>Conclusion</h4>
          <p>${battleReport.conclusion}</p>`;
    }

    contentContainer.innerHTML = content;
  } catch (error) {
    console.error(
      `Error loading battle report for mission ${missionNumber}:`,
      error
    );
    const contentContainer = document.getElementById(
      `battle-report-content-${missionNumber}`
    );
    if (contentContainer) {
      contentContainer.innerHTML =
        "<p>Failed to load battle report. Please try again later.</p>";
    }
  }
}

function checkUrlHashForMission() {
  const hash = window.location.hash;
  if (hash && hash.includes("mission") && hash.includes("-item")) {
    const missionItem = document.querySelector(hash);
    if (missionItem) {
      // Scroll to mission
      missionItem.scrollIntoView();

      // Open the accordion if not already open
      const collapseElement = missionItem.querySelector(".accordion-collapse");
      if (collapseElement && !collapseElement.classList.contains("show")) {
        const button = missionItem.querySelector(".accordion-button");
        if (button) button.click();
      }
    }
  }
}

function displayErrorMessage(message) {
  const missionsSection = document.getElementById("missions-section");
  if (!missionsSection) return;

  const errorAlert = document.createElement("div");
  errorAlert.className = "alert alert-danger";
  errorAlert.role = "alert";
  errorAlert.textContent = message;

  missionsSection.insertBefore(errorAlert, missionsSection.firstChild);
}
