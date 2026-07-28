import { motion } from "framer-motion";
import { useSiteSettings } from "@/hooks/useSiteSettings";

const PageLoader = () => {
  const { settings } = useSiteSettings();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center gap-5"
      >
        {/* Logo with glow + pulse rings */}
        <div className="relative flex h-24 w-24 items-center justify-center">
          {/* Animated rings */}
          <motion.span
            className="absolute inset-0 rounded-full border-2 border-primary/40"
            animate={{ scale: [1, 1.6], opacity: [0.7, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
          />
          <motion.span
            className="absolute inset-0 rounded-full border-2 border-primary/30"
            animate={{ scale: [1, 1.6], opacity: [0.7, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut", delay: 0.5 }}
          />
          {/* Soft glow */}
          <motion.span
            className="absolute inset-2 rounded-full bg-primary/20 blur-xl"
            animate={{ opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          />
          {/* Logo */}
          <motion.div
            animate={{ scale: [1, 1.08, 1], rotate: [0, 3, -3, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="relative z-10 flex h-16 w-16 items-center justify-center rounded-2xl bg-card shadow-lg"
          >
            {settings.logo_url ? (
              <img
                src={settings.logo_url}
                alt={settings.logo_text || "Shondhaan"}
                className="h-12 w-12 object-contain"
              />
            ) : (
              <span className="font-heading text-2xl font-black tracking-tight text-foreground">
                {settings.logo_text || "Y"}
                <span className="text-gradient-green">{settings.logo_accent || "S"}</span>
              </span>
            )}
          </motion.div>
        </div>

        {/* Animated dots */}
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-primary"
              animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default PageLoader;
