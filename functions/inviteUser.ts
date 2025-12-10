import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify admin authentication
    const user = await base44.auth.me();
    if (!user || (user.role !== 'admin' && user.user_type !== 'admin' && user.user_type !== 'gestor')) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { email, full_name, phone, user_type } = await req.json();

    if (!email || !full_name) {
      return Response.json({ error: 'Email e nome são obrigatórios' }, { status: 400 });
    }

    // Check if user already exists
    const existingUsers = await base44.asServiceRole.entities.User.filter({ email });
    if (existingUsers.length > 0) {
      return Response.json({ error: 'Utilizador com este email já existe' }, { status: 400 });
    }

    // Send invitation email
    const signupUrl = `${new URL(req.url).origin}`;
    
    await base44.integrations.Core.SendEmail({
      from_name: "Zugruppe",
      to: email,
      subject: "Convite para Zugruppe - Plataforma Imobiliária",
      body: `Olá ${full_name},

Foi convidado(a) para juntar-se à plataforma Zugruppe como ${user_type === 'admin' ? 'Administrador' : user_type === 'gestor' ? 'Gestor' : 'Agente'}.

Para completar o seu registo, aceda à plataforma:
${signupUrl}

Utilize o seguinte email para criar a sua conta:
Email: ${email}
${phone ? `Telefone: ${phone}\n` : ''}
Após o primeiro login, as suas permissões de ${user_type} serão configuradas automaticamente pela equipa.

Bem-vindo(a) à Zugruppe!

Cumprimentos,
Equipa Zugruppe`
    });

    return Response.json({ 
      success: true,
      message: "Convite enviado com sucesso",
      user_data: { email, full_name, phone, user_type }
    });

  } catch (error) {
    console.error('Invite error:', error);
    return Response.json({ 
      error: error.message || 'Erro ao enviar convite',
      details: error.toString()
    }, { status: 500 });
  }
});