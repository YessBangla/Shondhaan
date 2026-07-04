import { useEffect, useState } from "react";

type ThemeMode = "light" | "dark" | "system";

const KEY = "yess_theme";

function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const isDark = mode === "dark" || (mode === "system" && prefersDark);
  root.classList.toggle("dark", isDark);
  // keep mobile status-bar colour in sync with theme
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute("content", isDark ? "#13171c" : "#ffffff");
  }
}

/**
 * Theme manager that respects system preference by default, persists user
 * override, and reacts to OS-level dark-mode flips in real-time.
 */
export function useTheme() {
  const [mode, setMode] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") return "system";
    return (localStorage.getItem(KEY) as ThemeMode) || "system";
  });

  useEffect(() => {
    applyTheme(mode);
    localStorage.setItem(KEY, mode);
  }, [mode]);

  useEffect(() => {
    if (mode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme("system");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [mode]);

  const cycle = () => {
    setMode((m) => (m === "light" ? "dark" : m === "dark" ? "system" : "light"));
  };

  return { mode, setMode, cycle };
}

/** Boot-time apply — call once before React mounts to avoid flash. */
export function bootTheme() {
  if (typeof window === "undefined") return;
  const saved = (localStorage.getItem(KEY) as ThemeMode) || "system";
  applyTheme(saved);
}
