import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LayoutGrid, List, Table as TableIcon, TrendingUp, UserCheck, UserPlus, Plus, Kanban, Euro, Target, Sparkles, Loader2, Grid3X3, PanelLeft, User, Mail, Phone, MapPin, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import LeadsTable from "./LeadsTable";
import LeadDetailPanel from "./LeadDetailPanel";
import PipelineView from "./PipelineView";
import LeadsPipeline from "./LeadsPipeline";
import OpportunitiesDashboard from "../opportunities/OpportunitiesDashboard";
import OpportunityFormDialog from "../opportunities/OpportunityFormDialog";
import OpportunityKanban from "../opportunities/OpportunityKanban";
import OpportunitiesTable from "./OpportunitiesTable";
import SendEmailDialog from "../email/SendEmailDialog";
import EmailHistoryPanel from "../email/EmailHistoryPanel";
import OpportunityQuickFilters from "./OpportunityQuickFilters";
import { calculateLeadScore, bulkScoreLeads } from "@/components/opportunities/AILeadScoring";
import { useAgentNames } from "@/components/common/useAgentNames";
import { useAuditLog } from "../audit/useAuditLog";
import OpportunitiesGrid from "./OpportunitiesGrid";

export default function OpportunitiesContent() {
  const queryClient = useQueryClient();
  const { getAgentOptions, getAgentName } = useAgentNames();
  const { logAction } = useAuditLog();
  const [viewMode, setViewMode] = React.useState(() => {
    // Default to kanban on mobile, kanban on desktop
    return "kanban";
  });
  const [selectedLeadId, setSelectedLeadId] = React.useState(null);
  const [selectedLeads, setSelectedLeads] = React.useState([]);
  const [bulkAssignAgent, setBulkAssignAgent] = React.useState("");
  const [formDialogOpen, setFormDialogOpen] = React.useState(false);
  const [editingOpportunity, setEditingOpportunity] = React.useState(null);
  const [emailDialogOpen, setEmailDialogOpen] = React.useState(false);
  const [emailRecipient, setEmailRecipient] = React.useState(null);
  const [isBulkScoring, setIsBulkScoring] = React.useState(false);
  
  // Estado dos filtros simplificados
  const [filters, setFilters] = React.useState({
    search: "",
    status: "all",
    lead_type: "all",
    qualification_status: "all",
    lead_source: "all",
    assigned_to: "all",
    priority: "all",
    converted: "all"
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

  // Buscar contactos para verificar quais oportunidades foram convertidas
  const { data: clientContacts = [] } = useQuery({
    queryKey: ['clientContacts'],
    queryFn: () => base44.entities.ClientContact.list(),
  });

  // Criar set de oportunidades convertidas
  const convertedOpportunityIds = React.useMemo(() => {
    const converted = new Set();
    clientContacts.forEach(contact => {
      if (contact.linked_opportunity_ids && contact.linked_opportunity_ids.length > 0) {
        contact.linked_opportunity_ids.forEach(id => converted.add(id));
      }
    });
    return converted;
  }, [clientContacts]);

  // Aplicar filtros
  const filteredOpportunities = React.useMemo(() => {
    return opportunities.filter(opp => {
      // Search
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch = 
          opp.buyer_name?.toLowerCase().includes(searchLower) ||
          opp.buyer_email?.toLowerCase().includes(searchLower) ||
          opp.buyer_phone?.toLowerCase().includes(searchLower) ||
          opp.location?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Status
      if (filters.status !== "all" && opp.status !== filters.status) return false;

      // Lead Type
      if (filters.lead_type !== "all" && opp.lead_type !== filters.lead_type) return false;

      // Qualification
      if (filters.qualification_status !== "all" && opp.qualification_status !== filters.qualification_status) return false;

      // Lead Source
      if (filters.lead_source !== "all" && opp.lead_source !== filters.lead_source) return false;

      // Assigned
      if (filters.assigned_to === "unassigned" && opp.assigned_to) return false;
      if (filters.assigned_to === "all_assigned" && !opp.assigned_to) return false;
      if (filters.assigned_to !== "all" && filters.assigned_to !== "unassigned" && filters.assigned_to !== "all_assigned" && opp.assigned_to !== filters.assigned_to) return false;

      // Priority
      if (filters.priority !== "all" && opp.priority !== filters.priority) return false;

      // Converted
      if (filters.converted !== "all") {
        const isConverted = convertedOpportunityIds.has(opp.id);
        if (filters.converted === "yes" && !isConverted) return false;
        if (filters.converted === "no" && isConverted) return false;
      }

      return true;
    });
  }, [opportunities, filters, convertedOpportunityIds]);

  // Derivar selectedLead dos dados atuais das oportunidades
  const selectedLead = React.useMemo(() => {
    if (!selectedLeadId) return null;
    return opportunities.find(o => o.id === selectedLeadId) || null;
  }, [selectedLeadId, opportunities]);

  const setSelectedLead = (lead) => {
    setSelectedLeadId(lead?.id || null);
  };

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Opportunity.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Opportunity.delete(id),
    onSuccess: async (_, deletedId) => {
      const deleted = opportunities.find(o => o.id === deletedId);
      await logAction('delete', 'Opportunity', deletedId, deleted?.buyer_name);
      
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      setSelectedLeadId(null);
    },
  });

  const onDragEnd = (result) => {
    const { destination, draggableId } = result;
    if (!destination) return;
    
    const newStatus = destination.droppableId;
    
    if (['new', 'contacted', 'visit_scheduled', 'proposal', 'negotiation', 'won', 'lost'].includes(newStatus)) {
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

  const handleAssign = async (lead, email) => {
        // Update opportunity
        updateMutation.mutate({
          id: lead.id,
          data: { assigned_to: email }
        });

        // Also update associated contact if exists
        if (lead.contact_id) {
          try {
            await base44.entities.ClientContact.update(lead.contact_id, { assigned_agent: email });
          } catch (e) {
            console.error('Error updating contact agent:', e);
          }
        } else if (lead.buyer_email) {
          // Try to find contact by email and update
          try {
            const contacts = await base44.entities.ClientContact.filter({ email: lead.buyer_email });
            if (contacts.length > 0) {
              await base44.entities.ClientContact.update(contacts[0].id, { assigned_agent: email });
            }
          } catch (e) {
            console.error('Error updating contact agent by email:', e);
          }
        }
      };

  const handleToggleRead = async (lead) => {
    const newIsRead = !lead.is_read;
    updateMutation.mutate({
      id: lead.id,
      data: { 
        is_read: newIsRead,
        read_at: newIsRead ? new Date().toISOString() : null,
        read_by: newIsRead ? user?.email : null
      }
    });
    toast.success(newIsRead ? "Lead marcada como lida" : "Lead marcada como não lida");
  };

  const bulkAssignMutation = useMutation({
        mutationFn: async ({ leadIds, agentEmail }) => {
          const leadsToUpdate = opportunities.filter(o => leadIds.includes(o.id));

          // Update opportunities
          await Promise.all(leadIds.map(id => 
            base44.entities.Opportunity.update(id, { assigned_to: agentEmail })
          ));

          // Update associated contacts
          for (const lead of leadsToUpdate) {
            try {
              if (lead.contact_id) {
                await base44.entities.ClientContact.update(lead.contact_id, { assigned_agent: agentEmail });
              } else if (lead.buyer_email) {
                const contacts = await base44.entities.ClientContact.filter({ email: lead.buyer_email });
                if (contacts.length > 0) {
                  await base44.entities.ClientContact.update(contacts[0].id, { assigned_agent: agentEmail });
                }
              }
            } catch (e) {
              console.error('Error updating contact agent:', e);
            }
          }
        },
        onSuccess: (_, { leadIds }) => {
          queryClient.invalidateQueries({ queryKey: ['opportunities'] });
          queryClient.invalidateQueries({ queryKey: ['clientContacts'] });
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
              variant={viewMode === "panel" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("panel")}
              className="rounded-none hidden sm:flex"
            >
              <PanelLeft className="w-4 h-4" />
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
                    <SelectValue placeholder="Selecionar agente...">
                      {bulkAssignAgent ? getAgentName(bulkAssignAgent) : "Selecionar agente..."}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.email}>
                        {u.display_name || u.full_name || u.email}
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

      {/* Quick Filters with Badges */}
      {viewMode !== "dashboard" && (
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Input
              value={filters.search}
              onChange={(e) => setFilters({...filters, search: e.target.value})}
              placeholder="Pesquisar por nome, email, telefone..."
              className="pl-3 h-10"
            />
          </div>
        </div>
      )}

      {viewMode !== "dashboard" && (
        <OpportunityQuickFilters
          opportunities={opportunities}
          filters={filters}
          onFilterChange={setFilters}
          convertedOpportunityIds={convertedOpportunityIds}
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
          onToggleRead={handleToggleRead}
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

      {viewMode === "panel" && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto pr-2">
            {filteredOpportunities.map((lead) => {
              const isConverted = convertedOpportunityIds.has(lead.id);
              const statusColors = {
                new: "bg-green-100 text-green-800 border-green-300",
                contacted: "bg-blue-100 text-blue-800 border-blue-300",
                visit_scheduled: "bg-purple-100 text-purple-800 border-purple-300",
                proposal: "bg-amber-100 text-amber-800 border-amber-300",
                negotiation: "bg-orange-100 text-orange-800 border-orange-300",
                won: "bg-emerald-100 text-emerald-800 border-emerald-300",
                lost: "bg-red-100 text-red-800 border-red-300"
              };
              const statusLabels = {
                new: "Novo",
                contacted: "Contactado",
                visit_scheduled: "Visita Agendada",
                proposal: "Proposta",
                negotiation: "Negociação",
                won: "Fechado ✓",
                lost: "Perdido"
              };
              const qualificationColors = {
                hot: "bg-red-50 text-red-700 border-red-300",
                warm: "bg-orange-50 text-orange-700 border-orange-300",
                cold: "bg-blue-50 text-blue-700 border-blue-300",
                unqualified: "bg-slate-50 text-slate-600 border-slate-300"
              };
              
              const associatedProperty = lead.property_id ? properties.find(p => p.id === lead.property_id) : null;
              const daysSinceCreated = Math.floor((Date.now() - new Date(lead.created_date)) / (1000 * 60 * 60 * 24));
              const daysSinceUpdated = Math.floor((Date.now() - new Date(lead.updated_date)) / (1000 * 60 * 60 * 24));
              
              return (
                <Card 
                  key={lead.id} 
                  className={`cursor-pointer transition-all hover:shadow-lg border-2 ${
                    selectedLead?.id === lead.id 
                      ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-white shadow-md' 
                      : 'border-slate-200 hover:border-slate-300'
                  } ${!lead.is_read ? 'bg-yellow-50/30' : ''}`}
                  onClick={() => setSelectedLead(lead)}
                >
                  <CardContent className="p-4">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <h3 className="font-bold text-base text-slate-900 line-clamp-1 flex-1">
                            {lead.buyer_name}
                          </h3>
                          <div className="flex gap-1 flex-shrink-0">
                            {!lead.is_read && (
                              <div className="w-2 h-2 bg-blue-600 rounded-full" title="Não lido" />
                            )}
                            {lead.qualification_status === 'hot' && <span className="text-lg" title="Hot Lead">🔥</span>}
                            {lead.priority === 'urgent' && <span className="text-lg" title="Urgente">🚨</span>}
                            {lead.priority === 'high' && <span className="text-lg" title="Prioridade Alta">⭐</span>}
                          </div>
                        </div>
                        <p className="text-xs text-slate-600 line-clamp-1 mb-1 flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {lead.buyer_email}
                        </p>
                        {lead.buyer_phone && (
                          <p className="text-xs text-slate-600 flex items-center gap-1 mb-2">
                            <Phone className="w-3 h-3" />
                            {lead.buyer_phone}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {/* Badges Row */}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      <Badge className={statusColors[lead.status] || "bg-slate-100 text-slate-800"}>
                        {statusLabels[lead.status] || lead.status}
                      </Badge>
                      <Badge variant="outline" className="text-xs border-slate-300">
                        {lead.lead_type === 'comprador' ? '🏠 Comprador' : 
                         lead.lead_type === 'vendedor' ? '💰 Vendedor' : 
                         lead.lead_type === 'parceiro_comprador' ? '🤝 Parceiro (C)' : '🤝 Parceiro (V)'}
                      </Badge>
                      {lead.qualification_status && (
                        <Badge className={qualificationColors[lead.qualification_status]}>
                          {lead.qualification_status === 'hot' ? '🔥 Hot' :
                           lead.qualification_status === 'warm' ? '🌡️ Warm' :
                           lead.qualification_status === 'cold' ? '❄️ Cold' : 'Não Qual.'}
                        </Badge>
                      )}
                      {isConverted && (
                        <Badge className="bg-green-600 text-white border-0">
                          ✓ Convertido
                        </Badge>
                      )}
                    </div>
                    
                    {/* Qualification Score */}
                    {lead.qualification_score !== undefined && lead.qualification_score !== null && (
                      <div className="mb-3 bg-slate-50 rounded-lg p-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-slate-600">Score de Qualificação</span>
                          <span className="text-sm font-bold text-slate-900">{lead.qualification_score}/100</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all ${
                              lead.qualification_score >= 70 ? 'bg-green-500' :
                              lead.qualification_score >= 40 ? 'bg-amber-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${lead.qualification_score}%` }}
                          />
                        </div>
                      </div>
                    )}
                    
                    {/* Associated Property */}
                    {associatedProperty && (
                      <div className="mb-3 bg-blue-50 border border-blue-200 rounded-lg p-2.5">
                        <p className="text-xs font-medium text-blue-900 mb-1 flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          Imóvel Associado
                        </p>
                        <p className="text-xs text-blue-800 font-semibold line-clamp-1">
                          {associatedProperty.title}
                        </p>
                        <p className="text-xs text-blue-700 mt-0.5">
                          €{associatedProperty.price?.toLocaleString()}
                        </p>
                      </div>
                    )}
                    
                    {/* Budget/Value Info */}
                    {(lead.budget > 0 || lead.estimated_value > 0) && (
                      <div className="flex items-center gap-2 mb-3">
                        {lead.budget > 0 && (
                          <div className="flex-1 bg-slate-50 rounded-lg p-2">
                            <p className="text-xs text-slate-500">Orçamento</p>
                            <p className="font-bold text-sm text-green-700">€{lead.budget.toLocaleString()}</p>
                          </div>
                        )}
                        {lead.estimated_value > 0 && (
                          <div className="flex-1 bg-slate-50 rounded-lg p-2">
                            <p className="text-xs text-slate-500">Valor Est.</p>
                            <p className="font-bold text-sm text-green-700">€{lead.estimated_value.toLocaleString()}</p>
                            {lead.probability > 0 && (
                              <p className="text-xs text-slate-600">{lead.probability}% prob.</p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Location & Source */}
                    <div className="space-y-1.5 mb-3 text-xs">
                      {lead.location && (
                        <p className="text-slate-600 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-medium">{lead.location}</span>
                        </p>
                      )}
                      {lead.lead_source && (
                        <p className="text-slate-500 flex items-center gap-1.5">
                          <span>📊</span>
                          {lead.lead_source === 'facebook_ads' ? 'Facebook Ads' :
                           lead.lead_source === 'website' ? 'Website' :
                           lead.lead_source === 'referral' ? 'Referência' :
                           lead.lead_source === 'real_estate_portal' ? 'Portal Imobiliário' :
                           lead.lead_source === 'networking' ? 'Networking' : lead.lead_source}
                        </p>
                      )}
                    </div>
                    
                    {/* Timeline */}
                    <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-xs">
                      <div className="flex flex-col gap-1">
                        <span className="text-slate-500">
                          Criado há {daysSinceCreated === 0 ? 'hoje' : `${daysSinceCreated}d`}
                        </span>
                        {daysSinceUpdated > 0 && daysSinceUpdated !== daysSinceCreated && (
                          <span className="text-slate-400">
                            Atualizado há {daysSinceUpdated === 0 ? 'hoje' : `${daysSinceUpdated}d`}
                          </span>
                        )}
                      </div>
                      {lead.next_followup_date && (
                        <div className="text-right">
                          <p className="text-amber-600 font-medium">
                            📅 Follow-up
                          </p>
                          <p className="text-slate-500">
                            {new Date(lead.next_followup_date).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' })}
                          </p>
                        </div>
                      )}
                    </div>
                    
                    {/* Assigned Agent */}
                    {lead.assigned_to && (
                      <div className="mt-2 pt-2 border-t border-slate-100">
                        <p className="text-xs text-slate-600 flex items-center gap-1.5 font-medium">
                          <User className="w-3.5 h-3.5 text-blue-600" />
                          {getAgentName(lead.assigned_to)}
                        </p>
                      </div>
                    )}
                    
                    {/* Message Preview */}
                    {lead.message && (
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <p className="text-xs text-slate-600 line-clamp-2 italic">
                          "{lead.message}"
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <div className="lg:col-span-2">
            {selectedLead ? (
              <LeadDetailPanel
                lead={selectedLead}
                onClose={() => setSelectedLead(null)}
                onUpdate={(id, data) => updateMutation.mutate({ id, data })}
                properties={properties}
                onEdit={() => handleEditOpportunity(selectedLead)}
                embedded={true}
              />
            ) : (
              <Card className="h-96">
                <CardContent className="flex items-center justify-center h-full">
                  <div className="text-center text-slate-400">
                    <PanelLeft className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-sm">Selecione uma oportunidade à esquerda</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
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

      {/* Lead Detail Panel - only show when NOT in panel view mode */}
      {selectedLead && viewMode !== "panel" && (
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