import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Video, Calendar, Wrench, FileText, TrendingUp, Download, UserPlus, Folder, StickyNote, Share2, UploadCloud, Zap, Key, Facebook, BarChart3, Sparkles, Mail, LayoutDashboard, FileEdit, Server, Copy, Brain, Target, Calculator, Bell, MessageCircle, Globe, Users, Plug, DollarSign, Lock, Trash2, Eye, Image, Activity, Link2, Loader2, RefreshCw, FileJson, Building2, Megaphone, Database, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import ImportProperties from "../components/tools/ImportProperties";
import ImportLeads from "../components/tools/ImportLeads";
import ImportContactsDialog from "../components/crm/ImportContactsDialog";
import VideoMaker from "../components/tools/VideoMaker";
import CalendarTool from "../components/tools/CalendarTool";
import CRMSyncPanel from "../components/crm/CRMSyncPanel";
import BulkScoreCalculator from "../components/tools/BulkScoreCalculator";
import UnifiedCalendar from "../components/calendar/UnifiedCalendar";
import PropertyDescriptionGenerator from "../components/tools/PropertyDescriptionGenerator";
import PriceSuggestion from "../components/tools/PriceSuggestion";
import DocumentsAndContracts from "../components/tools/DocumentsAndContracts";
import ContractAutomation from "../components/contracts/ContractAutomation";
import DevelopmentNotes from "../components/tools/DevelopmentNotes";
import SocialMediaGenerator from "../components/tools/SocialMediaGenerator";
import PropertyExporter from "../components/tools/PropertyExporter";
import DirectAPIExporter from "../components/tools/DirectAPIExporter";
import APIIntegrationsManager from "../components/tools/APIIntegrationsManager";
import FacebookLeadsIntegration from "../components/tools/FacebookLeadsIntegration";
import FacebookCampaignDashboard from "../components/tools/FacebookCampaignDashboard";
import FacebookFormManager from "../components/tools/FacebookFormManager";
import MarketIntelligence from "../components/tools/MarketIntelligence";
import ListingOptimizer from "../components/tools/ListingOptimizer";
import EmailSender from "../components/tools/EmailSender";
import GmailLinker from "../components/integrations/GmailLinker";
import SMTPConfiguration from "../components/tools/SMTPConfiguration";
import DuplicateChecker from "../components/tools/DuplicateChecker";
import PropertyInconsistencyChecker from "../components/tools/PropertyInconsistencyChecker";
import AIMatchingEngine from "../components/matching/AIMatchingEngine";
import AutomaticMatching from "../components/matching/AutomaticMatching";
import AutoMatchingDashboard from "../components/matching/AutoMatchingDashboard";
import EmailHub from "../components/email/EmailHub";
import CreditSimulator from "../components/tools/CreditSimulator";
import ReportsExporter from "../components/tools/ReportsExporter";
import WhatsAppIntegration from "../components/tools/WhatsAppIntegration";
import WhatsAppAgentConfig from "../components/settings/WhatsAppAgentConfig";
import LeadManagementHub from "../components/leads/LeadManagementHub";
import PortalIntegrations from "../components/tools/PortalIntegrations";
import TagManager from "../components/tags/TagManager";
import ImportOpportunities from "../components/tools/ImportOpportunities";
import IntegrationsHub from "../components/integrations/IntegrationsHub";
import CommissionsManager from "../components/tools/CommissionsManager";
import InvoiceManager from "../components/tools/InvoiceManager";
import OrphanDataCleaner from "../components/tools/OrphanDataCleaner";
import DuplicateClientsCleaner from "../components/tools/DuplicateClientsCleaner";
import PropertyPerformanceDashboard from "../components/tools/PropertyPerformanceDashboard";
import ImageValidator from "../components/tools/ImageValidator";
import DeedCostsCalculator from "../components/tools/DeedCostsCalculator";
import SocialMediaAdCreator from "../components/tools/SocialMediaAdCreator";
import JSONProcessor from "../components/tools/JSONProcessor";
import ExternalDataSync from "../components/tools/ExternalDataSync";
import AuditLogViewer from "../components/audit/AuditLogViewer";
import NotificationsDashboard from "../components/notifications/NotificationsDashboard";
import CasafariSync from "../components/tools/CasafariSync";
import MarketingCampaignsHub from "../components/marketing/MarketingCampaignsHub";
import WebsiteImageExtractor from "../components/tools/WebsiteImageExtractor";
import PropertyFeedsManager from "../components/feeds/PropertyFeedsManager";
import InvestorKeysManager from "../components/tools/InvestorKeysManager";
import InvestorPropertiesManager from "../components/tools/InvestorPropertiesManager";
import MarketingHub from "../components/marketing/MarketingHub";
import BackupManager from "../components/tools/BackupManager";
import ExcelImportExport from "../components/tools/ExcelImportExport";
import CRMIntegrations from "../components/tools/CRMIntegrations";
import OCRProcessor from "../components/tools/OCRProcessor";

