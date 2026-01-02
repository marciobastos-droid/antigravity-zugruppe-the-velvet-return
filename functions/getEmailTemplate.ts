import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Função helper para obter e processar templates de email
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event_type, variables } = await req.json();

    if (!event_type) {
      return Response.json({ error: 'event_type is required' }, { status: 400 });
    }

    // Buscar template ativo para o evento
    const templates = await base44.asServiceRole.entities.EmailTemplate.filter({
      event_type: event_type,
      is_active: true
    });

    if (templates.length === 0) {
      // Retornar templates padrão se não houver customizado
      return Response.json({
        hasCustomTemplate: false,
        subject: getDefaultSubject(event_type),
        body: getDefaultBody(event_type)
      });
    }

    const template = templates[0];

    // Substituir variáveis
    let subject = template.subject;
    let body = template.body;

    if (variables) {
      Object.entries(variables).forEach(([key, value]) => {
        const placeholder = `{{${key}}}`;
        subject = subject.replaceAll(placeholder, value || '');
        body = body.replaceAll(placeholder, value || '');
      });
    }

    return Response.json({
      hasCustomTemplate: true,
      subject,
      body,
      template_name: template.name
    });

  } catch (error) {
    console.error('[getEmailTemplate] Error:', error);
    return Response.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
});

// Templates padrão como fallback
function getDefaultSubject(event_type) {
  const defaults = {
    subscription_confirmed: 'Subscrição Ativada com Sucesso!',
    subscription_rejected: 'Atualização sobre a sua Subscrição',
    payment_reminder: 'Lembrete: Pagamento Pendente',
    subscription_renewal: 'Renovação da sua Subscrição',
    subscription_expiring: 'A sua Subscrição está a expirar',
    welcome_email: 'Bem-vindo à Zugruppe!',
    custom: 'Mensagem da Zugruppe'
  };
  return defaults[event_type] || 'Mensagem da Zugruppe';
}

function getDefaultBody(event_type) {
  const defaults = {
    subscription_confirmed: `A sua subscrição foi ativada!

Confirmámos o recebimento do seu pagamento.

Obrigado por confiar em nós!

Equipa Zugruppe`,
    subscription_rejected: `Informação sobre o seu pedido de subscrição

Infelizmente não conseguimos confirmar o seu pagamento.

Por favor contacte-nos se tiver alguma dúvida.

Equipa Zugruppe`,
    payment_reminder: `Este é um lembrete sobre o seu pagamento pendente.

Por favor complete o pagamento para ativar a sua subscrição.

Equipa Zugruppe`,
    subscription_renewal: `É hora de renovar a sua subscrição!

Mantenha o acesso a todas as funcionalidades.

Equipa Zugruppe`,
    subscription_expiring: `A sua subscrição está prestes a expirar.

Renove agora para não perder acesso.

Equipa Zugruppe`,
    welcome_email: `Bem-vindo à Zugruppe!

Estamos felizes por tê-lo connosco.

Equipa Zugruppe`,
    custom: `Mensagem da Zugruppe

Equipa Zugruppe`
  };
  return defaults[event_type] || 'Mensagem da Zugruppe';
}