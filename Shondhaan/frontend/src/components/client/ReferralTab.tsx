import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Gift, Copy, Check, Users, Clock, Award, Wallet, 
  ArrowUpRight, Share2, QrCode, ExternalLink, RefreshCw, Coins
} from "lucide-react";
import { toast } from "sonner";
import { useReferral } from "../../contexts/ReferalContext";
import { useLanguage } from "../../contexts/LanguageContext";

interface ReferralTabProps {
  onNavigateToPayments?: () => void;
}

const formatRewardValue = (amount: number, currency: string, bn: boolean) => {
  if (currency === "COIN") return `${amount} 🪙`;
  return `৳${amount.toLocaleString(bn ? "bn-BD" : "en-US")}`;
};

const ReferralTab = ({ onNavigateToPayments }: ReferralTabProps) => {
  const { language } = useLanguage();
  const bn = language === "bn";
  const { 
    stats, 
    loading, 
    claimingId, 
    generateCode, 
    claimReward, 
    refreshStats,
    programConfig,
  } = useReferral();

  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  // Use code-specific values if available, otherwise global settings
  const referrerReward = stats?.code
    ? { amount: Number(stats.code.reward_amount || 0), currency: stats.code.reward_currency || "CASH" }
    : { amount: programConfig.referrer_reward_amount, currency: programConfig.referrer_reward_currency };

  const referredReward = stats?.code
    ? { amount: Number(stats.code.referred_reward_amount || 0), currency: stats.code.referred_reward_type === "WALLET_COIN" ? "COIN" : (stats.code.referred_reward_type || "CASH") }
    : { amount: programConfig.referred_reward_amount, currency: programConfig.referred_reward_currency };

  const isDisabled = !programConfig.is_enabled;

  const copyToClipboard = useCallback(async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast.success(bn ? "কপি হয়েছে!" : "Copied!");
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopiedField(field);
      toast.success(bn ? "কপি হয়েছে!" : "Copied!");
      setTimeout(() => setCopiedField(null), 2000);
    }
  }, [bn]);

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    const link = await generateCode();
    setGenerating(false);
    if (link) {
      toast.success(bn ? "রেফারেল কোড তৈরি হয়েছে!" : "Referral code generated!");
    }
  }, [generateCode, bn]);

  const handleClaim = useCallback(async (rewardId: number) => {
    await claimReward(rewardId);
  }, [claimReward]);

  const handleShare = useCallback(async () => {
    if (!stats?.code?.link) return;
    const shareData = {
      title: bn ? "শন্ধান রেফারেল" : "Shondhaan Referral",
      text: bn
        ? `আমার রেফারেল লিংক দিয়ে সাইন আপ করুন এবং ${formatRewardValue(referredReward.amount, referredReward.currency, true)} পুরস্কার পান!`
        : `Sign up with my referral link and get ${formatRewardValue(referredReward.amount, referredReward.currency, false)} reward!`,
      url: stats.code.link,
    };
    if (navigator.share) {
      try { await navigator.share(shareData); }
      catch (err) { if ((err as Error).name !== "AbortError") copyToClipboard(stats.code.link, "link"); }
    } else {
      copyToClipboard(stats.code.link, "link");
    }
  }, [stats?.code?.link, bn, copyToClipboard, referredReward]);

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`relative overflow-hidden rounded-3xl p-6 md:p-8 text-white ${
          isDisabled
            ? "bg-gradient-to-br from-slate-400 via-slate-500 to-slate-600"
            : "bg-gradient-to-br from-green-500 via-blue-500 to-rose-500"
        }`}
      >
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/confetti.png')] opacity-20" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              {isDisabled ? <Clock className="h-6 w-6" /> : <Gift className="h-6 w-6" />}
            </div>
            <div>
              <h2 className="text-2xl font-bold">
                {isDisabled
                  ? (bn ? "রেফারেল প্রোগ্রাম (বন্ধ)" : "Referral Program (Disabled)")
                  : (bn ? "রেফারেল প্রোগ্রাম" : "Referral Program")
                }
              </h2>
              <p className="text-white/80 text-sm">
                {isDisabled
                  ? (bn ? "সাময়িকভাবে বন্ধ আছে" : "Currently disabled")
                  : (bn ? "বন্ধুদের আমন্ত্রণ করুন, পুরস্কার অর্জন করুন" : "Invite friends, earn rewards")
                }
              </p>
            </div>
          </div>

          {!isDisabled && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6">
              {[
                {
                  label: bn ? "আপনি পাবেন" : "You earn",
                  value: formatRewardValue(referrerReward.amount, referrerReward.currency, bn),
                  sub: bn ? "প্রতি সফল রেফারেলে" : "per successful referral",
                },
                {
                  label: bn ? "বন্ধু পাবে" : "Friend gets",
                  value: formatRewardValue(referredReward.amount, referredReward.currency, bn),
                  sub: bn ? "সাইন আপেই" : "on signup",
                },
                {
                  label: bn ? "মোট আয়" : "Total earned",
                  value: formatRewardValue(
                    stats?.summary?.total_earned || 0,
                    referrerReward.currency,
                    bn
                  ),
                  sub: bn ? "এখন পর্যন্ত" : "so far",
                },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.1 }}
                  className="bg-white/15 backdrop-blur-sm rounded-2xl p-4"
                >
                  <p className="text-white/70 text-xs font-medium">{item.label}</p>
                  <p className="text-2xl font-bold mt-1">{item.value}</p>
                  <p className="text-white/60 text-[10px] mt-0.5">{item.sub}</p>
                </motion.div>
              ))}
            </div>
          )}

          {isDisabled && (
            <p className="mt-4 text-sm text-white/60">
              {bn ? "প্রশাসক শীঘ্রই এটি আবার চালু করবে" : "Admin will re-enable it soon"}
            </p>
          )}
        </div>
      </motion.div>

      {/* Referral Code Section */}
      {isDisabled ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center"
        >
          <div className="h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <Clock className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">
            {bn ? "প্রোগ্রাম বন্ধ আছে" : "Program is disabled"}
          </h3>
          <p className="text-sm text-slate-500">
            {bn ? "এখন কোড তৈরি করা যাবে না" : "Code generation is unavailable right now"}
          </p>
        </motion.div>
      ) : stats?.code ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
        >
          <div className="p-6">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-4">
              <div className="h-8 w-8 rounded-lg bg-amber-50 flex items-center justify-center">
                <QrCode className="h-4 w-4 text-amber-600" />
              </div>
              {bn ? "আপনার রেফারেল কোড" : "Your Referral Code"}
            </h3>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl px-5 py-4 text-center">
                <span className="text-2xl md:text-3xl font-mono font-bold tracking-[0.3em] text-slate-900">
                  {stats.code.code}
                </span>
              </div>
              <button
                onClick={() => copyToClipboard(stats.code.code, "code")}
                className="h-14 w-14 rounded-xl bg-blue-50 hover:bg-blue-100 flex items-center justify-center text-blue-600 transition-colors shrink-0"
              >
                {copiedField === "code" ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
              </button>
            </div>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 bg-slate-50 rounded-xl px-4 py-3 truncate">
                <span className="text-sm text-slate-600 font-mono">{stats.code.link}</span>
              </div>
              <button
                onClick={() => copyToClipboard(stats.code.link, "link")}
                className="h-11 w-11 rounded-lg bg-blue-50 hover:bg-blue-100 flex items-center justify-center text-blue-600 transition-colors shrink-0"
              >
                {copiedField === "link" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>
              <button
                onClick={handleShare}
                className="h-11 w-11 rounded-lg bg-green-50 hover:bg-green-100 flex items-center justify-center text-green-600 transition-colors shrink-0"
              >
                <Share2 className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-100">
              <div className="text-center">
                <p className="text-2xl font-bold text-slate-900">{stats.code.remaining}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{bn ? "বাকি আছে" : "Remaining"}</p>
              </div>
              <div className="text-center border-x border-slate-100">
                <p className="text-2xl font-bold text-slate-900">{stats.code.used_count}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{bn ? "ব্যবহৃত" : "Used"}</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-slate-900">{stats.code.max_uses}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{bn ? "সর্বোচ্চ" : "Max uses"}</p>
              </div>
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center"
        >
          <div className="h-16 w-16 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-4">
            <Gift className="h-8 w-8 text-amber-500" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">
            {bn ? "রেফারেল কোড তৈরি করুন" : "Generate Your Referral Code"}
          </h3>
          <p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto">
            {bn
              ? "আপনার ইউনিক রেফারেল কোড তৈরি করুন এবং বন্ধুদের সাথে শেয়ার করুন"
              : "Create your unique referral code and share it with friends"}
          </p>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-3 text-sm font-semibold text-white hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg shadow-amber-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Gift className="h-4 w-4" />
            )}
            {generating ? (bn ? "তৈরি হচ্ছে..." : "Generating...") : (bn ? "কোড তৈরি করুন" : "Generate Code")}
          </button>
        </motion.div>
      )}

      {/* Stats Cards */}
      {stats?.summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: bn ? "মোট রেফার" : "Total Referrals", value: stats.summary.total_referred, icon: <Users className="h-4 w-4" />, color: "text-blue-600", bg: "bg-blue-50" },
            { label: bn ? "পেন্ডিং" : "Pending", value: stats.summary.pending, icon: <Clock className="h-4 w-4" />, color: "text-amber-600", bg: "bg-amber-50" },
            { label: bn ? "যোগ্য" : "Qualified", value: stats.summary.qualified, icon: <Award className="h-4 w-4" />, color: "text-purple-600", bg: "bg-purple-50" },
            { label: bn ? "পুরস্কার প্রাপ্ত" : "Rewarded", value: stats.summary.rewarded, icon: <Wallet className="h-4 w-4" />, color: "text-green-600", bg: "bg-green-50" },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + i * 0.05 }}
              className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm"
            >
              <div className={`h-8 w-8 rounded-lg ${stat.bg} ${stat.color} flex items-center justify-center mb-3`}>
                {stat.icon}
              </div>
              <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      )}

      {/* Rewards Section */}
      {stats?.rewards && stats.rewards.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
        >
          <div className="flex items-center justify-between p-6 pb-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-green-50 flex items-center justify-center">
                <Wallet className="h-4 w-4 text-green-600" />
              </div>
              {bn ? "পুরস্কারসমূহ" : "Rewards"}
            </h3>
            {stats.summary?.pending_rewards > 0 && (
              <span className="text-xs font-semibold text-green-600 bg-green-50 px-3 py-1 rounded-full">
                {referrerReward.currency === "COIN"
                  ? `${stats.summary.pending_rewards} 🪙`
                  : `৳${stats.summary.pending_rewards}`}
                {" "}{bn ? "পেন্ডিং" : "pending"}
              </span>
            )}
          </div>
          <div className="divide-y divide-slate-100">
            {stats.rewards.map((reward) => {
              const isClaimable = reward.status === "available";
              const isClaiming = claimingId === reward.id;
              const isExpired = reward.status === "expired";
              return (
                <div key={reward.id} className="flex items-center gap-4 px-6 py-4">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                    reward.status === "claimed" ? "bg-green-50 text-green-600" :
                    isClaimable ? "bg-amber-50 text-amber-600" :
                    isExpired ? "bg-slate-50 text-slate-400" :
                    "bg-slate-50 text-slate-400"
                  }`}>
                    {reward.status === "claimed" ? <Check className="h-5 w-5" /> :
                     isClaimable ? <Award className="h-5 w-5" /> :
                     <Clock className="h-5 w-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900">
                        {reward.role === "referrer"
                          ? (bn ? "রেফারার পুরস্কার" : "Referrer Reward")
                          : (bn ? "রেফারি পুরস্কার" : "Referred Reward")}
                      </p>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                        reward.status === "claimed" ? "bg-green-50 text-green-700" :
                        isClaimable ? "bg-amber-50 text-amber-700" :
                        isExpired ? "bg-slate-100 text-slate-500" :
                        "bg-slate-100 text-slate-500"
                      }`}>
                        {reward.status === "claimed" ? (bn ? "প্রাপ্ত" : "Claimed") :
                         isClaimable ? (bn ? "দাবি করুন" : "Claim") :
                         isExpired ? (bn ? "মেয়াদোত্তীর্ণ" : "Expired") :
                         (bn ? "পেন্ডিং" : "Pending")}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {new Date(reward.created_at).toLocaleDateString(bn ? "bn-BD" : "en-US", {
                        year: "numeric", month: "short", day: "numeric"
                      })}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-bold text-slate-900">
                      {reward.reward_currency === "COIN" ? "🪙" : "৳"}{reward.reward_amount}
                    </p>
                    {isClaimable && (
                      <button
                        onClick={() => handleClaim(reward.id)}
                        disabled={isClaiming}
                        className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 hover:text-amber-700 disabled:opacity-50"
                      >
                        {isClaiming ? <RefreshCw className="h-3 w-3 animate-spin" /> : <ArrowUpRight className="h-3 w-3" />}
                        {isClaiming ? (bn ? "প্রক্রিয়ায়..." : "Processing...") : (bn ? "দাবি করুন" : "Claim")}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Referrals List */}
      {stats?.referrals && stats.referrals.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
        >
          <div className="p-6 pb-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <Users className="h-4 w-4 text-blue-600" />
              </div>
              {bn ? "আপনার রেফারগণ" : "Your Referrals"}
              <span className="text-xs text-slate-400 font-normal ml-auto">({stats.referrals.length})</span>
            </h3>
          </div>
          <div className="divide-y divide-slate-100">
            {stats.referrals.map((ref) => (
              <div key={ref.id} className="flex items-center gap-4 px-6 py-4">
                <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-sm shrink-0">
                  {ref.referred_name?.charAt(0)?.toUpperCase() || "U"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">
                    {ref.referred_name || (bn ? "ব্যবহারকারী" : "User")}
                  </p>
                  <p className="text-xs text-slate-500">
                    {new Date(ref.created_at).toLocaleDateString(bn ? "bn-BD" : "en-US", {
                      year: "numeric", month: "short", day: "numeric"
                    })}
                  </p>
                </div>
                <span className={`text-[11px] font-medium px-3 py-1 rounded-full shrink-0 ${
                  ref.status === "rewarded" ? "bg-green-50 text-green-700" :
                  ref.status === "qualified" ? "bg-purple-50 text-purple-700" :
                  ref.status === "expired" ? "bg-slate-100 text-slate-500" :
                  "bg-amber-50 text-amber-700"
                }`}>
                  {ref.status === "rewarded" ? (bn ? "পুরস্কার প্রাপ্ত" : "Rewarded") :
                   ref.status === "qualified" ? (bn ? "যোগ্য" : "Qualified") :
                   ref.status === "expired" ? (bn ? "মেয়াদোত্তীর্ণ" : "Expired") :
                   (bn ? "পেন্ডিং" : "Pending")}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Empty State */}
      {!stats?.code && stats?.referrals?.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16"
        >
          <div className="h-20 w-20 rounded-3xl bg-amber-50 flex items-center justify-center mx-auto mb-4">
            <Users className="h-10 w-10 text-amber-400" />
          </div>
          <p className="text-base font-semibold text-slate-900 mb-1">
            {bn ? "এখনো কাউকে রেফার করেননি" : "No referrals yet"}
          </p>
          <p className="text-sm text-slate-500">
            {bn
              ? "আপনার রেফারেল কোড তৈরি করে বন্ধুদের আমন্ত্রণ জানান"
              : "Generate your code and start inviting friends"}
          </p>
        </motion.div>
      )}
    </div>
  );
};

export default ReferralTab;