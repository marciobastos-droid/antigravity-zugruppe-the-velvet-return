import { base44 } from "@/api/base44Client";

/**
 * Hook para registar ações no log de auditoria
 * Uso: const { logAction } = useAuditLog();
 *      await logAction('create', 'Property', propertyId, propertyTitle, { price: 250000 });
 */
export function useAuditLog() {
  const logAction = async (action, entityType, entityId, entityName, details = {}, status = 'success', errorMessage = null) => {
    try {
      await base44.functions.invoke('logAuditAction', {
        action,
        entity_type: entityType,
        entity_id: entityId,
        entity_name: entityName,
        details,
        status,
        error_message: errorMessage
      });
    } catch (error) {
      console.error('Failed to log audit action:', error);
      // Don't throw - audit logging should not break the main flow
    }
  };

  return { logAction };
}

/**
 * Função utilitária para logging direto sem hook
 */
export async function logAuditAction(action, entityType, entityId, entityName, details = {}, status = 'success', errorMessage = null) {
  try {
    await base44.functions.invoke('logAuditAction', {
      action,
      entity_type: entityType,
      entity_id: entityId,
      entity_name: entityName,
      details,
      status,
      error_message: errorMessage
    });
  } catch (error) {
    console.error('Failed to log audit action:', error);
  }
}