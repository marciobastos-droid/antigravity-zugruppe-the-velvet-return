import React, { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Flame, ThermometerSun, Snowflake, Globe, Facebook, Users2, CheckCircle2, X, AlertCircle } from "lucide-react";

export default function ContactFilterBadges({ 
  contacts, 
  opportunities = [],
  activeFilters = {},
  onFilterChange 
}) {
  const [showConsultants, setShowConsultants] = React.useState(false);

  // Calculate counts for each filter
  const counts = useMemo(() => {
    // Safety check to prevent infinite loops
    if (!Array.isArray(contacts) || contacts.length === 0) {
      return {
        novos: 0, contactados: 0, visitaAgendada: 0, proposta: 0, fechados: 0, hot: 0, 
        compradores: 0, convertidos: 0, negociacao: 0, perdidos: 0, warm: 0, cold: 0,
        naoQualificados: 0, website: 0, facebookAds: 0, portais: 0, vendedores: 0,
        parceiros: 0, naoConvertidos: 0, consultores: []
      };
    }
    
    if (!Array.isArray(opportunities)) {
      console.warn('[ContactFilterBadges] Opportunities is not an array:', opportunities);
    }

    // Helper to get opportunities for a contact
    const getContactOpps = (contactId) => {
      if (!opportunities || opportunities.length === 0) return [];
      return opportunities.filter(o => 
        o.contact_id === contactId || 
        o.profile_id === contactId ||
        (o.buyer_email && contacts.find(c => c.id === contactId)?.email === o.buyer_email)
      );
    };

    return {
      // PRINCIPAIS
      novos: contacts.filter(c => {
        const created = new Date(c.created_date);
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        return created > sevenDaysAgo;
      }).length,
      contactados: contacts.filter(c => {
        const opps = getContactOpps(c.id);
        return opps.some(o => ['contacted', 'qualified', 'visit_scheduled', 'proposal', 'negotiation'].includes(o.status));
      }).length,
      visitaAgendada: contacts.filter(c => {
        const opps = getContactOpps(c.id);
        return opps.some(o => o.status === 'visit_scheduled');
      }).length,
      proposta: contacts.filter(c => {
        const opps = getContactOpps(c.id);
        return opps.some(o => o.status === 'proposal');
      }).length,
      fechados: contacts.filter(c => {
        const opps = getContactOpps(c.id);
        return opps.some(o => o.status === 'won');
      }).length,
      hot: contacts.filter(c => {
        const opps = getContactOpps(c.id);
        return opps.some(o => o.qualification_status === 'hot');
      }).length,
      compradores: contacts.filter(c => {
        const opps = getContactOpps(c.id);
        return opps.some(o => o.lead_type === 'comprador' || o.lead_type === 'parceiro_comprador');
      }).length,
      convertidos: contacts.filter(c => {
        const opps = getContactOpps(c.id);
        return opps.some(o => o.status === 'won');
      }).length,

      // ESTADOS
      negociacao: contacts.filter(c => {
        const opps = getContactOpps(c.id);
        return opps.some(o => o.status === 'negotiation');
      }).length,
      perdidos: contacts.filter(c => {
        const opps = getContactOpps(c.id);
        return opps.some(o => o.status === 'lost');
      }).length,

      // QUALIFICAÇÃO
      warm: contacts.filter(c => {
        const opps = getContactOpps(c.id);
        return opps.some(o => o.qualification_status === 'warm');
      }).length,
      cold: contacts.filter(c => {
        const opps = getContactOpps(c.id);
        return opps.some(o => o.qualification_status === 'cold');
      }).length,
      naoQualificados: contacts.filter(c => {
        const opps = getContactOpps(c.id);
        return opps.some(o => o.qualification_status === 'unqualified');
      }).length,

      // ORIGEM
      website: contacts.filter(c => c.source === 'website').length,
      facebookAds: contacts.filter(c => c.source === 'facebook_ads').length,
      portais: contacts.filter(c => c.source === 'real_estate_portal' || c.source === 'idealista' || c.source === 'supercasa' || c.source === 'casasapo').length,

      // TIPO DE LEAD
      vendedores: contacts.filter(c => {
        const opps = getContactOpps(c.id);
        return opps.some(o => o.lead_type === 'vendedor' || o.lead_type === 'parceiro_vendedor');
      }).length,
      parceiros: contacts.filter(c => c.contact_type === 'partner').length,

      // OUTROS
      naoConvertidos: contacts.filter(c => {
        const opps = getContactOpps(c.id);
        return opps.length > 0 && !opps.some(o => o.status === 'won');
      }).length,

      // Consultores (unique assigned agents)
      consultores: [...new Set(contacts.map(c => c.assigned_agent).filter(Boolean))]
    };
  }, [contacts, opportunities]);

  const FilterBadge = ({ label, count, filterKey, filterValue, icon: Icon, color = "slate", emoji }) => {
    const isActive = activeFilters[filterKey] === filterValue;
    
    const colorClasses = {
      slate: isActive ? "bg-slate-700 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200",
      blue: isActive ? "bg-blue-600 text-white" : "bg-blue-100 text-blue-700 hover:bg-blue-200",
      green: isActive ? "bg-green-600 text-white" : "bg-green-100 text-green-700 hover:bg-green-200",
      amber: isActive ? "bg-amber-600 text-white" : "bg-amber-100 text-amber-700 hover:bg-amber-200",
      red: isActive ? "bg-red-600 text-white" : "bg-red-100 text-red-700 hover:bg-red-200",
      purple: isActive ? "bg-purple-600 text-white" : "bg-purple-100 text-purple-700 hover:bg-purple-200",
      orange: isActive ? "bg-orange-600 text-white" : "bg-orange-100 text-orange-700 hover:bg-orange-200",
      cyan: isActive ? "bg-cyan-600 text-white" : "bg-cyan-100 text-cyan-700 hover:bg-cyan-200",
      indigo: isActive ? "bg-indigo-600 text-white" : "bg-indigo-100 text-indigo-700 hover:bg-indigo-200",
    };

    return (
      <Badge
        className={`${colorClasses[color]} cursor-pointer transition-all border-0 text-xs px-2.5 py-1 font-medium`}
        onClick={() => onFilterChange(filterKey, isActive ? null : filterValue)}
      >
        {emoji && <span className="mr-1">{emoji}</span>}
        {Icon && <Icon className="w-3 h-3 mr-1" />}
        {label} ({count})
      </Badge>
    );
  };

  const agentsList = useMemo(() => {
    if (!Array.isArray(contacts)) return [];
    return [...new Set(contacts.map(c => c.assigned_agent).filter(Boolean))];
  }, [contacts]);

  return (
    <div className="space-y-4">
      {/* PRINCIPAIS */}
      <div>
        <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2 flex items-center gap-1">
          📊 Principais
        </h4>
        <div className="flex flex-wrap gap-2">
          <FilterBadge label="Novos" count={counts.novos} filterKey="quick" filterValue="new" color="cyan" />
          <FilterBadge label="Contactados" count={counts.contactados} filterKey="quick" filterValue="contacted" color="blue" />
          <FilterBadge label="Visita Agendada" count={counts.visitaAgendada} filterKey="quick" filterValue="visit_scheduled" color="purple" />
          <FilterBadge label="Proposta" count={counts.proposta} filterKey="quick" filterValue="proposal" color="indigo" />
          <FilterBadge label="Fechados" count={counts.fechados} filterKey="quick" filterValue="won" color="green" emoji="🔥" />
          <FilterBadge label="Hot" count={counts.hot} filterKey="qualification" filterValue="hot" color="red" emoji="🔥" />
          <FilterBadge label="Compradores" count={counts.compradores} filterKey="leadType" filterValue="buyer" color="blue" />
          <FilterBadge label="Convertidos" count={counts.convertidos} filterKey="quick" filterValue="converted" color="green" icon={CheckCircle2} />
        </div>
      </div>

      {/* ESTADOS */}
      <div>
        <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2 flex items-center gap-1">
          📈 Estados
        </h4>
        <div className="flex flex-wrap gap-2">
          <FilterBadge label="Negociação" count={counts.negociacao} filterKey="quick" filterValue="negotiation" color="orange" />
          <FilterBadge label="Perdidos" count={counts.perdidos} filterKey="quick" filterValue="lost" color="red" />
        </div>
      </div>

      {/* QUALIFICAÇÃO */}
      <div>
        <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2 flex items-center gap-1">
          🎯 Qualificação
        </h4>
        <div className="flex flex-wrap gap-2">
          <FilterBadge label="Warm" count={counts.warm} filterKey="qualification" filterValue="warm" color="orange" emoji="🌡️" />
          <FilterBadge label="Cold" count={counts.cold} filterKey="qualification" filterValue="cold" color="cyan" emoji="💧" />
          <FilterBadge label="Não Qualificados" count={counts.naoQualificados} filterKey="qualification" filterValue="unqualified" color="slate" />
        </div>
      </div>

      {/* ORIGEM */}
      <div>
        <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2 flex items-center gap-1">
          🌐 Origem
        </h4>
        <div className="flex flex-wrap gap-2">
          <FilterBadge label="Website" count={counts.website} filterKey="source" filterValue="website" color="blue" icon={Globe} />
          <FilterBadge label="Facebook Ads" count={counts.facebookAds} filterKey="source" filterValue="facebook_ads" color="indigo" icon={Facebook} />
          <FilterBadge label="Portais" count={counts.portais} filterKey="source" filterValue="portals" color="purple" />
        </div>
      </div>

      {/* TIPO DE LEAD */}
      <div>
        <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2 flex items-center gap-1">
          👥 Tipo de Lead
        </h4>
        <div className="flex flex-wrap gap-2">
          <FilterBadge label="Vendedores" count={counts.vendedores} filterKey="leadType" filterValue="seller" color="amber" />
          <FilterBadge label="Parceiros" count={counts.parceiros} filterKey="contactType" filterValue="partner" color="purple" emoji="🤝" />
        </div>
      </div>

      {/* OUTROS */}
      <div>
        <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2 flex items-center gap-1">
          📌 Outros
        </h4>
        <div className="flex flex-wrap gap-2">
          <FilterBadge label="Não Convertidos" count={counts.naoConvertidos} filterKey="quick" filterValue="not_converted" color="slate" />
        </div>
      </div>

      {/* Mais filtros (consultores) - Collapsible */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowConsultants(!showConsultants)}
          className="text-xs text-slate-600 hover:text-slate-900 p-0 h-auto"
        >
          {showConsultants ? <ChevronUp className="w-3 h-3 mr-1" /> : <ChevronDown className="w-3 h-3 mr-1" />}
          Mais filtros (consultores)
        </Button>
        
        {showConsultants && agentsList.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {agentsList.map(agent => {
              const agentContacts = contacts.filter(c => c.assigned_agent === agent);
              const isActive = activeFilters.assignedAgent === agent;
              
              return (
                <Badge
                  key={agent}
                  className={`${isActive ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'} cursor-pointer transition-all border-0 text-xs px-2.5 py-1 font-medium`}
                  onClick={() => onFilterChange('assignedAgent', isActive ? null : agent)}
                >
                  {agent.split('@')[0]} ({agentContacts.length})
                </Badge>
              );
            })}
          </div>
        )}
      </div>

      {/* Active Filters Summary */}
      {Object.keys(activeFilters).some(k => activeFilters[k]) && (
        <div className="flex items-center gap-2 pt-2 border-t">
          <span className="text-xs text-slate-500">Filtros ativos:</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onFilterChange('clear', null)}
            className="h-6 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <X className="w-3 h-3 mr-1" />
            Limpar Todos
          </Button>
        </div>
      )}
    </div>
  );
}