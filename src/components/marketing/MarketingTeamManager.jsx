import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Users, Plus, Edit, Trash2, UserPlus, Target, TrendingUp, 
  Mail, Phone, Calendar, Shield, BarChart3, Eye, Camera,
  Facebook, MessageSquare, Zap, PieChart, Settings
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const roleLabels = {
  gestor_campanhas: "Gestor de Campanhas",
  especialista_seo: "Especialista SEO",
  designer_grafico: "Designer Gráfico",
  content_writer: "Content Writer",
  social_media_manager: "Social Media Manager",
  analista_dados: "Analista de Dados",
  email_marketing_specialist: "Especialista Email Marketing",
  paid_ads_specialist: "Especialista Paid Ads"
};

const teamLabels = {
  digital: "Marketing Digital",
  content: "Conteúdo",
  design: "Design",
  analytics: "Analytics"
};

const teamColors = {
  digital: "bg-blue-100 text-blue-800",
  content: "bg-purple-100 text-purple-800",
  design: "bg-pink-100 text-pink-800",
  analytics: "bg-green-100 text-green-800"
};

const statusLabels = {
  active: "Ativo",
  inactive: "Inativo",
  on_leave: "Em Licença"
};

const defaultPermissions = {
  campaigns: { create: false, edit: false, delete: false, view: true },
  facebook_ads: { manage: false, view_analytics: false },
  email_marketing: { send: false, create_templates: false, view_metrics: false },
  social_media: { post: false, schedule: false, analytics: false },
  analytics: { view_reports: false, export_data: false }
};

