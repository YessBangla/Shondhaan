import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Updates the <meta name="theme-color"> tag based on the current route so the
 * mobile browser/PWA status bar adopts the active sub-brand color — same trick
 * used by Daraz, Foodpanda, and most native-feel web apps.
 */
const ROUTE_COLORS: Array<{ test: (p: string) => boolean; light: string; dark: string }> = [
  { test: (p) => p.startsWith("/mart"),  light: "#F57224", dark: "#1F0A02" }, // orange
  { test: (p) => p.startsWith("/deal"),  light: "#62B146", dark: "#0E2A12" }, // Bikroy green
  { test: (p) => p.startsWith("/jobs") || p.startsWith("/employer"), light: "#0E8A4A", dark: "#04231A" },
  { test: (p) => p.startsWith("/admin") || p.startsWith("/super-admin"), light: "#111827", dark: "#000000" },
];

const DEFAULT = { light: "#277A4F", dark: "#0A1F14" };

function setMeta(name: string, content: string, media?: string) {
  const selector = media
    ? `meta[name="${name}"][media="${media}"]`
    : `meta[name="${name}"]:not([media])`;
  let el = document.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement("meta");
    el.name = name;
    if (media) el.setAttribute("media", media);
    document.head.appendChild(el);
  }
  el.content = content;
}

export function useStatusBarTheme() {
  const location = useLocation();
  useEffect(() => {
    const match = ROUTE_COLORS.find((r) => r.test(location.pathname)) ?? DEFAULT;
    setMeta("theme-color", match.light, "(prefers-color-scheme: light)");
    setMeta("theme-color", match.dark, "(prefers-color-scheme: dark)");
    // Fallback for browsers ignoring media queries
    setMeta("theme-color", match.light);

    // Toggle body-level theme classes so route-scoped CSS (e.g. .deal-theme)
    // can re-skin semantic tokens for the entire sub-platform.
    const body = document.body;
    body.classList.toggle("deal-theme", location.pathname.startsWith("/deal"));
  }, [location.pathname]);
}