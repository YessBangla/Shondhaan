import { motion } from "framer-motion";
import { ShieldCheck, HeadphonesIcon, Sparkles, Hand } from "lucide-react";
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
    { icon: ShieldCheck, label: t("whyChoose.mask") },
    { icon: HeadphonesIcon, label: t("whyChoose.support") },
    { icon: Sparkles, label: t("whyChoose.sanitize") },
    { icon: Hand, label: t("whyChoose.gloves") },
  ];

  const stats = [
    { value: t("whyChoose.stat1"), label: t("whyChoose.providers") },
    { value: t("whyChoose.stat2"), label: t("whyChoose.orders") },
    { value: t("whyChoose.stat3"), label: t("whyChoose.reviews") },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="py-10 md:py-16"
    >
      <div className="text-center mb-8">
        <p className="text-sm font-medium text-primary uppercase tracking-wider mb-1">{t("whyChoose.label")}</p>
        <h2 className="font-heading text-xl font-bold text-foreground md:text-2xl">{t("whyChoose.title")}</h2>
      </div>

      {/* 3D Team Members */}
      <div className="flex justify-center gap-2 md:gap-6 mb-8 px-4 md:px-0">
        {teamMembers.map((member, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1, duration: 0.4 }}
            whileHover={{ scale: 1.08, y: -8 }}
            className="w-1/4 max-w-[160px]"
          >
            <img
              src={member.image}
              alt={member.alt}
              className="w-full rounded-2xl object-contain drop-shadow-lg"
              loading="lazy"
              decoding="async"
            />
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 px-4 md:grid-cols-4 md:gap-6 md:px-0 mb-8">
        {safetyFeatures.map((feature, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="flex flex-col items-center rounded-xl glass-card p-5 text-center transition-shadow hover:shadow-md"
          >
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-primary">
              <feature.icon className="h-6 w-6" />
            </div>
            <span className="text-xs text-muted-foreground whitespace-pre-line leading-tight md:text-sm">
              {feature.label}
            </span>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4 px-4 md:px-0">
        {stats.map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 + 0.3 }}
            className="flex flex-col items-center rounded-xl glass-subtle p-5 text-center"
          >
            <span className="font-heading text-xl font-bold text-primary md:text-3xl">{stat.value}</span>
            <span className="mt-1 text-xs text-muted-foreground md:text-sm">{stat.label}</span>
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
};

export default WhyChooseUs;
