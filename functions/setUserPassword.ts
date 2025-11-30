import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const currentUser = await base44.auth.me();
    
    if (!currentUser) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can set passwords
    const userType = currentUser.user_type?.toLowerCase() || '';
    if (currentUser.role !== 'admin' && userType !== 'admin') {
      return Response.json({ error: 'Only administrators can set user passwords' }, { status: 403 });
    }

    const { user_id, password } = await req.json();

    if (!user_id || !password) {
      return Response.json({ error: 'user_id and password are required' }, { status: 400 });
    }

    if (password.length < 6) {
      return Response.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    // Use the service role to update the user's password
    await base44.asServiceRole.auth.setUserPassword(user_id, password);

    return Response.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error setting password:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});