export default function Tools() {
  // Auth check - redirect to login if not authenticated
  React.useEffect(() => {
    base44.auth.isAuthenticated().then(isAuth => {
      if (!isAuth) {
        base44.auth.redirectToLogin(window.location.pathname + window.location.search);
      }
    });
  }, []);

  const [activeTab, setActiveTab] = useState("importProperties");
  const [importContactsOpen, setImportContactsOpen] = useState(false);
  const [linkingContacts, setLinkingContacts] = useState(false);
  const [syncingEmails, setSyncingEmails] = useState(false);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  // Check if user is admin/gestor (has full access) or needs permission check
  const isAdmin = currentUser && (currentUser.role === 'admin' || currentUser.user_type === 'admin' || currentUser.user_type === 'gestor');

  // Get user's tool permissions directly from user object
  const userToolPermissions = React.useMemo(() => {
    // Admin has all permissions
    if (isAdmin) return {};
    
    // Get from user.permissions.tools
    const tools = currentUser?.permissions?.tools;
    if (!tools || typeof tools !== 'object') return {};
    
    console.log('[Tools] User tool permissions loaded:', tools);
    return tools;
  }, [currentUser, isAdmin]);

  const hasToolsPageAccess = React.useMemo(() => {
    // Admin sempre tem acesso
    if (isAdmin) return true;
    
    // Se tem a página tools explicitamente habilitada
    if (currentUser?.permissions?.pages?.tools === true) return true;
    
    // Se tem pelo menos uma ferramenta habilitada
    if (currentUser?.permissions?.tools && typeof currentUser.permissions.tools === 'object') {
      const hasAnyTool = Object.values(currentUser.permissions.tools).some(v => v === true);
      console.log('[Tools] Has any tool enabled:', hasAnyTool);
      return hasAnyTool;
    }
    
    return false;
  }, [currentUser, isAdmin]);

  // Debug logging
  React.useEffect(() => {
    if (currentUser) {
      console.log('[Tools Debug - Full State]', {
        user: currentUser.email,
        userType: currentUser.user_type,
        role: currentUser.role,
        isAdmin,
        hasToolsPageAccess,
        userPermissions: currentUser.permissions,
        userToolPermissions,
        permissionsCount: Object.keys(userToolPermissions).length,
        enabledTools: Object.entries(userToolPermissions).filter(([_, v]) => v === true).map(([k]) => k)
      });
    }
  }, [currentUser, isAdmin, hasToolsPageAccess, userToolPermissions]);

  // Helper to check if tool is allowed
  const isToolAllowed = React.useCallback((toolId) => {
    // Admin/Gestor tem acesso total
    if (isAdmin) {
      return true;
    }

    // Verificar permissões de tools - deve estar explicitamente definido como true
    const hasPermission = userToolPermissions?.[toolId] === true;

    if (process.env.NODE_ENV === 'development') {
      console.log(`[Tools] Checking tool ${toolId}:`, {
        hasPermission,
        toolValue: userToolPermissions?.[toolId],
        allPermissions: userToolPermissions
      });
    }

    return hasPermission;
  }, [isAdmin, userToolPermissions]);

  // Contar ferramentas permitidas
  const allToolIds = React.useMemo(() => {
    const toolIds = [];
    const groups = [
      { tools: ['marketingHub', 'marketingCampaigns', 'socialMedia', 'socialAdCreator', 'apiPublish', 'apiIntegrations', 'portalIntegrations', 'whatsapp', 'integrations', 'imageExtractor', 'excelImport', 'crmIntegrations'] },
      { tools: ['facebookCampaigns', 'facebookLeads', 'facebookForms'] },
      { tools: ['leadManagement', 'leadNurturing'] },
      { tools: ['importProperties', 'importLeads', 'importContacts', 'importOpportunities', 'importInvoices', 'exportProperties', 'reportsExporter', 'jsonProcessor', 'propertyFeeds', 'externalSync', 'casafariSync'] },
      { tools: ['bulkScore', 'crmSync', 'duplicateChecker', 'duplicateClients', 'inconsistencyChecker', 'orphanCleaner', 'linkContacts', 'imageValidator', 'emailHub', 'gmailSync', 'gmailLinker', 'video', 'description', 'listingOptimizer', 'calendar'] },
      { tools: ['aiMatching', 'autoMatching', 'autoMatchingDashboard'] },
      { tools: ['marketIntelligence', 'propertyPerformance', 'pricing', 'creditSimulator', 'deedCosts'] },
      { tools: ['commissions', 'invoices'] },
      { tools: ['investorKeys', 'investorProperties'] },
      { tools: ['contractAutomation', 'documents', 'notificationsDashboard', 'smtpConfig', 'devNotes', 'tagManager', 'backupManager', 'auditLog'] }
    ];
    groups.forEach(g => toolIds.push(...g.tools));
    return toolIds;
  }, []);

  const allowedTools = React.useMemo(() => allToolIds.filter(isToolAllowed), [allToolIds, isToolAllowed]);
  const totalTools = allToolIds.length;
  const allowedCount = allowedTools.length;

  // Tool metadata with descriptions for tooltips
  const TOOL_METADATA = {
    marketingHub: { description: "Central unificada para gerir todas as campanhas de marketing" },
    marketingCampaigns: { description: "Criar e monitorizar campanhas de marketing digital" },
    socialMedia: { description: "Gerar conteúdo para redes sociais automaticamente" },
    socialAdCreator: { description: "Criar anúncios otimizados para redes sociais" },
    apiPublish: { description: "Publicar imóveis via API em múltiplos portais" },
    apiIntegrations: { description: "Gerir integrações com APIs de portais imobiliários" },
    portalIntegrations: { description: "Conectar com portais como Idealista, Imovirtual, etc." },
    whatsapp: { description: "Configurar assistente WhatsApp Business" },
    integrations: { description: "Hub de integrações com serviços externos" },
    imageExtractor: { description: "Extrair imagens de websites automaticamente" },
    excelImport: { description: "Importar e exportar dados em Excel e JSON" },
    crmIntegrations: { description: "Sincronizar com CRMs externos" },
    facebookCampaigns: { description: "Gerir campanhas de Facebook Ads" },
    facebookLeads: { description: "Importar e gerir leads do Facebook" },
    facebookForms: { description: "Configurar formulários de lead do Facebook" },
    leadManagement: { description: "Gerir origens de leads e scoring automático" },
    leadNurturing: { description: "Automatizar nurturing de leads" },
    importProperties: { description: "Importar imóveis de ficheiros CSV/Excel" },
    importLeads: { description: "Importar leads de múltiplas fontes" },
    importContacts: { description: "Importar contactos de VCF, CSV, XML" },
    importOpportunities: { description: "Importar oportunidades em massa" },
    importInvoices: { description: "Importar faturas do sistema" },
    exportProperties: { description: "Exportar imóveis em múltiplos formatos" },
    reportsExporter: { description: "Gerar relatórios personalizados" },
    jsonProcessor: { description: "Processar JSON com IA para extração de dados" },
    propertyFeeds: { description: "Gerir feeds XML de imóveis" },
    externalSync: { description: "Sincronizar com sistemas externos" },
    casafariSync: { description: "Sincronizar imóveis com Casafari" },
    bulkScore: { description: "Calcular pontuações de qualidade em massa" },
    crmSync: { description: "Sincronizar dados com CRM" },
    duplicateChecker: { description: "Verificar e remover imóveis duplicados" },
    duplicateClients: { description: "Verificar e fundir clientes duplicados" },
    inconsistencyChecker: { description: "Verificar inconsistências nos dados" },
    orphanCleaner: { description: "Limpar dados órfãos sem referências" },
    linkContacts: { description: "Vincular contactos a oportunidades automaticamente" },
    imageValidator: { description: "Validar qualidade e formato de imagens" },
    emailHub: { description: "Centro de gestão de emails e templates" },
    gmailSync: { description: "Sincronizar emails do Gmail" },
    gmailLinker: { description: "Vincular conta Gmail para sincronização" },
    video: { description: "Criar vídeos promocionais automaticamente" },
    description: { description: "Gerar descrições de imóveis com IA" },
    listingOptimizer: { description: "Otimizar anúncios com sugestões de IA" },
    calendar: { description: "Calendário unificado de visitas e eventos" },
    aiMatching: { description: "Motor de matching inteligente cliente-imóvel" },
    autoMatching: { description: "Matching automático com notificações" },
    autoMatchingDashboard: { description: "Dashboard de alertas de matching" },
    marketIntelligence: { description: "Análise de mercado e tendências" },
    propertyPerformance: { description: "Dashboard de performance de imóveis" },
    pricing: { description: "Sugestão de preços baseada em IA" },
    creditSimulator: { description: "Simular crédito habitação" },
    deedCosts: { description: "Calcular custos de escritura" },
    commissions: { description: "Gerir comissões de vendas" },
    invoices: { description: "Gerir e criar faturas" },
    investorKeys: { description: "Gerir chaves de acesso para investidores" },
    investorProperties: { description: "Gerir imóveis publicados para investidores" },
    contractAutomation: { description: "Automatizar criação de contratos" },
    documents: { description: "Repositório de documentos e contratos" },
    notificationsDashboard: { description: "Central de notificações e alertas" },
    smtpConfig: { description: "Configurar servidor de email SMTP" },
    devNotes: { description: "Notas e sugestões de desenvolvimento" },
    tagManager: { description: "Gerir etiquetas e categorias" },
    backupManager: { description: "Criar e restaurar backups de dados" },
    auditLog: { description: "Visualizar logs de atividade do sistema" }
  };

  // Helper to render tool button with permission check - oculta se não permitido
  const ToolButton = ({ toolId, icon: Icon, label, variant, className, gridMode = false }) => {
    const allowed = isToolAllowed(toolId);
    if (!allowed) return null;

    const description = TOOL_METADATA[toolId]?.description || label;
    const isActive = activeTab === toolId;

    if (gridMode) {
      return (
        <TooltipProvider>
          <Tooltip delayDuration={200}>
            <TooltipTrigger asChild>
              <motion.div
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.2 }}
              >
                <button
                  onClick={() => setActiveTab(toolId)}
                  className={`group relative p-4 rounded-xl border-2 transition-all duration-300 text-left overflow-hidden ${
                    isActive 
                      ? 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-400 shadow-md' 
                      : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg transition-colors duration-300 ${
                      isActive ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600 group-hover:bg-blue-100 group-hover:text-blue-600'
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className={`font-medium text-sm mb-0.5 transition-colors ${
                        isActive ? 'text-blue-900' : 'text-slate-900 group-hover:text-blue-900'
                      }`}>
                        {label}
                      </h4>
                      <p className="text-xs text-slate-500 line-clamp-2">{description}</p>
                    </div>
                  </div>
                  {isActive && (
                    <motion.div
                      layoutId="activeToolIndicator"
                      className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 rounded-xl"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                </button>
              </motion.div>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <p className="text-sm">{description}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return (
      <Button
        variant={isActive ? "default" : (variant || "outline")}
        onClick={() => setActiveTab(toolId)}
        className={`flex items-center gap-2 ${className || ''}`}
      >
        <Icon className="w-4 h-4" />
        {label}
      </Button>
    );
  };

  // Renderizar conteúdo baseado em permissões
  const shouldShowAccessDenied = !isAdmin && (!hasToolsPageAccess || allowedCount === 0);

  if (shouldShowAccessDenied) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-8 flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <Wrench className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Sem Acesso a Ferramentas</h2>
          <p className="text-slate-600">
            Não tem permissão para aceder a esta página ou não tem ferramentas atribuídas.
            Contacte o administrador para obter acesso.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-bold text-slate-900 mb-2 flex items-center gap-3">
                <Wrench className="w-10 h-10 text-blue-600" />
                Ferramentas
              </h1>
              <p className="text-slate-600">Ferramentas inteligentes para gestão de imóveis</p>
            </div>
            
            {/* Totalizador de Ferramentas - Apenas Admin */}
            {isAdmin && (
              <Card className="bg-gradient-to-br from-blue-50 to-indigo-100 border-blue-300">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-sm">
                      <Wrench className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-600 font-medium">Total de Ferramentas</p>
                      <p className="text-3xl font-bold text-slate-900">{totalTools}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Indicador de Permissões para Utilizador */}
          {!isAdmin && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Tem acesso a {allowedCount} de {totalTools} ferramentas
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    As ferramentas disponíveis são configuradas pelo administrador
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6 mb-6">

          {/* Marketing Digital Group */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border-purple-300 bg-gradient-to-r from-purple-50 to-pink-50 overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Megaphone className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-purple-900 text-lg">Marketing Digital</h3>
                      <p className="text-sm text-purple-600">Ferramentas de promoção e campanhas</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                    13 ferramentas
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mb-4">
                  <ToolButton toolId="marketingHub" icon={LayoutDashboard} label="Hub de Marketing" gridMode />
                  <ToolButton toolId="marketingCampaigns" icon={BarChart3} label="Campanhas Marketing" gridMode />
                  <ToolButton toolId="socialMedia" icon={Share2} label="Posts Sociais" gridMode />
                  <ToolButton toolId="socialAdCreator" icon={Image} label="Criador de Anúncios" gridMode />
                  <ToolButton toolId="apiPublish" icon={Zap} label="Publicação API" gridMode />
                  <ToolButton toolId="apiIntegrations" icon={Key} label="Integrações API" gridMode />
                  <ToolButton toolId="portalIntegrations" icon={Globe} label="Portais Imobiliários" gridMode />
                  <ToolButton toolId="whatsapp" icon={MessageCircle} label="WhatsApp Business" gridMode />
                  <ToolButton toolId="integrations" icon={Plug} label="Integrações Externas" gridMode />
                  <ToolButton toolId="imageExtractor" icon={Image} label="Extrator de Imagens" gridMode />
                  <ToolButton toolId="excelImport" icon={FileText} label="Excel & JSON" gridMode />
                  <ToolButton toolId="crmIntegrations" icon={Database} label="CRM Externo" gridMode />
                </div>

              {/* Subgrupo Facebook */}
              <div className="mt-4 pt-4 border-t border-purple-200">
                <div className="flex items-center gap-2 mb-3">
                  <Facebook className="w-5 h-5 text-blue-600" />
                  <h4 className="font-semibold text-blue-900">Facebook</h4>
                  <Badge variant="outline" className="text-xs bg-blue-100 text-blue-700 border-blue-300">3 ferramentas</Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  <ToolButton toolId="facebookCampaigns" icon={Facebook} label="Facebook Ads" gridMode />
                  <ToolButton toolId="facebookLeads" icon={Target} label="Leads Facebook" gridMode />
                  <ToolButton toolId="facebookForms" icon={FileEdit} label="Formulários Facebook" gridMode />
                </div>
              </div>

              </CardContent>
              </Card>
              </motion.div>

          {/* Lead Management Group */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <Card className="border-emerald-300 bg-gradient-to-r from-emerald-50 to-teal-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-100 rounded-lg">
                      <Target className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-emerald-900 text-lg">Gestão de Leads</h3>
                      <p className="text-sm text-emerald-600">Qualificar e nutrir leads</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
                    2 ferramentas
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <ToolButton toolId="leadManagement" icon={Target} label="Origens & Scoring" gridMode />
                  <ToolButton toolId="leadNurturing" icon={Zap} label="Nurturing Automático" gridMode />
                </div>
              </CardContent>
            </Card>
          </motion.div>

              {/* Importações e Exportações Group */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
              >
                <Card className="border-blue-300 bg-gradient-to-r from-blue-50 to-cyan-50">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Download className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-bold text-blue-900 text-lg">Importações e Exportações</h3>
                          <p className="text-sm text-blue-600">Gerir dados de entrada e saída</p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                        11 ferramentas
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                      <ToolButton toolId="importProperties" icon={Download} label="Importar Imóveis" gridMode />
                      <ToolButton toolId="importLeads" icon={UserPlus} label="Importar Leads" gridMode />
                      <ToolButton toolId="importContacts" icon={Users} label="Importar Contactos" gridMode />
                      <ToolButton toolId="importOpportunities" icon={Target} label="Importar Oportunidades" gridMode />
                      <ToolButton toolId="importInvoices" icon={FileText} label="Importar Faturas" gridMode />
                      <ToolButton toolId="exportProperties" icon={UploadCloud} label="Exportar Ficheiros" gridMode />
                      <ToolButton toolId="reportsExporter" icon={FileText} label="Relatórios" gridMode />
                      <ToolButton toolId="jsonProcessor" icon={FileJson} label="Processador JSON" gridMode />
                      <ToolButton toolId="propertyFeeds" icon={Link2} label="Feeds de Imóveis" gridMode />
                      <ToolButton toolId="externalSync" icon={Globe} label="Sincronização Externa" gridMode />
                      <ToolButton toolId="casafariSync" icon={Building2} label="Casafari Sync" gridMode />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Utilitários Group */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.3 }}
              >
                <Card className="border-green-300 bg-gradient-to-r from-green-50 to-emerald-50">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <Sparkles className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                          <h3 className="font-bold text-green-900 text-lg">Utilitários</h3>
                          <p className="text-sm text-green-600">Ferramentas auxiliares e otimização</p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="bg-green-100 text-green-700">
                        14 ferramentas
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                      <ToolButton toolId="bulkScore" icon={TrendingUp} label="Pontuações em Massa" gridMode />
                      <ToolButton toolId="crmSync" icon={RefreshCw} label="Sincronização CRM" gridMode />
                      <ToolButton toolId="duplicateChecker" icon={Copy} label="Verificar Duplicados" gridMode />
                      <ToolButton toolId="duplicateClients" icon={Users} label="Clientes Duplicados" gridMode />
                      <ToolButton toolId="inconsistencyChecker" icon={Brain} label="Verificar Inconsistências" gridMode />
                      <ToolButton toolId="orphanCleaner" icon={Trash2} label="Limpar Dados Órfãos" gridMode />
                      <ToolButton toolId="linkContacts" icon={Link2} label="Vincular Contactos" gridMode />
                      <ToolButton toolId="imageValidator" icon={Image} label="Validador de Imagens" gridMode />
                      <ToolButton toolId="emailHub" icon={Mail} label="Centro de Email" gridMode />
                      <ToolButton toolId="gmailSync" icon={RefreshCw} label="Sincronizar Gmail" gridMode />
                      <ToolButton toolId="gmailLinker" icon={Mail} label="Gmail Linker" gridMode />
                      <ToolButton toolId="video" icon={Video} label="Criador de Vídeos" gridMode />
                      <ToolButton toolId="description" icon={FileText} label="Gerador de Descrições" gridMode />
                      <ToolButton toolId="listingOptimizer" icon={Sparkles} label="Otimizador de Anúncios" gridMode />
                      <ToolButton toolId="calendar" icon={Calendar} label="Calendário Unificado" gridMode />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Matching IA Group */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.4 }}
              >
                <Card className="border-indigo-300 bg-gradient-to-r from-indigo-50 to-purple-50">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 rounded-lg">
                          <Brain className="w-6 h-6 text-indigo-600" />
                        </div>
                        <div>
                          <h3 className="font-bold text-indigo-900 text-lg">Matching com IA</h3>
                          <p className="text-sm text-indigo-600">Conectar clientes a imóveis ideais</p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="bg-indigo-100 text-indigo-700">
                        3 ferramentas
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      <ToolButton toolId="aiMatching" icon={Target} label="Motor de Matching IA" gridMode />
                      <ToolButton toolId="autoMatching" icon={Zap} label="Matching Automático" gridMode />
                      <ToolButton toolId="autoMatchingDashboard" icon={Bell} label="Alertas de Matching" gridMode />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Mercado Group */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.5 }}
              >
                <Card className="border-amber-300 bg-gradient-to-r from-amber-50 to-yellow-50">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100 rounded-lg">
                          <TrendingUp className="w-6 h-6 text-amber-600" />
                        </div>
                        <div>
                          <h3 className="font-bold text-amber-900 text-lg">Mercado</h3>
                          <p className="text-sm text-amber-600">Análise e inteligência de mercado</p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                        5 ferramentas
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      <ToolButton toolId="marketIntelligence" icon={BarChart3} label="Inteligência de Mercado" gridMode />
                      <ToolButton toolId="propertyPerformance" icon={Activity} label="Performance de Imóveis" gridMode />
                      <ToolButton toolId="pricing" icon={TrendingUp} label="Sugestor de Preços" gridMode />
                      <ToolButton toolId="creditSimulator" icon={Calculator} label="Simulador de Crédito" gridMode />
                      <ToolButton toolId="deedCosts" icon={Calculator} label="Custos de Escritura" gridMode />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Finanças Group */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.6 }}
              >
                <Card className="border-green-400 bg-gradient-to-r from-green-50 to-emerald-50">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <DollarSign className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                          <h3 className="font-bold text-green-900 text-lg">Finanças</h3>
                          <p className="text-sm text-green-600">Gerir comissões e faturação</p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="bg-green-100 text-green-700">
                        2 ferramentas
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <ToolButton toolId="commissions" icon={DollarSign} label="Gestão de Comissões" gridMode />
                      <ToolButton toolId="invoices" icon={FileText} label="Gestão de Faturas" gridMode />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Secção de Investidores Group */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.7 }}
              >
                <Card className="border-amber-300 bg-gradient-to-r from-amber-50 to-yellow-50">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100 rounded-lg">
                          <Lock className="w-6 h-6 text-amber-600" />
                        </div>
                        <div>
                          <h3 className="font-bold text-amber-900 text-lg">Secção de Investidores</h3>
                          <p className="text-sm text-amber-600">Portal exclusivo para investidores</p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                        2 ferramentas
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <ToolButton toolId="investorKeys" icon={Key} label="Chaves de Acesso" gridMode />
                      <ToolButton toolId="investorProperties" icon={Building2} label="Imóveis Publicados" gridMode />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Definições e Conteúdos Group */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.8 }}
              >
                <Card className="border-slate-300 bg-gradient-to-r from-slate-50 to-gray-50">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-100 rounded-lg">
                          <Folder className="w-6 h-6 text-slate-600" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 text-lg">Definições e Conteúdos</h3>
                          <p className="text-sm text-slate-600">Configurações e gestão documental</p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="bg-slate-100 text-slate-700">
                        8 ferramentas
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                      <ToolButton toolId="contractAutomation" icon={Sparkles} label="Automação de Contratos" gridMode />
                      <ToolButton toolId="documents" icon={Folder} label="Documentos e Contratos" gridMode />
                      <ToolButton toolId="notificationsDashboard" icon={Bell} label="Central de Notificações" gridMode />
                      <ToolButton toolId="smtpConfig" icon={Server} label="Config. Email" gridMode />
                      <ToolButton toolId="devNotes" icon={StickyNote} label="Notas & Sugestões" gridMode />
                      <ToolButton toolId="tagManager" icon={Target} label="Etiquetas" gridMode />
                      <ToolButton toolId="backupManager" icon={Database} label="Gestor de Backups" gridMode />
                      <ToolButton toolId="auditLog" icon={FileText} label="Logs de Atividade" gridMode />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
              </div>

        {activeTab === "marketingHub" && <MarketingHub />}
        {activeTab === "marketingCampaigns" && <MarketingCampaignsHub />}
        {activeTab === "facebookCampaigns" && <FacebookCampaignDashboard />}
        {activeTab === "facebookLeads" && <FacebookLeadsIntegration />}
        {activeTab === "facebookForms" && <FacebookFormManager />}
        {activeTab === "leadManagement" && <LeadManagementHub />}
        {activeTab === "duplicateChecker" && <DuplicateChecker />}
        {activeTab === "inconsistencyChecker" && <PropertyInconsistencyChecker />}
        {activeTab === "aiMatching" && <AIMatchingEngine />}
        {activeTab === "autoMatching" && <AutomaticMatching />}
        {activeTab === "autoMatchingDashboard" && <AutoMatchingDashboard />}
        {activeTab === "listingOptimizer" && <ListingOptimizer />}
        {activeTab === "marketIntelligence" && <MarketIntelligence />}
        {activeTab === "emailHub" && <EmailHub />}
        {activeTab === "importProperties" && <ImportProperties />}
        {activeTab === "exportProperties" && <PropertyExporter />}
        {activeTab === "apiPublish" && <DirectAPIExporter />}
        {activeTab === "apiIntegrations" && <APIIntegrationsManager />}
        {activeTab === "smtpConfig" && <SMTPConfiguration />}
        {activeTab === "importLeads" && <ImportLeads />}
        {activeTab === "description" && <PropertyDescriptionGenerator />}
        {activeTab === "socialMedia" && <SocialMediaGenerator />}
        {activeTab === "pricing" && <PriceSuggestion />}
        {activeTab === "video" && <VideoMaker />}
        {activeTab === "calendar" && <UnifiedCalendar />}
        {activeTab === "documents" && <DocumentsAndContracts />}
      {activeTab === "contractAutomation" && <ContractAutomation />}
        {activeTab === "devNotes" && <DevelopmentNotes />}
        {activeTab === "creditSimulator" && <CreditSimulator />}
        {activeTab === "deedCosts" && <DeedCostsCalculator />}
        {activeTab === "reportsExporter" && <ReportsExporter />}
        {activeTab === "whatsapp" && <WhatsAppAgentConfig />}
        {activeTab === "portalIntegrations" && <PortalIntegrations />}
        {activeTab === "tagManager" && <TagManager />}
        {activeTab === "importOpportunities" && <ImportOpportunities />}
        {activeTab === "integrations" && <IntegrationsHub />}
        {activeTab === "commissions" && <CommissionsManager />}
        {activeTab === "invoices" && <InvoiceManager />}
        {activeTab === "importInvoices" && <InvoiceManager />}
        {activeTab === "orphanCleaner" && <OrphanDataCleaner />}
        {activeTab === "duplicateClients" && <DuplicateClientsCleaner />}
        {activeTab === "propertyPerformance" && <PropertyPerformanceDashboard />}
        {activeTab === "imageValidator" && <ImageValidator />}
        {activeTab === "imageExtractor" && <WebsiteImageExtractor />}
        {activeTab === "socialAdCreator" && <SocialMediaAdCreator />}
        {activeTab === "jsonProcessor" && <JSONProcessor />}
        {activeTab === "propertyFeeds" && <PropertyFeedsManager />}
        {activeTab === "externalSync" && <ExternalDataSync />}
        {activeTab === "auditLog" && <AuditLogViewer />}
        {activeTab === "casafariSync" && <CasafariSync />}
        {activeTab === "notificationsDashboard" && <NotificationsDashboard />}
        {activeTab === "investorKeys" && <InvestorKeysManager />}
        {activeTab === "investorProperties" && <InvestorPropertiesManager />}
        {activeTab === "bulkScore" && <BulkScoreCalculator />}
        {activeTab === "crmSync" && <CRMSyncPanel />}
        {activeTab === "gmailLinker" && <GmailLinker />}
        {activeTab === "backupManager" && <BackupManager />}
        {activeTab === "excelImport" && <ExcelImportExport />}
        {activeTab === "crmIntegrations" && <CRMIntegrations />}
        {activeTab === "gmailSync" && (
              <Card>
                <CardContent className="p-6">
                  <div className="text-center py-8">
                    <Mail className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Sincronizar Emails do Gmail</h3>
                    <p className="text-slate-600 mb-6 max-w-md mx-auto">
                      Esta ferramenta verifica a sua caixa de entrada do Gmail e identifica emails de clientes conhecidos,
                      criando registos de comunicação e notificações automáticas.
                    </p>
                    <Button 
                      onClick={async () => {
                        setSyncingEmails(true);
                        try {
                          const response = await base44.functions.invoke('checkNewClientEmails');
                          const data = response.data;
                          if (data.error) {
                            toast.error("Erro: " + data.error);
                          } else {
                            toast.success(`${data.emailsLogged || 0} emails sincronizados, ${data.notificationsCreated || 0} notificações criadas`);
                          }
                        } catch (error) {
                          toast.error("Erro ao sincronizar emails: " + (error.message || "Erro desconhecido"));
                        }
                        setSyncingEmails(false);
                      }}
                      disabled={syncingEmails}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      {syncingEmails ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          A sincronizar...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Sincronizar Agora
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
            {activeTab === "linkContacts" && (
          <Card>
            <CardContent className="p-6">
              <div className="text-center py-8">
                <Link2 className="w-16 h-16 text-purple-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-slate-900 mb-2">Vincular Contactos a Oportunidades</h3>
                <p className="text-slate-600 mb-6 max-w-md mx-auto">
                  Esta ferramenta associa automaticamente os contactos às oportunidades correspondentes através do email ou ID, 
                  criando ligações bidirecionais entre os registos.
                </p>
                <Button 
                  onClick={async () => {
                    setLinkingContacts(true);
                    try {
                      const response = await base44.functions.invoke('linkContactsToOpportunities');
                      const data = response.data;
                      toast.success(`Vinculadas ${data.summary.updatedOpportunities} oportunidades e ${data.summary.updatedContacts} contactos`);
                    } catch (error) {
                      toast.error("Erro ao vincular contactos: " + (error.message || "Erro desconhecido"));
                    }
                    setLinkingContacts(false);
                  }}
                  disabled={linkingContacts}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {linkingContacts ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      A vincular...
                    </>
                  ) : (
                    <>
                      <Link2 className="w-4 h-4 mr-2" />
                      Executar Vinculação
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        {activeTab === "importContacts" && (
          <Card>
            <CardContent className="p-6">
              <div className="text-center py-8">
                <Users className="w-16 h-16 text-blue-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-slate-900 mb-2">Importar Contactos</h3>
                <p className="text-slate-600 mb-6">Importe contactos de ficheiros CSV, VCF (vCard) ou XML</p>
                <Button 
                  onClick={() => setImportContactsOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Abrir Importador
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Import Contacts Dialog */}
        <ImportContactsDialog
          open={importContactsOpen}
          onOpenChange={setImportContactsOpen}
        />
      </div>
    </div>
  );
}