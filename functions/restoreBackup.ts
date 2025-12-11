import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin only' }, { status: 401 });
    }

    const { backupId, restoreMode = 'merge' } = await req.json();

    if (!backupId) {
      return Response.json({ error: 'Backup ID required' }, { status: 400 });
    }

    // Fetch backup
    const backups = await base44.asServiceRole.entities.DataBackup.filter({ id: backupId });
    if (!backups || backups.length === 0) {
      return Response.json({ error: 'Backup not found' }, { status: 404 });
    }

    const backup = backups[0];
    const records = JSON.parse(backup.backup_data);
    const entityName = backup.entity_name;

    let restored = 0;
    let skipped = 0;
    let errors = 0;

    // Get existing records
    const existing = await base44.asServiceRole.entities[entityName].list();
    const existingIds = new Set(existing.map(r => r.id));

    for (const record of records) {
      try {
        if (restoreMode === 'merge') {
          // Only restore if doesn't exist
          if (!existingIds.has(record.id)) {
            const { id, created_date, updated_date, ...data } = record;
            await base44.asServiceRole.entities[entityName].create(data);
            restored++;
          } else {
            skipped++;
          }
        } else if (restoreMode === 'replace') {
          // Delete existing and recreate
          if (existingIds.has(record.id)) {
            await base44.asServiceRole.entities[entityName].delete(record.id);
          }
          const { id, created_date, updated_date, ...data } = record;
          await base44.asServiceRole.entities[entityName].create(data);
          restored++;
        }
      } catch (error) {
        console.error(`Error restoring record:`, error);
        errors++;
      }
    }

    return Response.json({ 
      success: true,
      entityName,
      restored,
      skipped,
      errors,
      total: records.length
    });

  } catch (error) {
    console.error('Error restoring backup:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});