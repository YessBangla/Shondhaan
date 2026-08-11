import React, { useEffect, useState } from "react";
import { Loader2, Package, X, Sparkles, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  listMartPackages,
  startMartPackageSurjoPayCheckout,
  type MartPackage,
  type SellerProductAllowance,
} from "@/lib/martApi";
import { toast } from "sonner";

interface PackageLimitModalProps {
  open: boolean;
  onClose: () => void;
  sellerId: number | null;
  allowance: SellerProductAllowance | null;
  bn: boolean;
}

const PackageLimitModal: React.FC<PackageLimitModalProps> = ({
  open,
  onClose,
  sellerId,
  allowance,
  bn,
}) => {
  const [packages, setPackages] = useState<MartPackage[]>([]);
  const [loading, setLoading] = useState(false);
  const [purchasingId, setPurchasingId] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    listMartPackages()
      .then(setPackages)
      .catch(() => toast.error(bn ? "প্যাকেজ লোড করা যায়নি" : "Could not load packages"))
      .finally(() => setLoading(false));
  }, [open, bn]);

  if (!open) return null;

  const handlePurchase = async (pkg: MartPackage) => {
    if (!sellerId) {
      toast.error(bn ? "সেলার আইডি পাওয়া যায়নি" : "Seller ID not found");
      return;
    }
    setPurchasingId(pkg.id);
    try {
      const result = await startMartPackageSurjoPayCheckout({ seller_id: sellerId, package_id: pkg.id });
      window.location.assign(result.data.checkout_url);
      return;
      toast.success(
        bn
          ? "রিকোয়েস্ট পাঠানো হয়েছে। অ্যাডমিন অনুমোদনের পর প্যাকেজ সক্রিয় হবে।"
          : "Request sent! Your package will activate once approved."
      );
      onClose();
    } catch (err: any) {
      toast.error(err.message || (bn ? "রিকোয়েস্ট ব্যর্থ" : "Request failed"));
    } finally {
      setPurchasingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="sticky top-0 flex items-center justify-between gap-3 border-b border-slate-100 bg-white px-6 py-4 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">
                {bn ? "একটি প্যাকেজ বেছে নিন" : "Choose a Package"}
              </h2>
              <p className="text-xs text-slate-500">
                {allowance
                  ? bn
                    ? `আপনি ${allowance.productCount} / ${allowance.totalAllowed ?? "∞"} পণ্য ব্যবহার করেছেন`
                    : `You've used ${allowance.productCount} / ${allowance.totalAllowed ?? "∞"} products`
                  : bn
                    ? "আরও পণ্য যোগ করতে একটি প্যাকেজ কিনুন"
                    : "Buy a package to add more products"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="py-16 text-center">
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-emerald-500" />
              <p className="mt-2 text-sm text-slate-400">
                {bn ? "প্যাকেজ লোড হচ্ছে..." : "Loading packages..."}
              </p>
            </div>
          ) : packages.length === 0 ? (
            <div className="py-16 text-center">
              <Package className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-2 text-sm text-slate-400">
                {bn ? "কোনো প্যাকেজ পাওয়া যায়নি" : "No packages available"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {packages.map((pkg) => {
                const isUnlimited = pkg.product_limit === null;
                const isPurchasing = purchasingId === pkg.id;
                return (
                  <div
                    key={pkg.id}
                    className="flex flex-col rounded-2xl border border-slate-100 p-4 hover:border-emerald-200 hover:shadow-sm transition-all"
                  >
                    <p className="text-sm font-bold text-slate-800">
                      {bn ? pkg.name_bn : pkg.name}
                    </p>
                    <p className="mt-1 text-2xl font-extrabold text-emerald-600">
                      ৳{Number(pkg.price).toLocaleString()}
                    </p>
                    <div className="mt-3 space-y-1.5 flex-1">
                      <div className="flex items-center gap-1.5 text-xs text-slate-600">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        {isUnlimited
                          ? bn
                            ? "আনলিমিটেড পণ্য"
                            : "Unlimited products"
                          : bn
                            ? `${pkg.product_limit}টি অতিরিক্ত পণ্য`
                            : `${pkg.product_limit} extra products`}
                      </div>
                      {pkg.duration_days && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-600">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                          {bn ? `${pkg.duration_days} দিন মেয়াদ` : `${pkg.duration_days} days validity`}
                        </div>
                      )}
                      {(bn ? pkg.description_bn : pkg.description) && (
                        <p className="text-[11px] text-slate-400 pt-1">
                          {bn ? pkg.description_bn : pkg.description}
                        </p>
                      )}
                    </div>
                    <Button
                      onClick={() => handlePurchase(pkg)}
                      disabled={isPurchasing}
                      className="mt-4 h-9 gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-sm text-white hover:opacity-90"
                    >
                      {isPurchasing ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : bn ? (
                        "কিনুন"
                      ) : (
                        "Buy Package"
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PackageLimitModal;
