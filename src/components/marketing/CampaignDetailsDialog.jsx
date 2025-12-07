import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, MousePointer, Users, Mail, TrendingUp, Building2, User } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import CampaignROICalculator from "./CampaignROICalculator";

export default function CampaignDetailsDialog({ campaign, open, onOpenChange }) {
  if (!campaign) return null;

  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list(),
    enabled: open
  });

  const { data: marketingTeam = [] } = useQuery({
    queryKey: ['marketingTeam'],
    queryFn: () => base44.entities.MarketingTeamMember.list(),
    enabled: open
  });

  const { data: opportunities = [] } = useQuery({
    queryKey: ['opportunities'],
    queryFn: () => base44.entities.Opportunity.list(),
    enabled: open
  });

  const linkedProperties = properties.filter(p => campaign.properties?.includes(p.id));
  const assignedMember = marketingTeam.find(m => m.user_email === campaign.assigned_to);

  const statusColors = {
    draft: "bg-slate-100 text-slate-800",
    scheduled: "bg-blue-100 text-blue-800",
    active: "bg-green-100 text-green-800",
    paused: "bg-yellow-100 text-yellow-800",
    completed: "bg-purple-100 text-purple-800",
    cancelled: "bg-red-100 text-red-800"
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{campaign.name}</DialogTitle>
            <Badge className={statusColors[campaign.status]}>
              {campaign.status}
            </Badge>
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="mt-4">
          <TabsList>
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="audience">Audiência</TabsTrigger>
            <TabsTrigger value="tracking">Tracking</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Informação da Campanha</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-500">Tipo</p>
                    <p className="font-medium">{campaign.campaign_type}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Objetivo</p>
                    <p className="font-medium">{campaign.objective}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Orçamento</p>
                    <p className="font-medium">€{campaign.budget || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Gasto</p>
                    <p className="font-medium">€{campaign.spent || 0}</p>
                  </div>
                  {campaign.start_date && (
                    <div>
                      <p className="text-sm text-slate-500">Data Início</p>
                      <p className="font-medium">{new Date(campaign.start_date).toLocaleDateString()}</p>
                    </div>
                  )}
                  {campaign.end_date && (
                    <div>
                      <p className="text-sm text-slate-500">Data Fim</p>
                      <p className="font-medium">{new Date(campaign.end_date).toLocaleDateString()}</p>
                    </div>
                  )}
                </div>

                {assignedMember && (
                  <div className="pt-3 border-t">
                    <p className="text-sm text-slate-500 mb-2">Responsável</p>
                    <div className="flex items-center gap-3">
                      {assignedMember.photo_url ? (
                        <img src={assignedMember.photo_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-blue-600" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium">{assignedMember.full_name}</p>
                        <p className="text-sm text-slate-600">{assignedMember.role}</p>
                      </div>
                    </div>
                  </div>
                )}

                {campaign.notes && (
                  <div>
                    <p className="text-sm text-slate-500">Notas</p>
                    <p className="text-sm">{campaign.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {linkedProperties.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    Imóveis Promovidos ({linkedProperties.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {linkedProperties.map(prop => (
                      <div key={prop.id} className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg">
                        {prop.images?.[0] && (
                          <img src={prop.images[0]} alt="" className="w-16 h-12 object-cover rounded" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{prop.title}</p>
                          <p className="text-xs text-slate-600">{prop.city} • €{prop.price?.toLocaleString()}</p>
                        </div>
                        <Badge variant="outline">{prop.status}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {campaign.email_config && (
              <Card>
                <CardHeader>
                  <CardTitle>Configuração de Email</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm text-slate-500">Assunto</p>
                      <p className="font-medium">{campaign.email_config.subject}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Remetente</p>
                      <p className="font-medium">{campaign.email_config.sender_name}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            <CampaignROICalculator campaign={campaign} opportunities={opportunities} />
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600">Impressões</p>
                      <p className="text-2xl font-bold">{campaign.metrics?.impressions || 0}</p>
                    </div>
                    <Eye className="w-8 h-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600">Cliques</p>
                      <p className="text-2xl font-bold">{campaign.metrics?.clicks || 0}</p>
                    </div>
                    <MousePointer className="w-8 h-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600">Leads</p>
                      <p className="text-2xl font-bold">{campaign.metrics?.leads || 0}</p>
                    </div>
                    <Users className="w-8 h-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600">CPL</p>
                      <p className="text-2xl font-bold">
                        €{campaign.metrics?.cost_per_lead?.toFixed(2) || '0.00'}
                      </p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-amber-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {campaign.campaign_type === "email" && (
              <Card>
                <CardHeader>
                  <CardTitle>Métricas de Email</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-slate-500">Enviados</p>
                      <p className="text-xl font-bold">{campaign.metrics?.emails_sent || 0}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Abertos</p>
                      <p className="text-xl font-bold">{campaign.metrics?.emails_opened || 0}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Clicados</p>
                      <p className="text-xl font-bold">{campaign.metrics?.emails_clicked || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="audience" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Segmentação</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-slate-500">Tipo de Segmento</p>
                    <p className="font-medium">{campaign.target_audience?.segment_type || "Todos"}</p>
                  </div>
                  {campaign.target_audience?.locations?.length > 0 && (
                    <div>
                      <p className="text-sm text-slate-500">Localizações</p>
                      <p className="font-medium">{campaign.target_audience.locations.join(", ")}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tracking" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Parâmetros de Tracking</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-slate-500">UTM Source</p>
                    <p className="font-mono text-sm">{campaign.tracking_config?.utm_source || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">UTM Medium</p>
                    <p className="font-mono text-sm">{campaign.tracking_config?.utm_medium || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">UTM Campaign</p>
                    <p className="font-mono text-sm">{campaign.tracking_config?.utm_campaign || "N/A"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}