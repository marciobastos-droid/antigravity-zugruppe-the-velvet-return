import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, Star, Phone, Mail, MapPin, Calendar, Building2, Trash2, UserPlus, UserCog } from "lucide-react";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function LeadsTable({ 
  leads, 
  onLeadClick, 
  onToggleImportant, 
  onDelete, 
  onAssign, 
  users = [], 
  profiles = [],
  selectedLeads = [],
  onToggleSelect,
  onToggleSelectAll
}) {
  
  const getProfileForLead = (lead) => {
    return profiles.find(p => p.buyer_email === lead.buyer_email);
  };
  const getStatusColor = (status) => {
    const colors = {
      new: "bg-blue-100 text-blue-800",
      contacted: "bg-yellow-100 text-yellow-800",
      scheduled: "bg-purple-100 text-purple-800",
      closed: "bg-slate-100 text-slate-800"
    };
    return colors[status] || "bg-slate-100 text-slate-800";
  };

  const getQualificationColor = (status) => {
    const colors = {
      hot: "bg-red-100 text-red-800 border-red-300",
      warm: "bg-orange-100 text-orange-800 border-orange-300",
      cold: "bg-blue-100 text-blue-800 border-blue-300",
      unqualified: "bg-slate-100 text-slate-800"
    };
    return colors[status] || "";
  };

  const getLeadTypeLabel = (type) => {
    const labels = {
      comprador: "Comprador",
      vendedor: "Vendedor",
      parceiro: "Parceiro"
    };
    return labels[type] || type;
  };

  const getPriorityIcon = (priority) => {
    if (priority === 'high') return '🔴';
    if (priority === 'medium') return '🟡';
    return '🟢';
  };

  return (
    <div className="border rounded-lg overflow-x-auto bg-white">
      <Table className="min-w-full">
        <TableHeader>
          <TableRow className="bg-slate-50">
            {onToggleSelect && (
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedLeads.length === leads.length && leads.length > 0}
                  onCheckedChange={onToggleSelectAll}
                />
              </TableHead>
            )}
            <TableHead className="w-12"></TableHead>
            <TableHead>Lead</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Contacto</TableHead>
            <TableHead>Localização</TableHead>
            <TableHead className="w-32">Imóvel</TableHead>
            <TableHead>Agente</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Qualificação</TableHead>
            <TableHead>Prioridade</TableHead>
            <TableHead>Data</TableHead>
            <TableHead className="w-40 sticky right-0 bg-slate-50">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.length === 0 ? (
            <TableRow>
              <TableCell colSpan={12} className="text-center py-8 text-slate-500">
                Nenhum lead encontrado
              </TableCell>
            </TableRow>
          ) : (
            leads.map((lead) => (
              <TableRow 
                key={lead.id} 
                className="hover:bg-slate-50 cursor-pointer transition-colors"
                onClick={() => onLeadClick(lead)}
              >
                {onToggleSelect && (
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedLeads.includes(lead.id)}
                      onCheckedChange={() => onToggleSelect(lead.id)}
                    />
                  </TableCell>
                )}
                <TableCell>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleImportant(lead);
                    }}
                  >
                    <Star 
                      className={`w-4 h-4 ${
                        lead.priority === 'high' 
                          ? 'fill-yellow-400 text-yellow-400' 
                          : 'text-slate-300 hover:text-yellow-400'
                      }`}
                    />
                  </button>
                </TableCell>
                <TableCell>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-900">{lead.buyer_name}</p>
                      {getProfileForLead(lead) && (
                        <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                          Perfil
                        </Badge>
                      )}
                    </div>
                    {lead.quick_notes?.length > 0 && (
                      <p className="text-xs text-slate-500 truncate max-w-xs">
                        {lead.quick_notes[lead.quick_notes.length - 1].text}
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {getLeadTypeLabel(lead.lead_type)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="space-y-1 text-xs">
                    {lead.buyer_email && (
                      <div className="flex items-center gap-1 text-slate-600">
                        <Mail className="w-3 h-3" />
                        {lead.buyer_email}
                      </div>
                    )}
                    {lead.buyer_phone && (
                      <div className="flex items-center gap-1 text-slate-600">
                        <Phone className="w-3 h-3" />
                        {lead.buyer_phone}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {lead.location && (
                    <div className="flex items-center gap-1 text-xs text-slate-600">
                      <MapPin className="w-3 h-3" />
                      {lead.location}
                    </div>
                  )}
                </TableCell>
                <TableCell className="max-w-[120px]">
                  {lead.property_title && (
                    <div className="flex items-center gap-1 text-xs text-slate-600">
                      <Building2 className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{lead.property_title}</span>
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  {lead.assigned_to ? (
                    <div className="flex items-center gap-1 text-xs">
                      <UserCog className="w-3 h-3 text-blue-600" />
                      <span className="text-slate-700">
                        {users.find(u => u.email === lead.assigned_to)?.full_name || lead.assigned_to}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">Não atribuído</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge className={getStatusColor(lead.status)}>
                    {lead.status === 'new' ? 'Novo' :
                     lead.status === 'contacted' ? 'Contactado' :
                     lead.status === 'scheduled' ? 'Agendado' : 'Fechado'}
                  </Badge>
                </TableCell>
                <TableCell>
                  {lead.qualification_status && (
                    <Badge 
                      variant="outline" 
                      className={getQualificationColor(lead.qualification_status)}
                    >
                      {lead.qualification_status === 'hot' ? '🔥 Quente' :
                       lead.qualification_status === 'warm' ? '🌡️ Morno' :
                       lead.qualification_status === 'cold' ? '❄️ Frio' : 'Não qualificado'}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <span className="text-lg">{getPriorityIcon(lead.priority)}</span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 text-xs text-slate-600">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(lead.created_date), 'dd/MM/yyyy')}
                  </div>
                </TableCell>
                <TableCell className="sticky right-0 bg-white border-l">
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onLeadClick(lead);
                      }}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => e.stopPropagation()}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <UserPlus className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuLabel>Atribuir a</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {users && users.length > 0 ? (
                          users.map((user) => (
                            <DropdownMenuItem
                              key={user.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onAssign) onAssign(lead, user.id);
                              }}
                              className={lead.assigned_to === user.email ? "bg-blue-50" : ""}
                            >
                              {user.full_name}
                              {lead.assigned_to === user.email && " ✓"}
                            </DropdownMenuItem>
                          ))
                        ) : (
                          <div className="px-2 py-1.5 text-sm text-slate-500">
                            Nenhum agente disponível
                          </div>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onDelete) onDelete(lead);
                      }}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}