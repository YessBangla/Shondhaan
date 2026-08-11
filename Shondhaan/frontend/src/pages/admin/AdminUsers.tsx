import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Search, RefreshCw, UserPlus, Shield, ShieldCheck, ShieldX, KeyRound,
  Mail, Phone, Edit3, Trash2, BadgeCheck, Ban, Lock, X,
  CheckCircle2, AlertCircle, ChevronDown, Users as UsersIcon,
  LayoutGrid, List, UserCircle2,
} from "lucide-react";
import { ROLES, type RoleKey } from "@/config/roles";
import { toast } from "@/hooks/use-toast";
import SavedFiltersMenu from "@/components/admin/SavedFiltersMenu";
import { useBulkSelection } from "@/hooks/useBulkSelection";
import { useBulkPermissions } from "@/hooks/useBulkPermissions";
import BulkSelectToggle from "@/components/admin/BulkSelectToggle";
import BulkSelectCheckbox from "@/components/admin/BulkSelectCheckbox";
import BulkConfirmDialog, { BulkActionTone, BulkImpactRow } from "@/components/admin/BulkConfirmDialog";
import BulkActionsBar from "@/components/admin/BulkActionsBar";

interface UserRow {
  id: string;
  email: string | null;
  phone: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  banned_until: string | null;
  profile: {
    display_name?: string | null;
    phone?: string | null;
    address?: string | null;
    avatar_url?: string | null;
    email?: string | null;
    status?: string;
    status_reason?: string | null;
    is_verified?: boolean;
    nid_number?: string | null;
    notes?: string | null;
  };
  roles: { id: string; user_id: string; role: RoleKey }[];
}

const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700 ring-emerald-300",
  suspended: "bg-amber-100 text-amber-700 ring-amber-300",
  banned: "bg-rose-100 text-rose-700 ring-rose-300",
};
const STATUS_LABEL: Record<string, string> = {
  active: "সক্রিয়", suspended: "সাময়িক স্থগিত", banned: "নিষিদ্ধ",
};

const callFn = async (payload: Record<string, unknown>) => {
  const { data, error } = await supabase.functions.invoke("admin-user-actions", { body: payload });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data;
};

