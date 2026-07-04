import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

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
  admin_panel: "অ্যাডমিন প্যানেল",
  call_center_panel: "কল সেন্টার প্যানেল",
  provider_panel: "প্রোভাইডার প্যানেল",
  bookings: "বুকিং",
  services: "সেবা",
  categories: "ক্যাটেগরি",
  offers: "অফার",
  banners: "ব্যানার",
  sections: "সেকশন",
  service_requests: "সেবা রিকোয়েস্ট",
  contact_messages: "মেসেজ",
  job_applications: "আবেদন",
  reviews: "রিভিউ",
  user_roles: "ইউজার রোল",
  site_settings: "সাইট সেটিংস",
};

export const ALL_RESOURCES = Object.keys(RESOURCE_LABELS);

export const ROLE_LABELS: Record<string, string> = {
  super_admin: "সুপার অ্যাডমিন",
  admin: "অ্যাডমিন",
  moderator: "মডারেটর",
  call_center: "কল সেন্টার",
  provider: "প্রোভাইডার",
  user: "ইউজার",
};

export function usePermissions() {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPermissions = useCallback(async () => {
    const { data } = await supabase.from("role_permissions").select("*");
    if (data) setPermissions(data as Permission[]);
  }, []);

  const fetchUserRoles = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    setUserRoles(data?.map((r) => r.role) || []);
  }, [user]);

  useEffect(() => {
    Promise.all([fetchPermissions(), fetchUserRoles()]).then(() => setLoading(false));
  }, [fetchPermissions, fetchUserRoles]);

  const hasPermission = useCallback(
    (resource: string, action: "can_create" | "can_read" | "can_update" | "can_delete") => {
      return userRoles.some((role) => {
        const perm = permissions.find((p) => p.role === role && p.resource === resource);
        return perm?.[action] ?? false;
      });
    },
    [permissions, userRoles]
  );

  return { permissions, userRoles, loading, hasPermission, refetch: fetchPermissions };
}
