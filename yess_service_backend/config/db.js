import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

export const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

export const centralPool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.MAIN_DB_NAME || "shondhaan_db",
});

let platformFeeSchemaPromise = null;

let providerSchemaPromise = null;

export const ensureProviderSchema = () => {
  if (!providerSchemaPromise) {
    providerSchemaPromise = (async () => {
      const columnsToEnsure = [
        { name: "user_id", type: "VARCHAR(255) NULL" },
        { name: "name", type: "VARCHAR(255) NULL" },
        { name: "division", type: "VARCHAR(255) NULL" },
        { name: "district", type: "VARCHAR(255) NULL" },
        { name: "thana", type: "VARCHAR(255) NULL" },
        { name: "area", type: "VARCHAR(255) NULL" },
        { name: "full_name", type: "VARCHAR(255) NULL" },
        { name: "address", type: "LONGTEXT NULL" },
        { name: "service_category", type: "VARCHAR(255) NULL" },
        { name: "services", type: "TEXT NULL" },
        { name: "experience_years", type: "DECIMAL(5,2) NOT NULL DEFAULT 0" },
        { name: "nid_front_url", type: "VARCHAR(500) NULL" },
        { name: "nid_back_url", type: "VARCHAR(500) NULL" },
        { name: "status", type: "VARCHAR(30) NOT NULL DEFAULT 'pending'" },
        { name: "status_reason", type: "TEXT NULL" },
        { name: "is_active", type: "TINYINT NOT NULL DEFAULT 0" },
      ];

      for (const column of columnsToEnsure) {
        try {
          await pool.query(`ALTER TABLE providers ADD COLUMN ${column.name} ${column.type}`);
        } catch (error) {
          if (error.errno !== 1060) {
            console.error(`Error ensuring providers.${column.name}:`, error.message);
          }
        }
      }

      try {
        await pool.query("ALTER TABLE providers MODIFY COLUMN services TEXT NULL");
      } catch (error) {
        console.error("Error ensuring providers.services type:", error.message);
      }

      try {
        await pool.query("ALTER TABLE providers MODIFY COLUMN thana TEXT NULL");
      } catch (error) {
        console.error("Error ensuring providers.thana type:", error.message);
      }

      // Existing active provider rows predate verification statuses and are already approved.
      await pool.query(
        "UPDATE providers SET status = 'approved' WHERE is_active = 1 AND (status IS NULL OR status = 'pending')"
      );

      try {
        await pool.query("CREATE UNIQUE INDEX providers_user_id_unique ON providers (user_id)");
      } catch (error) {
        if (![1061, 1831].includes(error.errno)) {
          console.error("Error ensuring providers.user_id index:", error.message);
        }
      }

      // A freshly emptied providers table should start assigning IDs from 1.
      // MySQL will still continue from MAX(id) + 1 when existing rows remain.
      const [providerCountRows] = await pool.query(
        "SELECT COUNT(*) AS total FROM providers"
      );
      if (Number(providerCountRows[0]?.total || 0) === 0) {
        await pool.query("ALTER TABLE providers AUTO_INCREMENT = 1");
      }
    })().catch((error) => {
      providerSchemaPromise = null;
      throw error;
    });
  }

  return providerSchemaPromise;
};

export const ensurePlatformFeeSchema = () => {
  if (!platformFeeSchemaPromise) {
    platformFeeSchemaPromise = (async () => {
      // 1. Ensure services table has platform_fee
      try {
        await pool.query(`
          ALTER TABLE services
          ADD COLUMN platform_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER price
        `);
      } catch (err) {
        // Error code 1060 = Duplicate column name (it already exists). Safe to ignore.
        if (err.errno !== 1060) {
          console.error("Error ensuring services.platform_fee:", err.message);
        }
      }

      // 2. Ensure bookings table has all required new columns
      const columnsToEnsure = [
        { name: "booked_by", type: "VARCHAR(255) NULL", after: "user_id" },
        { name: "booker_name", type: "VARCHAR(255) NULL", after: "customer_address" },
        { name: "booker_phone", type: "VARCHAR(50) NULL", after: "booker_name" },
        { name: "platform_fee_amount", type: "DECIMAL(10,2) NOT NULL DEFAULT 0.00", after: "payment_status" },
        { name: "payment_amount", type: "DECIMAL(10,2) NOT NULL DEFAULT 0.00", after: "platform_fee_amount" },
        { name: "payment_verified_at", type: "TIMESTAMP NULL", after: "payment_amount" },
        { name: "provider_id", type: "INT NULL", after: "payment_verified_at" },
        { name: "assigned_to", type: "VARCHAR(255) NULL", after: "provider_id" },
        { name: "cancel_reason", type: "TEXT NULL", after: "assigned_to" },
        { name: "note", type: "TEXT NULL", after: "cancel_reason" },
        { name: "referral_code", type: "VARCHAR(16) NULL", after: "note" },
        { name: "referral_id", type: "INT NULL", after: "referral_code" },
        { name: "referral_status", type: "VARCHAR(50) NULL", after: "referral_id" },
      ];

      for (const col of columnsToEnsure) {
        try {
          await pool.query(`
            ALTER TABLE bookings
            ADD COLUMN ${col.name} ${col.type} ${col.after ? `AFTER ${col.after}` : ''}
          `);
        } catch (err) {
          if (err.errno !== 1060) {
            console.error(`Error ensuring bookings.${col.name}:`, err.message);
          }
        }
      }
    })().catch((error) => {
      platformFeeSchemaPromise = null;
      throw error;
    });
  }

  return platformFeeSchemaPromise;
};
