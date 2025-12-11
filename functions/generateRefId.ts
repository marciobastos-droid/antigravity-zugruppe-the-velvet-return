import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// Global lock mechanism with unique request tracking
const lockMap = new Map();
const LOCK_TIMEOUT = 30000; // 30 seconds - increased for safety
const requestQueue = new Map(); // Queue for pending requests

function acquireLock(entityType, requestId) {
  const now = Date.now();
  const existing = lockMap.get(entityType);
  
  // Clean expired lock
  if (existing && (now - existing.timestamp) > LOCK_TIMEOUT) {
    console.log(`[generateRefId] Cleaning expired lock for ${entityType}`);
    lockMap.delete(entityType);
  }
  
  if (lockMap.has(entityType)) {
    return false;
  }
  
  lockMap.set(entityType, { timestamp: now, requestId });
  console.log(`[generateRefId] Lock acquired for ${entityType} by ${requestId}`);
  return true;
}

function releaseLock(entityType, requestId) {
  const existing = lockMap.get(entityType);
  if (existing && existing.requestId === requestId) {
    lockMap.delete(entityType);
    console.log(`[generateRefId] Lock released for ${entityType} by ${requestId}`);
  }
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Function to fetch all records with pagination to ensure we get ALL records
async function fetchAllRecords(base44, entity_type) {
  const allRecords = [];
  const batchSize = 1000; // Increased batch size
  let offset = 0;
  let hasMore = true;
  
  console.log(`[generateRefId] Fetching all ${entity_type} records...`);
  
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
      // Safety limit: max 50000 records
      if (offset >= 50000) {
        hasMore = false;
      }
    }
  }
  
  console.log(`[generateRefId] Found ${allRecords.length} total ${entity_type} records`);
  return allRecords;
}

// Extract number from ref_id with support for multiple formats
function extractRefIdNumber(refId, prefix) {
  if (!refId || typeof refId !== 'string') return 0;
  
  // Try standard format: PREFIX-NNNNN
  const standardMatch = refId.match(new RegExp(`^${prefix}-(\\d+)$`));
  if (standardMatch) {
    return parseInt(standardMatch[1], 10);
  }
  
  // Try alternative formats: PREFIX_NNNNN, PREFIX NNNNN, PREFIXNNNNN
  const altMatch = refId.match(new RegExp(`^${prefix}[_\\s-]?(\\d+)$`, 'i'));
  if (altMatch) {
    return parseInt(altMatch[1], 10);
  }
  
  return 0;
}

Deno.serve(async (req) => {
  // Generate unique request ID for tracking
  const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  let entityType = null;
  
  console.log(`[generateRefId] Request ${requestId} started`);
  
  try {
    const base44 = createClientFromRequest(req);
    
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

    // Try to acquire lock with retries - increased attempts and wait time
    let lockAcquired = false;
    for (let attempt = 0; attempt < 30; attempt++) {
      if (acquireLock(entity_type, requestId)) {
        lockAcquired = true;
        break;
      }
      // Exponential backoff with jitter: 100-600ms
      const waitTime = 100 + (attempt * 50) + Math.random() * 200;
      console.log(`[generateRefId] Request ${requestId} waiting for lock, attempt ${attempt + 1}, waiting ${Math.round(waitTime)}ms`);
      await sleep(waitTime);
    }

    if (!lockAcquired) {
      console.error(`[generateRefId] Request ${requestId} failed to acquire lock after 30 attempts`);
      return Response.json({ error: 'System busy, please try again in a few seconds' }, { status: 503 });
    }

    // Get ALL existing records to find the highest ref_id
    const allRecords = await fetchAllRecords(base44, entity_type);

    // Build a complete set of existing ref_ids and find max number
    let maxNumber = 0;
    const existingRefIds = new Set();
    const existingNumbers = [];
    
    for (const record of allRecords) {
      if (record.ref_id) {
        // Normalize and add to set
        const normalizedRefId = record.ref_id.trim().toUpperCase();
        existingRefIds.add(normalizedRefId);
        existingRefIds.add(record.ref_id); // Keep original too
        
        // Extract number using robust function
        const num = extractRefIdNumber(record.ref_id, prefix);
        if (num > 0) {
          existingNumbers.push(num);
          if (num > maxNumber) {
            maxNumber = num;
          }
        }
      }
    }

    console.log(`[generateRefId] Request ${requestId}: Found ${allRecords.length} records, max number: ${maxNumber}, unique ref_ids: ${existingRefIds.size}`);

    // Generate ref_ids (single or multiple), ensuring uniqueness
    const numToGenerate = Math.min(Math.max(1, parseInt(count) || 1), 100); // Max 100 at a time
    
    // Start from max + 1, never reuse a number
    let currentNumber = maxNumber;
    const ref_ids = [];
    const generatedNumbers = new Set(); // Track numbers we generate in this batch
    
    for (let i = 0; i < numToGenerate; i++) {
      currentNumber++;
      
      // Ensure we don't reuse any number
      let safetyCounter = 0;
      while (safetyCounter < 10000) {
        const ref_id = `${prefix}-${currentNumber.toString().padStart(5, '0')}`;
        const normalizedRefId = ref_id.toUpperCase();
        
        // Check all possible collision sources
        const existsInDatabase = existingRefIds.has(ref_id) || existingRefIds.has(normalizedRefId);
        const existsInBatch = generatedNumbers.has(currentNumber);
        
        if (!existsInDatabase && !existsInBatch) {
          break;
        }
        
        console.warn(`[generateRefId] Request ${requestId}: Number ${currentNumber} already exists, incrementing...`);
        currentNumber++;
        safetyCounter++;
      }
      
      if (safetyCounter >= 10000) {
        throw new Error(`Failed to generate unique ref_id after 10000 attempts`);
      }
      
      const ref_id = `${prefix}-${currentNumber.toString().padStart(5, '0')}`;
      ref_ids.push(ref_id);
      generatedNumbers.add(currentNumber);
      existingRefIds.add(ref_id); // Add to set to prevent duplicates
      existingRefIds.add(ref_id.toUpperCase());
    }
    
    // Final validation - ensure all ref_ids are unique
    const uniqueRefIds = new Set(ref_ids);
    if (uniqueRefIds.size !== ref_ids.length) {
      console.error(`[generateRefId] CRITICAL: Generated duplicate ref_ids!`, ref_ids);
      throw new Error('Internal error: generated duplicate ref_ids');
    }

    console.log(`[generateRefId] Request ${requestId}: Generated ${ref_ids.length} ref_ids: ${ref_ids.join(', ')}`);
    
    releaseLock(entity_type, requestId);
    
    if (numToGenerate === 1) {
      return Response.json({ 
        ref_id: ref_ids[0], 
        max_found: maxNumber, 
        total_records: allRecords.length,
        request_id: requestId 
      });
    } else {
      return Response.json({ 
        ref_ids, 
        max_found: maxNumber, 
        total_records: allRecords.length,
        request_id: requestId 
      });
    }
  } catch (error) {
    console.error(`[generateRefId] Request ${requestId} error:`, error.message);
    if (entityType) {
      releaseLock(entityType, requestId);
    }
    return Response.json({ error: error.message, request_id: requestId }, { status: 500 });
  }
});