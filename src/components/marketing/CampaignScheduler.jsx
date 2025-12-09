import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, Clock, Play, Pause, Trash2, Edit2, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { format, isPast, isFuture } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function CampaignScheduler() {
  const [editingSchedule, setEditingSchedule] = useState(null);
  const queryClient = useQueryClient();

  const { data: campaigns = [] } = useQuery({
    queryKey: ['marketingCampaigns'],
    queryFn: () => base44.entities.MarketingCampaign.list('-created_date')
  });

  const scheduledCampaigns = campaigns.filter(c => 
    c.status === "scheduled" && c.start_date
  ).sort((a, b) => new Date(a.start_date) - new Date(b.start_date));

  const activateMutation = useMutation({
    mutationFn: (id) => base44.entities.MarketingCampaign.update(id, { 
      status: "active",
      metrics: {
        ...campaigns.find(c => c.id === id)?.metrics,
        started_at: new Date().toISOString()
      }
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketingCampaigns'] });
      toast.success("Campanha ativada!");
    }
  });

  const cancelMutation = useMutation({
    mutationFn: (id) => base44.entities.MarketingCampaign.update(id, { status: "cancelled" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketingCampaigns'] });
      toast.success("Campanha cancelada");
    }
  });

  const updateScheduleMutation = useMutation({
    mutationFn: ({ id, start_date, end_date }) => 
      base44.entities.MarketingCampaign.update(id, { start_date, end_date }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketingCampaigns'] });
      toast.success("Agendamento atualizado");
      setEditingSchedule(null);
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-blue-600" />
          Campanhas Agendadas
        </CardTitle>
      </CardHeader>
      <CardContent>
        {scheduledCampaigns.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <CalendarIcon className="w-12 h-12 mx-auto mb-2 opacity-20" />
            <p>Nenhuma campanha agendada</p>
          </div>
        ) : (
          <div className="space-y-3">
            {scheduledCampaigns.map(campaign => {
              const startDate = new Date(campaign.start_date);
              const endDate = campaign.end_date ? new Date(campaign.end_date) : null;
              const isStarted = isPast(startDate);
              const isEnded = endDate && isPast(endDate);

              return (
                <div key={campaign.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold">{campaign.name}</h4>
                        {isStarted && !isEnded && (
                          <Badge className="bg-green-100 text-green-700">Em curso</Badge>
                        )}
                        {!isStarted && (
                          <Badge className="bg-blue-100 text-blue-700">Agendada</Badge>
                        )}
                        {isEnded && (
                          <Badge className="bg-slate-100 text-slate-700">Finalizada</Badge>
                        )}
                      </div>
                      
                      <div className="space-y-1 text-sm text-slate-600">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <span>Início: {format(startDate, "dd MMM yyyy, HH:mm", { locale: ptBR })}</span>
                        </div>
                        {endDate && (
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            <span>Fim: {format(endDate, "dd MMM yyyy, HH:mm", { locale: ptBR })}</span>
                          </div>
                        )}
                      </div>

                      {campaign.properties?.length > 0 && (
                        <div className="mt-2">
                          <Badge variant="outline" className="text-xs">
                            {campaign.properties.length} {campaign.properties.length === 1 ? 'imóvel' : 'imóveis'}
                          </Badge>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {!isStarted && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingSchedule(campaign)}
                            className="text-blue-600 hover:bg-blue-50"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => activateMutation.mutate(campaign.id)}
                            className="text-green-600 hover:bg-green-50"
                          >
                            <Play className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => cancelMutation.mutate(campaign.id)}
                        className="text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Edit Schedule Form */}
                  {editingSchedule?.id === campaign.id && (
                    <div className="mt-4 pt-4 border-t space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Data de Início</Label>
                          <Input
                            type="datetime-local"
                            defaultValue={campaign.start_date?.substring(0, 16)}
                            onChange={(e) => setEditingSchedule({...editingSchedule, start_date: e.target.value})}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Data de Fim (opcional)</Label>
                          <Input
                            type="datetime-local"
                            defaultValue={campaign.end_date?.substring(0, 16)}
                            onChange={(e) => setEditingSchedule({...editingSchedule, end_date: e.target.value})}
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => updateScheduleMutation.mutate({
                            id: campaign.id,
                            start_date: editingSchedule.start_date,
                            end_date: editingSchedule.end_date
                          })}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Guardar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingSchedule(null)}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}