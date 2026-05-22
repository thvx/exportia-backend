import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { query } from "./pool.js";
import { logger } from "../utils/logger.js";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const hash = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${hash.toString("hex")}`;
}

export async function initializeTables(): Promise<void> {
  logger.info("Running database migrations...");

  try {
    // Users table
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        name VARCHAR(255),
        password_hash VARCHAR(512),
        role VARCHAR(50) DEFAULT 'user',
        api_key VARCHAR(255) UNIQUE,
        origin_country VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Add new columns if they don't exist (idempotent migrations)
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name VARCHAR(100);`);
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);`);
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS origin_country VARCHAR(100);`);

    logger.info("Users table ready");

    // Products table
    await query(`
      CREATE TABLE IF NOT EXISTS products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        hs_code VARCHAR(20) UNIQUE NOT NULL,
        category VARCHAR(100),
        description TEXT,
        regulations TEXT[],
        created_by UUID NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
      );
    `);
    logger.info("Products table ready");

    // Add classification_data column if it doesn't already exist (non-destructive migration)
    await query(`
      ALTER TABLE products ADD COLUMN IF NOT EXISTS classification_data JSONB DEFAULT NULL;
    `);
    logger.info("Products classification_data column ready");

    // User destination countries table
    await query(`
      CREATE TABLE IF NOT EXISTS user_destination_countries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        country_code VARCHAR(10) NOT NULL,
        country_name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE (user_id, country_code)
      );
    `);
    logger.info("User destination countries table ready");

    // User products junction table (user ↔ product many-to-many)
    await query(`
      CREATE TABLE IF NOT EXISTS user_products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        product_id UUID NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        UNIQUE (user_id, product_id)
      );
    `);
    logger.info("User products junction table ready");

    // Chat sessions table
    await query(`
      CREATE TABLE IF NOT EXISTS chat_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        topic VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);
    logger.info("Chat sessions table ready");

    // Chat messages table
    await query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID NOT NULL,
        user_id UUID NOT NULL,
        content TEXT NOT NULL,
        role VARCHAR(20) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);
    logger.info("Chat messages table ready");

    // Query logs table
    await query(`
      CREATE TABLE IF NOT EXISTS query_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID,
        endpoint VARCHAR(255),
        product VARCHAR(100),
        country VARCHAR(100),
        response_time_ms INT,
        cache_hit BOOLEAN,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      );
    `);
    logger.info("Query logs table ready");

    // Export price cache table (shared across users, keyed by trade route)
    await query(`
      CREATE TABLE IF NOT EXISTS product_export_prices (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        hs_code VARCHAR(20) NOT NULL,
        origin_country VARCHAR(100) NOT NULL,
        destination_country VARCHAR(100) NOT NULL,
        price_avg NUMERIC(14, 4) NOT NULL,
        price_min NUMERIC(14, 4) NOT NULL,
        price_max NUMERIC(14, 4) NOT NULL,
        unit VARCHAR(50) NOT NULL,
        currency VARCHAR(10) NOT NULL DEFAULT 'USD',
        explanation TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (hs_code, origin_country, destination_country)
      );
    `);
    logger.info("Product export prices cache table ready");

    await query(`
      ALTER TABLE product_export_prices ADD COLUMN IF NOT EXISTS price_history JSONB DEFAULT '[]';
    `);
    logger.info("Product export prices price_history column ready");

    // Per-product destination countries table
    await query(`
      CREATE TABLE IF NOT EXISTS product_destination_countries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID NOT NULL,
        country_code VARCHAR(10) NOT NULL,
        country_name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        UNIQUE (product_id, country_code)
      );
    `);
    logger.info("Product destination countries table ready");

    // Indices
    await query(`
      CREATE INDEX IF NOT EXISTS idx_products_hs_code ON products(hs_code);
      CREATE INDEX IF NOT EXISTS idx_export_prices_route ON product_export_prices(hs_code, origin_country, destination_country);
      CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
      CREATE INDEX IF NOT EXISTS idx_query_logs_user_id ON query_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_query_logs_created_at ON query_logs(created_at);
      CREATE INDEX IF NOT EXISTS idx_user_dest_countries_user_id ON user_destination_countries(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_products_user_id ON user_products(user_id);
      CREATE INDEX IF NOT EXISTS idx_product_dest_countries_product_id ON product_destination_countries(product_id);
    `);
    logger.info("Indices ready");

    logger.info("Database initialization complete");
  } catch (err) {
    logger.error("Database migration error", err);
    throw err;
  }
}

export async function seedDefaultUsers(): Promise<void> {
  logger.info("Seeding default users...");

  try {
    // Admin: María García
    const adminHash = await hashPassword("Admin2024!");
    const adminResult = await query(
      `INSERT INTO users (email, first_name, last_name, name, password_hash, role)
       VALUES ($1, $2, $3, $4, $5, 'admin')
       ON CONFLICT (email) DO NOTHING
       RETURNING id, email, role;`,
      ["admin@exportafacil.com", "María", "García", "María García", adminHash]
    );

    // Test user 1: Juan Rodríguez
    const juan = await hashPassword("Exporta2024!");
    const juanResult = await query(
      `INSERT INTO users (email, first_name, last_name, name, password_hash, role, origin_country)
       VALUES ($1, $2, $3, $4, $5, 'user', $6)
       ON CONFLICT (email) DO NOTHING
       RETURNING id, email, role;`,
      ["juan.rodriguez@exportafacil.com", "Juan", "Rodríguez", "Juan Rodríguez", juan, "Colombia"]
    );

    // Test user 2: Ana Martínez
    const ana = await hashPassword("Exporta2024!");
    const anaResult = await query(
      `INSERT INTO users (email, first_name, last_name, name, password_hash, role, origin_country)
       VALUES ($1, $2, $3, $4, $5, 'user', $6)
       ON CONFLICT (email) DO NOTHING
       RETURNING id, email, role;`,
      ["ana.martinez@exportafacil.com", "Ana", "Martínez", "Ana Martínez", ana, "México"]
    );

    // Test user 3: Carlos López
    const carlos = await hashPassword("Exporta2024!");
    const carlosResult = await query(
      `INSERT INTO users (email, first_name, last_name, name, password_hash, role, origin_country)
       VALUES ($1, $2, $3, $4, $5, 'user', $6)
       ON CONFLICT (email) DO NOTHING
       RETURNING id, email, role;`,
      ["carlos.lopez@exportafacil.com", "Carlos", "López", "Carlos López", carlos, "Argentina"]
    );

    const created = [adminResult, juanResult, anaResult, carlosResult].filter((r) => r.rows.length > 0);
    if (created.length > 0) {
      logger.info(`Created ${created.length} default user(s)`);
    } else {
      logger.info("Default users already exist, skipping seed");
    }
  } catch (err) {
    logger.warn(`Default users seeding error (non-critical): ${err instanceof Error ? err.message : "Unknown error"}`);
  }
}

export async function seedSampleData(): Promise<void> {
  logger.info("Seeding sample data...");

  try {
    const userResult = await query(`SELECT id FROM users LIMIT 1;`);

    if (userResult.rows.length === 0) {
      logger.warn("No users found, skipping sample data seed");
      return;
    }

    const userId = userResult.rows[0].id;

    await query(
      `INSERT INTO products (name, hs_code, category, description, created_by)
       VALUES
       ($1, $2, $3, $4, $5),
       ($6, $7, $8, $9, $5),
       ($10, $11, $12, $13, $5)
       ON CONFLICT DO NOTHING;`,
      [
        "Café Colombiano",
        "0901110000",
        "Agrícola",
        "Granos de café arábica de alta calidad",
        userId,
        "Cacao Ghanés",
        "1801000000",
        "Agrícola",
        "Productos de cacao premium",
        "Banano Ecuatoriano",
        "0803900000",
        "Agrícola",
        "Bananos orgánicos",
      ]
    );

    logger.info("Sample data seeded successfully");
  } catch (err) {
    logger.warn(`Sample data seeding error (non-critical): ${err instanceof Error ? err.message : "Unknown error"}`);
  }
}
