import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Wrench, Plus, Calendar, DollarSign, User, AlertTriangle, CheckCircle2, Clock, Upload, X } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function MaintenanceManager({ propertyId, propertyTitle }) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "other",
    priority: "medium",
    scheduled_date: "",
    vendor: "",
    vendor_contact: "",
    estimated_cost: ""
  });
  const [uploadingImages, setUploadingImages] = useState(false);
  const [images, setImages] = useState([]);

  const { data: requests = [] } = useQuery({
    queryKey: ['maintenance', propertyId],
    queryFn: () => base44.entities.MaintenanceRequest.filter({ property_id: propertyId }, '-created_date'),
    enabled: !!propertyId
  });

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.MaintenanceRequest.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance'] });
      toast.success("Pedido criado");
      setDialogOpen(false);
      setFormData({
        title: "",
        description: "",
        category: "other",
        priority: "medium",
        scheduled_date: "",
        vendor: "",
        vendor_contact: "",
        estimated_cost: ""
      });
      setImages([]);
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.MaintenanceRequest.update(id, { 
      status,
      completed_date: status === 'completed' ? new Date().toISOString() : undefined
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance'] });
      toast.success("Estado atualizado");
    },
  });

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploadingImages(true);
    try {
      const uploadPromises = files.map(file => base44.integrations.Core.UploadFile({ file }));
      const results = await Promise.all(uploadPromises);
      const urls = results.map(r => r.file_url);
      setImages([...images, ...urls]);
      toast.success(`${files.length} imagem(ns) carregada(s)`);
    } catch (error) {
      toast.error("Erro ao carregar imagens");
    }
    setUploadingImages(false);
  };

  const handleSubmit = () => {
    if (!formData.title || !formData.description) {
      toast.error("Preencha título e descrição");
      return;
    }

    createMutation.mutate({
      ...formData,
      property_id: propertyId,
      property_title: propertyTitle,
      reported_by: user?.email,
      estimated_cost: formData.estimated_cost ? parseFloat(formData.estimated_cost) : undefined,
      images: images.length > 0 ? images : undefined
    });
  };

  const getCategoryLabel = (cat) => {
    const labels = {
      plumbing: "🚰 Canalização",
      electrical: "⚡ Elétrica",
      hvac: "❄️ AVAC",
      appliances: "🔌 Eletrodomésticos",
      structural: "🏗️ Estrutural",
      exterior: "🌳 Exterior",
      other: "🔧 Outro"
    };
    return labels[cat] || cat;
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: "bg-yellow-100 text-yellow-800",
      scheduled: "bg-blue-100 text-blue-800",
      in_progress: "bg-purple-100 text-purple-800",
      completed: "bg-green-100 text-green-800",
      cancelled: "bg-slate-100 text-slate-800"
    };
    return colors[status] || "bg-slate-100 text-slate-800";
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: "bg-slate-100 text-slate-800",
      medium: "bg-blue-100 text-blue-800",
      high: "bg-orange-100 text-orange-800",
      urgent: "bg-red-100 text-red-800"
    };
    return colors[priority] || "bg-slate-100 text-slate-800";
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <Wrench className="w-5 h-5" />
          Manutenção ({requests.length})
        </h3>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Novo Pedido
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Novo Pedido de Manutenção</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>Título *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="Ex: Torneira a pingar na cozinha"
                />
              </div>

              <div>
                <Label>Descrição *</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Descreva o problema em detalhe..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Categoria</Label>
                  <Select value={formData.category} onValueChange={(v) => setFormData({...formData, category: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="plumbing">🚰 Canalização</SelectItem>
                      <SelectItem value="electrical">⚡ Elétrica</SelectItem>
                      <SelectItem value="hvac">❄️ AVAC</SelectItem>
                      <SelectItem value="appliances">🔌 Eletrodomésticos</SelectItem>
                      <SelectItem value="structural">🏗️ Estrutural</SelectItem>
                      <SelectItem value="exterior">🌳 Exterior</SelectItem>
                      <SelectItem value="other">🔧 Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Prioridade</Label>
                  <Select value={formData.priority} onValueChange={(v) => setFormData({...formData, priority: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Baixa</SelectItem>
                      <SelectItem value="medium">Média</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                      <SelectItem value="urgent">🚨 Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Data Agendada</Label>
                  <Input
                    type="datetime-local"
                    value={formData.scheduled_date}
                    onChange={(e) => setFormData({...formData, scheduled_date: e.target.value})}
                  />
                </div>

                <div>
                  <Label>Custo Estimado (€)</Label>
                  <Input
                    type="number"
                    value={formData.estimated_cost}
                    onChange={(e) => setFormData({...formData, estimated_cost: e.target.value})}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Fornecedor/Técnico</Label>
                  <Input
                    value={formData.vendor}
                    onChange={(e) => setFormData({...formData, vendor: e.target.value})}
                    placeholder="Nome"
                  />
                </div>

                <div>
                  <Label>Contacto</Label>
                  <Input
                    value={formData.vendor_contact}
                    onChange={(e) => setFormData({...formData, vendor_contact: e.target.value})}
                    placeholder="Telefone ou email"
                  />
                </div>
              </div>

              <div>
                <Label>Fotos do Problema</Label>
                <div className="border-2 border-dashed rounded-lg p-4 text-center">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                    id="maintenance-images"
                    disabled={uploadingImages}
                  />
                  <label htmlFor="maintenance-images" className="cursor-pointer">
                    <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm text-slate-600">
                      {uploadingImages ? "A carregar..." : "Clique para adicionar fotos"}
                    </p>
                  </label>
                </div>
                {images.length > 0 && (
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {images.map((img, idx) => (
                      <div key={idx} className="relative">
                        <img src={img} alt="" className="w-20 h-20 object-cover rounded" />
                        <button
                          onClick={() => setImages(images.filter((_, i) => i !== idx))}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSubmit} disabled={createMutation.isPending}>
                  Criar Pedido
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {requests.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Wrench className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600">Sem pedidos de manutenção</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <Card key={req.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="font-semibold text-slate-900 mb-1">{req.title}</h4>
                    <p className="text-sm text-slate-600 line-clamp-2">{req.description}</p>
                  </div>
                  <Select
                    value={req.status}
                    onValueChange={(status) => updateStatusMutation.mutate({ id: req.id, status })}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="scheduled">Agendado</SelectItem>
                      <SelectItem value="in_progress">Em Progresso</SelectItem>
                      <SelectItem value="completed">Concluído</SelectItem>
                      <SelectItem value="cancelled">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge>{getCategoryLabel(req.category)}</Badge>
                  <Badge className={getPriorityColor(req.priority)}>
                    {req.priority === 'urgent' ? '🚨 Urgente' : 
                     req.priority === 'high' ? 'Alta' :
                     req.priority === 'medium' ? 'Média' : 'Baixa'}
                  </Badge>
                  <Badge className={getStatusColor(req.status)}>
                    {req.status === 'pending' ? 'Pendente' :
                     req.status === 'scheduled' ? 'Agendado' :
                     req.status === 'in_progress' ? 'Em Progresso' :
                     req.status === 'completed' ? 'Concluído' : 'Cancelado'}
                  </Badge>
                  {req.scheduled_date && (
                    <Badge variant="outline">
                      <Calendar className="w-3 h-3 mr-1" />
                      {format(new Date(req.scheduled_date), 'dd/MM/yyyy')}
                    </Badge>
                  )}
                  {req.estimated_cost && (
                    <Badge variant="outline">
                      <DollarSign className="w-3 h-3 mr-1" />
                      €{req.estimated_cost}
                    </Badge>
                  )}
                  {req.vendor && (
                    <Badge variant="outline">
                      <User className="w-3 h-3 mr-1" />
                      {req.vendor}
                    </Badge>
                  )}
                </div>

                {req.images?.length > 0 && (
                  <div className="flex gap-2 mt-3">
                    {req.images.slice(0, 4).map((img, idx) => (
                      <img key={idx} src={img} alt="" className="w-16 h-16 object-cover rounded" />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}