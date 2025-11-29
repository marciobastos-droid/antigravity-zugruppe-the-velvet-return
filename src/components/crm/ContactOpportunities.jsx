import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus, Euro, MapPin, Calendar, Target, Trash2, Edit,
  Phone, Mail, Building2, TrendingUp, Flame, Snowflake, ThermometerSun
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import OpportunityFormDialog from "../opportunities/OpportunityFormDialog";

export default function ContactOpportunities({ contact }) {
  const queryClient = useQueryClient();
  const [formDialogOpen, setFormDialogOpen] = React.useState(false);
  const [editingOpportunity, setEditingOpportunity] = React.useState(null);

  const { data: opportunities = [], isLoading } = useQuery({
    queryKey: ['contactOpportunities', contact?.id],
    queryFn: async () => {
      if (!contact?.id) return [];
      const allOpps = await base44.entities.Opportunity.list('-updated_date');
      return allOpps.filter(o => 
        o.profile_id === contact.id || 
        o.contact_id === contact.id ||
        o.buyer_email === contact.email
      );
    },
    enabled: !!contact?.id
  });

  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list()
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Opportunity.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contactOpportunities', contact?.id] });
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      toast.success("Oportunidade atualizada");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Opportunity.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contactOpportunities', contact?.id] });
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      toast.success("Oportunidade eliminada");
    }
  });

  const handleEdit = (opp) => {
    setEditingOpportunity(opp);
    setFormDialogOpen(true);
  };

  const handleDelete = (opp) => {
    if (window.confirm(`Eliminar oportunidade "${opp.property_title || opp.lead_type}"?`)) {
      deleteMutation.mutate(opp.id);
    }
  };

  const handleStatusChange = (oppId, newStatus) => {
    updateMutation.mutate({ id: oppId, data: { status: newStatus } });
  };

  const handleCloseFormDialog = () => {
    setFormDialogOpen(false);
    setEditingOpportunity(null);
  };

  const statusConfig = {
    new: { label: 'Novo', color: 'bg-blue-100 text-blue-800 border-blue-200' },
    contacted: { label: 'Contactado', color: 'bg-amber-100 text-amber-800 border-amber-200' },
    qualified: { label: 'Qualificado', color: 'bg-cyan-100 text-cyan-800 border-cyan-200' },
    proposal: { label: 'Proposta', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
    negotiation: { label: 'Negociação', color: 'bg-purple-100 text-purple-800 border-purple-200' },
    won: { label: 'Ganho', color: 'bg-green-100 text-green-800 border-green-200' },
    lost: { label: 'Perdido', color: 'bg-red-100 text-red-800 border-red-200' }
  };

  const leadTypeLabels = {
    comprador: { label: 'Comprador', icon: '🏠' },
    vendedor: { label: 'Vendedor', icon: '🏷️' },
    parceiro_comprador: { label: 'Parceiro Comprador', icon: '🤝' },
    parceiro_vendedor: { label: 'Parceiro Vendedor', icon: '🤝' }
  };

  const qualificationIcons = {
    hot: { icon: Flame, color: 'text-red-500', bg: 'bg-red-50' },
    warm: { icon: ThermometerSun, color: 'text-amber-500', bg: 'bg-amber-50' },
    cold: { icon: Snowflake, color: 'text-blue-500', bg: 'bg-blue-50' }
  };

  // Calculate stats
  const stats = {
    total: opportunities.length,
    active: opportunities.filter(o => !['won', 'lost'].includes(o.status)).length,
    won: opportunities.filter(o => o.status === 'won').length,
    totalValue: opportunities.reduce((sum, o) => sum + (o.estimated_value || 0), 0)
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="font-semibold text-slate-900">Oportunidades</h3>
          <div className="flex gap-2">
            <Badge variant="outline" className="text-xs">
              {stats.total} total
            </Badge>
            <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
              {stats.active} ativas
            </Badge>
            {stats.won > 0 && (
              <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                {stats.won} ganhas
              </Badge>
            )}
            {stats.totalValue > 0 && (
              <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                €{(stats.totalValue / 1000).toFixed(0)}k
              </Badge>
            )}
          </div>
        </div>
        <Button 
          onClick={() => { setEditingOpportunity(null); setFormDialogOpen(true); }}
          className="bg-amber-600 hover:bg-amber-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Oportunidade
        </Button>
      </div>

      {/* Opportunities List */}
      {opportunities.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Target className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Sem oportunidades</h3>
            <p className="text-slate-600 mb-4">Crie a primeira oportunidade para este contacto</p>
            <Button 
              onClick={() => { setEditingOpportunity(null); setFormDialogOpen(true); }}
              className="bg-amber-600 hover:bg-amber-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nova Oportunidade
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {opportunities.map((opp) => {
            const status = statusConfig[opp.status] || statusConfig.new;
            const leadType = leadTypeLabels[opp.lead_type] || leadTypeLabels.comprador;
            const qualification = qualificationIcons[opp.qualification_status];
            const QualIcon = qualification?.icon;
            const property = opp.property_id ? properties.find(p => p.id === opp.property_id) : null;

            return (
              <Card key={opp.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    {/* Main Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">{leadType.icon}</span>
                        <h4 className="font-semibold text-slate-900 truncate">
                          {opp.property_title || leadType.label}
                        </h4>
                        {opp.priority === 'high' && (
                          <Badge className="bg-red-100 text-red-700 text-xs">Prioritário</Badge>
                        )}
                        {qualification && QualIcon && (
                          <div className={`p-1 rounded ${qualification.bg}`}>
                            <QualIcon className={`w-4 h-4 ${qualification.color}`} />
                          </div>
                        )}
                      </div>

                      {/* Property Preview */}
                      {property && (
                        <div className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg mb-3">
                          {property.images?.[0] ? (
                            <img src={property.images[0]} alt="" className="w-16 h-12 object-cover rounded" />
                          ) : (
                            <div className="w-16 h-12 bg-slate-200 rounded flex items-center justify-center">
                              <Building2 className="w-6 h-6 text-slate-400" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">{property.title}</p>
                            <p className="text-xs text-slate-500">
                              {property.city} • €{property.price?.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Details */}
                      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                        {opp.estimated_value > 0 && (
                          <span className="flex items-center gap-1">
                            <Euro className="w-4 h-4 text-green-600" />
                            €{opp.estimated_value.toLocaleString()}
                          </span>
                        )}
                        {opp.budget > 0 && (
                          <span className="flex items-center gap-1 text-slate-500">
                            <TrendingUp className="w-4 h-4" />
                            Orç: €{opp.budget.toLocaleString()}
                          </span>
                        )}
                        {opp.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4 text-red-500" />
                            {opp.location}
                          </span>
                        )}
                        {opp.expected_close_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4 text-blue-500" />
                            {format(new Date(opp.expected_close_date), "dd/MM/yyyy")}
                          </span>
                        )}
                      </div>

                      {/* Message */}
                      {opp.message && (
                        <p className="text-sm text-slate-500 mt-2 line-clamp-2">{opp.message}</p>
                      )}

                      {/* Dates */}
                      <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
                        <span>Criado: {format(new Date(opp.created_date), "dd/MM/yyyy")}</span>
                        {opp.probability && (
                          <span>Probabilidade: {opp.probability}%</span>
                        )}
                      </div>
                    </div>

                    {/* Right Side - Status & Actions */}
                    <div className="flex flex-col items-end gap-2">
                      <Select
                        value={opp.status}
                        onValueChange={(value) => handleStatusChange(opp.id, value)}
                      >
                        <SelectTrigger className={`w-32 h-8 text-xs ${status.color}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">Novo</SelectItem>
                          <SelectItem value="contacted">Contactado</SelectItem>
                          <SelectItem value="qualified">Qualificado</SelectItem>
                          <SelectItem value="proposal">Proposta</SelectItem>
                          <SelectItem value="negotiation">Negociação</SelectItem>
                          <SelectItem value="won">Ganho</SelectItem>
                          <SelectItem value="lost">Perdido</SelectItem>
                        </SelectContent>
                      </Select>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(opp)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="w-4 h-4 text-slate-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(opp)}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Opportunity Form Dialog */}
      <OpportunityFormDialog
        opportunity={editingOpportunity}
        open={formDialogOpen}
        onOpenChange={handleCloseFormDialog}
        prefillContact={!editingOpportunity ? contact : undefined}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ['contactOpportunities', contact?.id] });
          queryClient.invalidateQueries({ queryKey: ['opportunities'] });
        }}
      />
    </div>
  );
}