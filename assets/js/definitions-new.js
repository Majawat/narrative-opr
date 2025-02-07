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
          //combine the Custom and Army Forge rules
          const allRules = armyForgeRules;
          customRules.rules?.forEach((customRule) => {
            allRules.rules.push(customRule);
          });
          customRules.traits?.forEach((customTrait) => {
            allRules.traits.push(customTrait);
          });

          //display all rules in a container
          allRules.rules.forEach((rule, index) => {
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
              <div class="term-definition">${rule.description}</div>
            `;
            document
              .getElementById("special-rules-container")
              .appendChild(ruleElement);
          });

          const traitHeaderEl = document.createElement("h3");
          traitHeaderEl.innerText = "Traits";
          document
            .getElementById("special-rules-container")
            .appendChild(traitHeaderEl);

          //display all traits in a container
          allRules.traits.forEach((trait, index) => {
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
              <div class="term-definition">${trait.description}</div>
            `;
            document
              .getElementById("special-rules-container")
              .appendChild(traitElement);
          });

          //display the total rule count
          const ruleCountElement = document.createElement("div");
          const totalRuleCount = allRules.rules.length + allRules.traits.length;
          ruleCountElement.innerText = `Total Rules: ${totalRuleCount}`;
          document
            .getElementById("special-rules-container")
            .appendChild(ruleCountElement);
        });
    });
}
