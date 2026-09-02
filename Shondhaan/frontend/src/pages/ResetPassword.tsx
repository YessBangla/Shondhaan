import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock, Eye, EyeOff, ChevronLeft, Loader2, Mail, XCircle } from "lucide-react";
import { toast } from "sonner";

const PROFILE_API_BASE =
  import.meta.env.VITE_CENTRAL_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE;

type TokenState = "request" | "checking" | "valid" | "invalid";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [email, setEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tokenState, setTokenState] = useState<TokenState>(token ? "checking" : "request");

  useEffect(() => {
    if (!token) {
      setTokenState("request");
      return;
    }

    const verifyToken = async () => {
      try {
        const res = await fetch(
          `${PROFILE_API_BASE}/api/auth/verify-reset-token?token=${encodeURIComponent(token)}`
        );
        const data = await res.json().catch(() => ({}));
        setTokenState(data.valid ? "valid" : "invalid");
      } catch (err) {
        console.error("verify-reset-token error:", err);
        setTokenState("invalid");
      }
    };

    verifyToken();
  }, [token]);

  const handleRequestLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("ইমেইল দিন");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${PROFILE_API_BASE}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "রিসেট লিংক পাঠাতে সমস্যা হয়েছে");
      toast.success("রিসেট লিংক পাঠানো হয়েছে! ইমেইল চেক করুন।");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "রিসেট লিংক পাঠাতে সমস্যা হয়েছে");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast.error("পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("পাসওয়ার্ড মিলছে না");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${PROFILE_API_BASE}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || "পাসওয়ার্ড আপডেট করতে সমস্যা হয়েছে");
      }

      toast.success("পাসওয়ার্ড সফলভাবে আপডেট হয়েছে!");
      navigate("/login", { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "পাসওয়ার্ড আপডেট করতে সমস্যা হয়েছে");
    } finally {
      setLoading(false);
    }
  };

  // Checking token validity
  if (tokenState === "checking") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">লিংক যাচাই হচ্ছে...</p>
        </motion.div>
      </div>
    );
  }

  if (tokenState === "request") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <Mail className="h-6 w-6 text-primary" />
            </div>
            <h1 className="font-heading text-2xl font-bold text-foreground">পাসওয়ার্ড ভুলে গেছেন?</h1>
            <p className="text-sm text-muted-foreground mt-1">আপনার ইমেইলে রিসেট লিংক পাঠানো হবে</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <form onSubmit={handleRequestLink} className="space-y-3">
              <input
                type="email"
                placeholder="আপনার ইমেইল"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-primary py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? "অপেক্ষা করুন..." : "রিসেট লিংক পাঠান"}
              </button>
            </form>
          </div>
          <button
            onClick={() => navigate("/login")}
            className="mt-4 w-full flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" /> লগইন পেজে ফিরুন
          </button>
        </motion.div>
      </div>
    );
  }

  // Invalid or expired token
  if (tokenState === "invalid") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md text-center"
        >
          <div className="h-14 w-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <XCircle className="h-7 w-7 text-red-500" />
          </div>
          <h1 className="font-heading text-xl font-bold text-foreground mb-2">
            লিংক মেয়াদোত্তীর্ণ বা অবৈধ
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            এই রিসেট লিংকটি সঠিক নয় অথবা মেয়াদ শেষ হয়ে গেছে। নতুন লিংকের জন্য আবার চেষ্টা করুন।
          </p>
          <button
            onClick={() => navigate("/forgot-password")}
            className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
          >
            নতুন লিংক পাঠান
          </button>
          <button
            onClick={() => navigate("/login")}
            className="mt-4 w-full flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" /> লগইন পেজে ফিরুন
          </button>
        </motion.div>
      </div>
    );
  }

  // Valid token — show reset form
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-foreground">নতুন পাসওয়ার্ড সেট করুন</h1>
          <p className="text-sm text-muted-foreground mt-1">আপনার নতুন পাসওয়ার্ড দিন</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <form onSubmit={handleReset} className="space-y-3">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="নতুন পাসওয়ার্ড"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                maxLength={72}
                className="w-full rounded-lg border border-input bg-background pl-10 pr-10 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="পাসওয়ার্ড নিশ্চিত করুন"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                maxLength={72}
                className="w-full rounded-lg border border-input bg-background pl-10 pr-3 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-primary py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "অপেক্ষা করুন..." : "পাসওয়ার্ড আপডেট করুন"}
            </button>
          </form>
        </div>

        <button
          onClick={() => navigate("/login")}
          className="mt-4 w-full flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" /> লগইন পেজে ফিরুন
        </button>
      </motion.div>
    </div>
  );
};

export default ResetPassword;