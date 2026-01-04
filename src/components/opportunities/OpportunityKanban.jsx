import React from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  User, Phone, Mail, Euro, Calendar, Building2,
  Star, AlertCircle, Clock, CheckCircle2, XCircle,
  MoreHorizontal, Eye, ExternalLink, MapPin
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import moment from "moment";
import CreateAppointmentDialog from "../calendar/CreateAppointmentDialog";
import { toast } from "sonner";

const STAGES = [
  { id: "new", label: "Novo", color: "bg-slate-100 border-slate-300", headerColor: "bg-gradient-to-r from-slate-100 to-slate-200", icon: Clock },
  { id: "contacted", label: "Contactado", color: "bg-blue-50 border-blue-300", headerColor: "bg-gradient-to-r from-blue-100 to-blue-200", icon: Phone },
  { id: "qualified", label: "Qualificado", color: "bg-teal-50 border-teal-300", headerColor: "bg-gradient-to-r from-teal-100 to-teal-200", icon: CheckCircle2 },
  { id: "visit_scheduled", label: "Visita Agendada", color: "bg-purple-50 border-purple-300", headerColor: "bg-gradient-to-r from-purple-100 to-purple-200", icon: Calendar },
  { id: "proposal", label: "Proposta", color: "bg-amber-50 border-amber-300", headerColor: "bg-gradient-to-r from-amber-100 to-amber-200", icon: Euro },
  { id: "negotiation", label: "Negociação", color: "bg-orange-50 border-orange-300", headerColor: "bg-gradient-to-r from-orange-100 to-orange-200", icon: Building2 },
  { id: "won", label: "Ganho", color: "bg-green-50 border-green-300", headerColor: "bg-gradient-to-r from-green-100 to-green-200", icon: CheckCircle2 },
  { id: "lost", label: "Perdido", color: "bg-red-50 border-red-300", headerColor: "bg-gradient-to-r from-red-100 to-red-200", icon: XCircle }
];

