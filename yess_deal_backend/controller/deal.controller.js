import dealDb from "../config.js";

const parseImages = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch {
      return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  return [];
};

const isTrue = (value) =>
  value === true || value === 1 || value === "1" || value === "true";

const ensureDealFavoritesTable = async () => {
  await dealDb.query(`
    CREATE TABLE IF NOT EXISTS deal_favorites (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id VARCHAR(191) NOT NULL,
      listing_id BIGINT UNSIGNED NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY unique_deal_favorite (user_id, listing_id),
      KEY idx_deal_favorites_user (user_id, created_at),
      KEY idx_deal_favorites_listing (listing_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
};

const mapListingRow = (row) => ({
  id: String(row.id),
  user_id: String(row.user_id),
  category_id: row.category_id ? String(row.category_id) : null,

  title: row.title,
  title_en: row.title_en,
  description: row.description,

  price: Number(row.price || 0),
  is_negotiable: !!Number(row.is_negotiable || 0),
  condition: row.product_condition || row.condition || "used",

  location_division: row.location_division,
  location_district: row.location_district,
  location_area: row.location_area,
  address: row.address,

  phone: row.phone,
  hide_phone: !!Number(row.hide_phone || 0),

  status: row.status,
  is_featured: !!Number(row.is_featured || 0),
  views_count: Number(row.views_count || 0),
  inquiries_count: Number(row.inquiries_count || 0),

  created_at: row.created_at,
  updated_at: row.updated_at,

  images: parseImages(row.images),

  deal_categories: row.category_name
    ? {
        id: row.category_id ? String(row.category_id) : null,
        name: row.category_name,
        name_en: row.category_name_en,
        slug: row.category_slug,
        icon: row.category_icon,
      }
    : null,
});

// export const getDealCategories = async (req, res) => {
//   try {
//     const [rows] = await dealDb.query(
//       `
//       SELECT 
//         id,
//         name,
//         name_en,
//         slug,
//         icon,
//         parent_id,
//         sort_order,
//         is_active,
//         created_at,
//         updated_at
//       FROM deal_categories
//       WHERE is_active = 1
//       ORDER BY sort_order ASC, id ASC
//       `
//     );

//     res.json({
//       success: true,
//       data: rows.map((row) => ({
//         ...row,
//         id: String(row.id),
//         parent_id: row.parent_id ? String(row.parent_id) : null,
//         is_active: !!Number(row.is_active),
//       })),
//     });
//   } catch (error) {
//     console.error("Get deal categories error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Failed to load deal categories",
//       error: error.message,
//     });
//   }
// };

// export const getDealCategoryTree = async (req, res) => {
//   try {
//     const [rows] = await dealDb.query(
//       `
//       SELECT 
//         id,
//         name,
//         name_en,
//         slug,
//         icon,
//         parent_id,
//         sort_order,
//         is_active
//       FROM deal_categories
//       WHERE is_active = 1
//       ORDER BY sort_order ASC, id ASC
//       `
//     );

//     const all = rows.map((row) => ({
//       ...row,
//       id: String(row.id),
//       parent_id: row.parent_id ? String(row.parent_id) : null,
//       is_active: !!Number(row.is_active),
//     }));

//     const parents = all.filter((cat) => !cat.parent_id);

//     const tree = parents.map((parent) => ({
//       ...parent,
//       children: all.filter((cat) => cat.parent_id === parent.id),
//     }));

//     res.json({
//       success: true,
//       data: tree,
//     });
//   } catch (error) {
//     console.error("Get deal category tree error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Failed to load category tree",
//       error: error.message,
//     });
//   }
// };

export const getDealListings = async (req, res) => {
  try {
    const {
      categorySlug,
      search,
      division,
      district,
      thana,
      condition,
      minPrice,
      maxPrice,
      sortBy,
      featured,
      user_id,
      status,
    } = req.query;

    let sql = `
      SELECT 
        l.*,
        c.name AS category_name,
        c.name_en AS category_name_en,
        c.slug AS category_slug,
        c.icon AS category_icon,
        img.images AS images
      FROM deal_listings l
      LEFT JOIN deal_categories c ON c.id = l.category_id
      LEFT JOIN (
        SELECT 
          listing_id,
          GROUP_CONCAT(image_url ORDER BY sort_order ASC SEPARATOR ',') AS images
        FROM deal_listing_images
        GROUP BY listing_id
      ) img ON img.listing_id = l.id
      WHERE 1 = 1
    `;

    const params = [];

    // ✅ STATUS FILTER
    if (status) {
      sql += ` AND l.status = ?`;
      params.push(status);
    } else if (!user_id) {
      sql += ` AND l.status = 'active'`;
    }

    // ✅ USER FILTER
    if (user_id) {
      sql += ` AND l.user_id = ?`;
      params.push(user_id);
    }

    // ✅ FEATURED FILTER
    if (featured === "1" || featured === "true") {
      sql += ` AND l.is_featured = 1`;
    }

    // ✅ CATEGORY FILTER
    if (categorySlug) {
      const [catRows] = await dealDb.query(
        `SELECT id FROM deal_categories WHERE slug = ? LIMIT 1`,
        [categorySlug]
      );

      if (catRows.length > 0) {
        const parentId = catRows[0].id;

        const [childRows] = await dealDb.query(
          `SELECT id FROM deal_categories WHERE parent_id = ?`,
          [parentId]
        );

        const categoryIds = [
          parentId,
          ...childRows.map((c) => c.id),
        ];

        sql += ` AND l.category_id IN (${categoryIds.map(() => "?").join(",")})`;
        params.push(...categoryIds);
      }
    }

    // ✅ LOCATION FILTERS
    if (division) {
      sql += ` AND l.location_division = ?`;
      params.push(division);
    }

    if (district) {
      sql += ` AND l.location_district = ?`;
      params.push(district);
    }

    if (thana) {
      sql += ` AND l.location_area = ?`;
      params.push(thana);
    }

    // ✅ CONDITION FILTER
    if (condition) {
      sql += ` AND l.condition = ?`;
      params.push(condition);
    }

    // ✅ PRICE FILTER
    if (minPrice) {
      sql += ` AND l.price >= ?`;
      params.push(Number(minPrice));
    }

    if (maxPrice) {
      sql += ` AND l.price <= ?`;
      params.push(Number(maxPrice));
    }

if (search) {
  sql += `
    AND (
      l.title LIKE ?
      OR l.title_en LIKE ?
      OR l.description LIKE ?
      OR c.name LIKE ?
      OR c.name_en LIKE ?
      OR l.location_area LIKE ?
      OR l.location_district LIKE ?
      OR l.location_division LIKE ?
    )
  `;

  const searchTerm = `%${search}%`;

  params.push(
    searchTerm,
    searchTerm,
    searchTerm,
    searchTerm,
    searchTerm,
    searchTerm,
    searchTerm,
    searchTerm
  );
}

    // ✅ SORTING
    if (sortBy === "price_asc") {
      sql += ` ORDER BY l.price ASC`;
    } else if (sortBy === "price_desc") {
      sql += ` ORDER BY l.price DESC`;
    } else if (sortBy === "popular") {
      sql += ` ORDER BY l.views_count DESC`;
    } else {
      sql += ` ORDER BY l.created_at DESC`;
    }

    // ✅ EXECUTE QUERY
    const [rows] = await dealDb.query(sql, params);

    // ✅ FORMAT IMAGES (convert CSV → array)
    const formatted = rows.map((item) => ({
      ...item,
      images: item.images ? item.images.split(",") : [],
    }));

    return res.json({
      success: true,
      data: formatted,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch listings",
    });
  }
};

export const getDealListingById = async (req, res) => {
  try {
    const { id } = req.params;

    await dealDb.query(
      `UPDATE deal_listings SET views_count = views_count + 1 WHERE id = ?`,
      [id]
    );

    const [rows] = await dealDb.query(
      `
      SELECT 
        l.*,
        c.name AS category_name,
        c.name_en AS category_name_en,
        c.slug AS category_slug,
        c.icon AS category_icon,
        img.images AS images
      FROM deal_listings l
      LEFT JOIN deal_categories c ON c.id = l.category_id
      LEFT JOIN (
        SELECT 
          listing_id,
          GROUP_CONCAT(image_url ORDER BY sort_order ASC SEPARATOR ',') AS images
        FROM deal_listing_images
        GROUP BY listing_id
      ) img ON img.listing_id = l.id
      WHERE l.id = ?
      LIMIT 1
      `,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Listing not found",
      });
    }

    res.json({
      success: true,
      data: mapListingRow(rows[0]),
    });
  } catch (error) {
    console.error("Get deal listing error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load listing",
      error: error.message,
    });
  }
};

