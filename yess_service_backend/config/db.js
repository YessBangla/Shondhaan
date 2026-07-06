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
      await pool.query(`
        ALTER TABLE services
        ADD COLUMN IF NOT EXISTS platform_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER price
      `);

      await pool.query(`
        ALTER TABLE bookings
        ADD COLUMN IF NOT EXISTS platform_fee_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER payment_status
      `);
    })().catch((error) => {
      platformFeeSchemaPromise = null;
      throw error;
    });
  }

  return platformFeeSchemaPromise;
};
