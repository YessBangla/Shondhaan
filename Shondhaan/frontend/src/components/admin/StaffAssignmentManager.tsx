import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { divisions } from "@/data/locations";
import { toast } from "sonner";
import { getMySqlAuth, listMySqlUsers, updateMySqlUserType, createMySqlUser } from "@/lib/mysqlAuth";
import { INDIVIDUAL_API_BASE_URL } from "@/lib/api";
import { ROLES, type RoleKey } from "@/config/roles";
import {
  Trash2, UserPlus, Shield, Briefcase, Loader2, Search, Layers, Package,
  MapPin, Boxes, Users, ChevronRight, Sparkles, X, Check, Settings2
} from "lucide-react";

type Mode = "super_admin" | "admin";

interface Props {
  mode: Mode;
  /** When set, layout becomes single-user (used inside role detail page). */
  lockedUserId?: string;
}

interface ModuleRow {
  id: string;
  module_key: string;
  label_bn: string;
  label_en: string | null;
  category: string;
  applicable_roles: string[];
}

interface UserRow {
  user_id: string;
  mysql_id?: number;
  full_name: string | null;
  email: string | null;
  mobile?: string | null;
  address?: string | null;
  type: string;
  email_verified?: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

interface AssignmentRow {
  id: string;
  assigned_to: string;
  assigned_to_name: string | null;
  assigned_to_role: string;
  assigned_by: string;
  scope_type: string;
  scope_value: string;
  scope_label: string | null;
  priority: string;
  notes: string | null;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  permissions?: any;
}

type ScopeType = "module" | "service" | "category" | "area";

interface ScopeOption { value: string; label: string; hint?: string; }

const PERMISSION_KEYS: { key: string; label: string; icon: string }[] = [
  { key: "view", label: "দেখা", icon: "👁️" },
  { key: "manage_bookings", label: "বুকিং ম্যানেজ", icon: "📋" },
  { key: "edit", label: "এডিট", icon: "✏️" },
  { key: "delete", label: "মুছা", icon: "🗑️" },
  { key: "approve", label: "অনুমোদন", icon: "✅" },
];

const SCOPE_META: Record<ScopeType, { label: string; icon: any; color: string }> = {
  module: { label: "মডিউল", icon: Layers, color: "text-blue-600 bg-blue-500/10" },
  service: { label: "সার্ভিস", icon: Package, color: "text-emerald-600 bg-emerald-500/10" },
  category: { label: "ক্যাটাগরি", icon: Boxes, color: "text-amber-600 bg-amber-500/10" },
  area: { label: "এরিয়া", icon: MapPin, color: "text-rose-600 bg-rose-500/10" },
};

const ROLE_OPTIONS = ROLES.map((role) => ({ value: role.key, label: role.labelBn || role.labelEn }));
const ROLE_LABELS: Record<string, string> = Object.fromEntries(
  ROLE_OPTIONS.map((role) => [role.value, role.label]),
);

// Only these roles are shown by default in the admin assignment view.
// A name/email/mobile search bypasses this restriction and searches all users,
// so an admin can find e.g. a plain "user" and change their role.
const ADMIN_ASSIGNMENT_ROLES: RoleKey[] = [
  "super_admin",
  "admin",
  "mart_admin",
  "job_admin",
  "service_admin",
  "deal_admin",
  "moderator",
  "supervisor",
  "finance",
  "call_center",
  "mart_cs",
  "representative",
];

interface ListProps {
  grouped: Record<string, AssignmentRow[]>;
  onRevoke: (id: string) => void;
  onUpdatePerms: (id: string, perms: Record<string, boolean>) => void;
}

const AssignmentList = ({ grouped, onRevoke, onUpdatePerms }: ListProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPerms, setEditPerms] = useState<Record<string, boolean>>({});

  const startEdit = (a: AssignmentRow) => {
    setEditingId(a.id);
    setEditPerms((a.permissions && typeof a.permissions === "object") ? { ...(a.permissions as any) } : {});
  };

  const saveEdit = (id: string) => { onUpdatePerms(id, editPerms); setEditingId(null); };

