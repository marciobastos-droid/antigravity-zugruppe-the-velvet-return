import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Activity, Search, Filter, User, Home, Users, FileText, 
  Calendar, CheckCircle, AlertCircle, Clock, Upload, Download,
  Repeat, Settings, Layers, ExternalLink, Eye, Edit, Trash2,
  Plus, RefreshCw, LogIn
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function ActivityFeed() {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [actionFilter, setActionFilter] = React.useState("all");
  const [entityFilter, setEntityFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [userFilter, setUserFilter] = React.useState("all");
  const [timeRange, setTimeRange] = React.useState("all");
  const navigate = useNavigate();

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const isAdmin = user && (user.role === 'admin' || user.user_type === 'admin' || user.user_type === 'gestor');

  const { data: auditLogs = [], isLoading } = useQuery({
    queryKey: ['auditLogs'],
    queryFn: async () => {
      const logs = await base44.entities.AuditLog.list('-created_date', 500);
      return logs;
    },
    enabled: isAdmin,
    refetchInterval: 10000 // Auto-refresh every 10 seconds
  });

  const { data: users = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list(),
    enabled: isAdmin
  });

  // Filter logs
  const filteredLogs = React.useMemo(() => {
    let filtered = auditLogs;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(log => 
        log.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.entity_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Action filter
    if (actionFilter !== "all") {
      filtered = filtered.filter(log => log.action === actionFilter);
    }

    // Entity filter
    if (entityFilter !== "all") {
      filtered = filtered.filter(log => log.entity_type === entityFilter);
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(log => log.status === statusFilter);
    }

    // User filter
    if (userFilter !== "all") {
      filtered = filtered.filter(log => log.user_email === userFilter);
    }

    // Time range filter
    if (timeRange !== "all") {
      const now = new Date();
      const cutoff = new Date();
      
      if (timeRange === "1h") cutoff.setHours(now.getHours() - 1);
      else if (timeRange === "24h") cutoff.setHours(now.getHours() - 24);
      else if (timeRange === "7d") cutoff.setDate(now.getDate() - 7);
      else if (timeRange === "30d") cutoff.setDate(now.getDate() - 30);
      
      filtered = filtered.filter(log => new Date(log.created_date) >= cutoff);
    }

    return filtered;
  }, [auditLogs, searchTerm, actionFilter, entityFilter, statusFilter, userFilter, timeRange]);

  // Get unique entity types
  const entityTypes = React.useMemo(() => {
    return [...new Set(auditLogs.map(log => log.entity_type).filter(Boolean))].sort();
  }, [auditLogs]);

  // Get action icon
  const getActionIcon = (action) => {
    const icons = {
      create: Plus,
      update: Edit,
      delete: Trash2,
      import: Upload,
      export: Download,
      sync: Repeat,
      login: LogIn,
      config_change: Settings,
      bulk_action: Layers
    };
    return icons[action] || Activity;
  };

  // Get action color
  const getActionColor = (action) => {
    const colors = {
      create: "text-green-600 bg-green-50",
      update: "text-blue-600 bg-blue-50",
      delete: "text-red-600 bg-red-50",
      import: "text-purple-600 bg-purple-50",
      export: "text-indigo-600 bg-indigo-50",
      sync: "text-amber-600 bg-amber-50",
      login: "text-slate-600 bg-slate-50",
      config_change: "text-orange-600 bg-orange-50",
      bulk_action: "text-cyan-600 bg-cyan-50"
    };
    return colors[action] || "text-slate-600 bg-slate-50";
  };

  // Get status badge
  const getStatusBadge = (status) => {
    if (status === 'success') return <Badge className="bg-green-100 text-green-700 h-5">Sucesso</Badge>;
    if (status === 'error') return <Badge className="bg-red-100 text-red-700 h-5">Erro</Badge>;
    if (status === 'warning') return <Badge className="bg-amber-100 text-amber-700 h-5">Aviso</Badge>;
    return null;
  };

  // Handle log click
  const handleLogClick = (log) => {
    if (log.entity_type === 'Property' && log.entity_id) {
      navigate(createPageUrl('MyListings'));
    } else if (log.entity_type === 'Opportunity' && log.entity_id) {
      navigate(createPageUrl('CRMAdvanced') + '?tab=opportunities');
    } else if (log.entity_type === 'BuyerProfile' && log.entity_id) {
      navigate(createPageUrl('CRMAdvanced') + '?tab=clients');
    } else if (log.entity_type === 'Appointment' && log.entity_id) {
      navigate(createPageUrl('CRMAdvanced') + '?tab=calendar');
    } else if (log.entity_type === 'Contract' && log.entity_id) {
      navigate(createPageUrl('Tools'));
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">Acesso Restrito</h2>
            <p className="text-slate-600">Apenas administradores podem aceder ao feed de atividades.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Activity className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Feed de Atividades</h1>
              <p className="text-slate-600">Registo cronológico de todas as ações no sistema</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
              {/* Search */}
              <div className="lg:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Pesquisar..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              {/* Action Filter */}
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Ação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Ações</SelectItem>
                  <SelectItem value="create">Criar</SelectItem>
                  <SelectItem value="update">Atualizar</SelectItem>
                  <SelectItem value="delete">Eliminar</SelectItem>
                  <SelectItem value="import">Importar</SelectItem>
                  <SelectItem value="export">Exportar</SelectItem>
                  <SelectItem value="sync">Sincronizar</SelectItem>
                  <SelectItem value="login">Login</SelectItem>
                  <SelectItem value="config_change">Configuração</SelectItem>
                  <SelectItem value="bulk_action">Ação em Massa</SelectItem>
                </SelectContent>
              </Select>

              {/* Entity Filter */}
              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Entidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Entidades</SelectItem>
                  {entityTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Estados</SelectItem>
                  <SelectItem value="success">Sucesso</SelectItem>
                  <SelectItem value="error">Erro</SelectItem>
                  <SelectItem value="warning">Aviso</SelectItem>
                </SelectContent>
              </Select>

              {/* User Filter */}
              <Select value={userFilter} onValueChange={setUserFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Utilizador" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Utilizadores</SelectItem>
                  {users.map(u => (
                    <SelectItem key={u.email} value={u.email}>
                      {u.full_name || u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Time Range Filter */}
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger>
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todo o Período</SelectItem>
                  <SelectItem value="1h">Última Hora</SelectItem>
                  <SelectItem value="24h">Últimas 24h</SelectItem>
                  <SelectItem value="7d">Últimos 7 Dias</SelectItem>
                  <SelectItem value="30d">Últimos 30 Dias</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Active Filters Summary */}
            {(actionFilter !== "all" || entityFilter !== "all" || statusFilter !== "all" || userFilter !== "all" || timeRange !== "all" || searchTerm) && (
              <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                <span className="text-xs text-slate-600">Filtros ativos:</span>
                {actionFilter !== "all" && (
                  <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => setActionFilter("all")}>
                    {actionFilter} <X className="w-3 h-3" />
                  </Badge>
                )}
                {entityFilter !== "all" && (
                  <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => setEntityFilter("all")}>
                    {entityFilter} <X className="w-3 h-3" />
                  </Badge>
                )}
                {statusFilter !== "all" && (
                  <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => setStatusFilter("all")}>
                    {statusFilter} <X className="w-3 h-3" />
                  </Badge>
                )}
                {userFilter !== "all" && (
                  <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => setUserFilter("all")}>
                    {users.find(u => u.email === userFilter)?.full_name || userFilter} <X className="w-3 h-3" />
                  </Badge>
                )}
                {timeRange !== "all" && (
                  <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => setTimeRange("all")}>
                    {timeRange} <X className="w-3 h-3" />
                  </Badge>
                )}
                {searchTerm && (
                  <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => setSearchTerm("")}>
                    "{searchTerm}" <X className="w-3 h-3" />
                  </Badge>
                )}
              </div>
            )}

            <div className="flex items-center justify-between mt-3 pt-3 border-t text-sm text-slate-600">
              <span>A mostrar <strong>{filteredLogs.length}</strong> de {auditLogs.length} atividades</span>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span className="text-xs">Atualização automática a cada 10s</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Activity Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Timeline de Atividades
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-20">
                <Activity className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-900 mb-2">Nenhuma atividade encontrada</h3>
                <p className="text-slate-600">Ajuste os filtros para ver mais resultados</p>
              </div>
            ) : (
              <ScrollArea className="h-[600px]">
                <div className="space-y-4 pr-4">
                  {filteredLogs.map((log, index) => {
                    const ActionIcon = getActionIcon(log.action);
                    const actionColor = getActionColor(log.action);
                    const isClickable = log.entity_id && ['Property', 'Opportunity', 'BuyerProfile', 'Appointment', 'Contract'].includes(log.entity_type);

                    return (
                      <div
                        key={log.id}
                        className={`flex gap-4 p-4 rounded-lg border bg-white hover:shadow-md transition-all ${
                          isClickable ? 'cursor-pointer' : ''
                        }`}
                        onClick={() => isClickable && handleLogClick(log)}
                      >
                        {/* Timeline Line */}
                        <div className="flex flex-col items-center">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${actionColor}`}>
                            <ActionIcon className="w-5 h-5" />
                          </div>
                          {index < filteredLogs.length - 1 && (
                            <div className="w-0.5 h-full bg-slate-200 mt-2" />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className="font-semibold text-slate-900">
                                  {log.user_name || log.user_email}
                                </span>
                                <span className="text-slate-600 text-sm">
                                  {log.action === 'create' ? 'criou' :
                                   log.action === 'update' ? 'atualizou' :
                                   log.action === 'delete' ? 'eliminou' :
                                   log.action === 'import' ? 'importou' :
                                   log.action === 'export' ? 'exportou' :
                                   log.action === 'sync' ? 'sincronizou' :
                                   log.action === 'login' ? 'fez login' :
                                   log.action === 'config_change' ? 'alterou configuração de' :
                                   log.action === 'bulk_action' ? 'executou ação em massa em' :
                                   log.action}
                                </span>
                                {log.entity_name && (
                                  <span className="font-medium text-slate-900">
                                    {log.entity_name}
                                  </span>
                                )}
                              </div>
                              
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="outline" className="h-5 text-xs">
                                  {log.entity_type}
                                </Badge>
                                {getStatusBadge(log.status)}
                                {isClickable && (
                                  <ExternalLink className="w-3 h-3 text-slate-400" />
                                )}
                              </div>
                            </div>

                            <div className="text-right">
                              <p className="text-xs text-slate-500">
                                {formatDistanceToNow(new Date(log.created_date), { addSuffix: true, locale: ptBR })}
                              </p>
                              <p className="text-xs text-slate-400">
                                {format(new Date(log.created_date), "dd/MM/yyyy HH:mm")}
                              </p>
                            </div>
                          </div>

                          {/* Details */}
                          {log.details && Object.keys(log.details).length > 0 && (
                            <div className="mt-2 p-3 bg-slate-50 rounded text-xs">
                              <p className="font-medium text-slate-700 mb-1">Detalhes:</p>
                              <div className="space-y-1 text-slate-600">
                                {Object.entries(log.details).slice(0, 3).map(([key, value]) => (
                                  <div key={key} className="flex gap-2">
                                    <span className="font-medium">{key}:</span>
                                    <span className="truncate">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
                                  </div>
                                ))}
                                {Object.keys(log.details).length > 3 && (
                                  <p className="text-slate-500 italic">+{Object.keys(log.details).length - 3} mais...</p>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Error Message */}
                          {log.error_message && (
                            <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded text-xs">
                              <p className="font-medium text-red-700 mb-1">Erro:</p>
                              <p className="text-red-600">{log.error_message}</p>
                            </div>
                          )}

                          {/* Additional Info */}
                          <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
                            {log.ip_address && (
                              <span>IP: {log.ip_address}</span>
                            )}
                            {log.user_agent && (
                              <span className="truncate max-w-[200px]" title={log.user_agent}>
                                {log.user_agent}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}