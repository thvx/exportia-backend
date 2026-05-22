import { Router, Request, Response, NextFunction } from "express";
import axios from "axios";
import { createRequire } from "module";
import { readFileSync } from "fs";
import { GoogleAuth, IdTokenClient } from "google-auth-library";
import { alertsService } from "../services/alertsService.js";
import { marketsService } from "../services/marketsService.js";
import { comtradeService } from "../services/comtradeService.js";
import { facilityService } from "../services/facilityService.js";
import { productService } from "../services/productService.js";
import { chatService } from "../services/chatService.js";
import { authService } from "../services/authService.js";
import { priceIntelligenceService } from "../services/priceIntelligenceService.js";
import { getRamRequirements, getRamProductCountries, proxyRamDownload } from "../services/ramPromperuService.js";
import { wtoRateLimiter, authRateLimiter } from "../middleware/rateLimiting.js";
import { logger } from "../utils/logger.js";
import { ApiResponse, PaginatedResponse } from "../types/index.js";

const require = createRequire(import.meta.url);
const wtoMembers = require("../utils/wtoMembers.json") as {
  items: Array<{ value: string; text: string }>;
};

// Middleware that enforces a valid authenticated session
function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const context = (req as any).context;
  if (!context?.userId) {
    res.status(401).json({
      success: false,
      error: "Autenticación requerida",
      timestamp: new Date(),
    });
    return;
  }
  next();
}

const router = Router();

// =====================
// 📢 ALERTS ENDPOINTS
// =====================

router.get("/api/alerts", wtoRateLimiter, async (req: Request, res: Response) => {
  try {
    const { product } = req.query;

    let alerts;
    if (product) {
      alerts = await alertsService.getAlertsByProduct(product as string);
    } else {
      alerts = await alertsService.getAllAlerts();
    }

    const response: ApiResponse<typeof alerts> = {
      success: true,
      data: alerts,
      timestamp: new Date(),
    };

    res.json(response);
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message,
      timestamp: new Date(),
    });
  }
});

router.get("/api/alerts/critical", wtoRateLimiter, async (req: Request, res: Response) => {
  try {
    const { product, days = "30" } = req.query;

    const allAlerts = product
      ? await alertsService.getAlertsByProduct(product as string)
      : await alertsService.getAllAlerts();

    const critical = alertsService.filterCriticalAlerts(
      allAlerts,
      parseInt(days as string),
      product as string | undefined
    );

    const response: ApiResponse<typeof critical> = {
      success: true,
      data: critical,
      timestamp: new Date(),
    };

    res.json(response);
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message,
      timestamp: new Date(),
    });
  }
});

router.get("/api/events", wtoRateLimiter, async (req: Request, res: Response) => {
  try {
    const { product } = req.query;

    if (!product) {
      return res.status(400).json({
        success: false,
        error: "Product query parameter is required",
        timestamp: new Date(),
      });
    }

    const events = await alertsService.getProductEvents(product as string);

    const response: ApiResponse<typeof events> = {
      success: true,
      data: events,
      timestamp: new Date(),
    };

    res.json(response);
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message,
      timestamp: new Date(),
    });
  }
});

// =====================
// 📋 QUOTAS ENDPOINTS
// =====================

// Miembros WTO (estático, sin rate limit)
router.get("/api/quotas/members", (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: wtoMembers.items,
    timestamp: new Date(),
  });
});

// Búsqueda auxiliar de productos HS
router.get("/api/quotas/products", wtoRateLimiter, async (req: Request, res: Response) => {
  try {
    const { description, hs_version } = req.query;

    const products = await alertsService.getQRProducts(
      description as string | undefined,
      hs_version as string | undefined
    );

    res.json({ success: true, data: products, timestamp: new Date() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message, timestamp: new Date() });
  }
});

// Listado de regulaciones (casos 1, 2 y 3 según params)
// Caso 1: GET /api/quotas?in_force_only=true&page=1
// Caso 2: GET /api/quotas?product_codes=0802&page=1
// Caso 3: GET /api/quotas?product_codes=0802&country=Argentina&page=1
//         GET /api/quotas?product_codes=0802&reporter_member_code=C032&page=1
router.get("/api/quotas", wtoRateLimiter, async (req: Request, res: Response) => {
  try {
    const {
      product_codes,
      country,
      reporter_member_code,
      in_force_only = "true",
      page = "1",
    } = req.query;

    const result = await alertsService.getQRRegulations({
      in_force_only: in_force_only !== "false",
      product_codes: product_codes as string | undefined,
      reporter_member_code: reporter_member_code as string | undefined,
      country: country as string | undefined,
      page: parseInt(page as string),
    });

    res.json({ success: true, ...result, timestamp: new Date() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message, timestamp: new Date() });
  }
});

