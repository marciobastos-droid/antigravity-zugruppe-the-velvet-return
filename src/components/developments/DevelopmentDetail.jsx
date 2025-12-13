import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Building2, MapPin, Euro, Calendar, Home, 
  Globe, Mail, Phone, Link2, Plus, X, TrendingUp, 
  CheckCircle2, Clock, Ban, Edit, Save, Camera, Eye, Loader2, BarChart3,
  FileText, Upload, Download, Trash2
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import DevelopmentImageGallery from "./DevelopmentImageGallery";
import UnitSalesMap from "./UnitSalesMap";
import AddUnitsDialog from "./AddUnitsDialog";
import EditUnitDialog from "./EditUnitDialog";

export default function DevelopmentDetail({ development, open, onOpenChange, properties }) {
  const queryClient = useQueryClient();
  const [linkPropertyId, setLinkPropertyId] = React.useState("");
  const [editMode, setEditMode] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [uploadingBrochure, setUploadingBrochure] = React.useState(false);
  const [addUnitsOpen, setAddUnitsOpen] = React.useState(false);
  const [editingUnit, setEditingUnit] = React.useState(null);
  const [formData, setFormData] = React.useState({
    name: development.name || "",
    description: development.description || "",
    developer: development.developer || "",
    address: development.address || "",
    city: development.city || "",
    postal_code: development.postal_code || "",
    status: development.status || "planning",
    total_units: development.total_units || "",
    available_units: development.available_units || "",
    price_from: development.price_from || "",
    price_to: development.price_to || "",
    completion_date: development.completion_date || "",
    images: development.images || [],
    amenities: development.amenities || [],
    features: development.features || [],
    website_url: development.website_url || "",
    brochures: development.brochures || [],
    contact_email: development.contact_email || "",
    contact_phone: development.contact_phone || "",
    notes: development.notes || ""
  });

  // Reset form when development changes
  React.useEffect(() => {
    setFormData({
      name: development.name || "",
      description: development.description || "",
      developer: development.developer || "",
      address: development.address || "",
      city: development.city || "",
      postal_code: development.postal_code || "",
      status: development.status || "planning",
      total_units: development.total_units || "",
      available_units: development.available_units || "",
      price_from: development.price_from || "",
      price_to: development.price_to || "",
      completion_date: development.completion_date || "",
      images: development.images || [],
      amenities: development.amenities || [],
      features: development.features || [],
      website_url: development.website_url || "",
      brochures: development.brochures || [],
      contact_email: development.contact_email || "",
      contact_phone: development.contact_phone || "",
      notes: development.notes || ""
    });
    setEditMode(false);
  }, [development]);

  const updateImagesMutation = useMutation({
    mutationFn: async (newImages) => {
      await base44.entities.Development.update(development.id, { images: newImages });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['developments'] });
    }
  });

  const updateDevelopmentMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.Development.update(development.id, data);
    },
    onSuccess: () => {
      toast.success("Empreendimento atualizado");
      queryClient.invalidateQueries({ queryKey: ['developments'] });
      setEditMode(false);
    }
  });

  const handleImageUpload = async (e) => {
    const files = e.target.files;
    if (!files?.length) return;

    setUploading(true);
    try {
      const newImages = [...formData.images];
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        newImages.push(file_url);
      }
      setFormData({ ...formData, images: newImages });
      toast.success("Imagens carregadas");
    } catch (error) {
      toast.error("Erro ao carregar imagens");
    }
    setUploading(false);
  };

  const handleBrochureUpload = async (e) => {
    const files = e.target.files;
    if (!files?.length) return;

    setUploadingBrochure(true);
    try {
      const newBrochures = [...formData.brochures];
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        newBrochures.push({
          name: file.name,
          url: file_url,
          upload_date: new Date().toISOString(),
          file_size: file.size,
          language: "pt"
        });
      }
      setFormData({ ...formData, brochures: newBrochures });
      toast.success(`${files.length} brochura${files.length > 1 ? 's' : ''} carregada${files.length > 1 ? 's' : ''}`);
    } catch (error) {
      toast.error("Erro ao carregar brochuras");
    }
    setUploadingBrochure(false);
  };

  const removeBrochure = (index) => {
    const newBrochures = formData.brochures.filter((_, i) => i !== index);
    setFormData({ ...formData, brochures: newBrochures });
  };

  const handleSave = () => {
    const data = {
      ...formData,
      total_units: formData.total_units ? Number(formData.total_units) : undefined,
      available_units: formData.available_units ? Number(formData.available_units) : undefined,
      price_from: formData.price_from ? Number(formData.price_from) : undefined,
      price_to: formData.price_to ? Number(formData.price_to) : undefined
    };
    updateDevelopmentMutation.mutate(data);
  };

  const linkedProperties = properties.filter(p => p.development_id === development.id);
  const availableProperties = properties.filter(p => !p.development_id);

  // Estatísticas de vendas/arrendamentos
  const stats = React.useMemo(() => {
    const total = linkedProperties.length;
    const sold = linkedProperties.filter(p => p.status === 'sold').length;
    const rented = linkedProperties.filter(p => p.status === 'rented').length;
    const active = linkedProperties.filter(p => p.status === 'active').length;
    const pending = linkedProperties.filter(p => p.status === 'pending').length;
    const offMarket = linkedProperties.filter(p => p.status === 'off_market').length;
    
    const totalValue = linkedProperties.reduce((sum, p) => sum + (p.price || 0), 0);
    const soldValue = linkedProperties.filter(p => p.status === 'sold').reduce((sum, p) => sum + (p.price || 0), 0);
    const rentedValue = linkedProperties.filter(p => p.status === 'rented').reduce((sum, p) => sum + (p.price || 0), 0);
    
    const progressPercent = total > 0 ? Math.round(((sold + rented) / total) * 100) : 0;
    
    return { total, sold, rented, active, pending, offMarket, totalValue, soldValue, rentedValue, progressPercent };
  }, [linkedProperties]);

  const linkMutation = useMutation({
    mutationFn: async ({ propertyId, developmentId, developmentName }) => {
      await base44.entities.Property.update(propertyId, {
        development_id: developmentId,
        development_name: developmentName
      });
    },
    onSuccess: () => {
      toast.success("Imóvel vinculado ao empreendimento");
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      setLinkPropertyId("");
    }
  });

  const unlinkMutation = useMutation({
    mutationFn: async (propertyId) => {
      await base44.entities.Property.update(propertyId, {
        development_id: null,
        development_name: null
      });
    },
    onSuccess: () => {
      toast.success("Imóvel desvinculado");
      queryClient.invalidateQueries({ queryKey: ['properties'] });
    }
  });

  const handleLinkProperty = () => {
    if (!linkPropertyId) return;
    linkMutation.mutate({
      propertyId: linkPropertyId,
      developmentId: development.id,
      developmentName: development.name
    });
  };

  const statusLabels = {
    planning: "Em Planeamento",
    under_construction: "Em Construção",
    completed: "Concluído",
    selling: "Em Comercialização"
  };

  const statusColors = {
    planning: "bg-amber-100 text-amber-800",
    under_construction: "bg-blue-100 text-blue-800",
    completed: "bg-green-100 text-green-800",
    selling: "bg-purple-100 text-purple-800"
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-3">
              <Building2 className="w-6 h-6 text-blue-600" />
              {development.name}
              <Badge className={statusColors[development.status]}>
                {statusLabels[development.status]}
              </Badge>
            </DialogTitle>
            {development.source === 'entity' && (
              <Button
                variant={editMode ? "default" : "outline"}
                size="sm"
                onClick={() => setEditMode(!editMode)}
                className={editMode ? "bg-blue-600 hover:bg-blue-700" : ""}
              >
                <Edit className="w-4 h-4 mr-2" />
                {editMode ? "Cancelar Edição" : "Editar"}
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* Progresso de Vendas */}
        {linkedProperties.length > 0 && (
          <Card className="mt-4 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-green-900 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Progresso de Comercialização
                </h4>
                <span className="text-2xl font-bold text-green-700">{stats.progressPercent}%</span>
              </div>
              
              <Progress value={stats.progressPercent} className="h-3 mb-4" />
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white rounded-lg p-3 text-center border border-green-200">
                  <div className="flex items-center justify-center gap-1 text-green-600 mb-1">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-xs font-medium">Vendidos</span>
                  </div>
                  <span className="text-xl font-bold text-green-700">{stats.sold}</span>
                  {stats.soldValue > 0 && (
                    <p className="text-xs text-green-600">€{stats.soldValue.toLocaleString()}</p>
                  )}
                </div>
                
                <div className="bg-white rounded-lg p-3 text-center border border-purple-200">
                  <div className="flex items-center justify-center gap-1 text-purple-600 mb-1">
                    <Home className="w-4 h-4" />
                    <span className="text-xs font-medium">Arrendados</span>
                  </div>
                  <span className="text-xl font-bold text-purple-700">{stats.rented}</span>
                  {stats.rentedValue > 0 && (
                    <p className="text-xs text-purple-600">€{stats.rentedValue.toLocaleString()}/mês</p>
                  )}
                </div>
                
                <div className="bg-white rounded-lg p-3 text-center border border-blue-200">
                  <div className="flex items-center justify-center gap-1 text-blue-600 mb-1">
                    <Clock className="w-4 h-4" />
                    <span className="text-xs font-medium">Disponíveis</span>
                  </div>
                  <span className="text-xl font-bold text-blue-700">{stats.active}</span>
                </div>
                
                <div className="bg-white rounded-lg p-3 text-center border border-slate-200">
                  <div className="flex items-center justify-center gap-1 text-slate-600 mb-1">
                    <Ban className="w-4 h-4" />
                    <span className="text-xs font-medium">Reservados</span>
                  </div>
                  <span className="text-xl font-bold text-slate-700">{stats.pending + stats.offMarket}</span>
                </div>
              </div>

              {stats.totalValue > 0 && (
                <div className="mt-3 pt-3 border-t border-green-200 text-center">
                  <p className="text-sm text-green-700">
                    Valor Total do Empreendimento: <span className="font-bold">€{stats.totalValue.toLocaleString()}</span>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="details" className="mt-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="details">Detalhes</TabsTrigger>
            <TabsTrigger value="properties">Unidades ({linkedProperties.length})</TabsTrigger>
            <TabsTrigger value="brochures">Brochuras ({formData.brochures?.length || 0})</TabsTrigger>
            <TabsTrigger value="salesmap">Mapa de Vendas</TabsTrigger>
            <TabsTrigger value="gallery">Galeria</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="mt-4">
            {editMode ? (
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Nome do Empreendimento *</Label>
                    <Input
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="Residências do Parque"
                    />
                  </div>
                  <div>
                    <Label>Promotor/Construtor</Label>
                    <div className="flex gap-2">
                      <Select 
                        value={formData.developer_contact_id || ""} 
                        onValueChange={handleDeveloperSelect}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Selecionar da lista de contactos..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={null}>Sem promotor</SelectItem>
                          {allContacts.filter(c => c.contact_type === 'partner' || c.company_name).map(c => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.company_name || c.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        value={formData.developer}
                        onChange={(e) => setFormData({...formData, developer: e.target.value})}
                        placeholder="Ou escrever manualmente"
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <Label>Descrição</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Descrição do empreendimento..."
                    rows={4}
                  />
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label>Morada</Label>
                    <Input
                      value={formData.address}
                      onChange={(e) => setFormData({...formData, address: e.target.value})}
                      placeholder="Rua exemplo"
                    />
                  </div>
                  <div>
                    <Label>Cidade *</Label>
                    <Input
                      required
                      value={formData.city}
                      onChange={(e) => setFormData({...formData, city: e.target.value})}
                      placeholder="Lisboa"
                    />
                  </div>
                  <div>
                    <Label>Código Postal</Label>
                    <Input
                      value={formData.postal_code}
                      onChange={(e) => setFormData({...formData, postal_code: e.target.value})}
                      placeholder="1000-000"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label>Estado</Label>
                    <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="planning">Em Planeamento</SelectItem>
                        <SelectItem value="under_construction">Em Construção</SelectItem>
                        <SelectItem value="completed">Concluído</SelectItem>
                        <SelectItem value="selling">Em Comercialização</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Total de Unidades</Label>
                    <Input
                      type="number"
                      value={formData.total_units}
                      onChange={(e) => setFormData({...formData, total_units: e.target.value})}
                      placeholder="50"
                    />
                  </div>
                  <div>
                    <Label>Unidades Disponíveis</Label>
                    <Input
                      type="number"
                      value={formData.available_units}
                      onChange={(e) => setFormData({...formData, available_units: e.target.value})}
                      placeholder="25"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label>Preço Desde (€)</Label>
                    <Input
                      type="number"
                      value={formData.price_from}
                      onChange={(e) => setFormData({...formData, price_from: e.target.value})}
                      placeholder="250000"
                    />
                  </div>
                  <div>
                    <Label>Preço Até (€)</Label>
                    <Input
                      type="number"
                      value={formData.price_to}
                      onChange={(e) => setFormData({...formData, price_to: e.target.value})}
                      placeholder="500000"
                    />
                  </div>
                  <div>
                    <Label>Data de Conclusão</Label>
                    <Input
                      type="date"
                      value={formData.completion_date}
                      onChange={(e) => setFormData({...formData, completion_date: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label>Website</Label>
                    <Input
                      value={formData.website_url}
                      onChange={(e) => setFormData({...formData, website_url: e.target.value})}
                      placeholder="https://..."
                    />
                  </div>
                  <div>
                    <Label>Email de Contacto</Label>
                    <Input
                      type="email"
                      value={formData.contact_email}
                      onChange={(e) => setFormData({...formData, contact_email: e.target.value})}
                      placeholder="info@exemplo.com"
                    />
                  </div>
                  <div>
                    <Label>Telefone de Contacto</Label>
                    <Input
                      value={formData.contact_phone}
                      onChange={(e) => setFormData({...formData, contact_phone: e.target.value})}
                      placeholder="+351 912 345 678"
                    />
                  </div>
                </div>

                <div>
                  <Label>Imagens</Label>
                  <div className="mt-2">
                    <div className="flex flex-wrap gap-2 mb-2">
                      {formData.images.map((img, idx) => (
                        <div key={idx} className="relative">
                          <img src={img} alt="" className="w-24 h-24 object-cover rounded-lg" />
                          <button
                            type="button"
                            onClick={() => setFormData({...formData, images: formData.images.filter((_, i) => i !== idx)})}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      className="hidden"
                      id="dev-detail-images"
                    />
                    <label htmlFor="dev-detail-images">
                      <Button type="button" variant="outline" size="sm" asChild disabled={uploading}>
                        <span>
                          <Camera className="w-4 h-4 mr-2" />
                          {uploading ? "A carregar..." : "Adicionar Imagens"}
                        </span>
                      </Button>
                    </label>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Comodidades (separadas por vírgula)</Label>
                    <Input
                      value={formData.amenities.join(", ")}
                      onChange={(e) => setFormData({...formData, amenities: e.target.value.split(",").map(a => a.trim()).filter(Boolean)})}
                      placeholder="Piscina, Ginásio, Jardim"
                    />
                  </div>
                  <div>
                    <Label>Características (separadas por vírgula)</Label>
                    <Input
                      value={formData.features.join(", ")}
                      onChange={(e) => setFormData({...formData, features: e.target.value.split(",").map(f => f.trim()).filter(Boolean)})}
                      placeholder="Vista mar, Varandas amplas"
                    />
                  </div>
                </div>

                <div>
                  <Label>Notas Internas</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    placeholder="Notas internas..."
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setEditMode(false)}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleSave}
                    disabled={updateDevelopmentMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {updateDevelopmentMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        A guardar...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Guardar Alterações
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold text-slate-900">Informação Geral</h4>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-slate-500 mt-0.5" />
                      <span>
                        {development.address && `${development.address}, `}
                        {development.city}
                        {development.postal_code && ` - ${development.postal_code}`}
                      </span>
                    </div>

                    {development.developer && (
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-slate-500" />
                        <span>Promotor: {development.developer}</span>
                      </div>
                    )}

                    {(development.price_from || development.price_to) && (
                      <div className="flex items-center gap-2">
                        <Euro className="w-4 h-4 text-slate-500" />
                        <span>
                          Preços: {development.price_from ? `€${development.price_from.toLocaleString()}` : ''}
                          {development.price_from && development.price_to ? ' - ' : ''}
                          {development.price_to ? `€${development.price_to.toLocaleString()}` : ''}
                        </span>
                      </div>
                    )}

                    {development.completion_date && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-500" />
                        <span>Conclusão: {format(new Date(development.completion_date), "dd/MM/yyyy")}</span>
                      </div>
                    )}

                    {development.total_units && (
                      <div className="flex items-center gap-2">
                        <Home className="w-4 h-4 text-slate-500" />
                        <span>{development.available_units || 0} de {development.total_units} unidades disponíveis</span>
                      </div>
                    )}
                  </div>

                  {development.description && (
                    <div className="mt-4">
                      <h5 className="font-medium text-slate-900 mb-2">Descrição</h5>
                      <p className="text-sm text-slate-600 whitespace-pre-wrap">{development.description}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold text-slate-900">Contactos</h4>
                  
                  <div className="space-y-2 text-sm">
                    {development.website_url && (
                      <a 
                        href={development.website_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-blue-600 hover:underline"
                      >
                        <Globe className="w-4 h-4" />
                        Website
                      </a>
                    )}
                    
                    {development.contact_email && (
                      <a 
                        href={`mailto:${development.contact_email}`}
                        className="flex items-center gap-2 text-blue-600 hover:underline"
                      >
                        <Mail className="w-4 h-4" />
                        {development.contact_email}
                      </a>
                    )}
                    
                    {development.contact_phone && (
                      <a 
                        href={`tel:${development.contact_phone}`}
                        className="flex items-center gap-2 text-blue-600 hover:underline"
                      >
                        <Phone className="w-4 h-4" />
                        {development.contact_phone}
                      </a>
                    )}
                  </div>

                  {development.amenities?.length > 0 && (
                    <div className="mt-4">
                      <h5 className="font-medium text-slate-900 mb-2">Comodidades</h5>
                      <div className="flex flex-wrap gap-2">
                        {development.amenities.map((amenity, idx) => (
                          <Badge key={idx} variant="secondary">{amenity}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {development.features?.length > 0 && (
                    <div className="mt-4">
                      <h5 className="font-medium text-slate-900 mb-2">Características</h5>
                      <div className="flex flex-wrap gap-2">
                        {development.features.map((feature, idx) => (
                          <Badge key={idx} variant="outline">{feature}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="properties" className="mt-4">
            <div className="space-y-4">
              {/* Quick Actions */}
              <div className="flex gap-2">
                <Button 
                  onClick={() => setAddUnitsOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Unidades
                </Button>
              </div>

              {/* Linked Properties */}
              {linkedProperties.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <Home className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhum imóvel vinculado a este empreendimento</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-slate-900">{linkedProperties.length} Imóveis Vinculados</h4>
                    <Badge variant="outline">
                      Total: €{stats.totalValue.toLocaleString()}
                    </Badge>
                  </div>
                  
                  {linkedProperties.map((prop) => {
                    const propertyStatusLabels = {
                      active: "Ativo",
                      pending: "Pendente",
                      sold: "Vendido",
                      rented: "Arrendado",
                      off_market: "Desativado"
                    };
                    
                    const propertyStatusColors = {
                      active: "bg-green-100 text-green-800",
                      pending: "bg-yellow-100 text-yellow-800",
                      sold: "bg-blue-100 text-blue-800",
                      rented: "bg-purple-100 text-purple-800",
                      off_market: "bg-slate-100 text-slate-800"
                    };
                    
                    return (
                      <Card key={prop.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            {prop.images?.[0] ? (
                              <img 
                                src={prop.images[0]} 
                                alt={prop.title}
                                className="w-24 h-20 object-cover rounded-lg"
                              />
                            ) : (
                              <div className="w-24 h-20 bg-slate-100 rounded-lg flex items-center justify-center">
                                <Home className="w-8 h-8 text-slate-300" />
                              </div>
                            )}
                            
                            <div className="flex-1">
                              <h4 className="font-medium text-slate-900 mb-1">{prop.title}</h4>
                              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                                {prop.ref_id && (
                                  <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded">
                                    {prop.ref_id}
                                  </span>
                                )}
                                {prop.unit_number && <span>Fração: {prop.unit_number}</span>}
                                <span className="font-semibold text-green-600">€{prop.price?.toLocaleString()}</span>
                                {prop.bedrooms !== undefined && <span>T{prop.bedrooms}</span>}
                                {prop.useful_area && <span>{prop.useful_area}m²</span>}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <Badge className={propertyStatusColors[prop.status]}>
                                {propertyStatusLabels[prop.status]}
                              </Badge>

                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingUnit(prop)}
                                title="Editar Unidade"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>

                              <Link to={`${createPageUrl("PropertyDetails")}?id=${prop.id}`} target="_blank">
                                <Button variant="outline" size="sm">
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </Link>

                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => unlinkMutation.mutate(prop.id)}
                                disabled={unlinkMutation.isPending}
                                className="text-red-600 hover:bg-red-50"
                                title="Desvincular"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="brochures" className="mt-4">
            <div className="space-y-4">
              {editMode ? (
                <div>
                  <div className="border-2 border-dashed rounded-lg p-6 text-center hover:bg-slate-50 transition-colors mb-4">
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      multiple
                      onChange={handleBrochureUpload}
                      className="hidden"
                      id="brochure-upload"
                      disabled={uploadingBrochure}
                    />
                    <label htmlFor="brochure-upload" className="cursor-pointer">
                      <Upload className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                      <p className="text-sm text-slate-600 mb-1">
                        {uploadingBrochure 
                          ? "A carregar..." 
                          : "Clique para adicionar brochuras"
                        }
                      </p>
                      <p className="text-xs text-slate-500">PDF, DOC, DOCX (múltiplos ficheiros)</p>
                    </label>
                  </div>

                  <div className="space-y-2">
                    {formData.brochures?.map((brochure, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-white border rounded-lg">
                        <div className="flex items-center gap-3 flex-1">
                          <FileText className="w-5 h-5 text-blue-600" />
                          <div>
                            <p className="font-medium text-sm">{brochure.name}</p>
                            <p className="text-xs text-slate-500">
                              {(brochure.file_size / 1024 / 1024).toFixed(2)} MB • {format(new Date(brochure.upload_date), 'dd/MM/yyyy')}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <a href={brochure.url} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="sm">
                              <Download className="w-4 h-4" />
                            </Button>
                          </a>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-red-600 hover:bg-red-50"
                            onClick={() => removeBrochure(idx)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {formData.brochures?.length === 0 && (
                      <p className="text-center text-slate-500 py-8">Nenhuma brochura adicionada</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {development.brochures?.length > 0 ? (
                    development.brochures.map((brochure, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 border rounded-lg hover:bg-slate-100 transition-colors">
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-blue-600" />
                          <div>
                            <p className="font-medium text-sm">{brochure.name}</p>
                            <p className="text-xs text-slate-500">
                              {(brochure.file_size / 1024 / 1024).toFixed(2)} MB • {format(new Date(brochure.upload_date), 'dd/MM/yyyy')}
                            </p>
                          </div>
                        </div>
                        <a href={brochure.url} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" size="sm">
                            <Download className="w-4 h-4 mr-2" />
                            Descarregar
                          </Button>
                        </a>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12 text-slate-500">
                      <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>Nenhuma brochura disponível</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="salesmap" className="mt-4">
            <UnitSalesMap properties={linkedProperties} development={development} />
          </TabsContent>

          <TabsContent value="gallery" className="mt-4">
            <DevelopmentImageGallery
              images={development.images || []}
              developmentId={development.id}
              onImagesReordered={(newImages) => updateImagesMutation.mutate(newImages)}
            />
          </TabsContent>
        </Tabs>

        {/* Add Units Dialog */}
        <AddUnitsDialog
          open={addUnitsOpen}
          onOpenChange={setAddUnitsOpen}
          development={development}
        />

        {/* Edit Unit Dialog */}
        <EditUnitDialog
          open={!!editingUnit}
          onOpenChange={(open) => !open && setEditingUnit(null)}
          unit={editingUnit}
          development={development}
        />
      </DialogContent>
    </Dialog>
  );
}