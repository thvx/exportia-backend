import { EpingAlert, QRQuota, HSVersion, MarketTrend, TFADProcess, QRRegulation, QRProduct, QRListMeta, TimeseriesDataPoint, DemandTrend, MarketProfile, PotentialMarket } from "../types/index.js";

/**
 * Mock data for development and fallback when WTO API is unavailable
 */

export const mockAlerts: EpingAlert[] = [
  {
    id: "alert-001",
    product: "Coffee",
    country: "Colombia",
    description: "New SPS certification required for coffee imports",
    reference: "SPS/2024/0125",
    startDate: new Date("2024-01-15"),
    severity: "high",
    apiSource: "ePing",
  },
  {
    id: "alert-002",
    product: "Coffee",
    country: "Vietnam",
    description: "TBT - Maximum pesticide residue limits updated",
    reference: "TBT/2024/0088",
    startDate: new Date("2024-01-10"),
    endDate: new Date("2024-06-10"),
    severity: "medium",
    apiSource: "ePing",
  },
  {
    id: "alert-003",
    product: "Cocoa",
    country: "Ghana",
    description: "Increased customs verification for cocoa products",
    reference: "QR/2024/0042",
    startDate: new Date("2024-01-20"),
    severity: "low",
    apiSource: "QR",
  },
];

export const mockQuotas: QRQuota[] = [
  {
    id: "quota-001",
    product: "Bananas",
    country: "Ecuador",
    quotaValue: 5000,
    quotaUnit: "tons",
    remainingQuota: 3200,
    restrictions: ["Must comply with organic standards", "Documentation required"],
  },
  {
    id: "quota-002",
    product: "Sugar",
    country: "Brazil",
    quotaValue: 2000,
    quotaUnit: "tons",
    remainingQuota: 500,
    expiryDate: new Date("2024-12-31"),
  },
];

export const mockMarketTrends: MarketTrend[] = [
  {
    product: "Coffee",
    product_code: "0901110000",
    country: "Colombia",
    period: "2024-01",
    importValue: 125000000,
    exportValue: 0,
    yoyGrowth: 8.5,
    competitionLevel: "high",
  },
  {
    product: "Cocoa",
    product_code: "1801000000",
    country: "Ghana",
    period: "2024-01",
    importValue: 0,
    exportValue: 87500000,
    yoyGrowth: 12.3,
    competitionLevel: "medium",
  },
  {
    product: "Bananas",
    product_code: "0803900000",
    country: "Ecuador",
    period: "2024-01",
    importValue: 0,
    exportValue: 156000000,
    yoyGrowth: 5.2,
    competitionLevel: "high",
  },
];

export const mockTFADProcesses: TFADProcess[] = [
  {
    process_id: "tfad-001",
    process_name: "Agricultural Export Documentation",
    country: "Colombia",
    required_documents: [
      "Export permit",
      "Phytosanitary certificate",
      "Bill of lading",
      "Commercial invoice",
    ],
    processing_time_days: 5,
    fees: 150,
    last_update: new Date("2024-01-10"),
  },
  {
    process_id: "tfad-002",
    process_name: "Customs Export Clearance",
    country: "Brazil",
    required_documents: [
      "Shipping documents",
      "Packing list",
      "Certificate of origin",
      "Insurance certificate",
    ],
    processing_time_days: 3,
    fees: 100,
    last_update: new Date("2024-01-12"),
  },
];

export const mockHSVersions: HSVersion[] = [
  {
    code: "H1",
    version: "HS-92",
    label: "HS 1992",
  },
  {
    code: "H2",
    version: "HS-96",
    label: "HS 1996",
  },
  {
    code: "H3",
    version: "HS-02",
    label: "HS 2002",
  },
  {
    code: "H4",
    version: "HS-07",
    label: "HS 2007",
  },
  {
    code: "H5",
    version: "HS-12",
    label: "HS 2012",
  },
  {
    code: "H6",
    version: "HS-17",
    label: "HS 2017",
  },
  {
    code: "H7",
    version: "HS-22",
    label: "HS 2022",
  },
];

export function getMockAlerts(product?: string): EpingAlert[] {
  if (product) {
    return mockAlerts.filter((a) => a.product.toLowerCase() === product.toLowerCase());
  }
  return mockAlerts;
}

export function getMockQuotas(product?: string): QRQuota[] {
  if (product) {
    return mockQuotas.filter((q) => q.product.toLowerCase() === product.toLowerCase());
  }
  return mockQuotas;
}

export function getMockMarketTrends(product?: string): MarketTrend[] {
  if (product) {
    return mockMarketTrends.filter((t) => t.product.toLowerCase() === product.toLowerCase());
  }
  return mockMarketTrends;
}

export function getMockTFADProcesses(country?: string): TFADProcess[] {
  if (country) {
    return mockTFADProcesses.filter((p) => p.country.toLowerCase() === country.toLowerCase());
  }
  return mockTFADProcesses;
}

