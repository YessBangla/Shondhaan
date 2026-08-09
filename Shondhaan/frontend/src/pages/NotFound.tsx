import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Home, SearchX } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useSEO } from "@/hooks/useSEO";

const NotFound = () => {
  const navigate = useNavigate();

  useSEO({
    title: "Page Not Found",
    description:
      "The page you are looking for does not exist or has been moved. Return to Shondhaan home.",
    noindex: true,
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-[44px] md:pt-[104px]" />

      <div className="mx-auto max-w-md px-4 flex flex-col items-center justify-center min-h-[65vh] text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-secondary">
            <SearchX className="h-10 w-10 text-muted-foreground" />
          </div>
          <h1 className="font-heading text-5xl font-bold text-primary mb-3">৪০৪</h1>
          <h2 className="font-heading text-xl font-bold text-foreground mb-2">
            পেজটি পাওয়া যায়নি
          </h2>
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            আপনি যে পেজটি খুঁজছেন তা বিদ্যমান নেই বা সরিয়ে ফেলা হয়েছে।
          </p>
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
          >
            <Home className="h-4 w-4" /> হোমে ফিরুন
          </button>
        </motion.div>
      </div>

      <Footer />
      <div className="h-16 md:hidden" />
    </div>
  );
};

export default NotFound;
