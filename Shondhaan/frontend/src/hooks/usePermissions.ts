import { useCallback, useMemo } from "react";
import { getMySqlAuth } from "@/lib/mysqlAuth";
import { isGlobalAdminRole } from "@/config/adminAccess";

export interface Permission {
  id: string;
  role: string;
  resource: string;
  can_create: boolean;
  can_read: boolean;
  can_update: boolean;
  can_delete: boolean;
}

export const RESOURCE_LABELS: Record<string, string> = {
  admin_panel: "Admin panel",
  call_center_panel: "Call center panel",
  provider_panel: "Provider panel",
  bookings: "Bookings",
  services: "Services",
  categories: "Categories",
  offers: "Offers",
  banners: "Banners",
  sections: "Sections",
  service_requests: "Service requests",
  contact_messages: "Contact messages",
  job_applications: "Job applications",
  reviews: "Reviews",
  user_roles: "User roles",
  site_settings: "Site settings",
  deals: "Deals",
  mart: "Mart",
  employers: "Employers",
};

export const ALL_RESOURCES = Object.keys(RESOURCE_LABELS);

export const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  service_admin: "Service Admin",
  mart_admin: "Mart Admin",
  deal_admin: "Deal Admin",
  job_admin: "Job Admin",
  moderator: "Moderator",
  call_center: "Call Center",
  provider: "Provider",
  user: "User",
};

const RESOURCE_ACCESS_BY_ROLE: Record<string, string[]> = {
  service_admin: [
    "admin_panel",
    "bookings",
    "services",
    "categories",
    "offers",
    "banners",
    "sections",
    "service_requests",
    "contact_messages",
    "reviews",
    "site_settings",
  ],
  mart_admin: ["admin_panel", "mart", "site_settings"],
  deal_admin: ["admin_panel", "deals", "categories", "site_settings"],
  job_admin: ["admin_panel", "job_applications", "employers", "site_settings"],
  call_center: ["call_center_panel", "bookings", "service_requests", "contact_messages"],
};

export function usePermissions() {
  const mysqlRole = getMySqlAuth()?.user.type;
  const userRoles = useMemo(() => (mysqlRole ? [mysqlRole] : []), [mysqlRole]);

  const hasPermission = useCallback(
    (resource: string, _action: "can_create" | "can_read" | "can_update" | "can_delete") => {
      if (!mysqlRole) return false;
      if (isGlobalAdminRole(mysqlRole)) return true;
      return RESOURCE_ACCESS_BY_ROLE[mysqlRole]?.includes(resource) ?? false;
    },
    [mysqlRole]
  );

  return {
    permissions: [] as Permission[],
    userRoles,
    loading: false,
    hasPermission,
    refetch: async () => undefined,
  };
}
