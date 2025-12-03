import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// Simple lock mechanism using timestamps to prevent race conditions
const lockMap = new Map();
const LOCK_TIMEOUT = 10000; // 10 seconds

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

// Function to fetch all records with pagination to ensure we get ALL records
async function fetchAllRecords(base44, entity_type) {
  const allRecords = [];
  const batchSize = 500;
  let offset = 0;
  let hasMore = true;
  
  while (hasMore) {
    let batch = [];
    if (entity_type === 'Property') {
      batch = await base44.asServiceRole.entities.Property.filter({}, '-created_date', batchSize, offset);
    } else if (entity_type === 'ClientContact') {
      batch = await base44.asServiceRole.entities.ClientContact.filter({}, '-created_date', batchSize, offset);
    } else if (entity_type === 'Opportunity') {
      batch = await base44.asServiceRole.entities.Opportunity.filter({}, '-created_date', batchSize, offset);
    }
    
    if (batch.length === 0) {
      hasMore = false;
    } else {
      allRecords.push(...batch);
      offset += batchSize;
      // Safety limit: max 10000 records
      if (offset >= 10000) {
        hasMore = false;
      }
    }
  }
  
  return allRecords;
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
    for (let attempt = 0; attempt < 15; attempt++) {
      if (acquireLock(entity_type)) {
        lockAcquired = true;
        break;
      }
      await sleep(200 + Math.random() * 300); // Wait 200-500ms with jitter
    }

    if (!lockAcquired) {
      return Response.json({ error: 'Could not acquire lock, try again' }, { status: 503 });
    }

    // Get ALL existing records to find the highest ref_id
    const allRecords = await fetchAllRecords(base44, entity_type);

    // Find the highest number from existing ref_ids and collect all existing ref_ids
    let maxNumber = 0;
    const existingRefIds = new Set();
    
    // Support both old format (ZU-00001) and any numeric pattern
    const regexStrict = new RegExp(`^${prefix}-(\\d+)$`);
    
    for (const record of allRecords) {
      if (record.ref_id) {
        existingRefIds.add(record.ref_id);
        const match = record.ref_id.match(regexStrict);
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
    
    if (numToGenerate === 1) {
      // Single ref_id (backwards compatible)
      let nextNumber = maxNumber + 1;
      let ref_id = `${prefix}-${nextNumber.toString().padStart(5, '0')}`;
      
      // Check for collision and increment if needed (safety loop with limit)
      let safetyCounter = 0;
      while (existingRefIds.has(ref_id) && safetyCounter < 1000) {
        nextNumber++;
        ref_id = `${prefix}-${nextNumber.toString().padStart(5, '0')}`;
        safetyCounter++;
      }
      
      releaseLock(entity_type);
      return Response.json({ ref_id, max_found: maxNumber, total_records: allRecords.length });
    } else {
      // Multiple ref_ids
      const ref_ids = [];
      let currentNumber = maxNumber;
      
      for (let i = 0; i < numToGenerate; i++) {
        currentNumber++;
        let ref_id = `${prefix}-${currentNumber.toString().padStart(5, '0')}`;
        
        // Check for collision and increment if needed
        let safetyCounter = 0;
        while ((existingRefIds.has(ref_id) || ref_ids.includes(ref_id)) && safetyCounter < 1000) {
          currentNumber++;
          ref_id = `${prefix}-${currentNumber.toString().padStart(5, '0')}`;
          safetyCounter++;
        }
        
        ref_ids.push(ref_id);
        existingRefIds.add(ref_id); // Add to set to prevent duplicates within same batch
      }
      
      releaseLock(entity_type);
      return Response.json({ ref_ids, max_found: maxNumber, total_records: allRecords.length });
    }
  } catch (error) {
    if (entityType) {
      releaseLock(entityType);
    }
    return Response.json({ error: error.message }, { status: 500 });
  }
});