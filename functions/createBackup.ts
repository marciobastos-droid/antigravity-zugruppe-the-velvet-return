import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin only' }, { status: 401 });
    }

    const { entities, backupType = 'manual', notes = '' } = await req.json();

    const entitiesToBackup = entities || [
      'ClientContact',
      'Opportunity', 
      'Property',
      'BuyerProfile',
      'Contract',
      'LeaseAgreement',
      'Appointment'
    ];

    const backups = [];

    for (const entityName of entitiesToBackup) {
      try {
        // Fetch all records
        const records = await base44.asServiceRole.entities[entityName].list();
        
        if (records.length === 0) continue;

        // Convert to JSON string
        const backupData = JSON.stringify(records);
        const backupSizeBytes = new Blob([backupData]).size;

        // Create backup record
        const backup = await base44.asServiceRole.entities.DataBackup.create({
          backup_type: backupType,
          entity_name: entityName,
          records_count: records.length,
          backup_data: backupData,
          backup_size_bytes: backupSizeBytes,
          created_by: user.email,
          notes: notes
        });

        backups.push({
          entity: entityName,
          records: records.length,
          size: backupSizeBytes,
          id: backup.id
        });
      } catch (error) {
        console.error(`Error backing up ${entityName}:`, error);
        backups.push({
          entity: entityName,
          error: error.message
        });
      }
    }

    // Clean old backups (keep last 30)
    try {
      const allBackups = await base44.asServiceRole.entities.DataBackup.list('-created_date');
      if (allBackups.length > 30) {
        const toDelete = allBackups.slice(30);
        for (const old of toDelete) {
          await base44.asServiceRole.entities.DataBackup.delete(old.id);
        }
      }
    } catch (error) {
      console.error('Error cleaning old backups:', error);
    }

    return Response.json({ 
      success: true,
      backups,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error creating backup:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});