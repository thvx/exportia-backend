import { GoogleGenerativeAI } from "@google/generative-ai";
import { query } from "@database/pool.js";
import { logger } from "@utils/logger.js";

export interface UnitExportPrice {
  priceAvg: number;
  priceMin: number;
  priceMax: number;
  unit: string;
  currency: "USD";
  explanation: string;
  hsCode: string;
  originCountry: string;
  destinationCountry: string;
  cached: boolean;
}

class PriceIntelligenceService {
  private genai: GoogleGenerativeAI;

  constructor() {
    this.genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
  }

  async getUnitExportPrice(
    hsCode: string,
    originCountry: string,
    destinationCountry: string
  ): Promise<UnitExportPrice> {
    const cached = await this.findCached(hsCode, originCountry, destinationCountry);
    if (cached) {
      logger.info("PriceIntelligenceService: cache hit", undefined, { hsCode, originCountry, destinationCountry });
      return cached;
    }

    logger.info("PriceIntelligenceService: calling Gemini", undefined, { hsCode, originCountry, destinationCountry });
    const price = await this.callGemini(hsCode, originCountry, destinationCountry);
    await this.upsertCache(price);
    return price;
  }

  private async findCached(
    hsCode: string,
    originCountry: string,
    destinationCountry: string
  ): Promise<UnitExportPrice | null> {
    const result = await query(
      `SELECT hs_code, origin_country, destination_country,
              price_avg, price_min, price_max, unit, currency, explanation
         FROM product_export_prices
        WHERE hs_code = $1
          AND origin_country = $2
          AND destination_country = $3
        LIMIT 1`,
      [hsCode, originCountry, destinationCountry]
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      hsCode: row.hs_code,
      originCountry: row.origin_country,
      destinationCountry: row.destination_country,
      priceAvg: parseFloat(row.price_avg),
      priceMin: parseFloat(row.price_min),
      priceMax: parseFloat(row.price_max),
      unit: row.unit,
      currency: "USD",
      explanation: row.explanation,
      cached: true,
    };
  }

  private async upsertCache(price: UnitExportPrice): Promise<void> {
    await query(
      `INSERT INTO product_export_prices
         (hs_code, origin_country, destination_country, price_avg, price_min, price_max, unit, currency, explanation)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (hs_code, origin_country, destination_country)
       DO UPDATE SET
         price_avg = EXCLUDED.price_avg,
         price_min = EXCLUDED.price_min,
         price_max = EXCLUDED.price_max,
         unit = EXCLUDED.unit,
         explanation = EXCLUDED.explanation,
         updated_at = CURRENT_TIMESTAMP`,
      [
        price.hsCode,
        price.originCountry,
        price.destinationCountry,
        price.priceAvg,
        price.priceMin,
        price.priceMax,
        price.unit,
        price.currency,
        price.explanation,
      ]
    );
  }

  private async callGemini(
    hsCode: string,
    originCountry: string,
    destinationCountry: string
  ): Promise<UnitExportPrice> {
    const prompt = `Eres un experto en comercio internacional y precios de exportación FOB.

Producto a analizar:
- Código HS (primeros 4-6 dígitos): ${hsCode}
- País exportador: ${originCountry}
- País importador: ${destinationCountry}

Basado en estadísticas de la OMC, ITC TradeMap y patrones históricos de comercio internacional, estima el precio unitario comercial promedio FOB en USD para esta ruta comercial específica en el último año disponible.

Responde ÚNICAMENTE con un objeto JSON válido, sin texto adicional ni bloques de código:
{"priceAvg":<número>,"priceMin":<número>,"priceMax":<número>,"unit":"<unidad comercial habitual, ej: kg, tonelada, litro, unidad>","currency":"USD","explanation":"<explicación breve en español de máx 110 caracteres>"}`;

    const model  = this.genai.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
    let raw: string;
    try {
      const result = await model.generateContent(prompt);
      raw = result.response.text().trim();
    } catch (err: any) {
      const status: number = err?.status ?? err?.httpStatus ?? 0;
      logger.error("PriceIntelligenceService: Gemini API error", err, { hsCode, originCountry, destinationCountry, status });
      if (status === 429) {
        const quotaErr = new Error("Cuota de IA agotada. Intenta nuevamente en unos minutos.");
        (quotaErr as any).statusCode = 429;
        throw quotaErr;
      }
      throw new Error(`Error al consultar el modelo de IA: ${err?.message ?? "desconocido"}`);
    }

    let parsed: Omit<UnitExportPrice, "hsCode" | "originCountry" | "destinationCountry" | "cached">;
    try {
      const jsonStr = raw.replace(/^```[a-z]*\n?/i, "").replace(/```$/i, "").trim();
      parsed = JSON.parse(jsonStr);
    } catch (err) {
      logger.error("PriceIntelligenceService: failed to parse Gemini response", err, { raw });
      throw new Error("El modelo no devolvió JSON válido para la estimación de precio.");
    }

    if (
      typeof parsed.priceAvg !== "number" ||
      typeof parsed.priceMin !== "number" ||
      typeof parsed.priceMax !== "number" ||
      !parsed.unit ||
      !parsed.currency
    ) {
      throw new Error("Respuesta incompleta del modelo para la estimación de precio.");
    }

    return {
      ...parsed,
      currency: "USD",
      hsCode,
      originCountry,
      destinationCountry,
      cached: false,
    };
  }
}

export const priceIntelligenceService = new PriceIntelligenceService();
