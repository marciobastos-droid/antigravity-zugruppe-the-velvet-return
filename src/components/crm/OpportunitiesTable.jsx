import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Eye, Edit, Trash2, Star, Phone, Mail, MapPin, Euro, 
  Calendar, User, Building2, Target, Flame, ThermometerSun, Snowflake, UserCheck, MessageCircle
} from "lucide-react";
import DataTable from "../common/DataTable";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from "date-fns";
import { useAgentNames } from "@/components/common/useAgentNames";

const statusLabels = {
  new: "Novo",
  contacted: "Contactado",
  qualified: "Qualificado",
  proposal: "Proposta",
  negotiation: "Negociação",
  won: "Ganho",
  lost: "Perdido"
};

const statusColors = {
  new: "bg-blue-100 text-blue-800",
  contacted: "bg-amber-100 text-amber-800",
  qualified: "bg-cyan-100 text-cyan-800",
  proposal: "bg-purple-100 text-purple-800",
  negotiation: "bg-indigo-100 text-indigo-800",
  won: "bg-green-100 text-green-800",
  lost: "bg-red-100 text-red-800"
};

const leadTypeLabels = {
  comprador: "Comprador",
  vendedor: "Vendedor",
  parceiro_comprador: "Parceiro Comprador",
  parceiro_vendedor: "Parceiro Vendedor"
};

const leadTypeIcons = {
  comprador: "🏠",
  vendedor: "🏷️",
  parceiro_comprador: "🤝",
  parceiro_vendedor: "🤝"
};

const qualificationConfig = {
  hot: { icon: Flame, color: "text-red-600", bg: "bg-red-100", label: "Hot" },
  warm: { icon: ThermometerSun, color: "text-amber-600", bg: "bg-amber-100", label: "Warm" },
  cold: { icon: Snowflake, color: "text-blue-600", bg: "bg-blue-100", label: "Cold" },
  unqualified: { icon: Target, color: "text-slate-500", bg: "bg-slate-100", label: "N/Q" }
};

