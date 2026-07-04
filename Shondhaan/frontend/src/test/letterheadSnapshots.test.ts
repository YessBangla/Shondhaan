import { describe, it, expect } from "vitest";
import { letterheadHeader, letterheadPage } from "@/lib/letterheadPrint";

/**
 * Visual regression snapshots for letterhead PDF building blocks.
 *
 * These snapshots capture the *rendered HTML structure and inline styles* for
 * the letterhead header (`lh-title`, `lh-subtitle`, `lh-meta`) and the table
 * markup we feed into `letterheadPage()`. Any change to layout-critical CSS
 * (direction, alignment, gap, flex-wrap, overflow handling, table headers)
 * will surface as a snapshot diff and require an explicit update.
 *
 * To intentionally accept a layout change run: `vitest -u`.
 */

/** Strip volatile whitespace so snapshots stay readable. */
const norm = (html: string) => html.replace(/\s+/g, " ").trim();

describe("letterhead — visual regression snapshots", () => {
  describe("lh-subtitle + lh-meta header", () => {
    it("LTR English with verified pill", () => {
      const html = letterheadHeader({
        title: "Invoice",
        subtitle: "YS-251101-1234",
        verified: true,
        verifiedLabel: { ok: "Verified", bad: "Unverified" },
        left: "Date: 2026-04-29",
        right: "Page 1 of 1",
        language: "en",
      });
      expect(norm(html)).toMatchSnapshot();
    });

    it("RTL Arabic with verified pill mirrors via logical props", () => {
      const html = letterheadHeader({
        title: "فاتورة",
        subtitle: "YS-251101-1234",
        verified: true,
        verifiedLabel: { ok: "موثّق", bad: "غير موثّق" },
        left: "تاريخ: 2026-04-29",
        right: "صفحة 1 من 1",
        language: "ar",
      });
      expect(norm(html)).toMatchSnapshot();
    });

    it("RTL Urdu unverified pill", () => {
      const html = letterheadHeader({
        title: "رسید",
        subtitle: "BAD-CHECKSUM",
        verified: false,
        verifiedLabel: { ok: "تصدیق شدہ", bad: "غیر تصدیق شدہ" },
        language: "ur",
      });
      expect(norm(html)).toMatchSnapshot();
    });

    it("LTR Bengali default, no verified state", () => {
      const html = letterheadHeader({
        title: "চালান",
        subtitle: "YS-251101-1234",
        left: "তারিখ",
        right: "পৃষ্ঠা ১/১",
        language: "bn",
      });
      expect(norm(html)).toMatchSnapshot();
    });
  });

  describe("lh-table headers inside letterheadPage", () => {
    const tableBody = `
      <table class="lh-table">
        <thead>
          <tr><th>Item</th><th>Qty</th><th>Amount</th></tr>
        </thead>
        <tbody>
          <tr><td>Service A</td><td style="text-align:end;">2</td><td style="text-align:end;">৳ 1,200</td></tr>
          <tr class="lh-total"><td colspan="2">Total</td><td style="text-align:end;">৳ 1,200</td></tr>
        </tbody>
      </table>`;

    it("renders identical table markup regardless of direction (CSS handles mirroring)", () => {
      const page = letterheadPage(tableBody);
      expect(norm(page)).toMatchSnapshot();
    });
  });
});