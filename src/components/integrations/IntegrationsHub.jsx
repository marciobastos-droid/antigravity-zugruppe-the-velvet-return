import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Bell, Mail, Plug } from "lucide-react";
import GoogleCalendarIntegration from "./GoogleCalendarIntegration";
import PushNotificationManager from "./PushNotificationManager";
import EmailSyncStatus from "./EmailSyncStatus";

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

      <Tabs defaultValue="calendar" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span className="hidden sm:inline">Calendar</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            <span className="hidden sm:inline">Notificações</span>
          </TabsTrigger>
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="w-4 h-4" />
            <span className="hidden sm:inline">Email</span>
          </TabsTrigger>
        </TabsList>

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