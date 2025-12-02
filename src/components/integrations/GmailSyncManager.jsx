import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Mail, RefreshCw, Check, X, Link2, Unlink, Loader2, 
  Inbox, Send, Clock, User, Search, AlertCircle,
  CheckCircle2, ArrowRight, MessageSquare, Calendar,
  Filter, Download, ExternalLink, TestTube, Settings, Bell
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

export default function GmailSyncManager() {
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 });
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [emailSearch, setEmailSearch] = useState("");
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  const [syncFilter, setSyncFilter] = useState("all"); // all, inbox, sent
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState(null);
  const [testEmail, setTestEmail] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [checkingNewEmails, setCheckingNewEmails] = useState(false);

  const { data: user, refetch: refetchUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: connectionStatus, refetch: refetchConnection } = useQuery({
    queryKey: ['gmailConnection'],
    queryFn: async () => {
      const response = await base44.functions.invoke('gmailIntegration', { action: 'checkConnection' });
      return response.data;
    },
  });

  const { data: emails = [], isLoading: loadingEmails, refetch: refetchEmails } = useQuery({
    queryKey: ['gmailEmails', syncFilter],
    queryFn: async () => {
      if (!connectionStatus?.connected) return [];
      const labelIds = syncFilter === 'inbox' ? ['INBOX'] : 
                       syncFilter === 'sent' ? ['SENT'] : 
                       ['INBOX', 'SENT'];
      const response = await base44.functions.invoke('gmailIntegration', { 
        action: 'listEmails',
        maxResults: 50,
        labelIds
      });
      return response.data?.emails || [];
    },
    enabled: !!connectionStatus?.connected,
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ['clientContacts'],
    queryFn: () => base44.entities.ClientContact.list('-created_date', 500),
  });

  const { data: syncedEmails = [] } = useQuery({
    queryKey: ['emailLogs'],
    queryFn: () => base44.entities.EmailLog.list('-sent_date', 200),
  });

  // Gmail is now connected via App Connector - no manual OAuth needed

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('gmailIntegration', { action: 'disconnect' });
      return response.data;
    },
    onSuccess: () => {
      toast.info("Para desconectar completamente, vá às definições da app");
      refetchConnection();
    }
  });

  // Extract email address from "Name <email@domain.com>" format
  const extractEmail = (emailString) => {
    if (!emailString) return null;
    const match = emailString.match(/<(.+?)>/) || emailString.match(/([^\s<>]+@[^\s<>]+)/);
    return match ? match[1].toLowerCase() : emailString.toLowerCase();
  };

  // Find contact by email
  const findContactByEmail = (emailAddress) => {
    const email = extractEmail(emailAddress);
    if (!email) return null;
    return contacts.find(c => 
      c.email?.toLowerCase() === email ||
      c.secondary_email?.toLowerCase() === email
    );
  };

  // Check if email is already synced
  const isEmailSynced = (emailId) => {
    return syncedEmails.some(se => se.gmail_message_id === emailId);
  };

  // Sync single email to communication log
  const syncEmailToLog = async (emailItem) => {
    // Validate email has required ID - use emailItem to avoid confusion
    if (!emailItem || !emailItem.id) {
      console.error('syncEmailToLog: Invalid email item', emailItem);
      return { success: false, reason: 'invalid_email' };
    }

    const gmailMessageId = emailItem.id;
    const fromEmail = extractEmail(emailItem.from);
    const toEmail = extractEmail(emailItem.to);
    
    // Determine direction and find contact
    const isSent = emailItem.labelIds?.includes('SENT');
    const contactEmailAddr = isSent ? toEmail : fromEmail;
    const contact = findContactByEmail(contactEmailAddr);

    if (!contact || !contact.id) {
      return { success: false, reason: 'no_contact' };
    }

    const contactId = contact.id;

    // Check if already synced
    if (isEmailSynced(gmailMessageId)) {
      return { success: false, reason: 'already_synced' };
    }

    // Get full email content
    let fullEmail = null;
    try {
      const fullEmailResponse = await base44.functions.invoke('gmailIntegration', {
        action: 'getEmail',
        messageId: gmailMessageId
      });
      fullEmail = fullEmailResponse.data;
    } catch (e) {
      console.warn('Could not fetch full email:', e);
    }

    // Create communication log entry
    await base44.entities.CommunicationLog.create({
      contact_id: contactId,
      contact_name: contact.full_name || '',
      communication_type: 'email',
      direction: isSent ? 'outbound' : 'inbound',
      subject: emailItem.subject || '(Sem assunto)',
      summary: emailItem.snippet || fullEmail?.body?.substring(0, 500) || '',
      communication_date: emailItem.date ? new Date(emailItem.date).toISOString() : new Date().toISOString(),
      agent_email: user?.email || '',
      outcome: 'successful'
    });

    // Create email log entry with explicit required fields
    await base44.entities.EmailLog.create({
      gmail_message_id: gmailMessageId,
      contact_id: contactId,
      gmail_thread_id: emailItem.threadId || '',
      contact_name: contact.full_name || '',
      contact_email: contactEmailAddr || '',
      subject: emailItem.subject || '(Sem assunto)',
      direction: isSent ? 'outbound' : 'inbound',
      sent_date: emailItem.date ? new Date(emailItem.date).toISOString() : new Date().toISOString(),
      sent_by: user?.email || '',
      status: 'synced'
    });

    return { success: true, contact };
  };

  // Sync all emails
  const handleSyncAll = async () => {
    setSyncing(true);
    const emailsToSync = emails.filter(e => !isEmailSynced(e.id));
    setSyncProgress({ current: 0, total: emailsToSync.length });

    let synced = 0;
    let skipped = 0;
    let noContact = 0;

    for (let i = 0; i < emailsToSync.length; i++) {
      const email = emailsToSync[i];
      setSyncProgress({ current: i + 1, total: emailsToSync.length });

      try {
        const result = await syncEmailToLog(email);
        if (result.success) {
          synced++;
        } else if (result.reason === 'no_contact') {
          noContact++;
        } else {
          skipped++;
        }
      } catch (error) {
        console.error('Error syncing email:', error);
        skipped++;
      }
    }

    setSyncing(false);
    setSyncProgress({ current: 0, total: 0 });
    
    queryClient.invalidateQueries({ queryKey: ['emailLogs'] });
    queryClient.invalidateQueries({ queryKey: ['communicationLogs'] });
    refetchEmails();

    toast.success(`Sincronização concluída: ${synced} sincronizados, ${noContact} sem contacto, ${skipped} ignorados`);
  };

  // Sync single email
  const handleSyncSingle = async (email) => {
    try {
      const result = await syncEmailToLog(email);
      if (result.success) {
        toast.success(`Email sincronizado com ${result.contact.full_name}`);
        queryClient.invalidateQueries({ queryKey: ['emailLogs'] });
        queryClient.invalidateQueries({ queryKey: ['communicationLogs'] });
        refetchEmails();
      } else if (result.reason === 'no_contact') {
        toast.error("Nenhum contacto encontrado com este email");
      } else {
        toast.info("Email já sincronizado");
      }
    } catch (error) {
      toast.error("Erro ao sincronizar: " + error.message);
    }
  };

  const filteredEmails = emails.filter(email => {
    if (!emailSearch) return true;
    const search = emailSearch.toLowerCase();
    return (
      email.subject?.toLowerCase().includes(search) ||
      email.from?.toLowerCase().includes(search) ||
      email.to?.toLowerCase().includes(search) ||
      email.snippet?.toLowerCase().includes(search)
    );
  });

  const syncedCount = emails.filter(e => isEmailSynced(e.id)).length;
  const pendingCount = emails.length - syncedCount;
  const matchedCount = emails.filter(e => {
    const fromContact = findContactByEmail(e.from);
    const toContact = findContactByEmail(e.to);
    return fromContact || toContact;
  }).length;

  // Test connection
  const handleTestConnection = async () => {
    setTesting(true);
    setTestResults(null);
    try {
      const response = await base44.functions.invoke('gmailIntegration', { action: 'testConnection' });
      setTestResults(response.data);
      if (response.data.success) {
        toast.success("Conexão Gmail OK!");
      } else {
        toast.error("Erro na conexão: " + (response.data.message || 'Erro desconhecido'));
      }
    } catch (error) {
      setTestResults({ success: false, error: error.message });
      toast.error("Erro ao testar: " + error.message);
    }
    setTesting(false);
  };

  // Check for new client emails and create notifications
  const handleCheckNewEmails = async () => {
    setCheckingNewEmails(true);
    try {
      const response = await base44.functions.invoke('checkNewClientEmails', {});
      if (response.data.success) {
        if (response.data.notificationsCreated > 0) {
          toast.success(`${response.data.notificationsCreated} novo(s) email(s) de clientes! Notificações criadas.`);
        } else {
          toast.info(response.data.message || 'Nenhum novo email de clientes');
        }
        refetchEmails();
        queryClient.invalidateQueries({ queryKey: ['emailLogs'] });
        queryClient.invalidateQueries({ queryKey: ['communicationLogs'] });
      } else {
        toast.error("Erro: " + (response.data.error || 'Erro desconhecido'));
      }
    } catch (error) {
      toast.error("Erro ao verificar emails: " + error.message);
    }
    setCheckingNewEmails(false);
  };

  // Send test email
  const handleSendTestEmail = async () => {
    if (!testEmail) {
      toast.error("Introduza um email para teste");
      return;
    }
    setSendingTest(true);
    try {
      const response = await base44.functions.invoke('gmailIntegration', { 
        action: 'sendTestEmail',
        testEmail 
      });
      if (response.data.success) {
        toast.success(`Email de teste enviado para ${testEmail}`);
        setTestEmail("");
      } else {
        toast.error("Erro: " + (response.data.error || 'Erro desconhecido'));
      }
    } catch (error) {
      toast.error("Erro ao enviar: " + error.message);
    }
    setSendingTest(false);
  };

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card className={connectionStatus?.connected ? "border-green-200 bg-green-50/30" : "border-amber-200 bg-amber-50/30"}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Sincronização Gmail
            </div>
            {connectionStatus?.connected ? (
              <Badge className="bg-green-100 text-green-800 border-green-300">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Conectado
              </Badge>
            ) : (
              <Badge className="bg-amber-100 text-amber-800 border-amber-300">
                <AlertCircle className="w-3 h-3 mr-1" />
                Não conectado
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {connectionStatus?.connected ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-500" />
                  <span className="text-sm text-slate-700">{connectionStatus.email}</span>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => disconnectMutation.mutate()}
                  disabled={disconnectMutation.isPending}
                  className="text-red-600 hover:bg-red-50"
                >
                  <Unlink className="w-4 h-4 mr-1" />
                  Desconectar
                </Button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-3">
                <div className="p-3 bg-white rounded-lg border text-center">
                  <div className="text-xl font-bold text-slate-900">{emails.length}</div>
                  <div className="text-xs text-slate-500">Total</div>
                </div>
                <div className="p-3 bg-white rounded-lg border text-center">
                  <div className="text-xl font-bold text-green-600">{syncedCount}</div>
                  <div className="text-xs text-slate-500">Sincronizados</div>
                </div>
                <div className="p-3 bg-white rounded-lg border text-center">
                  <div className="text-xl font-bold text-amber-600">{pendingCount}</div>
                  <div className="text-xs text-slate-500">Pendentes</div>
                </div>
                <div className="p-3 bg-white rounded-lg border text-center">
                  <div className="text-xl font-bold text-blue-600">{matchedCount}</div>
                  <div className="text-xs text-slate-500">Com Contacto</div>
                </div>
              </div>

              {/* Sync Actions */}
              <div className="flex gap-2">
                <Button 
                  onClick={handleCheckNewEmails}
                  disabled={checkingNewEmails}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {checkingNewEmails ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      A verificar...
                    </>
                  ) : (
                    <>
                      <Bell className="w-4 h-4 mr-2" />
                      Verificar Novos de Clientes
                    </>
                  )}
                </Button>
                <Button 
                  onClick={handleSyncAll}
                  disabled={syncing || pendingCount === 0}
                  variant="outline"
                >
                  {syncing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {syncProgress.current}/{syncProgress.total}
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Sincronizar ({pendingCount})
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => refetchEmails()}
                  disabled={loadingEmails}
                >
                  <RefreshCw className={`w-4 h-4 ${loadingEmails ? 'animate-spin' : ''}`} />
                </Button>
              </div>

              {/* Test Section */}
              <div className="mt-4 p-4 bg-white rounded-lg border space-y-3">
                <div className="flex items-center gap-2">
                  <TestTube className="w-4 h-4 text-slate-600" />
                  <span className="font-medium text-sm">Diagnóstico e Testes</span>
                </div>

                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleTestConnection}
                    disabled={testing}
                  >
                    {testing ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Settings className="w-4 h-4 mr-2" />
                    )}
                    Testar Conexão
                  </Button>
                </div>

                {testResults && (
                  <div className={`p-3 rounded-lg text-sm ${testResults.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      {testResults.success ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-600" />
                      )}
                      <span className={testResults.success ? 'text-green-800' : 'text-red-800'}>
                        {testResults.message || (testResults.success ? 'Conexão OK' : 'Erro na conexão')}
                      </span>
                    </div>
                    {testResults.results && (
                      <div className="text-xs space-y-1 text-slate-600">
                        <p>• Tokens salvos: {testResults.results.hasTokens ? '✓' : '✗'}</p>
                        <p>• Access Token: {testResults.results.hasAccessToken ? '✓' : '✗'}</p>
                        <p>• Refresh Token: {testResults.results.hasRefreshToken ? '✓' : '✗'}</p>
                        <p>• Email conectado: {testResults.results.connectedEmail || '-'}</p>
                        <p>• API Gmail: {testResults.results.apiTest?.success ? '✓' : '✗'}</p>
                        {testResults.results.apiTest?.error && (
                          <p className="text-red-600">Erro API: {testResults.results.apiTest.error}</p>
                        )}
                        {testResults.results.error && (
                          <p className="text-red-600">Erro: {testResults.results.error}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  <Input
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="Email para teste..."
                    className="flex-1"
                  />
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleSendTestEmail}
                    disabled={sendingTest || !testEmail}
                  >
                    {sendingTest ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 mr-2" />
                    )}
                    Enviar Teste
                  </Button>
                </div>
              </div>
              </div>
          ) : (
            <div className="text-center py-4">
              <Mail className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600 mb-4">
                Gmail conectado via App Connector. Clique em "Testar Conexão" para verificar.
              </p>
              <Button 
                onClick={handleTestConnection}
                disabled={testing}
                className="bg-blue-500 hover:bg-blue-600"
              >
                {testing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Settings className="w-4 h-4 mr-2" />
                )}
                Testar Conexão
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Email List */}
      {connectionStatus?.connected && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Emails Recentes</CardTitle>
              <div className="flex gap-2">
                <Button 
                  variant={syncFilter === 'all' ? 'default' : 'outline'} 
                  size="sm"
                  onClick={() => setSyncFilter('all')}
                >
                  Todos
                </Button>
                <Button 
                  variant={syncFilter === 'inbox' ? 'default' : 'outline'} 
                  size="sm"
                  onClick={() => setSyncFilter('inbox')}
                >
                  <Inbox className="w-3 h-3 mr-1" />
                  Recebidos
                </Button>
                <Button 
                  variant={syncFilter === 'sent' ? 'default' : 'outline'} 
                  size="sm"
                  onClick={() => setSyncFilter('sent')}
                >
                  <Send className="w-3 h-3 mr-1" />
                  Enviados
                </Button>
              </div>
            </div>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={emailSearch}
                onChange={(e) => setEmailSearch(e.target.value)}
                placeholder="Pesquisar emails..."
                className="pl-10"
              />
            </div>
          </CardHeader>
          <CardContent>
            {loadingEmails ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              </div>
            ) : filteredEmails.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Inbox className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                <p>Nenhum email encontrado</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {filteredEmails.map(email => {
                    const isSent = email.labelIds?.includes('SENT');
                    const synced = isEmailSynced(email.id);
                    const contact = findContactByEmail(isSent ? email.to : email.from);
                    
                    return (
                      <div 
                        key={email.id}
                        className={`p-3 rounded-lg border transition-all hover:shadow-sm cursor-pointer ${
                          synced ? 'bg-green-50/50 border-green-200' : 
                          contact ? 'bg-blue-50/50 border-blue-200' : 
                          'bg-white hover:bg-slate-50'
                        }`}
                        onClick={() => setSelectedEmail(email)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {isSent ? (
                                <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                  <Send className="w-3 h-3 mr-1" />
                                  Enviado
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                  <Inbox className="w-3 h-3 mr-1" />
                                  Recebido
                                </Badge>
                              )}
                              {synced && (
                                <Badge className="text-xs bg-green-100 text-green-800">
                                  <Check className="w-3 h-3 mr-1" />
                                  Sincronizado
                                </Badge>
                              )}
                              {contact && !synced && (
                                <Badge variant="outline" className="text-xs text-purple-700 border-purple-300">
                                  <User className="w-3 h-3 mr-1" />
                                  {contact.full_name}
                                </Badge>
                              )}
                              {email.isUnread && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                              )}
                            </div>
                            <p className="font-medium text-slate-900 truncate">{email.subject || '(Sem assunto)'}</p>
                            <p className="text-sm text-slate-600 truncate">
                              {isSent ? `Para: ${email.to}` : `De: ${email.from}`}
                            </p>
                            <p className="text-xs text-slate-500 mt-1 line-clamp-1">{email.snippet}</p>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <span className="text-xs text-slate-500 whitespace-nowrap">
                              {email.date && format(new Date(email.date), "dd/MM HH:mm", { locale: pt })}
                            </span>
                            {!synced && contact && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSyncSingle(email);
                                }}
                                className="h-7 text-xs"
                              >
                                <ArrowRight className="w-3 h-3 mr-1" />
                                Sincronizar
                              </Button>
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
      )}

      {/* Email Detail Dialog */}
      <Dialog open={!!selectedEmail} onOpenChange={(open) => !open && setSelectedEmail(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Detalhes do Email
            </DialogTitle>
          </DialogHeader>
          {selectedEmail && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-slate-500">De</Label>
                  <p className="text-sm font-medium">{selectedEmail.from}</p>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Para</Label>
                  <p className="text-sm font-medium">{selectedEmail.to}</p>
                </div>
              </div>
              <div>
                <Label className="text-xs text-slate-500">Assunto</Label>
                <p className="text-sm font-medium">{selectedEmail.subject || '(Sem assunto)'}</p>
              </div>
              <div>
                <Label className="text-xs text-slate-500">Data</Label>
                <p className="text-sm">{selectedEmail.date && format(new Date(selectedEmail.date), "dd/MM/yyyy HH:mm", { locale: pt })}</p>
              </div>
              <div>
                <Label className="text-xs text-slate-500">Pré-visualização</Label>
                <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border">
                  {selectedEmail.snippet}
                </p>
              </div>
              
              <div className="flex gap-2 pt-2">
                {!isEmailSynced(selectedEmail.id) && findContactByEmail(
                  selectedEmail.labelIds?.includes('SENT') ? selectedEmail.to : selectedEmail.from
                ) && (
                  <Button 
                    onClick={() => {
                      handleSyncSingle(selectedEmail);
                      setSelectedEmail(null);
                    }}
                    className="flex-1"
                  >
                    <ArrowRight className="w-4 h-4 mr-2" />
                    Sincronizar com Histórico
                  </Button>
                )}
                <Button variant="outline" onClick={() => setSelectedEmail(null)}>
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}