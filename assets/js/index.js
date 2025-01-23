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
});

document.addEventListener("DOMContentLoaded", function () {
  var navbar = document.querySelector(".navbar");
  var subtitle = document.getElementById("navbar-brand-subtitle");

  function handleScroll() {
    if (window.scrollY > 0) {
      subtitle.style.display = "none";
      navbar.classList.remove("p-3");
    } else {
      subtitle.style.display = "block";
      navbar.classList.add("p-3");
    }
  }

  window.addEventListener("scroll", handleScroll);

  // Initial check
  handleScroll();
});

document.addEventListener("DOMContentLoaded", function () {
  const links = document.querySelectorAll('a[href^="http"]');
  links.forEach((link) => {
    link.setAttribute("target", "_blank");
  });
});

document.addEventListener("DOMContentLoaded", function () {
  const themeToggleBtn = document.getElementById("theme-toggleBtn");
  const htmlElement = document.documentElement;
  const themeToast = document.getElementById("themeToast");
  const themeToastBody = themeToast.querySelector(".toast-body");
  const bsToast = new bootstrap.Toast(themeToast);

  themeToggleBtn.addEventListener("click", function () {
    if (htmlElement.getAttribute("data-bs-theme") === "light") {
      // Switch to dark mode
      htmlElement.setAttribute("data-bs-theme", "dark");
      themeToggleBtn.innerHTML = '<i class="bi bi-sun"></i>';
      themeToastBody.textContent =
        "Welcome to the dark mode, servant of the Emperor!";
      themeToast.classList.remove("text-bg-danger");
      themeToast.classList.add("text-bg-success");
    } else {
      // Switch to light mode
      htmlElement.setAttribute("data-bs-theme", "light");
      themeToggleBtn.innerHTML = '<i class="bi bi-moon"></i>';
      themeToastBody.textContent =
        "Heretic! Your allegiance to the light mode shall not go unpunished!";
      themeToast.classList.remove("text-bg-success");
      themeToast.classList.add("text-bg-danger");
    }
    bsToast.show();
  });

  // Set initial icon, message, and toast color based on the current theme
  if (htmlElement.getAttribute("data-bs-theme") === "dark") {
    themeToggleBtn.innerHTML = '<i class="bi bi-sun"></i>';
    themeToastBody.textContent =
      "Welcome to the dark mode, servant of the Emperor!";
    themeToast.classList.add("text-bg-success");
  } else {
    themeToggleBtn.innerHTML = '<i class="bi bi-moon"></i>';
    themeToastBody.textContent =
      "Heretic! Your allegiance to the light mode shall not go unpunished!";
    themeToast.classList.add("text-bg-danger");
  }
});
