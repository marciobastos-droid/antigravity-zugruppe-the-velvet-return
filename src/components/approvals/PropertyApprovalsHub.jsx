import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  CheckCircle2, XCircle, Clock, AlertCircle, Filter, Search,
  Building2, MapPin, Euro, Bed, Bath, User, Calendar, Eye,
  Settings, Bell, Mail, MessageSquare, FileCheck, Users,
  TrendingUp, BarChart3, ChevronDown, ChevronUp
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const APPROVAL_STEPS = [
  { id: "initial_review", label: "Revisão Inicial", description: "Verificação de dados básicos" },
  { id: "quality_check", label: "Controlo de Qualidade", description: "Verificação de fotos e descrição" },
  { id: "pricing_review", label: "Revisão de Preço", description: "Validação do preço de mercado" },
  { id: "final_approval", label: "Aprovação Final", description: "Aprovação executiva" }
];

export default function PropertyApprovalsHub() {
  const queryClient = useQueryClient();
  const [selectedProperties, setSelectedProperties] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("all");
  const [agentFilter, setAgentFilter] = useState("all");
  const [bulkActionDialog, setBulkActionDialog] = useState(null);
  const [bulkFeedback, setBulkFeedback] = useState("");
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [detailsDialog, setDetailsDialog] = useState(false);
  const [settingsDialog, setSettingsDialog] = useState(false);
  const [expandedProperty, setExpandedProperty] = useState(null);

  // Multi-step approval settings
  const [approvalSettings, setApprovalSettings] = useState({
    multi_step_enabled: false,
    required_steps: ["initial_review", "final_approval"],
    auto_notify_agent: true,
    auto_notify_admin: true,
    require_feedback_on_reject: true,
    notification_channels: ["email", "system"]
  });

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const isAdmin = user && (user.role === 'admin' || user.user_type?.toLowerCase() === 'admin' || user.user_type?.toLowerCase() === 'gestor');

  const { data: pendingProperties = [], isLoading } = useQuery({
    queryKey: ['pendingApprovalProperties'],
    queryFn: async () => {
      const props = await base44.entities.Property.filter({ approval_status: "pending" });
      return props.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    },
    enabled: !!user && isAdmin
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: () => base44.entities.Agent.filter({ is_active: true })
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list('full_name')
  });

  const approveMutation = useMutation({
    mutationFn: async ({ propertyIds, feedback }) => {
      const results = await Promise.allSettled(
        propertyIds.map(async (id) => {
          const property = pendingProperties.find(p => p.id === id);
          await base44.entities.Property.update(id, {
            approval_status: "approved",
            availability_status: "available",
            approved_by: user.email,
            approved_date: new Date().toISOString(),
            approval_feedback: feedback || "Aprovado"
          });

          // Notificar agente
          if (property?.assigned_consultant) {
            await base44.functions.invoke('notifyPropertyApproval', {
              property_id: id,
              property_title: property.title,
              agent_email: property.assigned_consultant,
              status: "approved",
              feedback: feedback || "Aprovado",
              approved_by: user.email
            });
          }

          return { id, success: true };
        })
      );

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      return { successful, failed };
    },
    onSuccess: (result) => {
      toast.success(`${result.successful} imóvel(is) aprovado(s)${result.failed > 0 ? `, ${result.failed} falharam` : ''}`);
      queryClient.invalidateQueries({ queryKey: ['pendingApprovalProperties'] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      setSelectedProperties([]);
      setBulkActionDialog(null);
      setBulkFeedback("");
    }
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ propertyIds, feedback }) => {
      const results = await Promise.allSettled(
        propertyIds.map(async (id) => {
          const property = pendingProperties.find(p => p.id === id);
          await base44.entities.Property.update(id, {
            approval_status: "rejected",
            availability_status: "withdrawn",
            approved_by: user.email,
            approved_date: new Date().toISOString(),
            rejection_reason: feedback || "Não aprovado",
            approval_feedback: feedback || "Não aprovado"
          });

          // Notificar agente
          if (property?.assigned_consultant) {
            await base44.functions.invoke('notifyPropertyApproval', {
              property_id: id,
              property_title: property.title,
              agent_email: property.assigned_consultant,
              status: "rejected",
              feedback: feedback || "Não aprovado",
              approved_by: user.email
            });
          }

          return { id, success: true };
        })
      );

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      return { successful, failed };
    },
    onSuccess: (result) => {
      toast.success(`${result.successful} imóvel(is) rejeitado(s)${result.failed > 0 ? `, ${result.failed} falharam` : ''}`);
      queryClient.invalidateQueries({ queryKey: ['pendingApprovalProperties'] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      setSelectedProperties([]);
      setBulkActionDialog(null);
      setBulkFeedback("");
    }
  });

  // Filtered properties
  const filteredProperties = useMemo(() => {
    return pendingProperties.filter(p => {
      if (searchTerm && !(
        p.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.ref_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.city?.toLowerCase().includes(searchTerm.toLowerCase())
      )) return false;

      if (typeFilter !== "all" && p.property_type !== typeFilter) return false;
      if (cityFilter !== "all" && p.city !== cityFilter) return false;
      if (agentFilter !== "all" && p.assigned_consultant !== agentFilter) return false;

      return true;
    });
  }, [pendingProperties, searchTerm, typeFilter, cityFilter, agentFilter]);

  // Stats
  const stats = useMemo(() => {
    const total = pendingProperties.length;
    const last24h = pendingProperties.filter(p => 
      new Date(p.created_date) > new Date(Date.now() - 24 * 60 * 60 * 1000)
    ).length;
    const last7days = pendingProperties.filter(p => 
      new Date(p.created_date) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    ).length;
    const avgDaysPending = total > 0 
      ? Math.round(pendingProperties.reduce((sum, p) => 
          sum + (new Date() - new Date(p.created_date)) / (1000 * 60 * 60 * 24), 0
        ) / total)
      : 0;

    return { total, last24h, last7days, avgDaysPending };
  }, [pendingProperties]);

  const uniqueCities = useMemo(() => 
    [...new Set(pendingProperties.map(p => p.city).filter(Boolean))].sort(),
    [pendingProperties]
  );

  const uniqueAgents = useMemo(() => {
    const agentEmails = [...new Set(pendingProperties.map(p => p.assigned_consultant).filter(Boolean))];
    return agentEmails.map(email => {
      const user = allUsers.find(u => u.email === email);
      const agent = agents.find(a => a.email === email);
      return {
        email,
        name: user?.display_name || user?.full_name || agent?.full_name || email
      };
    });
  }, [pendingProperties, allUsers, agents]);

  const toggleSelection = (id) => {
    setSelectedProperties(prev =>
      prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    setSelectedProperties(prev =>
      prev.length === filteredProperties.length ? [] : filteredProperties.map(p => p.id)
    );
  };

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Acesso Restrito</h3>
          <p className="text-slate-600">Apenas administradores e gestores podem gerir aprovações.</p>
        </CardContent>
      </Card>
    );
  }

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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Gestão de Aprovações</h2>
          <p className="text-slate-600">Aprovar e gerir imóveis pendentes</p>
        </div>
        <Button variant="outline" onClick={() => setSettingsDialog(true)}>
          <Settings className="w-4 h-4 mr-2" />
          Configurações
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4 text-center">
            <Clock className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
            <p className="text-sm text-blue-700">Pendentes</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <CardContent className="p-4 text-center">
            <AlertCircle className="w-8 h-8 text-amber-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-amber-900">{stats.last24h}</p>
            <p className="text-sm text-amber-700">Últimas 24h</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-8 h-8 text-purple-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-purple-900">{stats.last7days}</p>
            <p className="text-sm text-purple-700">Últimos 7 dias</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200">
          <CardContent className="p-4 text-center">
            <BarChart3 className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-slate-900">{stats.avgDaysPending}</p>
            <p className="text-sm text-slate-700">Dias médios</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid md:grid-cols-5 gap-3">
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Pesquisar por título, ref, cidade..."
                className="pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Tipos</SelectItem>
                <SelectItem value="apartment">Apartamento</SelectItem>
                <SelectItem value="house">Moradia</SelectItem>
                <SelectItem value="land">Terreno</SelectItem>
                <SelectItem value="building">Prédio</SelectItem>
              </SelectContent>
            </Select>
            <Select value={cityFilter} onValueChange={setCityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Cidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Cidades</SelectItem>
                {uniqueCities.map(city => (
                  <SelectItem key={city} value={city}>{city}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={agentFilter} onValueChange={setAgentFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Agente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Agentes</SelectItem>
                {uniqueAgents.map(agent => (
                  <SelectItem key={agent.email} value={agent.email}>{agent.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions Bar */}
      {selectedProperties.length > 0 && (
        <Card className="border-blue-300 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                <span className="font-semibold text-blue-900">
                  {selectedProperties.length} imóvel(is) selecionado(s)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => setBulkActionDialog("approve")}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                  Aprovar Selecionados
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setBulkActionDialog("reject")}
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  Rejeitar Selecionados
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedProperties([])}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Properties List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Imóveis Pendentes ({filteredProperties.length})</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleSelectAll}
            >
              {selectedProperties.length === filteredProperties.length && filteredProperties.length > 0
                ? 'Desselecionar Todos'
                : 'Selecionar Todos'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {filteredProperties.length === 0 ? (
            <div className="text-center py-12">
              <FileCheck className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                {pendingProperties.length === 0 ? 'Nenhum imóvel pendente' : 'Nenhum resultado'}
              </h3>
              <p className="text-slate-600">
                {pendingProperties.length === 0 
                  ? 'Todos os imóveis foram aprovados ou rejeitados.'
                  : 'Ajuste os filtros para ver resultados.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredProperties.map((property) => {
                const isExpanded = expandedProperty === property.id;
                const isSelected = selectedProperties.includes(property.id);
                const daysPending = Math.floor((new Date() - new Date(property.created_date)) / (1000 * 60 * 60 * 24));
                const assignedUser = allUsers.find(u => u.email === property.assigned_consultant);
                const assignedAgent = agents.find(a => a.email === property.assigned_consultant);

                return (
                  <Card 
                    key={property.id}
                    className={`transition-all ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50/30' : ''}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        {/* Checkbox */}
                        <div className="pt-1">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelection(property.id)}
                          />
                        </div>

                        {/* Image */}
                        <div className="flex-shrink-0">
                          {property.images?.[0] ? (
                            <img
                              src={property.images[0]}
                              alt={property.title}
                              className="w-24 h-24 object-cover rounded-lg"
                            />
                          ) : (
                            <div className="w-24 h-24 bg-slate-200 rounded-lg flex items-center justify-center">
                              <Building2 className="w-8 h-8 text-slate-400" />
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                {property.ref_id && (
                                  <Badge variant="outline" className="font-mono text-xs">
                                    {property.ref_id}
                                  </Badge>
                                )}
                                {daysPending > 3 && (
                                  <Badge className="bg-amber-100 text-amber-800">
                                    <Clock className="w-3 h-3 mr-1" />
                                    {daysPending} dias
                                  </Badge>
                                )}
                              </div>
                              <h3 className="font-semibold text-slate-900 mb-1 line-clamp-1">
                                {property.title}
                              </h3>
                              <div className="flex items-center gap-3 text-sm text-slate-600 flex-wrap">
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {property.city}
                                </span>
                                <span className="flex items-center gap-1 font-semibold text-green-600">
                                  <Euro className="w-3 h-3" />
                                  {property.price?.toLocaleString()}
                                </span>
                                {property.bedrooms > 0 && (
                                  <span className="flex items-center gap-1">
                                    <Bed className="w-3 h-3" />
                                    T{property.bedrooms}
                                  </span>
                                )}
                              </div>
                              {assignedUser && (
                                <div className="flex items-center gap-1 mt-2 text-xs text-slate-500">
                                  <User className="w-3 h-3" />
                                  {assignedUser.display_name || assignedUser.full_name}
                                </div>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedProperty(property);
                                  setDetailsDialog(true);
                                }}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                Ver
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => approveMutation.mutate({ propertyIds: [property.id], feedback: "" })}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle2 className="w-4 h-4 mr-1" />
                                Aprovar
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  setSelectedProperty(property);
                                  setBulkActionDialog("reject");
                                }}
                              >
                                <XCircle className="w-4 h-4 mr-1" />
                                Rejeitar
                              </Button>
                            </div>
                          </div>

                          {/* Expandable Details */}
                          <button
                            onClick={() => setExpandedProperty(isExpanded ? null : property.id)}
                            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 mt-2"
                          >
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            {isExpanded ? 'Menos detalhes' : 'Mais detalhes'}
                          </button>

                          {isExpanded && (
                            <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                              <p className="text-sm text-slate-700 line-clamp-3">{property.description}</p>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                                {property.bathrooms > 0 && (
                                  <span className="flex items-center gap-1">
                                    <Bath className="w-3 h-3" />
                                    {property.bathrooms} WC
                                  </span>
                                )}
                                {property.useful_area && (
                                  <span className="flex items-center gap-1">
                                    {property.useful_area}m²
                                  </span>
                                )}
                                {property.year_built && (
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {property.year_built}
                                  </span>
                                )}
                                <span className="flex items-center gap-1 text-slate-500">
                                  Criado: {format(new Date(property.created_date), "dd/MM/yy")}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk Action Dialog */}
      <Dialog open={!!bulkActionDialog} onOpenChange={(open) => !open && setBulkActionDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {bulkActionDialog === "approve" ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  Aprovar {selectedProperty ? '1 Imóvel' : `${selectedProperties.length} Imóveis`}
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-red-600" />
                  Rejeitar {selectedProperty ? '1 Imóvel' : `${selectedProperties.length} Imóveis`}
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>
                Feedback {bulkActionDialog === "reject" && approvalSettings.require_feedback_on_reject ? "*" : "(Opcional)"}
              </Label>
              <Textarea
                value={bulkFeedback}
                onChange={(e) => setBulkFeedback(e.target.value)}
                placeholder={bulkActionDialog === "approve" 
                  ? "Mensagem de aprovação para o(s) agente(s)..."
                  : "Motivo da rejeição e sugestões de melhoria..."
                }
                rows={4}
                required={bulkActionDialog === "reject" && approvalSettings.require_feedback_on_reject}
              />
            </div>

            {approvalSettings.auto_notify_agent && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <Bell className="w-4 h-4 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium">Notificação automática</p>
                    <p className="text-xs text-blue-600 mt-1">
                      {selectedProperty ? 'O agente' : 'Os agentes'} responsável(is) será(ão) notificado(s) por email e sistema.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setBulkActionDialog(null);
                  setBulkFeedback("");
                  setSelectedProperty(null);
                }}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  const ids = selectedProperty ? [selectedProperty.id] : selectedProperties;
                  if (bulkActionDialog === "approve") {
                    approveMutation.mutate({ propertyIds: ids, feedback: bulkFeedback });
                  } else {
                    if (approvalSettings.require_feedback_on_reject && !bulkFeedback.trim()) {
                      toast.error("Feedback é obrigatório para rejeição");
                      return;
                    }
                    rejectMutation.mutate({ propertyIds: ids, feedback: bulkFeedback });
                  }
                }}
                disabled={approveMutation.isPending || rejectMutation.isPending}
                className={`flex-1 ${bulkActionDialog === "approve" ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
              >
                {bulkActionDialog === "approve" ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Confirmar Aprovação
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 mr-2" />
                    Confirmar Rejeição
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Property Details Dialog */}
      <Dialog open={detailsDialog} onOpenChange={setDetailsDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Imóvel</DialogTitle>
          </DialogHeader>

          {selectedProperty && (
            <div className="space-y-4 mt-4">
              {/* Image Gallery */}
              {selectedProperty.images?.length > 0 && (
                <div className="grid grid-cols-4 gap-2">
                  {selectedProperty.images.slice(0, 4).map((img, idx) => (
                    <img
                      key={idx}
                      src={img}
                      alt={`${selectedProperty.title} ${idx + 1}`}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                  ))}
                </div>
              )}

              {/* Basic Info */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-slate-500">Título</Label>
                  <p className="font-semibold text-slate-900">{selectedProperty.title}</p>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Referência</Label>
                  <p className="font-mono text-slate-900">{selectedProperty.ref_id || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Preço</Label>
                  <p className="font-bold text-green-600 text-xl">€{selectedProperty.price?.toLocaleString()}</p>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Localização</Label>
                  <p className="text-slate-900">{selectedProperty.city}, {selectedProperty.state}</p>
                </div>
              </div>

              {/* Description */}
              <div>
                <Label className="text-xs text-slate-500">Descrição</Label>
                <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border max-h-32 overflow-y-auto">
                  {selectedProperty.description || 'Sem descrição'}
                </p>
              </div>

              {/* Quick Info */}
              <div className="grid grid-cols-4 gap-3">
                <div className="text-center p-3 bg-slate-50 rounded-lg">
                  <Bed className="w-5 h-5 text-slate-600 mx-auto mb-1" />
                  <p className="text-lg font-bold text-slate-900">{selectedProperty.bedrooms || 0}</p>
                  <p className="text-xs text-slate-600">Quartos</p>
                </div>
                <div className="text-center p-3 bg-slate-50 rounded-lg">
                  <Bath className="w-5 h-5 text-slate-600 mx-auto mb-1" />
                  <p className="text-lg font-bold text-slate-900">{selectedProperty.bathrooms || 0}</p>
                  <p className="text-xs text-slate-600">WC</p>
                </div>
                <div className="text-center p-3 bg-slate-50 rounded-lg">
                  <p className="text-lg font-bold text-slate-900">{selectedProperty.useful_area || selectedProperty.square_feet || 0}</p>
                  <p className="text-xs text-slate-600">m²</p>
                </div>
                <div className="text-center p-3 bg-slate-50 rounded-lg">
                  <Calendar className="w-5 h-5 text-slate-600 mx-auto mb-1" />
                  <p className="text-lg font-bold text-slate-900">{selectedProperty.year_built || 'N/A'}</p>
                  <p className="text-xs text-slate-600">Ano</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => window.open(`${createPageUrl("PropertyDetails")}?id=${selectedProperty.id}`, '_blank')}
                  className="flex-1"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Ver Página Completa
                </Button>
                <Button
                  onClick={() => {
                    setDetailsDialog(false);
                    approveMutation.mutate({ propertyIds: [selectedProperty.id], feedback: "" });
                  }}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Aprovar
                </Button>
                <Button
                  onClick={() => {
                    setDetailsDialog(false);
                    setBulkActionDialog("reject");
                  }}
                  variant="destructive"
                  className="flex-1"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Rejeitar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={settingsDialog} onOpenChange={setSettingsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Configurações de Aprovação
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="notifications" className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="notifications">Notificações</TabsTrigger>
              <TabsTrigger value="workflow">Fluxo de Trabalho</TabsTrigger>
            </TabsList>

            <TabsContent value="notifications" className="space-y-4 mt-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <p className="font-medium text-slate-900">Notificar agente automaticamente</p>
                    <p className="text-xs text-slate-600">Enviar notificação ao aprovar/rejeitar</p>
                  </div>
                  <Switch
                    checked={approvalSettings.auto_notify_agent}
                    onCheckedChange={(checked) => 
                      setApprovalSettings({...approvalSettings, auto_notify_agent: checked})
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <p className="font-medium text-slate-900">Notificar administradores</p>
                    <p className="text-xs text-slate-600">Alertar admins sobre novos imóveis pendentes</p>
                  </div>
                  <Switch
                    checked={approvalSettings.auto_notify_admin}
                    onCheckedChange={(checked) => 
                      setApprovalSettings({...approvalSettings, auto_notify_admin: checked})
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <p className="font-medium text-slate-900">Feedback obrigatório na rejeição</p>
                    <p className="text-xs text-slate-600">Exigir motivo ao rejeitar imóveis</p>
                  </div>
                  <Switch
                    checked={approvalSettings.require_feedback_on_reject}
                    onCheckedChange={(checked) => 
                      setApprovalSettings({...approvalSettings, require_feedback_on_reject: checked})
                    }
                  />
                </div>

                <div className="p-3 bg-slate-50 rounded-lg">
                  <Label className="text-sm font-medium mb-2 block">Canais de Notificação</Label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={approvalSettings.notification_channels.includes("email")}
                        onCheckedChange={(checked) => {
                          const channels = checked
                            ? [...approvalSettings.notification_channels, "email"]
                            : approvalSettings.notification_channels.filter(c => c !== "email");
                          setApprovalSettings({...approvalSettings, notification_channels: channels});
                        }}
                      />
                      <Mail className="w-4 h-4 text-blue-600" />
                      <span className="text-sm">Email</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={approvalSettings.notification_channels.includes("system")}
                        onCheckedChange={(checked) => {
                          const channels = checked
                            ? [...approvalSettings.notification_channels, "system"]
                            : approvalSettings.notification_channels.filter(c => c !== "system");
                          setApprovalSettings({...approvalSettings, notification_channels: channels});
                        }}
                      />
                      <Bell className="w-4 h-4 text-purple-600" />
                      <span className="text-sm">Notificações do Sistema</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={approvalSettings.notification_channels.includes("whatsapp")}
                        onCheckedChange={(checked) => {
                          const channels = checked
                            ? [...approvalSettings.notification_channels, "whatsapp"]
                            : approvalSettings.notification_channels.filter(c => c !== "whatsapp");
                          setApprovalSettings({...approvalSettings, notification_channels: channels});
                        }}
                      />
                      <MessageSquare className="w-4 h-4 text-green-600" />
                      <span className="text-sm">WhatsApp</span>
                    </label>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="workflow" className="space-y-4 mt-4">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <p className="font-medium text-slate-900">Aprovação em Múltiplos Passos</p>
                  <p className="text-xs text-slate-600">Ativar fluxo de aprovação em etapas</p>
                </div>
                <Switch
                  checked={approvalSettings.multi_step_enabled}
                  onCheckedChange={(checked) => 
                    setApprovalSettings({...approvalSettings, multi_step_enabled: checked})
                  }
                />
              </div>

              {approvalSettings.multi_step_enabled && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm font-medium text-amber-900 mb-3">Passos Obrigatórios</p>
                  <div className="space-y-2">
                    {APPROVAL_STEPS.map((step) => (
                      <label key={step.id} className="flex items-start gap-2 cursor-pointer">
                        <Checkbox
                          checked={approvalSettings.required_steps.includes(step.id)}
                          onCheckedChange={(checked) => {
                            const steps = checked
                              ? [...approvalSettings.required_steps, step.id]
                              : approvalSettings.required_steps.filter(s => s !== step.id);
                            setApprovalSettings({...approvalSettings, required_steps: steps});
                          }}
                        />
                        <div>
                          <p className="text-sm font-medium text-slate-900">{step.label}</p>
                          <p className="text-xs text-slate-600">{step.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-amber-700 mt-3 bg-amber-100 p-2 rounded">
                    ⚠️ Funcionalidade em desenvolvimento. Atualmente apenas aprovação simples está ativa.
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setSettingsDialog(false)}>
              Fechar
            </Button>
            <Button onClick={() => {
              toast.success("Configurações guardadas!");
              setSettingsDialog(false);
            }}>
              Guardar Configurações
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}