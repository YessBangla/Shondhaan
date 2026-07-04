import { useEffect, useState } from "react";
import { getMobileFloatingBottom, MOBILE_BOTTOM_NAV_HEIGHT } from "@/lib/mobileBottomOffsets";
import { Bug, X, AlertTriangle } from "lucide-react";

/**
 * Dev-only debug overlay that visualizes z-index layers and safe offsets
 * for floating UI on mobile (FAB hub, banners, bottom nav, sticky CTAs,
 * category headers). Helps spot overlap/collisions quickly.
 *
 * Activation:
 *   - Add `?debug=layers` to the URL, OR
 *   - Run `localStorage.setItem("yess:debug-layers","1")` and reload.
 * Toggle visibility with the bug button (top-left on mobile).
 */

type LayerSpec = {
  key: string;
  label: string;
  z: number;
  /** computed bottom offset string */
  bottom?: string;
  /** anchor: 'bottom' | 'top' */
  anchor: "bottom" | "top";
  /** approximate height (px) drawn in overlay */
  height: number;
  color: string; // tailwind hsl color
};

const LAYERS: LayerSpec[] = [
  // bottom-anchored
  { key: "bottom-nav", label: "MobileBottomNav", z: 50, anchor: "bottom", height: MOBILE_BOTTOM_NAV_HEIGHT, color: "59 130 246", bottom: "0px" },
  { key: "sticky-cta", label: "StickyBottomCTA / Mart sticky", z: 52, anchor: "bottom", height: 60, color: "16 185 129", bottom: getMobileFloatingBottom(0) },
  { key: "fab-trigger", label: "FAB Hub trigger", z: 57, anchor: "bottom", height: 54, color: "236 72 153", bottom: getMobileFloatingBottom(8) },
  { key: "fab-stack", label: "FAB Hub action stack", z: 56, anchor: "bottom", height: 220, color: "168 85 247", bottom: getMobileFloatingBottom(72) },
  { key: "fab-scrim", label: "FAB Hub scrim", z: 54, anchor: "bottom", height: 0, color: "100 116 139" },
  { key: "install-banner", label: "Install / iOS banner", z: 55, anchor: "bottom", height: 90, color: "245 158 11", bottom: getMobileFloatingBottom(80) },
  { key: "rating-prompt", label: "Rating prompt", z: 53, anchor: "bottom", height: 90, color: "234 88 12", bottom: getMobileFloatingBottom(12) },
  // top-anchored
  { key: "navbar", label: "Navbar (sticky)", z: 40, anchor: "top", height: 64, color: "14 165 233" },
  { key: "category-header", label: "Category header / sub-nav", z: 30, anchor: "top", height: 52, color: "139 92 246" },
];

const isEnabled = () => {
  if (typeof window === "undefined") return false;
  if (import.meta.env.PROD) {
    // In prod still allow opt-in via query param
    const sp = new URLSearchParams(window.location.search);
    if (sp.get("debug") === "layers") return true;
    return localStorage.getItem("yess:debug-layers") === "1";
  }
  const sp = new URLSearchParams(window.location.search);
  if (sp.get("debug") === "layers") return true;
  return localStorage.getItem("yess:debug-layers") === "1";
};

/** Minimum px overlap on BOTH axes to count as a collision (filters out 1-2px AA noise). */
const OVERLAP_THRESHOLD_PX = 6;
/** Max number of collisions reported in the warning panel. */
const MAX_COLLISIONS_SHOWN = 4;

type Collision = {
  a: string;
  b: string;
  overlapW: number;
  overlapH: number;
  rectA: DOMRect;
  rectB: DOMRect;
};

/**
 * Build a short label for a fixed/floating element so collision messages
 * read meaningfully ("FAB Hub trigger ↔ Sticky CTA") without dumping DOM.
 */
