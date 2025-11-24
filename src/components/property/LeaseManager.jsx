import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FileText, Plus, User, Calendar, DollarSign, CheckCircle2, AlertCircle } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { toast } from "sonner";

export default function LeaseManager({ propertyId, propertyTitle, propertyAddress }) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    tenant_name: "",
    tenant_email: "",
    tenant_phone: "",
    monthly_rent: "",
    deposit_amount: "",
    start_date: "",
    end_date: "",
    payment_day: "1"
  });

  const { data: leases = [] } = useQuery({
    queryKey: ['leases', propertyId],
    queryFn: () => base44.entities.LeaseAgreement.filter({ property_id: propertyId }, '-created_date'),
    enabled: !!propertyId
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.LeaseAgreement.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leases'] });
      toast.success("Arrendamento criado");
      setDialogOpen(false);
      setFormData({
        tenant_name: "",
        tenant_email: "",
        tenant_phone: "",
        monthly_rent: "",
        deposit_amount: "",
        start_date: "",
        end_date: "",
        payment_day: "1"
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.LeaseAgreement.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leases'] });
      toast.success("Estado atualizado");
    },
  });

  const handleSubmit = () => {
    if (!formData.tenant_name || !formData.monthly_rent || !formData.start_date) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    createMutation.mutate({
      ...formData,
      property_id: propertyId,
      property_title: propertyTitle,
      property_address: propertyAddress,
      monthly_rent: parseFloat(formData.monthly_rent),
      deposit_amount: formData.deposit_amount ? parseFloat(formData.deposit_amount) : undefined,
      payment_day: parseInt(formData.payment_day)
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      draft: "bg-slate-100 text-slate-800",
      active: "bg-green-100 text-green-800",
      expired: "bg-red-100 text-red-800",
      terminated: "bg-slate-100 text-slate-800",
      renewed: "bg-blue-100 text-blue-800"
    };
    return colors[status] || "bg-slate-100 text-slate-800";
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Arrendamentos ({leases.length})
        </h3>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Novo Arrendamento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Novo Contrato de Arrendamento</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nome do Inquilino *</Label>
                  <Input
                    value={formData.tenant_name}
                    onChange={(e) => setFormData({...formData, tenant_name: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={formData.tenant_email}
                    onChange={(e) => setFormData({...formData, tenant_email: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Telefone</Label>
                  <Input
                    value={formData.tenant_phone}
                    onChange={(e) => setFormData({...formData, tenant_phone: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Renda Mensal (€) *</Label>
                  <Input
                    type="number"
                    value={formData.monthly_rent}
                    onChange={(e) => setFormData({...formData, monthly_rent: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Caução (€)</Label>
                  <Input
                    type="number"
                    value={formData.deposit_amount}
                    onChange={(e) => setFormData({...formData, deposit_amount: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Dia de Pagamento (1-31)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="31"
                    value={formData.payment_day}
                    onChange={(e) => setFormData({...formData, payment_day: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Data de Início *</Label>
                  <Input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Data de Fim</Label>
                  <Input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSubmit} disabled={createMutation.isPending}>
                  Criar Arrendamento
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {leases.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600">Sem arrendamentos ativos</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {leases.map((lease) => {
            const daysUntilExpiry = lease.end_date ? differenceInDays(new Date(lease.end_date), new Date()) : null;
            const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry > 0 && daysUntilExpiry <= 30;
            
            return (
              <Card key={lease.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-slate-900">{lease.tenant_name}</h4>
                        <Badge className={getStatusColor(lease.status)}>
                          {lease.status === 'active' ? 'Ativo' :
                           lease.status === 'draft' ? 'Rascunho' :
                           lease.status === 'expired' ? 'Expirado' :
                           lease.status === 'terminated' ? 'Terminado' : 'Renovado'}
                        </Badge>
                        {isExpiringSoon && (
                          <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-300">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Expira em {daysUntilExpiry} dias
                          </Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm text-slate-600">
                        {lease.tenant_email && (
                          <div>📧 {lease.tenant_email}</div>
                        )}
                        {lease.tenant_phone && (
                          <div>📱 {lease.tenant_phone}</div>
                        )}
                      </div>
                    </div>
                    <Select
                      value={lease.status}
                      onValueChange={(status) => updateStatusMutation.mutate({ id: lease.id, status })}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Rascunho</SelectItem>
                        <SelectItem value="active">Ativo</SelectItem>
                        <SelectItem value="expired">Expirado</SelectItem>
                        <SelectItem value="terminated">Terminado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div className="bg-green-50 rounded p-2">
                      <div className="text-xs text-green-600 mb-1">Renda Mensal</div>
                      <div className="font-semibold text-green-900">€{lease.monthly_rent?.toLocaleString()}</div>
                    </div>
                    {lease.deposit_amount && (
                      <div className="bg-blue-50 rounded p-2">
                        <div className="text-xs text-blue-600 mb-1">Caução</div>
                        <div className="font-semibold text-blue-900">€{lease.deposit_amount?.toLocaleString()}</div>
                      </div>
                    )}
                    <div className="bg-slate-50 rounded p-2">
                      <div className="text-xs text-slate-600 mb-1">Início</div>
                      <div className="font-semibold text-slate-900">
                        {format(new Date(lease.start_date), 'dd/MM/yyyy')}
                      </div>
                    </div>
                    {lease.end_date && (
                      <div className="bg-slate-50 rounded p-2">
                        <div className="text-xs text-slate-600 mb-1">Fim</div>
                        <div className="font-semibold text-slate-900">
                          {format(new Date(lease.end_date), 'dd/MM/yyyy')}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}