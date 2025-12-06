import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { integration_id } = await req.json();

    const integration = await base44.asServiceRole.entities.CRMIntegration.filter({ id: integration_id });
    
    if (integration.length === 0) {
      return Response.json({ success: false, error: 'Integração não encontrada' });
    }

    const config = integration[0];

    // Testar conexão baseado no tipo de CRM
    let testResult = { success: false, error: 'Tipo de CRM não suportado' };

    if (config.crm_type === 'salesforce') {
      // Teste Salesforce
      const response = await fetch(`${config.api_url}/services/data/v57.0/sobjects`, {
        headers: {
          'Authorization': `Bearer ${config.api_key}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        testResult = { success: true, message: 'Conexão Salesforce OK' };
      } else {
        const error = await response.text();
        testResult = { success: false, error: `Erro Salesforce: ${error}` };
      }
    } else if (config.crm_type === 'hubspot') {
      // Teste HubSpot
      const response = await fetch('https://api.hubapi.com/crm/v3/objects/contacts', {
        headers: {
          'Authorization': `Bearer ${config.api_key}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        testResult = { success: true, message: 'Conexão HubSpot OK' };
      } else {
        const error = await response.text();
        testResult = { success: false, error: `Erro HubSpot: ${error}` };
      }
    } else if (config.crm_type === 'pipedrive') {
      // Teste Pipedrive
      const response = await fetch(`${config.api_url}/v1/deals?api_token=${config.api_key}&limit=1`);

      if (response.ok) {
        testResult = { success: true, message: 'Conexão Pipedrive OK' };
      } else {
        const error = await response.text();
        testResult = { success: false, error: `Erro Pipedrive: ${error}` };
      }
    } else if (config.crm_type === 'custom' && config.api_url) {
      // Teste genérico
      const response = await fetch(config.api_url, {
        headers: {
          'Authorization': `Bearer ${config.api_key}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        testResult = { success: true, message: 'Conexão OK' };
      } else {
        testResult = { success: false, error: `Erro: ${response.status}` };
      }
    }

    return Response.json(testResult);

  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});