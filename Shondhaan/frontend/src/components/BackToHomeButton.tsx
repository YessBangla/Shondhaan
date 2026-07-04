import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Home } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const BackToHomeButton = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();

  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.5, type: "spring", stiffness: 260, damping: 20 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={() => navigate("/")}
      className="fixed bottom-20 md:bottom-6 left-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 text-sm font-semibold"
    >
      <Home className="h-4 w-4" />
      {language === "bn" ? "হোমে ফিরুন" : "Back to Home"}
    </motion.button>
  );
};

export default BackToHomeButton;
