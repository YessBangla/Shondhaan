// backfillSlugs.js — run once: node backfillSlugs.js
const pool = require("./db");

function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function generateUniqueSlug(baseText, excludeId = null) {
  const base = slugify(baseText) || "product";
  let slug = base;
  let counter = 2;

  while (true) {
    const query = excludeId
      ? "SELECT id FROM products WHERE slug = ? AND id != ? LIMIT 1"
      : "SELECT id FROM products WHERE slug = ? LIMIT 1";
    const params = excludeId ? [slug, excludeId] : [slug];
    const [rows] = await pool.query(query, params);
    if (rows.length === 0) return slug;
    slug = `${base}-${counter}`;
    counter++;
  }
}

async function backfillSlugs() {
  const [products] = await pool.query(
    "SELECT id, name_bn, name_en FROM products WHERE slug IS NULL OR slug = ''"
  );

  console.log(`Found ${products.length} products without a slug.`);

  for (const p of products) {
    const slug = await generateUniqueSlug(p.name_en || p.name_bn, p.id);
    await pool.query("UPDATE products SET slug = ? WHERE id = ?", [slug, p.id]);
    console.log(`Product #${p.id} -> slug: "${slug}"`);
  }

  console.log("Backfill complete.");
  process.exit(0);
}

backfillSlugs().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});