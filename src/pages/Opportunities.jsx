import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LayoutGrid, List, Table as TableIcon, TrendingUp, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import LeadsTable from "../components/crm/LeadsTable";
import LeadDetailPanel from "../components/crm/LeadDetailPanel";
import PipelineView from "../components/crm/PipelineView";
import OpportunitiesDashboard from "../components/opportunities/OpportunitiesDashboard";

export default function Opportunities() {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = React.useState("table");
  const [selectedLead, setSelectedLead] = React.useState(null);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("new");
  const [leadTypeFilter, setLeadTypeFilter] = React.useState("all");
  const [qualificationFilter, setQualificationFilter] = React.useState("all");
  const [sourceFilter, setSourceFilter] = React.useState("all");
  const [agentFilter, setAgentFilter] = React.useState("all");
  const [selectedLeads, setSelectedLeads] = React.useState([]);
  const [bulkAssignAgent, setBulkAssignAgent] = React.useState("");

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: opportunities = [], isLoading } = useQuery({
    queryKey: ['opportunities', user?.email],
    queryFn: async () => {
      if (!user) return [];
      const allOpportunities = await base44.entities.Opportunity.list('-updated_date');
      
      if (user.role === 'admin' || user.user_type === 'admin' || user.user_type === 'gestor') {
        return allOpportunities;
      }
      
      return allOpportunities.filter(i => 
        i.seller_email === user.email || i.assigned_to === user.email
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
      return allUsers.filter(u => u.role === 'admin' || u.user_type === 'admin' || u.user_type === 'gestor' || u.user_type === 'agente');
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['buyerProfiles'],
    queryFn: () => base44.entities.BuyerProfile.list(),
  });

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
    if (['new', 'contacted', 'scheduled', 'closed'].includes(newStatus)) {
      updateMutation.mutate({
        id: draggableId,
        data: { status: newStatus }
      });
    }
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

  const handleAssign = (lead, userId) => {
    const user = users.find(u => u.id === userId);
    updateMutation.mutate({
      id: lead.id,
      data: { assigned_to: user?.email }
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

  const handleBulkAssign = () => {
    if (!bulkAssignAgent || selectedLeads.length === 0) {
      toast.error("Selecione um agente e pelo menos um lead");
      return;
    }
    const agent = users.find(u => u.id === bulkAssignAgent);
    bulkAssignMutation.mutate({ 
      leadIds: selectedLeads, 
      agentEmail: agent?.email 
    });
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

  const filteredOpportunities = opportunities.filter(opp => {
    const matchesSearch = searchTerm === "" || 
      opp.buyer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      opp.buyer_email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || opp.status === statusFilter;
    const matchesLeadType = leadTypeFilter === "all" || opp.lead_type === leadTypeFilter;
    const matchesQualification = qualificationFilter === "all" || opp.qualification_status === qualificationFilter;
    const matchesAgent = agentFilter === "all" || opp.assigned_to === agentFilter;
    
    // Source filter (origem)
    let matchesSource = true;
    if (sourceFilter !== "all") {
      if (sourceFilter === "facebook") {
        matchesSource = opp.source_url?.includes('facebook') || opp.message?.includes('Facebook');
      } else if (sourceFilter === "website") {
        matchesSource = !opp.source_url || opp.source_url === 'website';
      } else if (sourceFilter === "manual") {
        matchesSource = opp.source_url === 'manual' || !opp.source_url;
      }
    }
    
    return matchesSearch && matchesStatus && matchesLeadType && matchesQualification && matchesSource && matchesAgent;
  });

  const stats = React.useMemo(() => {
    return {
      total: opportunities.length,
      new: opportunities.filter(o => o.status === 'new').length,
      hot: opportunities.filter(o => o.qualification_status === 'hot').length,
      facebook: opportunities.filter(o => o.source_url?.includes('facebook')).length
    };
  }, [opportunities]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">CRM - Leads & Pipeline</h1>
            <p className="text-slate-600">Gerir leads e pipeline de vendas</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={viewMode === "dashboard" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("dashboard")}
            >
              <TrendingUp className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "pipeline" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("pipeline")}
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "table" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("table")}
            >
              <TableIcon className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("list")}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Quick Stats - Only show when not in dashboard view */}
        {viewMode !== "dashboard" && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-blue-900">{stats.total}</div>
                <div className="text-xs text-blue-700">Total Leads</div>
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
                <div className="text-xs text-red-700">🔥 Hot Leads</div>
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
          <Card className="mb-6 border-blue-500 bg-blue-50">
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
                        <SelectItem key={u.id} value={u.id}>
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
                  <Button variant="outline" onClick={() => setSelectedLeads([])}>
                    Cancelar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters - Hide in dashboard view */}
        {viewMode !== "dashboard" && (
          <Card className="mb-6">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-3">
              <div className="md:col-span-2">
                <label className="text-xs font-medium text-slate-600 mb-1.5 block">Pesquisar</label>
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Nome ou email..."
                />
              </div>
              
              {viewMode === "table" && (
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1.5 block">Estado</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="new">Novos</SelectItem>
                      <SelectItem value="contacted">Contactados</SelectItem>
                      <SelectItem value="scheduled">Agendados</SelectItem>
                      <SelectItem value="closed">Fechados</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-slate-600 mb-1.5 block">Tipo</label>
                <Select value={leadTypeFilter} onValueChange={setLeadTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="comprador">Comprador</SelectItem>
                    <SelectItem value="vendedor">Vendedor</SelectItem>
                    <SelectItem value="parceiro_comprador">Parceiro Comprador</SelectItem>
                    <SelectItem value="parceiro_vendedor">Parceiro Vendedor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 mb-1.5 block">Qualificação</label>
                <Select value={qualificationFilter} onValueChange={setQualificationFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Qualificação" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="hot">🔥 Hot</SelectItem>
                    <SelectItem value="warm">🌡️ Warm</SelectItem>
                    <SelectItem value="cold">❄️ Cold</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 mb-1.5 block">Origem</label>
                <Select value={sourceFilter} onValueChange={setSourceFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Origem" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="facebook">Facebook</SelectItem>
                    <SelectItem value="website">Website</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 mb-1.5 block">Agente</label>
                <Select value={agentFilter} onValueChange={setAgentFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Agente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.email}>
                        {u.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
        )}

        {/* Content */}
        {viewMode === "dashboard" && (
          <OpportunitiesDashboard opportunities={opportunities} />
        )}

        {viewMode === "pipeline" && (
          <PipelineView 
            leads={filteredOpportunities}
            onDragEnd={onDragEnd}
            onLeadClick={setSelectedLead}
          />
        )}

        {viewMode === "table" && (
          <LeadsTable 
            leads={filteredOpportunities}
            onLeadClick={setSelectedLead}
            onToggleImportant={handleToggleImportant}
            onDelete={handleDelete}
            onAssign={handleAssign}
            users={users}
            profiles={profiles}
            selectedLeads={selectedLeads}
            onToggleSelect={toggleSelectLead}
            onToggleSelectAll={toggleSelectAll}
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
          />
        )}
      </div>
    </div>
  );
}