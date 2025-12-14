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
            prompt: `Analisa este documento PDF e extrai TODAS as informações de imóveis, contactos e dados de contrato que encontrares.

INSTRUÇÕES CRÍTICAS:
1. Extrai dados de TODOS os imóveis mencionados no documento
2. Extrai dados de TODOS os contactos/pessoas/empresas mencionados
3. Identifica se é um documento de angariação, avaliação, proposta, CPCV, Escritura, etc.
4. Extrai preços, áreas, características técnicas, datas importantes
5. **NOVO**: Se for CPCV ou Escritura, extrai informação estruturada do contrato

FORMATO DE SAÍDA:
Retorna um objeto JSON com:
{
    "document_type": "tipo do documento (cpcv/escritura/avaliação/proposta/contrato/angariação/outro)",
    "properties": [array de imóveis encontrados com todos os campos possíveis],
    "contacts": [array de contactos encontrados],
    "important_dates": [array de datas relevantes],
    "contract_data": {objeto com dados estruturados do contrato - APENAS se for CPCV ou Escritura},
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

**CAMPOS DE CONTRATO** (extrai APENAS se document_type for "cpcv" ou "escritura"):
- document_type: "cpcv" ou "escritura"
- contract_type: "sale", "purchase", ou "lease"
- property_title: título/descrição do imóvel
- property_address: morada completa do imóvel
- contract_value: valor total do contrato/venda
- monthly_value: valor mensal (se arrendamento)
- party_a_name: nome completo da Parte A (Vendedor/Senhorio)
- party_a_email: email da Parte A
- party_a_phone: telefone da Parte A
- party_a_nif: NIF da Parte A
- party_b_name: nome completo da Parte B (Comprador/Inquilino)
- party_b_email: email da Parte B
- party_b_phone: telefone da Parte B
- party_b_nif: NIF da Parte B
- signature_date: data de assinatura do contrato (formato YYYY-MM-DD)
- deed_date: data da escritura (formato YYYY-MM-DD)
- start_date: data de início do contrato
- end_date: data de fim (se arrendamento)
- deposit_amount: valor da caução/sinal
- commission_amount: valor da comissão
- notes: observações relevantes do documento
- deal_name: sugestão de nome para o negócio (ex: "Venda T3 Lisboa - João Silva")

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
                    contract_data: {
                        type: "object",
                        properties: {
                            document_type: { type: "string" },
                            contract_type: { type: "string" },
                            property_title: { type: "string" },
                            property_address: { type: "string" },
                            contract_value: { type: "number" },
                            monthly_value: { type: "number" },
                            party_a_name: { type: "string" },
                            party_a_email: { type: "string" },
                            party_a_phone: { type: "string" },
                            party_a_nif: { type: "string" },
                            party_b_name: { type: "string" },
                            party_b_email: { type: "string" },
                            party_b_phone: { type: "string" },
                            party_b_nif: { type: "string" },
                            signature_date: { type: "string" },
                            deed_date: { type: "string" },
                            start_date: { type: "string" },
                            end_date: { type: "string" },
                            deposit_amount: { type: "number" },
                            commission_amount: { type: "number" },
                            notes: { type: "string" },
                            deal_name: { type: "string" }
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