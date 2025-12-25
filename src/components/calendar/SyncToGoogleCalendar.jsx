import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, CheckCircle2, Loader2, RefreshCw, ExternalLink } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function SyncToGoogleCalendar({ appointmentIds = null }) {
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ['appointments', user?.email],
    queryFn: async () => {
      if (!user) return [];
      const all = await base44.entities.Appointment.list();
      return all.filter(a => a.assigned_agent === user.email);
    },
    enabled: !!user
  });

  const unsyncedCount = appointments.filter(a => !a.google_event_id && a.status !== 'cancelled').length;
  const syncedCount = appointments.filter(a => a.google_event_id).length;

  const handleSync = async () => {
    setSyncing(true);
    try {
      const response = await base44.functions.invoke('syncAppointmentsToGoogleCalendar', {
        appointmentIds: appointmentIds
      });

      if (response.data.success) {
        toast.success(`${response.data.synced} agendamento${response.data.synced > 1 ? 's sincronizados' : ' sincronizado'} com Google Calendar!`);
        if (response.data.failed > 0) {
          toast.warning(`${response.data.failed} agendamento${response.data.failed > 1 ? 's falharam' : ' falhou'}`);
        }
        queryClient.invalidateQueries({ queryKey: ['appointments'] });
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Erro ao sincronizar. Verifique se autorizou o Google Calendar.');
    }
    setSyncing(false);
  };

  return (
    <Card className="border-blue-200 bg-blue-50/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-600" />
          Google Calendar Sync
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="text-slate-700">{syncedCount} sincronizados</span>
            </div>
            {unsyncedCount > 0 && (
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-amber-600" />
                <span className="text-slate-700">{unsyncedCount} por sincronizar</span>
              </div>
            )}
          </div>
        </div>

        <Button
          onClick={handleSync}
          disabled={syncing || unsyncedCount === 0}
          className="w-full bg-blue-600 hover:bg-blue-700"
          size="sm"
        >
          {syncing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              A sincronizar...
            </>
          ) : (
            <>
              <Calendar className="w-4 h-4 mr-2" />
              Sincronizar {unsyncedCount > 0 ? `(${unsyncedCount})` : 'Tudo'}
            </>
          )}
        </Button>

        <p className="text-xs text-slate-500 text-center">
          Sincroniza automaticamente os seus agendamentos
        </p>
      </CardContent>
    </Card>
  );
}