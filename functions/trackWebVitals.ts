import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Endpoint para receber e armazenar métricas de Web Vitals
 * Permite análise de performance e identificação de problemas
 */
Deno.serve(async (req) => {
  // Aceitar apenas POST
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const data = await req.json();

    // Validar dados
    if (!data.name || data.value === undefined) {
      return Response.json({ error: 'Invalid data' }, { status: 400 });
    }

    // Obter informações do usuário (opcional - não falha se não autenticado)
    let userEmail = null;
    try {
      const user = await base44.auth.me();
      userEmail = user?.email;
    } catch {
      // Visitante anônimo
    }

    // Armazenar métrica (exemplo - pode ser enviado para serviço externo)
    console.log('[Web Vitals]', {
      metric: data.name,
      value: data.value,
      rating: data.rating,
      url: data.url,
      user: userEmail,
      timestamp: data.timestamp
    });

    // Opcional: Enviar para serviço de analytics
    // await fetch('https://analytics.example.com/vitals', {
    //   method: 'POST',
    //   body: JSON.stringify({ ...data, user: userEmail })
    // });

    return Response.json({ 
      success: true,
      message: 'Metric received'
    }, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store'
      }
    });

  } catch (error) {
    console.error('[Web Vitals] Error:', error);
    return Response.json({ 
      error: 'Internal server error',
      message: error.message 
    }, { status: 500 });
  }
});