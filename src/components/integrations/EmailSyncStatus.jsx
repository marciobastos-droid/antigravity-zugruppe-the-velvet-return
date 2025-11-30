import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, RefreshCw, CheckCircle2, AlertCircle, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export default function EmailSyncStatus({ user }) {
  const [syncStatus, setSyncStatus] = React.useState('not_configured');

  // For now, this shows the status and provides guidance
  // Full email sync would require Gmail/Outlook OAuth integration

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Mail className="w-5 h-5 text-blue-600" />
          Sincronização de Email
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 bg-slate-50 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5" />
            <div>
              <p className="font-medium text-slate-900">Funcionalidade em Desenvolvimento</p>
              <p className="text-sm text-slate-600 mt-1">
                A sincronização automática de emails com Gmail/Outlook está em desenvolvimento.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium text-slate-700">Alternativas Disponíveis:</p>
          
          <div className="flex items-center gap-3 p-3 border rounded-lg">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <div className="flex-1">
              <p className="text-sm font-medium">Registo Manual de Comunicações</p>
              <p className="text-xs text-slate-500">Adicione emails enviados manualmente no CRM</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 border rounded-lg">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <div className="flex-1">
              <p className="text-sm font-medium">Templates de Email</p>
              <p className="text-xs text-slate-500">Use templates para enviar emails diretamente</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 border rounded-lg">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <div className="flex-1">
              <p className="text-sm font-medium">Histórico de Comunicação</p>
              <p className="text-xs text-slate-500">Todos os contactos são registados automaticamente</p>
            </div>
          </div>
        </div>

        <div className="pt-2">
          <p className="text-xs text-slate-500">
            💡 Dica: Use o botão "Adicionar Comunicação" em cada lead para registar emails enviados.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}