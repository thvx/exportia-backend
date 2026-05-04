import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import jwt from "jsonwebtoken";
import { query } from "../database/pool.js";
import { logger } from "../utils/logger.js";
import { JWTPayload, RegisterRequest, UserProfile } from "../types/index.js";

const scryptAsync = promisify(scrypt);

class AuthService {
  async hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16).toString("hex");
    const hash = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${salt}:${hash.toString("hex")}`;
  }

  async verifyPassword(password: string, stored: string): Promise<boolean> {
    const [salt, hash] = stored.split(":");
    if (!salt || !hash) return false;
    const hashBuffer = Buffer.from(hash, "hex");
    const derivedHash = (await scryptAsync(password, salt, 64)) as Buffer;
    return timingSafeEqual(hashBuffer, derivedHash);
  }

  generateToken(user: { id: string; email: string; role: string }): string {
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };
    return jwt.sign(payload, process.env.JWT_SECRET || "dev-secret", {
      expiresIn: (process.env.JWT_EXPIRY as any) || "24h",
    });
  }

  async register(data: RegisterRequest): Promise<{ user: UserProfile; token: string }> {
    const existing = await query("SELECT id FROM users WHERE email = $1", [data.email.toLowerCase()]);
    if (existing.rows.length > 0) {
      throw new Error("El correo electrónico ya está registrado");
    }

    const password_hash = await this.hashPassword(data.password);
    const name = `${data.first_name} ${data.last_name}`;

    const result = await query(
      `INSERT INTO users (first_name, last_name, email, name, password_hash, role, origin_country)
       VALUES ($1, $2, $3, $4, $5, 'user', $6)
       RETURNING id, first_name, last_name, email, name, role, origin_country, created_at, updated_at`,
      [data.first_name, data.last_name, data.email.toLowerCase(), name, password_hash, data.origin_country || null]
    );

    const user = result.rows[0];
    const token = this.generateToken(user);
    logger.info(`User registered: ${data.email}`);

    return {
      user: { ...user, destination_countries: [], products: [] },
      token,
    };
  }

  async login(email: string, password: string): Promise<{ user: UserProfile; token: string }> {
    const result = await query(
      `SELECT id, first_name, last_name, email, name, password_hash, role, origin_country, created_at, updated_at
       FROM users WHERE email = $1`,
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      throw new Error("Credenciales inválidas");
    }

    const row = result.rows[0];
    const valid = await this.verifyPassword(password, row.password_hash);
    if (!valid) {
      throw new Error("Credenciales inválidas");
    }

    const { password_hash, ...user } = row;
    const token = this.generateToken(user);
    logger.info(`User logged in: ${email}`);

    const profile = await this.getUserProfile(user.id);
    return { user: profile!, token };
  }

  async getUserById(id: string): Promise<Omit<UserProfile, "destination_countries" | "products"> | null> {
    const result = await query(
      `SELECT id, first_name, last_name, email, name, role, origin_country, created_at, updated_at
       FROM users WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  async getUserProfile(id: string): Promise<UserProfile | null> {
    const user = await this.getUserById(id);
    if (!user) return null;

    const countriesResult = await query(
      `SELECT country_code, country_name FROM user_destination_countries WHERE user_id = $1 ORDER BY country_name`,
      [id]
    );

    const productsResult = await query(
      `SELECT p.id, p.name, p.hs_code, p.category, p.description, p.regulations,
              p.classification_data, p.created_at, p.updated_at, p.created_by
       FROM products p
       INNER JOIN user_products up ON p.id = up.product_id
       WHERE up.user_id = $1
       ORDER BY p.name`,
      [id]
    );

    return {
      ...user,
      destination_countries: countriesResult.rows,
      products: productsResult.rows,
    };
  }

  async updateProfile(
    id: string,
    data: { first_name?: string; last_name?: string; origin_country?: string }
  ): Promise<UserProfile | null> {
    const setClauses: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (data.first_name !== undefined) {
      setClauses.push(`first_name = $${idx++}`);
      values.push(data.first_name);
    }
    if (data.last_name !== undefined) {
      setClauses.push(`last_name = $${idx++}`);
      values.push(data.last_name);
    }
    if (data.origin_country !== undefined) {
      setClauses.push(`origin_country = $${idx++}`);
      values.push(data.origin_country || null);
    }

    if (setClauses.length > 0) {
      // Keep name column in sync
      if (data.first_name !== undefined || data.last_name !== undefined) {
        setClauses.push(`name = CONCAT(COALESCE($${idx}, first_name), ' ', COALESCE($${idx + 1}, last_name))`);
        values.push(data.first_name ?? null, data.last_name ?? null);
        idx += 2;
      }
      setClauses.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(id);
      await query(`UPDATE users SET ${setClauses.join(", ")} WHERE id = $${idx}`, values);
    }

    return this.getUserProfile(id);
  }

  async addDestinationCountry(userId: string, countryCode: string, countryName: string): Promise<void> {
    await query(
      `INSERT INTO user_destination_countries (user_id, country_code, country_name)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, country_code) DO UPDATE SET country_name = EXCLUDED.country_name`,
      [userId, countryCode.toUpperCase(), countryName]
    );
    logger.info(`Destination country added for user ${userId}: ${countryCode}`);
  }

  async removeDestinationCountry(userId: string, countryCode: string): Promise<void> {
    await query(
      `DELETE FROM user_destination_countries WHERE user_id = $1 AND country_code = $2`,
      [userId, countryCode.toUpperCase()]
    );
    logger.info(`Destination country removed for user ${userId}: ${countryCode}`);
  }
}

export const authService = new AuthService();
