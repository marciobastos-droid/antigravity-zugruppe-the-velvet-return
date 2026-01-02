import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Check, X, Clock, AlertCircle, Building2, Mail, User, Euro } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export default function PendingSubscriptions() {
  const queryClient = useQueryClient();
  const [confirmingId, setConfirmingId] = React.useState(null);
  const [rejectingId, setRejectingId] = React.useState(null);
  const [rejectReason, setRejectReason] = React.useState("");

  const { data: pendingSubscriptions = [], isLoading } = useQuery({
    queryKey: ['pendingSubscriptions'],
    queryFn: async () => {
      const subs = await base44.entities.Subscription.filter({ 
        status: 'pending_payment',
        payment_method: 'bank_transfer'
      });
      return subs.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    }
  });

  const confirmPaymentMutation = useMutation({
    mutationFn: async (subscriptionId) => {
      const response = await base44.functions.invoke('confirmBankTransferPayment', {
        subscription_id: subscriptionId
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingSubscriptions'] });
      toast.success("Pagamento confirmado e subscrição ativada!");
      setConfirmingId(null);
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    }
  });

  const rejectPaymentMutation = useMutation({
    mutationFn: async ({ subscriptionId, reason }) => {
      const subscription = pendingSubscriptions.find(s => s.id === subscriptionId);
      
      await base44.entities.Subscription.update(subscriptionId, {
        status: 'rejected',
        rejection_reason: reason,
        rejected_at: new Date().toISOString()
      });

      // Enviar email usando template
      const emailTemplate = await base44.functions.invoke('getEmailTemplate', {
        event_type: 'subscription_rejected',
        variables: {
          user_name: subscription.user_email.split('@')[0],
          user_email: subscription.user_email,
          plan: subscription.plan,
          reason: reason || 'Não especificado'
        }
      });

      await base44.integrations.Core.SendEmail({
        to: subscription.user_email,
        subject: emailTemplate.data.subject,
        body: emailTemplate.data.body
      });

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingSubscriptions'] });
      toast.success("Subscrição rejeitada e utilizador notificado");
      setRejectingId(null);
      setRejectReason("");
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    }
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Subscrições Pendentes
            </span>
            <Badge variant="secondary">{pendingSubscriptions.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingSubscriptions.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600">Nenhuma subscrição pendente</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingSubscriptions.map((sub) => {
                const createdDate = new Date(sub.created_date);
                const expiresDate = sub.transfer_expires_at ? new Date(sub.transfer_expires_at) : null;
                const isExpired = expiresDate && expiresDate < new Date();

                return (
                  <Card key={sub.id} className={isExpired ? "border-orange-300 bg-orange-50" : "border-slate-200"}>
                    <CardContent className="p-4">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-3 flex-wrap">
                            <Badge className="bg-blue-600 text-white capitalize">{sub.plan}</Badge>
                            {isExpired && (
                              <Badge className="bg-orange-600 text-white">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                Expirado
                              </Badge>
                            )}
                          </div>
                          
                          <div className="grid sm:grid-cols-2 gap-2 text-sm">
                            <div className="flex items-center gap-2 text-slate-600">
                              <User className="w-4 h-4" />
                              {sub.user_email}
                            </div>
                            <div className="flex items-center gap-2 text-slate-600">
                              <Euro className="w-4 h-4" />
                              €{sub.amount}
                            </div>
                            <div className="flex items-center gap-2 text-slate-600">
                              <Clock className="w-4 h-4" />
                              {createdDate.toLocaleDateString('pt-PT')} às {createdDate.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            <div className="flex items-center gap-2 text-slate-600">
                              <Building2 className="w-4 h-4" />
                              Ref: <code className="bg-slate-100 px-1 rounded text-xs">{sub.transfer_reference}</code>
                            </div>
                          </div>

                          {expiresDate && (
                            <p className="text-xs text-slate-500">
                              {isExpired ? 'Expirou' : 'Expira'} em: {expiresDate.toLocaleDateString('pt-PT')}
                            </p>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => setConfirmingId(sub.id)}
                            disabled={confirmPaymentMutation.isPending || rejectPaymentMutation.isPending}
                          >
                            <Check className="w-4 h-4 mr-1" />
                            Aprovar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-500 text-red-600 hover:bg-red-50"
                            onClick={() => setRejectingId(sub.id)}
                            disabled={confirmPaymentMutation.isPending || rejectPaymentMutation.isPending}
                          >
                            <X className="w-4 h-4 mr-1" />
                            Rejeitar
                          </Button>
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

      {/* Confirm Dialog */}
      <Dialog open={!!confirmingId} onOpenChange={(open) => !open && setConfirmingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Pagamento</DialogTitle>
            <DialogDescription>
              Tem a certeza que recebeu o pagamento desta subscrição? Isto ativará imediatamente o plano do utilizador.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmingId(null)}>
              Cancelar
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={() => confirmPaymentMutation.mutate(confirmingId)}
              disabled={confirmPaymentMutation.isPending}
            >
              {confirmPaymentMutation.isPending ? "A processar..." : "Confirmar Pagamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={!!rejectingId} onOpenChange={(open) => !open && setRejectingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar Pagamento</DialogTitle>
            <DialogDescription>
              Indique o motivo da rejeição. O utilizador será notificado por email.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Motivo da rejeição (opcional)..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectingId(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => rejectPaymentMutation.mutate({ 
                subscriptionId: rejectingId, 
                reason: rejectReason 
              })}
              disabled={rejectPaymentMutation.isPending}
            >
              {rejectPaymentMutation.isPending ? "A processar..." : "Rejeitar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}