import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// Simple lock mechanism using timestamps to prevent race conditions
const lockMap = new Map();
const LOCK_TIMEOUT = 5000; // 5 seconds

function acquireLock(entityType) {
  const now = Date.now();
  const existing = lockMap.get(entityType);
  
  // Clean expired lock
  if (existing && (now - existing) > LOCK_TIMEOUT) {
    lockMap.delete(entityType);
  }
  
  if (lockMap.has(entityType)) {
    return false;
  }
  
  lockMap.set(entityType, now);
  return true;
}

function releaseLock(entityType) {
  lockMap.delete(entityType);
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

Deno.serve(async (req) => {
  let entityType = null;
  
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { entity_type, count = 1 } = await req.json();
    entityType = entity_type;

    if (!entity_type || !['Property', 'ClientContact', 'Opportunity'].includes(entity_type)) {
      return Response.json({ error: 'Invalid entity_type' }, { status: 400 });
    }

    const prefixes = {
      Property: 'ZU',
      ClientContact: 'CLI',
      Opportunity: 'OPO'
    };

    const prefix = prefixes[entity_type];

    // Try to acquire lock with retries
    let lockAcquired = false;
    for (let attempt = 0; attempt < 10; attempt++) {
      if (acquireLock(entity_type)) {
        lockAcquired = true;
        break;
      }
      await sleep(100 + Math.random() * 200); // Wait 100-300ms with jitter
    }

    if (!lockAcquired) {
      return Response.json({ error: 'Could not acquire lock, try again' }, { status: 503 });
    }

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
    
    // Also collect all existing ref_ids for collision check
    const existingRefIds = new Set();
    
    for (const record of allRecords) {
      if (record.ref_id) {
        existingRefIds.add(record.ref_id);
        const match = record.ref_id.match(regex);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNumber) {
            maxNumber = num;
          }
        }
      }
    }

    // Generate ref_ids (single or multiple), ensuring uniqueness
    const numToGenerate = Math.min(Math.max(1, parseInt(count) || 1), 100); // Max 100 at a time
    
    // Add random suffix to prevent collisions from concurrent requests
    const timestamp = Date.now().toString(36).slice(-4);
    
    if (numToGenerate === 1) {
      // Single ref_id (backwards compatible)
      let nextNumber = maxNumber + 1;
      let ref_id = `${prefix}-${nextNumber.toString().padStart(5, '0')}`;
      
      // Check for collision and increment if needed
      while (existingRefIds.has(ref_id)) {
        nextNumber++;
        ref_id = `${prefix}-${nextNumber.toString().padStart(5, '0')}`;
      }
      
      releaseLock(entity_type);
      return Response.json({ ref_id });
    } else {
      // Multiple ref_ids
      const ref_ids = [];
      let currentNumber = maxNumber;
      
      for (let i = 0; i < numToGenerate; i++) {
        currentNumber++;
        let ref_id = `${prefix}-${currentNumber.toString().padStart(5, '0')}`;
        
        // Check for collision and increment if needed
        while (existingRefIds.has(ref_id) || ref_ids.includes(ref_id)) {
          currentNumber++;
          ref_id = `${prefix}-${currentNumber.toString().padStart(5, '0')}`;
        }
        
        ref_ids.push(ref_id);
      }
      
      releaseLock(entity_type);
      return Response.json({ ref_ids });
    }
  } catch (error) {
    if (entityType) {
      releaseLock(entityType);
    }
    return Response.json({ error: error.message }, { status: 500 });
  }
});