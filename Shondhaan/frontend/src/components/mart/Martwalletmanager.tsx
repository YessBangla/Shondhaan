import { useCallback, useEffect, useMemo, useState } from "react";
import { Wallet, Search, ArrowUpCircle, ArrowDownCircle, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { getMySqlAuth } from "@/lib/mysqlAuth";

interface WalletRow {
  seller_id: number; shop_name: string; shop_name_bn: string; phone: string;
  balance: number; pending_balance: number; total_earned: number; total_withdrawn: number;
  last_transaction_at: string | null; status: "active" | "frozen";
}

const money = (value: number) => `৳${Number(value || 0).toLocaleString("bn-BD")}`;

const MartWalletManager = ({ bn }: { bn: boolean }) => {
  const apiBaseUrl = import.meta.env.VITE_MART_API_BASE_URL || import.meta.env.VITE_API_BASE || "http://localhost:8081";
  const [wallets, setWallets] = useState<WalletRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [adjustTarget, setAdjustTarget] = useState<WalletRow | null>(null);
  const [adjustType, setAdjustType] = useState<"credit" | "debit">("credit");
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustNote, setAdjustNote] = useState("");

  const loadWallets = useCallback(async () => {
    setLoading(true);
    try {
      const auth = getMySqlAuth();
      const response = await fetch(`${apiBaseUrl}/api/mart-wallets`, { credentials: "include", headers: auth?.token ? { Authorization: `Bearer ${auth.token}` } : {} });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const json = await response.json();
      setWallets(json.data || []);
    } catch (error) {
      console.error("Load mart wallets error:", error);
      toast.error(bn ? "ওয়ালেট লোড করা যায়নি" : "Failed to load wallets");
      setWallets([]);
    } finally { setLoading(false); }
  }, [apiBaseUrl, bn]);

  useEffect(() => { loadWallets(); }, [loadWallets]);

  const filtered = useMemo(() => wallets.filter((w) => {
    const term = search.toLowerCase();
    return (!term || w.shop_name.toLowerCase().includes(term) || w.shop_name_bn?.includes(search) || w.phone?.includes(search)) &&
      (statusFilter === "all" || w.status === statusFilter);
  }), [wallets, search, statusFilter]);

  const totals = useMemo(() => wallets.reduce((acc, w) => ({ balance: acc.balance + Number(w.balance), pending: acc.pending + Number(w.pending_balance), withdrawn: acc.withdrawn + Number(w.total_withdrawn) }), { balance: 0, pending: 0, withdrawn: 0 }), [wallets]);

  const openAdjust = (wallet: WalletRow, type: "credit" | "debit") => { setAdjustTarget(wallet); setAdjustType(type); setAdjustAmount(""); setAdjustNote(""); };
  const submitAdjustment = async () => {
    if (!adjustTarget) return;
    const amount = Number(adjustAmount);
    if (!amount || amount <= 0) return toast.error(bn ? "সঠিক পরিমাণ দিন" : "Enter a valid amount");
    setSaving(true);
    try {
      const auth = getMySqlAuth();
      const response = await fetch(`${apiBaseUrl}/api/mart-wallets/${adjustTarget.seller_id}/adjust`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json", ...(auth?.token ? { Authorization: `Bearer ${auth.token}` } : {}) },
        body: JSON.stringify({ type: adjustType, amount, note: adjustNote }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.message || `HTTP ${response.status}`);
      toast.success(adjustType === "credit" ? (bn ? "ব্যালেন্স যোগ হয়েছে" : "Balance credited") : (bn ? "ব্যালেন্স কাটা হয়েছে" : "Balance debited"));
      setAdjustTarget(null); await loadWallets();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Balance update failed"); }
    finally { setSaving(false); }
  };

  const summary = [
    [Wallet, "text-green-600 bg-green-50", bn ? "মোট এভেইলেবল ব্যালেন্স" : "Total available balance", totals.balance],
    [History, "text-yellow-600 bg-yellow-50", bn ? "পেন্ডিং ব্যালেন্স" : "Pending balance", totals.pending],
    [ArrowDownCircle, "text-blue-600 bg-blue-50", bn ? "মোট উইথড্র হয়েছে" : "Total withdrawn", totals.withdrawn],
  ] as const;
  return <div className="space-y-4">
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">{summary.map(([Icon, color, label, value]) => <Card key={label} className="border-border/50"><CardContent className="p-4 flex items-center gap-3"><div className={`${color} p-2 rounded-lg`}><Icon className="h-5 w-5" /></div><div><p className="text-sm text-muted-foreground">{label}</p><p className="text-lg font-bold">{money(value)}</p></div></CardContent></Card>)}</div>
    <div className="flex flex-col md:flex-row gap-3"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder={bn ? "শপ বা ফোন নম্বর খুঁজুন..." : "Search shop or phone..."} value={search} onChange={(e) => setSearch(e.target.value)} /></div><Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-full md:w-44"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{bn ? "সকল" : "All"}</SelectItem><SelectItem value="active">{bn ? "সক্রিয়" : "Active"}</SelectItem><SelectItem value="frozen">{bn ? "স্থগিত" : "Frozen"}</SelectItem></SelectContent></Select></div>
    <div className="overflow-x-auto rounded-lg border border-border/50"><table className="w-full text-sm"><thead className="bg-muted/50"><tr>{[bn ? "সেলার" : "Seller", bn ? "ব্যালেন্স" : "Balance", bn ? "পেন্ডিং" : "Pending", bn ? "মোট আয়" : "Total earned", bn ? "মোট উইথড্র" : "Total withdrawn", bn ? "স্ট্যাটাস" : "Status", bn ? "সর্বশেষ লেনদেন" : "Last activity", bn ? "অ্যাকশন" : "Action"].map((label, index) => <th key={label} className={`p-3 font-medium ${index >= 1 && index <= 4 ? "text-right" : index > 4 ? "text-center" : "text-left"}`}>{label}</th>)}</tr></thead><tbody>
      {!loading && filtered.map((w) => <tr key={w.seller_id} className="border-t border-border/30 hover:bg-muted/30"><td className="p-3"><div className="flex flex-col"><span className="font-medium">{bn ? (w.shop_name_bn || w.shop_name) : w.shop_name}</span><span className="text-[10px] text-muted-foreground">{w.phone}</span></div></td><td className="p-3 text-right font-bold">{money(w.balance)}</td><td className="p-3 text-right text-muted-foreground">{money(w.pending_balance)}</td><td className="p-3 text-right">{money(w.total_earned)}</td><td className="p-3 text-right">{money(w.total_withdrawn)}</td><td className="p-3 text-center"><Badge className={w.status === "active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>{w.status === "active" ? (bn ? "সক্রিয়" : "Active") : (bn ? "স্থগিত" : "Frozen")}</Badge></td><td className="p-3 text-center text-xs text-muted-foreground">{w.last_transaction_at ? new Date(w.last_transaction_at).toLocaleString(bn ? "bn-BD" : "en-BD") : "—"}</td><td className="p-3"><div className="flex justify-center gap-1"><Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => openAdjust(w, "credit")}><ArrowUpCircle className="h-3.5 w-3.5 text-green-600" />{bn ? "যোগ" : "Credit"}</Button><Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => openAdjust(w, "debit")}><ArrowDownCircle className="h-3.5 w-3.5 text-red-600" />{bn ? "কাটা" : "Debit"}</Button></div></td></tr>)}
      {(loading || filtered.length === 0) && <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">{loading ? (bn ? "ওয়ালেট লোড হচ্ছে..." : "Loading wallets...") : (bn ? "কোনো ওয়ালেট পাওয়া যায়নি" : "No wallets found")}</td></tr>}
    </tbody></table></div>
    <Dialog open={!!adjustTarget} onOpenChange={(open) => { if (!open) setAdjustTarget(null); }}><DialogContent className="max-w-sm"><DialogHeader><DialogTitle>{adjustType === "credit" ? (bn ? "ব্যালেন্স যোগ করুন" : "Credit balance") : (bn ? "ব্যালেন্স কাটুন" : "Debit balance")}</DialogTitle></DialogHeader>{adjustTarget && <div className="space-y-3"><p className="text-sm font-medium">{bn ? (adjustTarget.shop_name_bn || adjustTarget.shop_name) : adjustTarget.shop_name}</p><p className="text-xs text-muted-foreground">{bn ? "বর্তমান ব্যালেন্স: " : "Current balance: "}{money(adjustTarget.balance)}</p><Input type="number" min="0" placeholder={bn ? "পরিমাণ" : "Amount"} value={adjustAmount} onChange={(e) => setAdjustAmount(e.target.value)} /><Input placeholder={bn ? "নোট (ঐচ্ছিক)" : "Note (optional)"} value={adjustNote} onChange={(e) => setAdjustNote(e.target.value)} /></div>}<DialogFooter><Button variant="outline" onClick={() => setAdjustTarget(null)}>{bn ? "বাতিল" : "Cancel"}</Button><Button onClick={submitAdjustment} disabled={saving}>{saving ? (bn ? "সংরক্ষণ হচ্ছে..." : "Saving...") : (bn ? "নিশ্চিত করুন" : "Confirm")}</Button></DialogFooter></DialogContent></Dialog>
  </div>;
};

export default MartWalletManager;
