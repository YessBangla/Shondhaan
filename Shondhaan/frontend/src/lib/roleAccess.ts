import { getMySqlAuth } from "@/lib/mysqlAuth";
import type { RoleKey } from "@/config/roles";
import { isGlobalAdminRole } from "@/config/adminAccess";

export async function hasStaffRoleAccess(_userId: string | number, allowedRoles: RoleKey[]) {
  const mysqlRole = getMySqlAuth()?.user.type;
  return Boolean(mysqlRole && (allowedRoles.includes(mysqlRole) || isGlobalAdminRole(mysqlRole)));
}
