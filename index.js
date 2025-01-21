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
      subtitle.style.opacity = "0";
      navbar.classList.add("shrink");
    } else {
      subtitle.style.opacity = "1";
      navbar.classList.remove("shrink");
    }
  }

  window.addEventListener("scroll", handleScroll);

  // Initial check
  handleScroll();
});
