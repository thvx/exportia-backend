import { wtoAdapter } from "@adapters/wto.server.js";
import { logger } from "@utils/logger.js";
import * as mockData from "@utils/mock.js";
import {
  MarketTrend,
  CompetitorScore,
  TimeseriesDataPoint,
  DemandTrend,
  MarketProfile,
  PotentialMarket,
} from "@types/index.js";

export class MarketsService {

  // ── EXISTING ──────────────────────────────────────────────────────────────

  async getMarketTrends(product: string): Promise<MarketTrend[]> {
    logger.debug(`Fetching market trends for: ${product}`);
    return wtoAdapter.getMarketTrends(product);
  }

  async analyzeCompetition(product: string, country: string): Promise<{
    trends: MarketTrend[];
    competitors: CompetitorScore[];
  }> {
    logger.debug(`Analyzing competition for ${product} in ${country}`);
    const trends = await this.getMarketTrends(product);
    const competitors: CompetitorScore[] = trends
      .filter((t) => t.country !== country)
      .map((t) => ({
        competitor_country: t.country,
        market_share: this.estimateMarketShare([...trends], t.country),
        trend: this.analyzeTrend(t.yoyGrowth || 0),
        last_updated: new Date(),
      }));
    return { trends, competitors: competitors.sort((a, b) => b.market_share - a.market_share) };
  }

  async getTrendingProducts(limit: number = 10): Promise<MarketTrend[]> {
    logger.debug(`Fetching trending products (top ${limit})`);
    const sitc3Products = ["TO", "AG", "AGFO", "MI", "MIFU", "MA", "MAIS", "MACH", "MACHPH", "MAMT"];
    const allTrends: MarketTrend[] = [];
    for (const product of sitc3Products.slice(0, limit)) {
      try {
        allTrends.push(...(await this.getMarketTrends(product)));
      } catch (err) {
        logger.warn(`Failed to get trends for ${product}: ${err instanceof Error ? err.message : "Unknown error"}`);
      }
    }
    return allTrends.sort((a, b) => (b.yoyGrowth || 0) - (a.yoyGrowth || 0)).slice(0, limit);
  }

  async getTimeseriesIndicators(): Promise<any[]> { return wtoAdapter.getTimeseriesIndicators(); }
  async getTimeseriesEconomies(): Promise<any[]>  { return wtoAdapter.getTimeseriesEconomies(); }
  async getTimeseriesProducts(): Promise<any[]>   { return wtoAdapter.getTimeseriesProducts(); }

  async clearCache(pattern?: string): Promise<void> {
    return wtoAdapter.clearCache(pattern);
  }

  async searchIndicators(searchTerm: string): Promise<any[]> {
    return wtoAdapter.searchTimeseriesIndicators(searchTerm);
  }

  // ── DEMAND ANALYSIS ───────────────────────────────────────────────────────

  /**
   * Casos 1 / 2 / 3: importaciones por producto, país y período.
   * - Sin reporters: demanda global (caso 3)
   * - Con reporters: países específicos (caso 1 / 2)
   * - Con products: producto concreto (caso 1) o sin filtro (caso 2)
   */
  async getDemandTrends(params: {
    indicator?: string;
    reporters?: string;
    partners?: string;
    periods?: string;
    frequency?: "A" | "Q" | "M";
    products?: string;
  }): Promise<DemandTrend[]> {
    logger.debug("Fetching demand trends", undefined, params);
    const dataPoints = await wtoAdapter.queryTimeseries({
      indicator: params.indicator ?? "ITS_MTV_AM",
      reporters: params.reporters,
      partners:  params.partners,
      periods:   params.periods ?? this.getDefaultPeriods(),
      frequency: params.frequency ?? "A",
      products:  params.products,
    });
    return this.calculateYoYGrowth(dataPoints);
  }

