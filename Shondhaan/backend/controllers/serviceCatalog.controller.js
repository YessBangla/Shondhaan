// import crypto from "crypto";
// import { pool } from "../db/pool.js";

// const ADMIN_TYPES = new Set(["super_admin", "admin"]);

// function assertAdmin(req, res) {
//   if (!req.user || !ADMIN_TYPES.has(req.user.type)) {
//     res.status(403).json({ message: "Admin access required" });
//     return false;
//   }
//   return true;
// }

// function makeSlug(value) {
//   return String(value || "")
//     .trim()
//     .toLowerCase()
//     .replace(/[^a-z0-9]+/g, "-")
//     .replace(/^-+|-+$/g, "");
// }

// function parseJson(value, fallback = []) {
//   if (Array.isArray(value)) return value;
//   if (value == null || value === "") return fallback;
//   if (typeof value === "object") return value;
//   try {
//     return JSON.parse(value);
//   } catch {
//     return fallback;
//   }
// }

// function toJson(value) {
//   if (value == null || value === "") return JSON.stringify([]);
//   return JSON.stringify(Array.isArray(value) ? value : parseJson(value));
// }

// function normalizeCategory(row) {
//   return {
//     ...row,
//     name_en: row.name_en ?? null,
//     icon_url: row.icon_url ?? null,
//     color_gradient: row.color_gradient ?? "from-blue-600 to-blue-800",
//     color_overlay: row.color_overlay ?? "from-blue-900/80 to-blue-700/40",
//     color_chip_bg: row.color_chip_bg ?? "bg-blue-500/15",
//     color_chip_text: row.color_chip_text ?? "text-blue-700",
//     color_accent: row.color_accent ?? "#2563eb",
//     sort_order: row.sort_order ?? 0,
//     is_active: row.is_active ?? true,
//   };
// }

// function normalizeService(row) {
//   return {
//     ...row,
//     rating: row.rating == null ? 4.5 : Number(row.rating),
//     total_reviews: row.total_reviews ?? 0,
//     total_orders: row.total_orders ?? 0,
//     commission_percent: row.commission_percent == null ? 10 : Number(row.commission_percent),
//     features: parseJson(row.features),
//     available_cities: parseJson(row.available_cities),
//     is_active: Boolean(row.is_active),
//     sort_order: row.sort_order ?? 0,
//   };
// }

// function normalizePackage(row) {
//   return {
//     ...row,
//     features: parseJson(row.features),
//     sort_order: row.sort_order ?? 0,
//   };
// }

// export async function listServiceCategories(req, res) {
//   try {
//     const [rows] = await pool.execute(
//       "SELECT id, name, slug, created_at FROM service_categories ORDER BY name ASC"
//     );
//     res.json({ data: rows.map(normalizeCategory) });
//   } catch (error) {
//     console.error("List service categories error:", error);
//     res.status(500).json({ message: "Could not load service categories" });
//   }
// }

// export async function upsertServiceCategory(req, res) {
//   if (!assertAdmin(req, res)) return;

//   try {
//     const id = req.body.id || crypto.randomUUID();
//     const name = String(req.body.name || "").trim();
//     const slug = makeSlug(req.body.slug || req.body.name_en || name);

//     if (!name) return res.status(400).json({ message: "Category name is required" });

//     await pool.execute(
//       `INSERT INTO service_categories (id, name, slug)
//        VALUES (?, ?, ?)
//        ON DUPLICATE KEY UPDATE name = VALUES(name), slug = VALUES(slug)`,
//       [id, name, slug || null]
//     );

//     const [rows] = await pool.execute(
//       "SELECT id, name, slug, created_at FROM service_categories WHERE id = ? LIMIT 1",
//       [id]
//     );

//     res.json({ data: normalizeCategory(rows[0]) });
//   } catch (error) {
//     console.error("Upsert service category error:", error);
//     res.status(500).json({ message: "Could not save service category" });
//   }
// }

// export async function deleteServiceCategory(req, res) {
//   if (!assertAdmin(req, res)) return;

//   try {
//     await pool.execute("DELETE FROM service_categories WHERE id = ?", [req.params.id]);
//     res.json({ message: "Service category deleted" });
//   } catch (error) {
//     console.error("Delete service category error:", error);
//     res.status(500).json({ message: "Could not delete service category" });
//   }
// }

// export async function listServices(req, res) {
//   try {
//     const [rows] = await pool.execute(
//       `SELECT id, slug, title, title_en, image_url, description, rating, total_reviews,
//               total_orders, commission_percent, features, available_cities, category_id,
//               is_active, sort_order, created_at, updated_at
//        FROM services
//        ORDER BY sort_order ASC, created_at DESC`
//     );
//     res.json({ data: rows.map(normalizeService) });
//   } catch (error) {
//     console.error("List services error:", error);
//     res.status(500).json({ message: "Could not load services" });
//   }
// }

// export async function upsertService(req, res) {
//   if (!assertAdmin(req, res)) return;

//   try {
//     const id = req.body.id || crypto.randomUUID();
//     const title = String(req.body.title || "").trim();
//     const slug = makeSlug(req.body.slug || req.body.title_en || title);

//     if (!title || !slug) {
//       return res.status(400).json({ message: "Service title and slug are required" });
//     }

