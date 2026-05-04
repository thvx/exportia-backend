/**
 * Domain types for Exporta Fácil backend
 */

// ✅ Alerts Service Types
export interface EpingAlert {
  id: string;
  product: string;
  country: string;
  description: string;
  reference: string;
  startDate: Date;
  endDate?: Date;
  severity: "low" | "medium" | "high" | "critical";
  apiSource: "ePing" | "QR";
}

export interface QRQuota {
  id: string;
  product: string;
  country: string;
  quotaValue: number;
  quotaUnit: string;
  remainingQuota: number;
  expiryDate?: Date;
  restrictions?: string[];
}

export interface QRRegulation {
  id: number;
  reporter_member: {
    code?: string;
    name: { es: string; en?: string };
  };
  general_description: string;
  in_force_from: string;
  termination_dt: string | null;
  measures: Array<{ description?: string; [key: string]: any }>;
  affected_products?: Array<{ code: string; description: string }>;
  notified_in: Array<{ symbol: string; [key: string]: any }>;
  details?: string;
  national_legal_bases?: any[];
  administrative_mechanisms?: any[];
}

export interface QRProduct {
  code: string;
  description: string;
  hs_version: string;
}

export interface QRListMeta {
  total: number;
  page: number;
  last_page: number;
}

// ✅ Timeseries Markets Types

export interface TimeseriesQueryParams {
  indicator: string;
  reporters?: string;  // comma-separated WTO economy codes
  partners?: string;   // comma-separated WTO partner codes
  periods?: string;    // comma-separated years, e.g. "2018,2019,2020"
  frequency?: "A" | "Q" | "M";
  products?: string;   // comma-separated SITC3 codes
  max?: number;
}

export interface TimeseriesDataPoint {
  indicator: string;
  reporter: string;
  reporter_code: string;
  partner?: string;
  partner_code?: string;
  product: string;
  product_code: string;
  period: string;
  value: number;
  unit?: string;
  frequency?: string;
}

export interface DemandTrend {
  reporter: string;
  reporter_code: string;
  product: string;
  product_code: string;
  period: string;
  import_value: number;
  yoy_growth?: number;
}

export interface MarketProfile {
  reporter: string;
  reporter_code: string;
  product: string;
  product_code: string;
  market_size: number;
  cagr: number;
  volatility: number;
  trend: "rising" | "stable" | "declining";
  top_suppliers: Array<{
    country: string;
    country_code: string;
    share: number;
  }>;
  periods: string[];
  data: DemandTrend[];
}

export interface PotentialMarket {
  reporter: string;
  reporter_code: string;
  import_value: number;
  growth_rate: number;
  trend: "rising" | "stable" | "declining";
  cagr: number;
}

export interface HSVersion {
  code: string;
  version: string;
  label: string;
}

// ✅ Markets Service Types
export interface MarketTrend {
  product: string;
  product_code: string;
  country: string;
  period: string; // "2024-01" format
  importValue: number;
  exportValue: number;
  yoyGrowth?: number;
  competitionLevel: "low" | "medium" | "high";
}

export interface CompetitorScore {
  competitor_country: string;
  market_share: number;
  trend: "rising" | "stable" | "declining";
  last_updated: Date;
}

// ✅ Facility Service Types
export interface TFADProcess {
  process_id: string;
  process_name: string;
  country: string;
  required_documents: string[];
  processing_time_days: number;
  fees?: number;
  last_update: Date;
}

export interface LogisticRequirement {
  requirement_id: string;
  product_category: string;
  country: string;
  description: string;
  mandatory: boolean;
}

// ✅ Product Service Types
export interface ProductConfig {
  id: string;
  name: string;
  hs_code: string;
  category: string;
  description?: string;
  regulations?: string[];
  created_at: Date;
  updated_at: Date;
  created_by: string;
}

export interface RivalAnalysis {
  product_id: string;
  competitor_id: string;
  market_share: number;
  price_index: number;
  quality_rating: number;
  last_analyzed: Date;
}

// ✅ Chat Service Types
export interface ChatMessage {
  id: string;
  user_id: string;
  content: string;
  role: "user" | "assistant";
  context?: Partial<EpingAlert | MarketTrend | TFADProcess>;
  created_at: Date;
}

export interface ChatSession {
  id: string;
  user_id: string;
  messages: ChatMessage[];
  topic?: string;
  created_at: Date;
  updated_at: Date;
}

// ✅ User & Auth Types
export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  name: string;
  api_key?: string;
  role: "user" | "admin";
  origin_country?: string;
  created_at: Date;
  updated_at: Date;
}

export interface UserDestinationCountry {
  country_code: string;
  country_name: string;
}

export interface UserProfile extends User {
  destination_countries: UserDestinationCountry[];
  products: ProductConfig[];
}

export interface RegisterRequest {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  origin_country?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: Omit<UserProfile, "api_key">;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

// ✅ API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: Date;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  timestamp: Date;
}

// ✅ Cache Key Types
export interface CacheEntry<T> {
  key: string;
  value: T;
  expiresAt: Date;
}

// ✅ Request Context
export interface RequestContext {
  userId?: string;
  userRole?: string;
  apiKey?: string;
  requestId: string;
  startTime: Date;
}
