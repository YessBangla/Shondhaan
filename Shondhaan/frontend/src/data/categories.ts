import catAc from "@/assets/cat-ac.png";
import catAppliance from "@/assets/cat-appliance.png";
import catCleaning from "@/assets/cat-cleaning.png";
import catBeauty from "@/assets/cat-beauty.png";
import catShifting from "@/assets/cat-shifting.png";
import catHealth from "@/assets/cat-health.png";
import catElectrical from "@/assets/cat-electrical.png";
import catPainting from "@/assets/cat-painting.png";
import catDriver from "@/assets/cat-driver.png";
import catPest from "@/assets/cat-pest.png";
import catCar from "@/assets/cat-car.png";
import catElectronics from "@/assets/cat-electronics.png";
import catMens from "@/assets/cat-mens.png";
import catMart from "@/assets/cat-mart.png";
import catYessDeal from "@/assets/cat-yessdeal.png";
import catCourier from "@/assets/cat-courier.png";
import catHomeService from "@/assets/cat-home-service.png";
import catVehicle from "@/assets/cat-vehicle.png";
import catIt from "@/assets/cat-it.png";
import catEvent from "@/assets/cat-event.png";
import catEducation from "@/assets/cat-education.png";
import catConstruction from "@/assets/cat-construction.png";
import catTravel from "@/assets/cat-travel.png";
import catSecurity from "@/assets/cat-security.png";
import catSolar from "@/assets/cat-solar.png";
import catLegal from "@/assets/cat-legal.png";
import catTailoring from "@/assets/cat-tailoring.png";
import catAgriculture from "@/assets/cat-agriculture.png";
import catEmployment from "@/assets/cat-employment.png";
import catMedia from "@/assets/cat-media.png";
import catBillpay from "@/assets/cat-billpay.png";

export interface CategoryColor {
  gradient: string;
  overlay: string;
  chipBg: string;
  chipText: string;
  accent: string;
}

export interface ServiceCategory {
  id: string;
  name: string;
  nameEn?: string;
  icon: string;
  serviceSlugs: string[];
  color: CategoryColor;
}

