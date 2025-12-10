import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  // Aceitar requisições OPTIONS para CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }

  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    
    const { name, value, rating, delta, id, navigationType, pathname } = body;
    
    // Log as métricas (pode ser enviado para analytics ou guardado em DB)
    console.log('[Web Vitals]', {
      metric: name,
      value: value.toFixed(2),
      rating,
      pathname,
      timestamp: new Date().toISOString()
    });

    // Opcional: Guardar em entidade para análise posterior
    // await base44.asServiceRole.entities.PerformanceMetric.create({
    //   metric_name: name,
    //   metric_value: value,
    //   rating,
    //   pathname,
    //   navigation_type: navigationType
    // });

    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    console.error('[Web Vitals] Error:', error);
    return new Response(null, { status: 204 });
  }
});