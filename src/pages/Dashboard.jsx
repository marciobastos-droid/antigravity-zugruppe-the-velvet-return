import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  TrendingUp, TrendingDown, Users, Building2, FileText, 
  Download, Calendar, DollarSign, Target, Activity, BarChart3, RefreshCw,
  Settings2, Focus, Eye, Globe, Monitor, Smartphone
} from "lucide-react";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { format, subDays, startOfMonth, endOfMonth, startOfDay } from "date-fns";
import { ptBR, pt } from "date-fns/locale";
import AIMatchingSuggestions from "../components/dashboard/AIMatchingSuggestions";
import NotificationBoard from "../components/notifications/NotificationBoard";
import SmartNotificationsPanel from "../components/notifications/SmartNotificationsPanel";
import OnboardingTour from "../components/onboarding/OnboardingTour";
import OnboardingChecklist from "../components/onboarding/OnboardingChecklist";
import ContextualTip from "../components/onboarding/ContextualTip";
import DashboardBuilder from "../components/dashboard/DashboardBuilder";
import TeamPerformanceSummary from "../components/dashboard/TeamPerformanceSummary";
import WidgetSelector, { AVAILABLE_WIDGETS } from "../components/dashboard/WidgetSelector";
import FocusMode from "../components/dashboard/FocusMode";
import ActivitySummary from "../components/dashboard/ActivitySummary";
import InteractiveMetricsWidget from "../components/dashboard/InteractiveMetricsWidget";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAgentNames } from "../components/common/useAgentNames";
import { toast } from "sonner";
import ReportsTab from "../components/dashboard/ReportsTab";
import PropertiesOverviewWidget from "../components/dashboard/PropertiesOverviewWidget";
import LeadSourceROIReport from "../components/reports/LeadSourceROIReport";
import PipelineAnalysisReport from "../components/reports/PipelineAnalysisReport";
import AgentPerformanceReport from "../components/reports/AgentPerformanceReport";
import PropertyPerformanceReport from "../components/reports/PropertyPerformanceReport";
import SalesReport from "../components/reports/SalesReport";
import ImageSearch from "../components/search/ImageSearch";

