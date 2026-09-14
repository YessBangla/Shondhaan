import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Trash2, Minus, Plus, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useMartCart } from "@/contexts/MartCartContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { haptic } from "@/lib/haptics";

const SwipeRow = ({ children, onDelete }: { children: React.ReactNode; onDelete: () => void }) => {
  const x = useMotionValue(0);
  const bgOpacity = useTransform(x, [-120, -40, 0], [1, 0.4, 0]);
  return (
    <div className="relative overflow-hidden rounded-lg">
      <motion.div
        style={{ opacity: bgOpacity }}
        className="pointer-events-none absolute inset-0 flex items-center justify-end rounded-lg bg-destructive pr-5 text-destructive-foreground"
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

const MartCartSidebar = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const bn = language === "bn";
  const { items, removeItem, updateQuantity, subtotal, totalItems, isOpen, setIsOpen } = useMartCart();
  const isMobile = useIsMobile();

  const body = (
    <>
      {items.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-center">
            <div>
              <ShoppingCart className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">{bn ? "কার্ট খালি" : "Cart is empty"}</p>
            </div>
          </div>
        ) : (
          <>
          <div className="flex-1 overflow-y-auto space-y-3 px-4 py-4">
            {items.map((item) => (
              <SwipeRow key={`${item.product.id}-${item.product.unit || "default"}`} onDelete={() => removeItem(item.product.id, item.product.unit)}>
                <div className="flex gap-3 p-2 rounded-lg border border-border/50 bg-card">
                  <div className="h-14 w-14 rounded-md overflow-hidden bg-muted/30 shrink-0">
                    {item.product.image_url && <img src={item.product.image_url} alt={item.product.name} className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium line-clamp-1">{bn ? item.product.name : (item.product.name_en || item.product.name)}</p>
                    {item.product.unit && <p className="text-[11px] text-muted-foreground">{item.product.unit}</p>}
                    <p className="text-sm font-bold text-primary mt-0.5">৳{item.product.price.toLocaleString("bn-BD")}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => { haptic("selection"); updateQuantity(item.product.id, item.quantity - 1, item.product.unit); }}><Minus className="h-3 w-3" /></Button>
                      <span className="w-6 text-center text-xs font-medium">{item.quantity}</span>
                      <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => { haptic("selection"); updateQuantity(item.product.id, item.quantity + 1, item.product.unit); }}><Plus className="h-3 w-3" /></Button>
                    </div>
                  </div>
                  <div className="flex flex-col items-end justify-between">
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={() => removeItem(item.product.id, item.product.unit)}><X className="h-3 w-3" /></Button>
                    <span className="text-xs font-bold">৳{(item.product.price * item.quantity).toLocaleString("bn-BD")}</span>
                  </div>
                </div>
              </SwipeRow>
            ))}
          </div>

          <div className="border-t border-border px-4 pt-4 pb-[max(5rem,calc(env(safe-area-inset-bottom)+4rem))] space-y-3">
            <div className="flex justify-between font-bold">
              <span>{bn ? "সাবটোটাল" : "Subtotal"}</span>
              <span className="text-primary">৳{subtotal.toLocaleString("bn-BD")}</span>
            </div>
            <Button className="w-full font-bold active:scale-[0.98] text-white hover:bg-emerald-800" onClick={() => { haptic("medium"); setIsOpen(false); navigate("/mart/checkout"); }}>
              {bn ? "চেকআউটে যান" : "Checkout"}
            </Button>
          </div>
          </>
        )}
    </>
  );

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={setIsOpen}>
        <DrawerContent className="max-h-[88vh]">
          <DrawerHeader className="text-left pb-2">
            <DrawerTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-primary" />
              {bn ? "মার্ট কার্ট" : "Mart Cart"} ({totalItems})
            </DrawerTitle>
          </DrawerHeader>
          <div className="flex flex-col flex-1 min-h-0">{body}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent className="w-full sm:w-[400px] flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            {bn ? "মার্ট কার্ট" : "Mart Cart"} ({totalItems})
          </SheetTitle>
        </SheetHeader>
        {body}
      </SheetContent>
    </Sheet>
  );
};

export default MartCartSidebar;
