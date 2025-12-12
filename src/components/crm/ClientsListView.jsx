import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Mail, Phone, MapPin, Building2, Eye, Edit, Trash2, 
  MessageSquare, TrendingUp, Clock, Euro, Bed, 
  Facebook, Globe, Users2, Megaphone, Tag, User, Star
} from "lucide-react";
import { format } from "date-fns";
import { useAgentNames } from "@/components/common/useAgentNames";

const typeLabels = {
  client: "Cliente",
  partner: "Parceiro",
  investor: "Investidor",
  vendor: "Fornecedor",
  promoter: "Promotor",
  other: "Outro"
};

const typeColors = {
  client: "bg-blue-100 text-blue-800",
  partner: "bg-purple-100 text-purple-800",
  investor: "bg-green-100 text-green-800",
  vendor: "bg-orange-100 text-orange-800",
  promoter: "bg-indigo-100 text-indigo-800",
  other: "bg-slate-100 text-slate-800"
};

const statusColors = {
  active: "bg-green-100 text-green-800",
  inactive: "bg-slate-100 text-slate-600",
  prospect: "bg-amber-100 text-amber-800"
};

const sourceIcons = {
  facebook_ads: Facebook,
  website: Globe,
  referral: Users2,
  networking: Megaphone,
  direct_contact: Tag,
  other: Tag
};

export default function ClientsListView({
  clients,
  communications = [],
  opportunities = [],
  onClientClick,
  onEdit,
  onDelete,
  selectedContacts = [],
  onToggleSelect
}) {
  const { getAgentName } = useAgentNames();

  const getClientCommunications = (clientId) => {
    return communications.filter(c => c.contact_id === clientId);
  };

  const getClientOpportunities = (client) => {
    const linkedIds = client.linked_opportunity_ids || [];
    return opportunities.filter(o => 
      o.profile_id === client.id || linkedIds.includes(o.id)
    );
  };

  const selectedSet = new Set(selectedContacts);

  return (
    <div className="space-y-2">
      {clients.map((client) => {
        const clientComms = getClientCommunications(client.id);
        const clientOpps = getClientOpportunities(client);
        const req = client.property_requirements;
        const hasRequirements = req && (req.budget_min || req.budget_max || req.locations?.length || req.property_types?.length);
        const isSelected = selectedSet.has(client.id);

        return (
          <Card 
            key={client.id} 
            className={`hover:shadow-md transition-all cursor-pointer ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50/30' : ''}`}
            onClick={() => onClientClick?.(client)}
          >
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-3">
                {/* Checkbox */}
                <div 
                  className="flex-shrink-0" 
                  onClick={(e) => { e.stopPropagation(); onToggleSelect(client.id); }}
                >
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer transition-all ${
                    isSelected 
                      ? 'bg-blue-600 border-blue-600' 
                      : 'border-slate-300 hover:border-blue-400'
                  }`}>
                    {isSelected && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>

                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-sm">
                    {client.full_name?.[0]?.toUpperCase() || '?'}
                  </span>
                </div>

                {/* Main Info */}
                <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-3 items-center">
                  {/* Name & Type */}
                  <div className="sm:col-span-3 min-w-0">
                    <h4 className="font-semibold text-slate-900 truncate text-sm">{client.full_name}</h4>
                    <div className="flex items-center gap-1.5 flex-wrap mt-1">
                      <Badge className={`${typeColors[client.contact_type]} text-[10px] px-1.5 py-0`}>
                        {typeLabels[client.contact_type]}
                      </Badge>
                      <Badge className={`${statusColors[client.status]} text-[10px] px-1.5 py-0`}>
                        {client.status === 'active' ? 'Ativo' : client.status === 'inactive' ? 'Inativo' : 'Prospect'}
                      </Badge>
                    </div>
                  </div>

                  {/* Contact Details */}
                  <div className="sm:col-span-4 flex flex-col gap-1">
                    {client.email && (
                      <a 
                        href={`mailto:${client.email}`} 
                        className="flex items-center gap-1 text-blue-600 hover:underline text-xs truncate"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Mail className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{client.email}</span>
                      </a>
                    )}
                    {client.phone && (
                      <a 
                        href={`tel:${client.phone}`} 
                        className="flex items-center gap-1 text-green-600 hover:underline text-xs"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Phone className="w-3 h-3 flex-shrink-0" />
                        {client.phone}
                      </a>
                    )}
                    {client.city && (
                      <span className="flex items-center gap-1 text-slate-600 text-xs">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        {client.city}
                      </span>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="sm:col-span-2 flex items-center gap-3">
                    <span className="flex items-center gap-1 text-slate-600 text-xs">
                      <MessageSquare className="w-3 h-3" />
                      {clientComms.length}
                    </span>
                    <span className={`flex items-center gap-1 text-xs ${clientOpps.length > 0 ? 'text-green-600 font-medium' : 'text-slate-500'}`}>
                      <TrendingUp className="w-3 h-3" />
                      {clientOpps.length}
                    </span>
                    {hasRequirements && (
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    )}
                  </div>

                  {/* Agent & Source */}
                  <div className="sm:col-span-2 flex flex-col gap-1 text-xs text-slate-600 min-w-0">
                    {client.assigned_agent && (
                      <span className="flex items-center gap-1 truncate">
                        <User className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{getAgentName(client.assigned_agent, true)}</span>
                      </span>
                    )}
                    {client.source && (() => {
                      const Icon = sourceIcons[client.source] || Tag;
                      return (
                        <span className="flex items-center gap-1">
                          <Icon className="w-3 h-3 flex-shrink-0" />
                          {client.source === 'facebook_ads' ? 'FB' : 
                           client.source === 'website' ? 'Web' :
                           client.source === 'referral' ? 'Ref' : 'Outro'}
                        </span>
                      );
                    })()}
                  </div>

                  {/* Actions */}
                  <div className="sm:col-span-1 flex items-center gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => onEdit?.(client)}>
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 w-7 p-0 text-red-600 hover:bg-red-50"
                      onClick={(e) => onDelete?.(client.id, client.full_name, e)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}