/**
 * Bootstrap configuration - MUST be imported first
 * Loads environment variables before any other modules initialize
 */
import dotenv from "dotenv";

// Load .env file relative to project root
dotenv.config({ path: ".env" });

export const config = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: parseInt(process.env.PORT || "3000"),
  WTO_BASE_URL: process.env.WTO_BASE_URL || "https://api.wto.org",
  WTO_EPING_API_KEY: process.env.WTO_EPING_API_KEY || "",
  WTO_QR_API_KEY: process.env.WTO_QR_API_KEY || "",
  WTO_TIMESERIES_API_KEY: process.env.WTO_TIMESERIES_API_KEY || "",
  WTO_TFAD_API_KEY: process.env.WTO_TFAD_API_KEY || "",
  WTO_CUSTOM_API_KEY: process.env.WTO_CUSTOM_API_KEY || "",
  DATABASE_URL: process.env.DATABASE_URL || "",
  DB_HOST: process.env.DB_HOST || "localhost",
  DB_PORT: parseInt(process.env.DB_PORT || "5432"),
  DB_NAME: process.env.DB_NAME || "exporta_facil",
  DB_USER: process.env.DB_USER || "postgres",
  DB_PASSWORD: process.env.DB_PASSWORD || "postgres",
  REDIS_URL: process.env.REDIS_URL || "",
  REDIS_HOST: process.env.REDIS_HOST || "localhost",
  REDIS_PORT: parseInt(process.env.REDIS_PORT || "6379"),
  REDIS_PASSWORD: process.env.REDIS_PASSWORD || "",
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
  JWT_SECRET: process.env.JWT_SECRET || "dev-secret-key-change-in-production",
  JWT_EXPIRY: process.env.JWT_EXPIRY || "24h",
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000"),
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100"),
  WTO_CACHE_TTL: parseInt(process.env.WTO_CACHE_TTL || "300"),
};