const COLORS = ['#0f172a', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function Dashboard() {
  const [dateRange, setDateRange] = React.useState("30");
  const [syncingFacebookLeads, setSyncingFacebookLeads] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState("overview");
  const [widgetSelectorOpen, setWidgetSelectorOpen] = React.useState(false);
  const [focusModeOpen, setFocusModeOpen] = React.useState(false);
  const queryClient = useQueryClient();
  const { getAgentName } = useAgentNames();

  // Load user's widget preferences
  const defaultWidgets = AVAILABLE_WIDGETS.filter(w => w.default).map(w => w.id);
  const [activeWidgets, setActiveWidgets] = React.useState(defaultWidgets);

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

  const isAdmin = user && (user.role === 'admin' || user.user_type === 'admin' || user.user_type === 'gestor');

  // Fetch properties filtered by user
  const { data: properties = [] } = useQuery({
    queryKey: ['properties', user?.email, isAdmin],
    queryFn: async () => {
      if (!user) return [];
      const allProperties = await base44.entities.Property.list('-created_date');
      
      if (isAdmin) {
        return allProperties;
      }
      
      // Non-admin: filter by assigned_consultant or created_by
      return allProperties.filter(p => 
        p.assigned_consultant === user.email || 
        p.created_by === user.email ||
        p.agent_id === user.email
      );
    },
    enabled: !!user
  });

  // Fetch opportunities filtered by user
  const { data: opportunities = [] } = useQuery({
    queryKey: ['opportunities', user?.email, isAdmin],
    queryFn: async () => {
      if (!user) return [];
      const allOpportunities = await base44.entities.Opportunity.list('-created_date');
      
      if (isAdmin) {
        return allOpportunities;
      }
      
      // Non-admin: filter by assigned_to, seller_email, or created_by
      return allOpportunities.filter(o => 
        o.assigned_to === user.email || 
        o.seller_email === user.email ||
        o.created_by === user.email
      );
    },
    enabled: !!user
  });

  // Fetch buyer profiles filtered by user
  const { data: buyerProfiles = [] } = useQuery({
    queryKey: ['buyerProfiles', user?.email, isAdmin],
    queryFn: async () => {
      if (!user) return [];
      const allProfiles = await base44.entities.BuyerProfile.list();
      
      if (isAdmin) {
        return allProfiles;
      }
      
      // Non-admin: filter by assigned_agent or created_by
      return allProfiles.filter(p => 
        p.assigned_agent === user.email || 
        p.created_by === user.email
      );
    },
    enabled: !!user
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

  const { data: siteAnalytics = [] } = useQuery({
    queryKey: ['siteAnalytics'],
    queryFn: () => base44.entities.SiteAnalytics.list('-data_registro', 1000),
    enabled: !!user && isAdmin,
    refetchInterval: 60000
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
      return;
    }
    if (user?.onboarding_completed) {
      setShowTour(false);
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
    if (user?.onboarding_completed) {
      setContextualTip(null);
      return;
    }
    
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
  }, [onboardingProgress, properties.length, opportunities.length, user?.onboarding_completed]);

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
  const closedLeads = opportunities.filter(o => o.status === 'won').length;
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
    { name: 'Agendados', value: opportunities.filter(o => o.status === 'visit_scheduled').length },
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

  // Leads by agent (Admin only)
  const leadsPerAgent = isAdmin ? allUsers
    .filter(u => u.user_type === 'consultant' || u.user_type === 'agente' || u.user_type === 'gestor')
    .map(u => ({
      name: getAgentName(u.email, true),
      leads: opportunities.filter(o => o.assigned_to === u.email).length,
      fechados: opportunities.filter(o => o.assigned_to === u.email && o.status === 'won').length
    }))
    .filter(item => item.leads > 0)
    .sort((a, b) => b.leads - a.leads)
    : [];

  // Analytics calculations
  const totalVisits = siteAnalytics.length;
  
  const todayVisits = React.useMemo(() => {
    const today = startOfDay(new Date());
    return siteAnalytics.filter(a => {
      const visitDate = new Date(a.data_registro);
      return visitDate >= today;
    }).length;
  }, [siteAnalytics]);

  const topCountry = React.useMemo(() => {
    const countryCounts = {};
    siteAnalytics.forEach(a => {
      const country = a.pais || 'Unknown';
      countryCounts[country] = (countryCounts[country] || 0) + 1;
    });
    
    const sorted = Object.entries(countryCounts).sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0] || 'N/A';
  }, [siteAnalytics]);

  const topDevice = React.useMemo(() => {
    const deviceCounts = {};
    siteAnalytics.forEach(a => {
      const device = a.dispositivo || 'Unknown';
      deviceCounts[device] = (deviceCounts[device] || 0) + 1;
    });
    
    const sorted = Object.entries(deviceCounts).sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0] || 'N/A';
  }, [siteAnalytics]);

  const top5Countries = React.useMemo(() => {
    const countryCounts = {};
    siteAnalytics.forEach(a => {
      const country = a.pais || 'Unknown';
      countryCounts[country] = (countryCounts[country] || 0) + 1;
    });
    
    return Object.entries(countryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([pais, visitas]) => ({ pais, visitas }));
  }, [siteAnalytics]);

  const weeklyTraffic = React.useMemo(() => {
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dayStart = startOfDay(date);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      
      const count = siteAnalytics.filter(a => {
        const visitDate = new Date(a.data_registro);
        return visitDate >= dayStart && visitDate < dayEnd;
      }).length;
      
      last7Days.push({
        dia: format(date, 'EEE', { locale: pt }),
        visitas: count
      });
    }
    return last7Days;
  }, [siteAnalytics]);

  const recentVisits = React.useMemo(() => {
    return [...siteAnalytics]
      .sort((a, b) => new Date(b.data_registro) - new Date(a.data_registro))
      .slice(0, 10);
  }, [siteAnalytics]);

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
    !user?.onboarding_completed &&
    Object.values(onboardingProgress.steps_completed || {}).filter(Boolean).length < 5;

  // Load saved widget preferences from user
  React.useEffect(() => {
    if (user?.dashboard_widgets) {
      setActiveWidgets(user.dashboard_widgets);
    }
  }, [user]);

  const handleWidgetsChange = async (widgets) => {
    setActiveWidgets(widgets);
    try {
      await base44.auth.updateMe({ dashboard_widgets: widgets });
      toast.success("Dashboard personalizado guardado");
    } catch (error) {
      console.error("Erro ao guardar preferências:", error);
    }
  };

  // Focus mode metrics
  const focusMetrics = {
    totalProperties,
    activeProperties,
    totalLeads,
    newLeads,
    conversionRate,
    closedLeads,
    hotLeads: opportunities.filter(o => o.qualification_status === 'hot').length
  };

  // Urgent items for focus mode
  const urgentItems = React.useMemo(() => {
    const items = [];
    
    if (newLeads > 0) {
      items.push({ 
        message: `${newLeads} novos leads aguardam contacto`, 
        priority: 'high' 
      });
    }
    
    const hotCount = opportunities.filter(o => o.qualification_status === 'hot').length;
    if (hotCount > 0) {
      items.push({ 
        message: `${hotCount} leads hot requerem atenção imediata`, 
        priority: 'high' 
      });
    }

    const overdue = opportunities.filter(o => 
      o.next_followup_date && new Date(o.next_followup_date) < new Date()
    ).length;
    if (overdue > 0) {
      items.push({ 
        message: `${overdue} follow-ups em atraso`, 
        priority: 'medium' 
      });
    }

    return items;
  }, [opportunities, newLeads]);

  const isWidgetActive = (widgetId) => activeWidgets.includes(widgetId);

  // Escape key to close focus mode
  React.useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') setFocusModeOpen(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

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
      {/* Widget Selector */}
      <WidgetSelector
        open={widgetSelectorOpen}
        onOpenChange={setWidgetSelectorOpen}
        activeWidgets={activeWidgets}
        onWidgetsChange={handleWidgetsChange}
      />

      {/* Focus Mode */}
      <FocusMode 
        isOpen={focusModeOpen} 
        onClose={() => setFocusModeOpen(false)} 
        metrics={focusMetrics}
        urgentItems={urgentItems}
      />

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

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6 sm:mb-8">
          <div>
            <h1 id="dashboard-stats" className="text-2xl sm:text-4xl font-bold text-slate-900 mb-1 sm:mb-2 flex items-center gap-2 sm:gap-3">
              <BarChart3 className="w-7 h-7 sm:w-10 sm:h-10 text-blue-600" />
              Dashboard
            </h1>
            <p className="text-sm sm:text-base text-slate-600">
              {isAdmin ? 'Visão geral do desempenho' : `Os meus dados - ${user?.full_name || user?.email}`}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 sm:gap-3 w-full sm:w-auto">
            {activeTab === "overview" && (
              <>
                <ImageSearch properties={properties} />

                <Button 
                  onClick={() => setFocusModeOpen(true)}
                  variant="outline"
                  size="sm"
                  className="border-purple-300 text-purple-700 hover:bg-purple-50"
                >
                  <Focus className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Modo Foco</span>
                </Button>

                <Button 
                  onClick={() => setWidgetSelectorOpen(true)}
                  variant="outline"
                  size="sm"
                >
                  <Settings2 className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Personalizar</span>
                </Button>

                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">Últimos 7 dias</SelectItem>
                    <SelectItem value="30">Últimos 30 dias</SelectItem>
                    <SelectItem value="90">Últimos 90 dias</SelectItem>
                    <SelectItem value="365">Último ano</SelectItem>
                  </SelectContent>
                </Select>

                {fbSettings?.access_token && isAdmin && (
                  <Button 
                    onClick={syncFacebookLeads} 
                    disabled={syncingFacebookLeads}
                    variant="outline"
                    size="sm"
                    className="border-blue-500 text-blue-600 hover:bg-blue-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${syncingFacebookLeads ? 'animate-spin' : ''} sm:mr-2`} />
                    <span className="hidden sm:inline">{syncingFacebookLeads ? 'Sincronizando...' : 'Sync Facebook'}</span>
                  </Button>
                )}
                
                <Button onClick={exportReport} variant="outline" size="sm">
                  <Download className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Exportar</span>
                </Button>
              </>
            )}
          </div>
        </div>

        {isAdmin ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
            <TabsList>
              <TabsTrigger value="overview">Visão Geral</TabsTrigger>
              <TabsTrigger value="properties">Imóveis</TabsTrigger>
              <TabsTrigger value="reports">Relatórios Avançados</TabsTrigger>
              <TabsTrigger value="analytics">Analytics Visitantes</TabsTrigger>
              <TabsTrigger value="adminboard">AdminBoard</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">

        {/* Key Metrics */}
        {isWidgetActive('metrics') && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
          <Link to={createPageUrl("MyListings")}>
            <Card className="border-l-4 border-l-blue-500 hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-3 sm:p-6">
                <div className="flex justify-between items-start">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-slate-600 mb-0.5 sm:mb-1 truncate">Total Imóveis</p>
                    <p className="text-xl sm:text-3xl font-bold text-slate-900">{totalProperties}</p>
                    <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1 truncate">
                      +{recentProperties.length} ({dateRange}d)
                    </p>
                  </div>
                  <Building2 className="w-5 h-5 sm:w-8 sm:h-8 text-blue-600 flex-shrink-0" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to={createPageUrl("MyListings")}>
            <Card className="border-l-4 border-l-green-500 hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-3 sm:p-6">
                <div className="flex justify-between items-start">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-slate-600 mb-0.5 sm:mb-1 truncate">Importação</p>
                    <p className="text-xl sm:text-3xl font-bold text-slate-900">{importSuccessRate}%</p>
                    <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1 truncate">
                      {importedProperties} importados
                    </p>
                  </div>
                  <TrendingUp className="w-5 h-5 sm:w-8 sm:h-8 text-green-600 flex-shrink-0" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to={createPageUrl("CRMAdvanced")}>
            <Card className="border-l-4 border-l-purple-500 hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-3 sm:p-6">
                <div className="flex justify-between items-start">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-slate-600 mb-0.5 sm:mb-1 truncate">Total Leads</p>
                    <p className="text-xl sm:text-3xl font-bold text-slate-900">{totalLeads}</p>
                    <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1 truncate">
                      +{recentOpportunities.length} ({dateRange}d)
                    </p>
                  </div>
                  <Users className="w-5 h-5 sm:w-8 sm:h-8 text-purple-600 flex-shrink-0" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to={createPageUrl("CRMAdvanced")}>
            <Card className="border-l-4 border-l-amber-500 hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-3 sm:p-6">
                <div className="flex justify-between items-start">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-slate-600 mb-0.5 sm:mb-1 truncate">Conversão</p>
                    <p className="text-xl sm:text-3xl font-bold text-slate-900">{conversionRate}%</p>
                    <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1 truncate">
                      {closedLeads} fechados
                    </p>
                  </div>
                  <Target className="w-5 h-5 sm:w-8 sm:h-8 text-amber-600 flex-shrink-0" />
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
        )}

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

        {/* Smart Notifications Panel */}
        <div className="mb-6">
          <SmartNotificationsPanel user={user} />
        </div>

        {/* Interactive Metrics and Activity Summary - NEW */}
        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          <InteractiveMetricsWidget 
            opportunities={opportunities} 
            properties={properties} 
            dateRange={parseInt(dateRange)}
            isAdmin={isAdmin}
          />
          <ActivitySummary user={user} />
        </div>

        {/* Notifications and AI Matching */}
        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          {isWidgetActive('notifications') && <NotificationBoard user={user} />}
          {isWidgetActive('aiSuggestions') && <AIMatchingSuggestions user={user} />}
        </div>

        {/* Team Performance Summary */}
        {isWidgetActive('teamPerformance') && isAdmin && (
          <div className="mb-6">
            <TeamPerformanceSummary 
              users={allUsers} 
              opportunities={opportunities} 
              properties={properties} 
            />
          </div>
        )}

        {/* Charts Row 1 */}
        {(isWidgetActive('activity') || isWidgetActive('propertyStatus')) && (
        <div className="grid lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
          {isWidgetActive('activity') && (
          <Card>
            <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-4">
              <CardTitle className="text-base sm:text-lg">Atividade Diária</CardTitle>
              <p className="text-xs sm:text-sm text-slate-500">Imóveis e leads por dia</p>
            </CardHeader>
            <CardContent className="p-2 sm:p-6 pt-0">
              <ResponsiveContainer width="100%" height={200} className="sm:!h-[300px]">
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
          )}

          {isWidgetActive('propertyStatus') && (
          <Card>
            <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-4">
              <CardTitle className="text-base sm:text-lg">Estado dos Imóveis</CardTitle>
              <p className="text-xs sm:text-sm text-slate-500">Distribuição por estado</p>
            </CardHeader>
            <CardContent className="p-2 sm:p-6 pt-0">
              <ResponsiveContainer width="100%" height={200} className="sm:!h-[300px]">
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
          )}
        </div>
        )}

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
                    {contactedLeads + opportunities.filter(o => o.status === 'visit_scheduled').length}
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

            <TabsContent value="properties">
              <PropertiesOverviewWidget properties={properties} />
            </TabsContent>

            <TabsContent value="reports">
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-6">
                  <TabsTrigger value="overview">Resumo</TabsTrigger>
                  <TabsTrigger value="properties">Anúncios</TabsTrigger>
                  <TabsTrigger value="sales">Vendas</TabsTrigger>
                  <TabsTrigger value="sources">ROI</TabsTrigger>
                  <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
                  <TabsTrigger value="agents">Agentes</TabsTrigger>
                </TabsList>
                
                <TabsContent value="overview">
                  <ReportsTab />
                </TabsContent>
                
                <TabsContent value="properties">
                  <PropertyPerformanceReport />
                </TabsContent>
                
                <TabsContent value="sales">
                  <SalesReport />
                </TabsContent>
                
                <TabsContent value="sources">
                  <LeadSourceROIReport />
                </TabsContent>
                
                <TabsContent value="pipeline">
                  <PipelineAnalysisReport />
                </TabsContent>
                
                <TabsContent value="agents">
                  <AgentPerformanceReport />
                </TabsContent>
              </Tabs>
            </TabsContent>

            <TabsContent value="analytics">
              {/* Analytics de Visitantes */}
              <div className="space-y-6">
                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-600 mb-1">Total de Visitas</p>
                          <p className="text-3xl font-bold text-slate-900">{totalVisits.toLocaleString()}</p>
                        </div>
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                          <TrendingUp className="w-6 h-6 text-blue-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-600 mb-1">País Principal</p>
                          <p className="text-3xl font-bold text-slate-900">{topCountry}</p>
                        </div>
                        <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                          <Globe className="w-6 h-6 text-green-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-600 mb-1">Dispositivo Principal</p>
                          <p className="text-3xl font-bold text-slate-900">{topDevice}</p>
                        </div>
                        <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                          {topDevice === 'Mobile' ? (
                            <Smartphone className="w-6 h-6 text-purple-600" />
                          ) : (
                            <Monitor className="w-6 h-6 text-purple-600" />
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-600 mb-1">Visitas Hoje</p>
                          <p className="text-3xl font-bold text-slate-900">{todayVisits.toLocaleString()}</p>
                        </div>
                        <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                          <Calendar className="w-6 h-6 text-amber-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Charts */}
                <div className="grid lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Globe className="w-5 h-5" />
                        Top 5 Países
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={top5Countries}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis 
                            dataKey="pais" 
                            tick={{ fontSize: 12 }}
                            stroke="#64748b"
                          />
                          <YAxis 
                            tick={{ fontSize: 12 }}
                            stroke="#64748b"
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'white', 
                              border: '1px solid #e2e8f0',
                              borderRadius: '8px'
                            }}
                          />
                          <Bar dataKey="visitas" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5" />
                        Tráfego Semanal
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={weeklyTraffic}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis 
                            dataKey="dia" 
                            tick={{ fontSize: 12 }}
                            stroke="#64748b"
                          />
                          <YAxis 
                            tick={{ fontSize: 12 }}
                            stroke="#64748b"
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'white', 
                              border: '1px solid #e2e8f0',
                              borderRadius: '8px'
                            }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="visitas" 
                            stroke="#10b981" 
                            strokeWidth={3}
                            dot={{ fill: '#10b981', r: 4 }}
                            activeDot={{ r: 6 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Visits Table */}
                <Card>
                  <CardHeader>
                    <CardTitle>Últimas 10 Visitas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-slate-200">
                            <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Data/Hora</th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">País</th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Cidade</th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Dispositivo</th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Fonte</th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Página</th>
                          </tr>
                        </thead>
                        <tbody>
                          {recentVisits.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="text-center py-8 text-slate-500">
                                Ainda sem visitas registadas
                              </td>
                            </tr>
                          ) : (
                            recentVisits.map((visit) => (
                              <tr key={visit.id} className="border-b border-slate-100 hover:bg-slate-50">
                                <td className="py-3 px-4 text-sm text-slate-600">
                                  {format(new Date(visit.data_registro), 'dd/MM/yyyy HH:mm', { locale: pt })}
                                </td>
                                <td className="py-3 px-4">
                                  <Badge variant="outline" className="font-medium">
                                    {visit.pais}
                                  </Badge>
                                </td>
                                <td className="py-3 px-4 text-sm text-slate-600">
                                  {visit.cidade || '-'}
                                </td>
                                <td className="py-3 px-4">
                                  <Badge className={
                                    visit.dispositivo === 'Mobile' ? 'bg-blue-100 text-blue-800' :
                                    visit.dispositivo === 'Desktop' ? 'bg-green-100 text-green-800' :
                                    'bg-purple-100 text-purple-800'
                                  }>
                                    {visit.dispositivo}
                                  </Badge>
                                </td>
                                <td className="py-3 px-4 text-sm text-slate-600">
                                  {visit.fonte_origem}
                                </td>
                                <td className="py-3 px-4 text-sm text-slate-600 max-w-xs truncate" title={visit.pagina_visitada}>
                                  {visit.pagina_visitada}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                {/* Script de Implementação */}
                <Card className="border-blue-200 bg-blue-50">
                  <CardHeader>
                    <CardTitle className="text-blue-900">📋 Código de Tracking para www.zuhaus.pt</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-blue-800">
                      Copie e cole este código antes do <code className="bg-blue-100 px-2 py-1 rounded">&lt;/body&gt;</code> no seu website externo:
                    </p>
                    
                    <div className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto">
                      <pre className="text-xs font-mono whitespace-pre-wrap">
{`<script>
(function() {
  function detectDevice() {
    const ua = navigator.userAgent;
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) return "Tablet";
    if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry/.test(ua)) return "Mobile";
    return "Desktop";
  }

  function detectCountry() {
    const lang = navigator.language || navigator.userLanguage;
    const map = {
      'pt-PT': 'Portugal', 'pt-BR': 'Brasil', 'en-US': 'USA', 
      'en-GB': 'United Kingdom', 'es-ES': 'Spain', 'fr-FR': 'France', 
      'de-DE': 'Germany', 'it-IT': 'Italy'
    };
    return map[lang] || lang.split('-')[1] || 'Unknown';
  }

  function detectBrowser() {
    const ua = navigator.userAgent;
    if (ua.indexOf("Firefox") > -1) return "Firefox";
    if (ua.indexOf("Chrome") > -1) return "Chrome";
    if (ua.indexOf("Safari") > -1) return "Safari";
    if (ua.indexOf("Edge") > -1) return "Edge";
    return "Other";
  }

  function detectSource() {
    const ref = document.referrer;
    if (!ref) return "Direct";
    if (ref.includes("google")) return "Google";
    if (ref.includes("facebook")) return "Facebook";
    if (ref.includes("instagram")) return "Instagram";
    return "Referral";
  }

  function trackVisit() {
    fetch('${typeof window !== 'undefined' ? window.location.origin : 'https://zugruppe.base44.app'}/api/functions/trackSiteVisit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pagina_visitada: window.location.href,
        pais: detectCountry(),
        cidade: "Unknown",
        fonte_origem: detectSource(),
        dispositivo: detectDevice(),
        navegador: detectBrowser(),
        idioma: navigator.language,
        referrer: document.referrer,
        user_agent: navigator.userAgent
      })
    }).catch(err => console.error('Analytics:', err));
  }

  if (document.readyState === 'complete') trackVisit();
  else window.addEventListener('load', trackVisit);
})();
</script>`}
                      </pre>
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
            {/* Key Metrics for non-admin - filtered data */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Link to={createPageUrl("MyListings")}>
                <Card className="border-l-4 border-l-blue-500 hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm text-slate-600 mb-1">Meus Imóveis</p>
                        <p className="text-3xl font-bold text-slate-900">{totalProperties}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {recentProperties.length} nos últimos {dateRange} dias
                        </p>
                      </div>
                      <Building2 className="w-8 h-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>
              </Link>

              <Link to={createPageUrl("MyListings")}>
                <Card className="border-l-4 border-l-green-500 hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm text-slate-600 mb-1">Imóveis Ativos</p>
                        <p className="text-3xl font-bold text-slate-900">{activeProperties}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {soldProperties} vendidos
                        </p>
                      </div>
                      <TrendingUp className="w-8 h-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>
              </Link>

              <Link to={createPageUrl("CRMAdvanced")}>
                <Card className="border-l-4 border-l-purple-500 hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm text-slate-600 mb-1">Meus Leads</p>
                        <p className="text-3xl font-bold text-slate-900">{totalLeads}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {recentOpportunities.length} nos últimos {dateRange} dias
                        </p>
                      </div>
                      <Users className="w-8 h-8 text-purple-600" />
                    </div>
                  </CardContent>
                </Card>
              </Link>

              <Link to={createPageUrl("CRMAdvanced")}>
                <Card className="border-l-4 border-l-amber-500 hover:shadow-md transition-shadow cursor-pointer">
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
              </Link>
            </div>

            <div className="flex flex-wrap gap-2 sm:gap-3 mb-6">
              <ImageSearch properties={properties} />

              <Button 
                onClick={() => setFocusModeOpen(true)}
                variant="outline"
                size="sm"
                className="border-purple-300 text-purple-700 hover:bg-purple-50"
              >
                <Focus className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Modo Foco</span>
              </Button>

              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Últimos 7 dias</SelectItem>
                  <SelectItem value="30">Últimos 30 dias</SelectItem>
                  <SelectItem value="90">Últimos 90 dias</SelectItem>
                  <SelectItem value="365">Último ano</SelectItem>
                </SelectContent>
              </Select>

              <Button onClick={exportReport} variant="outline" size="sm">
                <Download className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Exportar</span>
              </Button>
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

            {/* Smart Notifications for non-admin */}
            <div className="mb-6">
              <SmartNotificationsPanel user={user} />
            </div>

            {/* Interactive Metrics and Activity Summary for non-admin */}
            <div className="grid lg:grid-cols-2 gap-6 mb-6">
              <InteractiveMetricsWidget 
                opportunities={opportunities} 
                properties={properties} 
                dateRange={parseInt(dateRange)}
                isAdmin={false}
              />
              <ActivitySummary user={user} />
            </div>

            <div className="grid lg:grid-cols-2 gap-6 mb-6">
              <NotificationBoard user={user} />
              <AIMatchingSuggestions user={user} />
            </div>

            {/* Charts for non-admin */}
            <div className="grid lg:grid-cols-2 gap-6 mb-6">
              <Card>
                <CardHeader>
                  <CardTitle>Os Meus Leads</CardTitle>
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
                  <CardTitle>Os Meus Imóveis</CardTitle>
                  <p className="text-sm text-slate-500">Distribuição por tipo</p>
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

            {/* Additional Stats for non-admin */}
            <div className="grid md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Estado dos Imóveis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">Ativos</span>
                      <span className="font-semibold text-green-600">{activeProperties}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">Vendidos</span>
                      <span className="font-semibold text-blue-600">{soldProperties}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">Pendentes</span>
                      <span className="font-semibold text-amber-600">{pendingProperties}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Leads Hot</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">🔥 Hot</span>
                      <span className="font-semibold text-red-600">
                        {opportunities.filter(o => o.qualification_status === 'hot').length}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">🌡️ Warm</span>
                      <span className="font-semibold text-orange-600">
                        {opportunities.filter(o => o.qualification_status === 'warm').length}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">❄️ Cold</span>
                      <span className="font-semibold text-blue-600">
                        {opportunities.filter(o => o.qualification_status === 'cold').length}
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
                        {contactedLeads + opportunities.filter(o => o.status === 'visit_scheduled').length}
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
          </>
        )}
      </div>
    </div>
  );
}