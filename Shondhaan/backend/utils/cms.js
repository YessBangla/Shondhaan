import { CMS_TABLES } from "../config/constants.js";

export function normalizeCmsRow(table, row) {
  const config = CMS_TABLES[table];
  const normalized = { ...row };
  for (const column of config.booleanColumns) {
    if (column in normalized) {
      normalized[column] = Boolean(normalized[column]);
    }
  }
  for (const column of config.jsonColumns) {
    if (typeof normalized[column] === "string") {
      try {
        normalized[column] = JSON.parse(normalized[column]);
      } catch {
        normalized[column] = [];
      }
    }
    if (normalized[column] == null) {
      normalized[column] = [];
    }
  }
  return normalized;
}

export function serializeCmsValue(table, column, value) {
  const config = CMS_TABLES[table];
  if (value === undefined) return undefined;
  if (config.booleanColumns.has(column)) return value ? 1 : 0;
  if (config.jsonColumns.has(column)) return JSON.stringify(Array.isArray(value) ? value : []);
  if (value === "") return null;
  return value;
}

export function getCmsConfig(table) {
  const config = CMS_TABLES[table];
  if (!config) {
    const error = new Error("Unknown CMS table");
    error.status = 404;
    throw error;
  }
  return config;
}