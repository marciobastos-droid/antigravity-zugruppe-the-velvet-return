import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const file_url = body.file_url;

        if (!file_url) {
            return Response.json({ error: 'Missing file_url' }, { status: 400 });
        }

        console.log("Processing OCR for file:", file_url);

        // Extract property and contact data
        const extractedData = await base44.integrations.Core.InvokeLLM({
            prompt: `Analisa este documento PDF e extrai TODAS as informações de imóveis e contactos que encontrares.

INSTRUÇÕES CRÍTICAS:
1. Extrai dados de TODOS os imóveis mencionados no documento
2. Extrai dados de TODOS os contactos/pessoas/empresas mencionados
3. Identifica se é um documento de angariação, avaliação, proposta, contrato, etc.
4. Extrai preços, áreas, características técnicas, datas importantes

FORMATO DE SAÍDA:
Retorna um objeto JSON com:
{
    "document_type": "tipo do documento (avaliação/proposta/contrato/angariação/outro)",
    "properties": [array de imóveis encontrados com todos os campos possíveis],
    "contacts": [array de contactos encontrados],
    "important_dates": [array de datas relevantes],
    "summary": "resumo breve do documento"
}

CAMPOS DE IMÓVEL (extrai todos que encontrares):
- title, address, city, state, country, zip_code
- property_type, listing_type, price, currency
- bedrooms, bathrooms, gross_area, useful_area, balcony_area, garage_area
- floor, front_count, garage, sun_exposure, energy_certificate
- year_built, construction_date, finishes
- description, amenities (array)
- owner_name, owner_email, owner_phone, owner_nif

CAMPOS DE CONTACTO (extrai todos que encontrares):
- full_name, email, phone, nif
- company_name (se for empresa)
- role (proprietário/vendedor/comprador/mediador/notário/outro)
- address, notes

Se não encontrares algum campo, não o incluas.`,
            file_urls: [file_url],
            response_json_schema: {
                type: "object",
                properties: {
                    document_type: { type: "string" },
                    properties: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                title: { type: "string" },
                                address: { type: "string" },
                                city: { type: "string" },
                                state: { type: "string" },
                                country: { type: "string" },
                                zip_code: { type: "string" },
                                property_type: { type: "string" },
                                listing_type: { type: "string" },
                                price: { type: "number" },
                                currency: { type: "string" },
                                bedrooms: { type: "number" },
                                bathrooms: { type: "number" },
                                gross_area: { type: "number" },
                                useful_area: { type: "number" },
                                balcony_area: { type: "number" },
                                garage_area: { type: "number" },
                                floor: { type: "string" },
                                front_count: { type: "number" },
                                garage: { type: "string" },
                                sun_exposure: { type: "string" },
                                energy_certificate: { type: "string" },
                                year_built: { type: "number" },
                                construction_date: { type: "string" },
                                finishes: { type: "string" },
                                description: { type: "string" },
                                amenities: { type: "array", items: { type: "string" } },
                                owner_name: { type: "string" },
                                owner_email: { type: "string" },
                                owner_phone: { type: "string" },
                                owner_nif: { type: "string" }
                            }
                        }
                    },
                    contacts: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                full_name: { type: "string" },
                                email: { type: "string" },
                                phone: { type: "string" },
                                nif: { type: "string" },
                                company_name: { type: "string" },
                                role: { type: "string" },
                                address: { type: "string" },
                                notes: { type: "string" }
                            }
                        }
                    },
                    important_dates: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                date: { type: "string" },
                                description: { type: "string" }
                            }
                        }
                    },
                    summary: { type: "string" }
                }
            }
        });

        return Response.json({
            success: true,
            data: extractedData,
            properties_found: extractedData.properties?.length || 0,
            contacts_found: extractedData.contacts?.length || 0
        });

    } catch (error) {
        console.error("Error processing OCR document:", error);
        console.error("Error stack:", error.stack);
        return Response.json({ 
            success: false,
            error: error.message || "Erro desconhecido ao processar documento"
        }, { status: 500 });
    }
});