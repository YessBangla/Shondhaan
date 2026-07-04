import { useState } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, type MotionValue } from "framer-motion";
import searchImg from "@/assets/onboarding-search.png";
import workersImg from "@/assets/onboarding-workers.png";
import bookingImg from "@/assets/onboarding-booking.png";
import brandLogo from "@/assets/yess-service-logo.png";

interface Slide {
  image: string;
  title: string;
  desc: string;
}

const slides: Slide[] = [
  {
    image: searchImg,
    title: "সহজে সার্ভিস খুঁজুন\nবিশ্বাসের সাথে বুক করুন",
    desc: "YESS নিয়ে এসেছে আপনার জন্য সহজ, দ্রুত এবং নির্ভরযোগ্য সার্ভিস।",
  },
  {
    image: workersImg,
    title: "ভেরিফাইড প্রোভাইডার\nনিরাপদ ও মানসম্মত",
    desc: "প্রতিটি সার্ভিস প্রোভাইডার যাচাইকৃত। মানসম্মত সেবার নিশ্চয়তা।",
  },
  {
    image: bookingImg,
    title: "ঘরে বসেই বুকিং\nদরজায় পৌঁছে যাবে সেবা",
    desc: "কয়েক ট্যাপে বুকিং দিন। সময়মতো ঘরে পৌঁছে যাবে আপনার পছন্দের সার্ভিস।",
  },
];

interface ProgressSegmentProps {
  index: number;
  step: number;
  dragX: MotionValue<number>;
  swipeWidth: number;
  isLast: boolean;
}

const ProgressSegment = ({ index, step, dragX, swipeWidth, isLast }: ProgressSegmentProps) => {
  // Base fill: completed segments = 1, current = 1, future = 0
  const baseFill = index < step ? 1 : index === step ? 1 : 0;

  // Live fill driven by drag offset
  const fill = useTransform(dragX, (x) => {
    // Swiping left (x < 0) → moving toward next step (only if not last)
    if (x < 0 && !isLast) {
      const progress = Math.min(1, -x / swipeWidth);
      if (index === step + 1) return progress; // upcoming segment fills in
      return baseFill;
    }
    // Swiping right (x > 0) → moving back to previous step
    if (x > 0 && step > 0) {
      const progress = Math.min(1, x / swipeWidth);
      if (index === step) return 1 - progress; // current segment empties out
      return baseFill;
    }
    return baseFill;
  });

  const width = useTransform(fill, (v) => `${v * 100}%`);

  return (
    <div className="relative h-1 flex-1 overflow-hidden rounded-full bg-border">
      <motion.div
        className="absolute inset-y-0 left-0 rounded-full bg-primary"
        style={{ width }}
      />
    </div>
  );
};

