document.addEventListener("DOMContentLoaded", () => {
  // Check if we're on the rules page
  if (!document.getElementById('doctrineAccordion')) {
    return;
  }
  
  // Load doctrines and populate the accordions
  window.doctrineLoader.getAllDoctrines()
    .then(doctrines => {
      // Populate each doctrine's accordion
      doctrines.forEach(doctrine => {
        populateDoctrineAccordion(doctrine);
      });
    })
    .catch(error => {
      console.error("Error loading doctrines:", error);
    });
  
  /**
   * Populate a doctrine accordion with stratagems
   * @param {Object} doctrine - The doctrine object
   */
  function populateDoctrineAccordion(doctrine) {
    // Find the accordion for this doctrine
    const accordionId = `collapse${doctrine.id.charAt(0).toUpperCase() + doctrine.id.slice(1)}`;
    const accordionElement = document.getElementById(accordionId);
    
    if (!accordionElement) {
      console.warn(`Accordion element not found for doctrine: ${doctrine.id}`);
      return;
    }
    
    const accordionBody = accordionElement.querySelector('.accordion-body');
    if (!accordionBody) {
      console.warn(`Accordion body not found for doctrine: ${doctrine.id}`);
      return;
    }
    
    // Clear existing content
    accordionBody.innerHTML = '';
    
    // Add each stratagem
    doctrine.stratagems.forEach((stratagem, index) => {
      // Create title
      const title = document.createElement('h5');
      title.className = 'card-title';
      title.innerHTML = `
        <span class="badge bg-secondary rounded-pill">${stratagem.cost} CP</span>
        ${stratagem.name}
      `;
      accordionBody.appendChild(title);
      
      // Create description
      const description = document.createElement('p');
      description.className = 'card-text';
      description.textContent = stratagem.description;
      accordionBody.appendChild(description);
      
      // Add separator unless it's the last stratagem
      if (index < doctrine.stratagems.length - 1) {
        const separator = document.createElement('hr');
        accordionBody.appendChild(separator);
      }
    });
  }
});

// RULES API: https://army-forge.onepagerules.com/api/rules/common/2
// Blessed Sisters Faction book: https://army-forge.onepagerules.com/api/army-books/7oi8zeiqfamiur21?gameSystem=2
// List of factions: https://army-forge.onepagerules.com/api/army-books?filters=official&gameSystemSlug=grimdark-future&searchText=&page=1&unitCount=0&balanceValid=false&customRules=true&fans=false&sortBy=null
