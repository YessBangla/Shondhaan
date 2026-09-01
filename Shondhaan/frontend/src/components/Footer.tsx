import { Phone, Mail, MapPin, Facebook, Instagram, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSiteSettings } from "@/hooks/useSiteSettings";

const Footer = () => {
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const { settings } = useSiteSettings();
  const bn = language === "bn";
  return (
    <footer className="hidden md:block bg-gradient-to-b from-slate-950 via-blue-950 to-slate-950 relative overflow-hidden">
      {/* Decorative gradient blobs */}
      <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-500/10 to-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-emerald-500/10 to-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="app-container relative z-10 py-16">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-4">
          {/* Section 1: Contact & Company Info */}
          <div className="space-y-5">
            <button 
              onClick={() => navigate("/")} 
              className="flex items-center gap-2 mb-2 group transition-transform hover:scale-105"
            >
              {settings.logo_url ? (
                <img 
                  src={settings.logo_url} 
                  alt={settings.logo_text} 
                  className="h-8 object-contain brightness-0 invert" 
                />
              ) : (
                <span className="font-heading text-lg font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
                  {settings.logo_text} <span className="text-emerald-400">{settings.logo_accent}</span>
                </span>
              )}
            </button>
            <p className="text-sm text-slate-300/80 leading-relaxed">
              {bn ? settings.footer_tagline_bn : settings.footer_tagline_en}
            </p>
            <div className="space-y-3 text-sm text-slate-400">
              <div className="flex items-start gap-3 group">
                <div className="h-5 w-5 rounded-full bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center shrink-0 mt-0.5">
                  <MapPin className="h-3 w-3 text-white" />
                </div>
                <span className="group-hover:text-slate-200 transition-colors">{bn ? settings.footer_address_bn : settings.footer_address_en}</span>
              </div>
              <a 
                href={`tel:${settings.footer_phone.replace(/[^\d+]/g, "")}`} 
                className="flex items-center gap-3 text-slate-400 hover:text-emerald-400 transition-colors group"
              >
                <div className="h-5 w-5 rounded-full bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center shrink-0">
                  <Phone className="h-3 w-3 text-white" />
                </div>
                <span>{settings.footer_phone}</span>
              </a>
              <a 
                href={`mailto:${settings.footer_email}`} 
                className="flex items-center gap-3 text-slate-400 hover:text-blue-400 transition-colors group"
              >
                <div className="h-5 w-5 rounded-full bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center shrink-0">
                  <Mail className="h-3 w-3 text-white" />
                </div>
                <span>{settings.footer_email}</span>
              </a>
            </div>
          </div>
          {/* Section 2: Other Pages */}
          <div className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-heading text-sm font-bold uppercase tracking-wider bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
                {bn ? "নেভিগেশন" : "Navigation"}
              </h4>
              <div className="h-1 w-12 bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full" />
            </div>
            <ul className="space-y-2.5 text-sm">
              <li>
                <button 
                  onClick={() => navigate("/all-services")} 
                  className="text-slate-400 hover:text-emerald-400 transition-colors duration-200 flex items-center gap-2 group"
                >
                  <span className="h-1 w-1 rounded-full bg-emerald-500/0 group-hover:bg-emerald-500 transition-colors" />
                  {t("footer.allServices")}
                </button>
              </li>
              <li>
                <button 
                  onClick={() => navigate("/about")} 
                  className="text-slate-400 hover:text-emerald-400 transition-colors duration-200 flex items-center gap-2 group"
                >
                  <span className="h-1 w-1 rounded-full bg-emerald-500/0 group-hover:bg-emerald-500 transition-colors" />
                  {bn ? "আমাদের সম্পর্কে" : "About Us"}
                </button>
              </li>
              <li>
                <button 
                  onClick={() => navigate("/faq")} 
                  className="text-slate-400 hover:text-emerald-400 transition-colors duration-200 flex items-center gap-2 group"
                >
                  <span className="h-1 w-1 rounded-full bg-emerald-500/0 group-hover:bg-emerald-500 transition-colors" />
                  {bn ? "সচরাচর জিজ্ঞাসা" : "FAQ"}
                </button>
              </li>
              <li>
                <button 
                  onClick={() => navigate("/bookings")} 
                  className="text-slate-400 hover:text-emerald-400 transition-colors duration-200 flex items-center gap-2 group"
                >
                  <span className="h-1 w-1 rounded-full bg-emerald-500/0 group-hover:bg-emerald-500 transition-colors" />
                  {t("footer.myBookings")}
                </button>
              </li>
              <li>
                <button 
                  onClick={() => navigate("/dashboard")} 
                  className="text-slate-400 hover:text-emerald-400 transition-colors duration-200 flex items-center gap-2 group"
                >
                  <span className="h-1 w-1 rounded-full bg-emerald-500/0 group-hover:bg-emerald-500 transition-colors" />
                  {bn ? "ড্যাশবোর্ড" : "Dashboard"}
                </button>
              </li>
              <li>
                <button 
                  onClick={() => navigate("/profile")} 
                  className="text-slate-400 hover:text-emerald-400 transition-colors duration-200 flex items-center gap-2 group"
                >
                  <span className="h-1 w-1 rounded-full bg-emerald-500/0 group-hover:bg-emerald-500 transition-colors" />
                  {t("footer.profile")}
                </button>
              </li>
              <li>
                <button 
                  onClick={() => navigate("/contact")} 
                  className="text-slate-400 hover:text-emerald-400 transition-colors duration-200 flex items-center gap-2 group"
                >
                  <span className="h-1 w-1 rounded-full bg-emerald-500/0 group-hover:bg-emerald-500 transition-colors" />
                  {bn ? "যোগাযোগ" : "Contact Us"}
                </button>
              </li>
            </ul>
          </div>

          {/* Section 3: Company */}
          <div className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-heading text-sm font-bold uppercase tracking-wider bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
                {bn ? "কোম্পানি" : "Company"}
              </h4>
              <div className="h-1 w-12 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full" />
            </div>
            <ul className="space-y-2.5 text-sm">
              <li>
                <button 
                  onClick={() => navigate("/terms")} 
                  className="text-slate-400 hover:text-blue-400 transition-colors duration-200 flex items-center gap-2 group"
                >
                  <span className="h-1 w-1 rounded-full bg-blue-500/0 group-hover:bg-blue-500 transition-colors" />
                  {bn ? "শর্তাবলী" : "Terms & Conditions"}
                </button>
              </li>
              <li>
                <button 
                  onClick={() => navigate("/privacy")} 
                  className="text-slate-400 hover:text-blue-400 transition-colors duration-200 flex items-center gap-2 group"
                >
                  <span className="h-1 w-1 rounded-full bg-blue-500/0 group-hover:bg-blue-500 transition-colors" />
                  {bn ? "গোপনীয়তা নীতি" : "Privacy Policy"}
                </button>
              </li>
              <li>
                <button 
                  onClick={() => navigate("/login")} 
                  className="text-slate-400 hover:text-blue-400 transition-colors duration-200 flex items-center gap-2 group"
                >
                  <span className="h-1 w-1 rounded-full bg-blue-500/0 group-hover:bg-blue-500 transition-colors" />
                  {t("footer.loginRegister")}
                </button>
              </li>
              <li>
                <button 
                  onClick={() => navigate("/join")} 
                  className="text-slate-400 hover:text-blue-400 transition-colors duration-200 flex items-center gap-2 group"
                >
                  <span className="h-1 w-1 rounded-full bg-blue-500/0 group-hover:bg-blue-500 transition-colors" />
                  {bn ? "আমাদের সাথে যোগ দিন" : "Join Us"}
                </button>
              </li>
              <li>
                <button 
                  onClick={() => navigate("/mart")} 
                  className="text-slate-400 hover:text-blue-400 transition-colors duration-200 flex items-center gap-2 group"
                >
                  <span className="h-1 w-1 rounded-full bg-blue-500/0 group-hover:bg-blue-500 transition-colors" />
                  {bn ? "মার্ট" : "Mart"}
                </button>
              </li>
              <li>
                <button 
                  onClick={() => navigate("/deal")} 
                  className="text-slate-400 hover:text-blue-400 transition-colors duration-200 flex items-center gap-2 group"
                >
                  <span className="h-1 w-1 rounded-full bg-blue-500/0 group-hover:bg-blue-500 transition-colors" />
                  {bn ? "ডিল" : "Deal"}
                </button>
              </li>
            </ul>
          </div>

          {/* Section 4: Social Media & Apps */}
          <div className="space-y-6">
            <div>
              <div className="space-y-2 mb-4">
                <h4 className="font-heading text-sm font-bold uppercase tracking-wider bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
                  {bn ? "আমাদের অনুসরণ করুন" : "Follow Us"}
                </h4>
                <div className="h-1 w-12 bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full" />
              </div>
              <div className="flex gap-3">
                {settings.footer_facebook && (
                  <a 
                    href={settings.footer_facebook} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/20 to-blue-600/20 text-blue-400 transition-all duration-300 hover:bg-gradient-to-br hover:from-blue-500 hover:to-blue-600 hover:text-white hover:scale-110 border border-blue-500/30 hover:border-blue-400"
                  >
                    <Facebook className="h-5 w-5" />
                  </a>
                )}
                {settings.footer_instagram && (
                  <a 
                    href={settings.footer_instagram} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 text-emerald-400 transition-all duration-300 hover:bg-gradient-to-br hover:from-emerald-500 hover:to-emerald-600 hover:text-white hover:scale-110 border border-emerald-500/30 hover:border-emerald-400"
                  >
                    <Instagram className="h-5 w-5" />
                  </a>
                )}
              </div>
            </div>

            {/* <div>
              <div className="space-y-2 mb-4">
                <h4 className="font-heading text-sm font-bold uppercase tracking-wider bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
                  {bn ? "অ্যাপ ডাউনলোড করুন" : "Download App"}
                </h4>
                <div className="h-1 w-12 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full" />
              </div>
              <div className="flex flex-col gap-2">
                <a 
                  href="#" 
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-2.5 text-xs font-semibold text-white hover:from-blue-500 hover:to-blue-600 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/50 hover:-translate-y-1 w-full border border-blue-500/30"
                >
                  <Download className="h-4 w-4" />
                  Google Play
                </a>
                <a 
                  href="#" 
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-700 px-4 py-2.5 text-xs font-semibold text-white hover:from-emerald-500 hover:to-emerald-600 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/50 hover:-translate-y-1 w-full border border-emerald-500/30"
                >
                  <Download className="h-4 w-4" />
                  App Store
                </a>
              </div>
            </div> */}
          </div>
        </div>

        {/* Divider */}
        <div className="mt-12 pt-8 border-t border-slate-800/50">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <p className="text-xs text-slate-400 text-center md:text-left">
              {bn ? settings.footer_copyright_bn : settings.footer_copyright_en}
            </p>
            <div className="flex items-center justify-center gap-4 text-xs text-slate-500">
              <button 
                onClick={() => navigate("/privacy")} 
                className="hover:text-slate-300 transition-colors"
              >
                {bn ? "গোপনীয়তা" : "Privacy"}
              </button>
              <span className="w-px h-4 bg-slate-700" />
              <button 
                onClick={() => navigate("/terms")} 
                className="hover:text-slate-300 transition-colors"
              >
                {bn ? "শর্তাবলী" : "Terms"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;