export default function MarketingTeamManager() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingMember, setEditingMember] = React.useState(null);
  const [filterTeam, setFilterTeam] = React.useState("all");
  const [filterStatus, setFilterStatus] = React.useState("active");

  const [formData, setFormData] = React.useState({
    user_email: "",
    full_name: "",
    role: "gestor_campanhas",
    team: "digital",
    status: "active",
    phone: "",
    bio: "",
    joined_date: new Date().toISOString().split('T')[0],
    photo_url: "",
    permissions: defaultPermissions,
    active_campaigns: []
  });

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['marketingTeamMembers'],
    queryFn: () => base44.entities.MarketingTeamMember.list('-created_date')
  });

  const { data: campaigns = [] } = useQuery({
    queryKey: ['marketingCampaigns'],
    queryFn: () => base44.entities.MarketingCampaign.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.MarketingTeamMember.create(data),
    onSuccess: () => {
      toast.success("Membro adicionado à equipa");
      queryClient.invalidateQueries({ queryKey: ['marketingTeamMembers'] });
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MarketingTeamMember.update(id, data),
    onSuccess: () => {
      toast.success("Membro atualizado");
      queryClient.invalidateQueries({ queryKey: ['marketingTeamMembers'] });
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.MarketingTeamMember.delete(id),
    onSuccess: () => {
      toast.success("Membro removido");
      queryClient.invalidateQueries({ queryKey: ['marketingTeamMembers'] });
    }
  });

  const resetForm = () => {
    setFormData({
      user_email: "",
      full_name: "",
      role: "gestor_campanhas",
      team: "digital",
      status: "active",
      phone: "",
      bio: "",
      joined_date: new Date().toISOString().split('T')[0],
      photo_url: "",
      permissions: defaultPermissions,
      active_campaigns: []
    });
    setEditingMember(null);
    setDialogOpen(false);
  };

  const handleEdit = (member) => {
    setEditingMember(member);
    setFormData({
      user_email: member.user_email || "",
      full_name: member.full_name || "",
      role: member.role || "gestor_campanhas",
      team: member.team || "digital",
      status: member.status || "active",
      phone: member.phone || "",
      bio: member.bio || "",
      joined_date: member.joined_date || new Date().toISOString().split('T')[0],
      photo_url: member.photo_url || "",
      permissions: member.permissions || defaultPermissions,
      active_campaigns: member.active_campaigns || []
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingMember) {
      updateMutation.mutate({ id: editingMember.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const updatePermission = (category, permission, value) => {
    setFormData({
      ...formData,
      permissions: {
        ...formData.permissions,
        [category]: {
          ...formData.permissions[category],
          [permission]: value
        }
      }
    });
  };

  const filteredMembers = members.filter(m => {
    const matchesTeam = filterTeam === "all" || m.team === filterTeam;
    const matchesStatus = filterStatus === "all" || m.status === filterStatus;
    return matchesTeam && matchesStatus;
  });

  const teamStats = React.useMemo(() => {
    return {
      total: members.length,
      active: members.filter(m => m.status === 'active').length,
      byTeam: {
        digital: members.filter(m => m.team === 'digital').length,
        content: members.filter(m => m.team === 'content').length,
        design: members.filter(m => m.team === 'design').length,
        analytics: members.filter(m => m.team === 'analytics').length
      },
      totalCampaigns: members.reduce((sum, m) => sum + (m.active_campaigns?.length || 0), 0)
    };
  }, [members]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Dashboard Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Membros</p>
                <p className="text-3xl font-bold text-slate-900">{teamStats.total}</p>
              </div>
              <Users className="w-10 h-10 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Membros Ativos</p>
                <p className="text-3xl font-bold text-green-900">{teamStats.active}</p>
              </div>
              <Target className="w-10 h-10 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Campanhas Ativas</p>
                <p className="text-3xl font-bold text-purple-900">{teamStats.totalCampaigns}</p>
              </div>
              <TrendingUp className="w-10 h-10 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Equipas</p>
                <p className="text-3xl font-bold text-orange-900">4</p>
              </div>
              <Shield className="w-10 h-10 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Equipa de Marketing</h2>
          <p className="text-slate-600">Gerir membros, funções e permissões</p>
        </div>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Membro
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <Select value={filterTeam} onValueChange={setFilterTeam}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por equipa" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Equipas</SelectItem>
            <SelectItem value="digital">Marketing Digital</SelectItem>
            <SelectItem value="content">Conteúdo</SelectItem>
            <SelectItem value="design">Design</SelectItem>
            <SelectItem value="analytics">Analytics</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Estados</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="inactive">Inativos</SelectItem>
            <SelectItem value="on_leave">Em Licença</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Team Grid */}
      {filteredMembers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">Nenhum membro encontrado</h3>
            <p className="text-slate-600 mb-6">Adicione o primeiro membro à equipa de marketing</p>
            <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Membro
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMembers.map((member) => (
            <Card key={member.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start gap-4 mb-4">
                  <Avatar className="w-16 h-16">
                    <AvatarImage src={member.photo_url} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-lg">
                      {member.full_name?.charAt(0)?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900">{member.full_name}</h3>
                    <p className="text-sm text-slate-600">{roleLabels[member.role]}</p>
                    <div className="flex gap-2 mt-2">
                      <Badge className={teamColors[member.team]}>
                        {teamLabels[member.team]}
                      </Badge>
                      <Badge variant={member.status === 'active' ? 'default' : 'secondary'}>
                        {statusLabels[member.status]}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-sm text-slate-600 mb-4">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    {member.user_email}
                  </div>
                  {member.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      {member.phone}
                    </div>
                  )}
                  {member.joined_date && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Desde {format(new Date(member.joined_date), 'dd/MM/yyyy')}
                    </div>
                  )}
                </div>

                {member.active_campaigns?.length > 0 && (
                  <div className="mb-4 p-3 bg-purple-50 rounded-lg">
                    <p className="text-xs font-medium text-purple-900 mb-1">Campanhas Ativas</p>
                    <p className="text-lg font-bold text-purple-700">{member.active_campaigns.length}</p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEdit(member)}>
                    <Edit className="w-4 h-4 mr-1" />
                    Editar
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      if (confirm(`Remover ${member.full_name} da equipa?`)) {
                        deleteMutation.mutate(member.id);
                      }
                    }}
                    className="text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingMember ? "Editar Membro" : "Adicionar Membro à Equipa"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6 mt-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
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
                  value={formData.user_email}
                  onChange={(e) => setFormData({...formData, user_email: e.target.value})}
                  placeholder="joao@zugruppe.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Telefone</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  placeholder="+351 912 345 678"
                />
              </div>
              <div>
                <Label>Data de Entrada</Label>
                <Input
                  type="date"
                  value={formData.joined_date}
                  onChange={(e) => setFormData({...formData, joined_date: e.target.value})}
                />
              </div>
            </div>

            {/* Role & Team */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Função *</Label>
                <Select value={formData.role} onValueChange={(v) => setFormData({...formData, role: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(roleLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Equipa *</Label>
                <Select value={formData.team} onValueChange={(v) => setFormData({...formData, team: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(teamLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Estado</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                    <SelectItem value="on_leave">Em Licença</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Biografia</Label>
              <Textarea
                value={formData.bio}
                onChange={(e) => setFormData({...formData, bio: e.target.value})}
                placeholder="Breve descrição sobre o membro da equipa..."
                rows={3}
              />
            </div>

            {/* Permissions */}
            <div className="border-t pt-4">
              <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-600" />
                Permissões de Acesso
              </h3>

              <div className="space-y-4">
                {/* Campaigns */}
                <Card className="bg-slate-50">
                  <CardContent className="p-4">
                    <p className="font-medium text-slate-900 mb-3 flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      Campanhas
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="campaigns-create"
                          checked={formData.permissions.campaigns.create}
                          onCheckedChange={(v) => updatePermission('campaigns', 'create', v)}
                        />
                        <Label htmlFor="campaigns-create" className="text-sm cursor-pointer">Criar</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="campaigns-edit"
                          checked={formData.permissions.campaigns.edit}
                          onCheckedChange={(v) => updatePermission('campaigns', 'edit', v)}
                        />
                        <Label htmlFor="campaigns-edit" className="text-sm cursor-pointer">Editar</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="campaigns-delete"
                          checked={formData.permissions.campaigns.delete}
                          onCheckedChange={(v) => updatePermission('campaigns', 'delete', v)}
                        />
                        <Label htmlFor="campaigns-delete" className="text-sm cursor-pointer">Eliminar</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="campaigns-view"
                          checked={formData.permissions.campaigns.view}
                          onCheckedChange={(v) => updatePermission('campaigns', 'view', v)}
                        />
                        <Label htmlFor="campaigns-view" className="text-sm cursor-pointer">Visualizar</Label>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Facebook Ads */}
                <Card className="bg-slate-50">
                  <CardContent className="p-4">
                    <p className="font-medium text-slate-900 mb-3 flex items-center gap-2">
                      <Facebook className="w-4 h-4" />
                      Facebook Ads
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="fb-manage"
                          checked={formData.permissions.facebook_ads.manage}
                          onCheckedChange={(v) => updatePermission('facebook_ads', 'manage', v)}
                        />
                        <Label htmlFor="fb-manage" className="text-sm cursor-pointer">Gerir Campanhas</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="fb-analytics"
                          checked={formData.permissions.facebook_ads.view_analytics}
                          onCheckedChange={(v) => updatePermission('facebook_ads', 'view_analytics', v)}
                        />
                        <Label htmlFor="fb-analytics" className="text-sm cursor-pointer">Ver Analytics</Label>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Email Marketing */}
                <Card className="bg-slate-50">
                  <CardContent className="p-4">
                    <p className="font-medium text-slate-900 mb-3 flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Email Marketing
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="email-send"
                          checked={formData.permissions.email_marketing.send}
                          onCheckedChange={(v) => updatePermission('email_marketing', 'send', v)}
                        />
                        <Label htmlFor="email-send" className="text-sm cursor-pointer">Enviar Emails</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="email-templates"
                          checked={formData.permissions.email_marketing.create_templates}
                          onCheckedChange={(v) => updatePermission('email_marketing', 'create_templates', v)}
                        />
                        <Label htmlFor="email-templates" className="text-sm cursor-pointer">Criar Templates</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="email-metrics"
                          checked={formData.permissions.email_marketing.view_metrics}
                          onCheckedChange={(v) => updatePermission('email_marketing', 'view_metrics', v)}
                        />
                        <Label htmlFor="email-metrics" className="text-sm cursor-pointer">Ver Métricas</Label>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Social Media */}
                <Card className="bg-slate-50">
                  <CardContent className="p-4">
                    <p className="font-medium text-slate-900 mb-3 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Redes Sociais
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="social-post"
                          checked={formData.permissions.social_media.post}
                          onCheckedChange={(v) => updatePermission('social_media', 'post', v)}
                        />
                        <Label htmlFor="social-post" className="text-sm cursor-pointer">Publicar</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="social-schedule"
                          checked={formData.permissions.social_media.schedule}
                          onCheckedChange={(v) => updatePermission('social_media', 'schedule', v)}
                        />
                        <Label htmlFor="social-schedule" className="text-sm cursor-pointer">Agendar</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="social-analytics"
                          checked={formData.permissions.social_media.analytics}
                          onCheckedChange={(v) => updatePermission('social_media', 'analytics', v)}
                        />
                        <Label htmlFor="social-analytics" className="text-sm cursor-pointer">Analytics</Label>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Analytics */}
                <Card className="bg-slate-50">
                  <CardContent className="p-4">
                    <p className="font-medium text-slate-900 mb-3 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4" />
                      Analytics & Relatórios
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="analytics-view"
                          checked={formData.permissions.analytics.view_reports}
                          onCheckedChange={(v) => updatePermission('analytics', 'view_reports', v)}
                        />
                        <Label htmlFor="analytics-view" className="text-sm cursor-pointer">Ver Relatórios</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="analytics-export"
                          checked={formData.permissions.analytics.export_data}
                          onCheckedChange={(v) => updatePermission('analytics', 'export_data', v)}
                        />
                        <Label htmlFor="analytics-export" className="text-sm cursor-pointer">Exportar Dados</Label>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={resetForm} className="flex-1">
                Cancelar
              </Button>
              <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700">
                {editingMember ? "Atualizar" : "Adicionar Membro"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}