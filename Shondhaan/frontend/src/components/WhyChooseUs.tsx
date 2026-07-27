import { motion } from "framer-motion";
import { ShieldCheck, HeadphonesIcon, Sparkles, Hand, TrendingUp } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import team3dElectrician from "@/assets/team-3d-electrician.png";
import team3dCleaner from "@/assets/team-3d-cleaner.png";
import team3dPlumber from "@/assets/team-3d-plumber.png";
import team3dAcTech from "@/assets/team-3d-ac-tech.png";

const teamMembers = [
  { image: team3dElectrician, alt: "ইলেকট্রিশিয়ান" },
  { image: team3dCleaner, alt: "ক্লিনার" },
  { image: team3dPlumber, alt: "প্লাম্বার" },
  { image: team3dAcTech, alt: "এসি টেকনিশিয়ান" },
];

const WhyChooseUs = () => {
  const { t } = useLanguage();

  const safetyFeatures = [
    { icon: ShieldCheck, label: t("whyChoose.mask"), color: "from-emerald-500 to-teal-600" },
    { icon: HeadphonesIcon, label: t("whyChoose.support"), color: "from-blue-500 to-cyan-600" },
    { icon: Sparkles, label: t("whyChoose.sanitize"), color: "from-emerald-400 to-emerald-600" },
    { icon: Hand, label: t("whyChoose.gloves"), color: "from-blue-400 to-blue-600" },
  ];

  const stats = [
    { value: t("whyChoose.stat1"), label: t("whyChoose.providers"), icon: TrendingUp },
    { value: t("whyChoose.stat2"), label: t("whyChoose.orders"), icon: TrendingUp },
    { value: t("whyChoose.stat3"), label: t("whyChoose.reviews"), icon: TrendingUp },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="py-12 md:py-20 relative overflow-hidden"
    >
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl"
          animate={{ y: [0, 30, 0], x: [0, 20, 0] }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl"
          animate={{ y: [0, -30, 0], x: [0, -20, 0] }}
          transition={{ duration: 10, repeat: Infinity }}
        />
      </div>

      <div className="relative z-10">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12 md:mb-16 px-4"
        >
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-sm font-bold text-emerald-400 uppercase tracking-widest mb-3 flex items-center justify-center gap-2"
          >
            <span className="w-8 h-px bg-gradient-to-r from-transparent to-emerald-400" />
            {t("whyChoose.label")}
            <span className="w-8 h-px bg-gradient-to-l from-transparent to-emerald-400" />
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="font-heading text-3xl md:text-5xl font-bold text-foreground mb-4"
          >
            {t("whyChoose.title")}
          </motion.h2>
          <motion.div
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="w-16 h-1 mx-auto bg-gradient-to-r from-emerald-400 via-blue-400 to-emerald-400 rounded-full"
          />
        </motion.div>

        {/* 3D Team Members - Enhanced */}
        <motion.div className="flex justify-center gap-3 md:gap-8 mb-14 px-4 md:px-0 flex-wrap">
          {teamMembers.map((member, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 40, scale: 0.8 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12, duration: 0.5, type: "spring", stiffness: 100 }}
              whileHover={{ scale: 1.1, y: -12 }}
              className="relative group"
            >
              {/* Glow effect background */}
              <div className="absolute -inset-3 bg-gradient-to-r from-emerald-500/20 to-blue-500/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              {/* Card border glow */}
              <motion.div
                className="absolute -inset-1 bg-gradient-to-r from-emerald-500/0 via-blue-500/50 to-emerald-500/0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                animate={{ backgroundPosition: ["0% center", "100% center"] }}
                transition={{ duration: 3, repeat: Infinity }}
              />

              {/* <div className="relative w-full max-w-[140px] md:max-w-[180px] rounded-3xl overflow-hidden border border-emerald-500/20 group-hover:border-emerald-400/60 transition-all duration-300 bg-gradient-to-br from-slate-800/30 to-blue-900/30 backdrop-blur-sm p-2 md:p-3">
                <img
                  src={member.image}
                  alt={member.alt}
                  className="w-full aspect-square object-contain drop-shadow-2xl"
                  loading="lazy"
                  decoding="async"
                />
              </div> */}
            </motion.div>
          ))}
        </motion.div>

        {/* Safety Features - Premium Cards */}
        <motion.div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5 px-4 md:px-12 lg:mx-20 mb-12 md:mb-16">
          {safetyFeatures.map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
              whileHover={{ y: -8, transition: { duration: 0.2 } }}
              className="group relative"
            >
              {/* Background gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-primary to-slate-900 rounded-2xl" />
              
              {/* Border glow */}
              <motion.div
                className="absolute inset-0 rounded-2xl border border-emerald-500/20 group-hover:border-emerald-400/50 transition-colors duration-300"
              />

              {/* Hover glow effect */}
              <motion.div
                className="absolute -inset-px bg-gradient-to-r from-emerald-500/0 via-emerald-400/20 to-emerald-500/0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-md"
              />
              <div className="relative z-10 flex flex-col items-center rounded-2xl p-5 md:p-6 text-center backdrop-blur-sm">
                {/* Icon container with gradient */}
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  transition={{ delay: i * 0.1 + 0.1 }}
                  className={`mb-4 flex  h-14 md:h-16 w-14 md:w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${feature.color} text-white shadow-lg group-hover:shadow-2xl transition-shadow duration-300`}
                >
                  <feature.icon className="h-7 md:h-8 w-7 md:w-8" />
                </motion.div>

                {/* Text label */}
                <motion.span
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  transition={{ delay: i * 0.1 + 0.2 }}
                  className="text-xs md:text-sm font-semibold text-white whitespace-pre-line leading-snug group-hover:text-emerald-300 transition-colors duration-300"
                >
                  {feature.label}
                </motion.span>
              </div>
            </motion.div>
          ))}
        </motion.div>
{/* 
        Stats Section - Premium */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="grid grid-cols-3 gap-3 md:gap-6 px-4 md:px-12 lg:mx-20"
        >
          {stats.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 + 0.4, duration: 0.5, type: "spring" }}
              whileHover={{ scale: 1.05, y: -8 }}
              className="group relative overflow-hidden"
            >
              {/* Gradient background */}
              <div className="absolute inset-0  rounded-2xl" />

              {/* Animated border */}
              <motion.div
                className="absolute inset-0 rounded-2xl border border-emerald-500/0 group-hover:border-emerald-400/60"
                transition={{ duration: 0.3 }}
              />

              {/* Shimmer effect on hover */}
              <motion.div
                className="absolute -inset-px bg-gradient-to-r from-emerald-500/0 via-blue-400/10 to-emerald-500/0 rounded-2xl opacity-0 group-hover:opacity-100"
                initial={{ x: "-100%" }}
                whileHover={{ x: "100%" }}
                transition={{ duration: 0.6 }}
              />

              <div className="relative z-10 flex flex-col items-center rounded-2xl border border-emerald-900/20 bg-background shadow backdrop-blur-xl p-6 md:p-8 text-center">
                {/* Icon indicator */}
                <motion.div
                  initial={{ rotate: -180, opacity: 0 }}
                  whileInView={{ rotate: 0, opacity: 1 }}
                  transition={{ delay: i * 0.15 + 0.5, type: "spring" }}
                  className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600"
                >
                  <TrendingUp className="h-5 w-5 text-white" />
                </motion.div>

                {/* Stat value */}
                <motion.span
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.15 + 0.4 }}
                  className="font-heading text-2xl md:text-4xl font-bold bg-gradient-to-r from-emerald-400 via-blue-400 to-emerald-400 bg-clip-text text-transparent"
                >
                  {stat.value}
                </motion.span>

                {/* Stat label */}
                <motion.span
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  transition={{ delay: i * 0.15 + 0.5 }}
                  className="mt-2 text-xs md:text-sm font-medium text-muted-foreground group-hover:text-emerald-300 transition-colors duration-300"
                >
                  {stat.label}
                </motion.span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </motion.section>
  );
};

export default WhyChooseUs;