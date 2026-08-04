import { useState } from "react";
import { motion } from "framer-motion";
import {
  Receipt, ShoppingCart, Search, Plus, Minus, Trash2, CreditCard,
  Banknote, Smartphone, QrCode, Printer, Download, BarChart3, Package
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category: string;
}

const sampleProducts = [
  { id: "1", name: "এসি সার্ভিসিং", price: 1500, category: "সেবা" },
  { id: "2", name: "ইলেকট্রিক মেরামত", price: 800, category: "সেবা" },
  { id: "3", name: "প্লাম্বিং", price: 600, category: "সেবা" },
  { id: "4", name: "পেইন্টিং (১ রুম)", price: 3500, category: "সেবা" },
  { id: "5", name: "ক্লিনিং সার্ভিস", price: 1200, category: "সেবা" },
  { id: "6", name: "কম্পিউটার মেরামত", price: 1000, category: "সেবা" },
];

const POSSystem = () => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [discount, setDiscount] = useState(0);
  const [showInvoice, setShowInvoice] = useState(false);
  const [cashDrawerOpen, setCashDrawerOpen] = useState(false);
  const [todaySales, setTodaySales] = useState(12500);
  const [todayTransactions, setTodayTransactions] = useState(8);

  const addToCart = (product: typeof sampleProducts[0]) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(i => i.id === id ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i));
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(i => i.id !== id));
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discountAmount = (subtotal * discount) / 100;
  const vat = (subtotal - discountAmount) * 0.05;
  const total = subtotal - discountAmount + vat;

  const filteredProducts = sampleProducts.filter(p =>
    p.name.includes(searchTerm) || p.category.includes(searchTerm)
  );

  const handleCheckout = () => {
    if (cart.length === 0) return;
    setShowInvoice(true);
    setTodaySales(prev => prev + total);
    setTodayTransactions(prev => prev + 1);
  };

  const handleNewSale = () => {
    setCart([]);
    setCustomerName("");
    setCustomerPhone("");
    setDiscount(0);
    setShowInvoice(false);
    setPaymentMethod("cash");
  };

  const printInvoice = () => {
    const invoiceContent = `
      ========= সন্ধান সার্ভিস =========
      ইনভয়েস নং: INV-${Date.now().toString(36).toUpperCase()}
      তারিখ: ${new Date().toLocaleDateString("bn-BD")}
      গ্রাহক: ${customerName || "ওয়াক-ইন"}
      ফোন: ${customerPhone || "N/A"}
      ─────────────────────────────
      ${cart.map(i => `${i.name} x${i.quantity}  ৳${(i.price * i.quantity).toLocaleString("bn-BD")}`).join("\n      ")}
      ─────────────────────────────
      সাবটোটাল: ৳${subtotal.toLocaleString("bn-BD")}
      ডিসকাউন্ট: -৳${discountAmount.toLocaleString("bn-BD")}
      ভ্যাট (৫%): ৳${Math.round(vat).toLocaleString("bn-BD")}
      মোট: ৳${Math.round(total).toLocaleString("bn-BD")}
      পেমেন্ট: ${paymentMethod === "cash" ? "নগদ" : paymentMethod === "bkash" ? "বিকাশ" : paymentMethod === "card" ? "কার্ড" : "নগদ/রকেট"}
      ========= ধন্যবাদ! =========
    `;
    const blob = new Blob([invoiceContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `invoice-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadCSV = () => {
    const rows = [
      ["পণ্য/সেবা", "দাম", "পরিমাণ", "মোট"],
      ...cart.map(i => [i.name, i.price.toString(), i.quantity.toString(), (i.price * i.quantity).toString()]),
      ["", "", "সাবটোটাল", subtotal.toString()],
      ["", "", "ডিসকাউন্ট", (-discountAmount).toString()],
      ["", "", "ভ্যাট", Math.round(vat).toString()],
      ["", "", "মোট", Math.round(total).toString()],
    ];
    const csv = "\uFEFF" + rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pos-sale-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 space-y-4">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><BarChart3 className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-xl font-bold text-foreground">৳{todaySales.toLocaleString("bn-BD")}</p>
              <p className="text-xs text-muted-foreground">আজকের বিক্রি</p>
            </div>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center"><Receipt className="h-5 w-5 text-green-600" /></div>
            <div>
              <p className="text-xl font-bold text-foreground">{todayTransactions}</p>
              <p className="text-xs text-muted-foreground">ট্রানজেকশন</p>
            </div>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center"><ShoppingCart className="h-5 w-5 text-blue-600" /></div>
            <div>
              <p className="text-xl font-bold text-foreground">{cart.length}</p>
              <p className="text-xs text-muted-foreground">কার্টে আইটেম</p>
            </div>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="rounded-xl border border-border bg-card p-4">
          <button onClick={() => setCashDrawerOpen(!cashDrawerOpen)} className="flex items-center gap-3 w-full text-left">
            <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${cashDrawerOpen ? "bg-green-500/10" : "bg-yellow-500/10"}`}>
              <Banknote className={`h-5 w-5 ${cashDrawerOpen ? "text-green-600" : "text-yellow-600"}`} />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">{cashDrawerOpen ? "ওপেন" : "ক্লোজড"}</p>
              <p className="text-xs text-muted-foreground">ক্যাশ ড্রয়ার</p>
            </div>
          </button>
        </motion.div>
      </div>

      {showInvoice ? (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-lg mx-auto rounded-xl border border-border bg-card p-6 shadow-lg">
          <div className="text-center mb-4">
            <h3 className="font-heading text-lg font-bold text-foreground">ইনভয়েস</h3>
            <p className="text-xs text-muted-foreground">INV-{Date.now().toString(36).toUpperCase()}</p>
            <p className="text-xs text-muted-foreground">{new Date().toLocaleDateString("bn-BD")} {new Date().toLocaleTimeString("bn-BD")}</p>
          </div>
          {customerName && <p className="text-sm text-foreground mb-1">গ্রাহক: {customerName}</p>}
          {customerPhone && <p className="text-sm text-muted-foreground mb-3">ফোন: {customerPhone}</p>}
          <div className="border-t border-b border-border py-3 space-y-2">
            {cart.map(item => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-foreground">{item.name} ×{item.quantity}</span>
                <span className="font-medium text-foreground">৳{(item.price * item.quantity).toLocaleString("bn-BD")}</span>
              </div>
            ))}
          </div>
          <div className="py-3 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">সাবটোটাল</span><span>৳{subtotal.toLocaleString("bn-BD")}</span></div>
            {discount > 0 && <div className="flex justify-between text-green-600"><span>ডিসকাউন্ট ({discount}%)</span><span>-৳{discountAmount.toLocaleString("bn-BD")}</span></div>}
            <div className="flex justify-between"><span className="text-muted-foreground">ভ্যাট (৫%)</span><span>৳{Math.round(vat).toLocaleString("bn-BD")}</span></div>
            <div className="flex justify-between text-lg font-bold border-t border-border pt-2 mt-2">
              <span>মোট</span><span className="text-primary">৳{Math.round(total).toLocaleString("bn-BD")}</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mb-4">পেমেন্ট: {paymentMethod === "cash" ? "নগদ" : paymentMethod === "bkash" ? "বিকাশ" : paymentMethod === "card" ? "কার্ড" : "নগদ/রকেট"}</p>
          <div className="flex gap-2">
            <Button onClick={printInvoice} variant="outline" size="sm" className="flex-1 gap-1.5"><Printer className="h-4 w-4" /> প্রিন্ট</Button>
            <Button onClick={downloadCSV} variant="outline" size="sm" className="flex-1 gap-1.5"><Download className="h-4 w-4" /> CSV</Button>
            <Button onClick={handleNewSale} size="sm" className="flex-1 gap-1.5"><Plus className="h-4 w-4" /> নতুন বিক্রি</Button>
          </div>
        </motion.div>
      ) : (
        <div className="grid md:grid-cols-5 gap-4">
          {/* Products */}
          <div className="md:col-span-3 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="সেবা / পণ্য খুঁজুন..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {filteredProducts.map(p => (
                <button key={p.id} onClick={() => addToCart(p)}
                  className="rounded-xl border border-border bg-card p-3 text-left hover:border-primary/50 hover:shadow-sm transition-all active:scale-[0.97]">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center mb-2"><Package className="h-4 w-4 text-primary" /></div>
                  <p className="text-xs font-medium text-foreground truncate">{p.name}</p>
                  <p className="text-sm font-bold text-primary mt-1">৳{p.price.toLocaleString("bn-BD")}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Cart */}
          <div className="md:col-span-2 rounded-xl border border-border bg-card p-4 space-y-3">
            <h4 className="font-heading text-sm font-bold text-foreground flex items-center gap-2"><ShoppingCart className="h-4 w-4" /> কার্ট</h4>
            <div className="space-y-2">
              <Input placeholder="গ্রাহকের নাম" value={customerName} onChange={e => setCustomerName(e.target.value)} className="text-xs h-9" />
              <Input placeholder="ফোন নম্বর" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="text-xs h-9" />
            </div>
            {cart.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground py-8">কার্ট খালি</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {cart.map(item => (
                  <div key={item.id} className="flex items-center gap-2 rounded-lg bg-secondary/50 p-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{item.name}</p>
                      <p className="text-xs text-primary font-semibold">৳{(item.price * item.quantity).toLocaleString("bn-BD")}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => updateQuantity(item.id, -1)} className="h-6 w-6 rounded bg-background border border-border flex items-center justify-center"><Minus className="h-3 w-3" /></button>
                      <span className="text-xs font-bold w-6 text-center">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, 1)} className="h-6 w-6 rounded bg-background border border-border flex items-center justify-center"><Plus className="h-3 w-3" /></button>
                      <button onClick={() => removeFromCart(item.id)} className="h-6 w-6 rounded bg-destructive/10 flex items-center justify-center ml-1"><Trash2 className="h-3 w-3 text-destructive" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="space-y-1 text-xs border-t border-border pt-3">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">ডিসকাউন্ট %:</span>
                <Input type="number" min={0} max={100} value={discount} onChange={e => setDiscount(Number(e.target.value))} className="h-7 w-20 text-xs" />
              </div>
              <div className="flex justify-between"><span className="text-muted-foreground">সাবটোটাল</span><span>৳{subtotal.toLocaleString("bn-BD")}</span></div>
              {discount > 0 && <div className="flex justify-between text-green-600"><span>ডিসকাউন্ট</span><span>-৳{discountAmount.toLocaleString("bn-BD")}</span></div>}
              <div className="flex justify-between"><span className="text-muted-foreground">ভ্যাট (৫%)</span><span>৳{Math.round(vat).toLocaleString("bn-BD")}</span></div>
              <div className="flex justify-between text-base font-bold border-t border-border pt-2 mt-1">
                <span>মোট</span><span className="text-primary">৳{Math.round(total).toLocaleString("bn-BD")}</span>
              </div>
            </div>
            {/* Payment Methods */}
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { value: "cash", icon: <Banknote className="h-4 w-4" />, label: "নগদ" },
                { value: "bkash", icon: <Smartphone className="h-4 w-4" />, label: "বিকাশ" },
                { value: "card", icon: <CreditCard className="h-4 w-4" />, label: "কার্ড" },
                { value: "qr", icon: <QrCode className="h-4 w-4" />, label: "QR" },
              ].map(pm => (
                <button key={pm.value} onClick={() => setPaymentMethod(pm.value)}
                  className={`rounded-lg border p-2 text-center transition-all ${paymentMethod === pm.value ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>
                  <div className="flex flex-col items-center gap-1">{pm.icon}<span className="text-[10px] font-medium">{pm.label}</span></div>
                </button>
              ))}
            </div>
            <Button onClick={handleCheckout} disabled={cart.length === 0} className="w-full gap-2">
              <Receipt className="h-4 w-4" /> চেকআউট — ৳{Math.round(total).toLocaleString("bn-BD")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default POSSystem;
