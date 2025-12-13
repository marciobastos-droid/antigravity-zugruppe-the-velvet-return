import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { file_url, document_id, property_id } = await req.json();

        if (!file_url) {
            return Response.json({ error: 'Missing file_url' }, { status: 400 });
        }

        // Schema for property data extraction
        const propertySchema = {
            type: "object",
            properties: {
                suggested_filename: {
                    type: "string",
                    description: "Nome sugerido para o ficheiro baseado no conteúdo e tipo (ex: 'Certificado Energético - Rua X Lisboa', 'CPCV - João Silva')"
                },
                document_type: { 
                    type: "string",
                    enum: ["deed", "energy_certificate", "building_permit", "cpcv", "lease_agreement", 
                           "insurance", "tax_document", "floor_plan", "inspection_report", "appraisal",
                           "invoice", "contract", "proposal", "brochure", "technical_specs", "other"],
                    description: "Tipo de documento identificado"
                },
                expiry_date: {
                    type: "string",
                    description: "Data de validade/expiração do documento no formato YYYY-MM-DD se aplicável (certificados, licenças, seguros)"
                },
                address: {
                    type: "string",
                    description: "Complete property address"
                },
                city: {
                    type: "string",
                    description: "City or municipality"
                },
                state: {
                    type: "string",
                    description: "District or state"
                },
                zip_code: {
                    type: "string",
                    description: "Postal code"
                },
                price: {
                    type: "number",
                    description: "Property price in euros"
                },
                bedrooms: {
                    type: "number",
                    description: "Number of bedrooms"
                },
                bathrooms: {
                    type: "number",
                    description: "Number of bathrooms"
                },
                gross_area: {
                    type: "number",
                    description: "Gross area in square meters"
                },
                useful_area: {
                    type: "number",
                    description: "Useful/living area in square meters"
                },
                property_type: {
                    type: "string",
                    enum: ["apartment", "house", "land", "building", "farm", "store", "warehouse", "office", "hotel", "shop"],
                    description: "Type of property"
                },
                listing_type: {
                    type: "string",
                    enum: ["sale", "rent"],
                    description: "Sale or rent"
                },
                year_built: {
                    type: "number",
                    description: "Year of construction"
                },
                energy_certificate: {
                    type: "string",
                    description: "Energy certificate rating (A+, A, B, C, D, E, F)"
                },
                owner_name: {
                    type: "string",
                    description: "Property owner name"
                },
                owner_nif: {
                    type: "string",
                    description: "Owner tax identification number (NIF)"
                },
                owner_phone: {
                    type: "string",
                    description: "Owner phone number"
                },
                owner_email: {
                    type: "string",
                    description: "Owner email address"
                },
                key_entities: {
                    type: "array",
                    items: { type: "string" },
                    description: "Important entities mentioned (names, companies, notaries)"
                },
                important_dates: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            date: { type: "string" },
                            description: { type: "string" }
                        }
                    },
                    description: "Important dates found in document"
                },
                description: {
                    type: "string",
                    description: "Property description if available"
                },
                amenities: {
                    type: "array",
                    items: { type: "string" },
                    description: "Amenities mentioned (garage, pool, garden, etc)"
                }
            }
        };

        // Fetch raw text first for better AI analysis
        let rawText = "";
        try {
            const fileResponse = await fetch(file_url);
            if (fileResponse.ok) {
                const arrayBuffer = await fileResponse.arrayBuffer();
                // For PDFs, extract with OCR
                const extractResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
                    file_url: file_url,
                    json_schema: { 
                        type: "object", 
                        properties: { 
                            text: { type: "string", description: "Full text content" } 
                        } 
                    }
                });
                rawText = extractResult.output?.text || "";
            }
        } catch (e) {
            console.error("Error extracting raw text:", e);
        }

        // Enhanced AI-powered extraction with smarter prompts
        const extractedData = await base44.integrations.Core.InvokeLLM({
            prompt: `Analisa este documento relacionado com imóveis e extrai informações estruturadas.

DOCUMENTO: "${rawText.substring(0, 5000)}"

INSTRUÇÕES:
1. Identifica que tipo de documento é (escritura, CPCV, certificado energético, licença, avaliação, etc.)
2. Sugere um NOME DESCRITIVO para o ficheiro baseado no tipo e conteúdo (ex: "Certificado Energético - Rua X Lisboa", "CPCV - João Silva")
3. Se for certificado energético, licença, seguro ou similar, extrai a DATA DE VALIDADE (formato YYYY-MM-DD)
4. Extrai nomes de pessoas/empresas mencionadas (key_entities)
5. Identifica datas importantes com contexto (ex: assinatura, escritura, validade)
6. Extrai informações do imóvel se disponíveis (morada, área, quartos, preço, etc.)
7. Faz um resumo conciso do documento`,
            response_json_schema: propertySchema
        });

        // Update document with OCR data
        if (document_id) {
            await base44.asServiceRole.entities.PropertyDocument.update(document_id, {
                ocr_processed: true,
                ocr_data: {
                    key_entities: extractedData.key_entities || [],
                    important_dates: extractedData.important_dates || [],
                    detected_fields: extractedData,
                    processed_at: new Date().toISOString()
                }
            });
        }

        // If property_id provided, update property fields with extracted data
        if (property_id && extractedData) {
            const updateData = {};
            
            // Only update fields that were successfully extracted and are not empty
            if (extractedData.address) updateData.address = extractedData.address;
            if (extractedData.city) updateData.city = extractedData.city;
            if (extractedData.state) updateData.state = extractedData.state;
            if (extractedData.zip_code) updateData.zip_code = extractedData.zip_code;
            if (extractedData.price) updateData.price = extractedData.price;
            if (extractedData.bedrooms) updateData.bedrooms = extractedData.bedrooms;
            if (extractedData.bathrooms) updateData.bathrooms = extractedData.bathrooms;
            if (extractedData.gross_area) updateData.gross_area = extractedData.gross_area;
            if (extractedData.useful_area) updateData.useful_area = extractedData.useful_area;
            if (extractedData.property_type) updateData.property_type = extractedData.property_type;
            if (extractedData.listing_type) updateData.listing_type = extractedData.listing_type;
            if (extractedData.year_built) updateData.year_built = extractedData.year_built;
            if (extractedData.energy_certificate) updateData.energy_certificate = extractedData.energy_certificate;
            if (extractedData.owner_name) updateData.owner_name = extractedData.owner_name;
            if (extractedData.owner_nif) updateData.owner_nif = extractedData.owner_nif;
            if (extractedData.owner_phone) updateData.owner_phone = extractedData.owner_phone;
            if (extractedData.owner_email) updateData.owner_email = extractedData.owner_email;
            if (extractedData.description) updateData.description = extractedData.description;
            if (extractedData.amenities && extractedData.amenities.length > 0) {
                updateData.amenities = extractedData.amenities;
            }

            // Update property if there's data to update
            if (Object.keys(updateData).length > 0) {
                await base44.asServiceRole.entities.Property.update(property_id, updateData);
            }
        }

        return Response.json({
            success: true,
            ocr_processed: true,
            extracted_data: extractedData,
            fields_updated: property_id ? Object.keys(extractedData).filter(k => extractedData[k]) : []
        });

    } catch (error) {
        console.error("Error processing document OCR:", error);
        return Response.json({ 
            success: false,
            error: error.message,
            ocr_processed: false
        }, { status: 500 });
    }
});