import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Shield, Clock, CheckCircle2, XCircle, AlertTriangle, FileText, Download, Trash2, User, Settings, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import DSARWorkflowView from "./DSARWorkflowView";
import GDPRSettingsPanel from "./GDPRSettingsPanel";

export default function GDPRAdminPanel() {
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = React.useState(null);
  const [showRequestDialog, setShowRequestDialog] = React.useState(false);
  const [processingNotes, setProcessingNotes] = React.useState("");

  const { data: dsarRequests = [] } = useQuery({
    queryKey: ['dsarRequests'],
    queryFn: () => base44.entities.DSARRequest.list('-created_date')
  });

  const { data: gdprLogs = [] } = useQuery({
    queryKey: ['gdprLogs'],
    queryFn: () => base44.entities.GDPRLog.list('-created_date', 100)
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ['clientContacts'],
    queryFn: () => base44.entities.ClientContact.list()
  });

  const processRequestMutation = useMutation({
    mutationFn: async ({ requestId, action, notes }) => {
      const request = dsarRequests.find(r => r.id === requestId);
      if (!request) throw new Error("Pedido não encontrado");

      const user = await base44.auth.me();
      const updates = {
        status: action === "approve" ? "in_progress" : "rejected",
        assigned_to: user.email,
        validation_notes: notes,
        validated_by: user.email,
        validated_date: new Date().toISOString()
      };

      if (action === "reject") {
        updates.rejection_reason = notes;
        updates.status = "rejected";
      }

      await base44.entities.DSARRequest.update(requestId, updates);

      // Log da ação
      await base44.entities.GDPRLog.create({
        contact_email: request.requester_email,
        action_type: `data_${request.request_type}_request`,
        description: action === "approve" 
          ? `Pedido aprovado e em processamento: ${notes}`
          : `Pedido rejeitado: ${notes}`,
        performed_by: user.email,
        performed_by_name: user.full_name,
        legal_basis: "consent",
        request_status: action === "approve" ? "in_progress" : "rejected",
        metadata: { dsar_request_id: requestId }
      });

      // Notificar o titular
      const statusText = action === "approve" 
        ? "foi aprovado e está a ser processado" 
        : "foi rejeitado";
      
      await base44.integrations.Core.SendEmail({
        to: request.requester_email,
        subject: `Pedido RGPD - ${getRequestTypeLabel(request.request_type)}`,
        body: `
Caro(a) ${request.requester_name},

O seu pedido de ${getRequestTypeLabel(request.request_type).toLowerCase()} ${statusText}.

${action === "approve" 
  ? `Estamos a processar o seu pedido e enviaremos a resposta dentro do prazo legal.`
  : `Motivo: ${notes}`
}

Com os melhores cumprimentos,
Equipa ZuGruppe
        `
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dsarRequests'] });
      queryClient.invalidateQueries({ queryKey: ['gdprLogs'] });
      setShowRequestDialog(false);
      setSelectedRequest(null);
      setProcessingNotes("");
      toast.success("Pedido processado");
    },
    onError: (error) => {
      toast.error("Erro ao processar: " + error.message);
    }
  });

  const exportDataMutation = useMutation({
    mutationFn: async (requestId) => {
      const request = dsarRequests.find(r => r.id === requestId);
      const relatedContacts = contacts.filter(c => 
        c.email?.toLowerCase() === request.requester_email?.toLowerCase()
      );

      const { data } = await base44.functions.invoke('exportGDPRData', {
        email: request.requester_email,
        contact_ids: relatedContacts.map(c => c.id)
      });

      // Atualizar pedido
      await base44.entities.DSARRequest.update(requestId, {
        status: "completed",
        response_sent_date: new Date().toISOString(),
        response_method: "email",
        completion_notes: "Dados exportados e enviados"
      });

      // Log
      const user = await base44.auth.me();
      await base44.entities.GDPRLog.create({
        contact_email: request.requester_email,
        action_type: "data_exported",
        description: "Dados pessoais exportados e enviados ao titular",
        performed_by: user.email,
        performed_by_name: user.full_name,
        legal_basis: "consent",
        request_status: "completed",
        completion_date: new Date().toISOString(),
        data_exported: data
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dsarRequests'] });
      toast.success("Dados exportados e enviados");
    }
  });

  const deleteDataMutation = useMutation({
    mutationFn: async (requestId) => {
      const request = dsarRequests.find(r => r.id === requestId);
      const user = await base44.auth.me();

      // Procurar todos os contactos com este email
      const relatedContacts = contacts.filter(c => 
        c.email?.toLowerCase() === request.requester_email?.toLowerCase()
      );

      // Anonimizar contactos (manter por obrigações legais mas anonimizar)
      for (const contact of relatedContacts) {
        await base44.entities.ClientContact.update(contact.id, {
          full_name: "DADOS REMOVIDOS",
          first_name: "REMOVIDO",
          last_name: "REMOVIDO",
          email: `deleted_${contact.id}@rgpd.deleted`,
          phone: "",
          secondary_phone: "",
          address: "",
          nif: "",
          notes: "Dados anonimizados por pedido RGPD",
          rgpd_consent_revoked: true,
          rgpd_consent_revoked_date: new Date().toISOString()
        });
      }

      // Atualizar pedido
      await base44.entities.DSARRequest.update(requestId, {
        status: "completed",
        response_sent_date: new Date().toISOString(),
        completion_notes: `${relatedContacts.length} contacto(s) anonimizado(s)`
      });

      // Log
      await base44.entities.GDPRLog.create({
        contact_email: request.requester_email,
        action_type: "data_anonymized",
        description: `Dados anonimizados. ${relatedContacts.length} contacto(s) processado(s)`,
        performed_by: user.email,
        performed_by_name: user.full_name,
        legal_basis: "consent",
        request_status: "completed",
        completion_date: new Date().toISOString()
      });

      // Notificar titular
      await base44.integrations.Core.SendEmail({
        to: request.requester_email,
        subject: "Pedido de Eliminação de Dados RGPD - Concluído",
        body: `
Caro(a) ${request.requester_name},

O seu pedido de eliminação de dados foi processado com sucesso.
Todos os seus dados pessoais foram anonimizados no nosso sistema.

Com os melhores cumprimentos,
Equipa ZuGruppe
        `
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dsarRequests'] });
      queryClient.invalidateQueries({ queryKey: ['clientContacts'] });
      queryClient.invalidateQueries({ queryKey: ['gdprLogs'] });
      toast.success("Dados eliminados/anonimizados");
    }
  });

  const getRequestTypeLabel = (type) => {
    const labels = {
      access: "Acesso",
      rectification: "Retificação",
      erasure: "Eliminação",
      restriction: "Limitação",
      portability: "Portabilidade",
      objection: "Oposição"
    };
    return labels[type] || type;
  };

  const getStatusBadge = (status, deadline) => {
    const daysRemaining = deadline ? differenceInDays(new Date(deadline), new Date()) : null;
    
    if (status === "completed") {
      return <Badge className="bg-green-600 text-white"><CheckCircle2 className="w-3 h-3 mr-1" />Concluído</Badge>;
    }
    if (status === "rejected") {
      return <Badge className="bg-red-600 text-white"><XCircle className="w-3 h-3 mr-1" />Rejeitado</Badge>;
    }
    if (daysRemaining !== null && daysRemaining < 5) {
      return <Badge className="bg-red-600 text-white"><AlertTriangle className="w-3 h-3 mr-1" />Urgente ({daysRemaining}d)</Badge>;
    }
    if (status === "in_progress") {
      return <Badge className="bg-blue-600 text-white"><Clock className="w-3 h-3 mr-1" />Em Progresso</Badge>;
    }
    return <Badge className="bg-amber-600 text-white"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>;
  };

  const pendingRequests = dsarRequests.filter(r => r.status === "pending_validation");
  const activeRequests = dsarRequests.filter(r => r.status === "in_progress");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-blue-100 rounded-lg">
          <Shield className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Gestão RGPD</h2>
          <p className="text-sm text-slate-600">Pedidos de titulares e registos de conformidade</p>
        </div>
      </div>

      {/* Alertas */}
      {pendingRequests.length > 0 && (
        <Card className="border-2 border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <p className="font-medium text-amber-900">
                {pendingRequests.length} pedido(s) aguarda(m) validação
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="requests">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="requests" className="flex items-center gap-1">
            <FileText className="w-4 h-4" />
            Pedidos DSAR ({dsarRequests.length})
          </TabsTrigger>
          <TabsTrigger value="consents" className="flex items-center gap-1">
            <Shield className="w-4 h-4" />
            Consentimentos
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-1">
            <BarChart3 className="w-4 h-4" />
            Registos ({gdprLogs.length})
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-1">
            <Settings className="w-4 h-4" />
            Configurações
          </TabsTrigger>
          <TabsTrigger value="metrics" className="flex items-center gap-1">
            <BarChart3 className="w-4 h-4" />
            Métricas
          </TabsTrigger>
        </TabsList>

        {/* Pedidos DSAR - Workflow Visual */}
        <TabsContent value="requests" className="space-y-4">
          {dsarRequests.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Shield className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-600">Nenhum pedido RGPD submetido</p>
              </CardContent>
            </Card>
          ) : (
            dsarRequests.map((request) => (
              <DSARWorkflowView
                key={request.id}
                request={request}
                onAction={(action, requestId) => {
                  if (action === "export") {
                    exportDataMutation.mutate(requestId);
                  } else if (action === "delete") {
                    if (confirm("Confirma a eliminação/anonimização dos dados? Esta ação é irreversível.")) {
                      deleteDataMutation.mutate(requestId);
                    }
                  }
                }}
              />
            ))
          )}
        </TabsContent>

        {/* Consentimentos */}
        <TabsContent value="consents" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-slate-600 mb-1">Com Consentimento</p>
                <p className="text-2xl font-bold text-green-600">
                  {contacts.filter(c => c.rgpd_consent && !c.rgpd_consent_revoked).length}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-slate-600 mb-1">Sem Consentimento</p>
                <p className="text-2xl font-bold text-amber-600">
                  {contacts.filter(c => !c.rgpd_consent).length}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-slate-600 mb-1">Consentimento Revogado</p>
                <p className="text-2xl font-bold text-red-600">
                  {contacts.filter(c => c.rgpd_consent_revoked).length}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Lista de contactos sem consentimento */}
          <Card>
            <CardHeader>
              <CardTitle>Contactos sem Consentimento RGPD</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {contacts
                  .filter(c => !c.rgpd_consent && c.email)
                  .map((contact) => (
                    <div key={contact.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <User className="w-4 h-4 text-slate-400" />
                        <div>
                          <p className="font-medium text-slate-900">{contact.full_name}</p>
                          <p className="text-xs text-slate-500">{contact.email}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-amber-600 border-amber-300">
                        Sem Consentimento
                      </Badge>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logs RGPD */}
        <TabsContent value="logs" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-xs text-slate-600 mb-1">Total de Ações</p>
                <p className="text-2xl font-bold text-slate-900">{gdprLogs.length}</p>
              </CardContent>
            </Card>
            <Card className="bg-green-50">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-green-600 mb-1">Concluídas</p>
                <p className="text-2xl font-bold text-green-700">
                  {gdprLogs.filter(l => l.request_status === "completed").length}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-blue-50">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-blue-600 mb-1">Em Progresso</p>
                <p className="text-2xl font-bold text-blue-700">
                  {gdprLogs.filter(l => l.request_status === "in_progress").length}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-amber-50">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-amber-600 mb-1">Pendentes</p>
                <p className="text-2xl font-bold text-amber-700">
                  {gdprLogs.filter(l => l.request_status === "pending").length}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-2">
            {gdprLogs.map((log) => (
              <Card key={log.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <Badge variant="outline" className="text-xs">
                          {log.action_type.replace(/_/g, ' ')}
                        </Badge>
                        <span className="text-xs text-slate-500">
                          {format(new Date(log.created_date), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </span>
                        {log.consent_type && (
                          <Badge className="bg-purple-100 text-purple-800 text-xs">
                            {log.consent_type.replace(/_/g, ' ')}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-900 mb-1">{log.description}</p>
                      <p className="text-xs text-slate-600">
                        <strong>Email:</strong> {log.contact_email}
                        {log.performed_by && ` | Executado por: ${log.performed_by_name || log.performed_by}`}
                      </p>
                      {log.legal_basis && (
                        <p className="text-xs text-slate-500 mt-1">
                          Base legal: {log.legal_basis.replace(/_/g, ' ')}
                        </p>
                      )}
                    </div>
                    <Badge className={
                      log.request_status === "completed" ? "bg-green-100 text-green-800" :
                      log.request_status === "rejected" ? "bg-red-100 text-red-800" :
                      log.request_status === "in_progress" ? "bg-blue-100 text-blue-800" :
                      "bg-amber-100 text-amber-800"
                    }>
                      {log.request_status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <GDPRSettingsPanel />
        </TabsContent>

        {/* Metrics Tab */}
        <TabsContent value="metrics">
          <GDPRMetricsView logs={gdprLogs} requests={dsarRequests} contacts={contacts} />
        </TabsContent>
      </Tabs>

      {/* Dialog de Processamento */}
      <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Processar Pedido RGPD</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-sm"><strong>Tipo:</strong> {getRequestTypeLabel(selectedRequest.request_type)}</p>
                <p className="text-sm"><strong>Email:</strong> {selectedRequest.requester_email}</p>
              </div>

              <div>
                <Label>Notas de Validação / Motivo de Rejeição</Label>
                <Textarea
                  value={processingNotes}
                  onChange={(e) => setProcessingNotes(e.target.value)}
                  rows={3}
                  placeholder="Adicione notas sobre a validação ou motivo de rejeição..."
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => processRequestMutation.mutate({
                    requestId: selectedRequest.id,
                    action: "approve",
                    notes: processingNotes
                  })}
                  disabled={processRequestMutation.isPending}
                  className="flex-1"
                >
                  Aprovar e Processar
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => processRequestMutation.mutate({
                    requestId: selectedRequest.id,
                    action: "reject",
                    notes: processingNotes
                  })}
                  disabled={processRequestMutation.isPending}
                  className="flex-1"
                >
                  Rejeitar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}