export const createDealListing = async (req, res) => {
  const connection = await dealDb.getConnection();

  try {
    await connection.beginTransaction();

    // ✅ ADD THIS: ensure tables exist
    await connection.query(`
      CREATE TABLE IF NOT EXISTS deal_listings (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        user_id VARCHAR(191) NOT NULL,
        category_id BIGINT UNSIGNED NULL,
        title VARCHAR(255) NOT NULL,
        title_en VARCHAR(255),
        description TEXT,
        price DECIMAL(12,2) DEFAULT 0,
        is_negotiable TINYINT(1) DEFAULT 0,
        product_condition VARCHAR(50),
        location_division VARCHAR(100),
        location_district VARCHAR(100),
        location_area VARCHAR(100),
        address TEXT,
        seller_name VARCHAR(191),
        phone VARCHAR(50),
        hide_phone TINYINT(1) DEFAULT 0,
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS deal_listing_images (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        listing_id BIGINT UNSIGNED NOT NULL,
        image_url TEXT NOT NULL,
        sort_order INT DEFAULT 0,
        PRIMARY KEY (id),
        KEY idx_listing (listing_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    const {
      user_id,
      category_id,
      title,
      title_en = "",
      description = "",
      price = 0,
      is_negotiable = false,
      condition = "used",
      location_division = "",
      location_district = "",
      location_area = "",
      address = "",
      seller_name = "",
      phone = "",
      hide_phone = false,
      images = [],
    } = req.body;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: "user_id is required",
      });
    }

    if (!title || !String(title).trim()) {
      return res.status(400).json({
        success: false,
        message: "Title is required",
      });
    }

    const [result] = await connection.query(
      `
      INSERT INTO deal_listings (
        user_id,
        category_id,
        title,
        title_en,
        description,
        price,
        is_negotiable,
        product_condition,
        location_division,
        location_district,
        location_area,
        address,
        seller_name,
        phone,
        hide_phone,
        status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        user_id,
        category_id || null,
        String(title).trim(),
        String(title_en || "").trim(),
        String(description || "").trim(),
        Number(price || 0),
        isTrue(is_negotiable) ? 1 : 0,
        condition || "used",
        location_division || null,
        location_district || null,
        location_area || null,
        address || null,
        seller_name || null,
        phone || null,
        isTrue(hide_phone) ? 1 : 0,
        "active",
      ]
    );

    const listingId = result.insertId;
    const cleanImages = parseImages(images);

    for (let i = 0; i < cleanImages.length; i++) {
      await connection.query(
        `
        INSERT INTO deal_listing_images (listing_id, image_url, sort_order)
        VALUES (?, ?, ?)
        `,
        [listingId, cleanImages[i], i]
      );
    }

    await connection.commit();

    res.status(201).json({
      success: true,
      message: "Listing created successfully",
      data: {
        id: String(listingId),
      },
    });
  } catch (error) {
    await connection.rollback();

    console.error("Create deal listing error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create listing",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

export const deleteDealListing = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.query.user_id || req.body?.user_id;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Listing id is required",
      });
    }

    const params = [id];

    let sql = `
      DELETE FROM deal_listings
      WHERE id = ?
    `;

    if (user_id) {
      sql += ` AND user_id = ?`;
      params.push(user_id);
    }

    const [result] = await dealDb.query(sql, params);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Listing not found or not allowed",
      });
    }

    res.json({
      success: true,
      message: "Listing deleted successfully",
    });
  } catch (error) {
    console.error("Delete deal listing error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete listing",
      error: error.message,
    });
  }
};

