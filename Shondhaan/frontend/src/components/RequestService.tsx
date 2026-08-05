import { useState, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { Phone, HelpCircle, MapPin, Send, ChevronDown, CheckCircle, ExternalLink, Copy, Camera, Navigation, X } from "lucide-react";
import callCenterAgent from "@/assets/call-center-agent.png";
import { useLanguage } from "@/contexts/LanguageContext";
import { useLocation } from "@/contexts/LocationContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { divisions } from "@/data/locations";
import { supabase } from "@/integrations/supabase/client";
import { haptic } from "@/lib/haptics";

interface RequestServiceProps {
  externalOpen?: boolean;
  onExternalOpenChange?: (open: boolean) => void;
  hideCard?: boolean;
}

const RequestService = ({ externalOpen, onExternalOpenChange, hideCard }: RequestServiceProps = {}) => {
  const { t, language } = useLanguage();
  const bn = language === "bn";
  const { selectedCity, subArea } = useLocation();

  const [internalOpen, setInternalOpen] = useState(false);
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = onExternalOpenChange || setInternalOpen;
  const [name, setName] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [trackingToken, setTrackingToken] = useState<string | null>(null);

  // Location selectors
  const [selDivision, setSelDivision] = useState("");
  const [selDistrict, setSelDistrict] = useState("");
  const [selThana, setSelThana] = useState("");
  const [detailArea, setDetailArea] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error(bn ? "ছবি ৫MB এর কম হতে হবে" : "Image must be under 5MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPhotoPreview(ev.target?.result as string);
      haptic("success");
      toast.success(bn ? "ছবি যোগ হয়েছে" : "Photo added");
    };
    reader.readAsDataURL(file);
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error(bn ? "এই ব্রাউজারে লোকেশন সাপোর্ট নেই" : "Location not supported");
      return;
    }
    setGpsLoading(true);
    haptic("light");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          // Reverse geocode via OpenStreetMap (no API key required)
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=14&accept-language=${bn ? "bn" : "en"}`,
            { headers: { Accept: "application/json" } }
          );
          if (res.ok) {
            const data = await res.json();
            const addr = data.address || {};
            const place = addr.suburb || addr.neighbourhood || addr.village || addr.town || addr.city_district || "";
            const city = addr.city || addr.town || addr.state_district || "";
            const detail = [place, city].filter(Boolean).join(", ") || data.display_name?.split(",").slice(0, 2).join(", ") || "";
            if (detail) setDetailArea(detail);
            haptic("success");
            toast.success(bn ? "লোকেশন যুক্ত হয়েছে" : "Location added");
          } else {
            setDetailArea(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
            toast.success(bn ? "GPS কোঅর্ডিনেট নেওয়া হয়েছে" : "GPS coordinates captured");
          }
        } catch {
          setDetailArea(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
        } finally {
          setGpsLoading(false);
        }
      },
      (err) => {
        setGpsLoading(false);
        const msg =
          err.code === err.PERMISSION_DENIED
            ? bn ? "লোকেশন অনুমতি দিন" : "Please allow location access"
            : bn ? "লোকেশন আনা যায়নি" : "Could not fetch location";
        toast.error(msg);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const selectedDivisionObj = useMemo(
    () => divisions.find((d) => d.nameBn === selDivision),
    [selDivision]
  );
  const selectedDistrictObj = useMemo(
    () => selectedDivisionObj?.districts.find((d) => d.nameBn === selDistrict),
    [selectedDivisionObj, selDistrict]
  );

  const handleOpen = () => {
    // Pre-fill from global location context
    setSelDivision("");
    setSelDistrict("");
    setSelThana("");
    setDetailArea("");
    setName("");
    setPhone("");
    setMessage("");
    setSubmitted(false);
    setTrackingToken(null);
    setOpen(true);
  };

  const getFullArea = () => {
    const parts = [detailArea, selThana, selDistrict, selDivision].filter(Boolean);
    return parts.join(", ");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selDivision || !selDistrict || !name.trim() || !phone.trim() || !message.trim()) {
      toast.error(bn ? "সব তথ্য পূরণ করুন" : "Please fill all fields");
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await (supabase as any).from("service_requests").insert({
        division: selDivision,
        district: selDistrict,
        thana: selThana || null,
        detail_area: detailArea || null,
        service_description: message,
        customer_name: name,
        customer_phone: phone,
      }).select("id, tracking_token").single();
      if (error) throw error;
      toast.success(bn ? "আপনার রিকোয়েস্ট সফলভাবে পাঠানো হয়েছে!" : "Your request has been sent successfully!");
      setSubmitted(true);

      // Store tracking token for display
      if (data?.tracking_token) {
        setTrackingToken(data.tracking_token);
      }

      // Notify area representatives (fire and forget)
      if (data?.id) {
        supabase.functions.invoke("notify-representative", {
          body: { service_request_id: data.id },
        }).catch(() => {});
      }
    } catch (err: any) {
      toast.error(bn ? "রিকোয়েস্ট পাঠাতে সমস্যা হয়েছে" : "Failed to send request");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const selectClass =
    "w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 appearance-none cursor-pointer";

  return (
    <>
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="py-6 md:py-10"
      >
        {!hideCard && (
        <div className="mx-4 md:mx-0 rounded-2xl border border-border bg-card p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-center md:text-left">
            <img
              src={callCenterAgent}
              alt="Call center agent"
              className="h-16 w-16 md:h-20 md:w-20 rounded-full object-cover border-2 border-primary/20 shrink-0"
            />
            <div>
              <h3 className="font-heading text-lg font-bold text-foreground">{t("request.title")}</h3>
              <p className="text-sm text-muted-foreground">{t("request.subtitle")}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleOpen}
              className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
            >
              {t("request.requestBtn")}
            </button>
            <a href="tel:+8801700000000" className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
              <Phone className="h-4 w-4" />
              {t("request.callBtn")}
            </a>
          </div>
        </div>
        )}
      </motion.section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {bn ? "সার্ভিস রিকোয়েস্ট সার্ভিস" : "Service Request"}
            </DialogTitle>
            <DialogDescription>
              {bn ? "আপনার প্রয়োজনীয় সেবার বিবরণ দিন" : "Describe the service you need"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            {/* Location */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-primary" />
                {bn ? "আপনার এলাকা" : "Your Area"}
              </Label>

              <div className="grid grid-cols-2 gap-3">
                {/* Division */}
                <div className="relative">
                  <select
                    value={selDivision}
                    onChange={(e) => {
                      setSelDivision(e.target.value);
                      setSelDistrict("");
                      setSelThana("");
                    }}
                    className={selectClass}
                  >
                    <option value="">{bn ? "বিভাগ" : "Division"}</option>
                    {divisions.map((d) => (
                      <option key={d.name} value={d.nameBn}>
                        {d.nameBn}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>

                {/* District */}
                <div className="relative">
                  <select
                    value={selDistrict}
                    onChange={(e) => {
                      setSelDistrict(e.target.value);
                      setSelThana("");
                    }}
                    disabled={!selDivision}
                    className={selectClass}
                  >
                    <option value="">{bn ? "জেলা" : "District"}</option>
                    {selectedDivisionObj?.districts.map((d) => (
                      <option key={d.name} value={d.nameBn}>
                        {d.nameBn}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Thana */}
                <div className="relative">
                  <select
                    value={selThana}
                    onChange={(e) => setSelThana(e.target.value)}
                    disabled={!selDistrict || !selectedDistrictObj?.thanas?.length}
                    className={selectClass}
                  >
                    <option value="">{bn ? "থানা" : "Thana"}</option>
                    {selectedDistrictObj?.thanas?.map((th) => (
                      <option key={th} value={th}>
                        {th}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>

                {/* Detail area */}
                <Input
                  value={detailArea}
                  onChange={(e) => setDetailArea(e.target.value)}
                  placeholder={bn ? "বিস্তারিত এলাকা" : "Detail area"}
                />
              </div>

              {/* GPS quick-fill — mobile shines here */}
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                disabled={gpsLoading}
                className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-primary/40 bg-primary/5 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-60"
              >
                <Navigation className={`h-3.5 w-3.5 ${gpsLoading ? "animate-pulse" : ""}`} />
                {gpsLoading
                  ? (bn ? "লোকেশন আনছে..." : "Fetching location...")
                  : (bn ? "📍 আমার বর্তমান লোকেশন ব্যবহার করুন" : "📍 Use my current location")}
              </button>
            </div>

            {/* Service description */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">
                {bn ? "আপনার কি ধরনের সার্ভিস প্রয়োজন?" : "What type of service do you need?"}
              </Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={bn ? "আপনার সমস্যা বা প্রয়োজনীয় সেবার বিবরণ লিখুন..." : "Describe your problem or required service..."}
                rows={3}
              />

              {/* Camera attach (mobile-first) */}
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoChange}
                className="hidden"
              />
              {photoPreview ? (
                <div className="relative inline-block">
                  <img
                    src={photoPreview}
                    alt="Attachment preview"
                    className="h-20 w-20 rounded-md border border-border object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setPhotoPreview(null)}
                    aria-label={bn ? "ছবি মুছুন" : "Remove photo"}
                    className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-border py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary md:hidden"
                >
                  <Camera className="h-3.5 w-3.5" />
                  {bn ? "📷 ছবি যুক্ত করুন (অপশনাল)" : "📷 Attach photo (optional)"}
                </button>
              )}
            </div>

            {/* Identity */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">
                {bn ? "আপনার পরিচয়" : "Your Identity"}
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={bn ? "আপনার নাম" : "Your name"}
                />
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={bn ? "ফোন নম্বর" : "Phone number"}
                />
              </div>
            </div>

            {submitted && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl bg-primary/10 border border-primary/20 p-4 space-y-3"
              >
                <div className="flex items-center gap-2 text-primary">
                  <CheckCircle className="h-5 w-5 shrink-0" />
                  <span className="text-sm font-semibold">
                    {bn ? "আপনার রিকোয়েস্ট সফলভাবে গৃহীত হয়েছে" : "Your request has been successfully received"}
                  </span>
                </div>
                {trackingToken && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      {bn ? "📎 নিচের লিংক দিয়ে সেবার অগ্রগতি ট্র্যাক করুন:" : "📎 Track your service progress with this link:"}
                    </p>
                    <div className="flex items-center gap-2">
                      <a
                        href={`/track/${trackingToken}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center gap-1.5 rounded-lg bg-background border border-border px-3 py-2 text-xs font-medium text-primary hover:underline truncate"
                      >
                        <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                        {window.location.origin}/track/{trackingToken.slice(0, 8)}...
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/track/${trackingToken}`);
                          toast.success(bn ? "লিংক কপি হয়েছে!" : "Link copied!");
                        }}
                        className="rounded-lg border border-border p-2 text-muted-foreground hover:bg-secondary"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {bn ? "💬 এই লিংকটি আপনার ফোনেও SMS এ পাঠানো হবে" : "💬 This link will also be sent to your phone via SMS"}
                    </p>
                  </div>
                )}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={submitting || submitted}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-green-800 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {submitting
                ? (bn ? "পাঠানো হচ্ছে..." : "Sending...")
                : submitted
                  ? (bn ? "পাঠানো হয়েছে ✓" : "Sent ✓")
                  : (bn ? "রিকোয়েস্ট পাঠান" : "Send Request")}
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default RequestService;
