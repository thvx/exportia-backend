import axios from "axios";
import { cacheService } from "@cache/index.js";
import { logger } from "@utils/logger.js";
import wtoMembers from "@utils/wtoMembers.json";

const COMTRADE_AUTH_BASE   = "https://comtradeapi.un.org/data/v1/get/C/A/HS";
const COMTRADE_PUBLIC_BASE = "https://comtradeapi.un.org/public/v1/preview/C/A/HS";
const CACHE_TTL            = 3600;  // 1 hour
const MIN_INTERVAL_MS      = 1200;  // stay under the 1 req/s free-tier limit
const MAX_RETRIES          = 3;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Serialises outgoing Comtrade requests so at most one runs at a time,
 * with a minimum interval between calls.
 */
class SerialQueue {
  private running = false;
  private queue: Array<() => void> = [];
  private lastCall = 0;

  enqueue<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push(async () => {
        const gap = MIN_INTERVAL_MS - (Date.now() - this.lastCall);
        if (gap > 0) await sleep(gap);
        this.lastCall = Date.now();
        fn().then(resolve).catch(reject);
      });
      this.drain();
    });
  }

  private async drain(): Promise<void> {
    if (this.running) return;
    this.running = true;
    while (this.queue.length > 0) {
      const task = this.queue.shift()!;
      await task();
    }
    this.running = false;
  }
}

interface ComtradeRow {
  reporterCode: number;
  reporterDesc: string;
  partnerCode:  number;
  partnerDesc:  string;
  cmdCode:      string;
  cmdDesc:      string;
  primaryValue: number;
  period:       number;
}

interface ComtradeResponse {
  count: number;
  data:  ComtradeRow[];
}

export interface TradePartner {
  country:      string;
  country_code: number;
  value_usd:    number;
  share:        number;
}

export interface TradeProduct {
  product:   string;
  cmd_code:  string;
  value_usd: number;
  share:     number;
}

export interface ExportOpportunity {
  country:      string;
  country_code: number;
  import_value: number;
  share:        number;
}

class ComtradeService {
  private apiKey:        string;
  private defaultPeriod: string;
  private serial:        SerialQueue;

  constructor() {
    this.apiKey        = process.env.COMTRADE_API_KEY || "";
    this.defaultPeriod = String(new Date().getFullYear() - 2);
    this.serial        = new SerialQueue();
  }

  // ── Utilities ─────────────────────────────────────────────────────────────

  private wtoToNumeric(wtoCode: string): number {
    return parseInt(wtoCode.replace(/^C/, ""), 10);
  }

  private countryNameToCode(name: string): number | null {
    const lower  = name.toLowerCase();
    const member = (wtoMembers.items as Array<{ value: string; text: string }>)
      .find((m) => m.text.toLowerCase() === lower);
    return member ? this.wtoToNumeric(member.value) : null;
  }

  private normalizeHs(hsCode: string): string {
    return hsCode.replace(/\D/g, "").slice(0, 4);
  }

  // ── HTTP layer ────────────────────────────────────────────────────────────

  /** Single HTTP call — does NOT throttle; use callQueued() instead. */
  private async callOnce(params: Record<string, string | number>): Promise<ComtradeRow[]> {
    const authenticated = !!this.apiKey;
    const baseUrl = authenticated ? COMTRADE_AUTH_BASE : COMTRADE_PUBLIC_BASE;

    const queryParams: Record<string, string | number | boolean> = {
      ...params,
      includeDesc: true,
      ...(authenticated && { "subscription-key": this.apiKey }),
    };

    const response = await axios.get<ComtradeResponse>(baseUrl, {
      params:  queryParams,
      headers: authenticated ? { "Ocp-Apim-Subscription-Key": this.apiKey } : {},
      timeout: 25000,
    });

    return response.data?.data ?? [];
  }

