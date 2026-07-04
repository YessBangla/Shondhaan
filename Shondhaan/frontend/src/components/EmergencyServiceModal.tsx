import { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Zap, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { allServices } from "@/data/services";
import { useLocation } from "@/contexts/LocationContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCart } from "@/contexts/CartContext";

const EMERGENCY_SURCHARGE = 1.3; // 30% extra

interface Props {
  open: boolean;
  onClose: () => void;
}

const EmergencyServiceModal = ({ open, onClose }: Props) => {
  const { selectedCity } = useLocation();
  const { t, language } = useLanguage();
  const { addItem } = useCart();
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const bn = language === "bn";

  const cityServices = allServices.filter((s) => s.availableCities.includes(selectedCity));
  const selectedService = cityServices.find((s) => s.slug === selectedSlug);

  const handleAddToCart = (pkg: { name: string; price: number }) => {
    if (!selectedService) return;
    const emergencyPrice = Math.round(pkg.price * EMERGENCY_SURCHARGE);
    addItem({
      serviceSlug: selectedService.slug,
      serviceTitle: `⚡ ${selectedService.title}`,
      serviceImage: selectedService.image,
      packageName: `${pkg.name} (${t("emergency.tag")})`,
      packagePrice: emergencyPrice,
      isEmergency: true,
    });
    toast.success(t("emergency.addedToCart"));
    onClose();
    setSelectedSlug(null);
  };

  const modal = (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[10000] flex items-end md:items-center justify-center bg-foreground/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg max-h-[85vh] overflow-hidden rounded-t-2xl md:rounded-2xl bg-background shadow-2xl border border-border"
          >
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-destructive/10 px-5 py-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive text-destructive-foreground">
                  <Zap className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="font-heading text-base font-bold text-foreground">{t("emergency.title")}</h2>
                  <p className="text-xs text-muted-foreground">{t("emergency.subtitle")}</p>
                </div>
              </div>
              <button onClick={() => { onClose(); setSelectedSlug(null); }} className="rounded-full p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto max-h-[calc(85vh-72px)] p-4">
              {!selectedSlug ? (
                <>
                  <p className="mb-3 text-xs text-muted-foreground">{t("emergency.selectService")}</p>
                  <div className="grid grid-cols-2 gap-3">
                    {cityServices.map((s) => (
                      <button
                        key={s.slug}
                        onClick={() => setSelectedSlug(s.slug)}
                        className="group flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-3 transition-all hover:border-destructive/50 hover:shadow-md"
                      >
                        <img src={s.image} alt={s.title} className="h-16 w-16 rounded-lg object-cover" />
                        <span className="text-xs font-medium text-foreground text-center leading-tight">{s.title}</span>
                        <span className="text-[10px] text-muted-foreground">
                          ৳{Math.round(s.packages[0].price * EMERGENCY_SURCHARGE).toLocaleString("bn-BD")} {t("hero.from")}
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <button onClick={() => setSelectedSlug(null)} className="mb-3 text-xs text-primary hover:underline">
                    ← {t("emergency.backToServices")}
                  </button>
                  <div className="flex items-center gap-3 mb-4">
                    <img src={selectedService!.image} alt={selectedService!.title} className="h-14 w-14 rounded-lg object-cover" />
                    <div>
                      <h3 className="text-sm font-bold text-foreground">{selectedService!.title}</h3>
                      <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive">
                        <Zap className="h-3 w-3" /> {t("emergency.tag")} (+30%)
                      </span>
                    </div>
                  </div>

                  <p className="mb-3 text-xs font-semibold text-foreground">{t("sd.packages")}</p>
                  <div className="space-y-2">
                    {selectedService!.packages.map((pkg) => {
                      const emergencyPrice = Math.round(pkg.price * EMERGENCY_SURCHARGE);
                      return (
                        <div key={pkg.name} className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
                          <div>
                            <p className="text-sm font-medium text-foreground">{pkg.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs line-through text-muted-foreground">
                                ৳{pkg.price.toLocaleString("bn-BD")}
                              </span>
                              <span className="text-sm font-bold text-destructive">
                                ৳{emergencyPrice.toLocaleString("bn-BD")}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleAddToCart(pkg)}
                            className="flex items-center gap-1 rounded-lg bg-destructive px-3 py-2 text-xs font-semibold text-destructive-foreground transition-colors hover:bg-destructive/90"
                          >
                            <ShoppingBag className="h-3.5 w-3.5" />
                            {t("cart.addToCart")}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (typeof document === "undefined") return null;

  return createPortal(modal, document.body);
};

export default EmergencyServiceModal;
