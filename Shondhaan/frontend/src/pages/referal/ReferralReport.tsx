import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  BarChart3, Gift, Users, Coins, RefreshCw, Trophy,
  TrendingUp, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CENTRAL_API_BASE_URL } from "@/lib/api";

const API = `${CENTRAL_API_BASE_URL}/api/referral/admin`;

export default function ReferralReport() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/report`);
      const json = await res.json();
      setData(json);
    } catch {
      toast.error("রিপোর্ট লোড করতে সমস্যা");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const s = data?.summary || {};
  const cards = [
    {
      label: "মোট কোড",
      value: Number(s.total_codes || 0),
      icon: <Gift className="h-5 w-5" />,
      color: "from-violet-500 to-purple-600",
    },
    {
      label: "সক্রিয় কোড",
      value: Number(s.active_codes || 0),
      icon: <TrendingUp className="h-5 w-5" />,
      color: "from-emerald-500 to-green-600",
    },
    {
      label: "মোট রেফারেল",
      value: Number(s.total_referrals || 0),
      icon: <Users className="h-5 w-5" />,
      color: "from-sky-500 to-blue-600",
    },
    {
      label: "পুরস্কার দেওয়া হয়েছে",
      value: Number(s.rewarded_referrals || 0),
      icon: <Trophy className="h-5 w-5" />,
      color: "from-amber-500 to-orange-600",
    },
  ];

  const statusColor = (st: string) => {
    switch (st) {
      case "rewarded": return "bg-emerald-100 text-emerald-700";
      case "qualified": return "bg-blue-100 text-blue-700";
      case "pending": return "bg-yellow-100 text-yellow-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="h-5 w-5" /> রেফারেল রিপোর্ট
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            রেফারেল প্রোগ্রামের সামগ্রিক পরিসংখ্যান
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchReport} className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" /> রিফ্রেশ
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-lg border bg-card p-4 space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">{c.label}</span>
              <div className={`h-8 w-8 rounded-lg bg-gradient-to-br ${c.color} flex items-center justify-center text-white`}>
                {c.icon}
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {c.value.toLocaleString("bn-BD")}
            </p>
          </div>
        ))}
      </div>

      {/* Total Rewards Paid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-lg border bg-gradient-to-br from-emerald-50 to-green-50 p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
            <Coins className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">মোট ক্যাশ পুরস্কার</p>
            <p className="text-lg font-bold text-emerald-700">
              ৳{Number(s.total_rewards_paid || 0).toLocaleString("bn-BD")}
            </p>
          </div>
        </div>
        <div className="rounded-lg border bg-gradient-to-br from-amber-50 to-yellow-50 p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center text-lg">
            🪙
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">মোট কয়েন পুরস্কার</p>
            <p className="text-lg font-bold text-amber-700">
              {Number(s.total_coins_paid || 0).toLocaleString("bn-BD")}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Top Referrers */}
        <div className="rounded-lg border bg-card">
          <div className="px-4 py-3 border-b flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-semibold">শীর্ষ রেফারার</h3>
          </div>
          <div className="divide-y max-h-[400px] overflow-y-auto">
            {(!data?.topReferrers || data.topReferrers.length === 0) ? (
              <p className="text-center py-6 text-xs text-muted-foreground">
                কোনো ডেটা নেই
              </p>
            ) : (
              data.topReferrers.map((r: any, i: number) => (
                <div
                  key={r.id}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors"
                >
                  <span className="h-7 w-7 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 text-white flex items-center justify-center text-[11px] font-bold shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">
                      {r.name || "Unknown"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      ID: {r.id}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-foreground">
                      {Number(r.referral_count || 0).toLocaleString("bn-BD")}
                    </p>
                    <p className="text-[10px] text-muted-foreground">রেফারেল</p>
                  </div>
                  <div className="text-right shrink-0 w-16">
                    <p className="text-xs font-bold text-emerald-600">
                      ৳{Number(r.total_rewarded || 0).toLocaleString("bn-BD")}
                    </p>
                    <p className="text-[10px] text-muted-foreground">পুরস্কার</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Referrals */}
        <div className="rounded-lg border bg-card">
          <div className="px-4 py-3 border-b flex items-center gap-2">
            <Clock className="h-4 w-4 text-sky-500" />
            <h3 className="text-sm font-semibold">সাম্প্রতিক রেফারেল</h3>
          </div>
          <div className="divide-y max-h-[400px] overflow-y-auto">
            {(!data?.recentReferrals || data.recentReferrals.length === 0) ? (
              <p className="text-center py-6 text-xs text-muted-foreground">
                কোনো ডেটা নেই
              </p>
            ) : (
              data.recentReferrals.map((r: any) => (
                <div
                  key={r.id}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">
                      {r.referred_name || "Unknown"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      কোড: <span className="font-mono font-bold text-primary">{r.code}</span> • রেফারার: {r.referrer_name || "—"}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <Badge
                      variant="secondary"
                      className={`text-[10px] ${statusColor(r.status)}`}
                    >
                      {r.status}
                    </Badge>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {r.created_at
                        ? new Date(r.created_at).toLocaleDateString("bn-BD")
                        : ""}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
