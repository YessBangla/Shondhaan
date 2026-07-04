import { useState } from "react";
import { Eye, X, Smartphone, Monitor } from "lucide-react";

/**
 * Dev-only floating toggle that visualises the right-edge FAB stack
 * for both desktop and mobile side-by-side. Helps verify spacing
 * without resizing the actual viewport.
 */
type Slot = { label: string; color: string; offset: number; shape?: "round" | "pill" | "wide" };

// Mobile stack: bottom offset above the bottom nav (76 + 12 base)
const MOBILE_STACK: Slot[] = [
  { label: "Scroll", color: "bg-muted-foreground", offset: 8, shape: "round" },
  { label: "Loyalty", color: "bg-amber-500", offset: 60, shape: "wide" },
  { label: "SpeedDial", color: "bg-primary", offset: 100, shape: "round" },
  { label: "Chat", color: "bg-emerald-500", offset: 168, shape: "round" },
  { label: "Voice", color: "bg-rose-500", offset: 236, shape: "round" },
  { label: "Matchmaker", color: "bg-violet-500", offset: 296, shape: "pill" },
];

// Desktop stack: bottom offset from viewport (24 + slot * 68)
const DESKTOP_STACK: Slot[] = [
  { label: "Scroll", color: "bg-muted-foreground", offset: 24, shape: "round" },
  { label: "WhatsApp", color: "bg-emerald-500", offset: 92, shape: "round" },
  { label: "SpeedDial", color: "bg-primary", offset: 160, shape: "round" },
  { label: "Chat", color: "bg-emerald-600", offset: 228, shape: "round" },
  { label: "Voice", color: "bg-rose-500", offset: 296, shape: "round" },
  { label: "Matchmaker", color: "bg-violet-500", offset: 364, shape: "pill" },
];

const FRAME_HEIGHT = 480;
const NAV_HEIGHT = 56;

const FabDot = ({ slot }: { slot: Slot }) => {
  const base = "absolute right-2 flex items-center justify-center text-[9px] font-medium text-white shadow-md";
  const sizing =
    slot.shape === "wide"
      ? "h-7 w-20 rounded-full px-1"
      : slot.shape === "pill"
      ? "h-9 w-24 rounded-full px-1"
      : "h-9 w-9 rounded-full";
  return (
    <div className={`${base} ${sizing} ${slot.color}`} style={{ bottom: slot.offset }}>
      {slot.label}
    </div>
  );
};

const Frame = ({
  title,
  icon: Icon,
  stack,
  showBottomNav,
  width,
}: {
  title: string;
  icon: typeof Smartphone;
  stack: Slot[];
  showBottomNav: boolean;
  width: number;
}) => (
  <div className="flex flex-col gap-2">
    <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
      <Icon className="h-3.5 w-3.5" />
      {title}
    </div>
    <div
      className="relative overflow-hidden rounded-lg border border-border bg-gradient-to-b from-muted/40 to-muted/10"
      style={{ width, height: FRAME_HEIGHT }}
    >
      {stack.map((s) => (
        <FabDot key={s.label} slot={s} />
      ))}
      {showBottomNav && (
        <div
          className="absolute inset-x-0 bottom-0 flex items-center justify-around border-t border-border bg-background/90 text-[10px] text-muted-foreground backdrop-blur"
          style={{ height: NAV_HEIGHT }}
        >
          <span>Home</span>
          <span>Cart</span>
          <span>More</span>
        </div>
      )}
    </div>
  </div>
);

const FabStackPreview = () => {
  const [open, setOpen] = useState(false);

  // Dev-only preview tool — never render in production builds
  if (!import.meta.env.DEV) return null;

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className="hidden md:flex fixed left-3 top-1/2 z-[100] -translate-y-1/2 rounded-full border border-border bg-background/90 p-2 text-muted-foreground shadow-md backdrop-blur transition hover:text-foreground"
        aria-label="Toggle FAB stack preview"
        title="Preview floating button stack"
      >
        <Eye className="h-4 w-4" />
      </button>

      {open && (
        <div className="fixed left-12 top-1/2 z-[100] -translate-y-1/2 rounded-xl border border-border bg-background/95 p-4 shadow-2xl backdrop-blur">
          <div className="mb-3 flex items-center justify-between gap-4">
            <h3 className="text-sm font-semibold">FAB stack preview</h3>
            <button
              onClick={() => setOpen(false)}
              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Close preview"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex gap-4">
            <Frame title="Mobile" icon={Smartphone} stack={MOBILE_STACK} showBottomNav width={170} />
            <Frame title="Desktop" icon={Monitor} stack={DESKTOP_STACK} showBottomNav={false} width={220} />
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground">Dev preview · spacing only</p>
        </div>
      )}
    </>
  );
};

export default FabStackPreview;