// Detalle de regulación por ID (caso 4)
// GET /api/quotas/10
router.get("/api/quotas/:id", wtoRateLimiter, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: "El parámetro id debe ser un número entero",
        timestamp: new Date(),
      });
    }

    const regulation = await alertsService.getQRRegulationById(id);

    if (!regulation) {
      return res.status(404).json({
        success: false,
        error: `No se encontró la regulación con id ${id}`,
        timestamp: new Date(),
      });
    }

    res.json({ success: true, data: regulation, timestamp: new Date() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message, timestamp: new Date() });
  }
});

// =====================
// 📊 MARKETS ENDPOINTS
// =====================

router.get("/api/markets", wtoRateLimiter, async (req: Request, res: Response) => {
  try {
    const { product } = req.query;

    if (!product) {
      return res.status(400).json({
        success: false,
        error: "Product query parameter is required",
        timestamp: new Date(),
      });
    }

    const trends = await marketsService.getMarketTrends(product as string);

    const response: ApiResponse<typeof trends> = {
      success: true,
      data: trends,
      timestamp: new Date(),
    };

    res.json(response);
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message,
      timestamp: new Date(),
    });
  }
});

router.get("/api/markets/competition", wtoRateLimiter, async (req: Request, res: Response) => {
  try {
    const { product, country } = req.query;

    if (!product || !country) {
      return res.status(400).json({
        success: false,
        error: "Product and country query parameters are required",
        timestamp: new Date(),
      });
    }

    const analysis = await marketsService.analyzeCompetition(
      product as string,
      country as string
    );

    const response: ApiResponse<typeof analysis> = {
      success: true,
      data: analysis,
      timestamp: new Date(),
    };

    res.json(response);
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message,
      timestamp: new Date(),
    });
  }
});

router.get("/api/markets/trending", wtoRateLimiter, async (req: Request, res: Response) => {
  try {
    const { limit = "10" } = req.query;

    const trending = await marketsService.getTrendingProducts(parseInt(limit as string));

    const response: ApiResponse<typeof trending> = {
      success: true,
      data: trending,
      timestamp: new Date(),
    };

    res.json(response);
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message,
      timestamp: new Date(),
    });
  }
});

// ── DEMAND ANALYSIS ────────────────────────────────────────────────────────

// GET /api/markets/demand?indicator=&reporters=&partners=&periods=&frequency=&products=
router.get("/api/markets/demand", wtoRateLimiter, async (req: Request, res: Response) => {
  try {
    const { indicator, reporters, partners, periods, frequency, products } = req.query;
    const data = await marketsService.getDemandTrends({
      indicator:  indicator  as string | undefined,
      reporters:  reporters  as string | undefined,
      partners:   partners   as string | undefined,
      periods:    periods    as string | undefined,
      frequency:  frequency  as "A" | "Q" | "M" | undefined,
      products:   products   as string | undefined,
    });
    res.json({ success: true, data, timestamp: new Date() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message, timestamp: new Date() });
  }
});

// GET /api/markets/profile?reporter=032&product=AG&partners=&periods=
router.get("/api/markets/profile", wtoRateLimiter, async (req: Request, res: Response) => {
  try {
    const { reporter, product, partners, periods } = req.query;
    if (!reporter || !product) {
      return res.status(400).json({ success: false, error: "reporter y product son requeridos", timestamp: new Date() });
    }
    const data = await marketsService.getMarketProfile(
      reporter as string, product as string,
      partners as string | undefined, periods as string | undefined
    );
    res.json({ success: true, data, timestamp: new Date() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message, timestamp: new Date() });
  }
});

// GET /api/markets/potential?product=AG&periods=&limit=10
router.get("/api/markets/potential", wtoRateLimiter, async (req: Request, res: Response) => {
  try {
    const { product, periods, limit = "10" } = req.query;
    if (!product) {
      return res.status(400).json({ success: false, error: "product es requerido", timestamp: new Date() });
    }
    const data = await marketsService.getPotentialMarkets(
      product as string, periods as string | undefined, parseInt(limit as string)
    );
    res.json({ success: true, data, timestamp: new Date() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message, timestamp: new Date() });
  }
});

// GET /api/markets/trade-stats?product=AGFO&periods=
router.get("/api/markets/trade-stats", wtoRateLimiter, async (req: Request, res: Response) => {
  try {
    const { product, periods } = req.query;
    if (!product) {
      return res.status(400).json({ success: false, error: "product es requerido", timestamp: new Date() });
    }
    const data = await marketsService.getTradeStats(product as string, periods as string | undefined);
    res.json({ success: true, data, timestamp: new Date() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message, timestamp: new Date() });
  }
});

// GET /api/markets/share?reporter=032&product=AG&periods=
router.get("/api/markets/share", wtoRateLimiter, async (req: Request, res: Response) => {
  try {
    const { reporter, product, periods } = req.query;
    if (!reporter || !product) {
      return res.status(400).json({ success: false, error: "reporter y product son requeridos", timestamp: new Date() });
    }
    const data = await marketsService.getMarketShareBySupplier(
      reporter as string, product as string, periods as string | undefined
    );
    res.json({ success: true, data, timestamp: new Date() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message, timestamp: new Date() });
  }
});

