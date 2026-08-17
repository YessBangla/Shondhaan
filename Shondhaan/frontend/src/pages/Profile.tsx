import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProfileContent from "@/components/ProfileContent";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { ChevronLeft } from "lucide-react";

const Profile = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const bn = language === "bn";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-[44px] md:pt-[30px]" />

      <div className="mx-auto px-4 py-6 md:py-10 max-w-7xl">
        <button
          onClick={() => navigate(-1)}
          className="mb-3 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition"
        >
          <ChevronLeft className="h-4 w-4" /> {bn ? "ফিরে যান" : "Go Back"}
        </button>

        <ProfileContent showHeader />
      </div>

      <Footer />
      <div className="h-16 md:hidden" />
    </div>
  );
};

export default Profile;