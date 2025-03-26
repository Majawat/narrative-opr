document.addEventListener("DOMContentLoaded", () => {
  // Get the army forge ID
  const armyForgeId = document.getElementById("army-forge-id").textContent;
  // Define local storage key for this army's doctrine
  const storageKey = `doctrine_${armyForgeId}`;

  // Initialize
  initializeStratagems();

  /**
   * Initialize the stratagems functionality
   */
  function initializeStratagems() {
    const doctrineSelector = document.getElementById("doctrine-selector");
    const selectBtn = document.getElementById("select-doctrine-btn");

    if (!doctrineSelector || !selectBtn) {
      // Elements not found, we might be on a different page
      return;
    }

    // Load all doctrines and populate the selector
    window.doctrineLoader.getAllDoctrines().then((doctrines) => {
      // Filter out Universal Doctrine (always available)
      const selectableDoctrines = doctrines.filter((d) => d.id !== "universal");

      // Clear existing options (except the placeholder)
      while (doctrineSelector.options.length > 1) {
        doctrineSelector.remove(1);
      }

      // Add the doctrine options
      selectableDoctrines.forEach((doctrine, index) => {
        const option = document.createElement("option");
        option.value = doctrine.id;
        option.textContent = `${index + 1}. ${doctrine.name}`;
        doctrineSelector.appendChild(option);
      });

      // Check if a doctrine is already selected
      const savedDoctrine = localStorage.getItem(storageKey);
      if (savedDoctrine) {
        doctrineSelector.value = savedDoctrine;
        selectBtn.disabled = false;
        displayActiveDoctrine(savedDoctrine);
      }
    });

    // Add event listeners
    doctrineSelector.addEventListener("change", function () {
      selectBtn.disabled = this.value === "";
    });

    selectBtn.addEventListener("click", function () {
      const selectedDoctrine = doctrineSelector.value;
      if (selectedDoctrine) {
        localStorage.setItem(storageKey, selectedDoctrine);
        displayActiveDoctrine(selectedDoctrine);
      }
    });
  }

  /**
   * Display the active doctrine (Universal Doctrine + selected doctrine)
   * @param {string} selectedDoctrine - ID of the selected doctrine
   */
  function displayActiveDoctrine(selectedDoctrine) {
    const container = document.getElementById("active-doctrine-container");
    if (!container) return;

    // Clear container
    container.innerHTML = "";

    // Loading indicator
    const loading = document.createElement("div");
    loading.className = "text-center py-3";
    loading.innerHTML =
      '<div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div>';
    container.appendChild(loading);

    // Promise to get both doctrines
    const promises = [
      window.doctrineLoader.getDoctrine("universal"),
      selectedDoctrine
        ? window.doctrineLoader.getDoctrine(selectedDoctrine)
        : Promise.resolve(null),
    ];

    Promise.all(promises)
      .then(([universalDoctrine, selectedDoctrineObj]) => {
        // Remove loading indicator
        container.removeChild(loading);

        // Display Universal Doctrine
        if (universalDoctrine) {
          const doctrineElement = createDoctrineDisplay(universalDoctrine);
          container.appendChild(doctrineElement);
        }

        // Display selected doctrine
        if (selectedDoctrineObj) {
          const doctrineElement = createDoctrineDisplay(selectedDoctrineObj);
          container.appendChild(doctrineElement);

          // Show toast notification
          showToast(
            "Doctrine Selected",
            `Your army is now using the <strong>${selectedDoctrineObj.name}</strong>.`,
            selectedDoctrineObj.color
          );
        }

        // Display in the main army page for quick reference
        displayDoctrineQuickReference(universalDoctrine, selectedDoctrineObj);
      })
      .catch((error) => {
        console.error("Error loading doctrines:", error);
        container.innerHTML = `
              <div class="alert alert-danger">
                Failed to load doctrine data. Please try again later.
              </div>
            `;
      });
  }

  /**
   * Creates a display element for a doctrine
   * @param {Object} doctrine - The doctrine object
   * @returns {HTMLElement} - Display element
   */
  function createDoctrineDisplay(doctrine) {
    // Create the display element
    const doctrineDisplay = document.createElement("div");
    doctrineDisplay.className = "card mb-3 doctrine-card";

    // Create the header
    const header = document.createElement("div");
    header.className = `card-header d-flex align-items-center bg-${doctrine.color} text-white`;
    header.innerHTML = `
          <i class="bi ${doctrine.icon} me-2"></i>
          <h5 class="mb-0">${doctrine.name}</h5>
        `;
    doctrineDisplay.appendChild(header);

    // Create the body with stratagems
    const body = document.createElement("div");
    body.className = "card-body p-0 stratagem-list";

    // Create stratagem list
    const list = document.createElement("ul");
    list.className = "list-group list-group-flush";

    doctrine.stratagems.forEach((stratagem) => {
      const item = document.createElement("li");
      item.className = "list-group-item";

      item.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-1">
              <h6 class="mb-0">${stratagem.name}</h6>
              <span class="badge bg-primary rounded-pill">${stratagem.cost} CP</span>
            </div>
            <p class="small mb-0">${stratagem.description}</p>
          `;

      list.appendChild(item);
    });

    body.appendChild(list);
    doctrineDisplay.appendChild(body);

    return doctrineDisplay;
  }

  /**
   * Display doctrines in the main army page for quick reference
   * @param {Object} universalDoctrine - Universal Doctrine object
   * @param {Object} selectedDoctrine - Selected doctrine object
   */
  function displayDoctrineQuickReference(universalDoctrine, selectedDoctrine) {
    // Find or create the quick reference container
    let quickRefContainer = document.getElementById("doctrine-quick-reference");

    if (!quickRefContainer) {
      // Create the quick reference container
      quickRefContainer = document.createElement("div");
      quickRefContainer.id = "doctrine-quick-reference";
      quickRefContainer.className = "card mb-3";

      // Add it to the page - just after the share link container
      const shareLinkContainer = document.getElementById(
        "share-link-container"
      );
      if (shareLinkContainer) {
        shareLinkContainer.parentNode.insertBefore(
          quickRefContainer,
          shareLinkContainer.nextSibling
        );
      } else {
        // Fallback - add to the units container
        const unitsContainer = document.getElementById("units-container");
        if (unitsContainer) {
          unitsContainer.parentNode.insertBefore(
            quickRefContainer,
            unitsContainer
          );
        }
      }
    }

    // Create header
    const header = document.createElement("div");
    header.className =
      "card-header d-flex justify-content-between align-items-center";
    header.innerHTML = `
          <h5 class="mb-0"><i class="bi bi-bookmark-star-fill me-2"></i>Army Doctrines</h5>
          <a href="#" class="btn btn-sm btn-outline-secondary" 
             data-bs-toggle="tab" data-bs-target="#nav-stratagems">
            Change
          </a>
        `;

    // Create body
    const body = document.createElement("div");
    body.className = "card-body doctrine-quick-ref p-3";

    // Build the quick reference HTML
    let quickRefHTML = `
          <div class="row">
            <div class="col-md-6 mb-3">
              <div class="d-flex align-items-center mb-2">
                <i class="bi ${universalDoctrine.icon} me-2 text-${universalDoctrine.color}"></i>
                <h6 class="mb-0">${universalDoctrine.name}</h6>
              </div>
              <ul class="list-unstyled small mb-0">
        `;

    // Add universal stratagems (first 3)
    universalDoctrine.stratagems.slice(0, 3).forEach((strat) => {
      quickRefHTML += `
            <li class="mb-1">
              <span class="badge bg-${universalDoctrine.color} rounded-pill me-1">${strat.cost} CP</span>
              <strong>${strat.name}:</strong> ${strat.description}
            </li>
          `;
    });

    quickRefHTML += `
              </ul>
            </div>
        `;

    if (selectedDoctrine) {
      quickRefHTML += `
            <div class="col-md-6">
              <div class="d-flex align-items-center mb-2">
                <i class="bi ${selectedDoctrine.icon} me-2 text-${selectedDoctrine.color}"></i>
                <h6 class="mb-0">${selectedDoctrine.name}</h6>
              </div>
              <ul class="list-unstyled small mb-0">
          `;

      // Add selected doctrine stratagems (first 3)
      selectedDoctrine.stratagems.slice(0, 3).forEach((strat) => {
        quickRefHTML += `
              <li class="mb-1">
                <span class="badge bg-${selectedDoctrine.color} rounded-pill me-1">${strat.cost} CP</span>
                <strong>${strat.name}:</strong> ${strat.description}
              </li>
            `;
      });

      quickRefHTML += `
              </ul>
            </div>
          `;
    } else {
      quickRefHTML += `
            <div class="col-md-6">
              <div class="d-flex align-items-center mb-2">
                <i class="bi bi-exclamation-circle me-2 text-warning"></i>
                <h6 class="mb-0">No Doctrine Selected</h6>
              </div>
              <p class="small mb-0">Please select a doctrine to complement your Universal Doctrine.</p>
            </div>
          `;
    }

    quickRefHTML += `</div>`;

    body.innerHTML = quickRefHTML;

    // Clear and update the quick reference container
    quickRefContainer.innerHTML = "";
    quickRefContainer.appendChild(header);
    quickRefContainer.appendChild(body);
  }

  /**
   * Show a toast notification
   * @param {string} title - Toast title
   * @param {string} message - Toast message
   * @param {string} type - Toast type (primary, success, danger, etc.)
   */
  function showToast(title, message, type = "primary") {
    const toastContainer = document.getElementById("toast-container");
    if (!toastContainer) return;

    const toast = document.createElement("div");
    toast.className = `toast align-items-center text-bg-${type} border-0`;
    toast.role = "alert";
    toast.ariaLive = "assertive";
    toast.ariaAtomic = "true";
    toast.style.marginBottom = "10px";

    toast.innerHTML = `
          <div class="d-flex flex-column">
            <div class="toast-header bg-${type}-subtle text-${type}-emphasis">
              <strong class="me-auto">${title}</strong>
              <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
            <div class="toast-body bg-body text-body">
              ${message}
            </div>
          </div>
        `;

    toastContainer.appendChild(toast);
    const bsToast = new bootstrap.Toast(toast, { delay: 5000 });
    bsToast.show();

    // Auto-remove after hiding
    toast.addEventListener("hidden.bs.toast", function () {
      toastContainer.removeChild(toast);
    });
  }

  // Make function accessible for other scripts
  window.displayActiveDoctrine = displayActiveDoctrine;
});
