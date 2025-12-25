import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Users, Plus, Edit, Trash2, Target, Filter, Mail,
  Loader2, RefreshCw, TrendingUp, Eye, Download, Send
} from "lucide-react";
import { toast } from "sonner";

export default function ClientSegmentation() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSegment, setEditingSegment] = useState(null);
  const [viewingSegment, setViewingSegment] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "#3b82f6",
    auto_update: true,
    criteria: {
      budget_min: "",
      budget_max: "",
      locations: [],
      property_types: [],
      listing_type: "",
      lead_sources: [],
      qualification_status: [],
      last_contact_days: "",
      tags: []
    }
  });

  const { data: segments = [], isLoading } = useQuery({
    queryKey: ['clientSegments'],
    queryFn: () => base44.entities.ClientSegment.list('-created_date')
  });

  const { data: opportunities = [] } = useQuery({
    queryKey: ['opportunities'],
    queryFn: () => base44.entities.Opportunity.list()
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['buyerProfiles'],
    queryFn: () => base44.entities.BuyerProfile.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ClientSegment.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientSegments'] });
      toast.success("Segmento criado");
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ClientSegment.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientSegments'] });
      toast.success("Segmento atualizado");
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ClientSegment.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientSegments'] });
      toast.success("Segmento eliminado");
    }
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      color: "#3b82f6",
      auto_update: true,
      criteria: {
        budget_min: "",
        budget_max: "",
        locations: [],
        property_types: [],
        listing_type: "",
        lead_sources: [],
        qualification_status: [],
        last_contact_days: "",
        tags: []
      }
    });
    setEditingSegment(null);
    setDialogOpen(false);
  };

  const handleEdit = (segment) => {
    setEditingSegment(segment);
    setFormData({
      name: segment.name,
      description: segment.description || "",
      color: segment.color || "#3b82f6",
      auto_update: segment.auto_update ?? true,
      criteria: segment.criteria || {}
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.name) {
      toast.error("Nome é obrigatório");
      return;
    }

    const data = {
      ...formData,
      criteria: {
        ...formData.criteria,
        budget_min: formData.criteria.budget_min ? Number(formData.criteria.budget_min) : undefined,
        budget_max: formData.criteria.budget_max ? Number(formData.criteria.budget_max) : undefined,
        last_contact_days: formData.criteria.last_contact_days ? Number(formData.criteria.last_contact_days) : undefined
      },
      member_count: calculateMatches(formData.criteria).length,
      last_updated: new Date().toISOString()
    };

    if (editingSegment) {
      updateMutation.mutate({ id: editingSegment.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const calculateMatches = (criteria) => {
    const allClients = [...(opportunities || []), ...(profiles || [])];
    
    return allClients.filter(client => {
      // Budget filter
      const budget = client.budget || client.budget_max || 0;
      if (criteria.budget_min && budget < criteria.budget_min) return false;
      if (criteria.budget_max && budget > criteria.budget_max) return false;

      // Locations filter
      if (criteria.locations?.length > 0) {
        const clientLocations = client.locations || [client.location];
        const hasMatch = criteria.locations.some(loc => 
          clientLocations.some(cl => cl?.toLowerCase().includes(loc.toLowerCase()))
        );
        if (!hasMatch) return false;
      }

      // Property types filter
      if (criteria.property_types?.length > 0) {
        const clientTypes = client.property_types || [client.property_type_interest];
        const hasMatch = criteria.property_types.some(type =>
          clientTypes.some(ct => ct?.toLowerCase().includes(type.toLowerCase()))
        );
        if (!hasMatch) return false;
      }

      // Listing type filter
      if (criteria.listing_type && criteria.listing_type !== 'both') {
        if (client.listing_type !== criteria.listing_type) return false;
      }

      // Lead sources filter
      if (criteria.lead_sources?.length > 0) {
        if (!criteria.lead_sources.includes(client.lead_source)) return false;
      }

      // Qualification filter
      if (criteria.qualification_status?.length > 0) {
        if (!criteria.qualification_status.includes(client.qualification_status)) return false;
      }

      // Last contact filter
      if (criteria.last_contact_days) {
        if (!client.last_contact_date) return true; // Include never contacted
        const daysSince = Math.floor((Date.now() - new Date(client.last_contact_date)) / (1000 * 60 * 60 * 24));
        if (daysSince < criteria.last_contact_days) return false;
      }

      // Tags filter
      if (criteria.tags?.length > 0) {
        const clientTags = client.tags || [];
        const hasMatch = criteria.tags.some(tag => clientTags.includes(tag));
        if (!hasMatch) return false;
      }

      return true;
    });
  };

  const exportSegment = (segment) => {
    const matches = calculateMatches(segment.criteria);
    const csv = [
      ['Nome', 'Email', 'Telefone', 'Orçamento', 'Localização', 'Origem'].join(';'),
      ...matches.map(c => [
        c.buyer_name || c.full_name || '',
        c.buyer_email || c.email || '',
        c.buyer_phone || c.phone || '',
        c.budget || c.budget_max || '',
        c.location || c.locations?.join(', ') || '',
        c.lead_source || ''
      ].join(';'))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `segmento_${segment.name.replace(/\s/g, '_')}.csv`);
    link.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Target className="w-6 h-6 text-blue-600" />
            Segmentação de Clientes
          </h2>
          <p className="text-slate-600 mt-1">Crie segmentos personalizados para campanhas direcionadas</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Novo Segmento
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Segmentos Ativos</p>
                <p className="text-2xl font-bold text-blue-600">{segments.length}</p>
              </div>
              <Target className="w-8 h-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total de Membros</p>
                <p className="text-2xl font-bold text-green-600">
                  {segments.reduce((sum, s) => sum + (s.member_count || 0), 0)}
                </p>
              </div>
              <Users className="w-8 h-8 text-green-200" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Clientes Totais</p>
                <p className="text-2xl font-bold text-purple-600">
                  {opportunities.length + profiles.length}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Segments List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </div>
      ) : segments.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Target className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Sem segmentos</h3>
            <p className="text-slate-600 mb-4">Crie o primeiro segmento para começar</p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Criar Segmento
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {segments.map(segment => {
            const matches = calculateMatches(segment.criteria);
            
            return (
              <Card key={segment.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: segment.color || '#3b82f6' }}
                      />
                      <CardTitle className="text-lg">{segment.name}</CardTitle>
                    </div>
                    <Badge className="bg-blue-100 text-blue-800">
                      {matches.length} membros
                    </Badge>
                  </div>
                  {segment.description && (
                    <p className="text-sm text-slate-600 mt-2">{segment.description}</p>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Criteria Summary */}
                  <div className="space-y-1 text-xs text-slate-600">
                    {segment.criteria.budget_min && (
                      <div>💰 Orçamento: €{segment.criteria.budget_min.toLocaleString()} - €{segment.criteria.budget_max?.toLocaleString() || '∞'}</div>
                    )}
                    {segment.criteria.locations?.length > 0 && (
                      <div>📍 {segment.criteria.locations.slice(0, 2).join(', ')}{segment.criteria.locations.length > 2 ? '...' : ''}</div>
                    )}
                    {segment.criteria.property_types?.length > 0 && (
                      <div>🏠 {segment.criteria.property_types.join(', ')}</div>
                    )}
                    {segment.criteria.qualification_status?.length > 0 && (
                      <div>🔥 {segment.criteria.qualification_status.map(q => q === 'hot' ? 'Quente' : q === 'warm' ? 'Morno' : 'Frio').join(', ')}</div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => setViewingSegment(segment)}
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      Ver
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(segment)}
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => exportSegment(segment)}
                    >
                      <Download className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (confirm(`Eliminar "${segment.name}"?`)) {
                          deleteMutation.mutate(segment.id);
                        }
                      }}
                      className="text-red-600"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSegment ? 'Editar Segmento' : 'Novo Segmento'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nome do Segmento *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Ex: Compradores Lisboa Alto Orçamento"
                />
              </div>
              <div>
                <Label>Cor</Label>
                <Input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({...formData, color: e.target.value})}
                />
              </div>
            </div>

            <div>
              <Label>Descrição</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Descrição do segmento..."
                rows={2}
              />
            </div>

            {/* Criteria */}
            <div className="space-y-4 border-t pt-4">
              <h4 className="font-semibold flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Critérios de Segmentação
              </h4>

              {/* Budget Range */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Orçamento Mínimo (€)</Label>
                  <Input
                    type="number"
                    value={formData.criteria.budget_min}
                    onChange={(e) => setFormData({
                      ...formData,
                      criteria: {...formData.criteria, budget_min: e.target.value}
                    })}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label className="text-xs">Orçamento Máximo (€)</Label>
                  <Input
                    type="number"
                    value={formData.criteria.budget_max}
                    onChange={(e) => setFormData({
                      ...formData,
                      criteria: {...formData.criteria, budget_max: e.target.value}
                    })}
                    placeholder="1000000"
                  />
                </div>
              </div>

              {/* Locations */}
              <div>
                <Label className="text-xs">Localizações (separadas por vírgula)</Label>
                <Input
                  value={formData.criteria.locations?.join(', ') || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    criteria: {
                      ...formData.criteria,
                      locations: e.target.value.split(',').map(l => l.trim()).filter(Boolean)
                    }
                  })}
                  placeholder="Lisboa, Porto, Cascais"
                />
              </div>

              {/* Property Types */}
              <div>
                <Label className="text-xs">Tipos de Imóvel</Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {['apartment', 'house', 'land', 'commercial'].map(type => (
                    <div key={type} className="flex items-center gap-2">
                      <Checkbox
                        checked={formData.criteria.property_types?.includes(type)}
                        onCheckedChange={(checked) => {
                          const current = formData.criteria.property_types || [];
                          setFormData({
                            ...formData,
                            criteria: {
                              ...formData.criteria,
                              property_types: checked 
                                ? [...current, type]
                                : current.filter(t => t !== type)
                            }
                          });
                        }}
                      />
                      <Label className="text-xs capitalize">{type}</Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Listing Type */}
              <div>
                <Label className="text-xs">Tipo de Negócio</Label>
                <Select
                  value={formData.criteria.listing_type || 'all'}
                  onValueChange={(v) => setFormData({
                    ...formData,
                    criteria: {...formData.criteria, listing_type: v === 'all' ? '' : v}
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="sale">Venda</SelectItem>
                    <SelectItem value="rent">Arrendamento</SelectItem>
                    <SelectItem value="both">Ambos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Qualification Status */}
              <div>
                <Label className="text-xs">Qualificação</Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {['hot', 'warm', 'cold'].map(qual => (
                    <div key={qual} className="flex items-center gap-2">
                      <Checkbox
                        checked={formData.criteria.qualification_status?.includes(qual)}
                        onCheckedChange={(checked) => {
                          const current = formData.criteria.qualification_status || [];
                          setFormData({
                            ...formData,
                            criteria: {
                              ...formData.criteria,
                              qualification_status: checked
                                ? [...current, qual]
                                : current.filter(q => q !== qual)
                            }
                          });
                        }}
                      />
                      <Label className="text-xs">
                        {qual === 'hot' ? '🔥 Quente' : qual === 'warm' ? '🌡️ Morno' : '❄️ Frio'}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Last Contact Days */}
              <div>
                <Label className="text-xs">Sem contacto há mais de (dias)</Label>
                <Input
                  type="number"
                  value={formData.criteria.last_contact_days}
                  onChange={(e) => setFormData({
                    ...formData,
                    criteria: {...formData.criteria, last_contact_days: e.target.value}
                  })}
                  placeholder="Ex: 7"
                />
              </div>

              {/* Live Preview */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm font-medium text-blue-900">
                  Preview: {calculateMatches(formData.criteria).length} clientes correspondem aos critérios
                </p>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={resetForm}>Cancelar</Button>
              <Button onClick={handleSubmit} className="bg-blue-600 hover:bg-blue-700">
                {editingSegment ? 'Atualizar' : 'Criar'} Segmento
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Segment Members Dialog */}
      <Dialog open={!!viewingSegment} onOpenChange={(open) => !open && setViewingSegment(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: viewingSegment?.color || '#3b82f6' }}
              />
              {viewingSegment?.name}
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="h-[500px] mt-4">
            <div className="space-y-2 pr-4">
              {viewingSegment && calculateMatches(viewingSegment.criteria).map(client => (
                <Card key={client.id}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{client.buyer_name || client.full_name}</h4>
                        <div className="flex items-center gap-3 text-xs text-slate-600 mt-1">
                          {client.buyer_email && <span>{client.buyer_email}</span>}
                          {client.budget && <span>€{client.budget.toLocaleString()}</span>}
                          {client.location && <span>📍 {client.location}</span>}
                        </div>
                      </div>
                      {client.qualification_status && (
                        <Badge className={
                          client.qualification_status === 'hot' ? 'bg-red-100 text-red-800' :
                          client.qualification_status === 'warm' ? 'bg-amber-100 text-amber-800' :
                          'bg-blue-100 text-blue-800'
                        }>
                          {client.qualification_status === 'hot' ? '🔥' :
                           client.qualification_status === 'warm' ? '🌡️' : '❄️'}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => exportSegment(viewingSegment)}>
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
            <Button onClick={() => {
              // Navigate to email campaigns with this segment
              toast.info("Funcionalidade de campanha disponível em breve");
            }}>
              <Send className="w-4 h-4 mr-2" />
              Criar Campanha
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}