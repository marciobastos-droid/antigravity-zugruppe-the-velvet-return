import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Bell, Mail, Plug, RefreshCw } from "lucide-react";
import GoogleCalendarIntegration from "./GoogleCalendarIntegration";
import PushNotificationManager from "./PushNotificationManager";
import EmailSyncStatus from "./EmailSyncStatus";
import GmailSyncManager from "./GmailSyncManager";

export default function IntegrationsHub() {
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me(),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Plug className="w-8 h-8 text-blue-600" />
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Integrações</h2>
          <p className="text-slate-600">Conecte ferramentas externas para melhorar a produtividade</p>
        </div>
      </div>

      <Tabs defaultValue="gmail" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="gmail" className="flex items-center gap-2">
            <Mail className="w-4 h-4" />
            <span className="hidden sm:inline">Gmail Sync</span>
          </TabsTrigger>
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span className="hidden sm:inline">Calendar</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            <span className="hidden sm:inline">Notificações</span>
          </TabsTrigger>
          <TabsTrigger value="email" className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">SMTP</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="gmail" className="mt-6">
          <GmailSyncManager />
        </TabsContent>

        <TabsContent value="calendar" className="mt-6">
          <GoogleCalendarIntegration />
        </TabsContent>

        <TabsContent value="notifications" className="mt-6">
          <PushNotificationManager user={user} />
        </TabsContent>

        <TabsContent value="email" className="mt-6">
          <EmailSyncStatus user={user} />
        </TabsContent>
      </Tabs>
    </div>
  );
}