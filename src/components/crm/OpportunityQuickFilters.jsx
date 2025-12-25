import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectSeparator } from "@/components/ui/select";
import { X, Star, Target, UserCheck, TrendingUp, ChevronDown, ChevronUp, Flame, Thermometer, Snowflake, AlertCircle, Users, Globe, User } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function OpportunityQuickFilters({ 
  opportunities, 
  filters, 
  onFilterChange,
  convertedOpportunityIds = new Set()
}) {
  const [expanded, setExpanded] = React.useState(false);

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

  const toggleFilter = (filterKey, value) => {
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
  };

  const isActive = (filterKey, value) => {
    return filters[filterKey] === value;
  };

  const FilterBadge = ({ filterKey, value, label, count, icon: Icon, color = "slate" }) => {
    const active = isActive(filterKey, value);
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

    if (count === 0) return null;

    return (
      <Badge
        onClick={() => toggleFilter(filterKey, value)}
        className={`cursor-pointer transition-all border ${colorClasses[color]} flex items-center gap-1 px-2.5 py-1 text-xs`}
      >
        {Icon && <Icon className="w-3 h-3" />}
        <span className="font-medium">{label}</span>
        <span className={active ? "opacity-90" : "opacity-60"}>({count})</span>
        {active && <X className="w-2.5 h-2.5 ml-0.5" />}
      </Badge>
    );
  };

  return (
    <div className="mb-4">
      <div className="bg-white border border-slate-200 rounded-lg p-3">
        {/* Filtros Principais - Sempre Visíveis */}
        <div className="flex flex-wrap gap-2 mb-2">
          <FilterBadge filterKey="status" value="new" label="Novos" count={stats.new} color="green" />
          <FilterBadge filterKey="status" value="contacted" label="Contactados" count={stats.contacted} color="blue" />
          <FilterBadge filterKey="status" value="visit_scheduled" label="Visita Agendada" count={stats.visit_scheduled} color="purple" />
          <FilterBadge filterKey="status" value="proposal" label="Proposta" count={stats.proposal} color="amber" />
          <FilterBadge filterKey="status" value="won" label="Fechados" count={stats.won} color="emerald" icon={Target} />
          <FilterBadge filterKey="qualification_status" value="hot" label="🔥 Hot" count={stats.hot} color="red" />
          <FilterBadge filterKey="lead_type" value="comprador" label="Compradores" count={stats.comprador} color="blue" />
          <FilterBadge filterKey="assigned_to" value="unassigned" label="Sem Agente" count={stats.unassigned} color="slate" icon={AlertCircle} />
          <FilterBadge filterKey="converted" value="yes" label="Convertidos" count={stats.converted} color="emerald" icon={UserCheck} />
          
          {/* Filtro por Consultor */}
          {filters.assigned_to !== "all" && filters.assigned_to !== "unassigned" && filters.assigned_to !== "all_assigned" && (
            <Badge
              onClick={() => onFilterChange({...filters, assigned_to: "all"})}
              className="cursor-pointer transition-all border bg-blue-600 text-white border-blue-600 flex items-center gap-1 px-2.5 py-1 text-xs"
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
          )}
        </div>

        {/* Botão Expandir */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded(!expanded)}
          className="w-full text-xs text-slate-600 hover:text-slate-900 h-7 mt-1"
        >
          {expanded ? (
            <>
              <ChevronUp className="w-3 h-3 mr-1" />
              Menos filtros
            </>
          ) : (
            <>
              <ChevronDown className="w-3 h-3 mr-1" />
              Mais filtros rápidos
            </>
          )}
        </Button>

        {/* Filtros Adicionais - Colapsáveis */}
        {expanded && (
          <div className="mt-3 pt-3 border-t border-slate-200 space-y-3">
            <div>
              <p className="text-xs font-semibold text-slate-700 mb-2">Estados</p>
              <div className="flex flex-wrap gap-2">
                <FilterBadge filterKey="status" value="negotiation" label="Negociação" count={stats.negotiation} color="orange" />
                <FilterBadge filterKey="status" value="lost" label="Perdidos" count={stats.lost} color="red" />
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-700 mb-2">Qualificação</p>
              <div className="flex flex-wrap gap-2">
                <FilterBadge filterKey="qualification_status" value="warm" label="🌡️ Warm" count={stats.warm} color="orange" />
                <FilterBadge filterKey="qualification_status" value="cold" label="❄️ Cold" count={stats.cold} color="cyan" />
                <FilterBadge filterKey="qualification_status" value="unqualified" label="Não Qualificados" count={stats.unqualified} color="slate" />
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-700 mb-2">Tipo de Lead</p>
              <div className="flex flex-wrap gap-2">
                <FilterBadge filterKey="lead_type" value="vendedor" label="Vendedores" count={stats.vendedor} color="purple" />
                <FilterBadge filterKey="lead_type" value="parceiro_comprador" label="Parceiros" count={stats.parceiro} color="indigo" icon={Users} />
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-700 mb-2">Origem</p>
              <div className="flex flex-wrap gap-2">
                <FilterBadge filterKey="lead_source" value="website" label="Website" count={stats.website} color="blue" icon={Globe} />
                <FilterBadge filterKey="lead_source" value="facebook_ads" label="Facebook Ads" count={stats.facebook} color="indigo" />
                <FilterBadge filterKey="lead_source" value="referral" label="Referências" count={stats.referral} color="purple" />
                <FilterBadge filterKey="lead_source" value="real_estate_portal" label="Portais" count={stats.portal} color="cyan" />
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-700 mb-2">Consultor</p>
              <div className="flex flex-wrap gap-2 items-center">
                <Select value={filters.assigned_to} onValueChange={(value) => onFilterChange({...filters, assigned_to: value})}>
                  <SelectTrigger className="h-8 text-xs w-auto min-w-[180px] bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos Consultores</SelectItem>
                    <SelectItem value="unassigned">Não Atribuídos ({stats.unassigned})</SelectItem>
                    <SelectItem value="all_assigned">Atribuídos ({stats.assigned})</SelectItem>
                    <SelectSeparator />
                    {users.map((u) => (
                      <SelectItem key={u.email} value={u.email}>
                        {u.display_name || u.full_name || u.email.split('@')[0]}
                        {stats.byConsultant[u.email] && ` (${stats.byConsultant[u.email]})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-700 mb-2">Outros</p>
              <div className="flex flex-wrap gap-2">
                <FilterBadge filterKey="priority" value="urgent" label="🚨 Urgente" count={stats.urgent} color="red" />
                <FilterBadge filterKey="priority" value="high" label="Alta Prioridade" count={stats.high} color="amber" icon={Star} />
                <FilterBadge filterKey="converted" value="no" label="Não Convertidos" count={stats.notConverted} color="slate" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}