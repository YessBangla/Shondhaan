import { ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface Props {
  label: string;
  children: ReactNode;
  /** Hold duration in ms before showing the tooltip on touch (default 380). */
  delay?: number;
}

/**
 * Wraps a single interactive element and shows a small tooltip when the user
 * long-presses it on touch devices, or hovers/focuses it on pointer devices.
 * The wrapper itself is `display: contents` so layout is unaffected.
 */
export default function LongPressTooltip({ label, children, delay = 380 }: Props) {
  const wrapperRef = useRef<HTMLSpanElement | null>(null);
  const tipRef = useRef<HTMLDivElement | null>(null);
  const timerRef = useRef<number | null>(null);
  const [open, setOpen] = useState(false);
  // Anchor (trigger) rect captured at show-time; final tooltip position is
  // computed in a layout effect once the tooltip has been measured so we can
  // clamp it inside the viewport and decide whether to flip above.
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  const [pos, setPos] = useState<{
    left: number;
    top: number;
    placement: "top" | "bottom";
    arrowLeft: number;
  } | null>(null);

  const captureAnchor = () => {
    const el = wrapperRef.current?.firstElementChild as HTMLElement | null;
    if (!el) return;
    setAnchor(el.getBoundingClientRect());
  };

  const show = () => {
    captureAnchor();
    setOpen(true);
  };
  const hide = () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setOpen(false);
    setPos(null);
    setAnchor(null);
  };

  // After the tooltip mounts (and on size/anchor changes), clamp it inside
  // the viewport with an 8px margin and flip above the trigger when there
  // isn't enough room below.
  useLayoutEffect(() => {
    if (!open || !anchor || !tipRef.current) return;
    const margin = 8;
    const gap = 6;
    const tip = tipRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const triggerCenterX = anchor.left + anchor.width / 2;
    const spaceBelow = vh - anchor.bottom;
    const placement: "top" | "bottom" =
      spaceBelow < tip.height + gap + margin && anchor.top > tip.height + gap + margin
        ? "top"
        : "bottom";

    const top =
      placement === "bottom" ? anchor.bottom + gap : anchor.top - tip.height - gap;

    // Center over the trigger, then clamp horizontally.
    let left = triggerCenterX - tip.width / 2;
    const minLeft = margin;
    const maxLeft = vw - tip.width - margin;
    if (left < minLeft) left = minLeft;
    if (left > maxLeft) left = Math.max(minLeft, maxLeft);

    // Arrow stays anchored to the trigger center, clamped to within tooltip.
    const arrowMin = 10;
    const arrowMax = tip.width - 10;
    let arrowLeft = triggerCenterX - left;
    if (arrowLeft < arrowMin) arrowLeft = arrowMin;
    if (arrowLeft > arrowMax) arrowLeft = arrowMax;

    setPos({ left, top, placement, arrowLeft });
  }, [open, anchor]);

  useEffect(() => {
    if (!open) return;
    const onScroll = () => hide();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open]);

  useEffect(() => () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
  }, []);

  const handleTouchStart = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      show();
      // Auto-hide after a moment so it doesn't linger.
      timerRef.current = window.setTimeout(() => setOpen(false), 1600);
    }, delay);
  };

  const handleTouchEndOrCancel = () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  return (
    <>
      <span
        ref={wrapperRef}
        style={{ display: "contents" }}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEndOrCancel}
        onTouchCancel={handleTouchEndOrCancel}
        onTouchMove={handleTouchEndOrCancel}
        onContextMenu={(e) => {
          // Many mobile browsers fire contextmenu on long-press; suppress it
          // so the tooltip is the only feedback.
          if (open) e.preventDefault();
        }}
      >
        {children}
      </span>
      {open && anchor &&
        createPortal(
          <div
            ref={tipRef}
            role="tooltip"
            className="pointer-events-none fixed z-[200] max-w-[min(220px,calc(100vw-16px))] whitespace-normal break-words rounded-lg bg-foreground/95 px-2.5 py-1.5 text-center text-[11px] font-medium leading-tight text-background shadow-[0_8px_24px_-6px_rgba(0,0,0,0.35)] ring-1 ring-foreground/10 backdrop-blur-sm animate-in fade-in zoom-in-95"
            style={{
              // Hide on first paint until the layout effect computes the
              // clamped position to avoid a one-frame flash off-screen.
              left: pos?.left ?? -9999,
              top: pos?.top ?? -9999,
              opacity: pos ? 1 : 0,
              transition: "opacity 80ms ease-out",
            }}
          >
            {label}
            {/* Arrow */}
            <span
              aria-hidden
              className="absolute h-2 w-2 rotate-45 bg-foreground/95 ring-1 ring-foreground/10"
              style={{
                left: (pos?.arrowLeft ?? 12) - 4,
                ...(pos?.placement === "top"
                  ? { bottom: -4 }
                  : { top: -4 }),
              }}
            />
          </div>,
          document.body
        )}
    </>
  );
}