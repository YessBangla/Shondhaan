import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RefreshCw, CheckCircle, XCircle, Clock, Wallet, Search } from "lucide-react";

interface Withdrawal {
  id: string;
  rep_id: string;
  amount: number;
  method: string;
  account_number: string;
  account_name: string | null;
  note: string | null;
  status: string;
  admin_note: string | null;
  processed_at: string | null;
  created_at: string;
  rep_name?: string;
}

const methodLabels: Record<string, string> = {
  bkash: "বিকাশ",
  nagad: "নগদ",
  rocket: "রকেট",
  bank: "ব্যাংক ট্রান্সফার",
};

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: "অপেক্ষমাণ", className: "bg-yellow-100 text-yellow-800" },
  approved: { label: "অনুমোদিত", className: "bg-green-100 text-green-800" },
  rejected: { label: "প্রত্যাখ্যাত", className: "bg-red-100 text-red-800" },
  completed: { label: "সম্পন্ন", className: "bg-blue-100 text-blue-800" },
};

const AdminWithdrawals = () => {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});

  const fetchWithdrawals = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("withdrawal_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) { toast.error("ডেটা লোড করতে সমস্যা"); setLoading(false); return; }

    // Fetch rep names
    const repIds = [...new Set((data || []).map((w: any) => w.rep_id))] as string[];
    let repMap: Record<string, string> = {};
    if (repIds.length > 0) {
      const { data: reps } = await supabase
        .from("area_representatives")
        .select("user_id, name")
        .in("user_id", repIds as string[]);
      if (reps) reps.forEach((r: any) => { repMap[r.user_id] = r.name; });
    }

    setWithdrawals((data || []).map((w: any) => ({ ...w, rep_name: repMap[w.rep_id] || w.rep_id?.slice(0, 8) })));
    setLoading(false);
  }, []);

  useEffect(() => { fetchWithdrawals(); }, [fetchWithdrawals]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel("admin-withdrawals")
      .on("postgres_changes", { event: "*", schema: "public", table: "withdrawal_requests" }, () => {
        fetchWithdrawals();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchWithdrawals]);

  const updateStatus = async (id: string, status: string) => {
    setProcessingId(id);
    const withdrawal = withdrawals.find(w => w.id === id);
    const updateData: any = { status, processed_at: new Date().toISOString() };
    if (adminNotes[id]) updateData.admin_note = adminNotes[id];

    const { error } = await (supabase as any)
      .from("withdrawal_requests")
      .update(updateData)
      .eq("id", id);

    if (!error) {
      const statusLabel = status === "approved" ? "অনুমোদিত" : status === "rejected" ? "প্রত্যাখ্যাত" : "সম্পন্ন";
      toast.success(`উইথড্রয়াল ${statusLabel} হয়েছে`);

      // Send notification to representative
      if (withdrawal?.rep_id) {
        const notifMap: Record<string, { title: string; message: string }> = {
          approved: {
            title: "✅ উইথড্রয়াল অনুমোদিত",
            message: `আপনার ৳${withdrawal.amount.toLocaleString("bn-BD")} উইথড্রয়াল রিকোয়েস্ট অনুমোদিত হয়েছে।${adminNotes[id] ? ` নোট: ${adminNotes[id]}` : ""}`,
          },
          rejected: {
            title: "❌ উইথড্রয়াল প্রত্যাখ্যাত",
            message: `আপনার ৳${withdrawal.amount.toLocaleString("bn-BD")} উইথড্রয়াল রিকোয়েস্ট প্রত্যাখ্যাত হয়েছে।${adminNotes[id] ? ` কারণ: ${adminNotes[id]}` : ""}`,
          },
          completed: {
            title: "💰 পেমেন্ট সম্পন্ন",
            message: `আপনার ৳${withdrawal.amount.toLocaleString("bn-BD")} (${methodLabels[withdrawal.method] || withdrawal.method}) পেমেন্ট সফলভাবে প্রেরণ করা হয়েছে।`,
          },
        };
        const notif = notifMap[status];
        if (notif) {
          await supabase.from("notifications").insert({
            user_id: withdrawal.rep_id,
            title: notif.title,
            message: notif.message,
            type: "withdrawal",
          });
        }
      }

      fetchWithdrawals();
    } else {
      toast.error("আপডেট করতে সমস্যা হয়েছে");
    }
    setProcessingId(null);
  };

  const filtered = filter === "all" ? withdrawals : withdrawals.filter(w => w.status === filter);

  const pendingCount = withdrawals.filter(w => w.status === "pending").length;
  const totalPending = withdrawals.filter(w => w.status === "pending").reduce((s, w) => s + w.amount, 0);

  if (loading) return <div className="py-12 text-center text-muted-foreground">লোড হচ্ছে...</div>;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[10px] text-muted-foreground">মোট রিকোয়েস্ট</p>
          <p className="text-xl font-bold text-foreground">{withdrawals.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[10px] text-muted-foreground">অপেক্ষমাণ</p>
          <p className="text-xl font-bold text-yellow-600">{pendingCount}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[10px] text-muted-foreground">অপেক্ষমাণ পরিমাণ</p>
          <p className="text-xl font-bold text-primary">৳{totalPending.toLocaleString("bn-BD")}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[10px] text-muted-foreground">অনুমোদিত</p>
          <p className="text-xl font-bold text-green-600">{withdrawals.filter(w => w.status === "approved" || w.status === "completed").length}</p>
        </div>
      </div>

      {/* Filter & Refresh */}
      <div className="flex items-center gap-2">
        <select value={filter} onChange={e => setFilter(e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground">
          <option value="all">সব ({withdrawals.length})</option>
          <option value="pending">অপেক্ষমাণ ({withdrawals.filter(w => w.status === "pending").length})</option>
          <option value="approved">অনুমোদিত</option>
          <option value="completed">সম্পন্ন</option>
          <option value="rejected">প্রত্যাখ্যাত</option>
        </select>
        <button onClick={fetchWithdrawals} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-secondary">
          <RefreshCw className="h-3.5 w-3.5" /> রিফ্রেশ
        </button>
      </div>

      {/* List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <Wallet className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">কোনো উইথড্রয়াল রিকোয়েস্ট নেই</p>
          </div>
        ) : filtered.map(w => {
          const sc = statusConfig[w.status] || statusConfig.pending;
          return (
            <div key={w.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">{w.rep_name}</p>
                  <p className="text-[10px] text-muted-foreground">{new Date(w.created_at).toLocaleDateString("bn-BD")} {new Date(w.created_at).toLocaleTimeString("bn-BD", { hour: "2-digit", minute: "2-digit" })}</p>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${sc.className}`}>{sc.label}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-muted-foreground">পরিমাণ:</span> <span className="font-bold text-foreground">৳{w.amount.toLocaleString("bn-BD")}</span></div>
                <div><span className="text-muted-foreground">মাধ্যম:</span> <span className="font-medium text-foreground">{methodLabels[w.method] || w.method}</span></div>
                <div><span className="text-muted-foreground">অ্যাকাউন্ট:</span> <span className="font-medium text-foreground">{w.account_number}</span></div>
                {w.account_name && <div><span className="text-muted-foreground">নাম:</span> <span className="font-medium text-foreground">{w.account_name}</span></div>}
              </div>

              {w.note && <p className="text-[11px] text-muted-foreground bg-secondary rounded-lg p-2">📝 {w.note}</p>}

              {w.status === "pending" && (
                <div className="space-y-2 pt-2 border-t border-border">
                  <input
                    type="text"
                    placeholder="অ্যাডমিন নোট (ঐচ্ছিক)"
                    value={adminNotes[w.id] || ""}
                    onChange={e => setAdminNotes(prev => ({ ...prev, [w.id]: e.target.value }))}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateStatus(w.id, "approved")}
                      disabled={processingId === w.id}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      <CheckCircle className="h-3.5 w-3.5" /> অনুমোদন
                    </button>
                    <button
                      onClick={() => updateStatus(w.id, "rejected")}
                      disabled={processingId === w.id}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      <XCircle className="h-3.5 w-3.5" /> প্রত্যাখ্যান
                    </button>
                  </div>
                </div>
              )}

              {w.status === "approved" && (
                <div className="pt-2 border-t border-border">
                  <button
                    onClick={() => updateStatus(w.id, "completed")}
                    disabled={processingId === w.id}
                    className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-white hover:bg-primary/90 disabled:opacity-50"
                  >
                    <CheckCircle className="h-3.5 w-3.5" /> পেমেন্ট সম্পন্ন চিহ্নিত করুন
                  </button>
                </div>
              )}

              {w.admin_note && (
                <p className="text-[10px] text-muted-foreground">অ্যাডমিন নোট: {w.admin_note}</p>
              )}
              {w.processed_at && (
                <p className="text-[10px] text-muted-foreground">প্রক্রিয়াকরণ: {new Date(w.processed_at).toLocaleDateString("bn-BD")}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AdminWithdrawals;
