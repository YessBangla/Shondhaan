import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Coins, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const API = "http://localhost:5000/api/referral/admin";

export default function ReferralTransactions() {
  const [txns, setTxns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchTxns = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "50",
        ...(statusFilter !== "all" ? { status: statusFilter } : {}),
      });
      const res = await fetch(`${API}/transactions?${params}`);
      const json = await res.json();
      setTxns(json.data || []);
      setTotalPages(json.totalPages || 1);
    } catch {
      toast.error("লোড করতে সমস্যা");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchTxns();
  }, [fetchTxns]);

  const statusColor = (s: string) => {
    switch (s) {
      case "COMPLETED":
        return "bg-emerald-100 text-emerald-700";
      case "PENDING":
        return "bg-yellow-100 text-yellow-700";
      case "FAILED":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Coins className="h-5 w-5" /> রিওয়ার্ড ট্রানজেকশন
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          সকল রেফারেল পুরস্কার ক্রেডিট/ডেবিট দেখুন
        </p>
      </div>

      <div className="flex gap-2">
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">সব</SelectItem>
            <SelectItem value="COMPLETED">সম্পন্ন</SelectItem>
            <SelectItem value="PENDING">পেন্ডিং</SelectItem>
            <SelectItem value="FAILED">ব্যর্থ</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={fetchTxns}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground">তারিখ</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground">ইউজার</th>
                <th className="text-center px-3 py-2.5 text-xs font-semibold text-muted-foreground">ধরন</th>
                <th className="text-center px-3 py-2.5 text-xs font-semibold text-muted-foreground">মুদ্রা</th>
                <th className="text-right px-3 py-2.5 text-xs font-semibold text-muted-foreground">পরিমাণ</th>
                <th className="text-center px-3 py-2.5 text-xs font-semibold text-muted-foreground">অবস্থা</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground">বিবরণ</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-muted-foreground">
                    <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-2" />
                    লোড হচ্ছে...
                  </td>
                </tr>
              ) : txns.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-muted-foreground">
                    <Coins className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    কোনো ট্রানজেকশন নেই
                  </td>
                </tr>
              ) : (
                txns.map((t) => (
                  <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-3 py-2.5 text-[11px] text-muted-foreground whitespace-nowrap">
                      {t.created_at
                        ? new Date(t.created_at).toLocaleString("bn-BD")
                        : "—"}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="text-xs font-medium">{t.user_name || "—"}</div>
                    </td>
                    <td className="text-center px-3 py-2.5">
                      <Badge
                        variant={t.type === "CREDIT" ? "default" : "secondary"}
                        className={`text-[10px] ${
                          t.type === "CREDIT"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {t.type}
                      </Badge>
                    </td>
                    <td className="text-center px-3 py-2.5 text-[11px]">
                      {t.currency_type === "COIN" ? "🪙" : "৳"}
                    </td>
                    <td className="text-right px-3 py-2.5 text-xs font-semibold">
                      {t.currency_type === "COIN" ? "" : "৳"}
                      {Number(t.amount || 0).toLocaleString("bn-BD")}
                    </td>
                    <td className="text-center px-3 py-2.5">
                      <Badge
                        variant="secondary"
                        className={`text-[10px] ${statusColor(t.status)}`}
                      >
                        {t.status}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5 text-[11px] text-muted-foreground max-w-[200px] truncate">
                      {t.description || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 pt-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            আগে
          </Button>
          <span className="text-xs text-muted-foreground px-2">
            {page} / {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            পরে
          </Button>
        </div>
      )}
    </div>
  );
}