//     const payload = {
//       title,
//       slug,
//       title_en: req.body.title_en || null,
//       image_url: req.body.image_url || null,
//       description: req.body.description || null,
//       rating: Number(req.body.rating ?? 4.5),
//       total_reviews: Number(req.body.total_reviews ?? 0),
//       total_orders: Number(req.body.total_orders ?? 0),
//       commission_percent: Number(req.body.commission_percent ?? 10),
//       features: toJson(req.body.features),
//       available_cities: toJson(req.body.available_cities),
//       category_id: req.body.category_id || null,
//       is_active: req.body.is_active ?? true,
//       sort_order: Number(req.body.sort_order ?? 0),
//     };

//     await pool.execute(
//       `INSERT INTO services (
//         id, slug, title, title_en, image_url, description, rating, total_reviews,
//         total_orders, commission_percent, features, available_cities, category_id,
//         is_active, sort_order
//       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CAST(? AS JSON), CAST(? AS JSON), ?, ?, ?)
//       ON DUPLICATE KEY UPDATE
//         slug = VALUES(slug),
//         title = VALUES(title),
//         title_en = VALUES(title_en),
//         image_url = VALUES(image_url),
//         description = VALUES(description),
//         rating = VALUES(rating),
//         total_reviews = VALUES(total_reviews),
//         total_orders = VALUES(total_orders),
//         commission_percent = VALUES(commission_percent),
//         features = VALUES(features),
//         available_cities = VALUES(available_cities),
//         category_id = VALUES(category_id),
//         is_active = VALUES(is_active),
//         sort_order = VALUES(sort_order)`,
//       [
//         id,
//         payload.slug,
//         payload.title,
//         payload.title_en,
//         payload.image_url,
//         payload.description,
//         payload.rating,
//         payload.total_reviews,
//         payload.total_orders,
//         payload.commission_percent,
//         payload.features,
//         payload.available_cities,
//         payload.category_id,
//         payload.is_active,
//         payload.sort_order,
//       ]
//     );

//     const [rows] = await pool.execute(
//       `SELECT id, slug, title, title_en, image_url, description, rating, total_reviews,
//               total_orders, commission_percent, features, available_cities, category_id,
//               is_active, sort_order, created_at, updated_at
//        FROM services WHERE id = ? LIMIT 1`,
//       [id]
//     );

//     res.json({ data: normalizeService(rows[0]) });
//   } catch (error) {
//     console.error("Upsert service error:", error);
//     res.status(500).json({ message: "Could not save service" });
//   }
// }

// export async function deleteService(req, res) {
//   if (!assertAdmin(req, res)) return;

//   try {
//     await pool.execute("DELETE FROM services WHERE id = ?", [req.params.id]);
//     res.json({ message: "Service deleted" });
//   } catch (error) {
//     console.error("Delete service error:", error);
//     res.status(500).json({ message: "Could not delete service" });
//   }
// }

// export async function listServicePackages(req, res) {
//   try {
//     const serviceId = req.query.service_id;
//     if (!serviceId) return res.json({ data: [] });

//     const [rows] = await pool.execute(
//       `SELECT id, service_id, name, price, original_price, features, sort_order, created_at, updated_at
//        FROM service_packages
//        WHERE service_id = ?
//        ORDER BY sort_order ASC, price ASC`,
//       [serviceId]
//     );
//     res.json({ data: rows.map(normalizePackage) });
//   } catch (error) {
//     console.error("List service packages error:", error);
//     res.status(500).json({ message: "Could not load service packages" });
//   }
// }

// export async function upsertServicePackage(req, res) {
//   if (!assertAdmin(req, res)) return;

//   try {
//     const id = req.body.id || crypto.randomUUID();
//     const serviceId = req.body.service_id;
//     const name = String(req.body.name || "").trim();

//     if (!serviceId || !name) {
//       return res.status(400).json({ message: "Package service and name are required" });
//     }

//     await pool.execute(
//       `INSERT INTO service_packages (id, service_id, name, price, original_price, features, sort_order)
//        VALUES (?, ?, ?, ?, ?, CAST(? AS JSON), ?)
//        ON DUPLICATE KEY UPDATE
//          service_id = VALUES(service_id),
//          name = VALUES(name),
//          price = VALUES(price),
//          original_price = VALUES(original_price),
//          features = VALUES(features),
//          sort_order = VALUES(sort_order)`,
//       [
//         id,
//         serviceId,
//         name,
//         Number(req.body.price ?? 0),
//         req.body.original_price == null || req.body.original_price === "" ? null : Number(req.body.original_price),
//         toJson(req.body.features),
//         Number(req.body.sort_order ?? 0),
//       ]
//     );

//     const [rows] = await pool.execute(
//       `SELECT id, service_id, name, price, original_price, features, sort_order, created_at, updated_at
//        FROM service_packages WHERE id = ? LIMIT 1`,
//       [id]
//     );

//     res.json({ data: normalizePackage(rows[0]) });
//   } catch (error) {
//     console.error("Upsert service package error:", error);
//     res.status(500).json({ message: "Could not save service package" });
//   }
// }

// export async function deleteServicePackage(req, res) {
//   if (!assertAdmin(req, res)) return;

//   try {
//     await pool.execute("DELETE FROM service_packages WHERE id = ?", [req.params.id]);
//     res.json({ message: "Service package deleted" });
//   } catch (error) {
//     console.error("Delete service package error:", error);
//     res.status(500).json({ message: "Could not delete service package" });
//   }
// }
