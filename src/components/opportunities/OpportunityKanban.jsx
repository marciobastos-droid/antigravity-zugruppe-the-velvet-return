import React from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  User, Phone, Mail, Euro, Calendar, Building2,
  Star, AlertCircle, Clock, CheckCircle2, XCircle,
  MoreHorizontal, Eye
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import moment from "moment";

const STAGES = [
  { id: "new", label: "Novo", color: "bg-slate-100 border-slate-300", icon: Clock },
  { id: "contacted", label: "Contactado", color: "bg-blue-50 border-blue-300", icon: Phone },
  { id: "visit_scheduled", label: "Qualificado", color: "bg-purple-50 border-purple-300", icon: CheckCircle2 },
  { id: "proposal", label: "Proposta", color: "bg-amber-50 border-amber-300", icon: Euro },
  { id: "negotiation", label: "Negociação", color: "bg-orange-50 border-orange-300", icon: Building2 },
  { id: "won", label: "Ganho", color: "bg-green-50 border-green-300", icon: CheckCircle2 },
  { id: "lost", label: "Perdido", color: "bg-red-50 border-red-300", icon: XCircle }
];

export default function OpportunityKanban({ 
  opportunities, 
  onDragEnd, 
  onOpportunityClick,
  onEdit,
  onDelete 
}) {
  const getOpportunitiesByStage = (stageId) => {
    return opportunities.filter(o => o.status === stageId);
  };

  const calculateStageValue = (stageId) => {
    return getOpportunitiesByStage(stageId).reduce((sum, o) => {
      const value = o.estimated_value || 0;
      const prob = o.probability || 50;
      return sum + (value * prob / 100);
    }, 0);
  };

  const getQualificationBadge = (status) => {
    switch (status) {
      case 'hot': return <Badge className="bg-red-100 text-red-800 text-xs">🔥 Hot</Badge>;
      case 'warm': return <Badge className="bg-amber-100 text-amber-800 text-xs">🌡️ Warm</Badge>;
      case 'cold': return <Badge className="bg-blue-100 text-blue-800 text-xs">❄️ Cold</Badge>;
      default: return null;
    }
  };

  const isOverdue = (opp) => {
    if (!opp.expected_close_date) return false;
    return moment(opp.expected_close_date).isBefore(moment(), 'day');
  };

  const needsFollowup = (opp) => {
    if (!opp.next_followup_date) return false;
    return moment(opp.next_followup_date).isBefore(moment(), 'day');
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STAGES.map((stage) => {
          const stageOpportunities = getOpportunitiesByStage(stage.id);
          const stageValue = calculateStageValue(stage.id);
          const StageIcon = stage.icon;

          return (
            <div key={stage.id} className="flex-shrink-0 w-80">
              <div className={`rounded-t-lg p-3 ${stage.color} border border-b-0`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <StageIcon className="w-4 h-4" />
                    <span className="font-semibold text-sm">{stage.label}</span>
                    <Badge variant="secondary" className="text-xs">
                      {stageOpportunities.length}
                    </Badge>
                  </div>
                </div>
                {stageValue > 0 && (
                  <p className="text-xs text-slate-600 mt-1">
                    €{Math.round(stageValue).toLocaleString()} ponderado
                  </p>
                )}
              </div>

              <Droppable droppableId={stage.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`min-h-[500px] border border-t-0 rounded-b-lg p-2 transition-colors ${
                      snapshot.isDraggingOver ? 'bg-blue-50' : 'bg-slate-50'
                    }`}
                  >
                    <ScrollArea className="h-[500px]">
                      <div className="space-y-2 pr-2">
                        {stageOpportunities.map((opp, index) => (
                          <Draggable key={opp.id} draggableId={opp.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`bg-white rounded-lg shadow-sm border p-3 cursor-pointer hover:shadow-md transition-shadow ${
                                  snapshot.isDragging ? 'shadow-lg' : ''
                                } ${isOverdue(opp) ? 'border-red-300 bg-red-50' : ''}`}
                                onClick={() => onOpportunityClick(opp)}
                              >
                                {/* Header */}
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1 mb-1">
                                      {opp.priority === 'high' && (
                                        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                                      )}
                                      {opp.ref_id && (
                                        <Badge variant="outline" className="text-xs font-mono">
                                          {opp.ref_id}
                                        </Badge>
                                      )}
                                    </div>
                                    <h4 className="font-medium text-sm text-slate-900 truncate">
                                      {opp.buyer_name}
                                    </h4>
                                  </div>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                        <MoreHorizontal className="w-4 h-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onOpportunityClick(opp); }}>
                                        <Eye className="w-4 h-4 mr-2" />
                                        Ver Detalhes
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(opp); }}>
                                        Editar
                                      </DropdownMenuItem>
                                      <DropdownMenuItem 
                                        onClick={(e) => { e.stopPropagation(); onDelete(opp); }}
                                        className="text-red-600"
                                      >
                                        Eliminar
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>

                                {/* Badges */}
                                <div className="flex flex-wrap gap-1 mb-2">
                                  {getQualificationBadge(opp.qualification_status)}
                                  {opp.lead_type && (
                                    <Badge variant="outline" className="text-xs">
                                      {opp.lead_type === 'comprador' ? 'Comprador' : 
                                       opp.lead_type === 'vendedor' ? 'Vendedor' : 
                                       opp.lead_type === 'parceiro_comprador' ? 'P. Comprador' : 'P. Vendedor'}
                                    </Badge>
                                  )}
                                </div>

                                {/* Contact Info */}
                                <div className="space-y-1 text-xs text-slate-600">
                                  {opp.buyer_email && (
                                    <div className="flex items-center gap-1.5 truncate">
                                      <Mail className="w-3 h-3 flex-shrink-0" />
                                      <span className="truncate">{opp.buyer_email}</span>
                                    </div>
                                  )}
                                  {opp.buyer_phone && (
                                    <div className="flex items-center gap-1.5">
                                      <Phone className="w-3 h-3 flex-shrink-0" />
                                      <span>{opp.buyer_phone}</span>
                                    </div>
                                  )}
                                </div>

                                {/* Value & Probability */}
                                {(opp.estimated_value || opp.probability) && (
                                  <div className="flex items-center gap-2 mt-2 pt-2 border-t">
                                    {opp.estimated_value && (
                                      <span className="text-xs font-medium text-green-700">
                                        €{opp.estimated_value.toLocaleString()}
                                      </span>
                                    )}
                                    {opp.probability && (
                                      <Badge variant="secondary" className="text-xs">
                                        {opp.probability}%
                                      </Badge>
                                    )}
                                  </div>
                                )}

                                {/* Associated Properties */}
                                {opp.associated_properties?.length > 0 && (
                                  <div className="mt-2 pt-2 border-t">
                                    <div className="flex items-center gap-1 text-xs text-slate-500">
                                      <Building2 className="w-3 h-3" />
                                      <span>{opp.associated_properties.length} imóvel(is)</span>
                                    </div>
                                  </div>
                                )}

                                {/* Dates & Alerts */}
                                <div className="flex items-center gap-2 mt-2 pt-2 border-t">
                                  {opp.expected_close_date && (
                                    <div className={`flex items-center gap-1 text-xs ${isOverdue(opp) ? 'text-red-600' : 'text-slate-500'}`}>
                                      <Calendar className="w-3 h-3" />
                                      <span>{moment(opp.expected_close_date).format('DD/MM')}</span>
                                    </div>
                                  )}
                                  {needsFollowup(opp) && (
                                    <Badge className="bg-orange-100 text-orange-800 text-xs">
                                      <AlertCircle className="w-3 h-3 mr-1" />
                                      Follow-up
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}