// Automatically wrap specific words in spans with tooltips
function autoWrapDefinitions() {
  // Terms and their corresponding definitions
  const terms = {
    Agile: "Moves +1 on advance and +2 on rush and charge.",
    Headstrong: "Gets +1 to rolls when taking morale tests.",
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
