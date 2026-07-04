import { supabase } from "@/integrations/supabase/client";
import { getMySqlAuth } from "@/lib/mysqlAuth";
import type { RoleKey } from "@/config/roles";

const ADMIN_ROLES: RoleKey[] = ["admin", "super_admin"];

export async function hasStaffRoleAccess(userId: string | number, allowedRoles: RoleKey[]) {
  const mysqlRole = getMySqlAuth()?.user.type;
  if (mysqlRole) {
    return allowedRoles.includes(mysqlRole) || ADMIN_ROLES.includes(mysqlRole);
  }

  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  const roles = data?.map((row) => row.role) || [];

  return roles.some((role) => allowedRoles.includes(role) || ADMIN_ROLES.includes(role));
}
