export const MOBILE_BOTTOM_NAV_HEIGHT = 76;
export const MOBILE_BOTTOM_NAV_GAP = 56;

export const mobileNavBottom = `calc(env(safe-area-inset-bottom, 0px) + 8px)`;

export const getMobileFloatingBottom = (extra = 0) =>
  `calc(env(safe-area-inset-bottom, 0px) + ${MOBILE_BOTTOM_NAV_HEIGHT + MOBILE_BOTTOM_NAV_GAP + extra}px)`;

/**
 * Desktop floating button stack (right edge). Each FAB is ~56px tall;
 * we use 68px gaps so buttons never overlap and the stack reads as a
 * neat vertical column from bottom to top.
 */
export const DESKTOP_FAB_BASE = 24;
export const DESKTOP_FAB_STEP = 68;

export const getDesktopFloatingBottom = (slot = 0) =>
  `${DESKTOP_FAB_BASE + slot * DESKTOP_FAB_STEP}px`;