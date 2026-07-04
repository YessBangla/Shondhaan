import { ReactNode } from "react";
import letterheadBg from "@/assets/letterhead-yess-bangla.jpg";

/**
 * A4 Letterhead Layout
 * - Uses the official Yess Bangla company pad as full-page background
 * - Reserves top/bottom margins so report content never overlaps the
 *   printed header logo or the footer contact band
 * - Designed for both on-screen preview and print/PDF output
 *
 * Usage:
 *   <LetterheadLayout title="Finance Report">
 *     ...your report content...
 *   </LetterheadLayout>
 *
 * Then call window.print() or feed the rendered HTML to html2pdf/jsPDF.
 * For multi-page reports, wrap each page in <LetterheadPage>.
 */

export const LETTERHEAD_BG = letterheadBg;

// A4 dimensions in mm
export const A4 = { width: 210, height: 297 } as const;

// Reserved zones (mm) measured from the company pad image
// Header logo block ≈ top 35mm, footer contact band ≈ bottom 28mm
export const LETTERHEAD_MARGINS = {
  top: 40,    // below logo
  bottom: 32, // above footer band
  left: 18,
  right: 18,
} as const;

interface LetterheadPageProps {
  children: ReactNode;
  className?: string;
}

/** A single A4 page with the letterhead background and reserved content area. */
export const LetterheadPage = ({ children, className = "" }: LetterheadPageProps) => (
  <div
    className={`letterhead-page ${className}`}
    style={{
      width: `${A4.width}mm`,
      height: `${A4.height}mm`,
      backgroundImage: `url(${letterheadBg})`,
      backgroundSize: "100% 100%",
      backgroundRepeat: "no-repeat",
      backgroundPosition: "center",
      position: "relative",
      pageBreakAfter: "always",
      breakAfter: "page",
      boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
      margin: "0 auto 12mm auto",
      background: "white",
      backgroundColor: "white",
      // ensure background image renders on print
      WebkitPrintColorAdjust: "exact",
      printColorAdjust: "exact",
    } as React.CSSProperties}
  >
    <div
      style={{
        position: "absolute",
        top: `${LETTERHEAD_MARGINS.top}mm`,
        bottom: `${LETTERHEAD_MARGINS.bottom}mm`,
        left: `${LETTERHEAD_MARGINS.left}mm`,
        right: `${LETTERHEAD_MARGINS.right}mm`,
        overflow: "hidden",
      }}
    >
      {children}
    </div>
  </div>
);

interface LetterheadLayoutProps {
  children: ReactNode;
  title?: string;
  /** If true, wrap children in a single <LetterheadPage>. Set false to render multiple <LetterheadPage> children manually. */
  singlePage?: boolean;
}

/**
 * Top-level wrapper that injects print styles and renders one or many letterhead pages.
 * Use singlePage={false} when content spans multiple pages and you compose
 * <LetterheadPage> children yourself.
 */
const LetterheadLayout = ({ children, title, singlePage = true }: LetterheadLayoutProps) => {
  return (
    <>
      {title ? <title>{title}</title> : null}
      <style>{`
        @page {
          size: A4 portrait;
          margin: 0;
        }
        @media print {
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .letterhead-page {
            box-shadow: none !important;
            margin: 0 auto !important;
            page-break-after: always;
            break-after: page;
          }
          .letterhead-page:last-child {
            page-break-after: auto;
            break-after: auto;
          }
          .no-print { display: none !important; }
        }
        .letterhead-shell {
          background: #f1f5f9;
          min-height: 100vh;
          padding: 16px 0;
        }
        @media print {
          .letterhead-shell { background: white !important; padding: 0 !important; }
        }
      `}</style>
      <div className="letterhead-shell">
        {singlePage ? <LetterheadPage>{children}</LetterheadPage> : children}
      </div>
    </>
  );
};

export default LetterheadLayout;