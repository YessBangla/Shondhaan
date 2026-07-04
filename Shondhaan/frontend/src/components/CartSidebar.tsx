import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useCart } from "@/contexts/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Trash2, ShoppingBag } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { haptic } from "@/lib/haptics";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";

/** Swipe-to-delete row — drag left past threshold to remove. */
const SwipeRow = ({ children, onDelete }: { children: React.ReactNode; onDelete: () => void }) => {
  const x = useMotionValue(0);
  const bgOpacity = useTransform(x, [-120, -40, 0], [1, 0.4, 0]);
  return (
    <div className="relative overflow-hidden rounded-xl">
      <motion.div
        style={{ opacity: bgOpacity }}
        className="pointer-events-none absolute inset-0 flex items-center justify-end rounded-xl bg-destructive pr-5 text-destructive-foreground"
      >
        <Trash2 className="h-5 w-5" />
      </motion.div>
      <motion.div
        drag="x"
        dragConstraints={{ left: -160, right: 0 }}
        dragElastic={0.15}
        style={{ x }}
        onDragEnd={(_, info) => {
          if (info.offset.x < -90) {
            haptic("warning");
            animate(x, -400, { duration: 0.18, onComplete: onDelete });
          } else {
            animate(x, 0, { type: "spring", stiffness: 400, damping: 30 });
          }
        }}
      >
        {children}
      </motion.div>
    </div>
  );
};

const CartSidebar = () => {
  const { items, removeItem, updateQuantity, totalAmount, totalItems, isOpen, setIsOpen, clearCart } = useCart();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const handleCheckout = () => {
    haptic("medium");
    setIsOpen(false);
    navigate("/checkout");
  };

  const body = (
    <>
      {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 px-4">
            <ShoppingBag className="h-12 w-12 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">{t("cart.empty")}</p>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
            >
              {t("cart.continueShopping")}
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {items.map((item) => (
                <SwipeRow
                  key={`${item.serviceSlug}-${item.packageName}`}
                  onDelete={() => removeItem(item.serviceSlug, item.packageName)}
                >
                  <div className="rounded-xl glass-card p-3 space-y-2">
                  <div className="flex gap-3">
                    <img
                      src={item.serviceImage}
                      alt={item.serviceTitle}
                      className="h-14 w-14 rounded-lg object-cover shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-foreground truncate">{item.serviceTitle}</h4>
                      <p className="text-xs text-muted-foreground">{item.packageName}</p>
                      <p className="text-sm font-bold text-primary mt-0.5">
                        ৳{item.packagePrice}
                        {item.originalPrice && (
                          <span className="ml-1.5 text-xs text-muted-foreground line-through font-normal">
                            ৳{item.originalPrice}
                          </span>
                        )}
                      </p>
                    </div>
                    <button
                      onClick={() => { haptic("warning"); removeItem(item.serviceSlug, item.packageName); }}
                      className="self-start p-1 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex items-center justify-end">
                    <span className="text-sm font-bold text-foreground">
                      ৳{item.packagePrice.toLocaleString("bn-BD")}
                    </span>
                  </div>
                  </div>
                </SwipeRow>
              ))}
            </div>

            <div className="border-t border-border px-4 py-4 space-y-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">{t("cart.total")}</span>
                <span className="text-lg font-bold text-foreground">
                  ৳{totalAmount.toLocaleString("bn-BD")}
                </span>
              </div>
              <button
                onClick={handleCheckout}
                className="w-full rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98]"
              >
                {t("cart.checkout")}
              </button>
              <button
                onClick={() => { haptic("warning"); clearCart(); }}
                className="w-full rounded-lg border border-border py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary"
              >
                {t("cart.clear")}
              </button>
            </div>
          </>
        )}
    </>
  );

  // Mobile → native bottom-sheet (drag-to-dismiss). Desktop → side sheet.
  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={setIsOpen}>
        <DrawerContent className="max-h-[88vh] glass-strong !bg-[hsl(var(--glass-bg-strong))]">
          <DrawerHeader className="px-4 pt-2 pb-3 border-b border-border text-left">
            <DrawerTitle className="font-heading flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-primary" />
              {t("cart.title")} ({totalItems})
            </DrawerTitle>
          </DrawerHeader>
          <div className="flex flex-col flex-1 min-h-0">{body}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent side="right" className="flex flex-col w-full sm:max-w-md p-0 glass-strong !bg-[hsl(var(--glass-bg-strong))]">
        <SheetHeader className="px-4 pt-4 pb-3 border-b border-border">
          <SheetTitle className="font-heading flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-primary" />
            {t("cart.title")} ({totalItems})
          </SheetTitle>
        </SheetHeader>
        {body}
      </SheetContent>
    </Sheet>
  );
};

export default CartSidebar;
