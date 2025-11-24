import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Limpar configurações do Facebook do utilizador
    await base44.auth.updateMe({ 
      fb_lead_settings: { 
        configured: false, 
        campaigns: [],
        last_sync: {}
      } 
    });

    // Deletar todas as leads do Facebook
    const leads = await base44.entities.FacebookLead.filter({});
    for (const lead of leads) {
      await base44.entities.FacebookLead.delete(lead.id);
    }

    return Response.json({
      success: true,
      message: 'Integração resetada com sucesso',
      leads_deleted: leads.length
    });

  } catch (error) {
    console.error('Reset error:', error);
    return Response.json({ 
      error: error.message || 'Internal server error',
      details: error.toString()
    }, { status: 500 });
  }
});