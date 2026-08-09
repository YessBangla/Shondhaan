import { useEffect, useRef, useState } from "react";
import { Play, Pause } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props { src: string; bars?: number; className?: string }

export default function VoiceWaveformPlayer({ src, bars = 28, className }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  // Pseudo-random heights, stable across renders
  const heights = useRef<number[]>(
    Array.from({ length: bars }, (_, i) => 30 + Math.abs(Math.sin(i * 1.7)) * 70)
  );

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => setProgress(a.currentTime / (a.duration || 1));
    const onLoad = () => setDuration(a.duration || 0);
    const onEnd = () => { setPlaying(false); setProgress(0); };
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onLoad);
    a.addEventListener("ended", onEnd);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onLoad);
      a.removeEventListener("ended", onEnd);
    };
  }, []);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else { a.play(); setPlaying(true); }
  };

  const fmt = (s: number) => {
    if (!isFinite(s)) return "0:00";
    const m = Math.floor(s / 60), sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className={cn("flex items-center gap-3 rounded-2xl bg-muted px-3 py-2", className)}>
      <button
        onClick={toggle}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-white"
      >
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 translate-x-px" />}
      </button>
      <div className="flex h-8 flex-1 items-center gap-[2px]">
        {heights.current.map((h, i) => {
          const active = i / bars <= progress;
          return (
            <span
              key={i}
              className={cn(
                "w-[3px] rounded-full transition-colors",
                active ? "bg-primary" : "bg-muted-foreground/40"
              )}
              style={{ height: `${h}%` }}
            />
          );
        })}
      </div>
      <span className="text-xs tabular-nums text-muted-foreground">{fmt(duration)}</span>
      <audio ref={audioRef} src={src} preload="metadata" />
    </div>
  );
}
