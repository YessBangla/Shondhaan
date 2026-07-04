import { createContext, useContext, useState, type ReactNode } from "react";
import type { MartProduct } from "@/hooks/useMartData";
import { toast } from "sonner";

interface MartCompareContextType {
  compareList: MartProduct[];
  addToCompare: (product: MartProduct) => void;
  removeFromCompare: (id: string) => void;
  clearCompare: () => void;
  isInCompare: (id: string) => boolean;
}

const MartCompareContext = createContext<MartCompareContextType>({
  compareList: [],
  addToCompare: () => {},
  removeFromCompare: () => {},
  clearCompare: () => {},
  isInCompare: () => false,
});

export const useMartCompare = () => useContext(MartCompareContext);

export const MartCompareProvider = ({ children }: { children: ReactNode }) => {
  const [compareList, setCompareList] = useState<MartProduct[]>([]);

  const addToCompare = (product: MartProduct) => {
    if (compareList.length >= 4) {
      toast.error("সর্বোচ্চ ৪টি পণ্য তুলনা করা যায়");
      return;
    }
    if (compareList.some((p) => p.id === product.id)) return;
    setCompareList((prev) => [...prev, product]);
    toast.success("তুলনায় যোগ হয়েছে");
  };

  const removeFromCompare = (id: string) => {
    setCompareList((prev) => prev.filter((p) => p.id !== id));
  };

  const clearCompare = () => setCompareList([]);

  const isInCompare = (id: string) => compareList.some((p) => p.id === id);

  return (
    <MartCompareContext.Provider value={{ compareList, addToCompare, removeFromCompare, clearCompare, isInCompare }}>
      {children}
    </MartCompareContext.Provider>
  );
};
