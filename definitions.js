// Automatically wrap specific words in spans with tooltips
function autoWrapDefinitions() {
  // Terms and their corresponding definitions
  const terms = {
    Agile: "Moves +1 on advance and +2 on rush and charge.",
    Headstrong: "Gets +1 to rolls when taking morale tests.",
    Fatigue:
      "After charging or striking back, units only hit on unmodified results of 6 in melee until the end of that round.",
    Shaken:
      "Must stay idle, counts as fatigued, always fails morale tests, and can't contest or seize objectives. Shaken units must spend one full activation idle to stop being Shaken.",
    "Cover Terrain":
      "Units with most models fully inside cover terrain or behind sight blockers, or that are mostly inside cover terrain or behind sight blockers (for single-model units), get +1 to Defense rolls when blocking hits from shooting.",
    "Difficult Terrain":
      "Units moving through difficult terrain at any point can't move more than 6 inches at a time in total.",
    "Dangerous Terrain":
      "Models moving across dangerous terrain, or that activate in it, must roll one die (or as many as their tough value), and for each roll of 1 the unit takes a wound.",
    Disbanded:
      "Any unit may be freely disbanded, losing all of its XP and upgrades. Players may also choose to disband their full army, losing all units, VP, points, etc. and start a new army from scratch.",
    Destroyed:
      "Units that have taken wounds equal to their Tough value are destroyed and removed from the game.",
    Aircraft:
      "May only use Advance actions, moving in a straight line, and adding 30” to its total move (even if Shaken). Aircraft ignore all units and terrain when moving and stopping, can't seize objectives, can't be charged, and units targeting them get -12 inches range and -1 to hit.",
    Ambush:
      "May be set aside before deployment. At the start of any round after the first, may be deployed anywhere over 9” away from enemy units. Players alternate in placing Ambush units, starting with the player that activates next. Units that deploy via Ambush can't seize or contest objectives on the round they deploy. ",
    "AP(X)":
      "Targets get -X to Defense rolls when blocking hits from this weapon. ",
    "Blast(X)":
      "Ignores cover, and after resolving other special rules, each hit is multiplied by X, where X is up to as many hits as models in the target unit. ",
  };

  // Loop over the terms and replace them in the page content
  Object.keys(terms).forEach((term) => {
    const regex = new RegExp(`\\b${term}\\b`, "gi"); // Match whole words only, case insensitive
    const definition = terms[term];

    document.body.innerHTML = document.body.innerHTML.replace(
      regex,
      (match) => {
        // Wrap the term in a span with tooltip data
        return `<span class="definition" data-bs-toggle="tooltip" data-bs-placement="top" title="${definition}">${match}</span>`;
      }
    );
  });

  // Initialize Bootstrap tooltips
  var tooltipTriggerList = [].slice.call(
    document.querySelectorAll('[data-bs-toggle="tooltip"]')
  );
  var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl);
  });

  // Generate glossary list
  const glossaryList = document.getElementById("glossary-list");
  if (glossaryList) {
    const list = document.createElement("ul");
    list.className = "list-group list-group-flush";

    // Sort terms alphabetically
    const sortedTerms = Object.keys(terms).sort();

    sortedTerms.forEach((term) => {
      const listItem = document.createElement("li");
      listItem.className =
        "list-group-item d-flex justify-content-between align-items-start bg-dark text-light";
      let definition = terms[term];

      // Loop over the terms and replace them in the definition text
      Object.keys(terms).forEach((innerTerm) => {
        if (innerTerm !== term) {
          const innerRegex = new RegExp(`\\b${innerTerm}\\b`, "gi"); // Match whole words only
          const innerDefinition = terms[innerTerm];

          definition = definition.replace(innerRegex, (match) => {
            // Wrap the term in a span with tooltip data
            return `<span class="definition" data-bs-toggle="tooltip" data-bs-placement="top" title="${innerDefinition}">${match}</span>`;
          });
        }
      });

      listItem.innerHTML = `<div class="ms-2 me-auto"><div class="fw-bold">${term}</div> ${definition}</div>`;
      list.appendChild(listItem);
    });
    glossaryList.appendChild(list);

    // Initialize Bootstrap tooltips for glossary items
    var glossaryTooltipTriggerList = [].slice.call(
      glossaryList.querySelectorAll('[data-bs-toggle="tooltip"]')
    );
    var glossaryTooltipList = glossaryTooltipTriggerList.map(function (
      tooltipTriggerEl
    ) {
      return new bootstrap.Tooltip(tooltipTriggerEl);
    });
  }
}

// Run the function after the DOM content is loaded
document.addEventListener("DOMContentLoaded", autoWrapDefinitions);
