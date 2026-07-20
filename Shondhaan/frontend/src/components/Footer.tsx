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
    <footer className="hidden md:block glass-strong  py-10">
      <div className="app-container ">
        <div className="grid grid-cols-1 gap-18 md:grid-cols-2 lg:grid-cols-3">
          {/* Section 1: Contact & Company Info */}
          <div>
            <button onClick={() => navigate("/")} className="flex items-center gap-2 mb-4">
              {settings.logo_url ? (
                <img src={settings.logo_url} alt={settings.logo_text} className="h-8 object-contain" />
              ) : (
                <span className="font-heading text-xl font-bold text-foreground">
                  {settings.logo_text} <span className="text-gradient-green">{settings.logo_accent}</span>
                </span>
              )}
            </button>
            <p className="text-sm text-muted-foreground mb-4">
              {bn ? settings.footer_tagline_bn : settings.footer_tagline_en}
            </p>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <span>{bn ? settings.footer_address_bn : settings.footer_address_en}</span>
              </div>
              <a href={`tel:${settings.footer_phone.replace(/[^\d+]/g, "")}`} className="flex items-center gap-2 hover:text-foreground transition-colors">
                <Phone className="h-4 w-4 text-primary shrink-0" />
                <span>{settings.footer_phone}</span>
              </a>
              <a href={`mailto:${settings.footer_email}`} className="flex items-center gap-2 hover:text-foreground transition-colors">
                <Mail className="h-4 w-4 text-primary shrink-0" />
                <span>{settings.footer_email}</span>
              </a>
            </div>
          </div>

          {/* Section 2: Other Pages */}
          <div>
            <h4 className="mb-3 font-heading text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {bn ? "অন্যান্য পেইজ" : "Other Pages"}
            </h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><button onClick={() => navigate("/all-services")} className="transition-colors hover:text-foreground">{t("footer.allServices")}</button></li>
              <li><button onClick={() => navigate("/about")} className="transition-colors hover:text-foreground">{bn ? "আমাদের সম্পর্কে" : "About Us"}</button></li>
              <li><button onClick={() => navigate("/faq")} className="transition-colors hover:text-foreground">{bn ? "সচরাচর জিজ্ঞাসা" : "FAQ"}</button></li>
              <li><button onClick={() => navigate("/bookings")} className="transition-colors hover:text-foreground">{t("footer.myBookings")}</button></li>
              <li><button onClick={() => navigate("/dashboard")} className="transition-colors hover:text-foreground">{bn ? "ড্যাশবোর্ড" : "Dashboard"}</button></li>
              <li><button onClick={() => navigate("/profile")} className="transition-colors hover:text-foreground">{t("footer.profile")}</button></li>
              <li><button onClick={() => navigate("/contact")} className="transition-colors hover:text-foreground">{bn ? "যোগাযোগ" : "Contact Us"}</button></li>
            </ul>
          </div>

          {/* Section 3: Company */}
          <div>
            <h4 className="mb-3 font-heading text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {bn ? "কোম্পানি" : "Company"}
            </h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><button onClick={() => navigate("/terms")} className="transition-colors hover:text-foreground">{bn ? "শর্তাবলী" : "Terms & Conditions"}</button></li>
              <li><button onClick={() => navigate("/privacy")} className="transition-colors hover:text-foreground">{bn ? "গোপনীয়তা নীতি" : "Privacy Policy"}</button></li>
              <li><button onClick={() => navigate("/auth")} className="transition-colors hover:text-foreground">{t("footer.loginRegister")}</button></li>
              <li><button onClick={() => navigate("/join")} className="transition-colors hover:text-foreground">{bn ? "আমাদের সাথে যোগ দিন" : "Join Us"}</button></li>
              <li><button onClick={() => navigate("/mart")} className="transition-colors hover:text-foreground">{bn ? "ইয়েস মার্ট" : "Yess Mart"}</button></li>
              <li><button onClick={() => navigate("/deal")} className="transition-colors hover:text-foreground">{bn ? "ইয়েস ডিল" : "Yess Deal"}</button></li>
            </ul>
          </div>

          {/* Section 4: Apps & Social Media */}
          {/* <div>
            <h4 className="mb-3 font-heading text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {bn ? "অ্যাপ ডাউনলোড" : "Download App"}
            </h4>
            <div className="flex flex-col gap-2 mb-5">
              <a href="#" className="inline-flex items-center gap-2 rounded-lg bg-foreground px-4 py-2.5 text-xs font-medium text-background hover:opacity-90 transition-opacity w-fit">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.199l2.302 2.302a1 1 0 0 1 0 1.38l-2.302 2.302L15.396 13l2.302-2.302zM5.864 2.658L16.8 9.991l-2.302 2.302-8.634-8.635z"/></svg>
                Google Play
              </a>
              <a href="#" className="inline-flex items-center gap-2 rounded-lg bg-foreground px-4 py-2.5 text-xs font-medium text-background hover:opacity-90 transition-opacity w-fit">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
                App Store
              </a>
            </div>

            <h4 className="mb-3 font-heading text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {bn ? "সোশ্যাল মিডিয়া" : "Follow Us"}
            </h4>
            <div className="flex gap-3">
              {settings.footer_facebook && (
                <a href={settings.footer_facebook} target="_blank" rel="noopener noreferrer" className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-muted-foreground transition-colors hover:bg-primary hover:text-primary-foreground">
                  <Facebook className="h-4 w-4" />
                </a>
              )}
              {settings.footer_instagram && (
                <a href={settings.footer_instagram} target="_blank" rel="noopener noreferrer" className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-muted-foreground transition-colors hover:bg-primary hover:text-primary-foreground">
                  <Instagram className="h-4 w-4" />
                </a>
              )}
            </div>
          </div> */}
        </div>

        <div className="mt-8 border-t border-border pt-6 text-center text-xs text-muted-foreground">
          {bn ? settings.footer_copyright_bn : settings.footer_copyright_en}
        </div>
      </div>
    </footer>
  );
};

export default Footer;