// GET /api/markets/seasonality?product=AG&reporter=032&frequency=Q&periods=
router.get("/api/markets/seasonality", wtoRateLimiter, async (req: Request, res: Response) => {
  try {
    const { product, reporter, frequency = "Q", periods } = req.query;
    if (!product || !reporter) {
      return res.status(400).json({ success: false, error: "product y reporter son requeridos", timestamp: new Date() });
    }
    const data = await marketsService.getSeasonality(
      product as string, reporter as string,
      frequency as "Q" | "M", periods as string | undefined
    );
    res.json({ success: true, data, timestamp: new Date() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message, timestamp: new Date() });
  }
});

// GET /api/markets/volatility?product=AG&reporters=032,076&periods=
router.get("/api/markets/volatility", wtoRateLimiter, async (req: Request, res: Response) => {
  try {
    const { product, reporters, periods } = req.query;
    if (!product) {
      return res.status(400).json({ success: false, error: "product es requerido", timestamp: new Date() });
    }
    const data = await marketsService.getMarketVolatility(
      product as string, reporters as string | undefined, periods as string | undefined
    );
    res.json({ success: true, data, timestamp: new Date() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message, timestamp: new Date() });
  }
});

// GET /api/markets/compare?product=AG&reporters=032,076,484&periods=
router.get("/api/markets/compare", wtoRateLimiter, async (req: Request, res: Response) => {
  try {
    const { product, reporters, periods } = req.query;
    if (!product || !reporters) {
      return res.status(400).json({ success: false, error: "product y reporters (mín. 2, separados por coma) son requeridos", timestamp: new Date() });
    }
    const data = await marketsService.compareMarkets(
      product as string, reporters as string, periods as string | undefined
    );
    res.json({ success: true, data, timestamp: new Date() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message, timestamp: new Date() });
  }
});

// GET /api/markets/blocks?product=AG&groups=EUN,ASN&periods=
router.get("/api/markets/blocks", wtoRateLimiter, async (req: Request, res: Response) => {
  try {
    const { product, groups, periods } = req.query;
    if (!product) {
      return res.status(400).json({ success: false, error: "product es requerido", timestamp: new Date() });
    }
    const data = await marketsService.getEconomicBlockDemand(
      product as string, groups as string | undefined, periods as string | undefined
    );
    res.json({ success: true, data, timestamp: new Date() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message, timestamp: new Date() });
  }
});

// GET /api/markets/data-count?indicator=ITS_MTV_AM&reporters=032&periods=2020,2021
router.get("/api/markets/data-count", wtoRateLimiter, async (req: Request, res: Response) => {
  try {
    const { indicator, reporters, partners, periods, frequency, products } = req.query;
    if (!indicator) {
      return res.status(400).json({ success: false, error: "indicator es requerido", timestamp: new Date() });
    }
    const data = await marketsService.validateDataCount({
      indicator:  indicator  as string,
      reporters:  reporters  as string | undefined,
      partners:   partners   as string | undefined,
      periods:    periods    as string | undefined,
      frequency:  frequency  as "A" | "Q" | "M" | undefined,
      products:   products   as string | undefined,
    });
    res.json({ success: true, data, timestamp: new Date() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message, timestamp: new Date() });
  }
});

// =====================
// 🏛️ FACILITY ENDPOINTS
// =====================

router.get("/api/facility", wtoRateLimiter, async (req: Request, res: Response) => {
  try {
    const { country } = req.query;

    let processes;
    if (country) {
      processes = await facilityService.getTFADProcesses(country as string);
    } else {
      processes = await facilityService.getAllTFADProcesses();
    }

    const response: ApiResponse<typeof processes> = {
      success: true,
      data: processes,
      timestamp: new Date(),
    };

    res.json(response);
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message,
      timestamp: new Date(),
    });
  }
});

router.post("/api/facility/clearance-estimate", wtoRateLimiter, async (req: Request, res: Response) => {
  try {
    const { country, product } = req.body;

    if (!country || !product) {
      return res.status(400).json({
        success: false,
        error: "Country and product are required",
        timestamp: new Date(),
      });
    }

    const estimate = await facilityService.calculateClearanceEstimate(country, product);

    const response: ApiResponse<typeof estimate> = {
      success: true,
      data: estimate,
      timestamp: new Date(),
    };

    res.json(response);
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message,
      timestamp: new Date(),
    });
  }
});

// =====================
// 🔐 AUTH ENDPOINTS
// =====================

router.post("/api/auth/register", authRateLimiter, async (req: Request, res: Response) => {
  try {
    const { first_name, last_name, email, password, origin_country } = req.body;

    if (!first_name || !last_name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: "Nombre, apellido, correo y contraseña son requeridos",
        timestamp: new Date(),
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: "La contraseña debe tener al menos 8 caracteres",
        timestamp: new Date(),
      });
    }

    const { user, token } = await authService.register({
      first_name,
      last_name,
      email,
      password,
      origin_country,
    });

    res.status(201).json({
      success: true,
      data: { token, user },
      timestamp: new Date(),
    });
  } catch (err: any) {
    const status = err.message.includes("ya está registrado") ? 409 : 500;
    res.status(status).json({ success: false, error: err.message, timestamp: new Date() });
  }
});

