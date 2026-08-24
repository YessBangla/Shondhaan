import { useMemo, useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ShoppingCart, Trash2, Minus, Plus, MapPin, CreditCard, Banknote, Truck, ArrowLeft, CheckCircle2, Tag, X, Navigation, Loader2, Calendar, Home, Briefcase, Plus as PlusIcon, Star, Edit2, Check, Wallet } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useMartCart } from "@/contexts/MartCartContext";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { divisions } from "@/data/locations";
import { addDays, format } from "date-fns";
import { bn as bnLocale } from "date-fns/locale";
import { validateMartCoupon } from "@/lib/martApi";

const SHIPPING_FEE = 60;
const FREE_SHIPPING_MIN = 500;
const COURIER_FEE_MIN = 45;
const COURIER_FEE_MAX = 70;
const COD_SURCHARGE = 10;
const DELIVERY_DAYS_MIN = 3;
const DELIVERY_DAYS_MAX = 5;

interface SavedAddress {
  id: string;
  label: string;
  name: string;
  phone: string;
  division: string;
  district: string;
  thana: string;
  address: string;
  is_default: boolean;
}

const decodeGatewayPayload = (encoded: string) => {
  try {
    const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const binary = window.atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch (error) {
    console.error("Could not decode SSLCommerz return payload", error);
    return null;
  }
};

const MartCheckout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { language } = useLanguage();
  const bn = language === "bn";
  const { user } = useAuth();
  const { items, removeItem, updateQuantity, clearCart, subtotal, totalItems } = useMartCart();
  const apiBase = import.meta.env.VITE_MART_API_BASE_URL || import.meta.env.VITE_API_BASE || "http://localhost:8081";

  const [step, setStep] = useState<"cart" | "shipping" | "success">("cart");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [division, setDivision] = useState("");
  const [district, setDistrict] = useState("");
  const [thana, setThana] = useState("");
  const [notes, setNotes] = useState("");
  const [detectingGps, setDetectingGps] = useState(false);

  // Saved addresses
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [addressesLoaded, setAddressesLoaded] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showNewAddress, setShowNewAddress] = useState(true);
  const [saveAddress, setSaveAddress] = useState(false);
  const [addressLabel, setAddressLabel] = useState("Home");

  // Load saved addresses
  useEffect(() => {
    if (!user) return;
    fetch(`${apiBase}/api/shipping-addresses?user_id=${encodeURIComponent(user.id)}`)
      .then((resp) => resp.json().then((result) => ({ resp, result })))
      .then(({ resp, result }) => {
        if (!resp.ok || !result.success) throw new Error(result.message || "Failed to load addresses");
        const data = result.data as SavedAddress[];
        if (data && data.length > 0) {
          const addresses = data as SavedAddress[];
          setSavedAddresses(addresses);
          const defaultAddr = addresses.find((a) => a.is_default) || addresses[0];
          if (defaultAddr) {
            setSelectedAddressId(defaultAddr.id);
            applyAddress(defaultAddr);
          }
        } else {
          setShowNewAddress(true);
          // No saved addresses — auto-fill name & phone from user object
          const userName = (user as any).name || (user as any).display_name || "";
          const userPhone = (user as any).mobile || (user as any).phone || "";
          if (userName) setName(userName);
          if (userPhone) setPhone(userPhone);
        }
        setAddressesLoaded(true);
      })
      .catch((error) => {
        setShowNewAddress(true);
        setAddressesLoaded(true);
        toast.error(error?.message || "Failed to load addresses");
      });
  }, [apiBase, user]);

  const applyAddress = (addr: SavedAddress) => {
    setName(addr.name);
    setPhone(addr.phone);
    setDivision(addr.division || "");
    setDistrict(addr.district || "");
    setThana(addr.thana || "");
    setAddress(addr.address);
  };

  const handleGpsDetect = async () => {
    if (!navigator.geolocation) { toast.error(bn ? "GPS সাপোর্ট নেই" : "GPS not supported"); return; }
    setDetectingGps(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json&accept-language=bn`);
          const data = await res.json();
          const addr = data.address || {};
          const matchDiv = divisions.find((d) =>
            addr.state?.includes(d.nameBn) || addr.state?.toLowerCase().includes(d.name.toLowerCase())
          );
          if (matchDiv) {
            setDivision(matchDiv.nameBn);
            const matchDist = matchDiv.districts.find((dt) =>
              addr.county?.includes(dt.nameBn) || addr.city?.includes(dt.nameBn) ||
              addr.town?.includes(dt.nameBn) || addr.county?.toLowerCase().includes(dt.name.toLowerCase()) ||
              addr.city?.toLowerCase().includes(dt.name.toLowerCase())
            );
            if (matchDist) {
              setDistrict(matchDist.nameBn);
              const matchThana = matchDist.thanas?.find((t) =>
                addr.suburb?.includes(t) || addr.neighbourhood?.includes(t) ||
                addr.city_district?.includes(t) || addr.town?.includes(t)
              );
              if (matchThana) setThana(matchThana);
            }
          }
          const parts = [addr.road, addr.neighbourhood, addr.suburb].filter(Boolean);
          if (parts.length) setAddress(parts.join(", "));
          toast.success(bn ? "লোকেশন শনাক্ত হয়েছে" : "Location detected");
        } catch { toast.error(bn ? "লোকেশন শনাক্ত ব্যর্থ" : "Detection failed"); }
        setDetectingGps(false);
      },
      () => { toast.error(bn ? "GPS অনুমতি দিন" : "Allow GPS permission"); setDetectingGps(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [sslCommerzReady, setSslCommerzReady] = useState(false);
  const [sslCommerzChecked, setSslCommerzChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [paymentDialog, setPaymentDialog] = useState<{
    open: boolean;
    type: "cod" | "wallet" | "online_success" | "ssl_redirect" | "ssl_success" | "ssl_failed" | "ssl_cancelled";
    orderId?: string | number | null;
    gatewayPayload?: Record<string, unknown> | null;
  }>({ open: false, type: "cod", orderId: null });
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discount: number;
    eligibleSubtotal: number;
    shopName?: string | null;
  } | null>(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetch(`${apiBase}/api/orders/sslcommerz/status`)
      .then((resp) => resp.json().then((result) => ({ resp, result })))
      .then(({ resp, result }) => {
        const configured = Boolean(resp.ok && result.success && result.configured);
        if (!cancelled) {
          setSslCommerzReady(configured);
          setSslCommerzChecked(true);
          if (!configured && paymentMethod === "sslcommerz") setPaymentMethod("cod");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSslCommerzReady(false);
          setSslCommerzChecked(true);
          if (paymentMethod === "sslcommerz") setPaymentMethod("cod");
        }
      });

    return () => { cancelled = true; };
  }, [apiBase, paymentMethod]);

  const handlePaymentMethodChange = (value: string) => {
    if (value === "sslcommerz" && sslCommerzChecked && !sslCommerzReady) {
      toast.error("SSLCommerz is not configured yet. Please choose Cash on Delivery.");
      return;
    }
    setPaymentMethod(value);
  };

  const couponItems = useMemo(
    () =>
      items.map((item) => ({
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: item.product.price,
        seller_id: item.product.seller_id ?? null,
      })),
    [items]
  );

  const couponCartSignature = useMemo(
    () => couponItems.map((item) => `${item.product_id}:${item.quantity}`).join("|"),
    [couponItems]
  );

  const shipping = subtotal >= FREE_SHIPPING_MIN ? 0 : SHIPPING_FEE;
  const courierFee = items.reduce((sum, item) => {
    const fee = Math.min(COURIER_FEE_MAX, Math.max(COURIER_FEE_MIN, Math.round(item.product.price * 0.05)));
    return sum + fee * item.quantity;
  }, 0);
  const codFee = paymentMethod === "cod" ? COD_SURCHARGE : 0;
  const discount = appliedCoupon?.discount || 0;
  const total = subtotal + shipping + courierFee + codFee - discount;

  useEffect(() => {
    if (appliedCoupon) setAppliedCoupon(null);
  }, [couponCartSignature]);

  // Estimated delivery dates
  const estimatedMin = addDays(new Date(), DELIVERY_DAYS_MIN);
  const estimatedMax = addDays(new Date(), DELIVERY_DAYS_MAX);
  const deliveryDateText = bn
    ? `${format(estimatedMin, "d MMM", { locale: bnLocale })} - ${format(estimatedMax, "d MMM", { locale: bnLocale })}`
    : `${format(estimatedMin, "MMM d")} - ${format(estimatedMax, "MMM d")}`;

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const payment = params.get("payment");
    const orderId = params.get("order_id");
    const gatewayPayload = params.get("gateway_payload");
    if (!payment) return;
    const decodedGatewayPayload = gatewayPayload ? decodeGatewayPayload(gatewayPayload) : null;

    if (decodedGatewayPayload) {
      console.log("SSLCommerz return payload", decodedGatewayPayload);
    }

    if (payment === "success") {
      clearCart();
      setStep("success");
      setPaymentDialog({ open: true, type: "ssl_success", orderId, gatewayPayload: decodedGatewayPayload });
      toast.success("Payment successful");
    } else if (payment === "cancel" || payment === "cancelled") {
      setPaymentDialog({ open: true, type: "ssl_cancelled", orderId, gatewayPayload: decodedGatewayPayload });
      toast.error("Payment cancelled");
    } else if (payment === "failed" || payment === "fail") {
      setPaymentDialog({ open: true, type: "ssl_failed", orderId, gatewayPayload: decodedGatewayPayload });
      toast.error("Payment failed");
    }

    navigate("/mart/checkout", { replace: true });
  }, [clearCart, location.search, navigate]);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setApplyingCoupon(true);
    try {
      const data = await validateMartCoupon(couponCode.trim().toUpperCase(), subtotal, couponItems);
      const discountAmt = Number(data.discount_amount || 0);
      const eligibleSubtotal = Number(data.eligible_subtotal || 0);

      if (discountAmt <= 0) {
        throw new Error("This coupon has no eligible discount for your cart");
      }

      setAppliedCoupon({
        code: data.code,
        discount: discountAmt,
        eligibleSubtotal,
        shopName: data.shop_name || data.seller_name || null,
      });
      toast.success(`BDT ${discountAmt} discount applied!`);
    } catch (error: any) {
      toast.error(error?.message || "Failed to verify coupon");
    }
    setApplyingCoupon(false);
  };
  const handleSaveAddress = async () => {
    if (!user || !name || !phone || !address) return;
    const resp = await fetch(`${apiBase}/api/shipping-addresses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: user.id,
        label: addressLabel,
        name,
        phone,
        division,
        district,
        thana,
        address,
        is_default: savedAddresses.length === 0,
      }),
    });
    const result = await resp.json();
    if (!resp.ok || !result.success) throw new Error(result.message || "Failed to save address");
    if (result.data) {
      const newAddr = result.data as SavedAddress;
      setSavedAddresses((prev) => [...prev, newAddr]);
      setSelectedAddressId(newAddr.id);
      setShowNewAddress(false);
      toast.success(bn ? "ঠিকানা সংরক্ষিত" : "Address saved");
    }
  };

  const handleDeleteAddress = async (id: string) => {
    if (!user) return;
    try {
      const resp = await fetch(`${apiBase}/api/shipping-addresses/${id}?user_id=${encodeURIComponent(user.id)}`, {
        method: "DELETE",
      });
      const result = await resp.json();
      if (!resp.ok || !result.success) throw new Error(result.message || "Failed to delete address");
      const remaining = savedAddresses.filter((a) => a.id !== id);
      setSavedAddresses(remaining);
      if (selectedAddressId === id) {
        if (remaining.length > 0) {
          setSelectedAddressId(remaining[0].id);
          applyAddress(remaining[0]);
        } else {
          setSelectedAddressId(null);
          setShowNewAddress(true);
        }
      }
      toast.success(bn ? "ঠিকানা মুছে ফেলা হয়েছে" : "Address deleted");
    } catch (error: any) {
      toast.error(error?.message || "Failed to delete address");
    }
  };

  const handleSetDefault = async (id: string) => {
    if (!user) return;
    try {
      const resp = await fetch(`${apiBase}/api/shipping-addresses/${id}/default`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id }),
      });
      const result = await resp.json();
      if (!resp.ok || !result.success) throw new Error(result.message || "Failed to set default address");
      setSavedAddresses((prev) => prev.map((a) => ({ ...a, is_default: a.id === id })));
    toast.success(bn ? "ডিফল্ট ঠিকানা সেট হয়েছে" : "Default address set");
    } catch (error: any) {
      toast.error(error?.message || "Failed to set default address");
    }
  };

  const handlePlaceOrder = async () => {
    if (!user) { toast.error(bn ? "লগইন করুন" : "Please login"); navigate("/auth"); return; }
    if (!name || !phone || !address) { toast.error(bn ? "সব তথ্য পূরণ করুন" : "Fill all fields"); return; }
    if (paymentMethod === "sslcommerz" && sslCommerzChecked && !sslCommerzReady) {
      toast.error("SSLCommerz is not configured yet. Please choose Cash on Delivery.");
      return;
    }
    setSubmitting(true);
    try {
      const estDate = format(estimatedMax, "yyyy-MM-dd");
      const payload = {
        user_id: user.id,
        subtotal,
        shipping_fee: shipping,
        courier_fee: courierFee,
        cod_fee: codFee,
        discount,
        total,
        coupon_code: appliedCoupon?.code || null,
        payment_method: paymentMethod,
        payment_status: paymentMethod === "sslcommerz" || paymentMethod === "cod" ? "unpaid" : undefined,
        customer_name: name,
        customer_phone: phone,
        shipping_address: `${address}${thana ? `, ${thana}` : ""}${district ? `, ${district}` : ""}${division ? `, ${division}` : ""}`,
        shipping_division: division,
        shipping_district: district,
        shipping_thana: thana,
        notes,
        estimated_delivery_date: estDate,
        items: items.map((item) => ({
          product_id: item.product.id,
          product_name: item.product.name,
          product_image: item.product.image_url,
          quantity: item.quantity,
          unit_price: item.product.price,
          total_price: item.product.price * item.quantity,
          vendor_id: item.product.vendor_id ?? item.product.seller_id ?? null,
        })),
        save_address: !!(saveAddress && showNewAddress),
        address_label: addressLabel,
      };

      const resp = await fetch(`${apiBase}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await resp.json();
      if (!resp.ok || !result.success) throw new Error(result.message || "Order API failed");

      if (paymentMethod === "sslcommerz") {
        const paymentResp = await fetch(`${apiBase}/api/orders/${result.order_id}/sslcommerz/init`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customer_email: (user as any)?.email || "customer@yessmart.local",
          }),
        });
        const paymentResult = await paymentResp.json();
        if (!paymentResp.ok || !paymentResult.success || !paymentResult.gateway_url) {
          throw new Error(paymentResult.message || "Could not open SSLCommerz payment");
        }

        setPaymentDialog({ open: true, type: "ssl_redirect", orderId: result.order_id });
        toast.success(bn ? "পেমেন্ট পেজ খোলা হচ্ছে..." : "Opening payment page...");
        window.setTimeout(() => {
          window.location.assign(paymentResult.gateway_url);
        }, 800);
        return;
      }

      clearCart();
      setStep("success");
      setPaymentDialog({
        open: true,
        type: paymentMethod === "wallet" ? "wallet" : paymentMethod === "cod" ? "cod" : "online_success",
        orderId: result.order_id,
      });
      toast.success(bn ? "অর্ডার সফল!" : "Order placed!");
    } catch (err: any) {
      console.error(err);
      toast.error(bn ? "অর্ডার ব্যর্থ" : "Order failed");
    } finally { setSubmitting(false); }
  };

  const paymentDialogCopy = {
    cod: {
      title: "Order placed",
      description: "Cash on Delivery selected. Your order is confirmed and payment will be collected on delivery.",
      tone: "success",
    },
    wallet: {
      title: "Wallet payment successful",
      description: "Your order is confirmed and its total has been deducted from your Shondhaan wallet.",
      tone: "success",
    },
    online_success: {
      title: "Order placed",
      description: "Your order is confirmed with the selected payment method.",
      tone: "success",
    },
    ssl_redirect: {
      title: "Opening SSLCommerz",
      description: "Your order is created. The SSLCommerz payment gateway will open now.",
      tone: "info",
    },
    ssl_success: {
      title: "Payment successful",
      description: "Your SSLCommerz payment is complete and the order payment status is updated.",
      tone: "success",
    },
    ssl_failed: {
      title: "Payment failed",
      description: "The SSLCommerz payment was not completed. You can view the order and try again from your orders page.",
      tone: "error",
    },
    ssl_cancelled: {
      title: "Payment cancelled",
      description: "The SSLCommerz payment was cancelled. You can view the order and choose what to do next.",
      tone: "error",
    },
  }[paymentDialog.type];

  const paymentDialogIconClass =
    paymentDialogCopy.tone === "success"
      ? "bg-green-100 text-green-600 dark:bg-green-950/40"
      : paymentDialogCopy.tone === "error"
        ? "bg-red-100 text-red-600 dark:bg-red-950/40"
        : "bg-blue-100 text-blue-600 dark:bg-blue-950/40";

  const renderPaymentDialog = () => (
    <Dialog open={paymentDialog.open} onOpenChange={(open) => setPaymentDialog((prev) => ({ ...prev, open }))}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center sm:text-center">
          <div className={`mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full ${paymentDialogIconClass}`}>
            {paymentDialogCopy.tone === "success" ? <CheckCircle2 className="h-7 w-7" /> : <CreditCard className="h-7 w-7" />}
          </div>
          <DialogTitle>{paymentDialogCopy.title}</DialogTitle>
          <DialogDescription>{paymentDialogCopy.description}</DialogDescription>
        </DialogHeader>
        {paymentDialog.orderId && (
          <p className="text-center text-xs text-muted-foreground">Order #{paymentDialog.orderId}</p>
        )}
        {paymentDialog.gatewayPayload && (
          <div className="max-h-56 overflow-auto rounded-md border bg-muted/40 p-3 text-left">
            <p className="mb-2 text-xs font-semibold text-muted-foreground">SSLCommerz return payload</p>
            <pre className="whitespace-pre-wrap break-words text-xs">
              {JSON.stringify(paymentDialog.gatewayPayload, null, 2)}
            </pre>
          </div>
        )}
        <DialogFooter className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Button variant="outline" onClick={() => navigate("/mart/orders")}>
            Go Back
          </Button>
          <Button onClick={() => navigate("/mart/orders")}>
            View Order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  if (step === "success") {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-[44px] md:pt-[104px]" />
        <div className="max-w-lg mx-auto px-4 py-20 text-center">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", damping: 15 }}>
            <CheckCircle2 className="h-20 w-20 text-green-500 mx-auto mb-6" />
          </motion.div>
          <h1 className="text-2xl font-bold mb-2">{bn ? "অর্ডার সফল!" : "Order Placed!"}</h1>
          <p className="text-muted-foreground mb-2">{bn ? "আনুমানিক ডেলিভারি:" : "Estimated delivery:"}</p>
          <p className="text-lg font-bold text-primary mb-6">{deliveryDateText}</p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => navigate("/mart/home")}>{bn ? "শপিং চালান" : "Continue Shopping"}</Button>
            <Button variant="outline" onClick={() => navigate("/mart/orders")}>{bn ? "অর্ডার দেখুন" : "View Orders"}</Button>
          </div>
        </div>
        {renderPaymentDialog()}
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-[100px] md:pt-[40px]" />
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Steps indicator */}
        <div className="flex items-center justify-center gap-2 mb-6 text-white">
          {[
            { key: "cart", label: bn ? "কার্ট" : "Cart" },
            { key: "shipping", label: bn ? "শিপিং" : "Shipping" },
          ].map((s, i) => (
            <div key={s.key} className="flex items-center gap-2">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold ${step === s.key || (step === "shipping" && i === 0) ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>
                {i + 1}
              </div>
              <span className={`text-sm font-medium ${step === s.key ? "text-foreground" : "text-muted-foreground"}`}>{s.label}</span>
              {i < 1 && <div className="w-12 h-0.5 bg-border mx-1" />}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 mb-4">
          <Button variant="ghost" size="icon" onClick={() => step === "shipping" ? setStep("cart") : navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">{step === "cart" ? (bn ? "কার্ট" : "Cart") : (bn ? "শিপিং ও পেমেন্ট" : "Shipping & Payment")}</h1>
        </div>

        {items.length === 0 && step === "cart" ? (
          <div className="text-center py-20">
            <ShoppingCart className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-lg font-medium text-muted-foreground">{bn ? "কার্ট খালি" : "Cart is empty"}</p>
            <Button className="mt-4" onClick={() => navigate("/mart/home")}>{bn ? "শপিং শুরু" : "Start Shopping"}</Button>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-4">
              {step === "cart" ? (
                <>
                  {items.map((item) => {
                    const itemCourier = Math.min(COURIER_FEE_MAX, Math.max(COURIER_FEE_MIN, Math.round(item.product.price * 0.05)));
                    return (
                      <div key={item.product.id} className="flex gap-3 bg-card rounded-xl border border-border/50 p-3">
                        <div className="h-20 w-20 rounded-lg overflow-hidden bg-muted/30 shrink-0 cursor-pointer" onClick={() => navigate(`/mart/product/${item.product.slug}`)}>
                          {item.product.image_url && <img src={item.product.image_url} alt={item.product.name} className="w-full h-full object-cover" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-medium line-clamp-2">{bn ? item.product.name : (item.product.name_en || item.product.name)}</h3>
                          <p className="text-primary font-bold mt-1">৳{item.product.price.toLocaleString("bn-BD")}</p>
                          <p className="text-[10px] text-muted-foreground">{bn ? `কুরিয়ার: ৳${itemCourier}` : `Courier: ৳${itemCourier}`}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex items-center border border-border rounded">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.product.id, item.quantity - 1)}><Minus className="h-3 w-3" /></Button>
                              <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.product.id, item.quantity + 1)}><Plus className="h-3 w-3" /></Button>
                            </div>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeItem(item.product.id)}><Trash2 className="h-3 w-3" /></Button>
                          </div>
                        </div>
                        <p className="text-sm font-bold shrink-0">৳{(item.product.price * item.quantity).toLocaleString("bn-BD")}</p>
                      </div>
                    );
                  })}

                  {/* Estimated Delivery */}
                  <div className="bg-green-50 dark:bg-green-950/20 rounded-xl border border-green-200 dark:border-green-800 p-4 flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-green-600 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-green-700 dark:text-green-400">{bn ? "আনুমানিক ডেলিভারি" : "Estimated Delivery"}</p>
                      <p className="text-sm text-green-600 dark:text-green-500 font-bold">{deliveryDateText}</p>
                    </div>
                  </div>

                  {/* Coupon */}
                  <div className="bg-card rounded-xl border border-border/50 p-4">
                    <h3 className="text-sm font-semibold flex items-center gap-1.5 mb-3"><Tag className="h-4 w-4 text-primary" /> {bn ? "কুপন / ভাউচার" : "Apply Coupon"}</h3>
                    {appliedCoupon ? (
                      <div className="flex items-center justify-between bg-green-50 dark:bg-green-950/20 p-3 rounded-lg">
                        <div>
                          <span className="font-mono font-bold text-green-700 dark:text-green-400">{appliedCoupon.code}</span>
                          <p className="text-[11px] text-green-700/80 dark:text-green-400/80 mt-0.5">
                            {appliedCoupon.shopName
                              ? `${bn ? "শুধু এই শপের পণ্যে" : "Only for"} ${appliedCoupon.shopName}`
                              : bn ? "যোগ্য পণ্যে প্রযোজ্য" : "Eligible items only"}
                            {" · "}
                            ৳{appliedCoupon.eligibleSubtotal.toLocaleString("bn-BD")}
                          </p>
                          <p className="text-xs text-green-600 dark:text-green-500 mt-0.5">-৳{appliedCoupon.discount.toLocaleString("bn-BD")} {bn ? "ছাড়" : "discount"}</p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setAppliedCoupon(null)}><X className="h-4 w-4" /></Button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Input value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} placeholder={bn ? "কুপন কোড লিখুন" : "Enter coupon code"} className="font-mono" />
                        <Button variant="outline" onClick={handleApplyCoupon} disabled={applyingCoupon}>{applyingCoupon ? "..." : (bn ? "যোগ" : "Apply")}</Button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  {/* Saved Addresses */}
                  {savedAddresses.length > 0 && (
                    <div className="bg-card rounded-xl border border-border/50 p-4 space-y-3">
                      <h2 className="font-bold flex items-center gap-2 text-sm"><MapPin className="h-4 w-4 text-primary" /> {bn ? "সংরক্ষিত ঠিকানা" : "Saved Addresses"}</h2>
                      <div className="space-y-2">
                        {savedAddresses.map((addr) => (
                          <div
                            key={addr.id}
                            onClick={() => { setSelectedAddressId(addr.id); applyAddress(addr); }}
                            className={`relative w-full text-left p-3 rounded-lg border-2 transition-colors cursor-pointer ${selectedAddressId === addr.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              {addr.label === "Home" ? <Home className="h-3.5 w-3.5 text-primary" /> : addr.label === "Office" ? <Briefcase className="h-3.5 w-3.5 text-primary" /> : <MapPin className="h-3.5 w-3.5 text-primary" />}
                              <span className="text-xs font-bold uppercase text-primary">{addr.label === "Home" ? (bn ? "বাসা" : "Home") : addr.label === "Office" ? (bn ? "অফিস" : "Office") : (bn ? "অন্যান্য" : "Other")}</span>
                              {addr.is_default && <Badge variant="secondary" className="text-[9px] px-1.5 py-0">{bn ? "ডিফল্ট" : "Default"}</Badge>}
                              {selectedAddressId === addr.id && <Check className="h-4 w-4 text-primary ml-auto" />}
                            </div>
                            <p className="text-sm font-medium">{addr.name} · {addr.phone}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{addr.address}{addr.thana ? `, ${addr.thana}` : ""}{addr.district ? `, ${addr.district}` : ""}{addr.division ? `, ${addr.division}` : ""}</p>
                            <div className="flex gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
                              {!addr.is_default && (
                                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground hover:text-primary" onClick={() => handleSetDefault(addr.id)}>
                                  <Star className="h-3 w-3" /> {bn ? "ডিফল্ট করুন" : "Set Default"}
                                </Button>
                              )}
                              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-destructive hover:text-destructive" onClick={() => handleDeleteAddress(addr.id)}>
                                <Trash2 className="h-3 w-3" /> {bn ? "মুছুন" : "Delete"}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <Button variant="outline" size="sm" className="w-full gap-1.5" onClick={() => setShowNewAddress(true)}>
                        <PlusIcon className="h-3.5 w-3.5" /> {bn ? "নতুন ঠিকানা যোগ" : "Add New Address"}
                      </Button>
                    </div>
                  )}

                  {/* New Address Form */}
                  {(showNewAddress || savedAddresses.length === 0) && (
                    <div className="bg-card rounded-xl border border-border/50 p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <h2 className="font-bold flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /> {bn ? "শিপিং তথ্য" : "Shipping Info"}</h2>
                        <div className="flex gap-2">
                          {savedAddresses.length > 0 && (
                            <Button variant="ghost" size="sm" onClick={() => { setShowNewAddress(false); if (selectedAddressId) { const a = savedAddresses.find(x => x.id === selectedAddressId); if (a) applyAddress(a); } }}>
                              {bn ? "বাতিল" : "Cancel"}
                            </Button>
                          )}
                          <Button type="button" variant="outline" size="sm" onClick={handleGpsDetect} disabled={detectingGps} className="text-xs gap-1.5">
                            {detectingGps ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Navigation className="h-3.5 w-3.5" />}
                            {bn ? "📍 অটো-ডিটেক্ট" : "📍 Auto-detect"}
                          </Button>
                        </div>
                      </div>

                      {/* Address label */}
                      <div className="flex gap-2">
                        {["Home", "Office", "Other"].map((l) => (
                          <button key={l} onClick={() => setAddressLabel(l)} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${addressLabel === l ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>                     {l === "Home" ? (bn ? "বাসা" : "Home") : l === "Office" ? (bn ? "অফিস" : "Office") : (bn ? "অন্যান্য" : "Other")}
                          </button>
                        ))}
                      </div>

                      <div className="grid sm:grid-cols-2 gap-3">
                        <div><Label>{bn ? "নাম" : "Name"} *</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
                        <div><Label>{bn ? "ফোন" : "Phone"} *</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
                        <div>
                          <Label>{bn ? "বিভাগ" : "Division"} *</Label>
                          <Select value={division} onValueChange={(v) => { setDivision(v); setDistrict(""); setThana(""); }}>
                            <SelectTrigger><SelectValue placeholder={bn ? "বিভাগ নির্বাচন" : "Select division"} /></SelectTrigger>
                            <SelectContent>
                              {divisions.map((d) => (
                                <SelectItem key={d.name} value={d.nameBn}>{bn ? d.nameBn : d.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>{bn ? "জেলা" : "District"} *</Label>
                          <Select value={district} onValueChange={(v) => { setDistrict(v); setThana(""); }} disabled={!division}>
                            <SelectTrigger><SelectValue placeholder={bn ? "জেলা নির্বাচন" : "Select district"} /></SelectTrigger>
                            <SelectContent>
                              {(divisions.find((d) => d.nameBn === division)?.districts || []).map((d) => (
                                <SelectItem key={d.name} value={d.nameBn}>{bn ? d.nameBn : d.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="sm:col-span-2">
                          <Label>{bn ? "থানা" : "Thana"}</Label>
                          <Select value={thana} onValueChange={setThana} disabled={!district}>
                            <SelectTrigger><SelectValue placeholder={bn ? "থানা নির্বাচন" : "Select thana"} /></SelectTrigger>
                            <SelectContent>
                              {(divisions.find((d) => d.nameBn === division)?.districts.find((dt) => dt.nameBn === district)?.thanas || []).map((t) => (
                                <SelectItem key={t} value={t}>{t}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div><Label>{bn ? "সম্পূর্ণ ঠিকানা" : "Full Address"} *</Label><Textarea value={address} onChange={(e) => setAddress(e.target.value)} /></div>

                      {/* Save address checkbox */}
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} className="rounded border-border" />
                        <span className="text-sm text-muted-foreground">{bn ? "এই ঠিকানা সংরক্ষণ করুন" : "Save this address for later"}</span>
                      </label>
                    </div>
                  )}

                  <div><Label>{bn ? "নোট" : "Notes"}</Label><Input value={notes} onChange={(e) => setNotes(e.target.value)} className="bg-card" /></div>

                  {/* Estimated Delivery in shipping step too */}
                  <div className="bg-green-50 dark:bg-green-950/20 rounded-xl border border-green-200 dark:border-green-800 p-4 flex items-center gap-3">
                    <Truck className="h-5 w-5 text-green-600 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-green-700 dark:text-green-400">{bn ? "আনুমানিক ডেলিভারি" : "Estimated Delivery"}</p>
                      <p className="text-sm text-green-600 dark:text-green-500 font-bold">{deliveryDateText}</p>
                    </div>
                  </div>

                  {/* Payment */}
                  <div className="bg-card rounded-xl border border-border/50 p-5 space-y-3">
                    <Separator />
                    <h2 className="font-bold flex items-center gap-2"><CreditCard className="h-4 w-4 text-primary" /> {bn ? "পেমেন্ট" : "Payment"}</h2>
                    <RadioGroup value={paymentMethod} onValueChange={handlePaymentMethodChange} className="space-y-2">
                      <label className="flex items-center gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-muted/50">
                        <RadioGroupItem value="wallet" />
                        <Wallet className="h-5 w-5 text-emerald-600" />
                        <div>
                          <p className="font-medium text-sm">{bn ? "Shondhaan ওয়ালেট" : "Shondhaan Wallet"}</p>
                          <p className="text-xs text-muted-foreground">{bn ? "ওয়ালেট ব্যালেন্স থেকে এখনই পেমেন্ট করুন" : "Pay now from your wallet balance"}</p>
                        </div>
                      </label>
                      <label className="flex items-center gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-muted/50">
                        <RadioGroupItem value="bkash" disabled />
                        <div className="h-5 w-5 rounded-full bg-pink-600 flex items-center justify-center text-[9px] font-bold text-white">b</div>
                        <div><p className="font-medium text-sm">{bn ? "বিকাশ" : "bKash"}</p><p className="text-xs text-muted-foreground">{bn ? "বিকাশ পেমেন্ট" : "Pay via bKash"}</p></div>
                      </label>
                      <label className="flex items-center gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-muted/50">
                        <RadioGroupItem value="nagad" disabled />
                        <div className="h-5 w-5 rounded-full bg-orange-500 flex items-center justify-center text-[9px] font-bold text-white">N</div>
                        <div><p className="font-medium text-sm">{bn ? "নগদ" : "Nagad"}</p><p className="text-xs text-muted-foreground">{bn ? "নগদ পেমেন্ট" : "Pay via Nagad"}</p></div>
                      </label>
                      <label className="flex items-center gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-muted/50">
                        <RadioGroupItem value="rocket" disabled />
                        <div className="h-5 w-5 rounded-full bg-purple-600 flex items-center justify-center text-[9px] font-bold text-white">R</div>
                        <div><p className="font-medium text-sm">{bn ? "রকেট" : "Rocket"}</p><p className="text-xs text-muted-foreground">{bn ? "রকেট পেমেন্ট" : "Pay via Rocket"}</p></div>
                      </label>
                      <label className={`flex items-center gap-3 p-3 border border-border rounded-lg ${sslCommerzReady ? "cursor-pointer hover:bg-muted/50" : "cursor-not-allowed opacity-60"}`}>
                        <RadioGroupItem value="sslcommerz" disabled={!sslCommerzReady} />
                        <CreditCard className="h-5 w-5 text-blue-600" />
                        {!sslCommerzReady && <Badge variant="secondary" className="text-[10px]">Setup required</Badge>}
                        <div><p className="font-medium text-sm">SSLCommerz</p><p className="text-xs text-muted-foreground">{bn ? "কার্ড / ব্যাংক / মোবাইল ব্যাংকিং" : "Card / Bank / Mobile Banking"}</p></div>
                      </label>
                      <label className="flex items-center gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-muted/50">
                        <RadioGroupItem value="cod" />
                        <Banknote className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="font-medium text-sm">{bn ? "ক্যাশ অন ডেলিভারি" : "Cash on Delivery"}</p>
                          <p className="text-xs text-muted-foreground">{bn ? `পণ্য হাতে পেয়ে টাকা দিন (অতিরিক্ত ৳${COD_SURCHARGE})` : `Pay when you receive (+৳${COD_SURCHARGE} fee)`}</p>
                        </div>
                      </label>
                    </RadioGroup>
                  </div>
                </div>
              )}
            </div>

            {/* Summary */}
            <div className="bg-card rounded-xl border border-border/50 p-5 h-fit sticky top-4">
              <h2 className="font-bold mb-4">{bn ? "অর্ডার সারাংশ" : "Order Summary"}</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">{bn ? "সাবটোটাল" : "Subtotal"} ({totalItems})</span><span>৳{subtotal.toLocaleString("bn-BD")}</span></div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{bn ? "শিপিং" : "Shipping"}</span>
                  {shipping === 0 ? <span className="text-green-600 font-medium">{bn ? "ফ্রি" : "Free"}</span> : <span>৳{shipping}</span>}
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{bn ? "কুরিয়ার ফি" : "Courier Fee"}</span>
                  <span>৳{courierFee.toLocaleString("bn-BD")}</span>
                </div>
                {codFee > 0 && (
                  <div className="flex justify-between text-amber-600"><span>{bn ? "COD চার্জ" : "COD Fee"}</span><span>+৳{codFee}</span></div>
                )}
                {discount > 0 && (
                  <div className="flex justify-between text-green-600"><span>{bn ? "কুপন ছাড়" : "Coupon"}</span><span>-৳{discount.toLocaleString("bn-BD")}</span></div>
                )}
                <Separator />
                <div className="flex justify-between font-bold text-base"><span>{bn ? "মোট" : "Total"}</span><span className="text-primary">৳{total.toLocaleString("bn-BD")}</span></div>

                <div className="flex items-center gap-1.5 text-xs text-green-600 pt-1">
                  <Truck className="h-3.5 w-3.5" />
                  <span>{bn ? "ডেলিভারি:" : "Delivery:"} {deliveryDateText}</span>
                </div>

                {subtotal < FREE_SHIPPING_MIN && (
                  <p className="text-xs text-muted-foreground">💡 {bn ? `৳${FREE_SHIPPING_MIN}+ অর্ডারে ফ্রি ডেলিভারি` : `Free delivery on orders ৳${FREE_SHIPPING_MIN}+`}</p>
                )}
              </div>
              {step === "cart" ? (
                <Button className="w-full mt-4 h-11 font-bold text-white hover:bg-emerald-800" onClick={() => setStep("shipping")} disabled={items.length === 0}>
                  {bn ? "চেকআউটে যান" : "Proceed to Checkout"}
                </Button>
              ) : (
                <Button className="w-full mt-4 h-11 font-bold text-white hover:bg-emerald-800" onClick={handlePlaceOrder} disabled={submitting}>
                  {submitting ? "..." : (bn ? "অর্ডার করুন" : "Place Order")}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
      {renderPaymentDialog()}
      <Footer />
    </div>
  );
};

export default MartCheckout;