  /** Caso 4: perfil completo de un mercado (tamaño, CAGR, volatilidad, proveedores). */
  async getMarketProfile(
    reporter: string,
    product: string,
    partners?: string,
    periods?: string
  ): Promise<MarketProfile> {
    logger.debug(`Fetching market profile reporter=${reporter} product=${product}`);
    const resolvedPeriods = periods ?? this.getDefaultPeriods(6);

    const [importData, supplierData] = await Promise.all([
      wtoAdapter.queryTimeseries({ indicator: "ITS_MTV_AM", reporters: reporter, periods: resolvedPeriods, products: product }),
      wtoAdapter.queryTimeseries({ indicator: "ITS_MTV_AM", reporters: reporter, partners, periods: resolvedPeriods, products: product }),
    ]);

    const sorted   = [...importData].sort((a, b) => a.period.localeCompare(b.period));
    const trends   = this.calculateYoYGrowth(importData);
    const growths  = trends.filter((t) => t.yoy_growth != null).map((t) => t.yoy_growth!);

    const market_size = sorted.at(-1)?.value ?? 0;
    const cagr = sorted.length >= 2
      ? this.calculateCAGR(sorted[0].value, sorted.at(-1)!.value, sorted.length - 1)
      : 0;

    const totalSupply = supplierData.reduce((s, d) => s + d.value, 0);
    const supplierMap = new Map<string, { name: string; value: number }>();
    supplierData.forEach((d) => {
      if (!d.partner_code || d.partner_code === "000") return;
      const cur = supplierMap.get(d.partner_code);
      supplierMap.set(d.partner_code, { name: d.partner ?? d.partner_code, value: (cur?.value ?? 0) + d.value });
    });

    const top_suppliers = [...supplierMap.entries()]
      .map(([code, s]) => ({ country: s.name, country_code: code, share: totalSupply > 0 ? Math.round((s.value / totalSupply) * 10000) / 100 : 0 }))
      .sort((a, b) => b.share - a.share)
      .slice(0, 5);

    return {
      reporter: importData[0]?.reporter ?? reporter,
      reporter_code: reporter,
      product: importData[0]?.product ?? product,
      product_code: product,
      market_size,
      cagr: Math.round(cagr * 100) / 100,
      volatility: Math.round(this.calculateStdDev(growths) * 100) / 100,
      trend: this.determineTrend(growths),
      top_suppliers,
      periods: [...new Set(importData.map((d) => d.period))].sort(),
      data: trends,
    };
  }

  /** Maps an HS chapter code to the closest WTO SITC3 product group for Timeseries queries. */
  private hsChapterToSitc3(product: string): string {
    const digits = product.replace(/\D/g, "");
    if (!digits) return product;
    const ch = parseInt(digits.slice(0, 2), 10);
    if (ch >= 1  && ch <= 24) return "AGFO";
    if (ch >= 25 && ch <= 27) return "MIFU";
    if (ch >= 28 && ch <= 38) return "MACH";
    if (ch >= 39 && ch <= 49) return "MA";
    if (ch >= 50 && ch <= 63) return "MAIS";
    if (ch >= 64 && ch <= 83) return "MAMT";
    if (ch >= 84 && ch <= 90) return "MACHPH";
    return "MA";
  }

  private isHsCode(product: string): boolean {
    return /^\d{2,10}$/.test(product.trim());
  }

  /** 4.1: Mercados potenciales ordenados por crecimiento reciente. */
  async getPotentialMarkets(product: string, periods?: string, limit: number = 10): Promise<PotentialMarket[]> {
    logger.debug(`Fetching potential markets product=${product}`);

    // When the caller passes an HS code, derive SITC3 for the WTO API but keep the HS code for mock selection
    const wtoProduct = this.isHsCode(product) ? this.hsChapterToSitc3(product) : product;

    const dataPoints = await wtoAdapter.queryTimeseries({
      indicator: "ITS_MTV_AM",
      periods: periods ?? this.getDefaultPeriods(6),
      products: wtoProduct,
    });

    const trends = this.calculateYoYGrowth(dataPoints);
    const byReporter = new Map<string, DemandTrend[]>();
    trends.forEach((t) => {
      if (!byReporter.has(t.reporter_code)) byReporter.set(t.reporter_code, []);
      byReporter.get(t.reporter_code)!.push(t);
    });

    const result: PotentialMarket[] = [];
    byReporter.forEach((series, code) => {
      const sorted   = [...series].sort((a, b) => a.period.localeCompare(b.period));
      const growths  = sorted.filter((t) => t.yoy_growth != null).map((t) => t.yoy_growth!);
      const lastVal  = sorted.at(-1)?.import_value ?? 0;
      const recent   = growths.length ? growths.slice(-2).reduce((a, b) => a + b, 0) / Math.min(2, growths.length) : 0;
      const cagr     = sorted.length >= 2 ? this.calculateCAGR(sorted[0].import_value, lastVal, sorted.length - 1) : 0;
      result.push({
        reporter: sorted[0]?.reporter ?? code,
        reporter_code: code,
        import_value: lastVal,
        growth_rate: Math.round(recent * 100) / 100,
        trend: this.determineTrend(growths),
        cagr: Math.round(cagr * 100) / 100,
      });
    });

    const filtered = result.filter((m) => m.import_value > 0).sort((a, b) => b.growth_rate - a.growth_rate).slice(0, limit);
    if (filtered.length === 0) {
      logger.debug(`No timeseries data for product=${product}, falling back to mock potential markets`);
      return mockData.getMockPotentialMarkets(product, limit);
    }
    return filtered;
  }

