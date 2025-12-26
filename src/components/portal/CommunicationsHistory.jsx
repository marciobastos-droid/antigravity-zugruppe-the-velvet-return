import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  MessageSquare, Mail, Phone, Calendar, User, 
  Loader2, CheckCircle, Clock, Send 
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

export default function CommunicationsHistory({ userEmail }) {
  const { data: opportunities = [], isLoading: oppsLoading } = useQuery({
    queryKey: ['userOpportunities', userEmail],
    queryFn: () => base44.entities.Opportunity.filter({ buyer_email: userEmail }),
    enabled: !!userEmail
  });

  const { data: portalMessages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ['portalMessages', userEmail],
    queryFn: () => base44.entities.ClientPortalMessage.filter({ client_email: userEmail }),
    enabled: !!userEmail
  });

  const { data: emailLogs = [], isLoading: emailsLoading } = useQuery({
    queryKey: ['emailLogs', userEmail],
    queryFn: async () => {
      const logs = await base44.entities.SentEmail.list('-sent_at', 50);
      return logs.filter(log => log.to_email === userEmail);
    },
    enabled: !!userEmail
  });

  // Compilar histórico de comunicações de todas as oportunidades
  const allCommunications = React.useMemo(() => {
    const comms = [];

    // Comunicações das oportunidades
    opportunities.forEach(opp => {
      if (opp.communication_history) {
        opp.communication_history.forEach(comm => {
          comms.push({
            ...comm,
            source: 'opportunity',
            opportunityRef: opp.ref_id,
            opportunityId: opp.id
          });
        });
      }

      // Follow-ups completados
      if (opp.follow_ups) {
        opp.follow_ups.filter(f => f.completed).forEach(followUp => {
          comms.push({
            type: followUp.type,
            message: followUp.notes,
            sent_at: followUp.date,
            status: 'completed',
            source: 'followup',
            opportunityRef: opp.ref_id,
            opportunityId: opp.id
          });
        });
      }
    });

    // Mensagens do portal
    portalMessages.forEach(msg => {
      comms.push({
        type: 'portal_message',
        message: msg.message,
        sent_at: msg.created_date,
        sent_by: msg.direction === 'agent_to_client' ? msg.agent_name : 'Você',
        direction: msg.direction,
        source: 'portal',
        is_read: msg.is_read
      });
    });

    // Emails enviados
    emailLogs.forEach(log => {
      comms.push({
        type: 'email',
        subject: log.subject,
        message: log.body_preview || log.subject,
        sent_at: log.sent_at,
        status: log.status,
        source: 'email'
      });
    });

    // Ordenar por data
    return comms.sort((a, b) => new Date(b.sent_at) - new Date(a.sent_at));
  }, [opportunities, portalMessages, emailLogs]);

  const emailCommunications = allCommunications.filter(c => c.type === 'email');
  const callsCommunications = allCommunications.filter(c => c.type === 'call');
  const messagesCommunications = allCommunications.filter(c => 
    c.type === 'whatsapp' || c.type === 'portal_message'
  );

  const isLoading = oppsLoading || messagesLoading || emailsLoading;

  const CommunicationItem = ({ comm }) => {
    const getIcon = () => {
      switch (comm.type) {
        case 'email': return <Mail className="w-5 h-5 text-blue-600" />;
        case 'call': return <Phone className="w-5 h-5 text-green-600" />;
        case 'whatsapp': return <MessageSquare className="w-5 h-5 text-green-600" />;
        case 'portal_message': return <MessageSquare className="w-5 h-5 text-purple-600" />;
        case 'meeting': return <Calendar className="w-5 h-5 text-amber-600" />;
        default: return <MessageSquare className="w-5 h-5 text-slate-600" />;
      }
    };

    const getTypeLabel = () => {
      switch (comm.type) {
        case 'email': return 'Email';
        case 'call': return 'Chamada';
        case 'whatsapp': return 'WhatsApp';
        case 'portal_message': return 'Mensagem Portal';
        case 'meeting': return 'Reunião';
        default: return comm.type;
      }
    };

    return (
      <div className="flex gap-4 p-4 bg-white rounded-lg border hover:shadow-md transition-shadow">
        <div className="flex-shrink-0 mt-1">
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-xs">
              {getTypeLabel()}
            </Badge>
            {comm.opportunityRef && (
              <Badge variant="secondary" className="text-xs font-mono">
                {comm.opportunityRef}
              </Badge>
            )}
            {comm.status && (
              <Badge className={
                comm.status === 'sent' || comm.status === 'completed' ? 'bg-green-100 text-green-800' :
                comm.status === 'opened' ? 'bg-blue-100 text-blue-800' :
                'bg-slate-100 text-slate-800'
              }>
                {comm.status === 'sent' ? 'Enviado' :
                 comm.status === 'opened' ? 'Lido' :
                 comm.status === 'completed' ? 'Concluído' :
                 comm.status}
              </Badge>
            )}
            {comm.direction === 'agent_to_client' && !comm.is_read && (
              <Badge className="bg-red-500 text-white">Novo</Badge>
            )}
          </div>

          {comm.subject && (
            <h5 className="font-semibold text-sm text-slate-900 mb-1">
              {comm.subject}
            </h5>
          )}

          <p className="text-sm text-slate-700 line-clamp-2 mb-2">
            {comm.message}
          </p>

          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {format(new Date(comm.sent_at), "dd MMM yyyy 'às' HH:mm", { locale: pt })}
            </span>
            {comm.sent_by && (
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {comm.sent_by}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-slate-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Histórico de Comunicações</CardTitle>
        <CardDescription>
          Todas as interações e comunicações registadas
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">
              Todas ({allCommunications.length})
            </TabsTrigger>
            <TabsTrigger value="emails">
              Emails ({emailCommunications.length})
            </TabsTrigger>
            <TabsTrigger value="calls">
              Chamadas ({callsCommunications.length})
            </TabsTrigger>
            <TabsTrigger value="messages">
              Mensagens ({messagesCommunications.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-4">
            <ScrollArea className="h-[500px] pr-4">
              {allCommunications.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-600">Ainda não há comunicações registadas</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {allCommunications.map((comm, idx) => (
                    <CommunicationItem key={`${comm.source}-${idx}`} comm={comm} />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="emails" className="mt-4">
            <ScrollArea className="h-[500px] pr-4">
              {emailCommunications.length === 0 ? (
                <div className="text-center py-12">
                  <Mail className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-600">Nenhum email registado</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {emailCommunications.map((comm, idx) => (
                    <CommunicationItem key={idx} comm={comm} />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="calls" className="mt-4">
            <ScrollArea className="h-[500px] pr-4">
              {callsCommunications.length === 0 ? (
                <div className="text-center py-12">
                  <Phone className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-600">Nenhuma chamada registada</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {callsCommunications.map((comm, idx) => (
                    <CommunicationItem key={idx} comm={comm} />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="messages" className="mt-4">
            <ScrollArea className="h-[500px] pr-4">
              {messagesCommunications.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-600">Nenhuma mensagem registada</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {messagesCommunications.map((comm, idx) => (
                    <CommunicationItem key={idx} comm={comm} />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}