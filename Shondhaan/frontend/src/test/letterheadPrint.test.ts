import { describe, it, expect } from "vitest";
import {
  letterheadHeader,
  letterheadFontStack,
  isRtlLanguage,
} from "@/lib/letterheadPrint";

describe("letterheadPrint — RTL/LTR rendering", () => {
  describe("isRtlLanguage", () => {
    it("detects Arabic, Hebrew, Persian, Urdu as RTL", () => {
      expect(isRtlLanguage("ar")).toBe(true);
      expect(isRtlLanguage("he")).toBe(true);
      expect(isRtlLanguage("fa")).toBe(true);
      expect(isRtlLanguage("ur")).toBe(true);
      expect(isRtlLanguage("ar-EG")).toBe(true);
    });
    it("treats Bengali, English, Hindi as LTR", () => {
      expect(isRtlLanguage("bn")).toBe(false);
      expect(isRtlLanguage("en")).toBe(false);
      expect(isRtlLanguage("hi")).toBe(false);
    });
  });

  describe("letterheadFontStack", () => {
    it("uses Bengali/Latin base stack for LTR languages", () => {
      const stack = letterheadFontStack("bn");
      expect(stack).toMatch(/Hind Siliguri/);
      expect(stack).toMatch(/Noto Sans Bengali/);
    });
    it("prepends Arabic fonts for ar but keeps base fallback", () => {
      const stack = letterheadFontStack("ar");
      expect(stack.indexOf("Noto Naskh Arabic")).toBeLessThan(
        stack.indexOf("Hind Siliguri"),
      );
      expect(stack).toMatch(/Hind Siliguri/);
    });
    it("uses Nastaliq for Urdu and Hebrew fonts for he", () => {
      expect(letterheadFontStack("ur")).toMatch(/Noto Nastaliq Urdu/);
      expect(letterheadFontStack("he")).toMatch(/Noto Sans Hebrew/);
    });
  });

  describe("letterheadHeader — direction & alignment", () => {
    it("renders LTR direction for English", () => {
      const html = letterheadHeader({
        title: "Invoice",
        subtitle: "YS-251101-1234",
        verified: true,
        left: "Date: 2026-04-29",
        right: "Page 1 of 1",
        language: "en",
      });
      expect(html).toMatch(/dir="ltr"/);
      expect(html).not.toMatch(/dir="rtl"/);
      // logical alignment for meta cells
      expect(html).toMatch(/text-align:start/);
      expect(html).toMatch(/text-align:end/);
    });

    it("renders RTL direction for Arabic", () => {
      const html = letterheadHeader({
        title: "فاتورة",
        subtitle: "YS-251101-1234",
        verified: true,
        left: "تاريخ",
        right: "صفحة",
        language: "ar",
      });
      expect(html).toMatch(/dir="rtl"/);
      // start/end keep mirroring under RTL — physical left/right must NOT appear
      expect(html).toMatch(/text-align:start/);
      expect(html).toMatch(/text-align:end/);
      expect(html).not.toMatch(/text-align:\s*left/);
      expect(html).not.toMatch(/text-align:\s*right/);
    });

    it("renders verified pill with no-wrap so dot stays beside label", () => {
      const html = letterheadHeader({
        title: "Invoice",
        subtitle: "YS-251101-1234",
        verified: true,
        verifiedLabel: { ok: "Verified", bad: "Unverified" },
        language: "en",
      });
      expect(html).toMatch(/white-space:nowrap/);
      expect(html).toMatch(/Verified/);
      // colored dot for verified
      expect(html).toMatch(/#16a34a/);
    });

    it("renders unverified amber pill when verified=false", () => {
      const html = letterheadHeader({
        title: "Invoice",
        subtitle: "BAD-CHECKSUM",
        verified: false,
        verifiedLabel: { ok: "Verified", bad: "Unverified" },
        language: "ar",
      });
      expect(html).toMatch(/Unverified/);
      expect(html).toMatch(/#f59e0b/);
      expect(html).toMatch(/dir="rtl"/);
    });

    it("uses logical column-gap so subtitle children mirror under RTL", () => {
      const html = letterheadHeader({
        title: "T",
        subtitle: "S",
        verified: true,
        language: "ar",
      });
      expect(html).toMatch(/column-gap:\s*10px/);
      // No physical margin-left/right that would break RTL mirroring
      expect(html).not.toMatch(/margin-left:/);
      expect(html).not.toMatch(/margin-right:/);
    });
  });
});