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
import { UserPlus, Mail, Phone, Search, Trash2, Edit, User, Building2, Award } from "lucide-react";
import { toast } from "sonner";

export default function ConsultorProfileTab() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    photo_url: "",
    specialization: "",
    bio: "",
    certifications: [],
    experience_years: 0,
    languages: [],
    creci_number: "",
    linkedin_url: "",
    is_active: true
  });

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ['consultorProfiles'],
    queryFn: () => base44.entities.ConsultorProfile.list('-created_date'),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ConsultorProfile.create(data),
    onSuccess: () => {
      toast.success("Perfil de consultor criado com sucesso");
      queryClient.invalidateQueries({ queryKey: ['consultorProfiles'] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ConsultorProfile.update(id, data),
    onSuccess: () => {
      toast.success("Perfil atualizado");
      queryClient.invalidateQueries({ queryKey: ['consultorProfiles'] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ConsultorProfile.delete(id),
    onSuccess: () => {
      toast.success("Perfil eliminado");
      queryClient.invalidateQueries({ queryKey: ['consultorProfiles'] });
    },
  });

  const filteredProfiles = profiles.filter(p =>
    p.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.phone?.includes(searchTerm)
  );

  const resetForm = () => {
    setFormData({
      full_name: "",
      email: "",
      phone: "",
      photo_url: "",
      specialization: "",
      bio: "",
      certifications: [],
      experience_years: 0,
      languages: [],
      creci_number: "",
      linkedin_url: "",
      is_active: true
    });
    setEditingProfile(null);
    setDialogOpen(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (editingProfile) {
      updateMutation.mutate({ id: editingProfile.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (profile) => {
    setEditingProfile(profile);
    setFormData({
      full_name: profile.full_name || "",
      email: profile.email || "",
      phone: profile.phone || "",
      photo_url: profile.photo_url || "",
      specialization: profile.specialization || "",
      bio: profile.bio || "",
      certifications: profile.certifications || [],
      experience_years: profile.experience_years || 0,
      languages: profile.languages || [],
      creci_number: profile.creci_number || "",
      linkedin_url: profile.linkedin_url || "",
      is_active: profile.is_active !== false
    });
    setDialogOpen(true);
  };

  const handleDelete = (id, name) => {
    if (window.confirm(`Eliminar perfil de "${name}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  const toggleActive = (profile) => {
    updateMutation.mutate({
      id: profile.id,
      data: { ...profile, is_active: !profile.is_active }
    });
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error("Por favor, selecione uma imagem válida");
      return;
    }

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
          <h2 className="text-2xl font-bold text-slate-900 mb-1">Perfis de Consultores</h2>
          <p className="text-slate-600">Gerir perfis detalhados de consultores</p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setDialogOpen(open); }}>
          <DialogTrigger asChild>
            <Button className="bg-slate-900 hover:bg-slate-800">
              <UserPlus className="w-4 h-4 mr-2" />
              Novo Perfil
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingProfile ? "Editar Perfil" : "Novo Perfil de Consultor"}</DialogTitle>
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
                <div>
                  <Label>Anos de Experiência</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.experience_years}
                    onChange={(e) => setFormData({...formData, experience_years: parseInt(e.target.value) || 0})}
                    placeholder="5"
                  />
                </div>
                <div>
                  <Label>Número CRECI</Label>
                  <Input
                    value={formData.creci_number}
                    onChange={(e) => setFormData({...formData, creci_number: e.target.value})}
                    placeholder="12345-F"
                  />
                </div>
              </div>

              <div>
                <Label>LinkedIn URL</Label>
                <Input
                  type="url"
                  value={formData.linkedin_url}
                  onChange={(e) => setFormData({...formData, linkedin_url: e.target.value})}
                  placeholder="https://www.linkedin.com/in/..."
                />
              </div>

              <div>
                <Label>Foto do Consultor</Label>
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
                      onClick={() => document.getElementById('consultor-photo-upload').click()}
                      disabled={uploadingPhoto}
                    >
                      {uploadingPhoto ? "A carregar..." : "Carregar Foto"}
                    </Button>
                    <input
                      id="consultor-photo-upload"
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
                <Label>Idiomas (separados por vírgula)</Label>
                <Input
                  value={formData.languages.join(', ')}
                  onChange={(e) => setFormData({...formData, languages: e.target.value.split(',').map(l => l.trim()).filter(Boolean)})}
                  placeholder="Português, Inglês, Espanhol"
                />
              </div>

              <div>
                <Label>Certificações (separadas por vírgula)</Label>
                <Input
                  value={formData.certifications.join(', ')}
                  onChange={(e) => setFormData({...formData, certifications: e.target.value.split(',').map(c => c.trim()).filter(Boolean)})}
                  placeholder="AMI, CCI"
                />
              </div>

              <div>
                <Label>Biografia</Label>
                <Textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({...formData, bio: e.target.value})}
                  placeholder="Breve descrição do consultor..."
                  rows={3}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="button" variant="outline" onClick={resetForm} className="flex-1">
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1 bg-slate-900 hover:bg-slate-800">
                  {editingProfile ? "Atualizar" : "Criar Perfil"}
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

      {filteredProfiles.length === 0 ? (
        <Card className="text-center py-20">
          <CardContent>
            <UserPlus className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <h3 className="text-2xl font-semibold text-slate-900 mb-2">
              {profiles.length === 0 ? "Nenhum perfil registado" : "Nenhum perfil encontrado"}
            </h3>
            <p className="text-slate-600 mb-6">
              {profiles.length === 0 ? "Comece por adicionar o primeiro perfil" : "Tente ajustar a pesquisa"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProfiles.map((profile) => {
            return (
              <Card key={profile.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                      {profile.photo_url ? (
                        <img src={profile.photo_url} alt={profile.full_name} className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-8 h-8 text-slate-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-slate-900 truncate">{profile.full_name}</h3>
                      {profile.specialization && (
                        <p className="text-sm text-slate-600">{profile.specialization}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge className={profile.is_active ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'}>
                          {profile.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                        {profile.experience_years > 0 && (
                          <Badge variant="outline" className="text-xs">
                            <Award className="w-3 h-3 mr-1" />
                            {profile.experience_years} anos
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm text-slate-700 mb-4">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-slate-500" />
                      <a href={`mailto:${profile.email}`} className="hover:text-blue-600 truncate">
                        {profile.email}
                      </a>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-slate-500" />
                      <a href={`tel:${profile.phone}`} className="hover:text-blue-600">
                        {profile.phone}
                      </a>
                    </div>
                    {profile.creci_number && (
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-slate-500" />
                        <span className="text-xs">CRECI: {profile.creci_number}</span>
                      </div>
                    )}
                  </div>

                  {profile.languages && profile.languages.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs text-slate-500 mb-1">Idiomas:</p>
                      <div className="flex flex-wrap gap-1">
                        {profile.languages.map((lang, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {lang}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {profile.bio && (
                    <p className="text-sm text-slate-600 mb-4 line-clamp-2">{profile.bio}</p>
                  )}

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(profile)} className="flex-1">
                      <Edit className="w-4 h-4 mr-2" />
                      Editar
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => toggleActive(profile)}
                      className={profile.is_active ? 'text-amber-600' : 'text-green-600'}
                    >
                      {profile.is_active ? 'Desativar' : 'Ativar'}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDelete(profile.id, profile.full_name)}
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