export const getDealFavorites = async (req, res) => {
  try {
    const { user_id } = req.query;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: "user_id is required",
      });
    }

    await ensureDealFavoritesTable();

    const [rows] = await dealDb.query(
      `
      SELECT
        f.id AS favorite_id,
        f.created_at AS favorite_created_at,
        l.*,
        c.name AS category_name,
        c.name_en AS category_name_en,
        c.slug AS category_slug,
        c.icon AS category_icon,
        img.images AS images
      FROM deal_favorites f
      INNER JOIN deal_listings l ON l.id = f.listing_id
      LEFT JOIN deal_categories c ON c.id = l.category_id
      LEFT JOIN (
        SELECT
          listing_id,
          GROUP_CONCAT(image_url ORDER BY sort_order ASC SEPARATOR ',') AS images
        FROM deal_listing_images
        GROUP BY listing_id
      ) img ON img.listing_id = l.id
      WHERE f.user_id = ?
      ORDER BY f.created_at DESC
      LIMIT 100
      `,
      [String(user_id)]
    );

    res.json({
      success: true,
      data: rows.map((row) => ({
        id: String(row.favorite_id),
        listing_id: String(row.id),
        created_at: row.favorite_created_at,
        listing: mapListingRow(row),
      })),
    });
  } catch (error) {
    console.error("Get deal favorites error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load favorites",
      error: error.message,
    });
  }
};

