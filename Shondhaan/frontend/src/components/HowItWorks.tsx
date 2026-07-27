import { motion } from "framer-motion";
import { MousePointerClick, CalendarCheck, Sofa } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import appMockup from "@/assets/app-mockup-phone.png";

const HowItWorks = () => {
  const { t } = useLanguage();

  const steps = [
    {
      icon: MousePointerClick,
      step: t("howItWorks.step1"),
      title: t("howItWorks.step1Title"),
      description: t("howItWorks.step1Desc"),
    },
    {
      icon: CalendarCheck,
      step: t("howItWorks.step2"),
      title: t("howItWorks.step2Title"),
      description: t("howItWorks.step2Desc"),
    },
    {
      icon: Sofa,
      step: t("howItWorks.step3"),
      title: t("howItWorks.step3Title"),
      description: t("howItWorks.step3Desc"),
    },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="py-10 mx-auto max-w-7xl md:py-16"
    >
      <div className="text-center mb-8">
        <p className="text-sm font-medium text-primary uppercase tracking-wider mb-1">{t("howItWorks.label")}</p>
        <h2 className="font-heading text-xl font-bold text-foreground md:text-2xl">{t("howItWorks.title")}</h2>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-8 px-4 md:px-0">
        {/* Phone mockup */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex-shrink-0"
        >
          <img
            src={appMockup}
            alt="App mobile view"
            className="w-48 md:w-64 drop-shadow-2xl"
          />
        </motion.div>

        {/* Steps */}
        <div className="flex flex-col gap-6 flex-1">
          {steps.map((item, i) => (
            <motion.div
              key={item.step}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="flex items-start gap-4"
            >
              <div className="relative shrink-0">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl glass-subtle text-primary">
                  <item.icon className="h-6 w-6" />
                </div>
                <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {item.step}
                </span>
              </div>
              <div>
                <h3 className="font-heading text-base font-semibold text-foreground mb-0.5">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.section>
  );
};

export default HowItWorks;
