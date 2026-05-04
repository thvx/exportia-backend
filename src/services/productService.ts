import { query } from "@database/pool.js";
import { logger } from "@utils/logger.js";
import { wtoAdapter } from "@adapters/wto.server.js";
import { ProductConfig, RivalAnalysis } from "@app-types/index.js";

class ProductService {
  /**
   * Resolve the HS code (partida arancelaria) for a product name via WTO QR Products API.
   * Returns the first matching code, or null if nothing found.
   */
  async resolveHSCode(productName: string): Promise<string | null> {
    try {
      const results = await wtoAdapter.getQRProducts(productName);
      if (results && results.length > 0) {
        const code = results[0].code;
        logger.info(`HS code resolved for "${productName}": ${code}`);
        return code;
      }
    } catch (err) {
      logger.warn(`HS code resolution via WTO failed for "${productName}": ${err instanceof Error ? err.message : err}`);
    }
    return null;
  }

  /**
   * Validate HS code format (4-10 digits). WTO QR product search may return
   * broader 4-digit headings, while user-provided national codes can be longer.
   */
  validateHSCode(code: string): boolean {
    return /^\d{4,10}$/.test(code.replace(/\D/g, ""));
  }

  /**
   * Create a product for a specific user.
   * If hs_code is not provided it will be resolved from the product name via WTO.
   */
  async updateClassificationData(productId: string, data: Record<string, unknown>): Promise<void> {
    await query(
      `UPDATE products SET classification_data = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [JSON.stringify(data), productId]
    );
  }

  async createProductForUser(
    userId: string,
    productName: string,
    options: { hs_code?: string; category?: string; description?: string; regulations?: string[]; classification_data?: Record<string, unknown> } = {}
  ): Promise<ProductConfig> {
    let hsCode = options.hs_code;

    if (!hsCode) {
      const resolved = await this.resolveHSCode(productName);
      if (!resolved) {
        throw new Error(
          `No se pudo identificar la partida arancelaria para "${productName}". ` +
            `Por favor proporciona el código HS manualmente.`
        );
      }
      hsCode = resolved;
    }

    if (!this.validateHSCode(hsCode)) {
      throw new Error(`Código HS inválido: ${hsCode}`);
    }

    // Upsert the product in the global catalog (keyed by hs_code)
    const result = await query(
      `INSERT INTO products (name, hs_code, category, description, regulations, created_by, classification_data)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (hs_code) DO UPDATE
         SET name = EXCLUDED.name,
             category = COALESCE(EXCLUDED.category, products.category),
             description = COALESCE(EXCLUDED.description, products.description),
             classification_data = COALESCE(EXCLUDED.classification_data, products.classification_data),
             updated_at = CURRENT_TIMESTAMP
       RETURNING id, name, hs_code, category, description, regulations, classification_data, created_by, created_at, updated_at`,
      [
        productName,
        hsCode,
        options.category || "Sin categoría",
        options.description || null,
        options.regulations || null,
        userId,
        options.classification_data ? JSON.stringify(options.classification_data) : null,
      ]
    );

    const product = result.rows[0] as ProductConfig;

    // Link product to user (idempotent)
    await query(
      `INSERT INTO user_products (user_id, product_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [userId, product.id]
    );

    logger.info(`Product "${productName}" (${hsCode}) linked to user ${userId}`);
    return product;
  }

  /**
   * List products — all or filtered by category
   */
  async listProducts(category?: string): Promise<ProductConfig[]> {
    if (category) {
      const result = await query(
        `SELECT id, name, hs_code, category, description, regulations, classification_data, created_by, created_at, updated_at
         FROM products WHERE category = $1 ORDER BY name`,
        [category]
      );
      return result.rows;
    }

    const result = await query(
      `SELECT id, name, hs_code, category, description, regulations, classification_data, created_by, created_at, updated_at
       FROM products ORDER BY name`
    );
    return result.rows;
  }

  /**
   * Get products belonging to a specific user
   */
  async listUserProducts(userId: string): Promise<ProductConfig[]> {
    const result = await query(
      `SELECT p.id, p.name, p.hs_code, p.category, p.description, p.regulations, p.created_by, p.created_at, p.updated_at
       FROM products p
       INNER JOIN user_products up ON p.id = up.product_id
       WHERE up.user_id = $1
       ORDER BY p.name`,
      [userId]
    );
    return result.rows;
  }

  /**
   * Get a product by ID
   */
  async getProduct(id: string): Promise<ProductConfig | null> {
    const result = await query(
      `SELECT id, name, hs_code, category, description, regulations, classification_data, created_by, created_at, updated_at
       FROM products WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  /**
   * Remove a product association from a user (does not delete the catalog entry)
   */
  async removeUserProduct(userId: string, productId: string): Promise<void> {
    await query(`DELETE FROM user_products WHERE user_id = $1 AND product_id = $2`, [userId, productId]);
    logger.info(`Product ${productId} unlinked from user ${userId}`);
  }

  // ── Legacy in-memory rival analysis (kept for backwards compat) ──────────

  private rivals: Map<string, RivalAnalysis[]> = new Map();

  async addRival(analysis: RivalAnalysis): Promise<RivalAnalysis> {
    if (!this.rivals.has(analysis.product_id)) {
      this.rivals.set(analysis.product_id, []);
    }
    this.rivals.get(analysis.product_id)!.push(analysis);
    return analysis;
  }

  async getRivals(productId: string): Promise<RivalAnalysis[]> {
    return this.rivals.get(productId) || [];
  }

  async getTopCompetitor(productId: string): Promise<RivalAnalysis | null> {
    const rivals = await this.getRivals(productId);
    if (rivals.length === 0) return null;
    return rivals.sort((a, b) => {
      const ms = b.market_share - a.market_share;
      return ms !== 0 ? ms : a.price_index - b.price_index;
    })[0];
  }
}

export const productService = new ProductService();
