import { Sparkles } from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  suggestions: string[];
  onPick: (s: string) => void;
  className?: string;
}

const AIChatSuggestionChips = ({ suggestions, onPick, className = "" }: Props) => {
  if (!suggestions.length) return null;
  return (
    <div className={`flex gap-2 overflow-x-auto scrollbar-hide pb-1 ${className}`}>
      {suggestions.map((s, i) => (
        <motion.button
          key={s + i}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04 }}
          onClick={() => onPick(s)}
          className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
        >
          <Sparkles className="w-3 h-3" />
          {s}
        </motion.button>
      ))}
    </div>
  );
};

export default AIChatSuggestionChips;