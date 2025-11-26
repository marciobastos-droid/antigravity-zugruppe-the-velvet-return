import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Mail, Search, CheckCircle2, XCircle, Clock, Eye, 
  RefreshCw, User, Building2, Calendar
} from "lucide-react";
import { format } from "date-fns";

const statusConfig = {
  pending: { label: "Pendente", icon: Clock, color: "bg-amber-100 text-amber-800" },
  sent: { label: "Enviado", icon: CheckCircle2, color: "bg-green-100 text-green-800" },
  failed: { label: "Falhou", icon: XCircle, color: "bg-red-100 text-red-800" },
  opened: { label: "Aberto", icon: Eye, color: "bg-blue-100 text-blue-800" }
};

export default function EmailHistory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedEmail, setSelectedEmail] = useState(null);

  const { data: emailLogs = [], isLoading, refetch } = useQuery({
    queryKey: ['emailLogs'],
    queryFn: () => base44.entities.EmailLog.list('-created_date', 100)
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['emailTemplates'],
    queryFn: () => base44.entities.EmailTemplate.list()
  });

  const getTemplateById = (id) => templates.find(t => t.id === id);

  const filteredLogs = emailLogs.filter(log => {
    const matchesSearch = searchTerm === "" ||
      log.recipient_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.recipient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.subject?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || log.status === statusFilter;
    const matchesType = typeFilter === "all" || log.recipient_type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const stats = {
    total: emailLogs.length,
    sent: emailLogs.filter(l => l.status === 'sent').length,
    failed: emailLogs.filter(l => l.status === 'failed').length,
    pending: emailLogs.filter(l => l.status === 'pending').length
  };

  if (isLoading) {
    return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-slate-50">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
            <div className="text-xs text-slate-600">Total</div>
          </CardContent>
        </Card>
        <Card className="bg-green-50">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-700">{stats.sent}</div>
            <div className="text-xs text-green-600">Enviados</div>
          </CardContent>
        </Card>
        <Card className="bg-red-50">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-700">{stats.failed}</div>
            <div className="text-xs text-red-600">Falhados</div>
          </CardContent>
        </Card>
        <Card className="bg-amber-50">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-amber-700">{stats.pending}</div>
            <div className="text-xs text-amber-600">Pendentes</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisar por email, nome ou assunto..."
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="sent">Enviados</SelectItem>
            <SelectItem value="failed">Falhados</SelectItem>
            <SelectItem value="pending">Pendentes</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="client">Clientes</SelectItem>
            <SelectItem value="opportunity">Oportunidades</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Email List */}
      {filteredLogs.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Mail className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="font-semibold text-slate-900 mb-2">Nenhum email encontrado</h3>
            <p className="text-slate-600">O histórico de emails aparecerá aqui</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredLogs.map((log) => {
            const config = statusConfig[log.status] || statusConfig.pending;
            const StatusIcon = config.icon;
            const template = getTemplateById(log.template_id);

            return (
              <Card 
                key={log.id} 
                className="hover:shadow-sm transition-shadow cursor-pointer"
                onClick={() => setSelectedEmail(log)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-full ${config.color}`}>
                        <StatusIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-900">{log.recipient_name || log.recipient_email}</span>
                          {log.recipient_type && (
                            <Badge variant="outline" className="text-xs">
                              {log.recipient_type === 'client' ? (
                                <><User className="w-3 h-3 mr-1" /> Cliente</>
                              ) : (
                                <><Building2 className="w-3 h-3 mr-1" /> Oportunidade</>
                              )}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 truncate max-w-md">{log.subject}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className={config.color}>{config.label}</Badge>
                      <div className="text-xs text-slate-500 mt-1 flex items-center gap-1 justify-end">
                        <Calendar className="w-3 h-3" />
                        {log.sent_at ? format(new Date(log.sent_at), "dd/MM/yy HH:mm") : format(new Date(log.created_date), "dd/MM/yy HH:mm")}
                      </div>
                      {template && (
                        <div className="text-xs text-slate-500 mt-0.5">
                          Template: {template.name}
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

      {/* Email Detail Dialog */}
      <Dialog open={!!selectedEmail} onOpenChange={(open) => !open && setSelectedEmail(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Email</DialogTitle>
          </DialogHeader>
          {selectedEmail && (
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500">Para</p>
                  <p className="font-medium">{selectedEmail.recipient_name}</p>
                  <p className="text-sm text-slate-600">{selectedEmail.recipient_email}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Estado</p>
                  <Badge className={statusConfig[selectedEmail.status]?.color}>
                    {statusConfig[selectedEmail.status]?.label}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Data</p>
                  <p className="text-sm">
                    {selectedEmail.sent_at 
                      ? format(new Date(selectedEmail.sent_at), "dd/MM/yyyy HH:mm") 
                      : format(new Date(selectedEmail.created_date), "dd/MM/yyyy HH:mm")}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Enviado por</p>
                  <p className="text-sm">{selectedEmail.sent_by || "Sistema"}</p>
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <div className="p-3 bg-slate-100 border-b">
                  <p className="text-sm text-slate-600">Assunto:</p>
                  <p className="font-medium">{selectedEmail.subject}</p>
                </div>
                <div className="p-4 bg-white max-h-[300px] overflow-y-auto">
                  <div 
                    className="prose prose-sm max-w-none whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{ __html: selectedEmail.body }}
                  />
                </div>
              </div>

              {selectedEmail.error_message && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">
                    <strong>Erro:</strong> {selectedEmail.error_message}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}