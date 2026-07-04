import { useState, useRef, useEffect } from "react";

interface OtpInputProps {
  onComplete: (otp: string) => void;
  loading: boolean;
  t: (key: string) => string;
}

const OtpInput = ({ onComplete, loading, t }: OtpInputProps) => {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Web OTP API — auto-fills 6-digit code from SMS on supported browsers
  // (Android Chrome). The SMS must include "@<host> #<code>" per spec.
  // Silently no-ops on unsupported platforms (iOS, desktop).
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("OTPCredential" in window)) return;
    const ac = new AbortController();
    try {
      (navigator.credentials as unknown as {
        get: (opts: unknown) => Promise<{ code?: string } | null>;
      })
        .get({ otp: { transport: ["sms"] }, signal: ac.signal })
        .then((cred) => {
          const code = cred?.code?.replace(/\D/g, "").slice(0, 6);
          if (code && code.length === 6) {
            setOtp(code.split(""));
            onComplete(code);
          }
        })
        .catch(() => {
          /* user dismissed or unsupported */
        });
    } catch {
      /* ignore */
    }
    return () => ac.abort();
  }, [onComplete]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    const fullOtp = newOtp.join("");
    if (fullOtp.length === 6) {
      onComplete(fullOtp);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(""));
      onComplete(pasted);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-center gap-2" onPaste={handlePaste}>
        {otp.map((digit, i) => (
          <input
            key={i}
            ref={(el) => { inputRefs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            disabled={loading}
            className="h-12 w-11 rounded-lg border border-input bg-background text-center text-lg font-bold text-foreground outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
          />
        ))}
      </div>
      <button
        onClick={() => {
          const fullOtp = otp.join("");
          if (fullOtp.length === 6) onComplete(fullOtp);
        }}
        disabled={loading || otp.join("").length < 6}
        className="w-full rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
      >
        {loading ? t("auth.loading") : t("auth.verifyOtp")}
      </button>
    </div>
  );
};

export default OtpInput;