  /** Queued call with retry on 429. */
  private callQueued(params: Record<string, string | number>): Promise<ComtradeRow[]> {
    return this.serial.enqueue(async () => {
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          return await this.callOnce(params);
        } catch (err: any) {
          const status = err?.response?.status;
          if (status === 429 && attempt < MAX_RETRIES) {
            const delay = attempt * 2000; // 2 s, 4 s
            logger.warn(`Comtrade 429 – retrying in ${delay}ms (attempt ${attempt}/${MAX_RETRIES})`);
            await sleep(delay);
          } else {
            throw err;
          }
        }
      }
      return [];
    });
  }

  // ── Public methods ────────────────────────────────────────────────────────

  /** Top countries that supply product X to destination country. */
  async getTopImporters(destCode: string, hsCode: string, limit = 5): Promise<TradePartner[]> {
    const cacheKey = `comtrade:top-importers:${destCode}:${hsCode}:${limit}`;
    const cached   = await cacheService.get<TradePartner[]>(cacheKey);
    if (cached) return cached;

    const rows = await this.callQueued({
      reporterCode: this.wtoToNumeric(destCode),
      cmdCode:      this.normalizeHs(hsCode),
      flowCode:     "M",
      period:       this.defaultPeriod,
      maxRecords:   250,
    }).catch((err) => {
      logger.warn(`Comtrade getTopImporters error: ${err instanceof Error ? err.message : err}`);
      return [] as ComtradeRow[];
    });

    const map = new Map<number, { name: string; value: number }>();
    for (const r of rows) {
      if (!r.partnerCode || r.partnerCode === 0) continue;
      const cur = map.get(r.partnerCode);
      map.set(r.partnerCode, { name: r.partnerDesc, value: (cur?.value ?? 0) + (r.primaryValue || 0) });
    }

    const total  = [...map.values()].reduce((s, p) => s + p.value, 0);
    const result: TradePartner[] = [...map.entries()]
      .map(([code, p]) => ({
        country:      p.name,
        country_code: code,
        value_usd:    p.value,
        share:        total > 0 ? Math.round((p.value / total) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.value_usd - a.value_usd)
      .slice(0, limit);

    if (result.length > 0) await cacheService.set(cacheKey, result, CACHE_TTL);
    return result;
  }

  /** Top HS chapters imported by the destination country. */
  async getTopImportedProducts(destCode: string, limit = 10): Promise<TradeProduct[]> {
    const cacheKey = `comtrade:top-products:${destCode}:${limit}`;
    const cached   = await cacheService.get<TradeProduct[]>(cacheKey);
    if (cached) return cached;

    const rows = await this.callQueued({
      reporterCode: this.wtoToNumeric(destCode),
      cmdCode:      "AG2",
      flowCode:     "M",
      period:       this.defaultPeriod,
      partnerCode:  0,
      maxRecords:   300,
    }).catch((err) => {
      logger.warn(`Comtrade getTopImportedProducts error: ${err instanceof Error ? err.message : err}`);
      return [] as ComtradeRow[];
    });

    const filtered = rows.filter((r) => r.cmdCode !== "AG" && (r.primaryValue || 0) > 0);
    const total    = filtered.reduce((s, r) => s + r.primaryValue, 0);
    const result: TradeProduct[] = filtered
      .map((r) => ({
        product:   r.cmdDesc,
        cmd_code:  r.cmdCode,
        value_usd: r.primaryValue,
        share:     total > 0 ? Math.round((r.primaryValue / total) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.value_usd - a.value_usd)
      .slice(0, limit);

    if (result.length > 0) await cacheService.set(cacheKey, result, CACHE_TTL);
    return result;
  }

  /** Top countries where the origin country exports the specific product. */
  async getTopExportDestinations(originCountry: string, hsCode: string, limit = 10): Promise<TradePartner[]> {
    const cacheKey  = `comtrade:export-dest:${originCountry}:${hsCode}:${limit}`;
    const cached    = await cacheService.get<TradePartner[]>(cacheKey);
    if (cached) return cached;

    const originCode = this.countryNameToCode(originCountry);
    if (!originCode) {
      logger.warn(`No Comtrade numeric code for country: "${originCountry}"`);
      return [];
    }

    const rows = await this.callQueued({
      reporterCode: originCode,
      cmdCode:      this.normalizeHs(hsCode),
      flowCode:     "X",
      period:       this.defaultPeriod,
      maxRecords:   250,
    }).catch((err) => {
      logger.warn(`Comtrade getTopExportDestinations error: ${err instanceof Error ? err.message : err}`);
      return [] as ComtradeRow[];
    });

    const map = new Map<number, { name: string; value: number }>();
    for (const r of rows) {
      if (!r.partnerCode || r.partnerCode === 0) continue;
      const cur = map.get(r.partnerCode);
      map.set(r.partnerCode, { name: r.partnerDesc, value: (cur?.value ?? 0) + (r.primaryValue || 0) });
    }

    const total  = [...map.values()].reduce((s, p) => s + p.value, 0);
    const result: TradePartner[] = [...map.entries()]
      .map(([code, p]) => ({
        country:      p.name,
        country_code: code,
        value_usd:    p.value,
        share:        total > 0 ? Math.round((p.value / total) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.value_usd - a.value_usd)
      .slice(0, limit);

    if (result.length > 0) await cacheService.set(cacheKey, result, CACHE_TTL);
    return result;
  }

  /** Global importers of the product — potential export target markets. */
  async getExportOpportunities(hsCode: string, limit = 15): Promise<ExportOpportunity[]> {
    const cacheKey = `comtrade:opportunities:${hsCode}:${limit}`;
    const cached   = await cacheService.get<ExportOpportunity[]>(cacheKey);
    if (cached) return cached;

    const rows = await this.callQueued({
      cmdCode:     this.normalizeHs(hsCode),
      flowCode:    "M",
      period:      this.defaultPeriod,
      partnerCode: 0,
      maxRecords:  500,
    }).catch((err) => {
      logger.warn(`Comtrade getExportOpportunities error: ${err instanceof Error ? err.message : err}`);
      return [] as ComtradeRow[];
    });

    const map = new Map<number, { name: string; value: number }>();
    for (const r of rows) {
      if (!r.reporterCode || r.reporterCode === 0) continue;
      const cur = map.get(r.reporterCode);
      map.set(r.reporterCode, { name: r.reporterDesc, value: (cur?.value ?? 0) + (r.primaryValue || 0) });
    }

    const total  = [...map.values()].reduce((s, p) => s + p.value, 0);
    const result: ExportOpportunity[] = [...map.entries()]
      .map(([code, p]) => ({
        country:      p.name,
        country_code: code,
        import_value: p.value,
        share:        total > 0 ? Math.round((p.value / total) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.import_value - a.import_value)
      .slice(0, limit);

    if (result.length > 0) await cacheService.set(cacheKey, result, CACHE_TTL);
    return result;
  }
}

export const comtradeService = new ComtradeService();
