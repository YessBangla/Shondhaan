import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Coins, RefreshCw, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { getMySqlAuth } from "@/lib/mysqlAuth";
const API = "http://localhost:5000/api/referral/admin";

const authHeaders = () => {
  const auth = getMySqlAuth();
  return {
    "Content-Type": "application/json",
    ...(auth?.token ? { Authorization: `Bearer ${auth.token}` } : {}),
  };
};

const statusLabel = (s: string) => {
  switch (s) {
    case "pending":   return "পেন্ডিং";
    case "available": return "অপেক্ষমান";
    case "claimed":   return "দাবিকৃত";
    case "expired":   return "মেয়াদোত্তীর্ণ";
    default:          return s;
  }
};

const statusColor = (s: string) => {
  switch (s) {
    case "claimed":   return "bg-emerald-100 text-emerald-700";
    case "available": return "bg-blue-100 text-blue-700";
    case "pending":   return "bg-yellow-100 text-yellow-700";
    case "expired":   return "bg-gray-200 text-gray-600";
    default:          return "bg-gray-100 text-gray-700";
  }
};

const roleLabel = (r: string) => {
  switch (r) {
    case "referrer":  return "রেফারার";
    case "referred":  return "রেফার্ড";
    default:          return r;
  }
};

const roleColor = (r: string) => {
  return r === "referrer"
    ? "bg-violet-100 text-violet-700"
    : "bg-sky-100 text-sky-700";
};

export default function ReferralTransactions() {
  const [txns, setTxns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [summary, setSummary] = useState<any>({});

  const fetchTxns = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "50",
        ...(statusFilter !== "all" ? { status: statusFilter } : {}),
      });
      const res = await fetch(`${API}/transactions?${params}`, {
        headers: authHeaders(),
      });
      const json = await res.json();
      setTxns(json.data || []);
      setTotalPages(json.totalPages || 1);
      if (json.summary) setSummary(json.summary);
    } catch {
      toast.error("লোড করতে সমস্যা");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchTxns();
  }, [fetchTxns]);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Coins className="h-5 w-5" /> রিওয়ার্ড ট্রানজেকশন
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          সকল রেফারেল পুরস্কারের তথ্য দেখুন
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: "মোট", value: summary.total_rewards || 0, color: "text-foreground" },
          { label: "পেন্ডিং", value: summary.pending_count || 0, color: "text-yellow-600" },
          { label: "অপেক্ষমান", value: summary.available_count || 0, color: "text-blue-600" },
          { label: "দাবিকৃত", value: summary.claimed_count || 0, color: "text-emerald-600" },
        ].map((card) => (
          <div key={card.label} className="rounded-lg border bg-card p-3">
            <p className="text-[10px] text-muted-foreground">{card.label}</p>
            <p className={`text-lg font-bold ${card.color}`}>
              {Number(card.value).toLocaleString("bn-BD")}
            </p>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">সব</SelectItem>
            <SelectItem value="pending">পেন্ডিং</SelectItem>
            <SelectItem value="available">অপেক্ষমান</SelectItem>
            <SelectItem value="claimed">দাবিকৃত</SelectItem>
            <SelectItem value="expired">মেয়াদোত্তীর্ণ</SelectItem>
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
                <th className="text-center px-3 py-2.5 text-xs font-semibold text-muted-foreground">ভূমিকা</th>
                <th className="text-center px-3 py-2.5 text-xs font-semibold text-muted-foreground">কোড</th>
                <th className="text-center px-3 py-2.5 text-xs font-semibold text-muted-foreground">মুদ্রা</th>
                <th className="text-right px-3 py-2.5 text-xs font-semibold text-muted-foreground">পরিমাণ</th>
                <th className="text-center px-3 py-2.5 text-xs font-semibold text-muted-foreground">অবস্থা</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground">দাবি</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-muted-foreground">
                    <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-2" />
                    লোড হচ্ছে...
                  </td>
                </tr>
              ) : txns.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-muted-foreground">
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
                      <div className="text-[10px] text-muted-foreground">{t.user_email || ""}</div>
                    </td>
                    <td className="text-center px-3 py-2.5">
                      <Badge
                        variant="secondary"
                        className={`text-[10px] ${roleColor(t.role)}`}
                      >
                        {roleLabel(t.role)}
                      </Badge>
                    </td>
                    <td className="text-center px-3 py-2.5">
                      {t.referral_code ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-foreground">
                          <Link2 className="h-3 w-3 text-muted-foreground" />
                          {t.referral_code}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="text-center px-3 py-2.5 text-[11px]">
                      {t.reward_currency === "COIN" ? "🪙" : "৳"}
                    </td>
                    <td className="text-right px-3 py-2.5 text-xs font-semibold">
                      {t.reward_currency === "COIN" ? "" : "৳"}
                      {Number(t.reward_amount || 0).toLocaleString("bn-BD")}
                    </td>
                    <td className="text-center px-3 py-2.5">
                      <Badge
                        variant="secondary"
                        className={`text-[10px] ${statusColor(t.status)}`}
                      >
                        {statusLabel(t.status)}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5 text-[11px] text-muted-foreground whitespace-nowrap">
                      {t.claimed_at
                        ? new Date(t.claimed_at).toLocaleString("bn-BD")
                        : t.expires_at
                          ? new Date(t.expires_at).toLocaleDateString("bn-BD")
                          : "—"}
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