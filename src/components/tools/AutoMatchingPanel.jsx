import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Sparkles, RefreshCw, Send, Eye, CheckCircle2, 
  User, Home, Mail, Bell, Clock, Target, TrendingUp,
  ChevronRight, AlertCircle, Loader2
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function AutoMatchingPanel() {
  const queryClient = useQueryClient();
  const [matchResults, setMatchResults] = React.useState(null);
  const [selectedEmail, setSelectedEmail] = React.useState(null);

  const { data: recentNotifications = [] } = useQuery({
    queryKey: ['matchNotifications'],
    queryFn: async () => {
      const notifications = await base44.entities.Notification.list('-created_date');
      return notifications.filter(n => n.metadata?.match_score).slice(0, 20);
    }
  });

  const runMatchingMutation = useMutation({
    mutationFn: async (options = {}) => {
      const response = await base44.functions.invoke('autoMatchNewProperties', {
        check_all_recent: options.checkAll || false,
        property_id: options.propertyId || null
      });
      return response.data;
    },
    onSuccess: (data) => {
      setMatchResults(data);
      queryClient.invalidateQueries({ queryKey: ['matchNotifications'] });
      if (data.total_matches > 0) {
        toast.success(`${data.total_matches} matches encontrados!`);
      } else {
        toast.info("Nenhum match encontrado neste momento");
      }
    },
    onError: (error) => {
      toast.error("Erro ao executar matching");
    }
  });

  const sendEmailMutation = useMutation({
    mutationFn: async (emailDraft) => {
      await base44.integrations.Core.SendEmail({
        to: emailDraft.contact_email,
        subject: emailDraft.email_subject,
        body: emailDraft.email_body
      });
      return emailDraft;
    },
    onSuccess: (emailDraft) => {
      toast.success(`Email enviado para ${emailDraft.contact_name}`);
      // Remove from drafts
      setMatchResults(prev => ({
        ...prev,
        emails: prev.emails.filter(e => e.contact_id !== emailDraft.contact_id || e.property_id !== emailDraft.property_id)
      }));
    },
    onError: () => {
      toast.error("Erro ao enviar email");
    }
  });

  const getScoreColor = (score) => {
    if (score >= 80) return "text-green-600 bg-green-100";
    if (score >= 60) return "text-amber-600 bg-amber-100";
    return "text-slate-600 bg-slate-100";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-purple-600" />
            Auto-Matching de Imóveis
          </h2>
          <p className="text-slate-600">
            Encontra automaticamente correspondências entre novos imóveis e requisitos de clientes
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => runMatchingMutation.mutate({ checkAll: false })}
            disabled={runMatchingMutation.isPending}
          >
            {runMatchingMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Verificar Recentes
          </Button>
          <Button
            onClick={() => runMatchingMutation.mutate({ checkAll: true })}
            disabled={runMatchingMutation.isPending}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {runMatchingMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2" />
            )}
            Verificar Últimas 24h
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {matchResults && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4 text-center">
              <Home className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-blue-900">{matchResults.properties_checked}</div>
              <div className="text-sm text-blue-700">Imóveis Verificados</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4 text-center">
              <Target className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-green-900">{matchResults.total_matches}</div>
              <div className="text-sm text-green-700">Matches Encontrados</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-4 text-center">
              <Bell className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-purple-900">{matchResults.notifications_created}</div>
              <div className="text-sm text-purple-700">Notificações Criadas</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
            <CardContent className="p-4 text-center">
              <Mail className="w-8 h-8 text-amber-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-amber-900">{matchResults.emails_drafted}</div>
              <div className="text-sm text-amber-700">Emails Rascunhados</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="matches" className="w-full">
        <TabsList>
          <TabsTrigger value="matches">
            Matches {matchResults?.matches?.length > 0 && `(${matchResults.matches.length})`}
          </TabsTrigger>
          <TabsTrigger value="emails">
            Emails Rascunho {matchResults?.emails?.length > 0 && `(${matchResults.emails.length})`}
          </TabsTrigger>
          <TabsTrigger value="history">
            Histórico ({recentNotifications.length})
          </TabsTrigger>
        </TabsList>

        {/* Matches Tab */}
        <TabsContent value="matches" className="mt-4">
          {matchResults?.matches?.length > 0 ? (
            <div className="space-y-3">
              {matchResults.matches.map((match, idx) => (
                <Card key={idx} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${getScoreColor(match.score)}`}>
                          <TrendingUp className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-slate-900">{match.contact_name}</h4>
                            <Badge variant="outline" className="text-xs">
                              {match.type === 'contact' ? 'Contacto' : 'Lead'}
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-600">{match.contact_email}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Home className="w-4 h-4 text-slate-400" />
                            <span className="text-sm text-slate-700">{match.property_title}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-2xl font-bold ${
                          match.score >= 80 ? 'text-green-600' : 
                          match.score >= 60 ? 'text-amber-600' : 'text-slate-600'
                        }`}>
                          {match.score}%
                        </div>
                        <Progress value={match.score} className="w-20 h-2 mt-1" />
                      </div>
                    </div>

                    {/* Match Details */}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {Object.entries(match.match_details || {}).map(([key, value]) => (
                        <Badge 
                          key={key} 
                          variant="secondary"
                          className={value >= 80 ? 'bg-green-100 text-green-800' : 
                                    value >= 50 ? 'bg-amber-100 text-amber-800' : 
                                    'bg-slate-100 text-slate-600'}
                        >
                          {key === 'location' ? '📍' : 
                           key === 'price' ? '💰' :
                           key === 'property_type' ? '🏠' :
                           key === 'bedrooms' ? '🛏️' :
                           key === 'area' ? '📐' : '✓'} {value}%
                        </Badge>
                      ))}
                    </div>

                    {match.assigned_agent && (
                      <div className="mt-3 pt-3 border-t text-xs text-slate-500">
                        Agente: {match.assigned_agent}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center">
                <Target className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="font-medium text-slate-700 mb-1">Nenhum match encontrado</h3>
                <p className="text-sm text-slate-500">
                  Execute a verificação para encontrar correspondências
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Emails Tab */}
        <TabsContent value="emails" className="mt-4">
          {matchResults?.emails?.length > 0 ? (
            <div className="space-y-3">
              {matchResults.emails.filter(e => !e.error).map((email, idx) => (
                <Card key={idx} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-blue-600" />
                          <h4 className="font-semibold text-slate-900">{email.contact_name}</h4>
                          <Badge className={getScoreColor(email.match_score)}>
                            {email.match_score}% match
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-600">{email.contact_email}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedEmail(selectedEmail === idx ? null : idx)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          {selectedEmail === idx ? 'Ocultar' : 'Ver'}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => sendEmailMutation.mutate(email)}
                          disabled={sendEmailMutation.isPending}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Send className="w-4 h-4 mr-1" />
                          Enviar
                        </Button>
                      </div>
                    </div>

                    {selectedEmail === idx && (
                      <div className="bg-slate-50 rounded-lg p-4 mt-3 space-y-3">
                        <div>
                          <label className="text-xs font-medium text-slate-500">Assunto:</label>
                          <p className="text-sm font-medium text-slate-900">{email.email_subject}</p>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-slate-500">Corpo:</label>
                          <p className="text-sm text-slate-700 whitespace-pre-wrap">{email.email_body}</p>
                        </div>
                        <div className="text-xs text-slate-500">
                          Imóvel: {email.property_title}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center">
                <Mail className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="font-medium text-slate-700 mb-1">Nenhum email rascunhado</h3>
                <p className="text-sm text-slate-500">
                  Emails são gerados para matches com score ≥70%
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="mt-4">
          {recentNotifications.length > 0 ? (
            <div className="space-y-2">
              {recentNotifications.map((notif) => (
                <Card key={notif.id} className="hover:bg-slate-50 transition-colors">
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${getScoreColor(notif.metadata?.match_score || 0)}`}>
                        <Target className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{notif.title}</p>
                        <p className="text-xs text-slate-500">
                          {format(new Date(notif.created_date), "dd/MM/yyyy HH:mm")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {notif.metadata?.match_score}%
                      </Badge>
                      {notif.is_read && (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center">
                <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="font-medium text-slate-700 mb-1">Sem histórico</h3>
                <p className="text-sm text-slate-500">
                  As notificações de matching aparecerão aqui
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}