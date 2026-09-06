import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Zap, CalendarCheck, Search, Droplet, Stethoscope, Pill, FileCheck, UploadCloud, ScanLine } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "@/contexts/LocationContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { getMySqlAuth } from "@/lib/mysqlAuth";
import { createBooking, startBookingPayment } from "@/lib/bookingApi";

const EMERGENCY_SURCHARGE_RATE = 0.3; // 30% Surcharge
const PRESCRIPTION_MODAL_KEY = "prescriptionModalOpen";
const SERVICE_API_BASE_URL = (
  import.meta.env.VITE_SERVICE_API_BASE_URL || ""
).replace(/\/+$/, "");

interface ScanResult {
  medicine_name: string;
  dosage: string | null;
  frequency: string | null;
  duration: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

const EmergencyServiceModal = ({ open, onClose }: Props) => {
  const { selectedCity } = useLocation();
  const { t, language } = useLanguage();
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const bn = language === "bn";

  const [apiServices, setApiServices] = useState<any[]>([]);
  const [isLoadingServices, setIsLoadingServices] = useState(false);
  const authUser = getMySqlAuth()?.user;
  const [bookingName, setBookingName] = useState(authUser?.name || "");
  const [bookingPhone, setBookingPhone] = useState(authUser?.mobile || "");
  const [bookingAddress, setBookingAddress] = useState(authUser?.address || "");
  const [bookingDate, setBookingDate] = useState("");
  const [bookingTime, setBookingTime] = useState("10:00");
  const [isBooking, setIsBooking] = useState(false);

  // Fetch services from API
  useEffect(() => {
    if (!open) return;

    const fetchServices = async () => {
      setIsLoadingServices(true);
      try {
        const auth = getMySqlAuth();
        const headers: HeadersInit = {
          "Content-Type": "application/json",
          ...(auth?.token ? { Authorization: `Bearer ${auth.token}` } : {}),
        };

        const response = await fetch(`${SERVICE_API_BASE_URL}/api/services`, { headers });
        const json = await response.json();

        if (!response.ok) throw new Error(json?.message || "Failed to fetch services");

        // Robust payload extraction
        let list: any[] = [];
        if (Array.isArray(json)) {
          list = json;
        } else if (Array.isArray(json?.data)) {
          list = json.data;
        } else if (Array.isArray(json?.services)) {
          list = json.services;
        } else if (json?.data && Array.isArray(json?.data?.services)) {
          list = json.data.services;
        } else if (json && typeof json === 'object') {
          for (const key in json) {
            if (Array.isArray(json[key])) {
              list = json[key];
              break;
            }
          }
        }

        if (list.length > 0) {
          const mapped = list
            .map((s: any) => {
              let cities: string[] = [];
              if (Array.isArray(s.available_cities)) {
                cities = s.available_cities.map(String);
              } else if (typeof s.available_cities === "string" && s.available_cities) {
                try {
                  const parsed = JSON.parse(s.available_cities);
                  if (Array.isArray(parsed)) cities = parsed.map(String);
                  else cities = s.available_cities.split(",").map((c: string) => c.trim());
                } catch {
                  cities = s.available_cities.split(",").map((c: string) => c.trim());
                }
              }

              let packages = [];
              if (Array.isArray(s.packages)) {
                packages = s.packages;
              } else if (typeof s.packages === "string" && s.packages) {
                try {
                  const parsed = JSON.parse(s.packages);
                  if (Array.isArray(parsed)) packages = parsed;
                } catch {}
              }
              if (packages.length === 0 && Number(s.price) > 0) {
                packages = [{ name: "Basic Service", price: Number(s.price) }];
              }

              let imageUrl = s.image_url || s.image || "";
              if (imageUrl && !imageUrl.startsWith("http") && !imageUrl.startsWith("data:")) {
                imageUrl = `${import.meta.env.VITE_SERVICE_API_BASE_URL}${imageUrl.startsWith("/") ? "" : "/"}${imageUrl}`;
              }

              return {
                ...s,
                image: imageUrl,
                availableCities: cities,
                packages: packages,
              };
            })
            .filter((s: any) => s.slug && s.title && Number(s.is_active) !== 0);

          setApiServices(mapped);
        } else {
          setApiServices([]);
        }
      } catch (error) {
        console.error("Error fetching emergency services:", error);
        toast.error(bn ? "সার্ভিস লোড করতে সমস্যা হয়েছে" : "Failed to load services");
      } finally {
        setIsLoadingServices(false);
      }
    };

    fetchServices();
  }, [open, bn]);

  // Fuzzy match for cities
  let cityServices = apiServices.filter((s) => {
    if (!selectedCity || !s.availableCities || s.availableCities.length === 0) return true;
    
    const targetCity = selectedCity.trim().toLowerCase();
    if (!targetCity) return true;

    return s.availableCities.some((c) => {
      const serviceCity = String(c).trim().toLowerCase();
      return serviceCity === targetCity || serviceCity.includes(targetCity) || targetCity.includes(serviceCity);
    });
  });

  // Fail-safe: If city filter removes everything, just show all services
  if (cityServices.length === 0 && apiServices.length > 0) {
    cityServices = apiServices;
  }
  
  const [searchQuery, setSearchQuery] = useState("");
  const filteredServices = cityServices.filter((s) =>
    s.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const selectedService = apiServices.find((s) => s.slug === selectedSlug);

  // Prescription modal state
  const [prescriptionOpen, setPrescriptionOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(PRESCRIPTION_MODAL_KEY) === "true";
  });

  const [prescriptionImage, setPrescriptionImage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState<ScanResult[] | null>(null);

  useEffect(() => {
    localStorage.setItem(PRESCRIPTION_MODAL_KEY, prescriptionOpen ? "true" : "false");
  }, [prescriptionOpen]);

  const handleBookNow = async (pkg: { id?: string | number; name: string; price: number }) => {
    const auth = getMySqlAuth();
    if (!selectedService || !auth?.user?.id) {
      toast.error(bn ? "বুকিং করতে আগে লগইন করুন" : "Please log in to book this service");
      return;
    }
    if (!bookingName.trim() || !bookingPhone.trim() || !bookingAddress.trim() || !bookingDate || !bookingTime) {
      toast.error(bn ? "বুকিংয়ের তথ্য পূরণ করুন" : "Please complete your booking details");
      return;
    }

    setIsBooking(true);
    try {
      const basePrice = Number(pkg.price || 0);
      const surchargeAmount = Math.round(basePrice * EMERGENCY_SURCHARGE_RATE); // 30% charge

      const booking = await createBooking({
        user_id: auth.user.id,
        service_id: selectedService.id || selectedService.service_id || null,
        package_id: pkg.id || null,
        service_slug: selectedService.slug,
        service_title: selectedService.title,
        package_name: `${pkg.name} (${t("emergency.tag")})`,
        package_price: basePrice, // Full base price (to be paid in hand to provider)
        customer_name: bookingName.trim(),
        customer_phone: bookingPhone.trim(),
        customer_address: bookingAddress.trim(),
        booking_date: bookingDate,
        booking_time: bookingTime,
        status: "pending",
        payment_status: "unpaid",
        payment_method: "gateway",
        platform_fee_amount: surchargeAmount, // Only 30% is paid online
        booking_type: "emergency",
      });

      toast.success(bn ? "ShurjoPay পেজ খোলা হচ্ছে..." : "Opening ShurjoPay...");
      const payment = await startBookingPayment(booking.id, surchargeAmount);
      if (!payment.checkout_url) throw new Error("No payment link");
      window.location.href = payment.checkout_url;
    } catch (error: any) {
      toast.error(error?.message || (bn ? "বুকিং ব্যর্থ হয়েছে" : "Booking failed"));
    } finally {
      setIsBooking(false);
    }
  };

  const readFileAsDataUrl = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => setPrescriptionImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      readFileAsDataUrl(file);
      setScanResults(null);
    } else {
      toast.error(bn ? "শুধু ছবি আপলোড করুন" : "Please upload an image file");
    }
  }, [bn]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      readFileAsDataUrl(file);
      setScanResults(null);
    }
  };

  const handleScan = async () => {
    if (!prescriptionImage) return;
    setIsScanning(true);
    setScanResults(null);
    try {
      const response = await fetch(`${SERVICE_API_BASE_URL}/api/prescription/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: prescriptionImage }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "Failed to scan prescription");
      }

      let meds: ScanResult[] = [];
      if (Array.isArray(result)) {
        meds = result;
      } else if (Array.isArray(result?.data)) {
        meds = result.data;
      } else if (Array.isArray(result?.medicines)) {
        meds = result.medicines;
      } else if (Array.isArray(result?.results)) {
        meds = result.results;
      }

      setScanResults(meds);
      toast.success(bn ? "প্রেসক্রিপশন স্ক্যান সম্পন্ন হয়েছে" : "Prescription scanned successfully");
    } catch (err: any) {
      toast.error(err.message || (bn ? "স্ক্যান ব্যর্থ হয়েছে" : "Scan failed"));
    } finally {
      setIsScanning(false);
    }
  };

  const closePrescriptionModal = () => {
    setPrescriptionOpen(false);
    setPrescriptionImage(null);
    setIsDragging(false);
    setScanResults(null);
  };

  const modal = (
    <AnimatePresence>
      {open && (
       <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[10000] flex items-end md:items-center justify-center bg-foreground/50 backdrop-blur-sm"
        onClick={onClose}>
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-lg max-h-[85vh] overflow-hidden rounded-t-2xl md:rounded-2xl bg-background shadow-2xl border border-border"
        >
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-destructive/10 px-5 py-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive text-destructive-foreground">
                <Zap className="h-4 w-4" />
              </div>
              <div>
                <h2 className="font-heading text-base font-bold text-foreground">{t("emergency.title")}</h2>
                <p className="text-xs text-muted-foreground">{t("emergency.subtitle")}</p>
              </div>
            </div>
            <button onClick={() => { onClose(); setSelectedSlug(null); }} className="rounded-full p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="overflow-y-auto max-h-[calc(85vh-72px)] p-4">
            {!selectedSlug ? (
              <>
                {/* Search box */}
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={language === "bn" ? "খুঁজুন..." : "Search..."}
                    className="w-full rounded-xl border border-border bg-card py-2.5 pl-9 pr-3 text-sm text-foreground outline-none focus:ring-1 focus:ring-destructive/50"
                  />
                </div>

                {/* Quick action buttons */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <a href="" className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/10">
                    <Droplet className="h-4 w-4 shrink-0" />
                    {language === "bn" ? "এমারজেন্সি রক্ত" : "Emergency Blood"}
                  </a>
                  <a href="" className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/10">
                    <Stethoscope className="h-4 w-4 shrink-0" />
                    {language === "bn" ? "এমারজেন্সি ডাক্তার" : "Emergency Doctor"}
                  </a>
                  <a href="" className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/10">
                    <Pill className="h-4 w-4 shrink-0" />
                    {language === "bn" ? "এমারজেন্সি মেডিসিন" : "Emergency Medicine"}
                  </a>
                  <button
                    onClick={() => setPrescriptionOpen(true)}
                    className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/10"
                  >
                    <FileCheck className="h-4 w-4 shrink-0" />
                    {language === "bn" ? "প্রিস্ক্রিপশন চেক" : "Prescription Check"}
                  </button>
                </div>

                <p className="mb-3 text-xs text-muted-foreground">{t("emergency.selectService")}</p>
                <div className="grid grid-cols-2 gap-3">
                  {isLoadingServices ? (
                    <div className="col-span-2 py-6 text-center text-xs text-muted-foreground animate-pulse">
                      {bn ? "লোড হচ্ছে..." : "Loading services..."}
                    </div>
                  ) : (
                    <>
                      {filteredServices.map((s) => {
                        const basePrice = s.packages[0]?.price || 0;
                        const onlineCharge = Math.round(basePrice * EMERGENCY_SURCHARGE_RATE);
                        return (
                          <button
                            key={s.slug}
                            onClick={() => setSelectedSlug(s.slug)}
                            className="group flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-3 transition-all hover:border-destructive/50 hover:shadow-md"
                          >
                            <img src={s.image} alt={s.title} className="h-16 w-16 rounded-lg object-cover" />
                            <span className="text-xs font-medium text-foreground text-center leading-tight">{s.title}</span>
                            <span className="text-[10px] text-destructive font-semibold">
                              +৳{onlineCharge.toLocaleString("bn-BD")} {bn ? "অনলাইনে" : "online charge"}
                            </span>
                          </button>
                        );
                      })}
                      {filteredServices.length === 0 && (
                        <p className="col-span-2 py-6 text-center text-xs text-muted-foreground">
                          {language === "bn" ? "কোনো সার্ভিস পাওয়া যায়নি" : "No services found"}
                        </p>
                      )}
                    </>
                  )}
                </div>
              </>
            ) : (
              <>
                <button onClick={() => setSelectedSlug(null)} className="mb-3 text-xs text-primary hover:underline">
                  ← {t("emergency.backToServices")}
                </button>
                <div className="flex items-center gap-3 mb-4">
                  <img src={selectedService!.image} alt={selectedService!.title} className="h-14 w-14 rounded-lg object-cover" />
                  <div>
                    <h3 className="text-sm font-bold text-foreground">{selectedService!.title}</h3>
                    <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive">
                      <Zap className="h-3 w-3" /> {t("emergency.tag")} (+30% online)
                    </span>
                  </div>
                </div>

                <div className="mb-4 space-y-2">
                  <input
                    value={bookingName}
                    onChange={(e) => setBookingName(e.target.value)}
                    placeholder={bn ? "আপনার নাম" : "Your name"}
                    className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none focus:ring-1 focus:ring-destructive/50"
                  />
                  <input
                    value={bookingPhone}
                    onChange={(e) => setBookingPhone(e.target.value)}
                    placeholder={bn ? "মোবাইল নম্বর" : "Mobile number"}
                    className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none focus:ring-1 focus:ring-destructive/50"
                  />
                  <input
                    value={bookingAddress}
                    onChange={(e) => setBookingAddress(e.target.value)}
                    placeholder={bn ? "ঠিকানা" : "Address"}
                    className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none focus:ring-1 focus:ring-destructive/50"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={bookingDate}
                      onChange={(e) => setBookingDate(e.target.value)}
                      className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none focus:ring-1 focus:ring-destructive/50"
                    />
                    <input
                      type="time"
                      value={bookingTime}
                      onChange={(e) => setBookingTime(e.target.value)}
                      className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none focus:ring-1 focus:ring-destructive/50"
                    />
                  </div>
                </div>

                <p className="mb-3 text-xs font-semibold text-foreground">{t("sd.packages")}</p>
                <div className="space-y-2">
                  {selectedService!.packages.map((pkg: any) => {
                    const basePrice = Number(pkg.price || 0);
                    const onlineCharge = Math.round(basePrice * EMERGENCY_SURCHARGE_RATE);
                    
                    return (
                      <div key={pkg.name} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-foreground">{pkg.name}</p>
                          <span className="text-sm font-bold text-foreground">৳{basePrice.toLocaleString("bn-BD")}</span>
                        </div>
                        
                        <div className="bg-destructive/5 p-2 rounded-lg text-xs space-y-1">
                          <div className="flex justify-between text-muted-foreground">
                            <span>{bn ? "প্রোভাইডারকে (হাতে হাতে)" : "To provider (in hand)"}</span>
                            <span className="font-semibold">৳{basePrice.toLocaleString("bn-BD")}</span>
                          </div>
                          <div className="flex justify-between text-destructive">
                            <span>{bn ? "অনলাইনে (৩০% চার্জ)" : "Online (30% charge)"}</span>
                            <span className="font-bold">৳{onlineCharge.toLocaleString("bn-BD")}</span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleBookNow(pkg)}
                          disabled={isBooking}
                          className="flex items-center justify-center gap-1 rounded-lg bg-destructive px-3 py-2.5 text-xs font-semibold text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-50"
                        >
                          <CalendarCheck className="h-3.5 w-3.5" />
                          {isBooking ? (bn ? "অপেক্ষা করুন..." : "Please wait...") : (bn ? `বুকিং নিশ্চিত করুন (৳${onlineCharge.toLocaleString("bn-BD")})` : `Book now (Pay ৳${onlineCharge.toLocaleString("bn-BD")})`)}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
      )}
    </AnimatePresence>
  );

  // Prescription Check modal
  const prescriptionModal = (
    <AnimatePresence>
      {prescriptionOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[10001] flex items-end md:items-center justify-center bg-foreground/50 backdrop-blur-sm"
          onClick={closePrescriptionModal}
        >
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md max-h-[85vh] overflow-y-auto rounded-t-2xl md:rounded-2xl bg-background shadow-2xl border border-border"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-destructive/10 px-5 py-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive text-destructive-foreground">
                  <FileCheck className="h-4 w-4" />
                </div>
                <h2 className="font-heading text-base font-bold text-foreground">
                  {bn ? "প্রিস্ক্রিপশন চেক" : "Prescription Check"}
                </h2>
              </div>
              <button
                onClick={closePrescriptionModal}
                className="rounded-full p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5">
              <label
                htmlFor="prescription-upload"
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-colors ${
                  isDragging
                    ? "border-destructive bg-destructive/5"
                    : "border-border bg-card hover:border-destructive/40"
                }`}
              >
                {prescriptionImage ? (
                  <img src={prescriptionImage} alt="Prescription preview" className="max-h-56 w-full rounded-lg object-contain" />
                ) : (
                  <>
                    <UploadCloud className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm font-medium text-foreground">
                      {bn ? "আপনার প্রেস্ক্রিপশন এড করুন" : "Drag & drop your prescription image"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {bn ? "অথবা ক্লিক করে বেছে নিন" : "or click to browse"}
                    </p>
                  </>
                )}
                <input id="prescription-upload" type="file" accept="image/*" className="hidden" onChange={handleFileInput} />
              </label>

              {prescriptionImage && (
                <button
                  onClick={() => { setPrescriptionImage(null); setScanResults(null); }}
                  className="mt-2 text-xs text-muted-foreground hover:text-destructive hover:underline"
                >
                  {bn ? "ছবি সরান" : "Remove image"}
                </button>
              )}

              <button
                onClick={handleScan}
                disabled={!prescriptionImage || isScanning}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-destructive px-4 py-3 text-sm font-semibold text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ScanLine className="h-4 w-4" />
                {isScanning ? (bn ? "স্ক্যান হচ্ছে..." : "Scanning...") : (bn ? "প্রেসক্রিপশন স্ক্যান করুন" : "Scan your prescription")}
              </button>

              {scanResults && (
                <div className="mt-4 overflow-x-auto">
                  {scanResults.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-3">
                      {bn ? "কোনো ওষুধ শনাক্ত করা যায়নি" : "No medicines detected"}
                    </p>
                  ) : (
                    <table className="w-full text-xs border border-border rounded-lg overflow-hidden">
                      <thead>
                        <tr className="bg-secondary/50 text-left">
                          <th className="px-3 py-2 font-semibold text-foreground">{bn ? "ওষুধ" : "Medicine"}</th>
                          <th className="px-3 py-2 font-semibold text-foreground">{bn ? "মাত্রা" : "Dosage"}</th>
                          <th className="px-3 py-2 font-semibold text-foreground">{bn ? "ফ্রিকোয়েন্সি" : "Frequency"}</th>
                          <th className="px-3 py-2 font-semibold text-foreground">{bn ? "মেয়াদ" : "Duration"}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {scanResults.map((m, i) => (
                          <tr key={i} className="border-t border-border">
                            <td className="px-3 py-2 text-foreground">{m.medicine_name}</td>
                            <td className="px-3 py-2 text-muted-foreground">{m.dosage || "—"}</td>
                            <td className="px-3 py-2 text-muted-foreground">{m.frequency || "—"}</td>
                            <td className="px-3 py-2 text-muted-foreground">{m.duration || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (typeof document === "undefined") return null;

  return (
    <>
      {createPortal(modal, document.body)}
      {createPortal(prescriptionModal, document.body)}
    </>
  );
};

export default EmergencyServiceModal;