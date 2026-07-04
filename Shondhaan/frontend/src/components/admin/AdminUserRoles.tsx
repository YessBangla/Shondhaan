import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw, Search, UserPlus, X, Users as UsersIcon } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import { ROLES, getRoleConfig } from "@/config/roles";
import { motion, AnimatePresence } from "framer-motion";

type AppRole = Database["public"]["Enums"]["app_role"];

// All 14 roles sourced from central config so labels/icons/gradients stay consistent.
const ROLE_OPTIONS = ROLES.map((r) => ({
  value: r.key as AppRole,
  label: r.labelBn,
  gradient: r.gradient,
  icon: r.icon,
}));

interface UserWithRoles {
  user_id: string;
  display_name: string | null;
  phone: string | null;
  roles: { id: string; role: AppRole }[];
}

const getInitials = (name: string | null, fallback: string) => {
  const n = (name || "").trim();
  if (!n) return fallback.slice(0, 2).toUpperCase();
  const parts = n.split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || n.slice(0, 2).toUpperCase();
};

const AdminUserRoles = () => {
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [addingRole, setAddingRole] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);

    // Get all profiles
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name, phone")
      .order("created_at", { ascending: false });

    // Get all roles
    const { data: roles } = await supabase
      .from("user_roles")
      .select("id, user_id, role");

    if (profiles) {
      const userMap: UserWithRoles[] = profiles.map((p) => ({
        user_id: p.user_id,
        display_name: p.display_name,
        phone: p.phone,
        roles: roles?.filter((r) => r.user_id === p.user_id) || [],
      }));
      setUsers(userMap);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addRole = async (userId: string, role: AppRole) => {
    setAddingRole(userId);
    const { error } = await supabase
      .from("user_roles")
      .insert({ user_id: userId, role });

    if (!error) await fetchData();
    setAddingRole(null);
  };

  const removeRole = async (roleId: string) => {
    setRemovingId(roleId);
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("id", roleId);

    if (!error) await fetchData();
    setRemovingId(null);
  };

  const filtered = search.trim()
    ? users.filter(
        (u) =>
          u.display_name?.toLowerCase().includes(search.toLowerCase()) ||
          u.phone?.includes(search) ||
          u.user_id.includes(search)
      )
    : users;

  if (loading) return <div className="py-8 text-center text-muted-foreground">লোড হচ্ছে...</div>;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-emerald-600 text-primary-foreground flex items-center justify-center shadow-sm shrink-0">
            <UsersIcon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h3 className="font-heading text-[15px] md:text-base font-bold text-foreground truncate">
              ইউজার রোল ম্যানেজমেন্ট
            </h3>
            <p className="text-[11px] text-muted-foreground">
              মোট {users.length} জন ইউজার · {ROLE_OPTIONS.length}টি রোল
            </p>
          </div>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium text-foreground hover:bg-secondary transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" /> রিফ্রেশ
        </button>
      </div>

      {/* Summary chips — every role, colour-coded */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-2">
        {ROLE_OPTIONS.map((r) => {
          const count = users.filter((u) => u.roles.some((ur) => ur.role === r.value)).length;
          const Icon = r.icon;
          return (
            <div
              key={r.value}
              className="group relative overflow-hidden rounded-xl border border-border/60 bg-card p-2.5 hover:shadow-sm transition-all"
            >
              <div className={`absolute -top-6 -right-6 h-16 w-16 rounded-full bg-gradient-to-br ${r.gradient} opacity-10`} />
              <div className="relative flex items-center gap-2">
                <div className={`h-8 w-8 shrink-0 rounded-lg bg-gradient-to-br ${r.gradient} text-white flex items-center justify-center shadow-sm`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[15px] font-bold text-foreground leading-none">{count}</p>
                  <p className="text-[10px] text-muted-foreground truncate mt-0.5">{r.label}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="নাম, ফোন বা আইডি দিয়ে খুঁজুন…"
          className="w-full rounded-xl border border-input bg-background pl-9 pr-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      {/* User list */}
      <div className="space-y-2.5">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted/30 py-12 text-center">
            <UsersIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">কোনো ইউজার পাওয়া যায়নি</p>
          </div>
        ) : (
          filtered.map((u) => {
            const availableRoles = ROLE_OPTIONS.filter(
              (r) => !u.roles.some((ur) => ur.role === r.value)
            );
            const primary = u.roles[0]?.role;
            const primaryConfig = primary ? getRoleConfig(primary) : undefined;
            const avatarGradient = primaryConfig?.gradient || "from-slate-400 to-slate-600";

            return (
              <motion.div
                key={u.user_id}
                layout
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-border/60 bg-card p-3.5 hover:border-primary/30 hover:shadow-sm transition-all"
              >
                {/* Identity row */}
                <div className="flex items-center gap-3">
                  <div
                    className={`h-11 w-11 shrink-0 rounded-full bg-gradient-to-br ${avatarGradient} text-white flex items-center justify-center text-xs font-bold shadow-sm ring-2 ring-card`}
                  >
                    {getInitials(u.display_name, u.user_id)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {u.display_name || "নাম নেই"}
                    </p>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                      <span className="font-mono">{u.phone || "ফোন নেই"}</span>
                      <span className="opacity-40">·</span>
                      <span className="font-mono opacity-70">{u.user_id.slice(0, 8)}…</span>
                    </p>
                  </div>
                  <span className="hidden sm:inline-flex items-center rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {u.roles.length} রোল
                  </span>
                </div>

                {/* Divider */}
                <div className="my-3 h-px bg-border/60" />

                {/* Current roles + add */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {u.roles.length === 0 && (
                    <span className="text-[11px] text-muted-foreground italic px-1">
                      কোনো রোল অ্যাসাইন করা নেই
                    </span>
                  )}
                  <AnimatePresence initial={false}>
                    {u.roles.map((r) => {
                      const opt = ROLE_OPTIONS.find((o) => o.value === r.role);
                      const Icon = opt?.icon;
                      return (
                        <motion.span
                          key={r.id}
                          layout
                          initial={{ opacity: 0, scale: 0.85 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.85 }}
                          className={`inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r ${opt?.gradient || "from-slate-500 to-slate-600"} text-white px-2.5 py-1 text-[11px] font-semibold shadow-sm`}
                        >
                          {Icon && <Icon className="h-3 w-3" />}
                          {opt?.label || r.role}
                          <button
                            onClick={() => removeRole(r.id)}
                            disabled={removingId === r.id}
                            className="ml-0.5 rounded-full p-0.5 hover:bg-white/25 transition-colors disabled:opacity-50"
                            title="রোল সরান"
                            aria-label="রোল সরান"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </motion.span>
                      );
                    })}
                  </AnimatePresence>

                  {/* Add role select */}
                  {availableRoles.length > 0 && (
                    <div className="relative inline-flex items-center">
                      <UserPlus className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-primary pointer-events-none" />
                      <select
                        defaultValue=""
                        onChange={(e) => {
                          if (e.target.value) {
                            addRole(u.user_id, e.target.value as AppRole);
                            e.target.value = "";
                          }
                        }}
                        disabled={addingRole === u.user_id}
                        className="appearance-none rounded-full border border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 pl-7 pr-7 py-1 text-[11px] font-medium text-foreground outline-none focus:ring-1 focus:ring-ring disabled:opacity-50 cursor-pointer transition-colors"
                      >
                        <option value="">রোল যোগ করুন…</option>
                        {availableRoles.map((r) => (
                          <option key={r.value} value={r.value}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-primary text-[9px] pointer-events-none">▾</span>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AdminUserRoles;
