import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  /** Last incoming message we should react to. */
  lastMessage?: string;
  /** Whether the most recent message came from the other side (not me). */
  isFromOther: boolean;
  /** Disable while sending / no chat yet. */
  disabled?: boolean;
  /** Selected suggestion is fed back to the parent input. */
  onPick: (text: string) => void;
}

/**
 * Lightweight, on-device "AI smart reply" chips. We classify the most
 * recent inbound message via simple keyword/intent heuristics and surface
 * three context-aware quick replies in both Bengali and English. No
 * round-trip to a model — instant, free, and offline-friendly.
 */
const SmartReplyChips = ({ lastMessage, isFromOther, disabled, onPick }: Props) => {
  const { language } = useLanguage();
  const bn = language === "bn";
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    if (!isFromOther || !lastMessage) {
      setSuggestions([]);
      return;
    }
    const m = lastMessage.toLowerCase();

    // Intent buckets (BN + EN keywords)
    const has = (...keys: string[]) => keys.some((k) => m.includes(k));

    let s: string[] = [];

    if (has("?", "কি ", "কী ", "কখন", "কত", "when", "what time", "how long", "কোথায়", "where")) {
      s = bn
        ? ["জ্বি, বলুন", "আমি বুঝতে পারিনি, আবার বলবেন?", "একটু পরে জানাচ্ছি"]
        : ["Yes, please tell me", "Could you repeat that?", "I'll let you know shortly"];
    } else if (has("আসছি", "পৌঁছে", "এসে", "on the way", "arriving", "reach", "arriv")) {
      s = bn
        ? ["ধন্যবাদ, অপেক্ষায় আছি", "ঠিক আছে", "কতক্ষণ লাগবে?"]
        : ["Thanks, I'm waiting", "Okay, sounds good", "How long will it take?"];
    } else if (has("দাম", "মূল্য", "চার্জ", "টাকা", "price", "cost", "charge", "bill", "amount")) {
      s = bn
        ? ["দাম কত হবে?", "ঠিক আছে, কনফার্ম করছি", "একটু কম রাখা যাবে?"]
        : ["What's the total?", "Okay, please confirm", "Can you offer a better price?"];
    } else if (has("সমস্যা", "issue", "problem", "wrong", "broken", "ভুল", "ভাঙা")) {
      s = bn
        ? ["খুব দুঃখিত, ঠিক করে দিচ্ছি", "বিস্তারিত পাঠাবেন প্লিজ?", "কাস্টমার কেয়ারে রিপোর্ট করছি"]
        : ["Sorry about that, fixing it", "Could you share more details?", "I'll escalate to support"];
    } else if (has("ধন্যবাদ", "thank", "thanks", "appreciat")) {
      s = bn
        ? ["আপনাকেও ধন্যবাদ 🙏", "স্বাগতম!", "আবার সার্ভিস নিতে ভুলবেন না"]
        : ["You're welcome 🙏", "Thank you too!", "Hope to serve you again"];
    } else if (has("hi", "hello", "হাই", "হ্যালো", "salam", "সালাম", "আসসালামু")) {
      s = bn
        ? ["আসসালামু আলাইকুম", "হ্যালো, কেমন আছেন?", "শুভেচ্ছা! বলুন কিভাবে সাহায্য করতে পারি"]
        : ["Walaikum assalam", "Hi! How are you?", "Hello, how can I help?"];
    } else if (has("ok", "ঠিক", "fine", "acha", "আচ্ছা")) {
      s = bn
        ? ["ধন্যবাদ", "চমৎকার", "অপেক্ষায় থাকছি"]
        : ["Thanks", "Great", "I'll be waiting"];
    } else {
      // Fallback: generic acknowledgements
      s = bn
        ? ["ঠিক আছে 👍", "ধন্যবাদ", "একটু পরে কথা বলি"]
        : ["Okay 👍", "Thanks", "Let's talk shortly"];
    }

    setSuggestions(s);
  }, [lastMessage, isFromOther]);

  if (disabled || suggestions.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className="flex items-center gap-1.5 overflow-x-auto border-t border-border/60 bg-muted/30 px-3 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <Sparkles className="h-3 w-3 shrink-0 text-primary" />
        {suggestions.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onPick(s)}
            className="shrink-0 rounded-full border border-primary/25 bg-card px-3 py-1 text-[11px] font-medium text-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary hover:bg-primary/5"
          >
            {s}
          </button>
        ))}
      </motion.div>
    </AnimatePresence>
  );
};

export default SmartReplyChips;