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
