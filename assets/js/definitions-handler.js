// Complete Definitions Handler with Multi-Source Support
document.addEventListener("DOMContentLoaded", initializeDefinitions);

async function initializeDefinitions() {
  // Terms and their corresponding definitions
  const terms = {};
  
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
      const response = await fetch("https://army-forge.onepagerules.com/api/rules/common/2");
      const data = await response.json();
      let count = 0;
      
      // Add rules
      if (data.rules) {
        data.rules.forEach(rule => {
          if (rule.name && rule.description) {
            terms[rule.name] = {
              description: rule.description,
              type: "rules",
              sources: ["Army Forge"]
            };
            count++;
          }
        });
      }

      // Add traits
      if (data.traits) {
        data.traits.forEach(trait => {
          if (trait.name && trait.description) {
            terms[trait.name] = {
              description: trait.description,
              type: "traits",
              sources: ["Army Forge"]
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
        data.rules.forEach(rule => {
          if (rule.name && rule.description) {
            terms[rule.name] = {
              description: rule.description,
              type: "rules",
              sources: ["Custom"]
            };
            count++;
          }
        });
      }

      // Add custom traits
      if (data.traits) {
        data.traits.forEach(trait => {
          if (trait.name && trait.description) {
            terms[trait.name] = {
              description: trait.description,
              type: "traits",
              sources: ["Custom"]
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
      
      campaignData.armies.forEach(army => {
        if (army.faction && Array.isArray(army.faction)) {
          army.faction.forEach(faction => {
            if (faction.id && faction.gameSystem) {
              console.log(`Fetching faction rules for: ${faction.name || faction.id}`);
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
        throw new Error(`HTTP error ${response.status} for faction ${factionName}`);
      }
      
      const factionData = await response.json();
      let count = 0;
      
      // Add faction-specific rules
      if (factionData.specialRules && Array.isArray(factionData.specialRules)) {
        factionData.specialRules.forEach(rule => {
          if (rule.name && rule.description) {
            if (!terms[rule.name]) {
              // New rule - create entry
              terms[rule.name] = {
                description: rule.description,
                type: "special-rules",
                sources: [factionName]
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
        factionData.spells.forEach(spell => {
          if (spell.name && spell.effect) {
            if (!terms[spell.name]) {
              // New spell - create entry
              terms[spell.name] = {
                description: spell.effect,
                type: "spells",
                sources: [factionName]
              };
              count++;
            } else if (terms[spell.name].type === "spells") {
              // Existing spell - check if this is a new source
              if (!terms[spell.name].sources.includes(factionName)) {
                terms[spell.name].sources.push(factionName);
                count++;
              }
            }
            // We don't override Army Forge or Custom rules
          }
        });
      }
      
      console.log(`Added ${count} terms from faction ${factionName}`);
    } catch (error) {
      console.error(`Error fetching faction ${faction.id || 'unknown'}:`, error);
    }
  }

  // Process the page to add tooltips
  function processPageContent() {
    // Get all elements with the allow-definitions class
    const elements = document.querySelectorAll(".allow-definitions");
    
    console.log(`Processing ${elements.length} elements with .allow-definitions class`);
    
    elements.forEach(element => {
      // Skip if already processed
      if (element.getAttribute("data-definitions-processed")) {
        return;
      }
      
      // Mark as processed to avoid reprocessing
      element.setAttribute("data-definitions-processed", "true");
      
      // Get the original HTML
      let html = element.innerHTML;
      
      // Sort terms by length (longest first) to prevent partial matches
      const sortedTerms = Object.keys(terms)
        .filter(term => term && term.length >= 3)
        .sort((a, b) => b.length - a.length);
      
      // Process each term
      sortedTerms.forEach(term => {
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
          let termPosition = html.toLowerCase().indexOf(term.toLowerCase(), index);
          if (termPosition === -1) break;
          
          // Check if it's a whole word by examining characters before and after
          const beforeChar = termPosition > 0 ? html.charAt(termPosition - 1) : " ";
          const afterChar = termPosition + term.length < html.length 
            ? html.charAt(termPosition + term.length) 
            : " ";
          
          // Only replace if it's a whole word (not part of another word)
          const isWordBoundaryBefore = /[^a-zA-Z0-9]/.test(beforeChar);
          const isWordBoundaryAfter = /[^a-zA-Z0-9]/.test(afterChar) 
            || afterChar === "(" // Allow for terms like "Tough(3)"
            || afterChar === "."; // Allow for terms at the end of sentences
          
          if (isWordBoundaryBefore && isWordBoundaryAfter) {
            // Get the exact matched text to preserve case
            const matchedText = html.substring(termPosition, termPosition + term.length);
            
            // Check if this match is already inside a tooltip
            const beforeHtml = html.substring(0, termPosition);
            const tooltipOpenTag = beforeHtml.lastIndexOf('<span class="definition"');
            const tooltipCloseTag = beforeHtml.lastIndexOf('</span>');
            
            if (tooltipOpenTag === -1 || tooltipCloseTag > tooltipOpenTag) {
              // Not inside a tooltip, safe to replace
              const replacement = `<span class="definition" data-bs-toggle="tooltip" data-bs-placement="top" title="${safeDefinition}">${matchedText}</span>`;
              
              // Replace this instance
              html = html.substring(0, termPosition) + replacement + html.substring(termPosition + matchedText.length);
              
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
    
    console.log(`Processing ${definitionElements.length} glossary definitions for nested terms`);
    
    // Process each definition
    definitionElements.forEach(element => {
      // Ensure the element has the allow-definitions class
      if (!element.classList.contains("allow-definitions")) {
        element.classList.add("allow-definitions");
      }
    });
    
    // Reprocess all definitions
    processPageContent();
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
      "rules": { title: "Common Rules", items: [] },
      "traits": { title: "Traits", items: [] },
      "special-rules": { title: "Faction Special Rules", items: [] },
      "spells": { title: "Spells", items: [] }
    };
    
    // Sort terms alphabetically and add to categories
    Object.entries(terms).sort((a, b) => a[0].localeCompare(b[0])).forEach(([term, details]) => {
      const type = details.type || "rules";
      if (categories[type]) {
        categories[type].items.push({
          name: term,
          description: details.description,
          sources: details.sources || []
        });
      } else {
        // Default to rules if type is unknown
        categories.rules.items.push({
          name: term,
          description: details.description,
          sources: details.sources || []
        });
      }
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
      if (category.items.length === 0) {
        return; // Skip empty categories
      }
      
      // Create tab button
      const tabItem = document.createElement("li");
      tabItem.className = "nav-item";
      tabItem.setAttribute("role", "presentation");
      
      const tabButton = document.createElement("button");
      tabButton.className = `nav-link${isFirst ? ' active' : ''}`;
      tabButton.id = `${key}-tab`;
      tabButton.setAttribute("data-bs-toggle", "tab");
      tabButton.setAttribute("data-bs-target", `#${key}-content`);
      tabButton.setAttribute("type", "button");
      tabButton.setAttribute("role", "tab");
      tabButton.setAttribute("aria-controls", `${key}-content`);
      tabButton.setAttribute("aria-selected", isFirst ? "true" : "false");
      tabButton.textContent = `${category.title} (${category.items.length})`;
      
      tabItem.appendChild(tabButton);
      tabsNav.appendChild(tabItem);
      
      // Create tab content
      const tabPane = document.createElement("div");
      tabPane.className = `tab-pane fade${isFirst ? ' show active' : ''}`;
      tabPane.id = `${key}-content`;
      tabPane.setAttribute("role", "tabpanel");
      tabPane.setAttribute("aria-labelledby", `${key}-tab`);
      
      // Create a row for the items
      const row = document.createElement("div");
      row.className = "row";
      
      // Add each item to the category
      category.items.forEach(item => {
        const col = document.createElement("div");
        col.className = "col-12 col-md-6 col-lg-4 glossary-term p-3";
        col.id = `term-${item.name.replace(/\s+/g, '-').toLowerCase()}`;
        
        const termHeader = document.createElement("div");
        termHeader.className = "term-header d-flex justify-content-between align-items-start mb-2";
        
        const termName = document.createElement("div");
        termName.textContent = item.name;
        termHeader.appendChild(termName);
        
        // Add sources if not a common rule
        if (item.sources && item.sources.length > 0 && 
            !item.sources.includes("Army Forge") && 
            !item.sources.includes("Custom")) {
          
          const sourceContainer = document.createElement("div");
          sourceContainer.className = "source-badges d-flex flex-column align-items-end";
          
          // Sort sources alphabetically
          const sortedSources = [...item.sources].sort();
          
          // Add each source as a badge
          sortedSources.forEach(source => {
            const sourceBadge = document.createElement("span");
            sourceBadge.className = "badge bg-secondary mb-1";
            sourceBadge.textContent = source;
            sourceContainer.appendChild(sourceBadge);
          });
          
          termHeader.appendChild(sourceContainer);
        }
        
        const termDefinition = document.createElement("div");
        termDefinition.className = "term-definition allow-definitions";
        termDefinition.innerHTML = item.description;
        
        col.appendChild(termHeader);
        col.appendChild(termDefinition);
        row.appendChild(col);
      });
      
      tabPane.appendChild(row);
      tabsContent.appendChild(tabPane);
      
      isFirst = false;
    });
    
    // Add tabs to container
    container.appendChild(tabsNav);
    container.appendChild(tabsContent);
    
    // Add search functionality
    searchInput.addEventListener("input", () => {
      const searchTerm = searchInput.value.toLowerCase();
      
      document.querySelectorAll(".glossary-term").forEach(term => {
        const termName = term.querySelector(".term-header").textContent.toLowerCase();
        const termDefinition = term.querySelector(".term-definition").textContent.toLowerCase();
        
        if (termName.includes(searchTerm) || termDefinition.includes(searchTerm)) {
          term.style.display = "";
        } else {
          term.style.display = "none";
        }
      });
    });
  }
  
  // Initialize Bootstrap tooltips
  function initializeTooltips() {
    try {
      const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
      
      if (tooltipTriggerList.length === 0) {
        return;
      }
      
      tooltipTriggerList.forEach(element => {
        if (!element.hasAttribute("data-bs-original-title")) {
          new bootstrap.Tooltip(element);
        }
      });
      
      console.log(`Initialized tooltips for ${tooltipTriggerList.length} elements`);
    } catch (error) {
      console.error("Error initializing tooltips:", error);
    }
  }
}