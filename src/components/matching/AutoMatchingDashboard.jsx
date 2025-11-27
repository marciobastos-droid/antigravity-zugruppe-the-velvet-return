import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Zap, Settings, Bell, Mail, CheckCircle2, Clock, AlertTriangle,
  Play, Pause, RefreshCw, Loader2, Building2, Users, Target,
  Eye, Send, X, TrendingUp, Sparkles, BarChart3
} from "lucide-react";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function AutoMatchingDashboard() {
  const queryClient = useQueryClient();
  const [processing, setProcessing] = useState(false);
  const [selectedAlerts, setSelectedAlerts] = useState([]);

  // Fetch data
  const { data: settings, isLoading: loadingSettings } = useQuery({
    queryKey: ['matchingSettings'],
    queryFn: async () => {
      const list = await base44.entities.MatchingSettings.list();
      return list[0] || null;
    }
  });

  const { data: alerts = [], isLoading: loadingAlerts } = useQuery({
    queryKey: ['matchAlerts'],
    queryFn: () => base44.entities.MatchAlert.list('-created_date')
  });

  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list('-created_date')
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ['clientContacts'],
    queryFn: () => base44.entities.ClientContact.list('-created_date')
  });

  // Mutations
  const saveSettingsMutation = useMutation({
    mutationFn: async (data) => {
      if (settings?.id) {
        return base44.entities.MatchingSettings.update(settings.id, data);
      }
      return base44.entities.MatchingSettings.create(data);
    },
    onSuccess: () => {
      toast.success("Definições guardadas");
      queryClient.invalidateQueries({ queryKey: ['matchingSettings'] });
    }
  });

  const updateAlertMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MatchAlert.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['matchAlerts'] })
  });

  const deleteAlertMutation = useMutation({
    mutationFn: (id) => base44.entities.MatchAlert.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['matchAlerts'] })
  });

  // Calculate match score
  const calculateMatchScore = (contact, property) => {
    const req = contact.property_requirements || {};
    if (!req || Object.keys(req).length === 0) return null;

    let score = 0;
    let maxScore = 0;
    const details = [];

    // Price match (30 points)
    if (req.budget_max || req.budget_min) {
      maxScore += 30;
      const price = property.price || 0;
      const min = req.budget_min || 0;
      const max = req.budget_max || Infinity;
      
      if (price >= min && price <= max) {
        score += 30;
        details.push({ factor: "Preço dentro do orçamento", points: 30, matched: true });
      } else if (price >= min * 0.9 && price <= max * 1.15) {
        score += 15;
        details.push({ factor: "Preço próximo do orçamento", points: 15, matched: true });
      } else {
        details.push({ factor: "Preço fora do orçamento", points: 0, matched: false });
      }
    }

    // Location match (25 points)
    if (req.locations?.length > 0) {
      maxScore += 25;
      const propCity = (property.city || '').toLowerCase();
      const propState = (property.state || '').toLowerCase();
      const matched = req.locations.some(l => 
        propCity.includes(l.toLowerCase()) || propState.includes(l.toLowerCase()) ||
        l.toLowerCase().includes(propCity) || l.toLowerCase().includes(propState)
      );
      if (matched) {
        score += 25;
        details.push({ factor: "Localização preferida", points: 25, matched: true });
      } else {
        details.push({ factor: "Localização diferente", points: 0, matched: false });
      }
    }

    // Property type match (20 points)
    if (req.property_types?.length > 0) {
      maxScore += 20;
      if (req.property_types.includes(property.property_type)) {
        score += 20;
        details.push({ factor: "Tipo de imóvel desejado", points: 20, matched: true });
      } else {
        details.push({ factor: "Tipo de imóvel diferente", points: 0, matched: false });
      }
    }

    // Bedrooms match (15 points)
    if (req.bedrooms_min) {
      maxScore += 15;
      if (property.bedrooms >= req.bedrooms_min) {
        score += 15;
        details.push({ factor: "Quartos suficientes", points: 15, matched: true });
      } else {
        details.push({ factor: "Quartos insuficientes", points: 0, matched: false });
      }
    }

    // Listing type match (10 points)
    if (req.listing_type && req.listing_type !== 'both') {
      maxScore += 10;
      if (property.listing_type === req.listing_type) {
        score += 10;
        details.push({ factor: "Tipo de negócio correto", points: 10, matched: true });
      } else {
        details.push({ factor: "Tipo de negócio diferente", points: 0, matched: false });
      }
    }

    if (maxScore === 0) return null;
    return {
      score: Math.round((score / maxScore) * 100),
      details,
      maxScore,
      achievedScore: score
    };
  };

  // Run matching process
  const runMatchingProcess = async (type = 'full') => {
    setProcessing(true);
    const minScore = settings?.minimum_score || 70;
    const maxPerProperty = settings?.max_matches_per_property || 10;
    const maxPerClient = settings?.max_matches_per_client || 5;
    
    try {
      const activeProperties = properties.filter(p => p.status === 'active' && p.availability_status === 'available');
      const clientsWithRequirements = contacts.filter(c => 
        c.property_requirements && Object.keys(c.property_requirements).length > 0
      );

      const existingAlertKeys = new Set(alerts.map(a => `${a.contact_id}-${a.property_id}`));
      const newAlerts = [];
      const clientMatchCounts = {};
      const propertyMatchCounts = {};

      // Match each client against properties
      for (const contact of clientsWithRequirements) {
        clientMatchCounts[contact.id] = 0;

        for (const property of activeProperties) {
          // Skip if already exists
          if (existingAlertKeys.has(`${contact.id}-${property.id}`)) continue;

          // Check limits
          if (clientMatchCounts[contact.id] >= maxPerClient) break;
          if ((propertyMatchCounts[property.id] || 0) >= maxPerProperty) continue;

          const matchResult = calculateMatchScore(contact, property);
          if (!matchResult || matchResult.score < minScore) continue;

          newAlerts.push({
            contact_id: contact.id,
            contact_name: contact.full_name,
            contact_email: contact.email,
            property_id: property.id,
            property_title: property.title,
            match_score: matchResult.score,
            match_details: matchResult,
            trigger_type: type === 'new_property' ? 'new_property' : 
                          type === 'new_requirement' ? 'new_requirement' : 'periodic_check',
            status: 'pending',
            assigned_agent: contact.assigned_agent || property.assigned_consultant
          });

          clientMatchCounts[contact.id]++;
          propertyMatchCounts[property.id] = (propertyMatchCounts[property.id] || 0) + 1;
        }
      }

      // Create alerts in bulk
      if (newAlerts.length > 0) {
        await base44.entities.MatchAlert.bulkCreate(newAlerts);
        
        // Update last check time
        if (settings?.id) {
          await base44.entities.MatchingSettings.update(settings.id, {
            last_periodic_check: new Date().toISOString()
          });
        }

        toast.success(`${newAlerts.length} novos matches encontrados!`);
      } else {
        toast.info("Nenhum novo match encontrado");
      }

      queryClient.invalidateQueries({ queryKey: ['matchAlerts'] });
      queryClient.invalidateQueries({ queryKey: ['matchingSettings'] });

    } catch (error) {
      toast.error("Erro no processo de matching");
      console.error(error);
    }

    setProcessing(false);
  };

  // Send notifications for selected alerts
  const sendNotifications = async () => {
    const alertsToNotify = alerts.filter(a => 
      selectedAlerts.includes(a.id) && !a.notification_sent
    );

    if (alertsToNotify.length === 0) {
      toast.error("Nenhum alerta selecionado para notificar");
      return;
    }

    setProcessing(true);
    let sent = 0;

    try {
      for (const alert of alertsToNotify) {
        const property = properties.find(p => p.id === alert.property_id);
        if (!property) continue;

        const emailTo = settings?.notify_agents && alert.assigned_agent 
          ? alert.assigned_agent 
          : alert.contact_email;

        if (!emailTo) continue;

        await base44.integrations.Core.SendEmail({
          to: emailTo,
          subject: `🏠 Novo Match: ${property.title}`,
          body: `
            <h2>Novo Match de Imóvel!</h2>
            <p><strong>Cliente:</strong> ${alert.contact_name}</p>
            <p><strong>Imóvel:</strong> ${property.title}</p>
            <p><strong>Localização:</strong> ${property.city}, ${property.state}</p>
            <p><strong>Preço:</strong> €${property.price?.toLocaleString()}</p>
            <p><strong>Score de Compatibilidade:</strong> ${alert.match_score}%</p>
            <hr>
            <p>Este match foi gerado automaticamente pelo sistema de Matching Inteligente.</p>
          `
        });

        await base44.entities.MatchAlert.update(alert.id, {
          notification_sent: true,
          notification_sent_at: new Date().toISOString(),
          status: 'notified'
        });

        sent++;
      }

      toast.success(`${sent} notificações enviadas!`);
      setSelectedAlerts([]);
      queryClient.invalidateQueries({ queryKey: ['matchAlerts'] });

    } catch (error) {
      toast.error("Erro ao enviar notificações");
    }

    setProcessing(false);
  };

  // Stats
  const pendingAlerts = alerts.filter(a => a.status === 'pending').length;
  const notifiedAlerts = alerts.filter(a => a.notification_sent).length;
  const highScoreAlerts = alerts.filter(a => a.match_score >= 80).length;
  const avgScore = alerts.length > 0 
    ? Math.round(alerts.reduce((s, a) => s + a.match_score, 0) / alerts.length) 
    : 0;

  const getScoreColor = (score) => {
    if (score >= 80) return "bg-green-100 text-green-800 border-green-200";
    if (score >= 60) return "bg-blue-100 text-blue-800 border-blue-200";
    return "bg-amber-100 text-amber-800 border-amber-200";
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Total Matches</p>
                <p className="text-3xl font-bold">{alerts.length}</p>
              </div>
              <Target className="w-8 h-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm">Pendentes</p>
                <p className="text-2xl font-bold text-amber-600">{pendingAlerts}</p>
              </div>
              <Clock className="w-6 h-6 text-amber-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm">Score Médio</p>
                <p className="text-2xl font-bold text-slate-900">{avgScore}%</p>
              </div>
              <BarChart3 className="w-6 h-6 text-slate-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm">Notificados</p>
                <p className="text-2xl font-bold text-green-600">{notifiedAlerts}</p>
              </div>
              <Mail className="w-6 h-6 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="alerts">
        <TabsList>
          <TabsTrigger value="alerts" className="gap-2">
            <Bell className="w-4 h-4" />
            Alertas ({alerts.length})
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="w-4 h-4" />
            Definições
          </TabsTrigger>
        </TabsList>

        <TabsContent value="alerts" className="space-y-4">
          {/* Actions Bar */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Button 
                    onClick={() => runMatchingProcess('full')} 
                    disabled={processing}
                    className="bg-indigo-600 hover:bg-indigo-700"
                  >
                    {processing ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4 mr-2" />
                    )}
                    Executar Matching
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => queryClient.invalidateQueries({ queryKey: ['matchAlerts'] })}
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>

                {selectedAlerts.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{selectedAlerts.length} selecionados</Badge>
                    <Button 
                      onClick={sendNotifications} 
                      disabled={processing}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Enviar Notificações
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => setSelectedAlerts([])}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>

              {settings?.last_periodic_check && (
                <p className="text-xs text-slate-500 mt-2">
                  Última verificação: {formatDistanceToNow(new Date(settings.last_periodic_check), { locale: pt, addSuffix: true })}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Alerts List */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Matches Encontrados</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingAlerts ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                </div>
              ) : alerts.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <Target className="w-12 h-12 mx-auto mb-3" />
                  <p>Nenhum match encontrado</p>
                  <p className="text-sm">Execute o processo de matching para encontrar compatibilidades</p>
                </div>
              ) : (
                <ScrollArea className="h-[500px]">
                  <div className="space-y-3">
                    {alerts.map((alert) => {
                      const property = properties.find(p => p.id === alert.property_id);
                      return (
                        <div
                          key={alert.id}
                          className={`p-4 border rounded-lg transition-all ${
                            selectedAlerts.includes(alert.id) 
                              ? 'border-indigo-500 bg-indigo-50' 
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-start gap-4">
                            <input
                              type="checkbox"
                              checked={selectedAlerts.includes(alert.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedAlerts([...selectedAlerts, alert.id]);
                                } else {
                                  setSelectedAlerts(selectedAlerts.filter(id => id !== alert.id));
                                }
                              }}
                              className="mt-1"
                            />

                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-4">
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <Users className="w-4 h-4 text-slate-400" />
                                    <span className="font-medium text-slate-900">{alert.contact_name}</span>
                                    {alert.notification_sent && (
                                      <Badge variant="secondary" className="text-xs">
                                        <CheckCircle2 className="w-3 h-3 mr-1" />
                                        Notificado
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 text-sm text-slate-600">
                                    <Building2 className="w-4 h-4" />
                                    <span>{alert.property_title}</span>
                                  </div>
                                  {property && (
                                    <p className="text-xs text-slate-500 mt-1">
                                      {property.city} • €{property.price?.toLocaleString()} • T{property.bedrooms || 0}
                                    </p>
                                  )}
                                </div>

                                <div className="text-right flex-shrink-0">
                                  <Badge className={`text-lg px-3 py-1 ${getScoreColor(alert.match_score)}`}>
                                    {alert.match_score}%
                                  </Badge>
                                  <p className="text-xs text-slate-500 mt-1">
                                    {format(new Date(alert.created_date), 'dd/MM HH:mm')}
                                  </p>
                                </div>
                              </div>

                              {/* Match details */}
                              {alert.match_details?.details && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {alert.match_details.details.filter(d => d.matched).map((d, i) => (
                                    <Badge key={i} variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                      ✓ {d.factor}
                                    </Badge>
                                  ))}
                                </div>
                              )}

                              {/* Actions */}
                              <div className="flex items-center gap-2 mt-3">
                                <Link to={`${createPageUrl("PropertyDetails")}?id=${alert.property_id}`}>
                                  <Button size="sm" variant="outline">
                                    <Eye className="w-3 h-3 mr-1" />
                                    Ver Imóvel
                                  </Button>
                                </Link>
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  className="text-red-600"
                                  onClick={() => deleteAlertMutation.mutate(alert.id)}
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Configurações do Matching Automático
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Main toggle */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div>
                  <Label className="text-base font-medium">Matching Automático</Label>
                  <p className="text-sm text-slate-500">Ativar verificação automática de matches</p>
                </div>
                <Switch
                  checked={settings?.auto_matching_enabled ?? true}
                  onCheckedChange={(v) => saveSettingsMutation.mutate({ auto_matching_enabled: v })}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Score threshold */}
                <div>
                  <Label>Score Mínimo para Alerta</Label>
                  <div className="flex items-center gap-4 mt-2">
                    <Slider
                      value={[settings?.minimum_score || 70]}
                      onValueChange={([v]) => saveSettingsMutation.mutate({ minimum_score: v })}
                      min={50}
                      max={95}
                      step={5}
                      className="flex-1"
                    />
                    <Badge variant="outline" className="w-16 justify-center">
                      {settings?.minimum_score || 70}%
                    </Badge>
                  </div>
                </div>

                {/* Check frequency */}
                <div>
                  <Label>Frequência de Verificação</Label>
                  <Select
                    value={String(settings?.check_frequency_hours || 24)}
                    onValueChange={(v) => saveSettingsMutation.mutate({ check_frequency_hours: Number(v) })}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">A cada hora</SelectItem>
                      <SelectItem value="6">A cada 6 horas</SelectItem>
                      <SelectItem value="12">A cada 12 horas</SelectItem>
                      <SelectItem value="24">Diariamente</SelectItem>
                      <SelectItem value="168">Semanalmente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Max per property */}
                <div>
                  <Label>Máx. Matches por Imóvel</Label>
                  <Input
                    type="number"
                    value={settings?.max_matches_per_property || 10}
                    onChange={(e) => saveSettingsMutation.mutate({ max_matches_per_property: Number(e.target.value) })}
                    min={1}
                    max={50}
                    className="mt-2"
                  />
                </div>

                {/* Max per client */}
                <div>
                  <Label>Máx. Matches por Cliente</Label>
                  <Input
                    type="number"
                    value={settings?.max_matches_per_client || 5}
                    onChange={(e) => saveSettingsMutation.mutate({ max_matches_per_client: Number(e.target.value) })}
                    min={1}
                    max={20}
                    className="mt-2"
                  />
                </div>
              </div>

              {/* Notification settings */}
              <div className="border-t pt-6">
                <h4 className="font-medium mb-4 flex items-center gap-2">
                  <Bell className="w-4 h-4" />
                  Notificações por Email
                </h4>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Ativar Notificações Email</Label>
                      <p className="text-sm text-slate-500">Enviar emails quando encontrar matches</p>
                    </div>
                    <Switch
                      checked={settings?.email_notifications_enabled ?? true}
                      onCheckedChange={(v) => saveSettingsMutation.mutate({ email_notifications_enabled: v })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Notificar Agentes</Label>
                      <p className="text-sm text-slate-500">Enviar para o agente responsável</p>
                    </div>
                    <Switch
                      checked={settings?.notify_agents ?? true}
                      onCheckedChange={(v) => saveSettingsMutation.mutate({ notify_agents: v })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Notificar Clientes</Label>
                      <p className="text-sm text-slate-500">Enviar diretamente ao cliente</p>
                    </div>
                    <Switch
                      checked={settings?.notify_clients ?? false}
                      onCheckedChange={(v) => saveSettingsMutation.mutate({ notify_clients: v })}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}