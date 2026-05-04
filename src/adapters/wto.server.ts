import axios, { AxiosInstance } from "axios";
import { cacheService } from "@cache/index.js";
import { logger } from "@utils/logger.js";
import {
  EpingAlert,
  QRQuota,
  HSVersion,
  MarketTrend,
  TFADProcess,
  QRRegulation,
  QRProduct,
  QRListMeta,
  TimeseriesQueryParams,
  TimeseriesDataPoint,
  ApiResponse,
} from "@app-types/index.js";
import * as mockData from "@utils/mock.js";
import wtoMembers from "@utils/wtoMembers.json";

/**
 * WTO Adapter - Single point of integration with WTO APIs
 *
 * Responsibilities:
 * - Manages individual WTO API keys per endpoint (Ocp-Apim-Subscription-Key header)
 * - Routes to specific WTO endpoints based on data type
 * - Caches responses in Redis with 5-minute TTL
 * - Falls back to mock data if API key is missing or upstream fails
 * - Transforms WTO raw responses to domain types
 */

class WTOAdapter {
  private apiClient: AxiosInstance;
  private apiKeys: Record<string, string>;
  private baseUrl: string = "https://api.wto.org";

  constructor() {
    this.baseUrl = process.env.WTO_BASE_URL || this.baseUrl;

    // Load individual API keys for each endpoint
    this.apiKeys = {
      eping: process.env.WTO_EPING_API_KEY || "",
      qr: process.env.WTO_QR_API_KEY || "",
      timeseries: process.env.WTO_TIMESERIES_API_KEY || "",
      tfad: process.env.WTO_TFAD_API_KEY || "",
      custom: process.env.WTO_CUSTOM_API_KEY || "",
    };

    this.apiClient = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Log initialization status
    const configuredEndpoints = Object.entries(this.apiKeys)
      .filter(([_, key]) => key)
      .map(([endpoint, _]) => endpoint);

    if (configuredEndpoints.length === 0) {
      logger.warn("No WTO API keys configured - using mock data fallback", undefined, {
        environment: process.env.NODE_ENV,
        baseUrl: this.baseUrl,
        keys: this.apiKeys,
      });
    } else {
      logger.info(`WTO Adapter initialized with ${configuredEndpoints.length} endpoints`, undefined, {
        endpoints: configuredEndpoints,
        baseUrl: this.baseUrl,
      });
    }
  }

