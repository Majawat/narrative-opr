document.addEventListener("DOMContentLoaded", autoWrapDefinitions);

function autoWrapDefinitions() {
  // Define the URLs for rule sources
  const armyForgeRulesURL =
    "https://army-forge.onepagerules.com/api/rules/common/2";
  const customRulesURL = "assets/json/custom-definitions.json";

  // Fetch the Army Forge rules
  fetch(armyForgeRulesURL)
    .then((response) => response.json())
    .then((armyForgeRules) => {
      // Fetch custom rules
      fetch(customRulesURL)
        .then((response) => response.json())
        .catch(() => ({ rules: [], traits: [] })) // Default to empty if file not found
        .then((customRules) => {
          // Create terms dictionary
          const terms = {};

          // Add rules from Army Forge
          if (armyForgeRules.rules) {
            armyForgeRules.rules.forEach((rule) => {
              terms[rule.name] = rule.description;
            });
          }

          // Add traits from Army Forge
          if (armyForgeRules.traits) {
            armyForgeRules.traits.forEach((trait) => {
              terms[trait.name] = trait.description;
            });
          }

          // Add custom rules
          if (customRules.rules) {
            customRules.rules.forEach((rule) => {
              terms[rule.name] = rule.description;
            });
          }

          // Add custom traits
          if (customRules.traits) {
            customRules.traits.forEach((trait) => {
              terms[trait.name] = trait.description;
            });
          }

          // Process the page content
          processContent(terms);

          // Initialize tooltips
          initializeTooltips();
        });
    })
    .catch((error) => {
      console.error("Error loading definitions:", error);
    });
}

/**
 * Process the content of the page to add tooltips
 */
function processContent(terms) {
  // Select only containers with allow-definitions class
  const containers = document.querySelectorAll(".allow-definitions");

  // Sort terms by length (longest first) to prevent partial matches
  const sortedTerms = Object.keys(terms)
    .filter((term) => term.length >= 3) // Only terms with 3 or more characters
    .sort((a, b) => b.length - a.length);

  containers.forEach((container) => {
    // Skip if already processed or is a tooltip itself
    if (
      container.hasAttribute("data-bs-toggle") ||
      container.classList.contains("definition")
    ) {
      return;
    }

    let html = container.innerHTML;
    let modified = false;

    // Process each term
    sortedTerms.forEach((term) => {
      // Create a safe regex pattern for the term
      const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      // Match the term with word boundaries, case-insensitive
      // Include optional rating in parentheses
      const regex = new RegExp(`\\b(${escapedTerm})(\\([^)]*\\))?\\b`, "gi");

      if (regex.test(html)) {
        modified = true;

        // Reset regex state
        regex.lastIndex = 0;

        // Replace with tooltip span
        html = html.replace(regex, (match, p1, p2) => {
          // Skip if already wrapped
          if (match.includes('data-bs-toggle="tooltip"')) {
            return match;
          }

          const safeTitle = terms[term]
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

          return `<span class="definition" data-bs-toggle="tooltip" data-bs-placement="top" title="${safeTitle}">${match}</span>`;
        });
      }
    });

    if (modified) {
      container.innerHTML = html;
    }
  });
}

/**
 * Initialize Bootstrap tooltips
 */
function initializeTooltips() {
  const tooltipTriggerList = document.querySelectorAll(
    '[data-bs-toggle="tooltip"]'
  );
  [...tooltipTriggerList].map(
    (tooltipTriggerEl) => new bootstrap.Tooltip(tooltipTriggerEl)
  );
}
