import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Settings, Plus, Edit, Trash2, Save, X, Building2,
  Tag, Palette, GripVertical, Check, Loader2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

// Categorias predefinidas do sistema
const DEFAULT_PROPERTY_TYPES = [
  { value: 'apartment', label: 'Apartamento', color: 'bg-blue-100 text-blue-800' },
  { value: 'house', label: 'Moradia', color: 'bg-green-100 text-green-800' },
  { value: 'land', label: 'Terreno', color: 'bg-amber-100 text-amber-800' },
  { value: 'building', label: 'Prédio', color: 'bg-purple-100 text-purple-800' },
  { value: 'farm', label: 'Quinta/Herdade', color: 'bg-emerald-100 text-emerald-800' },
  { value: 'store', label: 'Loja', color: 'bg-pink-100 text-pink-800' },
  { value: 'warehouse', label: 'Armazém', color: 'bg-slate-100 text-slate-800' },
  { value: 'office', label: 'Escritório', color: 'bg-cyan-100 text-cyan-800' },
  { value: 'hotel', label: 'Hotel', color: 'bg-indigo-100 text-indigo-800' },
  { value: 'shop', label: 'Comércio', color: 'bg-rose-100 text-rose-800' }
];

const DEFAULT_AVAILABILITY_STATUS = [
  { value: 'available', label: 'Disponível', color: 'bg-green-100 text-green-800' },
  { value: 'sold', label: 'Vendido', color: 'bg-red-100 text-red-800' },
  { value: 'reserved', label: 'Reservado', color: 'bg-amber-100 text-amber-800' },
  { value: 'rented', label: 'Arrendado', color: 'bg-blue-100 text-blue-800' },
  { value: 'prospecting', label: 'Em Prospecção', color: 'bg-purple-100 text-purple-800' },
  { value: 'withdrawn', label: 'Retirado', color: 'bg-slate-100 text-slate-800' },
  { value: 'pending_validation', label: 'Por Validar', color: 'bg-orange-100 text-orange-800' }
];

const DEFAULT_LEAD_SOURCES = [
  { value: 'facebook_ads', label: 'Facebook Ads', color: 'bg-blue-100 text-blue-800' },
  { value: 'website', label: 'Website', color: 'bg-green-100 text-green-800' },
  { value: 'referral', label: 'Referência', color: 'bg-amber-100 text-amber-800' },
  { value: 'direct_contact', label: 'Contacto Direto', color: 'bg-purple-100 text-purple-800' },
  { value: 'real_estate_portal', label: 'Portal Imobiliário', color: 'bg-cyan-100 text-cyan-800' },
  { value: 'networking', label: 'Networking', color: 'bg-pink-100 text-pink-800' },
  { value: 'google_ads', label: 'Google Ads', color: 'bg-red-100 text-red-800' },
  { value: 'instagram', label: 'Instagram', color: 'bg-fuchsia-100 text-fuchsia-800' },
  { value: 'linkedin', label: 'LinkedIn', color: 'bg-sky-100 text-sky-800' },
  { value: 'email_marketing', label: 'Email Marketing', color: 'bg-indigo-100 text-indigo-800' },
  { value: 'other', label: 'Outro', color: 'bg-slate-100 text-slate-800' }
];

