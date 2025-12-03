import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Phone, Mail, MapPin, Building2, Star, Clock, User, Euro,
  Search, Filter, ChevronDown, AlertCircle, Calendar, MessageSquare,
  Flame, Thermometer, Snowflake, X, Users
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import { toast } from "sonner";
import LeadQuickView from "./LeadQuickView";

const PIPELINE_STAGES = [
  { id: "new", label: "Novos", color: "bg-blue-500", textColor: "text-blue-700", bgLight: "bg-blue-50" },
  { id: "contacted", label: "Contactados", color: "bg-yellow-500", textColor: "text-yellow-700", bgLight: "bg-yellow-50" },
  { id: "visit_scheduled", label: "Visita Agendada", color: "bg-purple-500", textColor: "text-purple-700", bgLight: "bg-purple-50" },
  { id: "proposal", label: "Proposta", color: "bg-orange-500", textColor: "text-orange-700", bgLight: "bg-orange-50" },
  { id: "negotiation", label: "Negociação", color: "bg-indigo-500", textColor: "text-indigo-700", bgLight: "bg-indigo-50" },
  { id: "won", label: "Fechado ✓", color: "bg-green-500", textColor: "text-green-700", bgLight: "bg-green-50" },
  { id: "lost", label: "Perdido", color: "bg-red-500", textColor: "text-red-700", bgLight: "bg-red-50" }
];

const PRIORITY_CONFIG = {
  urgent: { label: "Urgente", color: "bg-red-100 text-red-800 border-red-300", icon: AlertCircle },
  high: { label: "Alta", color: "bg-orange-100 text-orange-800 border-orange-300", icon: Star },
  medium: { label: "Média", color: "bg-yellow-100 text-yellow-800 border-yellow-300", icon: null },
  low: { label: "Baixa", color: "bg-slate-100 text-slate-800 border-slate-300", icon: null }
};

const QUALIFICATION_ICONS = {
  hot: { icon: Flame, color: "text-red-500", label: "Quente" },
  warm: { icon: Thermometer, color: "text-orange-500", label: "Morno" },
  cold: { icon: Snowflake, color: "text-blue-500", label: "Frio" }
};