export function getMockHSVersions(): HSVersion[] {
  return mockHSVersions;
}

export const mockTimeseriesDataPoints: TimeseriesDataPoint[] = [
  // Argentina — Agrícola
  { indicator: "ITS_MTV_AM", reporter: "Argentina", reporter_code: "032", product: "Productos agrícolas", product_code: "AG", period: "2018", value: 1230000, unit: "USD_1000", frequency: "A" },
  { indicator: "ITS_MTV_AM", reporter: "Argentina", reporter_code: "032", product: "Productos agrícolas", product_code: "AG", period: "2019", value: 1180000, unit: "USD_1000", frequency: "A" },
  { indicator: "ITS_MTV_AM", reporter: "Argentina", reporter_code: "032", product: "Productos agrícolas", product_code: "AG", period: "2020", value: 1050000, unit: "USD_1000", frequency: "A" },
  { indicator: "ITS_MTV_AM", reporter: "Argentina", reporter_code: "032", product: "Productos agrícolas", product_code: "AG", period: "2021", value: 1380000, unit: "USD_1000", frequency: "A" },
  { indicator: "ITS_MTV_AM", reporter: "Argentina", reporter_code: "032", product: "Productos agrícolas", product_code: "AG", period: "2022", value: 1560000, unit: "USD_1000", frequency: "A" },
  { indicator: "ITS_MTV_AM", reporter: "Argentina", reporter_code: "032", product: "Productos agrícolas", product_code: "AG", period: "2023", value: 1490000, unit: "USD_1000", frequency: "A" },
  // Brasil — Agrícola
  { indicator: "ITS_MTV_AM", reporter: "Brasil", reporter_code: "076", product: "Productos agrícolas", product_code: "AG", period: "2018", value: 8900000, unit: "USD_1000", frequency: "A" },
  { indicator: "ITS_MTV_AM", reporter: "Brasil", reporter_code: "076", product: "Productos agrícolas", product_code: "AG", period: "2019", value: 9200000, unit: "USD_1000", frequency: "A" },
  { indicator: "ITS_MTV_AM", reporter: "Brasil", reporter_code: "076", product: "Productos agrícolas", product_code: "AG", period: "2020", value: 9100000, unit: "USD_1000", frequency: "A" },
  { indicator: "ITS_MTV_AM", reporter: "Brasil", reporter_code: "076", product: "Productos agrícolas", product_code: "AG", period: "2021", value: 11400000, unit: "USD_1000", frequency: "A" },
  { indicator: "ITS_MTV_AM", reporter: "Brasil", reporter_code: "076", product: "Productos agrícolas", product_code: "AG", period: "2022", value: 13200000, unit: "USD_1000", frequency: "A" },
  { indicator: "ITS_MTV_AM", reporter: "Brasil", reporter_code: "076", product: "Productos agrícolas", product_code: "AG", period: "2023", value: 12800000, unit: "USD_1000", frequency: "A" },
  // México — Agrícola
  { indicator: "ITS_MTV_AM", reporter: "México", reporter_code: "484", product: "Productos agrícolas", product_code: "AG", period: "2018", value: 7500000, unit: "USD_1000", frequency: "A" },
  { indicator: "ITS_MTV_AM", reporter: "México", reporter_code: "484", product: "Productos agrícolas", product_code: "AG", period: "2019", value: 7800000, unit: "USD_1000", frequency: "A" },
  { indicator: "ITS_MTV_AM", reporter: "México", reporter_code: "484", product: "Productos agrícolas", product_code: "AG", period: "2020", value: 7600000, unit: "USD_1000", frequency: "A" },
  { indicator: "ITS_MTV_AM", reporter: "México", reporter_code: "484", product: "Productos agrícolas", product_code: "AG", period: "2021", value: 8900000, unit: "USD_1000", frequency: "A" },
  { indicator: "ITS_MTV_AM", reporter: "México", reporter_code: "484", product: "Productos agrícolas", product_code: "AG", period: "2022", value: 9400000, unit: "USD_1000", frequency: "A" },
  { indicator: "ITS_MTV_AM", reporter: "México", reporter_code: "484", product: "Productos agrícolas", product_code: "AG", period: "2023", value: 9200000, unit: "USD_1000", frequency: "A" },
];

// SITC3 hierarchy: sub-codes fall back to their parent group when no exact match
const SITC3_PARENTS: Record<string, string> = {
  AGFO: "AG", AGNO: "AG",
  MIFU: "MI", MIOR: "MI",
  MAIS: "MA", MACH: "MA", MACHPH: "MA", MAMT: "MA",
};