  /** 4.2: Cuota de mercado por país proveedor (dimensión partner). */
  async getMarketShareBySupplier(
    reporter: string,
    product: string,
    periods?: string
  ): Promise<Array<{ country: string; country_code: string; share: number; import_value: number }>> {
    logger.debug(`Fetching market share by supplier reporter=${reporter} product=${product}`);

    const dataPoints = await wtoAdapter.queryTimeseries({
      indicator: "ITS_MTV_AM",
      reporters: reporter,
      periods: periods ?? this.getDefaultPeriods(3),
      products: product,
    });

    const total = dataPoints.reduce((s, d) => s + d.value, 0);
    const supplierMap = new Map<string, { name: string; value: number }>();
    dataPoints.forEach((d) => {
      if (!d.partner_code || d.partner_code === "000") return;
      const cur = supplierMap.get(d.partner_code);
      supplierMap.set(d.partner_code, { name: d.partner ?? d.partner_code, value: (cur?.value ?? 0) + d.value });
    });

    return [...supplierMap.entries()]
      .map(([code, s]) => ({
        country: s.name,
        country_code: code,
        share: total > 0 ? Math.round((s.value / total) * 10000) / 100 : 0,
        import_value: s.value,
      }))
      .sort((a, b) => b.share - a.share);
  }

  /** 4.4: Estacionalidad de la demanda (frecuencia trimestral o mensual). */
  async getSeasonality(
    product: string,
    reporter: string,
    frequency: "Q" | "M" = "Q",
    periods?: string
  ): Promise<DemandTrend[]> {
    logger.debug(`Fetching seasonality product=${product} reporter=${reporter}`);
    const dataPoints = await wtoAdapter.queryTimeseries({
      indicator: "ITS_MTV_AM",
      reporters: reporter,
      periods: periods ?? this.getDefaultPeriods(3),
      products: product,
      frequency,
    });
    return this.calculateYoYGrowth(dataPoints);
  }

  /** 4.5: Volatilidad por mercado (desviación estándar del crecimiento YoY). */
  async getMarketVolatility(
    product: string,
    reporters?: string,
    periods?: string
  ): Promise<Array<{ reporter: string; reporter_code: string; volatility: number; trend: "rising" | "stable" | "declining"; risk: "low" | "medium" | "high" }>> {
    logger.debug(`Fetching market volatility product=${product}`);

    const trends = this.calculateYoYGrowth(
      await wtoAdapter.queryTimeseries({ indicator: "ITS_MTV_AM", reporters, periods: periods ?? this.getDefaultPeriods(8), products: product })
    );

    const byReporter = new Map<string, DemandTrend[]>();
    trends.forEach((t) => {
      if (!byReporter.has(t.reporter_code)) byReporter.set(t.reporter_code, []);
      byReporter.get(t.reporter_code)!.push(t);
    });

    const result: Array<{ reporter: string; reporter_code: string; volatility: number; trend: "rising" | "stable" | "declining"; risk: "low" | "medium" | "high" }> = [];
    byReporter.forEach((series, code) => {
      const growths    = series.filter((t) => t.yoy_growth != null).map((t) => t.yoy_growth!);
      const volatility = Math.round(this.calculateStdDev(growths) * 100) / 100;
      result.push({
        reporter: series[0]?.reporter ?? code,
        reporter_code: code,
        volatility,
        trend: this.determineTrend(growths),
        risk: volatility > 20 ? "high" : volatility > 10 ? "medium" : "low",
      });
    });

    return result.sort((a, b) => b.volatility - a.volatility);
  }

