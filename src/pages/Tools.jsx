import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Video, Calendar, Wrench, FileText, TrendingUp, Download, UserPlus, Folder, StickyNote, Share2, UploadCloud, Zap, Key, Facebook, BarChart3, Sparkles, Mail, LayoutDashboard, FileEdit, Server, Copy, Brain, Target, Calculator, Bell, MessageCircle, Globe, Users, Plug, DollarSign, Lock } from "lucide-react";
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

  // Helper to render tool button with permission check
  const ToolButton = ({ toolId, icon: Icon, label, variant, className }) => {
    const allowed = isToolAllowed(toolId);
    return (
      <Button
        variant={activeTab === toolId ? "default" : (variant || "outline")}
        onClick={() => allowed && setActiveTab(toolId)}
        className={`flex items-center gap-2 ${className || ''} ${!allowed ? 'opacity-50 cursor-not-allowed' : ''}`}
        disabled={!allowed}
        title={!allowed ? 'Sem permissão para esta ferramenta' : ''}
      >
        <Icon className="w-4 h-4" />
        {label}
        {!allowed && <Lock className="w-3 h-3 ml-1" />}
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
                <Button
                  variant={activeTab === "facebookLeads" ? "default" : "outline"}
                  onClick={() => setActiveTab("facebookLeads")}
                  className="flex items-center gap-2"
                >
                  <Facebook className="w-4 h-4" />
                  Leads Facebook
                </Button>
                <Button
                  variant={activeTab === "facebookCampaigns" ? "default" : "outline"}
                  onClick={() => setActiveTab("facebookCampaigns")}
                  className="flex items-center gap-2"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Campanhas FB
                </Button>
                <Button
                  variant={activeTab === "facebookForms" ? "default" : "outline"}
                  onClick={() => setActiveTab("facebookForms")}
                  className="flex items-center gap-2"
                >
                  <FileEdit className="w-4 h-4" />
                  Formulários FB
                </Button>
                <Button
                  variant={activeTab === "socialMedia" ? "default" : "outline"}
                  onClick={() => setActiveTab("socialMedia")}
                  className="flex items-center gap-2"
                >
                  <Share2 className="w-4 h-4" />
                  Posts Sociais
                </Button>
                <Button
                  variant={activeTab === "apiPublish" ? "default" : "outline"}
                  onClick={() => setActiveTab("apiPublish")}
                  className="flex items-center gap-2"
                >
                  <Zap className="w-4 h-4" />
                  Publicação API
                </Button>
                <Button
                  variant={activeTab === "apiIntegrations" ? "default" : "outline"}
                  onClick={() => setActiveTab("apiIntegrations")}
                  className="flex items-center gap-2"
                >
                  <Key className="w-4 h-4" />
                  Integrações API
                </Button>
                <Button
                  variant={activeTab === "portalIntegrations" ? "default" : "outline"}
                  onClick={() => setActiveTab("portalIntegrations")}
                  className="flex items-center gap-2 bg-indigo-50 border-indigo-300 hover:bg-indigo-100"
                >
                  <Globe className="w-4 h-4 text-indigo-600" />
                  Portais Imobiliários
                </Button>
                <Button
                  variant={activeTab === "whatsapp" ? "default" : "outline"}
                  onClick={() => setActiveTab("whatsapp")}
                  className="flex items-center gap-2 bg-green-50 border-green-300 hover:bg-green-100"
                >
                  <MessageCircle className="w-4 h-4 text-green-600" />
                  WhatsApp Business
                </Button>
                <Button
                  variant={activeTab === "integrations" ? "default" : "outline"}
                  onClick={() => setActiveTab("integrations")}
                  className="flex items-center gap-2 bg-blue-50 border-blue-300 hover:bg-blue-100"
                >
                  <Plug className="w-4 h-4 text-blue-600" />
                  Integrações Externas
                </Button>
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
                <Button
                  variant={activeTab === "leadManagement" ? "default" : "outline"}
                  onClick={() => setActiveTab("leadManagement")}
                  className="flex items-center gap-2"
                >
                  <Target className="w-4 h-4" />
                  Origens & Scoring
                </Button>
                <Button
                  variant={activeTab === "leadNurturing" ? "default" : "outline"}
                  onClick={() => setActiveTab("leadNurturing")}
                  className="flex items-center gap-2"
                >
                  <Zap className="w-4 h-4" />
                  Nurturing Automático
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Importações e Exportações Group */}
          <Card className="border-blue-300 bg-gradient-to-r from-blue-50 to-cyan-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Download className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-blue-900 text-lg">Importações e Exportações</h3>
                <span className="text-sm text-blue-600">(6 ferramentas)</span>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={activeTab === "importProperties" ? "default" : "outline"}
                  onClick={() => setActiveTab("importProperties")}
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Importar Imóveis
                </Button>
                <Button
                  variant={activeTab === "importLeads" ? "default" : "outline"}
                  onClick={() => setActiveTab("importLeads")}
                  className="flex items-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  Importar Leads
                </Button>
                <Button
                  variant={activeTab === "importContacts" ? "default" : "outline"}
                  onClick={() => setActiveTab("importContacts")}
                  className="flex items-center gap-2"
                >
                  <Users className="w-4 h-4" />
                  Importar Contactos
                </Button>
                <Button
                  variant={activeTab === "importOpportunities" ? "default" : "outline"}
                  onClick={() => setActiveTab("importOpportunities")}
                  className="flex items-center gap-2"
                >
                  <Target className="w-4 h-4" />
                  Importar Oportunidades
                </Button>
                <Button
                  variant={activeTab === "exportProperties" ? "default" : "outline"}
                  onClick={() => setActiveTab("exportProperties")}
                  className="flex items-center gap-2"
                >
                  <UploadCloud className="w-4 h-4" />
                  Exportar Ficheiros
                </Button>
                <Button
                  variant={activeTab === "reportsExporter" ? "default" : "outline"}
                  onClick={() => setActiveTab("reportsExporter")}
                  className="flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Relatórios
                </Button>
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
                <Button
                  variant={activeTab === "duplicateChecker" ? "default" : "outline"}
                  onClick={() => setActiveTab("duplicateChecker")}
                  className="flex items-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Verificar Duplicados
                </Button>
                <Button
                  variant={activeTab === "inconsistencyChecker" ? "default" : "outline"}
                  onClick={() => setActiveTab("inconsistencyChecker")}
                  className="flex items-center gap-2"
                >
                  <Brain className="w-4 h-4" />
                  Verificar Inconsistências
                </Button>
                <Button
                  variant={activeTab === "emailHub" ? "default" : "outline"}
                  onClick={() => setActiveTab("emailHub")}
                  className="flex items-center gap-2"
                >
                  <Mail className="w-4 h-4" />
                  Centro de Email
                </Button>
                <Button
                  variant={activeTab === "video" ? "default" : "outline"}
                  onClick={() => setActiveTab("video")}
                  className="flex items-center gap-2"
                >
                  <Video className="w-4 h-4" />
                  Criador de Vídeos
                </Button>
                <Button
                  variant={activeTab === "description" ? "default" : "outline"}
                  onClick={() => setActiveTab("description")}
                  className="flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Gerador de Descrições
                </Button>
                <Button
                  variant={activeTab === "listingOptimizer" ? "default" : "outline"}
                  onClick={() => setActiveTab("listingOptimizer")}
                  className="flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  Otimizador de Anúncios
                </Button>
                <Button
                  variant={activeTab === "calendar" ? "default" : "outline"}
                  onClick={() => setActiveTab("calendar")}
                  className="flex items-center gap-2"
                >
                  <Calendar className="w-4 h-4" />
                  Calendário de Visitas
                </Button>
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
                <Button
                  variant={activeTab === "aiMatching" ? "default" : "outline"}
                  onClick={() => setActiveTab("aiMatching")}
                  className="flex items-center gap-2"
                >
                  <Target className="w-4 h-4" />
                  Motor de Matching IA
                </Button>
                <Button
                  variant={activeTab === "autoMatching" ? "default" : "outline"}
                  onClick={() => setActiveTab("autoMatching")}
                  className="flex items-center gap-2"
                >
                  <Zap className="w-4 h-4" />
                  Matching Automático
                </Button>
                <Button
                  variant={activeTab === "autoMatchingDashboard" ? "default" : "outline"}
                  onClick={() => setActiveTab("autoMatchingDashboard")}
                  className="flex items-center gap-2"
                >
                  <Bell className="w-4 h-4" />
                  Alertas de Matching
                </Button>
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
                <Button
                  variant={activeTab === "marketIntelligence" ? "default" : "outline"}
                  onClick={() => setActiveTab("marketIntelligence")}
                  className="flex items-center gap-2"
                >
                  <BarChart3 className="w-4 h-4" />
                  Inteligência de Mercado
                </Button>
                <Button
                  variant={activeTab === "pricing" ? "default" : "outline"}
                  onClick={() => setActiveTab("pricing")}
                  className="flex items-center gap-2"
                >
                  <TrendingUp className="w-4 h-4" />
                  Sugestor de Preços
                </Button>
                <Button
                  variant={activeTab === "creditSimulator" ? "default" : "outline"}
                  onClick={() => setActiveTab("creditSimulator")}
                  className="flex items-center gap-2"
                >
                  <Calculator className="w-4 h-4" />
                  Simulador de Crédito
                </Button>
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
                <Button
                  variant={activeTab === "commissions" ? "default" : "outline"}
                  onClick={() => setActiveTab("commissions")}
                  className="flex items-center gap-2"
                >
                  <DollarSign className="w-4 h-4" />
                  Gestão de Comissões
                </Button>
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
                <Button
                  variant={activeTab === "documents" ? "default" : "outline"}
                  onClick={() => setActiveTab("documents")}
                  className="flex items-center gap-2"
                >
                  <Folder className="w-4 h-4" />
                  Documentos e Contratos
                </Button>
                <Button
                  variant={activeTab === "smtpConfig" ? "default" : "outline"}
                  onClick={() => setActiveTab("smtpConfig")}
                  className="flex items-center gap-2"
                >
                  <Server className="w-4 h-4" />
                  Config. Email
                </Button>
                <Button
                  variant={activeTab === "devNotes" ? "default" : "outline"}
                  onClick={() => setActiveTab("devNotes")}
                  className="flex items-center gap-2"
                >
                  <StickyNote className="w-4 h-4" />
                  Notas & Sugestões
                </Button>
                <Button
                  variant={activeTab === "tagManager" ? "default" : "outline"}
                  onClick={() => setActiveTab("tagManager")}
                  className="flex items-center gap-2"
                >
                  <Target className="w-4 h-4" />
                  Etiquetas
                </Button>
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