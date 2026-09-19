import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Gift, Copy, Check, Users, Clock, Award, Wallet, 
  ArrowUpRight, Share2, QrCode, ExternalLink, RefreshCw, Coins,
  Home, Loader2, Settings, X, Facebook, Youtube, Twitter, MessageCircle, Plus
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useReferral } from "../../contexts/ReferalContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { getMySqlAuth } from "@/lib/mysqlAuth";
import { useReferralCode } from "@/hooks/useReferralCode";

interface ReferralTabProps {
  onNavigateToPayments?: () => void;
}

const formatRewardValue = (amount: number, currency: string, bn: boolean) => {
  if (currency === "COIN") return `${amount} 🪙`;
  return `৳${amount.toLocaleString(bn ? "bn-BD" : "en-US")}`;
};

const WALLET_API_BASE_URL = import.meta.env.VITE_CENTRAL_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || "";
const REFERRAL_API_BASE_URL = import.meta.env.VITE_CENTRAL_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || "";

const ReferralTab = ({ onNavigateToPayments }: ReferralTabProps) => {
  const { language } = useLanguage();
  const bn = language === "bn";
  const { user } = useAuth();
  const navigate = useNavigate();
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
  const [walletBalance, setWalletBalance] = useState(0);
  const [coinBalance, setCoinBalance] = useState(0);
  const [walletLoading, setWalletLoading] = useState(true);
  const browser_referralCode = useReferralCode();
  const [dashboardReferralCode, setDashboardReferralCode] = useState<string | null>(null);
  const [referralPopupOpen, setReferralPopupOpen] = useState(false);
  const referralCode = dashboardReferralCode || stats?.code?.code || null;
  const [addMoneyOpen, setAddMoneyOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState("100");
  const [depositLoading, setDepositLoading] = useState(false);
  const visibleReferralCode = referralCode || browser_referralCode;
  const browserReferralLink = browser_referralCode
    ? `${import.meta.env.VITE_FRONTEND_URL || window.location.origin}/?ref=${browser_referralCode}`
    : null;
  const referralShareLink = stats?.code?.link || (
    referralCode
      ? `${import.meta.env.VITE_FRONTEND_URL || window.location.origin}/?ref=${referralCode}`
      : null
  );
  const referralSettings = programConfig;
  const referralStats = stats;
  const referralSharing = generating;

  const startWalletDeposit = async (event: React.FormEvent) => {
    event.preventDefault();
    const amount = Number(depositAmount);
    if (!Number.isFinite(amount) || amount < 10 || amount > 100000) {
      toast.error("১০ থেকে ১,০০,০০০ টাকার মধ্যে একটি পরিমাণ দিন");
      return;
    }

    setDepositLoading(true);
    try {
      const auth = getMySqlAuth();
      const response = await fetch(`${WALLET_API_BASE_URL}/api/wallet/deposit/shurjopay`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(auth?.token ? { Authorization: `Bearer ${auth.token}` } : {}),
        },
        body: JSON.stringify({ amount }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.checkout_url) {
        throw new Error(data.message || "পেমেন্ট শুরু করা যায়নি");
      }
      window.location.href = data.checkout_url;
    } catch (error: any) {
      toast.error(error.message || "পেমেন্ট শুরু করা যায়নি");
      setDepositLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.id) {
      setDashboardReferralCode(null);
      return;
    }

    const fetchReferralCode = async () => {
      try {
        const auth = getMySqlAuth();
        const response = await fetch(`${REFERRAL_API_BASE_URL}/api/referral/stats`, {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            ...(auth?.token ? { Authorization: `Bearer ${auth.token}` } : {}),
          },
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || "Failed to load referral code");
        setDashboardReferralCode(data.code?.code || null);
      } catch (error) {
        console.error("Failed to fetch referral code", error);
        setDashboardReferralCode(null);
      }
    };

    fetchReferralCode();
  }, [user?.id]);

  const fetchWallet = useCallback(async () => {
    if (!user?.id) {
      setWalletLoading(false);
      return;
    }

    setWalletLoading(true);
    try {
      const auth = getMySqlAuth();
      const response = await fetch(`${WALLET_API_BASE_URL}/api/wallet/balance/${user.id}`, {
        headers: {
          "Content-Type": "application/json",
          ...(auth?.token ? { Authorization: `Bearer ${auth.token}` } : {}),
        },
      });
      if (!response.ok) throw new Error("Failed to fetch wallet");

      const data = await response.json();
      const wallet = data.wallet || data;
      setWalletBalance(Number(wallet.cash_balance || 0));
      setCoinBalance(Number(wallet.coin_balance || 0));
    } catch (error) {
      console.error("Failed to fetch wallet balance", error);
    } finally {
      setWalletLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchWallet();
  }, [fetchWallet]);

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
    await fetchWallet();
  }, [claimReward, fetchWallet]);

  const handleShare = useCallback(async () => {
    if (!referralShareLink) return;
    const shareData = {
      title: bn ? "শন্ধান রেফারেল" : "Shondhaan Referral",
      text: bn
        ? `আমার রেফারেল লিংক দিয়ে সাইন আপ করুন এবং ${formatRewardValue(referredReward.amount, referredReward.currency, true)} পুরস্কার পান!`
        : `Sign up with my referral link and get ${formatRewardValue(referredReward.amount, referredReward.currency, false)} reward!`,
      url: referralShareLink,
    };
    if (navigator.share) {
      try { await navigator.share(shareData); }
      catch (err) { if ((err as Error).name !== "AbortError") copyToClipboard(referralShareLink, "link"); }
    } else {
      copyToClipboard(referralShareLink, "link");
    }
  }, [referralShareLink, bn, copyToClipboard, referredReward]);

  // Keep the dashboard referral banner actions available in this tab as well.
  const handleReferralShare = useCallback(async () => {
    if (!referralShareLink) {
      toast.error(bn ? "রেফারেল লিংক পাওয়া যায়নি" : "No referral link available");
      return;
    }
    toast.success(bn ? `রেফারেল লিংক: ${referralShareLink}` : `Referral link: ${referralShareLink}`);
    setReferralPopupOpen(true);
  }, [referralShareLink, bn]);
  const handleReferralGenerate = handleGenerate;
  const shareReferralTo = useCallback(async (_platform: string) => {
    await handleShare();
  }, [handleShare]);
  const isEnabledFlag = (value: unknown) => Boolean(value);

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
        className={`relative overflow-hidden border border-userprimary rounded-3xl p-6 md:p-8 text-white ${
          isDisabled
            ? "bg-userprimaryshade"
            : "bg-userprimaryshade"
        }`}
        >
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/confetti.png')] opacity-20" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-12 w-12 rounded-2xl bg-userprimary backdrop-blur-sm flex items-center justify-center">
              {isDisabled ? <Clock className="h-6 w-6" /> : <Gift className="h-6 w-6" />}
            </div>
            <div>
              <h2 className="text-2xl text-foreground font-bold">
                {isDisabled
                  ? (bn ? "রেফারেল প্রোগ্রাম (বন্ধ)" : "Referral Program (Disabled)")
                  : (bn ? "রেফারেল প্রোগ্রাম" : "Referral Program")
                }
              </h2>
              <p className="text-foreground text-sm">
                {isDisabled
                  ? (bn ? "সাময়িকভাবে বন্ধ আছে" : "Currently disabled")
                  : (bn ? "নতুন ইউজার কে ইনভাইট করুন, পুরস্কার অর্জন করুন" : "Invite friends, earn rewards")
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
                  label: bn ? "নতুন ইউজার পাবে" : "Friend gets",
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
                  className="bg-background backdrop-blur-sm rounded-2xl shadow-sm border p-4"
                >
                  <p className="text-userprimary text-xs font-medium">{item.label}</p>
                  <p className="text-2xl text-userprimary font-bold mt-1">{item.value}</p>
                  <p className="text-userprimary text-[10px] mt-0.5">{item.sub}</p>
                </motion.div>
              ))}
            </div>
          )}

          {isDisabled && (
            <p className="mt-4 text-sm text-white/60">
              {bn ? "প্রশাসক শীঘ্রই এটি আবার চালু করবে" : "Admin will re-enable it soon"}
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-gradient-to-r from-userprimary to-green-600 p-5 text-white shadow-sm">
              <div className="flex items-center gap-2 text-sm font-semibold opacity-90">
                <Wallet className="h-5 w-5" />{bn ? "ওয়ালেট ব্যালেন্স" : "Wallet Balance"}
              </div>
              <div className="flex w-full">
                <div className="w-full">
                  <p className="mt-2 text-3xl font-bold">{walletLoading ? "—" : `৳ ${walletBalance.toFixed(2)}`}</p>
                  <p className="mt-1 text-xs opacity-75">{bn ? "আপনার user_wallets ব্যালেন্স" : "Your cash wallet balance"}</p>
                </div>
                <div className="w-full items-end flex justify-end">
                  <button
                    onClick={() => setAddMoneyOpen(true)}
                    className="mt-1.5 px-3 py-2 bg-white text-black hover:bg-red-600 hover:text-white my-auto rounded-md text-[11px] font-semibold flex items-center justify-center gap-0.5 transition-colors"
                    >
                    <Plus className="h-2.5 w-2.5" /> টাকা যোগ করুন
                  </button>
                </div>
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="rounded-2xl bg-gradient-to-br from-orange-600 to-amber-500 p-5 text-white shadow-sm">
              <div className="flex items-center gap-2 text-sm font-semibold opacity-90"><Coins className="h-5 w-5" />{bn ? "কয়েন ব্যালেন্স" : "Coin Balance"}</div>
              <p className="mt-2 text-3xl font-bold">{walletLoading ? "—" : `${coinBalance} 🪙`}</p>
              <p className="mt-1 text-xs opacity-75">{bn ? "আপনার user_wallets coin_balance" : "Your wallet coin balance"}</p>
            </motion.div>
          </div>
        </div>
      </motion.div>

            <AnimatePresence>
              {addMoneyOpen && (
                <motion.div
                  className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  onMouseDown={(event) => event.target === event.currentTarget && !depositLoading && setAddMoneyOpen(false)}
                >
                  <motion.form
                    onSubmit={startWalletDeposit}
                    className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-2xl"
                    initial={{ scale: 0.96, y: 12 }} animate={{ scale: 1, y: 0 }}
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <h2 className="text-base font-bold text-foreground">ওয়ালেটে টাকা যোগ করুন</h2>
                        <p className="mt-1 text-xs text-muted-foreground">ShurjoPay দিয়ে নিরাপদে পেমেন্ট করুন</p>
                      </div>
                      <button type="button" aria-label="বন্ধ করুন" onClick={() => setAddMoneyOpen(false)} disabled={depositLoading} className="text-xl text-muted-foreground hover:text-foreground">×</button>
                    </div>
                    <label className="block text-xs font-medium text-muted-foreground">
                      পরিমাণ (টাকা)
                      <input
                        autoFocus type="number" min="10" max="100000" step="0.01" required
                        value={depositAmount} onChange={(event) => setDepositAmount(event.target.value)}
                        className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary"
                      />
                    </label>
                    <div className="mt-4 flex gap-2">
                      <button type="button" onClick={() => setAddMoneyOpen(false)} disabled={depositLoading} className="flex-1 rounded-lg border border-border px-3 py-2.5 text-xs font-semibold text-foreground hover:bg-secondary">বাতিল</button>
                      <button type="submit" disabled={depositLoading} className="flex-1 rounded-lg bg-userprimary px-3 py-2.5 text-xs font-semibold text-white disabled:opacity-60">
                        {depositLoading ? "পেমেন্ট পেজ খোলা হচ্ছে..." : "ডিপোজিট করুন"}
                      </button>
                    </div>
                  </motion.form>
                </motion.div>
              )}
            </AnimatePresence>

      {/* Wallet Balance */}
      <div className="hidden">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-gradient-to-br from-userprimary to-green-700 p-5 text-white shadow-sm"
          >
          <div className="flex items-center gap-2 text-sm font-semibold opacity-90">
            <Wallet className="h-5 w-5" />
            {bn ? "ওয়ালেট ব্যালেন্স" : "Wallet Balance"}
          </div>
          <p className="mt-2 text-3xl font-bold">
            {walletLoading ? "—" : `৳ ${walletBalance.toFixed(2)}`}
          </p>
          <p className="mt-1 text-xs opacity-75">{bn ? "আপনার user_wallets ব্যালেন্স" : "Your cash wallet balance"}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 p-5 text-white shadow-sm"
          >
          <div className="flex items-center gap-2 text-sm font-semibold opacity-90">
            <Coins className="h-5 w-5" />
            {bn ? "কয়েন ব্যালেন্স" : "Coin Balance"}
          </div>
          <p className="mt-2 text-3xl font-bold">
            {walletLoading ? "—" : `${coinBalance} 🪙`}
          </p>
          <p className="mt-1 text-xs opacity-75">{bn ? "আপনার user_wallets coin_balance" : "Your wallet coin balance"}</p>
        </motion.div>
      </div>

      {/*  REFERRAL SECTION START */}
        {browser_referralCode ? (
          
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="rounded-3xl border border-emerald-100 bg-gradient-to-r from-emerald-50 via-white to-blue-50 p-5 shadow-sm md:p-6"
              >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                    <Gift className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">{bn ? "অভিনন্দন!!! আপনি একটি সক্রিয় রেফারেল কোড পেয়েছেন" : "You have an Active referral code to earn rewards"}</h3>
                    <p className="mt-1 text-sm text-slate-600">
                      {bn ? (
                        <>
                            যেকোনো সার্ভিস বুক করলে কিংবা কোনো পণ্য অর্ডার করলে
                          আপনি পাবেন{" "}
                          <span className="font-bold">{referralSettings.referred_reward_amount} {referralSettings.referred_reward_currency}</span>।
                        </>
                      ) : (
                        <>
                          When someone books a service or orders a product through your referral
                          link, you will receive{" "}
                          <span className="font-bold">{referralSettings.referred_reward_amount} {referralSettings.referred_reward_currency}</span>.
                        </>
                      )}
                    </p>
                    {referralSettings.min_order_amount !== null && (
                      <p className="mt-1 text-xs text-slate-500">
                        {bn ? `ন্যূনতম অর্ডার: ৳${referralSettings.min_order_amount}` : `Minimum order: ৳${referralSettings.min_order_amount}`}
                      </p>
                    )}
                  </div>
                </div>
                <div className="relative shrink-0">
                    {browserReferralLink && (
                      <div className="mb-2 max-w-xs">
                        <p className="text-xs font-semibold text-slate-700">
                          {bn ? "আপনার রেফারেল লিংক:" : "Your referral link:"}
                        </p>
                        <p className="break-all text-sm font-medium text-emerald-700">
                          {referralShareLink}
                        </p>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => navigate("/")}
                      className="inline-flex w-full mt-2 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                      >
                      <Home className="h-4 w-4" />
                      {bn ? "এখনই কিনুন" : "Buy Now"}
                    </button>
                </div>
              </div>
            </motion.div>
          
        ) : (
          referralSettings && isEnabledFlag(referralSettings.is_enabled) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="rounded-3xl border border-emerald-100 bg-gradient-to-r from-emerald-50 via-white to-blue-50 p-5 shadow-sm md:p-6"
              >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                    <Gift className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">{bn ? "এই রেফারেল লিঙ্কটি শেয়ার করুন" : "Invite friends and earn rewards"}</h3>
                    <p className="mt-1 text-sm text-slate-600">
                      {bn ? (
                        <>
                          এই লিঙ্কের মাধ্যমে যেকোনো সার্ভিস বুক করলে কিংবা কোনো পণ্য অর্ডার করলে
                          আপনি পাবেন{" "}
                          <span className="font-bold">{referralSettings.referrer_reward_amount} {referralSettings.referrer_reward_currency}</span>{" "}
                          এবং যিনি লিঙ্কটি ব্যবহার করবেন তিনি পাবেন{" "}
                          <span className="font-bold">{referralSettings.referred_reward_amount} {referralSettings.referred_reward_currency}</span>।
                        </>
                      ) : (
                        <>
                          When someone books a service or orders a product through your referral
                          link, you will receive{" "}
                          <span className="font-bold">{referralSettings.referrer_reward_amount} {referralSettings.referrer_reward_currency}</span>, and the person who uses your link will receive{" "}
                          <span className="font-bold">{referralSettings.referred_reward_amount} {referralSettings.referred_reward_currency}</span>.
                        </>
                      )}
                    </p>
                    {referralSettings.min_order_amount !== null && (
                      <p className="mt-1 text-xs text-slate-500">
                        {bn ? `ন্যূনতম অর্ডার: ৳${referralSettings.min_order_amount}` : `Minimum order: ৳${referralSettings.min_order_amount}`}
                      </p>
                    )}
                  </div>
                </div>
                <div className="relative shrink-0">
                  {visibleReferralCode ? (
                    <>
                      <p className="text-sm font-semibold text-slate-700">
                        <p>{bn ? "আপনার রেফারেল লিংক:" : "Your referral link:"}{" "}</p>
                        <span className="text-emerald-700">{referralShareLink}</span>
                      </p>
                      <button
                        type="button"
                        onClick={handleReferralShare}
                        disabled={referralSharing}
                        className="inline-flex w-full mt-2 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-userprimary to-green-600 hover:from-green-600 hover:to-userprimary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                      >
                        {referralSharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
                        {bn ? "শেয়ার করুন" : "Share referral link"}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={handleReferralGenerate}
                      disabled={referralSharing}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                    >
                      <Settings className="h-4 w-4" />
                      {bn ? "রেফারাল লিঙ্ক তৈরি করুন" : "Generate Referral Link"}
                    </button>
                  )}
                  {referralPopupOpen && (referralShareLink || referralStats?.code?.link) && (
                    <div className="absolute right-0 top-full z-30 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-sm font-bold text-slate-900">{bn ? "শেয়ার করুন" : "Share referral link"}</p>
                        <button type="button" onClick={() => setReferralPopupOpen(false)} className="rounded-full p-1 text-slate-500 hover:bg-slate-100" aria-label="Close">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-5 gap-2">
                        {[
                          { key: "facebook", label: "Facebook", icon: <Facebook className="h-4 w-4" />, className: "bg-[#1877F2]" },
                          { key: "youtube", label: "YouTube", icon: <Youtube className="h-4 w-4" />, className: "bg-[#FF0000]" },
                          { key: "twitter", label: "Twitter", icon: <Twitter className="h-4 w-4" />, className: "bg-slate-900" },
                          { key: "whatsapp", label: "WhatsApp", icon: <MessageCircle className="h-4 w-4" />, className: "bg-[#25D366]" },
                          { key: "messenger", label: "Messenger", icon: <MessageCircle className="h-4 w-4" />, className: "bg-[#0084FF]" },
                        ].map((item) => (
                          <button
                            key={item.key}
                            type="button"
                            title={item.label}
                            onClick={() => shareReferralTo(item.key)}
                            className={`flex h-10 w-10 items-center justify-center rounded-full text-white transition-transform hover:scale-110 ${item.className}`}
                          >
                            {item.icon}
                          </button>
                        ))}
                      </div>
                      <div className="mt-3 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2">
                        <span className="min-w-0 flex-1 truncate font-mono text-xs text-slate-600">{referralShareLink || referralStats?.code?.link}</span>
                        <button
                          type="button"
                          onClick={async () => {
                            const link = referralShareLink || referralStats?.code?.link;
                            if (!link) return;
                            await navigator.clipboard.writeText(link);
                            toast.success(bn ? "লিংক কপি হয়েছে" : "Link copied");
                          }}
                          className="rounded-lg bg-emerald-600 p-2 text-white hover:bg-emerald-700"
                          title={bn ? "লিংক কপি করুন" : "Copy link"}
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )
        )}
      {/*  REFERRAL SECTION END */}

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
                <span className="text-sm text-slate-600 font-mono">{referralShareLink}</span>
              </div>
              <button
                onClick={() => copyToClipboard(referralShareLink, "link")}
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

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Referral code</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Used / Max</th>
                    <th className="px-4 py-3">Your reward</th>
                    <th className="px-4 py-3">Friend reward</th>
                    <th className="px-4 py-3">Minimum order</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3">Expires</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-slate-100 text-slate-700">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">{stats.code.code}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                        Active
                      </span>
                    </td>
                    <td className="px-4 py-3">{stats.code.used_count} / {stats.code.max_uses}</td>
                    <td className="px-4 py-3 font-semibold">
                      {stats.code.reward_amount} {stats.code.reward_currency}
                    </td>
                    <td className="px-4 py-3 font-semibold">
                      {stats.code.referred_reward_amount} {stats.code.referred_reward_type}
                    </td>
                    <td className="px-4 py-3">
                      {stats.code.min_order_amount === null || stats.code.min_order_amount === undefined
                        ? "—"
                        : `৳${stats.code.min_order_amount}`}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {new Date(stats.code.created_at).toLocaleDateString(bn ? "bn-BD" : "en-US")}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {stats.code.expires_at
                        ? new Date(stats.code.expires_at).toLocaleDateString(bn ? "bn-BD" : "en-US")
                        : "—"}
                    </td>
                  </tr>
                </tbody>
              </table>
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
          initial={{ opacity: 0, y: 0 }}
          animate={{ opacity: 1, y: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">{bn ? "রেফারেল কোড" : "Referral Code"}</th>
                  <th className="px-4 py-3">{bn ? "স্ট্যাটাস" : "Status"}</th>
                  <th className="px-4 py-3">{bn ? "ব্যবহ্রত/সর্বোচ্চ" : "Used/Max"}</th>
                  <th className="px-4 py-3">{bn ? "আপনা রেওয়ার্ড" : "Your Reward"}</th>
                  <th className="px-4 py-3">{bn ? "ব্যবহারকারীর রেওয়ার্ড" : "User's Reward"}</th>
                  <th className="px-4 py-3">{bn ? "মিনিমাম অর্ডার/বুকিং" : "Minimum Order"}</th>
                  <th className="px-4 py-3">{bn ? "তারিখ" : "Date"}</th>
                  <th className="px-4 py-3">{bn ? "এক্সপায়ার্ড" : "Expires"}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-slate-500">
                    {bn ? "কোনো রেফারেল কোড পাওয়া যায়নি" : "No referral code data found"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
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
