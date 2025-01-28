(function () {
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

    const iconClasses = {
      light: "bi-sun",
      dark: "bi-moon",
      auto: "bi-circle-half",
    };

    themeSwitcherIcon.classList.remove("bi-moon", "bi-sun", "bi-circle-half");
    themeSwitcherIcon.classList.add(iconClasses[theme]);

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
      console.log(storedTheme);
      if (storedTheme !== "light" && storedTheme !== "dark") {
        setTheme(getPreferredTheme());
        showThemeToast(getPreferredTheme());
      }
    });

  // Show theme toast
  const showThemeToast = (theme) => {
    const themeToast = document.getElementById("themeToast");
    const themeToastBody = themeToast.querySelector(".toast-body");
    const bsToast = new bootstrap.Toast(themeToast);

    const themeMessages = {
      light: {
        message:
          "Heretic! Your allegiance to the light mode shall not go unpunished!",
        class: "text-bg-danger",
      },
      dark: {
        message: "Welcome to the dark mode, servant of the Emperor!",
        class: "text-bg-success",
      },
      auto: {
        message: "Auto theme activated.",
        class: "text-bg-primary",
      },
    };

    themeToast.classList.remove(
      "text-bg-danger",
      "text-bg-success",
      "text-bg-primary"
    );

    if (themeMessages[theme] && theme !== "auto") {
      themeToastBody.textContent = themeMessages[theme].message;
      themeToast.classList.add(themeMessages[theme].class);
      bsToast.show();
    } else {
      bsToast.hide();
    }
  };

  // Once the DOM is fully loaded, set up the theme switcher
  window.addEventListener("DOMContentLoaded", () => {
    showActiveTheme(getPreferredTheme());
    console.log("DOM loaded, adding event listeners");
    console.log(
      "Adding clicks to: " + document.querySelectorAll("[data-bs-theme-value]")
    );

    document.querySelectorAll("[data-bs-theme-value]").forEach((toggle) => {
      console.log("found toggle: " + toggle);
      toggle.addEventListener("click", () => {
        console.log(toggle + "clicked");
        const theme = toggle.getAttribute("data-bs-theme-value");
        setStoredTheme(theme);
        setTheme(theme);
        showActiveTheme(theme, true);
        showThemeToast(theme);
      });
    });
  });
})();