export default function OpportunitiesTable({
  opportunities,
  users = [],
  selectedOpportunities = [],
  onToggleSelect,
  onToggleSelectAll,
  onOpportunityClick,
  onEdit,
  onDelete,
  onToggleImportant,
  onAssign
}) {
  const { getAgentName, getAgentOptions } = useAgentNames();
  const agentOptions = getAgentOptions();

  // Buscar contactos para verificar quais oportunidades foram convertidas
  const { data: contacts = [] } = useQuery({
    queryKey: ['clientContacts'],
    queryFn: () => base44.entities.ClientContact.list(),
  });

  // Buscar comunicações recentes (últimas 48h)
  const { data: recentComms = [] } = useQuery({
    queryKey: ['recentCommunications'],
    queryFn: () => base44.entities.CommunicationLog.list('-communication_date', 200),
  });

  // Criar mapa de oportunidades convertidas
  const convertedOpportunities = React.useMemo(() => {
    const converted = new Set();
    contacts.forEach(contact => {
      if (contact.linked_opportunity_ids && contact.linked_opportunity_ids.length > 0) {
        contact.linked_opportunity_ids.forEach(id => converted.add(id));
      }
    });
    return converted;
  }, [contacts]);

  // Criar mapa de comunicações recentes por email do cliente (últimas 48h, apenas inbound)
  const recentClientComms = React.useMemo(() => {
    const now = new Date();
    const hoursAgo48 = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const commsMap = {};
    
    recentComms.forEach(comm => {
      if (comm.direction !== 'inbound') return;
      const commDate = new Date(comm.communication_date || comm.created_date);
      if (commDate < hoursAgo48) return;
      
      const email = comm.contact_email?.toLowerCase();
      if (!email) return;
      
      if (!commsMap[email]) {
        commsMap[email] = { hasEmail: false, hasMessage: false, lastDate: null };
      }
      
      if (comm.communication_type === 'email') {
        commsMap[email].hasEmail = true;
      }
      if (['whatsapp', 'sms'].includes(comm.communication_type)) {
        commsMap[email].hasMessage = true;
      }
      
      if (!commsMap[email].lastDate || commDate > commsMap[email].lastDate) {
        commsMap[email].lastDate = commDate;
      }
    });
    
    return commsMap;
  }, [recentComms]);

  const columns = [
    {
      key: "buyer_name",
      label: "Contacto",
      minWidth: "180px",
      alwaysVisible: true,
      render: (val, opp) => {
        const clientEmail = opp.buyer_email?.toLowerCase();
        const commInfo = clientEmail ? recentClientComms[clientEmail] : null;
        
        return (
          <div>
            <div className="font-medium text-slate-900 flex items-center gap-1">
              {opp.priority === 'high' && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />}
              {val}
              {commInfo && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="flex items-center gap-0.5 ml-1">
                        {commInfo.hasEmail && (
                          <span className="relative">
                            <Mail className="w-3.5 h-3.5 text-blue-600" />
                            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                          </span>
                        )}
                        {commInfo.hasMessage && (
                          <span className="relative">
                            <MessageCircle className="w-3.5 h-3.5 text-green-600" />
                            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                          </span>
                        )}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Nova comunicação recebida</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            {opp.buyer_email && (
              <div className="text-xs text-slate-500 truncate max-w-[160px]">{opp.buyer_email}</div>
            )}
          </div>
        );
      }
    },
    {
      key: "lead_type",
      label: "Tipo",
      minWidth: "130px",
      render: (val) => (
        <span className="flex items-center gap-1">
          <span>{leadTypeIcons[val]}</span>
          <span className="text-sm">{leadTypeLabels[val]}</span>
        </span>
      )
    },
    {
      key: "status",
      label: "Estado",
      minWidth: "120px",
      render: (val) => (
        <Badge className={statusColors[val]}>
          {statusLabels[val]}
        </Badge>
      )
    },
    {
      key: "qualification_status",
      label: "Qualificação",
      minWidth: "110px",
      sortValue: (row) => row.qualification_score || 0,
      render: (val, opp) => {
        const config = qualificationConfig[val] || qualificationConfig.unqualified;
        const Icon = config.icon;
        const score = opp.qualification_score;
        return (
          <div className="flex items-center gap-1">
            <Badge className={`${config.bg} ${config.color}`}>
              <Icon className="w-3 h-3 mr-1" />
              {config.label}
            </Badge>
            {score > 0 && (
              <span className="text-xs text-slate-500 font-medium">{score}</span>
            )}
          </div>
        );
      }
    },
    {
      key: "property_title",
      label: "Imóvel",
      minWidth: "150px",
      render: (val, opp) => val ? (
        <div className="flex items-center gap-1 text-slate-700 max-w-[140px]">
          <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate">{val}</span>
        </div>
      ) : '-'
    },
    {
      key: "estimated_value",
      label: "Valor",
      minWidth: "100px",
      sortValue: (row) => row.estimated_value || 0,
      render: (val) => val > 0 ? (
        <span className="flex items-center gap-1 font-medium text-slate-900">
          <Euro className="w-3.5 h-3.5" />
          {val >= 1000000 ? `${(val/1000000).toFixed(1)}M` : `${(val/1000).toFixed(0)}k`}
        </span>
      ) : '-'
    },
    {
      key: "probability",
      label: "Prob.",
      minWidth: "70px",
      render: (val) => val > 0 ? (
        <span className={`font-medium ${val >= 70 ? 'text-green-600' : val >= 40 ? 'text-amber-600' : 'text-slate-500'}`}>
          {val}%
        </span>
      ) : '-'
    },
    {
      key: "buyer_phone",
      label: "Telefone",
      minWidth: "130px",
      render: (val) => val ? (
        <a href={`tel:${val}`} className="text-blue-600 hover:underline flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <Phone className="w-3.5 h-3.5" />
          {val}
        </a>
      ) : '-'
    },
    {
      key: "location",
      label: "Localização",
      minWidth: "120px",
      render: (val) => val ? (
        <span className="flex items-center gap-1 text-slate-600">
          <MapPin className="w-3.5 h-3.5" />
          {val}
        </span>
      ) : '-'
    },
    {
      key: "budget",
      label: "Orçamento",
      minWidth: "100px",
      sortValue: (row) => row.budget || 0,
      render: (val) => val > 0 ? (
        <span className="flex items-center gap-1 text-slate-700">
          <Target className="w-3.5 h-3.5" />
          {val >= 1000000 ? `${(val/1000000).toFixed(1)}M` : `${(val/1000).toFixed(0)}k`}
        </span>
      ) : '-'
    },
    {
      key: "assigned_to",
      label: "Agente",
      minWidth: "140px",
      render: (val, opp) => (
        <Select 
          value={val || ""} 
          onValueChange={(email) => onAssign?.(opp, email)}
        >
          <SelectTrigger className="h-8 text-xs w-32" onClick={(e) => e.stopPropagation()}>
            <SelectValue placeholder="Atribuir...">
              {val ? getAgentName(val, true) : "Atribuir..."}
            </SelectValue>
          </SelectTrigger>
          <SelectContent onClick={(e) => e.stopPropagation()}>
            {agentOptions.map((agent) => (
              <SelectItem key={agent.value} value={agent.value}>
                {agent.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    },
    {
      key: "next_followup_date",
      label: "Próx. Follow-up",
      minWidth: "120px",
      sortValue: (row) => row.next_followup_date ? new Date(row.next_followup_date) : new Date(0),
      render: (val) => val ? (
        <span className={`flex items-center gap-1 ${new Date(val) < new Date() ? 'text-red-600' : 'text-slate-600'}`}>
          <Calendar className="w-3.5 h-3.5" />
          {format(new Date(val), "dd/MM/yy")}
        </span>
      ) : '-'
    },
    {
      key: "created_date",
      label: "Criado",
      minWidth: "100px",
      sortValue: (row) => new Date(row.created_date),
      render: (val) => val ? format(new Date(val), "dd/MM/yy") : '-'
    },
    {
      key: "converted",
      label: "Convertido",
      minWidth: "100px",
      render: (_, opp) => convertedOpportunities.has(opp.id) ? (
        <Badge className="bg-green-100 text-green-800 border-green-300">
          <UserCheck className="w-3 h-3 mr-1" />
          Sim
        </Badge>
      ) : (
        <span className="text-slate-400 text-sm">Não</span>
      )
    },
    {
      key: "actions",
      label: "Ações",
      sortable: false,
      minWidth: "130px",
      alwaysVisible: true,
      render: (_, opp) => (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <Button 
            variant="ghost" 
            size="sm" 
            className={`h-8 w-8 p-0 ${opp.priority === 'high' ? 'text-amber-500' : ''}`}
            onClick={() => onToggleImportant?.(opp)}
          >
            <Star className={`w-4 h-4 ${opp.priority === 'high' ? 'fill-current' : ''}`} />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => onOpportunityClick?.(opp)}>
            <Eye className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => onEdit?.(opp)}>
            <Edit className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={() => onDelete?.(opp)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      )
    }
  ];

  const defaultVisibleColumns = [
    "buyer_name", "lead_type", "status", "qualification_status", 
    "estimated_value", "probability", "buyer_phone", "assigned_to", "created_date", "converted", "actions"
  ];

  // Pre-sort data by created_date (desc) then alphabetically by name
  const sortedOpportunities = React.useMemo(() => {
    return [...opportunities].sort((a, b) => {
      // First by created_date descending
      const dateA = new Date(a.created_date || 0);
      const dateB = new Date(b.created_date || 0);
      if (dateB - dateA !== 0) return dateB - dateA;
      // Then alphabetically by name
      return (a.buyer_name || '').localeCompare(b.buyer_name || '', 'pt');
    });
  }, [opportunities]);

  return (
    <DataTable
      data={sortedOpportunities}
      columns={columns}
      defaultVisibleColumns={defaultVisibleColumns}
      persistKey="opportunities_table"
      defaultSortColumn="created_date"
      defaultSortDirection="desc"
      showCheckboxes={true}
      selectedRows={selectedOpportunities}
      onToggleSelect={onToggleSelect}
      onToggleSelectAll={onToggleSelectAll}
      onRowClick={onOpportunityClick}
      emptyMessage="Nenhuma oportunidade encontrada"
    />
  );
}