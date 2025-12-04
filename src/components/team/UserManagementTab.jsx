import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { UserPlus, Search, Shield, Users as UsersIcon, Mail, Phone, Building2, MessageSquare, CheckCircle2, XCircle, UserCog, Briefcase, Lock, Trash2, Pencil, Key, Eye, EyeOff, Camera, Loader2, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export default function UserManagementTab({ currentUser }) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [editNameDialogOpen, setEditNameDialogOpen] = useState(false);
  const [editingUserName, setEditingUserName] = useState("");
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [settingPassword, setSettingPassword] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(null); // user id being uploaded
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    user_type: "agente"
  });
  const [inviteSent, setInviteSent] = useState(false);

  const handlePhotoUpload = async (userId, file) => {
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Por favor selecione uma imagem");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter menos de 5MB");
      return;
    }

    setUploadingPhoto(userId);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.User.update(userId, { photo_url: file_url });
      toast.success("Foto atualizada com sucesso");
      queryClient.invalidateQueries({ queryKey: ['users'] });
    } catch (error) {
      console.error("Erro ao fazer upload:", error);
      toast.error("Erro ao fazer upload da foto");
    }
    setUploadingPhoto(null);
  };

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list('-created_date'),
  });

  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list(),
  });

  const { data: opportunities = [] } = useQuery({
    queryKey: ['opportunities'],
    queryFn: () => base44.entities.Opportunity.list(),
  });

  const createUserMutation = useMutation({
    mutationFn: async (data) => {
      const signupUrl = `${window.location.origin}`;
      
      const result = await base44.integrations.Core.SendEmail({
        to: data.email,
        subject: "Convite para Zugruppe - Plataforma Imobiliária",
        body: `Olá ${data.full_name},

Foi convidado(a) para juntar-se à plataforma Zugruppe como ${data.user_type === 'admin' ? 'Administrador' : data.user_type === 'gestor' ? 'Gestor' : 'Agente'}.

Para completar o seu registo, aceda à plataforma:
${signupUrl}

Utilize o seguinte email para criar a sua conta:
Email: ${data.email}

${data.phone ? `Telefone: ${data.phone}\n\n` : ''}Após o registo, as suas permissões serão configuradas automaticamente.

Bem-vindo(a) à equipa!

Cumprimentos,
Equipa Zugruppe`
      });

      return result;
    },
    onSuccess: () => {
      setInviteSent(true);
      toast.success("Convite enviado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: () => {
      toast.error("Erro ao enviar convite.");
    }
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, data }) => {
      console.log("Updating user:", userId, data);
      const result = await base44.entities.User.update(userId, data);
      console.log("Update result:", result);
      return result;
    },
    onSuccess: (data, variables) => {
      console.log("Update success:", data, variables);
      toast.success("Utilizador atualizado");
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error) => {
      console.error("Update error:", error);
      toast.error("Erro ao atualizar utilizador: " + (error.message || "Erro desconhecido"));
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: (userId) => base44.entities.User.delete(userId),
    onSuccess: () => {
      toast.success("Utilizador eliminado");
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const handleDeleteUser = (user) => {
    if (!window.confirm(`Eliminar "${user.full_name}"?`)) return;
    deleteUserMutation.mutate(user.id);
  };

  const handleSetPassword = async () => {
    if (!selectedUser || !newPassword || newPassword.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    setSettingPassword(true);
    try {
      const response = await base44.functions.invoke('setUserPassword', {
        user_id: selectedUser.id,
        password: newPassword
      });
      
      if (response.data?.success) {
        toast.success("Senha definida com sucesso");
        setPasswordDialogOpen(false);
        setNewPassword("");
        setSelectedUser(null);
      } else {
        toast.error(response.data?.error || "Erro ao definir senha");
      }
    } catch (error) {
      toast.error("Erro ao definir senha");
    }
    setSettingPassword(false);
  };

  const handleCreateUser = (e) => {
    e.preventDefault();
    createUserMutation.mutate(formData);
  };

  const handleTypeChange = (userId, newType) => {
    updateUserMutation.mutate({ userId, data: { user_type: newType } });
  };

  const handleToggleActive = (userId, currentStatus) => {
    updateUserMutation.mutate({ userId, data: { is_active: !currentStatus } });
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = searchTerm === "" || 
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "all" || user.user_type === typeFilter;
    return matchesSearch && matchesType;
  });

  const isFullAdmin = currentUser && (currentUser.role === 'admin' || currentUser.user_type === 'admin');

  const getUserStats = (userEmail) => {
    const userProperties = properties.filter(p => p.created_by === userEmail).length;
    const assignedOpportunities = opportunities.filter(o => o.assigned_to === userEmail).length;
    const closedDeals = opportunities.filter(o => o.assigned_to === userEmail && o.status === 'closed').length;
    return { properties: userProperties, opportunities: assignedOpportunities, closed: closedDeals };
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
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Gestão de Utilizadores</h2>
          <p className="text-slate-600">Gerir membros da equipa e permissões</p>
        </div>

        <Dialog open={createDialogOpen} onOpenChange={(open) => {
          setCreateDialogOpen(open);
          if (!open) {
            setInviteSent(false);
            setFormData({ full_name: "", email: "", phone: "", user_type: "agente" });
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="w-4 h-4 mr-2" />
              Convidar
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Convidar Novo Utilizador</DialogTitle>
            </DialogHeader>
            
            {inviteSent ? (
              <div className="py-8 text-center">
                <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Convite Enviado!</h3>
                <p className="text-slate-600 mb-4">Email enviado para {formData.email}</p>
                <Button onClick={() => { setInviteSent(false); setCreateDialogOpen(false); }}>
                  Fechar
                </Button>
              </div>
            ) : (
              <form onSubmit={handleCreateUser} className="space-y-4 mt-4">
                <div>
                  <Label>Nome Completo</Label>
                  <Input
                    value={formData.full_name}
                    onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                    placeholder="João Silva"
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="joao@exemplo.com"
                  />
                </div>
                <div>
                  <Label>Telefone (Opcional)</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder="+351 912 345 678"
                  />
                </div>
                <div>
                  <Label>Tipo de Utilizador</Label>
                  <Select value={formData.user_type} onValueChange={(v) => setFormData({...formData, user_type: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="agente">🏠 Agente</SelectItem>
                      <SelectItem value="gestor">📊 Gestor</SelectItem>
                      <SelectItem value="admin">👑 Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full" disabled={createUserMutation.isPending}>
                  <Mail className="w-4 h-4 mr-2" />
                  {createUserMutation.isPending ? "A enviar..." : "Enviar Convite"}
                </Button>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Pesquisar..."
                className="pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="admin">Administradores</SelectItem>
                <SelectItem value="gestor">Gestores</SelectItem>
                <SelectItem value="agente">Agentes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <div className="space-y-4">
        {filteredUsers.map((user) => {
          const stats = getUserStats(user.email);
          const isCurrentUser = currentUser?.email === user.email;
          
          return (
            <Card key={user.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="relative group">
                      {user.photo_url ? (
                        <img 
                          src={user.photo_url} 
                          alt={user.full_name}
                          className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gradient-to-br from-slate-700 to-slate-900 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-white font-bold">
                            {user.full_name?.[0]?.toUpperCase() || "U"}
                          </span>
                        </div>
                      )}
                      {isFullAdmin && (
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            fileInputRef.current?.click();
                          }}
                          disabled={uploadingPhoto === user.id}
                          className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                        >
                          {uploadingPhoto === user.id ? (
                            <Loader2 className="w-5 h-5 text-white animate-spin" />
                          ) : (
                            <Camera className="w-5 h-5 text-white" />
                          )}
                        </button>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-slate-900 truncate">
                          {user.display_name || user.full_name}
                        </h3>
                        {isFullAdmin && !isCurrentUser && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => {
                              setSelectedUser(user);
                              setEditingUserName(user.display_name || user.full_name || "");
                              setEditNameDialogOpen(true);
                            }}
                          >
                            <Pencil className="w-3 h-3" />
                          </Button>
                        )}
                        {isCurrentUser && <Badge variant="outline" className="text-xs">Você</Badge>}
                        {user.is_active === false && <Badge className="bg-red-100 text-red-800 text-xs">Desativado</Badge>}
                      </div>
                      <p className="text-sm text-slate-500 truncate">{user.email}</p>
                      
                      <div className="flex gap-3 mt-2 text-xs text-slate-500">
                        <span>{stats.properties} imóveis</span>
                        <span>{stats.opportunities} leads</span>
                        <span className="text-green-600">{stats.closed} fechados</span>
                      </div>
                      {user.last_login_at && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-slate-400">
                          <Clock className="w-3 h-3" />
                          Último login: {format(new Date(user.last_login_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge className={
                      user.user_type === 'admin' ? 'bg-purple-100 text-purple-800' :
                      user.user_type === 'gestor' ? 'bg-blue-100 text-blue-800' :
                      'bg-green-100 text-green-800'
                    }>
                      {user.user_type === 'admin' ? 'Admin' : 
                       user.user_type === 'gestor' ? 'Gestor' : 'Agente'}
                    </Badge>

                    {!isCurrentUser && (
                      <Select
                        value={user.user_type || 'agente'}
                        onValueChange={(value) => handleTypeChange(user.id, value)}
                      >
                        <SelectTrigger className="w-28 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="agente">Agente</SelectItem>
                          <SelectItem value="gestor">Gestor</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    )}

                    {isFullAdmin && !isCurrentUser && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleActive(user.id, user.is_active)}
                        >
                          {user.is_active === false ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedUser(user);
                            setNewPassword("");
                            setPasswordDialogOpen(true);
                          }}
                        >
                          <Key className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteUser(user)}
                          className="text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {filteredUsers.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <UsersIcon className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>Nenhum utilizador encontrado</p>
          </div>
        )}
      </div>

      {/* Password Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={(open) => {
        setPasswordDialogOpen(open);
        if (!open) { setSelectedUser(null); setNewPassword(""); }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Definir Senha - {selectedUser?.full_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nova senha (mín. 6 caracteres)"
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setPasswordDialogOpen(false)} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={handleSetPassword} disabled={settingPassword || newPassword.length < 6} className="flex-1">
                {settingPassword ? "A definir..." : "Definir"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Name Dialog */}
      <Dialog open={editNameDialogOpen} onOpenChange={(open) => {
        setEditNameDialogOpen(open);
        if (!open) { setSelectedUser(null); setEditingUserName(""); }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Nome</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <Input
              value={editingUserName}
              onChange={(e) => setEditingUserName(e.target.value)}
              placeholder="Nome do utilizador"
            />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditNameDialogOpen(false)} className="flex-1">
                Cancelar
              </Button>
              <Button 
                onClick={async () => {
                  if (selectedUser) {
                    await base44.entities.User.update(selectedUser.id, { display_name: editingUserName.trim() });
                    toast.success("Nome atualizado");
                    queryClient.invalidateQueries({ queryKey: ['users'] });
                    setEditNameDialogOpen(false);
                  }
                }}
                className="flex-1"
              >
                Guardar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Hidden file input for photo upload */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && selectedUser) {
            handlePhotoUpload(selectedUser.id, file);
          }
          e.target.value = '';
        }}
      />
    </div>
  );
}