import { createContext, useContext, useState, type ReactNode } from "react";
import type { CmsService } from "@/hooks/useCmsData";

interface CompareContextType {
  compareList: CmsService[];
  addToCompare: (service: CmsService) => void;
  removeFromCompare: (slug: string) => void;
  clearCompare: () => void;
  isInCompare: (slug: string) => boolean;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const CompareContext = createContext<CompareContextType>({
  compareList: [],
  addToCompare: () => {},
  removeFromCompare: () => {},
  clearCompare: () => {},
  isInCompare: () => false,
  isOpen: false,
  setIsOpen: () => {},
});

export const useCompare = () => useContext(CompareContext);

export const CompareProvider = ({ children }: { children: ReactNode }) => {
  const [compareList, setCompareList] = useState<CmsService[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const addToCompare = (service: CmsService) => {
    if (compareList.length >= 3) return;
    if (compareList.some((s) => s.slug === service.slug)) return;
    setCompareList((prev) => [...prev, service]);
  };

  const removeFromCompare = (slug: string) => {
    setCompareList((prev) => prev.filter((s) => s.slug !== slug));
  };

  const clearCompare = () => setCompareList([]);

  const isInCompare = (slug: string) => compareList.some((s) => s.slug === slug);

  return (
    <CompareContext.Provider value={{ compareList, addToCompare, removeFromCompare, clearCompare, isInCompare, isOpen, setIsOpen }}>
      {children}
    </CompareContext.Provider>
  );
};
