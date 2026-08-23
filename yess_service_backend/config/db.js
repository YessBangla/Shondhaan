import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

export const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

let platformFeeSchemaPromise = null;

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
        { name: "provider_id", type: "VARCHAR(36) NULL", after: "payment_verified_at" },
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
