import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Props { trigger: boolean; durationMs?: number; }

const COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ec4899", "#8b5cf6", "#10b981"];
const PIECES = 60;

/**
 * Lightweight CSS confetti — no canvas, no deps. Mount once, flip
 * `trigger` to true to fire. Fades itself out automatically.
 */
const SuccessConfetti = ({ trigger, durationMs = 2500 }: Props) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!trigger) return;
    setShow(true);
    const id = window.setTimeout(() => setShow(false), durationMs);
    return () => window.clearTimeout(id);
  }, [trigger, durationMs]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="pointer-events-none fixed inset-0 z-[300] overflow-hidden"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {Array.from({ length: PIECES }).map((_, i) => {
            const left = Math.random() * 100;
            const delay = Math.random() * 0.3;
            const dur = 1.6 + Math.random() * 1.2;
            const size = 6 + Math.random() * 8;
            const color = COLORS[i % COLORS.length];
            const drift = (Math.random() - 0.5) * 200;
            const rot = Math.random() * 720;
            return (
              <motion.span
                key={i}
                initial={{ y: -40, x: 0, opacity: 1, rotate: 0 }}
                animate={{ y: window.innerHeight + 40, x: drift, rotate: rot, opacity: 0 }}
                transition={{ duration: dur, delay, ease: "easeOut" }}
                style={{
                  position: "absolute",
                  left: `${left}%`,
                  top: 0,
                  width: size,
                  height: size * 0.4,
                  backgroundColor: color,
                  borderRadius: 2,
                }}
              />
            );
          })}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SuccessConfetti;