/**
 * Letterhead Print/PDF helper
 * ---------------------------
 * Opens a new window with the supplied HTML rendered on top of the official
 * Yess Bangla company pad (A4) and triggers the browser's print dialog so the
 * user can save it as a PDF or print it directly.
 *
 * Reserved zones (mm) measured from the company pad image:
 *   - top    : 40mm (logo block)
 *   - bottom : 32mm (contact band)
 *   - sides  : 18mm
 */

const LETTERHEAD_URL = "/images/letterhead-yess-bangla.jpg";

/**
 * Per-script font stacks. We always keep the Bengali/Latin defaults at the end
 * so glyph fallback still works when text mixes scripts (e.g. invoice numbers
 * embedded inside an Arabic subtitle).
 */
const RTL_LANGS = new Set(["ar", "he", "fa", "ur", "ps", "sd", "ckb", "yi", "dv"]);
const BASE_FONT_STACK =
  "'Hind Siliguri', 'Noto Sans Bengali', 'Segoe UI', Tahoma, sans-serif";
const RTL_FONT_STACKS: Record<string, string> = {
  ar: "'Noto Naskh Arabic', 'Noto Sans Arabic', 'Amiri', 'Geeza Pro', 'Tahoma', 'Arial', sans-serif",
  fa: "'Vazirmatn', 'Noto Naskh Arabic', 'Noto Sans Arabic', 'Tahoma', 'Arial', sans-serif",
  ur: "'Noto Nastaliq Urdu', 'Noto Naskh Arabic', 'Tahoma', 'Arial', sans-serif",
  ps: "'Noto Naskh Arabic', 'Noto Sans Arabic', 'Tahoma', 'Arial', sans-serif",
  sd: "'Noto Naskh Arabic', 'Noto Sans Arabic', 'Tahoma', 'Arial', sans-serif",
  ckb: "'Noto Naskh Arabic', 'Noto Sans Arabic', 'Tahoma', 'Arial', sans-serif",
  he: "'Noto Sans Hebrew', 'Noto Serif Hebrew', 'David', 'Arial Hebrew', 'Tahoma', 'Arial', sans-serif",
  yi: "'Noto Sans Hebrew', 'Noto Serif Hebrew', 'David', 'Arial Hebrew', 'Tahoma', 'Arial', sans-serif",
  dv: "'MV Boli', 'Noto Sans Thaana', 'Tahoma', 'Arial', sans-serif",
};

/**
 * Returns the language-aware font stack used by letterhead pages. RTL scripts
 * are pre-pended with their script-appropriate fonts but always fall back to
 * the base Bengali/Latin stack so mixed content stays legible.
 */
export function letterheadFontStack(language: string = "bn"): string {
  const code = (language || "bn").split("-")[0].toLowerCase();
  const rtl = RTL_FONT_STACKS[code];
  return rtl ? `${rtl}, ${BASE_FONT_STACK}` : BASE_FONT_STACK;
}

export function isRtlLanguage(language: string): boolean {
  return RTL_LANGS.has((language || "").split("-")[0].toLowerCase());
}

export interface PrintLetterheadOptions {
  /** Document <title> shown in the print dialog and saved-PDF filename */
  title: string;
  /** Body HTML that will be placed inside the reserved content area of each page */
  bodyHtml: string;
  /** Auto-trigger print dialog after assets load (default true) */
  autoPrint?: boolean;
  /** Extra CSS appended to the print stylesheet */
  extraCss?: string;
  /** "bn" defaults the html lang attribute to Bengali */
  language?: string;
}

