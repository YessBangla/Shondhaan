import { motion } from "framer-motion";
import { Smartphone } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import appPhone from "@/assets/app-download-phone.png";

const AppDownload = () => {
  const { t } = useLanguage();

  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="py-10 md:py-16"
    >
      <div className="mx-4 md:mx-0 rounded-2xl bg-primary/90 backdrop-blur-xl border border-primary/30 p-8 md:p-12 flex flex-col md:flex-row items-center gap-8 shadow-lg">
        <div className="flex-1 text-center md:text-left">
          <h2 className="font-heading text-xl md:text-2xl font-bold text-primary-foreground mb-2">{t("app.title")}</h2>
          <p className="text-primary-foreground/80 text-sm md:text-base mb-6">{t("app.subtitle")}</p>

          <div className="flex flex-col sm:flex-row gap-3 items-center md:items-start">
            <div className="flex items-center gap-2 rounded-lg bg-primary-foreground/10 border border-primary-foreground/20 px-4 py-2.5">
              <input
                type="tel"
                placeholder={t("app.phonePlaceholder")}
                className="bg-transparent text-sm text-primary-foreground placeholder:text-primary-foreground/50 outline-none w-48"
              />
            </div>
            <button className="rounded-lg bg-primary-foreground px-6 py-2.5 text-sm font-semibold text-primary transition-opacity hover:opacity-90">
              {t("app.getApp")}
            </button>
          </div>

          <div className="flex gap-3 mt-5 justify-center md:justify-start">
            <a href="#" className="rounded-lg bg-foreground px-4 py-2 text-xs font-medium text-background flex items-center gap-2 hover:opacity-90 transition-opacity">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.199l2.302 2.302a1 1 0 0 1 0 1.38l-2.302 2.302L15.396 13l2.302-2.302zM5.864 2.658L16.8 9.991l-2.302 2.302-8.634-8.635z"/></svg>
              Google Play
            </a>
            <a href="#" className="rounded-lg bg-foreground px-4 py-2 text-xs font-medium text-background flex items-center gap-2 hover:opacity-90 transition-opacity">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
              App Store
            </a>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="shrink-0"
        >
          <img
            src={appPhone}
            alt="App mobile view"
            className="w-44 md:w-56 drop-shadow-2xl"
            loading="lazy"
            decoding="async"
          />
        </motion.div>
      </div>
    </motion.section>
  );
};

export default AppDownload;
