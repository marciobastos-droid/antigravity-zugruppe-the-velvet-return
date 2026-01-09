import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectSeparator } from "@/components/ui/select";
import { X, Star, Target, UserCheck, TrendingUp, ChevronDown, ChevronUp, Flame, Thermometer, Snowflake, AlertCircle, Users, Globe, User, GripVertical } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

export default function OpportunityQuickFilters({ 
  opportunities, 
  filters, 
  onFilterChange,
  convertedOpportunityIds = new Set()
}) {
  const [expanded, setExpanded] = React.useState(false);
  
  // Estado para ordem das badges
  const [badgeGroups, setBadgeGroups] = React.useState([
    { id: 'main', title: 'PRINCIPAIS', badges: ['new', 'contacted', 'visit_scheduled', 'proposal', 'won', 'hot', 'comprador', 'converted'] },
    { id: 'estados', title: 'ESTADOS', badges: ['negotiation', 'lost'] },
    { id: 'qualificacao', title: 'QUALIFICAÇÃO', badges: ['warm', 'cold', 'unqualified'] },
    { id: 'tipo', title: 'TIPO DE LEAD', badges: ['vendedor', 'parceiro'] },
    { id: 'origem', title: 'ORIGEM', badges: ['website', 'facebook', 'portals'] },
    { id: 'outros', title: 'OUTROS', badges: ['unassigned', 'notConverted'] }
  ]);

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    
    const { source, destination } = result;
    
    // Mover dentro do mesmo grupo
    if (source.droppableId === destination.droppableId) {
      const groupIndex = badgeGroups.findIndex(g => g.id === source.droppableId);
      const newGroups = [...badgeGroups];
      const items = Array.from(newGroups[groupIndex].badges);
      const [removed] = items.splice(source.index, 1);
      items.splice(destination.index, 0, removed);
      newGroups[groupIndex] = { ...newGroups[groupIndex], badges: items };
      setBadgeGroups(newGroups);
    } else {
      // Mover entre grupos
      const sourceGroupIndex = badgeGroups.findIndex(g => g.id === source.droppableId);
      const destGroupIndex = badgeGroups.findIndex(g => g.id === destination.droppableId);
      const newGroups = [...badgeGroups];
      
      const sourceItems = Array.from(newGroups[sourceGroupIndex].badges);
      const [removed] = sourceItems.splice(source.index, 1);
      newGroups[sourceGroupIndex] = { ...newGroups[sourceGroupIndex], badges: sourceItems };
      
      const destItems = Array.from(newGroups[destGroupIndex].badges);
      destItems.splice(destination.index, 0, removed);
      newGroups[destGroupIndex] = { ...newGroups[destGroupIndex], badges: destItems };
      
      setBadgeGroups(newGroups);
    }
  };

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });
  
  // Calcular estatísticas
  const stats = React.useMemo(() => {
    const counts = {
      // Estados
      new: opportunities.filter(o => o.status === 'new').length,
      contacted: opportunities.filter(o => o.status === 'contacted').length,
      visit_scheduled: opportunities.filter(o => o.status === 'visit_scheduled').length,
      proposal: opportunities.filter(o => o.status === 'proposal').length,
      negotiation: opportunities.filter(o => o.status === 'negotiation').length,
      won: opportunities.filter(o => o.status === 'won').length,
      lost: opportunities.filter(o => o.status === 'lost').length,
      
      // Tipo de lead
      comprador: opportunities.filter(o => o.lead_type === 'comprador').length,
      vendedor: opportunities.filter(o => o.lead_type === 'vendedor').length,
      parceiro: opportunities.filter(o => o.lead_type?.includes('parceiro')).length,
      
      // Qualificação
      hot: opportunities.filter(o => o.qualification_status === 'hot').length,
      warm: opportunities.filter(o => o.qualification_status === 'warm').length,
      cold: opportunities.filter(o => o.qualification_status === 'cold').length,
      unqualified: opportunities.filter(o => !o.qualification_status || o.qualification_status === 'unqualified').length,
      
      // Prioridade
      urgent: opportunities.filter(o => o.priority === 'urgent').length,
      high: opportunities.filter(o => o.priority === 'high').length,
      
      // Origem
      website: opportunities.filter(o => o.lead_source === 'website').length,
      facebook: opportunities.filter(o => o.lead_source === 'facebook_ads').length,
      referral: opportunities.filter(o => o.lead_source === 'referral').length,
      portal: opportunities.filter(o => o.lead_source === 'real_estate_portal').length,
      
      // Atribuição
      unassigned: opportunities.filter(o => !o.assigned_to).length,
      assigned: opportunities.filter(o => o.assigned_to).length,
      
      // Por consultor
      byConsultant: {},
      
      // Conversão
      converted: opportunities.filter(o => convertedOpportunityIds.has(o.id)).length,
      notConverted: opportunities.filter(o => !convertedOpportunityIds.has(o.id)).length
    };

    // Contar por consultor
    const consultantCounts = {};
    opportunities.forEach(o => {
      if (o.assigned_to) {
        consultantCounts[o.assigned_to] = (consultantCounts[o.assigned_to] || 0) + 1;
      }
    });
    counts.byConsultant = consultantCounts;

    return counts;
  }, [opportunities, convertedOpportunityIds]);

  const toggleFilter = React.useCallback((filterKey, value) => {
    if (!onFilterChange) return;
    
    const currentValue = filters[filterKey];
    
    // Para filtros booleanos ou especiais
    if (filterKey === "converted") {
      onFilterChange({ ...filters, [filterKey]: currentValue === value ? "all" : value });
      return;
    }
    
    // Para filtros de select
    if (currentValue === value) {
      onFilterChange({ ...filters, [filterKey]: "all" });
    } else {
      onFilterChange({ ...filters, [filterKey]: value });
    }
  }, [filters, onFilterChange]);

  const isActive = React.useCallback((filterKey, value) => {
    return filters[filterKey] === value;
  }, [filters]);

  const getBadgeConfig = (badgeId) => {
    const configs = {
      new: { filterKey: "status", value: "new", label: "Novos", count: stats.new, color: "green" },
      contacted: { filterKey: "status", value: "contacted", label: "Contactados", count: stats.contacted, color: "blue" },
      visit_scheduled: { filterKey: "status", value: "visit_scheduled", label: "Visita Agendada", count: stats.visit_scheduled, color: "purple" },
      proposal: { filterKey: "status", value: "proposal", label: "Proposta", count: stats.proposal, color: "amber" },
      won: { filterKey: "status", value: "won", label: "Fechados", count: stats.won, color: "emerald", icon: Target },
      hot: { filterKey: "qualification_status", value: "hot", label: "🔥 Hot", count: stats.hot, color: "red" },
      comprador: { filterKey: "lead_type", value: "comprador", label: "Compradores", count: stats.comprador, color: "blue" },
      converted: { filterKey: "converted", value: "yes", label: "✓ Convertidos", count: stats.converted, color: "emerald" },
      negotiation: { filterKey: "status", value: "negotiation", label: "Negociação", count: stats.negotiation, color: "orange" },
      lost: { filterKey: "status", value: "lost", label: "Perdidos", count: stats.lost, color: "red" },
      warm: { filterKey: "qualification_status", value: "warm", label: "🌡️ Warm", count: stats.warm, color: "orange" },
      cold: { filterKey: "qualification_status", value: "cold", label: "❄️ Cold", count: stats.cold, color: "cyan" },
      unqualified: { filterKey: "qualification_status", value: "unqualified", label: "Não Qualificados", count: stats.unqualified, color: "slate" },
      vendedor: { filterKey: "lead_type", value: "vendedor", label: "Vendedores", count: stats.vendedor, color: "purple" },
      parceiro: { filterKey: "lead_type", value: "parceiro_comprador", label: "Parceiros", count: stats.parceiro, color: "indigo", icon: Users },
      website: { filterKey: "lead_source", value: "website", label: "Website", count: stats.website, color: "blue", icon: Globe },
      facebook: { filterKey: "lead_source", value: "facebook_ads", label: "Facebook Ads", count: stats.facebook, color: "indigo" },
      portals: { filterKey: "lead_source", value: "real_estate_portal", label: "Portais", count: stats.portal, color: "cyan" },
      unassigned: { filterKey: "assigned_to", value: "unassigned", label: "Sem Agente", count: stats.unassigned, color: "slate", icon: AlertCircle },
      notConverted: { filterKey: "converted", value: "no", label: "Não Convertidos", count: stats.notConverted, color: "slate" }
    };
    return configs[badgeId];
  };

  const FilterBadge = ({ config, isDragging }) => {
    if (!config || config.count === 0) return null;
    
    const active = isActive(config.filterKey, config.value);
    const colorClasses = {
      green: active ? "bg-green-600 text-white border-green-600" : "bg-green-50 text-green-700 border-green-300 hover:bg-green-100",
      blue: active ? "bg-blue-600 text-white border-blue-600" : "bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100",
      purple: active ? "bg-purple-600 text-white border-purple-600" : "bg-purple-50 text-purple-700 border-purple-300 hover:bg-purple-100",
      amber: active ? "bg-amber-600 text-white border-amber-600" : "bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100",
      red: active ? "bg-red-600 text-white border-red-600" : "bg-red-50 text-red-700 border-red-300 hover:bg-red-100",
      orange: active ? "bg-orange-600 text-white border-orange-600" : "bg-orange-50 text-orange-700 border-orange-300 hover:bg-orange-100",
      slate: active ? "bg-slate-600 text-white border-slate-600" : "bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100",
      emerald: active ? "bg-emerald-600 text-white border-emerald-600" : "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100",
      cyan: active ? "bg-cyan-600 text-white border-cyan-600" : "bg-cyan-50 text-cyan-700 border-cyan-300 hover:bg-cyan-100",
      indigo: active ? "bg-indigo-600 text-white border-indigo-600" : "bg-indigo-50 text-indigo-700 border-indigo-300 hover:bg-indigo-100"
    };

    return (
      <Badge
        onClick={() => toggleFilter(config.filterKey, config.value)}
        className={`cursor-pointer transition-all border ${colorClasses[config.color]} flex items-center gap-1 px-2 py-0.5 text-xs ${isDragging ? 'shadow-lg opacity-80' : ''}`}
      >
        {config.icon && <config.icon className="w-3 h-3" />}
        <span className="font-medium">{config.label}</span>
        <span className={active ? "opacity-90" : "opacity-60"}>({config.count})</span>
        {active && <X className="w-2.5 h-2.5 ml-0.5" />}
      </Badge>
    );
  };

  return (
    <div className="mb-3">
      <div className="bg-white border border-slate-200 rounded-lg p-3">
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {badgeGroups.map((group, groupIndex) => (
              <Droppable key={group.id} droppableId={group.id} direction="horizontal">
                {(provided, snapshot) => (
                  <div 
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`${groupIndex % 2 !== 0 ? 'md:border-l md:pl-2' : ''} ${groupIndex >= 2 ? 'pt-2 border-t border-slate-100' : ''} ${
                      snapshot.isDraggingOver ? 'bg-blue-50 rounded-lg p-1.5' : ''
                    }`}
                  >
                    <p className="text-[10px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wide flex items-center gap-1.5">
                      <GripVertical className="w-2.5 h-2.5 text-slate-400" />
                      {group.title}
                    </p>
                    <div className="flex flex-wrap gap-1.5 min-h-[28px]">
                      {group.badges.map((badgeId, index) => {
                        const config = getBadgeConfig(badgeId);
                        if (!config || config.count === 0) return null;
                        
                        return (
                          <Draggable key={badgeId} draggableId={badgeId} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                              >
                                <FilterBadge config={config} isDragging={snapshot.isDragging} />
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  </div>
                )}
              </Droppable>
            ))}
          </div>
        </DragDropContext>

        {/* Filtro por Consultor Ativo */}
        {filters.assigned_to !== "all" && filters.assigned_to !== "unassigned" && filters.assigned_to !== "all_assigned" && (
          <div className="mt-2 pt-2 border-t border-slate-100">
            <Badge
              onClick={() => onFilterChange({...filters, assigned_to: "all"})}
              className="cursor-pointer transition-all border bg-indigo-600 text-white border-indigo-600 flex items-center gap-1 px-2.5 py-1 text-xs"
            >
              <User className="w-3 h-3" />
              <span className="font-medium">
                {users.find(u => u.email === filters.assigned_to)?.display_name || 
                 users.find(u => u.email === filters.assigned_to)?.full_name || 
                 filters.assigned_to.split('@')[0]}
              </span>
              <span className="opacity-90">({stats.byConsultant[filters.assigned_to] || 0})</span>
              <X className="w-2.5 h-2.5 ml-0.5" />
            </Badge>
          </div>
        )}

        {/* Botão Expandir */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded(!expanded)}
          className="w-full text-xs text-slate-600 hover:text-slate-900 h-6 mt-1.5"
        >
          {expanded ? (
            <>
              <ChevronUp className="w-3 h-3 mr-1" />
              Menos filtros
            </>
          ) : (
            <>
              <ChevronDown className="w-3 h-3 mr-1" />
              Mais filtros (consultores)
            </>
          )}
        </Button>

        {/* Filtros Adicionais - Colapsáveis */}
        {expanded && (
          <div className="mt-2 pt-2 border-t border-slate-200">
            <p className="text-[10px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">CONSULTOR</p>
            <div className="flex flex-wrap gap-1.5">
              {users
                .filter(u => stats.byConsultant[u.email] > 0)
                .sort((a, b) => (stats.byConsultant[b.email] || 0) - (stats.byConsultant[a.email] || 0))
                .map((u) => (
                  <Badge
                    key={u.email}
                    onClick={() => toggleFilter("assigned_to", u.email)}
                    className={`cursor-pointer transition-all border flex items-center gap-1 px-2 py-0.5 text-xs ${
                      isActive("assigned_to", u.email)
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-indigo-50 text-indigo-700 border-indigo-300 hover:bg-indigo-100"
                    }`}
                  >
                    <User className="w-3 h-3" />
                    <span className="font-medium">{u.display_name || u.full_name || u.email.split('@')[0]}</span>
                    <span className={isActive("assigned_to", u.email) ? "opacity-90" : "opacity-60"}>
                      ({stats.byConsultant[u.email]})
                    </span>
                    {isActive("assigned_to", u.email) && <X className="w-2.5 h-2.5 ml-0.5" />}
                  </Badge>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}