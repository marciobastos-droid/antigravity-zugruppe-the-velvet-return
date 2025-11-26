import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Video, Calendar, Wrench, FileText, TrendingUp, Download, UserPlus, Folder, StickyNote, Share2, UploadCloud, Zap, Key, Facebook, BarChart3, Sparkles, Mail, LayoutDashboard, FileEdit, Server, Copy, Brain, Target } from "lucide-react";
import ImportProperties from "../components/tools/ImportProperties";
import ImportLeads from "../components/tools/ImportLeads";
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
import AIMatchingEngine from "../components/matching/AIMatchingEngine";

export default function Tools() {
  const [activeTab, setActiveTab] = useState("importLeads");

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
                <span className="text-sm text-purple-600">(6 ferramentas)</span>
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
              </div>
            </CardContent>
          </Card>

          {/* Importações e Exportações Group */}
          <Card className="border-blue-300 bg-gradient-to-r from-blue-50 to-cyan-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Download className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-blue-900 text-lg">Importações e Exportações</h3>
                <span className="text-sm text-blue-600">(3 ferramentas)</span>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={activeTab === "importLeads" ? "default" : "outline"}
                  onClick={() => setActiveTab("importLeads")}
                  className="flex items-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  Importar Leads
                </Button>
                <Button
                  variant={activeTab === "importProperties" ? "default" : "outline"}
                  onClick={() => setActiveTab("importProperties")}
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Importar Imóveis
                </Button>
                <Button
                  variant={activeTab === "exportProperties" ? "default" : "outline"}
                  onClick={() => setActiveTab("exportProperties")}
                  className="flex items-center gap-2"
                >
                  <UploadCloud className="w-4 h-4" />
                  Exportar Ficheiros
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
                  variant={activeTab === "emailSender" ? "default" : "outline"}
                  onClick={() => setActiveTab("emailSender")}
                  className="flex items-center gap-2"
                >
                  <Mail className="w-4 h-4" />
                  Enviar Emails
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
                <span className="text-sm text-indigo-600">(1 ferramenta)</span>
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
              </div>
            </CardContent>
          </Card>

          {/* Mercado Group */}
          <Card className="border-amber-300 bg-gradient-to-r from-amber-50 to-yellow-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-amber-900 text-lg">Mercado</h3>
                <span className="text-sm text-amber-600">(2 ferramentas)</span>
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
              </div>
            </CardContent>
          </Card>

          {/* Definições e Conteúdos Group */}
          <Card className="border-slate-300 bg-gradient-to-r from-slate-50 to-gray-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Folder className="w-5 h-5 text-slate-600" />
                <h3 className="font-bold text-slate-900 text-lg">Definições e Conteúdos</h3>
                <span className="text-sm text-slate-600">(3 ferramentas)</span>
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
              </div>
            </CardContent>
          </Card>
        </div>

        {activeTab === "duplicateChecker" && <DuplicateChecker />}
        {activeTab === "listingOptimizer" && <ListingOptimizer />}
        {activeTab === "marketIntelligence" && <MarketIntelligence />}
        {activeTab === "emailSender" && <EmailSender />}
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
      </div>
    </div>
  );
}