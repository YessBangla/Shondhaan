import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Gift, Users, Copy, Check, Share2, ChevronDown, ChevronUp,
  Star, Clock, CheckCircle2, AlertCircle, ArrowRight, Trophy,
  Wallet, Sparkles,
} from "lucide-react";
import { useReferral } from "@/contexts/ReferalContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const statusConfig: Record<string, { icon: typeof Clock; color: string; bg: string; label: string; labelBn: string }> = {
  pending:   { icon: Clock,        color: "text-amber-500",  bg: "bg-amber-500/10",  label: "Pending",   labelBn: "অপেক্ষমান" },
  qualified: { icon: AlertCircle,  color: "text-blue-500",   bg: "bg-blue-500/10",   label: "Qualified", labelBn: "যোগ্য" },
  rewarded:  { icon: CheckCircle2, color: "text-green-500",  bg: "bg-green-500/10",  label: "Rewarded",  labelBn: "পুরস্কৃত" },
  expired:   { icon: AlertCircle,  color: "text-red-400",    bg: "bg-red-400/10",    label: "Expired",   labelBn: "মেয়াদোত্তীর্ণ" },
};

export default function ReferralPage() {
  const { stats, loading, generateCode, claimReward } = useReferral();
  const { language } = useLanguage();
  const bn = language === "bn";

  const [copied, setCopied] = useState(false);
  const [showReferrals, setShowReferrals] = useState(false);
  const [showRewards, setShowRewards] = useState(false);
  const [generating, setGenerating] = useState(false);

  const copyLink = async () => {
    if (!stats?.code?.link) return;
    await navigator.clipboard.writeText(stats.code.link);
    setCopied(true);
    haptic("light");
    toast.success(bn ? "লিংক কপি হয়েছে!" : "Link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const shareNative = async () => {
    if (!stats?.code?.link) return;
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
    if (nav.share) {
      try {
        await nav.share({
          title: bn ? "আমার রেফারেল লিংক" : "My Referral Link",
          url: stats.code.link,
        });
      } catch { /* cancelled */ }
    } else {
      copyLink();
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    await generateCode({ max_uses: 50 });
    setGenerating(false);
  };

  if (loading && !stats) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 pb-24 pt-6">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-primary/90 via-primary to-primary/80 p-6 text-white shadow-lg"
      >
        <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/10" />
        <div className="absolute -bottom-4 -left-4 h-24 w-24 rounded-full bg-white/5" />
        <div className="relative z-10">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            <span className="text-sm font-medium text-white/80">
              {bn ? "আমন্ত্রণ প্রোগ্রাম" : "Referral Program"}
            </span>
          </div>
          <h1 className="text-2xl font-bold leading-tight">
            {bn
              ? "বন্ধুদের আমন্ত্রণ করুন,\nউভয়েই পুরস্কার পান!"
              : "Invite friends,\nboth earn rewards!"}
          </h1>
          <p className="mt-2 text-sm text-white/70">
            {bn
              ? "প্রতিটি সফল রেফারেলে আপনি ৳৫০ এবং আপনার বন্ধু ৳২০ পাবে"
              : "Earn ৳50 per referral, your friend gets ৳20"}
          </p>
        </div>
      </motion.div>

      {/* Code Section */}
      {stats?.code ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6 rounded-xl border border-border bg-card p-5 shadow-sm"
        >
          <div className="mb-4 text-center">
            <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {bn ? "আপনার রেফারেল কোড" : "Your Referral Code"}
            </p>
            <p className="font-mono text-3xl font-bold tracking-[0.2em] text-foreground">
              {stats.code.code}
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2.5">
            <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
              {stats.code.link}
            </span>
            <button
              onClick={copyLink}
              className="flex shrink-0 items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary/90 cursor-pointer"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? (bn ? "কপি হয়েছে" : "Copied") : (bn ? "কপি" : "Copy")}
            </button>
            <button
              onClick={shareNative}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary transition-colors hover:bg-primary/20 cursor-pointer"
            >
              <Share2 className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Usage bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{bn ? "ব্যবহৃত" : "Used"}: {stats.code.used_count}</span>
              <span>{bn ? "সর্বোচ্চ" : "Max"}: {stats.code.max_uses}</span>
            </div>
            <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, (stats.code.used_count / stats.code.max_uses) * 100)}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className={cn(
                  "h-full rounded-full",
                  stats.code.used_count >= stats.code.max_uses
                    ? "bg-red-500"
                    : stats.code.used_count >= stats.code.max_uses * 0.8
                      ? "bg-amber-500"
                      : "bg-green-500"
                )}
              />
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6 flex flex-col items-center rounded-xl border border-dashed border-border bg-card p-8 text-center"
        >
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Users className="h-7 w-7 text-primary" />
          </div>
          <p className="mb-1 text-sm font-semibold text-foreground">
            {bn ? "এখনো কোনো রেফারেল কোড নেই" : "No referral code yet"}
          </p>
          <p className="mb-4 text-xs text-muted-foreground">
            {bn ? "একটি তৈরি করুন এবং বন্ধুদের আমন্ত্রণ করুন" : "Generate one and start inviting friends"}
          </p>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
          >
            {generating ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {bn ? "কোড তৈরি করুন" : "Generate Code"}
          </button>
        </motion.div>
      )}

      {/* Stats */}
      {stats && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6 grid grid-cols-3 gap-3"
        >
          {[
            { value: stats.summary.total_referred, label: bn ? "মোট রেফার" : "Referred", icon: Users, color: "text-blue-500" },
            { value: stats.summary.rewarded, label: bn ? "সফল" : "Successful", icon: CheckCircle2, color: "text-green-500" },
            { value: `৳${stats.summary.total_earned}`, label: bn ? "আয়" : "Earned", icon: Trophy, color: "text-amber-500" },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-border bg-card p-3 text-center shadow-sm">
              <item.icon className={cn("mx-auto mb-1.5 h-5 w-5", item.color)} />
              <p className="text-lg font-bold text-foreground">{item.value}</p>
              <p className="text-[10px] text-muted-foreground">{item.label}</p>
            </div>
          ))}
        </motion.div>
      )}

      {/* Referral List */}
      {stats && stats.referrals.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-4 rounded-xl border border-border bg-card shadow-sm overflow-hidden"
        >
          <button
            onClick={() => setShowReferrals(!showReferrals)}
            className="flex w-full items-center justify-between px-4 py-3.5 text-sm font-semibold text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              {bn ? "রেফারেল তালিকা" : "Referral List"}
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                {stats.referrals.length}
              </span>
            </span>
            {showReferrals ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          <AnimatePresence>
            {showReferrals && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="border-t border-border divide-y divide-border">
                  {stats.referrals.map((ref: any, i: number) => {
                    const sc = statusConfig[ref.status] || statusConfig.pending;
                    const StatusIcon = sc.icon;
                    return (
                      <div key={i} className="flex items-center gap-3 px-4 py-3">
                        <div className="relative">
                          {ref.referred_avatar ? (
                            <img src={ref.referred_avatar} alt="" className="h-9 w-9 rounded-full object-cover" />
                          ) : (
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                              {ref.referred_name?.[0] || "?"}
                            </div>
                          )}
                          <span className={cn("absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-background", sc.color)}>
                            <StatusIcon className="h-2.5 w-2.5" />
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">{ref.referred_name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(ref.created_at).toLocaleDateString(bn ? "bn-BD" : "en-US")}
                          </p>
                        </div>
                        <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", sc.bg, sc.color)}>
                          {bn ? sc.labelBn : sc.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Rewards */}
      {stats && stats.rewards.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mb-6 rounded-xl border border-border bg-card shadow-sm overflow-hidden"
        >
          <button
            onClick={() => setShowRewards(!showRewards)}
            className="flex w-full items-center justify-between px-4 py-3.5 text-sm font-semibold text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500" />
              {bn ? "পুরস্কার" : "Rewards"}
              {stats.summary.pending_rewards > 0 && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                  ৳{stats.summary.pending_rewards} {bn ? "পেন্ডিং" : "pending"}
                </span>
              )}
            </span>
            {showRewards ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          <AnimatePresence>
            {showRewards && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="border-t border-border divide-y divide-border">
                  {stats.rewards.map((reward: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Wallet className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground">
                          ৳{reward.reward_amount}{" "}
                          {reward.reward_currency === "COIN"
                            ? (bn ? "কয়েন" : "Coins")
                            : (bn ? "ওয়ালেট ব্যালেন্স" : "Wallet Balance")}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {reward.role === "referrer"
                            ? (bn ? "রেফারার হিসেবে" : "As referrer")
                            : (bn ? "রেফার্ড হিসেবে" : "As referred")}
                        </p>
                      </div>
                      {reward.status === "available" && (
                        <button
                          onClick={() => claimReward(reward.id)}
                          className="flex items-center gap-1 rounded-full bg-green-500 px-3 py-1.5 text-[11px] font-medium text-white transition-colors hover:bg-green-600 cursor-pointer"
                        >
                          {bn ? "দাবি করুন" : "Claim"}
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      )}
                      {reward.status === "claimed" && (
                        <span className="flex items-center gap-1 text-[11px] font-medium text-green-600">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {bn ? "দাবীত" : "Claimed"}
                        </span>
                      )}
                      {reward.status === "pending" && (
                        <span className="flex items-center gap-1 text-[11px] font-medium text-amber-500">
                          <Clock className="h-3.5 w-3.5" />
                          {bn ? "অপেক্ষমান" : "Pending"}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* How it works */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="rounded-xl border border-border bg-card p-5 shadow-sm"
      >
        <h3 className="mb-4 text-sm font-bold text-foreground">
          {bn ? "কিভাবে কাজ করে?" : "How It Works?"}
        </h3>
        <div className="space-y-4">
          {[
            { step: 1, title: bn ? "কোড তৈরি করুন" : "Generate Code", desc: bn ? "আপনার ইউনিক রেফারেল কোড ও লিংক পান" : "Get your unique referral code & link" },
            { step: 2, title: bn ? "শেয়ার করুন" : "Share", desc: bn ? "বন্ধুদের WhatsApp, Facebook ইত্যাদিতে পাঠান" : "Send to friends via WhatsApp, Facebook, etc." },
            { step: 3, title: bn ? "বন্ধু সাইন আপ করুক" : "Friend Signs Up", desc: bn ? "আপনার লিংক দিয়ে রেজিস্টার করুক" : "They register using your link" },
            { step: 4, title: bn ? "পুরস্কার পান" : "Earn Rewards", desc: bn ? "সফল রেফারেলে উভয়েই ওয়ালেটে টাকা পাবেন" : "Both of you earn wallet cash on success" },
          ].map((item) => (
            <div key={item.step} className="flex items-start gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {item.step}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}