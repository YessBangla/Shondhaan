import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Ticket, Copy, Check } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";

export interface WalletCoupon {
  code: string;
  title: string;
  discount: string;
  expiresAt?: string;
  minOrder?: number;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  coupons?: WalletCoupon[];
}

const FALLBACK: WalletCoupon[] = [
  { code: "YESS50", title: "প্রথম অর্ডারে ৫০৳ ছাড়", discount: "৳50", minOrder: 200 },
  { code: "MART10", title: "মার্ট অর্ডারে ১০% ছাড়", discount: "10%", minOrder: 500 },
  { code: "FREESHIP", title: "ফ্রি ডেলিভারি", discount: "Free", minOrder: 300 },
];

const CouponWallet = ({ open, onOpenChange, coupons = FALLBACK }: Props) => {
  const [copied, setCopied] = useState<string | null>(null);

  const onCopy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      haptic("success");
      toast.success(`${code} কপি হয়েছে`);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      toast.error("কপি ব্যর্থ");
    }
  };

  useEffect(() => {
    if (!open) setCopied(null);
  }, [open]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[80vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Ticket className="w-5 h-5 text-primary" /> আমার কুপন ওয়ালেট
          </SheetTitle>
        </SheetHeader>
        <div className="space-y-3 mt-4">
          {coupons.map((c, i) => (
            <motion.div
              key={c.code}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="relative flex items-center gap-3 p-3 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5"
            >
              <div className="w-14 h-14 rounded-lg bg-primary text-white flex flex-col items-center justify-center flex-shrink-0">
                <span className="text-base font-bold leading-none">{c.discount}</span>
                <span className="text-[9px] mt-0.5 opacity-80">OFF</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{c.title}</p>
                <p className="text-xs text-muted-foreground">
                  কোড: <span className="font-mono font-semibold text-foreground">{c.code}</span>
                  {c.minOrder ? ` • সর্বনিম্ন ৳${c.minOrder}` : ""}
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => onCopy(c.code)} className="gap-1">
                {copied === c.code ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied === c.code ? "কপি!" : "কপি"}
              </Button>
            </motion.div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default CouponWallet;