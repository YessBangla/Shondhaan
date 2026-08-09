import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Inbox, CheckCircle2, XCircle, Clock, Filter } from "lucide-react";
import { useBulkSelection } from "@/hooks/useBulkSelection";
import { useBulkPermissions } from "@/hooks/useBulkPermissions";
import BulkSelectToggle from "@/components/admin/BulkSelectToggle";
import BulkActionsBar from "@/components/admin/BulkActionsBar";
import BulkSelectCheckbox from "@/components/admin/BulkSelectCheckbox";
import BulkConfirmDialog, { BulkActionTone, BulkImpactRow } from "@/components/admin/BulkConfirmDialog";

type Item = {
  id: string;
  entity_type: string;
  entity_id: string;
  submitter_name: string | null;
  title: string;
  summary: string | null;
  status: string;
  priority: string;
  review_note: string | null;
  reviewed_at: string | null;
  created_at: string;
};

const priorityStyles: Record<string, string> = {
  urgent: "bg-rose-500/15 text-rose-700 ring-1 ring-rose-500/30",
  high: "bg-amber-500/15 text-amber-700 ring-1 ring-amber-500/30",
  normal: "bg-sky-500/15 text-sky-700 ring-1 ring-sky-500/30",
  low: "bg-muted text-muted-foreground",
};

const statusStyles: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-700",
  approved: "bg-emerald-500/15 text-emerald-700",
  rejected: "bg-rose-500/15 text-rose-700",
};

