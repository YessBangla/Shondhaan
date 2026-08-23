import { Gift } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

/**
 * Mobile-only promo banner shown on the homepage between Categories
 * and Popular Services. Matches the purple "প্রথম অর্ডারে ২০% ছাড়!" tile
 * from the mobile mockup.
 */
const MobilePromoBanner = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const bn = language === "bn";

  return (
    <motion.button
      type="button"
      onClick={() => navigate("/all-services")}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
      className="md:hidden my-4 mx-4 w-[calc(100%-2rem)] flex items-center gap-3 rounded-xl bg-gradient-to-r from-primary to-green-600 px-4 py-3 text-left shadow-md active:scale-[0.98] transition-transform"
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white font-bold leading-tight">
          {bn ? "প্রথম বুকিংয়ে পাচ্ছেন ২০% ছাড়!" : "20% off on your first Booking!"}
        </p>
        <p className="mt-0.5 text-[11px] leading-tight text-white">
          {bn ? "সন্ধানের সাথে থাকুন, সুরক্ষিত ও নিশ্চিন্তে।" : "Stay with Shondhaan — safe & worry-free."}
        </p>
      </div>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20">
        <Gift className="h-5 w-5 text-white" />
      </div>
    </motion.button>
  );
};

export default MobilePromoBanner;