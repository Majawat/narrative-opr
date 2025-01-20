// Automatically wrap specific words in spans with tooltips
function autoWrapDefinitions() {
  // Terms and their corresponding definitions
  const terms = {
    Agile: "Moves +1 on advance and +2 on rush and charge.",
    Headstrong: "Gets +1 to rolls when taking morale tests.",
    Fatigue:
      "After charging or striking back, units only hit on unmodified results of 6 in melee until the end of that round.",
    shaken:
      "Must stay idle, counts as fatigued, always fails morale tests, and can't contest or seize objectives. Shaken units must spend one full activation idle to stop being Shaken.",
    "cover terrain":
      "Units with most models fully inside cover terrain or behind sight blockers, or that are mostly inside cover terrain or behind sight blockers (for single-model units), get +1 to Defense rolls when blocking hits from shooting.",
    "difficult terrain":
      "Units moving through difficult terrain at any point can't move more than 6 inches at a time in total.",
    "dangerous terrain":
      "Models moving across dangerous terrain, or that activate in it, must roll one die (or as many as their tough value), and for each roll of 1 the unit takes a wound.",
    disbanded:
      "Any unit may be freely disbanded, losing all of its XP and upgrades. Players may also choose to disband their full army, losing all units, VP, points, etc. and start a new army from scratch.",
    destroyed:
      "Units that have taken wounds equal to their Tough value are destroyed and removed from the game.",
  };

  // Loop over the terms and replace them in the page content
  Object.keys(terms).forEach((term) => {
    const regex = new RegExp(`\\b${term}\\b`, "g"); // Match whole words only
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
}

// Run the function after the DOM content is loaded
document.addEventListener("DOMContentLoaded", autoWrapDefinitions);
