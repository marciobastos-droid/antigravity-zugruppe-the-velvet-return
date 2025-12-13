import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { 
  Briefcase, Plus, Upload, FileText, CheckCircle2, 
  AlertCircle, Trash2, Download, Eye, Euro, MapPin,
  User, Calendar, Folder, Search
} from "lucide-react";
import { toast } from "sonner";

export default function DealFoldersManager() {
  const queryClient = useQueryClient();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [formData, setFormData] = useState({
    deal_name: "",
    property_id: "",
    deal_type: "sale",
    status: "in_progress",
    deal_value: "",
    buyer_name: "",
    buyer_nif: "",
    seller_name: "",
    seller_nif: "",
    notes: ""
  });

  const { data: deals = [] } = useQuery({
    queryKey: ['dealFolders'],
    queryFn: () => base44.entities.DealFolder.list('-created_date')
  });

  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.DealFolder.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dealFolders'] });
      toast.success("Negócio criado");
      setCreateDialogOpen(false);
      resetForm();
    }
  });

  const uploadDocMutation = useMutation({
    mutationFn: async ({ dealId, file, category }) => {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      const deal = deals.find(d => d.id === dealId);
      const newDoc = {
        name: file.name,
        category: category,
        url: file_url,
        upload_date: new Date().toISOString(),
        uploaded_by: (await base44.auth.me()).email
      };

      return base44.entities.DealFolder.update(dealId, {
        documents: [...(deal.documents || []), newDoc]
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dealFolders'] });
      toast.success("Documento adicionado");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.DealFolder.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dealFolders'] });
      toast.success("Negócio eliminado");
      setSelectedDeal(null);
    }
  });

  const resetForm = () => {
    setFormData({
      deal_name: "",
      property_id: "",
      deal_type: "sale",
      status: "in_progress",
      deal_value: "",
      buyer_name: "",
      buyer_nif: "",
      seller_name: "",
      seller_nif: "",
      notes: ""
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const property = properties.find(p => p.id === formData.property_id);
    createMutation.mutate({
      ...formData,
      property_title: property?.title,
      property_address: property?.address,
      deal_value: parseFloat(formData.deal_value)
    });
  };

  const handleFileUpload = async (e, dealId) => {
    const file = e.target.files[0];
    if (!file) return;

    const category = prompt(
      "Categoria do documento:\n\n" +
      "id_buyer - Identificação Comprador\n" +
      "id_seller - Identificação Vendedor\n" +
      "proof_residence_buyer - Comprovativo Morada Comprador\n" +
      "proof_residence_seller - Comprovativo Morada Vendedor\n" +
      "nif_buyer - NIF Comprador\n" +
      "nif_seller - NIF Vendedor\n" +
      "cpcv - Contrato Promessa\n" +
      "escritura - Escritura\n" +
      "property_docs - Documentos Imóvel\n" +
      "energy_certificate - Certificado Energético\n" +
      "financial - Financeiros\n" +
      "other - Outro"
    );

    if (!category) return;

    uploadDocMutation.mutate({ dealId, file, category });
  };

  const filteredDeals = deals.filter(d => {
    const matchesSearch = searchTerm === "" ||
      d.deal_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.buyer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.seller_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || d.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const categoryLabels = {
    id_buyer: "ID Comprador",
    id_seller: "ID Vendedor",
    proof_residence_buyer: "Comp. Morada Comprador",
    proof_residence_seller: "Comp. Morada Vendedor",
    nif_buyer: "NIF Comprador",
    nif_seller: "NIF Vendedor",
    cpcv: "CPCV",
    escritura: "Escritura",
    property_docs: "Docs Imóvel",
    energy_certificate: "Cert. Energético",
    financial: "Financeiros",
    other: "Outro"
  };

  const statusColors = {
    in_progress: "bg-yellow-100 text-yellow-800",
    completed: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800"
  };

  const statusLabels = {
    in_progress: "Em Progresso",
    completed: "Concluído",
    cancelled: "Cancelado"
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-blue-600" />
            Negócios Concretizados
          </h2>
          <p className="text-slate-600">Organize todos os documentos por negócio</p>
        </div>
        
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Novo Negócio
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Criar Negócio</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Nome do Negócio</Label>
                <Input
                  required
                  value={formData.deal_name}
                  onChange={(e) => setFormData({...formData, deal_name: e.target.value})}
                  placeholder="Ex: Venda T3 Lisboa - João Silva"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Imóvel</Label>
                  <Select value={formData.property_id} onValueChange={(v) => setFormData({...formData, property_id: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar imóvel..." />
                    </SelectTrigger>
                    <SelectContent>
                      {properties.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Tipo de Negócio</Label>
                  <Select value={formData.deal_type} onValueChange={(v) => setFormData({...formData, deal_type: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sale">Venda</SelectItem>
                      <SelectItem value="purchase">Compra</SelectItem>
                      <SelectItem value="lease">Arrendamento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Valor do Negócio (€)</Label>
                <Input
                  type="number"
                  value={formData.deal_value}
                  onChange={(e) => setFormData({...formData, deal_value: e.target.value})}
                  placeholder="0"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Nome Comprador/Inquilino</Label>
                  <Input
                    value={formData.buyer_name}
                    onChange={(e) => setFormData({...formData, buyer_name: e.target.value})}
                  />
                </div>
                <div>
                  <Label>NIF Comprador</Label>
                  <Input
                    value={formData.buyer_nif}
                    onChange={(e) => setFormData({...formData, buyer_nif: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Nome Vendedor/Senhorio</Label>
                  <Input
                    value={formData.seller_name}
                    onChange={(e) => setFormData({...formData, seller_name: e.target.value})}
                  />
                </div>
                <div>
                  <Label>NIF Vendedor</Label>
                  <Input
                    value={formData.seller_nif}
                    onChange={(e) => setFormData({...formData, seller_nif: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <Label>Notas</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  Criar Negócio
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Pesquisar negócios..."
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="in_progress">Em Progresso</SelectItem>
                <SelectItem value="completed">Concluídos</SelectItem>
                <SelectItem value="cancelled">Cancelados</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Deals List */}
      <div className="grid md:grid-cols-2 gap-4">
        {filteredDeals.map(deal => (
          <Card key={deal.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setSelectedDeal(deal)}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{deal.deal_name}</CardTitle>
                  <p className="text-sm text-slate-600 mt-1">{deal.property_title}</p>
                </div>
                <Badge className={statusColors[deal.status]}>
                  {statusLabels[deal.status]}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                {deal.deal_value && (
                  <div className="flex items-center gap-2 text-slate-700">
                    <Euro className="w-4 h-4 text-slate-500" />
                    €{deal.deal_value.toLocaleString()}
                  </div>
                )}
                {deal.buyer_name && (
                  <div className="flex items-center gap-2 text-slate-700">
                    <User className="w-4 h-4 text-slate-500" />
                    {deal.buyer_name}
                  </div>
                )}
                <div className="flex items-center gap-2 text-slate-600">
                  <Folder className="w-4 h-4" />
                  {deal.documents?.length || 0} documento(s)
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Deal Details Dialog */}
      {selectedDeal && (
        <Dialog open={!!selectedDeal} onOpenChange={(open) => !open && setSelectedDeal(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>{selectedDeal.deal_name}</span>
                <Badge className={statusColors[selectedDeal.status]}>
                  {statusLabels[selectedDeal.status]}
                </Badge>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-slate-600">Imóvel</Label>
                  <p className="font-medium">{selectedDeal.property_title}</p>
                </div>
                <div>
                  <Label className="text-xs text-slate-600">Valor</Label>
                  <p className="font-medium">€{selectedDeal.deal_value?.toLocaleString()}</p>
                </div>
                <div>
                  <Label className="text-xs text-slate-600">Comprador/Inquilino</Label>
                  <p className="font-medium">{selectedDeal.buyer_name}</p>
                  {selectedDeal.buyer_nif && <p className="text-sm text-slate-600">NIF: {selectedDeal.buyer_nif}</p>}
                </div>
                <div>
                  <Label className="text-xs text-slate-600">Vendedor/Senhorio</Label>
                  <p className="font-medium">{selectedDeal.seller_name}</p>
                  {selectedDeal.seller_nif && <p className="text-sm text-slate-600">NIF: {selectedDeal.seller_nif}</p>}
                </div>
              </div>

              {/* Upload Document */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-slate-900">Documentos ({selectedDeal.documents?.length || 0})</h3>
                  <div>
                    <input
                      type="file"
                      onChange={(e) => handleFileUpload(e, selectedDeal.id)}
                      className="hidden"
                      id={`upload-${selectedDeal.id}`}
                    />
                    <label htmlFor={`upload-${selectedDeal.id}`}>
                      <Button variant="outline" size="sm" className="cursor-pointer" asChild>
                        <span>
                          <Upload className="w-4 h-4 mr-2" />
                          Adicionar Documento
                        </span>
                      </Button>
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  {selectedDeal.documents?.map((doc, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3 flex-1">
                        <FileText className="w-4 h-4 text-slate-600" />
                        <div className="flex-1">
                          <p className="font-medium text-sm">{doc.name}</p>
                          <Badge variant="outline" className="text-xs mt-1">
                            {categoryLabels[doc.category]}
                          </Badge>
                        </div>
                      </div>
                      <a href={doc.url} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="sm">
                          <Download className="w-4 h-4" />
                        </Button>
                      </a>
                    </div>
                  ))}
                  {!selectedDeal.documents || selectedDeal.documents.length === 0 && (
                    <p className="text-center text-slate-500 py-8">Nenhum documento adicionado</p>
                  )}
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t">
                <Button
                  variant="outline"
                  className="text-red-600"
                  onClick={() => {
                    if (window.confirm("Eliminar este negócio?")) {
                      deleteMutation.mutate(selectedDeal.id);
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Eliminar
                </Button>
                <Button onClick={() => setSelectedDeal(null)}>
                  Fechar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}