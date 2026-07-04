/**
 * Centralized Invoice / Document Number Standard
 * Format:  <PREFIX>-<YYMMDD>-<BASE36-SEQ>-<CHK>
 */

const BASE36 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

const checksum = (input) => {
  let sum = 0;
  for (let i = 0; i < input.length; i++) {
    sum = (sum + input.charCodeAt(i) * (i + 1)) % 36;
  }
  return BASE36[sum];
};

const datePart = (d = new Date()) => {
  const yy = d.getUTCFullYear().toString().slice(-2);
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yy}${mm}${dd}`;
};

const seqPart = () => {
  const ts = Date.now().toString(36).toUpperCase().slice(-4);
  const rnd = Math.floor(Math.random() * 36 * 36)
    .toString(36)
    .toUpperCase()
    .padStart(2, "0");
  return `${ts}${rnd}`;
};

/** Generate a unique tracking invoice number. */
const generateInvoiceNumber = (prefix = "MRT", date = new Date()) => {
  const d = datePart(date);
  const s = seqPart();
  const core = `${prefix}-${d}-${s}`;
  return `${core}-${checksum(core)}`;
};

/** Verify an invoice number's checksum integrity. */
const verifyInvoiceNumber = (no) => {
  if (!no || typeof no !== "string") return false;
  const parts = no.split("-");
  if (parts.length !== 4) return false;
  const [p, d, s, chk] = parts;
  return checksum(`${p}-${d}-${s}`) === chk;
};

module.exports = {
  generateInvoiceNumber,
  verifyInvoiceNumber,
};
