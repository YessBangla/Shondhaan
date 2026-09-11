import {
  Home,
  ClipboardList,
  MessageSquare,
  User,
  MoreHorizontal,
  Search,
  FileSearch,
  QrCode,
  LayoutGrid,
  type LucideIcon,
} from "lucide-react";

/**
 * Mobile Bottom Navigation — Tab configuration
 * ============================================
 * Single source of truth for the 5-tab bottom navigation. To add, remove,
 * reorder, or relabel tabs, edit only this file. The MobileBottomNav
 * component renders whatever tabs you return from `getMobileNavTabs()`.
 *
 * Quick recipes:
 *   • Add a new tab        → add an entry to MOBILE_NAV_TABS with a unique `id`
 *   • Reorder              → move entries up/down (or set `order`)
 *   • Remove               → delete the entry, or set `enabled: false`
 *   • Hide for guests      → set `requiresAuth: true`
 *   • Show only on a role  → set `roles: ["admin", "provider", ...]`
 *   • Custom action        → set `action: "modal:search" | "modal:track" | ...`
 *                           (handlers live in MobileBottomNav.handleTabClick)
 *
 * NOTE: Bottom nav looks best with EXACTLY 5 tabs. The component will warn
 * in development if you exceed that.
 */

export type MobileNavAction =
  | { kind: "navigate"; to: string }
  | { kind: "navigate-auth"; authedTo: string; guestTo: string }
  | { kind: "modal"; modal: "search" | "track" | "qr" | "more" | "request" | "service-chat" };

export type BadgeKey = "bookings" | "chat" | "cart" | "notifications";

export interface MobileNavTabConfig {
  /** Stable identifier — used by handlers, analytics, and route matching */
  id: string;
  /** Lucide icon component */
  icon: LucideIcon;
  /** Display label (bn / en) */
  label: { bn: string; en: string };
  /** A11y description read after the label */
  describe: { bn: string; en: string };
  /** What happens on tap */
  action: MobileNavAction;
  /** Optional badge — read from `useBadgeCounts()` keys */
  badge?: BadgeKey;
  /** Routes that should mark this tab as active (exact or prefix `/foo/*`) */
  activeRoutes?: string[];
  /** Hide entry entirely (cleaner than deleting during experiments) */
  enabled?: boolean;
  /** Show only for authenticated users */
  requiresAuth?: boolean;
  /** Show only when user has at least one of these roles */
  roles?: string[];
  /** Optional explicit ordering — lower first; falls back to array order */
  order?: number;
}

/**
 * Default tab roster. Edit this list to change the bottom nav.
 */
export const MOBILE_NAV_TABS: MobileNavTabConfig[] = [
  {
    id: "home",
    icon: Home,
    label: { bn: "হোম", en: "Home" },
    describe: { bn: "মূল পেজে যান", en: "Go to home" },
    action: { kind: "navigate", to: "/" },
    activeRoutes: ["/"],
  },
  {
    id: "orders",
    icon: ClipboardList,
    label: { bn: "বুকিং", en: "Booking" },
    describe: { bn: "আপনার বুকিং দেখুন", en: "View your bookings" },
    action: { kind: "navigate", to: "/bookings" },
    activeRoutes: ["/bookings"],
    badge: "bookings",
  },
  {
    id: "account",
    icon: User,
    label: { bn: "অ্যাকাউন্ট", en: "Account" },
    describe: { bn: "আপনার অ্যাকাউন্ট ও প্রোফাইল", en: "Your account and profile" },
    action: { kind: "navigate", to: "/dashboard" },
    activeRoutes: ["/dashboard", "/profile"],
  },
  {
    id: "chat",
    icon: MessageSquare,
    label: { bn: "চ্যাট", en: "Chat" },
    describe: { bn: "মেসেজ ও চ্যাট খুলুন", en: "Open messages and chat" },
    action: { kind: "modal", modal: "service-chat" },
    badge: "chat",
  },
  {
    id: "more",
    icon: MoreHorizontal,
    label: { bn: "আরও", en: "More" },
    describe: { bn: "অতিরিক্ত মেনু খুলুন", en: "Open more menu" },
    action: { kind: "modal", modal: "more" },
  },
];

/**
 * Optional alternative tabs you can swap in without rewriting code.
 * Example: `getMobileNavTabs({ preset: "compact" })`.
 */
export const MOBILE_NAV_PRESETS: Record<string, MobileNavTabConfig[]> = {
  default: MOBILE_NAV_TABS,
  // Example preset — swaps Chat for a Search tab
  search: [
    MOBILE_NAV_TABS[0],
    MOBILE_NAV_TABS[1],
    {
      id: "search",
      icon: Search,
      label: { bn: "অনুসন্ধান", en: "Search" },
      describe: { bn: "সার্ভিস খুঁজুন", en: "Find a service" },
      action: { kind: "modal", modal: "search" },
    },
    MOBILE_NAV_TABS[3],
    MOBILE_NAV_TABS[4],
  ],
  // Example preset — exposes Track + QR in the bar instead of inside More
  power: [
    MOBILE_NAV_TABS[0],
    {
      id: "track",
      icon: FileSearch,
      label: { bn: "ট্র্যাক", en: "Track" },
      describe: { bn: "সার্ভিস ট্র্যাক করুন", en: "Track your service" },
      action: { kind: "modal", modal: "track" },
    },
    {
      id: "qr",
      icon: QrCode,
      label: { bn: "QR", en: "QR" },
      describe: { bn: "QR কোড স্ক্যান করুন", en: "Scan a QR code" },
      action: { kind: "modal", modal: "qr" },
    },
    {
      id: "all-services",
      icon: LayoutGrid,
      label: { bn: "সার্ভিস", en: "Services" },
      describe: { bn: "সব সার্ভিস দেখুন", en: "Browse all services" },
      action: { kind: "navigate", to: "/all-services" },
      activeRoutes: ["/all-services"],
    },
    MOBILE_NAV_TABS[4],
  ],
};

export interface ResolveTabsArgs {
  /** Pick a preset; omit for default */
  preset?: keyof typeof MOBILE_NAV_PRESETS;
  /** Whether the current viewer is authenticated */
  isAuthenticated: boolean;
  /** Roles held by the current viewer */
  roles: string[];
}

/**
 * Returns the final ordered, filtered list of tabs to render. This is
 * the only function MobileBottomNav needs to call.
 */
export const resolveMobileNavTabs = ({
  preset = "default",
  isAuthenticated,
  roles,
}: ResolveTabsArgs): MobileNavTabConfig[] => {
  const list = MOBILE_NAV_PRESETS[preset] ?? MOBILE_NAV_TABS;
  const filtered = list.filter((t) => {
    if (t.enabled === false) return false;
    if (t.requiresAuth && !isAuthenticated) return false;
    if (t.roles && t.roles.length > 0) {
      const ok = t.roles.some((r) => roles.includes(r));
      if (!ok) return false;
    }
    return true;
  });
  // Stable sort by `order` (entries without `order` keep their array position)
  return [...filtered].sort((a, b) => {
    const oa = a.order ?? Number.POSITIVE_INFINITY;
    const ob = b.order ?? Number.POSITIVE_INFINITY;
    if (oa === ob) return 0;
    return oa - ob;
  });
};

/** Helper: does a path match this tab's active route patterns? */
export const isTabActive = (tab: MobileNavTabConfig, pathname: string): boolean => {
  if (!tab.activeRoutes || tab.activeRoutes.length === 0) return false;
  return tab.activeRoutes.some((r) => {
    if (r.endsWith("/*")) return pathname.startsWith(r.slice(0, -2));
    return pathname === r;
  });
};
