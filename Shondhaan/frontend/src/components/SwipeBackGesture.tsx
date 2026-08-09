import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { haptic } from "@/lib/haptics";

const EDGE_PX = 24;          // start zone from left edge
const TRIGGER_PX = 110;      // distance to trigger back
const MAX_DRAG = 180;

/**
 * Native iOS-style edge-swipe-back. Activates only when the gesture starts
 * within `EDGE_PX` of the left edge and the user is not on the home route.
 * Renders a chevron preview that follows the finger.
 */
const SwipeBackGesture = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const triggered = useRef(false);
  const [drag, setDrag] = useState(0);

  // Disable on root home routes — nothing to go back to
  const disabled =
    location.pathname === "/" ||
    location.pathname === "/mart/home" ||
    location.pathname === "/deal" ||
    location.pathname === "/jobs";

  useEffect(() => {
    if (disabled) return;

    const onStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t.clientX > EDGE_PX) { startX.current = null; return; }
      startX.current = t.clientX;
      startY.current = t.clientY;
      triggered.current = false;
    };
    const onMove = (e: TouchEvent) => {
      if (startX.current == null) return;
      const t = e.touches[0];
      const dx = t.clientX - startX.current;
      const dy = Math.abs(t.clientY - (startY.current ?? 0));
      // Cancel if mostly vertical
      if (dy > 30 && dy > dx) { startX.current = null; setDrag(0); return; }
      if (dx <= 0) { setDrag(0); return; }
      const eased = Math.min(MAX_DRAG, dx * 0.85);
      setDrag(eased);
      if (!triggered.current && eased >= TRIGGER_PX) {
        triggered.current = true;
        haptic("medium");
      }
    };
    const onEnd = () => {
      if (startX.current == null) return;
      const shouldGoBack = drag >= TRIGGER_PX;
      startX.current = null;
      if (shouldGoBack) {
        setDrag(MAX_DRAG);
        setTimeout(() => {
          navigate(-1);
          setDrag(0);
        }, 120);
      } else {
        setDrag(0);
      }
    };

    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    window.addEventListener("touchcancel", onEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
  }, [disabled, drag, navigate]);

  if (disabled || drag <= 0) return null;
  const progress = Math.min(1, drag / TRIGGER_PX);
  const ready = drag >= TRIGGER_PX;

  return (
    <div
      className="pointer-events-none fixed left-0 top-0 z-[70] flex h-full items-center md:hidden"
      style={{ transform: `translateX(${drag - 40}px)` }}
    >
      <div
        className="flex h-14 w-10 items-center justify-center rounded-r-full bg-card/90 shadow-2xl ring-1 ring-border backdrop-blur-md transition-colors"
        style={{
          background: ready
            ? `hsl(var(--primary) / 0.95)`
            : `hsl(var(--card) / 0.9)`,
        }}
      >
        <ChevronLeft
          className={`h-5 w-5 transition-colors ${ready ? "text-white" : "text-foreground"}`}
          style={{ opacity: 0.4 + progress * 0.6 }}
        />
      </div>
    </div>
  );
};

export default SwipeBackGesture;
