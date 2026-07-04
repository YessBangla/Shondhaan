import { describe, it, expect } from "vitest";
import {
  isLongRow,
  normalizeForSearch,
  filterDiffRows,
  shouldResetDiffSession,
} from "./notificationRulesDiffHelpers";

describe("isLongRow — added / changed / removed all use the same long-detection rule", () => {
  // Threshold defaults: value > 20, label > 24
  const shortLabel = "কম স্টক সীমা"; // 12 chars
  const longLabel = "এটি একটি অনেক বড় ফিল্ড লেবেল যা সীমা অতিক্রম করে"; // > 24
  const shortVal = "চালু";
  const longVal = "this-is-a-long-string-value-greater-than-twenty-chars";

  it("ADDED: from is empty (e.g. '—'), to is long → isLong = true", () => {
    expect(isLongRow({ fromDisplay: "—", toDisplay: longVal, label: shortLabel })).toBe(true);
  });

  it("REMOVED: to is empty, from is long → isLong = true", () => {
    expect(isLongRow({ fromDisplay: longVal, toDisplay: "—", label: shortLabel })).toBe(true);
  });

  it("CHANGED: both sides long → isLong = true", () => {
    expect(isLongRow({ fromDisplay: longVal, toDisplay: longVal + "!", label: shortLabel })).toBe(true);
  });

  it("CHANGED: both short values, but label is long → isLong = true", () => {
    expect(isLongRow({ fromDisplay: shortVal, toDisplay: "বন্ধ", label: longLabel })).toBe(true);
  });

  it("CHANGED: short on every axis → isLong = false (no expand affordance)", () => {
    expect(isLongRow({ fromDisplay: shortVal, toDisplay: "বন্ধ", label: shortLabel })).toBe(false);
  });

  it("ADDED edge: from missing, to short → still false (uniform rule across kinds)", () => {
    expect(isLongRow({ fromDisplay: "", toDisplay: "5", label: shortLabel })).toBe(false);
  });

  it("REMOVED edge: from short, to missing → false (uniform rule across kinds)", () => {
    expect(isLongRow({ fromDisplay: "5", toDisplay: "", label: shortLabel })).toBe(false);
  });
});

describe("normalizeForSearch — case + accent insensitivity", () => {
  it("lowercases ASCII", () => {
    expect(normalizeForSearch("LOW_STOCK")).toBe("low_stock");
  });
  it("strips Latin diacritics (é → e, ü → u)", () => {
    expect(normalizeForSearch("Café")).toBe("cafe");
    expect(normalizeForSearch("Über")).toBe("uber");
  });
  it("trims surrounding whitespace", () => {
    expect(normalizeForSearch("   স্টক   ")).toBe("স্টক");
  });
  it("leaves Bengali letters untouched", () => {
    expect(normalizeForSearch("কম স্টক")).toBe("কম স্টক");
  });
  it("returns empty string for null/undefined", () => {
    expect(normalizeForSearch(undefined as unknown as string)).toBe("");
    expect(normalizeForSearch(null as unknown as string)).toBe("");
  });
});

describe("filterDiffRows — case/accent-insensitive search", () => {
  type Row = { field: string; kind: "added" | "changed" | "removed" };
  const rows: Row[] = [
    { field: "low_stock_threshold", kind: "changed" },
    { field: "pending_bookings_threshold", kind: "added" },
    { field: "digest_frequency", kind: "removed" },
  ];
  const labelOf = (f: string) =>
    ({
      low_stock_threshold: "কম স্টক সীমা",
      pending_bookings_threshold: "অপেক্ষমাণ বুকিং",
      digest_frequency: "ডাইজেস্ট ফ্রিকোয়েন্সি",
    }[f] || "");

  it("returns all rows for empty query", () => {
    expect(filterDiffRows(rows, "", labelOf)).toHaveLength(3);
    expect(filterDiffRows(rows, "   ", labelOf)).toHaveLength(3);
  });

  it("matches by field key (case-insensitive)", () => {
    expect(filterDiffRows(rows, "LOW_STOCK", labelOf)).toEqual([rows[0]]);
  });

  it("matches by Bengali label", () => {
    expect(filterDiffRows(rows, "স্টক", labelOf)).toEqual([rows[0]]);
  });

  it("returns empty array when nothing matches", () => {
    expect(filterDiffRows(rows, "zzzzz", labelOf)).toEqual([]);
  });
});

describe("shouldResetDiffSession — UX persistence contract", () => {
  it("preview-change resets every slice (new session)", () => {
    expect(shouldResetDiffSession("preview-change")).toEqual({
      expandedDiff: true,
      search: true,
      excludedFields: true,
      lastRevert: true,
    });
  });

  it("mode-toggle retains every slice (same session: merge ⇄ overwrite)", () => {
    expect(shouldResetDiffSession("mode-toggle")).toEqual({
      expandedDiff: false,
      search: false,
      excludedFields: false,
      lastRevert: false,
    });
  });
});