const OnboardingScreen = ({ onFinish }: { onFinish: () => void }) => {
  const [step, setStep] = useState(0);
  const last = step === slides.length - 1;

  // Real-time drag offset in px (negative = swiping to next, positive = swiping to prev)
  const dragX = useMotionValue(0);
  // Approx slide width used to normalize drag → progress (0..1)
  const SWIPE_WIDTH = 280;

  const next = () => {
    if (last) {
      try { localStorage.setItem("yess_onboarded", "1"); } catch {}
      onFinish();
    } else {
      setStep((s) => s + 1);
    }
  };

  const prev = () => {
    if (step > 0) setStep((s) => s - 1);
  };

  const skip = () => {
    try { localStorage.setItem("yess_onboarded", "1"); } catch {}
    onFinish();
  };

  return (
    <div
      role="region"
      aria-roledescription="onboarding carousel"
      aria-label={`Yess Service onboarding, step ${step + 1} of ${slides.length}`}
      className="fixed inset-0 z-[9998] flex flex-col bg-background"
    >
      {/* Top progress bar + step counter + skip */}
      <div className="flex items-center gap-3 px-5 pt-5">
        <a
          href="/"
          aria-label="Yess Service হোম পেজে যান"
          className="flex items-center gap-1.5 shrink-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <img
            src={brandLogo}
            alt="Yess Service লোগো"
            className="h-7 w-7 rounded-lg object-contain shadow-sm ring-1 ring-border"
          />
          <span aria-hidden="true" className="font-heading text-sm font-bold text-foreground tracking-tight">
            Yess
          </span>
        </a>
        <div
          role="progressbar"
          aria-label="অনবোর্ডিং অগ্রগতি"
          aria-valuemin={1}
          aria-valuemax={slides.length}
          aria-valuenow={step + 1}
          aria-valuetext={`ধাপ ${step + 1} / ${slides.length}`}
          className="flex flex-1 items-center gap-1.5"
        >
          {slides.map((_, i) => (
            <ProgressSegment
              key={i}
              index={i}
              step={step}
              dragX={dragX}
              swipeWidth={SWIPE_WIDTH}
              isLast={step === slides.length - 1}
            />
          ))}
        </div>
        <span aria-hidden="true" className="text-xs font-semibold tabular-nums text-muted-foreground">
          {step + 1}/{slides.length}
        </span>
        {!last ? (
          <button
            onClick={skip}
            aria-label="অনবোর্ডিং স্কিপ করে হোম পেজে যান"
            className="text-sm font-medium text-muted-foreground active:scale-95"
          >
            স্কিপ
          </button>
        ) : (
          <span className="w-[34px]" />
        )}
      </div>

      {/* Slide content */}
      <div className="relative flex flex-1 flex-col items-center justify-center px-6 text-center touch-pan-y">
        {/* Tap zones — left = previous, right = next. Sit below the slide content so buttons stay tappable. */}
        <button
          type="button"
          aria-label="পূর্ববর্তী স্লাইড"
          onClick={prev}
          disabled={step === 0}
          className="absolute inset-y-0 left-0 z-0 w-1/3 disabled:opacity-0"
        />
        <button
          type="button"
          aria-label="পরবর্তী স্লাইড"
          onClick={next}
          className="absolute inset-y-0 right-0 z-0 w-1/3"
        />
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -60 }}
            transition={{ duration: 0.3 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            style={{ x: dragX }}
            onDrag={(_, info) => dragX.set(info.offset.x)}
            onDragEnd={(_, info) => {
              dragX.set(0);
              if (info.offset.x < -60 || info.velocity.x < -300) next();
              else if (info.offset.x > 60 || info.velocity.x > 300) prev();
            }}
            className="pointer-events-none relative z-10 flex flex-col items-center gap-6"
          >
            <h1 className="whitespace-pre-line font-heading text-2xl font-bold leading-snug text-foreground">
              {slides[step].title}
            </h1>
            <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
              {slides[step].desc}
            </p>
            <div className="relative mt-4 h-72 w-full max-w-sm">
              <div className="absolute inset-0 mx-auto h-full w-full rounded-3xl bg-gradient-to-br from-primary/15 via-primary/5 to-transparent" />
              <img
                src={slides[step].image}
                alt=""
                className="relative h-full w-full object-contain"
                loading="eager"
              />
              {/* Subtle brand watermark on each slide — decorative, hidden from AT */}
              <div
                role="presentation"
                aria-hidden="true"
                className="pointer-events-none absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-background/70 px-2 py-1 backdrop-blur-md ring-1 ring-border/60 shadow-sm"
              >
                <img src={brandLogo} alt="" className="h-4 w-4 object-contain" />
                <span className="text-[10px] font-bold tracking-wide text-foreground/80">YESS</span>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
        {/* Screen-reader live announcement when slide changes */}
        <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
          ধাপ {step + 1} / {slides.length}: {slides[step].title.replace(/\n/g, " ")}
        </div>
      </div>

      {/* Dots + Next button */}
      <div className="flex flex-col items-center gap-5 px-6 pb-10">
        <div className="flex items-center gap-1.5">
          {slides.map((_, i) => (
            <motion.span
              key={i}
              animate={{
                width: i === step ? 24 : 6,
                backgroundColor:
                  i === step ? "hsl(var(--primary))" : "hsl(var(--border))",
              }}
              transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
              className="h-1.5 rounded-full"
            />
          ))}
        </div>
        <button
          onClick={next}
          className="w-full max-w-xs rounded-full bg-primary py-3.5 text-base font-bold text-primary-foreground shadow-lg active:scale-95 transition-transform"
        >
          {last ? "শুরু করুন" : "পরের ধাপ"}
        </button>
      </div>
    </div>
  );
};

export default OnboardingScreen;
