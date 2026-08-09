import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { LifeBuoy, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useBulkSelection } from "@/hooks/useBulkSelection";
import { useBulkPermissions } from "@/hooks/useBulkPermissions";
import BulkSelectToggle from "@/components/admin/BulkSelectToggle";
import BulkSelectCheckbox from "@/components/admin/BulkSelectCheckbox";
import BulkConfirmDialog, { BulkActionTone, BulkImpactRow } from "@/components/admin/BulkConfirmDialog";
import BulkActionsBar from "@/components/admin/BulkActionsBar";
import { CheckCircle, XCircle, ArrowUpRight } from "lucide-react";

type Dispute = {
  id: string;
  ticket_no: string;
  user_email: string | null;
  user_phone: string | null;
  category: string;
  subject: string;
  description: string | null;
  status: string;
  priority: string;
  refund_amount: number | null;
  refund_status: string | null;
  sla_due_at: string | null;
  resolved_at: string | null;
  resolution_note: string | null;
  created_at: string;
};

const statusColor: Record<string, string> = {
  open: "bg-amber-500/15 text-amber-700",
  in_progress: "bg-sky-500/15 text-sky-700",
  escalated: "bg-rose-500/15 text-rose-700",
  resolved: "bg-emerald-500/15 text-emerald-700",
  closed: "bg-muted text-muted-foreground",
};

