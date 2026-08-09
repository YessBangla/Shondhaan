import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw, Check, X, Shield } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import { RESOURCE_LABELS, ALL_RESOURCES, ROLE_LABELS } from "@/hooks/usePermissions";

type AppRole = Database["public"]["Enums"]["app_role"];

const ROLES: AppRole[] = ["super_admin", "admin", "moderator", "call_center", "provider", "user"];
const ACTIONS = [
  { key: "can_read", label: "দেখা" },
  { key: "can_create", label: "তৈরি" },
  { key: "can_update", label: "আপডেট" },
  { key: "can_delete", label: "ডিলিট" },
] as const;

interface Permission {
  id: string;
  role: AppRole;
  resource: string;
  can_create: boolean;
  can_read: boolean;
  can_update: boolean;
  can_delete: boolean;
}

const AdminPermissions = () => {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedRole, setSelectedRole] = useState<AppRole>("moderator");

  const fetchPermissions = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("role_permissions").select("*");
    if (data) setPermissions(data as Permission[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const togglePermission = async (
    role: AppRole,
    resource: string,
    action: string,
    currentValue: boolean
  ) => {
    setSaving(true);
    const existing = permissions.find((p) => p.role === role && p.resource === resource);

    if (existing) {
      const { error } = await supabase
        .from("role_permissions")
        .update({ [action]: !currentValue })
        .eq("id", existing.id);
      if (!error) {
        setPermissions((prev) =>
          prev.map((p) =>
            p.id === existing.id ? { ...p, [action]: !currentValue } : p
          )
        );
      }
    } else {
      const newPerm = {
        role,
        resource,
        can_create: false,
        can_read: false,
        can_update: false,
        can_delete: false,
        [action]: true,
      };
      const { data, error } = await supabase
        .from("role_permissions")
        .insert(newPerm)
        .select()
        .single();
      if (!error && data) {
        setPermissions((prev) => [...prev, data as Permission]);
      }
    }
    setSaving(false);
  };

  const getPermission = (role: AppRole, resource: string) => {
    return permissions.find((p) => p.role === role && p.resource === resource);
  };

  if (loading)
    return (
      <div className="py-8 text-center text-muted-foreground">লোড হচ্ছে...</div>
    );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading text-lg font-bold text-foreground flex items-center gap-2">
          <Shield className="h-5 w-5" /> পারমিশন ম্যানেজমেন্ট
        </h3>
        <button
          onClick={fetchPermissions}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-secondary"
        >
          <RefreshCw className="h-3.5 w-3.5" /> রিফ্রেশ
        </button>
      </div>

      {/* Role selector */}
      <div className="flex flex-wrap gap-2 mb-5">
        {ROLES.map((role) => (
          <button
            key={role}
            onClick={() => setSelectedRole(role)}
            className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
              selectedRole === role
                ? "bg-primary text-white shadow-md"
                : "bg-secondary text-muted-foreground hover:bg-secondary/80"
            }`}
          >
            {ROLE_LABELS[role]}
          </button>
        ))}
      </div>

      {/* Permissions grid */}
      <div className="rounded-xl border border-border overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[1fr_repeat(4,48px)] md:grid-cols-[1fr_repeat(4,80px)] bg-secondary/50 border-b border-border">
          <div className="px-3 py-2.5 text-xs font-semibold text-foreground">
            রিসোর্স
          </div>
          {ACTIONS.map((a) => (
            <div
              key={a.key}
              className="px-1 py-2.5 text-center text-[10px] md:text-xs font-semibold text-muted-foreground"
            >
              {a.label}
            </div>
          ))}
        </div>

        {/* Rows */}
        {ALL_RESOURCES.map((resource, idx) => {
          const perm = getPermission(selectedRole, resource);
          return (
            <div
              key={resource}
              className={`grid grid-cols-[1fr_repeat(4,48px)] md:grid-cols-[1fr_repeat(4,80px)] items-center ${
                idx % 2 === 0 ? "bg-card" : "bg-secondary/20"
              } border-b border-border/50 last:border-b-0`}
            >
              <div className="px-3 py-2.5 text-xs font-medium text-foreground">
                {RESOURCE_LABELS[resource]}
              </div>
              {ACTIONS.map((a) => {
                const value = perm?.[a.key as keyof Permission] as boolean ?? false;
                const isAdmin = selectedRole === "admin";
                return (
                  <div key={a.key} className="flex justify-center py-2">
                    <button
                      onClick={() =>
                        !isAdmin &&
                        togglePermission(selectedRole, resource, a.key, value)
                      }
                      disabled={saving || isAdmin}
                      className={`flex h-7 w-7 items-center justify-center rounded-lg transition-all ${
                        value
                          ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                          : "bg-red-50 text-red-400 hover:bg-red-100"
                      } ${isAdmin ? "opacity-60 cursor-not-allowed" : "active:scale-95"} disabled:pointer-events-none`}
                      title={
                        isAdmin
                          ? "অ্যাডমিনের পারমিশন পরিবর্তন করা যায় না"
                          : value
                          ? "অনুমতি আছে — ক্লিক করে সরান"
                          : "অনুমতি নেই — ক্লিক করে দিন"
                      }
                    >
                      {value ? (
                        <Check className="h-4 w-4" strokeWidth={2.5} />
                      ) : (
                        <X className="h-3.5 w-3.5" strokeWidth={2} />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-[10px] text-muted-foreground">
        💡 অ্যাডমিনের পারমিশন পরিবর্তন করা যায় না — সর্বদা সম্পূর্ণ অ্যাক্সেস থাকবে।
        অন্যান্য রোলের জন্য ✓/✗ বাটনে ক্লিক করে পারমিশন চালু/বন্ধ করুন।
      </p>
    </div>
  );
};

export default AdminPermissions;
