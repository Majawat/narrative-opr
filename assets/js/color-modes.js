(() => {
  "use strict";

  // Retrieve the stored theme from localStorage
  const getStoredTheme = () => localStorage.getItem("theme");

  // Store the theme in localStorage
  const setStoredTheme = (theme) => localStorage.setItem("theme", theme);

  // Determine the preferred theme (stored theme or system preference)
  const getPreferredTheme = () => {
    const storedTheme = getStoredTheme();
    if (storedTheme) {
      return storedTheme;
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  };

  // Set the theme by updating the data-bs-theme attribute
  const setTheme = (theme) => {
    if (theme === "auto") {
      document.documentElement.setAttribute(
        "data-bs-theme",
        window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
      );
    } else {
      document.documentElement.setAttribute("data-bs-theme", theme);
    }
  };

  // Set the initial theme
  setTheme(getPreferredTheme());

  // Update the UI to reflect the active theme
  const showActiveTheme = (theme, focus = false) => {
    const themeSwitcher = document.querySelector("#bd-theme");
    if (!themeSwitcher) {
      return;
    }

    const themeSwitcherText = document.querySelector("#bd-theme-text");
    const themeSwitcherIcon = themeSwitcher.querySelector("i");
    const btnToActive = document.querySelector(
      `[data-bs-theme-value="${theme}"]`
    );

    themeSwitcherIcon.classList.remove("bi-moon", "bi-sun", "bi-circle-half");
    switch (theme) {
      case "light":
        themeSwitcherIcon.classList.add("bi-sun");
        break;
      case "dark":
        themeSwitcherIcon.classList.add("bi-moon");
        break;
      case "auto":
        themeSwitcherIcon.classList.add("bi-circle-half");
        break;
      default:
        // Handle any unexpected values
        console.error("Unknown theme:", theme);
    }

    document.querySelectorAll("[data-bs-theme-value]").forEach((element) => {
      element.classList.remove("active");
      element.setAttribute("aria-pressed", "false");
      element.classList.remove("theme-icon-active");
    });

    btnToActive.classList.add("active");
    btnToActive.setAttribute("aria-pressed", "true");
    btnToActive.classList.add("theme-icon-active");
    const themeSwitcherLabel = `${themeSwitcherText.textContent} (${btnToActive.dataset.bsThemeValue})`;
    themeSwitcher.setAttribute("aria-label", themeSwitcherLabel);

    if (focus) {
      themeSwitcher.focus();
    }
  };

  // Listen for changes in the system's color scheme preference
  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", () => {
      const storedTheme = getStoredTheme();
      if (storedTheme !== "light" && storedTheme !== "dark") {
        setTheme(getPreferredTheme());
      }
    });

  // Once the DOM is fully loaded, set up the theme switcher
  window.addEventListener("DOMContentLoaded", () => {
    showActiveTheme(getPreferredTheme());

    document.querySelectorAll("[data-bs-theme-value]").forEach((toggle) => {
      toggle.addEventListener("click", () => {
        const theme = toggle.getAttribute("data-bs-theme-value");
        setStoredTheme(theme);
        setTheme(theme);
        showActiveTheme(theme, true);
      });
    });
  });
})();
