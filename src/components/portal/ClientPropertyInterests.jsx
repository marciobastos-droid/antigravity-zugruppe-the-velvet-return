import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, MapPin, Bed, Bath, Maximize, Euro, Star, MessageSquare, Eye } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";

const statusLabels = {
  suggested: "Sugerido",
  interested: "Interessado",
  visited: "Visitado",
  not_interested: "Não Interessado",
  negotiating: "Em Negociação"
};

const statusColors = {
  suggested: "bg-blue-100 text-blue-800",
  interested: "bg-green-100 text-green-800",
  visited: "bg-purple-100 text-purple-800",
  not_interested: "bg-slate-100 text-slate-800",
  negotiating: "bg-amber-100 text-amber-800"
};

export default function ClientPropertyInterests({ userEmail, isAgent = false }) {
  const queryClient = useQueryClient();
  const [editingNoteId, setEditingNoteId] = React.useState(null);
  const [noteText, setNoteText] = React.useState("");

  // Get client contact
  const { data: contact } = useQuery({
    queryKey: ['clientContact', userEmail],
    queryFn: async () => {
      const contacts = await base44.entities.ClientContact.filter({ email: userEmail });
      return contacts[0] || null;
    },
    enabled: !!userEmail
  });

  const { data: interests = [] } = useQuery({
    queryKey: ['clientPropertyInterests', contact?.id],
    queryFn: () => base44.entities.ClientPropertyInterest.filter({ contact_id: contact.id }, '-created_date'),
    enabled: !!contact?.id
  });

  const updateInterestMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ClientPropertyInterest.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientPropertyInterests'] });
      toast.success("Atualizado!");
      setEditingNoteId(null);
    }
  });

  const handleRatingChange = (interestId, rating) => {
    updateInterestMutation.mutate({
      id: interestId,
      data: { client_rating: rating }
    });
  };

  const handleStatusChange = (interestId, status) => {
    updateInterestMutation.mutate({
      id: interestId,
      data: { status }
    });
  };

  const handleSaveNote = (interestId) => {
    updateInterestMutation.mutate({
      id: interestId,
      data: { client_notes: noteText }
    });
  };

  if (!contact) {
    return null;
  }

  if (interests.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Imóveis Selecionados para Si
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Sparkles className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600">
              O seu agente ainda não selecionou imóveis específicos para si
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Imóveis Selecionados para Si
          </span>
          <Badge variant="outline">{interests.length}</Badge>
        </CardTitle>
        <p className="text-sm text-slate-600 mt-1">
          Imóveis escolhidos pelo seu agente com base nas suas preferências
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {interests.map((interest) => (
            <Card key={interest.id} className="border-2 hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex gap-4">
                  {interest.property_image && (
                    <Link to={`${createPageUrl("PropertyDetails")}?id=${interest.property_id}`}>
                      <img 
                        src={interest.property_image} 
                        alt={interest.property_title}
                        className="w-32 h-32 object-cover rounded-lg hover:opacity-90 transition-opacity"
                      />
                    </Link>
                  )}
                  
                  <div className="flex-1 space-y-3">
                    <div>
                      <Link to={`${createPageUrl("PropertyDetails")}?id=${interest.property_id}`}>
                        <h3 className="font-semibold text-lg hover:text-blue-600 transition-colors">
                          {interest.property_title}
                        </h3>
                      </Link>
                      <div className="flex items-center gap-2 mt-1 text-sm text-slate-600">
                        <MapPin className="w-4 h-4" />
                        {interest.property_address}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xl font-bold text-blue-600">
                          €{interest.property_price?.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Agent Notes */}
                    {interest.agent_notes && (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-xs font-semibold text-blue-900 mb-1 flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" />
                          Nota do Agente:
                        </p>
                        <p className="text-sm text-blue-800">{interest.agent_notes}</p>
                      </div>
                    )}

                    {/* Client Controls */}
                    <div className="space-y-3 pt-3 border-t">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Estado:</Label>
                        <Select 
                          value={interest.status} 
                          onValueChange={(v) => handleStatusChange(interest.id, v)}
                          disabled={updateInterestMutation.isPending}
                        >
                          <SelectTrigger className="w-48">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="suggested">Sugerido</SelectItem>
                            <SelectItem value="interested">Interessado</SelectItem>
                            <SelectItem value="visited">Visitado</SelectItem>
                            <SelectItem value="not_interested">Não Interessado</SelectItem>
                            <SelectItem value="negotiating">Em Negociação</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-sm mb-2 block">Avalie este imóvel:</Label>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((rating) => (
                            <button
                              key={rating}
                              onClick={() => handleRatingChange(interest.id, rating)}
                              className="p-1 hover:scale-110 transition-transform"
                              disabled={updateInterestMutation.isPending}
                            >
                              <Star 
                                className={`w-6 h-6 ${
                                  interest.client_rating >= rating 
                                    ? 'text-amber-400 fill-amber-400' 
                                    : 'text-slate-300'
                                }`} 
                              />
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Client Notes */}
                      <div>
                        <Label className="text-sm mb-2 block">As Suas Notas:</Label>
                        {editingNoteId === interest.id ? (
                          <div className="space-y-2">
                            <Textarea
                              value={noteText}
                              onChange={(e) => setNoteText(e.target.value)}
                              placeholder="Adicione as suas observações sobre este imóvel..."
                              rows={3}
                              className="text-sm"
                            />
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                onClick={() => handleSaveNote(interest.id)}
                                disabled={updateInterestMutation.isPending}
                              >
                                Guardar
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => {
                                  setEditingNoteId(null);
                                  setNoteText("");
                                }}
                              >
                                Cancelar
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div
                            onClick={() => {
                              setEditingNoteId(interest.id);
                              setNoteText(interest.client_notes || "");
                            }}
                            className="p-3 bg-slate-50 rounded border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors min-h-[60px]"
                          >
                            {interest.client_notes ? (
                              <p className="text-sm text-slate-700">{interest.client_notes}</p>
                            ) : (
                              <p className="text-sm text-slate-400 italic">Clique para adicionar notas...</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <Link to={`${createPageUrl("PropertyDetails")}?id=${interest.property_id}`}>
                      <Button variant="outline" className="w-full mt-3">
                        <Eye className="w-4 h-4 mr-2" />
                        Ver Detalhes Completos
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}