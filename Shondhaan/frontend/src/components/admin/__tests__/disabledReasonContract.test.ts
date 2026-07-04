import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Cross-module contract test.
 *
 * All bulk-action surfaces (`BulkActionsBar` tooltip + `BulkConfirmDialog`
 * callout/title/aria-label) must produce the standardized "কারণ: <reason>।"
 * shape. Both shared components route through `@/lib/permissionCopy`, so as
 * long as every admin module passes its `disabledReason` straight into those
 * components (rather than rendering a custom string), the format is
 * guaranteed. This test pins that guarantee.
 */

const ROOT = join(__dirname, "..", "..", "..", "..");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

const ADMIN_MODULES = [
  "src/pages/admin/AdminUsers.tsx",
  "src/pages/admin/AdminBookings.tsx",
  "src/pages/admin/AdminDisputes.tsx",
  "src/pages/admin/AdminApprovalQueue.tsx",
  "src/components/admin/AdminDealManagement.tsx",
  "src/components/admin/AdminServiceRequests.tsx",
];

describe("disabledReason cross-module contract", () => {
  it("BulkConfirmDialog renders 'কারণ:' via the shared helper, not a hardcoded raw string", () => {
    const src = read("src/components/admin/BulkConfirmDialog.tsx");
    expect(src).toMatch(/from "@\/lib\/permissionCopy"/);
    expect(src).toMatch(/reasonInline\(disabledReason\)/);
    expect(src).toMatch(/reasonBody\(disabledReason\)/);
  });

  it("BulkActionsBar tooltip + aria-label go through disabledTooltip()", () => {
    const src = read("src/components/admin/BulkActionsBar.tsx");
    expect(src).toMatch(/from "@\/lib\/permissionCopy"/);
    // Both attributes use the helper (no hand-rolled fallbacks).
    expect(src).toMatch(/title=\{a\.disabled \? disabledTooltip\(a\.disabledReason\)/);
    expect(src).toMatch(/aria-label=\{a\.disabled \? disabledTooltip\(a\.disabledReason\)/);
  });

  it.each(ADMIN_MODULES)(
    "%s passes disabledReason via perms.reasonFor / shared helper (no hand-rolled prefixes)",
    (modulePath) => {
      const src = read(modulePath);
      // Every disabledReason value flows through perms.reasonFor(...) (or an
      // alias variable populated from it), which the shared dialog/bar then
      // formats. We forbid hand-rolled "কারণ: …" or "অনুমতি নেই — …" strings
      // assigned to disabledReason in these modules.
      const lines = src.split("\n");
      lines.forEach((line, i) => {
        if (!line.includes("disabledReason")) return;
        // Allowed: disabledReason: perms.reasonFor(...), or referencing a
        // variable like updateReason / deleteReason that holds the raw text.
        const isHardcodedPrefix = /disabledReason\s*[:=]\s*["'`].*কারণ:/.test(line) ||
          /disabledReason\s*[:=]\s*["'`].*অনুমতি নেই/.test(line);
        expect(
          isHardcodedPrefix,
          `${modulePath}:${i + 1} should not hand-roll a 'কারণ:' / 'অনুমতি নেই' prefix in disabledReason — let permissionCopy format it.\n  → ${line.trim()}`,
        ).toBe(false);
      });
    },
  );
});