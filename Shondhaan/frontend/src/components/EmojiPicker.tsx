import { useState, useRef, useEffect } from "react";
import { Smile } from "lucide-react";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  disabled?: boolean;
  buttonClassName?: string;
}

const EmojiPicker = ({ onEmojiSelect, disabled, buttonClassName }: EmojiPickerProps) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target;
      if (ref.current && target instanceof Node && !ref.current.contains(target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        disabled={disabled}
        className={buttonClassName || "flex h-10 w-10 items-center justify-center rounded-xl border border-input bg-background text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0 disabled:opacity-40"}
      >
        <Smile className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute bottom-12 right-0 z-50">
          <Picker
            data={data}
            onEmojiSelect={(emoji: any) => {
              onEmojiSelect(emoji.native);
              setOpen(false);
            }}
            theme="auto"
            previewPosition="none"
            skinTonePosition="none"
            maxFrequentRows={1}
            perLine={8}
          />
        </div>
      )}
    </div>
  );
};

export default EmojiPicker;