  /** 4.6: Comparación lado a lado de múltiples mercados. */
  async compareMarkets(
    product: string,
    reporters: string,
    periods?: string
  ): Promise<{
    reporters: string[];
    data: DemandTrend[];
    summary: Array<{ reporter: string; reporter_code: string; latest_value: number; cagr: number; trend: string }>;
  }> {
    logger.debug(`Comparing markets product=${product} reporters=${reporters}`);

    const trends = this.calculateYoYGrowth(
      await wtoAdapter.queryTimeseries({ indicator: "ITS_MTV_AM", reporters, periods: periods ?? this.getDefaultPeriods(6), products: product })
    );

    const byReporter = new Map<string, DemandTrend[]>();
    trends.forEach((t) => {
      if (!byReporter.has(t.reporter_code)) byReporter.set(t.reporter_code, []);
      byReporter.get(t.reporter_code)!.push(t);
    });

    const summary: Array<{ reporter: string; reporter_code: string; latest_value: number; cagr: number; trend: string }> = [];
    byReporter.forEach((series, code) => {
      const sorted   = [...series].sort((a, b) => a.period.localeCompare(b.period));
      const growths  = sorted.filter((t) => t.yoy_growth != null).map((t) => t.yoy_growth!);
      const lastVal  = sorted.at(-1)?.import_value ?? 0;
      const cagr     = sorted.length >= 2 ? this.calculateCAGR(sorted[0].import_value, lastVal, sorted.length - 1) : 0;
      summary.push({ reporter: sorted[0]?.reporter ?? code, reporter_code: code, latest_value: lastVal, cagr: Math.round(cagr * 100) / 100, trend: this.determineTrend(growths) });
    });

    return { reporters: reporters.split(","), data: trends, summary: summary.sort((a, b) => b.latest_value - a.latest_value) };
  }

  /** Estadísticas globales de comercio derivadas de getPotentialMarkets. Acepta HS code o SITC3. */
  async getTradeStats(product: string, periods?: string): Promise<{
    total_import_value_usd: number;
    avg_market_value_usd: number;
    min_market_value_usd: number;
    max_market_value_usd: number;
    trend: "rising" | "stable" | "declining";
    growth_rate: number;
    markets_count: number;
  }> {
    logger.debug(`Fetching trade stats product=${product}`);
    const markets = await this.getPotentialMarkets(product, periods, 50);
    const values = markets.map((m) => m.import_value).filter((v) => v > 0);

    if (values.length === 0) {
      return { total_import_value_usd: 0, avg_market_value_usd: 0, min_market_value_usd: 0, max_market_value_usd: 0, trend: "stable", growth_rate: 0, markets_count: 0 };
    }

    const total = values.reduce((a, b) => a + b, 0);
    const growthRates = markets.map((m) => m.growth_rate);
    const avgGrowth = growthRates.reduce((a, b) => a + b, 0) / growthRates.length;

    return {
      total_import_value_usd: Math.round(total),
      avg_market_value_usd: Math.round(total / values.length),
      min_market_value_usd: Math.round(Math.min(...values)),
      max_market_value_usd: Math.round(Math.max(...values)),
      trend: avgGrowth > 3 ? "rising" : avgGrowth < -3 ? "declining" : "stable",
      growth_rate: Math.round(avgGrowth * 100) / 100,
      markets_count: markets.length,
    };
  }

  /** 4.7: Demanda por bloque económico. Pasar códigos de /api/timeseries/economic-groups en `groups`. */
  async getEconomicBlockDemand(product: string, groups?: string, periods?: string): Promise<DemandTrend[]> {
    logger.debug(`Fetching economic block demand product=${product}`);
    const dataPoints = await wtoAdapter.queryTimeseries({
      indicator: "ITS_MTV_AM",
      reporters: groups,
      periods: periods ?? this.getDefaultPeriods(6),
      products: product,
    });
    return this.calculateYoYGrowth(dataPoints);
  }

