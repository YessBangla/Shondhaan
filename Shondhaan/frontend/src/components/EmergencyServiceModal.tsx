import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Zap, ShoppingBag, Search, Droplet, Stethoscope, Pill, FileCheck, UploadCloud, ScanLine } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "@/contexts/LocationContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCart } from "@/contexts/CartContext";
import { getMySqlAuth } from "@/lib/mysqlAuth";

const EMERGENCY_SURCHARGE = 1.3;
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
  const { addItem } = useCart();
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const bn = language === "bn";

  const [apiServices, setApiServices] = useState<any[]>([]);
  const [isLoadingServices, setIsLoadingServices] = useState(false);

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

        let list: any[] = [];
        if (Array.isArray(json)) {
          list = json;
        } else if (json && Array.isArray(json.data)) {
          list = json.data;
        } else if (json && Array.isArray(json.services)) {
          list = json.services;
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

              let packages = Array.isArray(s.packages) ? s.packages : [];
              if (packages.length === 0 && Number(s.price) > 0) {
                packages = [{ name: "Basic Service", price: Number(s.price) }];
              }

              return {
                ...s,
                image: s.image_url || s.image || "",
                availableCities: cities,
                packages: packages,
              };
            })
            .filter((s: any) => s.slug && s.title && s.is_active !== false);

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

  // Prescription modal state — persisted so it survives a page reload
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

  const handleAddToCart = (pkg: { name: string; price: number }) => {
    if (!selectedService) return;
    const emergencyPrice = Math.round(pkg.price * EMERGENCY_SURCHARGE);
    addItem({
      serviceSlug: selectedService.slug,
      serviceTitle: `⚡ ${selectedService.title}`,
      serviceImage: selectedService.image,
      packageName: `${pkg.name} (${t("emergency.tag")})`,
      packagePrice: emergencyPrice,
      isEmergency: true,
    });
    toast.success(t("emergency.addedToCart"));
    onClose();
    setSelectedSlug(null);
  };

  const readFileAsDataUrl = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => setPrescriptionImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
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
      console.log(result);
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
                      {filteredServices.map((s) => (
                        <button
                          key={s.slug}
                          onClick={() => setSelectedSlug(s.slug)}
                          className="group flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-3 transition-all hover:border-destructive/50 hover:shadow-md"
                        >
                          <img src={`${import.meta.env.VITE_SERVICE_API_BASE_URL}${s.image}`} alt={s.title} className="h-16 w-16 rounded-lg object-cover" />
                          <span className="text-xs font-medium text-foreground text-center leading-tight">{s.title}</span>
                          <span className="text-[10px] text-muted-foreground">
                            ৳{Math.round((s.packages[0]?.price || 0) * EMERGENCY_SURCHARGE).toLocaleString("bn-BD")} {t("hero.from")}
                          </span>
                        </button>
                      ))}
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
                  <img src={`${import.meta.env.VITE_SERVICE_API_BASE_URL}${selectedService!.image}`} alt={selectedService!.title} className="h-14 w-14 rounded-lg object-cover" />
                  <div>
                    <h3 className="text-sm font-bold text-foreground">{selectedService!.title}</h3>
                    <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive">
                      <Zap className="h-3 w-3" /> {t("emergency.tag")} (+30%)
                    </span>
                  </div>
                </div>

                <p className="mb-3 text-xs font-semibold text-foreground">{t("sd.packages")}</p>
                <div className="space-y-2">
                  {selectedService!.packages.map((pkg: any) => {
                    const emergencyPrice = Math.round(pkg.price * EMERGENCY_SURCHARGE);
                    return (
                      <div key={pkg.name} className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">{pkg.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs line-through text-muted-foreground">
                              ৳{pkg.price.toLocaleString("bn-BD")}
                            </span>
                            <span className="text-sm font-bold text-destructive">
                              ৳{emergencyPrice.toLocaleString("bn-BD")}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleAddToCart(pkg)}
                          className="flex items-center gap-1 rounded-lg bg-destructive px-3 py-2 text-xs font-semibold text-destructive-foreground transition-colors hover:bg-destructive/90"
                        >
                          <ShoppingBag className="h-3.5 w-3.5" />
                          {t("cart.addToCart")}
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

  // Prescription Check modal — separate, persisted across reload via localStorage
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
            {/* Header */}
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
              {/* Drag & drop upload area */}
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
                  <img
                    src={prescriptionImage}
                    alt="Prescription preview"
                    className="max-h-56 w-full rounded-lg object-contain"
                  />
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
                <input
                  id="prescription-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileInput}
                />
              </label>

              {prescriptionImage && (
                <button
                  onClick={() => { setPrescriptionImage(null); setScanResults(null); }}
                  className="mt-2 text-xs text-muted-foreground hover:text-destructive hover:underline"
                >
                  {bn ? "ছবি সরান" : "Remove image"}
                </button>
              )}

              {/* Scan button */}
              <button
                onClick={handleScan}
                disabled={!prescriptionImage || isScanning}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-destructive px-4 py-3 text-sm font-semibold text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ScanLine className="h-4 w-4" />
                {isScanning
                  ? (bn ? "স্ক্যান হচ্ছে..." : "Scanning...")
                  : (bn ? "প্রেসক্রিপশন স্ক্যান করুন" : "Scan your prescription")}
              </button>

              {/* Scan results table */}
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