const AdminDisputes = () => {
  const [items, setItems] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("active");

  const load = async () => {
    setLoading(true);
    let q = supabase.from("disputes").select("*").order("created_at", { ascending: false }).limit(200);
    if (filter === "active") q = q.in("status", ["open", "in_progress", "escalated"]);
    else if (filter !== "all") q = q.eq("status", filter);
    const { data } = await q;
    setItems((data as Dispute[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter]);

  const updateStatus = async (id: string, status: string) => {
    const updates: any = { status };
    if (status === "resolved" || status === "closed") updates.resolved_at = new Date().toISOString();
    const { error } = await supabase.from("disputes").update(updates).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("আপডেট সম্পন্ন");
    load();
  };

  const sel = useBulkSelection(items, [filter]);
  const perms = useBulkPermissions("contact_messages");

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

  const bulkUpdate = async (status: string) => {
    if (sel.selectedIds.length === 0) return;
    const updates: any = { status };
    if (status === "resolved" || status === "closed") updates.resolved_at = new Date().toISOString();
    const { error } = await supabase.from("disputes").update(updates).in("id", sel.selectedIds);
    if (error) { toast.error(error.message); return; }
    toast.success(`${sel.selectedIds.length}টি অভিযোগ আপডেট হয়েছে`);
    sel.clear();
    load();
  };

  const isOverdue = (d: Dispute) =>
    d.sla_due_at && !d.resolved_at && new Date(d.sla_due_at) < new Date() && d.status !== "resolved" && d.status !== "closed";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <LifeBuoy className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-semibold">অভিযোগ ও রিফান্ড</h1>
        <span className="ml-auto" />
        {(["active", "open", "in_progress", "escalated", "resolved", "all"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`text-xs rounded-full px-3 py-1 transition ${
              filter === s ? "bg-primary text-white" : "bg-muted hover:bg-muted/70"
            }`}
          >
            {s === "active" ? "সক্রিয়" : s === "all" ? "সব" : s}
          </button>
        ))}
      </div>

      {items.length > 0 && (
        <div className="flex items-center justify-end">
          <BulkSelectToggle
            allSelected={sel.allSelected}
            someSelected={sel.someSelected}
            selectedCount={sel.selectedCount}
            totalCount={items.length}
            onToggle={sel.toggleAll}
          />
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center text-sm text-muted-foreground">লোড হচ্ছে...</div>
      ) : items.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">
          <CheckCircle2 className="h-10 w-10 mx-auto opacity-30 mb-2" />
          কোনো অভিযোগ নেই
        </Card>
      ) : (
        <div className="grid gap-3">
          {items.map((d) => (
            <Card key={d.id} className={`p-4 ${sel.isSelected(d.id) ? "ring-2 ring-primary/40 bg-primary/5" : isOverdue(d) ? "ring-2 ring-rose-500/40" : ""}`}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <BulkSelectCheckbox
                  checked={sel.isSelected(d.id)}
                  onChange={() => sel.toggle(d.id)}
                  className="mt-1"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">{d.ticket_no}</span>
                    <Badge className={statusColor[d.status]}>{d.status}</Badge>
                    <Badge variant="outline" className="text-xs">{d.category}</Badge>
                    {isOverdue(d) && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-rose-600 font-semibold">
                        <AlertTriangle className="h-3 w-3" /> SLA Overdue
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-sm">{d.subject}</h3>
                  {d.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{d.description}</p>}
                  <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground flex-wrap">
                    <span>📧 {d.user_email ?? "—"}</span>
                    <span>📱 {d.user_phone ?? "—"}</span>
                    {d.refund_amount && <span className="text-amber-700">💰 ৳{d.refund_amount}</span>}
                    <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(d.created_at).toLocaleString("bn-BD")}</span>
                  </div>
                  {d.resolution_note && (
                    <p className="text-[11px] mt-2 p-2 bg-emerald-500/10 rounded">✓ {d.resolution_note}</p>
                  )}
                </div>

                <div className="w-44">
                  <Select value={d.status} onValueChange={(v) => updateStatus(d.id, v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="escalated">Escalated</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <BulkActionsBar
        count={sel.selectedCount}
        onClear={sel.clear}
        actions={[
          { key: "in_progress", label: "প্রক্রিয়াধীন", icon: <ArrowUpRight className="h-3.5 w-3.5" />,
            disabled: !perms.canUpdate, disabledReason: perms.reasonFor("can_update"),
            onClick: () => setPendingBulk({
              tone: "neutral", title: "নির্বাচিত অভিযোগ প্রক্রিয়াধীন করবেন?",
              description: "অভিযোগগুলো রিভিউ পর্যায়ে যাবে এবং SLA শুরু হবে।",
              impacts: [
                { label: "স্ট্যাটাস", value: "প্রক্রিয়াধীন (in_progress)" },
                { label: "অ্যাসাইনি", value: "আপনি" },
              ],
              confirmLabel: "হ্যাঁ, আপডেট করুন", run: () => bulkUpdate("in_progress"),
            })},
          { key: "resolved", label: "সমাধান", icon: <CheckCircle className="h-3.5 w-3.5" />, variant: "primary",
            disabled: !perms.canUpdate, disabledReason: perms.reasonFor("can_update"),
            onClick: () => setPendingBulk({
              tone: "approve", title: "নির্বাচিত অভিযোগ সমাধান হিসেবে চিহ্নিত করবেন?",
              description: "ব্যবহারকারীকে সমাধানের নোটিফিকেশন পাঠানো হবে।",
              impacts: [
                { label: "স্ট্যাটাস", value: "সমাধান (resolved)" },
                { label: "সমাধানের সময়", value: "এখন" },
              ],
              confirmLabel: "হ্যাঁ, সমাধান", run: () => bulkUpdate("resolved"),
            })},
          { key: "closed", label: "বন্ধ", icon: <XCircle className="h-3.5 w-3.5" />, variant: "destructive",
            disabled: !perms.canUpdate, disabledReason: perms.reasonFor("can_update"),
            onClick: () => setPendingBulk({
              tone: "reject", title: "নির্বাচিত অভিযোগগুলো বন্ধ করবেন?",
              description: "অভিযোগ আর্কাইভ হবে এবং নতুন বার্তা গ্রহণ করবে না।",
              impacts: [
                { label: "স্ট্যাটাস", value: "বন্ধ (closed)" },
                { label: "নতুন বার্তা", value: "ব্লক" },
              ],
              warning: "বন্ধ অভিযোগে ব্যবহারকারী আর প্রতিক্রিয়া দিতে পারবে না।",
              confirmLabel: "হ্যাঁ, বন্ধ করুন", run: () => bulkUpdate("closed"),
            })},
        ]}
      />

      <BulkConfirmDialog
        open={!!pendingBulk}
        onOpenChange={(o) => { if (!o) setPendingBulk(null); }}
        onConfirm={runBulk}
        count={sel.selectedCount}
        itemLabel="অভিযোগ"
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

export default AdminDisputes;