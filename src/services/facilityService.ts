import { wtoAdapter } from "../adapters/wto.server.js";
import { logger } from "../utils/logger.js";
import { TFADProcess, LogisticRequirement } from "../types/index.js";

/**
 * Facility Service
 * Handles customs procedures (TFAD), documentation, and logistics requirements
 */

export class FacilityService {
  /**
   * Get TFAD processes for a specific country
   */
  async getTFADProcesses(country: string): Promise<TFADProcess[]> {
    logger.debug(`Fetching TFAD processes for: ${country}`);
    return wtoAdapter.getTFADProcesses(country);
  }

  /**
   * Get all TFAD processes (unfiltered)
   */
  async getAllTFADProcesses(): Promise<TFADProcess[]> {
    logger.debug("Fetching all TFAD processes");
    return wtoAdapter.getTFADProcesses();
  }

  /**
   * Calculate estimated processing time and costs
   */
  async calculateClearanceEstimate(
    country: string,
    product: string
  ): Promise<{
    country: string;
    product: string;
    estimatedDays: number;
    estimatedCost: number;
    requiredDocuments: string[];
  }> {
    logger.debug(`Calculating clearance estimate for ${product} in ${country}`);

    const processes = await this.getTFADProcesses(country);
    const export_process = processes[0]; // Primary export process

    if (!export_process) {
      return {
        country,
        product,
        estimatedDays: 7,
        estimatedCost: 200,
        requiredDocuments: ["Export permit", "Commercial invoice", "Bill of lading"],
      };
    }

    return {
      country,
      product,
      estimatedDays: export_process.processing_time_days,
      estimatedCost: export_process.fees || 0,
      requiredDocuments: export_process.required_documents,
    };
  }

  /**
   * Get structured requirements for a product category
   */
  getLogisticRequirements(productCategory: string, country: string): LogisticRequirement[] {
    logger.debug(`Getting logistics requirements for ${productCategory} in ${country}`);

    // Mock implementation - in real scenario, fetch from DB
    const requirements: LogisticRequirement[] = [
      {
        requirement_id: `req-${productCategory}-1`,
        product_category: productCategory,
        country,
        description: "Phytosanitary certificate for agricultural products",
        mandatory: productCategory.toLowerCase().includes("agricultural"),
      },
      {
        requirement_id: `req-${productCategory}-2`,
        product_category: productCategory,
        country,
        description: "Certificate of origin",
        mandatory: true,
      },
      {
        requirement_id: `req-${productCategory}-3`,
        product_category: productCategory,
        country,
        description: "Pre-shipment inspection",
        mandatory: productCategory.toLowerCase().includes("chemicals"),
      },
    ];

    return requirements.filter((r) => r.mandatory);
  }

  /**
   * Check if a product requires special handling
   */
  requiresSpecialHandling(productCategory: string): boolean {
    const specialProducts = [
      "chemicals",
      "pharmaceuticals",
      "hazardous",
      "weapons",
      "fertilizers",
    ];
    return specialProducts.some((p) =>
      productCategory.toLowerCase().includes(p)
    );
  }
}

export const facilityService = new FacilityService();