  if (Object.keys(grouped).length === 0) {
    return (
      <div className="text-center py-12 text-sm text-muted-foreground border-2 border-dashed border-border rounded-2xl">
        <Sparkles className="h-10 w-10 mx-auto opacity-20 mb-2" />
        এখনো কোনো অ্যাসাইনমেন্ট নেই। উপরের "অ্যাসাইন" বাটনে ক্লিক করুন।
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {(Object.keys(SCOPE_META) as ScopeType[]).map(type => {
        const items = grouped[type] || [];
        if (items.length === 0) return null;
        const Icon = SCOPE_META[type].icon;
        return (
          <div key={type}>
            <div className="flex items-center gap-2 mb-2">
              <div className={`p-1.5 rounded-lg ${SCOPE_META[type].color}`}>
                <Icon className="h-3.5 w-3.5" />
              </div>
              <h4 className="text-sm font-bold">{SCOPE_META[type].label}</h4>
              <Badge variant="secondary" className="text-[10px]">{items.length}</Badge>
            </div>
            <div className="space-y-1.5">
              {items.map(it => {
                const permKeys = it.permissions && typeof it.permissions === "object"
                  ? Object.entries(it.permissions).filter(([, v]) => v).map(([k]) => k) : [];
                const isEditing = editingId === it.id;
                return (
                  <div key={it.id} className="rounded-xl border border-border bg-card p-3 hover:shadow-sm transition">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm font-medium">{it.scope_label}</span>
                          {it.priority !== "normal" && (
                            <Badge variant={it.priority === "urgent" ? "destructive" : "secondary"} className="h-4 px-1 text-[10px]">
                              {it.priority}
                            </Badge>
                          )}
                          {it.expires_at && (
                            <Badge variant="outline" className="h-4 px-1 text-[10px]">
                              ⏰ {new Date(it.expires_at).toLocaleDateString("bn-BD")}
                            </Badge>
                          )}
                        </div>
                        {!isEditing && permKeys.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {permKeys.map(pk => {
                              const meta = PERMISSION_KEYS.find(p => p.key === pk);
                              return (
                                <span key={pk} className="text-[10px] bg-primary/10 text-primary rounded-md px-1.5 py-0.5">
                                  {meta?.icon} {meta?.label || pk}
                                </span>
                              );
                            })}
                          </div>
                        )}
                        {it.notes && !isEditing && <p className="text-[11px] text-muted-foreground mt-1">📝 {it.notes}</p>}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {!isEditing ? (
                          <>
                            <button onClick={() => startEdit(it)}
                              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground" title="পারমিশন এডিট">
                              <Settings2 className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => onRevoke(it.id)}
                              className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive" title="বাতিল">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => saveEdit(it.id)}
                              className="p-1.5 rounded-lg bg-primary text-white" title="সেভ">
                              <Check className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => setEditingId(null)}
                              className="p-1.5 rounded-lg hover:bg-muted" title="বাতিল">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    {isEditing && (
                      <div className="mt-2 pt-2 border-t grid grid-cols-2 md:grid-cols-3 gap-1.5">
                        {PERMISSION_KEYS.map(p => (
                          <label key={p.key}
                            className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs cursor-pointer transition ${
                              editPerms[p.key] ? "bg-primary/10 border-primary/40" : "border-border"
                            }`}>
                            <Checkbox checked={!!editPerms[p.key]}
                              onCheckedChange={() => setEditPerms(p2 => ({ ...p2, [p.key]: !p2[p.key] }))} />
                            <span>{p.icon} {p.label}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const StaffAssignmentManager = ({ mode, lockedUserId }: Props) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [services, setServices] = useState<ScopeOption[]>([]);
  const [categories, setCategories] = useState<ScopeOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [createPanelOpen, setCreatePanelOpen] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserMobile, setNewUserMobile] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserType, setNewUserType] = useState<RoleKey>("user");
  const [creatingUser, setCreatingUser] = useState(false);

  // Persisted filter storage key (scoped per mode + locked context)
  const storageKey = `staffAssignFilters:${mode}:${lockedUserId ? "locked" : "global"}`;
  const persisted = (() => {
    if (typeof window === "undefined") return {} as any;
    try { return JSON.parse(localStorage.getItem(storageKey) || "{}"); } catch { return {}; }
  })();

  const [selectedUserId, setSelectedUserId] = useState<string>(
    lockedUserId || persisted.selectedUserId || ""
  );
  const [userSearch, setUserSearch] = useState<string>(persisted.userSearch || "");
  const [roleFilter, setRoleFilter] = useState<string>(persisted.roleFilter || "all");

  const [panelOpen, setPanelOpen] = useState(false);
  const [scopeType, setScopeType] = useState<ScopeType>("module");
  const [selScopes, setSelScopes] = useState<string[]>([]);
  const [scopeSearch, setScopeSearch] = useState("");
  const [permissions, setPermissions] = useState<Record<string, boolean>>({ view: true });
  const [priority, setPriority] = useState("normal");
  const [notes, setNotes] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  // Filters for the assignment list of the selected user
  const [filterScopeType, setFilterScopeType] = useState<"all" | ScopeType>(
    persisted.filterScopeType || "all"
  );
  const [assignmentSearch, setAssignmentSearch] = useState<string>(persisted.assignmentSearch || "");
  // Sort: primary field + direction, secondary field for tiebreak
  type SortField = "updated" | "name" | "scope_type";
  const [sortPrimary, setSortPrimary] = useState<SortField>(persisted.sortPrimary || "updated");
  const [sortDir, setSortDir] = useState<"asc" | "desc">(persisted.sortDir || "desc");
  const [sortSecondary, setSortSecondary] = useState<SortField | "none">(persisted.sortSecondary || "name");

  // Persist filter changes
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        selectedUserId: lockedUserId ? "" : selectedUserId,
        userSearch,
        roleFilter,
        filterScopeType,
        assignmentSearch,
        sortPrimary,
        sortDir,
        sortSecondary,
      }));
    } catch {}
  }, [storageKey, selectedUserId, userSearch, roleFilter, filterScopeType, assignmentSearch, sortPrimary, sortDir, sortSecondary, lockedUserId]);

  // Role filter dropdown only offers the restricted admin-assignment roles.
  // (ROLE_OPTIONS / ROLE_LABELS still cover every role and are used wherever
  // an admin actually sets a user's type, e.g. handleTypeChange's <Select>.)
  const targetRoles = ADMIN_ASSIGNMENT_ROLES;

  const load = useCallback(async () => {
    setLoading(true);
    const mysqlAuth = getMySqlAuth();
    const [{ data: mods }, { data: assigns }, servicesPayload, categoriesPayload] = await Promise.all([
      supabase.from("assignable_modules").select("*").eq("is_active", true).order("sort_order"),
      (lockedUserId
        ? supabase.from("staff_assignments").select("*").eq("is_active", true).eq("assigned_to", lockedUserId).order("created_at", { ascending: false })
        : supabase.from("staff_assignments").select("*").eq("is_active", true).order("created_at", { ascending: false })),
      fetch(`${INDIVIDUAL_API_BASE_URL}/api/services`).then((res) => res.json()).catch(() => ({ data: [] })),
      fetch(`${INDIVIDUAL_API_BASE_URL}/api/categories`).then((res) => res.json()).catch(() => ({ data: [] })),
    ]);
    const svcData = Array.isArray(servicesPayload) ? servicesPayload : servicesPayload?.data || servicesPayload?.services || [];
    const catData = Array.isArray(categoriesPayload) ? categoriesPayload : categoriesPayload?.data || categoriesPayload?.categories || [];
    setModules((mods as any) || []);
    setAssignments((assigns as any) || []);
    setServices(((svcData as any) || []).map((s: any) => ({ value: s.id, label: s.title, hint: s.title_en })));
    setCategories(((catData as any) || []).map((c: any) => ({ value: c.id, label: c.name, hint: c.name_en })));

    // Always fetch users from backend MySQL
    try {
      const { users: mysqlUsers } = await listMySqlUsers();
      const mapped = mysqlUsers.map((u): UserRow => ({
        user_id: String(u.id),
        mysql_id: u.id,
        full_name: u.name,
        email: u.email,
        mobile: u.mobile,
        address: u.address,
        type: u.type,
        email_verified: u.email_verified,
        created_at: u.created_at,
        updated_at: u.updated_at,
      }));
      setUsers(mapped);
      if (!lockedUserId && !selectedUserId && mapped.length > 0) setSelectedUserId(mapped[0].user_id);
    } catch (error: any) {
      toast.error(error.message || "ইউজার লোড করা যায়নি");
      setUsers([]);
    }

    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, lockedUserId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setSelScopes([]); setScopeSearch(""); }, [scopeType]);

  const currentOptions: ScopeOption[] = useMemo(() => {
    if (scopeType === "module") return modules.map(m => ({ value: m.module_key, label: m.label_bn, hint: m.category }));
    if (scopeType === "service") return services;
    if (scopeType === "category") return categories;
    const list: ScopeOption[] = [];
    divisions.forEach((d: any) => {
      list.push({ value: `div:${d.name_en}`, label: d.name, hint: "বিভাগ" });
      (d.districts || []).forEach((dist: any) => {
        list.push({ value: `dist:${d.name_en}::${dist.name_en}`, label: `${d.name} › ${dist.name}`, hint: "জেলা" });
      });
    });
    return list;
  }, [scopeType, modules, services, categories]);

  const filteredOptions = currentOptions.filter(o =>
    !scopeSearch.trim() || o.label.toLowerCase().includes(scopeSearch.toLowerCase()) ||
    (o.hint || "").toLowerCase().includes(scopeSearch.toLowerCase()));

  // Default (no search): only show users whose role is in ADMIN_ASSIGNMENT_ROLES.
  // Once the admin types a name/email/mobile, search across ALL users regardless
  // of role, so e.g. a plain "user" can be found and have their role changed.
  const filteredUsers = users.filter(u => {
    const hasSearch = userSearch.trim().length > 0;

    if (!hasSearch && !ADMIN_ASSIGNMENT_ROLES.includes(u.type as RoleKey)) return false;

    if (roleFilter !== "all" && u.type !== roleFilter) return false;

    if (!hasSearch) return true;

    const q = userSearch.toLowerCase();
    return (u.full_name || "").toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q) ||
      (u.mobile || "").toLowerCase().includes(q);
  });

  const userCounts = useMemo(() => {
    const map: Record<string, number> = {};
    assignments.forEach(a => { map[a.assigned_to] = (map[a.assigned_to] || 0) + 1; });
    return map;
  }, [assignments]);

  const selectedUser = users.find(u => u.user_id === selectedUserId);
  const hasBackendSuperAdminSession = getMySqlAuth()?.user.type === "super_admin";
  const canManageBackendTypes = mode === "super_admin" && hasBackendSuperAdminSession;
  const userAssignments = useMemo(() => {
    if (!selectedUser) return [];
    return assignments.filter(a => {
      if (a.assigned_to !== selectedUserId) return false;
      if (a.scope_type === "module") {
        const mod = modules.find(m => m.module_key === a.scope_value);
        if (mod && !mod.applicable_roles.includes(selectedUser.type)) return false;
      }
      return true;
    });
  }, [selectedUser, selectedUserId, assignments, modules]);
  const filteredAssignments = userAssignments.filter(a => {
    if (filterScopeType !== "all" && a.scope_type !== filterScopeType) return false;
    if (assignmentSearch.trim()) {
      const q = assignmentSearch.toLowerCase();
      const hay = `${a.scope_label || ""} ${a.scope_value || ""} ${a.notes || ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
  const compareBy = (a: AssignmentRow, b: AssignmentRow, field: SortField): number => {
    if (field === "updated") {
      const ta = (a as any).updated_at || (a as any).created_at || "";
      const tb = (b as any).updated_at || (b as any).created_at || "";
      return ta.localeCompare(tb);
    }
    if (field === "scope_type") return (a.scope_type || "").localeCompare(b.scope_type || "");
    // name
    const la = (a.scope_label || a.scope_value || "").toLowerCase();
    const lb = (b.scope_label || b.scope_value || "").toLowerCase();
    return la.localeCompare(lb);
  };
  const sortedAssignments = [...filteredAssignments].sort((a, b) => {
    const primary = compareBy(a, b, sortPrimary) * (sortDir === "asc" ? 1 : -1);
    if (primary !== 0) return primary;
    if (sortSecondary !== "none" && sortSecondary !== sortPrimary) {
      // Secondary always ascending (A→Z within groups)
      return compareBy(a, b, sortSecondary as SortField);
    }
    return 0;
  });
  const grouped = sortedAssignments.reduce((acc: Record<string, AssignmentRow[]>, a) => {
    (acc[a.scope_type] ||= []).push(a); return acc;
  }, {});

  const togglePerm = (key: string) => setPermissions(p => ({ ...p, [key]: !p[key] }));
  const toggleScope = (val: string) => setSelScopes(s => s.includes(val) ? s.filter(v => v !== val) : [...s, val]);
  const resetForm = () => {
    setScopeType("module"); setSelScopes([]); setScopeSearch("");
    setPermissions({ view: true }); setNotes(""); setExpiresAt(""); setPriority("normal");
  };

  const formatDateTime = (value?: string | null) => {
    if (!value) return "-";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString("bn-BD");
  };

  const handleTypeChange = async (target: UserRow, nextType: string) => {
    if (!target.mysql_id) return;
    const previous = target.type;
    setUsers(prev => prev.map(u => u.user_id === target.user_id ? { ...u, type: nextType } : u));
    try {
      const { user: updated } = await updateMySqlUserType(target.mysql_id, nextType as RoleKey);
      setUsers(prev => prev.map(u => u.user_id === target.user_id ? { ...u, type: updated.type } : u));
      toast.success("ইউজার টাইপ আপডেট হয়েছে");
    } catch (error: any) {
      setUsers(prev => prev.map(u => u.user_id === target.user_id ? { ...u, type: previous } : u));
      toast.error(error.message || "ইউজার টাইপ আপডেট করা যায়নি");
    }
  };

  const resetCreateForm = () => {
    setNewUserName("");
    setNewUserEmail("");
    setNewUserMobile("");
    setNewUserPassword("");
    setNewUserType("user");
  };

  const handleCreateUser = async () => {
    if (!newUserName.trim() || !newUserEmail.trim() || !newUserMobile.trim() || newUserPassword.length < 6) {
      toast.error("সঠিক নাম, ইমেইল, মোবাইল ও ৬+ অক্ষরের পাসওয়ার্ড দিন");
      return;
    }

    console.log("Creating user with data:", {
      name: newUserName.trim(),
      email: newUserEmail.trim(),
      mobile: newUserMobile.trim(),
      password: newUserPassword,
      type: newUserType,
    });

    setCreatingUser(true);
    try {
      const { user: created } = await createMySqlUser({
        name: newUserName.trim(),
        email: newUserEmail.trim(),
        mobile: newUserMobile.trim(),
        password: newUserPassword,
        type: newUserType,
      });
      console.log("User created successfully:", created);
      toast.success("ব্যাকএন্ড ইউজার তৈরি হয়েছে");
      resetCreateForm();
      setCreatePanelOpen(false);
      await load();
      setSelectedUserId(String(created.id));
    } catch (error: any) {
      console.error("Error creating user:", error);
      toast.error(error.message || "ব্যাকএন্ড ইউজার তৈরি করা যায়নি");
    } finally {
      setCreatingUser(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedUserId || selScopes.length === 0 || !user) {
      toast.error("অন্তত একটি আইটেম সিলেক্ট করুন"); return;
    }
    setSaving(true);
    const u = users.find(x => x.user_id === selectedUserId);
    const rows = selScopes.map(val => {
      const opt = currentOptions.find(o => o.value === val);
      return {
        assigned_to: selectedUserId,
        assigned_to_name: u?.full_name || u?.email || "Unknown",
        assigned_to_role: u?.type || "user",
        assigned_by: user.id,
        assigner_role: mode,
        scope_type: scopeType,
        scope_value: val,
        scope_label: opt?.label || val,
        permissions: permissions as any,
        priority,
        notes: notes || null,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      };
    });
    const { error } = await supabase.from("staff_assignments").insert(rows);
    setSaving(false);
    if (error) { toast.error("ব্যর্থ: " + error.message); return; }
    toast.success(`${rows.length}টি অ্যাসাইনমেন্ট সফল ✅`);
    setPanelOpen(false); resetForm(); load();
  };

  const handleRevoke = async (id: string) => {
    if (!confirm("এই অ্যাসাইনমেন্ট বাতিল করবেন?")) return;
    const { error } = await supabase.from("staff_assignments").update({ is_active: false }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("বাতিল করা হয়েছে"); load();
  };

  const updateAssignmentPerms = async (id: string, newPerms: Record<string, boolean>) => {
    const { error } = await supabase.from("staff_assignments").update({ permissions: newPerms as any }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("পারমিশন আপডেট হয়েছে"); load();
  };

  if (loading) return <div className="p-12 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const filterBar = (
    <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
      <div className="relative flex-1">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={assignmentSearch}
          onChange={e => setAssignmentSearch(e.target.value)}
          placeholder="অ্যাসাইনমেন্ট খুঁজুন (নাম, লেবেল, নোট)..."
          className="h-9 pl-8 text-xs"
        />
      </div>
      <div className="flex items-center gap-1">
        <select
          value={sortPrimary}
          onChange={e => setSortPrimary(e.target.value as SortField)}
          className="h-9 rounded-lg border border-border bg-card text-xs px-2 font-medium hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/30"
          aria-label="প্রাইমারি সর্ট"
          title="প্রাইমারি সর্ট"
        >
          <option value="updated">সর্বশেষ আপডেট</option>
          <option value="name">নাম</option>
          <option value="scope_type">স্কোপ টাইপ</option>
        </select>
        <button
          type="button"
          onClick={() => setSortDir(d => d === "asc" ? "desc" : "asc")}
          className="h-9 px-2 rounded-lg border border-border bg-card text-xs font-bold hover:bg-muted"
          title={sortDir === "asc" ? "Ascending (A→Z / পুরনো আগে)" : "Descending (Z→A / নতুন আগে)"}
        >
          {sortDir === "asc" ? "↑" : "↓"}
        </button>
        <select
          value={sortSecondary}
          onChange={e => setSortSecondary(e.target.value as any)}
          className="h-9 rounded-lg border border-border bg-card text-xs px-2 font-medium hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/30"
          aria-label="সেকেন্ডারি সর্ট"
          title="সেকেন্ডারি সর্ট (A→Z)"
        >
          <option value="none">— সেকেন্ডারি —</option>
          <option value="name">তারপর নাম (A→Z)</option>
          <option value="updated">তারপর আপডেট</option>
          <option value="scope_type">তারপর স্কোপ টাইপ</option>
        </select>
      </div>
      {(filterScopeType !== "all" || assignmentSearch.trim() !== "" || sortPrimary !== "updated" || sortDir !== "desc" || sortSecondary !== "name") && (
        <button
          type="button"
          onClick={() => {
            setFilterScopeType("all");
            setAssignmentSearch("");
            setSortPrimary("updated");
            setSortDir("desc");
            setSortSecondary("name");
          }}
          className="h-9 px-2.5 rounded-lg text-[11px] font-medium border border-border bg-card hover:bg-destructive/10 hover:border-destructive/40 hover:text-destructive flex items-center gap-1.5 transition"
          title="ফিল্টার রিসেট করুন"
        >
          <X className="h-3.5 w-3.5" />
          ফিল্টার ক্লিয়ার
        </button>
      )}
      <div className="flex gap-1.5 flex-wrap">
        {(["all", ...Object.keys(SCOPE_META)] as Array<"all" | ScopeType>).map(t => {
          const active = filterScopeType === t;
          const meta = t === "all" ? null : SCOPE_META[t as ScopeType];
          const Icon = meta?.icon;
          const count = t === "all"
            ? userAssignments.length
            : userAssignments.filter(a => a.scope_type === t).length;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setFilterScopeType(t)}
              className={`h-8 px-2.5 rounded-lg text-[11px] font-medium border flex items-center gap-1.5 transition ${
                active ? "bg-primary text-white border-primary" : "bg-card hover:bg-muted border-border"
              }`}
            >
              {Icon && <Icon className="h-3 w-3" />}
              {t === "all" ? "সব" : meta!.label}
              <span className={`text-[10px] rounded-md px-1 ${active ? "bg-primary-foreground/20" : "bg-muted"}`}>{count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  const assignPanel = (
    <div className="space-y-4">
      <div>
        <Label className="text-xs mb-2 block font-semibold">কী অ্যাসাইন করবেন? *</Label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {(Object.keys(SCOPE_META) as ScopeType[]).map(t => {
            const Icon = SCOPE_META[t].icon;
            const active = scopeType === t;
            return (
              <button key={t} type="button" onClick={() => setScopeType(t)}
                className={`flex flex-col items-center justify-center gap-1 rounded-xl border-2 px-2 py-3 text-xs font-medium transition ${
                  active ? "bg-primary text-white border-primary shadow-md scale-105" : "bg-card hover:bg-muted border-border"
                }`}>
                <Icon className="h-4 w-4" />
                {SCOPE_META[t].label}
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <Label className="text-xs font-semibold">{SCOPE_META[scopeType].label} সিলেক্ট (একাধিক) *</Label>
          {selScopes.length > 0 && <Badge className="text-[10px]">{selScopes.length} নির্বাচিত</Badge>}
        </div>
        <div className="relative mb-2">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={scopeSearch} onChange={e => setScopeSearch(e.target.value)} placeholder="খুঁজুন..." className="h-9 pl-8 text-xs" />
        </div>
        <div className="max-h-64 overflow-y-auto rounded-xl border border-border bg-muted/20 divide-y divide-border/50">
          {filteredOptions.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">কিছু পাওয়া যায়নি</div>
          ) : filteredOptions.map(o => {
            const checked = selScopes.includes(o.value);
            return (
              <label key={o.value} className={`flex items-center gap-2.5 px-3 py-2.5 hover:bg-muted/60 cursor-pointer transition ${checked ? "bg-primary/5" : ""}`}>
                <Checkbox checked={checked} onCheckedChange={() => toggleScope(o.value)} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate">{o.label}</div>
                  {o.hint && <div className="text-[10px] text-muted-foreground truncate">{o.hint}</div>}
                </div>
              </label>
            );
          })}
        </div>
        {selScopes.length > 0 && (
          <button type="button" onClick={() => setSelScopes([])}
            className="text-[11px] text-muted-foreground hover:text-foreground mt-1.5 inline-flex items-center gap-1">
            <X className="h-3 w-3" /> সব ক্লিয়ার
          </button>
        )}
      </div>
      <div>
        <Label className="text-xs mb-2 block font-semibold">পারমিশন (এই অ্যাসাইনমেন্টে কী করতে পারবে?)</Label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
          {PERMISSION_KEYS.map(p => (
            <label key={p.key}
              className={`flex items-center gap-2 rounded-lg border-2 px-2.5 py-2 text-xs cursor-pointer transition ${
                permissions[p.key] ? "bg-primary/10 border-primary/40 text-primary" : "border-border hover:bg-muted/50"
              }`}>
              <Checkbox checked={!!permissions[p.key]} onCheckedChange={() => togglePerm(p.key)} />
              <span>{p.icon}</span>
              <span className="font-medium">{p.label}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">প্রায়োরিটি</Label>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="low">কম</SelectItem>
              <SelectItem value="normal">সাধারণ</SelectItem>
              <SelectItem value="high">উচ্চ</SelectItem>
              <SelectItem value="urgent">জরুরি</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">মেয়াদ শেষ (ঐচ্ছিক)</Label>
          <Input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} className="h-9" />
        </div>
      </div>
      <div>
        <Label className="text-xs">নোট (ঐচ্ছিক)</Label>
        <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="বিশেষ নির্দেশনা..." />
      </div>
      <Button onClick={handleAssign} disabled={saving || selScopes.length === 0} className="w-full h-11 gap-2">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : (
          <><Check className="h-4 w-4" /> {selScopes.length}টি অ্যাসাইন করুন</>
        )}
      </Button>
    </div>
  );

  if (lockedUserId) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            মোট অ্যাসাইনমেন্ট: <span className="font-bold text-foreground">{userAssignments.length}</span>
          </div>
          <Sheet open={panelOpen} onOpenChange={setPanelOpen}>
            <SheetTrigger asChild>
              <Button size="sm" className="gap-1.5"><UserPlus className="h-4 w-4" /> নতুন অ্যাসাইন</Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
              <SheetHeader><SheetTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" />কাজ অ্যাসাইন করুন</SheetTitle></SheetHeader>
              <div className="mt-4">{assignPanel}</div>
            </SheetContent>
          </Sheet>
        </div>
        {userAssignments.length > 0 && filterBar}
        <AssignmentList grouped={grouped} onRevoke={handleRevoke} onUpdatePerms={updateAssignmentPerms} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-lg md:text-xl font-bold flex items-center gap-2">
            {mode === "super_admin" ? <Shield className="h-5 w-5 text-primary" /> : <Briefcase className="h-5 w-5 text-primary" />}
            {mode === "super_admin" ? "অ্যাডমিন কাজ অ্যাসাইনমেন্ট" : "স্টাফ কাজ অ্যাসাইনমেন্ট"}
          </h2>
          <p className="text-xs md:text-sm text-muted-foreground">ইউজার সিলেক্ট করুন → পারমিশন ও সার্ভিস অ্যাসাইন করুন</p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <Badge variant="outline" className="gap-1"><Users className="h-3 w-3" /> {users.length} ইউজার</Badge>
          <Badge variant="outline" className="gap-1"><Layers className="h-3 w-3" /> {assignments.length} মোট</Badge>
        </div>
      </div>

      {mode === "super_admin" && (
        <Card className="p-3 space-y-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-sm font-bold">Backend users table</h3>
              <p className="text-xs text-muted-foreground">users টেবিলের সব ডাটা এখানে দেখা যাবে এবং type পরিবর্তন করা যাবে।</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row items-center">
              {hasBackendSuperAdminSession && (
                <Sheet open={createPanelOpen} onOpenChange={setCreatePanelOpen}>
                  <SheetTrigger asChild>
                    <Button size="sm" className="gap-1.5 bg-userprimary"><UserPlus className="h-4 w-4" /> নতুন ব্যাকএন্ড ইউজার</Button>
                  </SheetTrigger>
                  <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
                    <SheetHeader>
                      <SheetTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5 text-primary" /> নতুন ব্যাকএন্ড ইউজার তৈরি করুন</SheetTitle>
                    </SheetHeader>
                    <div className="space-y-4 mt-4">
                      <div>
                        <Label className="text-xs font-semibold mb-1 block">নাম</Label>
                        <Input value={newUserName} onChange={e => setNewUserName(e.target.value)} placeholder="পূর্ণ নাম" className="h-9 text-xs" />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold mb-1 block">ইমেইল</Label>
                        <Input value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} placeholder="example@mail.com" className="h-9 text-xs" />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold mb-1 block">মোবাইল</Label>
                        <Input value={newUserMobile} onChange={e => setNewUserMobile(e.target.value)} placeholder="01XXXXXXXXX" className="h-9 text-xs" />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold mb-1 block">পাসওয়ার্ড</Label>
                        <Input type="password" value={newUserPassword} onChange={e => setNewUserPassword(e.target.value)} placeholder="কমপক্ষে ৬টি অক্ষর" className="h-9 text-xs" />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold mb-1 block">টাইপ</Label>
                        <Select value={newUserType} onValueChange={(value) => setNewUserType(value as RoleKey)}>
                          <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {ROLE_OPTIONS.map((role) => (
                              <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button onClick={handleCreateUser} disabled={creatingUser} className="w-full h-11 gap-2">
                        {creatingUser ? <Loader2 className="h-4 w-4 animate-spin" /> : <><UserPlus className="h-4 w-4" /> তৈরি করুন</>}
                      </Button>
                    </div>
                  </SheetContent>
                </Sheet>
              )}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  placeholder="নাম, ইমেইল, মোবাইল খুঁজুন..."
                  className="h-9 pl-8 text-xs sm:w-64"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="h-9 text-xs sm:w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">সব টাইপ</SelectItem>
                  {targetRoles.map(r => <SelectItem key={r} value={r}>{ROLE_LABELS[r] || r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[980px] text-left text-xs">
              <thead className="bg-muted/60 text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-semibold">ID</th>
                  <th className="px-3 py-2 font-semibold">Name</th>
                  <th className="px-3 py-2 font-semibold">Email</th>
                  <th className="px-3 py-2 font-semibold">Mobile</th>
                  <th className="px-3 py-2 font-semibold">Address</th>
                  <th className="px-3 py-2 font-semibold">Type</th>
                  <th className="px-3 py-2 font-semibold">Verified</th>
                  <th className="px-3 py-2 font-semibold">Created</th>
                  <th className="px-3 py-2 font-semibold">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-8 text-center text-muted-foreground">কোনো ইউজার পাওয়া যায়নি</td>
                  </tr>
                ) : filteredUsers.map((u) => (
                  <tr
                    key={u.user_id}
                    className={`cursor-pointer transition hover:bg-muted/40 ${u.user_id === selectedUserId ? "bg-primary/5" : ""}`}
                    onClick={() => setSelectedUserId(u.user_id)}
                  >
                    <td className="px-3 py-2 font-medium">{u.mysql_id || u.user_id}</td>
                    <td className="px-3 py-2">{u.full_name || "-"}</td>
                    <td className="px-3 py-2">{u.email || "-"}</td>
                    <td className="px-3 py-2">{u.mobile || "-"}</td>
                    <td className="max-w-[220px] truncate px-3 py-2" title={u.address || ""}>{u.address || "-"}</td>
                    <td className="px-3 py-2" onClick={(event) => event.stopPropagation()}>
                      {canManageBackendTypes && u.mysql_id ? (
                        <Select value={u.type} onValueChange={(value) => handleTypeChange(u, value)}>
                          <SelectTrigger className="h-8 w-44 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLE_OPTIONS.map((role) => (
                              <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        ROLE_LABELS[u.type] || u.type
                      )}
                    </td>
                    <td className="px-3 py-2">{u.email_verified ? "Yes" : "No"}</td>
                    <td className="px-3 py-2">{formatDateTime(u.created_at)}</td>
                    <td className="px-3 py-2">{formatDateTime(u.updated_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
        <Card className="p-3 space-y-2 lg:max-h-[calc(100vh-220px)] lg:overflow-y-auto">
          <div className="space-y-2 sticky top-0 bg-card z-10 pb-2 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="ইউজার খুঁজুন..." className="h-9 pl-8 text-xs" />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">সব টাইপ</SelectItem>
                {targetRoles.map(r => <SelectItem key={r} value={r}>{ROLE_LABELS[r] || r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-xs text-muted-foreground">কোনো ইউজার নেই</div>
          ) : filteredUsers.map(u => {
            const active = u.user_id === selectedUserId;
            const count = userCounts[u.user_id] || 0;
            const initials = (u.full_name || u.email || "?").slice(0, 2).toUpperCase();
            return (
              <button key={u.user_id} onClick={() => setSelectedUserId(u.user_id)}
                className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl text-left transition ${
                  active ? "bg-primary text-white shadow-md" : "hover:bg-muted/60"
                }`}>
                <div className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  active ? "bg-primary-foreground/20" : "bg-primary/10 text-primary"
                }`}>{initials}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold truncate">{u.full_name || u.email?.split("@")[0] || "নামহীন"}</div>
                  <div className={`text-[10px] truncate ${active ? "text-white/70" : "text-muted-foreground"}`}>
                    {ROLE_LABELS[u.type] || u.type}
                  </div>
                  {u.mobile && (
                    <div className={`text-[10px] truncate ${active ? "text-white/70" : "text-muted-foreground"}`}>
                      {u.mobile}
                    </div>
                  )}
                </div>
                {count > 0 && (
                  <Badge className={`text-[10px] flex-shrink-0 ${active ? "bg-primary-foreground/20 text-white" : ""}`}>
                    {count}
                  </Badge>
                )}
                <ChevronRight className={`h-3 w-3 flex-shrink-0 ${active ? "" : "opacity-30"}`} />
              </button>
            );
          })}
        </Card>

        <Card className="p-4 lg:max-h-[calc(100vh-220px)] lg:overflow-y-auto">
          {!selectedUser ? (
            <div className="text-center py-16 text-sm text-muted-foreground">
              <Users className="h-12 w-12 mx-auto opacity-20 mb-2" />
              বাঁ দিক থেকে একজন ইউজার সিলেক্ট করুন
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3 pb-3 border-b">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-12 w-12 rounded-2xl bg-primary/15 text-primary flex items-center justify-center text-base font-bold flex-shrink-0">
                    {(selectedUser.full_name || selectedUser.email || "?").slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-base truncate">{selectedUser.full_name || "নামহীন"}</h3>
                    <p className="text-xs text-muted-foreground truncate">{selectedUser.email}</p>
                    {selectedUser.mobile && <p className="text-xs text-muted-foreground truncate">{selectedUser.mobile}</p>}
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      <Badge variant="outline" className="text-[10px]">টাইপ: {ROLE_LABELS[selectedUser.type] || selectedUser.type}</Badge>
                      {selectedUser.mysql_id && <Badge variant="secondary" className="text-[10px]">ID: {selectedUser.mysql_id}</Badge>}
                      {typeof selectedUser.email_verified === "boolean" && (
                        <Badge variant={selectedUser.email_verified ? "default" : "outline"} className="text-[10px] bg-userprimary hover:bg-emerald-600">
                          {selectedUser.email_verified ? "ভেরিফায়েড" : "আনভেরিফায়েড"}
                        </Badge>
                      )}
                    </div>
                    {canManageBackendTypes && selectedUser.mysql_id && (
                      <div className="mt-2 w-52 max-w-full">
                        <Select value={selectedUser.type} onValueChange={(value) => handleTypeChange(selectedUser, value)}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="টাইপ নির্বাচন করুন" />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLE_OPTIONS.map((role) => (
                              <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </div>
                <Sheet open={panelOpen} onOpenChange={setPanelOpen}>
                  <SheetTrigger asChild>
                    <Button size="sm" className="gap-1.5 flex-shrink-0 bg-userprimary">
                      <UserPlus className="h-4 w-4" /> অ্যাসাইন
                    </Button>
                  </SheetTrigger>
                  <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
                    <SheetHeader>
                      <SheetTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        {selectedUser.full_name || "ইউজার"} কে অ্যাসাইন করুন
                      </SheetTitle>
                    </SheetHeader>
                    <div className="mt-4">{assignPanel}</div>
                  </SheetContent>
                </Sheet>
              </div>

              {canManageBackendTypes && (
                <div className="rounded-xl border border-border bg-muted/20 p-3">
                  <div className="grid gap-2 text-xs md:grid-cols-2">
                    <div>
                      <span className="font-semibold text-foreground">নাম:</span>{" "}
                      <span className="text-muted-foreground">{selectedUser.full_name || "-"}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-foreground">ইমেইল:</span>{" "}
                      <span className="text-muted-foreground">{selectedUser.email || "-"}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-foreground">মোবাইল:</span>{" "}
                      <span className="text-muted-foreground">{selectedUser.mobile || "-"}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-foreground">টাইপ:</span>{" "}
                      <span className="text-muted-foreground">{selectedUser.type}</span>
                    </div>
                    <div className="md:col-span-2">
                      <span className="font-semibold text-foreground">ঠিকানা:</span>{" "}
                      <span className="text-muted-foreground">{selectedUser.address || "-"}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-foreground">তৈরি:</span>{" "}
                      <span className="text-muted-foreground">{formatDateTime(selectedUser.created_at)}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-foreground">আপডেট:</span>{" "}
                      <span className="text-muted-foreground">{formatDateTime(selectedUser.updated_at)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-4 gap-2">
                {(Object.keys(SCOPE_META) as ScopeType[]).map(t => {
                  const Icon = SCOPE_META[t].icon;
                  const c = (grouped[t] || []).length;
                  return (
                    <div key={t} className={`rounded-xl p-2.5 text-center ${SCOPE_META[t].color}`}>
                      <Icon className="h-4 w-4 mx-auto mb-1" />
                      <div className="text-base font-bold">{c}</div>
                      <div className="text-[10px] opacity-80">{SCOPE_META[t].label}</div>
                    </div>
                  );
                })}
              </div>

              {userAssignments.length > 0 && filterBar}
              <AssignmentList grouped={grouped} onRevoke={handleRevoke} onUpdatePerms={updateAssignmentPerms} />
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default StaffAssignmentManager;