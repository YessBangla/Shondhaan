const pool = require("./db");

async function main() {
  const [rows] = await pool.query(
    "SELECT id, name_bn, name_en, slug FROM products ORDER BY id"
  );
  console.log("PRODUCTS:");
  rows.forEach((r) =>
    console.log(
      `${r.id} | bn=${r.name_bn} | en=${r.name_en || ""} | slug=${r.slug}`
    )
  );

  const [cnt] = await pool.query(
    "SELECT COUNT(*) AS c FROM products WHERE slug IS NULL OR slug = ''"
  );
  console.log("Products still missing slug:", cnt[0].c);
  process.exit(0);
}

main().catch((e) => {
  console.error("DB ERROR:", e.message);
  process.exit(1);
});

