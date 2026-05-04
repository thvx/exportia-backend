// Load environment variables FIRST, before any other imports
import "./config.js";

import express from "express";
import helmet from "helmet";
import cors from "cors";
import { cacheService } from "@cache/index.js";
import { initializeTables } from "@database/schema.js";
import { logger } from "@utils/logger.js";
import { globalRateLimiter } from "@middleware/rateLimiting.js";
import {
  authMiddleware,
  requestLoggingMiddleware,
  errorMiddleware,
} from "@middleware/auth.js";
import apiRoutes from "@routes/api.js";
import swaggerDocs from "@utils/swagger.js";

const app = express();
const PORT = parseInt(process.env.PORT || "3000");
const isDev = process.env.NODE_ENV !== "production";

// =====================
// SECURITY MIDDLEWARE (BEFORE CORS)
// =====================

app.use(
  helmet({
    contentSecurityPolicy: isDev ? false : {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
      },
    },
    hsts: isDev ? false : { maxAge: 31536000, includeSubDomains: true, preload: true },
    frameguard: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// =====================
// CORS MIDDLEWARE (BEFORE OTHER MIDDLEWARE)
// =====================

const corsOptions = {
  origin: process.env.FRONTEND_URL || "*",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"],
  allowedHeaders: ["Content-Type", "Authorization", "X-API-Key"],
  optionsSuccessStatus: 200,
  preflightContinue: false,
};

app.use(cors(corsOptions));

// =====================
// BODY PARSING MIDDLEWARE
// =====================

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// =====================
// DOCUMENTATION ENDPOINTS (PUBLIC - NO AUTH REQUIRED)
// =====================

app.get("/docs/swagger.json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.json(swaggerDocs);
});

// Serve Swagger UI with inline JavaScript and CSS
app.get("/docs", (req, res) => {
  const swaggerHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Exporta Fácil API - Documentation</title>
  <style>
    html {
      box-sizing: border-box;
      overflow: -moz-scrollbars-vertical;
      overflow-y: scroll;
    }
    *,
    *:before,
    *:after {
      box-sizing: inherit;
    }
    body {
      margin: 0;
      background: #fafafa;
      font-family: sans-serif;
    }
    .swagger-ui {
      max-width: 100%;
    }
    .topbar {
      background-color: #1a1a1a;
      color: #f8f8f8;
      padding: 10px 20px;
    }
    .loading {
      text-align: center;
      padding: 40px;
      color: #666;
    }
  </style>
</head>
<body>
  <div id="swagger-ui" class="swagger-ui"></div>
  <div id="loading" class="loading">Loading API documentation...</div>
  
  <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@3.52.0/swagger-ui.css" />
  
  <script src="https://unpkg.com/swagger-ui-dist@3.52.0/swagger-ui-bundle.js" defer></script>
  <script src="https://unpkg.com/swagger-ui-dist@3.52.0/swagger-ui-standalone-preset.js" defer></script>
  <script>
    window.onload = function() {
      console.log('Initializing Swagger UI...');
      const ui = SwaggerUIBundle({
        url: "/docs/swagger.json",
        dom_id: '#swagger-ui',
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        layout: "StandaloneLayout",
        deepLinking: true,
        showRequestHeaders: true,
        filter: true,
        onComplete: function() {
          console.log('✓ Swagger UI loaded successfully');
          document.getElementById('loading').style.display = 'none';
        },
        onFailure: function(err) {
          console.error('✗ Swagger UI failed to load:', err);
          document.getElementById('loading').innerHTML = '<p style="color: red;">❌ Failed to load API documentation. Please check the console.</p>';
        }
      });
      window.ui = ui;
    };
  </script>
</body>
</html>`;
  
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");
  res.send(swaggerHtml);
});

// Health check endpoint (PUBLIC)
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date(),
    version: "1.0.0",
    environment: process.env.NODE_ENV,
  });
});

// =====================
// AUTH & RATE LIMITING (AFTER DOCS)
// =====================

app.use(authMiddleware);
app.use(globalRateLimiter);

// =====================
// REQUEST LOGGING
// =====================

app.use(requestLoggingMiddleware);

// =====================
// API ROUTES
// =====================

app.use(apiRoutes);

// =====================
// ERROR HANDLING
// =====================

app.use(errorMiddleware);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found",
    path: req.path,
    timestamp: new Date(),
  });
});

// =====================
// SERVER STARTUP
// =====================

async function startServer() {
  try {
    // Run DB migrations (idempotent — safe to run on every start)
    logger.info("Running DB migrations...");
    await initializeTables();

    // Initialize cache
    logger.info("Initializing cache service...");
    await cacheService.connect();

    // Start Express server
    app.listen(PORT, () => {
      logger.startup(`
EXPORTA FACIL BACKEND INITIALIZED
Server: http://localhost:${PORT}
Environment: ${process.env.NODE_ENV}
Documentation: http://localhost:${PORT}/docs
Health Check: http://localhost:${PORT}/health
      `);

      logger.info("Available Endpoints:");
      logger.info("  GET    /health");
      logger.info("  GET    /api/alerts?product=<product>");
      logger.info("  GET    /api/alerts/critical?days=<days>");
      logger.info("  GET    /api/events?product=<product>");
      logger.info("  GET    /api/markets?product=<product>");
      logger.info("  GET    /api/markets/competition?product=<product>&country=<country>");
      logger.info("  GET    /api/markets/trending?limit=<limit>");
      logger.info("  GET    /api/facility?country=<country>");
      logger.info("  POST   /api/facility/clearance-estimate");
      logger.info("  GET    /api/product?category=<category>");
      logger.info("  POST   /api/product");
      logger.info("  POST   /api/chat/session");
      logger.info("  POST   /api/chat/:sessionId/message");
    });
  } catch (err) {
    logger.error(`Failed to start server: ${err instanceof Error ? err.message : "Unknown error"}`);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on("SIGTERM", async () => {
  logger.warn("SIGTERM received, shutting down gracefully...");
  await cacheService.disconnect();
  process.exit(0);
});

// Start server
startServer();

export default app;
