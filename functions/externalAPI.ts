import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

const API_KEY = Deno.env.get("EXTERNAL_API_KEY");

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-API-Key, Authorization',
};

// OpenAPI/Swagger documentation
const openAPISpec = {
  openapi: "3.0.3",
  info: {
    title: "Zugruppe Real Estate API",
    description: "API externa para consulta de imóveis e oportunidades do sistema Zugruppe CRM",
    version: "1.0.0",
    contact: {
      name: "Zugruppe Support",
      email: "support@zugruppe.com"
    }
  },
  servers: [
    {
      url: "{baseUrl}",
      description: "API Server",
      variables: {
        baseUrl: {
          default: "https://api.base44.com/v1/apps/{app_id}/functions/externalAPI"
        }
      }
    }
  ],
  security: [
    { ApiKeyAuth: [] }
  ],
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: "apiKey",
        in: "header",
        name: "X-API-Key",
        description: "Chave de API para autenticação"
      }
    },
    schemas: {
      Property: {
        type: "object",
        properties: {
          id: { type: "string", description: "ID único do imóvel" },
          ref_id: { type: "string", description: "Referência do imóvel (ex: IMO-0001)" },
          title: { type: "string", description: "Título do imóvel" },
          description: { type: "string", description: "Descrição detalhada" },
          property_type: { 
            type: "string", 
            enum: ["apartment", "house", "land", "building", "farm", "store", "warehouse", "office"],
            description: "Tipo de imóvel"
          },
          listing_type: { 
            type: "string", 
            enum: ["sale", "rent"],
            description: "Tipo de negócio"
          },
          price: { type: "number", description: "Preço em euros" },
          bedrooms: { type: "integer", description: "Número de quartos" },
          bathrooms: { type: "integer", description: "Número de casas de banho" },
          square_feet: { type: "number", description: "Área útil em m²" },
          gross_area: { type: "number", description: "Área bruta em m²" },
          address: { type: "string", description: "Morada" },
          city: { type: "string", description: "Cidade/Concelho" },
          state: { type: "string", description: "Distrito" },
          country: { type: "string", description: "País" },
          zip_code: { type: "string", description: "Código postal" },
          status: { type: "string", enum: ["active", "pending", "sold", "rented", "off_market"] },
          availability_status: { type: "string", enum: ["available", "sold", "reserved", "rented", "prospecting", "withdrawn", "pending_validation"] },
          images: { type: "array", items: { type: "string" }, description: "URLs das imagens" },
          amenities: { type: "array", items: { type: "string" }, description: "Comodidades" },
          energy_certificate: { type: "string", description: "Certificado energético" },
          year_built: { type: "integer", description: "Ano de construção" },
          created_date: { type: "string", format: "date-time" },
          updated_date: { type: "string", format: "date-time" }
        }
      },
      Opportunity: {
        type: "object",
        properties: {
          id: { type: "string", description: "ID único da oportunidade" },
          ref_id: { type: "string", description: "Referência (ex: OPO-0001)" },
          lead_type: { 
            type: "string", 
            enum: ["comprador", "vendedor", "parceiro_comprador", "parceiro_vendedor"],
            description: "Tipo de lead"
          },
          buyer_name: { type: "string", description: "Nome do contacto" },
          buyer_email: { type: "string", description: "Email do contacto" },
          buyer_phone: { type: "string", description: "Telefone do contacto" },
          property_id: { type: "string", description: "ID do imóvel associado" },
          property_title: { type: "string", description: "Título do imóvel" },
          budget: { type: "number", description: "Orçamento" },
          status: { 
            type: "string", 
            enum: ["new", "contacted", "qualified", "proposal", "negotiation", "won", "lost"],
            description: "Estado da oportunidade"
          },
          priority: { type: "string", enum: ["low", "medium", "high"] },
          lead_source: { type: "string", description: "Origem do lead" },
          message: { type: "string", description: "Mensagem/notas" },
          created_date: { type: "string", format: "date-time" },
          updated_date: { type: "string", format: "date-time" }
        }
      },
      Error: {
        type: "object",
        properties: {
          error: { type: "string", description: "Mensagem de erro" },
          code: { type: "string", description: "Código do erro" }
        }
      },
      PaginatedResponse: {
        type: "object",
        properties: {
          data: { type: "array", items: {} },
          pagination: {
            type: "object",
            properties: {
              total: { type: "integer" },
              limit: { type: "integer" },
              offset: { type: "integer" },
              has_more: { type: "boolean" }
            }
          }
        }
      }
    }
  },
  paths: {
    "/": {
      get: {
        summary: "Documentação da API",
        description: "Retorna a especificação OpenAPI/Swagger",
        tags: ["Documentação"],
        security: [],
        responses: {
          "200": {
            description: "Especificação OpenAPI",
            content: {
              "application/json": {
                schema: { type: "object" }
              }
            }
          }
        }
      }
    },
    "/properties": {
      post: {
        summary: "Listar imóveis",
        description: "Retorna lista de imóveis com filtros opcionais",
        tags: ["Imóveis"],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  action: { type: "string", enum: ["list"], default: "list" },
                  filters: {
                    type: "object",
                    properties: {
                      city: { type: "string", description: "Filtrar por cidade" },
                      state: { type: "string", description: "Filtrar por distrito" },
                      property_type: { type: "string", description: "Filtrar por tipo" },
                      listing_type: { type: "string", enum: ["sale", "rent"] },
                      status: { type: "string" },
                      price_min: { type: "number" },
                      price_max: { type: "number" },
                      bedrooms_min: { type: "integer" },
                      bedrooms_max: { type: "integer" }
                    }
                  },
                  limit: { type: "integer", default: 50, maximum: 100 },
                  offset: { type: "integer", default: 0 }
                }
              }
            }
          }
        },
        responses: {
          "200": {
            description: "Lista de imóveis",
            content: {
              "application/json": {
                schema: {
                  allOf: [
                    { "$ref": "#/components/schemas/PaginatedResponse" },
                    {
                      properties: {
                        data: {
                          type: "array",
                          items: { "$ref": "#/components/schemas/Property" }
                        }
                      }
                    }
                  ]
                }
              }
            }
          },
          "401": {
            description: "Não autorizado",
            content: {
              "application/json": {
                schema: { "$ref": "#/components/schemas/Error" }
              }
            }
          }
        }
      }
    },
    "/properties/{id}": {
      post: {
        summary: "Obter imóvel por ID",
        description: "Retorna detalhes de um imóvel específico",
        tags: ["Imóveis"],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  action: { type: "string", enum: ["get"] },
                  id: { type: "string", description: "ID do imóvel" }
                },
                required: ["action", "id"]
              }
            }
          }
        },
        responses: {
          "200": {
            description: "Detalhes do imóvel",
            content: {
              "application/json": {
                schema: { "$ref": "#/components/schemas/Property" }
              }
            }
          },
          "404": {
            description: "Imóvel não encontrado"
          }
        }
      }
    },
    "/opportunities": {
      post: {
        summary: "Listar oportunidades",
        description: "Retorna lista de oportunidades/leads com filtros",
        tags: ["Oportunidades"],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  action: { type: "string", enum: ["list"], default: "list" },
                  filters: {
                    type: "object",
                    properties: {
                      lead_type: { type: "string" },
                      status: { type: "string" },
                      priority: { type: "string" },
                      lead_source: { type: "string" }
                    }
                  },
                  limit: { type: "integer", default: 50, maximum: 100 },
                  offset: { type: "integer", default: 0 }
                }
              }
            }
          }
        },
        responses: {
          "200": {
            description: "Lista de oportunidades",
            content: {
              "application/json": {
                schema: {
                  allOf: [
                    { "$ref": "#/components/schemas/PaginatedResponse" },
                    {
                      properties: {
                        data: {
                          type: "array",
                          items: { "$ref": "#/components/schemas/Opportunity" }
                        }
                      }
                    }
                  ]
                }
              }
            }
          }
        }
      }
    },
    "/opportunities/create": {
      post: {
        summary: "Criar oportunidade",
        description: "Cria uma nova oportunidade/lead no sistema",
        tags: ["Oportunidades"],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  action: { type: "string", enum: ["create"] },
                  data: {
                    type: "object",
                    properties: {
                      lead_type: { type: "string", enum: ["comprador", "vendedor", "parceiro_comprador", "parceiro_vendedor"] },
                      buyer_name: { type: "string" },
                      buyer_email: { type: "string" },
                      buyer_phone: { type: "string" },
                      property_id: { type: "string" },
                      budget: { type: "number" },
                      message: { type: "string" },
                      lead_source: { type: "string" }
                    },
                    required: ["lead_type", "buyer_name"]
                  }
                },
                required: ["action", "data"]
              }
            }
          }
        },
        responses: {
          "201": {
            description: "Oportunidade criada",
            content: {
              "application/json": {
                schema: { "$ref": "#/components/schemas/Opportunity" }
              }
            }
          }
        }
      }
    }
  },
  tags: [
    { name: "Documentação", description: "Documentação da API" },
    { name: "Imóveis", description: "Operações com imóveis" },
    { name: "Oportunidades", description: "Operações com oportunidades/leads" }
  ]
};

