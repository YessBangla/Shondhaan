import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, ChevronRight } from "lucide-react";
import { haptic } from "@/lib/haptics";

interface Question {
  id: string;
  q: { bn: string; en: string };
  options: { label: { bn: string; en: string }; tag: string }[];
}

const QUESTIONS: Question[] = [
  {
    id: "need",
    q: { bn: "আজকে আপনার কোন ধরনের সাহায্য দরকার?", en: "What kind of help do you need today?" },
    options: [
      { label: { bn: "ঘরের মেরামত", en: "Home repair" }, tag: "repair" },
      { label: { bn: "পরিচ্ছন্নতা", en: "Cleaning" }, tag: "cleaning" },
      { label: { bn: "স্বাস্থ্যসেবা", en: "Healthcare" }, tag: "health" },
      { label: { bn: "অন্য কিছু", en: "Something else" }, tag: "other" },
    ],
  },
  {
    id: "urgency",
    q: { bn: "কখন প্রয়োজন?", en: "How soon?" },
    options: [
      { label: { bn: "এক্ষুনি", en: "Right now" }, tag: "emergency" },
      { label: { bn: "আজকে", en: "Today" }, tag: "today" },
      { label: { bn: "এই সপ্তাহে", en: "This week" }, tag: "week" },
    ],
  },
  {
    id: "budget",
    q: { bn: "বাজেট কত?", en: "Budget range?" },
    options: [
      { label: { bn: "৳৫০০ এর নিচে", en: "Under ৳500" }, tag: "low" },
      { label: { bn: "৳৫০০–২০০০", en: "৳500–2000" }, tag: "mid" },
      { label: { bn: "৳২০০০+", en: "৳2000+" }, tag: "high" },
    ],
  },
];

const RESULT_MAP: Record<string, string> = {
  repair: "/all-services?category=mechanical",
  cleaning: "/all-services?category=cleaning",
  health: "/all-services?category=health",
  other: "/all-services",
};

interface Props {
  open: boolean;
  onClose: () => void;
}

/**
 * 3-question AI matchmaker that recommends the best service category based
 * on need, urgency, and budget. Lightweight, no AI call needed.
 */
export default function ServiceMatchmakerQuiz({ open, onClose }: Props) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const navigate = useNavigate();
  const bn = (typeof window !== "undefined" && (localStorage.getItem("yess_lang") || "bn") === "bn");

  const reset = () => {
    setStep(0);
    setAnswers({});
  };

  const pick = (qid: string, tag: string) => {
    haptic("light");
    const next = { ...answers, [qid]: tag };
    setAnswers(next);
    if (step + 1 < QUESTIONS.length) {
      setStep(step + 1);
    } else {
      // finalize
      const dest = RESULT_MAP[next.need] || "/all-services";
      const url = next.urgency === "emergency" ? `${dest}${dest.includes("?") ? "&" : "?"}emergency=1` : dest;
      haptic("success");
      onClose();
      reset();
      setTimeout(() => navigate(url), 200);
    }
  };

  const close = () => {
    onClose();
    reset();
  };

  const current = QUESTIONS[step];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={close}
          className="fixed inset-0 z-[95] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 280, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md overflow-hidden rounded-3xl bg-card shadow-2xl"
          >
            <div className="bg-gradient-to-br from-primary to-pink-500 p-5 text-primary-foreground">
              <button
                onClick={close}
                className="absolute right-3 top-3 rounded-full bg-primary-foreground/20 p-1.5 hover:bg-primary-foreground/30"
                aria-label="close"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                <h3 className="text-base font-bold">{bn ? "Yess Help মিলবৃত্তান্ত" : "Yess Help Matchmaker"}</h3>
              </div>
              <p className="mt-1 text-xs opacity-90">
                {bn ? `প্রশ্ন ${step + 1} / ${QUESTIONS.length}` : `Step ${step + 1} of ${QUESTIONS.length}`}
              </p>
              <div className="mt-3 h-1 overflow-hidden rounded-full bg-primary-foreground/20">
                <motion.div
                  className="h-full bg-primary-foreground"
                  animate={{ width: `${((step + 1) / QUESTIONS.length) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>

            <div className="p-5">
              <h4 className="mb-4 text-base font-semibold text-foreground">
                {bn ? current.q.bn : current.q.en}
              </h4>
              <ul className="space-y-2">
                {current.options.map((o) => (
                  <li key={o.tag}>
                    <button
                      onClick={() => pick(current.id, o.tag)}
                      className="group flex w-full items-center justify-between rounded-xl border border-border bg-background px-4 py-3 text-left text-sm font-medium text-foreground transition hover:border-primary hover:bg-primary/5"
                    >
                      {bn ? o.label.bn : o.label.en}
                      <ChevronRight className="h-4 w-4 text-muted-foreground transition group-hover:text-primary" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
