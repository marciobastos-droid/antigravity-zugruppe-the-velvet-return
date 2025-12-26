import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { file_uri } = await req.json();

    if (!file_uri) {
      return Response.json({ error: 'file_uri is required' }, { status: 400 });
    }

    // Criar URL assinado (válido por 1 hora)
    const { data } = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({
      file_uri,
      expires_in: 3600
    });

    return Response.json({ signed_url: data.signed_url });
  } catch (error) {
    console.error('Error creating signed URL:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});