// Validate API Key
function validateApiKey(req) {
  const apiKey = req.headers.get('X-API-Key') || req.headers.get('x-api-key');
  
  if (!API_KEY) {
    return { valid: false, error: 'API Key not configured on server' };
  }
  
  if (!apiKey) {
    return { valid: false, error: 'Missing X-API-Key header' };
  }
  
  if (apiKey !== API_KEY) {
    return { valid: false, error: 'Invalid API Key' };
  }
  
  return { valid: true };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const base44 = createClientFromRequest(req);
    
    // Parse request body
    let body = {};
    if (req.method === 'POST') {
      try {
        body = await req.json();
      } catch {
        body = {};
      }
    }

    const action = body.action || 'docs';

    // Return OpenAPI docs without auth
    if (action === 'docs' || action === 'swagger' || action === 'openapi') {
      return Response.json(openAPISpec, { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Validate API Key for all other actions
    const authResult = validateApiKey(req);
    if (!authResult.valid) {
      return Response.json(
        { error: authResult.error, code: 'UNAUTHORIZED' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Handle different actions
    switch (action) {
      case 'list_properties': {
        const filters = body.filters || {};
        const limit = Math.min(body.limit || 50, 100);
        const offset = body.offset || 0;

        let allProperties = await base44.asServiceRole.entities.Property.list('-created_date');
        
        // Apply filters
        let filtered = allProperties.filter(p => {
          if (filters.city && !p.city?.toLowerCase().includes(filters.city.toLowerCase())) return false;
          if (filters.state && !p.state?.toLowerCase().includes(filters.state.toLowerCase())) return false;
          if (filters.property_type && p.property_type !== filters.property_type) return false;
          if (filters.listing_type && p.listing_type !== filters.listing_type) return false;
          if (filters.status && p.status !== filters.status) return false;
          if (filters.price_min && (p.price || 0) < filters.price_min) return false;
          if (filters.price_max && (p.price || 0) > filters.price_max) return false;
          if (filters.bedrooms_min && (p.bedrooms || 0) < filters.bedrooms_min) return false;
          if (filters.bedrooms_max && (p.bedrooms || 0) > filters.bedrooms_max) return false;
          return true;
        });

        const total = filtered.length;
        const paginated = filtered.slice(offset, offset + limit);

        // Remove sensitive fields
        const sanitized = paginated.map(p => ({
          id: p.id,
          ref_id: p.ref_id,
          title: p.title,
          description: p.description,
          property_type: p.property_type,
          listing_type: p.listing_type,
          price: p.price,
          bedrooms: p.bedrooms,
          bathrooms: p.bathrooms,
          square_feet: p.square_feet,
          gross_area: p.gross_area,
          useful_area: p.useful_area,
          address: p.address,
          city: p.city,
          state: p.state,
          country: p.country,
          zip_code: p.zip_code,
          status: p.status,
          availability_status: p.availability_status,
          images: p.images,
          amenities: p.amenities,
          energy_certificate: p.energy_certificate,
          year_built: p.year_built,
          featured: p.featured,
          created_date: p.created_date,
          updated_date: p.updated_date
        }));

        return Response.json({
          data: sanitized,
          pagination: {
            total,
            limit,
            offset,
            has_more: offset + limit < total
          }
        }, { headers: corsHeaders });
      }

      case 'get_property': {
        const propertyId = body.id;
        if (!propertyId) {
          return Response.json(
            { error: 'Property ID is required', code: 'MISSING_ID' },
            { status: 400, headers: corsHeaders }
          );
        }

        const allProperties = await base44.asServiceRole.entities.Property.list();
        const property = allProperties.find(p => p.id === propertyId || p.ref_id === propertyId);

        if (!property) {
          return Response.json(
            { error: 'Property not found', code: 'NOT_FOUND' },
            { status: 404, headers: corsHeaders }
          );
        }

        // Remove sensitive fields
        const sanitized = {
          id: property.id,
          ref_id: property.ref_id,
          title: property.title,
          description: property.description,
          property_type: property.property_type,
          listing_type: property.listing_type,
          price: property.price,
          bedrooms: property.bedrooms,
          bathrooms: property.bathrooms,
          square_feet: property.square_feet,
          gross_area: property.gross_area,
          useful_area: property.useful_area,
          address: property.address,
          city: property.city,
          state: property.state,
          country: property.country,
          zip_code: property.zip_code,
          status: property.status,
          availability_status: property.availability_status,
          images: property.images,
          amenities: property.amenities,
          tags: property.tags,
          energy_certificate: property.energy_certificate,
          year_built: property.year_built,
          featured: property.featured,
          created_date: property.created_date,
          updated_date: property.updated_date
        };

        return Response.json(sanitized, { headers: corsHeaders });
      }

      case 'list_opportunities': {
        const filters = body.filters || {};
        const limit = Math.min(body.limit || 50, 100);
        const offset = body.offset || 0;

        let allOpportunities = await base44.asServiceRole.entities.Opportunity.list('-created_date');

        // Apply filters
        let filtered = allOpportunities.filter(o => {
          if (filters.lead_type && o.lead_type !== filters.lead_type) return false;
          if (filters.status && o.status !== filters.status) return false;
          if (filters.priority && o.priority !== filters.priority) return false;
          if (filters.lead_source && o.lead_source !== filters.lead_source) return false;
          return true;
        });

        const total = filtered.length;
        const paginated = filtered.slice(offset, offset + limit);

        // Sanitize - remove internal notes
        const sanitized = paginated.map(o => ({
          id: o.id,
          ref_id: o.ref_id,
          lead_type: o.lead_type,
          buyer_name: o.buyer_name,
          buyer_email: o.buyer_email,
          buyer_phone: o.buyer_phone,
          property_id: o.property_id,
          property_title: o.property_title,
          budget: o.budget,
          estimated_value: o.estimated_value,
          status: o.status,
          priority: o.priority,
          lead_source: o.lead_source,
          message: o.message,
          created_date: o.created_date,
          updated_date: o.updated_date
        }));

        return Response.json({
          data: sanitized,
          pagination: {
            total,
            limit,
            offset,
            has_more: offset + limit < total
          }
        }, { headers: corsHeaders });
      }

      case 'get_opportunity': {
        const oppId = body.id;
        if (!oppId) {
          return Response.json(
            { error: 'Opportunity ID is required', code: 'MISSING_ID' },
            { status: 400, headers: corsHeaders }
          );
        }

        const allOpps = await base44.asServiceRole.entities.Opportunity.list();
        const opp = allOpps.find(o => o.id === oppId || o.ref_id === oppId);

        if (!opp) {
          return Response.json(
            { error: 'Opportunity not found', code: 'NOT_FOUND' },
            { status: 404, headers: corsHeaders }
          );
        }

        const sanitized = {
          id: opp.id,
          ref_id: opp.ref_id,
          lead_type: opp.lead_type,
          buyer_name: opp.buyer_name,
          buyer_email: opp.buyer_email,
          buyer_phone: opp.buyer_phone,
          property_id: opp.property_id,
          property_title: opp.property_title,
          budget: opp.budget,
          estimated_value: opp.estimated_value,
          status: opp.status,
          priority: opp.priority,
          lead_source: opp.lead_source,
          message: opp.message,
          created_date: opp.created_date,
          updated_date: opp.updated_date
        };

        return Response.json(sanitized, { headers: corsHeaders });
      }

      case 'create_opportunity': {
        const data = body.data;
        if (!data || !data.lead_type || !data.buyer_name) {
          return Response.json(
            { error: 'lead_type and buyer_name are required', code: 'MISSING_FIELDS' },
            { status: 400, headers: corsHeaders }
          );
        }

        // Generate ref_id
        let refId = null;
        try {
          const { data: refData } = await base44.asServiceRole.functions.invoke('generateRefId', { entity_type: 'Opportunity' });
          refId = refData?.ref_id;
        } catch (e) {
          // Continue without ref_id
        }

        const newOpp = await base44.asServiceRole.entities.Opportunity.create({
          ref_id: refId,
          lead_type: data.lead_type,
          buyer_name: data.buyer_name,
          buyer_email: data.buyer_email || null,
          buyer_phone: data.buyer_phone || null,
          property_id: data.property_id || null,
          budget: data.budget || null,
          message: data.message || null,
          lead_source: data.lead_source || 'external_api',
          status: 'new',
          priority: data.priority || 'medium'
        });

        return Response.json(newOpp, { status: 201, headers: corsHeaders });
      }

      case 'search_properties': {
        const query = body.query || '';
        const limit = Math.min(body.limit || 20, 50);

        if (!query) {
          return Response.json(
            { error: 'Search query is required', code: 'MISSING_QUERY' },
            { status: 400, headers: corsHeaders }
          );
        }

        const allProperties = await base44.asServiceRole.entities.Property.list('-created_date');
        const queryLower = query.toLowerCase();

        const matched = allProperties.filter(p => {
          return (
            p.title?.toLowerCase().includes(queryLower) ||
            p.description?.toLowerCase().includes(queryLower) ||
            p.city?.toLowerCase().includes(queryLower) ||
            p.address?.toLowerCase().includes(queryLower) ||
            p.ref_id?.toLowerCase().includes(queryLower)
          );
        }).slice(0, limit);

        const sanitized = matched.map(p => ({
          id: p.id,
          ref_id: p.ref_id,
          title: p.title,
          property_type: p.property_type,
          listing_type: p.listing_type,
          price: p.price,
          city: p.city,
          bedrooms: p.bedrooms,
          images: p.images?.slice(0, 1)
        }));

        return Response.json({
          data: sanitized,
          total: sanitized.length
        }, { headers: corsHeaders });
      }

      default:
        return Response.json(
          { 
            error: 'Unknown action. Available actions: docs, list_properties, get_property, list_opportunities, get_opportunity, create_opportunity, search_properties',
            code: 'UNKNOWN_ACTION'
          },
          { status: 400, headers: corsHeaders }
        );
    }

  } catch (error) {
    console.error('API Error:', error);
    return Response.json(
      { error: error.message || 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500, headers: corsHeaders }
    );
  }
});