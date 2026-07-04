import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, Phone, User, ArrowLeft, Lock, Eye, EyeOff, MapPin, Building2, UserPlus, LogIn, Store } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import OtpInput from "@/components/auth/OtpInput";
import AuthHeroPanel from "@/components/auth/AuthHeroPanel";
import BiometricLoginButton, { useBiometricEnrolment } from "@/components/auth/BiometricLoginButton";
import { getRoleRedirectPath } from "@/lib/roleRedirect";
import { useSEO } from "@/hooks/useSEO";
import { loginWithMySql, requestSignupOtp, verifySignupOtp } from "@/lib/mysqlAuth";

type Step = "form" | "otp";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);

  useSEO({
    title: "Sign in or Create Account",
    description:
      "Sign in or create your Yess Service account to book trusted home services across Bangladesh.",
    canonical: "/auth",
    noindex: true,
  });
  const [role, setRole] = useState("user");
  const [shopName, setShopName] = useState("");
  const [shopType, setShopType] = useState("");
  const [loginMethod, setLoginMethod] = useState<"email" | "phone">("email");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<Step>("form");
  const [otpEmail, setOtpEmail] = useState("");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const ROLE_OPTIONS = [
  { value: "user", label: "User" },
  { value: "employer", label: "Employer" },
  { value: "mart_vendor", label: "Mart Vendor" },
  { value: "mart_delivery", label: "Mart Delivery" },
  { value: "mart_cs", label: "Mart Customer Service" },
  { value: "yessdeal_seller", label: "YessDeal Seller" },
];
  const SHOP_TYPE_OPTIONS = [
    { value: "grocery", label: "Grocery" },
    { value: "electronics", label: "Electronics" },
    { value: "fashion", label: "Fashion" },
    { value: "pharmacy", label: "Pharmacy" },
    { value: "others", label: "Others" },
  ];
  const passwordRules = [
    {
      label: language === "bn" ? "কমপক্ষে ৮ অক্ষর" : "At least 8 characters",
      valid: password.length >= 8,
    },
    {
      label: language === "bn" ? "বড় ও ছোট অক্ষর" : "Uppercase and lowercase letters",
      valid: /[A-Z]/.test(password) && /[a-z]/.test(password),
    },
    {
      label: language === "bn" ? "সংখ্যা" : "A number",
      valid: /\d/.test(password),
    },
    {
      label: language === "bn" ? "বিশেষ চিহ্ন" : "A special character",
      valid: /[^A-Za-z0-9]/.test(password),
    },
  ];
  const isPasswordStrong = passwordRules.every((rule) => rule.valid);
  const passwordPolicyMessage =
    language === "bn"
      ? "পাসওয়ার্ডে কমপক্ষে ৮ অক্ষর, বড়/ছোট অক্ষর, সংখ্যা ও বিশেষ চিহ্ন দিন।"
      : "Use at least 8 characters with uppercase, lowercase, a number, and a special character.";

  const generatePasswordSuggestion = () => {
    const groups = ["ABCDEFGHJKLMNPQRSTUVWXYZ", "abcdefghijkmnopqrstuvwxyz", "23456789", "!@#$%&*?"];
    const all = groups.join("");
    const chars = groups.map((group) => group[Math.floor(Math.random() * group.length)]);

    while (chars.length < 12) {
      chars.push(all[Math.floor(Math.random() * all.length)]);
    }

    return chars
      .map((char) => ({ char, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .map(({ char }) => char)
      .join("");
  };

  const handleSuggestPassword = () => {
    setPassword(generatePasswordSuggestion());
    setShowPassword(true);
    toast.success(language === "bn" ? "শক্তিশালী পাসওয়ার্ড সাজেস্ট করা হয়েছে" : "Strong password suggested");
  };
  // Always redirect to the role-specific dashboard. The optional `?redirect=`
  // query param is intentionally ignored so that every login lands on the
  // user's own panel (per product requirement).
  const { enrol, isEnrolled } = useBiometricEnrolment();

  // Open the role-specific dashboard in a new tab and send the current tab home.
  // Falls back to same-tab navigation if the popup is blocked.
  const openDashboardInNewTab = async () => {
    const path = await getRoleRedirectPath();
    const url = `${window.location.origin}${path}`;
    const win = window.open(url, "_blank", "noopener,noreferrer");
    if (win) {
      navigate("/", { replace: true });
    } else {
      navigate(path, { replace: true });
    }
  };

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "signup") setIsLogin(false);
    else if (tab === "login") setIsLogin(true);
  }, [searchParams]);

  useEffect(() => {
    // Intentionally do NOT auto-redirect already-logged-in users away from /auth.
    // The user explicitly wants the dashboard to open in a separate tab on
    // login, while the current tab stays on the public site.
  }, [user, navigate]);

  // --- LOGIN with password ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const loginId = loginMethod === "email" ? email.trim() : phone.trim();

    if (loginMethod === "email" && !loginId) {
      toast.error(t("auth.enterEmail"));
      return;
    }
    if (loginMethod === "phone" && (!loginId || !/^01[3-9]\d{8}$/.test(loginId))) {
      toast.error(t("auth.validPhone"));
      return;
    }
    if (!password.trim() || password.length < 6) {
      toast.error(t("auth.enterPassword"));
      return;
    }

    setLoading(true);
    try {
      // Phone login is validated against the backend users.mobile value.
      await loginWithMySql({
        identifier: loginId,
        password: password,
      });

      toast.success(t("auth.loginSuccess"));
      // Offer biometric enrolment on a real mobile device, once
      try {
        const supportsWebAuthn = typeof window !== "undefined" && !!window.PublicKeyCredential;
        if (supportsWebAuthn && !isEnrolled() && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) {
          const yes = window.confirm(
            language === "bn"
              ? "পরবর্তী লগইন আরও দ্রুত করতে ফিঙ্গারপ্রিন্ট/Face ID সেট আপ করবেন?"
              : "Set up fingerprint / Face ID for faster sign-in next time?",
          );
          if (yes && loginMethod === "email") await enrol(loginId);
        }
      } catch { /* ignore */ }
      await openDashboardInNewTab();
    } catch (error: any) {
      toast.error(
        error.message ||
          (loginMethod === "phone"
            ? (language === "bn" ? "ভুল ফোন নম্বর বা পাসওয়ার্ড।" : "Invalid phone number or password.")
            : t("auth.error")),
      );
    } finally {
      setLoading(false);
    }
  };

  // --- REGISTER: send OTP ---
  const handleRegisterSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { toast.error(t("auth.enterEmail")); return; }
    if (!name.trim()) { toast.error(t("auth.enterName")); return; }
    if (!phone.trim() || !/^01[3-9]\d{8}$/.test(phone.trim())) {
      toast.error(t("auth.validPhone"));
      return;
    }
    if (!password.trim()) {
      toast.error(t("auth.enterPassword"));
      return;
    }
    if (!isPasswordStrong) {
      toast.error(passwordPolicyMessage);
      return;
    }
