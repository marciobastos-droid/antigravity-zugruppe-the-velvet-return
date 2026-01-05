import axios from 'npm:axios@1.6.0';

Deno.serve(async (req) => {
  try {
    // Parse do payload enviado pelo frontend
    const payload = await req.json();
    
    const {
      adAccountId,      // ID da Conta de Anúncios (ex: act_123456789)
      adsetId,          // ID do Conjunto de Anúncios (AdSet)
      pageId,           // ID da Página do Facebook da Zuhaus
      instagramActorId, // (Opcional) ID do Instagram
      imageHash,        // Hash da imagem já enviada para o Facebook
      propertyRef,      // Referência do imóvel (ex: ZH-123)
      message,          // Texto do anúncio
      link              // Link para o imóvel no site
    } = payload;

    // Validação dos campos obrigatórios
    if (!adAccountId || !adsetId || !pageId || !imageHash || !propertyRef || !message || !link) {
      return Response.json(
        { 
          success: false, 
          error: 'Campos obrigatórios em falta: adAccountId, adsetId, pageId, imageHash, propertyRef, message, link' 
        },
        { status: 400 }
      );
    }

    // Obter o token de acesso das variáveis de ambiente
    const accessToken = Deno.env.get('FB_ACCESS_TOKEN');
    
    if (!accessToken) {
      return Response.json(
        { 
          success: false, 
          error: 'FB_ACCESS_TOKEN não está configurado nas variáveis de ambiente' 
        },
        { status: 500 }
      );
    }

    // URL da API do Facebook (Versão v21.0 - verifique a versão mais recente)
    const url = `https://graph.facebook.com/v21.0/${adAccountId}/ads`;

    // Construção do payload para a Meta API
    const metaPayload = {
      name: `Ad Imóvel ${propertyRef} - Auto-Generated`,
      adset_id: adsetId,
      creative: {
        object_story_spec: {
          page_id: pageId,
          // Se tiver ID do Instagram, adiciona ao payload
          ...(instagramActorId && { instagram_actor_id: instagramActorId }),
          link_data: {
            call_to_action: {
              type: "LEARN_MORE" // Opções: LEARN_MORE, CONTACT_US, SIGN_UP, APPLY_NOW
            },
            image_hash: imageHash,
            message: message,
            link: link,
            caption: "www.zuhaus.pt",
            multi_share_end_card: false
          }
        }
      },
      status: "PAUSED" // Criado pausado para revisão da equipa
    };

    // Execução do pedido POST para a Meta API
    const response = await axios.post(url, metaPayload, {
      params: {
        access_token: accessToken
      },
      headers: {
        "Content-Type": "application/json"
      }
    });

    // Retorno de sucesso
    return Response.json({
      success: true,
      adId: response.data.id,
      adName: `Ad Imóvel ${propertyRef} - Auto-Generated`,
      status: "PAUSED",
      message: "Anúncio criado com sucesso! Status: PAUSADO (aguarda revisão)",
      data: response.data
    });

  } catch (error) {
    // Log do erro completo no servidor
    console.error("Erro ao criar anúncio Meta:", error);
    
    // Tratamento de erros específicos da Meta API
    if (error.response?.data) {
      const metaError = error.response.data.error;
      return Response.json({
        success: false,
        error: metaError?.message || "Erro na Meta API",
        errorCode: metaError?.code,
        errorType: metaError?.type,
        details: metaError
      }, { status: error.response.status || 500 });
    }
    
    // Erro genérico
    return Response.json({
      success: false,
      error: error.message || "Erro desconhecido ao criar anúncio",
      details: error.toString()
    }, { status: 500 });
  }
});