export function printLetterhead({
  title,
  bodyHtml,
  autoPrint = true,
  extraCss = "",
  language = "bn",
}: PrintLetterheadOptions) {
  const win = window.open("", "_blank", "width=900,height=1200");
  if (!win) {
    return false;
  }

  const dir = isRtlLanguage(language) ? "rtl" : "ltr";
  const fontStack = letterheadFontStack(language);

  const html = `<!DOCTYPE html>
<html lang="${language}" dir="${dir}">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<style>
  @page { size: A4 portrait; margin: 0; }
  * { box-sizing: border-box; }
  html, body {
    margin: 0; padding: 0; background: #f1f5f9;
    font-family: ${fontStack};
    color: #1a1a1a;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .lh-page {
    width: 210mm;
    min-height: 297mm;
    margin: 12mm auto;
    background-image: url('${LETTERHEAD_URL}');
    background-size: 100% 100%;
    background-repeat: no-repeat;
    background-color: white;
    position: relative;
    box-shadow: 0 6px 24px rgba(0,0,0,0.10);
    page-break-after: always;
    break-after: page;
  }
  .lh-page:last-child { page-break-after: auto; break-after: auto; }
  .lh-content {
    position: absolute;
    top: 40mm; bottom: 32mm; left: 18mm; right: 18mm;
    overflow: hidden;
    font-size: 11pt;
    line-height: 1.45;
  }
  .lh-title {
    font-size: 16pt; font-weight: 800; color: #166534;
    text-align: center; margin-block: 0 4mm; margin-inline: 0;
    border-block-end: 2px solid #16a34a; padding-block-end: 3mm;
  }
  .lh-subtitle {
    text-align: center; color: #555; font-size: 10pt; margin-block-end: 6mm;
    /* Prevent overflow when long Arabic/Urdu/Persian strings render — wrap and shrink. */
    overflow-wrap: anywhere; word-break: break-word; max-inline-size: 100%;
  }
  .lh-meta {
    display: flex; justify-content: space-between;
    font-size: 9.5pt; color: #475569; margin-block-end: 4mm;
    flex-wrap: wrap; column-gap: 8px; row-gap: 2mm;
    overflow-wrap: anywhere; word-break: break-word;
  }
  .lh-section { margin-block-end: 5mm; }
  .lh-section-title {
    font-size: 10pt; font-weight: 700; color: #166534;
    text-transform: uppercase; letter-spacing: 0.5px;
    border-inline-start: 3px solid #16a34a; padding-inline-start: 6px; margin-block-end: 3mm;
  }
  table.lh-table { width: 100%; border-collapse: collapse; font-size: 10pt; }
  table.lh-table th {
    background: #f0fdf4; color: #166534; text-align: start;
    padding-block: 6px; padding-inline: 8px; border-block-end: 1px solid #bbf7d0; font-weight: 700;
  }
  table.lh-table td { padding-block: 6px; padding-inline: 8px; border-block-end: 1px solid #f1f5f9; }
  table.lh-table tr.lh-total td {
    background: #f0fdf4; font-weight: 800; color: #166534;
    border-block-start: 2px solid #16a34a;
  }
  .lh-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm 8mm; }
  .lh-row label { display: block; font-size: 8.5pt; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.4px; }
  .lh-row span { display: block; font-size: 11pt; color: #0f172a; font-weight: 600; }
  .lh-toolbar {
    position: fixed; top: 8px; right: 8px; z-index: 50;
    display: flex; gap: 6px;
  }
  .lh-toolbar button {
    background: #16a34a; color: #fff; border: 0;
    padding: 8px 14px; border-radius: 8px; font-weight: 600; cursor: pointer;
    box-shadow: 0 2px 6px rgba(0,0,0,0.15);
  }
  .lh-toolbar button.secondary { background: #64748b; }
  @media print {
    html, body { background: #fff !important; }
    .lh-page { box-shadow: none !important; margin: 0 auto !important; }
    .lh-toolbar { display: none !important; }
  }
  ${extraCss}
</style>
</head>
<body>
  <div class="lh-toolbar">
    <button onclick="window.print()">${language === "bn" ? "প্রিন্ট / PDF" : "Print / PDF"}</button>
    <button class="secondary" onclick="window.close()">${language === "bn" ? "বন্ধ" : "Close"}</button>
  </div>
  ${bodyHtml}
  <script>
    (function () {
      var img = new Image();
      img.src = ${JSON.stringify(LETTERHEAD_URL)};
      var done = function () {
        ${autoPrint ? "setTimeout(function(){ try { window.focus(); window.print(); } catch(e){} }, 400);" : ""}
      };
      if (img.complete) { done(); } else { img.onload = done; img.onerror = done; }
    })();
  </script>
</body>
</html>`;

  win.document.open();
  win.document.write(html);
  win.document.close();
  return true;
}