export const getDealFavoriteStatus = async (req, res) => {
  try {
    const { listingId } = req.params;
    const { user_id } = req.query;

    if (!user_id || !listingId) {
      return res.status(400).json({
        success: false,
        message: "user_id and listing id are required",
      });
    }

    await ensureDealFavoritesTable();

    const [rows] = await dealDb.query(
      `
      SELECT id
      FROM deal_favorites
      WHERE user_id = ? AND listing_id = ?
      LIMIT 1
      `,
      [String(user_id), listingId]
    );

    res.json({
      success: true,
      data: {
        is_favorite: rows.length > 0,
        favorite_id: rows[0]?.id ? String(rows[0].id) : null,
      },
    });
  } catch (error) {
    console.error("Get deal favorite status error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to check favorite",
      error: error.message,
    });
  }
};

export const addDealFavorite = async (req, res) => {
  try {
    const user_id = req.body?.user_id || req.query.user_id;
    const listing_id = req.body?.listing_id || req.params.listingId;

    if (!user_id || !listing_id) {
      return res.status(400).json({
        success: false,
        message: "user_id and listing_id are required",
      });
    }

    await ensureDealFavoritesTable();

    const [listingRows] = await dealDb.query(
      `SELECT id, user_id FROM deal_listings WHERE id = ? LIMIT 1`,
      [listing_id]
    );

    if (listingRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Listing not found",
      });
    }

    if (String(listingRows[0].user_id) === String(user_id)) {
      return res.status(400).json({
        success: false,
        message: "You cannot favorite your own listing",
      });
    }

    await dealDb.query(
      `
      INSERT INTO deal_favorites (user_id, listing_id)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE created_at = created_at
      `,
      [String(user_id), listing_id]
    );

    res.status(201).json({
      success: true,
      message: "Added to favorites",
      data: {
        listing_id: String(listing_id),
        is_favorite: true,
      },
    });
  } catch (error) {
    console.error("Add deal favorite error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to add favorite",
      error: error.message,
    });
  }
};

export const removeDealFavorite = async (req, res) => {
  try {
    const user_id = req.body?.user_id || req.query.user_id;
    const listing_id = req.body?.listing_id || req.params.listingId;

    if (!user_id || !listing_id) {
      return res.status(400).json({
        success: false,
        message: "user_id and listing_id are required",
      });
    }

    await ensureDealFavoritesTable();

    await dealDb.query(
      `
      DELETE FROM deal_favorites
      WHERE user_id = ? AND listing_id = ?
      `,
      [String(user_id), listing_id]
    );

    res.json({
      success: true,
      message: "Removed from favorites",
      data: {
        listing_id: String(listing_id),
        is_favorite: false,
      },
    });
  } catch (error) {
    console.error("Remove deal favorite error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to remove favorite",
      error: error.message,
    });
  }
};
