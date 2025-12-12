import { base44 } from "@/api/base44Client";

/**
 * Hook para registar ações de auditoria
 */
export function useAuditLog() {
  const logAction = async (action, entity_type, entity_id, entity_name, details = {}) => {
    try {
      await base44.functions.invoke('logAuditAction', {
        action,
        entity_type,
        entity_id,
        entity_name,
        details,
        status: 'success'
      });
    } catch (error) {
      console.error('Audit log failed:', error);
      // Não bloquear a operação principal se o log falhar
    }
  };

  const logError = async (action, entity_type, entity_id, entity_name, error_message) => {
    try {
      await base44.functions.invoke('logAuditAction', {
        action,
        entity_type,
        entity_id,
        entity_name,
        status: 'error',
        error_message
      });
    } catch (err) {
      console.error('Audit log failed:', err);
    }
  };

  return { logAction, logError };
}