if (role === "mart_vendor" && !shopName.trim()) {
  toast.error(
    language === "bn"
      ? "দোকানের নাম লিখুন"
      : "Please enter shop name"
  );
  return;
}
if (role === "mart_vendor" && !shopType) {
  toast.error(language === "bn" ? "শপ টাইপ সিলেক্ট করুন" : "Please select shop type");
  return;
}
    setLoading(true);
    try {
    await requestSignupOtp({
  name: name.trim(),
  mobile: phone.trim(),
  address: address.trim(),
  email: email.trim(),
  password,
  type: role,
  shop_name: role === "mart_vendor" ? shopName.trim() : "",
  shop_type: role === "mart_vendor" ? shopType : "",
});
      setOtpEmail(email.trim());
      setStep("otp");
      toast.success(t("auth.otpSent"));
    } catch (error: any) {
      toast.error(error.message || t("auth.error"));
    } finally {
      setLoading(false);
    }
  };

  // --- Verify OTP & set password ---
  const handleVerifyOtp = async (otp: string) => {
    setLoading(true);
    try {
      await verifySignupOtp({
        email: otpEmail,
        otp,
      });

      toast.success(t("auth.accountCreated"));
      await openDashboardInNewTab();
    } catch (error: any) {
      toast.error(error.message || t("auth.invalidOtp"));
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setLoading(true);
    try {
   await requestSignupOtp({
  name: name.trim(),
  mobile: phone.trim(),
  address: address.trim(),
  email: otpEmail,
  password,
  type: role,
  shop_name: role === "mart_vendor" ? shopName.trim() : "",
  shop_type: role === "mart_vendor" ? shopType : "",
});
      toast.success(t("auth.otpSent"));
    } catch (error: any) {
      toast.error(error.message || t("auth.error"));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) {
        toast.error(t("auth.googleError"));
      }
    } catch {
      toast.error(t("auth.googleError"));
    } finally {
      setLoading(false);
    }
  };

  // OTP screen (registration only)
  if (step === "otp") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="font-heading text-2xl font-bold text-foreground">{t("auth.enterOtp")}</h1>
            <p className="text-sm text-muted-foreground mt-1">{t("auth.otpSubtitle")}</p>
            <p className="text-xs text-primary mt-2 font-medium">{otpEmail}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <OtpInput onComplete={handleVerifyOtp} loading={loading} t={t} />
            <div className="mt-4 flex items-center justify-between">
              <button onClick={() => setStep("form")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-3.5 w-3.5" /> {t("auth.changeEmail")}
              </button>
              <button onClick={handleResendOtp} disabled={loading} className="text-sm text-primary hover:underline disabled:opacity-50">
                {t("auth.resendOtp")}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-5xl flex gap-8 items-stretch">
        {/* Left Hero Panel - Desktop only */}
        <div className="hidden lg:block flex-1 max-w-md">
          <AuthHeroPanel />
        </div>

        {/* Right Auth Form */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md mx-auto lg:mx-0">
        {/* Top 3-tab selector: Sign Up / Login / Office Login */}
        <div className="grid grid-cols-3 gap-1 p-1 mb-5 rounded-xl border border-border bg-card shadow-sm">
          <button
            type="button"
            onClick={() => { setIsLogin(false); setPassword(""); }}
            className={`flex flex-col items-center gap-1 py-2 rounded-lg text-[11px] font-semibold transition-colors ${
              !isLogin ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-secondary"
            }`}
          >
            <UserPlus className="h-4 w-4" />
            {language === "bn" ? "ইউজার তৈরী" : "Sign Up"}
          </button>
          <button
            type="button"
            onClick={() => { setIsLogin(true); setPassword(""); }}
            className={`flex flex-col items-center gap-1 py-2 rounded-lg text-[11px] font-semibold transition-colors ${
              isLogin ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-secondary"
            }`}
          >
            <LogIn className="h-4 w-4" />
            {language === "bn" ? "ইউজার লগইন" : "User Login"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/main-login")}
            className="flex flex-col items-center gap-1 py-2 rounded-lg text-[11px] font-semibold text-muted-foreground hover:bg-secondary transition-colors"
          >
            <Building2 className="h-4 w-4" />
            {language === "bn" ? "অফিস লগইন" : "Office Login"}
          </button>
        </div>

        <div className="text-center mb-8">
          <h1 className="font-heading text-2xl font-bold text-foreground">
            {isLogin ? t("auth.login") : t("auth.createAccount")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isLogin ? t("auth.loginSubtitle") : t("auth.registerSubtitle")}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <form onSubmit={isLogin ? handleLogin : handleRegisterSendOtp} className="space-y-3">
            {/* Login: email/phone toggle */}
            {isLogin && (
              <div className="flex rounded-lg border border-border overflow-hidden mb-1">
                <button
                  type="button"
                  onClick={() => setLoginMethod("email")}
                  className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                    loginMethod === "email" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  <Mail className="inline h-4 w-4 mr-1.5 -mt-0.5" /> {t("auth.email")}
                </button>
                <button
                  type="button"
                  onClick={() => setLoginMethod("phone")}
                  className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                    loginMethod === "phone" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  <Phone className="inline h-4 w-4 mr-1.5 -mt-0.5" /> {t("auth.phone")}
                </button>
              </div>
            )}

            {/* Registration fields */}
            {!isLogin && (
              <>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    autoComplete="name"
                    autoCapitalize="words"
                    autoCorrect="off"
                    spellCheck={false}
                    enterKeyHint="next"
                    placeholder={t("auth.namePlaceholder")}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={100}
                    className="w-full rounded-lg border border-input bg-background pl-10 pr-3 py-3 text-base md:text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:border-primary transition"
                  />
                </div>
                {/* Role Selection */}
<div className="relative">
  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />

  <select
    value={role}
    onChange={(e) => {
      setRole(e.target.value);

      if (e.target.value !== "mart_vendor") {
        setShopName("");
        setShopType("");
      }
    }}
    className="w-full rounded-lg border border-input bg-background pl-10 pr-3 py-3 text-base md:text-sm text-foreground outline-none focus:ring-2 focus:ring-ring focus:border-primary transition"
  >
    {ROLE_OPTIONS.map((item) => (
      <option key={item.value} value={item.value}>
        {item.label}
      </option>
    ))}
  </select>
</div>

{/* Shop Name (Only Mart Vendor) */}
{role === "mart_vendor" && (
  <div className="relative">
    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />

    <input
      type="text"
      value={shopName}
      onChange={(e) => setShopName(e.target.value)}
      placeholder={
        language === "bn"
          ? "দোকানের নাম লিখুন"
          : "Enter Shop Name"
      }
      maxLength={150}
      className="w-full rounded-lg border border-input bg-background pl-10 pr-3 py-3 text-base md:text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:border-primary transition"
    />
  </div>
)}
{role === "mart_vendor" && (
  <div className="relative">
    <Store className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
    <select
      value={shopType}
      onChange={(e) => setShopType(e.target.value)}
      className="w-full rounded-lg border border-input bg-background pl-10 pr-3 py-3 text-base md:text-sm text-foreground outline-none focus:ring-2 focus:ring-ring focus:border-primary transition"
    >
      <option value="">{language === "bn" ? "শপ টাইপ সিলেক্ট করুন" : "Select shop type"}</option>
      {SHOP_TYPE_OPTIONS.map((item) => (
        <option key={item.value} value={item.value}>{item.label}</option>
      ))}
    </select>
  </div>
)}
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="01[3-9][0-9]{8}"
                    autoComplete="tel"
                    autoCorrect="off"
                    enterKeyHint="next"
                    placeholder={t("auth.phonePlaceholder")}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
                    maxLength={11}
                    className="w-full rounded-lg border border-input bg-background pl-10 pr-3 py-3 text-base md:text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:border-primary transition"
                  />
                </div>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    autoComplete="street-address"
                    autoCapitalize="sentences"
                    enterKeyHint="next"
                    placeholder={language === "bn" ? "ঠিকানা (বাসা, রোড, এলাকা)" : "Address (house, road, area)"}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    maxLength={300}
                    className="w-full rounded-lg border border-input bg-background pl-10 pr-3 py-3 text-base md:text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:border-primary transition"
                  />
                </div>
              </>
            )}

            {/* Login phone field */}
            {isLogin && loginMethod === "phone" && (
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="tel"
                  inputMode="numeric"
                  pattern="01[3-9][0-9]{8}"
                  autoComplete="tel"
                  enterKeyHint="next"
                  placeholder={t("auth.phonePlaceholder")}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
                  maxLength={11}
                  className="w-full rounded-lg border border-input bg-background pl-10 pr-3 py-3 text-base md:text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:border-primary transition"
                />
              </div>
            )}

            {/* Email field */}
            {((!isLogin) || (isLogin && loginMethod === "email")) && (
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="email"
                  inputMode="email"
                  autoComplete={isLogin ? "email" : "email"}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  enterKeyHint="next"
                  placeholder={t("auth.emailPlaceholder")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  maxLength={255}
                  className="w-full rounded-lg border border-input bg-background pl-10 pr-3 py-3 text-base md:text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:border-primary transition"
                />
              </div>
            )}

            {/* Password field */}
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type={showPassword ? "text" : "password"}
                autoComplete={isLogin ? "current-password" : "new-password"}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="go"
                placeholder={isLogin ? t("auth.passwordPlaceholder") : t("auth.setPasswordPlaceholder")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                maxLength={72}
                className="w-full rounded-lg border border-input bg-background pl-10 pr-24 py-3 text-base md:text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:border-primary transition"
              />
              <button
                type="button"
                onClick={handleSuggestPassword}
                className="absolute right-10 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-primary hover:underline"
              >
                {language === "bn" ? "সাজেস্ট" : "Suggest"}
              </button>
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {isLogin ? (
              <p className="text-[11px] text-muted-foreground">{passwordPolicyMessage}</p>
            ) : (
              <div className="grid grid-cols-2 gap-1.5 text-[11px] text-muted-foreground">
                {passwordRules.map((rule) => (
                  <span
                    key={rule.label}
                    className={rule.valid ? "font-medium text-primary" : undefined}
                  >
                    {rule.valid ? "✓ " : "• "}
                    {rule.label}
                  </span>
                ))}
              </div>
            )}

            <button type="submit" disabled={loading} className="w-full rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50">
              {loading
                ? t("auth.loading")
                : isLogin
                  ? t("auth.loginBtn")
                  : t("auth.sendOtp")
              }
            </button>
          </form>

          {/* Divider */}
          <div className="my-4 flex items-center gap-3">
            <div className="flex-1 border-t border-border" />
            <span className="text-xs text-muted-foreground">{t("auth.or")}</span>
            <div className="flex-1 border-t border-border" />
          </div>

          {/* Biometric quick login (only renders if user enrolled before on this device) */}
          {isLogin && (
            <div className="mb-3">
              <BiometricLoginButton />
            </div>
          )}

          {/* Google Sign In */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-lg border border-border bg-background py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary disabled:opacity-50"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            {t("auth.googleLogin")}
          </button>

          {isLogin && (
            <>
              <button
                onClick={() => navigate("/reset-password")}
                className="mt-3 w-full text-center text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                {t("auth.forgotPassword")}
              </button>

              {/* Demo Login Section — only customer/user demo on /auth */}
              <div className="mt-4 rounded-lg border border-dashed border-primary/30 bg-primary/5 p-3">
                <p className="text-xs font-semibold text-primary mb-2 text-center">
                  {language === "bn" ? "🔑 ডেমো ইউজার দিয়ে লগইন" : "🔑 Quick Demo User Login"}
                </p>
                <div className="grid grid-cols-1 gap-1.5">
                  {[
                    { label: language === "bn" ? "ডেমো ইউজার" : "Demo User", email: "user@demo.yessbangla.xyz" },
                  ].map((demo) => (
                    <button
                      key={demo.email}
                      type="button"
                      disabled={loading}
                      onClick={async () => {
                        setLoading(true);
                        try {
                          const { error } = await supabase.auth.signInWithPassword({
                            email: demo.email,
                            password: "Demo@1234",
                          });
                          if (error) throw error;
                          toast.success(`${demo.label} ${language === "bn" ? "হিসেবে লগইন হয়েছে" : "logged in"}`);
                          await openDashboardInNewTab();
                        } catch (err: any) {
                          toast.error(err.message || "Login failed");
                        } finally {
                          setLoading(false);
                        }
                      }}
                      className="rounded-md border border-primary/20 bg-background px-2 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
                    >
                      {demo.label}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-center text-[10px] text-muted-foreground">
                  {language === "bn" ? "স্টাফ/অ্যাডমিন? অফিস লগইন ব্যবহার করুন।" : "Staff/Admin? Use Office Login."}
                </p>
              </div>
            </>
          )}

          <p className="mt-4 text-center text-sm text-muted-foreground">
            {isLogin ? t("auth.noAccount") : t("auth.hasAccount")}{" "}
            <button onClick={() => { setIsLogin(!isLogin); setPassword(""); }} className="font-medium text-primary hover:underline">
              {isLogin ? t("auth.registerLink") : t("auth.loginLink")}
            </button>
          </p>
        </div>

        <button onClick={() => navigate("/")} className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground">
          {t("auth.backHome")}
        </button>
      </motion.div>
      </div>
    </div>
  );
};

export default Auth;