router.post("/api/auth/login", authRateLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: "Correo y contraseña son requeridos",
        timestamp: new Date(),
      });
    }

    const { user, token } = await authService.login(email, password);

    res.json({
      success: true,
      data: { token, user },
      timestamp: new Date(),
    });
  } catch (err: any) {
    res.status(401).json({ success: false, error: err.message, timestamp: new Date() });
  }
});

// =====================
// 👤 USER PROFILE ENDPOINTS
// =====================

router.get("/api/user/me", requireAuth, async (req: Request, res: Response) => {
  try {
    const { userId } = (req as any).context;
    const profile = await authService.getUserProfile(userId);

    if (!profile) {
      return res.status(404).json({ success: false, error: "Usuario no encontrado", timestamp: new Date() });
    }

    res.json({ success: true, data: profile, timestamp: new Date() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message, timestamp: new Date() });
  }
});

router.put("/api/user/me", requireAuth, async (req: Request, res: Response) => {
  try {
    const { userId } = (req as any).context;
    const { first_name, last_name, origin_country } = req.body;

    const updated = await authService.updateProfile(userId, { first_name, last_name, origin_country });

    res.json({ success: true, data: updated, timestamp: new Date() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message, timestamp: new Date() });
  }
});

router.post("/api/user/me/destination-countries", requireAuth, async (req: Request, res: Response) => {
  try {
    const { userId } = (req as any).context;
    const { country_code, country_name } = req.body;

    if (!country_code || !country_name) {
      return res.status(400).json({
        success: false,
        error: "country_code y country_name son requeridos",
        timestamp: new Date(),
      });
    }

    const member = wtoMembers.items.find(
      (item) =>
        item.value.toUpperCase() === String(country_code).toUpperCase() ||
        item.text.toLowerCase() === String(country_name).toLowerCase()
    );

    if (!member) {
      return res.status(400).json({
        success: false,
        error: "El país no existe en el catálogo WTO",
        timestamp: new Date(),
      });
    }

    await authService.addDestinationCountry(userId, member.value, member.text);

    const profile = await authService.getUserProfile(userId);
    res.status(201).json({ success: true, data: profile?.destination_countries, timestamp: new Date() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message, timestamp: new Date() });
  }
});

router.delete("/api/user/me/destination-countries/:code", requireAuth, async (req: Request, res: Response) => {
  try {
    const { userId } = (req as any).context;
    await authService.removeDestinationCountry(userId, req.params.code);

    res.json({ success: true, message: "País de destino eliminado", timestamp: new Date() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message, timestamp: new Date() });
  }
});

router.get("/api/user/me/products", requireAuth, async (req: Request, res: Response) => {
  try {
    const { userId } = (req as any).context;
    const products = await productService.listUserProducts(userId);

    res.json({ success: true, data: products, timestamp: new Date() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message, timestamp: new Date() });
  }
});

router.delete("/api/user/me/products/:productId", requireAuth, async (req: Request, res: Response) => {
  try {
    const { userId } = (req as any).context;
    await productService.removeUserProduct(userId, req.params.productId);

    res.json({ success: true, message: "Producto desvinculado del perfil", timestamp: new Date() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message, timestamp: new Date() });
  }
});

// ============================================
// 🌍 PER-PRODUCT DESTINATION COUNTRY ENDPOINTS
// ============================================

router.post("/api/product/:productId/countries", requireAuth, async (req: Request, res: Response) => {
  try {
    const { userId } = (req as any).context;
    const { productId } = req.params;
    const { country_code, country_name } = req.body;

    if (!country_code || !country_name) {
      return res.status(400).json({ success: false, error: "country_code y country_name son requeridos", timestamp: new Date() });
    }

    // Verify this product belongs to the user
    const { query: dbQuery } = await import("../database/pool.js");
    const ownership = await dbQuery(
      `SELECT 1 FROM user_products WHERE user_id = $1 AND product_id = $2`,
      [userId, productId]
    );
    if (ownership.rows.length === 0) {
      return res.status(403).json({ success: false, error: "No tienes acceso a este producto", timestamp: new Date() });
    }

    await dbQuery(
      `INSERT INTO product_destination_countries (product_id, country_code, country_name)
       VALUES ($1, $2, $3)
       ON CONFLICT (product_id, country_code) DO NOTHING`,
      [productId, country_code, country_name]
    );

    const result = await dbQuery(
      `SELECT country_code, country_name FROM product_destination_countries WHERE product_id = $1 ORDER BY country_name`,
      [productId]
    );

    res.status(201).json({ success: true, data: result.rows, timestamp: new Date() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message, timestamp: new Date() });
  }
});

