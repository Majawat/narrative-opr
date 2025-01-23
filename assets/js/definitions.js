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
      "May only use Advance actions, moving in a straight line, and adding 30 inches to its total move (even if Shaken). Aircraft ignore all units and terrain when moving and stopping, can't seize objectives, can't be charged, and units targeting them get -12 inches range and -1 to hit.",
    Ambush:
      "May be set aside before deployment. At the start of any round after the first, may be deployed anywhere over 9 inches away from enemy units. Players alternate in placing Ambush units, starting with the player that activates next. Units that deploy via Ambush can't seize or contest objectives on the round they deploy.",
    "AP(X)":
      "Targets get -X to Defense rolls when blocking hits from this weapon.",
    "Blast(X)":
      "Ignores cover, and after resolving other special rules, each hit is multiplied by X, where X is up to as many hits as models in the target unit.",
    "Caster(X)":
      "Gets X spell tokens at the start of each round, but can't hold more than 6 tokens at once. At any point before attacking, spend as many tokens as the spell's value to try casting one or more spells (only one try per spell). Roll one die, on 4+ resolve the effect on a target in line of sight. Models within 18 inches in line of sight of the caster's unit may spend any number of spell tokens at the same time before rolling, to give the caster +1/-1 to the roll per token.",
    Counter:
      "Strikes first with this weapon when charged, and the charging unit gets -1 total Impact rolls per model with Counter.",
    "Deadly(X)":
      "Assign each wound to one model, and multiply it by X. Hits from Deadly must be resolved first, and these wounds don't carry over to other models if the original target is killed.",
    Entrenched:
      "Enemies get -2 to hit when shooting at this model from over 9 inches away, as long as it hasn't moved since the beginning of its last activation.",
    Fast: "Moves +2 inches when using Advance, and +4 inches when using Rush/Charge.",
    "Fear(X)":
      "This model counts as having dealt +X wounds when checking who won melee.",
    Fearless:
      "Whenever a unit where most models have this rule fails a morale test, roll one die. On a 4+ it counts as passed instead.",
    Flying:
      "May move through units and terrain, and ignores terrain effects whilst moving.",
    Furious:
      "When charging, unmodified rolls of 6 to hit in melee deal one extra hit (only the original hit counts as a 6 for special rules).",
    Hero: "Heroes with up to Tough(6) may deploy as part of one multi-model unit without another Hero. The hero may take morale tests on behalf of the unit, but must use the unit's Defense until all other models have been killed.",
    Immobile: "May only use Hold actions.",
    "Impact(X)":
      "Roll X dice when attacking after charging, unless fatigued. For each 2+ the target takes one hit.",
    Indirect:
      "Gets -1 to hit rolls when shooting after moving. May target enemies that are not in line of sight as if in line of sight, and ignores cover from sight obstructions.",
    Lance: "When charging, gets +1 to hit rolls and AP(+1) in melee.",
    "Lock-On":
      "Ignores cover and all negative modifiers to hit rolls and range.",
    Limited: "May only be used once per game.",
    Poison:
      "Ignores Regeneration, and the target must re-roll unmodified Defense rolls of 6 when blocking hits.",
    Regeneration: "When taking a wound, roll one die. On a 5+ it is ignored.",
    Relentless:
      "When using Hold actions and shooting, unmodified rolls of 6 to hit deal one extra hit (only the original hit counts as a 6 for special rules).",
    Reliable: "Attacks at Quality 2+.",
    Rending:
      "Ignores Regeneration, and unmodified rolls of 6 to hit get AP(4).",
    Scout:
      "May be set aside before deployment. After all other units are deployed, must be deployed and may then be placed anywhere within 12 inches of their position. Players alternate in placing Scout units, starting with the player that activates next.",
    Slow: "Moves -2 inches when using Advance, and -4 inches when using Rush/Charge.",
    Sniper:
      "Shoots at Quality 2+, and each model with Sniper may pick any model in the target unit as its individual target, which is resolved as if it was a unit of 1. Sniper shooting must be resolved before other weapons.",
    Stealth:
      "Enemies get -1 to hit rolls when shooting at units where all models have this rule from over 9 inches away.",
    Strider: "May ignore the effects of difficult terrain when moving.",
    "Tough(X)":
      "This model must take X wounds before being killed. If a model with tough joins a unit without it, then it is removed last when the unit takes wounds. Note that you must continue to put wounds on the tough model with most wounds in the unit until it is killed, before starting to put them on the next tough model (heroes must be assigned wounds last).",
    "Transport(X)":
      "May transport up to X models or Heroes with up to Tough(6), and non-Heroes with up to Tough(3) which occupy 3 spaces each. Transports may deploy with units inside, and units may enter/exit by using any move action, but must stay fully within 6 inches of it when exiting. When a transport is destroyed, units inside must take a dangerous terrain test, are Shaken, and must be placed fully within 6 inches of the transport before removing it.",
    Beacon:
      "Friendly units using Ambush may ignore distance restrictions from enemies if they are deployed within 6 inches of this model.",
    Bounding:
      "When this unit is activated, you may place all models with this rule in it anywhere within D3+1 inches of their position.",
    Carnivore: "Gets +1 to hit in melee.",
    "Celestial Veteran": "Gets +1 to hit in melee and shooting.",
    Devout:
      "When shooting at enemies within 12 inches, unmodified rolls of 6 to hit deal one extra hit (only the original hit counts as a 6 for special rules).",
    "Hidden Route": "This model and its unit get Ambush.",
    "Medical Training": "This model and its unit get Regeneration.",
    "Shield Wall":
      "This model gets +1 to defense rolls against hits that are not from spells.",
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
