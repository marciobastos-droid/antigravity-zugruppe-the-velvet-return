import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Calendar, BarChart3, Brain, PieChart, Target } from "lucide-react";
import SEOHead from "../components/seo/SEOHead";

const ClientDatabase = React.lazy(() => import("../components/crm/ClientDatabase"));
const AppointmentScheduler = React.lazy(() => import("../components/crm/AppointmentScheduler"));
const CRMDashboard = React.lazy(() => import("../components/crm/CRMDashboard"));
const MatchingTab = React.lazy(() => import("@/components/crm/MatchingTab"));
const CRMMetricsDashboard = React.lazy(() => import("../components/crm/CRMMetricsDashboard"));
const OpportunitiesContent = React.lazy(() => import("../components/crm/OpportunitiesContent"));

export default function CRMAdvanced() {
  // Read tab from URL params
  const urlParams = new URLSearchParams(window.location.search);
  const tabFromUrl = urlParams.get('tab');
  const [activeTab, setActiveTab] = React.useState(tabFromUrl || "opportunities");

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-4 sm:py-8">
      <SEOHead 
        title="CRM - Zugruppe"
        description="Gestão de clientes e oportunidades"
        noindex={true}
      />
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="mb-4 sm:mb-8">
          <h1 className="text-2xl sm:text-4xl font-bold text-slate-900 mb-1 sm:mb-2">CRM</h1>
          <p className="text-sm sm:text-base text-slate-600">Gestão de contactos e comunicações</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex w-full overflow-x-auto mb-4 sm:mb-8 gap-1 sm:grid sm:grid-cols-6">
            <TabsTrigger value="metrics" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 min-w-fit">
              <PieChart className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline sm:inline">Métricas</span>
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 min-w-fit">
              <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="clients" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 min-w-fit">
              <Users className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline sm:inline">Contactos</span>
            </TabsTrigger>
            <TabsTrigger value="opportunities" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 min-w-fit">
              <Target className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline sm:inline">Oportunidades</span>
            </TabsTrigger>
            <TabsTrigger value="matching" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 min-w-fit">
              <Brain className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline sm:inline">Matching</span>
            </TabsTrigger>
            <TabsTrigger value="appointments" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 min-w-fit">
              <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline sm:inline">Agenda</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="metrics">
            <React.Suspense fallback={<div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" /></div>}>
              <CRMMetricsDashboard />
            </React.Suspense>
          </TabsContent>

          <TabsContent value="dashboard">
            <React.Suspense fallback={<div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" /></div>}>
              <CRMDashboard />
            </React.Suspense>
          </TabsContent>

          <TabsContent value="clients">
            <React.Suspense fallback={<div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" /></div>}>
              <ClientDatabase />
            </React.Suspense>
          </TabsContent>

          <TabsContent value="opportunities">
            <React.Suspense fallback={<div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" /></div>}>
              <OpportunitiesContent />
            </React.Suspense>
          </TabsContent>

          <TabsContent value="matching">
            <React.Suspense fallback={<div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" /></div>}>
              <MatchingTab />
            </React.Suspense>
          </TabsContent>

          <TabsContent value="appointments">
            <React.Suspense fallback={<div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" /></div>}>
              <AppointmentScheduler />
            </React.Suspense>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}