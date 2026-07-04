import { useLocation } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

/**
 * Floating global language switcher — visible on every page.
 * Sits at the top-right, just below the safe-area / status bar, and
 * stays out of the way of headers (uses small chip styling).
 */
const GlobalLanguageSwitcher = () => {
  const { language, setLanguage } = useLanguage();
  const { pathname } = useLocation();
  const toggle = () => setLanguage(language === "bn" ? "en" : "bn");

  // Backend dashboards already render an inline language toggle in their
  // sticky header (AdminLayout / PanelSidebarTabs). Avoid showing two.
  // Exact route match (with subroute support for /admin/* and /internal/*).
  const exactRoutes = new Set([
    "/super-admin", "/dashboard", "/call-center", "/provider",
    "/representative", "/moderator", "/supervisor", "/finance",
    "/employer", "/yessdeal",
    "/mart", "/mart/admin", "/mart/delivery", "/mart/cs", "/mart/my-shop",
  ]);
  const prefixRoutes = ["/admin", "/internal"];
  if (
    exactRoutes.has(pathname) ||
    prefixRoutes.some((p) => pathname === p || pathname.startsWith(p + "/"))
  ) {
    return null;
  }

  // The public `Navbar` already renders an inline language switcher in BOTH
  // its mobile header and its desktop utility cluster. On those breakpoints
  // showing this floating chip again creates a duplicate icon at the top-right
  // (reported on mobile). We therefore hide this floating control on every
  // viewport where the Navbar is rendered (md and below — the navbar is
  // visible at all sizes). It still remains in the tree as a safety net for
  // future layouts that may not render the Navbar.
  // Implementation: render `null` on the client; if some future route opts
  // out of Navbar, this component can be re-introduced via a per-route flag.
  return null;
};

export default GlobalLanguageSwitcher;