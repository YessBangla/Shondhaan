import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Users, Calendar, LifeBuoy, Inbox, FileText, ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const toBn = (n: number | string) => String(n).replace(/[0-9]/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)]);

type Staff = {
  user_id: string;
  display_name: string | null;
  phone: string | null;
  roles: string[];
  bookings_active: number;
  bookings_pending: number;
  bookings_completed: number;
  disputes_open: number;
  approvals_pending: number;
  requests_open: number;
};

const ROLE_FILTERS = [
  { value: "all", label: "সকল স্টাফ" },
  { value: "provider", label: "প্রোভাইডার" },
  { value: "moderator", label: "মডারেটর" },
  { value: "admin", label: "অ্যাডমিন" },
  { value: "finance", label: "ফিনান্স" },
  { value: "representative", label: "প্রতিনিধি" },
];

const roleBadge = (role: string) => {
  const map: Record<string, string> = {
    super_admin: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
    admin: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    moderator: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
    finance: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    provider: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
    representative: "bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300",
  };
  return map[role] || "bg-muted text-muted-foreground";
};

const AdminStaffWorkload = () => {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"load" | "name" | "completed">("load");

  useEffect(() => {
    (async () => {
      setLoading(true);
      // 1) All staff roles (non-end-user)
      const STAFF_ROLES = ["super_admin", "admin", "moderator", "finance", "provider", "representative"];
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("role", STAFF_ROLES as any);

      const userIds = Array.from(new Set((roles ?? []).map((r) => r.user_id)));
      if (userIds.length === 0) { setStaff([]); setLoading(false); return; }

      const rolesByUser = new Map<string, string[]>();
      (roles ?? []).forEach((r) => {
        const arr = rolesByUser.get(r.user_id) ?? [];
        arr.push(r.role as string);
        rolesByUser.set(r.user_id, arr);
      });

      // 2) Profiles for names
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, phone")
        .in("user_id", userIds);

      // 3) Counts in parallel — cast client to any to avoid deep type inference
      const sb = supabase as any;
      const results: any[] = await Promise.all([
        sb.from("bookings").select("provider_id, status").in("provider_id", userIds),
        sb.from("disputes").select("assigned_to, status").in("assigned_to", userIds),
        sb.from("approval_queue").select("reviewed_by, status").in("reviewed_by", userIds),
        sb.from("service_requests").select("assigned_to, status").in("assigned_to", userIds),
      ]);
      const [bookingsRes, disputesRes, approvalsRes, requestsRes] = results;

      const counts = new Map<string, Omit<Staff, "user_id" | "display_name" | "phone" | "roles">>();
      const bump = (uid: string | null, key: keyof ReturnType<typeof emptyCounts>) => {
        if (!uid) return;
        const cur = counts.get(uid) ?? emptyCounts();
        (cur as any)[key] += 1;
        counts.set(uid, cur);
      };
      function emptyCounts() {
        return {
          bookings_active: 0, bookings_pending: 0, bookings_completed: 0,
          disputes_open: 0, approvals_pending: 0, requests_open: 0,
        };
      }

      (bookingsRes.data ?? []).forEach((b: any) => {
        if (b.status === "pending") bump(b.provider_id, "bookings_pending");
        else if (b.status === "confirmed" || b.status === "in_progress") bump(b.provider_id, "bookings_active");
        else if (b.status === "completed") bump(b.provider_id, "bookings_completed");
      });
      (disputesRes.data ?? []).forEach((d: any) => {
        if (["open", "in_progress", "escalated"].includes(d.status)) bump(d.assigned_to, "disputes_open");
      });
      (approvalsRes.data ?? []).forEach((a: any) => {
        if (a.status === "pending") bump(a.reviewed_by, "approvals_pending");
      });
      (requestsRes.data ?? []).forEach((r: any) => {
        if (["pending", "in_progress"].includes(r.status)) bump(r.assigned_to, "requests_open");
      });

      const merged: Staff[] = userIds.map((uid) => {
        const p = (profiles ?? []).find((x) => x.user_id === uid);
        const c = counts.get(uid) ?? emptyCounts();
        return {
          user_id: uid,
          display_name: p?.display_name ?? null,
          phone: p?.phone ?? null,
          roles: rolesByUser.get(uid) ?? [],
          ...c,
        };
      });
      setStaff(merged);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const list = roleFilter === "all" ? staff : staff.filter((s) => s.roles.includes(roleFilter));
    const score = (s: Staff) => s.bookings_active + s.bookings_pending + s.disputes_open + s.approvals_pending + s.requests_open;
    const sorted = [...list];
    if (sortBy === "load") sorted.sort((a, b) => score(b) - score(a));
    else if (sortBy === "name") sorted.sort((a, b) => (a.display_name ?? "").localeCompare(b.display_name ?? ""));
    else if (sortBy === "completed") sorted.sort((a, b) => b.bookings_completed - a.bookings_completed);
    return sorted;
  }, [staff, roleFilter, sortBy]);

  const totalActive = useMemo(
    () => staff.reduce((acc, s) => acc + s.bookings_active + s.bookings_pending + s.disputes_open + s.approvals_pending + s.requests_open, 0),
    [staff]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-emerald-600 text-primary-foreground flex items-center justify-center">
          <Users className="h-4 w-4" />
        </div>
        <div>
          <h1 className="text-base font-semibold leading-tight">স্টাফ ওয়ার্কলোড বোর্ড</h1>
          <p className="text-[11px] text-muted-foreground">প্রতিটি স্টাফের সক্রিয় কাজের তালিকা ও লোড</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-muted-foreground">সর্ট:</span>
          {([
            { v: "load", l: "লোড" },
            { v: "completed", l: "সম্পন্ন" },
            { v: "name", l: "নাম" },
          ] as const).map((s) => (
            <button key={s.v} onClick={() => setSortBy(s.v as any)}
              className={`text-[11px] rounded-full px-2.5 py-1 transition ${sortBy === s.v ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/70"}`}>
              {s.l}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        {ROLE_FILTERS.map((r) => (
          <button key={r.value} onClick={() => setRoleFilter(r.value)}
            className={`text-xs rounded-full px-3 py-1 transition ${roleFilter === r.value ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/70"}`}>
            {r.label}
          </button>
        ))}
        <span className="ml-auto text-[11px] text-muted-foreground">
          মোট সক্রিয় কাজ: <strong className="text-foreground">{toBn(totalActive)}</strong>
        </span>
      </div>

      {loading ? (
        <div className="p-12 text-center text-sm text-muted-foreground inline-flex items-center justify-center gap-2 w-full">
          <Loader2 className="h-4 w-4 animate-spin" /> লোড হচ্ছে...
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center text-muted-foreground text-sm">
          কোনো স্টাফ পাওয়া যায়নি
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((s, idx) => {
            const load = s.bookings_active + s.bookings_pending + s.disputes_open + s.approvals_pending + s.requests_open;
            const heat = load >= 10 ? "from-rose-500 to-red-600" : load >= 5 ? "from-amber-500 to-orange-600" : load > 0 ? "from-emerald-500 to-teal-600" : "from-slate-400 to-slate-500";
            return (
              <motion.div key={s.user_id}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.02 }}
                className="rounded-2xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3 mb-3">
                  <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${heat} text-white flex items-center justify-center font-bold text-sm shrink-0`}>
                    {(s.display_name ?? "?").trim().charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm truncate">{s.display_name || "নাম নেই"}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{s.phone || "—"}</p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {s.roles.map((r) => (
                        <span key={r} className={`text-[10px] rounded-full px-1.5 py-0.5 ${roleBadge(r)}`}>{r}</span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] text-muted-foreground">লোড</p>
                    <p className="text-2xl font-bold leading-none">{toBn(load)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  <Link to="/admin/bookings" className="rounded-lg bg-muted/40 hover:bg-primary/10 px-2 py-1.5 flex items-center justify-between gap-1.5 text-[11px] transition group">
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground"><Calendar className="h-3 w-3" /> সক্রিয় বুকিং</span>
                    <span className="font-semibold tabular-nums">{toBn(s.bookings_active + s.bookings_pending)}</span>
                  </Link>
                  <Link to="/admin/disputes" className="rounded-lg bg-muted/40 hover:bg-primary/10 px-2 py-1.5 flex items-center justify-between gap-1.5 text-[11px] transition">
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground"><LifeBuoy className="h-3 w-3" /> খোলা অভিযোগ</span>
                    <span className="font-semibold tabular-nums">{toBn(s.disputes_open)}</span>
                  </Link>
                  <Link to="/admin/approval-queue" className="rounded-lg bg-muted/40 hover:bg-primary/10 px-2 py-1.5 flex items-center justify-between gap-1.5 text-[11px] transition">
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground"><Inbox className="h-3 w-3" /> অনুমোদন</span>
                    <span className="font-semibold tabular-nums">{toBn(s.approvals_pending)}</span>
                  </Link>
                  <Link to="/admin/requests" className="rounded-lg bg-muted/40 hover:bg-primary/10 px-2 py-1.5 flex items-center justify-between gap-1.5 text-[11px] transition">
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground"><FileText className="h-3 w-3" /> রিকোয়েস্ট</span>
                    <span className="font-semibold tabular-nums">{toBn(s.requests_open)}</span>
                  </Link>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-2">
                  <span className="text-[11px] text-muted-foreground">
                    সম্পন্ন বুকিং: <strong className="text-foreground">{toBn(s.bookings_completed)}</strong>
                  </span>
                  <Link to={`/admin/users?u=${s.user_id}`}
                    className="text-[11px] text-primary inline-flex items-center gap-1 hover:underline">
                    প্রোফাইল <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminStaffWorkload;