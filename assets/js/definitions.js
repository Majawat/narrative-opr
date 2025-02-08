document.addEventListener("DOMContentLoaded", autoWrapDefinitions);

function autoWrapDefinitions() {
  const armyForgeRulesURL =
    "https://army-forge.onepagerules.com/api/rules/common/2";
  const customRulesURL = "assets/json/custom-definitions.json";

  fetch(armyForgeRulesURL)
    .then((response) => response.json())
    .then((armyForgeRules) => {
      fetch(customRulesURL)
        .then((response) => response.json())
        .then((customRules) => {
          // Combine and sort the rules and traits
          let allRules = {
            rules: [
              ...(armyForgeRules.rules || []),
              ...(customRules.rules || []),
            ].sort((a, b) => a.name.localeCompare(b.name)),
            traits: [
              ...(armyForgeRules.traits || []),
              ...(customRules.traits || []),
            ].sort((a, b) => a.name.localeCompare(b.name)),
          };

          // Create terms object for tooltips
          let terms = {};
          allRules.rules.forEach((rule) => {
            terms[rule.name] = rule.description;
          });
          allRules.traits.forEach((trait) => {
            terms[trait.name] = trait.description;
          });

          // Process tooltips
          processContent(terms);

          // Display rules and traits in the container
          const container = document.getElementById("special-rules-container");
          if (container) {
            // Display rules
            allRules.rules.forEach((rule) => {
              const ruleElement = document.createElement("div");
              ruleElement.classList.add(
                "col-12",
                "col-md-6",
                "col-lg-4",
                "glossary-term",
                "p-3"
              );
              ruleElement.id = `rule-${rule.id}`;
              ruleElement.innerHTML = `
                <div class="term-header">${rule.name}</div>
                <div class="term-definition">${processDefinitionText(
                  rule.description,
                  terms
                )}</div>
              `;
              container.appendChild(ruleElement);
            });

            // Add traits header
            const traitHeaderEl = document.createElement("h3");
            traitHeaderEl.innerText = "Traits";
            container.appendChild(traitHeaderEl);

            // Display traits
            allRules.traits.forEach((trait) => {
              const traitElement = document.createElement("div");
              traitElement.classList.add(
                "col-12",
                "col-md-6",
                "col-lg-4",
                "glossary-term",
                "p-3"
              );
              traitElement.id = `trait-${trait.id}`;
              traitElement.innerHTML = `
                <div class="term-header">${trait.name}</div>
                <div class="term-definition">${processDefinitionText(
                  trait.description,
                  terms
                )}</div>
              `;
              container.appendChild(traitElement);
            });

            // Add total count
            const ruleCountElement = document.createElement("div");
            const totalRuleCount =
              allRules.rules.length + allRules.traits.length;
            ruleCountElement.innerText = `Total Rules: ${totalRuleCount}`;
            container.appendChild(ruleCountElement);
          }

          // Initialize all tooltips
          const tooltipTriggerList = [].slice.call(
            document.querySelectorAll('[data-bs-toggle="tooltip"]')
          );
          tooltipTriggerList.map(
            (tooltipTriggerEl) => new bootstrap.Tooltip(tooltipTriggerEl)
          );
        });
    });
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function createTooltipSpan(term, definition) {
  return `<span class="definition" data-bs-toggle="tooltip" data-bs-placement="top" title="${escapeHtml(
    definition
  )}">${term}</span>`;
}

function processDefinitionText(text, terms) {
  Object.entries(terms)
    .sort((a, b) => b[0].length - a[0].length) // Process longer terms first
    .forEach(([term, definition]) => {
      const escapedTerm = escapeRegExp(term);
      const regex = new RegExp(`\\b${escapedTerm}\\b`, "gi");
      text = text.replace(regex, (match) =>
        createTooltipSpan(match, definition)
      );
    });
  return text;
}

function processContent(terms) {
  // Create a container for all text elements we want to process
  const containers = [
    ...document.querySelectorAll(
      'p, li, td, div:not(.definition):not([data-bs-toggle="tooltip"])'
    ),
  ];

  containers.forEach((container) => {
    let html = container.innerHTML;
    if (!html.includes('data-bs-toggle="tooltip"')) {
      // Skip if already processed
      Object.entries(terms)
        .sort((a, b) => b[0].length - a[0].length) // Process longer terms first
        .forEach(([term, definition]) => {
          const escapedTerm = escapeRegExp(term);
          const regex = new RegExp(`\\b${escapedTerm}\\b`, "gi");
          html = html.replace(regex, (match) =>
            createTooltipSpan(match, definition)
          );
        });
      container.innerHTML = html;
    }
  });
}
