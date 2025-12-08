import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { 
  Building2, Plus, Search, MapPin, Euro, 
  Edit, Trash2, Eye, Home, Camera, TrendingUp
} from "lucide-react";
import { toast } from "sonner";
import DevelopmentDetail from "@/components/developments/DevelopmentDetail";

export default function DevelopmentsTab() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [developerFilter, setDeveloperFilter] = React.useState("all");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingDev, setEditingDev] = React.useState(null);
  const [selectedDev, setSelectedDev] = React.useState(null);
  const [uploading, setUploading] = React.useState(false);

  const [formData, setFormData] = React.useState({
    name: "",
    description: "",
    developer: "",
    developer_contact_id: "",
    developer_email: "",
    developer_phone: "",
    address: "",
    city: "",
    postal_code: "",
    status: "planning",
    total_units: "",
    available_units: "",
    price_from: "",
    price_to: "",
    completion_date: "",
    images: [],
    amenities: [],
    features: [],
    website_url: "",
    contact_email: "",
    contact_phone: "",
    notes: ""
  });

  const { data: developments = [], isLoading } = useQuery({
    queryKey: ['developments'],
    queryFn: () => base44.entities.Development.list('-created_date')
  });

  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list()
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ['clientContacts'],
    queryFn: () => base44.entities.ClientContact.list()
  });

  // Imóveis com tipo "development" que não estão vinculados a um empreendimento existente
  const propertyDevelopments = properties.filter(p => 
    p.property_type === 'development' && !p.development_id
  );

  // Combinar empreendimentos da entidade Development com imóveis do tipo "development"
  const allDevelopments = [
    ...developments.map(d => ({ ...d, source: 'entity' })),
    ...propertyDevelopments.map(p => ({
      id: p.id,
      name: p.title,
      description: p.description,
      address: p.address,
      city: p.city,
      postal_code: p.zip_code,
      status: p.status === 'active' ? 'selling' : 'planning',
      price_from: p.price,
      images: p.images,
      source: 'property',
      property_data: p
    }))
  ];

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Development.create(data),
    onSuccess: () => {
      toast.success("Empreendimento criado");
      queryClient.invalidateQueries({ queryKey: ['developments'] });
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Development.update(id, data),
    onSuccess: () => {
      toast.success("Empreendimento atualizado");
      queryClient.invalidateQueries({ queryKey: ['developments'] });
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Development.delete(id),
    onSuccess: () => {
      toast.success("Empreendimento eliminado");
      queryClient.invalidateQueries({ queryKey: ['developments'] });
    }
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      developer: "",
      developer_contact_id: "",
      developer_email: "",
      developer_phone: "",
      address: "",
      city: "",
      postal_code: "",
      status: "planning",
      total_units: "",
      available_units: "",
      price_from: "",
      price_to: "",
      completion_date: "",
      images: [],
      amenities: [],
      features: [],
      website_url: "",
      contact_email: "",
      contact_phone: "",
      notes: ""
    });
    setEditingDev(null);
    setDialogOpen(false);
  };

  const handleEdit = (dev) => {
    setEditingDev(dev);
    setFormData({
      name: dev.name || "",
      description: dev.description || "",
      developer: dev.developer || "",
      developer_contact_id: dev.developer_contact_id || "",
      developer_email: dev.developer_email || "",
      developer_phone: dev.developer_phone || "",
      address: dev.address || "",
      city: dev.city || "",
      postal_code: dev.postal_code || "",
      status: dev.status || "planning",
      total_units: dev.total_units || "",
      available_units: dev.available_units || "",
      price_from: dev.price_from || "",
      price_to: dev.price_to || "",
      completion_date: dev.completion_date || "",
      images: dev.images || [],
      amenities: dev.amenities || [],
      features: dev.features || [],
      website_url: dev.website_url || "",
      contact_email: dev.contact_email || "",
      contact_phone: dev.contact_phone || "",
      notes: dev.notes || ""
    });
    setDialogOpen(true);
  };

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

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const data = {
      ...formData,
      total_units: formData.total_units ? Number(formData.total_units) : undefined,
      available_units: formData.available_units ? Number(formData.available_units) : undefined,
      price_from: formData.price_from ? Number(formData.price_from) : undefined,
      price_to: formData.price_to ? Number(formData.price_to) : undefined
    };

    if (editingDev) {
      updateMutation.mutate({ id: editingDev.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (id, name) => {
    if (window.confirm(`Eliminar empreendimento "${name}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  const getPropertiesForDevelopment = (devId) => {
    return properties.filter(p => p.development_id === devId);
  };

  // Obter lista única de promotores
  const developers = React.useMemo(() => {
    const devs = new Set();
    allDevelopments.forEach(d => {
      if (d.developer) devs.add(d.developer);
    });
    return Array.from(devs).sort();
  }, [allDevelopments]);

  const filteredDevelopments = allDevelopments.filter(d => {
    const matchesSearch = searchTerm === "" ||
      d.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.developer?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || d.status === statusFilter;
    const matchesDeveloper = developerFilter === "all" || d.developer === developerFilter;
    return matchesSearch && matchesStatus && matchesDeveloper;
  });

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <p className="text-slate-600">{allDevelopments.length} empreendimentos registados</p>
        <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setDialogOpen(open); }}>
          <DialogTrigger asChild>
            <Button className="bg-slate-900 hover:bg-slate-800">
              <Plus className="w-4 h-4 mr-2" />
              Novo Empreendimento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingDev ? "Editar Empreendimento" : "Novo Empreendimento"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
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
                  <Select 
                    value={formData.developer_contact_id || "manual"} 
                    onValueChange={(value) => {
                      if (value === "manual") {
                        setFormData({
                          ...formData, 
                          developer_contact_id: "",
                          developer: "",
                          developer_email: "",
                          developer_phone: ""
                        });
                      } else {
                        const contact = contacts.find(c => c.id === value);
                        if (contact) {
                          setFormData({
                            ...formData,
                            developer_contact_id: value,
                            developer: contact.full_name || contact.company_name || "",
                            developer_email: contact.email || "",
                            developer_phone: contact.phone || ""
                          });
                        }
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar da lista ou inserir manualmente" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">✍️ Inserir Manualmente</SelectItem>
                      {contacts.filter(c => c.contact_type === 'promotor' || c.partnership_type === 'promotor').map(contact => (
                        <SelectItem key={contact.id} value={contact.id}>
                          {contact.full_name || contact.company_name} {contact.company_name && contact.full_name ? `(${contact.company_name})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {(!formData.developer_contact_id || formData.developer_contact_id === "manual") && (
                    <Input
                      value={formData.developer}
                      onChange={(e) => setFormData({...formData, developer: e.target.value})}
                      placeholder="Nome da construtora"
                      className="mt-2"
                    />
                  )}
                  {formData.developer_contact_id && formData.developer_contact_id !== "manual" && (
                    <div className="mt-2 p-2 bg-green-50 rounded-lg text-xs text-green-700">
                      ✓ {formData.developer} {formData.developer_email && `• ${formData.developer_email}`}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <Label>Descrição</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Descrição do empreendimento..."
                  rows={3}
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

              <div>
                <Label>Imagens</Label>
                <div className="mt-2">
                  <div className="flex flex-wrap gap-2 mb-2">
                    {formData.images.map((img, idx) => (
                      <div key={idx} className="relative">
                        <img src={img} alt="" className="w-20 h-20 object-cover rounded-lg" />
                        <button
                          type="button"
                          onClick={() => setFormData({...formData, images: formData.images.filter((_, i) => i !== idx)})}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
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
                    id="dev-images-tab"
                  />
                  <label htmlFor="dev-images-tab">
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
                  rows={2}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="button" variant="outline" onClick={resetForm} className="flex-1">
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1 bg-slate-900 hover:bg-slate-800">
                  {editingDev ? "Atualizar" : "Criar Empreendimento"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Pesquisar por nome, cidade ou promotor..."
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Estados</SelectItem>
                  <SelectItem value="planning">Em Planeamento</SelectItem>
                  <SelectItem value="under_construction">Em Construção</SelectItem>
                  <SelectItem value="completed">Concluído</SelectItem>
                  <SelectItem value="selling">Em Comercialização</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select value={developerFilter} onValueChange={setDeveloperFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Promotor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Promotores</SelectItem>
                  {developers.map(dev => (
                    <SelectItem key={dev} value={dev}>{dev}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Developments Grid */}
      {filteredDevelopments.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Building2 className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">Nenhum empreendimento</h3>
            <p className="text-slate-600">Crie o primeiro empreendimento para começar</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDevelopments.map((dev) => {
            const devProperties = getPropertiesForDevelopment(dev.id);

            // Calcular progresso de vendas
            const sold = devProperties.filter(p => p.status === 'sold').length;
            const rented = devProperties.filter(p => p.status === 'rented').length;
            const total = devProperties.length;
            const progressPercent = total > 0 ? Math.round(((sold + rented) / total) * 100) : 0;

            return (
              <Card key={dev.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                {dev.images?.[0] ? (
                  <div className="aspect-video overflow-hidden">
                    <img 
                      src={dev.images[0]} 
                      alt={dev.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="aspect-video bg-slate-100 flex items-center justify-center">
                    <Building2 className="w-16 h-16 text-slate-300" />
                  </div>
                )}

                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-semibold text-slate-900">{dev.name}</h3>
                    <Badge className={statusColors[dev.status]}>
                      {statusLabels[dev.status]}
                    </Badge>
                  </div>

                  <div className="space-y-1 text-sm text-slate-600 mb-3">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {dev.city}
                    </div>
                    {dev.developer && (
                      <div className="flex items-center gap-1">
                        <Building2 className="w-4 h-4" />
                        {dev.developer}
                      </div>
                    )}
                    {(dev.price_from || dev.price_to) && (
                      <div className="flex items-center gap-1">
                        <Euro className="w-4 h-4" />
                        {dev.price_from ? `€${dev.price_from.toLocaleString()}` : ''}
                        {dev.price_from && dev.price_to ? ' - ' : ''}
                        {dev.price_to ? `€${dev.price_to.toLocaleString()}` : ''}
                      </div>
                    )}
                  </div>

                  {/* Progresso de Vendas */}
                  {total > 0 && (
                    <div className="mb-3 p-2 bg-slate-50 rounded-lg">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="flex items-center gap-1 text-slate-600">
                          <TrendingUp className="w-3 h-3" />
                          Progresso
                        </span>
                        <span className="font-semibold text-green-600">{progressPercent}%</span>
                      </div>
                      <Progress value={progressPercent} className="h-2" />
                      <div className="flex justify-between text-xs mt-1 text-slate-500">
                        <span>{sold} vendidos</span>
                        <span>{rented} arrendados</span>
                        <span>{total - sold - rented} disponíveis</span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-xs text-slate-500 mb-4">
                    <span className="flex items-center gap-1">
                      <Home className="w-3 h-3" />
                      {devProperties.length} imóveis vinculados
                    </span>
                    {dev.total_units && (
                      <span>
                        {dev.available_units || 0}/{dev.total_units} disponíveis
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => setSelectedDev(dev)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Ver
                    </Button>
                    {dev.source === 'entity' && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleDelete(dev.id, dev.name)}
                        className="text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                    {dev.source === 'property' && (
                      <Badge variant="outline" className="text-xs">
                        Via Imóvel
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Development Detail Dialog */}
      {selectedDev && (
        <DevelopmentDetail
          development={selectedDev}
          open={!!selectedDev}
          onOpenChange={(open) => !open && setSelectedDev(null)}
          properties={properties}
        />
      )}
    </div>
  );
}