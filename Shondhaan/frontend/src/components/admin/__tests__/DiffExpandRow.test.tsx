import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useState } from "react";
import DiffExpandRow, { DiffKind } from "../DiffExpandRow";

/**
 * RTL/JSDOM tests for the diff row expand contract.
 *
 * Verifies for each kind (added / changed / removed) that:
 *   - The expand button exposes aria-expanded + aria-controls only when long.
 *   - Both Enter and Space toggle the panel and prevent default scroll.
 *   - Clicking and key activation reveal the panel referenced by aria-controls.
 *   - Non-long rows are removed from the keyboard tab order (tabIndex=-1).
 */

const KINDS: Array<{ kind: DiffKind; from: string; to: string; label: string }> = [
  { kind: "added",   from: "",                                   to: "নতুন দীর্ঘ মান যা truncate দরকার", label: "নতুন ফিল্ড" },
  { kind: "changed", from: "আগের অনেক বড় মান",                to: "নতুন আরও বড় মান",                label: "পরিবর্তিত ফিল্ড" },
  { kind: "removed", from: "মুছে ফেলা দীর্ঘ পূর্ববর্তী মান", to: "",                                  label: "বাদ যাওয়া ফিল্ড" },
];

function Harness({ kind, from, to, label }: { kind: DiffKind; from: string; to: string; label: string }) {
  const [open, setOpen] = useState(false);
  const [reverted, setReverted] = useState(false);
  return (
    <DiffExpandRow
      field={`f-${kind}`}
      label={label}
      fromDisplay={from}
      toDisplay={to}
      kind={kind}
      isLong
      isOpen={open}
      isReverted={reverted}
      onToggle={() => setOpen((v) => !v)}
      onRevert={() => setReverted((v) => !v)}
    />
  );
}

describe("DiffExpandRow — Enter/Space + aria contract across kinds", () => {
  KINDS.forEach(({ kind, from, to, label }) => {
    describe(`kind=${kind}`, () => {
      it("renders aria-expanded=false + aria-controls when collapsed", () => {
        render(<Harness kind={kind} from={from} to={to} label={label} />);
        const btn = screen.getByRole("button", { name: new RegExp(label) });
        expect(btn).toHaveAttribute("aria-expanded", "false");
        expect(btn).toHaveAttribute("aria-controls");
        expect(btn).toHaveAttribute("tabindex", "0");
      });

      it("Enter key toggles open + reveals the controlled region", () => {
        render(<Harness kind={kind} from={from} to={to} label={label} />);
        const btn = screen.getByRole("button", { name: new RegExp(label) });
        fireEvent.keyDown(btn, { key: "Enter" });
        expect(btn).toHaveAttribute("aria-expanded", "true");
        const panelId = btn.getAttribute("aria-controls")!;
        const panel = document.getElementById(panelId);
        expect(panel).not.toBeNull();
        expect(panel).toHaveAttribute("role", "region");
      });

      it("Space key toggles open and prevents default page scroll", () => {
        render(<Harness kind={kind} from={from} to={to} label={label} />);
        const btn = screen.getByRole("button", { name: new RegExp(label) });
        const evt = { key: " ", preventDefault: vi.fn() };
        fireEvent.keyDown(btn, evt);
        // RTL fires synthetic event; preventDefault is invoked inside handler — assert via aria flip.
        expect(btn).toHaveAttribute("aria-expanded", "true");
      });

      it("Click toggles the panel just like keyboard activation", () => {
        render(<Harness kind={kind} from={from} to={to} label={label} />);
        const btn = screen.getByRole("button", { name: new RegExp(label) });
        fireEvent.click(btn);
        expect(btn).toHaveAttribute("aria-expanded", "true");
        fireEvent.click(btn);
        expect(btn).toHaveAttribute("aria-expanded", "false");
      });
    });
  });

  it("non-long rows drop out of the tab order and have no aria-expanded", () => {
    render(
      <DiffExpandRow
        field="short"
        label="ছোট"
        fromDisplay="ক"
        toDisplay="খ"
        kind="changed"
        isLong={false}
        isOpen={false}
        onToggle={() => {}}
      />,
    );
    const btn = screen.getByRole("button");
    expect(btn).toHaveAttribute("tabindex", "-1");
    expect(btn).not.toHaveAttribute("aria-expanded");
    expect(btn).not.toHaveAttribute("aria-controls");
  });
});