router.delete("/api/product/:productId/countries/:code", requireAuth, async (req: Request, res: Response) => {
  try {
    const { userId } = (req as any).context;
    const { productId, code } = req.params;

    const { query: dbQuery } = await import("../database/pool.js");
    const ownership = await dbQuery(
      `SELECT 1 FROM user_products WHERE user_id = $1 AND product_id = $2`,
      [userId, productId]
    );
    if (ownership.rows.length === 0) {
      return res.status(403).json({ success: false, error: "No tienes acceso a este producto", timestamp: new Date() });
    }

    await dbQuery(
      `DELETE FROM product_destination_countries WHERE product_id = $1 AND country_code = $2`,
      [productId, code]
    );

    res.json({ success: true, message: "País eliminado del producto", timestamp: new Date() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message, timestamp: new Date() });
  }
});

// =====================
// 🛍️ PRODUCT ENDPOINTS
// =====================

router.get("/api/product", async (req: Request, res: Response) => {
  try {
    const { category } = req.query;

    const products = await productService.listProducts(category as string | undefined);

    const response: ApiResponse<typeof products> = {
      success: true,
      data: products,
      timestamp: new Date(),
    };

    res.json(response);
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message,
      timestamp: new Date(),
    });
  }
});

router.post("/api/product", requireAuth, async (req: Request, res: Response) => {
  try {
    const { userId } = (req as any).context;
    const { name, hs_code, category, description, regulations } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: "El nombre del producto es requerido",
        timestamp: new Date(),
      });
    }

    if (hs_code && !productService.validateHSCode(hs_code)) {
      return res.status(400).json({
        success: false,
        error: "Formato de código HS inválido",
        timestamp: new Date(),
      });
    }

    const { classification_data } = req.body;
    const product = await productService.createProductForUser(userId, name, {
      hs_code,
      category,
      description,
      regulations,
      classification_data: classification_data ?? undefined,
    });

    res.status(201).json({ success: true, data: product, timestamp: new Date() });
  } catch (err: any) {
    const status = err.message.includes("partida arancelaria") ? 422 : 500;
    res.status(status).json({ success: false, error: err.message, timestamp: new Date() });
  }
});

// PATCH /api/product/:productId/classification-data
router.patch("/api/product/:productId/classification-data", requireAuth, async (req: Request, res: Response) => {
  try {
    const { userId } = (req as any).context;
    const { productId } = req.params;

    // Verify the product belongs to the requesting user
    const userProducts = await productService.listUserProducts(userId);
    if (!userProducts.find((p) => p.id === productId)) {
      return res.status(403).json({ success: false, error: "Producto no encontrado para este usuario", timestamp: new Date() });
    }

    await productService.updateClassificationData(productId, req.body);
    res.json({ success: true, timestamp: new Date() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message, timestamp: new Date() });
  }
});

// GET /api/products/:hsCode/unit-price?destinationCountry=España&originCountry=Argentina
router.get("/api/products/:hsCode/unit-price", requireAuth, wtoRateLimiter, async (req: Request, res: Response) => {
  try {
    const { hsCode } = req.params;
    const { destinationCountry, originCountry } = req.query;

    if (!destinationCountry) {
      return res.status(400).json({
        success: false,
        error: "destinationCountry es requerido",
        timestamp: new Date(),
      });
    }

    const { userId } = (req as any).context;
    let origin = originCountry as string | undefined;
    if (!origin) {
      const profile = await authService.getUserProfile(userId);
      origin = profile?.origin_country ?? "Argentina";
    }

    const price = await priceIntelligenceService.getUnitExportPrice(
      hsCode,
      origin,
      destinationCountry as string
    );

    res.json({ success: true, data: price, timestamp: new Date() });
  } catch (err: any) {
    const status: number = err?.statusCode === 429 ? 429 : 500;
    if (status === 500) {
      logger.error("unit-price route error", err);
    }
    res.status(status).json({ success: false, error: err.message, timestamp: new Date() });
  }
});

// =====================
// 💬 CHAT ENDPOINTS
// =====================

router.post("/api/chat/session", async (req: Request, res: Response) => {
  try {
    const context = (req as any).context;
    const { topic } = req.body;

    if (!context?.userId) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
        timestamp: new Date(),
      });
    }

    const session = await chatService.createSession(context.userId, topic);

    const response: ApiResponse<typeof session> = {
      success: true,
      data: session,
      timestamp: new Date(),
    };

    res.status(201).json(response);
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message,
      timestamp: new Date(),
    });
  }
});

router.post("/api/chat/:sessionId/message", wtoRateLimiter, async (req: Request, res: Response) => {
  try {
    const context = (req as any).context;
    const { sessionId } = req.params;
    const { message } = req.body;

    if (!context?.userId) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
        timestamp: new Date(),
      });
    }

    if (!message) {
      return res.status(400).json({
        success: false,
        error: "Message is required",
        timestamp: new Date(),
      });
    }

    const response = await chatService.sendMessage(sessionId, message, context.userId);

    const apiResponse: ApiResponse<typeof response> = {
      success: true,
      data: response,
      timestamp: new Date(),
    };

    res.json(apiResponse);
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message,
      timestamp: new Date(),
    });
  }
});

