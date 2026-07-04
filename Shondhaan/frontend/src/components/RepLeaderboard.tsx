import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Trophy, Medal, Award, Zap, Clock, CheckCircle, TrendingUp, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const DEMO_REP_EMAIL = "representative@yessservice.com";
const DEMO_REP_DISPLAY_NAME = "সম্মানিত অতিথি";

interface LeaderEntry {
  user_id: string;
  name: string;
  handled: number;
  resolved: number;
  avgResponseMs: number;
  avgResolveMs: number;
  resolutionRate: number;
  score: number;
  division: string;
  district: string;
}

function formatDuration(ms: number): string {
  if (ms <= 0) return "—";
  if (ms < 60000) return `${Math.round(ms / 1000)} সে.`;
  if (ms < 3600000) return `${Math.round(ms / 60000)} মি.`;
  if (ms < 86400000) return `${(ms / 3600000).toFixed(1)} ঘ.`;
  return `${(ms / 86400000).toFixed(1)} দি.`;
}

const rankIcons = [
  <Crown className="h-5 w-5 text-yellow-500" />,
  <Medal className="h-5 w-5 text-gray-400" />,
  <Award className="h-5 w-5 text-amber-700" />,
];

const rankBg = [
  "bg-gradient-to-r from-yellow-500/10 to-amber-500/5 border-yellow-500/30",
  "bg-gradient-to-r from-gray-500/5 to-gray-400/5 border-gray-400/20",
  "bg-gradient-to-r from-amber-700/5 to-orange-600/5 border-amber-700/20",
];

interface LeaderboardProps {
  currentUserId?: string;
  compact?: boolean;
}

