document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll(".accordion-button").forEach((button) => {
    button.addEventListener("click", () => {
      const parentDiv = button.closest(".strategem-div");

      // Skip if the parent div is the universal doctrine
      if (!parentDiv) {
        return;
      }

      const isExpanded = button.getAttribute("aria-expanded") === "true";

      if (isExpanded) {
        parentDiv.classList.remove("col-xl-4", "col-lg-6");
        parentDiv.classList.add("col-12");
      } else {
        parentDiv.classList.remove("col-12");
        parentDiv.classList.add("col-xl-4", "col-lg-6");
      }
    });
  });
});
