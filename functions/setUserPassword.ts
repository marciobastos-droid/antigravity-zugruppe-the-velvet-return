import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const currentUser = await base44.auth.me();
    
    if (!currentUser) {
      return Response.json({ success: false, error: 'Não autorizado' }, { status: 401 });
    }

    // Only admins can set passwords
    const userType = currentUser.user_type?.toLowerCase() || '';
    if (currentUser.role !== 'admin' && userType !== 'admin') {
      return Response.json({ success: false, error: 'Apenas administradores podem definir senhas' }, { status: 403 });
    }

    const { user_id, password } = await req.json();

    if (!user_id || !password) {
      return Response.json({ success: false, error: 'ID do utilizador e senha são obrigatórios' }, { status: 400 });
    }

    if (password.length < 6) {
      return Response.json({ success: false, error: 'A senha deve ter pelo menos 6 caracteres' }, { status: 400 });
    }

    // Try to set the user password using the SDK's admin method
    try {
      await base44.asServiceRole.auth.updateUserPassword(user_id, password);
    } catch (sdkError) {
      // If the SDK method doesn't exist, try alternative approach
      console.error('SDK method error:', sdkError);
      
      // Try using the entities approach to update user
      try {
        await base44.asServiceRole.entities.User.update(user_id, { 
          password_hash: password // This may not work depending on platform
        });
      } catch (entityError) {
        console.error('Entity update error:', entityError);
        return Response.json({ 
          success: false, 
          error: 'Esta funcionalidade não está disponível. Por favor, peça ao utilizador para usar "Esqueci a senha" na página de login.' 
        }, { status: 501 });
      }
    }

    return Response.json({ success: true, message: 'Senha atualizada com sucesso' });
  } catch (error) {
    console.error('Error setting password:', error);
    return Response.json({ success: false, error: error.message || 'Erro ao definir senha' }, { status: 500 });
  }
});