import React from "react";
import { Draggable } from "@hello-pangea/dnd";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Mail, Phone, MapPin, Building2, Calendar, DollarSign, GripVertical } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Checkbox } from "@/components/ui/checkbox";

export function KanbanCard({ opportunity, index, onSelect, isSelected, onClick, leadTypeIcons, leadTypeColors }) {
  const LeadIcon = leadTypeIcons[opportunity.lead_type || "comprador"];
  
  return (
    <Draggable draggableId={opportunity.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`mb-3 ${snapshot.isDragging ? 'opacity-50' : ''}`}
        >
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={(e) => {
              if (!e.target.closest('.checkbox-wrapper') && !e.target.closest('.drag-handle')) {
                onClick(opportunity);
              }
            }}
          >
            <CardHeader className="p-3 pb-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 flex-1">
                  <div className="checkbox-wrapper" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => onSelect(opportunity.id)}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm mb-1 truncate">{opportunity.buyer_name}</h4>
                    <Badge className={`text-xs border ${leadTypeColors[opportunity.lead_type || "comprador"]}`}>
                      <LeadIcon className="w-3 h-3 mr-1" />
                      {opportunity.lead_type || "comprador"}
                    </Badge>
                  </div>
                </div>
                <div {...provided.dragHandleProps} className="drag-handle cursor-grab active:cursor-grabbing">
                  <GripVertical className="w-4 h-4 text-slate-400" />
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="p-3 pt-2 space-y-2">
              {opportunity.buyer_email && (
                <div className="flex items-center text-xs text-slate-600 truncate">
                  <Mail className="w-3 h-3 mr-1 flex-shrink-0" />
                  <span className="truncate">{opportunity.buyer_email}</span>
                </div>
              )}
              {opportunity.buyer_phone && (
                <div className="flex items-center text-xs text-slate-600">
                  <Phone className="w-3 h-3 mr-1 flex-shrink-0" />
                  {opportunity.buyer_phone}
                </div>
              )}
              {opportunity.location && (
                <div className="flex items-center text-xs text-slate-600 truncate">
                  <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
                  <span className="truncate">{opportunity.location}</span>
                </div>
              )}
              {opportunity.budget > 0 && (
                <div className="flex items-center text-xs text-slate-600">
                  <DollarSign className="w-3 h-3 mr-1 flex-shrink-0" />
                  €{opportunity.budget.toLocaleString()}
                </div>
              )}
              {opportunity.property_title && (
                <div className="flex items-center text-xs text-blue-600 truncate">
                  <Building2 className="w-3 h-3 mr-1 flex-shrink-0" />
                  <span className="truncate">{opportunity.property_title}</span>
                </div>
              )}
              <div className="flex items-center text-xs text-slate-500 mt-2 pt-2 border-t">
                <Calendar className="w-3 h-3 mr-1" />
                {format(new Date(opportunity.created_date), "d MMM", { locale: ptBR })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </Draggable>
  );
}

export function KanbanColumn({ children, title, count, color }) {
  return (
    <div className="flex-1 min-w-[280px] max-w-[400px]">
      <div className={`${color} rounded-lg p-3 mb-3`}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">{title}</h3>
          <Badge variant="secondary" className="bg-white/50">
            {count}
          </Badge>
        </div>
      </div>
      <div className="space-y-2 min-h-[400px]">
        {children}
      </div>
    </div>
  );
}