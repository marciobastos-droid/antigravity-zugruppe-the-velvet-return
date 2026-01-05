import axios from 'npm:axios@1.6.0';

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    
    const {
      property,      // Objeto do imóvel completo
      imageUrl,      // URL da imagem original
      adCopy,        // Texto do anúncio
      audience,      // ID do público-alvo
      budget,        // Orçamento diário em EUR
      duration,      // Duração em dias
      link           // Link para o imóvel
    } = payload;

    // Validações
    if (!property || !imageUrl || !adCopy || !audience || !budget || !link) {
      return Response.json({
        success: false,
        error: 'Campos obrigatórios em falta'
      }, { status: 400 });
    }

    // Validar link zuhaus.pt
    if (!link.startsWith('https://zuhaus.pt/')) {
      return Response.json({
        success: false,
        error: 'Link inválido - deve começar com https://zuhaus.pt/'
      }, { status: 400 });
    }

    // Obter token
    const accessToken = Deno.env.get('FB_ACCESS_TOKEN');
    if (!accessToken) {
      return Response.json({
        success: false,
        error: 'FB_ACCESS_TOKEN não configurado'
      }, { status: 500 });
    }

    // IDs da conta (substitua pelos seus valores reais)
    const AD_ACCOUNT_ID = 'act_YOUR_AD_ACCOUNT_ID'; // TODO: Configurar
    const PAGE_ID = 'YOUR_PAGE_ID'; // TODO: Configurar
    
    console.log('🚀 Iniciando criação de campanha Meta...');

    // PASSO 1: Otimizar e fazer upload da imagem
    console.log('📸 Processando imagem...');
    const imageResponse = await axios.post(
      `https://graph.facebook.com/v21.0/${AD_ACCOUNT_ID}/adimages`,
      { url: imageUrl },
      { params: { access_token: accessToken } }
    );

    const imageHash = Object.values(imageResponse.data.images)[0]?.hash;
    if (!imageHash) {
      throw new Error('Falha ao obter hash da imagem');
    }
    console.log('✅ Imagem processada:', imageHash);

    // PASSO 2: Criar Campaign
    console.log('📋 Criando campanha...');
    const campaignResponse = await axios.post(
      `https://graph.facebook.com/v21.0/${AD_ACCOUNT_ID}/campaigns`,
      {
        name: `Zuhaus - ${property.ref_id || property.id} - ${property.title?.substring(0, 30)}`,
        objective: 'OUTCOME_LEADS',
        status: 'PAUSED',
        special_ad_categories: ['HOUSING']
      },
      { params: { access_token: accessToken } }
    );
    const campaignId = campaignResponse.data.id;
    console.log('✅ Campanha criada:', campaignId);

    // PASSO 3: Definir targeting baseado no público
    let targeting = {
      geo_locations: {
        countries: ['PT'],
        cities: [{ key: '264328', radius: 20, distance_unit: 'kilometer' }] // Lisboa
      },
      age_min: 25,
      age_max: 65
    };

    if (audience === 'students') {
      targeting.age_min = 18;
      targeting.age_max = 30;
      targeting.interests = [{ id: '6003107902433', name: 'University' }];
    } else if (audience === 'lisboa_renters') {
      targeting.flexible_spec = [{ interests: [{ id: '6003020834693', name: 'Renting' }] }];
    } else if (audience === 'lisboa_buyers') {
      targeting.flexible_spec = [{ interests: [{ id: '6003020834692', name: 'Real estate' }] }];
    }

    // PASSO 4: Criar AdSet
    console.log('🎯 Criando conjunto de anúncios...');
    const endTime = new Date();
    endTime.setDate(endTime.getDate() + duration);
    
    const adsetResponse = await axios.post(
      `https://graph.facebook.com/v21.0/${AD_ACCOUNT_ID}/adsets`,
      {
        name: `AdSet - ${property.ref_id || property.id}`,
        campaign_id: campaignId,
        billing_event: 'IMPRESSIONS',
        optimization_goal: 'LEAD_GENERATION',
        bid_amount: Math.floor(budget * 100), // Centavos
        daily_budget: Math.floor(budget * 100), // Centavos
        targeting: targeting,
        status: 'PAUSED',
        start_time: new Date().toISOString(),
        end_time: endTime.toISOString()
      },
      { params: { access_token: accessToken } }
    );
    const adsetId = adsetResponse.data.id;
    console.log('✅ AdSet criado:', adsetId);

    // PASSO 5: Criar Ad (Anúncio)
    console.log('🎨 Criando anúncio...');
    const adResponse = await axios.post(
      `https://graph.facebook.com/v21.0/${AD_ACCOUNT_ID}/ads`,
      {
        name: `Ad - ${property.ref_id || property.id}`,
        adset_id: adsetId,
        creative: {
          object_story_spec: {
            page_id: PAGE_ID,
            link_data: {
              call_to_action: {
                type: 'LEARN_MORE'
              },
              image_hash: imageHash,
              message: adCopy,
              link: link,
              caption: 'zuhaus.pt'
            }
          }
        },
        status: 'PAUSED'
      },
      { params: { access_token: accessToken } }
    );
    const adId = adResponse.data.id;
    console.log('✅ Anúncio criado:', adId);

    // Retornar sucesso
    return Response.json({
      success: true,
      message: '🎉 Campanha criada com sucesso!',
      data: {
        campaignId,
        adsetId,
        adId,
        imageHash,
        status: 'PAUSED',
        budget: `€${budget}/dia`,
        duration: `${duration} dias`,
        totalBudget: `€${budget * duration}`,
        propertyRef: property.ref_id || property.id,
        audience: audience
      }
    });

  } catch (error) {
    console.error('❌ Erro ao criar campanha Meta:', error);
    
    if (error.response?.data) {
      const metaError = error.response.data.error;
      return Response.json({
        success: false,
        error: metaError?.message || 'Erro na Meta API',
        errorCode: metaError?.code,
        errorType: metaError?.type,
        details: metaError
      }, { status: error.response.status || 500 });
    }
    
    return Response.json({
      success: false,
      error: error.message || 'Erro desconhecido ao criar campanha'
    }, { status: 500 });
  }
});