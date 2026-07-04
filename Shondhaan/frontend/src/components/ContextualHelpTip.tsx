import { HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Props {
  text: string;
  side?: "top" | "right" | "bottom" | "left";
  className?: string;
}

const ContextualHelpTip = ({ text, side = "top", className = "" }: Props) => {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label="Help"
            className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-muted-foreground hover:text-primary transition-colors ${className}`}
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side={side} className="max-w-[240px] text-xs leading-relaxed">
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default ContextualHelpTip;