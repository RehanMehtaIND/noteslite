
export type Theme = "standard" | "dark" | "space";

/**
 * Update the application theme globally.
 * This sets a persistent cookie and applies the theme class to the document body.
 */
export function setTheme(theme: Theme) {
  // 1. Update the document body class for immediate UI feedback
  if (typeof document !== "undefined") {
    document.body.classList.remove("theme-standard", "theme-dark", "theme-space");
    document.body.classList.add(`theme-${theme}`);
  }

  // 2. Persist the choice in a cookie so the server can read it on next page load
  // We use a long expiration (1 year)
  if (typeof document !== "undefined") {
    document.cookie = `noteslite-theme=${theme}; path=/; max-age=31536000; SameSite=Lax`;
  }

  // 3. Optional: Sync with database if the user is logged in
  // This is typically handled by the component that calls this function (e.g. PreferencesModal)
}

/**
 * Get the current theme from cookies (client-side only).
 */
export function getThemeFromCookie(): Theme {
  if (typeof document === "undefined") return "standard";
  
  const match = document.cookie.match(/noteslite-theme=([^;]+)/);
  const theme = match ? match[1] : "standard";
  
  if (theme === "dark" || theme === "space") return theme;
  return "standard";
}
