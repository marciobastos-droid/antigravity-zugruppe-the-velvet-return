import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Target, Users, TrendingUp, LayoutDashboard } from "lucide-react";
import LeadSourceROIReport from "../reports/LeadSourceROIReport";
import PipelineAnalysisReport from "../reports/PipelineAnalysisReport";
import AgentPerformanceReport from "../reports/AgentPerformanceReport";
import RoleDashboard from "./RoleDashboard";

export default function ReportsTab() {
  const [activeSubTab, setActiveSubTab] = useState("dashboard");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-1">Relatórios & Análises</h2>
        <p className="text-slate-600">Análises detalhadas e dashboards personalizáveis</p>
      </div>

      <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <LayoutDashboard className="w-4 h-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="sources" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            <span className="hidden sm:inline">ROI Origens</span>
          </TabsTrigger>
          <TabsTrigger value="pipeline" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            <span className="hidden sm:inline">Pipeline</span>
          </TabsTrigger>
          <TabsTrigger value="agents" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Agentes</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <RoleDashboard />
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
  );
}