// =====================
// 📈 TIMESERIES METADATA ENDPOINTS
// =====================

router.get("/api/timeseries/indicators", wtoRateLimiter, async (req: Request, res: Response) => {
  try {
    const indicators = await marketsService.getTimeseriesIndicators();

    const response: ApiResponse<typeof indicators> = {
      success: true,
      data: indicators,
      timestamp: new Date(),
    };

    res.json(response);
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message,
      timestamp: new Date(),
    });
  }
});

router.get("/api/timeseries/economies", wtoRateLimiter, async (req: Request, res: Response) => {
  try {
    const economies = await marketsService.getTimeseriesEconomies();

    const response: ApiResponse<typeof economies> = {
      success: true,
      data: economies,
      timestamp: new Date(),
    };

    res.json(response);
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message,
      timestamp: new Date(),
    });
  }
});

router.get("/api/timeseries/products", wtoRateLimiter, async (req: Request, res: Response) => {
  try {
    const products = await marketsService.getTimeseriesProducts();

    const response: ApiResponse<typeof products> = {
      success: true,
      data: products,
      timestamp: new Date(),
    };

    res.json(response);
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message,
      timestamp: new Date(),
    });
  }
});

router.get("/api/timeseries/frequencies", wtoRateLimiter, async (_req: Request, res: Response) => {
  try {
    res.json({ success: true, data: await marketsService.getFrequencies(), timestamp: new Date() });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message, timestamp: new Date() }); }
});

router.get("/api/timeseries/periods", wtoRateLimiter, async (req: Request, res: Response) => {
  try {
    const { indicator } = req.query;
    res.json({ success: true, data: await marketsService.getPeriods(indicator as string | undefined), timestamp: new Date() });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message, timestamp: new Date() }); }
});

router.get("/api/timeseries/units", wtoRateLimiter, async (_req: Request, res: Response) => {
  try {
    res.json({ success: true, data: await marketsService.getUnits(), timestamp: new Date() });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message, timestamp: new Date() }); }
});

router.get("/api/timeseries/value-flags", wtoRateLimiter, async (_req: Request, res: Response) => {
  try {
    res.json({ success: true, data: await marketsService.getValueFlags(), timestamp: new Date() });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message, timestamp: new Date() }); }
});

router.get("/api/timeseries/partners", wtoRateLimiter, async (_req: Request, res: Response) => {
  try {
    res.json({ success: true, data: await marketsService.getPartnerEconomies(), timestamp: new Date() });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message, timestamp: new Date() }); }
});

router.get("/api/timeseries/economic-groups", wtoRateLimiter, async (_req: Request, res: Response) => {
  try {
    res.json({ success: true, data: await marketsService.getEconomicGroups(), timestamp: new Date() });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message, timestamp: new Date() }); }
});

router.get("/api/timeseries/geographical-regions", wtoRateLimiter, async (_req: Request, res: Response) => {
  try {
    res.json({ success: true, data: await marketsService.getGeographicalRegions(), timestamp: new Date() });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message, timestamp: new Date() }); }
});

// =====================
// 🌐 COMTRADE ENDPOINTS
// =====================

// GET /api/comtrade/top-importers?countryName=Australia&hsCode=0901&limit=5
router.get("/api/comtrade/top-importers", wtoRateLimiter, async (req: Request, res: Response) => {
  try {
    const { countryName, hsCode, limit = "5" } = req.query;
    if (!countryName || !hsCode) {
      return res.status(400).json({ success: false, error: "countryName y hsCode son requeridos", timestamp: new Date() });
    }
    const data = await comtradeService.getTopImporters(countryName as string, hsCode as string, parseInt(limit as string));
    res.json({ success: true, data, timestamp: new Date() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message, timestamp: new Date() });
  }
});

// GET /api/comtrade/top-products?destCode=C032&limit=10
router.get("/api/comtrade/top-products", wtoRateLimiter, async (req: Request, res: Response) => {
  try {
    const { destCode, limit = "10" } = req.query;
    if (!destCode) {
      return res.status(400).json({ success: false, error: "destCode es requerido", timestamp: new Date() });
    }
    const data = await comtradeService.getTopImportedProducts(destCode as string, parseInt(limit as string));
    res.json({ success: true, data, timestamp: new Date() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message, timestamp: new Date() });
  }
});

// GET /api/comtrade/export-destinations?originCountry=Argentina&hsCode=0901&limit=10
router.get("/api/comtrade/export-destinations", wtoRateLimiter, async (req: Request, res: Response) => {
  try {
    const { originCountry, hsCode, limit = "10" } = req.query;
    if (!originCountry || !hsCode) {
      return res.status(400).json({ success: false, error: "originCountry y hsCode son requeridos", timestamp: new Date() });
    }
    const data = await comtradeService.getTopExportDestinations(originCountry as string, hsCode as string, parseInt(limit as string));
    res.json({ success: true, data, timestamp: new Date() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message, timestamp: new Date() });
  }
});

