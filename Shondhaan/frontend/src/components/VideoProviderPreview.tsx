import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Play, Pause, Volume2, VolumeX, BadgeCheck, Star } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  providerName?: string;
  providerRole?: string;
  rating?: number;
  totalJobs?: number;
  /** Optional poster image — defaults to the service image. */
  poster?: string;
  /**
   * Optional remote MP4. When omitted we render an animated visual
   * placeholder so the section still feels alive on every service page.
   */
  videoUrl?: string;
}

/**
 * "Meet your provider" mini video preview shown on service detail pages.
 * When a real intro video URL is supplied we render an inline,
 * tap-to-play HTML5 player; otherwise we show an animated parallax
 * placeholder with the provider's avatar, badge, and rating to set
 * trust before the user books.
 */
const VideoProviderPreview = ({ providerName, providerRole, rating = 4.8, totalJobs = 240, poster, videoUrl }: Props) => {
  const { language } = useLanguage();
  const bn = language === "bn";
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    return () => {
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
    };
  }, []);

  const toggle = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  };

  const name = providerName || (bn ? "যাচাইকৃত প্রোভাইডার" : "Verified Provider");
  const role = providerRole || (bn ? "এক্সপার্ট টেকনিশিয়ান" : "Expert Technician");

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/5 via-card to-accent/5"
    >
      <div className="relative aspect-video overflow-hidden bg-muted">
        {videoUrl ? (
          <>
            <video
              ref={videoRef}
              src={videoUrl}
              poster={poster}
              muted={muted}
              loop
              playsInline
              preload="metadata"
              className="h-full w-full object-cover"
              onClick={toggle}
            />
            <button
              onClick={toggle}
              aria-label={playing ? "Pause" : "Play"}
              className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors hover:bg-black/10"
            >
              {!playing && (
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/95 text-primary shadow-lg ring-4 ring-white/30 backdrop-blur transition-transform hover:scale-105">
                  <Play className="h-6 w-6 fill-current pl-0.5" />
                </span>
              )}
            </button>
            <button
              onClick={() => setMuted((m) => !m)}
              aria-label={muted ? "Unmute" : "Mute"}
              className="absolute bottom-2 right-2 rounded-full bg-black/55 p-1.5 text-white backdrop-blur"
            >
              {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
            </button>
          </>
        ) : (
          // Animated placeholder
          <>
            {poster ? (
              <img src={poster} alt={name} className="h-full w-full object-cover blur-[1px] brightness-90" />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-accent/20 to-primary/40" />
            )}
            <motion.div
              animate={{ opacity: [0.35, 0.6, 0.35] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white">
              <span className="rounded-full bg-white/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider backdrop-blur">
                {bn ? "প্রোভাইডার পরিচিতি" : "Meet your provider"}
              </span>
              <motion.span
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-white/95 text-primary shadow-xl"
              >
                <Play className="h-6 w-6 fill-current pl-0.5" />
              </motion.span>
              <p className="text-[11px] opacity-80">
                {bn ? "শীঘ্রই ভিডিও আসছে" : "Video intro coming soon"}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Provider meta */}
      <div className="flex items-center gap-3 px-3 py-2.5">
        <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/60 text-xs font-bold text-white">
          {name.charAt(0).toUpperCase()}
          <BadgeCheck className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-card text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-bold text-foreground md:text-sm">{name}</p>
          <p className="truncate text-[10px] text-muted-foreground md:text-[11px]">{role}</p>
        </div>
        <div className="text-right">
          <p className="flex items-center justify-end gap-0.5 text-xs font-bold text-foreground">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            {rating.toFixed(1)}
          </p>
          <p className="text-[9px] text-muted-foreground">
            {totalJobs}+ {bn ? "কাজ" : "jobs"}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default VideoProviderPreview;