/**
 * Download letterhead content as a real .pdf file using html2pdf.js.
 * Renders the same letterhead pages off-screen, then captures each page
 * to canvas and assembles a multi-page A4 PDF.
 */
export async function downloadLetterheadPdf(opts: {
  title: string;
  bodyHtml: string;          // should contain one or more .lh-page nodes (use letterheadPage())
  filename?: string;
  language?: string;
  extraCss?: string;
}) {
  const { title, bodyHtml, filename, language = "bn", extraCss = "" } = opts;
  const html2pdf = (await import("html2pdf.js")).default;

  const dir = isRtlLanguage(language) ? "rtl" : "ltr";
  const fontStack = letterheadFontStack(language);

  // Build an off-screen container with the same letterhead styles.
  const wrapper = document.createElement("div");
  wrapper.setAttribute("lang", language);
  wrapper.setAttribute("dir", dir);
  wrapper.style.cssText = "position:fixed;left:-99999px;top:0;background:white;";
  wrapper.innerHTML = `
    <style>
      .lh-pdf-root, .lh-pdf-root * { box-sizing: border-box; font-family: ${fontStack}; }
      .lh-pdf-root .lh-page {
        width: 210mm; min-height: 297mm; background-color: white;
        background-image: url('${LETTERHEAD_URL}');
        background-size: 100% 100%; background-repeat: no-repeat;
        position: relative; page-break-after: always; break-after: page;
      }
      .lh-pdf-root .lh-page:last-child { page-break-after: auto; break-after: auto; }
      .lh-pdf-root .lh-content { position: absolute; top: 40mm; bottom: 32mm; left: 18mm; right: 18mm; overflow: hidden; font-size: 11pt; line-height: 1.45; color:#1a1a1a; }
      .lh-pdf-root .lh-title { font-size: 16pt; font-weight: 800; color: #166534; text-align:center; margin-block: 0 4mm; margin-inline: 0; border-block-end: 2px solid #16a34a; padding-block-end: 3mm; }
      .lh-pdf-root .lh-subtitle { text-align:center; color:#555; font-size: 10pt; margin-block-end: 6mm; overflow-wrap:anywhere; word-break:break-word; max-inline-size:100%; }
      .lh-pdf-root .lh-meta { display:flex; justify-content:space-between; font-size:9.5pt; color:#475569; margin-block-end: 4mm; flex-wrap:wrap; column-gap:8px; row-gap:2mm; overflow-wrap:anywhere; word-break:break-word; }
      .lh-pdf-root .lh-section { margin-block-end: 5mm; }
      .lh-pdf-root .lh-section-title { font-size: 10pt; font-weight: 700; color:#166534; text-transform:uppercase; letter-spacing:0.5px; border-inline-start:3px solid #16a34a; padding-inline-start:6px; margin-block-end: 3mm; }
      .lh-pdf-root table.lh-table { width: 100%; border-collapse: collapse; font-size: 10pt; }
      .lh-pdf-root table.lh-table th { background:#f0fdf4; color:#166534; text-align:start; padding-block:6px; padding-inline:8px; border-block-end:1px solid #bbf7d0; font-weight:700; }
      .lh-pdf-root table.lh-table td { padding-block:6px; padding-inline:8px; border-block-end:1px solid #f1f5f9; }
      .lh-pdf-root table.lh-table tr.lh-total td { background:#f0fdf4; font-weight:800; color:#166534; border-block-start:2px solid #16a34a; }
      .lh-pdf-root .lh-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm 8mm; }
      .lh-pdf-root .lh-row label { display:block; font-size:8.5pt; color:#94a3b8; text-transform:uppercase; letter-spacing:0.4px; }
      .lh-pdf-root .lh-row span { display:block; font-size:11pt; color:#0f172a; font-weight:600; }
      ${extraCss}
    </style>
    <div class="lh-pdf-root">${bodyHtml}</div>
  `;
  document.body.appendChild(wrapper);

  // Wait for the letterhead background image to be loaded.
  await new Promise<void>((resolve) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = LETTERHEAD_URL;
  });

  try {
    await html2pdf()
      .set({
        margin: 0,
        filename: filename || `${title.replace(/[^\w\u0980-\u09FF]+/g, "_")}.pdf`,
        image: { type: "jpeg", quality: 0.95 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff" },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        // @ts-expect-error html2pdf.js supports pagebreak; types are incomplete
        pagebreak: { mode: ["css", "legacy"], before: ".lh-page" },
      })
      .from(wrapper.querySelector(".lh-pdf-root") as HTMLElement)
      .save();
  } finally {
    wrapper.remove();
  }
}

