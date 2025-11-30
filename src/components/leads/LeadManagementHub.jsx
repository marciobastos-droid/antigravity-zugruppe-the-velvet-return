import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Target, Zap, BarChart3, Users } from "lucide-react";
import LeadNurturing from "./LeadNurturing";
import LeadSourceAnalytics from "./LeadSourceAnalytics";
import AutomatedLeadQualification from "./AutomatedLeadQualification";

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
            Qualificação
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sources">
          <LeadSourceAnalytics />
        </TabsContent>

        <TabsContent value="nurturing">
          <LeadNurturing />
        </TabsContent>

        <TabsContent value="scoring">
          <AutomatedLeadQualification />
        </TabsContent>
      </Tabs>
    </div>
  );
}