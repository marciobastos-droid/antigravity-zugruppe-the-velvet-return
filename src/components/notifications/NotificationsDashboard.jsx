import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, Megaphone, Settings } from "lucide-react";
import TeamAlertsBroadcaster from "./TeamAlertsBroadcaster";
import NotificationPreferences from "./NotificationPreferences";

export default function NotificationsDashboard() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const isAdmin = user && (
    user.role === 'admin' || 
    user.user_type?.toLowerCase() === 'admin' ||
    user.user_type?.toLowerCase() === 'gestor'
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-slate-900 mb-2">Central de Notificações</h2>
        <p className="text-slate-600">Gerir alertas, preferências e comunicações de equipa</p>
      </div>

      <Tabs defaultValue={isAdmin ? "broadcast" : "preferences"}>
        <TabsList>
          {isAdmin && (
            <TabsTrigger value="broadcast" className="flex items-center gap-2">
              <Megaphone className="w-4 h-4" />
              Difusão de Alertas
            </TabsTrigger>
          )}
          <TabsTrigger value="preferences" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Minhas Preferências
          </TabsTrigger>
        </TabsList>

        {isAdmin && (
          <TabsContent value="broadcast" className="mt-6">
            <TeamAlertsBroadcaster />
          </TabsContent>
        )}

        <TabsContent value="preferences" className="mt-6">
          <NotificationPreferences user={user} />
        </TabsContent>
      </Tabs>
    </div>
  );
}