document.addEventListener("DOMContentLoaded", function () {
  var navbar = document.getElementById("navbarSupportedContent");
  var links = navbar.querySelectorAll(".nav-link, .dropdown-item");
  var dropdownToggles = navbar.querySelectorAll(".dropdown-toggle");

  links.forEach(function (link) {
    link.addEventListener("click", function (event) {
      // Check if the clicked link is a dropdown toggle
      var isDropdownToggle = Array.from(dropdownToggles).includes(event.target);

      if (navbar.classList.contains("show") && !isDropdownToggle) {
        var bsCollapse = new bootstrap.Collapse(navbar, {
          toggle: false,
        });
        bsCollapse.hide();
      }
    });
  });

  // Function to roll a die and return the result
  function rollDie(sides) {
    return Math.floor(Math.random() * sides) + 1;
  }

  // Function to display a toast message
  function showToast(message) {
    var toastContainer = document.getElementById("toast-container");
    if (!toastContainer) {
      toastContainer = document.createElement("div");
      toastContainer.id = "toast-container";
      toastContainer.style.position = "fixed";
      toastContainer.style.bottom = "10px";
      toastContainer.style.right = "10px";
      toastContainer.style.zIndex = "9999";
      document.body.appendChild(toastContainer);
    }

    var toast = document.createElement("div");
    toast.className = "toast align-items-center text-bg-primary border-0";
    toast.role = "alert";
    toast.ariaLive = "assertive";
    toast.ariaAtomic = "true";
    toast.innerHTML = `
        <div class="d-flex">
          <div class="toast-body">🎲 ${message}</div>
          <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
      `;

    toastContainer.appendChild(toast);
    var bsToast = new bootstrap.Toast(toast);
    bsToast.show();

    setTimeout(function () {
      bsToast.hide();
      toastContainer.removeChild(toast);
    }, 3000);
  }

  // Function to handle dice notation clicks
  function handleDiceNotationClick(event) {
    var notation = event.target.textContent;
    var match = notation.match(/D(\d+)([+-]\d+)?/i);
    if (match) {
      var sides = parseInt(match[1], 10);
      var modifier = match[2] ? parseInt(match[2], 10) : 0;
      var result = rollDie(sides) + modifier;
      showToast(`Result: ${result}`);
    }
  }

  // Add event listeners to dice notation
  var diceNotations = document.querySelectorAll(".dice-notation");
  diceNotations.forEach(function (notation) {
    notation.addEventListener("click", handleDiceNotationClick);
  });
});
