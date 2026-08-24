import type { RoleKey } from "@/config/roles";

// role dite hoy ekhan theke

export const GLOBAL_ADMIN_ROLES: RoleKey[] = ["super_admin", "admin"];

export const DEPARTMENT_ADMIN_ROLES: RoleKey[] = [
  "service_admin",
  "mart_admin",
  "deal_admin",
  "job_admin",
];

export const ADMIN_PANEL_ROLES: RoleKey[] = [
  ...GLOBAL_ADMIN_ROLES,
  ...DEPARTMENT_ADMIN_ROLES,
  "call_center",
];

export const ADMIN_ACCESS_BY_ROLE: Partial<Record<RoleKey, string[] | "*">> = {
  super_admin: "*",
  admin: "*",
  service_admin: [
    "/admin/service",
    "/admin/smart-dashboard",
    "/admin/analytics",
    "/admin/bookings",
    "/admin/requests",
    "/admin/services",
    "/admin/service-images",
    "/admin/categories",
    "/admin/offers",
    "/admin/banners",
    "/admin/sections",
    "/admin/contacts",
    "/admin/chat-history",
    "/admin/notifications",
    "/admin/notification-rules",
    "/admin/reviews",
    "/admin/settings",
    // [WALLET UPDATE] Service Admin Accounts
    "/admin/service-admin/accounts",
  "/admin/service-admin/accounts",
  "/admin/referral-codes",
  "/admin/referral-settings", 
  "/admin/referral-transactions",
  "/admin/referral-report",
  ],
  mart_admin: [
    "/admin/mart-management",
    "/admin/mart-overview",
    "/admin/mart-admin/accounts",
  ],
  deal_admin: [
    "/admin/deal-overview",
    "/admin/deal-categories",
    "/admin/settings",
    // [WALLET UPDATE] Deal Admin Accounts
    "/admin/deal-admin/accounts",
  ],
  job_admin: [
    "/admin/job-listings",
    "/admin/employers",
    "/admin/jobs",
    // [WALLET UPDATE] Job Admin Accounts
    "/admin/job-admin/accounts",
  ],
  call_center: ["/admin/bookings", "/admin/requests", "/admin/contacts", "/admin/chat-history"],
};

export const isGlobalAdminRole = (role?: string | null) =>
  GLOBAL_ADMIN_ROLES.includes(role as RoleKey);

export const isAdminPanelRole = (role?: string | null) =>
  ADMIN_PANEL_ROLES.includes(role as RoleKey);

export const canAccessAdminPath = (role: string | null | undefined, path: string) => {
  const allowed = ADMIN_ACCESS_BY_ROLE[role as RoleKey];
  if (!allowed) return false;
  if (allowed === "*") return true;
  return allowed.some((item) => path === item || path.startsWith(`${item}/`));
};

export const getFirstAdminPathForRole = (role: string | null | undefined) => {
  const allowed = ADMIN_ACCESS_BY_ROLE[role as RoleKey];
  if (!allowed) return null;
  if (allowed === "*") return "/admin/smart-dashboard";
  return allowed[0] || null;
};
