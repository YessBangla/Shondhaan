import { useMemo } from "react";
import { usePermissions } from "@/hooks/usePermissions";

/**
 * Centralized permission checks for admin bulk actions.
 * - super_admin / admin always get full access (matches existing app convention).
 * - Otherwise, falls back to role_permissions (resource + action).
 */
type Action = "can_create" | "can_read" | "can_update" | "can_delete";

export function useBulkPermissions(resource: string) {
  const { hasPermission, userRoles, loading } = usePermissions();

  return useMemo(() => {
    const isSuper = userRoles.includes("super_admin") || userRoles.includes("admin");
    const can = (action: Action) => isSuper || hasPermission(resource, action);
    const reasonFor = (action: Action) => {
      if (loading) return "পারমিশন লোড হচ্ছে...";
      if (can(action)) return undefined;
      const map: Record<Action, string> = {
        can_create: "তৈরি করার পারমিশন নেই",
        can_read: "দেখার পারমিশন নেই",
        can_update: "আপডেট করার পারমিশন নেই",
        can_delete: "মুছে ফেলার পারমিশন নেই",
      };
      return map[action];
    };
    return {
      loading,
      isSuper,
      canUpdate: can("can_update"),
      canDelete: can("can_delete"),
      canCreate: can("can_create"),
      canRead: can("can_read"),
      /** Returns undefined when allowed; reason text when blocked. */
      reasonFor,
    };
  }, [hasPermission, userRoles, loading, resource]);
}