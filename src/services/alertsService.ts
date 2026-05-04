import { wtoAdapter } from "@adapters/wto.server.js";
import { logger } from "@utils/logger.js";
import { EpingAlert, QRQuota, QRRegulation, QRProduct, QRListMeta } from "@types/index.js";

/**
 * Alerts Service
 * Handles SPS/TBT notification alerts and quota restrictions
 */

export class AlertsService {
  private fallbackQRProducts: QRProduct[] = [
    { code: "0901", description: "Café, incluso tostado o descafeinado; cáscara y cascarilla de café", hs_version: "h6" },
    { code: "1801", description: "Cacao en grano, entero o partido, crudo o tostado", hs_version: "h6" },
    { code: "0803", description: "Bananas, incluidos los plátanos, frescos o secos", hs_version: "h6" },
    { code: "5208", description: "Tejidos de algodón con contenido de algodón superior o igual al 85%", hs_version: "h6" },
    { code: "6204", description: "Trajes sastre, vestidos, faldas y prendas similares para mujeres o niñas", hs_version: "h6" },
    { code: "7117", description: "Bisutería", hs_version: "h6" },
    { code: "4602", description: "Artículos de cestería obtenidos directamente en su forma con materia trenzable", hs_version: "h6" },
    { code: "2008", description: "Frutas u otros frutos preparados o conservados", hs_version: "h6" },
  ];

  private normalizeSearchText(value: string): string {
    return value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  private getProductDescription(product: QRProduct): string {
    const description = product.description as any;
    if (typeof description === "string") return description;
    return description?.es || description?.en || description?.fr || "";
  }

  private rankQRProducts(products: QRProduct[], description?: string): QRProduct[] {
    if (!description) return products;

    const terms = this.normalizeSearchText(description)
      .split(/\s+/)
      .filter((term) => term.length > 2);

    if (terms.length === 0) return products;

    const matches = products
      .map((product) => {
        const text = this.normalizeSearchText(`${product.code} ${this.getProductDescription(product)}`);
        const score = terms.reduce((total, term) => total + (text.includes(term) ? 1 : 0), 0);
        return { product, score };
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score || a.product.code.length - b.product.code.length)
      .map(({ product }) => product);

    if (matches.length > 0) return matches;

    return this.fallbackQRProducts.filter((product) => {
      const text = this.normalizeSearchText(`${product.code} ${this.getProductDescription(product)}`);
      return terms.some((term) => text.includes(term));
    });
  }

  //Get all alerts for a specific product
  async getAlertsByProduct(product: string): Promise<EpingAlert[]> {
    logger.debug(`Fetching alerts for product: ${product}`);
    return wtoAdapter.getAlerts(product);
  }

  //Get all alerts (unfiltered)
  async getAllAlerts(): Promise<EpingAlert[]> {
    logger.debug("Fetching all alerts");
    return wtoAdapter.getAlerts();
  }

  // Get quota restrictions for a product
  async getQuotasByProduct(product: string): Promise<QRQuota[]> {
    logger.debug(`Fetching quotas for product: ${product}`);
    return wtoAdapter.getQuotas(product);
  }

  //Get all quota restrictions
  async getAllQuotas(): Promise<QRQuota[]> {
    logger.debug("Fetching all quotas");
    return wtoAdapter.getQuotas();
  }

  //Get combined alerts and quotas for a product (internal events)
  async getProductEvents(product: string): Promise<{
    alerts: EpingAlert[];
    quotas: QRQuota[];
  }> {
    const [alerts, quotas] = await Promise.all([
      this.getAlertsByProduct(product),
      this.getQuotasByProduct(product),
    ]);

    return { alerts, quotas };
  }

  // Filter by recency + severity + optional product (HS code or name)
  filterCriticalAlerts(alerts: EpingAlert[], days: number = 30, product?: string): EpingAlert[] {
    const now = new Date();
    const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const term = product?.toLowerCase();

    return alerts.filter((alert) => {
      const isRecent = alert.startDate >= cutoffDate;
      const isCritical = alert.severity === "critical" || alert.severity === "high";
      const matchesProduct =
        !term ||
        alert.product.toLowerCase().includes(term) ||
        alert.description.toLowerCase().includes(term) ||
        alert.reference.toLowerCase().includes(term);
      return isRecent && isCritical && matchesProduct;
    });
  }

  async getQRRegulations(params: {
    in_force_only?: boolean;
    product_codes?: string;
    reporter_member_code?: string;
    country?: string;
    page?: number;
  }): Promise<{ data: QRRegulation[]; meta: QRListMeta }> {
    logger.debug("Fetching QR regulations", undefined, params);

    const resolvedParams: typeof params = { ...params };
    if (params.country && !params.reporter_member_code) {
      const code = wtoAdapter.getMemberCode(params.country);
      if (code) resolvedParams.reporter_member_code = code;
    }
    delete resolvedParams.country;

    return wtoAdapter.getQRRegulations(resolvedParams);
  }

  async getQRRegulationById(id: number): Promise<QRRegulation | null> {
    logger.debug(`Fetching QR regulation by id: ${id}`);
    return wtoAdapter.getQRRegulationById(id);
  }

  async getQRProducts(description?: string, hs_version?: string): Promise<QRProduct[]> {
    logger.debug("Fetching QR products", undefined, { description, hs_version });
    const products = await wtoAdapter.getQRProducts(description, hs_version);
    return this.rankQRProducts(products, description);
  }
}

export const alertsService = new AlertsService();
