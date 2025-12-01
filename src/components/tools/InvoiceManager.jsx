import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileText, Plus, Search, Euro, Calendar, Send, 
  CheckCircle2, Clock, AlertCircle, Trash2, Edit,
  Download, Mail, Building2, User, Filter, Eye,
  Receipt, TrendingUp, X
} from "lucide-react";
import { toast } from "sonner";
import { format, addDays, isAfter, isBefore } from "date-fns";
import { ptBR } from "date-fns/locale";

const statusConfig = {
  draft: { label: "Rascunho", color: "bg-slate-100 text-slate-700", icon: FileText },
  pending: { label: "Pendente", color: "bg-amber-100 text-amber-700", icon: Clock },
  sent: { label: "Enviada", color: "bg-blue-100 text-blue-700", icon: Send },
  paid: { label: "Paga", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  overdue: { label: "Vencida", color: "bg-red-100 text-red-700", icon: AlertCircle },
  cancelled: { label: "Cancelada", color: "bg-slate-100 text-slate-500", icon: X }
};

const typeConfig = {
  agency: { label: "Agência", icon: Building2 },
  agent: { label: "Agente", icon: User },
  subscription: { label: "Subscrição", icon: Receipt },
  commission: { label: "Comissão", icon: Euro },
  service: { label: "Serviço", icon: FileText }
};

export default function InvoiceManager() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    invoice_type: "agent",
    recipient_type: "agent",
    recipient_email: "",
    recipient_name: "",
    recipient_nif: "",
    recipient_address: "",
    issue_date: format(new Date(), "yyyy-MM-dd"),
    due_date: format(addDays(new Date(), 30), "yyyy-MM-dd"),
    items: [{ description: "", quantity: 1, unit_price: 0, vat_rate: 23, total: 0 }],
    notes: "",
    payment_method: "transfer"
  });

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => base44.entities.Invoice.list('-created_date')
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list()
  });

  const agents = users.filter(u => u.user_type === 'agente' || u.user_type === 'gestor');

  const createMutation = useMutation({
    mutationFn: async (data) => {
      // Generate invoice number
      const year = new Date().getFullYear();
      const count = invoices.filter(i => i.invoice_number?.startsWith(`FAT-${year}`)).length + 1;
      const invoice_number = `FAT-${year}-${String(count).padStart(4, '0')}`;
      
      return base44.entities.Invoice.create({ ...data, invoice_number, status: 'draft' });
    },
    onSuccess: () => {
      toast.success("Fatura criada com sucesso");
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Invoice.update(id, data),
    onSuccess: () => {
      toast.success("Fatura atualizada");
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Invoice.delete(id),
    onSuccess: () => {
      toast.success("Fatura eliminada");
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    }
  });

  const resetForm = () => {
    setFormData({
      invoice_type: "agent",
      recipient_type: "agent",
      recipient_email: "",
      recipient_name: "",
      recipient_nif: "",
      recipient_address: "",
      issue_date: format(new Date(), "yyyy-MM-dd"),
      due_date: format(addDays(new Date(), 30), "yyyy-MM-dd"),
      items: [{ description: "", quantity: 1, unit_price: 0, vat_rate: 23, total: 0 }],
      notes: "",
      payment_method: "transfer"
    });
    setEditingInvoice(null);
    setDialogOpen(false);
  };

  const handleEdit = (invoice) => {
    setEditingInvoice(invoice);
    setFormData({
      invoice_type: invoice.invoice_type || "agent",
      recipient_type: invoice.recipient_type || "agent",
      recipient_email: invoice.recipient_email || "",
      recipient_name: invoice.recipient_name || "",
      recipient_nif: invoice.recipient_nif || "",
      recipient_address: invoice.recipient_address || "",
      issue_date: invoice.issue_date || format(new Date(), "yyyy-MM-dd"),
      due_date: invoice.due_date || format(addDays(new Date(), 30), "yyyy-MM-dd"),
      items: invoice.items || [{ description: "", quantity: 1, unit_price: 0, vat_rate: 23, total: 0 }],
      notes: invoice.notes || "",
      payment_method: invoice.payment_method || "transfer"
    });
    setDialogOpen(true);
  };

  const handleAgentSelect = (email) => {
    const agent = agents.find(a => a.email === email);
    if (agent) {
      setFormData({
        ...formData,
        recipient_email: agent.email,
        recipient_name: agent.display_name || agent.full_name,
        recipient_nif: agent.nif || "",
        recipient_address: agent.address || ""
      });
    }
  };

  const updateItem = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;
    
    // Recalculate total
    const qty = parseFloat(newItems[index].quantity) || 0;
    const price = parseFloat(newItems[index].unit_price) || 0;
    const vat = parseFloat(newItems[index].vat_rate) || 0;
    newItems[index].total = qty * price * (1 + vat / 100);
    
    setFormData({ ...formData, items: newItems });
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { description: "", quantity: 1, unit_price: 0, vat_rate: 23, total: 0 }]
    });
  };

  const removeItem = (index) => {
    if (formData.items.length > 1) {
      setFormData({
        ...formData,
        items: formData.items.filter((_, i) => i !== index)
      });
    }
  };

  const calculateTotals = () => {
    const subtotal = formData.items.reduce((sum, item) => {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.unit_price) || 0;
      return sum + (qty * price);
    }, 0);

    const vatAmount = formData.items.reduce((sum, item) => {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.unit_price) || 0;
      const vat = parseFloat(item.vat_rate) || 0;
      return sum + (qty * price * vat / 100);
    }, 0);

    return {
      subtotal,
      vat_amount: vatAmount,
      total_amount: subtotal + vatAmount
    };
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const totals = calculateTotals();
    const data = { ...formData, ...totals };

    if (editingInvoice) {
      updateMutation.mutate({ id: editingInvoice.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleStatusChange = (invoice, newStatus) => {
    const updateData = { status: newStatus };
    if (newStatus === 'paid') {
      updateData.paid_date = format(new Date(), "yyyy-MM-dd");
    }
    updateMutation.mutate({ id: invoice.id, data: updateData });
  };

  const handleSendInvoice = async (invoice) => {
    try {
      await base44.integrations.Core.SendEmail({
        to: invoice.recipient_email,
        subject: `Fatura ${invoice.invoice_number}`,
        body: `Caro(a) ${invoice.recipient_name},\n\nSegue em anexo a fatura ${invoice.invoice_number} no valor de €${invoice.total_amount?.toFixed(2)}.\n\nData de vencimento: ${invoice.due_date ? format(new Date(invoice.due_date), "dd/MM/yyyy") : 'N/A'}\n\nObrigado.`
      });
      handleStatusChange(invoice, 'sent');
      toast.success("Fatura enviada por email");
    } catch (error) {
      toast.error("Erro ao enviar email");
    }
  };

  // Filter invoices
  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = !searchTerm || 
      inv.recipient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.recipient_email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || inv.status === statusFilter;
    const matchesType = typeFilter === "all" || inv.invoice_type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  // Stats
  const stats = {
    total: invoices.length,
    pending: invoices.filter(i => i.status === 'pending' || i.status === 'sent').length,
    paid: invoices.filter(i => i.status === 'paid').length,
    overdue: invoices.filter(i => i.status === 'overdue' || (i.status === 'sent' && i.due_date && isBefore(new Date(i.due_date), new Date()))).length,
    totalValue: invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + (i.total_amount || 0), 0),
    pendingValue: invoices.filter(i => i.status === 'pending' || i.status === 'sent').reduce((sum, i) => sum + (i.total_amount || 0), 0)
  };

  const totals = calculateTotals();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Receipt className="w-7 h-7 text-green-600" />
            Gestão de Faturas
          </h2>
          <p className="text-slate-600">Emissão e controlo de faturas a agências e agentes</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setDialogOpen(open); }}>
          <DialogTrigger asChild>
            <Button className="bg-green-600 hover:bg-green-700">
              <Plus className="w-4 h-4 mr-2" />
              Nova Fatura
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingInvoice ? "Editar Fatura" : "Nova Fatura"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              {/* Recipient Selection */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Tipo de Fatura</Label>
                  <Select value={formData.invoice_type} onValueChange={(v) => setFormData({...formData, invoice_type: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="agent">Agente</SelectItem>
                      <SelectItem value="agency">Agência</SelectItem>
                      <SelectItem value="subscription">Subscrição</SelectItem>
                      <SelectItem value="commission">Comissão</SelectItem>
                      <SelectItem value="service">Serviço</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Selecionar Agente/Agência</Label>
                  <Select onValueChange={handleAgentSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      {agents.map(agent => (
                        <SelectItem key={agent.email} value={agent.email}>
                          {agent.display_name || agent.full_name} ({agent.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Recipient Details */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Nome *</Label>
                  <Input
                    required
                    value={formData.recipient_name}
                    onChange={(e) => setFormData({...formData, recipient_name: e.target.value})}
                    placeholder="Nome do destinatário"
                  />
                </div>
                <div>
                  <Label>Email *</Label>
                  <Input
                    required
                    type="email"
                    value={formData.recipient_email}
                    onChange={(e) => setFormData({...formData, recipient_email: e.target.value})}
                    placeholder="email@exemplo.com"
                  />
                </div>
                <div>
                  <Label>NIF</Label>
                  <Input
                    value={formData.recipient_nif}
                    onChange={(e) => setFormData({...formData, recipient_nif: e.target.value})}
                    placeholder="123456789"
                  />
                </div>
                <div>
                  <Label>Morada</Label>
                  <Input
                    value={formData.recipient_address}
                    onChange={(e) => setFormData({...formData, recipient_address: e.target.value})}
                    placeholder="Morada completa"
                  />
                </div>
              </div>

              {/* Dates */}
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label>Data de Emissão</Label>
                  <Input
                    type="date"
                    value={formData.issue_date}
                    onChange={(e) => setFormData({...formData, issue_date: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Data de Vencimento</Label>
                  <Input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Método de Pagamento</Label>
                  <Select value={formData.payment_method} onValueChange={(v) => setFormData({...formData, payment_method: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="transfer">Transferência</SelectItem>
                      <SelectItem value="mbway">MBWay</SelectItem>
                      <SelectItem value="multibanco">Multibanco</SelectItem>
                      <SelectItem value="card">Cartão</SelectItem>
                      <SelectItem value="cash">Numerário</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Items */}
              <div>
                <Label className="mb-2 block">Linhas da Fatura</Label>
                <div className="space-y-2">
                  {formData.items.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-4">
                        <Input
                          placeholder="Descrição"
                          value={item.description}
                          onChange={(e) => updateItem(idx, 'description', e.target.value)}
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          placeholder="Qtd"
                          value={item.quantity}
                          onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          placeholder="Preço"
                          value={item.unit_price}
                          onChange={(e) => updateItem(idx, 'unit_price', e.target.value)}
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          placeholder="IVA %"
                          value={item.vat_rate}
                          onChange={(e) => updateItem(idx, 'vat_rate', e.target.value)}
                        />
                      </div>
                      <div className="col-span-1 text-right font-medium">
                        €{item.total?.toFixed(2) || '0.00'}
                      </div>
                      <div className="col-span-1">
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(idx)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addItem} className="mt-2">
                  <Plus className="w-4 h-4 mr-1" />
                  Adicionar Linha
                </Button>
              </div>

              {/* Totals */}
              <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>€{totals.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>IVA:</span>
                  <span>€{totals.vat_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Total:</span>
                  <span>€{totals.total_amount.toFixed(2)}</span>
                </div>
              </div>

              {/* Notes */}
              <div>
                <Label>Notas</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Notas adicionais..."
                  rows={2}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="button" variant="outline" onClick={resetForm} className="flex-1">
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1 bg-green-600 hover:bg-green-700">
                  {editingInvoice ? "Atualizar" : "Criar Fatura"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-slate-600">Total Faturas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">€{stats.pendingValue.toFixed(0)}</p>
                <p className="text-sm text-slate-600">{stats.pending} Pendentes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">€{stats.totalValue.toFixed(0)}</p>
                <p className="text-sm text-slate-600">{stats.paid} Pagas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.overdue}</p>
                <p className="text-sm text-slate-600">Vencidas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid md:grid-cols-4 gap-3">
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Pesquisar faturas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Estados</SelectItem>
                <SelectItem value="draft">Rascunho</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="sent">Enviada</SelectItem>
                <SelectItem value="paid">Paga</SelectItem>
                <SelectItem value="overdue">Vencida</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Tipos</SelectItem>
                <SelectItem value="agent">Agente</SelectItem>
                <SelectItem value="agency">Agência</SelectItem>
                <SelectItem value="subscription">Subscrição</SelectItem>
                <SelectItem value="commission">Comissão</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Invoice List */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Receipt className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Nenhuma fatura encontrada</p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredInvoices.map((invoice) => {
                const status = statusConfig[invoice.status] || statusConfig.draft;
                const StatusIcon = status.icon;
                const type = typeConfig[invoice.invoice_type] || typeConfig.agent;
                const TypeIcon = type.icon;
                const isOverdue = invoice.status === 'sent' && invoice.due_date && isBefore(new Date(invoice.due_date), new Date());

                return (
                  <div key={invoice.id} className="p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 min-w-0 flex-1">
                        <div className={`p-2 rounded-lg ${isOverdue ? 'bg-red-100' : 'bg-slate-100'}`}>
                          <TypeIcon className={`w-5 h-5 ${isOverdue ? 'text-red-600' : 'text-slate-600'}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-slate-900">{invoice.invoice_number}</span>
                            <Badge className={status.color}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {isOverdue ? 'Vencida' : status.label}
                            </Badge>
                            <Badge variant="outline">{type.label}</Badge>
                          </div>
                          <p className="text-sm text-slate-600 truncate">{invoice.recipient_name}</p>
                          <p className="text-xs text-slate-500">
                            Emissão: {invoice.issue_date ? format(new Date(invoice.issue_date), "dd/MM/yyyy") : 'N/A'}
                            {invoice.due_date && ` • Vencimento: ${format(new Date(invoice.due_date), "dd/MM/yyyy")}`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-slate-900">€{invoice.total_amount?.toFixed(2) || '0.00'}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        {invoice.status === 'draft' && (
                          <Button variant="outline" size="sm" onClick={() => handleStatusChange(invoice, 'pending')}>
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                            Finalizar
                          </Button>
                        )}
                        {(invoice.status === 'pending' || invoice.status === 'draft') && (
                          <Button variant="outline" size="sm" onClick={() => handleSendInvoice(invoice)}>
                            <Send className="w-4 h-4" />
                          </Button>
                        )}
                        {invoice.status === 'sent' && (
                          <Button variant="outline" size="sm" className="text-green-600" onClick={() => handleStatusChange(invoice, 'paid')}>
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                            Paga
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(invoice)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-600" onClick={() => deleteMutation.mutate(invoice.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}