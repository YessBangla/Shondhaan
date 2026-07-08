import mysql from "mysql2/promise";

const dealDb = mysql.createPool({
  host: process.env.DEAL_DB_HOST || "localhost",
  user: process.env.DEAL_DB_USER || "root",
  password: process.env.DEAL_DB_PASSWORD || "",
  database: process.env.DEAL_DB_NAME || "yess_deal_db",
  port: Number(process.env.DEAL_DB_PORT || 3306),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: "utf8mb4",
});

export default dealDb;