const labelForElement = (el: HTMLElement): string => {
  const aria = el.getAttribute("aria-label");
  if (aria) return aria;
  const data = el.getAttribute("data-debug-label");
  if (data) return data;
  // Try to derive from class names
  const cls = el.className?.toString?.() ?? "";
  if (/MobileBottomNav|bottom-nav/i.test(cls)) return "Bottom Nav";
  if (/sticky/i.test(cls)) return "Sticky CTA";
  if (/fab/i.test(cls)) return "FAB";
  if (/banner/i.test(cls)) return "Banner";
  // Fallback: tag + first id-ish token
  const id = el.id ? `#${el.id}` : "";
  return `${el.tagName.toLowerCase()}${id || `.${(cls.split(/\s+/)[0] || "el").slice(0, 18)}`}`;
};

/**
 * Scan the DOM for fixed-position elements that look like floating UI
 * (z-index >= 30, visible, on screen) and return any pairs that overlap
 * by more than the threshold. Mobile only (we only attach below md).
 */
const detectCollisions = (): Collision[] => {
  const candidates: { el: HTMLElement; rect: DOMRect; z: number; label: string }[] = [];
  const all = document.querySelectorAll<HTMLElement>("body *");
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  all.forEach((el) => {
    // Skip our own debug overlay nodes
    if (el.closest("[data-debug-overlay]")) return;
    const cs = window.getComputedStyle(el);
    if (cs.position !== "fixed") return;
    if (cs.visibility === "hidden" || cs.display === "none") return;
    if (parseFloat(cs.opacity) < 0.05) return;
    const z = parseInt(cs.zIndex, 10);
    if (!Number.isFinite(z) || z < 30) return;
    // Skip full-screen scrims/backdrops (would falsely "collide" with everything)
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    if (rect.width >= vw * 0.95 && rect.height >= vh * 0.85) return;
    // Skip elements entirely off-screen
    if (rect.bottom < 0 || rect.top > vh || rect.right < 0 || rect.left > vw) return;
    candidates.push({ el, rect, z, label: labelForElement(el) });
  });

  const collisions: Collision[] = [];
  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      const A = candidates[i];
      const B = candidates[j];
      // Skip ancestor/descendant pairs (a child rect always sits inside its parent)
      if (A.el.contains(B.el) || B.el.contains(A.el)) continue;
      const overlapW = Math.min(A.rect.right, B.rect.right) - Math.max(A.rect.left, B.rect.left);
      const overlapH = Math.min(A.rect.bottom, B.rect.bottom) - Math.max(A.rect.top, B.rect.top);
      if (overlapW > OVERLAP_THRESHOLD_PX && overlapH > OVERLAP_THRESHOLD_PX) {
        collisions.push({
          a: `${A.label} (z${A.z})`,
          b: `${B.label} (z${B.z})`,
          overlapW: Math.round(overlapW),
          overlapH: Math.round(overlapH),
          rectA: A.rect,
          rectB: B.rect,
        });
      }
    }
  }
  return collisions;
};