  private getClientWithAuth(endpoint: "eping" | "qr" | "timeseries" | "tfad" | "custom"): AxiosInstance {
    const apiKey = this.apiKeys[endpoint];

    return axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
      headers: {
        "Content-Type": "application/json",
        ...(apiKey && { "Ocp-Apim-Subscription-Key": apiKey }),
      },
    });
  }

  // ALERTS & NOTIFICATIONS
  async getAlerts(product?: string): Promise<EpingAlert[]> {
    const cacheKey = `wto:alerts:${product || "all"}`;

    // Try cache first
    const cached = await cacheService.get<EpingAlert[]>(cacheKey);
    if (cached) {
      logger.debug(`Cache hit for alerts: ${product || "all"}`);
      return cached;
    }

    try {
      if (!this.apiKeys.eping) {
        throw new Error("No WTO ePing API key configured");
      }

      const client = this.getClientWithAuth("eping");
      const params = {
        language: "3", // 3 = Spanish
        pageSize: 100,
        ...(product && { freeText: product }),
      };
      
      logger.debug(`Calling ePing API with params:`, undefined, { params });
      
      const response = await client.get("/eping/notifications/search", {
        params,
      });

      const alerts = this.transformEPingResponse(response.data);
      await cacheService.set(cacheKey, alerts);
      return alerts;
    } catch (err: any) {
      const errorDetail = {
        message: err instanceof Error ? err.message : "Unknown error",
        status: err?.response?.status,
        statusText: err?.response?.statusText,
        responseData: err?.response?.data,
      };
      logger.warn(`WTO ePing API error for ${product || "all"}:`, undefined, errorDetail);
      const mockAlerts = mockData.getMockAlerts(product);
      await cacheService.set(cacheKey, mockAlerts);
      return mockAlerts;
    }
  }

  async getQuotas(product?: string): Promise<QRQuota[]> {
    const cacheKey = `wto:quotas:${product || "all"}`;

    const cached = await cacheService.get<QRQuota[]>(cacheKey);
    if (cached) {
      logger.debug(`Cache hit for quotas: ${product || "all"}`);
      return cached;
    }

    try {
      if (!this.apiKeys.qr) {
        throw new Error("No WTO QR API key configured");
      }

      const client = this.getClientWithAuth("qr");
      const response = await client.get("/qrs/qrs", {
        params: product ? { product_codes: product } : {},
      });

      const quotas = this.transformQRResponse(response.data);
      await cacheService.set(cacheKey, quotas);
      return quotas;
    } catch (err) {
      logger.warn(`WTO QR API error for ${product || "all"}: ${err instanceof Error ? err.message : "Unknown error"}. Using mock data.`);
      const mockQuotas = mockData.getMockQuotas(product);
      await cacheService.set(cacheKey, mockQuotas);
      return mockQuotas;
    }
  }

  async getHSVersions(): Promise<HSVersion[]> {
    const cacheKey = "wto:hs-versions";

    const cached = await cacheService.get<HSVersion[]>(cacheKey);
    if (cached) {
      logger.debug("Cache hit for HS versions");
      return cached;
    }

    try {
      if (!this.apiKeys.qr) {
        throw new Error("No WTO QR API key configured");
      }

      const client = this.getClientWithAuth("qr");
      const response = await client.get("/qrs/hs-versions");

      const versions = this.transformHSVersionsResponse(response.data);
      await cacheService.set(cacheKey, versions);
      return versions;
    } catch (err) {
      logger.warn(`WTO HS Versions API error: ${err instanceof Error ? err.message : "Unknown error"}. Using mock data.`);
      const mockVersions = mockData.getMockHSVersions?.() || [];
      await cacheService.set(cacheKey, mockVersions);
      return mockVersions;
    }
  }

  // ✅ MARKET TRENDS & TIMESERIES
  async getMarketTrends(product: string): Promise<MarketTrend[]> {
    const cacheKey = `wto:trends:${product}`;

    const cached = await cacheService.get<MarketTrend[]>(cacheKey);
    if (cached) {
      logger.debug(`Cache hit for market trends: ${product}`);
      return cached;
    }

    try {
      if (!this.apiKeys.timeseries) {
        throw new Error("No WTO Timeseries API key configured");
      }

      const client = this.getClientWithAuth("timeseries");
      
      // Get export and import data for the product
      // Note: API returns all products, we filter by SITC3 code in transformer
      // r = World (000), r parameter is REQUIRED
      const importParams = {
        i: "ITS_MTV_AM", // Import value indicator - annual merchandise imports by product groups (REQUIRED)
        r: "000", // World reporter (REQUIRED)
        fmt: "json",
        lang: 3, // Spanish (REQUIRED)
      };

      const exportParams = {
        i: "ITS_MTV_AX", // Export value indicator - annual merchandise exports by product groups (REQUIRED)
        r: "000", // World reporter (REQUIRED)
        fmt: "json",
        lang: 3, // Spanish (REQUIRED)
      };

      logger.debug(`Calling Timeseries API for imports/exports:`, undefined, { 
        importParams, 
        exportParams 
      });

      const [importResponse, exportResponse] = await Promise.all([
        client.get("/timeseries/v1/data", { params: importParams }).catch(err => {
          const errorData = {
            message: err.message,
            status: err?.response?.status,
            statusText: err?.response?.statusText,
            responseData: err?.response?.data,
            config: {
              url: err?.config?.url,
              params: err?.config?.params,
            },
          };
          logger.warn(`Timeseries imports API error:`, undefined, errorData);
          return { data: [] };
        }),
        client.get("/timeseries/v1/data", { params: exportParams }).catch(err => {
          const errorData = {
            message: err.message,
            status: err?.response?.status,
            statusText: err?.response?.statusText,
            responseData: err?.response?.data,
            config: {
              url: err?.config?.url,
              params: err?.config?.params,
            },
          };
          logger.warn(`Timeseries exports API error:`, undefined, errorData);
          return { data: [] };
        }),
      ]);

      const trends = this.transformTimeseriesResponse(
        importResponse.data,
        exportResponse.data,
        product
      );
      
      await cacheService.set(cacheKey, trends);
      return trends;
    } catch (err) {
      logger.warn(`WTO Timeseries API error for ${product}: ${err instanceof Error ? err.message : "Unknown error"}. Using mock data.`);
      const mockTrends = mockData.getMockMarketTrends(product);
      await cacheService.set(cacheKey, mockTrends);
      return mockTrends;
    }
  }

  // ✅ FACILITY & CUSTOMS
  async getTFADProcesses(country?: string): Promise<TFADProcess[]> {
    const cacheKey = `wto:tfad:${country || "all"}`;

    const cached = await cacheService.get<TFADProcess[]>(cacheKey);
    if (cached) {
      logger.debug(`Cache hit for TFAD processes: ${country || "all"}`);
      return cached;
    }

    try {
      if (!this.apiKeys.tfad) {
        throw new Error("No WTO TFAD API key configured");
      }

      const client = this.getClientWithAuth("tfad");
      const response = await client.get("/v1/tfad/processes", {
        params: country ? { country } : {},
      });

      const processes = this.transformTFADResponse(response.data);
      await cacheService.set(cacheKey, processes);
      return processes;
    } catch (err) {
      logger.warn(`WTO TFAD API error for ${country || "all"}: ${err instanceof Error ? err.message : "Unknown error"}. Using mock data.`);
      const mockProcesses = mockData.getMockTFADProcesses(country);
      await cacheService.set(cacheKey, mockProcesses);
      return mockProcesses;
    }
  }

  // ✅ RESPONSE TRANSFORMERS (WTO raw → Domain types)

  private transformEPingResponse(raw: any): EpingAlert[] {
    if (!Array.isArray(raw?.items)) return [];

    return raw.items.map((item: any) => ({
      id: item.id || `alert-${Math.random()}`,
      product: item.productsFreeText || item.title || "",
      country: item.notifyingMember || "",
      description: item.description || item.title || "",
      reference: item.documentSymbol || "",
      startDate: item.distributionDate ? new Date(item.distributionDate) : new Date(),
      endDate: item.commentDeadlineDate ? new Date(item.commentDeadlineDate) : undefined,
      severity: this.mapEPingSeverity(item.area, item.notificationType),
      apiSource: "ePing" as const,
    }));
  }

  private transformQRResponse(raw: any): QRQuota[] {
    if (!Array.isArray(raw?.data)) return [];

    return raw.data.map((item: any) => ({
      id: item.id || `quota-${Math.random()}`,
      product: item.general_description || "",
      country: item.reporter_member?.name?.en || "",
      quotaValue: item.in_force_from ? 1 : 0,
      quotaUnit: "restriction",
      remainingQuota: item.termination_dt ? 0 : 1,
      expiryDate: item.termination_dt ? new Date(item.termination_dt) : undefined,
      restrictions: item.restrictions ? item.restrictions : [],
    }));
  }

  private transformHSVersionsResponse(raw: any): HSVersion[] {
    if (!Array.isArray(raw?.data)) return [];

    return raw.data.map((item: any) => ({
      code: item.code || "",
      version: item.version || "",
      label: item.label || "",
    }));
  }

  private transformTimeseriesResponse(importData: any, exportData: any, productFilter: string): MarketTrend[] {
    const trends: Map<string, MarketTrend> = new Map();

    // WTO API returns Dataset array - normalize both formats
    const importArray = Array.isArray(importData) 
      ? importData 
      : (Array.isArray(importData?.Dataset) ? importData.Dataset : (Array.isArray(importData?.data) ? importData.data : []));
    
    const exportArray = Array.isArray(exportData) 
      ? exportData 
      : (Array.isArray(exportData?.Dataset) ? exportData.Dataset : (Array.isArray(exportData?.data) ? exportData.data : []));

    // SITC3 product codes for filtering (TO=Total, AG=Agricultural, etc)
    const sitc3Codes = ["TO", "AG", "AGFO", "MI", "MIFU", "MA", "MAIS", "MACH", "MACHPH", "MAMT"];
    // If productFilter is provided, use it; otherwise use TO (Total merchandise)
    const targetProduct = productFilter && productFilter !== "all" ? productFilter : "TO";

    // Process import data (from Dataset structure)
    importArray.forEach((item: any) => {
      const productCode = item.ProductOrSectorCode || "";
      const country = item.ReportingEconomy || item.ReportingEconomyCode || "";
      
      // Only include if product matches or is total
      if (productCode !== targetProduct) return;
      
      const year = item.Year?.toString() || "";
      const key = `${country}-${year}`;

      if (!trends.has(key)) {
        trends.set(key, {
          product: item.ProductOrSector || targetProduct,
          product_code: productCode,
          country,
          period: year,
          importValue: parseFloat(item.Value) || 0,
          exportValue: 0,
          yoyGrowth: 0,
          competitionLevel: "low" as const,
        });
      } else {
        const trend = trends.get(key)!;
        trend.importValue = parseFloat(item.Value) || 0;
      }
    });

    // Process export data (from Dataset structure)
    exportArray.forEach((item: any) => {
      const productCode = item.ProductOrSectorCode || "";
      const country = item.ReportingEconomy || item.ReportingEconomyCode || "";
      
      // Only include if product matches or is total
      if (productCode !== targetProduct) return;
      
      const year = item.Year?.toString() || "";
      const key = `${country}-${year}`;

      if (!trends.has(key)) {
        trends.set(key, {
          product: item.ProductOrSector || targetProduct,
          product_code: productCode,
          country,
          period: year,
          importValue: 0,
          exportValue: parseFloat(item.Value) || 0,
          yoyGrowth: 0,
          competitionLevel: "low" as const,
        });
      } else {
        const trend = trends.get(key)!;
        trend.exportValue = parseFloat(item.Value) || 0;
      }
    });

    // Calculate competition level based on trade values
    const result = Array.from(trends.values()).map(trend => ({
      ...trend,
      competitionLevel: this.calculateCompetitionLevel(trend.importValue, trend.exportValue),
    }));

    return result;
  }

  private calculateCompetitionLevel(importValue: number, exportValue: number): "low" | "medium" | "high" {
    const totalValue = importValue + exportValue;
    
    if (totalValue > 1000000000) return "high"; // > $1B
    if (totalValue > 100000000) return "medium"; // > $100M
    return "low";
  }

  private transformTimeseriesDataPoints(raw: any): TimeseriesDataPoint[] {
    const items = Array.isArray(raw?.Dataset) ? raw.Dataset
                : Array.isArray(raw?.data)    ? raw.data
                : Array.isArray(raw)          ? raw
                : [];
    return items.map((item: any) => ({
      indicator:     item.Indicator            ?? item.indicator            ?? "",
      reporter:      item.ReportingEconomy     ?? item.reporter             ?? "",
      reporter_code: item.ReportingEconomyCode ?? item.reporter_code        ?? "",
      partner:       item.PartnerEconomy       ?? item.partner,
      partner_code:  item.PartnerEconomyCode   ?? item.partner_code,
      product:       item.ProductOrSector      ?? item.product              ?? "",
      product_code:  item.ProductOrSectorCode  ?? item.product_code         ?? "",
      period:        String(item.Year ?? item.Period ?? item.period         ?? ""),
      value:         parseFloat(item.Value ?? item.value ?? "0")            || 0,
      unit:          item.Unit                 ?? item.unit,
      frequency:     item.Frequency            ?? item.frequency,
    }));
  }

  private transformQRListResponse(raw: any): { data: QRRegulation[]; meta: QRListMeta } {
    const items = Array.isArray(raw?.data) ? raw.data : Array.isArray(raw) ? raw : [];
    return {
      data: items.map((item: any) => this.transformQRRegulationItem(item)),
      meta: {
        total: raw?.meta?.total ?? items.length,
        page: raw?.meta?.current_page ?? raw?.meta?.page ?? 1,
        last_page: raw?.meta?.last_page ?? raw?.meta?.total_pages ?? 1,
      },
    };
  }

  private transformQRRegulationItem(item: any): QRRegulation {
    return {
      id: item.id,
      reporter_member: {
        code: item.reporter_member?.code ?? item.reporter_member_code,
        name: {
          es: item.reporter_member?.name?.es ?? item.reporter_member?.name?.en ?? item.reporter_member?.name ?? "",
          en: item.reporter_member?.name?.en,
        },
      },
      general_description: item.general_description ?? "",
      in_force_from: item.in_force_from ?? "",
      termination_dt: item.termination_dt ?? null,
      measures: Array.isArray(item.measures) ? item.measures : [],
      affected_products: Array.isArray(item.affected_products) ? item.affected_products : undefined,
      notified_in: Array.isArray(item.notified_in) ? item.notified_in : [],
      details: item.details,
      national_legal_bases: item.national_legal_bases,
      administrative_mechanisms: item.administrative_mechanisms,
    };
  }

  private transformQRProductsResponse(raw: any): QRProduct[] {
    const items = Array.isArray(raw?.data) ? raw.data : Array.isArray(raw) ? raw : [];
    return items.map((item: any) => ({
      code: item.code ?? item.product_code ?? "",
      description: item.description ?? item.label ?? "",
      hs_version: item.hs_version ?? item.hs_version_code ?? "",
    }));
  }

  private transformTFADResponse(raw: any): TFADProcess[] {
    if (!Array.isArray(raw?.data)) return [];

    return raw.data.map((item: any) => ({
      process_id: item.id || `tfad-${Math.random()}`,
      process_name: item.name || "",
      country: item.country_name || "",
      required_documents: item.required_documents ? item.required_documents.split("|") : [],
      processing_time_days: item.processing_days || 0,
      fees: item.fees || 0,
      last_update: new Date(item.last_updated || Date.now()),
    }));
  }

  // ✅ UTILITY HELPERS

  private mapSeverity(type: string): "low" | "medium" | "high" | "critical" {
    const severityMap: Record<string, "low" | "medium" | "high" | "critical"> = {
      urgent: "critical",
      high: "high",
      medium: "medium",
      low: "low",
    };
    return severityMap[type?.toLowerCase()] || "medium";
  }

  private mapEPingSeverity(area: string, notificationType: string): "low" | "medium" | "high" | "critical" {
    // SPS notifications are typically higher severity as they relate to food safety
    if (area?.toUpperCase() === "SPS") {
      if (notificationType?.toLowerCase().includes("urgent")) return "critical";
      return "high";
    }
    // TBT notifications are technical regulations
    if (notificationType?.toLowerCase().includes("urgent")) return "high";
    return "medium";
  }

  private mapCompetitionLevel(concentration: number): "low" | "medium" | "high" {
    if (concentration > 0.66) return "high";
    if (concentration > 0.33) return "medium";
    return "low";
  }

  /**
   * Get available indicators for Timeseries
   */
  async getTimeseriesIndicators(): Promise<any[]> {
    const cacheKey = "wto:timeseries:indicators";

    const cached = await cacheService.get<any[]>(cacheKey);
    if (cached) {
      logger.debug("Cache hit for Timeseries indicators");
      return cached;
    }

    try {
      if (!this.apiKeys.timeseries) {
        throw new Error("No WTO Timeseries API key configured");
      }

      const client = this.getClientWithAuth("timeseries");
      const response = await client.get("/timeseries/v1/indicators", {
        params: { lang: 3 }, // Spanish (REQUIRED)
      });

      const indicators = Array.isArray(response.data) ? response.data : response.data.data || [];
      await cacheService.set(cacheKey, indicators);
      return indicators;
    } catch (err) {
      logger.warn(`Timeseries indicators API error: ${err instanceof Error ? err.message : "Unknown error"}`);
      return [];
    }
  }

  /**
   * Search indicators by name
   */
  async searchTimeseriesIndicators(searchTerm: string): Promise<any[]> {
    try {
      if (!this.apiKeys.timeseries) {
        throw new Error("No WTO Timeseries API key configured");
      }

      const client = this.getClientWithAuth("timeseries");
      const response = await client.get("/timeseries/v1/indicators", {
        params: { 
          name: searchTerm,
          lang: 3, // Spanish
        },
      });

      const indicators = Array.isArray(response.data) ? response.data : response.data.data || [];
      return indicators;
    } catch (err) {
      logger.warn(`Timeseries indicator search error for "${searchTerm}": ${err instanceof Error ? err.message : "Unknown error"}`);
      return [];
    }
  }

  /**
   * Get available reporting economies (countries)
   */
  async getTimeseriesEconomies(): Promise<any[]> {
    const cacheKey = "wto:timeseries:economies";

    const cached = await cacheService.get<any[]>(cacheKey);
    if (cached) {
      logger.debug("Cache hit for Timeseries economies");
      return cached;
    }

    try {
      if (!this.apiKeys.timeseries) {
        throw new Error("No WTO Timeseries API key configured");
      }

      const client = this.getClientWithAuth("timeseries");
      const response = await client.get("/timeseries/v1/reporters", {
        params: { lang: 3 }, // Spanish (REQUIRED)
      });

      const economies = Array.isArray(response.data) ? response.data : response.data.data || [];
      await cacheService.set(cacheKey, economies);
      return economies;
    } catch (err) {
      logger.warn(`Timeseries economies API error: ${err instanceof Error ? err.message : "Unknown error"}`);
      return [];
    }
  }

  /**
   * Get available products/sectors
   */
  async getTimeseriesProducts(): Promise<any[]> {
    const cacheKey = "wto:timeseries:products";

    const cached = await cacheService.get<any[]>(cacheKey);
    if (cached) {
      logger.debug("Cache hit for Timeseries products");
      return cached;
    }

    try {
      if (!this.apiKeys.timeseries) {
        throw new Error("No WTO Timeseries API key configured");
      }

      const client = this.getClientWithAuth("timeseries");
      const response = await client.get("/timeseries/v1/products", {
        params: { lang: 3 }, // Spanish (REQUIRED)
      });

      const products = Array.isArray(response.data) ? response.data : response.data.data || [];
      await cacheService.set(cacheKey, products);
      return products;
    } catch (err) {
      logger.warn(`Timeseries products API error: ${err instanceof Error ? err.message : "Unknown error"}`);
      return [];
    }
  }

  // TIMESERIES — CORE QUERY

  async queryTimeseries(params: TimeseriesQueryParams): Promise<TimeseriesDataPoint[]> {
    const cacheKey = `wto:ts:query:${params.indicator}:${params.reporters ?? "all"}:${params.partners ?? "world"}:${params.periods ?? "all"}:${params.frequency ?? "A"}:${params.products ?? "all"}`;

    const cached = await cacheService.get<TimeseriesDataPoint[]>(cacheKey);
    if (cached) {
      logger.debug(`Cache hit: ${cacheKey}`);
      return cached;
    }

    try {
      if (!this.apiKeys.timeseries) throw new Error("No WTO Timeseries API key configured");

      const client = this.getClientWithAuth("timeseries");
      const response = await client.get("/timeseries/v1/data", {
        params: {
          i: params.indicator,
          ...(params.reporters && { r: params.reporters }),
          ...(params.partners  && { p: params.partners }),
          ...(params.periods   && { ps: params.periods }),
          ...(params.products  && { pc: params.products }),
          freq: params.frequency ?? "A",
          fmt: "json",
          lang: 3,
          ...(params.max && { max: params.max }),
        },
      });

      const dataPoints = this.transformTimeseriesDataPoints(response.data);
      await cacheService.set(cacheKey, dataPoints);
      return dataPoints;
    } catch (err) {
      logger.warn(`WTO Timeseries query error (${params.indicator}): ${err instanceof Error ? err.message : "Unknown error"}. Using mock data.`);
      const mock = mockData.getMockTimeseriesDataPoints(params);
      await cacheService.set(cacheKey, mock);
      return mock;
    }
  }

  async getTimeseriesDataCount(params: Omit<TimeseriesQueryParams, "max">): Promise<number> {
    try {
      if (!this.apiKeys.timeseries) return 0;
      const client = this.getClientWithAuth("timeseries");
      const response = await client.get("/timeseries/v1/data_count", {
        params: {
          i: params.indicator,
          ...(params.reporters && { r: params.reporters }),
          ...(params.partners  && { p: params.partners }),
          ...(params.periods   && { ps: params.periods }),
          freq: params.frequency ?? "A",
          lang: 3,
        },
      });
      return typeof response.data === "number" ? response.data : (response.data?.count ?? 0);
    } catch (err) {
      logger.warn(`WTO data count error: ${err instanceof Error ? err.message : "Unknown error"}`);
      return 0;
    }
  }

  // TIMESERIES — CATALOGUES

  async getTimeseriesFrequencies(): Promise<any[]> {
    const cacheKey = "wto:timeseries:frequencies";
    const cached = await cacheService.get<any[]>(cacheKey);
    if (cached) return cached;
    try {
      if (!this.apiKeys.timeseries) throw new Error("No WTO Timeseries API key configured");
      const r = await this.getClientWithAuth("timeseries").get("/timeseries/v1/frequencies", { params: { lang: 3 } });
      const data = Array.isArray(r.data) ? r.data : (r.data?.data ?? []);
      await cacheService.set(cacheKey, data);
      return data;
    } catch {
      return [{ code: "A", name: "Anual" }, { code: "Q", name: "Trimestral" }, { code: "M", name: "Mensual" }];
    }
  }

  async getTimeseriesPeriods(indicator?: string): Promise<any[]> {
    const cacheKey = `wto:timeseries:periods:${indicator ?? "all"}`;
    const cached = await cacheService.get<any[]>(cacheKey);
    if (cached) return cached;
    try {
      if (!this.apiKeys.timeseries) throw new Error("No WTO Timeseries API key configured");
      const r = await this.getClientWithAuth("timeseries").get("/timeseries/v1/periods", {
        params: { lang: 3, ...(indicator && { i: indicator }) },
      });
      const data = Array.isArray(r.data) ? r.data : (r.data?.data ?? []);
      await cacheService.set(cacheKey, data);
      return data;
    } catch {
      return Array.from({ length: 10 }, (_, i) => ({ period: String(2015 + i) }));
    }
  }

  async getTimeseriesUnits(): Promise<any[]> {
    const cacheKey = "wto:timeseries:units";
    const cached = await cacheService.get<any[]>(cacheKey);
    if (cached) return cached;
    try {
      if (!this.apiKeys.timeseries) throw new Error("No WTO Timeseries API key configured");
      const r = await this.getClientWithAuth("timeseries").get("/timeseries/v1/units", { params: { lang: 3 } });
      const data = Array.isArray(r.data) ? r.data : (r.data?.data ?? []);
      await cacheService.set(cacheKey, data);
      return data;
    } catch {
      return [{ code: "USD_1000", name: "Miles de dólares USD" }];
    }
  }

  async getTimeseriesValueFlags(): Promise<any[]> {
    const cacheKey = "wto:timeseries:value_flags";
    const cached = await cacheService.get<any[]>(cacheKey);
    if (cached) return cached;
    try {
      if (!this.apiKeys.timeseries) throw new Error("No WTO Timeseries API key configured");
      const r = await this.getClientWithAuth("timeseries").get("/timeseries/v1/value_flags", { params: { lang: 3 } });
      const data = Array.isArray(r.data) ? r.data : (r.data?.data ?? []);
      await cacheService.set(cacheKey, data);
      return data;
    } catch {
      return [{ code: "E", name: "Estimado" }, { code: "P", name: "Provisional" }];
    }
  }

  async getTimeseriesPartnerEconomies(): Promise<any[]> {
    const cacheKey = "wto:timeseries:partners";
    const cached = await cacheService.get<any[]>(cacheKey);
    if (cached) return cached;
    try {
      if (!this.apiKeys.timeseries) throw new Error("No WTO Timeseries API key configured");
      const r = await this.getClientWithAuth("timeseries").get("/timeseries/v1/partners", { params: { lang: 3 } });
      const data = Array.isArray(r.data) ? r.data : (r.data?.data ?? []);
      await cacheService.set(cacheKey, data);
      return data;
    } catch {
      return [];
    }
  }

  async getTimeseriesEconomicGroups(): Promise<any[]> {
    const cacheKey = "wto:timeseries:economic_groups";
    const cached = await cacheService.get<any[]>(cacheKey);
    if (cached) return cached;
    try {
      if (!this.apiKeys.timeseries) throw new Error("No WTO Timeseries API key configured");
      const r = await this.getClientWithAuth("timeseries").get("/timeseries/v1/economic_groups", { params: { lang: 3 } });
      const data = Array.isArray(r.data) ? r.data : (r.data?.data ?? []);
      await cacheService.set(cacheKey, data);
      return data;
    } catch {
      return [];
    }
  }

  async getTimeseriesGeographicalRegions(): Promise<any[]> {
    const cacheKey = "wto:timeseries:geographical_regions";
    const cached = await cacheService.get<any[]>(cacheKey);
    if (cached) return cached;
    try {
      if (!this.apiKeys.timeseries) throw new Error("No WTO Timeseries API key configured");
      const r = await this.getClientWithAuth("timeseries").get("/timeseries/v1/geographical_regions", { params: { lang: 3 } });
      const data = Array.isArray(r.data) ? r.data : (r.data?.data ?? []);
      await cacheService.set(cacheKey, data);
      return data;
    } catch {
      return [];
    }
  }

  // QR REGULATIONS (full structured endpoints)

  async getQRRegulations(params: {
    in_force_only?: boolean;
    product_codes?: string;
    reporter_member_code?: string;
    page?: number;
  }): Promise<{ data: QRRegulation[]; meta: QRListMeta }> {
    const cacheKey = `wto:qr:regulations:${params.product_codes || "all"}:${params.reporter_member_code || "all"}:${params.in_force_only ? "active" : "all"}:${params.page || 1}`;

    const cached = await cacheService.get<{ data: QRRegulation[]; meta: QRListMeta }>(cacheKey);
    if (cached) {
      logger.debug(`Cache hit for QR regulations: ${cacheKey}`);
      return cached;
    }

    try {
      if (!this.apiKeys.qr) {
        throw new Error("No WTO QR API key configured");
      }

      const client = this.getClientWithAuth("qr");
      const response = await client.get("/qrs/qrs", {
        params: {
          in_force_only: params.in_force_only ?? true,
          ...(params.product_codes && { product_codes: params.product_codes }),
          ...(params.reporter_member_code && { reporter_member_code: params.reporter_member_code }),
          page: params.page || 1,
        },
      });

      const result = this.transformQRListResponse(response.data);
      await cacheService.set(cacheKey, result);
      return result;
    } catch (err) {
      logger.warn(`WTO QR regulations API error: ${err instanceof Error ? err.message : "Unknown error"}. Using mock data.`);
      const mock = mockData.getMockQRRegulations(params);
      await cacheService.set(cacheKey, mock);
      return mock;
    }
  }

  async getQRRegulationById(id: number): Promise<QRRegulation | null> {
    const cacheKey = `wto:qr:regulation:${id}`;

    const cached = await cacheService.get<QRRegulation>(cacheKey);
    if (cached) {
      logger.debug(`Cache hit for QR regulation: ${id}`);
      return cached;
    }

    try {
      if (!this.apiKeys.qr) {
        throw new Error("No WTO QR API key configured");
      }

      const client = this.getClientWithAuth("qr");
      const response = await client.get(`/qrs/qrs/${id}`);
      const regulation = this.transformQRRegulationItem(response.data?.data ?? response.data);
      await cacheService.set(cacheKey, regulation);
      return regulation;
    } catch (err) {
      logger.warn(`WTO QR regulation ${id} API error: ${err instanceof Error ? err.message : "Unknown error"}. Using mock data.`);
      const mock = mockData.getMockQRRegulationById(id);
      if (mock) await cacheService.set(cacheKey, mock);
      return mock;
    }
  }

  async getQRProducts(description?: string, hs_version?: string): Promise<QRProduct[]> {
    const cacheKey = `wto:qr:products:${description || "all"}:${hs_version || "h6"}`;

    const cached = await cacheService.get<QRProduct[]>(cacheKey);
    if (cached) {
      logger.debug(`Cache hit for QR products: ${cacheKey}`);
      return cached;
    }

    try {
      if (!this.apiKeys.qr) {
        throw new Error("No WTO QR API key configured");
      }

      const client = this.getClientWithAuth("qr");
      const response = await client.get("/qrs/products", {
        params: {
          hs_version: hs_version || "h6",
          ...(description && { description }),
        },
      });

      const products = this.transformQRProductsResponse(response.data);
      await cacheService.set(cacheKey, products);
      return products;
    } catch (err) {
      logger.warn(`WTO QR products API error: ${err instanceof Error ? err.message : "Unknown error"}. Using mock data.`);
      const mock = mockData.getMockQRProducts(description, hs_version);
      await cacheService.set(cacheKey, mock);
      return mock;
    }
  }

  getMemberCode(countryName: string): string | undefined {
    return wtoMembers.items.find(
      (m) => m.text.toLowerCase() === countryName.toLowerCase()
    )?.value;
  }

  /**
   * Clear all cache entries (useful for testing or cache invalidation)
   */
  async clearCache(pattern?: string): Promise<void> {
    if (pattern) {
      const key = `wto:${pattern}:*`;
      await cacheService.delete(key);
    } else {
      await cacheService.clear();
    }
  }
}

// Singleton instance
export const wtoAdapter = new WTOAdapter();
