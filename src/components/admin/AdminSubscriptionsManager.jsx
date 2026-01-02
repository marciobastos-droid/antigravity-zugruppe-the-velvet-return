import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Crown, CheckCircle, Clock, XCircle, Edit, Trash2, Eye, RefreshCw, Mail, DollarSign } from "lucide-react";
import { toast } from "sonner";
import PendingSubscriptions from "./PendingSubscriptions";
import { Label } from "@/components/ui/label";

export default function AdminSubscriptionsManager() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = React.useState("");
  const [filterPlan, setFilterPlan] = React.useState("all");
  const [filterStatus, setFilterStatus] = React.useState("all");
  const [editingSubscription, setEditingSubscription] = React.useState(null);

  const { data: subscriptions = [], isLoading } = useQuery({
    queryKey: ['allSubscriptions'],
    queryFn: () => base44.asServiceRole.entities.Subscription.list('-created_date')
  });

  const updateSubscriptionMutation = useMutation({
    mutationFn: ({ id, data }) => base44.asServiceRole.entities.Subscription.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allSubscriptions'] });
      toast.success("Subscrição atualizada!");
      setEditingSubscription(null);
    }
  });

  const deleteSubscriptionMutation = useMutation({
    mutationFn: (id) => base44.asServiceRole.entities.Subscription.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allSubscriptions'] });
      toast.success("Subscrição eliminada!");
    },
    onError: (error) => {
      toast.error(`Erro ao eliminar: ${error.message}`);
    }
  });

  const renewSubscriptionMutation = useMutation({
    mutationFn: (subscriptionId) => base44.functions.invoke('renewSubscription', { subscription_id: subscriptionId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allSubscriptions'] });
      toast.success("Email de renovação enviado!");
    }
  });

  const sendReminderMutation = useMutation({
    mutationFn: (subscriptionId) => base44.functions.invoke('sendPaymentReminder', { subscription_id: subscriptionId }),
    onSuccess: () => {
      toast.success("Lembrete enviado!");
    }
  });

  const changePlanMutation = useMutation({
    mutationFn: ({ subscriptionId, newPlan }) => 
      base44.functions.invoke('changePlanProrated', { subscription_id: subscriptionId, new_plan: newPlan }),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['allSubscriptions'] });
      if (response.data.prorated_amount > 0) {
        toast.success(`Plano alterado! Valor proporcional: €${response.data.prorated_amount.toFixed(2)}`);
      } else {
        toast.success("Plano alterado com sucesso!");
      }
      setEditingSubscription(null);
    }
  });

  const filteredSubscriptions = subscriptions.filter(sub => {
    const matchesSearch = sub.user_email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPlan = filterPlan === "all" || sub.plan === filterPlan;
    const matchesStatus = filterStatus === "all" || sub.status === filterStatus;
    return matchesSearch && matchesPlan && matchesStatus;
  });

  const stats = React.useMemo(() => {
    return {
      total: subscriptions.length,
      active: subscriptions.filter(s => s.status === 'active').length,
      pending: subscriptions.filter(s => s.status === 'pending_payment').length,
      cancelled: subscriptions.filter(s => s.status === 'cancelled').length
    };
  }, [subscriptions]);

  const statusColors = {
    active: "bg-green-100 text-green-800 border-green-300",
    pending_payment: "bg-amber-100 text-amber-800 border-amber-300",
    cancelled: "bg-red-100 text-red-800 border-red-300",
    expired: "bg-slate-100 text-slate-800 border-slate-300",
    trial: "bg-blue-100 text-blue-800 border-blue-300"
  };

  const statusIcons = {
    active: CheckCircle,
    pending_payment: Clock,
    cancelled: XCircle,
    expired: XCircle,
    trial: Crown
  };

  if (isLoading) {
    return <div className="text-center py-8">A carregar...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-slate-600">Total</div>
            <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-green-600">Ativas</div>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-amber-600">Pendentes</div>
            <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-red-600">Canceladas</div>
            <div className="text-2xl font-bold text-red-600">{stats.cancelled}</div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Subscriptions Section */}
      <PendingSubscriptions />

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Todas as Subscrições</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Pesquisar por email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterPlan} onValueChange={setFilterPlan}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Plano" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os planos</SelectItem>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os estados</SelectItem>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="pending_payment">Pendente</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
                <SelectItem value="trial">Trial</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2 font-medium text-slate-600">Utilizador</th>
                  <th className="text-left py-3 px-2 font-medium text-slate-600">Plano</th>
                  <th className="text-left py-3 px-2 font-medium text-slate-600">Estado</th>
                  <th className="text-left py-3 px-2 font-medium text-slate-600">Método</th>
                  <th className="text-left py-3 px-2 font-medium text-slate-600">Criado</th>
                  <th className="text-right py-3 px-2 font-medium text-slate-600">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubscriptions.map((sub) => {
                  const StatusIcon = statusIcons[sub.status] || Crown;
                  return (
                    <tr key={sub.id} className="border-b hover:bg-slate-50">
                      <td className="py-3 px-2 font-medium text-slate-900">{sub.user_email}</td>
                      <td className="py-3 px-2">
                        <Badge variant="outline" className="capitalize">
                          {sub.plan}
                        </Badge>
                      </td>
                      <td className="py-3 px-2">
                        <Badge className={statusColors[sub.status]}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {sub.status === 'pending_payment' ? 'Pendente' :
                           sub.status === 'active' ? 'Ativo' :
                           sub.status === 'cancelled' ? 'Cancelado' :
                           sub.status === 'trial' ? 'Trial' : sub.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-2 text-slate-600 capitalize">
                        {sub.payment_method === 'bank_transfer' ? 'Transferência' : 'Stripe'}
                      </td>
                      <td className="py-3 px-2 text-slate-600">
                        {new Date(sub.created_date).toLocaleDateString('pt-PT')}
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex items-center justify-end gap-1">
                          {sub.status === 'active' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => renewSubscriptionMutation.mutate(sub.id)}
                              title="Renovar subscrição"
                            >
                              <RefreshCw className="w-4 h-4 text-green-600" />
                            </Button>
                          )}
                          {sub.status === 'pending_payment' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => sendReminderMutation.mutate(sub.id)}
                              title="Enviar lembrete"
                            >
                              <Mail className="w-4 h-4 text-blue-600" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingSubscription(sub)}
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              if (confirm(`Eliminar subscrição de ${sub.user_email}?`)) {
                                deleteSubscriptionMutation.mutate(sub.id);
                              }
                            }}
                            className="text-red-600 hover:text-red-700"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredSubscriptions.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              Nenhuma subscrição encontrada
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Subscription Dialog */}
      {editingSubscription && (
        <Dialog open={!!editingSubscription} onOpenChange={() => setEditingSubscription(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Subscrição</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Email</label>
                <Input value={editingSubscription.user_email} disabled />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Plano</label>
                <Select
                  value={editingSubscription.plan}
                  onValueChange={(value) => setEditingSubscription({ ...editingSubscription, plan: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium mb-2 block">Estado</Label>
                <Select
                  value={editingSubscription.status}
                  onValueChange={(value) => setEditingSubscription({ ...editingSubscription, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="pending_payment">Pendente</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                    <SelectItem value="trial">Trial</SelectItem>
                    <SelectItem value="expired">Expirado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Change Plan with Proration */}
              {editingSubscription.plan !== 'free' && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-4 h-4 text-blue-600" />
                    <Label className="font-semibold text-blue-900">Alterar Plano com Cálculo Proporcional</Label>
                  </div>
                  <p className="text-xs text-blue-700 mb-3">
                    O sistema calculará automaticamente o valor proporcional baseado nos dias restantes
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newPlan = editingSubscription.plan === 'premium' ? 'enterprise' : 'premium';
                      if (confirm(`Alterar plano para ${newPlan}? Será calculado o valor proporcional.`)) {
                        changePlanMutation.mutate({ 
                          subscriptionId: editingSubscription.id, 
                          newPlan 
                        });
                      }
                    }}
                    disabled={changePlanMutation.isPending}
                    className="w-full"
                  >
                    {changePlanMutation.isPending ? 'A processar...' : 
                     `Alterar para ${editingSubscription.plan === 'premium' ? 'Enterprise' : 'Premium'}`}
                  </Button>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={() => {
                    updateSubscriptionMutation.mutate({
                      id: editingSubscription.id,
                      data: {
                        plan: editingSubscription.plan,
                        status: editingSubscription.status
                      }
                    });
                  }}
                  disabled={updateSubscriptionMutation.isPending}
                  className="flex-1"
                >
                  Guardar
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setEditingSubscription(null)}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}