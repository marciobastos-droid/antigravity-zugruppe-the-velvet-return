import axios from 'npm:axios@1.6.0';

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    
    const {
      adAccountId,  // ID da Conta de Anúncios (ex: act_123456789)
      imageUrl      // URL da imagem do imóvel
    } = payload;

    // Validação dos campos obrigatórios
    if (!adAccountId || !imageUrl) {
      return Response.json(
        { 
          success: false, 
          error: 'Campos obrigatórios: adAccountId e imageUrl' 
        },
        { status: 400 }
      );
    }

    // Obter o token de acesso
    const accessToken = Deno.env.get('FB_ACCESS_TOKEN');
    
    if (!accessToken) {
      return Response.json(
        { 
          success: false, 
          error: 'FB_ACCESS_TOKEN não configurado' 
        },
        { status: 500 }
      );
    }

    // URL da API para upload de imagens
    const url = `https://graph.facebook.com/v21.0/${adAccountId}/adimages`;

    // Fazer o upload da imagem
    const response = await axios.post(url, {
      url: imageUrl
    }, {
      params: {
        access_token: accessToken
      },
      headers: {
        "Content-Type": "application/json"
      }
    });

    // Extrair o hash da imagem
    const imageData = response.data.images;
    const imageHash = imageData ? Object.values(imageData)[0]?.hash : null;

    if (!imageHash) {
      return Response.json({
        success: false,
        error: 'Falha ao obter hash da imagem',
        data: response.data
      }, { status: 500 });
    }

    return Response.json({
      success: true,
      imageHash: imageHash,
      message: 'Imagem enviada com sucesso para a Meta',
      data: response.data
    });

  } catch (error) {
    console.error("Erro ao fazer upload de imagem:", error);
    
    if (error.response?.data) {
      const metaError = error.response.data.error;
      return Response.json({
        success: false,
        error: metaError?.message || "Erro na Meta API",
        errorCode: metaError?.code,
        details: metaError
      }, { status: error.response.status || 500 });
    }
    
    return Response.json({
      success: false,
      error: error.message || "Erro ao fazer upload da imagem"
    }, { status: 500 });
  }
});