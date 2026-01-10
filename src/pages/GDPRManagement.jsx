import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Shield, FileText, Users, Activity } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import GDPRAdminPanel from "../components/rgpd/GDPRAdminPanel";
import DSARRequestForm from "../components/rgpd/DSARRequestForm";
import { Card, CardContent } from "@/components/ui/card";

export default function GDPRManagement() {
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const isAdmin = user && (user.role === 'admin' || user.user_type === 'admin' || user.user_type === 'gestor');

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Shield className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Gestão RGPD</h1>
              <p className="text-sm text-slate-600">Acesso restrito a administradores</p>
            </div>
          </div>
          
          <Card>
            <CardContent className="p-8 text-center">
              <Shield className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Acesso Negado</h3>
              <p className="text-slate-600">
                Esta área é reservada a administradores e responsáveis pela proteção de dados (DPO).
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-blue-100 rounded-lg">
            <Shield className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Gestão RGPD</h1>
            <p className="text-slate-600">Conformidade com o Regulamento Geral sobre a Proteção de Dados</p>
          </div>
        </div>

        <GDPRAdminPanel />
      </div>
    </div>
  );
}