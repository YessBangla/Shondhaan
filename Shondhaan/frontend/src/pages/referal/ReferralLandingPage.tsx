import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Gift, ArrowRight, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useReferral } from "@/contexts/ReferalContext";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

export default function ReferralLandingPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { validatedCode, pendingCode, applyCode, applied } = useReferral();
  const { user } = useAuth();
  const { language } = useLanguage();
  const bn = language === "bn";
  const [applying, setApplying] = useState(false);
  const [applyResult, setApplyResult] = useState<"success" | "error" | null>(null);

  const isAuth = user !== null;
  const isValid = validatedCode?.valid === true;

  useEffect(() => {
    if (!code) navigate("/", { replace: true });
  }, [code, navigate]);

  const handleManualApply = async () => {
    if (!pendingCode) return;
    setApplying(true);
    const success = await applyCode(pendingCode);
    setApplying(false);
    setApplyResult(success ? "success" : "error");
    if (success) {
      setTimeout(() => navigate("/", { replace: true }), 2000);
    }
  };

  // If already applied via context auto-apply
  useEffect(() => {
    if (applied && !applyResult) {
      setApplyResult("success");
      const t = setTimeout(() => navigate("/", { replace: true }), 2000);
      return () => clearTimeout(t);
    }
  }, [applied, applyResult, navigate]);

  if (!code) return null;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-primary/5 to-background px-4">
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center shadow-xl"
      >
        {/* Icon */}
        <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          {isValid ? (
            <Gift className="h-10 w-10 text-primary" />
          ) : validatedCode === null ? (
            <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
          ) : (
            <XCircle className="h-10 w-10 text-red-400" />
          )}
        </div>

        {/* Loading */}
        {validatedCode === null && (
          <>
            <h1 className="text-lg font-bold text-foreground">
              {bn ? "যাচাই করা হচ্ছে..." : "Validating..."}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {bn ? "রেফারেল কোড চেক করা হচ্ছে" : "Checking referral code"}
            </p>
          </>
        )}

        {/* Invalid */}
        {validatedCode && !isValid && (
          <>
            <h1 className="text-lg font-bold text-red-500">
              {bn ? "অবৈধ বা মেয়াদোত্তীর্ণ লিংক" : "Invalid or Expired Link"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {bn
                ? "এই রেফারেল কোডটি আর সক্রিয় নেই বা ব্যবহারের সীমা শেষ হয়েছে"
                : "This referral code is no longer active or has reached its usage limit"}
            </p>
            <button
              onClick={() => navigate("/")}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-white hover:bg-primary/90 cursor-pointer"
            >
              {bn ? "হোম পেজে যান" : "Go to Home"}
            </button>
          </>
        )}

        {/* Valid */}
        {isValid && validatedCode && (
          <>
            {validatedCode.referrer_avatar && (
              <img
                src={validatedCode.referrer_avatar}
                alt=""
                className="mx-auto mb-3 h-16 w-16 rounded-full border-2 border-primary/20 object-cover"
              />
            )}

            <h1 className="text-lg font-bold text-foreground">
              {bn
                ? `${validatedCode.referrer_name} আপনাকে আমন্ত্রণ জানিয়েছেন!`
                : `${validatedCode.referrer_name} invited you!`}
            </h1>

            <div className="mt-4 rounded-xl bg-primary/5 border border-primary/10 p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-primary/70">
                {bn ? "আপনার উপহার" : "Your Gift"}
              </p>
              <p className="mt-1 text-2xl font-bold text-primary">
                ৳{validatedCode.referred_reward_amount}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {bn ? "সাইন আপ করলেই ওয়ালেটে যোগ হবে" : "Added to wallet on sign up"}
              </p>
            </div>

            <p className="mt-3 text-[11px] text-muted-foreground">
              {bn
                ? `আর ${validatedCode.remaining_uses} জন এই অফার নিতে পারবেন`
                : `${validatedCode.remaining_uses} more people can use this offer`}
            </p>

            {/* States */}
            {applyResult === "success" && (
              <div className="mt-6 flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                {bn ? "রেফারেল প্রয়োগ হয়েছে!" : "Referral Applied!"}
              </div>
            )}

            {applying && (
              <div className="mt-6 flex items-center justify-center gap-2 py-2.5 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {bn ? "প্রয়োগ হচ্ছে..." : "Applying..."}
              </div>
            )}

            {applyResult === "error" && !applying && (
              <div className="mt-6 space-y-3">
                <p className="text-sm text-red-500">
                  {bn ? "প্রয়োগ করতে সমস্যা হয়েছে" : "Failed to apply referral"}
                </p>
                <button
                  onClick={() => navigate("/")}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-white hover:bg-primary/90 cursor-pointer"
                >
                  {bn ? "হোম পেজে যান" : "Go to Home"}
                </button>
              </div>
            )}

            {/* CTA: not logged in */}
            {!isAuth && !applyResult && !applying && (
              <button
                onClick={() => navigate(`/auth?ref=${code}`)}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-primary/90 cursor-pointer"
              >
                {bn ? "সাইন আপ করে উপহার নিন" : "Sign Up to Claim"}
                <ArrowRight className="h-4 w-4" />
              </button>
            )}

            {/* CTA: logged in but auto-apply didn't fire (edge case) */}
            {isAuth && !applyResult && !applying && !applied && (
              <button
                onClick={handleManualApply}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-primary/90 cursor-pointer"
              >
                {bn ? "রেফারেল কোড প্রয়োগ করুন" : "Apply Referral Code"}
                <ArrowRight className="h-4 w-4" />
              </button>
            )}

            <button
              onClick={() => navigate("/")}
              className="mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              {bn ? "উপহার ছাড়া এগিয়ে যান" : "Skip, continue without gift"}
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
}