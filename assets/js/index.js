document.addEventListener("DOMContentLoaded", function () {
  const links = document.querySelectorAll('a[href^="http"]');
  links.forEach((link) => {
    link.setAttribute("target", "_blank");
  });
});

document.addEventListener("DOMContentLoaded", function () {
  const links = document.querySelectorAll('a[href^="http"]');
  links.forEach((link) => {
    link.setAttribute("target", "_blank");
  });

  const offcanvasElement = document.getElementById("bdNavbar");
  if (offcanvasElement) {
    const offcanvas = new bootstrap.Offcanvas(offcanvasElement);
    offcanvasElement.addEventListener("click", function (event) {
      const target = event.target;
      if (
        target.tagName === "A" &&
        target.getAttribute("href").startsWith("#")
      ) {
        offcanvas.hide();
      }
    });
  }
});
