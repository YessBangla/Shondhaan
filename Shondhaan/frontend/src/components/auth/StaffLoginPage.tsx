import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Eye, EyeOff, Loader2, Lock, Mail, Phone, ShieldCheck } from "lucide-react";

import { ROLES, type RoleKey } from "@/config/roles";
import { clearMySqlAuth, loginWithMySql } from "@/lib/mysqlAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import AuthHeroPanel from "./AuthHeroPanel";

export interface StaffLoginPageProps {
  platformKey: "mart" | "deal" | "jobs" | "super_admin";
  platformName: string;
  platformNameEn: string;
  logoSrc: string;
  homeHref: string;
  roleKeys: RoleKey[];
  gradient: string;
  accent: string;
  ring: string;
}

const demoAccountByRole: Partial<Record<RoleKey, string>> = {
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
  const { toast } = useToast();
  const { language } = useLanguage();
  const bn = language === "bn";

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const eligibleRoles = ROLES.filter((role) => roleKeys.includes(role.key));

  useEffect(() => {
    document.title = `${platformNameEn} Staff Login | Yess`;
  }, [platformNameEn]);

  const openPanelInNewTab = (path: string) => {
    const url = `${window.location.origin}${path}`;
    const win = window.open(url, "_blank", "noopener,noreferrer");
    if (win) {
      navigate(homeHref, { replace: true });
    } else {
      navigate(path, { replace: true });
    }
  };

  const completeBackendLogin = async (loginId: string, loginPassword: string) => {
    const result = await loginWithMySql({ identifier: loginId, password: loginPassword });
    const match = roleKeys.find((roleKey) => roleKey === result.user.type);

    if (!match) {
      clearMySqlAuth();
      throw new Error(`You do not have access to the ${platformNameEn} staff portal.`);
    }

    const role = ROLES.find((item) => item.key === match);
    toast({
      title: "Welcome",
      description: `Signed in as ${bn ? role?.labelBn : role?.labelEn || match}.`,
    });
    openPanelInNewTab(role?.panelPath || homeHref);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const loginId = identifier.trim();
    const isPhoneLogin = /^\d+$/.test(loginId);

    if (!loginId || !password) {
      toast({ title: "Error", description: "Email/phone and password are required.", variant: "destructive" });
      return;
    }

    if (isPhoneLogin && !/^01[3-9]\d{8}$/.test(loginId)) {
      toast({ title: "Error", description: "Enter a valid 11 digit mobile number.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      await completeBackendLogin(loginId, password);
    } catch (error: any) {
      clearMySqlAuth();
      toast({
        title: "Login failed",
        description: error?.message || (isPhoneLogin ? "Wrong phone number or password." : "Wrong email or password."),
        variant: "destructive",
      });
      setSubmitting(false);
    }
  };

  const handleDemoLogin = async (role: (typeof ROLES)[number], demoEmail: string) => {
    setSubmitting(true);
    try {
      await completeBackendLogin(demoEmail, "Demo@1234");
    } catch (error: any) {
      clearMySqlAuth();
      toast({
        title: "Login failed",
        description: error?.message || "Demo account was not found in the backend.",
        variant: "destructive",
      });
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[aliceblue] flex items-center justify-center px-4 py-8" data-platform={platformKey}>
      <div className="w-full max-w-5xl flex gap-8 items-stretch border shadow bg-white rounded-xl py-4">
        <div className="hidden lg:block flex-1 max-w-md">
          <AuthHeroPanel />
        </div>

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
            Back to user login
          </Link>

          <div className="text-center mb-6">
            <div className={`inline-flex items-center gap-2 rounded-full border ${ring} bg-primary/5 px-3 py-1 mb-3`}>
              {logoSrc ? <img src={logoSrc} alt="" className="h-4 w-4 object-contain" /> : <ShieldCheck className="h-3.5 w-3.5 text-primary" />}
              <span className="text-[11px] font-semibold text-primary">Office / Staff Login</span>
            </div>
            <h1 className="font-heading text-2xl font-bold text-foreground">
              {bn ? `${platformName} পোর্টাল` : `${platformNameEn} Portal`}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Sign in with your backend staff account.</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-medium block mb-1">Email / Phone</label>
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
                    onChange={(event) => setIdentifier(event.target.value)}
                    placeholder="staff@yessbangla.xyz / 01XXXXXXXXX"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium block mb-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type={showPass ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Password"
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((value) => !value)}
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
                className={`w-full py-2.5 rounded-xl bg-primary text-white font-semibold text-sm shadow-md hover:opacity-95 disabled:opacity-60 inline-flex items-center justify-center gap-2`}
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {submitting ? "Signing in..." : "Sign in"}
              </button>

              <div className="flex items-center justify-between text-xs pt-1">
                <Link to="/auth" className={`${accent} hover:underline`}>User login</Link>
                <Link to="/reset-password" className="text-muted-foreground hover:text-foreground">Forgot password?</Link>
              </div>
            </form>

            <div className="mt-4">
              <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-3">
                <p className="text-[11px] font-semibold text-primary mb-2 text-center">Quick Demo Staff Login</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {eligibleRoles
                    .map((role) => ({ role, demoEmail: demoAccountByRole[role.key] }))
                    .filter((item) => Boolean(item.demoEmail))
                    .map(({ role, demoEmail }) => {
                      const Icon = role.icon;
                      return (
                        <button
                          key={role.key}
                          type="button"
                          disabled={submitting}
                          onClick={() => handleDemoLogin(role, demoEmail!)}
                          className="flex items-center gap-1.5 rounded-md border border-primary/20 bg-background px-2 py-1.5 text-[11px] font-medium text-foreground transition-colors hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
                        >
                          <Icon className="h-3 w-3 shrink-0" />
                          <span className="truncate">{bn ? role.labelBn : role.labelEn}</span>
                        </button>
                      );
                    })}
                </div>
              </div>
            </div>

            <p className="mt-4 text-center text-[10.5px] text-muted-foreground">
              Authorized {platformNameEn} staff only. Login uses backend staff accounts.
            </p>
          </div>

          <button
            onClick={() => navigate(homeHref)}
            className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground"
          >
            Back to {platformNameEn} home
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default StaffLoginPage;
