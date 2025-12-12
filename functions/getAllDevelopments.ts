import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verificar autenticação
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Buscar todos os empreendimentos
    const developments = await base44.entities.Development.list('name');
    
    return Response.json({ data: developments, success: true });
  } catch (error) {
    console.error('Error fetching developments:', error);
    return Response.json({ 
      error: error.message, 
      success: false 
    }, { status: 500 });
  }
});