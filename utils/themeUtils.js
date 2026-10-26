// Shared Theme Utility for ContestPulse
// Applies and synchronizes dark, light, and system themes.

let mediaQueryListenerAttached = false;
let currentConfiguredTheme = "system";

/**
 * Applies the specified theme ('dark' | 'light' | 'system') to document.documentElement.
 * @param {'dark' | 'light' | 'system'} theme
 */
export function applyTheme(theme = "system") {
  currentConfiguredTheme = theme;
  const root = document.documentElement;
  root.classList.remove("theme-light", "dark");

  if (theme === "light") {
    root.classList.add("theme-light");
    root.setAttribute("data-theme", "light");
  } else if (theme === "dark") {
    root.classList.add("dark");
    root.setAttribute("data-theme", "dark");
  } else {
    // System theme: detect OS preference
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    if (prefersDark) {
      root.classList.add("dark");
      root.setAttribute("data-theme", "dark");
    } else {
      root.classList.add("theme-light");
      root.setAttribute("data-theme", "light");
    }

    // Attach system theme change listener once
    if (!mediaQueryListenerAttached && window.matchMedia) {
      try {
        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        mediaQuery.addEventListener("change", (e) => {
          if (currentConfiguredTheme === "system") {
            root.classList.remove("theme-light", "dark");
            if (e.matches) {
              root.classList.add("dark");
              root.setAttribute("data-theme", "dark");
            } else {
              root.classList.add("theme-light");
              root.setAttribute("data-theme", "light");
            }
          }
        });
        mediaQueryListenerAttached = true;
      } catch (err) {
        console.warn("Could not attach theme change listener:", err);
      }
    }
  }
}
