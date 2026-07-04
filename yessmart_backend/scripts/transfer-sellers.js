/**
 * One-time transfer script:
 * Copies sellers rows from legacy Backend DB into yservice_mart DB sellers table.
 *
 * Usage:
 *   node scripts/transfer-sellers.js
 *
 * Required env (or defaults used by your existing servers):
 *   - DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME (legacy)
 *   - MART_DB_HOST, MART_DB_PORT, MART_DB_USER, MART_DB_PASSWORD, MART_DB_NAME (target)
 *
 * If your yservice_backend uses MART_DB_NAME / YSERVICE_DB_NAME, keep them set accordingly.
 */

require('dotenv').config();

const mysql = require('mysql2/promise');

async function main() {
  const legacyPool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'yess-service',
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
  });

  const targetDbName = process.env.MART_DB_NAME || process.env.YSERVICE_DB_NAME || 'yservice_mart';
  const martPool = mysql.createPool({
    host: process.env.MART_DB_HOST || process.env.DB_HOST || 'localhost',
    port: Number(process.env.MART_DB_PORT || process.env.DB_PORT || 3306),
    user: process.env.MART_DB_USER || process.env.DB_USER || 'root',
    password: process.env.MART_DB_PASSWORD || process.env.DB_PASSWORD || '',
    database: targetDbName,
    waitForConnections: true,
    connectionLimit: Number(process.env.MART_DB_CONNECTION_LIMIT || 10),
  });

  try {
    const [sourceSellers] = await legacyPool.query(
      'SELECT user_id, slug, shop_name, seller_name, seller_email, seller_mobile, seller_address, seller_total_products, seller_verified FROM sellers'
    );

    console.log(`Found ${sourceSellers.length} legacy sellers in legacy DB. Target DB: ${targetDbName}`);

    // Ensure target table exists (best-effort):
    await martPool.query(`
      CREATE TABLE IF NOT EXISTS sellers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NULL UNIQUE,
        slug VARCHAR(255) NULL UNIQUE,
        shop_name VARCHAR(255) NULL,
        seller_name VARCHAR(255) DEFAULT 'Yess Mart Seller',
        seller_email VARCHAR(255) NULL,
        seller_mobile VARCHAR(20) NULL,
        seller_address VARCHAR(300) NULL,
        seller_total_products INT DEFAULT 0,
        seller_verified TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    let transferred = 0;

    // Use transaction + upsert by slug OR user_id.
    // If both are null, we cannot reliably dedupe -> we will insert as-is (could duplicate).
    const conn = await martPool.getConnection();
    try {
      await conn.beginTransaction();

      for (const s of sourceSellers) {
        const slugBase = s.slug || (s.user_id ? String(s.user_id) : null);
        if (s.slug == null && s.user_id == null) {
          // fallback: insert new row
          await conn.execute(
            `INSERT INTO sellers (user_id, slug, shop_name, seller_name, seller_email, seller_mobile, seller_address, seller_total_products, seller_verified)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
            [
              s.user_id ?? null,
              null,
              s.shop_name ?? null,
              s.seller_name ?? 'Yess Mart Seller',
              s.seller_email ?? null,
              s.seller_mobile ?? null,
              s.seller_address ?? null,
              s.seller_total_products ?? 0,
              s.seller_verified ?? 0,
            ]
          );
          transferred++;
          continue;
        }

        await conn.execute(
          `INSERT INTO sellers (
              user_id, slug, shop_name, seller_name, seller_email, seller_mobile, seller_address, seller_total_products, seller_verified
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
              shop_name = VALUES(shop_name),
              seller_name = VALUES(seller_name),
              seller_email = VALUES(seller_email),
              seller_mobile = VALUES(seller_mobile),
              seller_address = VALUES(seller_address),
              seller_total_products = VALUES(seller_total_products),
              seller_verified = VALUES(seller_verified)
          `,
          [
            s.user_id ?? null,
            s.slug ?? null,
            s.shop_name ?? null,
            s.seller_name ?? 'Yess Mart Seller',
            s.seller_email ?? null,
            s.seller_mobile ?? null,
            s.seller_address ?? null,
            s.seller_total_products ?? 0,
            s.seller_verified ?? 0,
          ]
        );
        transferred++;
      }

      await conn.commit();
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }

    console.log(`Transfer done. Rows processed: ${transferred}`);
  } finally {
    await legacyPool.end();
    await martPool.end();
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Transfer failed:', err);
    process.exit(1);
  });

