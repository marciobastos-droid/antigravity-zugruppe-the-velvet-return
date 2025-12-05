import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Get current user
    let user = null;
    try {
      user = await base44.auth.me();
    } catch (e) {
      // Allow anonymous logging for webhooks
    }

    const body = await req.json();
    const { 
      action, 
      entity_type, 
      entity_id, 
      entity_name, 
      details,
      status = 'success',
      error_message
    } = body;

    if (!action || !entity_type) {
      return Response.json({ error: 'action and entity_type are required' }, { status: 400 });
    }

    // Create audit log entry
    const logEntry = {
      user_email: user?.email || body.user_email || 'system',
      user_name: user?.full_name || body.user_name || 'Sistema',
      action,
      entity_type,
      entity_id: entity_id || null,
      entity_name: entity_name || null,
      details: details || {},
      status,
      error_message: error_message || null,
      ip_address: req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown',
      user_agent: req.headers.get('user-agent') || 'unknown'
    };

    // Use service role to ensure logging works regardless of user permissions
    const created = await base44.asServiceRole.entities.AuditLog.create(logEntry);

    return Response.json({ success: true, log_id: created.id });
  } catch (error) {
    console.error('Audit log error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});