const RepLeaderboard = ({ currentUserId, compact = false }: LeaderboardProps) => {
  const [entries, setEntries] = useState<LeaderEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"all" | "month" | "week">("all");
  const [demoRepUserId, setDemoRepUserId] = useState<string | null>(null);

  // Detect demo representative account so we can mask their name on the board.
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user?.email === DEMO_REP_EMAIL) {
        setDemoRepUserId(data.user.id);
      }
    })();
  }, []);

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);

    // Fetch reps
    const { data: reps } = await (supabase as any)
      .from("area_representatives")
      .select("user_id, name, division, district")
      .eq("is_active", true);

    if (!reps || reps.length === 0) { setEntries([]); setLoading(false); return; }

    // Fetch service requests
    let query = supabase.from("service_requests").select("assigned_rep_id, status, created_at, first_response_at, resolved_at") as any;

    // Period filter
    if (period === "month") {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      query = query.gte("created_at", monthAgo.toISOString());
    } else if (period === "week") {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      query = query.gte("created_at", weekAgo.toISOString());
    }

    const { data: requests } = await query;
    if (!requests) { setEntries([]); setLoading(false); return; }

    // Build leaderboard
    const repMap = new Map<string, LeaderEntry>();
    // Deduplicate reps by user_id (one user can have multiple areas)
    for (const rep of reps) {
      if (!repMap.has(rep.user_id)) {
        repMap.set(rep.user_id, {
          user_id: rep.user_id,
          name: rep.name,
          handled: 0,
          resolved: 0,
          avgResponseMs: 0,
          avgResolveMs: 0,
          resolutionRate: 0,
          score: 0,
          division: rep.division,
          district: rep.district,
        });
      }
    }

    // Aggregate
    const responseSums = new Map<string, { total: number; count: number }>();
    const resolveSums = new Map<string, { total: number; count: number }>();

    for (const req of requests) {
      if (!req.assigned_rep_id || !repMap.has(req.assigned_rep_id)) continue;
      const entry = repMap.get(req.assigned_rep_id)!;
      entry.handled++;
      if (req.status === "resolved") entry.resolved++;

      if (req.first_response_at) {
        const ms = new Date(req.first_response_at).getTime() - new Date(req.created_at).getTime();
        const s = responseSums.get(req.assigned_rep_id) || { total: 0, count: 0 };
        s.total += ms; s.count++;
        responseSums.set(req.assigned_rep_id, s);
      }
      if (req.resolved_at) {
        const ms = new Date(req.resolved_at).getTime() - new Date(req.created_at).getTime();
        const s = resolveSums.get(req.assigned_rep_id) || { total: 0, count: 0 };
        s.total += ms; s.count++;
        resolveSums.set(req.assigned_rep_id, s);
      }
    }

    const result: LeaderEntry[] = [];
    repMap.forEach((entry) => {
      const rs = responseSums.get(entry.user_id);
      const rv = resolveSums.get(entry.user_id);
      entry.avgResponseMs = rs ? rs.total / rs.count : 0;
      entry.avgResolveMs = rv ? rv.total / rv.count : 0;
      entry.resolutionRate = entry.handled > 0 ? Math.round((entry.resolved / entry.handled) * 100) : 0;

      // Scoring: handled * 10 + resolved * 20 + resolutionRate * 2 - (avgResponseMs penalty)
      const responsePenalty = entry.avgResponseMs > 0 ? Math.min(50, entry.avgResponseMs / 3600000 * 10) : 0;
      entry.score = Math.max(0, Math.round(
        entry.handled * 10 + entry.resolved * 20 + entry.resolutionRate * 2 - responsePenalty
      ));

      result.push(entry);
    });

    result.sort((a, b) => b.score - a.score);
    setEntries(result);
    setLoading(false);
  }, [period]);

  useEffect(() => { fetchLeaderboard(); }, [fetchLeaderboard]);

  const maxEntries = compact ? 5 : entries.length;
  const displayed = entries.slice(0, maxEntries);
  const myRank = currentUserId ? entries.findIndex(e => e.user_id === currentUserId) + 1 : 0;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Trophy className="h-4.5 w-4.5 text-primary" />
            🏆 লিডারবোর্ড
          </h3>
          <div className="flex items-center gap-1 rounded-lg bg-background/80 p-0.5">
            {(["all", "month", "week"] as const).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`rounded-md px-2.5 py-1 text-[10px] font-medium transition-all ${
                  period === p ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {p === "all" ? "সর্বকালীন" : p === "month" ? "এই মাস" : "এই সপ্তাহ"}
              </button>
            ))}
          </div>
        </div>

        {/* My rank highlight */}
        {currentUserId && myRank > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-3 flex items-center gap-3 rounded-lg bg-primary/10 border border-primary/20 px-3 py-2"
          >
            <span className="text-2xl font-black text-primary">#{myRank}</span>
            <div>
              <p className="text-xs font-semibold text-foreground">আপনার র‍্যাংক</p>
              <p className="text-[10px] text-muted-foreground">
                স্কোর: {entries[myRank - 1]?.score || 0} পয়েন্ট
              </p>
            </div>
            {myRank <= 3 && <span className="ml-auto text-xl">{myRank === 1 ? "🥇" : myRank === 2 ? "🥈" : "🥉"}</span>}
          </motion.div>
        )}
      </div>

      {/* Leaderboard list */}
      {loading ? (
        <div className="py-8 text-center text-xs text-muted-foreground">লোড হচ্ছে...</div>
      ) : displayed.length === 0 ? (
        <div className="py-8 text-center text-xs text-muted-foreground">কোনো ডেটা নেই</div>
      ) : (
        <div className="divide-y divide-border/50">
          {displayed.map((entry, idx) => {
            const isMe = currentUserId === entry.user_id;
            const rank = idx + 1;
            return (
              <motion.div
                key={entry.user_id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                  isMe ? "bg-primary/5" : "hover:bg-muted/30"
                } ${rank <= 3 ? rankBg[rank - 1] : ""}`}
              >
                {/* Rank */}
                <div className="flex h-8 w-8 items-center justify-center shrink-0">
                  {rank <= 3 ? (
                    rankIcons[rank - 1]
                  ) : (
                    <span className="text-sm font-bold text-muted-foreground">#{rank}</span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className={`text-sm font-semibold truncate ${isMe ? "text-primary" : "text-foreground"}`}>
                      {demoRepUserId && entry.user_id === demoRepUserId ? DEMO_REP_DISPLAY_NAME : entry.name}
                      {isMe && <span className="text-[10px] ml-1">(আপনি)</span>}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                    <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                      <CheckCircle className="h-2.5 w-2.5" /> {entry.resolved}/{entry.handled}
                    </span>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                      <Zap className="h-2.5 w-2.5" /> {formatDuration(entry.avgResponseMs)}
                    </span>
                    <span className={`text-[10px] font-medium ${
                      entry.resolutionRate >= 80 ? "text-green-600" :
                      entry.resolutionRate >= 50 ? "text-yellow-600" : "text-red-500"
                    }`}>
                      {entry.resolutionRate}%
                    </span>
                  </div>
                </div>

                {/* Score */}
                <div className="text-right shrink-0">
                  <p className="text-lg font-black text-foreground">{entry.score}</p>
                  <p className="text-[9px] text-muted-foreground">পয়েন্ট</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Scoring info */}
      {!compact && (
        <div className="border-t border-border px-4 py-3 bg-muted/20">
          <p className="text-[10px] text-muted-foreground">
            <strong>স্কোরিং:</strong> হ্যান্ডেল ×10 + সমাধান ×20 + সমাধান হার ×2 − রেসপন্স টাইম পেনাল্টি
          </p>
        </div>
      )}
    </div>
  );
};

export default RepLeaderboard;