export default function OpportunityKanban({ 
  opportunities, 
  onDragEnd, 
  onOpportunityClick,
  onEdit,
  onDelete 
}) {
  const [scheduleDialogOpen, setScheduleDialogOpen] = React.useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = React.useState(null);
  const [pendingStatusChange, setPendingStatusChange] = React.useState(null);

  const handleDragEnd = (result) => {
    const { destination, draggableId } = result;
    
    if (!destination) return;
    
    const newStatus = destination.droppableId;
    const opportunity = opportunities.find(o => o.id === draggableId);
    
    // Se mover para "visit_scheduled", abrir dialog para agendar
    if (newStatus === 'visit_scheduled' && opportunity) {
      setPendingStatusChange({ opportunity, newStatus });
      setSelectedOpportunity(opportunity);
      setScheduleDialogOpen(true);
    } else {
      // Processar normalmente
      onDragEnd(result);
    }
  };

  const handleAppointmentCreated = () => {
    // Processar a mudança de status pendente
    if (pendingStatusChange) {
      const { opportunity, newStatus } = pendingStatusChange;
      
      // Criar resultado fake para passar ao onDragEnd
      const fakeResult = {
        draggableId: opportunity.id,
        destination: { droppableId: newStatus }
      };
      
      onDragEnd(fakeResult);
      setPendingStatusChange(null);
    }
    
    setScheduleDialogOpen(false);
    setSelectedOpportunity(null);
    toast.success("Visita agendada e oportunidade atualizada!");
  };

  const handleAppointmentCancelled = () => {
    // Cancelar a mudança de status
    setPendingStatusChange(null);
    setScheduleDialogOpen(false);
    setSelectedOpportunity(null);
  };

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

  const calculateStageTotalValue = (stageId) => {
    return getOpportunitiesByStage(stageId).reduce((sum, o) => {
      return sum + (o.estimated_value || 0);
    }, 0);
  };

  const calculateStageStats = (stageId) => {
    const opps = getOpportunitiesByStage(stageId);
    const hot = opps.filter(o => o.qualification_status === 'hot').length;
    const warm = opps.filter(o => o.qualification_status === 'warm').length;
    const cold = opps.filter(o => o.qualification_status === 'cold').length;
    return { hot, warm, cold };
  };

  const getQualificationBadge = (status) => {
    switch (status) {
      case 'hot': return <Badge className="bg-red-100 text-red-800 text-[0.65rem] py-0 px-1.5">🔥 Hot</Badge>;
      case 'warm': return <Badge className="bg-amber-100 text-amber-800 text-[0.65rem] py-0 px-1.5">🌡️ Warm</Badge>;
      case 'cold': return <Badge className="bg-blue-100 text-blue-800 text-[0.65rem] py-0 px-1.5">❄️ Cold</Badge>;
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
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STAGES.map((stage) => {
          const stageOpportunities = getOpportunitiesByStage(stage.id);
          const stageValue = calculateStageValue(stage.id);
          const stageTotalValue = calculateStageTotalValue(stage.id);
          const stageStats = calculateStageStats(stage.id);
          const StageIcon = stage.icon;

          return (
            <div key={stage.id} className="flex-shrink-0 w-80">
              <div className={`rounded-t-lg p-4 ${stage.headerColor} border border-b-0 shadow-sm`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${stage.color} border`}>
                      <StageIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-bold text-sm block">{stage.label}</span>
                      <span className="text-xs text-slate-600">{stageOpportunities.length} oportunidade{stageOpportunities.length !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                </div>

                {/* Stats Section */}
                <div className="space-y-2 text-xs">
                  {/* Values */}
                  {stageTotalValue > 0 && (
                    <div className="bg-white/60 rounded-lg p-2 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">Valor Total:</span>
                        <span className="font-bold text-slate-900">€{Math.round(stageTotalValue).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">Ponderado:</span>
                        <span className="font-semibold text-blue-700">€{Math.round(stageValue).toLocaleString()}</span>
                      </div>
                    </div>
                  )}

                  {/* Qualification Stats */}
                  {(stageStats.hot > 0 || stageStats.warm > 0 || stageStats.cold > 0) && (
                    <div className="bg-white/60 rounded-lg p-2">
                      <div className="flex items-center gap-3 justify-center">
                        {stageStats.hot > 0 && (
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-red-500"></div>
                            <span className="font-medium text-red-700">{stageStats.hot}</span>
                          </div>
                        )}
                        {stageStats.warm > 0 && (
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                            <span className="font-medium text-amber-700">{stageStats.warm}</span>
                          </div>
                        )}
                        {stageStats.cold > 0 && (
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                            <span className="font-medium text-blue-700">{stageStats.cold}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <Droppable droppableId={stage.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`min-h-[500px] border border-t-0 rounded-b-lg p-2 transition-all duration-200 ${
                      snapshot.isDraggingOver 
                        ? 'bg-blue-100/50 border-blue-400 shadow-inner' 
                        : 'bg-slate-50/50'
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
                                className={`bg-white rounded-lg border-2 p-2 cursor-move hover:shadow-lg transition-all ${
                                  snapshot.isDragging ? 'shadow-2xl scale-105 rotate-2 border-blue-400' : 'shadow-sm border-slate-200'
                                } ${isOverdue(opp) ? 'border-red-400 bg-red-50/50' : ''}`}
                                onClick={() => onOpportunityClick(opp)}
                              >
                                {/* Header */}
                                <div className="flex items-start justify-between mb-1">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1 mb-0.5">
                                      {opp.priority === 'high' && (
                                        <Star className="w-3 h-3 text-amber-500 fill-amber-500 flex-shrink-0" />
                                      )}
                                      {opp.ref_id && (
                                        <Badge variant="outline" className="text-[0.6rem] font-mono leading-none py-0 px-1">
                                          {opp.ref_id}
                                        </Badge>
                                      )}
                                    </div>
                                    <h4 className="font-medium text-xs text-slate-900 leading-tight line-clamp-1">
                                      {opp.buyer_name}
                                    </h4>
                                  </div>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                      <Button variant="ghost" size="sm" className="h-5 w-5 p-0 flex-shrink-0">
                                        <MoreHorizontal className="w-3.5 h-3.5" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onOpportunityClick(opp); }}>
                                        <Eye className="w-4 h-4 mr-2" />
                                        Ver Detalhes
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={(e) => { 
                                        e.stopPropagation(); 
                                        setSelectedOpportunity(opp);
                                        setScheduleDialogOpen(true);
                                      }}>
                                        <Calendar className="w-4 h-4 mr-2" />
                                        Agendar Visita
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
                                <div className="flex flex-wrap gap-1 mb-1">
                                  {getQualificationBadge(opp.qualification_status)}
                                  {opp.lead_type && (
                                    <Badge className={`text-[0.65rem] py-0 px-1.5 ${
                                      opp.lead_type === 'comprador' ? 'bg-blue-100 text-blue-800 border-blue-300' : 
                                      opp.lead_type === 'vendedor' ? 'bg-green-100 text-green-800 border-green-300' : 
                                      opp.lead_type === 'parceiro_comprador' ? 'bg-purple-100 text-purple-800 border-purple-300' : 
                                      'bg-indigo-100 text-indigo-800 border-indigo-300'
                                    }`}>
                                      {opp.lead_type === 'comprador' ? 'Comprador' : 
                                       opp.lead_type === 'vendedor' ? 'Vendedor' : 
                                       opp.lead_type === 'parceiro_comprador' ? 'P. Comprador' : 'P. Vendedor'}
                                    </Badge>
                                  )}
                                </div>

                                {/* Contact Info */}
                                <div className="space-y-0.5 text-[0.65rem] text-slate-600 mb-1">
                                  {opp.buyer_email && (
                                    <div className="flex items-center gap-1 truncate">
                                      <Mail className="w-3 h-3 flex-shrink-0" />
                                      <span className="truncate">{opp.buyer_email}</span>
                                    </div>
                                  )}
                                  {opp.buyer_phone && (
                                    <div className="flex items-center gap-1">
                                      <Phone className="w-3 h-3 flex-shrink-0" />
                                      <span>{opp.buyer_phone}</span>
                                    </div>
                                  )}
                                </div>

                                {/* Value & Probability */}
                                {(opp.estimated_value || opp.probability) && (
                                  <div className="flex items-center gap-2 mt-1 pt-1 border-t">
                                    {opp.estimated_value && (
                                      <span className="text-[0.65rem] font-medium text-green-700">
                                        €{opp.estimated_value.toLocaleString()}
                                      </span>
                                    )}
                                    {opp.probability && (
                                      <Badge variant="secondary" className="text-[0.6rem] py-0 px-1">
                                        {opp.probability}%
                                      </Badge>
                                    )}
                                  </div>
                                )}

                                {/* Main Property */}
                                {opp.property_id && opp.property_title && (
                                  <div className="mt-1 pt-1 border-t" onClick={(e) => e.stopPropagation()}>
                                    <Link
                                      to={`${createPageUrl("PropertyDetails")}?id=${opp.property_id}`}
                                      className="flex items-start gap-1.5 p-1.5 bg-blue-50 hover:bg-blue-100 rounded transition-colors group"
                                    >
                                      <Building2 className="w-3.5 h-3.5 text-blue-600 flex-shrink-0 mt-0.5" />
                                      <div className="flex-1 min-w-0">
                                        <div className="text-[0.65rem] font-medium text-blue-900 line-clamp-1 group-hover:text-blue-700 leading-tight">
                                          {opp.property_title}
                                        </div>
                                        {opp.property_address && (
                                          <div className="text-[0.6rem] text-blue-700 line-clamp-1 flex items-center gap-0.5 mt-0.5">
                                            <MapPin className="w-2.5 h-2.5" />
                                            {opp.property_address}
                                          </div>
                                        )}
                                      </div>
                                      <ExternalLink className="w-3 h-3 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                                    </Link>
                                  </div>
                                )}

                                {/* Associated Properties */}
                                {Array.isArray(opp.associated_properties) && opp.associated_properties.length > 0 && (
                                  <div className={`${opp.property_id ? 'mt-0.5' : 'mt-1 pt-1 border-t'}`}>
                                    <div className="flex items-center gap-1 text-[0.65rem] text-slate-500">
                                      <Building2 className="w-3 h-3" />
                                      <span>+{opp.associated_properties.length} outro{opp.associated_properties.length !== 1 ? 's' : ''}</span>
                                    </div>
                                  </div>
                                )}

                                {/* Dates & Alerts */}
                                <div className="flex items-center gap-2 mt-1 pt-1 border-t">
                                  {opp.expected_close_date && (
                                    <div className={`flex items-center gap-1 text-[0.65rem] ${isOverdue(opp) ? 'text-red-600' : 'text-slate-500'}`}>
                                      <Calendar className="w-3 h-3" />
                                      <span>{moment(opp.expected_close_date).format('DD/MM')}</span>
                                    </div>
                                  )}
                                  {needsFollowup(opp) && (
                                    <Badge className="bg-orange-100 text-orange-800 text-[0.6rem] py-0 px-1">
                                      <AlertCircle className="w-2.5 h-2.5 mr-0.5" />
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

      {/* Schedule Visit Dialog */}
      {selectedOpportunity && (
        <CreateAppointmentDialog
          open={scheduleDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              handleAppointmentCancelled();
            } else {
              setScheduleDialogOpen(open);
            }
          }}
          opportunityId={selectedOpportunity.id}
          propertyId={selectedOpportunity.property_id}
          onSuccess={handleAppointmentCreated}
        />
      )}
    </DragDropContext>
  );
}