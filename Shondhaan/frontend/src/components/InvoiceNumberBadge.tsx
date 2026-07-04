import { useState } from "react";
import { Copy, Check, ShieldCheck, ShieldAlert, Hash } from "lucide-react";
import { toast } from "sonner";
import { verifyInvoiceNumber } from "@/lib/invoiceNumber";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

interface InvoiceNumberBadgeProps {
  number: string;
  label?: string;
  /** "inline" = small chip used in headers, "block" = full-width card row. */
  variant?: "inline" | "block";
  /** Show checksum verification dot. */
  showVerify?: boolean;
  className?: string;
}

/**
 * Unified invoice / tracking number display.
 * Used by BookingConfirmation, letterhead PDFs (via invoiceNumberHtml),
 * Mart orders, Finance reports — any document carrying our standard ID.
 */
const InvoiceNumberBadge = ({
  number,
  label,
  variant = "inline",
  showVerify = true,
  className,
}: InvoiceNumberBadgeProps) => {
  const { language } = useLanguage();
  const bn = language === "bn";
  const [copied, setCopied] = useState(false);
  const valid = number ? verifyInvoiceNumber(number) : false;
  const finalLabel = label ?? (bn ? "ইনভয়েস নং" : "Invoice No.");

  // Handle undefined or missing number
  if (!number) {
    return (
      <div className={cn("text-xs font-mono text-muted-foreground", className)}>
        {bn ? "অর্ডার নং - প্রক্রিয়াধীন" : "Order No. - Processing"}
      </div>
    );
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(number);
      setCopied(true);
      toast.success(bn ? "কপি হয়েছে" : "Copied");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error(bn ? "কপি ব্যর্থ" : "Copy failed");
    }
  };

  if (variant === "block") {
    return (
      <div
        className={cn(
          "flex items-center justify-between gap-3 rounded-xl border border-border bg-secondary/40 px-3 py-2",
          className,
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Hash className="h-4 w-4 text-primary shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{finalLabel}</p>
            <p className="font-mono text-sm font-semibold text-foreground truncate">{number}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {showVerify &&
            (valid ? (
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
            ) : (
              <ShieldAlert className="h-4 w-4 text-amber-600" />
            ))}
          <button
            onClick={copy}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-background hover:text-foreground transition-colors"
            aria-label="Copy invoice number"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={copy}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/50 px-2.5 py-1 font-mono text-xs text-foreground hover:bg-secondary transition-colors",
        className,
      )}
      title={bn ? "কপি করতে ক্লিক করুন" : "Click to copy"}
    >
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{finalLabel}</span>
      <span className="font-semibold">{number}</span>
      {showVerify &&
        (valid ? (
          <ShieldCheck className="h-3 w-3 text-emerald-600" />
        ) : (
          <ShieldAlert className="h-3 w-3 text-amber-600" />
        ))}
      {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
    </button>
  );
};

export default InvoiceNumberBadge;

/**
 * String-HTML twin of the badge for letterhead print/PDF windows
 * (no React runtime). Keeps print output visually consistent.
 */
export const invoiceNumberHtml = (number: string, label = "Invoice No.") => `
  <span style="display:inline-flex;align-items:center;gap:6px;border:1px solid #e2e8f0;background:#f8fafc;border-radius:999px;padding:3px 10px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:9pt;color:#0f172a;">
    <span style="font-size:7.5pt;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;">${label}</span>
    <span style="font-weight:700;">${number}</span>
  </span>`;