const AdminApprovalQueue = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const load = async () => {
    setLoading(true);
    let q = supabase.from("approval_queue").select("*").order("created_at", { ascending: false }).limit(200);
    if (filter !== "all") q = q.eq("status", filter);
    const { data } = await q;
    setItems((data as Item[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter]);

  const decide = async (id: string, status: "approved" | "rejected") => {
    const { error } = await supabase
      .from("approval_queue")
      .update({ status, review_note: note || null, reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
      .eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(status === "approved" ? "অনুমোদিত হয়েছে" : "প্রত্যাখ্যান করা হয়েছে");
    setNote(""); setNoteFor(null);
    load();
  };

  const pendingItems = items.filter((i) => i.status === "pending");
  const sel = useBulkSelection(pendingItems, [filter]);
  const perms = useBulkPermissions("admin_panel");

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

  const bulkDecide = async (status: "approved" | "rejected") => {
    if (sel.selectedIds.length === 0) return;
    const { error } = await supabase
      .from("approval_queue")
      .update({ status, reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
      .in("id", sel.selectedIds);
    if (error) { toast.error(error.message); return; }
    toast.success(`${sel.selectedIds.length}টি ${status === "approved" ? "অনুমোদিত" : "প্রত্যাখ্যাত"}`);
    sel.clear();
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Inbox className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-semibold">অনুমোদন কিউ</h1>
        <span className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Filter className="h-3 w-3" /> ফিল্টার:
        </span>
        {(["pending", "approved", "rejected", "all"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`text-xs rounded-full px-3 py-1 transition ${
              filter === s ? "bg-primary text-white" : "bg-muted hover:bg-muted/70"
            }`}
          >
            {s === "pending" ? "অপেক্ষমাণ" : s === "approved" ? "অনুমোদিত" : s === "rejected" ? "প্রত্যাখ্যাত" : "সব"}
          </button>
        ))}
      </div>

      {filter === "pending" && pendingItems.length > 0 && (
        <div className="flex items-center justify-end">
          <BulkSelectToggle
            allSelected={sel.allSelected}
            someSelected={sel.someSelected}
            selectedCount={sel.selectedCount}
            totalCount={pendingItems.length}
            onToggle={sel.toggleAll}
            label="সব অপেক্ষমাণ নির্বাচন"
          />
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center text-sm text-muted-foreground">লোড হচ্ছে...</div>
      ) : items.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">
          <Inbox className="h-10 w-10 mx-auto opacity-30 mb-2" />
          কোনো এন্ট্রি পাওয়া যায়নি
        </Card>
      ) : (
        <div className="grid gap-3">
          {items.map((item) => (
            <Card key={item.id} className={`p-4 hover:shadow-md transition-shadow ${sel.isSelected(item.id) ? "ring-2 ring-primary/40 bg-primary/5" : ""}`}>
              <div className="flex items-start gap-3">
                {item.status === "pending" && (
                  <BulkSelectCheckbox
                    checked={sel.isSelected(item.id)}
                    onChange={() => sel.toggle(item.id)}
                    className="mt-1"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Badge className={priorityStyles[item.priority] ?? "bg-muted"}>{item.priority}</Badge>
                    <Badge variant="outline" className="text-xs">{item.entity_type}</Badge>
                    <Badge className={statusStyles[item.status]}>{item.status}</Badge>
                  </div>
                  <h3 className="font-semibold text-sm">{item.title}</h3>
                  {item.summary && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.summary}</p>}
                  <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                    <span>👤 {item.submitter_name ?? "—"}</span>
                    <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(item.created_at).toLocaleString("bn-BD")}</span>
                  </div>
                  {item.review_note && (
                    <p className="text-[11px] mt-2 p-2 bg-muted/40 rounded">📝 {item.review_note}</p>
                  )}
                </div>
              </div>

              {item.status === "pending" && (
                <div className="mt-3 space-y-2">
                  {noteFor === item.id && (
                    <Textarea
                      placeholder="মন্তব্য (ঐচ্ছিক)..."
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      rows={2}
                      className="text-xs"
                    />
                  )}
                  <div className="flex gap-2">
                    <Button size="sm" className="gap-1" onClick={() => decide(item.id, "approved")}>
                      <CheckCircle2 className="h-4 w-4" /> অনুমোদন
                    </Button>
                    <Button size="sm" variant="destructive" className="gap-1" onClick={() => decide(item.id, "rejected")}>
                      <XCircle className="h-4 w-4" /> প্রত্যাখ্যান
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setNoteFor(noteFor === item.id ? null : item.id); setNote(""); }}>
                      {noteFor === item.id ? "বাতিল" : "নোট যোগ"}
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <BulkActionsBar
        count={sel.selectedCount}
        onClear={sel.clear}
        actions={[
          { key: "approve", label: "অনুমোদন", icon: <CheckCircle2 className="h-3.5 w-3.5" />, variant: "primary",
            disabled: !perms.canUpdate, disabledReason: perms.reasonFor("can_update"),
            onClick: () => setPendingBulk({
              tone: "approve", title: "নির্বাচিত আইটেম অনুমোদন করবেন?",
              description: "আইটেমগুলো লাইভ যাবে এবং পাবলিক ফিডে আসবে।",
              impacts: [
                { label: "স্ট্যাটাস", value: "অনুমোদিত (approved)" },
                { label: "রিভিউয়ার", value: "আপনি" },
                { label: "রিভিউয়ের সময়", value: "এখন" },
              ],
              confirmLabel: "হ্যাঁ, অনুমোদন", run: () => bulkDecide("approved"),
            })},
          { key: "reject", label: "প্রত্যাখ্যান", icon: <XCircle className="h-3.5 w-3.5" />, variant: "destructive",
            disabled: !perms.canUpdate, disabledReason: perms.reasonFor("can_update"),
            onClick: () => setPendingBulk({
              tone: "reject", title: "নির্বাচিত আইটেম প্রত্যাখ্যান করবেন?",
              description: "আইটেমগুলো প্রত্যাখ্যাত হিসেবে আর্কাইভ হবে।",
              impacts: [
                { label: "স্ট্যাটাস", value: "প্রত্যাখ্যাত (rejected)" },
                { label: "রিভিউয়ার", value: "আপনি" },
              ],
              warning: "প্রত্যাখ্যাত আইটেম পুনরায় অনুমোদন কিউয়ে আসবে না।",
              confirmLabel: "হ্যাঁ, প্রত্যাখ্যান", run: () => bulkDecide("rejected"),
            })},
        ]}
      />

      <BulkConfirmDialog
        open={!!pendingBulk}
        onOpenChange={(o) => { if (!o) setPendingBulk(null); }}
        onConfirm={runBulk}
        count={sel.selectedCount}
        itemLabel="আইটেম"
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

export default AdminApprovalQueue;