const AdminUsers = () => {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grouped" | "flat">("grouped");
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [pwUser, setPwUser] = useState<UserRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await callFn({ action: "list_users", per_page: 200 });
      setUsers(data.users || []);
    } catch (e: any) {
      toast({ title: "লোড ব্যর্থ", description: e.message, variant: "destructive" });
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      const status = u.profile?.status || "active";
      if (statusFilter !== "all" && status !== statusFilter) return false;
      if (roleFilter !== "all") {
        if (roleFilter === "__none__") {
          if (u.roles.length > 0) return false;
        } else if (!u.roles.some((r) => r.role === roleFilter)) return false;
      }
      if (!q) return true;
      return (
        (u.email || "").toLowerCase().includes(q) ||
        (u.profile?.display_name || "").toLowerCase().includes(q) ||
        (u.phone || u.profile?.phone || "").toLowerCase().includes(q) ||
        u.id.toLowerCase().includes(q)
      );
    });
  }, [users, search, statusFilter, roleFilter]);

  // Bulk selection works against the filtered list (covers grouped + flat views)
  const sel = useBulkSelection(filtered, [search, statusFilter, roleFilter]);
  const perms = useBulkPermissions("user_roles");

  const [pendingBulk, setPendingBulk] = useState<{
    tone: BulkActionTone; title: string; description?: string;
    impacts?: BulkImpactRow[]; confirmLabel?: string; warning?: string;
    run: () => Promise<void> | void;
  } | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const runBulk = async () => {
    if (!pendingBulk) return;
    setBulkLoading(true);
    try { await pendingBulk.run(); } finally { setBulkLoading(false); setPendingBulk(null); }
  };

  const bulkSetStatus = async (status: "active" | "suspended" | "banned") => {
    const ids = sel.selectedIds;
    if (ids.length === 0) return;
    try {
      await Promise.all(ids.map((id) => callFn({ action: "set_status", user_id: id, status })));
      toast({ title: "সফল", description: `${ids.length}টি ইউজার আপডেট হয়েছে` });
      sel.clear();
      load();
    } catch (e: any) {
      toast({ title: "ব্যর্থ", description: e.message, variant: "destructive" });
    }
  };

  const counts = useMemo(() => {
    const c = { total: users.length, active: 0, suspended: 0, banned: 0, verified: 0 };
    users.forEach((u) => {
      const s = u.profile?.status || "active";
      if (s === "active") c.active++;
      else if (s === "suspended") c.suspended++;
      else if (s === "banned") c.banned++;
      if (u.profile?.is_verified) c.verified++;
    });
    return c;
  }, [users]);

  // Per-role counts (one user can appear in multiple roles)
  const roleCounts = useMemo(() => {
    const c: Record<string, number> = { __none__: 0 };
    ROLES.forEach((r) => { c[r.key] = 0; });
    users.forEach((u) => {
      if (u.roles.length === 0) c.__none__++;
      u.roles.forEach((r) => { c[r.role] = (c[r.role] || 0) + 1; });
    });
    return c;
  }, [users]);

  // Group filtered users by their primary (highest priority) role for grouped view
  const grouped = useMemo(() => {
    const map = new Map<string, UserRow[]>();
    ROLES.forEach((r) => map.set(r.key, []));
    map.set("__none__", []);
    filtered.forEach((u) => {
      if (u.roles.length === 0) {
        map.get("__none__")!.push(u);
        return;
      }
      // Use ROLES order as priority — first match wins
      const primary = ROLES.find((r) => u.roles.some((x) => x.role === r.key));
      const key = primary?.key || "__none__";
      map.get(key)!.push(u);
    });
    return map;
  }, [filtered]);

  const toggleGroup = (key: string) =>
    setCollapsedGroups((prev) => ({ ...prev, [key]: !prev[key] }));

  const setStatus = async (u: UserRow, status: string) => {
    let reason: string | null = null;
    if (status !== "active") {
      reason = window.prompt(`কারণ লিখুন (${STATUS_LABEL[status]}):`, "") || null;
    }
    try {
      await callFn({ action: "set_status", user_id: u.id, status, reason });
      toast({ title: "সফল", description: `স্ট্যাটাস: ${STATUS_LABEL[status]}` });
      load();
    } catch (e: any) { toast({ title: "ব্যর্থ", description: e.message, variant: "destructive" }); }
  };

  const setVerified = async (u: UserRow, verified: boolean) => {
    try {
      await callFn({ action: "set_verified", user_id: u.id, verified });
      toast({ title: verified ? "যাচাই করা হয়েছে" : "যাচাই বাতিল" });
      load();
    } catch (e: any) { toast({ title: "ব্যর্থ", description: e.message, variant: "destructive" }); }
  };

  const sendReset = async (u: UserRow) => {
    try {
      await callFn({ action: "send_password_reset", user_id: u.id });
      toast({ title: "রিসেট লিংক পাঠানো হয়েছে", description: u.email || "" });
    } catch (e: any) { toast({ title: "ব্যর্থ", description: e.message, variant: "destructive" }); }
  };

  const deleteUser = async (u: UserRow) => {
    if (!window.confirm(`স্থায়ীভাবে মুছবেন? ${u.email}`)) return;
    try {
      await callFn({ action: "delete_user", user_id: u.id });
      toast({ title: "মুছে ফেলা হয়েছে" });
      load();
    } catch (e: any) { toast({ title: "ব্যর্থ", description: e.message, variant: "destructive" }); }
  };

  const toggleRole = async (u: UserRow, role: RoleKey, has: boolean) => {
    try {
      if (has) {
        const r = u.roles.find((x) => x.role === role);
        if (r) await supabase.from("user_roles").delete().eq("id", r.id);
      } else {
        await supabase.from("user_roles").insert({ user_id: u.id, role });
      }
      load();
    } catch (e: any) { toast({ title: "ব্যর্থ", description: e.message, variant: "destructive" }); }
  };

  // Reusable card renderer so both grouped + flat views look identical
  const renderUserCard = (u: UserRow) => {
    const status = u.profile?.status || "active";
    const name = u.profile?.display_name || "নাম নেই";
    const verified = !!u.profile?.is_verified;
    const checked = sel.isSelected(u.id);
    return (
      <div key={u.id} className={`rounded-2xl border p-3 md:p-4 shadow-sm hover:shadow-md transition-all ${checked ? "border-primary ring-1 ring-primary/40 bg-primary/5" : "border-border bg-card"}`}>
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <BulkSelectCheckbox
              checked={checked}
              onChange={() => sel.toggle(u.id)}
            />
            <div className="h-11 w-11 rounded-full bg-gradient-to-br from-primary to-emerald-600 text-white flex items-center justify-center font-bold shrink-0">
              {(name || "?").slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="font-semibold text-foreground truncate text-sm">{name}</p>
                {verified && <BadgeCheck className="h-4 w-4 text-blue-600 shrink-0" />}
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ${STATUS_STYLES[status]}`}>
                  {STATUS_LABEL[status]}
                </span>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-0.5 flex-wrap">
                {u.email && <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{u.email}</span>}
                {(u.phone || u.profile?.phone) && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{u.phone || u.profile?.phone}</span>}
              </div>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {u.roles.length === 0 ? (
                  <span className="text-[10px] text-muted-foreground italic">কোনো রোল অ্যাসাইন করা হয়নি</span>
                ) : u.roles.map((r) => {
                  const cfg = ROLES.find((x) => x.key === r.role);
                  return (
                    <span key={r.id} className={`inline-flex items-center gap-1 rounded-full bg-gradient-to-r ${cfg?.gradient || "from-gray-400 to-gray-500"} px-2 py-0.5 text-[10px] font-medium text-white`}>
                      <Shield className="h-2.5 w-2.5" />{cfg?.labelBn || r.role}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button onClick={() => setEditing(u)} className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[11px] hover:bg-secondary"><Edit3 className="h-3.5 w-3.5" />এডিট</button>
            <button onClick={() => setPwUser(u)} className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[11px] hover:bg-secondary"><KeyRound className="h-3.5 w-3.5" />পাসওয়ার্ড</button>
            {verified ? (
              <button onClick={() => setVerified(u, false)} className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[11px] hover:bg-secondary"><ShieldX className="h-3.5 w-3.5" />Unverify</button>
            ) : (
              <button onClick={() => setVerified(u, true)} className="inline-flex items-center gap-1 rounded-lg border border-blue-300 bg-blue-50 px-2.5 py-1.5 text-[11px] text-blue-700 hover:bg-blue-100"><ShieldCheck className="h-3.5 w-3.5" />Verify</button>
            )}
            {status === "active" ? (
              <>
                <button onClick={() => setStatus(u, "suspended")} className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-700 hover:bg-amber-100"><Lock className="h-3.5 w-3.5" />Suspend</button>
                <button onClick={() => setStatus(u, "banned")} className="inline-flex items-center gap-1 rounded-lg border border-rose-300 bg-rose-50 px-2.5 py-1.5 text-[11px] text-rose-700 hover:bg-rose-100"><Ban className="h-3.5 w-3.5" />Ban</button>
              </>
            ) : (
              <button onClick={() => setStatus(u, "active")} className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-[11px] text-emerald-700 hover:bg-emerald-100"><CheckCircle2 className="h-3.5 w-3.5" />সক্রিয় করুন</button>
            )}
            <button onClick={() => deleteUser(u)} className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[11px] text-rose-600 hover:bg-rose-50"><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
        </div>

        {/* Role assignment grid — neatly laid out, not crammed */}
        <details className="mt-3 group">
          <summary className="cursor-pointer list-none flex items-center justify-between rounded-lg bg-secondary/40 hover:bg-secondary px-2.5 py-1.5">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">রোল অ্যাসাইনমেন্ট</span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground group-open:rotate-180 transition-transform" />
          </summary>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5 mt-2">
            {ROLES.map((r) => {
              const has = u.roles.some((x) => x.role === r.key);
              const Icon = r.icon;
              return (
                <button
                  key={r.key}
                  onClick={() => toggleRole(u, r.key, has)}
                  className={`flex items-center gap-1.5 text-[11px] rounded-lg px-2 py-1.5 border transition-all ${
                    has
                      ? `bg-gradient-to-r ${r.gradient} text-white border-transparent shadow-sm`
                      : "border-border bg-background hover:bg-secondary text-foreground"
                  }`}
                  title={r.descriptionBn}
                >
                  <Icon className="h-3 w-3 shrink-0" />
                  <span className="truncate">{r.labelBn}</span>
                  {has && <CheckCircle2 className="h-3 w-3 ml-auto shrink-0" />}
                </button>
              );
            })}
          </div>
        </details>

        {u.profile?.status_reason && status !== "active" && (
          <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-800">
            <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>কারণ: {u.profile.status_reason}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {[
          { l: "মোট ইউজার", v: counts.total, c: "text-foreground" },
          { l: "সক্রিয়", v: counts.active, c: "text-emerald-600" },
          { l: "স্থগিত", v: counts.suspended, c: "text-amber-600" },
          { l: "নিষিদ্ধ", v: counts.banned, c: "text-rose-600" },
          { l: "যাচাইকৃত", v: counts.verified, c: "text-blue-600" },
        ].map((s) => (
          <div key={s.l} className="rounded-xl border border-border bg-card p-3 text-center">
            <p className={`text-xl font-bold ${s.c}`}>{s.v}</p>
            <p className="text-[10px] text-muted-foreground">{s.l}</p>
          </div>
        ))}
      </div>

      {/* Role tabs — Laravel Nova / enterprise style */}
      <div className="rounded-2xl border border-border bg-card p-2">
        <div className="flex gap-1.5 overflow-x-auto scrollbar-thin pb-0.5">
          <RoleTab
            active={roleFilter === "all"}
            onClick={() => setRoleFilter("all")}
            label="সব ইউজার"
            count={users.length}
            icon={<UsersIcon className="h-3.5 w-3.5" />}
            gradient="from-slate-600 to-slate-800"
          />
          {ROLES.map((r) => (
            <RoleTab
              key={r.key}
              active={roleFilter === r.key}
              onClick={() => setRoleFilter(r.key)}
              label={r.labelBn}
              count={roleCounts[r.key] || 0}
              icon={<r.icon className="h-3.5 w-3.5" />}
              gradient={r.gradient}
            />
          ))}
          <RoleTab
            active={roleFilter === "__none__"}
            onClick={() => setRoleFilter("__none__")}
            label="রোল ছাড়া"
            count={roleCounts.__none__ || 0}
            icon={<UserCircle2 className="h-3.5 w-3.5" />}
            gradient="from-gray-400 to-gray-600"
          />
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="নাম, ইমেইল, ফোন বা আইডি…"
            className="w-full rounded-xl border border-input bg-background pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-input bg-background px-3 py-2.5 text-sm">
          <option value="all">সব স্ট্যাটাস</option>
          <option value="active">সক্রিয়</option>
          <option value="suspended">স্থগিত</option>
          <option value="banned">নিষিদ্ধ</option>
        </select>
        <SavedFiltersMenu<{ search: string; statusFilter: string; roleFilter: string }>
          scope="admin_users"
          currentState={{ search, statusFilter, roleFilter }}
          onApply={(s) => {
            if (typeof s?.search === "string") setSearch(s.search);
            if (typeof s?.statusFilter === "string") setStatusFilter(s.statusFilter);
            if (typeof s?.roleFilter === "string") setRoleFilter(s.roleFilter);
          }}
          hasActiveFilters={!!search || statusFilter !== "all" || roleFilter !== "all"}
        />
        {filtered.length > 0 && (
          <BulkSelectToggle
            allSelected={sel.allSelected}
            someSelected={sel.someSelected}
            selectedCount={sel.selectedCount}
            totalCount={filtered.length}
            onToggle={sel.toggleAll}
          />
        )}
        {/* View mode toggle */}
        <div className="inline-flex rounded-xl border border-border bg-background p-0.5">
          <button
            onClick={() => setViewMode("grouped")}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-2 text-xs font-medium transition ${
              viewMode === "grouped" ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
            title="রোল অনুসারে গ্রুপ"
          >
            <LayoutGrid className="h-3.5 w-3.5" /> গ্রুপড
          </button>
          <button
            onClick={() => setViewMode("flat")}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-2 text-xs font-medium transition ${
              viewMode === "flat" ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
            title="সাধারণ তালিকা"
          >
            <List className="h-3.5 w-3.5" /> তালিকা
          </button>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2.5 text-sm hover:bg-secondary">
          <RefreshCw className="h-4 w-4" /> রিফ্রেশ
        </button>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2.5 text-sm font-semibold text-white hover:opacity-90">
          <UserPlus className="h-4 w-4" /> নতুন ইউজার
        </button>
      </div>

      {/* User list */}
      {loading ? (
        <div className="py-12 text-center text-muted-foreground">লোড হচ্ছে...</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card py-16 text-center">
          <UsersIcon className="h-10 w-10 text-muted-foreground/50 mx-auto mb-2" />
          <p className="text-sm font-medium text-foreground">কোনো ইউজার পাওয়া যায়নি</p>
          <p className="text-xs text-muted-foreground mt-1">ফিল্টার বদলে আবার চেষ্টা করুন</p>
        </div>
      ) : viewMode === "flat" || roleFilter !== "all" ? (
        <div className="space-y-2">
          {filtered.map(renderUserCard)}
        </div>
      ) : (
        // Grouped view — Laravel Nova style: collapsible sections per role
        <div className="space-y-3">
          {[
            ...ROLES.map((r) => ({
              key: r.key as string,
              labelBn: r.labelBn,
              labelEn: r.labelEn,
              gradient: r.gradient,
              accent: r.accent,
              icon: r.icon,
              description: r.descriptionBn,
            })),
            {
              key: "__none__",
              labelBn: "রোল অ্যাসাইন করা হয়নি",
              labelEn: "Unassigned",
              gradient: "from-gray-400 to-gray-600",
              accent: "text-gray-700",
              icon: UserCircle2,
              description: "এই ইউজারদের এখনো কোনো রোল দেওয়া হয়নি।",
            },
          ].map((g) => {
            const list = grouped.get(g.key) || [];
            if (list.length === 0) return null;
            const isCollapsed = !!collapsedGroups[g.key];
            const Icon = g.icon;
            return (
              <section
                key={g.key}
                className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm"
              >
                <button
                  onClick={() => toggleGroup(g.key)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/40 transition"
                >
                  <div className={`shrink-0 p-2 rounded-xl bg-gradient-to-br ${g.gradient} text-white shadow-sm`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm text-foreground">{g.labelBn}</h3>
                      <span className={`inline-flex items-center justify-center min-w-[1.5rem] h-5 px-1.5 rounded-full text-[10px] font-semibold bg-gradient-to-r ${g.gradient} text-white`}>
                        {list.length}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">{g.description}</p>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${
                      isCollapsed ? "" : "rotate-180"
                    }`}
                  />
                </button>
                {!isCollapsed && (
                  <div className="border-t border-border p-3 space-y-2 bg-background/40">
                    {list.map(renderUserCard)}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {showCreate && <CreateUserModal onClose={() => setShowCreate(false)} onCreated={load} />}
      {editing && <EditUserModal user={editing} onClose={() => setEditing(null)} onSaved={load} />}
      {pwUser && <PasswordModal user={pwUser} onClose={() => setPwUser(null)} onReset={() => sendReset(pwUser)} />}

      <BulkActionsBar
        count={sel.selectedCount}
        onClear={sel.clear}
        actions={[
          { key: "activate", label: "সক্রিয়", icon: <CheckCircle2 className="h-3.5 w-3.5" />, variant: "primary",
            disabled: !perms.canUpdate, disabledReason: perms.reasonFor("can_update"),
            onClick: () => setPendingBulk({
              tone: "approve", title: "নির্বাচিত ইউজারদের সক্রিয় করবেন?",
              description: "তারা অ্যাকাউন্টে লগইন ও স্বাভাবিক ব্যবহার করতে পারবে।",
              impacts: [
                { label: "স্ট্যাটাস", value: "সক্রিয় (active)" },
                { label: "লগইন অ্যাক্সেস", value: "চালু" },
              ],
              confirmLabel: "হ্যাঁ, সক্রিয় করুন", run: () => bulkSetStatus("active"),
            })},
          { key: "suspend", label: "স্থগিত", icon: <Lock className="h-3.5 w-3.5" />,
            disabled: !perms.canUpdate, disabledReason: perms.reasonFor("can_update"),
            onClick: () => setPendingBulk({
              tone: "reject", title: "নির্বাচিত ইউজারদের স্থগিত করবেন?",
              description: "অস্থায়ী ব্লক — পরে আবার সক্রিয় করা যাবে।",
              impacts: [
                { label: "স্ট্যাটাস", value: "স্থগিত (suspended)" },
                { label: "লগইন অ্যাক্সেস", value: "বন্ধ" },
              ],
              warning: "স্থগিত ইউজার লগইন করতে পারবে না।",
              confirmLabel: "হ্যাঁ, স্থগিত করুন", run: () => bulkSetStatus("suspended"),
            })},
          { key: "ban", label: "নিষিদ্ধ", icon: <Ban className="h-3.5 w-3.5" />, variant: "destructive",
            disabled: !perms.canDelete, disabledReason: perms.reasonFor("can_delete"),
            onClick: () => setPendingBulk({
              tone: "delete", title: "নির্বাচিত ইউজারদের নিষিদ্ধ করবেন?",
              description: "স্থায়ী ব্লক — অ্যাকাউন্ট ও সেশন বন্ধ হবে।",
              impacts: [
                { label: "স্ট্যাটাস", value: "নিষিদ্ধ (banned)" },
                { label: "লগইন অ্যাক্সেস", value: "বন্ধ" },
                { label: "সেশন", value: "সব বাতিল" },
              ],
              warning: "নিষিদ্ধ ইউজারের সব সেশন বন্ধ হবে এবং নতুন লগইন ব্লক হবে।",
              confirmLabel: "হ্যাঁ, নিষিদ্ধ করুন", run: () => bulkSetStatus("banned"),
            })},
        ]}
      />

      <BulkConfirmDialog
        open={!!pendingBulk}
        onOpenChange={(o) => { if (!o) setPendingBulk(null); }}
        onConfirm={runBulk}
        count={sel.selectedCount}
        itemLabel="ইউজার"
        tone={pendingBulk?.tone || "neutral"}
        title={pendingBulk?.title}
        description={pendingBulk?.description}
        impacts={pendingBulk?.impacts}
        warning={pendingBulk?.warning}
        confirmLabel={pendingBulk?.confirmLabel}
        disabledReason={pendingBulk?.tone === "delete" ? perms.reasonFor("can_delete") : perms.reasonFor("can_update")}
        loading={bulkLoading}
      />
    </div>
  );
};

/* ---------------- Role Tab ---------------- */

const RoleTab = ({
  active, onClick, label, count, icon, gradient,
}: {
  active: boolean; onClick: () => void; label: string; count: number;
  icon: React.ReactNode; gradient: string;
}) => (
  <button
    onClick={onClick}
    className={`group shrink-0 inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-all whitespace-nowrap ${
      active
        ? `bg-gradient-to-r ${gradient} text-white shadow-md`
        : "bg-secondary/50 text-foreground hover:bg-secondary"
    }`}
  >
    <span className={active ? "text-white" : "text-muted-foreground group-hover:text-foreground"}>
      {icon}
    </span>
    <span>{label}</span>
    <span
      className={`inline-flex items-center justify-center min-w-[1.25rem] h-4 px-1 rounded-full text-[10px] font-bold ${
        active ? "bg-white/25 text-white" : "bg-background text-muted-foreground"
      }`}
    >
      {count}
    </span>
  </button>
);

/* ---------------- Modals ---------------- */

const ModalShell = ({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-3" onClick={onClose}>
    <div className="w-full max-w-md rounded-2xl bg-card shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between border-b border-border px-4 py-3 sticky top-0 bg-card">
        <h3 className="font-bold text-foreground">{title}</h3>
        <button onClick={onClose} className="p-1 rounded hover:bg-secondary"><X className="h-4 w-4" /></button>
      </div>
      <div className="p-4 space-y-3">{children}</div>
    </div>
  </div>
);

const Field = ({ label, ...rest }: any) => (
  <label className="block">
    <span className="text-xs font-medium text-foreground">{label}</span>
    <input {...rest} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring" />
  </label>
);

const CreateUserModal = ({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) => {
  const [form, setForm] = useState({ email: "", password: "", display_name: "", phone: "" });
  const [roles, setRoles] = useState<RoleKey[]>(["user"]);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      await callFn({ action: "create_user", ...form, roles });
      toast({ title: "ইউজার তৈরী হয়েছে" });
      onCreated(); onClose();
    } catch (e: any) { toast({ title: "ব্যর্থ", description: e.message, variant: "destructive" }); }
    setLoading(false);
  };

  return (
    <ModalShell title="নতুন ইউজার তৈরী" onClose={onClose}>
      <Field label="ইমেইল *" type="email" value={form.email} onChange={(e: any) => setForm({ ...form, email: e.target.value })} />
      <Field label="পাসওয়ার্ড *" type="text" value={form.password} onChange={(e: any) => setForm({ ...form, password: e.target.value })} />
      <Field label="পূর্ণ নাম" value={form.display_name} onChange={(e: any) => setForm({ ...form, display_name: e.target.value })} />
      <Field label="ফোন" value={form.phone} onChange={(e: any) => setForm({ ...form, phone: e.target.value })} />
      <div>
        <p className="text-xs font-medium mb-1.5">রোল অ্যাসাইন</p>
        <div className="flex flex-wrap gap-1.5">
          {ROLES.map((r) => {
            const has = roles.includes(r.key);
            return (
              <button key={r.key} type="button"
                onClick={() => setRoles(has ? roles.filter((x) => x !== r.key) : [...roles, r.key])}
                className={`text-[10px] rounded-full px-2 py-1 border ${has ? `bg-gradient-to-r ${r.gradient} text-white border-transparent` : "border-border"}`}>
                {has ? "✓ " : "+ "}{r.labelBn}
              </button>
            );
          })}
        </div>
      </div>
      <button onClick={submit} disabled={loading || !form.email || !form.password}
        className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-white disabled:opacity-50">
        {loading ? "তৈরী হচ্ছে…" : "তৈরী করুন"}
      </button>
    </ModalShell>
  );
};

const EditUserModal = ({ user, onClose, onSaved }: { user: UserRow; onClose: () => void; onSaved: () => void }) => {
  const [form, setForm] = useState({
    display_name: user.profile?.display_name || "",
    phone: user.phone || user.profile?.phone || "",
    email: user.email || "",
    address: user.profile?.address || "",
    nid_number: user.profile?.nid_number || "",
    notes: user.profile?.notes || "",
  });
  const [loading, setLoading] = useState(false);

  const save = async () => {
    setLoading(true);
    try {
      await callFn({ action: "update_profile", user_id: user.id, ...form });
      toast({ title: "আপডেট সফল" });
      onSaved(); onClose();
    } catch (e: any) { toast({ title: "ব্যর্থ", description: e.message, variant: "destructive" }); }
    setLoading(false);
  };

  return (
    <ModalShell title="প্রোফাইল এডিট" onClose={onClose}>
      <Field label="পূর্ণ নাম" value={form.display_name} onChange={(e: any) => setForm({ ...form, display_name: e.target.value })} />
      <Field label="ইমেইল" value={form.email} onChange={(e: any) => setForm({ ...form, email: e.target.value })} />
      <Field label="ফোন" value={form.phone} onChange={(e: any) => setForm({ ...form, phone: e.target.value })} />
      <Field label="ঠিকানা" value={form.address} onChange={(e: any) => setForm({ ...form, address: e.target.value })} />
      <Field label="NID নম্বর" value={form.nid_number} onChange={(e: any) => setForm({ ...form, nid_number: e.target.value })} />
      <label className="block">
        <span className="text-xs font-medium">অ্যাডমিন নোট</span>
        <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
          rows={3} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
      </label>
      <button onClick={save} disabled={loading}
        className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-white disabled:opacity-50">
        {loading ? "সেভ হচ্ছে…" : "সেভ করুন"}
      </button>
    </ModalShell>
  );
};

const PasswordModal = ({ user, onClose, onReset }: { user: UserRow; onClose: () => void; onReset: () => void }) => {
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);

  const setNew = async () => {
    if (pw.length < 6) { toast({ title: "কমপক্ষে ৬ অক্ষর", variant: "destructive" }); return; }
    setLoading(true);
    try {
      await callFn({ action: "set_password", user_id: user.id, password: pw });
      toast({ title: "পাসওয়ার্ড আপডেট হয়েছে" });
      onClose();
    } catch (e: any) { toast({ title: "ব্যর্থ", description: e.message, variant: "destructive" }); }
    setLoading(false);
  };

  return (
    <ModalShell title={`পাসওয়ার্ড — ${user.profile?.display_name || user.email}`} onClose={onClose}>
      <div className="rounded-lg bg-secondary p-3 text-xs text-muted-foreground">
        <p className="font-medium text-foreground mb-1">অপশন ১: রিসেট লিংক পাঠান</p>
        <p>ইউজারের ইমেইলে ({user.email}) পাসওয়ার্ড রিসেট লিংক যাবে।</p>
        <button onClick={() => { onReset(); onClose(); }}
          className="mt-2 w-full rounded-lg border border-border bg-card py-2 text-xs font-medium hover:bg-background">
          <Mail className="inline h-3 w-3 mr-1" />রিসেট লিংক পাঠান
        </button>
      </div>
      <div className="rounded-lg border border-border p-3">
        <p className="text-xs font-medium text-foreground mb-1.5">অপশন ২: সরাসরি নতুন পাসওয়ার্ড সেট করুন</p>
        <input type="text" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="নতুন পাসওয়ার্ড…"
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
        <button onClick={setNew} disabled={loading || pw.length < 6}
          className="mt-2 w-full rounded-lg bg-primary py-2 text-xs font-semibold text-white disabled:opacity-50">
          {loading ? "সেভ হচ্ছে…" : "সেট করুন"}
        </button>
      </div>
    </ModalShell>
  );
};

export default AdminUsers;