export default function AdminCategoriesTab() {
  const queryClient = useQueryClient();
  const [activeCategory, setActiveCategory] = useState('property_types');

  // Fetch properties to count usage
  const { data: properties = [] } = useQuery({
    queryKey: ['categoriesProperties'],
    queryFn: () => base44.entities.Property.list(),
  });

  const { data: opportunities = [] } = useQuery({
    queryKey: ['categoriesOpportunities'],
    queryFn: () => base44.entities.Opportunity.list(),
  });

  // Fetch custom tags
  const { data: tags = [] } = useQuery({
    queryKey: ['customTags'],
    queryFn: () => base44.entities.Tag.list(),
  });

  // Count usage for each category
  const getPropertyTypeCount = (type) => 
    properties.filter(p => p.property_type === type).length;
  
  const getStatusCount = (status) => 
    properties.filter(p => p.availability_status === status).length;
  
  const getLeadSourceCount = (source) => 
    opportunities.filter(o => o.lead_source === source).length;

  // Custom tags management
  const [newTag, setNewTag] = useState({ name: '', color: 'bg-blue-100 text-blue-800', category: 'property' });
  const [editingTag, setEditingTag] = useState(null);

  const createTagMutation = useMutation({
    mutationFn: (data) => base44.entities.Tag.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customTags'] });
      setNewTag({ name: '', color: 'bg-blue-100 text-blue-800', category: 'property' });
      toast.success("Tag criada com sucesso");
    }
  });

  const updateTagMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Tag.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customTags'] });
      setEditingTag(null);
      toast.success("Tag atualizada");
    }
  });

  const deleteTagMutation = useMutation({
    mutationFn: (id) => base44.entities.Tag.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customTags'] });
      toast.success("Tag removida");
    }
  });

  const colorOptions = [
    'bg-blue-100 text-blue-800',
    'bg-green-100 text-green-800',
    'bg-amber-100 text-amber-800',
    'bg-red-100 text-red-800',
    'bg-purple-100 text-purple-800',
    'bg-pink-100 text-pink-800',
    'bg-cyan-100 text-cyan-800',
    'bg-indigo-100 text-indigo-800',
    'bg-slate-100 text-slate-800',
    'bg-emerald-100 text-emerald-800'
  ];

  return (
    <div className="space-y-6">
      <Tabs value={activeCategory} onValueChange={setActiveCategory}>
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
          <TabsTrigger value="property_types">Tipos de Imóvel</TabsTrigger>
          <TabsTrigger value="availability">Disponibilidade</TabsTrigger>
          <TabsTrigger value="lead_sources">Fontes de Lead</TabsTrigger>
          <TabsTrigger value="custom_tags">Tags Personalizadas</TabsTrigger>
        </TabsList>

        {/* Property Types */}
        <TabsContent value="property_types">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Tipos de Imóvel
              </CardTitle>
              <CardDescription>
                Categorias de imóveis disponíveis no sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {DEFAULT_PROPERTY_TYPES.map((type) => {
                  const count = getPropertyTypeCount(type.value);
                  return (
                    <div 
                      key={type.value}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Badge className={type.color}>{type.label}</Badge>
                      </div>
                      <span className="text-sm text-slate-500">{count} imóveis</span>
                    </div>
                  );
                })}
              </div>
              <p className="text-sm text-slate-500 mt-4">
                💡 Os tipos de imóvel são definidos no esquema da base de dados e não podem ser alterados diretamente.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Availability Status */}
        <TabsContent value="availability">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="w-5 h-5" />
                Estados de Disponibilidade
              </CardTitle>
              <CardDescription>
                Estados possíveis para a disponibilidade de imóveis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {DEFAULT_AVAILABILITY_STATUS.map((status) => {
                  const count = getStatusCount(status.value);
                  return (
                    <div 
                      key={status.value}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                    >
                      <Badge className={status.color}>{status.label}</Badge>
                      <span className="text-sm text-slate-500">{count} imóveis</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Lead Sources */}
        <TabsContent value="lead_sources">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="w-5 h-5" />
                Fontes de Leads
              </CardTitle>
              <CardDescription>
                Origens possíveis para os leads/oportunidades
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {DEFAULT_LEAD_SOURCES.map((source) => {
                  const count = getLeadSourceCount(source.value);
                  return (
                    <div 
                      key={source.value}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                    >
                      <Badge className={source.color}>{source.label}</Badge>
                      <span className="text-sm text-slate-500">{count} leads</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Custom Tags */}
        <TabsContent value="custom_tags">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Tags Personalizadas
              </CardTitle>
              <CardDescription>
                Crie tags personalizadas para organizar imóveis e leads
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Add New Tag */}
              <div className="p-4 bg-slate-50 rounded-lg mb-6">
                <h4 className="font-medium mb-3">Nova Tag</h4>
                <div className="flex flex-wrap gap-3">
                  <Input
                    placeholder="Nome da tag"
                    value={newTag.name}
                    onChange={(e) => setNewTag({ ...newTag, name: e.target.value })}
                    className="flex-1 min-w-[200px]"
                  />
                  <div className="flex gap-1">
                    {colorOptions.slice(0, 5).map((color) => (
                      <button
                        key={color}
                        onClick={() => setNewTag({ ...newTag, color })}
                        className={`w-8 h-8 rounded-full ${color.split(' ')[0]} ${
                          newTag.color === color ? 'ring-2 ring-offset-2 ring-blue-500' : ''
                        }`}
                      />
                    ))}
                  </div>
                  <Button
                    onClick={() => createTagMutation.mutate(newTag)}
                    disabled={!newTag.name || createTagMutation.isPending}
                  >
                    {createTagMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <><Plus className="w-4 h-4 mr-2" />Adicionar</>
                    )}
                  </Button>
                </div>
              </div>

              {/* Existing Tags */}
              <div className="space-y-2">
                {tags.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <Tag className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p>Ainda não existem tags personalizadas</p>
                  </div>
                ) : (
                  tags.map((tag) => (
                    <div 
                      key={tag.id}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                    >
                      {editingTag?.id === tag.id ? (
                        <div className="flex items-center gap-3 flex-1">
                          <Input
                            value={editingTag.name}
                            onChange={(e) => setEditingTag({ ...editingTag, name: e.target.value })}
                            className="max-w-[200px]"
                          />
                          <div className="flex gap-1">
                            {colorOptions.slice(0, 5).map((color) => (
                              <button
                                key={color}
                                onClick={() => setEditingTag({ ...editingTag, color })}
                                className={`w-6 h-6 rounded-full ${color.split(' ')[0]} ${
                                  editingTag.color === color ? 'ring-2 ring-offset-1 ring-blue-500' : ''
                                }`}
                              />
                            ))}
                          </div>
                          <Button
                            size="sm"
                            onClick={() => updateTagMutation.mutate({
                              id: editingTag.id,
                              data: { name: editingTag.name, color: editingTag.color }
                            })}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingTag(null)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <Badge className={tag.color || 'bg-slate-100 text-slate-800'}>
                            {tag.name}
                          </Badge>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingTag(tag)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-600"
                              onClick={() => {
                                if (confirm("Remover esta tag?")) {
                                  deleteTagMutation.mutate(tag.id);
                                }
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}