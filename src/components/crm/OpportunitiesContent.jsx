import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LayoutGrid, List, Table as TableIcon, TrendingUp, UserCheck, UserPlus, Plus, Kanban, Euro, Target, Sparkles, Loader2, Grid3X3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import LeadsTable from "./LeadsTable";
import LeadDetailPanel from "./LeadDetailPanel";
import PipelineView from "./PipelineView";
import OpportunitiesDashboard from "../opportunities/OpportunitiesDashboard";
import OpportunityFormDialog from "../opportunities/OpportunityFormDialog";
import OpportunityKanban from "../opportunities/OpportunityKanban";
import OpportunitiesTable from "./OpportunitiesTable";
import SendEmailDialog from "../email/SendEmailDialog";
import AdvancedFilters, { FILTER_TYPES } from "@/components/filters/AdvancedFilters";
import { useAdvancedFilters } from "@/components/filters/useAdvancedFilters";
import { calculateLeadScore, bulkScoreLeads } from "@/components/opportunities/AILeadScoring";
import { useAgentNames } from "@/components/common/useAgentNames";

import OpportunitiesGrid from "./OpportunitiesGrid";

export default function OpportunitiesContent() {
  const queryClient = useQueryClient();
  const { getAgentOptions } = useAgentNames();
  const [viewMode, setViewMode] = React.useState(() => {
    // Default to grid on mobile
    return window.innerWidth < 768 ? "grid" : "table";
  });
  const [selectedLead, setSelectedLead] = React.useState(null);
  const [selectedLeads, setSelectedLeads] = React.useState([]);
  const [bulkAssignAgent, setBulkAssignAgent] = React.useState("");
  const [formDialogOpen, setFormDialogOpen] = React.useState(false);
  const [editingOpportunity, setEditingOpportunity] = React.useState(null);
  const [emailDialogOpen, setEmailDialogOpen] = React.useState(false);
  const [emailRecipient, setEmailRecipient] = React.useState(null);
  const [filterLogic, setFilterLogic] = React.useState("AND");
  const [isBulkScoring, setIsBulkScoring] = React.useState(false);
  
  // Estado dos filtros avançados
  const [filters, setFilters] = React.useState({
    search: "",
    status: "all",
    lead_type: "all",
    qualification_status: "all",
    lead_source: "all",
    assigned_to: "all",
    priority: "all",
    created_date: {},
    updated_date: {},
    budget: {},
    estimated_value: {}
  });

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: opportunities = [], isLoading } = useQuery({
    queryKey: ['opportunities', user?.email],
    queryFn: async () => {
      if (!user) return [];
      const allOpportunities = await base44.entities.Opportunity.list('-updated_date');
      
      const userType = user.user_type?.toLowerCase() || '';
      const permissions = user.permissions || {};
      
      if (user.role === 'admin' || userType === 'admin' || userType === 'gestor') {
        return allOpportunities;
      }
      
      // Verifica permissão canViewAllLeads
      if (permissions.canViewAllLeads === true) {
        return allOpportunities;
      }
      
      return allOpportunities.filter(i => 
        i.seller_email === user.email || i.assigned_to === user.email || i.created_by === user.email
      );
    },
    enabled: !!user
  });

  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list('-created_date'),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const allUsers = await base44.entities.User.list();
      return allUsers;
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['buyerProfiles'],
    queryFn: () => base44.entities.BuyerProfile.list(),
  });

  const { data: facebookLeads = [] } = useQuery({
    queryKey: ['facebookLeads'],
    queryFn: () => base44.entities.FacebookLead.list(),
  });

  // Extract unique campaign names
  const allCampaigns = React.useMemo(() => {
    const campaignsSet = new Set();
    facebookLeads.forEach(lead => {
      if (lead.campaign_name) campaignsSet.add(lead.campaign_name);
    });
    opportunities.forEach(opp => {
      if (opp.source_url?.includes('facebook') && opp.message) {
        const campaignMatch = opp.message.match(/Campanha:\s*(.+?)(?:\n|$)/i);
        if (campaignMatch) campaignsSet.add(campaignMatch[1].trim());
      }
    });
    return Array.from(campaignsSet).sort();
  }, [facebookLeads, opportunities]);

  // Configuração dos filtros avançados para oportunidades
  const filterConfig = React.useMemo(() => ({
    search: {
      type: FILTER_TYPES.text,
      label: "Pesquisar",
      placeholder: "Nome ou email...",
      searchFields: ["buyer_name", "buyer_email", "buyer_phone", "location"]
    },
    status: {
      type: FILTER_TYPES.select,
      label: "Estado",
      field: "status",
      options: [
        { value: "new", label: "Novo" },
        { value: "contacted", label: "Contactado" },
        { value: "qualified", label: "Qualificado" },
        { value: "proposal", label: "Proposta" },
        { value: "negotiation", label: "Negociação" },
        { value: "won", label: "Ganho" },
        { value: "lost", label: "Perdido" }
      ]
    },
    lead_type: {
      type: FILTER_TYPES.select,
      label: "Tipo",
      field: "lead_type",
      options: [
        { value: "comprador", label: "Comprador" },
        { value: "vendedor", label: "Vendedor" },
        { value: "parceiro_comprador", label: "Parceiro Comprador" },
        { value: "parceiro_vendedor", label: "Parceiro Vendedor" }
      ]
    },
    qualification_status: {
      type: FILTER_TYPES.select,
      label: "Qualificação",
      field: "qualification_status",
      options: [
        { value: "hot", label: "🔥 Hot" },
        { value: "warm", label: "🌡️ Warm" },
        { value: "cold", label: "❄️ Cold" },
        { value: "unqualified", label: "Não Qualificado" }
      ]
    },
    lead_source: {
      type: FILTER_TYPES.select,
      label: "Origem",
      field: "lead_source",
      options: [
        { value: "facebook_ads", label: "Facebook Ads" },
        { value: "website", label: "Website" },
        { value: "referral", label: "Referência" },
        { value: "direct_contact", label: "Contacto Direto" },
        { value: "real_estate_portal", label: "Portal Imobiliário" },
        { value: "networking", label: "Networking" },
        { value: "other", label: "Outro" }
      ]
    },
    assigned_to: {
      type: FILTER_TYPES.select,
      label: "Agente",
      field: "assigned_to",
      options: [
        { value: "unassigned", label: "Sem agente" },
        ...getAgentOptions()
      ]
    },
    priority: {
      type: FILTER_TYPES.select,
      label: "Prioridade",
      field: "priority",
      options: [
        { value: "high", label: "Alta" },
        { value: "medium", label: "Média" },
        { value: "low", label: "Baixa" }
      ],
      advanced: true
    },
    created_date: {
      type: FILTER_TYPES.dateRange,
      label: "Data de Criação",
      field: "created_date",
      advanced: true
    },
    updated_date: {
      type: FILTER_TYPES.dateRange,
      label: "Data de Atualização",
      field: "updated_date",
      advanced: true
    },
    budget: {
      type: FILTER_TYPES.numberRange,
      label: "Orçamento",
      field: "budget",
      prefix: "€",
      advanced: true
    },
    estimated_value: {
      type: FILTER_TYPES.numberRange,
      label: "Valor Estimado",
      field: "estimated_value",
      prefix: "€",
      advanced: true
    }
  }), [users]);

  // Aplicar filtros avançados - com tratamento especial para "unassigned"
  const filteredOpportunities = React.useMemo(() => {
    return opportunities.filter(opp => {
      const results = Object.entries(filters).map(([key, value]) => {
        const config = filterConfig[key];
        if (!config) return true;
        
        if (value === "" || value === "all" || value === null || value === undefined) return true;
        if (Array.isArray(value) && value.length === 0) return true;
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          const hasValue = Object.values(value).some(v => v !== null && v !== "" && v !== undefined);
          if (!hasValue) return true;
        }

        // Tratamento especial para assigned_to com "unassigned"
        if (key === "assigned_to" && value === "unassigned") {
          return !opp.assigned_to;
        }

        // Pesquisa de texto
        if (config.type === "text" && config.searchFields) {
          const searchValue = String(value).toLowerCase();
          return config.searchFields.some(field => {
            const fieldValue = opp[field];
            return fieldValue && String(fieldValue).toLowerCase().includes(searchValue);
          });
        }

        // Select simples
        if (config.type === "select") {
          return opp[config.field] === value;
        }

        // Date range
        if (config.type === "dateRange") {
          const dateValue = opp[config.field];
          if (!dateValue) return true;
          const date = new Date(dateValue);
          if (value.from) {
            const fromDate = new Date(value.from);
            fromDate.setHours(0, 0, 0, 0);
            if (date < fromDate) return false;
          }
          if (value.to) {
            const toDate = new Date(value.to);
            toDate.setHours(23, 59, 59, 999);
            if (date > toDate) return false;
          }
          return true;
        }

        // Number range
        if (config.type === "numberRange") {
          const numValue = opp[config.field];
          if (numValue === null || numValue === undefined) return true;
          if (value.min !== null && value.min !== undefined && numValue < value.min) return false;
          if (value.max !== null && value.max !== undefined && numValue > value.max) return false;
          return true;
        }

        return true;
      });

      return filterLogic === "OR" ? results.some(r => r) : results.every(r => r);
    });
  }, [opportunities, filters, filterConfig, filterLogic]);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Opportunity.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Opportunity.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      setSelectedLead(null);
    },
  });

  const onDragEnd = (result) => {
    const { destination, draggableId } = result;
    if (!destination) return;
    
    const newStatus = destination.droppableId;
    if (['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'].includes(newStatus)) {
      updateMutation.mutate({
        id: draggableId,
        data: { status: newStatus }
      });
    }
  };

  const handleEditOpportunity = (opp) => {
    setEditingOpportunity(opp);
    setFormDialogOpen(true);
  };

  const handleCloseFormDialog = () => {
    setFormDialogOpen(false);
    setEditingOpportunity(null);
  };

  const handleToggleImportant = (lead) => {
    const newPriority = lead.priority === 'high' ? 'medium' : 'high';
    updateMutation.mutate({
      id: lead.id,
      data: { priority: newPriority }
    });
  };

  const handleDelete = (lead) => {
    if (window.confirm(`Eliminar lead "${lead.buyer_name}"?`)) {
      deleteMutation.mutate(lead.id);
    }
  };

  const handleAssign = (lead, email) => {
    updateMutation.mutate({
      id: lead.id,
      data: { assigned_to: email }
    });
  };

  const bulkAssignMutation = useMutation({
    mutationFn: async ({ leadIds, agentEmail }) => {
      await Promise.all(leadIds.map(id => 
        base44.entities.Opportunity.update(id, { assigned_to: agentEmail })
      ));
    },
    onSuccess: (_, { leadIds }) => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      toast.success(`${leadIds.length} lead${leadIds.length > 1 ? 's' : ''} atribuído${leadIds.length > 1 ? 's' : ''}`);
      setSelectedLeads([]);
      setBulkAssignAgent("");
    },
  });

  const bulkConvertMutation = useMutation({
    mutationFn: async (leadIds) => {
      const leadsToConvert = opportunities.filter(o => leadIds.includes(o.id));
      await Promise.all(leadsToConvert.map(lead => {
        const contactTypeMap = {
          'comprador': 'client',
          'vendedor': 'client',
          'parceiro_comprador': 'partner',
          'parceiro_vendedor': 'partner'
        };
        return base44.entities.ClientContact.create({
          full_name: lead.buyer_name,
          email: lead.buyer_email || "",
          phone: lead.buyer_phone || "",
          city: lead.location || "",
          contact_type: contactTypeMap[lead.lead_type] || 'client',
          source: lead.lead_source || "other",
          notes: `Tipo original: ${lead.lead_type === 'comprador' ? 'Comprador' : lead.lead_type === 'vendedor' ? 'Vendedor' : lead.lead_type === 'parceiro_comprador' ? 'Parceiro Comprador' : 'Parceiro Vendedor'}\n\n${lead.message || ""}`,
          linked_opportunity_ids: [lead.id],
          assigned_agent: lead.assigned_to || ""
        });
      }));
    },
    onSuccess: (_, leadIds) => {
      queryClient.invalidateQueries({ queryKey: ['clientContacts'] });
      toast.success(`${leadIds.length} lead${leadIds.length > 1 ? 's' : ''} convertido${leadIds.length > 1 ? 's' : ''} em contactos`);
      setSelectedLeads([]);
    },
  });

  const handleBulkConvert = () => {
    if (selectedLeads.length === 0) {
      toast.error("Selecione pelo menos um lead");
      return;
    }
    if (window.confirm(`Converter ${selectedLeads.length} lead${selectedLeads.length > 1 ? 's' : ''} em contactos?`)) {
      bulkConvertMutation.mutate(selectedLeads);
    }
  };

  const handleBulkAssign = () => {
    if (!bulkAssignAgent || selectedLeads.length === 0) {
      toast.error("Selecione um agente e pelo menos um lead");
      return;
    }
    bulkAssignMutation.mutate({ 
      leadIds: selectedLeads, 
      agentEmail: bulkAssignAgent 
    });
  };

  const handleBulkScore = async () => {
    if (selectedLeads.length === 0) {
      toast.error("Selecione pelo menos um lead");
      return;
    }
    
    setIsBulkScoring(true);
    try {
      const leadsToScore = opportunities.filter(o => selectedLeads.includes(o.id));
      await bulkScoreLeads(leadsToScore, (update) => 
        base44.entities.Opportunity.update(update.id, update.data)
      );
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      toast.success(`${selectedLeads.length} leads qualificados com sucesso!`);
      setSelectedLeads([]);
    } catch (error) {
      toast.error("Erro ao qualificar leads");
    }
    setIsBulkScoring(false);
  };

  const handleScoreAllUnqualified = async () => {
    const unqualifiedLeads = opportunities.filter(o => !o.qualification_status || !o.qualification_score);
    if (unqualifiedLeads.length === 0) {
      toast.info("Todos os leads já estão qualificados");
      return;
    }
    
    if (!window.confirm(`Qualificar ${unqualifiedLeads.length} leads sem score?`)) return;
    
    setIsBulkScoring(true);
    try {
      await bulkScoreLeads(unqualifiedLeads, (update) => 
        base44.entities.Opportunity.update(update.id, update.data)
      );
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      toast.success(`${unqualifiedLeads.length} leads qualificados!`);
    } catch (error) {
      toast.error("Erro ao qualificar leads");
    }
    setIsBulkScoring(false);
  };

  const toggleSelectLead = (leadId) => {
    setSelectedLeads(prev =>
      prev.includes(leadId) ? prev.filter(id => id !== leadId) : [...prev, leadId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedLeads.length === filteredOpportunities.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(filteredOpportunities.map(o => o.id));
    }
  };

  const stats = React.useMemo(() => {
    const totalValue = opportunities.reduce((sum, o) => sum + (o.estimated_value || 0), 0);
    const weightedValue = opportunities.reduce((sum, o) => {
      const val = o.estimated_value || 0;
      const prob = o.probability || 50;
      return sum + (val * prob / 100);
    }, 0);
    
    return {
      total: opportunities.length,
      new: opportunities.filter(o => o.status === 'new').length,
      hot: opportunities.filter(o => o.qualification_status === 'hot').length,
      facebook: opportunities.filter(o => o.source_url?.includes('facebook')).length,
      totalValue,
      weightedValue
    };
  }, [opportunities]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Oportunidades & Pipeline</h2>
          <p className="text-slate-600">Gerir oportunidades de negócio</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleScoreAllUnqualified}
            disabled={isBulkScoring}
            variant="outline"
            className="border-purple-300 text-purple-700 hover:bg-purple-50"
          >
            {isBulkScoring ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2" />
            )}
            AI Scoring
          </Button>
          <Button
            onClick={() => { setEditingOpportunity(null); setFormDialogOpen(true); }}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Oportunidade
          </Button>
          <div className="flex border rounded-lg overflow-hidden">
            <Button
              variant={viewMode === "dashboard" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("dashboard")}
              className="rounded-none"
            >
              <TrendingUp className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "kanban" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("kanban")}
              className="rounded-none hidden sm:flex"
            >
              <Kanban className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "pipeline" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("pipeline")}
              className="rounded-none hidden sm:flex"
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className="rounded-none"
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "table" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("table")}
              className="rounded-none hidden sm:flex"
            >
              <TableIcon className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      {viewMode !== "dashboard" && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-900">{stats.total}</div>
              <div className="text-xs text-blue-700">Total</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-green-100">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-900">{stats.new}</div>
              <div className="text-xs text-green-700">Novos</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-red-50 to-red-100">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-900">{stats.hot}</div>
              <div className="text-xs text-red-700">🔥 Hot</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-50 to-amber-100">
            <CardContent className="p-4">
              <div className="flex items-center gap-1">
                <Euro className="w-4 h-4 text-amber-700" />
                <div className="text-lg font-bold text-amber-900">
                  {stats.totalValue > 1000000 
                    ? `${(stats.totalValue / 1000000).toFixed(1)}M` 
                    : `${Math.round(stats.totalValue / 1000)}k`}
                </div>
              </div>
              <div className="text-xs text-amber-700">Valor Total</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100">
            <CardContent className="p-4">
              <div className="flex items-center gap-1">
                <Target className="w-4 h-4 text-emerald-700" />
                <div className="text-lg font-bold text-emerald-900">
                  {stats.weightedValue > 1000000 
                    ? `${(stats.weightedValue / 1000000).toFixed(1)}M` 
                    : `${Math.round(stats.weightedValue / 1000)}k`}
                </div>
              </div>
              <div className="text-xs text-emerald-700">Ponderado</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-purple-900">{stats.facebook}</div>
              <div className="text-xs text-purple-700">Facebook</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Bulk Actions Bar */}
      {selectedLeads.length > 0 && viewMode !== "dashboard" && (
        <Card className="border-blue-500 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <UserCheck className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-blue-900">
                  {selectedLeads.length} lead{selectedLeads.length > 1 ? 's' : ''} selecionado{selectedLeads.length > 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Select value={bulkAssignAgent} onValueChange={setBulkAssignAgent}>
                  <SelectTrigger className="w-48 bg-white">
                    <SelectValue placeholder="Selecionar agente..." />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.email}>
                        {u.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  onClick={handleBulkAssign}
                  disabled={!bulkAssignAgent || bulkAssignMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Atribuir
                </Button>
                <Button 
                  onClick={handleBulkScore}
                  disabled={isBulkScoring}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {isBulkScoring ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 mr-1" />
                  )}
                  Qualificar
                </Button>
                <Button 
                  onClick={handleBulkConvert}
                  disabled={bulkConvertMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <UserPlus className="w-4 h-4 mr-1" />
                  {bulkConvertMutation.isPending ? "A converter..." : "Converter"}
                </Button>
                <Button variant="outline" onClick={() => setSelectedLeads([])}>
                  Cancelar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      {viewMode !== "dashboard" && (
        <AdvancedFilters
          filterConfig={filterConfig}
          filters={filters}
          onFiltersChange={setFilters}
          savedFiltersKey="opportunities"
          totalCount={opportunities.length}
          filteredCount={filteredOpportunities.length}
          showSavedFilters={true}
          showLogicToggle={true}
        />
      )}

      {/* Content */}
      {viewMode === "dashboard" && (
        <OpportunitiesDashboard opportunities={opportunities} />
      )}

      {viewMode === "kanban" && (
        <OpportunityKanban
          opportunities={filteredOpportunities}
          onDragEnd={onDragEnd}
          onOpportunityClick={setSelectedLead}
          onEdit={handleEditOpportunity}
          onDelete={handleDelete}
        />
      )}

      {viewMode === "pipeline" && (
        <PipelineView 
          leads={filteredOpportunities}
          onDragEnd={onDragEnd}
          onLeadClick={setSelectedLead}
        />
      )}

      {viewMode === "table" && (
        <OpportunitiesTable 
          opportunities={filteredOpportunities}
          users={users}
          selectedOpportunities={selectedLeads}
          onToggleSelect={toggleSelectLead}
          onToggleSelectAll={toggleSelectAll}
          onOpportunityClick={setSelectedLead}
          onEdit={handleEditOpportunity}
          onDelete={handleDelete}
          onToggleImportant={handleToggleImportant}
          onAssign={handleAssign}
        />
      )}

      {viewMode === "grid" && (
        <OpportunitiesGrid
          opportunities={filteredOpportunities}
          users={users}
          selectedOpportunities={selectedLeads}
          onToggleSelect={toggleSelectLead}
          onOpportunityClick={setSelectedLead}
          onEdit={handleEditOpportunity}
          onDelete={handleDelete}
          onToggleImportant={handleToggleImportant}
        />
      )}

      {viewMode === "list" && (
        <div className="space-y-4">
          {filteredOpportunities.map((lead) => (
            <Card 
              key={lead.id} 
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setSelectedLead(lead)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-900">{lead.buyer_name}</h3>
                    <p className="text-sm text-slate-600">{lead.buyer_email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {lead.qualification_status === 'hot' && <span>🔥</span>}
                    {lead.priority === 'high' && <span>⭐</span>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Lead Detail Panel */}
      {selectedLead && (
        <LeadDetailPanel
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onUpdate={(id, data) => updateMutation.mutate({ id, data })}
          properties={properties}
          onEdit={() => handleEditOpportunity(selectedLead)}
        />
      )}

      {/* Opportunity Form Dialog */}
      <OpportunityFormDialog
        opportunity={editingOpportunity}
        open={formDialogOpen}
        onOpenChange={handleCloseFormDialog}
        onSaved={() => {
          setSelectedLead(null);
        }}
      />

      {/* Send Email Dialog */}
      <SendEmailDialog
        open={emailDialogOpen}
        onOpenChange={setEmailDialogOpen}
        recipient={emailRecipient}
      />
    </div>
  );
}