const MobileLayerDebugOverlay = () => {
  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(true);
  const [vh, setVh] = useState(0);
  const [vw, setVw] = useState(0);
  const [safeBottom, setSafeBottom] = useState(0);
  const [collisions, setCollisions] = useState<Collision[]>([]);
  const [warnDismissed, setWarnDismissed] = useState(false);

  useEffect(() => {
    setEnabled(isEnabled());
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const update = () => {
      setVh(window.innerHeight);
      setVw(window.innerWidth);
      // resolve env(safe-area-inset-bottom)
      const probe = document.createElement("div");
      probe.style.cssText = "position:fixed;bottom:0;height:env(safe-area-inset-bottom,0px);visibility:hidden;pointer-events:none;";
      document.body.appendChild(probe);
      const h = probe.getBoundingClientRect().height;
      document.body.removeChild(probe);
      setSafeBottom(h);
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, [enabled]);

  // Collision detection loop — runs while overlay is enabled and on mobile.
  useEffect(() => {
    if (!enabled) return;
    if (vw && vw >= 768) return;
    let raf = 0;
    let cancelled = false;
    const scan = () => {
      if (cancelled) return;
      const found = detectCollisions();
      // Only update state when the signature changes — avoids re-renders every tick.
      setCollisions((prev) => {
        const sig = (xs: Collision[]) =>
          xs.map((c) => `${c.a}|${c.b}|${c.overlapW}x${c.overlapH}`).sort().join("§");
        if (sig(prev) === sig(found)) return prev;
        // New collision appeared → un-dismiss so the user sees it
        if (found.length > prev.length) setWarnDismissed(false);
        return found;
      });
    };
    const tick = () => {
      scan();
      raf = window.setTimeout(tick, 800) as unknown as number;
    };
    tick();
    const onChange = () => scan();
    window.addEventListener("resize", onChange);
    window.addEventListener("scroll", onChange, { passive: true });
    window.addEventListener("orientationchange", onChange);
    return () => {
      cancelled = true;
      window.clearTimeout(raf);
      window.removeEventListener("resize", onChange);
      window.removeEventListener("scroll", onChange);
      window.removeEventListener("orientationchange", onChange);
    };
  }, [enabled, vw]);

  if (!enabled) return null;
  // Mobile-only by viewport
  if (vw && vw >= 768) return null;

  // Resolve a CSS bottom value (which may be `calc(env(...) + Npx)`) to a px number.
  const resolveBottomPx = (cssValue?: string) => {
    if (!cssValue) return 0;
    const probe = document.createElement("div");
    probe.style.cssText = `position:fixed;left:0;width:1px;height:1px;visibility:hidden;pointer-events:none;bottom:${cssValue};`;
    document.body.appendChild(probe);
    const rect = probe.getBoundingClientRect();
    document.body.removeChild(probe);
    // distance from bottom of viewport to top of probe
    return Math.max(0, window.innerHeight - rect.bottom + 1);
  };

  return (
    <div data-debug-overlay>
      {/* Toggle button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="fixed left-2 top-[calc(env(safe-area-inset-top,0px)+8px)] z-[9999] flex h-9 w-9 items-center justify-center rounded-full bg-black/80 text-white shadow-lg ring-1 ring-white/20 md:hidden"
        aria-label="Toggle layer debug overlay"
        style={{ touchAction: "manipulation" }}
      >
        {open ? <X className="h-4 w-4" /> : <Bug className="h-4 w-4" />}
      </button>

      {!open && null}

      {open && (
        <>
          {/* Visual band overlay */}
          <div
            aria-hidden
            className="pointer-events-none fixed inset-0 z-[9998] md:hidden"
          >
            {LAYERS.map((layer) => {
              const offsetPx = layer.anchor === "bottom" ? resolveBottomPx(layer.bottom) : 0;
              const style: React.CSSProperties = layer.anchor === "bottom"
                ? { bottom: offsetPx, height: layer.height, background: `rgba(${layer.color}, 0.18)`, borderTop: `2px dashed rgba(${layer.color},0.9)`, borderBottom: `2px dashed rgba(${layer.color},0.9)` }
                : { top: layer.key === "navbar" ? 0 : 64, height: layer.height, background: `rgba(${layer.color}, 0.18)`, borderTop: `2px dashed rgba(${layer.color},0.9)`, borderBottom: `2px dashed rgba(${layer.color},0.9)` };
              return (
                <div
                  key={layer.key}
                  className="absolute left-0 right-0 flex items-center justify-end px-2"
                  style={style}
                >
                  <span
                    className="rounded px-1.5 py-0.5 text-[10px] font-mono font-bold text-white shadow"
                    style={{ background: `rgb(${layer.color})` }}
                  >
                    z{layer.z} · {layer.label}
                    {layer.bottom ? ` · ${offsetPx}px` : ""}
                  </span>
                </div>
              );
            })}

            {/* Safe area inset markers */}
            {safeBottom > 0 && (
              <div
                className="absolute left-0 right-0 bottom-0 flex items-center justify-start px-2"
                style={{ height: safeBottom, background: "rgba(239,68,68,0.25)", borderTop: "1px solid rgba(239,68,68,0.9)" }}
              >
                <span className="rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-mono font-bold text-white">safe-area-bottom · {Math.round(safeBottom)}px</span>
              </div>
            )}
          </div>

          {/* Info panel */}
          <div
            className="fixed left-2 right-2 z-[9999] rounded-xl bg-black/85 p-2.5 text-[11px] font-mono text-white shadow-2xl ring-1 ring-white/15 md:hidden"
            style={{ top: "calc(env(safe-area-inset-top,0px) + 52px)" }}
          >
            <div className="mb-1 flex items-center justify-between">
              <span className="font-bold">🪲 Layer Debug</span>
              <span className="opacity-70">{vw}×{vh}</span>
            </div>
            <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
              {LAYERS.filter((l) => l.anchor === "bottom").map((l) => (
                <div key={l.key} className="flex items-center gap-1 truncate">
                  <span className="inline-block h-2 w-2 rounded-sm" style={{ background: `rgb(${l.color})` }} />
                  <span className="truncate">z{l.z} {l.label.split(" / ")[0]}</span>
                </div>
              ))}
            </div>
            <div className="mt-1 border-t border-white/15 pt-1 opacity-80">
              safe-bottom: {Math.round(safeBottom)}px · nav: {MOBILE_BOTTOM_NAV_HEIGHT}px
            </div>
            <div className="mt-1 flex gap-2">
              <button
                type="button"
                className="rounded bg-white/15 px-2 py-0.5 hover:bg-white/25"
                onClick={() => {
                  localStorage.removeItem("yess:debug-layers");
                  setEnabled(false);
                }}
              >
                Disable
              </button>
              <button
                type="button"
                className="rounded bg-white/15 px-2 py-0.5 hover:bg-white/25"
                onClick={() => setOpen(false)}
              >
                Hide
              </button>
            </div>
          </div>
        </>
      )}

      {/* Collision warning — shows even when overlay panel is hidden */}
      {collisions.length > 0 && !warnDismissed && (
        <>
          {/* Red outlines on the colliding rects */}
          <div aria-hidden className="pointer-events-none fixed inset-0 z-[9997] md:hidden">
            {collisions.slice(0, MAX_COLLISIONS_SHOWN).flatMap((c, i) => [
              <div
                key={`a-${i}`}
                className="absolute ring-2 ring-red-500 ring-offset-1 ring-offset-red-500/20 animate-pulse"
                style={{ left: c.rectA.left, top: c.rectA.top, width: c.rectA.width, height: c.rectA.height }}
              />,
              <div
                key={`b-${i}`}
                className="absolute ring-2 ring-red-500 ring-offset-1 ring-offset-red-500/20 animate-pulse"
                style={{ left: c.rectB.left, top: c.rectB.top, width: c.rectB.width, height: c.rectB.height }}
              />,
            ])}
          </div>

          <div
            className="fixed left-2 right-2 z-[9999] rounded-xl bg-red-600/95 p-2.5 text-[11px] font-mono text-white shadow-2xl ring-1 ring-white/30 md:hidden"
            style={{ top: `calc(env(safe-area-inset-top,0px) + ${open ? 200 : 52}px)` }}
          >
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 font-bold">
                <AlertTriangle className="h-3.5 w-3.5" />
                {collisions.length} collision{collisions.length === 1 ? "" : "s"}
              </span>
              <button
                type="button"
                className="rounded bg-white/20 px-1.5 py-0.5 hover:bg-white/30"
                onClick={() => setWarnDismissed(true)}
                aria-label="Dismiss collision warning"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
            <ul className="space-y-0.5">
              {collisions.slice(0, MAX_COLLISIONS_SHOWN).map((c, i) => (
                <li key={i} className="truncate">
                  <span className="opacity-90">{c.a}</span>
                  <span className="mx-1 opacity-70">↔</span>
                  <span className="opacity-90">{c.b}</span>
                  <span className="ml-1 rounded bg-black/30 px-1 text-[10px]">
                    {c.overlapW}×{c.overlapH}px
                  </span>
                </li>
              ))}
              {collisions.length > MAX_COLLISIONS_SHOWN && (
                <li className="opacity-80">+{collisions.length - MAX_COLLISIONS_SHOWN} more…</li>
              )}
            </ul>
          </div>
        </>
      )}
    </div>
  );
};

export default MobileLayerDebugOverlay;