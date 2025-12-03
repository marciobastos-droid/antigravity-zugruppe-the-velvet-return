import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Users, Search, UserPlus, Shield, ShieldCheck, User,
  MoreVertical, Mail, Phone, Calendar, Activity, Ban, Check,
  Loader2, RefreshCw, Trash2, Edit, Key
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

export default function AdminUsersTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [inviteDialog, setInviteDialog] = useState(false);
  const [editDialog, setEditDialog] = useState(null);
  const [inviteData, setInviteData] = useState({ email: "", full_name: "", user_type: "agente", phone: "" });

  const { data: users = [], isLoading, refetch } = useQuery({
    queryKey: ['adminUsers'],
    queryFn: () => base44.entities.User.list('-created_date'),
  });

  const { data: properties = [] } = useQuery({
    queryKey: ['allPropertiesAdmin'],
    queryFn: () => base44.entities.Property.list(),
  });

  const { data: opportunities = [] } = useQuery({
    queryKey: ['allOpportunitiesAdmin'],
    queryFn: () => base44.entities.Opportunity.list(),
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ userId, data }) => base44.entities.User.update(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      toast.success("Utilizador atualizado");
      setEditDialog(null);
    },
    onError: (error) => toast.error("Erro: " + error.message)
  });

  const deleteUserMutation = useMutation({
    mutationFn: (userId) => base44.entities.User.delete(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      toast.success("Utilizador removido");
    },
    onError: (error) => toast.error("Erro: " + error.message)
  });

  // Estatísticas por utilizador
  const getUserStats = (userEmail) => {
    const userProps = properties.filter(p => p.created_by === userEmail);
    const userOpps = opportunities.filter(o => o.assigned_to === userEmail || o.created_by === userEmail);
    const closedOpps = userOpps.filter(o => o.status === 'won');
    return {
      properties: userProps.length,
      opportunities: userOpps.length,
      closed: closedOpps.length
    };
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = !search || 
      u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase());
    const matchesRole = filterRole === "all" || 
      u.role === filterRole || 
      u.user_type?.toLowerCase() === filterRole;
    return matchesSearch && matchesRole;
  });

  const getRoleBadge = (user) => {
    const type = user.user_type?.toLowerCase() || user.role;
    const config = {
      admin: { label: "Admin", class: "bg-purple-100 text-purple-800" },
      gestor: { label: "Gestor", class: "bg-blue-100 text-blue-800" },
      agente: { label: "Agente", class: "bg-green-100 text-green-800" },
      user: { label: "Utilizador", class: "bg-slate-100 text-slate-800" }
    };
    const c = config[type] || config.user;
    return <Badge className={c.class}>{c.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{users.length}</div>
            <p className="text-sm text-slate-500">Total Utilizadores</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-purple-600">
              {users.filter(u => u.role === 'admin' || u.user_type?.toLowerCase() === 'admin').length}
            </div>
            <p className="text-sm text-slate-500">Administradores</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-600">
              {users.filter(u => u.user_type?.toLowerCase() === 'gestor').length}
            </div>
            <p className="text-sm text-slate-500">Gestores</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">
              {users.filter(u => u.user_type?.toLowerCase() === 'agente').length}
            </div>
            <p className="text-sm text-slate-500">Agentes</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Gestão de Utilizadores
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Button size="sm" onClick={() => setInviteDialog(true)}>
                <UserPlus className="w-4 h-4 mr-2" />
                Convidar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Pesquisar utilizadores..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Função" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="gestor">Gestor</SelectItem>
                <SelectItem value="agente">Agente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Users List */}
          <div className="space-y-2">
            {isLoading ? (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-slate-400" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                Nenhum utilizador encontrado
              </div>
            ) : (
              filteredUsers.map(user => {
                const stats = getUserStats(user.email);
                return (
                  <div 
                    key={user.id} 
                    className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      {user.photo_url ? (
                        <img src={user.photo_url} alt="" className="w-12 h-12 rounded-full object-cover" />
                      ) : (
                        <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center">
                          <User className="w-6 h-6 text-slate-500" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-slate-900">{user.full_name || "Sem nome"}</span>
                        {getRoleBadge(user)}
                        {user.is_active === false && (
                          <Badge variant="destructive" className="text-xs">Inativo</Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 truncate">{user.email}</p>
                      <div className="flex items-center gap-4 mt-1 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {user.created_date ? format(new Date(user.created_date), "dd MMM yyyy", { locale: pt }) : "N/A"}
                        </span>
                        <span>{stats.properties} imóveis</span>
                        <span>{stats.opportunities} leads</span>
                        <span className="text-green-600">{stats.closed} fechados</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditDialog(user)}>
                          <Edit className="w-4 h-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          updateUserMutation.mutate({
                            userId: user.id,
                            data: { is_active: !user.is_active }
                          });
                        }}>
                          {user.is_active === false ? (
                            <><Check className="w-4 h-4 mr-2" />Ativar</>
                          ) : (
                            <><Ban className="w-4 h-4 mr-2" />Desativar</>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-red-600"
                          onClick={() => {
                            if (confirm("Tem certeza que deseja remover este utilizador?")) {
                              deleteUserMutation.mutate(user.id);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Remover
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Invite Dialog */}
      <Dialog open={inviteDialog} onOpenChange={setInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convidar Utilizador</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Email *</Label>
              <Input
                type="email"
                value={inviteData.email}
                onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                placeholder="email@exemplo.com"
              />
            </div>
            <div>
              <Label>Nome Completo</Label>
              <Input
                value={inviteData.full_name}
                onChange={(e) => setInviteData({ ...inviteData, full_name: e.target.value })}
                placeholder="Nome do utilizador"
              />
            </div>
            <div>
              <Label>Função</Label>
              <Select value={inviteData.user_type} onValueChange={(v) => setInviteData({ ...inviteData, user_type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="gestor">Gestor</SelectItem>
                  <SelectItem value="agente">Agente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Telefone</Label>
              <Input
                value={inviteData.phone}
                onChange={(e) => setInviteData({ ...inviteData, phone: e.target.value })}
                placeholder="+351 912 345 678"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteDialog(false)}>Cancelar</Button>
            <Button onClick={() => {
              toast.info("Para convidar utilizadores, use a funcionalidade de convite do sistema.");
              setInviteDialog(false);
            }}>
              Enviar Convite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editDialog} onOpenChange={(o) => !o && setEditDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Utilizador</DialogTitle>
          </DialogHeader>
          {editDialog && (
            <div className="space-y-4">
              <div>
                <Label>Nome Completo</Label>
                <Input
                  value={editDialog.full_name || ""}
                  onChange={(e) => setEditDialog({ ...editDialog, full_name: e.target.value })}
                />
              </div>
              <div>
                <Label>Função</Label>
                <Select 
                  value={editDialog.user_type || "agente"} 
                  onValueChange={(v) => setEditDialog({ ...editDialog, user_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="gestor">Gestor</SelectItem>
                    <SelectItem value="agente">Agente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Telefone</Label>
                <Input
                  value={editDialog.phone || ""}
                  onChange={(e) => setEditDialog({ ...editDialog, phone: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(null)}>Cancelar</Button>
            <Button 
              onClick={() => updateUserMutation.mutate({
                userId: editDialog.id,
                data: {
                  full_name: editDialog.full_name,
                  user_type: editDialog.user_type,
                  phone: editDialog.phone
                }
              })}
              disabled={updateUserMutation.isPending}
            >
              {updateUserMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}