import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Phone, Mail, MapPin, Euro, Star, Edit, Trash2,
  Flame, ThermometerSun, Snowflake, AlertCircle,
  ShoppingCart, Building2, Users, Briefcase, UserCheck
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAgentNames } from "@/components/common/useAgentNames";

const statusConfig = {
  new: { label: "Novo", color: "bg-blue-100 text-blue-800" },
  contacted: { label: "Contactado", color: "bg-yellow-100 text-yellow-800" },
  qualified: { label: "Qualificado", color: "bg-green-100 text-green-800" },
  proposal: { label: "Proposta", color: "bg-purple-100 text-purple-800" },
  negotiation: { label: "Negociação", color: "bg-orange-100 text-orange-800" },
  won: { label: "Ganho", color: "bg-emerald-100 text-emerald-800" },
  lost: { label: "Perdido", color: "bg-red-100 text-red-800" }
};

const qualificationConfig = {
  hot: { icon: Flame, color: "text-red-600", bg: "bg-red-100" },
  warm: { icon: ThermometerSun, color: "text-amber-600", bg: "bg-amber-100" },
  cold: { icon: Snowflake, color: "text-blue-600", bg: "bg-blue-100" },
  unqualified: { icon: AlertCircle, color: "text-slate-500", bg: "bg-slate-100" }
};

const leadTypeConfig = {
  comprador: { icon: ShoppingCart, label: "Comprador", color: "text-green-600" },
  vendedor: { icon: Building2, label: "Vendedor", color: "text-blue-600" },
  parceiro_comprador: { icon: Users, label: "Parceiro C.", color: "text-purple-600" },
  parceiro_vendedor: { icon: Briefcase, label: "Parceiro V.", color: "text-amber-600" }
};

export default function OpportunitiesGrid({
  opportunities,
  users,
  selectedOpportunities = [],
  onToggleSelect,
  onOpportunityClick,
  onEdit,
  onDelete,
  onToggleImportant
}) {
  const { getAgentName } = useAgentNames();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
      {opportunities.map((opp) => {
        const status = statusConfig[opp.status] || statusConfig.new;
        const qual = qualificationConfig[opp.qualification_status] || qualificationConfig.unqualified;
        const QualIcon = qual.icon;
        const leadType = leadTypeConfig[opp.lead_type] || leadTypeConfig.comprador;
        const LeadIcon = leadType.icon;
        const isSelected = selectedOpportunities.includes(opp.id);

        return (
          <Card 
            key={opp.id}
            className={`cursor-pointer hover:shadow-lg transition-all ${
              isSelected ? 'ring-2 ring-blue-500 bg-blue-50/50' : ''
            } ${opp.priority === 'high' ? 'border-amber-300' : ''}`}
            onClick={() => onOpportunityClick?.(opp)}
          >
            <CardContent className="p-3 sm:p-4">
              {/* Header */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onToggleSelect?.(opp.id)}
                  />
                  <div className={`p-1.5 rounded-full ${qual.bg}`}>
                    <QualIcon className={`w-3.5 h-3.5 ${qual.color}`} />
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {opp.priority === 'high' && (
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  )}
                  <Badge className={`text-[10px] sm:text-xs ${status.color}`}>
                    {status.label}
                  </Badge>
                </div>
              </div>

              {/* Name & Type */}
              <div className="mb-2">
                <h3 className="font-semibold text-slate-900 text-sm sm:text-base truncate">
                  {opp.buyer_name || 'Sem nome'}
                </h3>
                <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                  <LeadIcon className={`w-3 h-3 ${leadType.color}`} />
                  <span>{leadType.label}</span>
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-1 mb-3 text-xs text-slate-600">
                {opp.buyer_phone && (
                  <div className="flex items-center gap-1.5 truncate">
                    <Phone className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{opp.buyer_phone}</span>
                  </div>
                )}
                {opp.buyer_email && (
                  <div className="flex items-center gap-1.5 truncate">
                    <Mail className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{opp.buyer_email}</span>
                  </div>
                )}
                {opp.location && (
                  <div className="flex items-center gap-1.5 truncate">
                    <MapPin className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{opp.location}</span>
                  </div>
                )}
              </div>

              {/* Budget & Score */}
              <div className="flex items-center justify-between mb-3">
                {opp.budget ? (
                  <div className="flex items-center gap-1 text-sm font-medium text-slate-900">
                    <Euro className="w-3.5 h-3.5" />
                    {opp.budget >= 1000000 
                      ? `${(opp.budget / 1000000).toFixed(1)}M`
                      : `${Math.round(opp.budget / 1000)}k`}
                  </div>
                ) : (
                  <span className="text-xs text-slate-400">Sem orçamento</span>
                )}
                {opp.qualification_score && (
                  <Badge variant="outline" className="text-[10px]">
                    Score: {opp.qualification_score}
                  </Badge>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <div className="text-[10px] sm:text-xs text-slate-500">
                  {opp.assigned_to ? getAgentName(opp.assigned_to, true) : 'Sem agente'}
                </div>
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => onToggleImportant?.(opp)}
                  >
                    <Star className={`w-3.5 h-3.5 ${opp.priority === 'high' ? 'text-amber-500 fill-amber-500' : 'text-slate-400'}`} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => onEdit?.(opp)}
                  >
                    <Edit className="w-3.5 h-3.5 text-slate-500" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 hover:text-red-600"
                    onClick={() => onDelete?.(opp)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {/* Date */}
              <div className="text-[10px] text-slate-400 mt-1 text-right">
                {format(new Date(opp.created_date), "d MMM", { locale: ptBR })}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {opportunities.length === 0 && (
        <div className="col-span-full text-center py-12 text-slate-500">
          Nenhuma oportunidade encontrada
        </div>
      )}
    </div>
  );
}