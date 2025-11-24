import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Phone, Mail, MapPin, Building2, Star } from "lucide-react";

const stages = [
  { id: "new", label: "Novos", color: "bg-blue-500" },
  { id: "contacted", label: "Contactados", color: "bg-yellow-500" },
  { id: "scheduled", label: "Agendados", color: "bg-purple-500" },
  { id: "closed", label: "Fechados", color: "bg-green-500" }
];

export default function PipelineView({ leads, onDragEnd, onLeadClick }) {
  const getLeadsByStage = (stageId) => {
    return leads.filter(lead => lead.status === stageId);
  };

  const getQualificationIcon = (status) => {
    if (status === 'hot') return '🔥';
    if (status === 'warm') return '🌡️';
    if (status === 'cold') return '❄️';
    return '';
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stages.map((stage) => {
          const stageLeads = getLeadsByStage(stage.id);
          
          return (
            <div key={stage.id} className="flex flex-col">
              <div className={`${stage.color} text-white rounded-t-lg p-3`}>
                <h3 className="font-semibold flex items-center justify-between">
                  {stage.label}
                  <Badge variant="secondary" className="bg-white/20 text-white">
                    {stageLeads.length}
                  </Badge>
                </h3>
              </div>
              
              <Droppable droppableId={stage.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-1 p-2 space-y-2 bg-slate-50 rounded-b-lg min-h-[500px] ${
                      snapshot.isDraggingOver ? 'bg-slate-100' : ''
                    }`}
                  >
                    {stageLeads.map((lead, index) => (
                      <Draggable key={lead.id} draggableId={lead.id} index={index}>
                        {(provided, snapshot) => (
                          <Card
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`cursor-pointer hover:shadow-md transition-shadow ${
                              snapshot.isDragging ? 'shadow-xl' : ''
                            }`}
                            onClick={() => onLeadClick(lead)}
                          >
                            <CardContent className="p-3">
                              <div className="flex items-start justify-between mb-2">
                                <h4 className="font-semibold text-sm text-slate-900">
                                  {lead.buyer_name}
                                </h4>
                                <div className="flex items-center gap-1">
                                  {lead.qualification_status && (
                                    <span className="text-sm">
                                      {getQualificationIcon(lead.qualification_status)}
                                    </span>
                                  )}
                                  {lead.priority === 'high' && (
                                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                  )}
                                </div>
                              </div>

                              <div className="space-y-1 text-xs text-slate-600">
                                {lead.buyer_email && (
                                  <div className="flex items-center gap-1 truncate">
                                    <Mail className="w-3 h-3 flex-shrink-0" />
                                    <span className="truncate">{lead.buyer_email}</span>
                                  </div>
                                )}
                                {lead.buyer_phone && (
                                  <div className="flex items-center gap-1">
                                    <Phone className="w-3 h-3 flex-shrink-0" />
                                    {lead.buyer_phone}
                                  </div>
                                )}
                                {lead.location && (
                                  <div className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3 flex-shrink-0" />
                                    {lead.location}
                                  </div>
                                )}
                                {lead.property_title && (
                                  <div className="flex items-center gap-1 truncate">
                                    <Building2 className="w-3 h-3 flex-shrink-0" />
                                    <span className="truncate">{lead.property_title}</span>
                                  </div>
                                )}
                              </div>

                              <div className="mt-2 flex items-center gap-1">
                                <Badge variant="outline" className="text-xs">
                                  {lead.lead_type === 'comprador' ? 'Comprador' :
                                   lead.lead_type === 'vendedor' ? 'Vendedor' : 'Parceiro'}
                                </Badge>
                                {lead.budget && (
                                  <Badge variant="outline" className="text-xs">
                                    €{lead.budget.toLocaleString()}
                                  </Badge>
                                )}
                              </div>

                              {lead.quick_notes?.length > 0 && (
                                <p className="text-xs text-slate-500 mt-2 line-clamp-2">
                                  {lead.quick_notes[lead.quick_notes.length - 1].text}
                                </p>
                              )}
                            </CardContent>
                          </Card>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
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