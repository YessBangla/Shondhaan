import { pool } from "./db.js";

export const initializeDatabase = async () => {
  try {
    console.log("🔄 Initializing database tables...");

    // 1. Create service_categories table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS service_categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        name_en VARCHAR(255),
        icon_url VARCHAR(500),
        color_gradient VARCHAR(255) DEFAULT 'from-blue-600 to-blue-800',
        color_overlay VARCHAR(255) DEFAULT 'from-blue-900/80 to-blue-700/40',
        color_chip_bg VARCHAR(255) DEFAULT 'bg-blue-500/15',
        color_chip_text VARCHAR(255) DEFAULT 'text-blue-700',
        color_accent VARCHAR(50) DEFAULT '#2563eb',
        sort_order INT DEFAULT 0,
        is_active TINYINT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_name (name),
        KEY sort_idx (sort_order)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("✅ service_categories table ready");

    // Keep existing installations compatible with the category controller.
    try {
      await pool.query("ALTER TABLE service_categories ADD COLUMN slug VARCHAR(255) NULL AFTER name_en");
    } catch (error) {
      if (error.errno !== 1060) console.error("⚠️ service_categories.slug:", error.message);
    }

    // 2. Create services table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS services (
        id VARCHAR(36) PRIMARY KEY,
        slug VARCHAR(255) NOT NULL UNIQUE,
        title VARCHAR(255) NOT NULL,
        title_en VARCHAR(255),
        image_url VARCHAR(500),
        description LONGTEXT,
        rating DECIMAL(3,2) DEFAULT 4.5,
        total_reviews INT DEFAULT 0,
        total_orders INT DEFAULT 0,
        commission_percent DECIMAL(5,2) DEFAULT 10,
        price DECIMAL(10,2) DEFAULT 0,
        platform_fee DECIMAL(10,2) DEFAULT 0,
        features JSON,
        available_cities JSON,
        category_id VARCHAR(36),
        is_active TINYINT DEFAULT 1,
        sort_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES service_categories(id) ON DELETE SET NULL,
        KEY slug_idx (slug),
        KEY category_idx (category_id),
        KEY sort_idx (sort_order)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("✅ services table ready");

    // 3. Create service_packages table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS service_packages (
        id VARCHAR(36) PRIMARY KEY,
        service_id VARCHAR(36) NOT NULL,
        name VARCHAR(255) NOT NULL,
        description LONGTEXT,
        price DECIMAL(10,2) NOT NULL,
        original_price DECIMAL(10,2),
        duration VARCHAR(100),
        features JSON,
        is_active TINYINT DEFAULT 1,
        sort_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
        KEY service_idx (service_id),
        KEY sort_idx (sort_order)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("✅ service_packages table ready");

    // 4. Create providers table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS providers (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE,
        phone VARCHAR(20),
        division VARCHAR(255),
        district VARCHAR(255),
        thana TEXT,
        area VARCHAR(255),
        services TEXT,
        bio LONGTEXT,
        is_active TINYINT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY phone_idx (phone),
        KEY email_idx (email)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("✅ providers table ready");

    // 5. Create bookings table
await pool.query(`
  CREATE TABLE IF NOT EXISTS bookings (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(255),
    booked_by VARCHAR(255),
    service_id VARCHAR(36),
    package_id VARCHAR(36),
    service_slug VARCHAR(255),
    service_title VARCHAR(255),
    package_name VARCHAR(255),
    package_price DECIMAL(10,2),
    customer_name VARCHAR(255),
    customer_phone VARCHAR(20),
    customer_address LONGTEXT,
    booker_name VARCHAR(255),
    booker_phone VARCHAR(20),
    booking_date DATE,
    booking_time TIME,
    status VARCHAR(50) DEFAULT 'pending',
    booking_type ENUM('regular', 'offer', 'emergency') DEFAULT 'regular',
    payment_status VARCHAR(50) DEFAULT 'unpaid',
    platform_fee_amount DECIMAL(10,2) DEFAULT 0,
    payment_amount DECIMAL(10,2) DEFAULT 0,
    payment_verified_at TIMESTAMP NULL,
    provider_id INT,
    assigned_to VARCHAR(255),
    cancel_reason TEXT,
    note TEXT,
    payment_method VARCHAR(30) NOT NULL DEFAULT 'gateway',
    wallet_cash_used DECIMAL(10,2) NOT NULL DEFAULT 0,
    wallet_coins_used DECIMAL(10,2) NOT NULL DEFAULT 0,
    provider_payout_status VARCHAR(30) NOT NULL DEFAULT 'unpaid',
    referral_code VARCHAR(16) DEFAULT NULL,
    referral_id INT DEFAULT NULL,
    referral_status VARCHAR(50) DEFAULT NULL,
    offer_code VARCHAR(100) DEFAULT NULL,
    offer_discount_amount DECIMAL(10,2) DEFAULT 0,
    final_price DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL,
    FOREIGN KEY (package_id) REFERENCES service_packages(id) ON DELETE SET NULL,
    FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE SET NULL,
    KEY user_idx (user_id),
    KEY service_idx (service_slug),
    KEY date_idx (booking_date),
    KEY status_idx (status),
    KEY provider_idx (provider_id),
    KEY booking_type_idx (booking_type)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`);
console.log("✅ bookings table ready");

    // 6. Create service_reviews table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS service_reviews (
        id VARCHAR(36) PRIMARY KEY,
        service_id VARCHAR(36) NOT NULL,
        user_id VARCHAR(255),
        rating DECIMAL(3,2),
        title VARCHAR(255),
        comment LONGTEXT,
        is_verified TINYINT DEFAULT 0,
        is_active TINYINT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
        KEY service_idx (service_id),
        KEY rating_idx (rating)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("✅ service_reviews table ready");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS contact_messages (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(20),
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        KEY created_at_idx (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("✅ contact_messages table ready");

    // 7. Create cms_hero_banners table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cms_hero_banners (
        id VARCHAR(36) PRIMARY KEY,
        title_bn VARCHAR(255),
        title_en VARCHAR(255),
        subtitle_bn LONGTEXT,
        subtitle_en LONGTEXT,
        image_url VARCHAR(500),
        cta_text_bn VARCHAR(100),
        cta_text_en VARCHAR(100),
        cta_link VARCHAR(500),
        is_active TINYINT DEFAULT 1,
        sort_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY sort_idx (sort_order)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("✅ cms_hero_banners table ready");

    // 8. Create cms_homepage_sections table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cms_homepage_sections (
        id VARCHAR(36) PRIMARY KEY,
        section_key VARCHAR(100) NOT NULL UNIQUE,
        title_bn VARCHAR(255),
        title_en VARCHAR(255),
        service_slugs JSON,
        is_active TINYINT DEFAULT 1,
        sort_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY sort_idx (sort_order)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("✅ cms_homepage_sections table ready");

    // 9. Create service_chat_conversations table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS service_chat_conversations (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        service_id VARCHAR(36),
        service_title VARCHAR(255),
        last_message TEXT,
        last_message_time TIMESTAMP NULL,
        is_active TINYINT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL,
        KEY user_idx (user_id),
        KEY service_idx (service_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("✅ service_chat_conversations table ready");

    // 10. Create service_chat_messages table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS service_chat_messages (
        id VARCHAR(36) PRIMARY KEY,
        conversation_id VARCHAR(36) NOT NULL,
        sender_id VARCHAR(255),
        sender_type VARCHAR(50),
        message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (conversation_id) REFERENCES service_chat_conversations(id) ON DELETE CASCADE,
        KEY conversation_idx (conversation_id),
        KEY sender_idx (sender_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("✅ service_chat_messages table ready");

    // 11. Create service_offers table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS service_offers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255),
        title_bn VARCHAR(255),
        description LONGTEXT,
        description_bn LONGTEXT,
        image_url VARCHAR(500),
        discount_type VARCHAR(50) DEFAULT 'percentage',
        discount_value DECIMAL(10,2),
        service_id INT,
        service_slug VARCHAR(255),
        category_id INT,
        offer_code VARCHAR(100),
        start_date TIMESTAMP NULL,
        end_date TIMESTAMP NULL,
        is_featured TINYINT DEFAULT 0,
        is_active TINYINT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY service_idx (service_slug),
        KEY active_idx (is_active),
        KEY end_date_idx (end_date),
        KEY offer_code_idx (offer_code)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("✅ service_offers table ready");

    // ── Migrations: add columns to existing tables if missing ──

    // service_offers: service_slug (for tables created before it was added)
    try {
      await pool.query(`ALTER TABLE service_offers ADD COLUMN service_slug VARCHAR(255) DEFAULT NULL AFTER service_id`);
    } catch (err) {
      if (err.code !== 'ER_DUP_FIELDNAME') console.error("⚠️ service_slug:", err.message);
    }

    // bookings: booking_type support
    try {
      await pool.query(`ALTER TABLE bookings ADD COLUMN booking_type ENUM('regular', 'offer', 'emergency') DEFAULT 'regular' AFTER status`);
    } catch (err) {
      if (err.code !== 'ER_DUP_FIELDNAME') console.error("⚠️ booking_type:", err.message);
    }
    try {
      await pool.query(`ALTER TABLE bookings ADD INDEX booking_type_idx (booking_type)`);
    } catch (err) {
      if (err.code !== 'ER_DUP_KEYNAME') console.error("⚠️ booking_type_idx:", err.message);
    }

    // bookings: offer support columns
    try {
      await pool.query(`ALTER TABLE bookings ADD COLUMN offer_code VARCHAR(100) DEFAULT NULL AFTER note`);
    } catch (err) {
      if (err.code !== 'ER_DUP_FIELDNAME') console.error("⚠️ offer_code:", err.message);
    }
    try {
      await pool.query(`ALTER TABLE bookings ADD COLUMN offer_discount_amount DECIMAL(10,2) DEFAULT 0 AFTER offer_code`);
    } catch (err) {
      if (err.code !== 'ER_DUP_FIELDNAME') console.error("⚠️ offer_discount_amount:", err.message);
    }
    try {
      await pool.query(`ALTER TABLE bookings ADD COLUMN final_price DECIMAL(10,2) DEFAULT 0 AFTER offer_discount_amount`);
    } catch (err) {
      if (err.code !== 'ER_DUP_FIELDNAME') console.error("⚠️ final_price:", err.message);
    }

    console.log("✨ Database initialization complete!");
    return true;
  } catch (error) {
    console.error("❌ Database initialization error:", error.message);
    throw error;
  }
};