export function getMockTimeseriesDataPoints(params: {
  indicator: string;
  reporters?: string;
  products?: string;
}): TimeseriesDataPoint[] {
  let filtered = mockTimeseriesDataPoints.filter(
    (d) => !params.indicator || d.indicator === params.indicator || params.indicator === "ITS_MTV_AM"
  );
  if (params.reporters) {
    const codes = params.reporters.split(",").map((c) => c.trim());
    filtered = filtered.filter((d) => codes.includes(d.reporter_code));
  }
  if (params.products) {
    const codes = params.products.split(",").map((c) => c.trim());
    const exact = filtered.filter((d) => codes.includes(d.product_code));
    if (exact.length > 0) return exact;
    // Fall back to parent SITC3 group
    const parents = [...new Set(codes.map((c) => SITC3_PARENTS[c] ?? "AG"))];
    return filtered.filter((d) => parents.includes(d.product_code));
  }
  return filtered;
}

export function getMockMarketProfile(reporter: string, product: string): MarketProfile {
  const data = getMockTimeseriesDataPoints({ indicator: "ITS_MTV_AM", reporters: reporter, products: product });
  return {
    reporter: data[0]?.reporter ?? reporter,
    reporter_code: reporter,
    product: data[0]?.product ?? product,
    product_code: product,
    market_size: data[data.length - 1]?.value ?? 0,
    cagr: 3.8,
    volatility: 12.5,
    trend: "rising",
    top_suppliers: [
      { country: "Estados Unidos", country_code: "840", share: 28.5 },
      { country: "China", country_code: "156", share: 22.1 },
      { country: "Brasil", country_code: "076", share: 15.3 },
    ],
    periods: [...new Set(data.map((d) => d.period))].sort(),
    data: [],
  };
}

