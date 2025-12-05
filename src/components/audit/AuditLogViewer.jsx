import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  History, Search, Filter, User, Calendar, Building2, Users, Target,
  Plus, Pencil, Trash2, Download, Upload, RefreshCw, Settings, Eye,
  CheckCircle, XCircle, AlertTriangle, ChevronLeft, ChevronRight,
  FileText, Database, Clock
} from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

const actionConfig = {
  create: { label: "Criação", icon: Plus, color: "bg-green-100 text-green-800" },
  update: { label: "Atualização", icon: Pencil, color: "bg-blue-100 text-blue-800" },
  delete: { label: "Eliminação", icon: Trash2, color: "bg-red-100 text-red-800" },
  import: { label: "Importação", icon: Download, color: "bg-purple-100 text-purple-800" },
  export: { label: "Exportação", icon: Upload, color: "bg-indigo-100 text-indigo-800" },
  sync: { label: "Sincronização", icon: RefreshCw, color: "bg-cyan-100 text-cyan-800" },
  login: { label: "Login", icon: User, color: "bg-slate-100 text-slate-800" },
  config_change: { label: "Config. Alterada", icon: Settings, color: "bg-amber-100 text-amber-800" },
  bulk_action: { label: "Ação em Massa", icon: Database, color: "bg-orange-100 text-orange-800" }
};

const entityConfig = {
  Property: { label: "Imóvel", icon: Building2 },
  ClientContact: { label: "Contacto", icon: Users },
  Opportunity: { label: "Oportunidade", icon: Target },
  SyncConfiguration: { label: "Config. Sync", icon: RefreshCw },
  Contract: { label: "Contrato", icon: FileText },
  Agent: { label: "Agente", icon: User },
  BuyerProfile: { label: "Perfil Cliente", icon: Users },
  User: { label: "Utilizador", icon: User },
  default: { label: "Registo", icon: Database }
};

const statusConfig = {
  success: { label: "Sucesso", icon: CheckCircle, color: "text-green-600" },
  error: { label: "Erro", icon: XCircle, color: "text-red-600" },
  warning: { label: "Aviso", icon: AlertTriangle, color: "text-amber-600" }
};

