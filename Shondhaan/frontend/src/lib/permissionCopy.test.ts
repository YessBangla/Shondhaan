import { describe, it, expect } from "vitest";
import { normalizeReason, reasonBody, reasonInline, disabledTooltip } from "./permissionCopy";

/**
 * Cross-module copy contract:
 *   - prefix: "কারণ: " (single space)
 *   - body:   trimmed, single-spaced
 *   - suffix: trailing Bengali full stop "।" — added if missing, never doubled
 * Every admin module surface (BulkActionsBar tooltip, BulkConfirmDialog
 * callout + AlertDialogAction title/aria-label) must produce these exact
 * strings via these helpers.
 */

describe("normalizeReason", () => {
  it("returns empty string for falsy input", () => {
    expect(normalizeReason(undefined)).toBe("");
    expect(normalizeReason(null)).toBe("");
    expect(normalizeReason("")).toBe("");
    expect(normalizeReason("   ")).toBe("");
  });

  it("collapses internal whitespace runs", () => {
    expect(normalizeReason("update    permission   missing")).toBe("update permission missing");
  });

  it("strips trailing punctuation so we can re-append a canonical one", () => {
    expect(normalizeReason("আপনার অনুমতি নেই।")).toBe("আপনার অনুমতি নেই");
    expect(normalizeReason("আপনার অনুমতি নেই.")).toBe("আপনার অনুমতি নেই");
    expect(normalizeReason("আপনার অনুমতি নেই।।।")).toBe("আপনার অনুমতি নেই");
  });
});

describe("reasonBody — used in callout body next to a separately rendered 'কারণ:' label", () => {
  it("appends a single trailing '।'", () => {
    expect(reasonBody("আপডেটের পারমিশন নেই")).toBe("আপডেটের পারমিশন নেই।");
  });
  it("never produces doubled punctuation", () => {
    expect(reasonBody("আপডেটের পারমিশন নেই।")).toBe("আপডেটের পারমিশন নেই।");
  });
  it("is empty for empty input", () => {
    expect(reasonBody("")).toBe("");
  });
});

describe("reasonInline — used in tooltip / aria-label", () => {
  it("formats as 'কারণ: <reason>।' with single space after colon", () => {
    expect(reasonInline("ডিলিটের পারমিশন নেই")).toBe("কারণ: ডিলিটের পারমিশন নেই।");
  });

  it("matches the strict cross-module shape", () => {
    const out = reasonInline("যেকোনো কারণ");
    expect(out).toMatch(/^কারণ: .+।$/);
    expect(out).not.toMatch(/  /); // no double spaces
    expect(out).not.toMatch(/।।/); // no doubled full-stops
  });

  it("returns empty for empty input (caller renders nothing)", () => {
    expect(reasonInline("")).toBe("");
    expect(reasonInline(undefined)).toBe("");
  });
});

describe("disabledTooltip — BulkActionsBar tooltip + aria-label", () => {
  it("uses 'অনুমতি নেই — কারণ: <text>।' shape when reason is given", () => {
    expect(disabledTooltip("আপডেটের পারমিশন নেই")).toBe(
      "অনুমতি নেই — কারণ: আপডেটের পারমিশন নেই।",
    );
  });

  it("falls back to a generic message when no reason provided", () => {
    expect(disabledTooltip("")).toBe("অনুমতি নেই — এই অ্যাকশনের পারমিশন নেই।");
    expect(disabledTooltip(undefined)).toBe("অনুমতি নেই — এই অ্যাকশনের পারমিশন নেই।");
  });

  it("strips and re-appends punctuation deterministically", () => {
    expect(disabledTooltip("কারণ আছে।।")).toBe("অনুমতি নেই — কারণ: কারণ আছে।");
  });
});

describe("contract: tooltip and callout both end with the same canonical phrase", () => {
  it("inline tooltip ends with '।'", () => {
    expect(reasonInline("x")).toMatch(/।$/);
    expect(disabledTooltip("x")).toMatch(/।$/);
    expect(reasonBody("x")).toMatch(/।$/);
  });
});