const colors: Record<string, CategoryColor> = {
  blue:    { gradient: "from-blue-600 to-blue-800",    overlay: "from-blue-900/80 to-blue-700/40",    chipBg: "bg-blue-500/15",    chipText: "text-blue-700 dark:text-blue-300",    accent: "#2563eb" },
  teal:    { gradient: "from-teal-600 to-teal-800",    overlay: "from-teal-900/80 to-teal-700/40",    chipBg: "bg-teal-500/15",    chipText: "text-teal-700 dark:text-teal-300",    accent: "#0d9488" },
  amber:   { gradient: "from-amber-600 to-amber-800",  overlay: "from-amber-900/80 to-amber-700/40",  chipBg: "bg-amber-500/15",   chipText: "text-amber-700 dark:text-amber-300",  accent: "#d97706" },
  emerald: { gradient: "from-emerald-600 to-emerald-800", overlay: "from-emerald-900/80 to-emerald-700/40", chipBg: "bg-emerald-500/15", chipText: "text-emerald-700 dark:text-emerald-300", accent: "#059669" },
  pink:    { gradient: "from-pink-600 to-pink-800",    overlay: "from-pink-900/80 to-pink-700/40",    chipBg: "bg-pink-500/15",    chipText: "text-pink-700 dark:text-pink-300",    accent: "#db2777" },
  indigo:  { gradient: "from-indigo-600 to-indigo-800", overlay: "from-indigo-900/80 to-indigo-700/40", chipBg: "bg-indigo-500/15", chipText: "text-indigo-700 dark:text-indigo-300", accent: "#4f46e5" },
  orange:  { gradient: "from-orange-600 to-orange-800", overlay: "from-orange-900/80 to-orange-700/40", chipBg: "bg-orange-500/15", chipText: "text-orange-700 dark:text-orange-300", accent: "#ea580c" },
  red:     { gradient: "from-red-600 to-red-800",      overlay: "from-red-900/80 to-red-700/40",      chipBg: "bg-red-500/15",     chipText: "text-red-700 dark:text-red-300",      accent: "#dc2626" },
  violet:  { gradient: "from-violet-600 to-violet-800", overlay: "from-violet-900/80 to-violet-700/40", chipBg: "bg-violet-500/15", chipText: "text-violet-700 dark:text-violet-300", accent: "#7c3aed" },
  cyan:    { gradient: "from-cyan-600 to-cyan-800",    overlay: "from-cyan-900/80 to-cyan-700/40",    chipBg: "bg-cyan-500/15",    chipText: "text-cyan-700 dark:text-cyan-300",    accent: "#0891b2" },
  sky:     { gradient: "from-sky-600 to-sky-800",      overlay: "from-sky-900/80 to-sky-700/40",      chipBg: "bg-sky-500/15",     chipText: "text-sky-700 dark:text-sky-300",      accent: "#0284c7" },
  lime:    { gradient: "from-lime-600 to-lime-800",    overlay: "from-lime-900/80 to-lime-700/40",    chipBg: "bg-lime-500/15",    chipText: "text-lime-700 dark:text-lime-300",    accent: "#65a30d" },
  slate:   { gradient: "from-slate-600 to-slate-800",  overlay: "from-slate-900/80 to-slate-700/40",  chipBg: "bg-slate-500/15",   chipText: "text-slate-700 dark:text-slate-300",  accent: "#475569" },
  rose:    { gradient: "from-rose-600 to-rose-800",    overlay: "from-rose-900/80 to-rose-700/40",    chipBg: "bg-rose-500/15",    chipText: "text-rose-700 dark:text-rose-300",    accent: "#e11d48" },
  fuchsia: { gradient: "from-fuchsia-600 to-fuchsia-800", overlay: "from-fuchsia-900/80 to-fuchsia-700/40", chipBg: "bg-fuchsia-500/15", chipText: "text-fuchsia-700 dark:text-fuchsia-300", accent: "#c026d3" },
  yellow:  { gradient: "from-yellow-600 to-yellow-800", overlay: "from-yellow-900/80 to-yellow-700/40", chipBg: "bg-yellow-500/15", chipText: "text-yellow-700 dark:text-yellow-300", accent: "#ca8a04" },
  stone:   { gradient: "from-stone-600 to-stone-800",  overlay: "from-stone-900/80 to-stone-700/40",  chipBg: "bg-stone-500/15",   chipText: "text-stone-700 dark:text-stone-300",  accent: "#57534e" },
  zinc:    { gradient: "from-zinc-600 to-zinc-800",    overlay: "from-zinc-900/80 to-zinc-700/40",    chipBg: "bg-zinc-500/15",    chipText: "text-zinc-700 dark:text-zinc-300",    accent: "#52525b" },
};

