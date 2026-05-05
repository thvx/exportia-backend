import axios from "axios";
import { logger } from "../utils/logger.js";

const BASE = "https://ram-ws.promperu.gob.pe/api";
const HEADERS = {
  Accept: "application/json, text/javascript, */*; q=0.01",
  Origin: "https://ram.promperu.gob.pe",
  Referer: "https://ram.promperu.gob.pe/",
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
};

interface RamProduct {
  id?: number;
  ID?: number;
  codigo?: string;
  Codigo?: string;
  PARTIDA?: string;
  partida?: string;
  Producto?: string;
  PRODUCTO?: string;
  descripcion?: string;
  Descripcion?: string;
  [key: string]: unknown;
}

interface RamCountry {
  id?: number;
  ID?: number;
  nombre?: string;
  Nombre?: string;
  pais?: string;
  Pais?: string;
  PAIS?: string;
  codigo?: string;
  Codigo?: string;
  CODIGO?: string;
  COD_PAIS_ISO?: string | null;
  [key: string]: unknown;
}

// In-memory cache with TTL
let productsCache: RamProduct[] | null = null;
let productsCacheTime = 0;
const CACHE_TTL_MS = 6 * 3600 * 1000; // 6 hours

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function getNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function getProductId(p: RamProduct): number | null {
  return getNumber(p.id ?? p.ID);
}

function getCode(p: RamProduct): string {
  return String(p.codigo ?? p.Codigo ?? p.partida ?? p.PARTIDA ?? "").replace(/\D/g, "");
}

function getCountryId(c: RamCountry): number | null {
  return getNumber(c.id ?? c.ID);
}

function getCountryName(c: RamCountry): string {
  return String(c.nombre ?? c.Nombre ?? c.pais ?? c.Pais ?? c.PAIS ?? "");
}

function hasRequirementsPayload(data: unknown): boolean {
  if (Array.isArray(data)) return data.length > 0;
  if (data && typeof data === "object") return Object.keys(data).length > 0;
  return data !== null && data !== undefined && data !== "";
}

async function fetchProducts(): Promise<RamProduct[]> {
  if (productsCache && Date.now() - productsCacheTime < CACHE_TTL_MS) {
    return productsCache;
  }
  try {
    const res = await axios.get<RamProduct[]>(`${BASE}/Productos`, {
      headers: HEADERS,
      timeout: 10000,
    });
    productsCache = Array.isArray(res.data) ? res.data : [];
    productsCacheTime = Date.now();
    return productsCache;
  } catch (err) {
    logger.warn(`RAM Promperú: could not fetch products list: ${err instanceof Error ? err.message : String(err)}`);
    return productsCache ?? [];
  }
}

async function findProductId(hsCode: string): Promise<number | null> {
  const products = await fetchProducts();
  if (!products.length) return null;

  const clean = hsCode.replace(/\D/g, "");
  const hs6 = clean.slice(0, 6);
  const hs4 = clean.slice(0, 4);

  // RAM uses an internal product ID; PARTIDA is usually 10 digits (e.g. 0804.40.00.00).
  let match = products.find((p) => getCode(p) === clean);
  if (!match && hs6.length === 6) match = products.find((p) => getCode(p).startsWith(hs6));
  if (!match && hs4.length === 4) match = products.find((p) => getCode(p).startsWith(hs4));

  const productId = match ? getProductId(match) : null;
  if (!productId && clean) {
    logger.warn(`RAM Promperú: no internal product ID found for HS code ${clean}`);
  }
  return productId;
}

async function fetchCountries(productId: number): Promise<RamCountry[]> {
  try {
    const res = await axios.get<RamCountry[]>(`${BASE}/pais?idp=${productId}`, {
      headers: HEADERS,
      timeout: 8000,
    });
    return Array.isArray(res.data) ? res.data : [];
  } catch (err) {
    logger.warn(`RAM Promperú: could not fetch countries for product ${productId}: ${err instanceof Error ? err.message : String(err)}`);
    return [];
  }
}

async function findCountryId(productId: number, countryName: string, countryId?: number): Promise<number | null> {
  if (countryId) return countryId;

  const countries = await fetchCountries(productId);
  const needle = normalize(countryName);
  const match = countries.find((c) => {
    const name = normalize(getCountryName(c));
    return name === needle || name.includes(needle) || needle.includes(name);
  });

  return match ? getCountryId(match) : null;
}

export interface RamCountryItem {
  id: number;
  name: string;
}

export async function getRamProductCountries(hsCode: string): Promise<RamCountryItem[]> {
  const productId = await findProductId(hsCode);
  if (!productId) return [];

  try {
    const countries = await fetchCountries(productId);
    return countries
      .map((c) => ({ id: getCountryId(c), name: getCountryName(c) }))
      .filter((c): c is RamCountryItem => c.id !== null && c.name.length > 0);
  } catch (err) {
    logger.warn(`RAM Promperú: could not fetch countries for product ${productId}: ${err instanceof Error ? err.message : String(err)}`);
    return [];
  }
}

export interface RamRequirementsResult {
  hasData: boolean;
  productId: number | null;
  countryId: number | null;
  downloadUrl: string | null;
  requirements: unknown;
}

export async function getRamRequirements(
  hsCode: string,
  countryName: string,
  countryId?: number
): Promise<RamRequirementsResult> {
  const productId = await findProductId(hsCode);
  if (!productId) {
    return { hasData: false, productId: null, countryId: null, downloadUrl: null, requirements: null };
  }

  const resolvedCountryId = await findCountryId(productId, countryName, countryId);
  if (!resolvedCountryId) {
    return { hasData: false, productId, countryId: null, downloadUrl: null, requirements: null };
  }

  let requirements: unknown = null;
  try {
    const res = await axios.get(
      `${BASE}/requisitos?producto=${productId}&pais=${resolvedCountryId}`,
      { headers: HEADERS, timeout: 10000 }
    );
    requirements = res.data;
  } catch (err) {
    logger.warn(`RAM Promperú: could not fetch requirements: ${err instanceof Error ? err.message : String(err)}`);
  }

  const downloadUrl = `${BASE}/descarga?producto=${productId}&pais=${resolvedCountryId}`;

  return {
    hasData: hasRequirementsPayload(requirements),
    productId,
    countryId: resolvedCountryId,
    downloadUrl,
    requirements,
  };
}

export async function proxyRamDownload(
  hsCode: string,
  countryName: string,
  countryId?: number
): Promise<{ stream: NodeJS.ReadableStream; contentType: string; filename: string } | null> {
  const productId = await findProductId(hsCode);
  if (!productId) return null;

  const resolvedCountryId = await findCountryId(productId, countryName, countryId);
  if (!resolvedCountryId) return null;

  const url = `${BASE}/descarga?producto=${productId}&pais=${resolvedCountryId}`;
  try {
    const res = await axios.get<NodeJS.ReadableStream>(url, {
      headers: { ...HEADERS, Accept: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/octet-stream, */*" },
      responseType: "stream",
      timeout: 20000,
    });
    const contentType =
      String(res.headers["content-type"] ?? "application/octet-stream");
    return {
      stream: res.data,
      contentType,
      filename: `requisitos_${productId}_${resolvedCountryId}.xlsx`,
    };
  } catch (err) {
    logger.warn(`RAM Promperú: download proxy failed: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}