// GET /api/comtrade/opportunities?hsCode=0901&limit=15
router.get("/api/comtrade/opportunities", wtoRateLimiter, async (req: Request, res: Response) => {
  try {
    const { hsCode, limit = "15" } = req.query;
    if (!hsCode) {
      return res.status(400).json({ success: false, error: "hsCode es requerido", timestamp: new Date() });
    }
    const data = await comtradeService.getExportOpportunities(hsCode as string, parseInt(limit as string));
    res.json({ success: true, data, timestamp: new Date() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message, timestamp: new Date() });
  }
});

// =====================
// 🧹 CACHE MANAGEMENT
// =====================

router.delete("/api/cache/clear", async (req: Request, res: Response) => {
  try {
    const { pattern } = req.query;
    await marketsService.clearCache(pattern as string | undefined);

    res.json({
      success: true,
      message: pattern ? `Cache cleared for pattern: ${pattern}` : "All cache cleared",
      timestamp: new Date(),
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message,
      timestamp: new Date(),
    });
  }
});

// =====================
// 🔍 INDICATOR SEARCH
// =====================

router.get("/api/timeseries/search/indicators", wtoRateLimiter, async (req: Request, res: Response) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        error: "Query parameter 'q' is required",
        timestamp: new Date(),
      });
    }

    const indicators = await marketsService.searchIndicators(q as string);

    const response: ApiResponse<typeof indicators> = {
      success: true,
      data: indicators,
      timestamp: new Date(),
    };

    res.json(response);
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message,
      timestamp: new Date(),
    });
  }
});

// =====================
// 🤖 CLASSIFY PROXY
// =====================

const CLASSIFY_BASE = process.env.CLASSIFY_BASE_URL ?? "https://ue1-dev-com-run-genai-aec-backend-785788544283.us-east1.run.app";
const CLASSIFY_USER_EMAIL = process.env.CLASSIFY_USER_EMAIL ?? "dafnanicole2612@gmail.com";
const CLASSIFY_POLL_INTERVAL_MS = 5000;
const CLASSIFY_POLL_MAX_ATTEMPTS = 72; // 6 min máx
let classifyClientPromise: Promise<IdTokenClient> | null = null;

function getGcpServiceAccountKey(): Record<string, unknown> | null {
  const keyFile = process.env.GCP_SERVICE_ACCOUNT_KEY_FILE ?? process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (keyFile) {
    try {
      return JSON.parse(readFileSync(keyFile, "utf8")) as Record<string, unknown>;
    } catch (err: any) {
      logger.warn(`[classify] GCP_SERVICE_ACCOUNT_KEY_FILE no se pudo leer (${keyFile}): ${err?.message} — intentando GCP_SERVICE_ACCOUNT_KEY`);
    }
  }

  const raw = process.env.GCP_SERVICE_ACCOUNT_KEY;
  if (!raw) return null;

  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    try {
      return JSON.parse(Buffer.from(raw, "base64").toString("utf8")) as Record<string, unknown>;
    } catch {
      logger.error("[classify] GCP_SERVICE_ACCOUNT_KEY no es JSON válido ni base64 válido");
      return null;
    }
  }
}

function getClassifyClient(): Promise<IdTokenClient> {
  if (!classifyClientPromise) {
    const credentials = getGcpServiceAccountKey();
    if (!credentials) {
      throw new Error("Configura GCP_SERVICE_ACCOUNT_KEY como JSON/base64 válido o GCP_SERVICE_ACCOUNT_KEY_FILE con la ruta del JSON");
    }
    const auth = new GoogleAuth({ credentials });
    classifyClientPromise = auth.getIdTokenClient(CLASSIFY_BASE).catch((err) => {
      classifyClientPromise = null; // permite reintentar en la próxima llamada
      throw err;
    });
  }
  return classifyClientPromise;
}

async function classifyRequest<T>(path: string, options: { method: "GET" | "POST"; data?: unknown }): Promise<T> {
  const client = await getClassifyClient();
  const response = await client.request<T>({
    url: `${CLASSIFY_BASE}${path}`,
    method: options.method,
    data: options.data,
    headers: {
      "x-user-email": CLASSIFY_USER_EMAIL,
      "Content-Type": "application/json",
    },
    timeout: 30000,
  });
  return response.data;
}

