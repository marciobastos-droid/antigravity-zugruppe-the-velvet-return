import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { propertyId } = await req.json();

        if (!propertyId) {
            return Response.json({ error: 'propertyId required' }, { status: 400 });
        }

        // Buscar o imóvel
        const properties = await base44.entities.Property.list();
        const property = properties.find(p => p.id === propertyId);

        if (!property) {
            return Response.json({ error: 'Property not found' }, { status: 404 });
        }

        // Preparar contexto para o LLM
        const propertyContext = `
REF: ${property.ref_id || 'N/A'}
Título: ${property.title || 'N/A'}
Tipo: ${property.property_type || 'N/A'}
Negócio: ${property.listing_type === 'sale' ? 'Venda' : 'Arrendamento'}
Localização: ${property.city}, ${property.state}, ${property.country || 'Portugal'}
${property.address ? `Morada: ${property.address}` : ''}
Preço: ${property.currency || '€'}${property.price?.toLocaleString()}${property.listing_type === 'rent' ? '/mês' : ''}
Quartos: ${property.bedrooms || 'N/A'}
Casas de banho: ${property.bathrooms || 'N/A'}
Área útil: ${property.useful_area || property.square_feet || 'N/A'} m²
Área bruta: ${property.gross_area || 'N/A'} m²
Ano de construção: ${property.year_built || 'N/A'}
${property.year_renovated ? `Renovado: ${property.year_renovated}` : ''}
Certificado energético: ${property.energy_certificate || 'N/A'}
Garagem: ${property.garage || 'N/A'}
${property.amenities?.length > 0 ? `Comodidades: ${property.amenities.join(', ')}` : ''}
${property.description ? `Descrição: ${property.description.substring(0, 200)}...` : ''}
${property.tags?.length > 0 ? `Tags atuais: ${property.tags.join(', ')}` : ''}
        `.trim();

        const prompt = `És um especialista em SEO imobiliário e marketing digital. Analisa o seguinte imóvel e gera:

1. **Tags/Palavras-chave** (15-20 tags relevantes):
   - Inclui localização (cidade, distrito, país)
   - Tipo de imóvel e características principais
   - Preço/faixa de preço
   - Público-alvo (família, investidor, executivo, etc.)
   - Estilo/categoria (luxo, moderno, tradicional, etc.)
   - Comodidades únicas
   - Termos de pesquisa populares

2. **Meta Title SEO** (50-60 caracteres):
   - Otimizado para motores de busca
   - Inclui localização e tipo
   - Atrativo para cliques

3. **Meta Description SEO** (150-160 caracteres):
   - Resumo conciso e persuasivo
   - Inclui call-to-action
   - Otimizado para Google

4. **Keywords para Anúncios** (10-15 keywords):
   - Termos específicos para Google Ads / Facebook Ads
   - Long-tail keywords
   - Variações de pesquisa

5. **Hashtags para Redes Sociais** (10-15 hashtags):
   - Para Instagram, Facebook, LinkedIn
   - Mix de populares e nicho
   - Em português e inglês

Informações do imóvel:
${propertyContext}

Retorna a resposta em formato JSON com esta estrutura EXATA:
{
  "tags": ["tag1", "tag2", ...],
  "meta_title": "Título SEO aqui",
  "meta_description": "Descrição SEO aqui",
  "ad_keywords": ["keyword1", "keyword2", ...],
  "social_hashtags": ["#hashtag1", "#hashtag2", ...]
}

IMPORTANTE: Retorna APENAS o JSON válido, sem texto adicional antes ou depois.`;

        const result = await base44.integrations.Core.InvokeLLM({
            prompt: prompt,
            response_json_schema: {
                type: "object",
                properties: {
                    tags: {
                        type: "array",
                        items: { type: "string" }
                    },
                    meta_title: {
                        type: "string"
                    },
                    meta_description: {
                        type: "string"
                    },
                    ad_keywords: {
                        type: "array",
                        items: { type: "string" }
                    },
                    social_hashtags: {
                        type: "array",
                        items: { type: "string" }
                    }
                }
            }
        });

        // Validar resposta
        if (!result || !result.tags || !Array.isArray(result.tags)) {
            throw new Error('Resposta da IA inválida ou incompleta');
        }

        return Response.json({
            success: true,
            seo_data: {
                tags: result.tags,
                meta_title: result.meta_title || '',
                meta_description: result.meta_description || '',
                ad_keywords: result.ad_keywords || [],
                social_hashtags: result.social_hashtags || []
            }
        });

    } catch (error) {
        console.error('Error generating SEO tags and keywords:', error);
        return Response.json({ 
            error: error.message,
            success: false 
        }, { status: 500 });
    }
});