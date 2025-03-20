// Complete Definitions Handler with Tab Memory
document.addEventListener("DOMContentLoaded", initializeDefinitions);

async function initializeDefinitions() {
  // Terms and their corresponding definitions
  const terms = {};

  // Storage keys for remembering tabs
  const MAIN_TAB_KEY = "glossary_active_tab";
  const SPELLS_TAB_KEY = "glossary_active_spells_tab";

  // Default tab ID (Common Rules)
  const DEFAULT_TAB = "rules-content";

  try {
    // Load all definitions
    await loadAllDefinitions();

    // Process the page to add tooltips
    processPageContent();

    // Display glossary if the container exists
    displayGlossary();

    // Process the definitions in the glossary to highlight nested terms
    setTimeout(() => {
      processGlossaryDefinitions();

      // Restore saved tab state after processing definitions
      restoreTabState();
    }, 500);

    console.log(`Processed ${Object.keys(terms).length} unique terms`);
  } catch (error) {
    console.error("Error in definition initialization:", error);
  }

  // Load all definitions from various sources
  async function loadAllDefinitions() {
    try {
      await loadPrimaryDefinitions();
      await loadCustomDefinitions();
      await loadFactionDefinitions();
    } catch (error) {
      console.error("Error loading definitions:", error);
    }
  }

  // Load primary definitions from Army Forge
  async function loadPrimaryDefinitions() {
    try {
      const response = await fetch(
        "https://army-forge.onepagerules.com/api/rules/common/2"
      );
      const data = await response.json();
      let count = 0;

      // Add rules
      if (data.rules) {
        data.rules.forEach((rule) => {
          if (rule.name && rule.description) {
            terms[rule.name] = {
              description: rule.description,
              type: "rules",
              sources: ["Army Forge"],
            };
            count++;
          }
        });
      }

      // Add traits
      if (data.traits) {
        data.traits.forEach((trait) => {
          if (trait.name && trait.description) {
            terms[trait.name] = {
              description: trait.description,
              type: "traits",
              sources: ["Army Forge"],
            };
            count++;
          }
        });
      }

      console.log(`Loaded ${count} primary definitions`);
    } catch (error) {
      console.error("Error loading primary definitions:", error);
    }
  }

  // Load custom definitions from JSON file
  async function loadCustomDefinitions() {
    try {
      const response = await fetch("assets/json/custom-definitions.json");
      const data = await response.json();
      let count = 0;

      // Add custom rules
      if (data.rules) {
        data.rules.forEach((rule) => {
          if (rule.name && rule.description) {
            terms[rule.name] = {
              description: rule.description,
              type: "rules",
              sources: ["Custom"],
            };
            count++;
          }
        });
      }

      // Add custom traits
      if (data.traits) {
        data.traits.forEach((trait) => {
          if (trait.name && trait.description) {
            terms[trait.name] = {
              description: trait.description,
              type: "traits",
              sources: ["Custom"],
            };
            count++;
          }
        });
      }

      console.log(`Loaded ${count} custom definitions`);
    } catch (error) {
      console.log("Error loading custom definitions (might not exist):", error);
    }
  }

  // Load faction-specific definitions from campaign data
  async function loadFactionDefinitions() {
    try {
      const response = await fetch("assets/json/campaign.json");
      const campaignData = await response.json();

      if (!campaignData.armies || !Array.isArray(campaignData.armies)) {
        console.log("No armies found in campaign data");
        return;
      }

      // Collect all faction promises
      const factionPromises = [];

      campaignData.armies.forEach((army) => {
        if (army.faction && Array.isArray(army.faction)) {
          army.faction.forEach((faction) => {
            if (faction.id && faction.gameSystem) {
              console.log(
                `Fetching faction rules for: ${faction.name || faction.id}`
              );
              factionPromises.push(fetchFactionRules(faction));
            }
          });
        }
      });

      // Wait for all faction rules to be loaded
      await Promise.all(factionPromises);
    } catch (error) {
      console.error("Error loading faction definitions:", error);
    }
  }

  // Fetch rules for a specific faction
  async function fetchFactionRules(faction) {
    try {
      const factionBookURL = `https://army-forge.onepagerules.com/api/army-books/${faction.id}?gameSystem=${faction.gameSystem}`;
      const factionName = faction.name || faction.id;

      const response = await fetch(factionBookURL);
      if (!response.ok) {
        throw new Error(
          `HTTP error ${response.status} for faction ${factionName}`
        );
      }

      const factionData = await response.json();
      let count = 0;

      // Add faction-specific rules
      if (factionData.specialRules && Array.isArray(factionData.specialRules)) {
        factionData.specialRules.forEach((rule) => {
          if (rule.name && rule.description) {
            if (!terms[rule.name]) {
              // New rule - create entry
              terms[rule.name] = {
                description: rule.description,
                type: "special-rules",
                sources: [factionName],
              };
              count++;
            } else if (terms[rule.name].type === "special-rules") {
              // Existing faction rule - check if this is a new source
              if (!terms[rule.name].sources.includes(factionName)) {
                terms[rule.name].sources.push(factionName);
                count++;
              }
            }
            // We don't override Army Forge or Custom rules
          }
        });
      }

      // Add faction-specific spells
      if (factionData.spells && Array.isArray(factionData.spells)) {
        factionData.spells.forEach((spell) => {
          if (spell.name && spell.effect) {
            // Create a spell key that includes faction name to separate spells by faction
            const spellKey = `${spell.name} (${factionName})`;

            terms[spellKey] = {
              description: spell.effect,
              type: "spells",
              sources: [factionName],
              factionName: factionName,
              threshold: spell.threshold || 0, // Store the spell threshold, default to 0 if not present
            };
            count++;
          }
        });
      }

      console.log(`Added ${count} terms from faction ${factionName}`);
    } catch (error) {
      console.error(
        `Error fetching faction ${faction.id || "unknown"}:`,
        error
      );
    }
  }

  // Process the page to add tooltips
  function processPageContent() {
    // Get all elements with the allow-definitions class
    const elements = document.querySelectorAll(".allow-definitions");

    console.log(
      `Processing ${elements.length} elements with .allow-definitions class`
    );

    elements.forEach((element) => {
      // Skip if already processed
      if (element.getAttribute("data-definitions-processed")) {
        return;
      }

      // Mark as processed to avoid reprocessing
      element.setAttribute("data-definitions-processed", "true");

      // Get the original HTML
      let html = element.innerHTML;

      // Sort terms by length (longest first) to prevent partial matches
      // But exclude spelled terms since they have faction names in their keys
      const sortedTerms = Object.keys(terms)
        .filter((term) => term && term.length >= 3 && !term.includes(" ("))
        .sort((a, b) => b.length - a.length);

      // Process each term
      sortedTerms.forEach((term) => {
        // Create safe definition
        const safeDefinition = terms[term].description
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#039;");

        // Find and replace all occurrences of the term
        let index = 0;
        while (true) {
          // Find the term in the HTML (case insensitive search)
          let termPosition = html
            .toLowerCase()
            .indexOf(term.toLowerCase(), index);
          if (termPosition === -1) break;

          // Check if it's a whole word by examining characters before and after
          const beforeChar =
            termPosition > 0 ? html.charAt(termPosition - 1) : " ";
          const afterChar =
            termPosition + term.length < html.length
              ? html.charAt(termPosition + term.length)
              : " ";

          // Only replace if it's a whole word (not part of another word)
          const isWordBoundaryBefore = /[^a-zA-Z0-9]/.test(beforeChar);
          const isWordBoundaryAfter =
            /[^a-zA-Z0-9]/.test(afterChar) ||
            afterChar === "(" || // Allow for terms like "Tough(3)"
            afterChar === "."; // Allow for terms at the end of sentences

          if (isWordBoundaryBefore && isWordBoundaryAfter) {
            // Get the exact matched text to preserve case
            const matchedText = html.substring(
              termPosition,
              termPosition + term.length
            );

            // Check if this match is already inside a tooltip
            const beforeHtml = html.substring(0, termPosition);
            const tooltipOpenTag = beforeHtml.lastIndexOf(
              '<span class="definition"'
            );
            const tooltipCloseTag = beforeHtml.lastIndexOf("</span>");

            if (tooltipOpenTag === -1 || tooltipCloseTag > tooltipOpenTag) {
              // Not inside a tooltip, safe to replace
              const replacement = `<span class="definition" data-bs-toggle="tooltip" data-bs-placement="top" title="${safeDefinition}">${matchedText}</span>`;

              // Replace this instance
              html =
                html.substring(0, termPosition) +
                replacement +
                html.substring(termPosition + matchedText.length);

              // Update index to continue search after this replacement
              index = termPosition + replacement.length;
            } else {
              // Skip this instance as it's inside another tooltip
              index = termPosition + term.length;
            }
          } else {
            // Not a whole word, move on
            index = termPosition + term.length;
          }
        }
      });

      // Update element with new HTML
      element.innerHTML = html;
    });

    // Initialize Bootstrap tooltips
    initializeTooltips();
  }

  // Process glossary definitions to highlight nested terms
  function processGlossaryDefinitions() {
    // Find all term definitions in the glossary
    const definitionElements = document.querySelectorAll(".term-definition");

    console.log(
      `Processing ${definitionElements.length} glossary definitions for nested terms`
    );

    // Process each definition
    definitionElements.forEach((element) => {
      // Ensure the element has the allow-definitions class
      if (!element.classList.contains("allow-definitions")) {
        element.classList.add("allow-definitions");
      }
    });

    // Reprocess all definitions
    processPageContent();
  }

  // Helper function to create a safe ID from any string
  function createSafeId(str) {
    return str
      .toLowerCase()
      .replace(/\s+/g, "-") // Replace spaces with dashes
      .replace(/[^\w\-]+/g, "") // Remove all non-word chars
      .replace(/\-\-+/g, "-") // Replace multiple dashes with single dash
      .replace(/^-+/, "") // Trim dash from start
      .replace(/-+$/, ""); // Trim dash from end
  }

  // Save the current tab state
  function saveTabState(tabId, isSpellsSubTab = false) {
    const storageKey = isSpellsSubTab ? SPELLS_TAB_KEY : MAIN_TAB_KEY;
    localStorage.setItem(storageKey, tabId);
    console.log(
      `Saved ${isSpellsSubTab ? "spells sub-tab" : "main tab"} state: ${tabId}`
    );
  }

  // Restore the saved tab state
  function restoreTabState() {
    try {
      // First try to restore the main tab
      const savedMainTabId = localStorage.getItem(MAIN_TAB_KEY);
      if (savedMainTabId) {
        // Find the tab element
        const mainTabEl = document.querySelector(
          `[data-bs-target="#${savedMainTabId}"]`
        );
        if (mainTabEl) {
          // Create a Bootstrap tab instance and show it
          const mainTab = new bootstrap.Tab(mainTabEl);
          mainTab.show();

          // If this is the spells tab, also restore the spells sub-tab
          if (savedMainTabId === "spells-content") {
            setTimeout(() => {
              const savedSpellsTabId = localStorage.getItem(SPELLS_TAB_KEY);
              if (savedSpellsTabId) {
                const spellsTabEl = document.querySelector(
                  `[data-bs-target="#${savedSpellsTabId}"]`
                );
                if (spellsTabEl) {
                  const spellsTab = new bootstrap.Tab(spellsTabEl);
                  spellsTab.show();
                }
              }
            }, 100); // Short delay to ensure main tab is fully activated
          }
          return;
        }
      }

      // If no saved tab or it doesn't exist, try using the default tab
      const defaultTabEl = document.querySelector(
        `[data-bs-target="#${DEFAULT_TAB}"]`
      );
      if (defaultTabEl) {
        const defaultTab = new bootstrap.Tab(defaultTabEl);
        defaultTab.show();
        return;
      }

      // If default tab doesn't exist, fall back to the first tab
      const firstTabEl = document.querySelector('[data-bs-toggle="tab"]');
      if (firstTabEl) {
        const firstTab = new bootstrap.Tab(firstTabEl);
        firstTab.show();
      }
    } catch (error) {
      console.error("Error restoring tab state:", error);
    }
  }

  // Display glossary in the designated container
  function displayGlossary() {
    const container = document.getElementById("special-rules-container");
    if (!container) {
      console.log("Glossary container not found");
      return;
    }

    // Clear existing content
    container.innerHTML = "";

    // Add search functionality
    const searchInput = document.createElement("input");
    searchInput.type = "text";
    searchInput.className = "form-control mb-3";
    searchInput.placeholder = "Search rules...";
    searchInput.id = "searchRules";
    container.appendChild(searchInput);

    // Create categories with better labels
    const categories = {
      rules: { title: "Common Rules", items: [] },
      traits: { title: "Traits", items: [] },
      "special-rules": { title: "Faction Special Rules", items: [] },
      spells: { title: "Spells", items: [], isNestedTab: true },
    };

    // Group spells by faction
    const spellsByFaction = {};

    // Sort terms alphabetically and add to categories
    Object.entries(terms)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .forEach(([term, details]) => {
        // Handle spells specially - group by faction
        if (details.type === "spells") {
          const factionName = details.factionName || "Unknown";
          if (!spellsByFaction[factionName]) {
            spellsByFaction[factionName] = [];
          }

          // Extract the real spell name without the faction
          let realName = term;
          if (term.includes(" (")) {
            realName = term.substring(0, term.indexOf(" ("));
          }

          spellsByFaction[factionName].push({
            name: realName,
            description: details.description,
            threshold: details.threshold || 0,
            sources: details.sources || [],
          });
          return;
        }

        // Handle other terms normally
        const type = details.type || "rules";
        if (categories[type]) {
          categories[type].items.push({
            name: term,
            description: details.description,
            sources: details.sources || [],
          });
        } else {
          // Default to rules if type is unknown
          categories.rules.items.push({
            name: term,
            description: details.description,
            sources: details.sources || [],
          });
        }
      });

    // Sort spells by threshold for each faction
    Object.keys(spellsByFaction).forEach((faction) => {
      spellsByFaction[faction].sort((a, b) => {
        // Primary sort by threshold
        if (a.threshold !== b.threshold) {
          return parseInt(a.threshold) - parseInt(b.threshold);
        }
        // Secondary sort by name
        return a.name.localeCompare(b.name);
      });
    });

    // Add sorted spell lists to the spells category
    categories.spells.factions = spellsByFaction;

    // Calculate total spell count
    let totalSpellCount = 0;
    Object.values(spellsByFaction).forEach((spells) => {
      totalSpellCount += spells.length;
    });

    // Create tabs for categories
    const tabsNav = document.createElement("ul");
    tabsNav.className = "nav nav-tabs mb-3";
    tabsNav.id = "glossaryTabs";
    tabsNav.setAttribute("role", "tablist");

    const tabsContent = document.createElement("div");
    tabsContent.className = "tab-content";
    tabsContent.id = "glossaryTabsContent";

    // Create tab for each category
    let isFirst = true;
    Object.entries(categories).forEach(([key, category]) => {
      // Skip empty categories
      if (
        (key !== "spells" && category.items.length === 0) ||
        (key === "spells" && totalSpellCount === 0)
      ) {
        return;
      }

      // Create tab button
      const tabItem = document.createElement("li");
      tabItem.className = "nav-item";
      tabItem.setAttribute("role", "presentation");

      const tabButton = document.createElement("button");
      tabButton.className = `nav-link${isFirst ? " active" : ""}`;
      tabButton.id = `${key}-tab`;
      tabButton.setAttribute("data-bs-toggle", "tab");
      tabButton.setAttribute("data-bs-target", `#${key}-content`);
      tabButton.setAttribute("type", "button");
      tabButton.setAttribute("role", "tab");
      tabButton.setAttribute("aria-controls", `${key}-content`);
      tabButton.setAttribute("aria-selected", isFirst ? "true" : "false");

      // Add event listener to save tab state when clicked
      tabButton.addEventListener("shown.bs.tab", function () {
        saveTabState(`${key}-content`);
      });

      // Set button text with count
      if (key === "spells") {
        tabButton.textContent = `${category.title}`;
      } else {
        tabButton.textContent = `${category.title} (${category.items.length})`;
      }

      tabItem.appendChild(tabButton);
      tabsNav.appendChild(tabItem);

      // Create tab content
      const tabPane = document.createElement("div");
      tabPane.className = `tab-pane fade${isFirst ? " show active" : ""}`;
      tabPane.id = `${key}-content`;
      tabPane.setAttribute("role", "tabpanel");
      tabPane.setAttribute("aria-labelledby", `${key}-tab`);

      // Special handling for spells - create nested tabs
      if (key === "spells" && Object.keys(spellsByFaction).length > 0) {
        // Create nested tabs for factions
        const spellsTabsNav = document.createElement("ul");
        spellsTabsNav.className = "nav nav-pills nav-fill my-2";
        spellsTabsNav.id = "spellsSubTabs";
        spellsTabsNav.setAttribute("role", "tablist");

        const spellsTabsContent = document.createElement("div");
        spellsTabsContent.className = "tab-content";
        spellsTabsContent.id = "spellsSubTabsContent";

        // Create a tab for each faction
        let isFirstSpellTab = true;
        Object.entries(spellsByFaction).forEach(([faction, spells]) => {
          if (spells.length === 0) return;

          // Create safe ID for faction
          const factionId = createSafeId(faction);
          const spellsTabId = `spells-${factionId}-content`;

          // Create tab button
          const factionTabItem = document.createElement("li");
          factionTabItem.className = "nav-item";
          factionTabItem.setAttribute("role", "presentation");

          const factionTabButton = document.createElement("button");
          factionTabButton.className = `nav-link${
            isFirstSpellTab ? " active" : ""
          }`;
          factionTabButton.id = `spells-${factionId}-tab`;
          factionTabButton.setAttribute("data-bs-toggle", "pill");
          factionTabButton.setAttribute("data-bs-target", `#${spellsTabId}`);
          factionTabButton.setAttribute("type", "button");
          factionTabButton.setAttribute("role", "tab");
          factionTabButton.setAttribute("aria-controls", spellsTabId);
          factionTabButton.setAttribute(
            "aria-selected",
            isFirstSpellTab ? "true" : "false"
          );
          factionTabButton.textContent = `${faction}`;

          // Add event listener to save spells tab state
          factionTabButton.addEventListener("shown.bs.tab", function () {
            saveTabState(spellsTabId, true);
          });

          factionTabItem.appendChild(factionTabButton);
          spellsTabsNav.appendChild(factionTabItem);

          // Create faction content pane
          const factionPane = document.createElement("div");
          factionPane.className = `tab-pane fade${
            isFirstSpellTab ? " show active" : ""
          }`;
          factionPane.id = spellsTabId;
          factionPane.setAttribute("role", "tabpanel");
          factionPane.setAttribute(
            "aria-labelledby",
            `spells-${factionId}-tab`
          );

          // Create row for spells
          const spellsRow = document.createElement("div");
          spellsRow.className = "row";

          // Add each spell
          spells.forEach((spell) => {
            const spellCol = document.createElement("div");
            spellCol.className = "col-12 col-md-6 col-lg-4 glossary-term p-3";
            spellCol.id = `term-${createSafeId(`${faction}-${spell.name}`)}`;

            // Create card for spell
            const card = document.createElement("div");
            card.className = "card h-100";

            // Card header with spell name and threshold
            const cardHeader = document.createElement("div");
            cardHeader.className = "card-header";

            const headerContent = document.createElement("div");
            headerContent.className =
              "d-flex justify-content-between align-items-center";

            const spellName = document.createElement("h5");
            spellName.className = "mb-0";
            spellName.textContent = spell.name;

            const thresholdBadge = document.createElement("span");
            thresholdBadge.className = "badge bg-primary rounded-pill";
            thresholdBadge.textContent = spell.threshold;

            headerContent.appendChild(spellName);
            headerContent.appendChild(thresholdBadge);
            cardHeader.appendChild(headerContent);

            // Card body with spell effect
            const cardBody = document.createElement("div");
            cardBody.className = "card-body";

            const spellEffect = document.createElement("div");
            spellEffect.className = "term-definition allow-definitions";
            spellEffect.innerHTML = spell.description;

            cardBody.appendChild(spellEffect);

            // Assemble card - important to add header and body first
            card.appendChild(cardHeader);
            card.appendChild(cardBody);

            spellCol.appendChild(card);
            spellsRow.appendChild(spellCol);
          });

          factionPane.appendChild(spellsRow);
          spellsTabsContent.appendChild(factionPane);

          isFirstSpellTab = false;
        });

        // Add the nested tabs to the spells tab
        tabPane.appendChild(spellsTabsNav);
        tabPane.appendChild(spellsTabsContent);
      } else {
        // Regular tab content - create a row for items
        const row = document.createElement("div");
        row.className = "row";

        // Add each item to the category
        category.items.forEach((item) => {
          const col = document.createElement("div");
          col.className = "col-12 col-md-6 col-lg-4 glossary-term p-3";
          col.id = `term-${createSafeId(item.name)}`;

          // Create card for term
          const card = document.createElement("div");
          card.className = "card h-100";

          // Card header with term name
          const cardHeader = document.createElement("div");
          cardHeader.className = "card-header";

          const termName = document.createElement("h5");
          termName.className = "mb-0";
          termName.textContent = item.name;
          cardHeader.appendChild(termName);

          // Card body with definition
          const cardBody = document.createElement("div");
          cardBody.className = "card-body";

          const termDefinition = document.createElement("div");
          termDefinition.className = "term-definition allow-definitions";
          termDefinition.innerHTML = item.description;
          cardBody.appendChild(termDefinition);

          // Important: Add header and body to card before processing footer
          card.appendChild(cardHeader);
          card.appendChild(cardBody);

          // Card footer with sources if applicable
          if (
            item.sources &&
            item.sources.length > 0 &&
            !item.sources.includes("Army Forge") &&
            !item.sources.includes("Custom")
          ) {
            const cardFooter = document.createElement("div");
            cardFooter.className = "card-footer";

            // Create sources container
            const sourcesContainer = document.createElement("div");
            sourcesContainer.className =
              "d-flex flex-wrap justify-content-end gap-1";

            // Sort sources alphabetically
            const sortedSources = [...item.sources].sort();

            // Add each source as a badge
            sortedSources.forEach((source) => {
              const sourceBadge = document.createElement("span");
              sourceBadge.className = "badge bg-secondary";
              sourceBadge.textContent = source;
              sourcesContainer.appendChild(sourceBadge);
            });

            cardFooter.appendChild(sourcesContainer);
            card.appendChild(cardFooter);
          }

          col.appendChild(card);
          row.appendChild(col);
        });

        tabPane.appendChild(row);
      }

      tabsContent.appendChild(tabPane);
      isFirst = false;
    });

    // Add tabs to container
    container.appendChild(tabsNav);
    container.appendChild(tabsContent);

    // Add search functionality
    searchInput.addEventListener("input", () => {
      const searchTerm = searchInput.value.toLowerCase();

      // First check which tab is active
      const activeTab = document.querySelector(".tab-pane.active");
      if (!activeTab) return;

      // If it's the spells tab, we need to check which sub-tab is active
      if (activeTab.id === "spells-content") {
        const activeSpellsTab = activeTab.querySelector(".tab-pane.active");
        if (!activeSpellsTab) return;

        // Search within the active spells sub-tab
        activeSpellsTab.querySelectorAll(".glossary-term").forEach((term) => {
          const termName = term
            .querySelector(".card-header")
            .textContent.toLowerCase();
          const termDefinition = term
            .querySelector(".term-definition")
            .textContent.toLowerCase();

          if (
            termName.includes(searchTerm) ||
            termDefinition.includes(searchTerm)
          ) {
            term.style.display = "";
          } else {
            term.style.display = "none";
          }
        });
      } else {
        // Regular tab search
        activeTab.querySelectorAll(".glossary-term").forEach((term) => {
          const termName = term
            .querySelector(".card-header")
            .textContent.toLowerCase();
          const termDefinition = term
            .querySelector(".term-definition")
            .textContent.toLowerCase();

          // Also search in the sources if present
          let sourcesText = "";
          const sourcesContainer = term.querySelector(".card-footer");
          if (sourcesContainer) {
            sourcesText = sourcesContainer.textContent.toLowerCase();
          }

          if (
            termName.includes(searchTerm) ||
            termDefinition.includes(searchTerm) ||
            sourcesText.includes(searchTerm)
          ) {
            term.style.display = "";
          } else {
            term.style.display = "none";
          }
        });
      }
    });
  }

  // Initialize Bootstrap tooltips
  function initializeTooltips() {
    try {
      const tooltipTriggerList = document.querySelectorAll(
        '[data-bs-toggle="tooltip"]'
      );

      if (tooltipTriggerList.length === 0) {
        return;
      }

      tooltipTriggerList.forEach((element) => {
        if (!element.hasAttribute("data-bs-original-title")) {
          new bootstrap.Tooltip(element);
        }
      });

      console.log(
        `Initialized tooltips for ${tooltipTriggerList.length} elements`
      );
    } catch (error) {
      console.error("Error initializing tooltips:", error);
    }
  }
}