export default function LeadsPipeline({ leads, onLeadClick }) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [agentFilter, setAgentFilter] = useState("all");
  const [selectedLead, setSelectedLead] = useState(null);
  const [collapsedStages, setCollapsedStages] = useState({});

  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: () => base44.entities.Agent.list('full_name')
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const updateLeadMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Opportunity.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
    }
  });

  // Filter leads
  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matches = 
          lead.buyer_name?.toLowerCase().includes(search) ||
          lead.buyer_email?.toLowerCase().includes(search) ||
          lead.buyer_phone?.includes(search) ||
          lead.property_title?.toLowerCase().includes(search) ||
          lead.location?.toLowerCase().includes(search);
        if (!matches) return false;
      }
      
      if (priorityFilter !== "all" && lead.priority !== priorityFilter) return false;
      if (agentFilter !== "all" && lead.assigned_agent_id !== agentFilter && lead.assigned_to !== agentFilter) return false;
      
      return true;
    });
  }, [leads, searchTerm, priorityFilter, agentFilter]);

  // Group leads by stage
  const leadsByStage = useMemo(() => {
    const grouped = {};
    PIPELINE_STAGES.forEach(stage => {
      grouped[stage.id] = filteredLeads.filter(lead => lead.status === stage.id);
    });
    return grouped;
  }, [filteredLeads]);

  // Calculate stage totals
  const stageTotals = useMemo(() => {
    const totals = {};
    PIPELINE_STAGES.forEach(stage => {
      const stageLeads = leadsByStage[stage.id] || [];
      totals[stage.id] = {
        count: stageLeads.length,
        value: stageLeads.reduce((sum, lead) => sum + (lead.estimated_value || lead.budget || 0), 0)
      };
    });
    return totals;
  }, [leadsByStage]);

  const handleDragEnd = async (result) => {
    const { destination, source, draggableId } = result;
    
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newStatus = destination.droppableId;
    const lead = leads.find(l => l.id === draggableId);
    
    if (!lead) return;

    // Optimistic update
    queryClient.setQueryData(['opportunities'], (old) => {
      if (!old) return old;
      return old.map(l => l.id === draggableId ? { ...l, status: newStatus } : l);
    });

    try {
      await updateLeadMutation.mutateAsync({
        id: draggableId,
        data: { 
          status: newStatus,
          last_contact_date: new Date().toISOString()
        }
      });
      
      const stageLabel = PIPELINE_STAGES.find(s => s.id === newStatus)?.label;
      toast.success(`Lead movido para "${stageLabel}"`);
    } catch (error) {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      toast.error("Erro ao mover lead");
    }
  };

  const toggleStageCollapse = (stageId) => {
    setCollapsedStages(prev => ({ ...prev, [stageId]: !prev[stageId] }));
  };

  const handleLeadClick = (lead) => {
    setSelectedLead(lead);
    if (onLeadClick) onLeadClick(lead);
  };

  const getLeadAge = (lead) => {
    if (!lead.created_date) return null;
    return formatDistanceToNow(new Date(lead.created_date), { locale: pt, addSuffix: true });
  };

  const getNextFollowup = (lead) => {
    if (!lead.next_followup_date) return null;
    const date = new Date(lead.next_followup_date);
    const now = new Date();
    const isOverdue = date < now;
    return { date, isOverdue };
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Pesquisar leads..."
                className="pl-10"
              />
            </div>
            
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Prioridade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="urgent">Urgente</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="medium">Média</SelectItem>
                <SelectItem value="low">Baixa</SelectItem>
              </SelectContent>
            </Select>

            <Select value={agentFilter} onValueChange={setAgentFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Agente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Agentes</SelectItem>
                {agents.map(agent => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {(searchTerm || priorityFilter !== "all" || agentFilter !== "all") && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  setSearchTerm("");
                  setPriorityFilter("all");
                  setAgentFilter("all");
                }}
              >
                <X className="w-4 h-4 mr-1" />
                Limpar
              </Button>
            )}

            <div className="text-sm text-slate-500 ml-auto">
              {filteredLeads.length} lead{filteredLeads.length !== 1 ? 's' : ''}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pipeline Kanban */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: '600px' }}>
          {PIPELINE_STAGES.map((stage) => {
            const stageLeads = leadsByStage[stage.id] || [];
            const totals = stageTotals[stage.id];
            const isCollapsed = collapsedStages[stage.id];

            return (
              <div 
                key={stage.id} 
                className={`flex-shrink-0 flex flex-col ${isCollapsed ? 'w-12' : 'w-72'} transition-all duration-200`}
              >
                {/* Stage Header */}
                <div 
                  className={`${stage.color} text-white rounded-t-lg p-3 cursor-pointer`}
                  onClick={() => toggleStageCollapse(stage.id)}
                >
                  {isCollapsed ? (
                    <div className="flex flex-col items-center gap-2">
                      <Badge variant="secondary" className="bg-white/20 text-white">
                        {totals.count}
                      </Badge>
                      <span className="text-xs font-medium writing-mode-vertical" style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>
                        {stage.label}
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-sm">{stage.label}</h3>
                        <Badge variant="secondary" className="bg-white/20 text-white">
                          {totals.count}
                        </Badge>
                      </div>
                      {totals.value > 0 && (
                        <p className="text-xs text-white/80 mt-1">
                          €{totals.value.toLocaleString()}
                        </p>
                      )}
                    </>
                  )}
                </div>

                {/* Stage Content */}
                {!isCollapsed && (
                  <Droppable droppableId={stage.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex-1 p-2 space-y-2 ${stage.bgLight} rounded-b-lg min-h-[500px] ${
                          snapshot.isDraggingOver ? 'ring-2 ring-slate-400' : ''
                        }`}
                      >
                        {stageLeads.map((lead, index) => (
                          <LeadCard
                            key={lead.id}
                            lead={lead}
                            index={index}
                            onClick={() => handleLeadClick(lead)}
                            agents={agents}
                          />
                        ))}
                        {provided.placeholder}
                        
                        {stageLeads.length === 0 && (
                          <div className="text-center py-8 text-slate-400 text-sm">
                            Sem leads
                          </div>
                        )}
                      </div>
                    )}
                  </Droppable>
                )}
              </div>
            );
          })}
        </div>
      </DragDropContext>

      {/* Lead Quick View Modal */}
      {selectedLead && (
        <LeadQuickView
          lead={selectedLead}
          open={!!selectedLead}
          onOpenChange={(open) => !open && setSelectedLead(null)}
          agents={agents}
        />
      )}
    </div>
  );
}

function LeadCard({ lead, index, onClick, agents }) {
  const priorityConfig = PRIORITY_CONFIG[lead.priority] || PRIORITY_CONFIG.medium;
  const qualificationConfig = QUALIFICATION_ICONS[lead.qualification_status];
  const assignedAgent = agents.find(a => a.id === lead.assigned_agent_id);
  
  const nextFollowup = lead.next_followup_date ? new Date(lead.next_followup_date) : null;
  const isOverdue = nextFollowup && nextFollowup < new Date();

  return (
    <Draggable draggableId={lead.id} index={index}>
      {(provided, snapshot) => (
        <Card
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`cursor-pointer hover:shadow-md transition-all bg-white ${
            snapshot.isDragging ? 'shadow-xl rotate-2' : ''
          } ${isOverdue ? 'border-l-4 border-l-red-500' : ''}`}
          onClick={onClick}
        >
          <CardContent className="p-3">
            {/* Header */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm text-slate-900 truncate">
                  {lead.buyer_name}
                </h4>
                {lead.ref_id && (
                  <span className="text-xs text-slate-400 font-mono">{lead.ref_id}</span>
                )}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {qualificationConfig && (
                  <qualificationConfig.icon className={`w-4 h-4 ${qualificationConfig.color}`} />
                )}
                {(lead.priority === 'high' || lead.priority === 'urgent') && (
                  <Star className={`w-4 h-4 ${lead.priority === 'urgent' ? 'text-red-500 fill-red-500' : 'text-amber-500 fill-amber-500'}`} />
                )}
              </div>
            </div>

            {/* Contact Info */}
            <div className="space-y-1 text-xs text-slate-600 mb-2">
              {lead.buyer_email && (
                <div className="flex items-center gap-1.5 truncate">
                  <Mail className="w-3 h-3 flex-shrink-0 text-slate-400" />
                  <span className="truncate">{lead.buyer_email}</span>
                </div>
              )}
              {lead.buyer_phone && (
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3 h-3 flex-shrink-0 text-slate-400" />
                  {lead.buyer_phone}
                </div>
              )}
              {lead.location && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3 h-3 flex-shrink-0 text-slate-400" />
                  {lead.location}
                </div>
              )}
            </div>

            {/* Property */}
            {lead.property_title && (
              <div className="flex items-center gap-1.5 text-xs text-purple-600 mb-2 truncate">
                <Building2 className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{lead.property_title}</span>
              </div>
            )}

            {/* Tags Row */}
            <div className="flex flex-wrap gap-1 mb-2">
              <Badge variant="outline" className="text-xs py-0">
                {lead.lead_type === 'comprador' ? 'Comprador' :
                 lead.lead_type === 'vendedor' ? 'Vendedor' : 'Parceiro'}
              </Badge>
              {lead.budget && (
                <Badge variant="outline" className="text-xs py-0">
                  <Euro className="w-3 h-3 mr-0.5" />
                  {(lead.budget / 1000).toFixed(0)}k
                </Badge>
              )}
              {lead.segment && (
                <Badge variant="outline" className="text-xs py-0 bg-indigo-50 text-indigo-700">
                  {lead.segment}
                </Badge>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              {/* Agent */}
              {assignedAgent ? (
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <User className="w-3 h-3" />
                  <span className="truncate max-w-[80px]">{assignedAgent.full_name}</span>
                </div>
              ) : (
                <span className="text-xs text-slate-400">Sem agente</span>
              )}

              {/* Next Follow-up */}
              {nextFollowup && (
                <div className={`flex items-center gap-1 text-xs ${isOverdue ? 'text-red-600' : 'text-slate-500'}`}>
                  <Calendar className="w-3 h-3" />
                  {format(nextFollowup, 'dd/MM')}
                </div>
              )}
            </div>

            {/* Priority Badge */}
            {lead.priority && lead.priority !== 'medium' && (
              <Badge className={`absolute -top-1 -right-1 text-xs ${priorityConfig.color} border`}>
                {priorityConfig.label}
              </Badge>
            )}
          </CardContent>
        </Card>
      )}
    </Draggable>
  );
}