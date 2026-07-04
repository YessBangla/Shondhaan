import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { reasonBody, reasonInline } from "@/lib/permissionCopy";
import { AlertTriangle, CheckCircle2, Lock, Star, Trash2, XCircle } from "lucide-react";
import { ReactNode } from "react";

const toBn = (n: number | string) =>
  String(n).replace(/[0-9]/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)]);

export type BulkActionTone = "approve" | "reject" | "delete" | "feature" | "unfeature" | "neutral";

const toneStyles: Record<BulkActionTone, { ring: string; chip: string; btn: string; icon: ReactNode; defaultTitle: string }> = {
  approve: {
    ring: "ring-emerald-500/30 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
    chip: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
    btn: "bg-emerald-600 hover:bg-emerald-700 text-white",
    icon: <CheckCircle2 className="h-5 w-5" />,
    defaultTitle: "গণ অনুমোদন নিশ্চিত করুন",
  },
  reject: {
    ring: "ring-rose-500/30 bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
    chip: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300",
    btn: "bg-rose-600 hover:bg-rose-700 text-white",
    icon: <XCircle className="h-5 w-5" />,
    defaultTitle: "গণ প্রত্যাখ্যান নিশ্চিত করুন",
  },
  delete: {
    ring: "ring-destructive/30 bg-destructive/10 text-destructive",
    chip: "bg-destructive/15 text-destructive",
    btn: "bg-destructive hover:bg-destructive/90 text-destructive-foreground",
    icon: <Trash2 className="h-5 w-5" />,
    defaultTitle: "গণ মুছে ফেলা নিশ্চিত করুন",
  },
  feature: {
    ring: "ring-amber-500/30 bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
    chip: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
    btn: "bg-amber-500 hover:bg-amber-600 text-white",
    icon: <Star className="h-5 w-5" />,
    defaultTitle: "গণ ফিচার্ড নিশ্চিত করুন",
  },
  unfeature: {
    ring: "ring-muted-foreground/20 bg-muted text-muted-foreground",
    chip: "bg-muted text-muted-foreground",
    btn: "bg-secondary hover:bg-secondary/80 text-foreground",
    icon: <Star className="h-5 w-5" />,
    defaultTitle: "ফিচার্ড সরানো নিশ্চিত করুন",
  },
  neutral: {
    ring: "ring-primary/30 bg-primary/10 text-primary",
    chip: "bg-primary/10 text-primary",
    btn: "bg-primary hover:bg-primary/90 text-primary-foreground",
    icon: <AlertTriangle className="h-5 w-5" />,
    defaultTitle: "একশন নিশ্চিত করুন",
  },
};

export interface BulkImpactRow {
  label: string;
  value: ReactNode;
}

export interface BulkConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
  count: number;
  /** Tone drives icon, ring, and confirm button color */
  tone?: BulkActionTone;
  /** Override the auto-generated title */
  title?: string;
  /** Short summary line (e.g. "নির্বাচিত বিজ্ঞাপনগুলো 'সক্রিয়' স্ট্যাটাসে যাবে।") */
  description?: string;
  /** Optional list of impacts: e.g. [{label:"স্ট্যাটাস", value:"সক্রিয়"}] */
  impacts?: BulkImpactRow[];
  /** Confirm button label */
  confirmLabel?: string;
  /** Subject label, e.g. "বিজ্ঞাপন", "বুকিং", "ব্যবহারকারী" — used in count chip */
  itemLabel?: string;
  /** Additional warning, shown in destructive callout */
  warning?: string;
  loading?: boolean;
  /** When set, confirm button is blocked and the reason is shown (permission gate). */
  disabledReason?: string;
}

const BulkConfirmDialog = ({
  open, onOpenChange, onConfirm,
  count, tone = "neutral", title, description,
  impacts, confirmLabel, itemLabel = "আইটেম", warning, loading, disabledReason,
}: BulkConfirmDialogProps) => {
  const t = toneStyles[tone];
  const blocked = !!disabledReason;
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className={cn("h-10 w-10 rounded-2xl flex items-center justify-center ring-1", t.ring)}>
              {t.icon}
            </div>
            <div className="min-w-0">
              <AlertDialogTitle className="text-base">{title || t.defaultTitle}</AlertDialogTitle>
              <p className="text-[11.5px] text-muted-foreground mt-0.5">
                <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-bold mr-1.5", t.chip)}>
                  {toBn(count)}
                </span>
                টি {itemLabel} প্রভাবিত হবে
              </p>
            </div>
          </div>
          {description && (
            <AlertDialogDescription className="pt-2 text-sm text-foreground/80">
              {description}
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>

        {(impacts && impacts.length > 0) || warning || blocked ? (
          <div className="space-y-2 -mt-1">
            {blocked && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-2.5 text-[12px] text-destructive"
              >
                <Lock className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="font-semibold">অনুমতি নেই — এই অ্যাকশন সম্পাদন করা যাবে না।</p>
                  {reasonBody(disabledReason) && (
                    <p className="text-[11.5px] opacity-90">
                      <span className="font-semibold">কারণ:</span> {reasonBody(disabledReason)}
                    </p>
                  )}
                  <p className="text-[11px] opacity-80 mt-0.5">প্রয়োজনে আপনার অ্যাডমিনের সাথে যোগাযোগ করুন।</p>
                </div>
              </div>
            )}
            {impacts && impacts.length > 0 && (
              <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-1.5">
                <p className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
                  প্রভাব
                </p>
                <ul className="space-y-1">
                  {impacts.map((row, i) => (
                    <li key={i} className="flex items-center justify-between gap-3 text-[12.5px]">
                      <span className="text-muted-foreground">{row.label}</span>
                      <span className="font-semibold text-foreground text-right">{row.value}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {warning && (
              <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-2.5 text-[11.5px] text-destructive">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <p>{warning}</p>
              </div>
            )}
          </div>
        ) : null}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>বাতিল</AlertDialogCancel>
          <AlertDialogAction
            disabled={loading || blocked}
            title={blocked ? `অনুমতি নেই — ${reasonInline(disabledReason)}` : undefined}
            aria-label={blocked ? `অনুমতি নেই — ${reasonInline(disabledReason)}` : undefined}
            onClick={(e) => {
              e.preventDefault();
              if (blocked) return;
              void onConfirm();
            }}
            className={cn(t.btn, "border-transparent")}
          >
            {loading ? (
              "প্রসেস হচ্ছে..."
            ) : blocked ? (
              <span className="inline-flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                অনুমতি নেই
              </span>
            ) : (
              confirmLabel || "নিশ্চিত"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default BulkConfirmDialog;