// Product-specific realistic import values in raw USD
const MOCK_POTENTIAL_MARKETS_BY_CATEGORY: Record<string, PotentialMarket[]> = {
  // Agricultural food (coffee, cocoa, tea, spices, etc.)
  AGFO: [
    { reporter: "Estados Unidos", reporter_code: "840", import_value: 6_200_000_000, growth_rate: 3.5,  trend: "rising",    cagr: 2.8  },
    { reporter: "Alemania",       reporter_code: "276", import_value: 4_100_000_000, growth_rate: 2.1,  trend: "stable",    cagr: 1.9  },
    { reporter: "Países Bajos",   reporter_code: "528", import_value: 3_800_000_000, growth_rate: 2.8,  trend: "rising",    cagr: 2.5  },
    { reporter: "Bélgica",        reporter_code: "056", import_value: 2_900_000_000, growth_rate: 1.5,  trend: "stable",    cagr: 1.2  },
    { reporter: "Japón",          reporter_code: "392", import_value: 2_700_000_000, growth_rate: 1.2,  trend: "stable",    cagr: 0.8  },
    { reporter: "Francia",        reporter_code: "250", import_value: 2_400_000_000, growth_rate: 1.8,  trend: "stable",    cagr: 1.5  },
    { reporter: "Italia",         reporter_code: "380", import_value: 2_100_000_000, growth_rate: 2.4,  trend: "rising",    cagr: 2.1  },
    { reporter: "España",         reporter_code: "724", import_value: 1_800_000_000, growth_rate: 3.1,  trend: "rising",    cagr: 2.7  },
    { reporter: "Corea del Sur",  reporter_code: "410", import_value: 1_400_000_000, growth_rate: 5.2,  trend: "rising",    cagr: 4.5  },
    { reporter: "Canadá",         reporter_code: "124", import_value: 1_200_000_000, growth_rate: 2.9,  trend: "rising",    cagr: 2.5  },
  ],
  // Broader agricultural (same as AGFO for fallback)
  AG: [
    { reporter: "Estados Unidos", reporter_code: "840", import_value: 6_200_000_000, growth_rate: 3.5,  trend: "rising",    cagr: 2.8  },
    { reporter: "Alemania",       reporter_code: "276", import_value: 4_100_000_000, growth_rate: 2.1,  trend: "stable",    cagr: 1.9  },
    { reporter: "Países Bajos",   reporter_code: "528", import_value: 3_800_000_000, growth_rate: 2.8,  trend: "rising",    cagr: 2.5  },
    { reporter: "China",          reporter_code: "156", import_value: 3_500_000_000, growth_rate: 7.2,  trend: "rising",    cagr: 6.5  },
    { reporter: "Japón",          reporter_code: "392", import_value: 2_700_000_000, growth_rate: 1.2,  trend: "stable",    cagr: 0.8  },
    { reporter: "Francia",        reporter_code: "250", import_value: 2_400_000_000, growth_rate: 1.8,  trend: "stable",    cagr: 1.5  },
    { reporter: "Italia",         reporter_code: "380", import_value: 2_100_000_000, growth_rate: 2.4,  trend: "rising",    cagr: 2.1  },
    { reporter: "España",         reporter_code: "724", import_value: 1_800_000_000, growth_rate: 3.1,  trend: "rising",    cagr: 2.7  },
    { reporter: "Corea del Sur",  reporter_code: "410", import_value: 1_400_000_000, growth_rate: 5.2,  trend: "rising",    cagr: 4.5  },
    { reporter: "Canadá",         reporter_code: "124", import_value: 1_200_000_000, growth_rate: 2.9,  trend: "rising",    cagr: 2.5  },
  ],
  // Mining fuels
  MIFU: [
    { reporter: "China",        reporter_code: "156", import_value: 250_000_000_000, growth_rate:  5.2, trend: "rising",    cagr: 4.8  },
    { reporter: "Japón",        reporter_code: "392", import_value: 180_000_000_000, growth_rate: -1.2, trend: "declining", cagr: -0.8 },
    { reporter: "Corea del Sur",reporter_code: "410", import_value:  95_000_000_000, growth_rate: -0.5, trend: "stable",    cagr: 0.2  },
    { reporter: "India",        reporter_code: "356", import_value:  87_000_000_000, growth_rate:  8.5, trend: "rising",    cagr: 7.2  },
    { reporter: "Alemania",     reporter_code: "276", import_value:  72_000_000_000, growth_rate: -3.1, trend: "declining", cagr: -2.5 },
  ],
  // Mining (non-fuel)
  MI: [
    { reporter: "China",        reporter_code: "156", import_value: 180_000_000_000, growth_rate: 4.5,  trend: "rising",    cagr: 4.0  },
    { reporter: "Japón",        reporter_code: "392", import_value:  55_000_000_000, growth_rate: 0.8,  trend: "stable",    cagr: 0.5  },
    { reporter: "Alemania",     reporter_code: "276", import_value:  42_000_000_000, growth_rate: 1.2,  trend: "stable",    cagr: 0.9  },
    { reporter: "Corea del Sur",reporter_code: "410", import_value:  35_000_000_000, growth_rate: 2.1,  trend: "rising",    cagr: 1.8  },
    { reporter: "India",        reporter_code: "356", import_value:  28_000_000_000, growth_rate: 9.5,  trend: "rising",    cagr: 8.2  },
  ],
  // Other manufactures (textiles, clothing, footwear)
  MAIS: [
    { reporter: "Estados Unidos", reporter_code: "840", import_value: 45_000_000_000, growth_rate: 2.1,  trend: "rising",    cagr: 1.8  },
    { reporter: "Alemania",       reporter_code: "276", import_value: 28_000_000_000, growth_rate: 1.5,  trend: "stable",    cagr: 1.2  },
    { reporter: "Japón",          reporter_code: "392", import_value: 18_000_000_000, growth_rate: 0.8,  trend: "stable",    cagr: 0.5  },
    { reporter: "Reino Unido",    reporter_code: "826", import_value: 15_000_000_000, growth_rate: 1.1,  trend: "stable",    cagr: 0.8  },
    { reporter: "Francia",        reporter_code: "250", import_value: 14_000_000_000, growth_rate: 2.3,  trend: "rising",    cagr: 2.0  },
    { reporter: "España",         reporter_code: "724", import_value:  9_500_000_000, growth_rate: 3.4,  trend: "rising",    cagr: 3.1  },
    { reporter: "Canadá",         reporter_code: "124", import_value:  8_200_000_000, growth_rate: 3.2,  trend: "rising",    cagr: 2.9  },
    { reporter: "Corea del Sur",  reporter_code: "410", import_value:  7_800_000_000, growth_rate: 1.9,  trend: "rising",    cagr: 1.7  },
  ],
  // Manufactures — metals
  MAMT: [
    { reporter: "Estados Unidos", reporter_code: "840", import_value: 55_000_000_000, growth_rate: 2.5,  trend: "rising",    cagr: 2.2  },
    { reporter: "Alemania",       reporter_code: "276", import_value: 38_000_000_000, growth_rate: 1.8,  trend: "stable",    cagr: 1.5  },
    { reporter: "China",          reporter_code: "156", import_value: 32_000_000_000, growth_rate: 5.5,  trend: "rising",    cagr: 5.0  },
    { reporter: "Japón",          reporter_code: "392", import_value: 25_000_000_000, growth_rate: 0.5,  trend: "stable",    cagr: 0.2  },
    { reporter: "Corea del Sur",  reporter_code: "410", import_value: 18_000_000_000, growth_rate: 2.8,  trend: "rising",    cagr: 2.5  },
  ],
  // Manufactures — chemicals/pharma
  MACH: [
    { reporter: "Estados Unidos", reporter_code: "840", import_value: 85_000_000_000, growth_rate: 4.2,  trend: "rising",    cagr: 3.8  },
    { reporter: "Alemania",       reporter_code: "276", import_value: 58_000_000_000, growth_rate: 3.1,  trend: "rising",    cagr: 2.8  },
    { reporter: "China",          reporter_code: "156", import_value: 55_000_000_000, growth_rate: 8.5,  trend: "rising",    cagr: 7.5  },
    { reporter: "Japón",          reporter_code: "392", import_value: 38_000_000_000, growth_rate: 1.5,  trend: "stable",    cagr: 1.2  },
    { reporter: "Francia",        reporter_code: "250", import_value: 32_000_000_000, growth_rate: 2.9,  trend: "rising",    cagr: 2.5  },
  ],
  // Machinery
  MACHPH: [
    { reporter: "Estados Unidos", reporter_code: "840", import_value: 120_000_000_000, growth_rate: 3.8, trend: "rising",    cagr: 3.5  },
    { reporter: "China",          reporter_code: "156", import_value: 115_000_000_000, growth_rate: 7.2, trend: "rising",    cagr: 6.5  },
    { reporter: "Alemania",       reporter_code: "276", import_value:  75_000_000_000, growth_rate: 2.5, trend: "rising",    cagr: 2.2  },
    { reporter: "Japón",          reporter_code: "392", import_value:  55_000_000_000, growth_rate: 0.8, trend: "stable",    cagr: 0.5  },
    { reporter: "Corea del Sur",  reporter_code: "410", import_value:  42_000_000_000, growth_rate: 3.5, trend: "rising",    cagr: 3.2  },
  ],
  // General manufactures
  MA: [
    { reporter: "Estados Unidos", reporter_code: "840", import_value: 95_000_000_000, growth_rate: 3.2,  trend: "rising",    cagr: 2.8  },
    { reporter: "Alemania",       reporter_code: "276", import_value: 62_000_000_000, growth_rate: 2.1,  trend: "rising",    cagr: 1.8  },
    { reporter: "China",          reporter_code: "156", import_value: 58_000_000_000, growth_rate: 6.8,  trend: "rising",    cagr: 6.0  },
    { reporter: "Japón",          reporter_code: "392", import_value: 45_000_000_000, growth_rate: 1.2,  trend: "stable",    cagr: 0.9  },
    { reporter: "Francia",        reporter_code: "250", import_value: 38_000_000_000, growth_rate: 2.5,  trend: "rising",    cagr: 2.2  },
    { reporter: "Corea del Sur",  reporter_code: "410", import_value: 28_000_000_000, growth_rate: 3.8,  trend: "rising",    cagr: 3.5  },
    { reporter: "Canadá",         reporter_code: "124", import_value: 25_000_000_000, growth_rate: 2.8,  trend: "rising",    cagr: 2.5  },
    { reporter: "España",         reporter_code: "724", import_value: 18_000_000_000, growth_rate: 3.5,  trend: "rising",    cagr: 3.2  },
  ],
};

