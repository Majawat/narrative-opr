document.addEventListener("DOMContentLoaded", function () {
  var navbar = document.getElementById("navbarSupportedContent");
  var links = navbar.querySelectorAll(".nav-link, .dropdown-item");

  links.forEach(function (link) {
    link.addEventListener("click", function () {
      if (navbar.classList.contains("show")) {
        var bsCollapse = new bootstrap.Collapse(navbar, {
          toggle: false,
        });
        bsCollapse.hide();
      }
    });
  });
});
