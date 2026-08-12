import { supabase } from "@/integrations/supabase/client";
import { ROLES, type RoleKey } from "@/config/roles";
import { getMySqlAuth } from "@/lib/mysqlAuth";

// Priority order: highest privilege first. The first role the user has wins.
const ROLE_PRIORITY: RoleKey[] = [
  "super_admin",
  "admin",
  "mart_admin",
  "service_admin",
  "moderator",
  "finance",
  "supervisor",
  "call_center",
  "representative",
  "provider",
  "mart_vendor",
  "mart_delivery",
  "mart_cs",
  "yessdeal_seller",
  "employer",
  "user",
];

/**
 * Returns the dashboard/panel path that the currently logged-in user should
 * land on after sign-in, based on their highest-priority role.
 * Falls back to `/dashboard` (Client Dashboard) when no role is found.
 */
export async function getRoleRedirectPath(): Promise<string> {
  const mysqlRole = getMySqlAuth()?.user.type;
  if (mysqlRole) {
    const cfg = ROLES.find((r) => r.key === mysqlRole);
    if (cfg) return cfg.panelPath;
  }

  try {
    const { data, error } = await supabase.rpc("get_my_roles");
    if (error) return "/dashboard";
    const roles = (data ?? []) as string[];
    for (const key of ROLE_PRIORITY) {
      if (roles.includes(key)) {
        const cfg = ROLES.find((r) => r.key === key);
        if (cfg) return cfg.panelPath;
      }
    }
    return "/dashboard";
  } catch {
    return "/dashboard";
  }
}

function getProfilePathForRole(role: string): string {
  switch (role) {
    case "mart_vendor":
      return "/profile";
    case "provider":
      return "/provider?tab=profile";
    case "employer":
      return "/employer?tab=profile";
    case "yessdeal_seller":
      return "/yessdeal";
    default:
      return "/profile";
  }
}

/**
 * Returns the profile/settings path for the current user's role.
 * Sellers and vendors use their own panel profile/settings screen.
 */
export async function getRoleProfilePath(): Promise<string> {
  const mysqlRole = getMySqlAuth()?.user.type;
  if (mysqlRole) return getProfilePathForRole(mysqlRole);

  try {
    const { data, error } = await supabase.rpc("get_my_roles");
    if (error) return "/profile";
    const roles = (data ?? []) as string[];
    for (const key of ROLE_PRIORITY) {
      if (roles.includes(key)) return getProfilePathForRole(key);
    }
    return "/profile";
  } catch {
    return "/profile";
  }
}
