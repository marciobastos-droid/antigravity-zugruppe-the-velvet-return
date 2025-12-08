import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Mail, Eye, ExternalLink, Paperclip, Clock, 
  CheckCircle2, XCircle, MousePointerClick
} from "lucide-react";
import { format } from "date-fns";

const statusConfig = {
  pending: { label: "Pendente", icon: Clock, color: "bg-amber-100 text-amber-800" },
  sent: { label: "Enviado", icon: CheckCircle2, color: "bg-green-100 text-green-800" },
  failed: { label: "Falhou", icon: XCircle, color: "bg-red-100 text-red-800" },
  opened: { label: "Aberto", icon: Eye, color: "bg-blue-100 text-blue-800" },
  clicked: { label: "Clicado", icon: MousePointerClick, color: "bg-purple-100 text-purple-800" }
};

export default function EmailHistoryPanel({ recipientId, recipientType }) {
  const [selectedEmail, setSelectedEmail] = React.useState(null);

  const { data: emails = [], isLoading } = useQuery({
    queryKey: ['sentEmails', recipientId, recipientType],
    queryFn: async () => {
      if (!recipientId) return [];
      const allEmails = await base44.entities.SentEmail.list('-sent_at');
      return allEmails.filter(e => e.recipient_id === recipientId && e.recipient_type === recipientType);
    },
    enabled: !!recipientId
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" />
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="text-center py-12 bg-slate-50 rounded-lg">
        <Mail className="w-12 h-12 text-slate-400 mx-auto mb-3" />
        <p className="text-slate-600">Nenhum email enviado</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {emails.map((email) => {
          const config = statusConfig[email.status] || statusConfig.sent;
          const StatusIcon = config.icon;

          return (
            <Card 
              key={email.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedEmail(email)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`p-2 rounded-lg ${config.color}`}>
                      <StatusIcon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">{email.subject}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge className={config.color} variant="outline">
                          {config.label}
                        </Badge>
                        {email.template_name && (
                          <Badge variant="outline" className="text-xs">
                            {email.template_name}
                          </Badge>
                        )}
                        {email.attachments?.length > 0 && (
                          <Badge variant="outline" className="text-xs">
                            <Paperclip className="w-3 h-3 mr-1" />
                            {email.attachments.length}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {email.sent_by} • {format(new Date(email.sent_at || email.created_date), "dd/MM/yyyy HH:mm")}
                      </p>
                      {email.opened_at && (
                        <p className="text-xs text-blue-600 mt-0.5">
                          <Eye className="w-3 h-3 inline mr-1" />
                          Aberto em {format(new Date(email.opened_at), "dd/MM HH:mm")}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Email Detail Dialog */}
      <Dialog open={!!selectedEmail} onOpenChange={(open) => !open && setSelectedEmail(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
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
                  <p className="text-xs text-slate-500">Enviado em</p>
                  <p className="text-sm">
                    {format(new Date(selectedEmail.sent_at || selectedEmail.created_date), "dd/MM/yyyy HH:mm")}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Enviado por</p>
                  <p className="text-sm">{selectedEmail.sent_by}</p>
                </div>
              </div>

              {selectedEmail.opened_at && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800 flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    <strong>Aberto:</strong> {format(new Date(selectedEmail.opened_at), "dd/MM/yyyy HH:mm")}
                  </p>
                </div>
              )}

              {selectedEmail.clicked_at && (
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <p className="text-sm text-purple-800 flex items-center gap-2">
                    <MousePointerClick className="w-4 h-4" />
                    <strong>Primeiro clique:</strong> {format(new Date(selectedEmail.clicked_at), "dd/MM/yyyy HH:mm")}
                  </p>
                </div>
              )}

              {selectedEmail.attachments?.length > 0 && (
                <div>
                  <p className="text-xs text-slate-500 mb-2">Anexos</p>
                  <div className="space-y-2">
                    {selectedEmail.attachments.map((file, idx) => (
                      <a
                        key={idx}
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                      >
                        <Paperclip className="w-4 h-4 text-slate-500" />
                        <span className="text-sm text-slate-700">{file.filename}</span>
                        <ExternalLink className="w-3 h-3 text-slate-400 ml-auto" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div className="border rounded-lg overflow-hidden">
                <div className="p-3 bg-slate-100 border-b">
                  <p className="text-sm text-slate-600">Assunto:</p>
                  <p className="font-medium">{selectedEmail.subject}</p>
                </div>
                <div className="p-4 bg-white max-h-[400px] overflow-y-auto">
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
    </>
  );
}