// HS-chapter specific data (raw USD) — reflects real global import flows per product
const MOCK_MARKETS_BY_HS_CHAPTER: Record<string, PotentialMarket[]> = {
  // Coffee, tea, spices
  "09": [
    { reporter: "Estados Unidos", reporter_code: "840", import_value: 6_200_000_000, growth_rate: 3.5, trend: "rising",    cagr: 2.8 },
    { reporter: "Alemania",       reporter_code: "276", import_value: 4_100_000_000, growth_rate: 2.1, trend: "stable",    cagr: 1.9 },
    { reporter: "Países Bajos",   reporter_code: "528", import_value: 3_800_000_000, growth_rate: 2.8, trend: "rising",    cagr: 2.5 },
    { reporter: "Bélgica",        reporter_code: "056", import_value: 2_900_000_000, growth_rate: 1.5, trend: "stable",    cagr: 1.2 },
    { reporter: "Japón",          reporter_code: "392", import_value: 2_700_000_000, growth_rate: 1.2, trend: "stable",    cagr: 0.8 },
    { reporter: "Francia",        reporter_code: "250", import_value: 2_400_000_000, growth_rate: 1.8, trend: "stable",    cagr: 1.5 },
    { reporter: "Italia",         reporter_code: "380", import_value: 2_100_000_000, growth_rate: 2.4, trend: "rising",    cagr: 2.1 },
    { reporter: "España",         reporter_code: "724", import_value: 1_800_000_000, growth_rate: 3.1, trend: "rising",    cagr: 2.7 },
    { reporter: "Corea del Sur",  reporter_code: "410", import_value: 1_400_000_000, growth_rate: 5.2, trend: "rising",    cagr: 4.5 },
    { reporter: "Canadá",         reporter_code: "124", import_value: 1_200_000_000, growth_rate: 2.9, trend: "rising",    cagr: 2.5 },
  ],
  // Cocoa and chocolate products
  "18": [
    { reporter: "Países Bajos",   reporter_code: "528", import_value: 3_800_000_000, growth_rate: 5.2, trend: "rising",    cagr: 4.8 },
    { reporter: "Estados Unidos", reporter_code: "840", import_value: 2_500_000_000, growth_rate: 3.8, trend: "rising",    cagr: 3.5 },
    { reporter: "Alemania",       reporter_code: "276", import_value: 2_100_000_000, growth_rate: 2.5, trend: "rising",    cagr: 2.2 },
    { reporter: "Malasia",        reporter_code: "458", import_value: 1_400_000_000, growth_rate: 4.1, trend: "rising",    cagr: 3.8 },
    { reporter: "Francia",        reporter_code: "250", import_value: 1_200_000_000, growth_rate: 1.9, trend: "stable",    cagr: 1.6 },
    { reporter: "Bélgica",        reporter_code: "056", import_value:   980_000_000, growth_rate: 2.1, trend: "rising",    cagr: 1.8 },
    { reporter: "Singapur",       reporter_code: "702", import_value:   870_000_000, growth_rate: 6.3, trend: "rising",    cagr: 5.8 },
    { reporter: "Indonesia",      reporter_code: "360", import_value:   750_000_000, growth_rate: 7.2, trend: "rising",    cagr: 6.5 },
  ],
  // Edible fruits and nuts (bananas, avocados, berries)
  "08": [
    { reporter: "Estados Unidos", reporter_code: "840", import_value: 4_500_000_000, growth_rate: 2.8, trend: "rising",    cagr: 2.5 },
    { reporter: "Alemania",       reporter_code: "276", import_value: 2_800_000_000, growth_rate: 1.9, trend: "stable",    cagr: 1.6 },
    { reporter: "Reino Unido",    reporter_code: "826", import_value: 2_100_000_000, growth_rate: 1.5, trend: "stable",    cagr: 1.2 },
    { reporter: "Bélgica",        reporter_code: "056", import_value: 1_900_000_000, growth_rate: 2.2, trend: "rising",    cagr: 1.9 },
    { reporter: "Japón",          reporter_code: "392", import_value: 1_700_000_000, growth_rate: 0.8, trend: "stable",    cagr: 0.5 },
    { reporter: "Países Bajos",   reporter_code: "528", import_value: 1_600_000_000, growth_rate: 2.5, trend: "rising",    cagr: 2.2 },
    { reporter: "Francia",        reporter_code: "250", import_value: 1_400_000_000, growth_rate: 1.8, trend: "stable",    cagr: 1.5 },
    { reporter: "Canadá",         reporter_code: "124", import_value: 1_100_000_000, growth_rate: 2.9, trend: "rising",    cagr: 2.6 },
  ],
  // Meat and edible offal
  "02": [
    { reporter: "China",          reporter_code: "156", import_value: 18_000_000_000, growth_rate: 12.5, trend: "rising",    cagr: 11.2 },
    { reporter: "Estados Unidos", reporter_code: "840", import_value: 12_000_000_000, growth_rate:  2.1, trend: "stable",    cagr:  1.8 },
    { reporter: "Japón",          reporter_code: "392", import_value:  7_500_000_000, growth_rate:  0.8, trend: "stable",    cagr:  0.5 },
    { reporter: "Hong Kong",      reporter_code: "344", import_value:  3_800_000_000, growth_rate:  4.8, trend: "rising",    cagr:  4.2 },
    { reporter: "Corea del Sur",  reporter_code: "410", import_value:  4_200_000_000, growth_rate:  3.5, trend: "rising",    cagr:  3.2 },
    { reporter: "Arabia Saudita", reporter_code: "682", import_value:  2_400_000_000, growth_rate:  5.2, trend: "rising",    cagr:  4.8 },
    { reporter: "Alemania",       reporter_code: "276", import_value:  3_800_000_000, growth_rate:  1.5, trend: "stable",    cagr:  1.2 },
    { reporter: "Países Bajos",   reporter_code: "528", import_value:  2_900_000_000, growth_rate:  2.1, trend: "rising",    cagr:  1.8 },
  ],
  // Sugar and confectionery
  "17": [
    { reporter: "China",          reporter_code: "156", import_value: 3_200_000_000, growth_rate:  8.5, trend: "rising",    cagr:  7.8 },
    { reporter: "Indonesia",      reporter_code: "360", import_value: 1_800_000_000, growth_rate:  5.2, trend: "rising",    cagr:  4.8 },
    { reporter: "Bangladesh",     reporter_code: "050", import_value: 1_200_000_000, growth_rate:  6.8, trend: "rising",    cagr:  6.2 },
    { reporter: "Estados Unidos", reporter_code: "840", import_value: 1_100_000_000, growth_rate:  2.1, trend: "stable",    cagr:  1.8 },
    { reporter: "Malasia",        reporter_code: "458", import_value:   980_000_000, growth_rate:  3.5, trend: "rising",    cagr:  3.2 },
    { reporter: "Corea del Sur",  reporter_code: "410", import_value:   850_000_000, growth_rate:  2.8, trend: "rising",    cagr:  2.5 },
    { reporter: "Japón",          reporter_code: "392", import_value:   780_000_000, growth_rate:  1.2, trend: "stable",    cagr:  0.9 },
    { reporter: "Nigeria",        reporter_code: "566", import_value:   650_000_000, growth_rate:  9.5, trend: "rising",    cagr:  8.8 },
  ],
  // Fish and seafood
  "03": [
    { reporter: "Estados Unidos", reporter_code: "840", import_value: 8_500_000_000, growth_rate: 3.2, trend: "rising",    cagr: 2.9 },
    { reporter: "Japón",          reporter_code: "392", import_value: 7_200_000_000, growth_rate: 0.5, trend: "stable",    cagr: 0.2 },
    { reporter: "China",          reporter_code: "156", import_value: 5_800_000_000, growth_rate: 9.5, trend: "rising",    cagr: 8.5 },
    { reporter: "España",         reporter_code: "724", import_value: 4_200_000_000, growth_rate: 2.8, trend: "rising",    cagr: 2.5 },
    { reporter: "Francia",        reporter_code: "250", import_value: 3_900_000_000, growth_rate: 2.1, trend: "rising",    cagr: 1.8 },
    { reporter: "Italia",         reporter_code: "380", import_value: 3_500_000_000, growth_rate: 2.5, trend: "rising",    cagr: 2.2 },
    { reporter: "Alemania",       reporter_code: "276", import_value: 2_800_000_000, growth_rate: 1.8, trend: "stable",    cagr: 1.5 },
    { reporter: "Corea del Sur",  reporter_code: "410", import_value: 2_500_000_000, growth_rate: 3.8, trend: "rising",    cagr: 3.5 },
  ],
  // Clothing (knitted / woven / accessories — HS 61, 62, 63)
  "61": [
    { reporter: "Estados Unidos", reporter_code: "840", import_value: 45_000_000_000, growth_rate: 2.1, trend: "rising",    cagr: 1.8 },
    { reporter: "Alemania",       reporter_code: "276", import_value: 28_000_000_000, growth_rate: 1.5, trend: "stable",    cagr: 1.2 },
    { reporter: "Japón",          reporter_code: "392", import_value: 18_000_000_000, growth_rate: 0.8, trend: "stable",    cagr: 0.5 },
    { reporter: "Reino Unido",    reporter_code: "826", import_value: 15_000_000_000, growth_rate: 1.1, trend: "stable",    cagr: 0.8 },
    { reporter: "Francia",        reporter_code: "250", import_value: 14_000_000_000, growth_rate: 2.3, trend: "rising",    cagr: 2.0 },
    { reporter: "España",         reporter_code: "724", import_value:  9_500_000_000, growth_rate: 3.4, trend: "rising",    cagr: 3.1 },
    { reporter: "Canadá",         reporter_code: "124", import_value:  8_200_000_000, growth_rate: 3.2, trend: "rising",    cagr: 2.9 },
    { reporter: "Corea del Sur",  reporter_code: "410", import_value:  7_800_000_000, growth_rate: 1.9, trend: "rising",    cagr: 1.7 },
  ],
  // Flowers and live plants
  "06": [
    { reporter: "Alemania",       reporter_code: "276", import_value: 1_400_000_000, growth_rate: 2.1, trend: "rising",    cagr: 1.8 },
    { reporter: "Estados Unidos", reporter_code: "840", import_value: 1_200_000_000, growth_rate: 3.5, trend: "rising",    cagr: 3.2 },
    { reporter: "Reino Unido",    reporter_code: "826", import_value:   950_000_000, growth_rate: 1.8, trend: "stable",    cagr: 1.5 },
    { reporter: "Francia",        reporter_code: "250", import_value:   820_000_000, growth_rate: 2.2, trend: "rising",    cagr: 1.9 },
    { reporter: "Países Bajos",   reporter_code: "528", import_value:   780_000_000, growth_rate: 1.5, trend: "stable",    cagr: 1.2 },
    { reporter: "Suiza",          reporter_code: "756", import_value:   520_000_000, growth_rate: 2.8, trend: "rising",    cagr: 2.5 },
    { reporter: "Austria",        reporter_code: "040", import_value:   480_000_000, growth_rate: 1.9, trend: "rising",    cagr: 1.6 },
    { reporter: "Japón",          reporter_code: "392", import_value:   420_000_000, growth_rate: 0.5, trend: "stable",    cagr: 0.2 },
  ],
};
// Alias textile chapters
(MOCK_MARKETS_BY_HS_CHAPTER as Record<string, PotentialMarket[]>)["62"] = MOCK_MARKETS_BY_HS_CHAPTER["61"];
(MOCK_MARKETS_BY_HS_CHAPTER as Record<string, PotentialMarket[]>)["63"] = MOCK_MARKETS_BY_HS_CHAPTER["61"];

