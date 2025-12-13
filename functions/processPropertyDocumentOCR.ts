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
                    description: "Type of property (apartment, house, land, etc)"
                },
                listing_type: {
                    type: "string",
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

        // Extract data from PDF using OCR
        const extractionResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
            file_url: file_url,
            json_schema: propertySchema
        });

        if (extractionResult.status === 'error') {
            return Response.json({
                success: false,
                error: extractionResult.details,
                ocr_processed: false
            });
        }

        const extractedData = extractionResult.output;

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