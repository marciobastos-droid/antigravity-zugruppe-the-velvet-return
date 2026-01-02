import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, ClipboardList, Shield, BarChart3, UserPlus, Bell, TrendingUp, CreditCard, Settings } from "lucide-react";
import TaskManager from "../components/team/TaskManager";
import TeamDashboard from "../components/team/TeamDashboard";
import PermissionsManager from "../components/team/PermissionsManager";
import UserManagementTab from "../components/team/UserManagementTab";
import NotificationPreferences from "../components/notifications/NotificationPreferences";
import MarketingTeamManager from "../components/marketing/MarketingTeamManager";
import SubscriptionManager from "../components/subscription/SubscriptionManager";
import PendingSubscriptions from "../components/admin/PendingSubscriptions";
import AdminPropertiesManager from "../components/admin/AdminPropertiesManager";
import AdminUsersManager from "../components/admin/AdminUsersManager";

export default function TeamManagement() {
  const [activeTab, setActiveTab] = useState("dashboard");

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me(),
  });

  const isAdmin = user?.role === 'admin' || user?.user_type === 'admin' || user?.user_type === 'gestor';
  const isFullAdmin = user?.role === 'admin' || user?.user_type === 'admin';

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-600" />
            Gestão de Equipa
          </h1>
          <p className="text-slate-600 mt-1">
            Gerir tarefas, permissões e acompanhar o desempenho da equipa
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="tasks" className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4" />
              Tarefas
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="users" className="flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                Utilizadores
              </TabsTrigger>
            )}
            {isAdmin && (
              <TabsTrigger value="permissions" className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Permissões
              </TabsTrigger>
            )}
            {isAdmin && (
              <TabsTrigger value="marketing" className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Equipa Marketing
              </TabsTrigger>
            )}
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Notificações
            </TabsTrigger>
            {isFullAdmin && (
              <TabsTrigger value="subscriptions" className="flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Subscrições
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="dashboard">
            <TeamDashboard user={user} />
          </TabsContent>

          <TabsContent value="tasks">
            <TaskManager user={user} />
          </TabsContent>

          {isAdmin && (
            <TabsContent value="users">
              <UserManagementTab currentUser={user} />
            </TabsContent>
          )}

          {isAdmin && (
            <TabsContent value="permissions">
              <PermissionsManager />
            </TabsContent>
          )}

          {isAdmin && (
            <TabsContent value="marketing">
              <MarketingTeamManager />
            </TabsContent>
          )}

          <TabsContent value="notifications">
            <NotificationPreferences user={user} />
          </TabsContent>

          {isFullAdmin && (
            <TabsContent value="subscriptions">
              <Tabs defaultValue="manage" className="space-y-6">
                <TabsList>
                  <TabsTrigger value="manage">Gerir Planos</TabsTrigger>
                  <TabsTrigger value="pending">Pendentes</TabsTrigger>
                  <TabsTrigger value="properties">Imóveis</TabsTrigger>
                  <TabsTrigger value="users">Utilizadores</TabsTrigger>
                </TabsList>

                <TabsContent value="manage">
                  <SubscriptionManager />
                </TabsContent>

                <TabsContent value="pending">
                  <PendingSubscriptions />
                </TabsContent>

                <TabsContent value="properties">
                  <AdminPropertiesManager />
                </TabsContent>

                <TabsContent value="users">
                  <AdminUsersManager />
                </TabsContent>
              </Tabs>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}