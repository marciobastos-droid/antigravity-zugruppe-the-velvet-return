import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Calendar, BarChart3, Brain, PieChart, Target } from "lucide-react";
import ClientDatabase from "../components/crm/ClientDatabase";
import AppointmentScheduler from "../components/crm/AppointmentScheduler";
import CRMDashboard from "../components/crm/CRMDashboard";
import MatchingTab from "@/components/crm/MatchingTab";
import CRMMetricsDashboard from "../components/crm/CRMMetricsDashboard";
import OpportunitiesContent from "../components/crm/OpportunitiesContent";

export default function CRMAdvanced() {
  // Auth check - redirect to login if not authenticated
  React.useEffect(() => {
    base44.auth.isAuthenticated().then(isAuth => {
      if (!isAuth) {
        base44.auth.redirectToLogin(window.location.pathname + window.location.search);
      }
    });
  }, []);

  // Read tab from URL params
  const urlParams = new URLSearchParams(window.location.search);
  const tabFromUrl = urlParams.get('tab');
  const [activeTab, setActiveTab] = React.useState(tabFromUrl || "opportunities");

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-4 sm:py-8">
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
            <CRMMetricsDashboard />
          </TabsContent>

          <TabsContent value="dashboard">
            <CRMDashboard />
          </TabsContent>

          <TabsContent value="clients">
            <ClientDatabase />
          </TabsContent>

          <TabsContent value="opportunities">
            <OpportunitiesContent />
          </TabsContent>

          <TabsContent value="matching">
            <MatchingTab />
          </TabsContent>

          <TabsContent value="appointments">
            <AppointmentScheduler />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}