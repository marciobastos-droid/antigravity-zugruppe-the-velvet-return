import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { 
  DollarSign, CheckCircle2, Clock, AlertCircle, Calendar, 
  Download, Search, Filter, Edit, CreditCard, TrendingUp, Users
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const STATUS_CONFIG = {
  pending: { label: "Pendente", color: "bg-yellow-100 text-yellow-800", icon: Clock },
  processing: { label: "Processando", color: "bg-blue-100 text-blue-800", icon: TrendingUp },
  completed: { label: "Completo", color: "bg-green-100 text-green-800", icon: CheckCircle2 },
  failed: { label: "Falhou", color: "bg-red-100 text-red-800", icon: AlertCircle },
  cancelled: { label: "Cancelado", color: "bg-slate-100 text-slate-800", icon: AlertCircle }
};

export default function PayoutsManager() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [editingPayout, setEditingPayout] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const { data: payouts = [] } = useQuery({
    queryKey: ['payouts'],
    queryFn: () => base44.entities.Payout.list('-created_date'),
  });

  const { data: batches = [] } = useQuery({
    queryKey: ['payoutBatches'],
    queryFn: () => base44.entities.PayoutBatch.list('-created_date'),
  });

  const updatePayoutMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Payout.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payouts'] });
      toast.success("Pagamento atualizado");
      setEditDialogOpen(false);
    },
  });

  const updateBatchMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.PayoutBatch.update(id, { 
      status,
      processed_date: status === 'completed' ? new Date().toISOString() : undefined
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payoutBatches'] });
      toast.success("Lote atualizado");
    },
  });

  const filteredPayouts = payouts.filter(p => {
    const matchesStatus = statusFilter === "all" || p.payment_status === statusFilter;
    const matchesSearch = !searchTerm || 
      p.recipient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.property_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.reference_number?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const totalAmount = filteredPayouts.reduce((sum, p) => sum + (p.amount || 0), 0);
  const completedAmount = filteredPayouts.filter(p => p.payment_status === 'completed').reduce((sum, p) => sum + (p.amount || 0), 0);
  const pendingAmount = filteredPayouts.filter(p => p.payment_status === 'pending').reduce((sum, p) => sum + (p.amount || 0), 0);

  const recipientData = Object.entries(
    filteredPayouts.reduce((acc, p) => {
      const name = p.recipient_name?.split(' ')[0] || 'Desconhecido';
      acc[name] = (acc[name] || 0) + (p.amount || 0);
      return acc;
    }, {})
  ).map(([name, amount]) => ({ name, amount })).slice(0, 6);

  const handleEditPayout = (payout) => {
    setEditingPayout(payout);
    setEditDialogOpen(true);
  };

  const handleUpdateStatus = (payoutId, newStatus) => {
    updatePayoutMutation.mutate({ 
      id: payoutId, 
      data: { 
        payment_status: newStatus,
        payment_date: newStatus === 'completed' ? new Date().toISOString().split('T')[0] : undefined
      } 
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <CreditCard className="w-7 h-7 text-blue-600" />
          Gestão de Pagamentos
        </h2>
        <p className="text-slate-600">Acompanhamento de pagamentos de comissões</p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total</p>
                <p className="text-2xl font-bold">€{totalAmount.toLocaleString()}</p>
              </div>
              <DollarSign className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Pagos</p>
                <p className="text-2xl font-bold text-green-600">€{completedAmount.toLocaleString()}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Pendentes</p>
                <p className="text-2xl font-bold text-amber-600">€{pendingAmount.toLocaleString()}</p>
              </div>
              <Clock className="w-8 h-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      {recipientData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pagamentos por Destinatário</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={recipientData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => `€${value.toLocaleString()}`} />
                <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Pesquisar..."
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="processing">Processando</SelectItem>
                <SelectItem value="completed">Completo</SelectItem>
                <SelectItem value="failed">Falhou</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Payouts List */}
      <div className="space-y-3">
        {filteredPayouts.map((payout) => {
          const status = STATUS_CONFIG[payout.payment_status] || STATUS_CONFIG.pending;
          const StatusIcon = status.icon;
          
          return (
            <Card key={payout.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Users className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-slate-900">{payout.recipient_name}</h3>
                        <Badge className={status.color}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {status.label}
                        </Badge>
                        <Badge variant="outline" className="capitalize">{payout.recipient_type}</Badge>
                      </div>
                      <div className="flex gap-4 text-sm text-slate-600">
                        {payout.property_title && <span>{payout.property_title}</span>}
                        {payout.reference_number && <span>Ref: {payout.reference_number}</span>}
                        {payout.scheduled_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(payout.scheduled_date), 'dd/MM/yyyy')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-green-600">€{payout.amount?.toLocaleString()}</p>
                    <p className="text-xs text-slate-500">{payout.payment_method}</p>
                  </div>
                  <div className="flex gap-1">
                    {payout.payment_status === 'pending' && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleUpdateStatus(payout.id, 'completed')}
                      >
                        Marcar Pago
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => handleEditPayout(payout)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Pagamento</DialogTitle>
          </DialogHeader>
          {editingPayout && (
            <div className="space-y-4 mt-4">
              <div>
                <Label>Estado</Label>
                <Select 
                  value={editingPayout.payment_status} 
                  onValueChange={(v) => setEditingPayout({...editingPayout, payment_status: v})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="processing">Processando</SelectItem>
                    <SelectItem value="completed">Completo</SelectItem>
                    <SelectItem value="failed">Falhou</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Referência</Label>
                <Input
                  value={editingPayout.reference_number || ''}
                  onChange={(e) => setEditingPayout({...editingPayout, reference_number: e.target.value})}
                  placeholder="Número de referência"
                />
              </div>
              <div>
                <Label>ID Transação</Label>
                <Input
                  value={editingPayout.transaction_id || ''}
                  onChange={(e) => setEditingPayout({...editingPayout, transaction_id: e.target.value})}
                  placeholder="ID da transação"
                />
              </div>
              <div>
                <Label>Notas</Label>
                <Textarea
                  value={editingPayout.notes || ''}
                  onChange={(e) => setEditingPayout({...editingPayout, notes: e.target.value})}
                  rows={3}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancelar</Button>
                <Button onClick={() => updatePayoutMutation.mutate({ id: editingPayout.id, data: editingPayout })}>
                  Guardar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}