import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { property_id, action = 'create' } = await req.json();

    // Buscar imóvel
    const properties = await base44.asServiceRole.entities.Property.filter({ id: property_id });
    if (properties.length === 0) {
      return Response.json({ error: 'Imóvel não encontrado' }, { status: 404 });
    }
    const property = properties[0];

    // Buscar integrações ativas
    const integrations = await base44.asServiceRole.entities.CRMIntegration.filter({ is_active: true });

    const results = [];

    for (const integration of integrations) {
      // Verificar se deve sincronizar baseado na ação
      if (action === 'create' && !integration.sync_on_create) continue;
      if (action === 'update' && !integration.sync_on_update) continue;

      try {
        // Mapear campos
        const mappedData = {};
        for (const [appField, crmField] of Object.entries(integration.field_mapping || {})) {
          if (property[appField] !== undefined) {
            mappedData[crmField] = property[appField];
          }
        }

        let syncResult;

        // Enviar para CRM específico
        if (integration.crm_type === 'salesforce') {
          const endpoint = `${integration.api_url}/services/data/v57.0/sobjects/Property__c`;
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${integration.api_key}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(mappedData)
          });

          const result = await response.json();
          syncResult = {
            success: response.ok,
            external_id: result.id,
            response: result
          };

        } else if (integration.crm_type === 'hubspot') {
          const response = await fetch('https://api.hubapi.com/crm/v3/objects/deals', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${integration.api_key}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ properties: mappedData })
          });

          const result = await response.json();
          syncResult = {
            success: response.ok,
            external_id: result.id,
            response: result
          };

        } else if (integration.crm_type === 'pipedrive') {
          const response = await fetch(`${integration.api_url}/v1/deals?api_token=${integration.api_key}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(mappedData)
          });

          const result = await response.json();
          syncResult = {
            success: result.success,
            external_id: result.data?.id,
            response: result
          };

        } else if (integration.crm_type === 'custom' && integration.api_url) {
          const response = await fetch(integration.api_url, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${integration.api_key}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(mappedData)
          });

          const result = await response.json();
          syncResult = {
            success: response.ok,
            external_id: result.id || result._id,
            response: result
          };
        }

        // Criar log
        await base44.asServiceRole.entities.CRMSyncLog.create({
          integration_id: integration.id,
          integration_name: integration.name,
          property_id: property.id,
          property_title: property.title,
          action,
          status: syncResult.success ? 'success' : 'error',
          error_message: syncResult.success ? null : JSON.stringify(syncResult.response),
          request_data: mappedData,
          response_data: syncResult.response,
          external_id: syncResult.external_id
        });

        results.push({
          integration: integration.name,
          success: syncResult.success,
          external_id: syncResult.external_id
        });

        // Atualizar última sincronização
        await base44.asServiceRole.entities.CRMIntegration.update(integration.id, {
          last_sync: new Date().toISOString()
        });

      } catch (error) {
        // Log de erro
        await base44.asServiceRole.entities.CRMSyncLog.create({
          integration_id: integration.id,
          integration_name: integration.name,
          property_id: property.id,
          property_title: property.title,
          action,
          status: 'error',
          error_message: error.message
        });

        results.push({
          integration: integration.name,
          success: false,
          error: error.message
        });
      }
    }

    return Response.json({ results, synced: results.filter(r => r.success).length });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});