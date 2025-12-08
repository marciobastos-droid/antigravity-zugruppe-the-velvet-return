import React from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, Globe, Trash2, Play, Pause, CheckCircle2, XCircle, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

const AVAILABLE_PORTALS = [
  { id: "idealista", name: "Idealista" },
  { id: "imovirtual", name: "Imovirtual" },
  { id: "casafari", name: "Casafari" },
  { id: "olx", name: "OLX" },
  { id: "supercasa", name: "Supercasa" },
  { id: "custojusto", name: "Custo Justo" }
];

const AVAILABLE_PAGES = [
  { id: "zugruppe", name: "ZuGruppe" },
  { id: "zuhaus", name: "ZuHaus" },
  { id: "zuhandel", name: "ZuHandel" },
  { id: "homepage_featured", name: "Homepage - Destaque" },
  { id: "investor_section", name: "Secção Investidores" },
  { id: "luxury_collection", name: "Coleção Luxo" }
];

export default function PublicationScheduler({ open, onOpenChange, propertyId, propertyTitle }) {
  const queryClient = useQueryClient();
  const [selectedPortals, setSelectedPortals] = React.useState([]);
  const [selectedPages, setSelectedPages] = React.useState([]);
  const [scheduledDate, setScheduledDate] = React.useState("");
  const [scheduledTime, setScheduledTime] = React.useState("");
  const [unpublishDate, setUnpublishDate] = React.useState("");
  const [unpublishTime, setUnpublishTime] = React.useState("");
  const [recurring, setRecurring] = React.useState(false);
  const [recurringPattern, setRecurringPattern] = React.useState("weekly");
  const [autoOptimize, setAutoOptimize] = React.useState(false);

  const { data: scheduledPublications = [] } = useQuery({
    queryKey: ['scheduledPublications', propertyId],
    queryFn: async () => {
      const all = await base44.entities.ScheduledPublication.list('-scheduled_date');
      return all.filter(sp => sp.property_id === propertyId);
    },
    enabled: !!propertyId
  });

  const createScheduleMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.ScheduledPublication.create(data);
    },
    onSuccess: () => {
      toast.success("Publicação agendada!");
      queryClient.invalidateQueries({ queryKey: ['scheduledPublications'] });
      resetForm();
    }
  });

  const deleteScheduleMutation = useMutation({
    mutationFn: (id) => base44.entities.ScheduledPublication.delete(id),
    onSuccess: () => {
      toast.success("Agendamento cancelado");
      queryClient.invalidateQueries({ queryKey: ['scheduledPublications'] });
    }
  });

  const resetForm = () => {
    setSelectedPortals([]);
    setSelectedPages([]);
    setScheduledDate("");
    setScheduledTime("");
    setUnpublishDate("");
    setUnpublishTime("");
    setRecurring(false);
    setAutoOptimize(false);
  };

  const handleSchedule = () => {
    if (!scheduledDate || !scheduledTime) {
      toast.error("Selecione data e hora");
      return;
    }

    if (selectedPortals.length === 0 && selectedPages.length === 0) {
      toast.error("Selecione pelo menos um portal ou página");
      return;
    }

    const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
    const unpublishDateTime = unpublishDate && unpublishTime ? new Date(`${unpublishDate}T${unpublishTime}`) : null;

    createScheduleMutation.mutate({
      property_id: propertyId,
      property_title: propertyTitle,
      portals: selectedPortals,
      pages: selectedPages,
      scheduled_date: scheduledDateTime.toISOString(),
      unpublish_date: unpublishDateTime?.toISOString(),
      recurring,
      recurring_pattern: recurring ? recurringPattern : null,
      auto_optimize: autoOptimize
    });
  };

  const statusColors = {
    pending: "bg-amber-100 text-amber-800",
    published: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800",
    cancelled: "bg-slate-100 text-slate-800"
  };

  const statusIcons = {
    pending: Clock,
    published: CheckCircle2,
    failed: XCircle,
    cancelled: AlertCircle
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            Agendar Publicações
          </DialogTitle>
          {propertyTitle && <p className="text-sm text-slate-600 mt-1">{propertyTitle}</p>}
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-6 mt-4">
          {/* Form */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Nova Publicação Agendada</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Date & Time */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Data de Publicação *</Label>
                    <Input
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Hora *</Label>
                    <Input
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                    />
                  </div>
                </div>

                {/* Unpublish Date */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Data de Remoção (opcional)</Label>
                    <Input
                      type="date"
                      value={unpublishDate}
                      onChange={(e) => setUnpublishDate(e.target.value)}
                      min={scheduledDate || new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Hora</Label>
                    <Input
                      type="time"
                      value={unpublishTime}
                      onChange={(e) => setUnpublishTime(e.target.value)}
                      disabled={!unpublishDate}
                    />
                  </div>
                </div>

                {/* Portals */}
                <div>
                  <Label className="text-xs mb-2 block">Portais</Label>
                  <div className="space-y-2">
                    {AVAILABLE_PORTALS.map((portal) => (
                      <div key={portal.id} className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedPortals.includes(portal.id)}
                          onCheckedChange={(checked) => {
                            setSelectedPortals(prev =>
                              checked ? [...prev, portal.id] : prev.filter(p => p !== portal.id)
                            );
                          }}
                        />
                        <span className="text-sm">{portal.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pages */}
                <div>
                  <Label className="text-xs mb-2 block">Páginas do Website</Label>
                  <div className="space-y-2">
                    {AVAILABLE_PAGES.map((page) => (
                      <div key={page.id} className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedPages.includes(page.id)}
                          onCheckedChange={(checked) => {
                            setSelectedPages(prev =>
                              checked ? [...prev, page.id] : prev.filter(p => p !== page.id)
                            );
                          }}
                        />
                        <span className="text-sm">{page.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Options */}
                <div className="space-y-3 pt-3 border-t">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Publicação Recorrente</Label>
                    <Switch checked={recurring} onCheckedChange={setRecurring} />
                  </div>

                  {recurring && (
                    <Select value={recurringPattern} onValueChange={setRecurringPattern}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Diária</SelectItem>
                        <SelectItem value="weekly">Semanal</SelectItem>
                        <SelectItem value="monthly">Mensal</SelectItem>
                      </SelectContent>
                    </Select>
                  )}

                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Otimização Automática</Label>
                    <Switch checked={autoOptimize} onCheckedChange={setAutoOptimize} />
                  </div>
                </div>

                <Button
                  onClick={handleSchedule}
                  disabled={createScheduleMutation.isPending}
                  className="w-full"
                >
                  {createScheduleMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      A agendar...
                    </>
                  ) : (
                    <>
                      <Calendar className="w-4 h-4 mr-2" />
                      Agendar Publicação
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Scheduled List */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Publicações Agendadas</CardTitle>
              </CardHeader>
              <CardContent>
                {scheduledPublications.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Sem publicações agendadas</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {scheduledPublications.map((schedule) => {
                      const StatusIcon = statusIcons[schedule.status];
                      return (
                        <div key={schedule.id} className="border rounded-lg p-3">
                          <div className="flex items-start justify-between mb-2">
                            <Badge className={statusColors[schedule.status]}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {schedule.status === 'pending' ? 'Pendente' :
                               schedule.status === 'published' ? 'Publicado' :
                               schedule.status === 'failed' ? 'Falhou' : 'Cancelado'}
                            </Badge>
                            {schedule.status === 'pending' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteScheduleMutation.mutate(schedule.id)}
                                className="h-6 w-6 p-0 text-red-600"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                          <div className="space-y-1 text-xs">
                            <div className="flex items-center gap-1 text-slate-600">
                              <Calendar className="w-3 h-3" />
                              {new Date(schedule.scheduled_date).toLocaleString('pt-PT')}
                            </div>
                            {schedule.portals?.length > 0 && (
                              <div className="flex items-center gap-1">
                                <Globe className="w-3 h-3 text-blue-600" />
                                <span className="text-slate-600">{schedule.portals.length} portais</span>
                              </div>
                            )}
                            {schedule.pages?.length > 0 && (
                              <div className="flex items-center gap-1">
                                <Globe className="w-3 h-3 text-green-600" />
                                <span className="text-slate-600">{schedule.pages.length} páginas</span>
                              </div>
                            )}
                            {schedule.recurring && (
                              <Badge variant="outline" className="text-xs">
                                Recorrente ({schedule.recurring_pattern})
                              </Badge>
                            )}
                            {schedule.auto_optimize && (
                              <Badge variant="outline" className="text-xs">
                                Otimização Auto
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}