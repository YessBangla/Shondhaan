import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { RotateCcw, ShoppingCart } from "lucide-react";
import { motion } from "framer-motion";

export interface ReorderItem {
  id: string;
  name: string;
  image?: string;
  price: number;
  qty?: number;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  items: ReorderItem[];
  onReorder: (item: ReorderItem) => void;
  onReorderAll?: () => void;
}

const QuickReorderSheet = ({ open, onOpenChange, items, onReorder, onReorderAll }: Props) => {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[80vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-primary" /> দ্রুত পুনরায় অর্ডার
          </SheetTitle>
        </SheetHeader>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            কোনো পূর্বের অর্ডার পাওয়া যায়নি
          </p>
        ) : (
          <>
            <div className="space-y-2 mt-4">
              {items.map((it, i) => (
                <motion.div
                  key={it.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-center gap-3 p-2 rounded-lg border bg-card"
                >
                  {it.image ? (
                    <img src={it.image} alt={it.name} className="w-12 h-12 rounded object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                      <ShoppingCart className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{it.name}</p>
                    <p className="text-xs text-muted-foreground">৳{it.price} {it.qty ? `× ${it.qty}` : ""}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => onReorder(it)} className="gap-1">
                    <RotateCcw className="w-3.5 h-3.5" /> অর্ডার
                  </Button>
                </motion.div>
              ))}
            </div>
            {onReorderAll && (
              <Button onClick={onReorderAll} className="w-full mt-4 gap-2">
                <ShoppingCart className="w-4 h-4" /> সবগুলো একসাথে কার্টে যোগ
              </Button>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default QuickReorderSheet;