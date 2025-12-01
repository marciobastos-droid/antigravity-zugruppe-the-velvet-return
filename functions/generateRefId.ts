import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { entity_type, count = 1 } = await req.json();

    if (!entity_type || !['Property', 'ClientContact', 'Opportunity'].includes(entity_type)) {
      return Response.json({ error: 'Invalid entity_type' }, { status: 400 });
    }

    const prefixes = {
      Property: 'ZU',
      ClientContact: 'CLI',
      Opportunity: 'OPO'
    };

    const prefix = prefixes[entity_type];

    // Get all existing records to find the highest ref_id
    let allRecords = [];
    if (entity_type === 'Property') {
      allRecords = await base44.asServiceRole.entities.Property.list();
    } else if (entity_type === 'ClientContact') {
      allRecords = await base44.asServiceRole.entities.ClientContact.list();
    } else if (entity_type === 'Opportunity') {
      allRecords = await base44.asServiceRole.entities.Opportunity.list();
    }

    // Find the highest number from existing ref_ids
    let maxNumber = 0;
    const regex = new RegExp(`^${prefix}-(\\d+)$`);
    
    for (const record of allRecords) {
      if (record.ref_id) {
        const match = record.ref_id.match(regex);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNumber) {
            maxNumber = num;
          }
        }
      }
    }

    // Generate ref_ids (single or multiple)
    const numToGenerate = Math.min(Math.max(1, parseInt(count) || 1), 100); // Max 100 at a time
    
    if (numToGenerate === 1) {
      // Single ref_id (backwards compatible)
      const nextNumber = maxNumber + 1;
      const ref_id = `${prefix}-${nextNumber.toString().padStart(5, '0')}`;
      return Response.json({ ref_id });
    } else {
      // Multiple ref_ids
      const ref_ids = [];
      for (let i = 1; i <= numToGenerate; i++) {
        const nextNumber = maxNumber + i;
        ref_ids.push(`${prefix}-${nextNumber.toString().padStart(5, '0')}`);
      }
      return Response.json({ ref_ids });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});