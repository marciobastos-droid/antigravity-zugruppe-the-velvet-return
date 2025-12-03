import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

const FB_ACCESS_TOKEN = Deno.env.get("FB_ACCESS_TOKEN");
const FB_GRAPH_API = "https://graph.facebook.com/v18.0";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can manage campaigns
    const userType = user.user_type?.toLowerCase() || '';
    if (user.role !== 'admin' && userType !== 'admin' && userType !== 'gestor') {
      return Response.json({ error: 'Permissão negada' }, { status: 403 });
    }

    if (!FB_ACCESS_TOKEN) {
      return Response.json({ 
        success: false, 
        error: 'Token do Facebook não configurado. Configure FB_ACCESS_TOKEN nas definições.' 
      });
    }

    const { action, campaign_id } = await req.json();

    if (!action || !campaign_id) {
      return Response.json({ 
        success: false, 
        error: 'Parâmetros em falta: action e campaign_id são obrigatórios' 
      });
    }

    // Validate action
    if (!['pause', 'activate', 'get_status'].includes(action)) {
      return Response.json({ 
        success: false, 
        error: 'Ação inválida. Use: pause, activate ou get_status' 
      });
    }

    // Get current campaign status
    if (action === 'get_status') {
      const response = await fetch(
        `${FB_GRAPH_API}/${campaign_id}?fields=id,name,status,effective_status,objective&access_token=${FB_ACCESS_TOKEN}`
      );
      
      const data = await response.json();
      
      if (data.error) {
        return Response.json({ 
          success: false, 
          error: data.error.message || 'Erro ao obter estado da campanha'
        });
      }

      return Response.json({
        success: true,
        campaign: data
      });
    }

    // Pause or activate campaign
    const newStatus = action === 'pause' ? 'PAUSED' : 'ACTIVE';
    
    const response = await fetch(
      `${FB_GRAPH_API}/${campaign_id}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          status: newStatus,
          access_token: FB_ACCESS_TOKEN
        })
      }
    );

    const data = await response.json();

    if (data.error) {
      console.error('Facebook API Error:', data.error);
      return Response.json({ 
        success: false, 
        error: data.error.message || 'Erro ao atualizar campanha',
        error_code: data.error.code
      });
    }

    // Log the action
    console.log(`Campaign ${campaign_id} ${action}d by ${user.email}`);

    return Response.json({
      success: true,
      message: action === 'pause' 
        ? 'Campanha suspensa com sucesso' 
        : 'Campanha reativada com sucesso',
      campaign_id,
      new_status: newStatus
    });

  } catch (error) {
    console.error('manageFacebookCampaign error:', error);
    return Response.json({ 
      success: false,
      error: error.message || 'Erro ao processar pedido'
    });
  }
});