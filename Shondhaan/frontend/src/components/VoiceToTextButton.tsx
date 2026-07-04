import { useEffect, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

interface Props {
  onTranscript: (text: string) => void;
  lang?: "bn-BD" | "en-US";
  className?: string;
  size?: "sm" | "md";
}

/**
 * Reusable mic button that streams Web Speech API results into a callback.
 * Drop into any chat input or text field for hands-free typing.
 */
export default function VoiceToTextButton({
  onTranscript,
  lang = "bn-BD",
  className,
  size = "md",
}: Props) {
  const [listening, setListening] = useState(false);
  const recRef = useRef<any>(null);

  useEffect(() => () => recRef.current?.stop?.(), []);

  const start = () => {
    const SR =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      toast.error(
        lang === "bn-BD" ? "ভয়েস ইনপুট সাপোর্ট নেই" : "Voice input not supported"
      );
      return;
    }
    const rec = new SR();
    rec.lang = lang;
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (e: any) => {
      let text = "";
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
      onTranscript(text);
    };
    rec.onend = () => {
      setListening(false);
      haptic("light");
    };
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
    haptic("medium");
  };

  const stop = () => recRef.current?.stop?.();

  const dim = size === "sm" ? "h-8 w-8" : "h-10 w-10";

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.9 }}
      onClick={listening ? stop : start}
      aria-label={listening ? "stop voice input" : "start voice input"}
      className={cn(
        "relative inline-flex items-center justify-center rounded-full transition",
        dim,
        listening
          ? "bg-destructive text-destructive-foreground"
          : "bg-muted text-foreground hover:bg-accent",
        className
      )}
    >
      {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
      {listening && (
        <span className="absolute inset-0 animate-ping rounded-full bg-destructive/40" />
      )}
    </motion.button>
  );
}