export const serviceCategories: ServiceCategory[] = [
  { id: "ac-service", name: "এসি সার্ভিস", nameEn: "AC Service", icon: catAc, serviceSlugs: ["ac-service", "car-ac-service"], color: colors.blue },
  { id: "home-repair", name: "ইলেকট্রিক ও প্লাম্বিং", nameEn: "Electric & Plumbing", icon: catElectrical, serviceSlugs: ["plumbing", "electrical", "gas-stove", "wiring-service"], color: colors.amber },
  { id: "appliance-repair", name: "অ্যাপ্লায়েন্স রিপেয়ার", nameEn: "Appliance Repair", icon: catAppliance, serviceSlugs: ["appliance-repair", "fridge-service", "fridge-repair", "generator-service", "ips-ups-service", "water-purifier", "appliance-rental", "fan-service", "washing-machine", "water-pump"], color: colors.teal },
  { id: "cleaning", name: "ক্লিনিং সল্যুশন", nameEn: "Cleaning Solution", icon: catCleaning, serviceSlugs: ["cleaning", "water-tank-cleaning", "septic-tank", "sofa-cleaning"], color: colors.emerald },
  { id: "beauty", name: "বিউটি ও ওয়েলনেস", nameEn: "Beauty & Wellness", icon: catBeauty, serviceSlugs: ["salon", "spa", "bridal-makeup", "mehendi-service"], color: colors.pink },
  { id: "mens-care", name: "মেনস কেয়ার ও সেলুন", nameEn: "Men's Care & Salon", icon: catMens, serviceSlugs: ["mens-salon"], color: colors.indigo },
  { id: "shifting", name: "শিফটিং", nameEn: "Shifting", icon: catShifting, serviceSlugs: ["shifting", "office-shifting"], color: colors.orange },
  { id: "health", name: "হেলথ ও কেয়ার", nameEn: "Health & Care", icon: catHealth, serviceSlugs: ["nursing", "nursing-care", "medicine-delivery", "lab-test", "physiotherapy", "diagnostic-center", "online-doctor", "home-doctor", "health-checkup", "ambulance-ac", "icu-ambulance", "personal-trainer", "pet-care", "blood-bank", "oxygen-cylinder", "yoga-meditation", "gym-fitness", "massage-therapy"], color: colors.red },
  { id: "pest-control", name: "পেস্ট কন্ট্রোল", nameEn: "Pest Control", icon: catPest, serviceSlugs: ["pest-control", "mosquito-net", "termite-control"], color: colors.lime },
  { id: "electronics", name: "ইলেকট্রনিক্স রিপেয়ার", nameEn: "Electronics Repair", icon: catElectronics, serviceSlugs: ["laptop-repair", "mobile-battery", "mobile-screen", "mobile-repair"], color: colors.cyan },
  { id: "car-care", name: "কার ও বাইক কেয়ার", nameEn: "Car & Bike Care", icon: catCar, serviceSlugs: ["car-wash", "bike-servicing", "tyre-battery"], color: colors.sky },
  { id: "driver", name: "ড্রাইভার সার্ভিস", nameEn: "Driver Service", icon: catDriver, serviceSlugs: ["driver", "driving-school", "monthly-driver"], color: colors.slate },
  { id: "painting", name: "পেইন্টিং ও রেনোভেশন", nameEn: "Painting & Renovation", icon: catPainting, serviceSlugs: ["painting", "carpentry", "interior-design", "custom-furniture", "home-interior", "office-interior", "wall-texture"], color: colors.violet },
  { id: "home-service", name: "গৃহকর্মী ও হোম সার্ভিস", nameEn: "Home Service", icon: catHomeService, serviceSlugs: ["maid-service", "cook-service", "babysitter", "wash-iron", "dry-cleaning", "washing-service", "tiffin-service", "catering-service", "janaza-service", "locksmith", "door-repair", "furniture-repair"], color: colors.rose },
  { id: "vehicle-rental", name: "গাড়ি ভাড়া ও ট্রান্সপোর্ট", nameEn: "Vehicle Rental", icon: catVehicle, serviceSlugs: ["covered-van", "truck-rental", "pickup-van", "microbus-rent", "luxury-rent", "sedan-rent", "bike-rent", "cycle-rent"], color: colors.stone },
  { id: "it-web", name: "আইটি ও ওয়েব সার্ভিস", nameEn: "IT & Web Service", icon: catIt, serviceSlugs: ["website-development", "graphics-design", "digital-marketing", "computer-repair", "data-recovery", "networking", "software-development", "seo-service", "cyber-security", "ui-ux-design", "domain-hosting", "printing-binding", "signboard-banner"], color: colors.indigo },
  { id: "event-management", name: "ইভেন্ট ম্যানেজমেন্ট", nameEn: "Event Management", icon: catEvent, serviceSlugs: ["wedding-planning", "wedding-catering", "wedding-photography", "birthday-event", "corporate-event", "party-catering", "stage-decoration", "sound-lighting", "event-mc", "concert-cultural", "fair-management", "photography-service", "tent-pandal", "marriage-media"], color: colors.fuchsia },
  { id: "media-production", name: "মিডিয়া প্রোডাকশন", nameEn: "Media Production", icon: catMedia, serviceSlugs: ["drama-production", "commercial-production", "web-series", "short-film", "documentary", "music-video", "music-production", "voice-artist", "product-photography"], color: colors.zinc },
  { id: "education", name: "শিক্ষা ও টিউশন", nameEn: "Education & Tutoring", icon: catEducation, serviceSlugs: ["home-tutor", "online-coaching", "quran-tutor"], color: colors.blue },
  { id: "employment", name: "চাকরি ও শ্রমিক", nameEn: "Employment", icon: catEmployment, serviceSlugs: ["job-placement", "overseas-job", "skilled-worker", "daily-labor"], color: colors.amber },
  { id: "legal", name: "আইনি সার্ভিস ও ডকুমেন্ট", nameEn: "Legal & Documents", icon: catLegal, serviceSlugs: ["legal-consultation", "document-drafting", "passport-nid", "birth-certificate", "tax-return", "trade-license", "insurance-service"], color: colors.slate },
  { id: "security", name: "সিকিউরিটি ও ফায়ার সেফটি", nameEn: "Security & Fire Safety", icon: catSecurity, serviceSlugs: ["security-guard", "event-security", "fire-alarm-system", "fire-extinguisher", "cctv-installation", "access-control"], color: colors.zinc },
  { id: "construction", name: "কনস্ট্রাকশন ও লিফট", nameEn: "Construction & Lift", icon: catConstruction, serviceSlugs: ["building-construction", "renovation", "lift-installation", "lift-maintenance", "bathroom-waterproofing", "bathroom-fitting", "tiles-marble", "tiles-fitting", "welding-grill", "glass-aluminum", "iron-welding", "ss-grill", "roof-waterproofing", "mosaic-polish"], color: colors.orange },
  { id: "solar", name: "সোলার এনার্জি", nameEn: "Solar Energy", icon: catSolar, serviceSlugs: ["solar-installation", "solar-maintenance"], color: colors.yellow },
  { id: "agriculture", name: "কৃষি ও গার্ডেনিং", nameEn: "Agriculture & Garden", icon: catAgriculture, serviceSlugs: ["agri-consulting", "livestock-care", "garden-maintenance", "landscape-design"], color: colors.emerald },
  { id: "travel", name: "ট্রাভেল ও ট্যুরিজম", nameEn: "Travel & Tourism", icon: catTravel, serviceSlugs: ["air-ticket", "visa-processing", "tour-package", "hajj-umrah"], color: colors.sky },
  { id: "tailoring", name: "টেইলারিং", nameEn: "Tailoring", icon: catTailoring, serviceSlugs: ["ladies-tailoring", "gents-tailoring", "alteration"], color: colors.pink },
  { id: "courier", name: "কুরিয়ার ও ডেলিভারি", nameEn: "Courier & Delivery", icon: catCourier, serviceSlugs: ["parcel-delivery", "document-courier", "ecommerce-shipping"], color: colors.cyan },
  { id: "bill-pay", name: "বিল পে ও রিচার্জ", nameEn: "Bill Pay & Recharge", icon: catBillpay, serviceSlugs: ["bill-pay"], color: colors.teal },
  { id: "yes-mart", name: "সন্ধান মার্ট", nameEn: "Mart", icon: catMart, serviceSlugs: ["grocery-delivery", "fish-meat-market", "vegetables-fruits", "gas-cylinder", "jar-water", "cake-delivery", "money-transfer"], color: colors.emerald },
  { id: "yes-deal", name: "সন্ধান ডিল", nameEn: "Deal", icon: catYessDeal, serviceSlugs: ["buy-sell-electronics", "buy-sell-furniture", "buy-sell-vehicles", "flat-rent", "property-buy-sell"], color: colors.amber },
  { id: "gift-flower", name: "গিফট ও ফ্লাওয়ার", nameEn: "Gift & Flower", icon: catEvent, serviceSlugs: ["flower-delivery", "gift-delivery"], color: colors.rose },
];
