import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Building2, Plus, Search, MapPin, Phone, Mail, Calendar, 
  Euro, Users, TrendingUp, Edit, Trash2, Eye, Globe,
  FileText, BarChart3, AlertCircle, CheckCircle2, Clock, XCircle, Grid3X3, List
} from "lucide-react";
import FranchiseMatrix from "@/components/franchising/FranchiseMatrix";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const statusConfig = {
  active: { label: "Ativa", color: "bg-green-100 text-green-800 border-green-200", icon: CheckCircle2 },
  pending: { label: "Pendente", color: "bg-amber-100 text-amber-800 border-amber-200", icon: Clock },
  suspended: { label: "Suspensa", color: "bg-red-100 text-red-800 border-red-200", icon: AlertCircle },
  terminated: { label: "Terminada", color: "bg-slate-100 text-slate-800 border-slate-200", icon: XCircle }
};

const BRAND_OPTIONS = {
  "Mediação": ["ZuHaus", "ZuHandel"],
  "Serviços": ["ZuProjeckt", "ZuGarden", "Zufinance"]
};

export default function Franchising() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [districtFilter, setDistrictFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFranchise, setEditingFranchise] = useState(null);
  const [selectedFranchise, setSelectedFranchise] = useState(null);
  const [activeTab, setActiveTab] = useState("list");
  const [viewMode, setViewMode] = useState("list");

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    owner_name: "",
    owner_email: "",
    owner_phone: "",
    address: "",
    city: "",
    district: "",
    postal_code: "",
    country: "Portugal",
    status: "pending",
    contract_start_date: "",
    contract_end_date: "",
    monthly_fee: "",
    royalty_percentage: "",
    initial_investment: "",
    territory: "",
    website: "",
    nif: "",
    notes: "",
    brand_category: "",
    brand_name: "",
    physical_type: "",
    physical_size: ""
  });

  const { data: franchises = [], isLoading } = useQuery({
    queryKey: ['franchises'],
    queryFn: () => base44.entities.Franchise.list('-created_date')
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Franchise.create(data),
    onSuccess: () => {
      toast.success("Franquia criada com sucesso");
      queryClient.invalidateQueries({ queryKey: ['franchises'] });
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Franchise.update(id, data),
    onSuccess: () => {
      toast.success("Franquia atualizada");
      queryClient.invalidateQueries({ queryKey: ['franchises'] });
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Franchise.delete(id),
    onSuccess: () => {
      toast.success("Franquia eliminada");
      queryClient.invalidateQueries({ queryKey: ['franchises'] });
      setSelectedFranchise(null);
    }
  });

  const resetForm = () => {
    setFormData({
      name: "", code: "", owner_name: "", owner_email: "", owner_phone: "",
      address: "", city: "", district: "", postal_code: "", country: "Portugal",
      status: "pending", contract_start_date: "", contract_end_date: "",
      monthly_fee: "", royalty_percentage: "", initial_investment: "",
      territory: "", website: "", nif: "", notes: "",
      brand_category: "", brand_name: "", physical_type: "", physical_size: ""
    });
    setEditingFranchise(null);
    setDialogOpen(false);
  };

  const handleEdit = (franchise) => {
    setEditingFranchise(franchise);
    setFormData({
      name: franchise.name || "",
      code: franchise.code || "",
      owner_name: franchise.owner_name || "",
      owner_email: franchise.owner_email || "",
      owner_phone: franchise.owner_phone || "",
      address: franchise.address || "",
      city: franchise.city || "",
      district: franchise.district || "",
      postal_code: franchise.postal_code || "",
      country: franchise.country || "Portugal",
      status: franchise.status || "pending",
      contract_start_date: franchise.contract_start_date || "",
      contract_end_date: franchise.contract_end_date || "",
      monthly_fee: franchise.monthly_fee || "",
      royalty_percentage: franchise.royalty_percentage || "",
      initial_investment: franchise.initial_investment || "",
      territory: franchise.territory || "",
      website: franchise.website || "",
      nif: franchise.nif || "",
      notes: franchise.notes || "",
      brand_category: franchise.brand_category || "",
      brand_name: franchise.brand_name || "",
      physical_type: franchise.physical_type || "",
      physical_size: franchise.physical_size || ""
    });
    setDialogOpen(true);
  };

  const handleMatrixCellClick = (filter) => {
    setSearchTerm("");
    setStatusFilter("all");
    setDistrictFilter("all");
    // Could filter by brand/physical type here
    setViewMode("list");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      monthly_fee: formData.monthly_fee ? parseFloat(formData.monthly_fee) : null,
      royalty_percentage: formData.royalty_percentage ? parseFloat(formData.royalty_percentage) : null,
      initial_investment: formData.initial_investment ? parseFloat(formData.initial_investment) : null,
      brand_category: formData.brand_category || null,
      brand_name: formData.brand_name || null,
      physical_type: formData.physical_type || null,
      physical_size: formData.physical_size || null
    };

    if (editingFranchise) {
      updateMutation.mutate({ id: editingFranchise.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (franchise) => {
    if (window.confirm(`Eliminar a franquia "${franchise.name}"?`)) {
      deleteMutation.mutate(franchise.id);
    }
  };

  // Filters
  const allDistricts = [...new Set(franchises.map(f => f.district).filter(Boolean))].sort();

  const filteredFranchises = franchises.filter(f => {
    const matchesSearch = !searchTerm || 
      f.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.owner_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.code?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || f.status === statusFilter;
    const matchesDistrict = districtFilter === "all" || f.district === districtFilter;
    return matchesSearch && matchesStatus && matchesDistrict;
  });

  // Stats
  const stats = {
    total: franchises.length,
    active: franchises.filter(f => f.status === 'active').length,
    pending: franchises.filter(f => f.status === 'pending').length,
    totalAgents: franchises.reduce((sum, f) => sum + (f.agents_count || 0), 0),
    totalProperties: franchises.reduce((sum, f) => sum + (f.properties_count || 0), 0),
    monthlyRevenue: franchises.filter(f => f.status === 'active').reduce((sum, f) => sum + (f.monthly_fee || 0), 0)
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Building2 className="w-8 h-8 text-blue-600" />
              Gestão de Franchising
            </h1>
            <p className="text-slate-600 mt-1">Gerir a rede de franquias</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setDialogOpen(open); }}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Nova Franquia
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingFranchise ? "Editar Franquia" : "Nova Franquia"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Nome da Franquia *</Label>
                    <Input
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="Zugruppe Lisboa"
                    />
                  </div>
                  <div>
                    <Label>Código</Label>
                    <Input
                      value={formData.code}
                      onChange={(e) => setFormData({...formData, code: e.target.value})}
                      placeholder="ZG-LIS-001"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Nome do Franqueado *</Label>
                    <Input
                      required
                      value={formData.owner_name}
                      onChange={(e) => setFormData({...formData, owner_name: e.target.value})}
                      placeholder="João Silva"
                    />
                  </div>
                  <div>
                    <Label>Email *</Label>
                    <Input
                      required
                      type="email"
                      value={formData.owner_email}
                      onChange={(e) => setFormData({...formData, owner_email: e.target.value})}
                      placeholder="joao@exemplo.com"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Telefone</Label>
                    <Input
                      value={formData.owner_phone}
                      onChange={(e) => setFormData({...formData, owner_phone: e.target.value})}
                      placeholder="+351 912 345 678"
                    />
                  </div>
                  <div>
                    <Label>NIF</Label>
                    <Input
                      value={formData.nif}
                      onChange={(e) => setFormData({...formData, nif: e.target.value})}
                      placeholder="123456789"
                    />
                  </div>
                </div>

                <div>
                  <Label>Morada</Label>
                  <Input
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    placeholder="Rua Exemplo, 123"
                  />
                </div>

                <div className="grid md:grid-cols-3 gap-4">
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
                    <Label>Distrito</Label>
                    <Input
                      value={formData.district}
                      onChange={(e) => setFormData({...formData, district: e.target.value})}
                      placeholder="Lisboa"
                    />
                  </div>
                  <div>
                    <Label>Código Postal</Label>
                    <Input
                      value={formData.postal_code}
                      onChange={(e) => setFormData({...formData, postal_code: e.target.value})}
                      placeholder="1000-001"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Território Exclusivo</Label>
                    <Input
                      value={formData.territory}
                      onChange={(e) => setFormData({...formData, territory: e.target.value})}
                      placeholder="Lisboa Centro, Baixa, Chiado"
                    />
                  </div>
                  <div>
                    <Label>Website</Label>
                    <Input
                      value={formData.website}
                      onChange={(e) => setFormData({...formData, website: e.target.value})}
                      placeholder="https://lisboa.zugruppe.pt"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label>Data Início Contrato</Label>
                    <Input
                      type="date"
                      value={formData.contract_start_date}
                      onChange={(e) => setFormData({...formData, contract_start_date: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Data Fim Contrato</Label>
                    <Input
                      type="date"
                      value={formData.contract_end_date}
                      onChange={(e) => setFormData({...formData, contract_end_date: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Estado</Label>
                    <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pendente</SelectItem>
                        <SelectItem value="active">Ativa</SelectItem>
                        <SelectItem value="suspended">Suspensa</SelectItem>
                        <SelectItem value="terminated">Terminada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label>Taxa Mensal (€)</Label>
                    <Input
                      type="number"
                      value={formData.monthly_fee}
                      onChange={(e) => setFormData({...formData, monthly_fee: e.target.value})}
                      placeholder="500"
                    />
                  </div>
                  <div>
                    <Label>Royalties (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.royalty_percentage}
                      onChange={(e) => setFormData({...formData, royalty_percentage: e.target.value})}
                      placeholder="5"
                    />
                  </div>
                  <div>
                    <Label>Investimento Inicial (€)</Label>
                    <Input
                      type="number"
                      value={formData.initial_investment}
                      onChange={(e) => setFormData({...formData, initial_investment: e.target.value})}
                      placeholder="25000"
                    />
                  </div>
                </div>

                <div>
                  <Label>Notas</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    placeholder="Notas adicionais sobre a franquia..."
                    rows={3}
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={resetForm} className="flex-1">
                    Cancelar
                  </Button>
                  <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700">
                    {editingFranchise ? "Atualizar" : "Criar Franquia"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
              <p className="text-xs text-blue-700">Total Franquias</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-900">{stats.active}</p>
              <p className="text-xs text-green-700">Ativas</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-amber-900">{stats.pending}</p>
              <p className="text-xs text-amber-700">Pendentes</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-purple-900">{stats.totalAgents}</p>
              <p className="text-xs text-purple-700">Agentes</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-indigo-900">{stats.totalProperties}</p>
              <p className="text-xs text-indigo-700">Imóveis</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-emerald-900">€{stats.monthlyRevenue.toLocaleString()}</p>
              <p className="text-xs text-emerald-700">Receita Mensal</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="grid md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Pesquisar por nome, franqueado, cidade..."
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Estados</SelectItem>
                  <SelectItem value="active">Ativas</SelectItem>
                  <SelectItem value="pending">Pendentes</SelectItem>
                  <SelectItem value="suspended">Suspensas</SelectItem>
                  <SelectItem value="terminated">Terminadas</SelectItem>
                </SelectContent>
              </Select>
              <Select value={districtFilter} onValueChange={setDistrictFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Distrito" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Distritos</SelectItem>
                  {allDistricts.map(d => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Franchise List */}
        <div className="grid gap-4">
          {filteredFranchises.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Building2 className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Nenhuma franquia encontrada</h3>
                <p className="text-slate-600">Adicione a primeira franquia para começar.</p>
              </CardContent>
            </Card>
          ) : (
            filteredFranchises.map((franchise) => {
              const status = statusConfig[franchise.status] || statusConfig.pending;
              const StatusIcon = status.icon;

              return (
                <Card key={franchise.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-bold text-slate-900">{franchise.name}</h3>
                          {franchise.code && (
                            <Badge variant="outline" className="font-mono">{franchise.code}</Badge>
                          )}
                          <Badge className={`${status.color} border`}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {status.label}
                          </Badge>
                        </div>

                        <div className="grid md:grid-cols-3 gap-3 text-sm text-slate-600">
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-slate-400" />
                            <span>{franchise.owner_name}</span>
                          </div>
                          {franchise.owner_email && (
                            <div className="flex items-center gap-2">
                              <Mail className="w-4 h-4 text-slate-400" />
                              <a href={`mailto:${franchise.owner_email}`} className="text-blue-600 hover:underline">
                                {franchise.owner_email}
                              </a>
                            </div>
                          )}
                          {franchise.owner_phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4 text-slate-400" />
                              <a href={`tel:${franchise.owner_phone}`} className="text-blue-600 hover:underline">
                                {franchise.owner_phone}
                              </a>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-slate-400" />
                            <span>{franchise.city}{franchise.district ? `, ${franchise.district}` : ''}</span>
                          </div>
                          {franchise.territory && (
                            <div className="flex items-center gap-2">
                              <Globe className="w-4 h-4 text-slate-400" />
                              <span className="truncate">{franchise.territory}</span>
                            </div>
                          )}
                          {franchise.contract_end_date && (
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-slate-400" />
                              <span>Contrato até {format(new Date(franchise.contract_end_date), "dd/MM/yyyy")}</span>
                            </div>
                          )}
                        </div>

                        {/* Metrics Row */}
                        <div className="flex flex-wrap gap-4 mt-3">
                          <div className="flex items-center gap-1 text-sm">
                            <Users className="w-4 h-4 text-purple-500" />
                            <span className="font-medium">{franchise.agents_count || 0}</span>
                            <span className="text-slate-500">agentes</span>
                          </div>
                          <div className="flex items-center gap-1 text-sm">
                            <Building2 className="w-4 h-4 text-blue-500" />
                            <span className="font-medium">{franchise.properties_count || 0}</span>
                            <span className="text-slate-500">imóveis</span>
                          </div>
                          {franchise.monthly_fee && (
                            <div className="flex items-center gap-1 text-sm">
                              <Euro className="w-4 h-4 text-green-500" />
                              <span className="font-medium">€{franchise.monthly_fee}</span>
                              <span className="text-slate-500">/mês</span>
                            </div>
                          )}
                          {franchise.royalty_percentage && (
                            <div className="flex items-center gap-1 text-sm">
                              <TrendingUp className="w-4 h-4 text-amber-500" />
                              <span className="font-medium">{franchise.royalty_percentage}%</span>
                              <span className="text-slate-500">royalties</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setSelectedFranchise(franchise)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleEdit(franchise)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDelete(franchise)} className="text-red-600 hover:bg-red-50">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Franchise Detail Dialog */}
        <Dialog open={!!selectedFranchise} onOpenChange={(open) => !open && setSelectedFranchise(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            {selectedFranchise && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-3">
                    {selectedFranchise.name}
                    <Badge className={`${statusConfig[selectedFranchise.status]?.color} border`}>
                      {statusConfig[selectedFranchise.status]?.label}
                    </Badge>
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-6 mt-4">
                  {/* Info Cards */}
                  <div className="grid md:grid-cols-4 gap-4">
                    <Card className="bg-purple-50 border-purple-200">
                      <CardContent className="p-4 text-center">
                        <Users className="w-6 h-6 text-purple-600 mx-auto mb-1" />
                        <p className="text-2xl font-bold text-purple-900">{selectedFranchise.agents_count || 0}</p>
                        <p className="text-xs text-purple-700">Agentes</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-blue-50 border-blue-200">
                      <CardContent className="p-4 text-center">
                        <Building2 className="w-6 h-6 text-blue-600 mx-auto mb-1" />
                        <p className="text-2xl font-bold text-blue-900">{selectedFranchise.properties_count || 0}</p>
                        <p className="text-xs text-blue-700">Imóveis</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-green-50 border-green-200">
                      <CardContent className="p-4 text-center">
                        <Euro className="w-6 h-6 text-green-600 mx-auto mb-1" />
                        <p className="text-2xl font-bold text-green-900">€{selectedFranchise.monthly_fee || 0}</p>
                        <p className="text-xs text-green-700">Taxa Mensal</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-amber-50 border-amber-200">
                      <CardContent className="p-4 text-center">
                        <TrendingUp className="w-6 h-6 text-amber-600 mx-auto mb-1" />
                        <p className="text-2xl font-bold text-amber-900">{selectedFranchise.royalty_percentage || 0}%</p>
                        <p className="text-xs text-amber-700">Royalties</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Details */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold text-slate-900 mb-3">Informação do Franqueado</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-slate-400" />
                          <span>{selectedFranchise.owner_name}</span>
                        </div>
                        {selectedFranchise.owner_email && (
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-slate-400" />
                            <a href={`mailto:${selectedFranchise.owner_email}`} className="text-blue-600 hover:underline">
                              {selectedFranchise.owner_email}
                            </a>
                          </div>
                        )}
                        {selectedFranchise.owner_phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-slate-400" />
                            <span>{selectedFranchise.owner_phone}</span>
                          </div>
                        )}
                        {selectedFranchise.nif && (
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-slate-400" />
                            <span>NIF: {selectedFranchise.nif}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold text-slate-900 mb-3">Localização</h4>
                      <div className="space-y-2 text-sm">
                        {selectedFranchise.address && (
                          <div className="flex items-start gap-2">
                            <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                            <span>{selectedFranchise.address}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-slate-400" />
                          <span>
                            {selectedFranchise.city}
                            {selectedFranchise.postal_code && `, ${selectedFranchise.postal_code}`}
                            {selectedFranchise.district && ` - ${selectedFranchise.district}`}
                          </span>
                        </div>
                        {selectedFranchise.territory && (
                          <div className="flex items-center gap-2">
                            <Globe className="w-4 h-4 text-slate-400" />
                            <span>Território: {selectedFranchise.territory}</span>
                          </div>
                        )}
                        {selectedFranchise.website && (
                          <div className="flex items-center gap-2">
                            <Globe className="w-4 h-4 text-slate-400" />
                            <a href={selectedFranchise.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                              {selectedFranchise.website}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Contract Info */}
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-3">Informação do Contrato</h4>
                    <div className="grid md:grid-cols-3 gap-4 text-sm">
                      {selectedFranchise.contract_start_date && (
                        <div className="p-3 bg-slate-50 rounded-lg">
                          <p className="text-slate-500">Início do Contrato</p>
                          <p className="font-medium">{format(new Date(selectedFranchise.contract_start_date), "dd/MM/yyyy")}</p>
                        </div>
                      )}
                      {selectedFranchise.contract_end_date && (
                        <div className="p-3 bg-slate-50 rounded-lg">
                          <p className="text-slate-500">Fim do Contrato</p>
                          <p className="font-medium">{format(new Date(selectedFranchise.contract_end_date), "dd/MM/yyyy")}</p>
                        </div>
                      )}
                      {selectedFranchise.initial_investment && (
                        <div className="p-3 bg-slate-50 rounded-lg">
                          <p className="text-slate-500">Investimento Inicial</p>
                          <p className="font-medium">€{selectedFranchise.initial_investment.toLocaleString()}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Notes */}
                  {selectedFranchise.notes && (
                    <div>
                      <h4 className="font-semibold text-slate-900 mb-2">Notas</h4>
                      <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg whitespace-pre-wrap">
                        {selectedFranchise.notes}
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2 pt-4 border-t">
                    <Button variant="outline" onClick={() => handleEdit(selectedFranchise)} className="flex-1">
                      <Edit className="w-4 h-4 mr-2" />
                      Editar
                    </Button>
                    <Button variant="outline" onClick={() => setSelectedFranchise(null)}>
                      Fechar
                    </Button>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}