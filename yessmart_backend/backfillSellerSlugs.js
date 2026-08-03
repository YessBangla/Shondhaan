// backfillSellerSlugs.js — run once: node backfillSellerSlugs.js
// Removes the trailing `-<id>` suffix from seller slugs so the store URL is
// just the readable name (e.g. /mart/store/rabeya-shop instead of
// /mart/store/rabeya-shop-2). Keeps slugs unique by appending -2, -3, etc.
const pool = require("./db");

async function backfillSellerSlugs() {
const [sellers] = await pool.query(
    "SELECT id, user_id, slug FROM sellers WHERE slug IS NOT NULL AND slug != ''"
  );

  console.log(`Found ${sellers.length} sellers with a slug.`);

for (const s of sellers) {
    // Strip the trailing `-<id>` suffix which may be the seller id OR user id
    // (e.g. rabeya-shop-2 -> rabeya-shop, tavi-8 -> tavi, ...-5 -> ...)
    let stripped = s.slug.replace(new RegExp(`-${s.id}$`), "");
    if (s.user_id != null) {
      stripped = stripped.replace(new RegExp(`-${s.user_id}$`), "");
    }
    if (!stripped || stripped === s.slug) continue;

    // Ensure uniqueness
    let candidate = stripped;
    let counter = 2;
    while (true) {
      const [rows] = await pool.query(
        "SELECT id FROM sellers WHERE slug = ? AND id != ? LIMIT 1",
        [candidate, s.id]
      );
      if (rows.length === 0) break;
      candidate = `${stripped}-${counter}`;
      counter++;
    }

    await pool.query("UPDATE sellers SET slug = ? WHERE id = ?", [candidate, s.id]);
    console.log(`Seller #${s.id}: "${s.slug}" -> "${candidate}"`);
  }

  console.log("Seller slug backfill complete.");
  process.exit(0);
}

backfillSellerSlugs().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
