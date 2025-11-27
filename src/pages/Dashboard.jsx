import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  TrendingUp, TrendingDown, Users, Building2, FileText, 
  Download, Calendar, DollarSign, Target, Activity, BarChart3, RefreshCw 
} from "lucide-react";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import AIMatchingSuggestions from "../components/dashboard/AIMatchingSuggestions";
import NotificationBoard from "../components/notifications/NotificationBoard";
import OnboardingTour from "../components/onboarding/OnboardingTour";
import OnboardingChecklist from "../components/onboarding/OnboardingChecklist";
import ContextualTip from "../components/onboarding/ContextualTip";
import DashboardBuilder from "../components/dashboard/DashboardBuilder";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const COLORS = ['#0f172a', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function Dashboard() {
  const [dateRange, setDateRange] = React.useState("30");
  const [syncingFacebookLeads, setSyncingFacebookLeads] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState("overview");
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: onboardingProgress } = useQuery({
    queryKey: ['onboardingProgress', user?.email],
    queryFn: async () => {
      if (!user) return null;
      const all = await base44.entities.OnboardingProgress.list();
      return all.find(p => p.user_email === user.email);
    },
    enabled: !!user
  });

  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list('-created_date'),
  });

  const { data: opportunities = [] } = useQuery({
    queryKey: ['opportunities'],
    queryFn: () => base44.entities.Opportunity.list('-created_date'),
  });

  const { data: buyerProfiles = [] } = useQuery({
    queryKey: ['buyerProfiles'],
    queryFn: () => base44.entities.BuyerProfile.list(),
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: fbSettings } = useQuery({
    queryKey: ['facebookSettings'],
    queryFn: async () => {
      const settings = await base44.entities.FacebookLeadSettings.list();
      return settings[0];
    },
  });

  const updateProgressMutation = useMutation({
    mutationFn: async (data) => {
      if (onboardingProgress) {
        return await base44.entities.OnboardingProgress.update(onboardingProgress.id, data);
      } else {
        return await base44.entities.OnboardingProgress.create({
          user_email: user.email,
          ...data
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboardingProgress'] });
    }
  });

  const [tourStep, setTourStep] = React.useState(0);
  const [showTour, setShowTour] = React.useState(false);
  const [contextualTip, setContextualTip] = React.useState(null);

  React.useEffect(() => {
    if (user && onboardingProgress === null) {
      // Ainda não carregou o progresso, não mostrar nada
      return;
    }
    if (user && !onboardingProgress?.tour_completed && !onboardingProgress?.tour_dismissed && onboardingProgress !== undefined) {
      setShowTour(true);
      setTourStep(onboardingProgress?.current_tour_step || 0);
    } else {
      setShowTour(false);
    }
  }, [user, onboardingProgress]);

  React.useEffect(() => {
    if (onboardingProgress) {
      const steps = onboardingProgress.steps_completed || {};
      
      if (!steps.first_property_added && properties.length === 0) {
        setContextualTip({
          message: "Comece por adicionar o seu primeiro imóvel para começar a usar a plataforma!",
          actionLabel: "Adicionar Imóvel",
          action: () => window.location.href = '/AddListing'
        });
      } else if (!steps.first_lead_added && opportunities.length === 0) {
        setContextualTip({
          message: "Adicione o seu primeiro lead para começar a gerir oportunidades.",
          actionLabel: "Ver Leads",
          action: () => window.location.href = '/Opportunities'
        });
      } else {
        setContextualTip(null);
      }
    }
  }, [onboardingProgress, properties.length, opportunities.length]);

  const handleTourNext = () => {
    const nextStep = tourStep + 1;
    setTourStep(nextStep);
    updateProgressMutation.mutate({ current_tour_step: nextStep });
  };

  const handleTourPrev = () => {
    const prevStep = Math.max(0, tourStep - 1);
    setTourStep(prevStep);
    updateProgressMutation.mutate({ current_tour_step: prevStep });
  };

  const handleTourComplete = () => {
    updateProgressMutation.mutate({ tour_completed: true, tour_dismissed: true, current_tour_step: 0 });
    setShowTour(false);
  };

  const handleTourDismiss = () => {
    updateProgressMutation.mutate({ tour_completed: true, tour_dismissed: true });
    setShowTour(false);
  };

  const handleChecklistDismiss = () => {
    updateProgressMutation.mutate({ 
      steps_completed: {
        ...onboardingProgress?.steps_completed,
        checklist_dismissed: true
      }
    });
  };



  const isAdmin = user && (user.role === 'admin' || user.user_type === 'admin' || user.user_type === 'gestor');

  const syncFacebookLeads = async () => {
    if (!fbSettings?.access_token) {
      toast.error("Configure o Facebook Leads primeiro nas ferramentas");
      return;
    }

    setSyncingFacebookLeads(true);
    try {
      const response = await base44.functions.invoke('syncFacebookLeads', {
        access_token: fbSettings.access_token,
        form_id: fbSettings.form_id,
        campaign_id: fbSettings.campaign_id,
        campaign_name: fbSettings.campaign_name,
        form_name: fbSettings.form_name
      });

      if (response.data.success) {
        toast.success(`${response.data.created_count} novos leads sincronizados!`);
        queryClient.invalidateQueries({ queryKey: ['opportunities'] });
        queryClient.invalidateQueries({ queryKey: ['facebookLeads'] });
      }
    } catch (error) {
      toast.error("Erro ao sincronizar leads do Facebook");
    }
    setSyncingFacebookLeads(false);
  };

  // Filter by date range
  const daysAgo = parseInt(dateRange);
  const cutoffDate = subDays(new Date(), daysAgo);
  
  const recentProperties = properties.filter(p => 
    new Date(p.created_date) >= cutoffDate
  );
  
  const recentOpportunities = opportunities.filter(o => 
    new Date(o.created_date) >= cutoffDate
  );

  // Metrics
  const totalProperties = properties.length;
  const importedProperties = properties.filter(p => p.source_url || p.external_id).length;
  const importSuccessRate = totalProperties > 0 ? (importedProperties / totalProperties * 100).toFixed(1) : 0;
  
  const propertiesWithImages = properties.filter(p => p.images?.length > 0).length;
  const imageSuccessRate = totalProperties > 0 ? (propertiesWithImages / totalProperties * 100).toFixed(1) : 0;

  const activeProperties = properties.filter(p => p.status === 'active').length;
  const soldProperties = properties.filter(p => p.status === 'sold').length;
  const pendingProperties = properties.filter(p => p.status === 'pending').length;

  const totalLeads = opportunities.length;
  const newLeads = opportunities.filter(o => o.status === 'new').length;
  const contactedLeads = opportunities.filter(o => o.status === 'contacted').length;
  const closedLeads = opportunities.filter(o => o.status === 'closed').length;
  const conversionRate = totalLeads > 0 ? (closedLeads / totalLeads * 100).toFixed(1) : 0;

  // Property status distribution
  const statusData = [
    { name: 'Ativos', value: activeProperties, color: '#10b981' },
    { name: 'Vendidos', value: soldProperties, color: '#3b82f6' },
    { name: 'Pendentes', value: pendingProperties, color: '#f59e0b' },
    { name: 'Fora', value: properties.filter(p => p.status === 'off_market').length, color: '#ef4444' }
  ].filter(item => item.value > 0);

  // Lead status distribution
  const leadStatusData = [
    { name: 'Novos', value: newLeads },
    { name: 'Contactados', value: contactedLeads },
    { name: 'Agendados', value: opportunities.filter(o => o.status === 'scheduled').length },
    { name: 'Fechados', value: closedLeads }
  ];

  // Properties by type
  const propertyTypeData = [
    { name: 'Apartamentos', value: properties.filter(p => p.property_type === 'apartment').length },
    { name: 'Moradias', value: properties.filter(p => p.property_type === 'house').length },
    { name: 'Terrenos', value: properties.filter(p => p.property_type === 'land').length },
    { name: 'Comercial', value: properties.filter(p => p.property_type === 'commercial').length }
  ].filter(item => item.value > 0);

  // Activity timeline (last 30 days)
  const generateTimelineData = () => {
    const data = [];
    for (let i = daysAgo - 1; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dateStr = format(date, 'dd/MM');
      
      const propsOnDay = properties.filter(p => 
        format(new Date(p.created_date), 'dd/MM/yyyy') === format(date, 'dd/MM/yyyy')
      ).length;
      
      const leadsOnDay = opportunities.filter(o => 
        format(new Date(o.created_date), 'dd/MM/yyyy') === format(date, 'dd/MM/yyyy')
      ).length;
      
      data.push({
        date: dateStr,
        imoveis: propsOnDay,
        leads: leadsOnDay
      });
    }
    return data;
  };

  const timelineData = generateTimelineData();

  // Leads by agent
  const leadsPerAgent = isAdmin ? allUsers
    .filter(u => u.user_type === 'agente' || u.user_type === 'gestor')
    .map(u => ({
      name: u.full_name,
      leads: opportunities.filter(o => o.assigned_to === u.email).length,
      fechados: opportunities.filter(o => o.assigned_to === u.email && o.status === 'closed').length
    }))
    .filter(item => item.leads > 0)
    .sort((a, b) => b.leads - a.leads)
    : [];

  // Export report
  const exportReport = () => {
    const report = {
      data_geracao: format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR }),
      periodo: `Últimos ${dateRange} dias`,
      metricas: {
        imoveis: {
          total: totalProperties,
          importados: importedProperties,
          taxa_sucesso_importacao: `${importSuccessRate}%`,
          com_imagens: propertiesWithImages,
          taxa_imagens: `${imageSuccessRate}%`,
          ativos: activeProperties,
          vendidos: soldProperties,
          pendentes: pendingProperties
        },
        leads: {
          total: totalLeads,
          novos: newLeads,
          contactados: contactedLeads,
          fechados: closedLeads,
          taxa_conversao: `${conversionRate}%`
        }
      },
      imoveis_por_tipo: propertyTypeData,
      leads_por_estado: leadStatusData,
      ...(isAdmin && { performance_agentes: leadsPerAgent })
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio_${format(new Date(), 'yyyy-MM-dd_HHmm')}.json`;
    a.click();
  };

  const shouldShowChecklist = onboardingProgress && 
    !onboardingProgress.steps_completed?.checklist_dismissed &&
    Object.values(onboardingProgress.steps_completed || {}).filter(Boolean).length < 5;

  React.useEffect(() => {
    if (!onboardingProgress || !user) return;
    
    const currentSteps = onboardingProgress.steps_completed || {};
    const updates = {};

    if (properties.length > 0 && !currentSteps.first_property_added) {
      updates.first_property_added = true;
    }
    if (opportunities.length > 0 && !currentSteps.first_lead_added) {
      updates.first_lead_added = true;
    }
    if (buyerProfiles.length > 0 && !currentSteps.first_client_profile_created) {
      updates.first_client_profile_created = true;
    }

    if (Object.keys(updates).length > 0) {
      updateProgressMutation.mutate({
        steps_completed: {
          ...currentSteps,
          ...updates
        }
      });
    }
  }, [properties.length, opportunities.length, buyerProfiles.length, onboardingProgress, user]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-8 relative">
      {/* Background Logo */}
      <div 
        className="fixed inset-0 pointer-events-none flex items-center justify-center opacity-[0.03] z-0"
        style={{
          backgroundImage: 'url(https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6915a593b6edd8435f5838bd/359538617_Zugruppe01.jpg)',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          backgroundSize: '60%'
        }}
      />
      {showTour && (
        <OnboardingTour
          currentStep={tourStep}
          onNext={handleTourNext}
          onPrev={handleTourPrev}
          onComplete={handleTourComplete}
          onDismiss={handleTourDismiss}
        />
      )}

      {contextualTip && <ContextualTip tip={contextualTip} onDismiss={() => setContextualTip(null)} />}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 id="dashboard-stats" className="text-4xl font-bold text-slate-900 mb-2 flex items-center gap-3">
              <BarChart3 className="w-10 h-10 text-blue-600" />
              Dashboard
            </h1>
            <p className="text-slate-600">Visão geral do desempenho da plataforma</p>
          </div>

          <div className="flex gap-3">
            {activeTab === "overview" && (
              <>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">Últimos 7 dias</SelectItem>
                    <SelectItem value="30">Últimos 30 dias</SelectItem>
                    <SelectItem value="90">Últimos 90 dias</SelectItem>
                    <SelectItem value="365">Último ano</SelectItem>
                  </SelectContent>
                </Select>

                {fbSettings?.access_token && (
                  <Button 
                    onClick={syncFacebookLeads} 
                    disabled={syncingFacebookLeads}
                    variant="outline"
                    className="border-blue-500 text-blue-600 hover:bg-blue-50"
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${syncingFacebookLeads ? 'animate-spin' : ''}`} />
                    {syncingFacebookLeads ? 'Sincronizando...' : 'Sync Facebook Leads'}
                  </Button>
                )}
                
                <Button onClick={exportReport} variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Exportar Relatório
                </Button>
              </>
            )}
          </div>
        </div>

        {isAdmin ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
            <TabsList>
              <TabsTrigger value="overview">Visão Geral</TabsTrigger>
              <TabsTrigger value="adminboard">AdminBoard</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Total Imóveis</p>
                  <p className="text-3xl font-bold text-slate-900">{totalProperties}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {recentProperties.length} nos últimos {dateRange} dias
                  </p>
                </div>
                <Building2 className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Taxa de Importação</p>
                  <p className="text-3xl font-bold text-slate-900">{importSuccessRate}%</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {importedProperties} importados
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Total Leads</p>
                  <p className="text-3xl font-bold text-slate-900">{totalLeads}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {recentOpportunities.length} nos últimos {dateRange} dias
                  </p>
                </div>
                <Users className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Taxa de Conversão</p>
                  <p className="text-3xl font-bold text-slate-900">{conversionRate}%</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {closedLeads} leads fechados
                  </p>
                </div>
                <Target className="w-8 h-8 text-amber-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Onboarding Checklist */}
        {shouldShowChecklist && (
                        <div className="mb-6">
                          <OnboardingChecklist 
                            progress={onboardingProgress} 
                            onDismiss={() => {
                              updateProgressMutation.mutate({ 
                                steps_completed: {
                                  ...onboardingProgress?.steps_completed,
                                  checklist_dismissed: true
                                }
                              });
                            }}
                          />
                        </div>
                      )}

        {/* Notifications and AI Matching */}
        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          <NotificationBoard user={user} />
          <AIMatchingSuggestions user={user} />
        </div>

        {/* Charts Row 1 */}
        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Atividade Diária</CardTitle>
              <p className="text-sm text-slate-500">Imóveis e leads por dia</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" stroke="#64748b" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="imoveis" stroke="#3b82f6" name="Imóveis" strokeWidth={2} />
                  <Line type="monotone" dataKey="leads" stroke="#8b5cf6" name="Leads" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Estado dos Imóveis</CardTitle>
              <p className="text-sm text-slate-500">Distribuição por estado</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Estado dos Leads</CardTitle>
              <p className="text-sm text-slate-500">Distribuição por fase do pipeline</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={leadStatusData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                  />
                  <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tipos de Imóveis</CardTitle>
              <p className="text-sm text-slate-500">Distribuição por categoria</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={propertyTypeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                  />
                  <Bar dataKey="value" fill="#10b981" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Performance by Agent (Admin only) */}
        {isAdmin && leadsPerAgent.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Performance por Agente</CardTitle>
              <p className="text-sm text-slate-500">Leads e conversões por agente</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={leadsPerAgent}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                  />
                  <Legend />
                  <Bar dataKey="leads" fill="#8b5cf6" name="Total Leads" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="fechados" fill="#10b981" name="Fechados" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Additional Stats */}
        <div className="grid md:grid-cols-3 gap-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Qualidade de Importação</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Com Imagens</span>
                  <span className="font-semibold text-slate-900">{imageSuccessRate}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full" 
                    style={{ width: `${imageSuccessRate}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500">
                  {propertiesWithImages} de {totalProperties} com fotos
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Vendas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Vendidos</span>
                  <span className="font-semibold text-slate-900">{soldProperties}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Ativos</span>
                  <span className="font-semibold text-slate-900">{activeProperties}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Taxa de Vendas</span>
                  <span className="font-semibold text-slate-900">
                    {totalProperties > 0 ? ((soldProperties / totalProperties) * 100).toFixed(1) : 0}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Pipeline de Leads</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Em Progresso</span>
                  <span className="font-semibold text-slate-900">
                    {contactedLeads + opportunities.filter(o => o.status === 'scheduled').length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Novos</span>
                  <span className="font-semibold text-slate-900">{newLeads}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Conversão</span>
                  <span className="font-semibold text-green-600">{conversionRate}%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
            </TabsContent>

            <TabsContent value="adminboard">
              <DashboardBuilder />
            </TabsContent>
          </Tabs>
        ) : (
          <>
            {/* Key Metrics for non-admin - duplicated content structure */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card className="border-l-4 border-l-blue-500">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Total Imóveis</p>
                      <p className="text-3xl font-bold text-slate-900">{totalProperties}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {recentProperties.length} nos últimos {dateRange} dias
                      </p>
                    </div>
                    <Building2 className="w-8 h-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-green-500">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Taxa de Importação</p>
                      <p className="text-3xl font-bold text-slate-900">{importSuccessRate}%</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {importedProperties} importados
                      </p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-purple-500">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Total Leads</p>
                      <p className="text-3xl font-bold text-slate-900">{totalLeads}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {recentOpportunities.length} nos últimos {dateRange} dias
                      </p>
                    </div>
                    <Users className="w-8 h-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-amber-500">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Taxa de Conversão</p>
                      <p className="text-3xl font-bold text-slate-900">{conversionRate}%</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {closedLeads} leads fechados
                      </p>
                    </div>
                    <Target className="w-8 h-8 text-amber-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {shouldShowChecklist && (
              <div className="mb-6">
                <OnboardingChecklist 
                  progress={onboardingProgress} 
                  onDismiss={() => {
                    updateProgressMutation.mutate({ 
                      steps_completed: {
                        ...onboardingProgress?.steps_completed,
                        checklist_dismissed: true
                      }
                    });
                  }}
                />
              </div>
            )}

            <div className="grid lg:grid-cols-2 gap-6 mb-6">
              <NotificationBoard user={user} />
              <AIMatchingSuggestions user={user} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}