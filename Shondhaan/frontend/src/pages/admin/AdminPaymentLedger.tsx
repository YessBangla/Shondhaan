import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BookOpenCheck, Search, Download, TrendingUp, TrendingDown, FileText } from "lucide-react";
import { printLetterhead, letterheadPage, letterheadHeader } from "@/lib/letterheadPrint";

type Ledger = {
  id: string;
  user_id: string | null;
  recipient_id: string | null;
  amount: number;
  currency: string;
  type: string;
  source_table: string;
  source_id: string | null;
  payment_method: string | null;
  transaction_id: string | null;
  status: string;
  notes: string | null;
  created_at: string;
};

const typeColor: Record<string, string> = {
  income: "bg-emerald-500/15 text-emerald-700",
  refund: "bg-rose-500/15 text-rose-700",
  commission: "bg-amber-500/15 text-amber-700",
  payout: "bg-blue-500/15 text-blue-700",
  fee: "bg-purple-500/15 text-purple-700",
  adjustment: "bg-muted text-foreground",
};

const statusColor: Record<string, string> = {
  completed: "bg-emerald-500/15 text-emerald-700",
  pending: "bg-amber-500/15 text-amber-700",
  failed: "bg-rose-500/15 text-rose-700",
  cancelled: "bg-muted text-muted-foreground",
  refunded: "bg-blue-500/15 text-blue-700",
};

const AdminPaymentLedger = () => {
  const [rows, setRows] = useState<Ledger[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("payment_ledger")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      setRows((data as Ledger[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const totals = useMemo(() => {
    const income = rows.filter((r) => r.type === "income" && r.status === "completed")
      .reduce((s, r) => s + Number(r.amount), 0);
    const refunds = rows.filter((r) => r.type === "refund" && r.status === "completed")
      .reduce((s, r) => s + Number(r.amount), 0);
    const commissions = rows.filter((r) => r.type === "commission" && r.status === "completed")
      .reduce((s, r) => s + Number(r.amount), 0);
    const pending = rows.filter((r) => r.status === "pending")
      .reduce((s, r) => s + Number(r.amount), 0);
    return { income, refunds, commissions, pending };
  }, [rows]);

  const filtered = rows.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      r.source_table.toLowerCase().includes(q) ||
      (r.transaction_id ?? "").toLowerCase().includes(q) ||
      (r.payment_method ?? "").toLowerCase().includes(q) ||
      r.type.toLowerCase().includes(q) ||
      r.status.toLowerCase().includes(q)
    );
  });

  const exportCSV = () => {
    const header = "তারিখ,ধরন,উৎস,পেমেন্ট মেথড,পরিমাণ,স্ট্যাটাস,Transaction ID\n";
    const body = filtered.map((r) =>
      [new Date(r.created_at).toLocaleString("bn-BD"), r.type, r.source_table,
        r.payment_method ?? "", r.amount, r.status, r.transaction_id ?? ""].join(",")
    ).join("\n");
    const blob = new Blob(["\uFEFF" + header + body], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payment-ledger-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    const fmt = (n: number) => `৳${Number(n).toLocaleString("bn-BD")}`;
    const summary = `
      <table class="lh-table">
        <tbody>
          <tr><td>মোট আয়</td><td style="text-align:end;font-weight:700;">${fmt(totals.income)}</td></tr>
          <tr><td>রিফান্ড</td><td style="text-align:end;font-weight:700;color:#dc2626;">${fmt(totals.refunds)}</td></tr>
          <tr><td>কমিশন</td><td style="text-align:end;font-weight:700;">${fmt(totals.commissions)}</td></tr>
          <tr class="lh-total"><td>পেন্ডিং</td><td style="text-align:end;">${fmt(totals.pending)}</td></tr>
        </tbody>
      </table>`;
    const rows = filtered.slice(0, 50).map((r) => `
      <tr>
        <td>${new Date(r.created_at).toLocaleDateString("bn-BD")}</td>
        <td>${r.type}</td><td style="font-family:monospace;font-size:9pt;">${r.source_table}</td>
        <td>${r.payment_method ?? "—"}</td>
        <td style="text-align:end;">${fmt(Number(r.amount))}</td>
        <td>${r.status}</td>
      </tr>`).join("");
    const inner = `
      ${letterheadHeader({ title: "পেমেন্ট লেজার", subtitle: new Date().toLocaleDateString("bn-BD"),
        left: `মোট এন্ট্রি: ${filtered.length}`, right: "" })}
      <div class="lh-section"><div class="lh-section-title">সারাংশ</div>${summary}</div>
      <div class="lh-section"><div class="lh-section-title">এন্ট্রিসমূহ</div>
        <table class="lh-table"><thead><tr>
          <th>তারিখ</th><th>ধরন</th><th>উৎস</th><th>মেথড</th>
          <th style="text-align:end;">পরিমাণ</th><th>স্ট্যাটাস</th>
        </tr></thead><tbody>${rows}</tbody></table>
        ${filtered.length > 50 ? `<p style="font-size:9pt;color:#64748b;margin-top:3mm;">+${filtered.length - 50} আরও সারি</p>` : ""}
      </div>`;
    printLetterhead({
      title: `Payment Ledger - ${new Date().toISOString().slice(0, 10)}`,
      bodyHtml: letterheadPage(inner),
      language: "bn",
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <BookOpenCheck className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-semibold">পেমেন্ট লেজার</h1>
        <div className="ml-auto flex gap-2">
          <Button onClick={exportCSV} size="sm" variant="outline" className="gap-2">
            <Download className="h-4 w-4" /> CSV
          </Button>
          <Button onClick={exportPDF} size="sm" className="gap-2">
            <FileText className="h-4 w-4" /> PDF
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <TrendingUp className="h-4 w-4 text-emerald-600" /> মোট আয়
          </div>
          <div className="text-xl font-semibold mt-1">৳{totals.income.toLocaleString("bn-BD")}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <TrendingDown className="h-4 w-4 text-rose-600" /> রিফান্ড
          </div>
          <div className="text-xl font-semibold mt-1">৳{totals.refunds.toLocaleString("bn-BD")}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">কমিশন</div>
          <div className="text-xl font-semibold mt-1">৳{totals.commissions.toLocaleString("bn-BD")}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">পেন্ডিং</div>
          <div className="text-xl font-semibold mt-1">৳{totals.pending.toLocaleString("bn-BD")}</div>
        </Card>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="খুঁজুন: ধরন, উৎস, পেমেন্ট মেথড..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">লোড হচ্ছে...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">কোনো এন্ট্রি নেই</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs">
                <tr>
                  <th className="text-left p-3">তারিখ</th>
                  <th className="text-left p-3">ধরন</th>
                  <th className="text-left p-3">উৎস</th>
                  <th className="text-left p-3">মেথড</th>
                  <th className="text-right p-3">পরিমাণ</th>
                  <th className="text-left p-3">স্ট্যাটাস</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                    <td className="p-3 text-xs whitespace-nowrap">
                      {new Date(r.created_at).toLocaleDateString("bn-BD")}
                    </td>
                    <td className="p-3">
                      <Badge className={typeColor[r.type] ?? "bg-muted"}>{r.type}</Badge>
                    </td>
                    <td className="p-3 text-xs font-mono">{r.source_table}</td>
                    <td className="p-3 text-xs">{r.payment_method ?? "—"}</td>
                    <td className="p-3 text-right font-medium">৳{Number(r.amount).toLocaleString("bn-BD")}</td>
                    <td className="p-3">
                      <Badge className={statusColor[r.status] ?? "bg-muted"}>{r.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default AdminPaymentLedger;