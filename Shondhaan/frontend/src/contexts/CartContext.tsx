import { createContext, useContext, useState, type ReactNode } from "react";

export interface CartItem {
  serviceSlug: string;
  serviceTitle: string;
  serviceImage: string;
  packageName: string;
  packagePrice: number;
  originalPrice?: number;
  isEmergency?: boolean;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">) => void;
  removeItem: (serviceSlug: string, packageName: string) => void;
  updateQuantity: (serviceSlug: string, packageName: string, quantity: number) => void;
  clearCart: () => void;
  totalAmount: number;
  totalItems: number;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType>({
  items: [],
  addItem: () => {},
  removeItem: () => {},
  updateQuantity: () => {},
  clearCart: () => {},
  totalAmount: 0,
  totalItems: 0,
  isOpen: false,
  setIsOpen: () => {},
});

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const addItem = (item: Omit<CartItem, "quantity">) => {
    setItems((prev) => {
      const existing = prev.find(
        (i) => i.serviceSlug === item.serviceSlug && i.packageName === item.packageName
      );
      if (existing) return prev;
      return [...prev, { ...item, quantity: 1 }];
    });
    setIsOpen(true);
  };

  const removeItem = (serviceSlug: string, packageName: string) => {
    setItems((prev) =>
      prev.filter((i) => !(i.serviceSlug === serviceSlug && i.packageName === packageName))
    );
  };

  const updateQuantity = (serviceSlug: string, packageName: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(serviceSlug, packageName);
      return;
    }
    setItems((prev) =>
      prev.map((i) =>
        i.serviceSlug === serviceSlug && i.packageName === packageName
          ? { ...i, quantity }
          : i
      )
    );
  };

  const clearCart = () => setItems([]);

  const totalAmount = items.reduce((sum, i) => sum + i.packagePrice * i.quantity, 0);
  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, updateQuantity, clearCart, totalAmount, totalItems, isOpen, setIsOpen }}
    >
      {children}
    </CartContext.Provider>
  );
};
