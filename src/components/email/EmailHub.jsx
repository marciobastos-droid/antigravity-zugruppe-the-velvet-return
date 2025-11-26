import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Zap, History, Settings } from "lucide-react";
import EmailTemplateManager from "./EmailTemplateManager";
import EmailAutomationManager from "./EmailAutomationManager";
import EmailHistory from "./EmailHistory";

export default function EmailHub() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Centro de Email</h2>
        <p className="text-slate-600">Gerir templates, automações e histórico de emails</p>
      </div>

      <Tabs defaultValue="templates" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="automations" className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Automações
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="w-4 h-4" />
            Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="mt-6">
          <EmailTemplateManager />
        </TabsContent>

        <TabsContent value="automations" className="mt-6">
          <EmailAutomationManager />
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <EmailHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
}