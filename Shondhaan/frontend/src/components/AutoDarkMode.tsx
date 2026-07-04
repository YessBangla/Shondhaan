import { useEffect } from "react";

const KEY = "yess_theme_pref"; // "light" | "dark"  (auto removed — opt-in only)

/**
 * Auto dark mode based on local time (sunset 18:30 → sunrise 06:30) +
 * respects user's manual override stored in localStorage. Re-evaluates
 * every 5 min so the theme flips even if the tab stays open overnight.
 */
const AutoDarkMode = () => {
  useEffect(() => {
    // Migrate any legacy "auto" preference to "light" so users no longer get
    // the time-based auto-switch unless they explicitly opt in via the switch.
    try {
      const existing = localStorage.getItem(KEY);
      if (existing === "auto" || existing == null) {
        localStorage.setItem(KEY, "light");
      }
    } catch { /* ignore */ }

    const apply = () => {
      const pref = localStorage.getItem(KEY) || "light";
      const root = document.documentElement;
      root.classList.toggle("dark", pref === "dark");
    };
    apply();
    const onStorage = (e: StorageEvent) => { if (e.key === KEY) apply(); };
    window.addEventListener("storage", onStorage);
    return () => { window.removeEventListener("storage", onStorage); };
  }, []);
  return null;
};

export default AutoDarkMode;