import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronLeft, ShoppingBag, Trash2, Tag, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import LocationPicker from "@/components/LocationPicker";
import { useBookingAutoFill } from "@/hooks/useBookingAutoFill";
import { Sparkles } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8081";

const Checkout = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items, removeItem, totalAmount, clearCart } = useCart();
  const { t, language } = useLanguage();

  const hasEmergency = items.some((i) => i.isEmergency);

  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  const nowTimeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  const [bookingName, setBookingName] = useState("");
  const [bookingPhone, setBookingPhone] = useState("");
  const [bookingAddress, setBookingAddress] = useState("");
  const [bookingDivision, setBookingDivision] = useState("");
  const [bookingDistrict, setBookingDistrict] = useState("");
  const [bookingThana, setBookingThana] = useState("");
  const [bookingDetailArea, setBookingDetailArea] = useState("");
  const [bookingDate, setBookingDate] = useState(hasEmergency ? todayStr : "");
  const [bookingTime, setBookingTime] = useState(hasEmergency ? nowTimeStr : "");
  const [submitting, setSubmitting] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount_type: string; discount_value: number; max_discount_amount: number | null } | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);

  // AI smart-fill: pulls from last booking → one-tap apply
  const { defaults: smartDefaults } = useBookingAutoFill();
  const hasSmartFill =
    !!(smartDefaults.customer_name || smartDefaults.customer_phone || smartDefaults.customer_address);
  const applySmartFill = () => {
    if (smartDefaults.customer_name) setBookingName(smartDefaults.customer_name);
    if (smartDefaults.customer_phone) setBookingPhone(smartDefaults.customer_phone);
    if (smartDefaults.customer_address) setBookingAddress(smartDefaults.customer_address);
    if (smartDefaults.preferred_time && !hasEmergency) setBookingTime(smartDefaults.preferred_time);
    toast.success(language === "bn" ? "আগের তথ্য বসানো হয়েছে" : "Previous details applied");
  };

  const discount = appliedCoupon
    ? appliedCoupon.discount_type === "percentage"
      ? Math.min(
          Math.round(totalAmount * appliedCoupon.discount_value / 100),
          appliedCoupon.max_discount_amount || Infinity
        )
      : Math.min(appliedCoupon.discount_value, totalAmount)
    : 0;
  const finalAmount = totalAmount - discount;

  useEffect(() => {
    if (!user) return;
    const loadProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, phone, address")
        .eq("user_id", user.id)
        .single();
      if (data) {
        if (data.display_name && !bookingName) setBookingName(data.display_name);
        if (data.phone && !bookingPhone) setBookingPhone(data.phone);
        if (data.address && !bookingAddress) setBookingAddress(data.address);
      }
    };
    loadProfile();
  }, [user]);

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-[44px] md:pt-[104px] flex flex-col items-center justify-center min-h-[60vh] px-4">
          <ShoppingBag className="h-12 w-12 text-muted-foreground/30 mb-3" />
          <h1 className="font-heading text-xl font-bold text-foreground mb-2">{t("cart.empty")}</h1>
          <button onClick={() => navigate("/")} className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground">
            {t("cart.continueShopping")}
          </button>
        </div>
        <Footer />
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error(t("sd.loginFirst"));
      navigate("/auth");
      return;
    }

    if (!bookingName.trim() || !bookingPhone.trim() || !bookingDivision || !bookingDistrict || !bookingDate || !bookingTime) {
      toast.error(t("sd.fillAll"));
      return;
    }
    if (!/^01[3-9]\d{8}$/.test(bookingPhone.trim())) {
      toast.error(t("sd.validPhone"));
      return;
    }

    const fullAddress = [bookingDivision, bookingDistrict, bookingThana, bookingDetailArea].filter(Boolean).join(", ");

    setSubmitting(true);

    const bookings = items.map((item) => ({
      user_id: user.id,
      service_slug: item.serviceSlug,
      service_title: item.serviceTitle,
      package_name: item.packageName,
      package_price: item.packagePrice * item.quantity,
      customer_name: bookingName.trim(),
      customer_phone: bookingPhone.trim(),
      customer_address: fullAddress,
      booking_date: bookingDate,
      booking_time: bookingTime,
      is_emergency: item.isEmergency || false,
    }));

    const { error } = await supabase.from("bookings").insert(bookings);

    if (!error) {
      try {
        const orderPayload = {
          user_id: user.id,
          subtotal: totalAmount,
          shipping_fee: 0,
          courier_fee: 0,
          cod_fee: 0,
          discount,
          total: finalAmount,
          coupon_code: appliedCoupon?.code || null,
          payment_method: "cod",
          customer_name: bookingName.trim(),
          customer_phone: bookingPhone.trim(),
          shipping_address: fullAddress,
          shipping_division: bookingDivision,
          shipping_district: bookingDistrict,
          shipping_thana: bookingThana,
          notes: `Booking date: ${bookingDate}, time: ${bookingTime}`,
          estimated_delivery_date: bookingDate,
          items: items.map((item) => ({
            product_id: null,
            product_name: `${item.serviceTitle} - ${item.packageName}`,
            product_image: item.serviceImage || null,
            quantity: item.quantity,
            unit_price: item.packagePrice,
            total_price: item.packagePrice * item.quantity,
            vendor_id: null,
          })),
          save_address: true,
          address_label: "Home",
        };

        const resp = await fetch(`${API_BASE}/api/orders`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(orderPayload),
        });
        const result = await resp.json().catch(() => ({}));
        if (!resp.ok || result.success === false) {
          throw new Error(result.message || "Order save failed");
        }
      } catch (orderError: any) {
        setSubmitting(false);
        toast.error(orderError.message || "Order save failed");
        return;
      }
    }

    // Increment coupon used_count
    if (!error && appliedCoupon) {
      await supabase.from("coupons").update({ used_count: 1 } as any).eq("code", appliedCoupon.code);
    }

    setSubmitting(false);

    if (error) {
      toast.error(t("sd.bookingError"));
      return;
    }

    clearCart();
    navigate("/booking-confirmation", {
      state: {
        serviceTitle: items.map((i) => i.serviceTitle).join(", "),
        packageName: items.map((i) => `${i.packageName} x${i.quantity}`).join(", "),
        packagePrice: finalAmount,
        customerName: bookingName.trim(),
        customerPhone: bookingPhone.trim(),
        customerAddress: fullAddress,
        bookingDate,
        bookingTime,
        discount: discount > 0 ? discount : undefined,
        couponCode: appliedCoupon?.code,
      },
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-[44px] md:pt-[104px]" />

      <div className="mx-auto max-w-3xl px-4 md:px-6 py-6 md:py-10">
        <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-4 w-4" /> {t("sd.goBack")}
        </button>

        <h1 className="font-heading text-2xl font-bold text-foreground mb-6">{t("cart.checkout")}</h1>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          {/* Cart items */}
          <div className="md:col-span-3 space-y-3">
            {items.map((item) => (
              <motion.div
                key={`${item.serviceSlug}-${item.packageName}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-border bg-card p-4 flex gap-3"
              >
                <img src={item.serviceImage} alt={item.serviceTitle} className="h-16 w-16 rounded-lg object-cover shrink-0" />
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-foreground">{item.serviceTitle}</h3>
                  <p className="text-xs text-muted-foreground">{item.packageName} × {item.quantity}</p>
                  <p className="text-sm font-bold text-primary mt-1">
                    ৳{(item.packagePrice * item.quantity).toLocaleString("bn-BD")}
                  </p>
                </div>
                <button onClick={() => removeItem(item.serviceSlug, item.packageName)} className="self-start p-1 text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              </motion.div>
            ))}

            {/* Coupon */}
            <div className="rounded-xl border border-border bg-card p-3 space-y-2">
              <p className="text-xs font-semibold text-foreground flex items-center gap-1"><Tag className="h-3.5 w-3.5 text-primary" /> {t("coupon.title")}</p>
              {appliedCoupon ? (
                <div className="flex items-center justify-between rounded-lg bg-green-500/10 border border-green-500/20 px-3 py-2">
                  <span className="text-xs font-semibold text-green-700">✓ {appliedCoupon.code} — ৳{discount.toLocaleString("bn-BD")} {t("coupon.discount")}</span>
                  <button onClick={() => { setAppliedCoupon(null); setCouponCode(""); }} className="p-1 text-muted-foreground hover:text-destructive"><X className="h-3.5 w-3.5" /></button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())} placeholder={t("coupon.placeholder")}
                    className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring" />
                  <button disabled={couponLoading || !couponCode.trim()} onClick={async () => {
                    setCouponLoading(true);
                    const { data, error } = await supabase.from("coupons").select("*").eq("code", couponCode.trim()).eq("is_active", true).single();
                    setCouponLoading(false);
                    if (error || !data) { toast.error(t("coupon.invalid")); return; }
                    const c = data as any;
                    if (c.expires_at && new Date(c.expires_at) < new Date()) { toast.error(t("coupon.expired")); return; }
                    if (c.usage_limit && c.used_count >= c.usage_limit) { toast.error(t("coupon.limitReached")); return; }
                    if (c.min_order_amount && totalAmount < c.min_order_amount) { toast.error(`${t("coupon.minOrder")}${c.min_order_amount}`); return; }
                    setAppliedCoupon({ code: c.code, discount_type: c.discount_type, discount_value: c.discount_value, max_discount_amount: c.max_discount_amount });
                    toast.success(t("coupon.applied"));
                  }} className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                    {couponLoading ? "..." : t("coupon.apply")}
                  </button>
                </div>
              )}
            </div>

            {/* Total */}
            <div className="rounded-xl bg-secondary p-4 space-y-1.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{t("checkout.subtotal")}</span>
                <span>৳{totalAmount.toLocaleString("bn-BD")}</span>
              </div>
              {discount > 0 && (
                <div className="flex items-center justify-between text-xs text-green-600 font-medium">
                  <span>{t("coupon.couponDiscount")} ({appliedCoupon?.code})</span>
                  <span>-৳{discount.toLocaleString("bn-BD")}</span>
                </div>
              )}
              <div className="flex items-center justify-between pt-1 border-t border-border">
                <span className="text-sm font-semibold text-foreground">{t("cart.total")}</span>
                <span className="text-lg font-bold text-primary">
                  ৳{finalAmount.toLocaleString("bn-BD")}
                </span>
              </div>
            </div>
          </div>

          {/* Booking form */}
          <div className="md:col-span-2">
            <div className="sticky top-20 rounded-2xl border border-border bg-card p-5 shadow-sm">
              <h2 className="font-heading text-lg font-bold text-foreground mb-4">{t("cart.bookingInfo")}</h2>

              {hasSmartFill && user && (
                <button
                  type="button"
                  onClick={applySmartFill}
                  className="mb-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-primary/40 bg-primary/5 px-3 py-2 text-xs font-semibold text-primary transition hover:bg-primary/10"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  {language === "bn" ? "AI দিয়ে আগের তথ্য বসান" : "AI auto-fill from last booking"}
                </button>
              )}

              {!user && (
                <div className="mb-4 rounded-lg bg-secondary p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-2">{t("sd.loginToBook")}</p>
                  <button onClick={() => navigate("/auth")} className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">
                    {t("sd.loginRegister")}
                  </button>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3">
                <input type="text" placeholder={t("sd.namePlaceholder")} value={bookingName} onChange={(e) => setBookingName(e.target.value)} maxLength={100}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring" />
                <input type="tel" placeholder={t("sd.phonePlaceholder")} value={bookingPhone} onChange={(e) => setBookingPhone(e.target.value)} maxLength={11}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring" />
                <LocationPicker
                  division={bookingDivision}
                  district={bookingDistrict}
                  thana={bookingThana}
                  detailArea={bookingDetailArea}
                  onDivisionChange={setBookingDivision}
                  onDistrictChange={setBookingDistrict}
                  onThanaChange={setBookingThana}
                  onDetailAreaChange={setBookingDetailArea}
                  bn={language === "bn"}
                />
                {hasEmergency && (
                  <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 mb-1">
                    <p className="text-xs font-semibold text-destructive flex items-center gap-1">
                      ⚡ {t("checkout.emergencyNote")}
                    </p>
                  </div>
                )}
                <input type="date" value={bookingDate} onChange={(e) => setBookingDate(e.target.value)} min={todayStr}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring" />
                <input type="time" value={bookingTime} onChange={(e) => setBookingTime(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring" />
                <button type="submit" disabled={submitting}
                  className="w-full rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50">
                  {submitting ? t("sd.submitting") : t("sd.confirmBooking")}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      <Footer />
      <div className="h-16 md:hidden" />
    </div>
  );
};

export default Checkout;
