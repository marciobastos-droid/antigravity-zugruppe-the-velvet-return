import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart3, Target, Users, TrendingUp, LayoutDashboard, Eye, ShoppingCart } from "lucide-react";
import LeadSourceROIReport from "../components/reports/LeadSourceROIReport";
import PipelineAnalysisReport from "../components/reports/PipelineAnalysisReport";
import AgentPerformanceReport from "../components/reports/AgentPerformanceReport";
import PropertyPerformanceReport from "../components/reports/PropertyPerformanceReport";
import SalesReport from "../components/reports/SalesReport";
import RoleDashboard from "../components/dashboard/RoleDashboard";

export default function Reports() {
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2 flex items-center gap-3">
            <BarChart3 className="w-10 h-10 text-indigo-600" />
            Relatórios & Dashboards
          </h1>
          <p className="text-slate-600">Análises detalhadas e dashboards personalizáveis</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-6 mb-8">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="properties" className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Anúncios
            </TabsTrigger>
            <TabsTrigger value="sales" className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" />
              Vendas
            </TabsTrigger>
            <TabsTrigger value="sources" className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              ROI Origens
            </TabsTrigger>
            <TabsTrigger value="pipeline" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Pipeline
            </TabsTrigger>
            <TabsTrigger value="agents" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Agentes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <RoleDashboard />
          </TabsContent>

          <TabsContent value="properties">
            <PropertyPerformanceReport />
          </TabsContent>

          <TabsContent value="sales">
            <SalesReport />
          </TabsContent>

          <TabsContent value="sources">
            <LeadSourceROIReport />
          </TabsContent>

          <TabsContent value="pipeline">
            <PipelineAnalysisReport />
          </TabsContent>

          <TabsContent value="agents">
            <AgentPerformanceReport />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}