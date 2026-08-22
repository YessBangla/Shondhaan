const pool = require("../db"); // must be the WALLET service's db pool, not the Mart backend's

async function createMartRewardTables() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS mart_reward_rules (
        id INT AUTO_INCREMENT PRIMARY KEY,
        label VARCHAR(150) NULL,
        min_purchase_amount DECIMAL(10,2) NOT NULL,
        reward_type ENUM('PERCENTAGE', 'FIXED') NOT NULL DEFAULT 'PERCENTAGE',
        reward_value DECIMAL(10,2) NOT NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_mart_reward_rules_active (is_active, min_purchase_amount)
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);

    // Seed the default rule only if the table is empty, so this never
    // duplicates or overwrites a rule an admin has since edited.
    await pool.query(`
      INSERT INTO mart_reward_rules (label, min_purchase_amount, reward_type, reward_value, is_active)
      SELECT 'Standard Mart Reward', 1000.00, 'PERCENTAGE', 1.00, 1
      WHERE NOT EXISTS (SELECT 1 FROM mart_reward_rules)
    `);

    console.log("Mart reward rule tables ready");
  } catch (error) {
    console.error("Mart reward tables error:", error.message);
  }
}

module.exports = createMartRewardTables;