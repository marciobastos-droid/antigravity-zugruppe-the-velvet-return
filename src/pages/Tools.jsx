import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Video, Calendar, Wrench, FileText, TrendingUp, Download, UserPlus, Folder, StickyNote, Share2, UploadCloud, Zap, Key, Facebook, BarChart3, Sparkles, Mail, LayoutDashboard, FileEdit, Server, Copy, Brain, Target, Calculator, Bell, MessageCircle, Globe, Users, Plug, DollarSign, Lock, Trash2, Eye, Image, Activity } from "lucide-react";
import ImportProperties from "../components/tools/ImportProperties";
import ImportLeads from "../components/tools/ImportLeads";
import ImportContactsDialog from "../components/crm/ImportContactsDialog";
import VideoMaker from "../components/tools/VideoMaker";
import CalendarTool from "../components/tools/CalendarTool";
import PropertyDescriptionGenerator from "../components/tools/PropertyDescriptionGenerator";
import PriceSuggestion from "../components/tools/PriceSuggestion";
import DocumentsAndContracts from "../components/tools/DocumentsAndContracts";
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
import SocialMediaAdCreator from "../components/tools/SocialMediaAdCreator";

export default function Tools() {
  const [activeTab, setActiveTab] = useState("importLeads");
  const [importContactsOpen, setImportContactsOpen] = useState(false);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: userPermissions = [] } = useQuery({
    queryKey: ['userPermissions'],
    queryFn: () => base44.entities.UserPermission.list()
  });

  // Check if user is admin/gestor (has full access) or needs permission check
  const isAdmin = currentUser && (currentUser.role === 'admin' || currentUser.user_type === 'admin' || currentUser.user_type === 'gestor');
  
  // Get user's tool permissions
  const userToolPermissions = userPermissions.find(p => p.user_email === currentUser?.email)?.permissions?.tools || {};
  
  // Helper to check if tool is allowed
  const isToolAllowed = (toolId) => {
    if (isAdmin) return true;
    return userToolPermissions[toolId] !== false; // Default to true if not explicitly set
  };

  // Helper to render tool button with permission check - oculta se não permitido
  const ToolButton = ({ toolId, icon: Icon, label, variant, className }) => {
    const allowed = isToolAllowed(toolId);
    if (!allowed) return null;
    
    return (
      <Button
        variant={activeTab === toolId ? "default" : (variant || "outline")}
        onClick={() => setActiveTab(toolId)}
        className={`flex items-center gap-2 ${className || ''}`}
      >
        <Icon className="w-4 h-4" />
        {label}
      </Button>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2 flex items-center gap-3">
            <Wrench className="w-10 h-10 text-blue-600" />
            Ferramentas
          </h1>
          <p className="text-slate-600">Ferramentas inteligentes para gestão de imóveis</p>
        </div>

        <div className="space-y-4 mb-6">

          {/* Marketing Digital Group */}
          <Card className="border-purple-300 bg-gradient-to-r from-purple-50 to-pink-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Facebook className="w-5 h-5 text-purple-600" />
                <h3 className="font-bold text-purple-900 text-lg">Marketing Digital</h3>
                <span className="text-sm text-purple-600">(7 ferramentas)</span>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <ToolButton toolId="facebookLeads" icon={Facebook} label="Leads Facebook" />
                <ToolButton toolId="facebookCampaigns" icon={LayoutDashboard} label="Campanhas FB" />
                <ToolButton toolId="facebookForms" icon={FileEdit} label="Formulários FB" />
                <ToolButton toolId="socialMedia" icon={Share2} label="Posts Sociais" />
                <ToolButton toolId="socialAdCreator" icon={Share2} label="Criador de Anúncios" className="bg-pink-50 border-pink-300 hover:bg-pink-100" />
                <ToolButton toolId="apiPublish" icon={Zap} label="Publicação API" />
                <ToolButton toolId="apiIntegrations" icon={Key} label="Integrações API" />
                <ToolButton toolId="portalIntegrations" icon={Globe} label="Portais Imobiliários" className="bg-indigo-50 border-indigo-300 hover:bg-indigo-100" />
                <ToolButton toolId="whatsapp" icon={MessageCircle} label="WhatsApp Business" className="bg-green-50 border-green-300 hover:bg-green-100" />
                <ToolButton toolId="integrations" icon={Plug} label="Integrações Externas" className="bg-blue-50 border-blue-300 hover:bg-blue-100" />
              </div>
              </CardContent>
              </Card>

          {/* Lead Management Group */}
          <Card className="border-emerald-300 bg-gradient-to-r from-emerald-50 to-teal-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-emerald-900 text-lg">Gestão de Leads</h3>
                <span className="text-sm text-emerald-600">(2 ferramentas)</span>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <ToolButton toolId="leadManagement" icon={Target} label="Origens & Scoring" />
                <ToolButton toolId="leadNurturing" icon={Zap} label="Nurturing Automático" />
              </div>
              </CardContent>
              </Card>

              {/* Importações e Exportações Group */}
          <Card className="border-blue-300 bg-gradient-to-r from-blue-50 to-cyan-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Download className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-blue-900 text-lg">Importações e Exportações</h3>
                <span className="text-sm text-blue-600">(7 ferramentas)</span>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <ToolButton toolId="importProperties" icon={Download} label="Importar Imóveis" />
                <ToolButton toolId="importLeads" icon={UserPlus} label="Importar Leads" />
                <ToolButton toolId="importContacts" icon={Users} label="Importar Contactos" />
                <ToolButton toolId="importOpportunities" icon={Target} label="Importar Oportunidades" />
                <ToolButton toolId="importInvoices" icon={FileText} label="Importar Faturas" />
                <ToolButton toolId="exportProperties" icon={UploadCloud} label="Exportar Ficheiros" />
                <ToolButton toolId="reportsExporter" icon={FileText} label="Relatórios" />
              </div>
              </CardContent>
              </Card>

              {/* Utilitários Group */}
          <Card className="border-green-300 bg-gradient-to-r from-green-50 to-emerald-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-5 h-5 text-green-600" />
                <h3 className="font-bold text-green-900 text-lg">Utilitários</h3>
                <span className="text-sm text-green-600">(6 ferramentas)</span>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <ToolButton toolId="duplicateChecker" icon={Copy} label="Verificar Duplicados" />
                <ToolButton toolId="duplicateClients" icon={Users} label="Clientes Duplicados" />
                <ToolButton toolId="inconsistencyChecker" icon={Brain} label="Verificar Inconsistências" />
                <ToolButton toolId="orphanCleaner" icon={Trash2} label="Limpar Dados Órfãos" />
                <ToolButton toolId="imageValidator" icon={Image} label="Validador de Imagens" className="bg-amber-50 border-amber-300 hover:bg-amber-100" />
                <ToolButton toolId="emailHub" icon={Mail} label="Centro de Email" />
                <ToolButton toolId="video" icon={Video} label="Criador de Vídeos" />
                <ToolButton toolId="description" icon={FileText} label="Gerador de Descrições" />
                <ToolButton toolId="listingOptimizer" icon={Sparkles} label="Otimizador de Anúncios" />
                <ToolButton toolId="calendar" icon={Calendar} label="Calendário de Visitas" />
              </div>
              </CardContent>
              </Card>

              {/* Matching IA Group */}
          <Card className="border-indigo-300 bg-gradient-to-r from-indigo-50 to-purple-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Brain className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-indigo-900 text-lg">Matching com IA</h3>
                <span className="text-sm text-indigo-600">(3 ferramentas)</span>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <ToolButton toolId="aiMatching" icon={Target} label="Motor de Matching IA" />
                <ToolButton toolId="autoMatching" icon={Zap} label="Matching Automático" />
                <ToolButton toolId="autoMatchingDashboard" icon={Bell} label="Alertas de Matching" />
              </div>
              </CardContent>
              </Card>

              {/* Mercado Group */}
          <Card className="border-amber-300 bg-gradient-to-r from-amber-50 to-yellow-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-amber-900 text-lg">Mercado</h3>
                <span className="text-sm text-amber-600">(3 ferramentas)</span>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <ToolButton toolId="marketIntelligence" icon={BarChart3} label="Inteligência de Mercado" />
                <ToolButton toolId="propertyPerformance" icon={Activity} label="Performance de Imóveis" className="bg-blue-50 border-blue-300 hover:bg-blue-100" />
                <ToolButton toolId="pricing" icon={TrendingUp} label="Sugestor de Preços" />
                <ToolButton toolId="creditSimulator" icon={Calculator} label="Simulador de Crédito" />
              </div>
              </CardContent>
              </Card>

              {/* Finanças Group */}
          <Card className="border-green-400 bg-gradient-to-r from-green-50 to-emerald-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign className="w-5 h-5 text-green-600" />
                <h3 className="font-bold text-green-900 text-lg">Finanças</h3>
                <span className="text-sm text-green-600">(1 ferramenta)</span>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <ToolButton toolId="commissions" icon={DollarSign} label="Gestão de Comissões" />
                <ToolButton toolId="invoices" icon={FileText} label="Gestão de Faturas" />
              </div>
              </CardContent>
              </Card>

              {/* Definições e Conteúdos Group */}
          <Card className="border-slate-300 bg-gradient-to-r from-slate-50 to-gray-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Folder className="w-5 h-5 text-slate-600" />
                <h3 className="font-bold text-slate-900 text-lg">Definições e Conteúdos</h3>
                <span className="text-sm text-slate-600">(4 ferramentas)</span>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <ToolButton toolId="documents" icon={Folder} label="Documentos e Contratos" />
                <ToolButton toolId="smtpConfig" icon={Server} label="Config. Email" />
                <ToolButton toolId="devNotes" icon={StickyNote} label="Notas & Sugestões" />
                <ToolButton toolId="tagManager" icon={Target} label="Etiquetas" />
              </div>
              </CardContent>
              </Card>
              </div>

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
        {activeTab === "facebookLeads" && <FacebookLeadsIntegration />}
        {activeTab === "facebookCampaigns" && <FacebookCampaignDashboard />}
        {activeTab === "facebookForms" && <FacebookFormManager />}
        {activeTab === "importLeads" && <ImportLeads />}
        {activeTab === "description" && <PropertyDescriptionGenerator />}
        {activeTab === "socialMedia" && <SocialMediaGenerator />}
        {activeTab === "pricing" && <PriceSuggestion />}
        {activeTab === "video" && <VideoMaker />}
        {activeTab === "calendar" && <CalendarTool />}
        {activeTab === "documents" && <DocumentsAndContracts />}
        {activeTab === "devNotes" && <DevelopmentNotes />}
        {activeTab === "creditSimulator" && <CreditSimulator />}
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
        {activeTab === "socialAdCreator" && <SocialMediaAdCreator />}
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