export default function AuditLogViewer() {
  const [filters, setFilters] = useState({
    action: "all",
    entity_type: "all",
    user_email: "",
    search: "",
    dateFrom: "",
    dateTo: ""
  });
  const [page, setPage] = useState(0);
  const [selectedLog, setSelectedLog] = useState(null);
  const pageSize = 50;

  const { data: logs = [], isLoading, refetch } = useQuery({
    queryKey: ['auditLogs', page],
    queryFn: () => base44.entities.AuditLog.list('-created_date', pageSize * 10) // Fetch more for filtering
  });

  // Apply client-side filters
  const filteredLogs = logs.filter(log => {
    if (filters.action !== "all" && log.action !== filters.action) return false;
    if (filters.entity_type !== "all" && log.entity_type !== filters.entity_type) return false;
    if (filters.user_email && !log.user_email?.toLowerCase().includes(filters.user_email.toLowerCase())) return false;
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesSearch = 
        log.entity_name?.toLowerCase().includes(searchLower) ||
        log.user_name?.toLowerCase().includes(searchLower) ||
        log.entity_id?.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }
    if (filters.dateFrom && new Date(log.created_date) < new Date(filters.dateFrom)) return false;
    if (filters.dateTo && new Date(log.created_date) > new Date(filters.dateTo + 'T23:59:59')) return false;
    return true;
  });

  const paginatedLogs = filteredLogs.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.ceil(filteredLogs.length / pageSize);

  // Get unique entity types from logs
  const uniqueEntityTypes = [...new Set(logs.map(l => l.entity_type))].filter(Boolean);

  // Statistics
  const stats = {
    total: filteredLogs.length,
    creates: filteredLogs.filter(l => l.action === 'create').length,
    updates: filteredLogs.filter(l => l.action === 'update').length,
    deletes: filteredLogs.filter(l => l.action === 'delete').length,
    errors: filteredLogs.filter(l => l.status === 'error').length
  };

  const resetFilters = () => {
    setFilters({
      action: "all",
      entity_type: "all",
      user_email: "",
      search: "",
      dateFrom: "",
      dateTo: ""
    });
    setPage(0);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <History className="w-6 h-6 text-indigo-600" />
                Log de Auditoria
              </CardTitle>
              <CardDescription>
                Histórico de todas as ações realizadas na aplicação
              </CardDescription>
            </div>
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-slate-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
              <p className="text-xs text-slate-500">Total</p>
            </div>
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-green-600">{stats.creates}</p>
              <p className="text-xs text-slate-500">Criações</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-blue-600">{stats.updates}</p>
              <p className="text-xs text-slate-500">Atualizações</p>
            </div>
            <div className="bg-red-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-red-600">{stats.deletes}</p>
              <p className="text-xs text-slate-500">Eliminações</p>
            </div>
            <div className="bg-amber-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-amber-600">{stats.errors}</p>
              <p className="text-xs text-slate-500">Erros</p>
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3 mb-4">
            <div>
              <Label className="text-xs mb-1 block">Pesquisa</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Pesquisar..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="pl-8"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs mb-1 block">Ação</Label>
              <Select value={filters.action} onValueChange={(v) => setFilters({ ...filters, action: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {Object.entries(actionConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>{config.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-1 block">Entidade</Label>
              <Select value={filters.entity_type} onValueChange={(v) => setFilters({ ...filters, entity_type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {uniqueEntityTypes.map(type => (
                    <SelectItem key={type} value={type}>
                      {entityConfig[type]?.label || type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-1 block">Utilizador</Label>
              <Input
                placeholder="Email..."
                value={filters.user_email}
                onChange={(e) => setFilters({ ...filters, user_email: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Data Início</Label>
              <Input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Data Fim</Label>
              <Input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end mb-4">
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              <Filter className="w-4 h-4 mr-2" />
              Limpar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logs List */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : paginatedLogs.length === 0 ? (
            <div className="text-center py-12">
              <History className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">Nenhum registo encontrado</p>
            </div>
          ) : (
            <div className="divide-y">
              {paginatedLogs.map((log) => {
                const action = actionConfig[log.action] || actionConfig.update;
                const entity = entityConfig[log.entity_type] || entityConfig.default;
                const status = statusConfig[log.status] || statusConfig.success;
                const ActionIcon = action.icon;
                const EntityIcon = entity.icon;
                const StatusIcon = status.icon;

                return (
                  <div
                    key={log.id}
                    className="p-4 hover:bg-slate-50 cursor-pointer transition-colors"
                    onClick={() => setSelectedLog(log)}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`p-2 rounded-lg ${action.color}`}>
                        <ActionIcon className="w-4 h-4" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="gap-1">
                            <EntityIcon className="w-3 h-3" />
                            {entity.label}
                          </Badge>
                          <span className="font-medium text-slate-900">
                            {log.entity_name || log.entity_id || "—"}
                          </span>
                          <StatusIcon className={`w-4 h-4 ${status.color}`} />
                        </div>
                        
                        <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {log.user_name || log.user_email}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(new Date(log.created_date), "dd/MM/yyyy HH:mm", { locale: pt })}
                          </span>
                        </div>

                        {log.error_message && (
                          <p className="text-sm text-red-600 mt-1">{log.error_message}</p>
                        )}
                      </div>

                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t">
              <p className="text-sm text-slate-500">
                A mostrar {page * pageSize + 1}-{Math.min((page + 1) * pageSize, filteredLogs.length)} de {filteredLogs.length}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Detalhes do Log
            </DialogTitle>
          </DialogHeader>
          
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-slate-500">Ação</Label>
                  <Badge className={actionConfig[selectedLog.action]?.color}>
                    {actionConfig[selectedLog.action]?.label || selectedLog.action}
                  </Badge>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Estado</Label>
                  <Badge variant={selectedLog.status === 'success' ? 'default' : 'destructive'}>
                    {statusConfig[selectedLog.status]?.label}
                  </Badge>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Utilizador</Label>
                  <p className="font-medium">{selectedLog.user_name || selectedLog.user_email}</p>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Data/Hora</Label>
                  <p>{format(new Date(selectedLog.created_date), "dd/MM/yyyy HH:mm:ss", { locale: pt })}</p>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Entidade</Label>
                  <p>{entityConfig[selectedLog.entity_type]?.label || selectedLog.entity_type}</p>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">ID do Registo</Label>
                  <p className="font-mono text-sm">{selectedLog.entity_id || "—"}</p>
                </div>
              </div>

              {selectedLog.entity_name && (
                <div>
                  <Label className="text-xs text-slate-500">Nome/Título</Label>
                  <p className="font-medium">{selectedLog.entity_name}</p>
                </div>
              )}

              {selectedLog.error_message && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <Label className="text-xs text-red-600">Mensagem de Erro</Label>
                  <p className="text-red-800">{selectedLog.error_message}</p>
                </div>
              )}

              {selectedLog.details && Object.keys(selectedLog.details).length > 0 && (
                <div>
                  <Label className="text-xs text-slate-500 mb-2 block">Detalhes</Label>
                  <ScrollArea className="h-48 rounded-lg border">
                    <pre className="p-3 text-xs font-mono bg-slate-50">
                      {JSON.stringify(selectedLog.details, null, 2)}
                    </pre>
                  </ScrollArea>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-xs text-slate-500">
                <div>
                  <Label className="text-xs text-slate-400">IP</Label>
                  <p>{selectedLog.ip_address || "—"}</p>
                </div>
                <div>
                  <Label className="text-xs text-slate-400">User Agent</Label>
                  <p className="truncate">{selectedLog.user_agent || "—"}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}