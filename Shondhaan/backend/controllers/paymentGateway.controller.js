import { pool } from "../db/pool.js";

// Columns an admin is allowed to update via PUT /:gatewayName.
// gateway_name, id, created_at, updated_at are never client-writable.
const UPDATABLE_FIELDS = [
  "display_name",
  "environment",
  "currency",
  "merchant_id",
  "merchant_name",
  "merchant_email",
  "merchant_phone",
  "username",
  "password",
  "api_key",
  "api_secret",
  "client_id",
  "client_secret",
  "store_id",
  "store_password",
  "app_key",
  "app_secret",
  "base_url",
  "api_url",
  "checkout_url",
  "token_url",
  "success_url",
  "fail_url",
  "cancel_url",
  "ipn_url",
  "callback_url",
  "webhook_url",
  "webhook_secret",
  "merchant_prefix",
  "terminal_id",
  "account_number",
  "extra_config",
  "sort_order",
];

// Fields masked in the list view so credentials aren't exposed at a glance.
const SECRET_FIELDS = [
  "password",
  "api_secret",
  "client_secret",
  "store_password",
  "app_secret",
  "webhook_secret",
];

function maskSecrets(row) {
  const masked = { ...row };
  SECRET_FIELDS.forEach((field) => {
    if (masked[field]) masked[field] = "••••••••";
  });
  return masked;
}

function parseExtraConfig(row) {
  if (row && typeof row.extra_config === "string") {
    try {
      row.extra_config = JSON.parse(row.extra_config);
    } catch {
      // leave as-is if it isn't valid JSON
    }
  }
  return row;
}

// GET /api/payment-gateways
// List every gateway. Secrets are masked unless ?reveal=true is passed.
export async function listGateways(req, res, next) {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM payment_gateways ORDER BY sort_order ASC, id ASC",
    );
    const parsed = rows.map(parseExtraConfig);
    const reveal = req.query.reveal === "true";
    res.json(reveal ? parsed : parsed.map(maskSecrets));
  } catch (err) {
    next(err);
  }
}

// GET /api/payment-gateways/:gatewayName
// Full detail for one gateway (used to populate the edit form), unmasked.
export async function getGateway(req, res, next) {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM payment_gateways WHERE gateway_name = ? LIMIT 1",
      [req.params.gatewayName],
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Gateway not found" });
    }
    res.json(parseExtraConfig(rows[0]));
  } catch (err) {
    next(err);
  }
}

// PATCH /api/payment-gateways/:gatewayName/toggle
// Body: { is_enabled: boolean } — enable or disable a gateway.
export async function toggleGateway(req, res, next) {
  try {
    const { gatewayName } = req.params;
    const { is_enabled } = req.body;

    if (typeof is_enabled !== "boolean") {
      return res.status(400).json({ error: "is_enabled must be a boolean" });
    }

    const updatedBy = req.user?.id || req.body.updated_by || null;

    const [result] = await pool.query(
      "UPDATE payment_gateways SET is_enabled = ?, updated_by = ? WHERE gateway_name = ?",
      [is_enabled ? 1 : 0, updatedBy, gatewayName],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Gateway not found" });
    }

    const [rows] = await pool.query(
      "SELECT * FROM payment_gateways WHERE gateway_name = ?",
      [gatewayName],
    );
    res.json(parseExtraConfig(rows[0]));
  } catch (err) {
    next(err);
  }
}

// PUT /api/payment-gateways/:gatewayName
// Body: any subset of UPDATABLE_FIELDS — saves credentials/config for one gateway.
export async function updateGateway(req, res, next) {
  try {
    const { gatewayName } = req.params;
    const updates = {};

    for (const field of UPDATABLE_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        let value = req.body[field];
        if (field === "extra_config" && value !== null && typeof value !== "string") {
          value = JSON.stringify(value);
        }
        updates[field] = value;
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No updatable fields provided" });
    }

    updates.updated_by = req.user?.id || req.body.updated_by || null;

    const setClause = Object.keys(updates)
      .map((field) => `${field} = ?`)
      .join(", ");
    const values = [...Object.values(updates), gatewayName];

    const [result] = await pool.query(
      `UPDATE payment_gateways SET ${setClause} WHERE gateway_name = ?`,
      values,
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Gateway not found" });
    }

    const [rows] = await pool.query(
      "SELECT * FROM payment_gateways WHERE gateway_name = ?",
      [gatewayName],
    );
    res.json(parseExtraConfig(rows[0]));
  } catch (err) {
    next(err);
  }
}

// POST /api/payment-gateways
// Body: { gateway_name, display_name, ...anything from UPDATABLE_FIELDS }
// Creates a new gateway row (for adding a gateway beyond the seeded defaults).
export async function createGateway(req, res, next) {
  try {
    const { gateway_name, display_name } = req.body;
    if (!gateway_name || !display_name) {
      return res
        .status(400)
        .json({ error: "gateway_name and display_name are required" });
    }

    const fields = ["gateway_name", "display_name"];
    const values = [gateway_name, display_name];

    for (const field of UPDATABLE_FIELDS) {
      if (
        field !== "display_name" &&
        Object.prototype.hasOwnProperty.call(req.body, field)
      ) {
        let value = req.body[field];
        if (field === "extra_config" && value !== null && typeof value !== "string") {
          value = JSON.stringify(value);
        }
        fields.push(field);
        values.push(value);
      }
    }

    const placeholders = fields.map(() => "?").join(", ");
    const [result] = await pool.query(
      `INSERT INTO payment_gateways (${fields.join(", ")}) VALUES (${placeholders})`,
      values,
    );

    const [rows] = await pool.query("SELECT * FROM payment_gateways WHERE id = ?", [
      result.insertId,
    ]);
    res.status(201).json(parseExtraConfig(rows[0]));
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "gateway_name already exists" });
    }
    next(err);
  }
}

// DELETE /api/payment-gateways/:gatewayName
export async function deleteGateway(req, res, next) {
  try {
    const [result] = await pool.query(
      "DELETE FROM payment_gateways WHERE gateway_name = ?",
      [req.params.gatewayName],
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Gateway not found" });
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
