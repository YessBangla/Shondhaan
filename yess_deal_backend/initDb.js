/**
 * Database initialization - creates all tables on server startup
 */

export async function initializeDatabase(dealDb) {
  try {
    console.log("🔄 Initializing database tables...");

    // 1. Create deal_categories table
    await dealDb.query(`
      CREATE TABLE IF NOT EXISTS deal_categories (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        name_en VARCHAR(255),
        slug VARCHAR(191) NOT NULL UNIQUE,
        icon VARCHAR(255),
        parent_id BIGINT UNSIGNED NULL,
        sort_order INT DEFAULT 0,
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_slug (slug),
        KEY idx_parent (parent_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("✅ deal_categories table created");

    // 2. Create deal_listings table
    await dealDb.query(`
      CREATE TABLE IF NOT EXISTS deal_listings (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        user_id VARCHAR(191) NOT NULL,
        category_id BIGINT UNSIGNED NULL,
        title VARCHAR(255) NOT NULL,
        title_en VARCHAR(255),
        description TEXT,
        price DECIMAL(12,2) DEFAULT 0,
        is_negotiable TINYINT(1) DEFAULT 0,
        product_condition VARCHAR(50) DEFAULT 'used',
        location_division VARCHAR(100),
        location_district VARCHAR(100),
        location_area VARCHAR(100),
        address TEXT,
        seller_name VARCHAR(191),
        phone VARCHAR(50),
        hide_phone TINYINT(1) DEFAULT 0,
        status VARCHAR(50) DEFAULT 'active',
        is_featured TINYINT(1) DEFAULT 0,
        views_count INT DEFAULT 0,
        inquiries_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_user (user_id),
        KEY idx_category (category_id),
        KEY idx_status (status),
        KEY idx_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("✅ deal_listings table created");

    // 3. Create deal_listing_images table
    await dealDb.query(`
      CREATE TABLE IF NOT EXISTS deal_listing_images (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        listing_id BIGINT UNSIGNED NOT NULL,
        image_url TEXT NOT NULL,
        sort_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_listing (listing_id),
        FOREIGN KEY (listing_id) REFERENCES deal_listings(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("✅ deal_listing_images table created");

    // 4. Create deal_conversations table
    await dealDb.query(`
      CREATE TABLE IF NOT EXISTS deal_conversations (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        listing_id BIGINT UNSIGNED NOT NULL,
        buyer_id VARCHAR(191) NOT NULL,
        seller_id VARCHAR(191) NOT NULL,
        last_message TEXT,
        last_message_at TIMESTAMP NULL,
        buyer_unread_count INT DEFAULT 0,
        seller_unread_count INT DEFAULT 0,
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY unique_conversation (listing_id, buyer_id, seller_id),
        KEY idx_buyer (buyer_id),
        KEY idx_seller (seller_id),
        KEY idx_listing (listing_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("✅ deal_conversations table created");

    // 5. Create deal_messages table
    await dealDb.query(`
      CREATE TABLE IF NOT EXISTS deal_messages (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        conversation_id BIGINT UNSIGNED NOT NULL,
        sender_id VARCHAR(191) NOT NULL,
        message TEXT NOT NULL,
        is_read TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_conversation (conversation_id),
        KEY idx_sender (sender_id),
        FOREIGN KEY (conversation_id) REFERENCES deal_conversations(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("✅ deal_messages table created");

    // 6. Create deal_favorites table
    await dealDb.query(`
      CREATE TABLE IF NOT EXISTS deal_favorites (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        user_id VARCHAR(191) NOT NULL,
        listing_id BIGINT UNSIGNED NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY unique_deal_favorite (user_id, listing_id),
        KEY idx_user (user_id),
        KEY idx_listing (listing_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("✅ deal_favorites table created");

    // 7. Create deal_reports table
    await dealDb.query(`
      CREATE TABLE IF NOT EXISTS deal_reports (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        listing_id BIGINT UNSIGNED NOT NULL,
        reason VARCHAR(255),
        details TEXT,
        status VARCHAR(32) DEFAULT 'pending',
        admin_note TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        resolved_at TIMESTAMP NULL,
        PRIMARY KEY (id),
        KEY idx_listing (listing_id),
        KEY idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("✅ deal_reports table created");

    console.log("✅ Database initialization complete!");
    return true;
  } catch (error) {
    console.error("❌ Database initialization error:", error);
    throw error;
  }
}