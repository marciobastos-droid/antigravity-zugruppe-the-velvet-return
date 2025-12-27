import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  UserPlus, Search, Shield, Users as UsersIcon, Mail, Phone, 
  Building2, MessageSquare, CheckCircle2, XCircle, UserCog, 
  Briefcase, Lock, Trash2, Pencil, AlertCircle, RefreshCw, Upload, Camera 
} from "lucide-react";
import { toast } from "sonner";
import AdvancedPermissionsEditor from "../users/AdvancedPermissionsEditor";
import RoleTemplates from "../users/RoleTemplates";

export default function UserManagementTab({ currentUser }) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(null);

  const { data: users = [], isLoading, error: usersError, refetch: refetchUsers } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      try {
        return await base44.entities.User.list('-created_date');
      } catch (error) {
        console.error('[UserManagementTab] Error fetching users:', error);
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
  });

  const handleTypeChange = (userId, newType) => {
    updateUserMutation.mutate({ userId, data: { user_type: newType } });
  };

  const handleToggleActive = (userId, currentStatus) => {
    updateUserMutation.mutate({ userId, data: { is_active: !currentStatus } });
  };

  const handleDeleteUser = (user) => {
    if (!window.confirm(`Tem certeza que deseja eliminar "${user.full_name}"?`)) return;
    deleteUserMutation.mutate(user.id);
  };

  const handleUpdatePermissions = (permissions) => {
    if (!selectedUser) return;
    
    updateUserMutation.mutate(
      { userId: selectedUser.id, data: { permissions } },
      {
        onSuccess: () => {
          setPermissionsDialogOpen(false);
          setSelectedUser(null);
          toast.success("Permissões atualizadas!");
        }
      }
    );
  };

  const handleApplyTemplate = (templatePermissions) => {
    if (!selectedUser) return;
    handleUpdatePermissions(templatePermissions);
  };

  const handlePhotoUpload = async (e, userId) => {
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

    setUploadingPhoto(userId);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.User.update(userId, { photo_url: file_url });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success("Foto atualizada com sucesso");
    } catch (error) {
      console.error("Erro ao carregar foto:", error);
      toast.error("Erro ao carregar foto");
    } finally {
      setUploadingPhoto(null);
    }
  };

  const getUserStats = (userEmail) => {
    const userProperties = properties.filter(p => p.created_by === userEmail).length;
    const assignedOpportunities = opportunities.filter(o => o.assigned_to === userEmail).length;
    return { properties: userProperties, opportunities: assignedOpportunities };
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = searchTerm === "" || 
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === "all" || user.user_type === typeFilter;
    
    return matchesSearch && matchesType;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900" />
      </div>
    );
  }

  if (usersError) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-900 mb-2">Erro ao Carregar Utilizadores</h3>
          <p className="text-slate-600 mb-4">
            {usersError.message || 'Ocorreu um erro de rede. Por favor, tente novamente.'}
          </p>
          <Button onClick={() => refetchUsers()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Tentar Novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
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

      {/* Users List */}
      <div className="grid gap-4">
        {filteredUsers.map((user) => {
          const stats = getUserStats(user.email);
          const isCurrentUser = currentUser?.email === user.email;
          
          return (
            <Card key={user.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="relative group">
                      {user.photo_url ? (
                        <img
                          src={user.photo_url}
                          alt={user.full_name}
                          className="w-12 h-12 rounded-full object-cover border-2 border-slate-200"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gradient-to-br from-slate-700 to-slate-900 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold">
                            {user.full_name?.[0]?.toUpperCase() || "U"}
                          </span>
                        </div>
                      )}
                      
                      {!isCurrentUser && (
                        <>
                          <input
                            type="file"
                            id={`photo-upload-${user.id}`}
                            accept="image/*"
                            onChange={(e) => handlePhotoUpload(e, user.id)}
                            className="hidden"
                          />
                          <button
                            onClick={() => document.getElementById(`photo-upload-${user.id}`).click()}
                            disabled={uploadingPhoto === user.id}
                            className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            {uploadingPhoto === user.id ? (
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Camera className="w-5 h-5 text-white" />
                            )}
                          </button>
                        </>
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-bold text-slate-900">{user.display_name || user.full_name}</h3>
                        {isCurrentUser && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 text-xs">Você</Badge>
                        )}
                        {user.is_active === false && (
                          <Badge className="bg-red-100 text-red-800 text-xs">Desativado</Badge>
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

                      <div className="flex flex-wrap gap-3 mb-3">
                        <div className="flex items-center gap-2 bg-slate-50 px-2 py-1 rounded text-xs">
                          <Building2 className="w-3 h-3 text-slate-600" />
                          <span><strong>{stats.properties}</strong> imóveis</span>
                        </div>
                        <div className="flex items-center gap-2 bg-slate-50 px-2 py-1 rounded text-xs">
                          <MessageSquare className="w-3 h-3 text-slate-600" />
                          <span><strong>{stats.opportunities}</strong> leads</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <Select
                            value={user.user_type || 'agente'}
                            onValueChange={(value) => handleTypeChange(user.id, value)}
                            disabled={isCurrentUser}
                          >
                            <SelectTrigger className="w-36 h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="agente">🏠 Agente</SelectItem>
                              <SelectItem value="gestor">📊 Gestor</SelectItem>
                              <SelectItem value="admin">👑 Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {!isCurrentUser && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleToggleActive(user.id, user.is_active)}
                              className={user.is_active === false ? "text-green-600 hover:bg-green-50 h-8 text-xs" : "text-red-600 hover:bg-red-50 h-8 text-xs"}
                            >
                              {user.is_active === false ? (
                                <>
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  Ativar
                                </>
                              ) : (
                                <>
                                  <XCircle className="w-3 h-3 mr-1" />
                                  Desativar
                                </>
                              )}
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedUser(user);
                                setPermissionsDialogOpen(true);
                              }}
                              className="h-8 text-xs"
                            >
                              <Lock className="w-3 h-3 mr-1" />
                              Permissões
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteUser(user)}
                              disabled={deleteUserMutation.isPending}
                              className="text-red-600 hover:bg-red-50 h-8 text-xs"
                            >
                              <Trash2 className="w-3 h-3 mr-1" />
                              Eliminar
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <Badge className={
                    user.user_type === 'admin' ? 'bg-purple-100 text-purple-800 text-xs' :
                    user.user_type === 'gestor' ? 'bg-blue-100 text-blue-800 text-xs' :
                    'bg-green-100 text-green-800 text-xs'
                  }>
                    {user.user_type === 'admin' ? '👑 Admin' : 
                     user.user_type === 'gestor' ? '📊 Gestor' : '🏠 Agente'}
                  </Badge>
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

      {/* Permissions Dialog */}
      <Dialog open={permissionsDialogOpen} onOpenChange={(open) => {
        setPermissionsDialogOpen(open);
        if (!open) setSelectedUser(null);
      }}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-purple-600" />
              Permissões - {selectedUser?.display_name || selectedUser?.full_name}
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
  );
}