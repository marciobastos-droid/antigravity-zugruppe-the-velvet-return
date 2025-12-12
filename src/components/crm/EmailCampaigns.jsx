import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import {
  Mail, Plus, Send, Edit, Trash2, Users, TrendingUp, 
  Clock, CheckCircle2, XCircle, Loader2, Eye, Play, Pause,
  BarChart3, Target, Calendar
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

export default function EmailCampaigns() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    subject: "",
    body: "",
    segment_id: "",
    segment_name: "",
    scheduled_date: "",
    scheduled_time: "10:00",
    status: "draft",
    test_email: ""
  });

  const { data: campaigns = [], isLoading: loadingCampaigns } = useQuery({
    queryKey: ['marketingCampaigns'],
    queryFn: () => base44.entities.MarketingCampaign.list('-created_date')
  });

  const { data: segments = [] } = useQuery({
    queryKey: ['clientSegments'],
    queryFn: () => base44.entities.ClientSegment.list()
  });

  const { data: opportunities = [] } = useQuery({
    queryKey: ['opportunities'],
    queryFn: () => base44.entities.Opportunity.list()
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['buyerProfiles'],
    queryFn: () => base44.entities.BuyerProfile.list()
  });

  const createCampaignMutation = useMutation({
    mutationFn: async (data) => {
      const segment = segments.find(s => s.id === data.segment_id);
      const allClients = [...opportunities, ...profiles];
      
      // Calculate recipients based on segment criteria
      const recipients = allClients.filter(client => {
        if (!segment?.criteria) return false;
        
        const budget = client.budget || client.budget_max || 0;
        if (segment.criteria.budget_min && budget < segment.criteria.budget_min) return false;
        if (segment.criteria.budget_max && budget > segment.criteria.budget_max) return false;

        if (segment.criteria.locations?.length > 0) {
          const clientLocations = client.locations || [client.location];
          const hasMatch = segment.criteria.locations.some(loc => 
            clientLocations.some(cl => cl?.toLowerCase().includes(loc.toLowerCase()))
          );
          if (!hasMatch) return false;
        }

        return true;
      });

      const scheduledDateTime = data.scheduled_date && data.scheduled_time
        ? `${data.scheduled_date}T${data.scheduled_time}:00`
        : null;

      return await base44.entities.MarketingCampaign.create({
        name: data.name,
        type: 'email',
        status: data.status,
        segment_id: data.segment_id,
        segment_name: segment?.name || '',
        subject: data.subject,
        content: data.body,
        scheduled_date: scheduledDateTime,
        target_audience_count: recipients.length,
        stats: {
          sent: 0,
          delivered: 0,
          opened: 0,
          clicked: 0,
          bounced: 0,
          unsubscribed: 0
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketingCampaigns'] });
      toast.success("Campanha criada");
      resetForm();
    }
  });

  const updateCampaignMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MarketingCampaign.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketingCampaigns'] });
      toast.success("Campanha atualizada");
    }
  });

  const sendTestEmailMutation = useMutation({
    mutationFn: async ({ email, subject, body }) => {
      await base44.integrations.Core.SendEmail({
        to: email,
        subject: `[TESTE] ${subject}`,
        body: body
      });
    },
    onSuccess: () => {
      toast.success("Email de teste enviado");
    }
  });

  const resetForm = () => {
    setFormData({
      name: "",
      subject: "",
      body: "",
      segment_id: "",
      segment_name: "",
      scheduled_date: "",
      scheduled_time: "10:00",
      status: "draft",
      test_email: ""
    });
    setEditingCampaign(null);
    setDialogOpen(false);
  };

  const handleEdit = (campaign) => {
    const schedDate = campaign.scheduled_date ? new Date(campaign.scheduled_date) : null;
    setEditingCampaign(campaign);
    setFormData({
      name: campaign.name,
      subject: campaign.subject || '',
      body: campaign.content || '',
      segment_id: campaign.segment_id || '',
      segment_name: campaign.segment_name || '',
      scheduled_date: schedDate ? format(schedDate, 'yyyy-MM-dd') : '',
      scheduled_time: schedDate ? format(schedDate, 'HH:mm') : '10:00',
      status: campaign.status,
      test_email: ''
    });
    setDialogOpen(true);
  };

  const sendCampaign = (campaign) => {
    updateCampaignMutation.mutate({
      id: campaign.id,
      data: {
        status: 'sending',
        sent_date: new Date().toISOString()
      }
    });
    
    toast.success("Campanha em envio! Os emails serão processados em segundo plano.");
  };

  const stats = useMemo(() => {
    const draft = campaigns.filter(c => c.status === 'draft').length;
    const scheduled = campaigns.filter(c => c.status === 'scheduled').length;
    const sent = campaigns.filter(c => c.status === 'sent' || c.status === 'completed').length;
    const totalSent = campaigns.reduce((sum, c) => sum + (c.stats?.sent || 0), 0);
    const totalOpened = campaigns.reduce((sum, c) => sum + (c.stats?.opened || 0), 0);
    const openRate = totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0;

    return { draft, scheduled, sent, totalSent, totalOpened, openRate };
  }, [campaigns]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Mail className="w-6 h-6 text-indigo-600" />
            Campanhas de Email
          </h2>
          <p className="text-slate-600 mt-1">Crie campanhas direcionadas para segmentos de clientes</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="w-4 h-4 mr-2" />
          Nova Campanha
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Rascunhos</p>
            <p className="text-2xl font-bold text-slate-600">{stats.draft}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Agendadas</p>
            <p className="text-2xl font-bold text-amber-600">{stats.scheduled}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Enviadas</p>
            <p className="text-2xl font-bold text-green-600">{stats.sent}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Taxa de Abertura</p>
            <p className="text-2xl font-bold text-indigo-600">{stats.openRate}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Campaigns List */}
      {loadingCampaigns ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </div>
      ) : campaigns.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Mail className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Sem campanhas</h3>
            <p className="text-slate-600 mb-4">Crie a primeira campanha de email</p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Criar Campanha
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {campaigns.map(campaign => {
            const segment = segments.find(s => s.id === campaign.segment_id);
            const statusConfig = {
              draft: { label: 'Rascunho', color: 'bg-slate-100 text-slate-800', icon: Edit },
              scheduled: { label: 'Agendada', color: 'bg-amber-100 text-amber-800', icon: Clock },
              sending: { label: 'A Enviar', color: 'bg-blue-100 text-blue-800', icon: Loader2 },
              sent: { label: 'Enviada', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
              completed: { label: 'Completa', color: 'bg-green-100 text-green-800', icon: CheckCircle2 }
            }[campaign.status] || { label: campaign.status, color: 'bg-slate-100', icon: Mail };

            const StatusIcon = statusConfig.icon;

            return (
              <Card key={campaign.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-slate-900">{campaign.name}</h3>
                        <Badge className={statusConfig.color}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {statusConfig.label}
                        </Badge>
                        {segment && (
                          <Badge variant="outline">
                            <Target className="w-3 h-3 mr-1" />
                            {segment.name}
                          </Badge>
                        )}
                      </div>

                      <p className="text-sm text-slate-600 mb-3">
                        <strong>Assunto:</strong> {campaign.subject}
                      </p>

                      <div className="flex items-center gap-4 text-sm">
                        <span className="flex items-center gap-1 text-slate-600">
                          <Users className="w-4 h-4" />
                          {campaign.target_audience_count || 0} destinatários
                        </span>
                        {campaign.stats && (
                          <>
                            <span className="flex items-center gap-1 text-blue-600">
                              <Mail className="w-4 h-4" />
                              {campaign.stats.sent || 0} enviados
                            </span>
                            <span className="flex items-center gap-1 text-green-600">
                              <Eye className="w-4 h-4" />
                              {campaign.stats.opened || 0} abertos
                            </span>
                          </>
                        )}
                        {campaign.scheduled_date && campaign.status === 'scheduled' && (
                          <span className="flex items-center gap-1 text-amber-600">
                            <Calendar className="w-4 h-4" />
                            {format(new Date(campaign.scheduled_date), "dd/MM HH:mm", { locale: pt })}
                          </span>
                        )}
                      </div>

                      {campaign.stats?.sent > 0 && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span>Taxa de abertura</span>
                            <span className="font-semibold">
                              {Math.round((campaign.stats.opened / campaign.stats.sent) * 100)}%
                            </span>
                          </div>
                          <Progress 
                            value={(campaign.stats.opened / campaign.stats.sent) * 100} 
                            className="h-2"
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      {campaign.status === 'draft' && (
                        <Button
                          size="sm"
                          onClick={() => sendCampaign(campaign)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(campaign)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setFormData({ ...formData, subject: campaign.subject, body: campaign.content });
                          setPreviewOpen(true);
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCampaign ? 'Editar' : 'Nova'} Campanha</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nome da Campanha *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Ex: Newsletter Dezembro"
                />
              </div>
              <div>
                <Label>Segmento Alvo *</Label>
                <Select
                  value={formData.segment_id}
                  onValueChange={(v) => {
                    const seg = segments.find(s => s.id === v);
                    setFormData({
                      ...formData,
                      segment_id: v,
                      segment_name: seg?.name || ''
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {segments.map(seg => (
                      <SelectItem key={seg.id} value={seg.id}>
                        {seg.name} ({seg.member_count || 0} membros)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Assunto do Email *</Label>
              <Input
                value={formData.subject}
                onChange={(e) => setFormData({...formData, subject: e.target.value})}
                placeholder="Ex: Novos imóveis selecionados para si"
              />
            </div>

            <div>
              <Label>Corpo do Email *</Label>
              <Textarea
                value={formData.body}
                onChange={(e) => setFormData({...formData, body: e.target.value})}
                placeholder="Use {{nome}}, {{localizacao}} para personalizar..."
                rows={10}
              />
              <p className="text-xs text-slate-500 mt-1">
                Variáveis disponíveis: {"{{nome}}"}, {"{{email}}"}, {"{{localizacao}}"}, {"{{orcamento}}"}
              </p>
            </div>

            {/* Scheduling */}
            <div className="grid grid-cols-3 gap-4 border-t pt-4">
              <div className="col-span-3">
                <Label className="text-sm font-semibold">Agendamento (opcional)</Label>
              </div>
              <div>
                <Label className="text-xs">Data</Label>
                <Input
                  type="date"
                  value={formData.scheduled_date}
                  onChange={(e) => setFormData({...formData, scheduled_date: e.target.value})}
                />
              </div>
              <div>
                <Label className="text-xs">Hora</Label>
                <Input
                  type="time"
                  value={formData.scheduled_time}
                  onChange={(e) => setFormData({...formData, scheduled_time: e.target.value})}
                />
              </div>
              <div className="flex items-end">
                {formData.scheduled_date ? (
                  <Badge className="bg-amber-100 text-amber-800">
                    <Clock className="w-3 h-3 mr-1" />
                    Agendada
                  </Badge>
                ) : (
                  <Badge variant="outline">Envio imediato</Badge>
                )}
              </div>
            </div>

            {/* Test Email */}
            <div className="border-t pt-4">
              <Label className="text-sm font-semibold mb-2 block">Enviar Email de Teste</Label>
              <div className="flex gap-2">
                <Input
                  type="email"
                  value={formData.test_email}
                  onChange={(e) => setFormData({...formData, test_email: e.target.value})}
                  placeholder="seu@email.com"
                />
                <Button
                  variant="outline"
                  onClick={() => {
                    if (!formData.test_email || !formData.subject || !formData.body) {
                      toast.error("Preencha o email, assunto e corpo");
                      return;
                    }
                    sendTestEmailMutation.mutate({
                      email: formData.test_email,
                      subject: formData.subject,
                      body: formData.body
                    });
                  }}
                  disabled={sendTestEmailMutation.isPending}
                >
                  {sendTestEmailMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  if (!formData.name || !formData.subject || !formData.body || !formData.segment_id) {
                    toast.error("Preencha todos os campos obrigatórios");
                    return;
                  }
                  createCampaignMutation.mutate({
                    ...formData,
                    status: formData.scheduled_date ? 'scheduled' : 'draft'
                  });
                }}
                disabled={createCampaignMutation.isPending}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {createCampaignMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : editingCampaign ? (
                  'Atualizar'
                ) : (
                  formData.scheduled_date ? 'Agendar' : 'Criar Rascunho'
                )}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Preview do Email</DialogTitle>
          </DialogHeader>
          <div className="border rounded-lg p-6 bg-white">
            <h3 className="font-bold text-lg mb-4">{formData.subject}</h3>
            <div className="whitespace-pre-wrap text-sm text-slate-700">
              {formData.body}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}