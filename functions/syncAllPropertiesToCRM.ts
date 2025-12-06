import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { integration_id } = await req.json();

    // Buscar integração
    const integrations = await base44.asServiceRole.entities.CRMIntegration.filter({ id: integration_id });
    if (integrations.length === 0) {
      return Response.json({ error: 'Integração não encontrada' }, { status: 404 });
    }
    const integration = integrations[0];

    // Buscar todos os imóveis ativos
    const properties = await base44.asServiceRole.entities.Property.filter({ status: 'active' });

    let synced = 0;
    const errors = [];

    for (const property of properties) {
      try {
        // Mapear campos
        const mappedData = {};
        for (const [appField, crmField] of Object.entries(integration.field_mapping || {})) {
          if (property[appField] !== undefined) {
            mappedData[crmField] = property[appField];
          }
        }

        let response;

        // Enviar para CRM específico
        if (integration.crm_type === 'salesforce') {
          response = await fetch(`${integration.api_url}/services/data/v57.0/sobjects/Property__c`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${integration.api_key}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(mappedData)
          });
        } else if (integration.crm_type === 'hubspot') {
          response = await fetch('https://api.hubapi.com/crm/v3/objects/deals', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${integration.api_key}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ properties: mappedData })
          });
        } else if (integration.crm_type === 'pipedrive') {
          response = await fetch(`${integration.api_url}/v1/deals?api_token=${integration.api_key}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(mappedData)
          });
        } else if (integration.crm_type === 'custom' && integration.api_url) {
          response = await fetch(integration.api_url, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${integration.api_key}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(mappedData)
          });
        }

        const result = await response.json();

        // Criar log
        await base44.asServiceRole.entities.CRMSyncLog.create({
          integration_id: integration.id,
          integration_name: integration.name,
          property_id: property.id,
          property_title: property.title,
          action: 'create',
          status: response.ok ? 'success' : 'error',
          error_message: response.ok ? null : JSON.stringify(result),
          request_data: mappedData,
          response_data: result,
          external_id: result.id || result.data?.id
        });

        if (response.ok) {
          synced++;
        } else {
          errors.push({ property: property.title, error: result });
        }

      } catch (error) {
        errors.push({ property: property.title, error: error.message });
        
        await base44.asServiceRole.entities.CRMSyncLog.create({
          integration_id: integration.id,
          integration_name: integration.name,
          property_id: property.id,
          property_title: property.title,
          action: 'create',
          status: 'error',
          error_message: error.message
        });
      }
    }

    // Atualizar última sincronização
    await base44.asServiceRole.entities.CRMIntegration.update(integration.id, {
      last_sync: new Date().toISOString()
    });

    return Response.json({
      synced,
      total: properties.length,
      errors: errors.length,
      errorDetails: errors.slice(0, 10) // Retornar apenas os primeiros 10 erros
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});