async function pollClassifyResult(taskId: string): Promise<void> {
  logger.info(`[classify] Iniciando polling | task_id=${taskId}`);
  for (let attempt = 1; attempt <= CLASSIFY_POLL_MAX_ATTEMPTS; attempt++) {
    await new Promise<void>((resolve) => setTimeout(resolve, CLASSIFY_POLL_INTERVAL_MS));
    try {
      const data = await classifyRequest<{ status: string; result?: unknown; current_step?: number; total_steps?: number; progress_message?: string }>(
        `/api/classify/${taskId}`,
        { method: "GET" }
      );

      logger.info(`[classify] Intento ${attempt} | task_id=${taskId} | status=${data.status}` +
        (data.current_step !== undefined ? ` | paso=${data.current_step}/${data.total_steps}` : "") +
        (data.progress_message ? ` | ${data.progress_message}` : "")
      );

      if (data.status === "completed") {
        logger.info(`[classify] ✅ COMPLETADO | task_id=${taskId}`);
        console.log("\n──────────────────────────────────────────");
        console.log(`[classify] RESULTADO task_id=${taskId}`);
        console.log(JSON.stringify(data.result, null, 2));
        console.log("──────────────────────────────────────────\n");
        return;
      }

      if (data.status === "failed" || data.status === "error") {
        logger.error(`[classify] ❌ FALLÓ | task_id=${taskId}`, undefined, { data });
        return;
      }
    } catch (err: any) {
      logger.warn(`[classify] Error en polling intento ${attempt} | task_id=${taskId} | ${err?.message}`);
    }
  }
  logger.warn(`[classify] Timeout: se alcanzó el máximo de intentos | task_id=${taskId}`);
}

router.post("/api/classify", requireAuth, async (req: Request, res: Response) => {
  try {
    if (!process.env.GCP_SERVICE_ACCOUNT_KEY && !process.env.GCP_SERVICE_ACCOUNT_KEY_FILE && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      return res.status(503).json({ success: false, error: "Servicio de clasificación no configurado", timestamp: new Date() });
    }

    const data = await classifyRequest<{ task_id?: string; [key: string]: unknown }>(
      "/api/classify-text/",
      { method: "POST", data: req.body }
    );

    const taskId = data.task_id;
    if (taskId) {
      void pollClassifyResult(taskId);
    }

    res.json({ success: true, data, timestamp: new Date() });
  } catch (err: any) {
    const status = err.response?.status;
    const message = err.response?.data?.detail ?? err.response?.data?.message ?? err.message;
    logger.error("classify proxy error", err, { status, message });
    res.status(typeof status === "number" && status >= 400 && status < 600 ? status : 500).json({ success: false, error: message, timestamp: new Date() });
  }
});

router.get("/api/classify/:taskId", requireAuth, async (req: Request, res: Response) => {
  try {
    if (!process.env.GCP_SERVICE_ACCOUNT_KEY && !process.env.GCP_SERVICE_ACCOUNT_KEY_FILE && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      return res.status(503).json({ success: false, error: "Servicio de clasificación no configurado", timestamp: new Date() });
    }

    const data = await classifyRequest<unknown>(
      `/api/classify/${req.params.taskId}`,
      { method: "GET" }
    );

    res.json({ success: true, data, timestamp: new Date() });
  } catch (err: any) {
    const status = err.response?.status;
    const message = err.response?.data?.detail ?? err.response?.data?.message ?? err.message;
    res.status(typeof status === "number" && status >= 400 && status < 600 ? status : 500).json({ success: false, error: message, timestamp: new Date() });
  }
});

// =====================
// 🌎 RAM PROMPERÚ ENDPOINTS
// =====================

router.get("/api/ram/countries", requireAuth, async (req: Request, res: Response) => {
  try {
    const { hs_code } = req.query;
    if (!hs_code) {
      res.status(400).json({ success: false, error: "Parámetro hs_code requerido", timestamp: new Date() });
      return;
    }
    const countries = await getRamProductCountries(String(hs_code));
    res.json({ success: true, data: countries, timestamp: new Date() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message, timestamp: new Date() });
  }
});

router.get("/api/ram/requirements", requireAuth, async (req: Request, res: Response) => {
  try {
    const { hs_code, country_name, country_id } = req.query;
    if (!hs_code || !country_name) {
      res.status(400).json({ success: false, error: "Parámetros hs_code y country_name requeridos", timestamp: new Date() });
      return;
    }
    const result = await getRamRequirements(
      String(hs_code),
      String(country_name),
      country_id ? Number(country_id) : undefined
    );
    res.json({ success: true, data: result, timestamp: new Date() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message, timestamp: new Date() });
  }
});

router.get("/api/ram/download", requireAuth, async (req: Request, res: Response) => {
  try {
    const { hs_code, country_name, country_id } = req.query;
    if (!hs_code || !country_name) {
      res.status(400).json({ success: false, error: "Parámetros hs_code y country_name requeridos", timestamp: new Date() });
      return;
    }
    const result = await proxyRamDownload(
      String(hs_code),
      String(country_name),
      country_id ? Number(country_id) : undefined
    );
    if (!result) {
      res.status(404).json({ success: false, error: "No se encontraron datos de requisitos para este producto y país", timestamp: new Date() });
      return;
    }
    res.setHeader("Content-Type", result.contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);
    result.stream.pipe(res);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message, timestamp: new Date() });
  }
});

export default router;
