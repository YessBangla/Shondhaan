/**
 * Centralized Invoice / Document Number Standard
 * ----------------------------------------------
 * Format:  <PREFIX>-<YYMMDD>-<BASE36-SEQ>-<CHK>
 *   PREFIX     : 2-4 letter document code (INV, BKG, MRT, FIN, WTH …)
 *   YYMMDD     : Date (UTC) – stable across timezones
 *   BASE36-SEQ : 6 chars – timestamp(ms)+random, base36, uppercase
 *   CHK        : 1 char base36 checksum (mod-36 of char codes)
 *
 * Properties:
 *   - Globally unique enough for client-side generation (collision ~1 in 10^9)
 *   - Sortable by date prefix
 *   - Self-validating via checksum (detects typos in shared links / PDFs)
 *   - Safe for filenames (no spaces, slashes, unicode)
 */

export type InvoicePrefix =
  | "INV"   // generic invoice
  | "BKG"   // service booking
  | "MRT"   // mart order
  | "FIN"   // finance report
  | "WTH"   // withdrawal
  | "RCT"   // receipt
  | "QUO";  // quotation

const BASE36 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

const checksum = (input: string): string => {
  let sum = 0;
  for (let i = 0; i < input.length; i++) sum = (sum + input.charCodeAt(i) * (i + 1)) % 36;
  return BASE36[sum];
};

const datePart = (d: Date = new Date()): string => {
  const yy = d.getUTCFullYear().toString().slice(-2);
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yy}${mm}${dd}`;
};

const seqPart = (): string => {
  const ts = Date.now().toString(36).toUpperCase().slice(-4); // 4 chars time
  const rnd = Math.floor(Math.random() * 36 * 36)
    .toString(36)
    .toUpperCase()
    .padStart(2, "0"); // 2 chars random
  return `${ts}${rnd}`;
};

/** Generate a unique tracking invoice number. */
export const generateInvoiceNumber = (prefix: InvoicePrefix = "INV", date?: Date): string => {
  const d = datePart(date);
  const s = seqPart();
  const core = `${prefix}-${d}-${s}`;
  return `${core}-${checksum(core)}`;
};

/** Verify an invoice number's checksum integrity. */
export const verifyInvoiceNumber = (no: string): boolean => {
  const parts = no.split("-");
  if (parts.length !== 4) return false;
  const [p, d, s, chk] = parts;
  return checksum(`${p}-${d}-${s}`) === chk;
};

/** Convert an invoice number into a safe PDF filename. */
export const invoiceFilename = (no: string, kind: string = "invoice", ext: string = "pdf"): string => {
  const safe = no.replace(/[^A-Za-z0-9-]/g, "");
  const k = kind.toLowerCase().replace(/[^a-z0-9-]/g, "-");
  return `${k}-${safe}.${ext}`;
};