export function getMockPotentialMarkets(product: string, limit: number = 10): PotentialMarket[] {
  // If product looks like an HS code, extract the first 2-digit chapter
  const digits = product.replace(/\D/g, "");
  const chapter = digits.slice(0, 2);
  if (chapter && MOCK_MARKETS_BY_HS_CHAPTER[chapter]) {
    return MOCK_MARKETS_BY_HS_CHAPTER[chapter].slice(0, limit);
  }
  // Fall back to SITC3 category lookup
  const markets =
    MOCK_POTENTIAL_MARKETS_BY_CATEGORY[product] ??
    MOCK_POTENTIAL_MARKETS_BY_CATEGORY[SITC3_PARENTS[product] ?? ""] ??
    MOCK_POTENTIAL_MARKETS_BY_CATEGORY.AG;
  return markets.slice(0, limit);
}

export function getMockDemandTrends(params: {
  reporters?: string;
  products?: string;
}): DemandTrend[] {
  const dataPoints = getMockTimeseriesDataPoints({ indicator: "ITS_MTV_AM", ...params });
  const groups = new Map<string, TimeseriesDataPoint[]>();
  dataPoints.forEach((d) => {
    const key = `${d.reporter_code}-${d.product_code}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(d);
  });

  const result: DemandTrend[] = [];
  groups.forEach((points) => {
    const sorted = [...points].sort((a, b) => a.period.localeCompare(b.period));
    sorted.forEach((dp, i) => {
      const prev = sorted[i - 1];
      const yoy_growth =
        prev && prev.value > 0 ? ((dp.value - prev.value) / prev.value) * 100 : undefined;
      result.push({
        reporter: dp.reporter,
        reporter_code: dp.reporter_code,
        product: dp.product,
        product_code: dp.product_code,
        period: dp.period,
        import_value: dp.value,
        yoy_growth,
      });
    });
  });
  return result;
}

export const mockQRRegulations: QRRegulation[] = [
  {
    id: 1,
    reporter_member: { code: "C032", name: { es: "Argentina", en: "Argentina" } },
    general_description: "Restricción de importación de productos agrícolas frescos",
    in_force_from: "2023-01-01",
    termination_dt: null,
    measures: [{ description: "Prohibición de importación" }],
    notified_in: [{ symbol: "G/MA/QR/N/ARG/1" }],
    details: "/qrs/qrs/1",
  },
  {
    id: 2,
    reporter_member: { code: "C076", name: { es: "Brasil", en: "Brazil" } },
    general_description: "Cuota de importación de azúcar refinada",
    in_force_from: "2022-06-15",
    termination_dt: "2024-12-31",
    measures: [{ description: "Cuota de importación" }],
    notified_in: [{ symbol: "G/MA/QR/N/BRA/3" }],
    details: "/qrs/qrs/2",
  },
  {
    id: 3,
    reporter_member: { code: "C484", name: { es: "México", en: "Mexico" } },
    general_description: "Restricción temporal a importaciones de maíz transgénico",
    in_force_from: "2023-03-15",
    termination_dt: null,
    measures: [{ description: "Restricción de importación temporal" }],
    notified_in: [{ symbol: "G/MA/QR/N/MEX/7" }],
    details: "/qrs/qrs/3",
  },
];

export const mockQRProducts: QRProduct[] = [
  { code: "0201", description: "Carne de bovino, fresca o refrigerada", hs_version: "h6" },
  { code: "0802", description: "Nueces y frutos de cáscara", hs_version: "h6" },
  { code: "1001", description: "Trigo y morcajo", hs_version: "h6" },
  { code: "1701", description: "Azúcar de caña o de remolacha", hs_version: "h6" },
];

export function getMockQRRegulations(params: {
  in_force_only?: boolean;
  product_codes?: string;
  reporter_member_code?: string;
  page?: number;
}): { data: QRRegulation[]; meta: QRListMeta } {
  let filtered = [...mockQRRegulations];

  if (params.in_force_only) {
    filtered = filtered.filter((r) => r.termination_dt === null);
  }
  if (params.reporter_member_code) {
    filtered = filtered.filter((r) => r.reporter_member.code === params.reporter_member_code);
  }

  return {
    data: filtered,
    meta: { total: filtered.length, page: params.page || 1, last_page: 1 },
  };
}

export function getMockQRRegulationById(id: number): QRRegulation | null {
  return mockQRRegulations.find((r) => r.id === id) ?? null;
}

export function getMockQRProducts(description?: string, hs_version?: string): QRProduct[] {
  let filtered = [...mockQRProducts];
  if (description) {
    const term = description.toLowerCase();
    filtered = filtered.filter(
      (p) => p.description.toLowerCase().includes(term) || p.code.startsWith(term)
    );
  }
  if (hs_version) {
    filtered = filtered.filter((p) => p.hs_version === hs_version);
  }
  return filtered;
}
