import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Users, Crown, Wrench, TrendingUp, Loader2 } from "lucide-react";
import AdminMetrics from "../components/admin/AdminMetrics";
import AdminUsersManager from "../components/admin/AdminUsersManager";
import AdminSubscriptionsManager from "../components/admin/AdminSubscriptionsManager";
import AdminPlanConfigurator from "../components/admin/AdminPlanConfigurator";

export default function AdminDashboard() {
  // Auth check - only admin
  React.useEffect(() => {
    base44.auth.me().then(user => {
      if (!user || (user.role !== 'admin' && user.user_type !== 'admin' && user.user_type !== 'gestor')) {
        window.location.href = '/';
      }
    }).catch(() => {
      window.location.href = '/';
    });
  }, []);

  const { data: user, isLoading } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-blue-100 rounded-xl">
              <Shield className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Painel Administrativo</h1>
              <p className="text-slate-600">Gestão centralizada da plataforma</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="metrics" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto">
            <TabsTrigger value="metrics" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              <span className="hidden sm:inline">Métricas</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Utilizadores</span>
            </TabsTrigger>
            <TabsTrigger value="subscriptions" className="flex items-center gap-2">
              <Crown className="w-4 h-4" />
              <span className="hidden sm:inline">Subscrições</span>
            </TabsTrigger>
            <TabsTrigger value="plans" className="flex items-center gap-2">
              <Wrench className="w-4 h-4" />
              <span className="hidden sm:inline">Planos</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="metrics">
            <AdminMetrics />
          </TabsContent>

          <TabsContent value="users">
            <AdminUsersManager />
          </TabsContent>

          <TabsContent value="subscriptions">
            <AdminSubscriptionsManager />
          </TabsContent>

          <TabsContent value="plans">
            <AdminPlanConfigurator />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}