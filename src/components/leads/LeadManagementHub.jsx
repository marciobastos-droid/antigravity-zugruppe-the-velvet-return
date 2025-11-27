import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Target, Zap, BarChart3, Users } from "lucide-react";
import LeadScoringEngine from "./LeadScoringEngine";
import LeadNurturing from "./LeadNurturing";
import LeadSourceAnalytics from "./LeadSourceAnalytics";

export default function LeadManagementHub() {
  const [activeTab, setActiveTab] = useState("sources");

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="sources" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Origens
          </TabsTrigger>
          <TabsTrigger value="nurturing" className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Nurturing
          </TabsTrigger>
          <TabsTrigger value="scoring" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            Scoring
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sources">
          <LeadSourceAnalytics />
        </TabsContent>

        <TabsContent value="nurturing">
          <LeadNurturing />
        </TabsContent>

        <TabsContent value="scoring">
          <div className="text-center py-12">
            <Target className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Lead Scoring</h3>
            <p className="text-slate-500">O scoring é calculado automaticamente em cada lead individual</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}