  /** 4.8: Estima el número de registros antes de ejecutar la consulta principal. */
  async validateDataCount(params: {
    indicator: string;
    reporters?: string;
    partners?: string;
    periods?: string;
    frequency?: "A" | "Q" | "M";
    products?: string;
  }): Promise<{ count: number; feasible: boolean; recommendation: string }> {
    const count = await wtoAdapter.getTimeseriesDataCount(params);
    return {
      count,
      feasible: count <= 10000,
      recommendation:
        count > 10000 ? "Reduce el número de países, períodos o productos"
        : count > 5000 ? "Consulta grande — considera reducir el rango de períodos"
        : "Tamaño manejable",
    };
  }

  // ── TIMESERIES CATALOGUES ─────────────────────────────────────────────────

  async getFrequencies(): Promise<any[]>               { return wtoAdapter.getTimeseriesFrequencies(); }
  async getPeriods(indicator?: string): Promise<any[]> { return wtoAdapter.getTimeseriesPeriods(indicator); }
  async getUnits(): Promise<any[]>                     { return wtoAdapter.getTimeseriesUnits(); }
  async getValueFlags(): Promise<any[]>                { return wtoAdapter.getTimeseriesValueFlags(); }
  async getPartnerEconomies(): Promise<any[]>          { return wtoAdapter.getTimeseriesPartnerEconomies(); }
  async getEconomicGroups(): Promise<any[]>            { return wtoAdapter.getTimeseriesEconomicGroups(); }
  async getGeographicalRegions(): Promise<any[]>       { return wtoAdapter.getTimeseriesGeographicalRegions(); }

  // ── PRIVATE HELPERS ───────────────────────────────────────────────────────

  private calculateYoYGrowth(dataPoints: TimeseriesDataPoint[]): DemandTrend[] {
    const groups = new Map<string, TimeseriesDataPoint[]>();
    dataPoints.forEach((d) => {
      const key = `${d.reporter_code}-${d.product_code}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(d);
    });

    const result: DemandTrend[] = [];
    groups.forEach((points) => {
      const sorted = [...points].sort((a, b) => a.period.localeCompare(b.period));
      sorted.forEach((dp, i) => {
        const prev = sorted[i - 1];
        const yoy_growth = prev && prev.value > 0
          ? Math.round(((dp.value - prev.value) / prev.value) * 10000) / 100
          : undefined;
        result.push({
          reporter: dp.reporter, reporter_code: dp.reporter_code,
          product: dp.product,   product_code: dp.product_code,
          period: dp.period,     import_value: dp.value, yoy_growth,
        });
      });
    });
    return result;
  }

  private calculateCAGR(begin: number, end: number, years: number): number {
    if (begin <= 0 || years <= 0) return 0;
    return (Math.pow(end / begin, 1 / years) - 1) * 100;
  }

  private calculateStdDev(values: number[]): number {
    if (values.length < 2) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    return Math.sqrt(values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length);
  }

  private getDefaultPeriods(years: number = 6): string {
    const y = new Date().getFullYear();
    return Array.from({ length: years }, (_, i) => String(y - years + i)).join(",");
  }

  private determineTrend(growthRates: number[]): "rising" | "stable" | "declining" {
    if (!growthRates.length) return "stable";
    return this.analyzeTrend(growthRates.slice(-3).reduce((a, b) => a + b, 0) / Math.min(3, growthRates.length));
  }

  private estimateMarketShare(trends: MarketTrend[], country: string): number {
    const countryExp = trends.filter((t) => t.country === country).reduce((s, t) => s + t.exportValue, 0);
    const total      = trends.reduce((s, t) => s + t.exportValue, 0);
    return total === 0 ? 0 : (countryExp / total) * 100;
  }

  private analyzeTrend(growth: number): "rising" | "stable" | "declining" {
    if (growth > 5)  return "rising";
    if (growth < -5) return "declining";
    return "stable";
  }
}

export const marketsService = new MarketsService();
