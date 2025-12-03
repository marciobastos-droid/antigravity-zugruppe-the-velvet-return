import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { 
  Shield, Users, BarChart3, Database, Settings, 
  AlertTriangle, Lock
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import AdminUsersTab from "../components/admin/AdminUsersTab";
import AdminStatsTab from "../components/admin/AdminStatsTab";
import AdminMaintenanceTab from "../components/admin/AdminMaintenanceTab";
import AdminCategoriesTab from "../components/admin/AdminCategoriesTab";

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState("users");

  const { data: user, isLoading: loadingUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  if (loadingUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900" />
      </div>
    );
  }

  // Verificar se é admin
  const isAdmin = user?.role === 'admin' || user?.user_type?.toLowerCase() === 'admin';
  
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Acesso Restrito</h2>
            <p className="text-slate-600">
              Este painel é exclusivo para administradores do sistema.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500 rounded-lg">
              <Shield className="w-6 h-6 text-slate-900" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">Painel de Administração</h1>
              <p className="text-slate-300 text-sm">Gestão completa do sistema</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 mb-6">
            <TabsTrigger value="users" className="gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Utilizadores</span>
            </TabsTrigger>
            <TabsTrigger value="stats" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Estatísticas</span>
            </TabsTrigger>
            <TabsTrigger value="maintenance" className="gap-2">
              <Database className="w-4 h-4" />
              <span className="hidden sm:inline">Manutenção</span>
            </TabsTrigger>
            <TabsTrigger value="categories" className="gap-2">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Categorias</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <AdminUsersTab />
          </TabsContent>

          <TabsContent value="stats">
            <AdminStatsTab />
          </TabsContent>

          <TabsContent value="maintenance">
            <AdminMaintenanceTab />
          </TabsContent>

          <TabsContent value="categories">
            <AdminCategoriesTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}