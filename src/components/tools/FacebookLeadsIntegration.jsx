import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Facebook, Plus, Trash2, RefreshCw, CheckCircle2, XCircle, Settings, Download, Users, TrendingUp, Eye, Calendar, Pencil, FileText, Clock, CheckSquare, Square, LayoutDashboard, Bell, Filter } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { qualifyLead } from "../opportunities/LeadQualification";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import FacebookSyncDashboard from "./FacebookSyncDashboard";
import FacebookLeadsFilters from "./FacebookLeadsFilters";
import FacebookSyncAlerts from "./FacebookSyncAlerts";

export default function FacebookLeadsIntegration() {
  const queryClient = useQueryClient();
  const [configDialogOpen, setConfigDialogOpen] = React.useState(false);
  const [campaignDialogOpen, setCampaignDialogOpen] = React.useState(false);
  const [editingCampaignIndex, setEditingCampaignIndex] = React.useState(null);
  const [syncing, setSyncing] = React.useState(null);
  const [selectedLead, setSelectedLead] = React.useState(null);
  const [resetting, setResetting] = React.useState(false);
  const [dateRangeDialogOpen, setDateRangeDialogOpen] = React.useState(false);
  const [selectedFormForSync, setSelectedFormForSync] = React.useState(null);
  const [syncOptions, setSyncOptions] = React.useState({
    start_date: '',
    end_date: '',
    sync_type: 'manual',
    assigned_to: ''
  });
  const [tokenValid, setTokenValid] = React.useState(null);
  const [checkingToken, setCheckingToken] = React.useState(false);
  const [convertDialogOpen, setConvertDialogOpen] = React.useState(false);
  const [leadToConvert, setLeadToConvert] = React.useState(null);
  const [selectedPropertyId, setSelectedPropertyId] = React.useState("");
  const [selectedAgentEmail, setSelectedAgentEmail] = React.useState("");
  const [logsDialogOpen, setLogsDialogOpen] = React.useState(false);
  const [selectedFormForLogs, setSelectedFormForLogs] = React.useState(null);
  const [selectedLeads, setSelectedLeads] = React.useState([]);
  const [deletingBulk, setDeletingBulk] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState("dashboard");
  const [leadFilters, setLeadFilters] = React.useState({
    search: '',
    status: 'all',
    campaign: 'all',
    dateFrom: '',
    dateTo: '',
    syncDateFrom: '',
    syncDateTo: ''
  });

  const [fbConfig, setFbConfig] = React.useState({
    access_token: "",
    page_id: ""
  });

  const [campaignForm, setCampaignForm] = React.useState({
    campaign_id: "",
    campaign_name: "",
    form_id: "",
    form_name: "",
    assigned_to: "",
    sync_interval_hours: 24
  });

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['all_users'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: fbSettings } = useQuery({
    queryKey: ['fb_settings'],
    queryFn: async () => {
      const userData = await base44.auth.me();
      return userData.fb_lead_settings || { configured: false, campaigns: [] };
    },
  });

  const { data: fbLeads = [] } = useQuery({
    queryKey: ['facebook_leads'],
    queryFn: () => base44.entities.FacebookLead.list('-created_date'),
  });

  const { data: properties = [] } = useQuery({
    queryKey: ['all_properties'],
    queryFn: () => base44.entities.Property.list('-created_date'),
  });

  const { data: syncLogs = [] } = useQuery({
    queryKey: ['facebook_sync_logs'],
    queryFn: () => base44.entities.FacebookSyncLog.list('-created_date'),
  });

  // Validate token on mount if configured
  React.useEffect(() => {
    if (fbSettings?.configured && fbSettings?.access_token) {
      validateToken(fbSettings.access_token);
    }
  }, [fbSettings?.configured, fbSettings?.access_token]);

  const validateToken = async (token) => {
    setCheckingToken(true);
    try {
      const response = await base44.functions.invoke('validateFacebookToken', {
        access_token: token
      });

      setTokenValid(response.data);
      
      if (!response.data.valid) {
        toast.error("Access Token do Facebook inválido ou expirado!");
      }
    } catch (error) {
      console.error('Token validation error:', error);
      setTokenValid({ valid: false, error: 'Failed to validate' });
    }
    setCheckingToken(false);
  };

  const updateSettingsMutation = useMutation({
    mutationFn: async (settings) => {
      await base44.auth.updateMe({ fb_lead_settings: settings });
      return settings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fb_settings'] });
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });

  const deleteLeadMutation = useMutation({
    mutationFn: (id) => base44.entities.FacebookLead.delete(id),
    onSuccess: () => {
      toast.success("Lead eliminado");
      queryClient.invalidateQueries({ queryKey: ['facebook_leads'] });
    },
  });

  const handleBulkDelete = async () => {
    if (selectedLeads.length === 0) return;
    if (!window.confirm(`Tem certeza que deseja eliminar ${selectedLeads.length} lead(s)?`)) return;
    
    setDeletingBulk(true);
    let deletedCount = 0;
    let errorCount = 0;
    
    for (const id of selectedLeads) {
      try {
        await base44.entities.FacebookLead.delete(id);
        deletedCount++;
      } catch (error) {
        console.error(`Erro ao eliminar lead ${id}:`, error);
        errorCount++;
      }
    }
    
    if (deletedCount > 0) {
      toast.success(`${deletedCount} lead(s) eliminado(s)`);
    }
    if (errorCount > 0) {
      toast.error(`Falha ao eliminar ${errorCount} lead(s)`);
    }
    
    setSelectedLeads([]);
    queryClient.invalidateQueries({ queryKey: ['facebook_leads'] });
    setDeletingBulk(false);
  };

  const toggleSelectLead = (id) => {
    setSelectedLeads(prev => 
      prev.includes(id) ? prev.filter(lid => lid !== id) : [...prev, id]
    );
  };

  const toggleSelectAllLeads = () => {
    if (selectedLeads.length === filteredLeads.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(filteredLeads.map(l => l.id));
    }
  };

  const convertToOpportunityMutation = useMutation({
    mutationFn: async ({ lead, propertyId, agentEmail }) => {
      // First, create or find the contact
      let contactId = null;
      try {
        // Check if contact already exists
        const existingContacts = await base44.entities.ClientContact.filter({ email: lead.email });
        
        if (existingContacts && existingContacts.length > 0) {
          contactId = existingContacts[0].id;
        } else {
          // Create new contact
          const newContact = await base44.entities.ClientContact.create({
            full_name: lead.full_name,
            email: lead.email,
            phone: lead.phone,
            location: lead.location,
            contact_type: "client",
            lead_source: "facebook_ads",
            notes: `Importado do Facebook Lead Ads\nCampanha: ${lead.campaign_name || lead.campaign_id}\n${lead.message || ''}`
          });
          contactId = newContact.id;
        }
      } catch (err) {
        console.error("Error creating contact:", err);
      }

      // Get the campaign's assigned agent if no agent was explicitly selected
      const campaign = fbSettings?.campaigns?.find(c => c.form_id === lead.form_id);
      const finalAgentEmail = agentEmail || campaign?.assigned_to || undefined;

      const opportunity = await base44.entities.Opportunity.create({
        lead_type: "comprador",
        contact_id: contactId || undefined,
        buyer_name: lead.full_name,
        buyer_email: lead.email,
        buyer_phone: lead.phone,
        location: lead.location,
        budget: lead.budget ? Number(lead.budget) : undefined,
        property_type_interest: lead.property_type,
        property_id: propertyId || undefined,
        assigned_to: finalAgentEmail,
        message: `Lead do Facebook (Campanha: ${lead.campaign_name})\n\n${lead.message || ''}`,
        status: "new",
        priority: "high",
        lead_source: "facebook_ads"
      });

      // Auto-qualify the lead
      const qualificationData = await qualifyLead(opportunity);
      if (qualificationData) {
        await base44.entities.Opportunity.update(opportunity.id, qualificationData);
      }

      await base44.entities.FacebookLead.update(lead.id, {
        status: "converted",
        converted_to_opportunity_id: opportunity.id
      });

      // Create notification
      if (user) {
        await base44.entities.Notification.create({
          title: "Lead do Facebook Convertido",
          message: `Lead "${lead.full_name}" foi convertido em oportunidade`,
          type: "opportunity",
          priority: "medium",
          user_email: user.email,
          related_type: "Opportunity",
          related_id: opportunity.id,
          action_url: "/Opportunities"
        });
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      }

      // Invalidate contacts query
      queryClient.invalidateQueries({ queryKey: ['clientContacts'] });

      return opportunity;
    },
    onSuccess: () => {
      toast.success("Lead convertido e qualificado automaticamente!");
      queryClient.invalidateQueries({ queryKey: ['facebook_leads'] });
      setSelectedLead(null);
      setConvertDialogOpen(false);
      setLeadToConvert(null);
      setSelectedPropertyId("");
      setSelectedAgentEmail("");
    },
  });

  const handleOpenConvertDialog = (lead) => {
    setLeadToConvert(lead);
    setSelectedPropertyId("");
    // Pre-select campaign's assigned agent if available
    const campaign = fbSettings?.campaigns?.find(c => c.form_id === lead.form_id);
    const agentEmail = campaign?.assigned_to || "";
    setSelectedAgentEmail(agentEmail);
    setConvertDialogOpen(true);
  };

  const handleConvertLead = () => {
    if (leadToConvert) {
      convertToOpportunityMutation.mutate({ 
        lead: leadToConvert, 
        propertyId: selectedPropertyId,
        agentEmail: selectedAgentEmail
      });
    }
  };

  const handleSaveConfig = async () => {
    if (!fbConfig.access_token || !fbConfig.page_id) {
      toast.error("Preencha todos os campos");
      return;
    }

    // Validate token before saving
    setCheckingToken(true);
    try {
      const response = await base44.functions.invoke('validateFacebookToken', {
        access_token: fbConfig.access_token.trim()
      });

      if (!response.data.valid) {
        toast.error(`Token inválido: ${response.data.details || 'Verifique as suas credenciais'}`);
        setCheckingToken(false);
        return;
      }

      const settings = {
        configured: true,
        access_token: fbConfig.access_token.trim(),
        page_id: fbConfig.page_id.trim(),
        campaigns: fbSettings?.campaigns || [],
        last_sync: fbSettings?.last_sync || {}
      };

      updateSettingsMutation.mutate(settings);
      setTokenValid(response.data);
      setConfigDialogOpen(false);
      toast.success("Token validado e configuração guardada!");
    } catch (error) {
      toast.error("Erro ao validar token");
    }
    setCheckingToken(false);
  };

  const handleOpenEditDialog = () => {
    // Preencher o formulário com os dados existentes
    setFbConfig({
      access_token: fbSettings?.access_token || "",
      page_id: fbSettings?.page_id || ""
    });
    setConfigDialogOpen(true);
  };

  const handleOpenAddCampaignDialog = () => {
    setCampaignForm({ campaign_id: "", campaign_name: "", form_id: "", form_name: "", assigned_to: "", sync_interval_hours: 24 });
    setEditingCampaignIndex(null);
    setCampaignDialogOpen(true);
  };

  const handleOpenEditCampaignDialog = (campaign, index) => {
    setCampaignForm({
      campaign_id: campaign.campaign_id || "",
      campaign_name: campaign.campaign_name || "",
      form_id: campaign.form_id || "",
      form_name: campaign.form_name || "",
      assigned_to: campaign.assigned_to || "",
      sync_interval_hours: campaign.sync_interval_hours || 24
    });
    setEditingCampaignIndex(index);
    setCampaignDialogOpen(true);
  };

  const handleAddCampaign = async () => {
    if (!campaignForm.campaign_id || !campaignForm.form_id) {
      toast.error("Preencha ID da campanha e ID do formulário");
      return;
    }

    let campaigns;
    if (editingCampaignIndex !== null) {
      // Editar campanha existente
      campaigns = [...(fbSettings?.campaigns || [])];
      campaigns[editingCampaignIndex] = campaignForm;
    } else {
      // Adicionar nova campanha
      campaigns = [...(fbSettings?.campaigns || []), campaignForm];
    }
    
    try {
      await updateSettingsMutation.mutateAsync({
        configured: fbSettings?.configured || true,
        access_token: fbSettings?.access_token,
        page_id: fbSettings?.page_id,
        last_sync: fbSettings?.last_sync || {},
        campaigns
      });

      if (editingCampaignIndex !== null) {
        toast.success("Campanha atualizada!");
      } else {
        toast.success("Campanha adicionada! A sincronizar leads...");
        // Automatically sync leads for the new campaign
        await handleSyncLeads(campaignForm.form_id);
      }
      
      setCampaignForm({ campaign_id: "", campaign_name: "", form_id: "", form_name: "", assigned_to: "", sync_interval_hours: 24 });
      setEditingCampaignIndex(null);
      setCampaignDialogOpen(false);
    } catch (error) {
      toast.error(editingCampaignIndex !== null ? "Erro ao atualizar campanha" : "Erro ao adicionar campanha");
    }
  };

  const handleRemoveCampaign = async (formId) => {
    if (!window.confirm("Tem certeza que deseja eliminar esta campanha?")) return;
    
    const campaigns = fbSettings.campaigns.filter(c => c.form_id !== formId);
    try {
      await updateSettingsMutation.mutateAsync({
        configured: fbSettings?.configured || true,
        access_token: fbSettings?.access_token,
        page_id: fbSettings?.page_id,
        last_sync: fbSettings?.last_sync || {},
        campaigns
      });
      toast.success("Campanha eliminada");
    } catch (error) {
      toast.error("Erro ao eliminar campanha");
    }
  };

  const handleResetIntegration = async () => {
    if (!window.confirm('Tem a certeza que deseja resetar completamente a integração do Facebook? Todas as configurações e leads importadas serão eliminadas.')) {
      return;
    }

    setResetting(true);
    try {
      const response = await base44.functions.invoke('resetFacebookIntegration');
      
      if (response.data.success) {
        toast.success(`Integração resetada! ${response.data.leads_deleted} leads eliminadas.`);
        queryClient.invalidateQueries({ queryKey: ['fb_settings', 'user', 'facebook_leads'] });
      } else {
        throw new Error(response.data.error || 'Erro ao resetar');
      }
    } catch (error) {
      toast.error(`Erro ao resetar: ${error.message}`);
    }
    setResetting(false);
  };

  const handleOpenDateRangeDialog = (formId) => {
    setSelectedFormForSync(formId);
    setDateRange({
      start_date: '',
      end_date: ''
    });
    setDateRangeDialogOpen(true);
  };

  const handleSyncLeads = async (formId, customDateRange = null) => {
    setSyncing(formId);
    
    try {
      // Verificação robusta dos parâmetros necessários
      if (!fbSettings || !fbSettings.access_token || !fbSettings.page_id) {
        toast.error('Configuração do Facebook incompleta. Por favor, configure o Access Token e Page ID.');
        setSyncing(null);
        return;
      }

      if (!formId) {
        toast.error('ID do formulário não encontrado.');
        setSyncing(null);
        return;
      }

      const campaign = fbSettings.campaigns.find(c => c.form_id === formId);
      const lastSync = fbSettings.last_sync?.[formId] || null;

      const payload = {
        access_token: fbSettings.access_token,
        page_id: fbSettings.page_id,
        form_id: formId,
        campaign_id: campaign?.campaign_id || '',
        campaign_name: campaign?.campaign_name || '',
        form_name: campaign?.form_name || '',
        assigned_to: campaign?.assigned_to || '',
        last_sync: customDateRange ? null : lastSync,
        start_date: customDateRange?.start_date || null,
        end_date: customDateRange?.end_date || null,
        sync_type: customDateRange ? 'historical' : 'manual'
      };

      console.log('Enviando payload para syncFacebookLeads:', {
        ...payload,
        access_token: payload.access_token ? `${payload.access_token.substring(0, 10)}...` : 'MISSING',
        page_id: payload.page_id || 'MISSING',
        form_id: payload.form_id || 'MISSING'
      });

      // Chamar função backend para sincronizar leads
      const response = await base44.functions.invoke('syncFacebookLeads', payload);

      console.log('Resposta da sincronização:', response.data);

      if (response.data.error) {
        throw new Error(response.data.details || response.data.error);
      }

      const { created_count, duplicated_count, total_fetched } = response.data;

      // Atualizar data da última sincronização apenas se não for sincronização histórica
      if (!customDateRange) {
        const updatedLastSync = {
          ...(fbSettings.last_sync || {}),
          [formId]: new Date().toISOString()
        };

        const updatedSettings = {
          ...fbSettings,
          last_sync: updatedLastSync
        };

        await updateSettingsMutation.mutateAsync(updatedSettings);
        
        // Force refetch to update UI immediately
        queryClient.invalidateQueries({ queryKey: ['fb_settings'] });
        queryClient.invalidateQueries({ queryKey: ['user'] });
      }

      // Mensagem detalhada
      if (created_count > 0) {
        if (duplicated_count > 0) {
          toast.success(`${created_count} novo(s) lead(s) importado(s). ${duplicated_count} duplicado(s) ignorado(s).`);
        } else {
          toast.success(`${created_count} novo(s) lead(s) sincronizado(s)`);
        }
      } else {
        if (duplicated_count > 0) {
          toast.info(`Nenhuma lead nova. ${duplicated_count} lead(s) já existente(s) ignorada(s).`);
        } else if (total_fetched === 0) {
          toast.info("Nenhuma lead encontrada no Facebook");
        } else {
          toast.info("Todas as leads já foram importadas anteriormente");
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ['facebook_leads'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['facebook_sync_logs'] });
      setDateRangeDialogOpen(false);
    } catch (error) {
      toast.error(`Erro ao sincronizar: ${error.message}`);
      console.error(error);
    }

    setSyncing(null);
  };

  const handleSyncWithDateRange = () => {
    if (!dateRange.start_date || !dateRange.end_date) {
      toast.error('Por favor, selecione ambas as datas');
      return;
    }
    
    if (new Date(dateRange.start_date) > new Date(dateRange.end_date)) {
      toast.error('A data de início deve ser anterior à data de fim');
      return;
    }
    
    handleSyncLeads(selectedFormForSync, dateRange);
  };

  const leadsByCampaign = fbLeads.reduce((acc, lead) => {
    const key = lead.form_id || 'unknown';
    if (!acc[key]) acc[key] = [];
    acc[key].push(lead);
    return acc;
  }, {});

  const newLeadsCount = fbLeads.filter(l => l.status === 'new').length;

  // Filter leads based on filters
  const filteredLeads = React.useMemo(() => {
    return fbLeads.filter(lead => {
      // Search filter
      if (leadFilters.search) {
        const search = leadFilters.search.toLowerCase();
        const matchesSearch = 
          lead.full_name?.toLowerCase().includes(search) ||
          lead.email?.toLowerCase().includes(search) ||
          lead.phone?.includes(search);
        if (!matchesSearch) return false;
      }

      // Status filter
      if (leadFilters.status !== 'all' && lead.status !== leadFilters.status) {
        return false;
      }

      // Campaign filter
      if (leadFilters.campaign !== 'all' && lead.form_id !== leadFilters.campaign) {
        return false;
      }

      // Date range filter (lead created date)
      if (leadFilters.dateFrom) {
        const leadDate = new Date(lead.created_date);
        const fromDate = new Date(leadFilters.dateFrom);
        if (leadDate < fromDate) return false;
      }
      if (leadFilters.dateTo) {
        const leadDate = new Date(lead.created_date);
        const toDate = new Date(leadFilters.dateTo);
        toDate.setHours(23, 59, 59, 999);
        if (leadDate > toDate) return false;
      }

      // Sync date filter
      if (leadFilters.syncDateFrom || leadFilters.syncDateTo) {
        const syncDate = lead.synced_at ? new Date(lead.synced_at) : new Date(lead.created_date);
        if (leadFilters.syncDateFrom) {
          const fromDate = new Date(leadFilters.syncDateFrom);
          if (syncDate < fromDate) return false;
        }
        if (leadFilters.syncDateTo) {
          const toDate = new Date(leadFilters.syncDateTo);
          toDate.setHours(23, 59, 59, 999);
          if (syncDate > toDate) return false;
        }
      }

      return true;
    });
  }, [fbLeads, leadFilters]);

  // Get recent sync errors
  const recentSyncErrors = syncLogs
    .filter(log => log.status === 'error')
    .slice(0, 5);

  // Save alert settings
  const handleSaveAlertSettings = async (alertSettings) => {
    await updateSettingsMutation.mutateAsync({
      ...fbSettings,
      alertSettings
    });
  };

  return (
    <div className="space-y-6">
      <Card className="border-blue-500">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Facebook className="w-5 h-5 text-blue-600" />
              Integração Facebook Lead Ads
            </span>
            {fbSettings?.configured && (
              <Badge className="bg-green-100 text-green-800">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Configurado
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!fbSettings?.configured ? (
            <div className="text-center py-8">
              <Facebook className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600 mb-4">Configure a integração para começar a importar leads</p>
              <Button onClick={handleOpenEditDialog}>
                <Settings className="w-4 h-4 mr-2" />
                Configurar Integração
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-900">Integração Ativa</p>
                  <p className="text-xs text-slate-600">Qualificação automática ativada</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleOpenEditDialog}>
                    <Settings className="w-4 h-4 mr-2" />
                    Editar
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleResetIntegration}
                    disabled={resetting}
                    className="text-red-600 hover:bg-red-50"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    {resetting ? 'A resetar...' : 'Reset'}
                  </Button>
                </div>
                </div>

              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">{fbSettings.campaigns?.length || 0}</div>
                    <div className="text-xs text-slate-600">Campanhas</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">{fbLeads.length}</div>
                    <div className="text-xs text-slate-600">Total Leads</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-orange-600">{newLeadsCount}</div>
                    <div className="text-xs text-slate-600">Novos</div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Configuração - sempre disponível */}
      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurar Facebook Lead Ads</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Access Token *</Label>
              <Input
                type="password"
                value={fbConfig.access_token}
                onChange={(e) => setFbConfig({...fbConfig, access_token: e.target.value})}
                placeholder="EAAxxxxxxxxxxxx..."
              />
            </div>
            <div>
              <Label>Page ID *</Label>
              <Input
                value={fbConfig.page_id}
                onChange={(e) => setFbConfig({...fbConfig, page_id: e.target.value})}
                placeholder="123456789012345"
              />
            </div>
            <Button onClick={handleSaveConfig} className="w-full" disabled={checkingToken}>
              {checkingToken ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  A validar token...
                </>
              ) : (
                'Guardar Configuração'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Token Validation Alert */}
      {fbSettings?.configured && tokenValid && !tokenValid.valid && (
        <Card className="mb-6 border-red-500 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <XCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-red-900 mb-2">⚠️ Access Token Inválido</h3>
                <p className="text-sm text-red-800 mb-3">
                  {tokenValid.is_expired 
                    ? "O seu Access Token do Facebook expirou." 
                    : "O seu Access Token do Facebook é inválido ou não tem as permissões necessárias."}
                </p>
                <div className="bg-red-100 border border-red-300 rounded-lg p-3 mb-3">
                  <p className="text-xs font-semibold text-red-900 mb-2">Como gerar um novo Access Token:</p>
                  <ol className="text-xs text-red-800 space-y-1 list-decimal list-inside">
                    <li>Aceda ao <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noopener noreferrer" className="underline font-semibold">Facebook Graph API Explorer</a></li>
                    <li>Selecione a sua aplicação Facebook</li>
                    <li>Clique em "Generate Access Token"</li>
                    <li>Selecione as permissões: <code className="bg-red-200 px-1 rounded">leads_retrieval</code>, <code className="bg-red-200 px-1 rounded">pages_manage_ads</code></li>
                    <li>Copie o token gerado e atualize nas configurações abaixo</li>
                  </ol>
                </div>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => validateToken(fbSettings.access_token)}
                    disabled={checkingToken}
                    className="bg-white"
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${checkingToken ? 'animate-spin' : ''}`} />
                    Verificar Novamente
                  </Button>
                  <Button 
                    size="sm"
                    onClick={handleOpenEditDialog}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Atualizar Token
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {fbSettings?.configured && tokenValid?.valid && (
        <Card className="mb-6 border-green-500 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <p className="text-sm font-medium text-green-900">
                Access Token válido
                {tokenValid.expires_at && (
                  <span className="text-green-700 ml-2">
                    • Expira em {new Date(tokenValid.expires_at).toLocaleDateString('pt-PT')}
                  </span>
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {fbSettings?.configured && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="campaigns" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Campanhas
            </TabsTrigger>
            <TabsTrigger value="leads" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Leads
              {newLeadsCount > 0 && (
                <Badge className="ml-1 bg-blue-600 text-white text-xs h-5 min-w-5 flex items-center justify-center">
                  {newLeadsCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="alerts" className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Alertas
              {recentSyncErrors.length > 0 && (
                <Badge className="ml-1 bg-red-600 text-white text-xs h-5 min-w-5 flex items-center justify-center">
                  {recentSyncErrors.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard">
            <FacebookSyncDashboard
              campaigns={fbSettings.campaigns || []}
              lastSync={fbSettings.last_sync || {}}
              syncLogs={syncLogs}
              leadsByCampaign={leadsByCampaign}
              onSync={handleSyncLeads}
              syncing={syncing}
            />
          </TabsContent>

          {/* Campaigns Tab */}
          <TabsContent value="campaigns">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Campanhas e Formulários
              </span>
              <Dialog open={campaignDialogOpen} onOpenChange={(open) => {
                if (!open) {
                  setEditingCampaignIndex(null);
                }
                setCampaignDialogOpen(open);
              }}>
                <DialogTrigger asChild>
                  <Button size="sm" onClick={handleOpenAddCampaignDialog}>
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Campanha
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingCampaignIndex !== null ? 'Editar Campanha/Formulário' : 'Adicionar Campanha/Formulário'}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div>
                      <Label>ID da Campanha *</Label>
                      <Input
                        value={campaignForm.campaign_id}
                        onChange={(e) => setCampaignForm({...campaignForm, campaign_id: e.target.value})}
                        placeholder="123456789"
                      />
                    </div>
                    <div>
                      <Label>Nome da Campanha</Label>
                      <Input
                        value={campaignForm.campaign_name}
                        onChange={(e) => setCampaignForm({...campaignForm, campaign_name: e.target.value})}
                        placeholder="Campanha T2 Lisboa"
                      />
                    </div>
                    <div>
                      <Label>ID do Formulário *</Label>
                      <Input
                        value={campaignForm.form_id}
                        onChange={(e) => setCampaignForm({...campaignForm, form_id: e.target.value})}
                        placeholder="987654321"
                      />
                    </div>
                    <div>
                      <Label>Nome do Formulário</Label>
                      <Input
                        value={campaignForm.form_name}
                        onChange={(e) => setCampaignForm({...campaignForm, form_name: e.target.value})}
                        placeholder="Formulário Principal"
                      />
                    </div>
                    <div>
                      <Label>Responsável pela Campanha</Label>
                      <select
                        value={campaignForm.assigned_to}
                        onChange={(e) => setCampaignForm({...campaignForm, assigned_to: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                      >
                        <option value="">Selecione um responsável</option>
                        {allUsers.map((u) => (
                          <option key={u.id} value={u.email}>
                            {u.full_name} ({u.email})
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-slate-600 mt-1">Receberá notificações de novos leads desta campanha</p>
                    </div>
                    <div>
                      <Label>Intervalo de Sincronização Automática</Label>
                      <select
                        value={campaignForm.sync_interval_hours}
                        onChange={(e) => setCampaignForm({...campaignForm, sync_interval_hours: Number(e.target.value)})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                      >
                        <option value={1}>A cada hora</option>
                        <option value={4}>A cada 4 horas</option>
                        <option value={12}>A cada 12 horas</option>
                        <option value={24}>Uma vez por dia</option>
                        <option value={168}>Uma vez por semana</option>
                        <option value={0}>Apenas manual</option>
                      </select>
                      <p className="text-xs text-slate-600 mt-1">Define com que frequência os leads são sincronizados automaticamente</p>
                    </div>
                    <Button onClick={handleAddCampaign} className="w-full">
                      {editingCampaignIndex !== null ? 'Guardar Alterações' : 'Adicionar'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(!fbSettings.campaigns || fbSettings.campaigns.length === 0) ? (
              <div className="text-center py-8">
                <TrendingUp className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-600">Nenhuma campanha configurada</p>
              </div>
            ) : (
              <div className="space-y-3">
                {fbSettings.campaigns.map((campaign, idx) => (
                  <Card key={idx} className="border-blue-200">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-slate-900">
                            {campaign.campaign_name || `Campanha ${campaign.campaign_id}`}
                          </h4>
                          <p className="text-sm text-slate-600">
                            {campaign.form_name || `Formulário ${campaign.form_id}`}
                          </p>
                          <div className="flex gap-2 mt-2 text-xs text-slate-500">
                            <span>Campaign ID: {campaign.campaign_id}</span>
                            <span>•</span>
                            <span>Form ID: {campaign.form_id}</span>
                          </div>
                          <div className="flex gap-2 mt-2 flex-wrap">
                            {leadsByCampaign[campaign.form_id] && (
                              <Badge variant="outline">
                                <Users className="w-3 h-3 mr-1" />
                                {leadsByCampaign[campaign.form_id].length} leads
                              </Badge>
                            )}
                            {campaign.assigned_to && (
                              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300">
                                👤 {allUsers.find(u => u.email === campaign.assigned_to)?.full_name || campaign.assigned_to}
                              </Badge>
                            )}
                            {campaign.sync_interval_hours !== undefined && campaign.sync_interval_hours > 0 && (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                                🔄 {campaign.sync_interval_hours === 1 ? 'Cada hora' : 
                                   campaign.sync_interval_hours === 4 ? 'Cada 4h' :
                                   campaign.sync_interval_hours === 12 ? 'Cada 12h' :
                                   campaign.sync_interval_hours === 24 ? 'Diário' :
                                   campaign.sync_interval_hours === 168 ? 'Semanal' : `${campaign.sync_interval_hours}h`}
                              </Badge>
                            )}
                            {campaign.sync_interval_hours === 0 && (
                              <Badge variant="outline" className="bg-slate-50 text-slate-700">
                                Manual apenas
                              </Badge>
                            )}
                            {fbSettings.last_sync?.[campaign.form_id] && (
                              <Badge variant="outline" className="text-xs">
                                Última sync: {new Date(fbSettings.last_sync[campaign.form_id]).toLocaleString('pt-PT', { 
                                  day: '2-digit', 
                                  month: '2-digit', 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEditCampaignDialog(campaign, idx)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSyncLeads(campaign.form_id)}
                            disabled={syncing === campaign.form_id}
                          >
                            {syncing === campaign.form_id ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <Download className="w-4 h-4 mr-2" />
                                Sincronizar
                              </>
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenDateRangeDialog(campaign.form_id)}
                            disabled={syncing === campaign.form_id}
                          >
                            <Calendar className="w-4 h-4 mr-2" />
                            Histórico
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedFormForLogs(campaign.form_id);
                              setLogsDialogOpen(true);
                            }}
                          >
                            <FileText className="w-4 h-4 mr-2" />
                            Logs
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveCampaign(campaign.form_id)}
                            className="text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
          </TabsContent>

          {/* Leads Tab */}
          <TabsContent value="leads">
            <FacebookLeadsFilters
              campaigns={fbSettings.campaigns || []}
              filters={leadFilters}
              onFilterChange={setLeadFilters}
              totalLeads={fbLeads.length}
              filteredCount={filteredLeads.length}
            />
          </TabsContent>

          {/* Alerts Tab */}
          <TabsContent value="alerts">
            <FacebookSyncAlerts
              settings={fbSettings.alertSettings || {}}
              onSaveSettings={handleSaveAlertSettings}
              recentErrors={recentSyncErrors}
            />
          </TabsContent>
        </Tabs>
      )}

      {/* Dialog de Intervalo de Datas */}
      <Dialog open={dateRangeDialogOpen} onOpenChange={setDateRangeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              Sincronizar Leads Históricas
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-900">
                Selecione um intervalo de datas para importar leads históricas do Facebook. 
                Isto é útil quando adiciona uma nova campanha ou quer recuperar leads antigas.
              </p>
            </div>
            
            <div>
              <Label>Data de Início *</Label>
              <Input
                type="date"
                value={dateRange.start_date}
                onChange={(e) => setDateRange({...dateRange, start_date: e.target.value})}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
            
            <div>
              <Label>Data de Fim *</Label>
              <Input
                type="date"
                value={dateRange.end_date}
                onChange={(e) => setDateRange({...dateRange, end_date: e.target.value})}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => setDateRangeDialogOpen(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleSyncWithDateRange}
                disabled={syncing === selectedFormForSync}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {syncing === selectedFormForSync ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                Sincronizar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {fbSettings?.configured && activeTab === 'leads' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Leads do Facebook ({filteredLeads.length})
                {filteredLeads.length !== fbLeads.length && (
                  <Badge variant="outline" className="text-xs">
                    Filtrados
                  </Badge>
                )}
              </span>
              <div className="flex items-center gap-2">
                {selectedLeads.length > 0 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleBulkDelete}
                    disabled={deletingBulk}
                  >
                    {deletingBulk ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4 mr-2" />
                    )}
                    Eliminar {selectedLeads.length}
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleSelectAllLeads}
                >
                  {selectedLeads.length === filteredLeads.length && filteredLeads.length > 0 ? (
                    <>
                      <XCircle className="w-4 h-4 mr-2" />
                      Desselecionar
                    </>
                  ) : (
                    <>
                      <CheckSquare className="w-4 h-4 mr-2" />
                      Selecionar Todos
                    </>
                  )}
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredLeads.length === 0 ? (
              <div className="text-center py-12">
                <Filter className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-600 font-medium">Nenhuma lead encontrada</p>
                <p className="text-sm text-slate-500 mt-1">
                  {fbLeads.length > 0 
                    ? "Tente ajustar os filtros de pesquisa" 
                    : "Sincronize campanhas para importar leads"}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredLeads.map((lead) => (
                  <Card key={lead.id} className={`border-2 ${selectedLeads.includes(lead.id) ? 'border-blue-500 bg-blue-100' : lead.status === 'new' ? 'border-blue-300 bg-blue-50' : lead.status === 'converted' ? 'border-green-300 bg-green-50' : ''}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <Checkbox
                            checked={selectedLeads.includes(lead.id)}
                            onCheckedChange={() => toggleSelectLead(lead.id)}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold text-slate-900">{lead.full_name}</h4>
                              <Badge className={
                                lead.status === 'new' ? 'bg-blue-100 text-blue-800' :
                                lead.status === 'converted' ? 'bg-green-100 text-green-800' :
                                lead.status === 'contacted' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-slate-100 text-slate-800'
                              }>
                                {lead.status === 'new' ? 'Novo' :
                                 lead.status === 'converted' ? 'Convertido' :
                                 lead.status === 'contacted' ? 'Contactado' : 'Arquivado'}
                              </Badge>
                            </div>
                            <div className="grid md:grid-cols-2 gap-2 text-sm text-slate-700">
                              <div>📧 {lead.email}</div>
                              {lead.phone && <div>📱 {lead.phone}</div>}
                              {lead.location && <div>📍 {lead.location}</div>}
                              {lead.property_type && <div>🏠 {lead.property_type}</div>}
                              {lead.budget && <div>💰 €{Number(lead.budget).toLocaleString()}</div>}
                            </div>
                            <p className="text-xs text-slate-600 mt-2">
                              Campanha: {lead.campaign_name || lead.campaign_id} • Formulário: {lead.form_name || lead.form_id}
                            </p>
                            {lead.message && (
                              <p className="text-sm text-slate-600 mt-2 line-clamp-2">{lead.message}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          {lead.status === 'new' && (
                            <Button
                              size="sm"
                              onClick={() => handleOpenConvertDialog(lead)}
                              disabled={convertToOpportunityMutation.isPending}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              Converter
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteLeadMutation.mutate(lead.id)}
                            className="text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dialog de Logs */}
      <Dialog open={logsDialogOpen} onOpenChange={setLogsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Histórico de Sincronizações
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-3">
            {syncLogs
              .filter(log => log.form_id === selectedFormForLogs)
              .map((log) => (
                <Card key={log.id} className={`border-2 ${
                  log.status === 'success' ? 'border-green-200 bg-green-50' :
                  log.status === 'partial' ? 'border-yellow-200 bg-yellow-50' :
                  'border-red-200 bg-red-50'
                }`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {log.status === 'success' ? (
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                          ) : log.status === 'error' ? (
                            <XCircle className="w-5 h-5 text-red-600" />
                          ) : (
                            <Clock className="w-5 h-5 text-yellow-600" />
                          )}
                          <span className="font-semibold text-slate-900">
                            {log.sync_type === 'historical' ? 'Sincronização Histórica' :
                             log.sync_type === 'automatic' ? 'Sincronização Automática' :
                             'Sincronização Manual'}
                          </span>
                          <Badge className={
                            log.status === 'success' ? 'bg-green-100 text-green-800' :
                            log.status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }>
                            {log.status === 'success' ? 'Sucesso' :
                             log.status === 'partial' ? 'Parcial' : 'Erro'}
                          </Badge>
                        </div>

                        <div className="grid md:grid-cols-2 gap-2 text-sm mb-2">
                          <div>
                            <span className="font-medium text-slate-700">Leads Obtidas:</span>
                            <span className="ml-2 text-slate-900">{log.leads_fetched || 0}</span>
                          </div>
                          <div>
                            <span className="font-medium text-slate-700">Novas Criadas:</span>
                            <span className="ml-2 text-green-600 font-semibold">{log.leads_created || 0}</span>
                          </div>
                          <div>
                            <span className="font-medium text-slate-700">Duplicadas:</span>
                            <span className="ml-2 text-slate-600">{log.leads_duplicated || 0}</span>
                          </div>
                          <div>
                            <span className="font-medium text-slate-700">Duração:</span>
                            <span className="ml-2 text-slate-900">{log.duration_seconds || 0}s</span>
                          </div>
                        </div>

                        {(log.start_date || log.end_date) && (
                          <div className="text-xs text-slate-600 mb-1">
                            <Calendar className="w-3 h-3 inline mr-1" />
                            Período: {log.start_date ? new Date(log.start_date).toLocaleDateString('pt-PT') : '?'} - {log.end_date ? new Date(log.end_date).toLocaleDateString('pt-PT') : '?'}
                          </div>
                        )}

                        {log.error_message && (
                          <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded text-xs text-red-800">
                            <strong>Erro:</strong> {log.error_message}
                          </div>
                        )}

                        <div className="text-xs text-slate-500 mt-2">
                          {new Date(log.created_date).toLocaleString('pt-PT')} • Por {log.triggered_by}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            {syncLogs.filter(log => log.form_id === selectedFormForLogs).length === 0 && (
              <div className="text-center py-8 text-slate-500">
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                Nenhuma sincronização realizada ainda
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Conversão com Seleção de Imóvel */}
      <Dialog open={convertDialogOpen} onOpenChange={setConvertDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Converter Lead em Oportunidade</DialogTitle>
          </DialogHeader>
          {leadToConvert && (
            <div className="space-y-4 mt-4">
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm font-semibold text-blue-900">{leadToConvert.full_name}</p>
                <p className="text-xs text-blue-700">{leadToConvert.email}</p>
              </div>
              
              <div>
                <Label>Agente Responsável</Label>
                <Select
                  value={selectedAgentEmail}
                  onValueChange={setSelectedAgentEmail}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar agente..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Nenhum Agente</SelectItem>
                    {allUsers.map((u) => (
                      <SelectItem key={u.id} value={u.email}>
                        {u.full_name} ({u.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-600 mt-1">
                  Agente que ficará responsável por esta oportunidade
                </p>
              </div>

              <div>
                <Label>Imóvel (Opcional)</Label>
                <Select
                  value={selectedPropertyId}
                  onValueChange={setSelectedPropertyId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar imóvel..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Nenhum Imóvel</SelectItem>
                    {properties.filter(p => p.status === 'active').map((property) => (
                      <SelectItem key={property.id} value={property.id}>
                        {property.title} - {property.city} - €{property.price?.toLocaleString()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-600 mt-1">
                  Associe um imóvel específico a esta oportunidade (opcional)
                </p>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <Button 
                  variant="outline" 
                  onClick={() => setConvertDialogOpen(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleConvertLead}
                  disabled={convertToOpportunityMutation.isPending}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {convertToOpportunityMutation.isPending ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      A converter...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Converter Lead
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}