/**
 * Swagger/OpenAPI documentation configuration
 */

const swaggerDocs = {
  openapi: "3.0.0",
  info: {
    title: "Exporta Fácil API",
    version: "1.0.0",
    description: "Backend for Exporta Fácil - WTO export/import platform",
    contact: {
      name: "Development Team",
    },
  },
  servers: [
    {
      url: "http://localhost:3000",
      description: "Development server",
    },
    {
      url: "https://api.exportafacil.com",
      description: "Production server",
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "JWT authentication token",
      },
      ApiKeyAuth: {
        type: "apiKey",
        in: "header",
        name: "X-API-Key",
        description: "API key for service-to-service calls",
      },
    },
    schemas: {
      ApiResponse: {
        type: "object",
        required: ["success", "timestamp"],
        properties: {
          success: { type: "boolean", example: true },
          data: { type: "object" },
          error: { type: "string" },
          message: { type: "string" },
          timestamp: { type: "string", format: "date-time" },
        },
      },
      EpingAlert: {
        type: "object",
        required: ["id", "product", "country", "description", "severity"],
        properties: {
          id: { type: "string", example: "alert-001" },
          product: { type: "string", example: "Coffee" },
          country: { type: "string", example: "Colombia" },
          description: { type: "string", example: "New SPS certification required" },
          reference: { type: "string", example: "SPS/2024/0125" },
          startDate: { type: "string", format: "date-time" },
          endDate: { type: "string", format: "date-time" },
          severity: { type: "string", enum: ["low", "medium", "high", "critical"] },
          apiSource: { type: "string", enum: ["ePing", "QR"] },
        },
      },
      MarketTrend: {
        type: "object",
        required: ["product", "product_code", "country", "period"],
        properties: {
          product: { type: "string" },
          product_code: { type: "string", example: "TO" },
          country: { type: "string" },
          period: { type: "string", example: "2024" },
          importValue: { type: "number" },
          exportValue: { type: "number" },
          yoyGrowth: { type: "number" },
          competitionLevel: { type: "string", enum: ["low", "medium", "high"] },
        },
      },
      QRRegulation: {
        type: "object",
        properties: {
          id: { type: "integer", example: 1 },
          reporter_member: {
            type: "object",
            properties: {
              code: { type: "string", example: "C032" },
              name: {
                type: "object",
                properties: {
                  es: { type: "string", example: "Argentina" },
                  en: { type: "string", example: "Argentina" },
                },
              },
            },
          },
          general_description: {
            type: "string",
            example: "Restricción de importación de productos agrícolas frescos",
          },
          in_force_from: { type: "string", format: "date", example: "2023-01-01" },
          termination_dt: { type: "string", format: "date", nullable: true, example: null },
          measures: {
            type: "array",
            items: {
              type: "object",
              properties: {
                description: { type: "string", example: "Prohibición de importación" },
              },
            },
          },
          affected_products: {
            type: "array",
            items: {
              type: "object",
              properties: {
                code: { type: "string", example: "0201" },
                description: { type: "string", example: "Carne de bovino" },
              },
            },
          },
          notified_in: {
            type: "array",
            items: {
              type: "object",
              properties: {
                symbol: { type: "string", example: "G/MA/QR/N/ARG/1" },
              },
            },
          },
          details: { type: "string", example: "/qrs/qrs/1" },
          national_legal_bases: { type: "array", items: { type: "object" } },
          administrative_mechanisms: { type: "array", items: { type: "object" } },
        },
      },
      QRProduct: {
        type: "object",
        properties: {
          code: { type: "string", example: "0802" },
          description: { type: "string", example: "Nueces y frutos de cáscara" },
          hs_version: { type: "string", example: "h6" },
        },
      },
      DemandTrend: {
        type: "object",
        properties: {
          reporter:      { type: "string", example: "Brasil" },
          reporter_code: { type: "string", example: "076" },
          product:       { type: "string", example: "Productos agrícolas" },
          product_code:  { type: "string", example: "AG" },
          period:        { type: "string", example: "2023" },
          import_value:  { type: "number", example: 12800000 },
          yoy_growth:    { type: "number", example: -3.03, nullable: true, description: "Crecimiento interanual en %" },
        },
      },
      MarketProfile: {
        type: "object",
        properties: {
          reporter:      { type: "string", example: "Argentina" },
          reporter_code: { type: "string", example: "032" },
          product:       { type: "string", example: "Productos agrícolas" },
          product_code:  { type: "string", example: "AG" },
          market_size:   { type: "number", example: 1490000, description: "Valor de importación más reciente (USD miles)" },
          cagr:          { type: "number", example: 3.8,  description: "Tasa de crecimiento anual compuesta (%)" },
          volatility:    { type: "number", example: 12.5, description: "Desviación estándar del crecimiento YoY" },
          trend:         { type: "string", enum: ["rising", "stable", "declining"] },
          top_suppliers: {
            type: "array",
            items: {
              type: "object",
              properties: {
                country:      { type: "string", example: "Estados Unidos" },
                country_code: { type: "string", example: "840" },
                share:        { type: "number", example: 28.5, description: "Porcentaje del total importado" },
              },
            },
          },
          periods: { type: "array", items: { type: "string" }, example: ["2018","2019","2020","2021","2022","2023"] },
          data:    { type: "array", items: { $ref: "#/components/schemas/DemandTrend" } },
        },
      },
      PotentialMarket: {
        type: "object",
        properties: {
          reporter:      { type: "string", example: "India" },
          reporter_code: { type: "string", example: "356" },
          import_value:  { type: "number", example: 42000000 },
          growth_rate:   { type: "number", example: 12.4, description: "Promedio de los últimos 2 años YoY (%)" },
          trend:         { type: "string", enum: ["rising", "stable", "declining"] },
          cagr:          { type: "number", example: 10.2 },
        },
      },
      QRListMeta: {
        type: "object",
        properties: {
          total: { type: "integer", example: 150 },
          page: { type: "integer", example: 1 },
          last_page: { type: "integer", example: 15 },
        },
      },
      WTOMember: {
        type: "object",
        properties: {
          value: { type: "string", example: "C032" },
          text: { type: "string", example: "Argentina" },
        },
      },
    },
  },
  paths: {
    "/health": {
      get: {
        tags: ["System"],
        summary: "Health check",
        responses: {
          "200": {
            description: "Server is healthy",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string" },
                    version: { type: "string" },
                    environment: { type: "string" },
                    timestamp: { type: "string", format: "date-time" },
                  },
                },
              },
            },
          },
        },
      },
    },

    // ── ALERTS ──────────────────────────────────────────────────────────────

    "/api/alerts": {
      get: {
        tags: ["Alerts"],
        summary: "Alertas SPS/TBT por producto o todas",
        description: "Sin `product` devuelve todas las alertas. Con `product` filtra por nombre o código HS.",
        parameters: [
          {
            name: "product",
            in: "query",
            schema: { type: "string" },
            description: "Nombre del producto (ej: Coffee) o código HS (ej: 0901)",
          },
        ],
        responses: {
          "200": {
            description: "Lista de alertas",
            content: {
              "application/json": {
                schema: {
                  allOf: [
                    { $ref: "#/components/schemas/ApiResponse" },
                    {
                      type: "object",
                      properties: {
                        data: {
                          type: "array",
                          items: { $ref: "#/components/schemas/EpingAlert" },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          "500": { description: "Error de servidor" },
        },
      },
    },
    "/api/alerts/critical": {
      get: {
        tags: ["Alerts"],
        summary: "Alertas críticas recientes",
        description:
          "Devuelve alertas con severidad `critical` o `high` dentro del período indicado. " +
          "El parámetro `product` acepta tanto nombre como código HS (ej: 0201) y aplica un filtro adicional sobre el resultado.",
        parameters: [
          {
            name: "product",
            in: "query",
            schema: { type: "string" },
            description: "Nombre del producto o código HS (ej: 0201, Coffee)",
          },
          {
            name: "days",
            in: "query",
            schema: { type: "integer", default: 30 },
            description: "Ventana de tiempo en días hacia atrás (default: 30)",
          },
        ],
        responses: {
          "200": {
            description: "Alertas críticas o altas dentro del período",
            content: {
              "application/json": {
                schema: {
                  allOf: [
                    { $ref: "#/components/schemas/ApiResponse" },
                    {
                      type: "object",
                      properties: {
                        data: {
                          type: "array",
                          items: { $ref: "#/components/schemas/EpingAlert" },
                        },
                      },
                    },
                  ],
                },
                example: {
                  success: true,
                  data: [
                    {
                      id: "alert-001",
                      product: "Carne de bovino",
                      country: "EU",
                      description: "Nuevo límite máximo de residuos de pesticidas",
                      reference: "G/SPS/N/EU/123",
                      startDate: "2026-04-20T00:00:00.000Z",
                      severity: "critical",
                      apiSource: "ePing",
                    },
                  ],
                  timestamp: "2026-05-01T10:00:00.000Z",
                },
              },
            },
          },
          "500": { description: "Error de servidor" },
        },
      },
    },
    "/api/events": {
      get: {
        tags: ["Alerts"],
        summary: "Alertas y cuotas combinadas para un producto",
        description: "Ejecuta en paralelo `getAlertsByProduct` y `getQuotasByProduct` y los devuelve juntos.",
        parameters: [
          {
            name: "product",
            in: "query",
            required: true,
            schema: { type: "string" },
            description: "Nombre del producto o código HS",
          },
        ],
        responses: {
          "200": {
            description: "Alertas y cuotas del producto",
            content: {
              "application/json": {
                schema: {
                  allOf: [
                    { $ref: "#/components/schemas/ApiResponse" },
                    {
                      type: "object",
                      properties: {
                        data: {
                          type: "object",
                          properties: {
                            alerts: {
                              type: "array",
                              items: { $ref: "#/components/schemas/EpingAlert" },
                            },
                            quotas: {
                              type: "array",
                              items: { type: "object" },
                            },
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          "400": { description: "Parámetro `product` requerido" },
          "500": { description: "Error de servidor" },
        },
      },
    },

    // ── QUOTAS ──────────────────────────────────────────────────────────────

    "/api/quotas/members": {
      get: {
        tags: ["Quotas"],
        summary: "Lista de miembros WTO",
        description:
          "Devuelve el catálogo estático de miembros WTO con sus códigos. " +
          "Usar `value` como `reporter_member_code` en `/api/quotas`.",
        responses: {
          "200": {
            description: "Lista de miembros",
            content: {
              "application/json": {
                schema: {
                  allOf: [
                    { $ref: "#/components/schemas/ApiResponse" },
                    {
                      type: "object",
                      properties: {
                        data: {
                          type: "array",
                          items: { $ref: "#/components/schemas/WTOMember" },
                        },
                      },
                    },
                  ],
                },
                example: {
                  success: true,
                  data: [
                    { value: "C032", text: "Argentina" },
                    { value: "C076", text: "Brasil" },
                    { value: "C484", text: "México" },
                  ],
                  timestamp: "2026-05-01T10:00:00.000Z",
                },
              },
            },
          },
        },
      },
    },
    "/api/quotas/products": {
      get: {
        tags: ["Quotas"],
        summary: "Búsqueda de productos HS",
        description:
          "Consulta el endpoint `/qrs/products` de la WTO para obtener códigos HS. " +
          "Usar el `code` resultante como `product_codes` en `/api/quotas`.",
        parameters: [
          {
            name: "description",
            in: "query",
            schema: { type: "string" },
            description: "Texto de búsqueda (ej: azúcar, beef)",
          },
          {
            name: "hs_version",
            in: "query",
            schema: { type: "string", enum: ["h1", "h2", "h3", "h4", "h5", "h6", "h7"], default: "h6" },
            description: "Versión del Sistema Armonizado (default: h6 = HS 2017)",
          },
        ],
        responses: {
          "200": {
            description: "Productos encontrados",
            content: {
              "application/json": {
                schema: {
                  allOf: [
                    { $ref: "#/components/schemas/ApiResponse" },
                    {
                      type: "object",
                      properties: {
                        data: {
                          type: "array",
                          items: { $ref: "#/components/schemas/QRProduct" },
                        },
                      },
                    },
                  ],
                },
                example: {
                  success: true,
                  data: [
                    { code: "1701", description: "Azúcar de caña o de remolacha", hs_version: "h6" },
                  ],
                  timestamp: "2026-05-01T10:00:00.000Z",
                },
              },
            },
          },
          "500": { description: "Error de servidor" },
        },
      },
    },
    "/api/quotas": {
      get: {
        tags: ["Quotas"],
        summary: "Listado de regulaciones QR",
        description:
          "Endpoint central para los tres casos de uso:\n\n" +
          "- **Caso 1** – todas las regulaciones vigentes: `?in_force_only=true`\n" +
          "- **Caso 2** – por producto: `?product_codes=0802`\n" +
          "- **Caso 3** – por producto y país: `?product_codes=0802&country=Argentina` " +
          "o `?product_codes=0802&reporter_member_code=C032`\n\n" +
          "El parámetro `country` (nombre) se resuelve automáticamente a `reporter_member_code` " +
          "usando el catálogo de `/api/quotas/members`.",
        parameters: [
          {
            name: "in_force_only",
            in: "query",
            schema: { type: "boolean", default: true },
            description: "Solo regulaciones vigentes (termination_dt nulo)",
          },
          {
            name: "product_codes",
            in: "query",
            schema: { type: "string" },
            description: "Código HS (ej: 0802). Obtener con /api/quotas/products",
          },
          {
            name: "country",
            in: "query",
            schema: { type: "string" },
            description: "Nombre del país en español (ej: Argentina). Se resuelve a reporter_member_code automáticamente",
          },
          {
            name: "reporter_member_code",
            in: "query",
            schema: { type: "string" },
            description: "Código WTO del país (ej: C032). Alternativa directa a `country`",
          },
          {
            name: "page",
            in: "query",
            schema: { type: "integer", default: 1 },
            description: "Número de página",
          },
        ],
        responses: {
          "200": {
            description: "Regulaciones y metadatos de paginación",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/QRRegulation" },
                    },
                    meta: { $ref: "#/components/schemas/QRListMeta" },
                    timestamp: { type: "string", format: "date-time" },
                  },
                },
                example: {
                  success: true,
                  data: [
                    {
                      id: 1,
                      reporter_member: { code: "C032", name: { es: "Argentina" } },
                      general_description: "Restricción de importación de productos agrícolas frescos",
                      in_force_from: "2023-01-01",
                      termination_dt: null,
                      measures: [{ description: "Prohibición de importación" }],
                      notified_in: [{ symbol: "G/MA/QR/N/ARG/1" }],
                      details: "/qrs/qrs/1",
                    },
                  ],
                  meta: { total: 150, page: 1, last_page: 15 },
                  timestamp: "2026-05-01T10:00:00.000Z",
                },
              },
            },
          },
          "500": { description: "Error de servidor" },
        },
      },
    },
    "/api/quotas/{id}": {
      get: {
        tags: ["Quotas"],
        summary: "Detalle de una regulación QR",
        description:
          "Devuelve el detalle completo de una regulación incluyendo `affected_products`, " +
          "`national_legal_bases` y `administrative_mechanisms`. Usar bajo demanda (lazy loading).",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
            description: "ID de la regulación (obtenido de /api/quotas)",
            example: 10,
          },
        ],
        responses: {
          "200": {
            description: "Detalle de la regulación",
            content: {
              "application/json": {
                schema: {
                  allOf: [
                    { $ref: "#/components/schemas/ApiResponse" },
                    {
                      type: "object",
                      properties: {
                        data: { $ref: "#/components/schemas/QRRegulation" },
                      },
                    },
                  ],
                },
              },
            },
          },
          "400": { description: "El parámetro id debe ser un número entero" },
          "404": { description: "Regulación no encontrada" },
          "500": { description: "Error de servidor" },
        },
      },
    },

    // ── MARKETS ─────────────────────────────────────────────────────────────

    "/api/markets": {
      get: {
        tags: ["Markets"],
        summary: "Tendencias de mercado por producto",
        description:
          "Consulta importaciones y exportaciones mundiales usando códigos SITC3. " +
          "Códigos válidos: `TO` (Total), `AG` (Agrícola), `AGFO` (Alimentos), `MI` (Minería/combustibles), " +
          "`MIFU` (Combustibles), `MA` (Manufacturas), `MAIS` (Hierro/acero), `MACH` (Químicos), " +
          "`MACHPH` (Farmacéuticos), `MAMT` (Maquinaria/transporte).",
        parameters: [
          {
            name: "product",
            in: "query",
            required: true,
            schema: {
              type: "string",
              enum: ["TO", "AG", "AGFO", "MI", "MIFU", "MA", "MAIS", "MACH", "MACHPH", "MAMT"],
            },
            description: "Código de clasificación SITC3",
            example: "TO",
          },
        ],
        responses: {
          "200": {
            description: "Tendencias con valores de importación/exportación y nivel de competencia",
            content: {
              "application/json": {
                schema: {
                  allOf: [
                    { $ref: "#/components/schemas/ApiResponse" },
                    {
                      type: "object",
                      properties: {
                        data: {
                          type: "array",
                          items: { $ref: "#/components/schemas/MarketTrend" },
                        },
                      },
                    },
                  ],
                },
                example: {
                  success: true,
                  data: [
                    {
                      product: "Total de mercancías",
                      product_code: "TO",
                      country: "Mundo",
                      period: "2024",
                      importValue: 24832983,
                      exportValue: 24501199,
                      yoyGrowth: 2.2,
                      competitionLevel: "high",
                    },
                  ],
                  timestamp: "2026-05-01T10:00:00.000Z",
                },
              },
            },
          },
          "400": { description: "Parámetro `product` requerido o inválido" },
          "500": { description: "Error de servidor" },
        },
      },
    },
    "/api/markets/competition": {
      get: {
        tags: ["Markets"],
        summary: "Análisis de competencia para un producto y país",
        parameters: [
          {
            name: "product",
            in: "query",
            required: true,
            schema: { type: "string" },
            description: "Código SITC3",
          },
          {
            name: "country",
            in: "query",
            required: true,
            schema: { type: "string" },
            description: "Nombre del país",
          },
        ],
        responses: {
          "200": { description: "Análisis de competencia" },
          "400": { description: "Parámetros `product` y `country` requeridos" },
        },
      },
    },
    "/api/markets/demand": {
      get: {
        tags: ["Markets"],
        summary: "Tendencias de demanda (importaciones) — Casos 1, 2 y 3",
        description:
          "Consulta el endpoint WTO `/timeseries/v1/data` con `ITS_MTV_AM` (importaciones anuales por defecto).\n\n" +
          "- **Caso 1** – producto específico en países específicos: `?products=AG&reporters=032,076`\n" +
          "- **Caso 2** – todos los productos en países específicos: `?reporters=032,076`\n" +
          "- **Caso 3** – producto específico en todos los países: `?products=AG`\n\n" +
          "Los códigos de `reporters` provienen de `/api/timeseries/economies`. " +
          "Los períodos se expresan como años separados por coma: `2018,2019,2020,2021,2022,2023`.",
        parameters: [
          { name: "indicator", in: "query", schema: { type: "string", default: "ITS_MTV_AM" }, description: "Código de indicador WTO Timeseries" },
          { name: "reporters", in: "query", schema: { type: "string" }, description: "Códigos de países reportantes separados por coma (ej: 032,076,484)" },
          { name: "partners",  in: "query", schema: { type: "string" }, description: "Códigos de países socios separados por coma" },
          { name: "periods",   in: "query", schema: { type: "string" }, description: "Años separados por coma (ej: 2018,2019,2020,2021,2022,2023). Default: últimos 6 años" },
          { name: "frequency", in: "query", schema: { type: "string", enum: ["A", "Q", "M"], default: "A" }, description: "Frecuencia: A=Anual, Q=Trimestral, M=Mensual" },
          { name: "products",  in: "query", schema: { type: "string" }, description: "Códigos SITC3 separados por coma (ej: AG,MA). Ver /api/timeseries/products" },
        ],
        responses: {
          "200": {
            description: "Serie temporal de importaciones con crecimiento YoY",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: { type: "array", items: { $ref: "#/components/schemas/DemandTrend" } },
                    timestamp: { type: "string", format: "date-time" },
                  },
                },
                example: {
                  success: true,
                  data: [
                    { reporter: "Brasil", reporter_code: "076", product: "Productos agrícolas", product_code: "AG", period: "2022", import_value: 13200000, yoy_growth: 15.79 },
                    { reporter: "Brasil", reporter_code: "076", product: "Productos agrícolas", product_code: "AG", period: "2023", import_value: 12800000, yoy_growth: -3.03 },
                  ],
                  timestamp: "2026-05-01T10:00:00.000Z",
                },
              },
            },
          },
          "500": { description: "Error de servidor" },
        },
      },
    },
    "/api/markets/profile": {
      get: {
        tags: ["Markets"],
        summary: "Perfil completo de un mercado — Caso 4",
        description:
          "Devuelve tamaño de mercado, CAGR, volatilidad, tendencia y top proveedores para un reporter+producto. " +
          "Requiere indicador con dimensión `partner` para obtener `top_suppliers` (si el indicador no la soporta, la lista estará vacía).",
        parameters: [
          { name: "reporter", in: "query", required: true,  schema: { type: "string" }, description: "Código de economía reportante (ej: 032)", example: "032" },
          { name: "product",  in: "query", required: true,  schema: { type: "string" }, description: "Código SITC3 (ej: AG)", example: "AG" },
          { name: "partners", in: "query", schema: { type: "string" }, description: "Códigos de socios para análisis de proveedores" },
          { name: "periods",  in: "query", schema: { type: "string" }, description: "Años separados por coma. Default: últimos 6 años" },
        ],
        responses: {
          "200": {
            description: "Perfil de mercado completo",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: { $ref: "#/components/schemas/MarketProfile" },
                    timestamp: { type: "string", format: "date-time" },
                  },
                },
              },
            },
          },
          "400": { description: "reporter y product son requeridos" },
          "500": { description: "Error de servidor" },
        },
      },
    },
    "/api/markets/potential": {
      get: {
        tags: ["Markets"],
        summary: "Mercados potenciales — Caso 4.1",
        description: "Ranking de países ordenado por tasa de crecimiento reciente de importaciones del producto dado.",
        parameters: [
          { name: "product", in: "query", required: true, schema: { type: "string" }, description: "Código SITC3", example: "AG" },
          { name: "periods", in: "query", schema: { type: "string" }, description: "Años separados por coma. Default: últimos 6 años" },
          { name: "limit",   in: "query", schema: { type: "integer", default: 10 }, description: "Número máximo de mercados a devolver" },
        ],
        responses: {
          "200": {
            description: "Ranking de mercados potenciales",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: { type: "array", items: { $ref: "#/components/schemas/PotentialMarket" } },
                    timestamp: { type: "string", format: "date-time" },
                  },
                },
                example: {
                  success: true,
                  data: [
                    { reporter: "Vietnam",      reporter_code: "704", import_value: 28000000, growth_rate: 15.7, trend: "rising", cagr: 13.2 },
                    { reporter: "India",         reporter_code: "356", import_value: 42000000, growth_rate: 12.4, trend: "rising", cagr: 10.2 },
                    { reporter: "China",         reporter_code: "156", import_value: 185000000, growth_rate: 8.2, trend: "rising", cagr: 6.5 },
                  ],
                  timestamp: "2026-05-01T10:00:00.000Z",
                },
              },
            },
          },
          "400": { description: "product es requerido" },
        },
      },
    },
    "/api/markets/share": {
      get: {
        tags: ["Markets"],
        summary: "Cuota de mercado por proveedor — Caso 4.2",
        description: "Calcula qué países abastecen más al reporter para el producto dado, usando la dimensión `partner` del indicador.",
        parameters: [
          { name: "reporter", in: "query", required: true, schema: { type: "string" }, description: "Economía importadora (ej: 032)", example: "032" },
          { name: "product",  in: "query", required: true, schema: { type: "string" }, description: "Código SITC3", example: "AG" },
          { name: "periods",  in: "query", schema: { type: "string" }, description: "Default: últimos 3 años" },
        ],
        responses: {
          "200": {
            description: "Cuota de mercado por país proveedor",
            content: {
              "application/json": {
                example: {
                  success: true,
                  data: [
                    { country: "Estados Unidos", country_code: "840", share: 28.5, import_value: 425000 },
                    { country: "China",          country_code: "156", share: 22.1, import_value: 330000 },
                  ],
                  timestamp: "2026-05-01T10:00:00.000Z",
                },
              },
            },
          },
          "400": { description: "reporter y product son requeridos" },
        },
      },
    },
    "/api/markets/seasonality": {
      get: {
        tags: ["Markets"],
        summary: "Estacionalidad de la demanda — Caso 4.4",
        description: "Consulta con frecuencia trimestral (Q) o mensual (M) para detectar patrones estacionales.",
        parameters: [
          { name: "product",   in: "query", required: true, schema: { type: "string" }, example: "AG" },
          { name: "reporter",  in: "query", required: true, schema: { type: "string" }, example: "032" },
          { name: "frequency", in: "query", schema: { type: "string", enum: ["Q", "M"], default: "Q" } },
          { name: "periods",   in: "query", schema: { type: "string" }, description: "Default: últimos 3 años" },
        ],
        responses: {
          "200": {
            description: "Serie temporal trimestral/mensual con YoY",
            content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" }, data: { type: "array", items: { $ref: "#/components/schemas/DemandTrend" } } } } } },
          },
          "400": { description: "product y reporter son requeridos" },
        },
      },
    },
    "/api/markets/volatility": {
      get: {
        tags: ["Markets"],
        summary: "Volatilidad de mercados — Caso 4.5",
        description: "Calcula la desviación estándar del crecimiento YoY para clasificar mercados como `low/medium/high` risk.",
        parameters: [
          { name: "product",   in: "query", required: true, schema: { type: "string" }, example: "AG" },
          { name: "reporters", in: "query", schema: { type: "string" }, description: "Códigos separados por coma. Sin valor: todos los países disponibles" },
          { name: "periods",   in: "query", schema: { type: "string" }, description: "Default: últimos 8 años" },
        ],
        responses: {
          "200": {
            description: "Ranking de volatilidad por mercado",
            content: {
              "application/json": {
                example: {
                  success: true,
                  data: [
                    { reporter: "Argentina", reporter_code: "032", volatility: 18.3, trend: "rising",  risk: "high"   },
                    { reporter: "Brasil",    reporter_code: "076", volatility: 9.7,  trend: "stable",  risk: "medium" },
                    { reporter: "México",    reporter_code: "484", volatility: 5.1,  trend: "rising",  risk: "low"    },
                  ],
                },
              },
            },
          },
          "400": { description: "product es requerido" },
        },
      },
    },
    "/api/markets/compare": {
      get: {
        tags: ["Markets"],
        summary: "Comparación de mercados — Caso 4.6",
        description: "Devuelve la serie temporal completa y un resumen (latest_value, CAGR, tendencia) para cada reporter.",
        parameters: [
          { name: "product",   in: "query", required: true, schema: { type: "string" }, example: "AG" },
          { name: "reporters", in: "query", required: true, schema: { type: "string" }, description: "Mínimo 2 códigos separados por coma", example: "032,076,484" },
          { name: "periods",   in: "query", schema: { type: "string" }, description: "Default: últimos 6 años" },
        ],
        responses: {
          "200": {
            description: "Comparativa de mercados con resumen y serie temporal",
            content: {
              "application/json": {
                example: {
                  success: true,
                  data: {
                    reporters: ["032","076","484"],
                    summary: [
                      { reporter: "Brasil",    reporter_code: "076", latest_value: 12800000, cagr: 7.5, trend: "rising"  },
                      { reporter: "México",    reporter_code: "484", latest_value: 9200000,  cagr: 4.2, trend: "rising"  },
                      { reporter: "Argentina", reporter_code: "032", latest_value: 1490000,  cagr: 3.8, trend: "rising"  },
                    ],
                    data: [],
                  },
                },
              },
            },
          },
          "400": { description: "product y reporters son requeridos" },
        },
      },
    },
    "/api/markets/blocks": {
      get: {
        tags: ["Markets"],
        summary: "Demanda por bloque económico — Caso 4.7",
        description:
          "Consulta importaciones agrupadas por bloque económico. " +
          "Obtener códigos de bloques en `/api/timeseries/economic-groups` y pasarlos en `groups`.",
        parameters: [
          { name: "product", in: "query", required: true, schema: { type: "string" }, example: "AG" },
          { name: "groups",  in: "query", schema: { type: "string" }, description: "Códigos de bloques separados por coma (ej: EUN,ASN). Ver /api/timeseries/economic-groups" },
          { name: "periods", in: "query", schema: { type: "string" }, description: "Default: últimos 6 años" },
        ],
        responses: {
          "200": { description: "Demanda por bloque con crecimiento YoY", content: { "application/json": { schema: { type: "object" } } } },
          "400": { description: "product es requerido" },
        },
      },
    },
    "/api/markets/data-count": {
      get: {
        tags: ["Markets"],
        summary: "Validar tamaño de consulta antes de ejecutar — Caso 4.8",
        description: "Llama a `/timeseries/v1/data_count` para estimar el número de registros sin descargar datos. Usar antes de `/api/markets/demand` con parámetros amplios.",
        parameters: [
          { name: "indicator", in: "query", required: true, schema: { type: "string" }, example: "ITS_MTV_AM" },
          { name: "reporters", in: "query", schema: { type: "string" } },
          { name: "partners",  in: "query", schema: { type: "string" } },
          { name: "periods",   in: "query", schema: { type: "string" } },
          { name: "frequency", in: "query", schema: { type: "string", enum: ["A","Q","M"] } },
          { name: "products",  in: "query", schema: { type: "string" } },
        ],
        responses: {
          "200": {
            description: "Número de registros estimado y recomendación",
            content: {
              "application/json": {
                example: {
                  success: true,
                  data: { count: 432, feasible: true, recommendation: "Tamaño manejable" },
                  timestamp: "2026-05-01T10:00:00.000Z",
                },
              },
            },
          },
          "400": { description: "indicator es requerido" },
        },
      },
    },
    "/api/markets/trending": {
      get: {
        tags: ["Markets"],
        summary: "Productos más activos en tendencia",
        parameters: [
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", default: 10 },
            description: "Número máximo de productos a devolver",
          },
        ],
        responses: {
          "200": { description: "Lista de productos en tendencia" },
        },
      },
    },

    // ── FACILITY ─────────────────────────────────────────────────────────────

    "/api/facility": {
      get: {
        tags: ["Facility"],
        summary: "Procesos aduaneros TFAD por país",
        parameters: [
          {
            name: "country",
            in: "query",
            schema: { type: "string" },
            description: "Nombre del país (ej: Colombia). Sin parámetro devuelve todos.",
          },
        ],
        responses: {
          "200": { description: "Procesos TFAD con documentos requeridos, días y tarifas" },
          "500": { description: "Error de servidor" },
        },
      },
    },
    "/api/facility/clearance-estimate": {
      post: {
        tags: ["Facility"],
        summary: "Estimar tiempo y costo de despacho aduanero",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["country", "product"],
                properties: {
                  country: { type: "string", example: "Colombia" },
                  product: { type: "string", example: "Coffee" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Estimación de despacho" },
          "400": { description: "Parámetros `country` y `product` requeridos" },
        },
      },
    },

    // ── PRODUCTS ─────────────────────────────────────────────────────────────

    "/api/product": {
      get: {
        tags: ["Products"],
        summary: "Listar productos configurados",
        parameters: [
          {
            name: "category",
            in: "query",
            schema: { type: "string" },
            description: "Filtrar por categoría",
          },
        ],
        responses: {
          "200": { description: "Lista de productos" },
        },
      },
      post: {
        tags: ["Products"],
        summary: "Crear producto",
        security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "hs_code"],
                properties: {
                  name: { type: "string", example: "Café tostado" },
                  hs_code: { type: "string", example: "0901210000" },
                  category: { type: "string", example: "Agrícola" },
                  description: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Producto creado" },
          "400": { description: "Nombre y código HS requeridos, o código HS inválido" },
        },
      },
    },

    // ── PRODUCTS - AI ────────────────────────────────────────────────────────

    "/api/products/{hsCode}/unit-export-cost": {
      get: {
        tags: ["Products"],
        summary: "Estimar costo unitario de exportación con IA",
        description:
          "Utiliza un modelo de IA (Gemini/Claude) para estimar el costo unitario de exportación " +
          "de un producto a un país destino, considerando factores como el HS Code, país de origen, " +
          "aranceles estimados, flete, etc.",
        parameters: [
          {
            name: "hsCode",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Código HS del producto (ej: 090121)",
            example: "090121",
          },
          {
            name: "originCountry",
            in: "query",
            required: true,
            schema: { type: "string" },
            description: "País de origen de la exportación (ej: Perú)",
            example: "Perú",
          },
          {
            name: "destinationCountry",
            in: "query",
            required: true,
            schema: { type: "string" },
            description: "País de destino de la exportación (ej: Canadá)",
            example: "Canadá",
          },
        ],
        responses: {
          "200": {
            description: "Costo unitario de exportación estimado",
            content: {
              "application/json": {
                schema: {
                  allOf: [
                    { $ref: "#/components/schemas/ApiResponse" },
                    {
                      type: "object",
                      properties: {
                        data: {
                          type: "object",
                          properties: {
                            estimatedCost: { type: "number", example: 5.85 },
                            currency: { type: "string", example: "USD" },
                            explanation: { type: "string", example: "Estimación basada en aranceles típicos, costos de flete marítimo y márgenes promedio para café tostado." },
                          },
                        },
                      },
                    },
                  ],
                },
                example: {
                  success: true,
                  data: {
                    estimatedCost: 5.85,
                    currency: "USD",
                    explanation: "Estimación basada en aranceles típicos, costos de flete marítimo y márgenes promedio para café tostado."
                  },
                  timestamp: "2026-05-01T10:00:00.000Z",
                },
              },
            },
          },
          "400": { description: "Parámetros requeridos faltantes o inválidos" },
          "500": { description: "Error de servidor o en la comunicación con el modelo de IA" },
        },
      },
    },
    // ── CHAT ─────────────────────────────────────────────────────────────────

    "/api/chat/session": {
      post: {
        tags: ["Chat"],
        summary: "Crear sesión de chat",
        security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  topic: { type: "string", example: "Exportación de café a Europa" },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Sesión creada" },
          "401": { description: "No autenticado" },
        },
      },
    },
    "/api/chat/{sessionId}/message": {
      post: {
        tags: ["Chat"],
        summary: "Enviar mensaje en una sesión de chat",
        security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
        parameters: [
          {
            name: "sessionId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["message"],
                properties: {
                  message: { type: "string", example: "¿Qué restricciones aplican para exportar café a la UE?" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Respuesta del asistente IA" },
          "400": { description: "Mensaje requerido" },
          "401": { description: "No autenticado" },
        },
      },
    },

    // ── TIMESERIES METADATA ───────────────────────────────────────────────────

    "/api/timeseries/frequencies": {
      get: {
        tags: ["Timeseries"],
        summary: "Frecuencias disponibles (A / Q / M)",
        responses: { "200": { description: "Lista de frecuencias con código y nombre", content: { "application/json": { example: { success: true, data: [{ code: "A", name: "Anual" }, { code: "Q", name: "Trimestral" }, { code: "M", name: "Mensual" }] } } } } },
      },
    },
    "/api/timeseries/periods": {
      get: {
        tags: ["Timeseries"],
        summary: "Períodos válidos para un indicador",
        parameters: [
          { name: "indicator", in: "query", schema: { type: "string" }, description: "Código de indicador para filtrar períodos disponibles" },
        ],
        responses: { "200": { description: "Lista de períodos disponibles" } },
      },
    },
    "/api/timeseries/units": {
      get: {
        tags: ["Timeseries"],
        summary: "Unidades de medida disponibles",
        description: "Necesario para interpretar correctamente los valores de `/api/markets/demand`.",
        responses: { "200": { description: "Lista de unidades (ej: USD_1000, toneladas)", content: { "application/json": { example: { success: true, data: [{ code: "USD_1000", name: "Miles de dólares USD" }] } } } } },
      },
    },
    "/api/timeseries/value-flags": {
      get: {
        tags: ["Timeseries"],
        summary: "Indicadores de calidad del dato",
        description: "Flags que acompañan a los valores (E=Estimado, P=Provisional). Usar para filtrar o advertir sobre calidad.",
        responses: { "200": { description: "Lista de value flags" } },
      },
    },
    "/api/timeseries/partners": {
      get: {
        tags: ["Timeseries"],
        summary: "Economías socias disponibles",
        description: "Códigos para el parámetro `partners` en `/api/markets/demand`, `/api/markets/profile` y `/api/markets/share`.",
        responses: { "200": { description: "Lista de economías socias" } },
      },
    },
    "/api/timeseries/economic-groups": {
      get: {
        tags: ["Timeseries"],
        summary: "Grupos económicos disponibles",
        description: "Provee los códigos para el parámetro `groups` en `/api/markets/blocks` (ej: UE, ASEAN, G20).",
        responses: { "200": { description: "Lista de bloques económicos con código y nombre" } },
      },
    },
    "/api/timeseries/geographical-regions": {
      get: {
        tags: ["Timeseries"],
        summary: "Regiones geográficas disponibles",
        description: "Útil para filtrar reporters por región sin tener que listar todos los países.",
        responses: { "200": { description: "Lista de regiones geográficas" } },
      },
    },
    "/api/timeseries/indicators": {
      get: {
        tags: ["Timeseries"],
        summary: "Indicadores disponibles en WTO Timeseries",
        responses: {
          "200": { description: "Lista de indicadores (catálogo de referencia)" },
        },
      },
    },
    "/api/timeseries/search/indicators": {
      get: {
        tags: ["Timeseries"],
        summary: "Buscar indicadores por nombre",
        parameters: [
          {
            name: "q",
            in: "query",
            required: true,
            schema: { type: "string" },
            description: "Texto de búsqueda",
          },
        ],
        responses: {
          "200": { description: "Indicadores que coinciden con la búsqueda" },
          "400": { description: "Parámetro `q` requerido" },
        },
      },
    },
    "/api/timeseries/economies": {
      get: {
        tags: ["Timeseries"],
        summary: "Economías reportantes disponibles en WTO Timeseries",
        responses: {
          "200": { description: "Lista de economías/países" },
        },
      },
    },
    "/api/timeseries/products": {
      get: {
        tags: ["Timeseries"],
        summary: "Sectores/productos disponibles en WTO Timeseries",
        responses: {
          "200": { description: "Lista de productos y sectores con sus códigos SITC3" },
        },
      },
    },

    // ── CACHE ────────────────────────────────────────────────────────────────

    "/api/cache/clear": {
      delete: {
        tags: ["System"],
        summary: "Limpiar caché de Redis",
        description:
          "Sin `pattern` limpia todo el caché. Con `pattern` (ej: `alerts`, `quotas`, `trends`) " +
          "limpia solo las claves `wto:{pattern}:*`.",
        parameters: [
          {
            name: "pattern",
            in: "query",
            schema: { type: "string", enum: ["alerts", "quotas", "trends", "tfad"] },
            description: "Prefijo de las claves a eliminar",
          },
        ],
        responses: {
          "200": { description: "Caché limpiado correctamente" },
          "500": { description: "Error de servidor" },
        },
      },
    },
  },
};

export default swaggerDocs;