function escapeHtml(s: string) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;",
  }[c] as string));
}

/** Convenience: wraps content in a single A4 letterhead page. */
export function letterheadPage(innerHtml: string) {
  return `<div class="lh-page"><div class="lh-content">${innerHtml}</div></div>`;
}

/**
 * Common header block (title + subtitle + meta line).
 * - `subtitle` is treated as raw HTML so callers can embed the InvoiceNumberBadge HTML.
 * - `verified` (optional) shows a green/amber dot beside the subtitle indicating
 *   whether the embedded invoice number passes our checksum.
 */
export function letterheadHeader(opts: {
  title: string;
  subtitle?: string;
  subtitleIsHtml?: boolean;
  verified?: boolean | null;
  verifiedLabel?: { ok: string; bad: string };
  left?: string;
  right?: string;
  /** Language code; controls text direction. Defaults to "bn" (LTR). */
  language?: string;
  /** Force a direction. Overrides language detection. */
  dir?: "ltr" | "rtl" | "auto";
}) {
  const { title, subtitle, subtitleIsHtml = false, verified, verifiedLabel, left, right, language = "bn", dir } = opts;
  const RTL_LANGS = new Set(["ar", "he", "fa", "ur", "ps", "sd", "ckb"]);
  const direction: "ltr" | "rtl" | "auto" =
    dir ?? (RTL_LANGS.has(language.split("-")[0].toLowerCase()) ? "rtl" : "ltr");
  const subtitleContent = subtitle ? (subtitleIsHtml ? subtitle : escapeHtml(subtitle)) : "";
  // Verified pill — uses logical `gap` + `inline-flex` so it mirrors automatically under RTL.
  const verifiedHtml =
    verified === undefined || verified === null
      ? ""
      : verified
        ? `<span dir="${direction}" style="display:inline-flex;align-items:center;gap:5px;color:#15803d;font-size:9pt;font-weight:600;white-space:nowrap;unicode-bidi:isolate;">
             <span aria-hidden="true" style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#16a34a;box-shadow:0 0 0 3px rgba(22,163,74,0.18);flex-shrink:0;"></span>
             <span>${escapeHtml(verifiedLabel?.ok ?? "Verified")}</span>
           </span>`
        : `<span dir="${direction}" style="display:inline-flex;align-items:center;gap:5px;color:#b45309;font-size:9pt;font-weight:600;white-space:nowrap;unicode-bidi:isolate;">
             <span aria-hidden="true" style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#f59e0b;box-shadow:0 0 0 3px rgba(245,158,11,0.18);flex-shrink:0;"></span>
             <span>${escapeHtml(verifiedLabel?.bad ?? "Unverified")}</span>
           </span>`;
  // In LTR Bengali/English the meta row reads "left | right".
  // In RTL the same logical order should appear visually mirrored, so we rely on
  // the parent `dir` attribute + `flex-direction: row` (auto-mirrored by UA).
  const subtitleHtml = subtitle || verifiedHtml
    ? `<div class="lh-subtitle" dir="${direction}" style="display:flex;align-items:center;justify-content:center;column-gap:10px;row-gap:4px;flex-wrap:wrap;text-align:center;unicode-bidi:isolate;">${subtitleContent}${verifiedHtml}</div>`
    : "";
  const metaHtml = (left || right)
    ? `<div class="lh-meta" dir="${direction}" style="display:flex;justify-content:space-between;align-items:center;column-gap:10px;unicode-bidi:isolate;">
         <div style="text-align:start;">${left ?? ""}</div>
         <div style="text-align:end;">${right ?? ""}</div>
       </div>`
    : "";
  return `
    <h1 class="lh-title" dir="${direction}">${escapeHtml(title)}</h1>
    ${subtitleHtml}
    ${metaHtml}
  `;
}
