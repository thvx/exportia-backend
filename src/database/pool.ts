import { Pool, QueryResult, QueryResultRow } from "pg";
import { config } from "../config.js";
import { logger } from "@utils/logger.js";

/**
 * PostgreSQL Database Connection Pool
 */

const pool = new Pool({
  host: config.DB_HOST,
  port: config.DB_PORT,
  database: config.DB_NAME,
  user: config.DB_USER,
  password: config.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on("error", (err) => {
  logger.error("Unexpected database pool error", err);
});

pool.on("connect", () => {
  logger.info("PostgreSQL pool connected");
});

export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  try {
    const result = await pool.query(text, params);
    return result;
  } catch (err) {
    logger.error("Query error", err, {
      database: config.DB_NAME,
      host: config.DB_HOST,
      port: config.DB_PORT,
    });
    throw err;
  }
}

export async function getConnection() {
  return pool.connect();
}

export async function closePool() {
  if (pool) {
    await pool.end();
    logger.info("Database pool closed");
  }
}

export default pool;
