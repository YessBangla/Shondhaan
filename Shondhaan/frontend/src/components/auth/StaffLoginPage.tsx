import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { ROLES, type RoleKey } from "@/config/roles";
import { ArrowLeft, Eye, EyeOff, Lock, Mail, Loader2, Phone, ShieldCheck } from "lucide-react";
import AuthHeroPanel from "./AuthHeroPanel";
import { clearMySqlAuth, loginWithMySql } from "@/lib/mysqlAuth";

export interface StaffLoginPageProps {
  platformKey: "mart" | "deal" | "jobs" | "super_admin";
  platformName: string;
  platformNameEn: string;
  logoSrc: string;
  homeHref: string;
  /** Roles eligible for this platform (first item is the highlighted default) */
  roleKeys: RoleKey[];
  /** Tailwind gradient classes, e.g. "from-emerald-600 to-teal-600" */
  gradient: string;
  /** Tailwind accent text class, e.g. "text-emerald-700" */
  accent: string;
  /** Tailwind ring/border color class, e.g. "border-emerald-500/30" */
  ring: string;
}

const StaffLoginPage = ({
  platformKey,
  platformName,
  platformNameEn,
  logoSrc,
  homeHref,
  roleKeys,
  gradient,
  accent,
  ring,
}: StaffLoginPageProps) => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const { language } = useLanguage();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const eligibleRoles = ROLES.filter((r) => roleKeys.includes(r.key));

  useEffect(() => {
    document.title = `${platformName} স্টাফ লগইন | Yess`;
  }, [platformName]);

  // Note: We intentionally do NOT auto-redirect already-logged-in users.
  // Per product requirement, the panel must open in a new tab while the
  // current tab stays on the public/staff-login page.

  const openPanelInNewTab = (path: string) => {
    const url = `${window.location.origin}${path}`;
    const win = window.open(url, "_blank", "noopener,noreferrer");
    if (win) {
      navigate(homeHref, { replace: true });
    } else {
      navigate(path, { replace: true });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const loginId = identifier.trim();
    const isPhoneLogin = /^\d+$/.test(loginId);

    if (!loginId || !password) {
      toast({ title: "ত্রুটি", description: "ইমেইল/ফোন ও পাসওয়ার্ড দিন।", variant: "destructive" });
      return;
    }

    if (isPhoneLogin && !/^01[3-9]\d{8}$/.test(loginId)) {
      toast({ title: "ত্রুটি", description: "সঠিক ১১ ডিজিট মোবাইল নম্বর দিন।", variant: "destructive" });
      return;
    }
    setSubmitting(true);

    try {
      const mysql = await loginWithMySql({ identifier: loginId, password });
      const match = roleKeys.find((rk) => rk === mysql.user.type);
      if (!match) {
        clearMySqlAuth();
        toast({
          title: "অনুমতি নেই",
          description: `${platformName} স্টাফ পোর্টালে প্রবেশের অনুমতি আপনার নেই।`,
          variant: "destructive",
        });
        setSubmitting(false);
        return;
      }
      const cfg = ROLES.find((r) => r.key === match);
      toast({ title: "স্বাগতম", description: `${cfg?.labelBn} হিসেবে লগইন সফল।` });
      openPanelInNewTab(cfg?.panelPath || homeHref);
      return;
    } catch (error: any) {
      // Phone login is validated against the backend users.mobile value.
      if (isPhoneLogin) {
        toast({
          title: "লগইন ব্যর্থ",
          description: error?.message || "ভুল ফোন নম্বর বা পাসওয়ার্ড।",
          variant: "destructive",
        });
        setSubmitting(false);
        return;
      }
      // If the backend email account does not exist, keep Supabase staff login working.
    }

    clearMySqlAuth();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginId,
      password,
    });
    if (error || !data.user) {
      toast({ title: "লগইন ব্যর্থ", description: error?.message || "ভুল ইমেইল বা পাসওয়ার্ড।", variant: "destructive" });
      setSubmitting(false);
      return;
    }
    // Verify role eligibility
    const { data: rolesData } = await supabase.rpc("get_my_roles");
    const my = (rolesData as string[] | null) || [];
    const match = roleKeys.find((rk) => my.includes(rk));
    if (!match) {
      await supabase.auth.signOut();
      toast({
        title: "অনুমতি নেই",
        description: `${platformName} স্টাফ পোর্টালে প্রবেশের অনুমতি আপনার নেই।`,
        variant: "destructive",
      });
      setSubmitting(false);
      return;
    }
    const cfg = ROLES.find((r) => r.key === match);
    toast({ title: "স্বাগতম", description: `${cfg?.labelBn} হিসেবে লগইন সফল।` });
    openPanelInNewTab(cfg?.panelPath || homeHref);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-5xl flex gap-8 items-stretch">
        {/* Left Hero Panel - Desktop only (same as /auth for unified look) */}
        <div className="hidden lg:block flex-1 max-w-md">
          <AuthHeroPanel />
        </div>

        {/* Right Auth Form */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md mx-auto lg:mx-0"
        >
        <Link
          to="/auth"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {language === "bn" ? "ইউজার লগইনে ফিরুন" : "Back to user login"}
        </Link>

        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 mb-3">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            <span className="text-[11px] font-semibold text-primary">
              {language === "bn" ? "অফিস / স্টাফ লগইন" : "Office / Staff Login"}
            </span>
          </div>
          <h1 className="font-heading text-2xl font-bold text-foreground">
            {language === "bn" ? `${platformName} পোর্টাল` : `${platformNameEn} Portal`}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {language === "bn"
              ? "আপনার অফিস অ্যাকাউন্ট দিয়ে সাইন ইন করুন।"
              : "Sign in with your office account to continue."}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">

          {/* Eligible roles strip */}
          {/* <div className="mb-4">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">
              {language === "bn" ? "উপলব্ধ রোল" : "Eligible Roles"}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {eligibleRoles.map((r) => {
                const Icon = r.icon;
                return (
                  <span
                    key={r.key}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-full bg-muted/60 text-[11px] font-medium ${r.accent}`}
                  >
                    <Icon className="h-3 w-3" />
                    {language === "bn" ? r.labelBn : r.labelEn}
                  </span>
                );
              })}
            </div>
          </div> */}

          {/* Login form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="text-xs font-medium block mb-1">
                {language === "bn" ? "ইমেইল / ফোন" : "Email / Phone"}
              </label>
              <div className="relative">
                {identifier.trim() && /^\d+$/.test(identifier.trim()) ? (
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                ) : (
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                )}
                <input
                  type="text"
                  inputMode="email"
                  autoComplete="username"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="staff@yessbangla.xyz / 01XXXXXXXXX"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium block mb-1">
                {language === "bn" ? "পাসওয়ার্ড" : "Password"}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type={showPass ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Toggle password"
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className={`w-full py-2.5 rounded-xl bg-gradient-to-r ${gradient} text-white font-semibold text-sm shadow-md hover:opacity-95 disabled:opacity-60 inline-flex items-center justify-center gap-2`}
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting
                ? (language === "bn" ? "লগইন হচ্ছে..." : "Signing in...")
                : (language === "bn" ? "লগইন করুন" : "Sign in")}
            </button>

            <div className="flex items-center justify-between text-xs pt-1">
              <Link to="/auth" className={`${accent} hover:underline`}>
                {language === "bn" ? "সাধারণ লগইন" : "User login"}
              </Link>
              <Link to="/reset-password" className="text-muted-foreground hover:text-foreground">
                {language === "bn" ? "পাসওয়ার্ড ভুলে গেছেন?" : "Forgot password?"}
              </Link>
            </div>
          </form>

          {/* Quick demo staff login (eligible roles only) */}
          <div className="mt-4">
            <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-3">
              <p className="text-[11px] font-semibold text-primary mb-2 text-center">
                {language === "bn"
                  ? "🔑 ডেমো স্টাফ অ্যাকাউন্ট দিয়ে লগইন"
                  : "🔑 Quick Demo Staff Login"}
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {eligibleRoles
                  .map((r) => {
                    const map: Record<string, string> = {
                      super_admin: "superadmin@demo.yessbangla.xyz",
                      admin: "admin@demo.yessbangla.xyz",
                      moderator: "moderator@demo.yessbangla.xyz",
                      supervisor: "supervisor@demo.yessbangla.xyz",
                      finance: "finance@demo.yessbangla.xyz",
                      call_center: "callcenter@demo.yessbangla.xyz",
                      provider: "provider@demo.yessbangla.xyz",
                      representative: "representative@demo.yessbangla.xyz",
                      mart_vendor: "martvendor@demo.yessbangla.xyz",
                      mart_delivery: "martdelivery@demo.yessbangla.xyz",
                      mart_cs: "martcs@demo.yessbangla.xyz",
                      yessdeal_seller: "dealseller@demo.yessbangla.xyz",
                      employer: "employer@demo.yessbangla.xyz",
                    };
                    return { role: r, demoEmail: map[r.key] };
                  })
                  .filter((x) => !!x.demoEmail)
                  .map(({ role, demoEmail }) => {
                    const Icon = role.icon;
                    return (
                      <button
                        key={role.key}
                        type="button"
                        disabled={submitting}
                        onClick={async () => {
                          setSubmitting(true);
                          try {
                            const mysql = await loginWithMySql({ identifier: demoEmail!, password: "Demo@1234" });
                            const match = roleKeys.find((rk) => rk === mysql.user.type);
                            if (match) {
                              const cfg = ROLES.find((r) => r.key === match) || role;
                              toast({ title: "à¦¸à§à¦¬à¦¾à¦—à¦¤à¦®", description: `${cfg.labelBn} à¦¹à¦¿à¦¸à§‡à¦¬à§‡ à¦²à¦—à¦‡à¦¨ à¦¸à¦«à¦²à¥¤` });
                              openPanelInNewTab(cfg.panelPath);
                              return;
                            }
                          } catch {
                            // Demo users may exist only in Supabase on some installs.
                          }

                          clearMySqlAuth();
                          const { error } = await supabase.auth.signInWithPassword({
                            email: demoEmail!,
                            password: "Demo@1234",
                          });
                          if (error) {
                            toast({ title: "লগইন ব্যর্থ", description: error.message, variant: "destructive" });
                            setSubmitting(false);
                            return;
                          }
                          toast({ title: "স্বাগতম", description: `${role.labelBn} হিসেবে লগইন সফল।` });
                          openPanelInNewTab(role.panelPath);
                        }}
                        className={`flex items-center gap-1.5 rounded-md border border-primary/20 bg-background px-2 py-1.5 text-[11px] font-medium text-foreground transition-colors hover:bg-primary hover:text-primary-foreground disabled:opacity-50`}
                      >
                        <Icon className="h-3 w-3 shrink-0" />
                        <span className="truncate">{language === "bn" ? role.labelBn : role.labelEn}</span>
                      </button>
                    );
                  })}
              </div>
            </div>
          </div>

          <p className="mt-4 text-center text-[10.5px] text-muted-foreground">
            {language === "bn"
              ? `শুধুমাত্র অনুমোদিত ${platformName} স্টাফদের জন্য। অননুমোদিত প্রবেশ চেষ্টা লগ করা হয়।`
              : `Authorized ${platformNameEn} staff only. Unauthorized access attempts are logged.`}
          </p>
        </div>

        <button
          onClick={() => navigate(homeHref)}
          className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground"
        >
          {language === "bn" ? `← ${platformName} হোম` : `← ${platformNameEn} home`}
        </button>
        </motion.div>
      </div>
    </div>
  );
};

export default StaffLoginPage;
