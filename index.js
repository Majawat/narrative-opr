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
  const themeToast = new bootstrap.Toast(document.getElementById("themeToast"));

  themeToggleBtn.addEventListener("click", function () {
    if (htmlElement.getAttribute("data-bs-theme") === "light") {
      htmlElement.setAttribute("data-bs-theme", "dark");
      themeToggleBtn.innerHTML = '<i class="bi bi-sun"></i>';
    } else {
      htmlElement.setAttribute("data-bs-theme", "light");
      themeToggleBtn.innerHTML = '<i class="bi bi-moon"></i>';
      themeToast.show();
    }
  });

  // Set initial icon based on the current theme
  if (htmlElement.getAttribute("data-bs-theme") === "dark") {
    themeToggleBtn.innerHTML = '<i class="bi bi-sun"></i>';
  } else {
    themeToggleBtn.innerHTML = '<i class="bi bi-moon"></i>';
  }
});
