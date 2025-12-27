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
import { UserPlus, Search, Shield, Users as UsersIcon, Mail, Phone, Building2, MessageSquare, CheckCircle2, XCircle, UserCog, Briefcase, Lock, Trash2, Pencil, Key, Eye, EyeOff, Settings, AlertCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import AdvancedPermissionsEditor from "../components/users/AdvancedPermissionsEditor";
import RoleTemplates from "../components/users/RoleTemplates";

export default function UserManagement() {
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
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    user_type: "agente"
  });
  const [inviteSent, setInviteSent] = useState(false);

  const { data: currentUser } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: users = [], isLoading, error: usersError, refetch: refetchUsers } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      try {
        return await base44.entities.User.list('-created_date');
      } catch (error) {
        console.error('[UserManagement] Error fetching users:', error);
        throw error;
      }
    },
    retry: 2,
    retryDelay: 1000,
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
      toast.success("Convite enviado com sucesso! O utilizador receberá um email.");
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error) => {
      console.error("Erro ao enviar convite:", error);
      toast.error("Erro ao enviar convite. Verifique o email e tente novamente.");
    }
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ userId, data }) => base44.entities.User.update(userId, data),
    onSuccess: () => {
      toast.success("Utilizador atualizado");
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (userId) => base44.entities.User.delete(userId),
    onSuccess: () => {
      toast.success("Utilizador eliminado com sucesso");
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: () => {
      toast.error("Erro ao eliminar utilizador");
    }
  });

  const handleDeleteUser = (user) => {
    if (!window.confirm(`Tem certeza que deseja eliminar o utilizador "${user.full_name}"? Esta ação não pode ser revertida.`)) {
      return;
    }
    deleteUserMutation.mutate(user.id);
  };

  const handleSetPassword = async () => {
    if (!selectedUser || !newPassword) return;
    
    if (newPassword.length < 6) {
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
        toast.success(`Senha definida com sucesso para ${selectedUser.display_name || selectedUser.full_name}`);
        setPasswordDialogOpen(false);
        setNewPassword("");
        setSelectedUser(null);
      } else {
        toast.error(response.data?.error || "Erro ao definir senha");
      }
    } catch (error) {
      console.error("Erro ao definir senha:", error);
      const errorMsg = error.response?.data?.error || error.message || "Erro ao definir senha";
      toast.error(errorMsg);
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

  const handleUpdatePermissions = (permissions) => {
    if (!selectedUser) return;
    
    updateUserMutation.mutate(
      { userId: selectedUser.id, data: { permissions } },
      {
        onSuccess: () => {
          setPermissionsDialogOpen(false);
          setSelectedUser(null);
          toast.success("Permissões atualizadas com sucesso!");
        }
      }
    );
  };

  const handleApplyTemplate = (templatePermissions) => {
    if (!selectedUser) return;
    handleUpdatePermissions(templatePermissions);
  };

  const getUserStats = (userEmail) => {
    const userProperties = properties.filter(p => p.created_by === userEmail).length;
    const assignedOpportunities = opportunities.filter(o => o.assigned_to === userEmail).length;
    const closedDeals = opportunities.filter(o => o.assigned_to === userEmail && o.status === 'closed').length;
    return { properties: userProperties, opportunities: assignedOpportunities, closed: closedDeals };
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = searchTerm === "" || 
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === "all" || user.user_type === typeFilter;
    
    return matchesSearch && matchesType;
  });

  const isAdmin = currentUser && (currentUser.role === 'admin' || currentUser.user_type === 'admin' || currentUser.user_type === 'gestor');
  const isFullAdmin = currentUser && (currentUser.role === 'admin' || currentUser.user_type === 'admin');

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Acesso Negado</h2>
            <p className="text-slate-600">Não tem permissões para aceder a esta página.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900" />
      </div>
    );
  }

  if (usersError) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Erro ao Carregar Utilizadores</h2>
            <p className="text-slate-600 mb-4">
              {usersError.message || 'Ocorreu um erro de rede ao tentar carregar os utilizadores.'}
            </p>
            <Button onClick={() => refetchUsers()} className="w-full">
              <RefreshCw className="w-4 h-4 mr-2" />
              Tentar Novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">Gestão de Utilizadores & Agentes</h1>
            <p className="text-slate-600">Gerir equipa, permissões e atribuição de leads</p>
          </div>

          <Dialog open={createDialogOpen} onOpenChange={(open) => {
              setCreateDialogOpen(open);
              if (!open) {
                setInviteSent(false);
                setFormData({
                  full_name: "",
                  email: "",
                  phone: "",
                  user_type: "agente"
                });
              }
            }}>
            <DialogTrigger asChild>
              <Button className="bg-slate-900 hover:bg-slate-800">
                <UserPlus className="w-4 h-4 mr-2" />
                Convidar Utilizador
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Convidar Novo Utilizador</DialogTitle>
              </DialogHeader>
              
              {inviteSent ? (
                <div className="py-8 text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">Convite Enviado!</h3>
                  <p className="text-slate-600 mb-1">
                    Um email foi enviado para:
                  </p>
                  <p className="font-medium text-slate-900 mb-4">{formData.email}</p>
                  <p className="text-sm text-slate-500 mb-6">
                    O utilizador receberá instruções para se registar na plataforma.
                  </p>
                  <Button 
                    onClick={() => {
                      setInviteSent(false);
                      setCreateDialogOpen(false);
                      setFormData({
                        full_name: "",
                        email: "",
                        phone: "",
                        user_type: "agente"
                      });
                    }}
                    className="w-full"
                  >
                    Fechar
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleCreateUser} className="space-y-4 mt-4">
                  <div>
                    <Label htmlFor="full_name">Nome Completo</Label>
                    <Input
                      id="full_name"
                      value={formData.full_name}
                      onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                      placeholder="João Silva"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      placeholder="joao.silva@exemplo.com"
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone">Telefone (Opcional)</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      placeholder="+351 912 345 678"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="userType">Tipo de Utilizador</Label>
                    <Select value={formData.user_type} onValueChange={(v) => setFormData({...formData, user_type: v})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="agente">🏠 Agente</SelectItem>
                        <SelectItem value="gestor">📊 Gestor</SelectItem>
                        <SelectItem value="admin">👑 Administrador</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-900 font-medium mb-1">
                      ℹ️ Como funciona?
                    </p>
                    <p className="text-xs text-blue-700">
                      Um email de convite será enviado para {formData.email || 'o email indicado'}. 
                      O utilizador deve registar-se na plataforma. Depois do registo, pode atribuir as permissões aqui.
                    </p>
                  </div>

                  <Button type="submit" className="w-full" disabled={createUserMutation.isPending}>
                    {createUserMutation.isPending ? (
                      <>
                        <Mail className="w-4 h-4 mr-2 animate-pulse" />
                        A enviar convite...
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4 mr-2" />
                        Enviar Convite por Email
                      </>
                    )}
                  </Button>
                </form>
              )}
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Pesquisar</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Nome ou email..."
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Tipo</label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="admin">Administradores</SelectItem>
                    <SelectItem value="gestor">Gestores</SelectItem>
                    <SelectItem value="agente">Agentes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Permission Levels Info */}
        <Card className="mb-6 border-blue-500 bg-blue-50">
          <CardContent className="p-4">
            <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Níveis de Permissão
            </h3>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="font-semibold text-blue-900">👑 Administrador</p>
                <p className="text-blue-700">Acesso total: gerir utilizadores, ver todos os dados, configurações</p>
              </div>
              <div>
                <p className="font-semibold text-blue-900">📊 Gestor</p>
                <p className="text-blue-700">Ver todos leads/imóveis, atribuir leads, gerir equipa</p>
              </div>
              <div>
                <p className="font-semibold text-blue-900">🏠 Agente</p>
                <p className="text-blue-700">Gerir próprios imóveis e leads atribuídos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users List */}
        <div className="grid gap-6">
          {filteredUsers.map((user) => {
            const stats = getUserStats(user.email);
            const isCurrentUser = currentUser.email === user.email;
            
            return (
              <Card key={user.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="w-14 h-14 bg-gradient-to-br from-slate-700 to-slate-900 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-bold text-xl">
                          {user.full_name?.[0]?.toUpperCase() || "U"}
                        </span>
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-bold text-slate-900">{user.display_name || user.full_name}</h3>
                          {isFullAdmin && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-slate-400 hover:text-slate-700"
                              onClick={() => {
                                setSelectedUser(user);
                                setEditingUserName(user.display_name || user.full_name || "");
                                setEditNameDialogOpen(true);
                              }}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          {isCurrentUser && (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700">Você</Badge>
                          )}
                          {user.is_active === false && (
                            <Badge className="bg-red-100 text-red-800">Desativado</Badge>
                          )}
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600 mb-3">
                          <div className="flex items-center gap-1">
                            <Mail className="w-4 h-4" />
                            {user.email}
                          </div>
                          {user.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="w-4 h-4" />
                              {user.phone}
                            </div>
                          )}
                        </div>

                        {/* Stats */}
                        <div className="flex flex-wrap gap-4 mb-4">
                          <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg">
                            <Building2 className="w-4 h-4 text-slate-600" />
                            <span className="text-sm">
                              <strong>{stats.properties}</strong> imóveis
                            </span>
                          </div>
                          <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg">
                            <MessageSquare className="w-4 h-4 text-slate-600" />
                            <span className="text-sm">
                              <strong>{stats.opportunities}</strong> leads atribuídos
                            </span>
                          </div>
                          <div className="flex items-center gap-2 bg-green-50 px-3 py-2 rounded-lg">
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                            <span className="text-sm">
                              <strong>{stats.closed}</strong> fechados
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap gap-3">
                          <div className="flex items-center gap-2">
                            <Label className="text-sm font-medium">Tipo:</Label>
                            <Select
                              value={user.user_type || 'agente'}
                              onValueChange={(value) => handleTypeChange(user.id, value)}
                              disabled={isCurrentUser}
                            >
                              <SelectTrigger className="w-40">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="agente">
                                  <div className="flex items-center gap-2">
                                    <UserCog className="w-4 h-4" />
                                    Agente
                                  </div>
                                </SelectItem>
                                <SelectItem value="gestor">
                                  <div className="flex items-center gap-2">
                                    <Briefcase className="w-4 h-4" />
                                    Gestor
                                  </div>
                                </SelectItem>
                                <SelectItem value="admin">
                                  <div className="flex items-center gap-2">
                                    <Shield className="w-4 h-4" />
                                    Admin
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {!isCurrentUser && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleToggleActive(user.id, user.is_active)}
                              className={user.is_active === false ? "text-green-600 hover:bg-green-50" : "text-red-600 hover:bg-red-50"}
                            >
                              {user.is_active === false ? (
                                <>
                                  <CheckCircle2 className="w-4 h-4 mr-2" />
                                  Ativar
                                </>
                              ) : (
                                <>
                                  <XCircle className="w-4 h-4 mr-2" />
                                  Desativar
                                </>
                              )}
                            </Button>
                          )}

                          {isFullAdmin && !isCurrentUser && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setNewPassword("");
                                  setShowPassword(false);
                                  setPasswordDialogOpen(true);
                                }}
                              >
                                <Key className="w-4 h-4 mr-2" />
                                Senha
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setPermissionsDialogOpen(true);
                                }}
                              >
                                <Lock className="w-4 h-4 mr-2" />
                                Permissões
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteUser(user)}
                                disabled={deleteUserMutation.isPending}
                                className="text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Eliminar
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <Badge className={
                        user.user_type === 'admin' ? 'bg-purple-100 text-purple-800' :
                        user.user_type === 'gestor' ? 'bg-blue-100 text-blue-800' :
                        'bg-green-100 text-green-800'
                      }>
                        {user.user_type === 'admin' ? '👑 Admin' : 
                         user.user_type === 'gestor' ? '📊 Gestor' : '🏠 Agente'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredUsers.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <UsersIcon className="w-16 h-16 text-slate-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Nenhum utilizador encontrado</h3>
              <p className="text-slate-600">Tente ajustar os filtros</p>
            </CardContent>
          </Card>
        )}

        {/* Password Dialog */}
        <Dialog open={passwordDialogOpen} onOpenChange={(open) => {
          setPasswordDialogOpen(open);
          if (!open) {
            setSelectedUser(null);
            setNewPassword("");
            setShowPassword(false);
          }
        }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Key className="w-5 h-5 text-amber-600" />
                Definir Senha - {selectedUser?.display_name || selectedUser?.full_name}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm text-amber-800">
                  <strong>Atenção:</strong> Definir uma nova senha irá substituir a senha atual do utilizador.
                </p>
              </div>
              <div>
                <Label>Nova Senha</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4 text-slate-400" /> : <Eye className="w-4 h-4 text-slate-400" />}
                  </Button>
                </div>
                {newPassword && newPassword.length < 6 && (
                  <p className="text-xs text-red-500 mt-1">A senha deve ter pelo menos 6 caracteres</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setPasswordDialogOpen(false);
                    setSelectedUser(null);
                    setNewPassword("");
                  }}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSetPassword}
                  disabled={settingPassword || newPassword.length < 6}
                  className="flex-1 bg-amber-600 hover:bg-amber-700"
                >
                  {settingPassword ? "A definir..." : "Definir Senha"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Name Dialog */}
        <Dialog open={editNameDialogOpen} onOpenChange={(open) => {
          setEditNameDialogOpen(open);
          if (!open) {
            setSelectedUser(null);
            setEditingUserName("");
          }
        }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Pencil className="w-5 h-5 text-blue-600" />
                Editar Nome do Utilizador
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>Nome Completo</Label>
                <Input
                  value={editingUserName}
                  onChange={(e) => setEditingUserName(e.target.value)}
                  placeholder="Nome do utilizador"
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setEditNameDialogOpen(false);
                    setSelectedUser(null);
                    setEditingUserName("");
                  }}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={async () => {
                    if (selectedUser) {
                      try {
                        await base44.entities.User.update(selectedUser.id, { display_name: editingUserName.trim() || null });
                        toast.success("Nome atualizado com sucesso");
                        queryClient.invalidateQueries({ queryKey: ['users'] });
                        setEditNameDialogOpen(false);
                        setSelectedUser(null);
                        setEditingUserName("");
                      } catch (error) {
                        console.error("Erro ao atualizar nome:", error);
                        toast.error("Não foi possível atualizar o nome.");
                      }
                    }
                  }}
                  disabled={updateUserMutation.isPending}
                  className="flex-1"
                >
                  Guardar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Permissions Dialog */}
        <Dialog open={permissionsDialogOpen} onOpenChange={(open) => {
          setPermissionsDialogOpen(open);
          if (!open) setSelectedUser(null);
        }}>
          <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-purple-600" />
                Configuração de Permissões - {selectedUser?.display_name || selectedUser?.full_name}
              </DialogTitle>
            </DialogHeader>
            
            {selectedUser && (
              <div className="space-y-6">
                <RoleTemplates onApplyTemplate={handleApplyTemplate} />
                <AdvancedPermissionsEditor
                  user={selectedUser}
                  permissions={selectedUser.permissions}
                  onChange={() => {}}
                  onSave={handleUpdatePermissions}
                  onCancel={() => {
                    setPermissionsDialogOpen(false);
                    setSelectedUser(null);
                  }}
                />
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}