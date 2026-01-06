import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  // Allow CORS for external website calls
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });
  }

  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    console.log('[trackSiteVisit] Received payload:', payload);

    // Extract data from payload
    const {
      pagina_visitada,
      pais,
      cidade,
      fonte_origem,
      dispositivo,
      navegador,
      idioma,
      referrer,
      user_agent,
      duracao_sessao
    } = payload;

    // Get IP address from request headers
    const ip_address = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                       req.headers.get('x-real-ip') || 
                       'unknown';

    // Create analytics record with service role (public endpoint)
    const analyticsData = {
      data_registro: new Date().toISOString(),
      pagina_visitada: pagina_visitada || 'unknown',
      pais: pais || 'Unknown',
      cidade: cidade || 'Unknown',
      fonte_origem: fonte_origem || 'Direct',
      dispositivo: dispositivo || 'Desktop',
      navegador: navegador || 'Unknown',
      idioma: idioma || 'pt',
      referrer: referrer || '',
      ip_address,
      user_agent: user_agent || '',
      duracao_sessao: duracao_sessao || 0
    };

    await base44.asServiceRole.entities.SiteAnalytics.create(analyticsData);

    console.log('[trackSiteVisit] Analytics recorded successfully');

    return new Response(
      JSON.stringify({ success: true, message: 'Visit tracked' }), 
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );

  } catch (error) {
    console.error('[trackSiteVisit] Error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }), 
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  }
});