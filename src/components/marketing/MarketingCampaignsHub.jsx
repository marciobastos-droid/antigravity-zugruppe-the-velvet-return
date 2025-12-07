import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, TrendingUp, Mail, Facebook, Instagram, BarChart3,
  Eye, MousePointer, Users, DollarSign, Play, Pause, Trash2
} from "lucide-react";
import { toast } from "sonner";
import CreateCampaignDialog from "./CreateCampaignDialog";
import CampaignDetailsDialog from "./CampaignDetailsDialog";
import CampaignAnalytics from "./CampaignAnalytics";
import FacebookCampaignDashboard from "../tools/FacebookCampaignDashboard";

export default function MarketingCampaignsHub() {
  const [activeTab, setActiveTab] = useState("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const queryClient = useQueryClient();

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['marketingCampaigns'],
    queryFn: () => base44.entities.MarketingCampaign.list('-created_date')
  });

  const { data: opportunities = [] } = useQuery({
    queryKey: ['opportunities'],
    queryFn: () => base44.entities.Opportunity.list()
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.MarketingCampaign.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketingCampaigns'] });
      toast.success("Campanha eliminada");
    }
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.MarketingCampaign.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketingCampaigns'] });
      toast.success("Estado atualizado");
    }
  });

  const statusColors = {
    draft: "bg-slate-100 text-slate-800",
    scheduled: "bg-blue-100 text-blue-800",
    active: "bg-green-100 text-green-800",
    paused: "bg-yellow-100 text-yellow-800",
    completed: "bg-purple-100 text-purple-800",
    cancelled: "bg-red-100 text-red-800"
  };

  const campaignIcons = {
    email: Mail,
    facebook_ads: Facebook,
    instagram_ads: Instagram,
    multi_channel: TrendingUp
  };

  const filteredCampaigns = campaigns.filter(c => {
    if (activeTab === "all") return true;
    if (activeTab === "active") return c.status === "active";
    if (activeTab === "email") return c.campaign_type === "email";
    if (activeTab === "social") return ["facebook_ads", "instagram_ads", "multi_channel"].includes(c.campaign_type);
    return true;
  });

  // Calculate overall metrics
  const totalMetrics = campaigns.reduce((acc, c) => ({
    impressions: acc.impressions + (c.metrics?.impressions || 0),
    clicks: acc.clicks + (c.metrics?.clicks || 0),
    leads: acc.leads + (c.metrics?.leads || 0),
    spent: acc.spent + (c.spent || 0)
  }), { impressions: 0, clicks: 0, leads: 0, spent: 0 });

  // Track attribution - count leads by campaign
  const campaignAttribution = campaigns.map(campaign => {
    const campaignLeads = opportunities.filter(opp => 
      opp.source_detail === campaign.tracking_config?.utm_campaign ||
      opp.lead_source === campaign.name
    );
    return {
      ...campaign,
      attributedLeads: campaignLeads.length
    };
  });

  if (isLoading) {
    return <div className="flex items-center justify-center p-12">A carregar...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Campanhas de Marketing</h2>
          <p className="text-slate-600 mt-1">Gerir email marketing e anúncios em redes sociais</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Nova Campanha
        </Button>
      </div>

      {/* Overall Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Impressões</p>
                <p className="text-2xl font-bold">{totalMetrics.impressions.toLocaleString()}</p>
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
                <p className="text-2xl font-bold">{totalMetrics.clicks.toLocaleString()}</p>
              </div>
              <MousePointer className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Leads Gerados</p>
                <p className="text-2xl font-bold">{totalMetrics.leads.toLocaleString()}</p>
              </div>
              <Users className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Gasto</p>
                <p className="text-2xl font-bold">€{totalMetrics.spent.toLocaleString()}</p>
              </div>
              <DollarSign className="w-8 h-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">Todas</TabsTrigger>
          <TabsTrigger value="active">Ativas</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="social">Redes Sociais</TabsTrigger>
          <TabsTrigger value="facebook">Facebook Ads</TabsTrigger>
          <TabsTrigger value="analytics">Análise</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4 mt-6">
          {filteredCampaigns.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <TrendingUp className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Nenhuma campanha</h3>
                <p className="text-slate-600 mb-4">Crie a sua primeira campanha de marketing</p>
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Campanha
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredCampaigns.map(campaign => {
                const Icon = campaignIcons[campaign.campaign_type] || TrendingUp;
                const attribution = campaignAttribution.find(c => c.id === campaign.id);
                
                return (
                  <Card key={campaign.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                            <Icon className="w-6 h-6 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-semibold text-slate-900">{campaign.name}</h3>
                              <Badge className={statusColors[campaign.status]}>
                                {campaign.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-slate-600 mb-3">{campaign.objective}</p>
                            
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                              <div>
                                <p className="text-xs text-slate-500">Impressões</p>
                                <p className="font-semibold">{campaign.metrics?.impressions || 0}</p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-500">Cliques</p>
                                <p className="font-semibold">{campaign.metrics?.clicks || 0}</p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-500">Leads</p>
                                <p className="font-semibold">{attribution?.attributedLeads || 0}</p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-500">Gasto</p>
                                <p className="font-semibold">€{campaign.spent || 0}</p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-500">CPL</p>
                                <p className="font-semibold">
                                  €{campaign.metrics?.cost_per_lead?.toFixed(2) || '0.00'}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {campaign.status === "active" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => toggleStatusMutation.mutate({ id: campaign.id, status: "paused" })}
                            >
                              <Pause className="w-4 h-4" />
                            </Button>
                          )}
                          {campaign.status === "paused" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => toggleStatusMutation.mutate({ id: campaign.id, status: "active" })}
                            >
                              <Play className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedCampaign(campaign)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deleteMutation.mutate(campaign.id)}
                            className="text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="active" className="space-y-4 mt-6">
          {filteredCampaigns.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-slate-600">Nenhuma campanha ativa</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredCampaigns.map(campaign => {
                const Icon = campaignIcons[campaign.campaign_type] || TrendingUp;
                return (
                  <Card key={campaign.id}>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <Icon className="w-8 h-8 text-blue-600" />
                        <div className="flex-1">
                          <h3 className="font-semibold">{campaign.name}</h3>
                          <p className="text-sm text-slate-600">{campaign.objective}</p>
                        </div>
                        <Button size="sm" onClick={() => setSelectedCampaign(campaign)}>
                          Ver Detalhes
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="email" className="mt-6">
          <div className="grid gap-4">
            {filteredCampaigns.map(campaign => (
              <Card key={campaign.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{campaign.name}</h3>
                      <p className="text-sm text-slate-600">
                        {campaign.metrics?.emails_sent || 0} enviados • {campaign.metrics?.emails_opened || 0} abertos
                      </p>
                    </div>
                    <Button size="sm" onClick={() => setSelectedCampaign(campaign)}>Detalhes</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="social" className="mt-6">
          <div className="grid gap-4">
            {filteredCampaigns.map(campaign => (
              <Card key={campaign.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{campaign.name}</h3>
                      <p className="text-sm text-slate-600">
                        {campaign.metrics?.impressions || 0} impressões • {campaign.metrics?.clicks || 0} cliques
                      </p>
                    </div>
                    <Button size="sm" onClick={() => setSelectedCampaign(campaign)}>Detalhes</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="facebook" className="mt-6">
          <FacebookCampaignDashboard />
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <CampaignAnalytics campaigns={campaignAttribution} opportunities={opportunities} />
        </TabsContent>
      </Tabs>

      <CreateCampaignDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />

      {selectedCampaign && (
        <CampaignDetailsDialog
          campaign={selectedCampaign}
          open={!!selectedCampaign}
          onOpenChange={(open) => !open && setSelectedCampaign(null)}
        />
      )}
    </div>
  );
}