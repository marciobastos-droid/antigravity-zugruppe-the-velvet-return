import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle2, XCircle, Clock, Home, MapPin, Euro, Bed, Bath, Maximize, User, Eye } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function PendingApprovalsManager() {
  const queryClient = useQueryClient();
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [actionType, setActionType] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const isAuthorized = user && (user.role === 'admin' || user.user_type === 'admin' || user.user_type === 'gestor');

  const { data: pendingProperties = [], isLoading } = useQuery({
    queryKey: ['pendingProperties'],
    queryFn: () => base44.entities.Property.filter({ availability_status: 'pending_validation' }),
    enabled: isAuthorized
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: () => base44.entities.Agent.list(),
    enabled: isAuthorized
  });

  const approveMutation = useMutation({
    mutationFn: async ({ propertyId, action, feedback }) => {
      const property = pendingProperties.find(p => p.id === propertyId);
      
      // Atualizar propriedade
      await base44.entities.Property.update(propertyId, {
        availability_status: action === 'approve' ? 'available' : 'withdrawn',
        approval_status: action === 'approve' ? 'approved' : 'rejected',
        approved_by: user.email,
        approved_date: new Date().toISOString(),
        approval_feedback: feedback || undefined,
        rejection_reason: action === 'reject' ? feedback : undefined
      });

      // Notificar o criador do imóvel
      try {
        await base44.functions.invoke('notifyPropertyApproval', {
          propertyId,
          action,
          feedback,
          approvedBy: user.full_name,
          creatorEmail: property.created_by
        });
      } catch (error) {
        console.error('Error sending notification:', error);
      }

      return property;
    },
    onSuccess: (property, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pendingProperties'] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      toast.success(
        variables.action === 'approve' 
          ? `Imóvel "${property.title}" aprovado!` 
          : `Imóvel "${property.title}" rejeitado`
      );
      setSelectedProperty(null);
      setFeedback("");
      setActionType(null);
    }
  });

  const handleAction = (property, action) => {
    setSelectedProperty(property);
    setActionType(action);
  };

  const confirmAction = () => {
    if (!selectedProperty || !actionType) return;
    
    approveMutation.mutate({
      propertyId: selectedProperty.id,
      action: actionType,
      feedback
    });
  };

  if (!isAuthorized) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-slate-600">Sem permissão para aceder a aprovações</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2" />
          <p className="text-slate-600">A carregar imóveis pendentes...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Imóveis Pendentes de Aprovação</h2>
          <p className="text-slate-600">Reveja e aprove novos imóveis antes de serem publicados</p>
        </div>
        <Badge className="bg-orange-100 text-orange-700 text-lg px-4 py-2">
          <Clock className="w-4 h-4 mr-2" />
          {pendingProperties.length} pendentes
        </Badge>
      </div>

      {pendingProperties.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Tudo aprovado!
            </h3>
            <p className="text-slate-600">
              Não há imóveis pendentes de aprovação no momento
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pendingProperties.map((property) => {
            const agent = agents.find(a => a.email === property.created_by);
            
            return (
              <Card key={property.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="relative h-48 bg-slate-100">
                  {property.images?.[0] ? (
                    <img 
                      src={property.images[0]} 
                      alt={property.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Home className="w-12 h-12 text-slate-300" />
                    </div>
                  )}
                  <Badge className="absolute top-3 left-3 bg-orange-500 text-white">
                    <Clock className="w-3 h-3 mr-1" />
                    Pendente
                  </Badge>
                </div>

                <CardHeader>
                  <CardTitle className="text-lg line-clamp-2">{property.title}</CardTitle>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <MapPin className="w-4 h-4" />
                    {property.city}
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-slate-900">
                      €{property.price?.toLocaleString()}
                    </span>
                    <Badge variant="outline">
                      {property.listing_type === 'sale' ? 'Venda' : 'Arrendamento'}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-slate-600">
                    {property.bedrooms !== undefined && (
                      <span className="flex items-center gap-1">
                        <Bed className="w-4 h-4" />
                        T{property.bedrooms}
                      </span>
                    )}
                    {property.bathrooms > 0 && (
                      <span className="flex items-center gap-1">
                        <Bath className="w-4 h-4" />
                        {property.bathrooms}
                      </span>
                    )}
                    {(property.useful_area || property.square_feet) > 0 && (
                      <span className="flex items-center gap-1">
                        <Maximize className="w-4 h-4" />
                        {property.useful_area || property.square_feet}m²
                      </span>
                    )}
                  </div>

                  {agent && (
                    <div className="flex items-center gap-2 text-sm text-slate-600 p-2 bg-slate-50 rounded">
                      <User className="w-4 h-4" />
                      <span>Criado por: <strong>{agent.name || property.created_by}</strong></span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Clock className="w-3 h-3" />
                    {new Date(property.created_date).toLocaleDateString('pt-PT', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>

                  <div className="flex gap-2 pt-2 border-t">
                    <Link to={`${createPageUrl("PropertyDetails")}?id=${property.id}`} className="flex-1">
                      <Button variant="outline" className="w-full" size="sm">
                        <Eye className="w-4 h-4 mr-2" />
                        Ver
                      </Button>
                    </Link>
                    <Button
                      onClick={() => handleAction(property, 'approve')}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      size="sm"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Aprovar
                    </Button>
                    <Button
                      onClick={() => handleAction(property, 'reject')}
                      variant="outline"
                      className="flex-1 text-red-600 border-red-300 hover:bg-red-50"
                      size="sm"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Rejeitar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={!!selectedProperty && !!actionType} onOpenChange={() => {
        setSelectedProperty(null);
        setActionType(null);
        setFeedback("");
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' ? '✅ Aprovar Imóvel' : '❌ Rejeitar Imóvel'}
            </DialogTitle>
          </DialogHeader>

          {selectedProperty && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="font-semibold text-slate-900">{selectedProperty.title}</p>
                <p className="text-sm text-slate-600">{selectedProperty.city}</p>
                <p className="text-lg font-bold text-slate-900 mt-2">
                  €{selectedProperty.price?.toLocaleString()}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  {actionType === 'approve' ? 'Feedback (Opcional)' : 'Motivo da Rejeição *'}
                </label>
                <Textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder={
                    actionType === 'approve' 
                      ? "Adicione sugestões ou comentários..."
                      : "Explique porque o imóvel foi rejeitado..."
                  }
                  rows={4}
                  required={actionType === 'reject'}
                />
              </div>

              <p className="text-sm text-slate-600">
                {actionType === 'approve' 
                  ? '✓ O imóvel ficará disponível e o agente será notificado'
                  : '⚠️ O imóvel será marcado como retirado e o agente será notificado'}
              </p>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedProperty(null);
                    setActionType(null);
                    setFeedback("");
                  }}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={confirmAction}
                  disabled={approveMutation.isPending || (actionType === 'reject' && !feedback)}
                  className={`flex-1 ${
                    actionType === 'approve' 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {approveMutation.isPending ? (
                    <>A processar...</>
                  ) : (
                    actionType === 'approve' ? 'Confirmar Aprovação' : 'Confirmar Rejeição'
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}