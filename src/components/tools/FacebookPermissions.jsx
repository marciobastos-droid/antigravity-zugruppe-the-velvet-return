// Sistema de permissões granulares para Facebook Leads

export const FB_PERMISSIONS = {
  // Configurações globais (token, page ID)
  CONFIG_VIEW: 'config_view',
  CONFIG_EDIT: 'config_edit',
  
  // Campanhas
  CAMPAIGN_VIEW: 'campaign_view',
  CAMPAIGN_CREATE: 'campaign_create',
  CAMPAIGN_EDIT: 'campaign_edit',
  CAMPAIGN_DELETE: 'campaign_delete',
  
  // Leads
  LEAD_VIEW: 'lead_view',
  LEAD_CREATE: 'lead_create',
  LEAD_EDIT: 'lead_edit',
  LEAD_DELETE: 'lead_delete',
  LEAD_CONVERT: 'lead_convert',
  LEAD_BULK_DELETE: 'lead_bulk_delete',
  
  // Sincronização
  SYNC_TRIGGER: 'sync_trigger',
  SYNC_HISTORICAL: 'sync_historical',
  SYNC_VIEW_LOGS: 'sync_view_logs',
  
  // Alertas e Dashboard
  ALERTS_VIEW: 'alerts_view',
  ALERTS_EDIT: 'alerts_edit',
  DASHBOARD_VIEW: 'dashboard_view',
};

// Definição de permissões por tipo de utilizador
const ROLE_PERMISSIONS = {
  admin: Object.values(FB_PERMISSIONS), // Admin tem todas as permissões
  
  gestor: [
    FB_PERMISSIONS.CONFIG_VIEW,
    FB_PERMISSIONS.CONFIG_EDIT,
    FB_PERMISSIONS.CAMPAIGN_VIEW,
    FB_PERMISSIONS.CAMPAIGN_CREATE,
    FB_PERMISSIONS.CAMPAIGN_EDIT,
    FB_PERMISSIONS.CAMPAIGN_DELETE,
    FB_PERMISSIONS.LEAD_VIEW,
    FB_PERMISSIONS.LEAD_CREATE,
    FB_PERMISSIONS.LEAD_EDIT,
    FB_PERMISSIONS.LEAD_DELETE,
    FB_PERMISSIONS.LEAD_CONVERT,
    FB_PERMISSIONS.LEAD_BULK_DELETE,
    FB_PERMISSIONS.SYNC_TRIGGER,
    FB_PERMISSIONS.SYNC_HISTORICAL,
    FB_PERMISSIONS.SYNC_VIEW_LOGS,
    FB_PERMISSIONS.ALERTS_VIEW,
    FB_PERMISSIONS.ALERTS_EDIT,
    FB_PERMISSIONS.DASHBOARD_VIEW,
  ],
  
  agente: [
    FB_PERMISSIONS.CONFIG_VIEW,
    FB_PERMISSIONS.CAMPAIGN_VIEW,
    FB_PERMISSIONS.LEAD_VIEW,
    FB_PERMISSIONS.LEAD_EDIT,
    FB_PERMISSIONS.LEAD_CONVERT,
    FB_PERMISSIONS.SYNC_TRIGGER,
    FB_PERMISSIONS.SYNC_VIEW_LOGS,
    FB_PERMISSIONS.ALERTS_VIEW,
    FB_PERMISSIONS.DASHBOARD_VIEW,
  ],
  
  user: [
    FB_PERMISSIONS.LEAD_VIEW,
    FB_PERMISSIONS.DASHBOARD_VIEW,
  ],
};

/**
 * Verifica se o utilizador tem uma permissão específica
 * @param {Object} user - Objeto do utilizador
 * @param {string} permission - Permissão a verificar
 * @returns {boolean}
 */
export function hasPermission(user, permission) {
  if (!user) return false;
  
  const userType = user.user_type || user.role || 'user';
  const isAdmin = userType === 'admin' || user.role === 'admin';
  
  // Admin sempre tem todas as permissões
  if (isAdmin) return true;
  
  const permissions = ROLE_PERMISSIONS[userType] || ROLE_PERMISSIONS.user;
  return permissions.includes(permission);
}

/**
 * Verifica múltiplas permissões (qualquer uma)
 * @param {Object} user - Objeto do utilizador
 * @param {string[]} permissions - Array de permissões
 * @returns {boolean}
 */
export function hasAnyPermission(user, permissions) {
  return permissions.some(p => hasPermission(user, p));
}

/**
 * Verifica múltiplas permissões (todas)
 * @param {Object} user - Objeto do utilizador
 * @param {string[]} permissions - Array de permissões
 * @returns {boolean}
 */
export function hasAllPermissions(user, permissions) {
  return permissions.every(p => hasPermission(user, p));
}

/**
 * Retorna todas as permissões do utilizador
 * @param {Object} user - Objeto do utilizador
 * @returns {string[]}
 */
export function getUserPermissions(user) {
  if (!user) return [];
  
  const userType = user.user_type || user.role || 'user';
  const isAdmin = userType === 'admin' || user.role === 'admin';
  
  if (isAdmin) return Object.values(FB_PERMISSIONS);
  
  return ROLE_PERMISSIONS[userType] || ROLE_PERMISSIONS.user;
}

/**
 * Verifica se pode editar configurações globais
 */
export function canEditConfig(user) {
  return hasPermission(user, FB_PERMISSIONS.CONFIG_EDIT);
}

/**
 * Verifica se pode gerir campanhas
 */
export function canManageCampaigns(user) {
  return hasAnyPermission(user, [
    FB_PERMISSIONS.CAMPAIGN_CREATE,
    FB_PERMISSIONS.CAMPAIGN_EDIT,
    FB_PERMISSIONS.CAMPAIGN_DELETE,
  ]);
}

/**
 * Verifica se pode eliminar leads
 */
export function canDeleteLeads(user) {
  return hasPermission(user, FB_PERMISSIONS.LEAD_DELETE);
}

/**
 * Verifica se pode fazer sync histórico
 */
export function canSyncHistorical(user) {
  return hasPermission(user, FB_PERMISSIONS.SYNC_HISTORICAL);
}