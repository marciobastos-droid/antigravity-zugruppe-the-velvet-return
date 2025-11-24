import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { access_token } = await req.json();

    if (!access_token) {
      return Response.json({ 
        error: 'Missing access token',
        valid: false 
      }, { status: 400 });
    }

    // Verify token with Facebook Graph API
    const debugUrl = `https://graph.facebook.com/v18.0/debug_token?input_token=${access_token}&access_token=${access_token}`;
    
    try {
      const response = await fetch(debugUrl);
      const data = await response.json();

      if (data.error) {
        return Response.json({
          valid: false,
          error: 'Invalid token',
          details: data.error.message,
          error_code: data.error.code
        });
      }

      const tokenData = data.data;
      
      // Check if token is valid and not expired
      const isValid = tokenData.is_valid === true;
      const expiresAt = tokenData.expires_at ? new Date(tokenData.expires_at * 1000) : null;
      const isExpired = expiresAt ? expiresAt < new Date() : false;

      return Response.json({
        valid: isValid && !isExpired,
        is_valid: isValid,
        is_expired: isExpired,
        expires_at: expiresAt,
        app_id: tokenData.app_id,
        scopes: tokenData.scopes,
        user_id: tokenData.user_id
      });

    } catch (error) {
      return Response.json({
        valid: false,
        error: 'Failed to validate token',
        details: error.message
      });
    }

  } catch (error) {
    console.error('Validation error:', error);
    return Response.json({ 
      error: error.message || 'Internal server error',
      valid: false
    }, { status: 500 });
  }
});