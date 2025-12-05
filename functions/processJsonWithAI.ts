import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import OpenAI from 'npm:openai';

const openai = new OpenAI({
    apiKey: Deno.env.get("OPENAI_API_KEY"),
});

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { jsonData, processingType, targetEntity } = await req.json();

        if (!jsonData) {
            return Response.json({ error: 'JSON data is required' }, { status: 400 });
        }

        // Build prompt based on processing type
        let systemPrompt = "És um assistente especializado em processar dados JSON para uma aplicação imobiliária portuguesa.";
        let userPrompt = "";

        switch (processingType) {
            case "extract":
                systemPrompt += " A tua tarefa é extrair dados relevantes do JSON fornecido.";
                userPrompt = `Analisa o seguinte JSON e extrai os dados relevantes para a entidade "${targetEntity}".
                
Para imóveis (Property), extrai: título, descrição, tipo, preço, quartos, casas de banho, área, morada, cidade, código postal.
Para contactos (Contact), extrai: nome, email, telefone, empresa.
Para oportunidades (Opportunity), extrai: nome do contacto, email, telefone, mensagem, origem.

JSON a processar:
${JSON.stringify(jsonData, null, 2)}

Responde APENAS com um JSON válido contendo os dados extraídos num array chamado "items". Cada item deve ter os campos mapeados para os nomes corretos da entidade.`;
                break;

            case "summarize":
                systemPrompt += " A tua tarefa é sumarizar e analisar dados JSON.";
                userPrompt = `Analisa o seguinte JSON e fornece um resumo estruturado:
1. Quantos registos existem
2. Que tipo de dados contém
3. Campos principais identificados
4. Qualidade dos dados (campos em falta, inconsistências)
5. Recomendações para importação

JSON:
${JSON.stringify(jsonData, null, 2)}

Responde com um JSON contendo: { "total_records", "data_type", "fields", "quality_score" (0-100), "issues", "recommendations" }`;
                break;

            case "validate":
                systemPrompt += " A tua tarefa é validar e verificar a consistência dos dados JSON.";
                userPrompt = `Valida o seguinte JSON para importação como "${targetEntity}":
1. Verifica se os campos obrigatórios existem
2. Identifica valores inválidos ou suspeitos
3. Verifica formatação de emails, telefones, preços
4. Identifica duplicados potenciais

JSON:
${JSON.stringify(jsonData, null, 2)}

Responde com JSON: { "is_valid", "errors", "warnings", "suggestions", "valid_records", "invalid_records" }`;
                break;

            case "categorize":
                systemPrompt += " A tua tarefa é categorizar e classificar dados JSON.";
                userPrompt = `Categoriza os registos do seguinte JSON:
- Para imóveis: classifica por tipo (apartamento, moradia, terreno, etc.), gama de preço (económico, médio, luxo), localização
- Para contactos: classifica por tipo (comprador, vendedor, parceiro), prioridade
- Para oportunidades: classifica por estado, urgência, potencial

JSON:
${JSON.stringify(jsonData, null, 2)}

Responde com JSON contendo os itens categorizados com campos adicionais de classificação.`;
                break;

            case "enrich":
                systemPrompt += " A tua tarefa é enriquecer dados JSON com informação adicional.";
                userPrompt = `Enriquece o seguinte JSON com informação adicional:
- Normaliza nomes de cidades e distritos portugueses
- Sugere tags relevantes
- Calcula campos derivados (ex: preço por m²)
- Padroniza formatos (telefones, códigos postais)

JSON:
${JSON.stringify(jsonData, null, 2)}

Responde com o JSON enriquecido mantendo a estrutura original mas com campos adicionais.`;
                break;

            default:
                userPrompt = `Processa o seguinte JSON e extrai informação útil:
${JSON.stringify(jsonData, null, 2)}`;
        }

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            response_format: { type: "json_object" },
            temperature: 0.3,
        });

        const result = JSON.parse(response.choices[0].message.content);

        return Response.json({
            success: true,
            processingType,
            targetEntity,
            result
        });

    } catch (error) {
        console.error("Error processing JSON:", error);
        return Response.json({ 
            error: error.message,
            success: false 
        }, { status: 500 });
    }
});