import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import BulkConfirmDialog from "../BulkConfirmDialog";
import BulkActionsBar from "../BulkActionsBar";
import { disabledTooltip, reasonInline } from "@/lib/permissionCopy";

/**
 * Cross-page UI render contract:
 *   The "কারণ:" + "।" formatting must come out identical wherever a
 *   disabledReason surfaces — tooltip (BulkActionsBar), dialog callout
 *   (BulkConfirmDialog body), aria-label (both), and confirm-button title.
 *
 * If any module bypasses `permissionCopy` and hand-rolls the prefix, this
 * test fails because the helper output won't match the rendered string.
 */

const REASON = "এই ভূমিকার অনুমতি নেই";
const EXPECTED_INLINE = "কারণ: এই ভূমিকার অনুমতি নেই।";
const EXPECTED_TOOLTIP = "অনুমতি নেই — কারণ: এই ভূমিকার অনুমতি নেই।";

describe("disabledReason — cross-page rendered contract", () => {
  it("permissionCopy helpers themselves emit the canonical shape", () => {
    expect(reasonInline(REASON)).toBe(EXPECTED_INLINE);
    expect(disabledTooltip(REASON)).toBe(EXPECTED_TOOLTIP);
  });

  it("BulkConfirmDialog callout renders 'কারণ: <reason>।' inside a single alert region", () => {
    render(
      <BulkConfirmDialog
        open
        onOpenChange={() => {}}
        onConfirm={() => {}}
        count={3}
        tone="delete"
        disabledReason={REASON}
      />,
    );
    const alert = screen.getByRole("alert");
    // Callout body must contain the canonical "কারণ: <reason>।" sentence.
    expect(alert.textContent || "").toContain("কারণ:");
    expect(alert.textContent || "").toContain("এই ভূমিকার অনুমতি নেই।");
    // No double-prefixing (e.g. "কারণ: কারণ:") should ever leak through.
    const matches = (alert.textContent || "").match(/কারণ:/g) || [];
    expect(matches.length).toBe(1);
  });

  it("BulkConfirmDialog confirm-button aria-label equals 'অনুমতি নেই — কারণ: <reason>।'", () => {
    render(
      <BulkConfirmDialog
        open
        onOpenChange={() => {}}
        onConfirm={() => {}}
        count={2}
        tone="approve"
        disabledReason={REASON}
      />,
    );
    // The confirm action button has aria-label using reasonInline()
    const blockedBtn = screen.getByRole("button", { name: /অনুমতি নেই/ });
    expect(blockedBtn.getAttribute("aria-label")).toBe(`অনুমতি নেই — ${EXPECTED_INLINE}`);
    expect(blockedBtn.getAttribute("title")).toBe(`অনুমতি নেই — ${EXPECTED_INLINE}`);
  });

  it("BulkActionsBar tooltip + aria-label use disabledTooltip() (identical canonical string)", () => {
    render(
      <BulkActionsBar
        count={1}
        onClear={() => {}}
        actions={[{
          key: "del", label: "মুছুন",
          onClick: () => {},
          disabled: true,
          disabledReason: REASON,
        }]}
      />,
    );
    const btn = screen.getByRole("button", { name: EXPECTED_TOOLTIP });
    expect(btn.getAttribute("title")).toBe(EXPECTED_TOOLTIP);
    expect(btn.getAttribute("aria-label")).toBe(EXPECTED_TOOLTIP);
  });

  it("trailing punctuation in raw reason is normalized — no double '।'", () => {
    // Whether the caller passes "..." or "...।", the rendered output must end
    // with a single Bengali full stop.
    const noisy = "ভূমিকার অনুমতি নেই।";
    expect(reasonInline(noisy)).toBe("কারণ: ভূমিকার অনুমতি নেই।");
    expect(disabledTooltip(noisy)).toBe("অনুমতি নেই — কারণ: ভূমিকার অনুমতি নেই।");
    expect((reasonInline(noisy).match(/।/g) || []).length).toBe(1);
  });
});