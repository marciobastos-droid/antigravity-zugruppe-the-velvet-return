import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verificar autenticação admin
    const user = await base44.auth.me();
    if (!user || (user.role !== 'admin' && user.user_type?.toLowerCase() !== 'admin')) {
      return Response.json({ 
        error: 'Acesso negado. Apenas administradores podem executar esta operação.' 
      }, { status: 403 });
    }

    // Buscar todas as oportunidades
    const allOpportunities = await base44.asServiceRole.entities.Opportunity.list('-created_date', 1000);
    
    // Filtrar oportunidades sem ref_id
    const withoutRefId = allOpportunities.filter(opp => !opp.ref_id);
    
    if (withoutRefId.length === 0) {
      return Response.json({
        success: true,
        message: 'Todas as oportunidades já têm ref_id atribuído',
        updated: 0
      });
    }

    // Encontrar o maior número de ref_id existente
    const existingRefIds = allOpportunities
      .filter(opp => opp.ref_id)
      .map(opp => {
        const match = opp.ref_id.match(/OPO-(\d+)/);
        return match ? parseInt(match[1]) : 0;
      });
    
    let nextNumber = existingRefIds.length > 0 ? Math.max(...existingRefIds) + 1 : 1;

    // Ordenar por data de criação (mais antigas primeiro)
    const sorted = withoutRefId.sort((a, b) => 
      new Date(a.created_date) - new Date(b.created_date)
    );

    // Atribuir ref_ids sequenciais com delay para evitar rate limit
    const updates = [];
    const errors = [];
    const BATCH_SIZE = 10;
    const DELAY_MS = 2000;

    for (let i = 0; i < sorted.length; i += BATCH_SIZE) {
      const batch = sorted.slice(i, i + BATCH_SIZE);
      
      for (const opp of batch) {
        const refId = `OPO-${String(nextNumber).padStart(5, '0')}`;
        
        try {
          await base44.asServiceRole.entities.Opportunity.update(opp.id, {
            ref_id: refId
          });
          updates.push({ id: opp.id, ref_id: refId, buyer_name: opp.buyer_name });
          nextNumber++;
        } catch (error) {
          console.error(`Erro ao atualizar oportunidade ${opp.id}:`, error);
          errors.push({ id: opp.id, error: error.message });
        }
      }
      
      // Delay entre batches para evitar rate limit
      if (i + BATCH_SIZE < sorted.length) {
        await new Promise(resolve => setTimeout(resolve, DELAY_MS));
      }
    }

    return Response.json({
      success: true,
      message: `${updates.length} oportunidades atualizadas com ref_id`,
      updated: updates.length,
      total_without_ref_id: withoutRefId.length,
      errors: errors.length,
      details: updates,
      error_details: errors
    });

  } catch (error) {
    console.error('Erro ao atribuir ref_ids:', error);
    return Response.json({ 
      error: error.message,
      details: error.stack 
    }, { status: 500 });
  }
});