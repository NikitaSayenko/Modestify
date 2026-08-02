// ==========================
// Product Import Client
// ==========================

import { apiClient } from "./apiClient";

/**
 * importProducts
 * Calls the protected backend endpoint to import products from external sources
 * into Firestore collection 'clothes' with approved=false by default.
 *
 * @param {Object} opts
 * @param {'platzi'|'dummyjson'} opts.source - external data provider
 * @param {number} opts.page  - pagination index
 * @param {number} opts.limit - page size (items per request)
 *
 * Note:
 * - Requires a signed-in user; server verifies admin role (see requireAdmin).
 * - Deterministic docId is applied on the server to avoid duplicates.
 */
export async function importProducts({ source = "platzi", page = 0, limit = 24 } = {}) {
  return apiClient.post("/api/import", { source, page, limit });
}
