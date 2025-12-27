import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { UserPlus, Mail, Phone, Link as LinkIcon, Search, Trash2, Edit, Building2, User } from "lucide-react";
import { toast } from "sonner";

export default function AgentManagementTab() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    profile_url: "",
    photo_url: "",
    specialization: "",
    bio: "",
    is_active: true
  });

  const { data: agents = [], isLoading } = useQuery({
    queryKey: ['agents'],
    queryFn: () => base44.entities.Agent.list('-created_date'),
  });

  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Agent.create(data),
    onSuccess: () => {
      toast.success("Agente criado com sucesso");
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Agent.update(id, data),
    onSuccess: () => {
      toast.success("Agente atualizado");
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Agent.delete(id),
    onSuccess: () => {
      toast.success("Agente eliminado");
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    },
  });

  const getAgentPropertyCount = (agentId) => {
    return properties.filter(p => p.agent_id === agentId).length;
  };

  const filteredAgents = agents.filter(a =>
    a.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.phone?.includes(searchTerm)
  );

  const resetForm = () => {
    setFormData({
      full_name: "",
      email: "",
      phone: "",
      profile_url: "",
      photo_url: "",
      specialization: "",
      bio: "",
      is_active: true
    });
    setEditingAgent(null);
    setDialogOpen(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (editingAgent) {
      updateMutation.mutate({ id: editingAgent.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (agent) => {
    setEditingAgent(agent);
    setFormData({
      full_name: agent.full_name || "",
      email: agent.email || "",
      phone: agent.phone || "",
      profile_url: agent.profile_url || "",
      photo_url: agent.photo_url || "",
      specialization: agent.specialization || "",
      bio: agent.bio || "",
      is_active: agent.is_active !== false
    });
    setDialogOpen(true);
  };

  const handleDelete = (id, name) => {
    if (window.confirm(`Eliminar agente "${name}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  const toggleActive = (agent) => {
    updateMutation.mutate({
      id: agent.id,
      data: { ...agent, is_active: !agent.is_active }
    });
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Por favor, selecione uma imagem válida");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem não pode exceder 5MB");
      return;
    }

    setUploadingPhoto(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, photo_url: file_url });
      toast.success("Foto carregada com sucesso");
    } catch (error) {
      console.error("Erro ao carregar foto:", error);
      toast.error("Erro ao carregar foto");
    } finally {
      setUploadingPhoto(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-1">Gestão de Agentes</h2>
          <p className="text-slate-600">Gerir equipa de agentes imobiliários</p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setDialogOpen(open); }}>
          <DialogTrigger asChild>
            <Button className="bg-slate-900 hover:bg-slate-800">
              <UserPlus className="w-4 h-4 mr-2" />
              Novo Agente
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingAgent ? "Editar Agente" : "Novo Agente"}</DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Nome Completo *</Label>
                  <Input
                    required
                    value={formData.full_name}
                    onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                    placeholder="João Silva"
                  />
                </div>
                <div>
                  <Label>Email *</Label>
                  <Input
                    required
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="joao@exemplo.com"
                  />
                </div>
                <div>
                  <Label>Telefone *</Label>
                  <Input
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder="+351 912 345 678"
                  />
                </div>
                <div>
                  <Label>Especialização</Label>
                  <Input
                    value={formData.specialization}
                    onChange={(e) => setFormData({...formData, specialization: e.target.value})}
                    placeholder="Imobiliário de Luxo"
                  />
                </div>
              </div>

              <div>
                <Label>Link do Perfil / Website</Label>
                <Input
                  type="url"
                  value={formData.profile_url}
                  onChange={(e) => setFormData({...formData, profile_url: e.target.value})}
                  placeholder="https://www.linkedin.com/in/..."
                />
              </div>

              <div>
                <Label>Foto do Agente</Label>
                <div className="space-y-3">
                  {formData.photo_url && (
                    <div className="flex items-center gap-3">
                      <img 
                        src={formData.photo_url} 
                        alt="Preview" 
                        className="w-20 h-20 rounded-full object-cover border-2 border-slate-200"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setFormData({...formData, photo_url: ""})}
                        className="text-red-600"
                      >
                        Remover
                      </Button>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => document.getElementById('photo-upload').click()}
                      disabled={uploadingPhoto}
                    >
                      {uploadingPhoto ? "A carregar..." : "Carregar Foto"}
                    </Button>
                    <input
                      id="photo-upload"
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </div>
                  <Input
                    type="url"
                    value={formData.photo_url}
                    onChange={(e) => setFormData({...formData, photo_url: e.target.value})}
                    placeholder="Ou cole URL da imagem..."
                    className="text-sm"
                  />
                </div>
              </div>

              <div>
                <Label>Biografia</Label>
                <Textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({...formData, bio: e.target.value})}
                  placeholder="Breve descrição do agente..."
                  rows={3}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="button" variant="outline" onClick={resetForm} className="flex-1">
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1 bg-slate-900 hover:bg-slate-800">
                  {editingAgent ? "Atualizar" : "Criar Agente"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisar por nome, email ou telefone..."
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {filteredAgents.length === 0 ? (
        <Card className="text-center py-20">
          <CardContent>
            <UserPlus className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <h3 className="text-2xl font-semibold text-slate-900 mb-2">
              {agents.length === 0 ? "Nenhum agente registado" : "Nenhum agente encontrado"}
            </h3>
            <p className="text-slate-600 mb-6">
              {agents.length === 0 ? "Comece por adicionar o primeiro agente" : "Tente ajustar a pesquisa"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAgents.map((agent) => {
            const propertyCount = getAgentPropertyCount(agent.id);
            
            return (
              <Card key={agent.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                      {agent.photo_url ? (
                        <img src={agent.photo_url} alt={agent.full_name} className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-8 h-8 text-slate-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-slate-900 truncate">{agent.full_name}</h3>
                      {agent.specialization && (
                        <p className="text-sm text-slate-600">{agent.specialization}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={agent.is_active ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'}>
                          {agent.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          <Building2 className="w-3 h-3 mr-1" />
                          {propertyCount} {propertyCount === 1 ? 'imóvel' : 'imóveis'}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm text-slate-700 mb-4">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-slate-500" />
                      <a href={`mailto:${agent.email}`} className="hover:text-blue-600 truncate">
                        {agent.email}
                      </a>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-slate-500" />
                      <a href={`tel:${agent.phone}`} className="hover:text-blue-600">
                        {agent.phone}
                      </a>
                    </div>
                    {agent.profile_url && (
                      <div className="flex items-center gap-2">
                        <LinkIcon className="w-4 h-4 text-slate-500" />
                        <a 
                          href={agent.profile_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="hover:text-blue-600 truncate"
                        >
                          Ver Perfil
                        </a>
                      </div>
                    )}
                  </div>

                  {agent.bio && (
                    <p className="text-sm text-slate-600 mb-4 line-clamp-2">{agent.bio}</p>
                  )}

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(agent)} className="flex-1">
                      <Edit className="w-4 h-4 mr-2" />
                      Editar
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => toggleActive(agent)}
                      className={agent.is_active ? 'text-amber-600' : 'text-green-600'}
                    >
                      {agent.is_active ? 'Desativar' : 'Ativar'}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDelete(agent.id, agent.full_name)}
                      className="text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}