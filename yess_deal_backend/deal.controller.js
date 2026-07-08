import dealDb from "./config.js";

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

export const getDealCategories = async (req, res) => {
  try {
    const [rows] = await dealDb.query(
      `
      SELECT 
        id,
        name,
        name_en,
        slug,
        icon,
        parent_id,
        sort_order,
        is_active,
        created_at,
        updated_at
      FROM deal_categories
      WHERE is_active = 1
      ORDER BY sort_order ASC, id ASC
      `
    );

    res.json({
      success: true,
      data: rows.map((row) => ({
        ...row,
        id: String(row.id),
        parent_id: row.parent_id ? String(row.parent_id) : null,
        is_active: !!Number(row.is_active),
      })),
    });
  } catch (error) {
    console.error("Get deal categories error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load deal categories",
      error: error.message,
    });
  }
};

export const getDealCategoryTree = async (req, res) => {
  try {
    const [rows] = await dealDb.query(
      `
      SELECT 
        id,
        name,
        name_en,
        slug,
        icon,
        parent_id,
        sort_order,
        is_active
      FROM deal_categories
      WHERE is_active = 1
      ORDER BY sort_order ASC, id ASC
      `
    );

    const all = rows.map((row) => ({
      ...row,
      id: String(row.id),
      parent_id: row.parent_id ? String(row.parent_id) : null,
      is_active: !!Number(row.is_active),
    }));

    const parents = all.filter((cat) => !cat.parent_id);

    const tree = parents.map((parent) => ({
      ...parent,
      children: all.filter((cat) => cat.parent_id === parent.id),
    }));

    res.json({
      success: true,
      data: tree,
    });
  } catch (error) {
    console.error("Get deal category tree error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load category tree",
      error: error.message,
    });
  }
};

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
        COALESCE(
          JSON_ARRAYAGG(
            CASE 
              WHEN i.image_url IS NOT NULL THEN i.image_url 
              ELSE NULL 
            END
          ),
          JSON_ARRAY()
        ) AS images
      FROM deal_listings l
      LEFT JOIN deal_categories c ON c.id = l.category_id
      LEFT JOIN deal_listing_images i ON i.listing_id = l.id
      WHERE 1 = 1
    `;

    const params = [];

    if (status) {
      sql += ` AND l.status = ?`;
      params.push(status);
    } else if (!user_id) {
      sql += ` AND l.status = 'active'`;
    }

    if (user_id) {
      sql += ` AND l.user_id = ?`;
      params.push(user_id);
    }

    if (featured === "1" || featured === "true") {
      sql += ` AND l.is_featured = 1`;
    }

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

        const categoryIds = [parentId, ...childRows.map((row) => row.id)];

        sql += ` AND l.category_id IN (${categoryIds.map(() => "?").join(",")})`;
        params.push(...categoryIds);
      } else {
        sql += ` AND 1 = 0`;
      }
    }

    if (search) {
      sql += ` AND (l.title LIKE ? OR l.title_en LIKE ? OR l.description LIKE ?)`;
      const searchValue = `%${search}%`;
      params.push(searchValue, searchValue, searchValue);
    }

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

    if (condition) {
      sql += ` AND l.product_condition = ?`;
      params.push(condition);
    }

    if (minPrice !== undefined && minPrice !== "") {
      sql += ` AND l.price >= ?`;
      params.push(Number(minPrice));
    }

    if (maxPrice !== undefined && maxPrice !== "") {
      sql += ` AND l.price <= ?`;
      params.push(Number(maxPrice));
    }

    sql += ` GROUP BY l.id`;

    if (sortBy === "price_asc") {
      sql += ` ORDER BY l.price ASC`;
    } else if (sortBy === "price_desc") {
      sql += ` ORDER BY l.price DESC`;
    } else {
      sql += ` ORDER BY l.is_featured DESC, l.created_at DESC`;
    }

    sql += ` LIMIT 100`;

    const [rows] = await dealDb.query(sql, params);

    res.json({
      success: true,
      data: rows.map(mapListingRow),
    });
  } catch (error) {
    console.error("Get deal listings error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load deal listings",
      error: error.message,
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
        COALESCE(
          JSON_ARRAYAGG(
            CASE 
              WHEN i.image_url IS NOT NULL THEN i.image_url 
              ELSE NULL 
            END
          ),
          JSON_ARRAY()
        ) AS images
      FROM deal_listings l
      LEFT JOIN deal_categories c ON c.id = l.category_id
      LEFT JOIN deal_listing_images i ON i.listing_id = l.id
      WHERE l.id = ?
      GROUP BY l.id
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