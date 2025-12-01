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
  Receipt, TrendingUp, X, Upload, BarChart3
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
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [activeTab, setActiveTab] = useState("list");
  const [importData, setImportData] = useState([]);
  const [importing, setImporting] = useState(false);
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

  const bulkCreateMutation = useMutation({
    mutationFn: async (importedInvoices) => {
      const year = new Date().getFullYear();
      const existingCount = invoices.filter(i => i.invoice_number?.startsWith(`FAT-${year}`)).length;
      let count = existingCount;
      
      const results = [];
      for (const inv of importedInvoices) {
        // Use imported invoice_number or generate new one
        let invoice_number = inv.invoice_number;
        if (!invoice_number) {
          count++;
          invoice_number = `FAT-${year}-${String(count).padStart(4, '0')}`;
        }
        results.push(await base44.entities.Invoice.create({ ...inv, invoice_number }));
      }
      return results;
    },
    onSuccess: (data) => {
      toast.success(`${data.length} faturas importadas com sucesso`);
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setImportDialogOpen(false);
      setImportData([]);
    }
  });

  // Parse CSV content
  const parseCSV = (text) => {
    const lines = text.split('\n').filter(l => l.trim());
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(/[,;]/).map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(/[,;]/).map(v => v.trim().replace(/['"]/g, ''));
      const row = {};
      
      headers.forEach((header, idx) => {
        const value = values[idx] || '';
        // Map common header names
        if (header.includes('numero') || header.includes('número') || header === 'nº' || header === 'invoice' || header === 'fatura') {
          row.invoice_number = value;
        } else if (header.includes('nome') || header.includes('name') || header === 'destinatário') {
          row.recipient_name = value;
        } else if (header.includes('email')) {
          row.recipient_email = value;
        } else if (header.includes('nif') || header.includes('contribuinte')) {
          row.recipient_nif = value;
        } else if (header.includes('tipo') || header === 'type') {
          row.invoice_type = value.toLowerCase().includes('agência') ? 'agency' : 
                            value.toLowerCase().includes('comissão') ? 'commission' : 
                            value.toLowerCase().includes('subscrição') ? 'subscription' : 'agent';
        } else if (header.includes('emissão') || header.includes('issue') || header === 'data') {
          row.issue_date = value;
        } else if (header.includes('vencimento') || header.includes('due')) {
          row.due_date = value;
        } else if (header.includes('total') || header.includes('valor') || header === 'amount') {
          row.total_amount = parseFloat(value.replace(/[€\s]/g, '').replace(',', '.')) || 0;
        } else if (header.includes('subtotal')) {
          row.subtotal = parseFloat(value.replace(/[€\s]/g, '').replace(',', '.')) || 0;
        } else if (header.includes('iva') || header.includes('vat')) {
          row.vat_amount = parseFloat(value.replace(/[€\s]/g, '').replace(',', '.')) || 0;
        } else if (header.includes('estado') || header === 'status') {
          row.status = value.toLowerCase().includes('pag') ? 'paid' : 
                      value.toLowerCase().includes('pend') ? 'pending' : 
                      value.toLowerCase().includes('envi') ? 'sent' : 'draft';
        } else if (header.includes('descrição') || header.includes('description')) {
          row.description = value;
        } else if (header.includes('notas') || header.includes('notes')) {
          row.notes = value;
        }
      });
      
      // Only add if has recipient name
      if (row.recipient_name) {
        // Create items array if we have a description
        if (row.description) {
          row.items = [{ 
            description: row.description, 
            quantity: 1, 
            unit_price: row.subtotal || row.total_amount || 0,
            vat_rate: 23,
            total: row.total_amount || 0
          }];
          // Keep description for service type detection
          row.service_description = row.description;
          delete row.description;
        }
        data.push(row);
      }
    }
    
    return data;
  };

  // Handle file import
  const handleFileImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const fileName = file.name.toLowerCase();
      
      // For CSV files, parse locally first
      if (fileName.endsWith('.csv')) {
        const text = await file.text();
        const parsedData = parseCSV(text);
        
        if (parsedData.length > 0) {
          setImportData(parsedData.map(inv => ({
            ...inv,
            status: inv.status || 'draft',
            invoice_type: inv.invoice_type || 'service',
            recipient_type: inv.invoice_type === 'agency' ? 'agency' : 'agent'
          })));
          toast.success(`${parsedData.length} faturas encontradas no ficheiro CSV`);
          setImporting(false);
          return;
        }
      }
      
      // For other files, use AI extraction
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          properties: {
            invoices: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  recipient_name: { type: "string", description: "Nome do destinatário da fatura" },
                  recipient_email: { type: "string", description: "Email do destinatário" },
                  recipient_nif: { type: "string", description: "NIF/Contribuinte" },
                  invoice_type: { type: "string", description: "Tipo: agent, agency, commission, subscription, service" },
                  issue_date: { type: "string", description: "Data de emissão (YYYY-MM-DD)" },
                  due_date: { type: "string", description: "Data de vencimento (YYYY-MM-DD)" },
                  total_amount: { type: "number", description: "Valor total com IVA" },
                  subtotal: { type: "number", description: "Valor sem IVA" },
                  vat_amount: { type: "number", description: "Valor do IVA" },
                  status: { type: "string", description: "Estado: draft, pending, sent, paid" },
                  notes: { type: "string", description: "Notas adicionais" }
                }
              }
            }
          }
        }
      });

      if (result.status === 'success' && result.output) {
        const invoicesData = result.output.invoices || (Array.isArray(result.output) ? result.output : [result.output]);
        const data = Array.isArray(invoicesData) ? invoicesData : [invoicesData];
        
        if (data.length > 0 && data[0].recipient_name) {
          setImportData(data.map(inv => ({
            ...inv,
            status: inv.status || 'draft',
            invoice_type: inv.invoice_type || 'agent',
            recipient_type: inv.invoice_type === 'agency' ? 'agency' : 'agent'
          })));
          toast.success(`${data.length} faturas encontradas no ficheiro`);
        } else {
          toast.error("Não foram encontradas faturas válidas no ficheiro");
        }
      } else {
        toast.error("Erro ao processar ficheiro: " + (result.details || "formato não reconhecido"));
      }
    } catch (error) {
      console.error(error);
      toast.error("Erro ao importar ficheiro");
    }
    setImporting(false);
  };

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
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Importar
          </Button>
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
      </div>

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Importar Faturas
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              <Upload className="w-10 h-10 mx-auto text-slate-400 mb-3" />
              <p className="text-sm text-slate-600 mb-2">
                Carregue um ficheiro CSV, Excel ou PDF com os dados das faturas
              </p>
              <p className="text-xs text-slate-500 mb-3">
                CSV deve ter colunas: Nº Fatura, Nome, Email, NIF, Tipo, Data Emissão, Data Vencimento, Valor Total, Estado, Descrição
              </p>
              <input
                type="file"
                accept=".csv,.xlsx,.xls,.pdf"
                onChange={handleFileImport}
                className="hidden"
                id="invoice-import"
              />
              <label htmlFor="invoice-import">
                <Button variant="outline" asChild disabled={importing}>
                  <span>{importing ? "A processar..." : "Selecionar Ficheiro"}</span>
                </Button>
              </label>
              
              {/* Download template */}
              <div className="mt-4 pt-4 border-t">
                <p className="text-xs text-slate-500 mb-2">Ou descarregue o modelo CSV:</p>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    const template = "Número;Nome;Email;NIF;Tipo;Data Emissão;Data Vencimento;Valor Total;IVA;Estado;Descrição;Notas\nFAT-2024-0001;João Silva;joao@exemplo.com;123456789;Serviço;2024-01-01;2024-01-31;123.00;23.00;Pendente;Mensalidade Janeiro;";
                    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'modelo_faturas.csv';
                    a.click();
                  }}
                >
                  <Download className="w-4 h-4 mr-1" />
                  Descarregar Modelo CSV
                </Button>
              </div>
            </div>

            {importData.length > 0 && (
              <>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm text-green-700">
                    <CheckCircle2 className="w-4 h-4 inline mr-1" />
                    {importData.length} faturas prontas para importar
                  </p>
                </div>

                <div className="max-h-64 overflow-y-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr>
                        <th className="text-left p-2">Nº Fatura</th>
                        <th className="text-left p-2">Destinatário / Descrição</th>
                        <th className="text-left p-2">Tipo</th>
                        <th className="text-right p-2">Valor</th>
                        <th className="text-left p-2">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importData.map((inv, idx) => (
                        <tr key={idx} className="border-t">
                          <td className="p-2">
                            <span className="text-xs font-mono text-slate-600">{inv.invoice_number || '-'}</span>
                          </td>
                          <td className="p-2">
                            <p className="font-medium">{inv.recipient_name}</p>
                            <p className="text-xs text-slate-500">{inv.recipient_email}</p>
                            {inv.service_description && (
                              <p className="text-xs text-blue-600 mt-1 truncate max-w-[200px]" title={inv.service_description}>
                                {inv.service_description}
                              </p>
                            )}
                          </td>
                          <td className="p-2">{typeConfig[inv.invoice_type]?.label || inv.invoice_type}</td>
                          <td className="p-2 text-right font-medium">€{inv.total_amount?.toFixed(2) || '0.00'}</td>
                          <td className="p-2">
                            <Badge className={statusConfig[inv.status]?.color || 'bg-slate-100'}>
                              {statusConfig[inv.status]?.label || inv.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setImportData([])} className="flex-1">
                    Cancelar
                  </Button>
                  <Button 
                    onClick={() => bulkCreateMutation.mutate(importData)} 
                    disabled={bulkCreateMutation.isPending}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    {bulkCreateMutation.isPending ? "A importar..." : `Importar ${importData.length} Faturas`}
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="list" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Faturas
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Análise Financeira
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="mt-4">
          <FinancialAnalytics invoices={invoices} />
        </TabsContent>

        <TabsContent value="list" className="mt-4 space-y-4">

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
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Financial Analytics Component
function FinancialAnalytics({ invoices }) {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  // Monthly revenue data
  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const monthInvoices = invoices.filter(inv => {
      if (!inv.issue_date) return false;
      const date = new Date(inv.issue_date);
      return date.getFullYear() === currentYear && date.getMonth() === i;
    });

    const paid = monthInvoices.filter(i => i.status === 'paid');
    const pending = monthInvoices.filter(i => i.status === 'sent' || i.status === 'pending');

    return {
      month: format(new Date(currentYear, i, 1), 'MMM', { locale: ptBR }),
      faturado: monthInvoices.reduce((sum, i) => sum + (i.total_amount || 0), 0),
      recebido: paid.reduce((sum, i) => sum + (i.total_amount || 0), 0),
      pendente: pending.reduce((sum, i) => sum + (i.total_amount || 0), 0)
    };
  });

  // By type
  const byType = Object.keys(typeConfig).map(type => ({
    name: typeConfig[type].label,
    value: invoices.filter(i => i.invoice_type === type).reduce((sum, i) => sum + (i.total_amount || 0), 0),
    count: invoices.filter(i => i.invoice_type === type).length
  })).filter(t => t.value > 0);

  // By service description (for service type invoices)
  const serviceInvoices = invoices.filter(i => i.invoice_type === 'service' || i.items?.length > 0);
  const byService = serviceInvoices.reduce((acc, inv) => {
    const desc = inv.items?.[0]?.description || inv.service_description || 'Outros Serviços';
    const key = desc.substring(0, 30);
    if (!acc[key]) acc[key] = { name: key, value: 0, count: 0 };
    acc[key].value += inv.total_amount || 0;
    acc[key].count++;
    return acc;
  }, {});
  const topServices = Object.values(byService).sort((a, b) => b.value - a.value).slice(0, 5);

  // Top clients
  const clientTotals = invoices.reduce((acc, inv) => {
    const key = inv.recipient_email || inv.recipient_name;
    if (!acc[key]) acc[key] = { name: inv.recipient_name, email: inv.recipient_email, total: 0, count: 0 };
    acc[key].total += inv.total_amount || 0;
    acc[key].count++;
    return acc;
  }, {});

  const topClients = Object.values(clientTotals)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  // Totals
  const totalFaturado = invoices.reduce((sum, i) => sum + (i.total_amount || 0), 0);
  const totalRecebido = invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + (i.total_amount || 0), 0);
  const totalPendente = invoices.filter(i => i.status === 'sent' || i.status === 'pending').reduce((sum, i) => sum + (i.total_amount || 0), 0);
  const totalVencido = invoices.filter(i => i.status === 'overdue' || (i.status === 'sent' && i.due_date && isBefore(new Date(i.due_date), new Date()))).reduce((sum, i) => sum + (i.total_amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <p className="text-sm text-blue-600 mb-1">Total Faturado</p>
            <p className="text-2xl font-bold text-blue-900">€{totalFaturado.toFixed(2)}</p>
            <p className="text-xs text-blue-600">{invoices.length} faturas</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <p className="text-sm text-green-600 mb-1">Total Recebido</p>
            <p className="text-2xl font-bold text-green-900">€{totalRecebido.toFixed(2)}</p>
            <p className="text-xs text-green-600">{((totalRecebido/totalFaturado)*100 || 0).toFixed(0)}% do total</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <CardContent className="p-4">
            <p className="text-sm text-amber-600 mb-1">Pendente</p>
            <p className="text-2xl font-bold text-amber-900">€{totalPendente.toFixed(2)}</p>
            <p className="text-xs text-amber-600">A aguardar pagamento</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="p-4">
            <p className="text-sm text-red-600 mb-1">Vencido</p>
            <p className="text-2xl font-bold text-red-900">€{totalVencido.toFixed(2)}</p>
            <p className="text-xs text-red-600">Requer atenção</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Monthly Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Faturação Mensal {currentYear}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {monthlyData.slice(0, currentMonth + 1).map((m, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium capitalize">{m.month}</span>
                    <span>€{m.faturado.toFixed(0)}</span>
                  </div>
                  <div className="flex h-3 rounded-full overflow-hidden bg-slate-100">
                    <div 
                      className="bg-green-500" 
                      style={{ width: `${(m.recebido / (m.faturado || 1)) * 100}%` }}
                    />
                    <div 
                      className="bg-amber-400" 
                      style={{ width: `${(m.pendente / (m.faturado || 1)) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-4 mt-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-green-500" />
                <span>Recebido</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-amber-400" />
                <span>Pendente</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Clients */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top Clientes</CardTitle>
          </CardHeader>
          <CardContent>
            {topClients.length === 0 ? (
              <p className="text-center text-slate-500 py-8">Sem dados</p>
            ) : (
              <div className="space-y-3">
                {topClients.map((client, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-semibold text-slate-700">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{client.name}</p>
                        <p className="text-xs text-slate-500">{client.count} faturas</p>
                      </div>
                    </div>
                    <p className="font-bold text-slate-900">€{client.total.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* By Type */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Por Tipo de Fatura</CardTitle>
          </CardHeader>
          <CardContent>
            {byType.length === 0 ? (
              <p className="text-center text-slate-500 py-8">Sem dados</p>
            ) : (
              <div className="space-y-3">
                {byType.map((type, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{type.name}</p>
                      <p className="text-xs text-slate-500">{type.count} faturas</p>
                    </div>
                    <p className="font-bold text-slate-900">€{type.value.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* By Service Description */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Por Serviço</CardTitle>
          </CardHeader>
          <CardContent>
            {topServices.length === 0 ? (
              <p className="text-center text-slate-500 py-8">Sem dados de serviços</p>
            ) : (
              <div className="space-y-3">
                {topServices.map((service, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate" title={service.name}>{service.name}</p>
                      <p className="text-xs text-slate-500">{service.count} faturas</p>
                    </div>
                    <p className="font-bold text-slate-900 ml-2">€{service.value.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Estado dos Pagamentos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(statusConfig).map(([key, config]) => {
                const count = invoices.filter(i => i.status === key).length;
                const value = invoices.filter(i => i.status === key).reduce((sum, i) => sum + (i.total_amount || 0), 0);
                if (count === 0) return null;
                
                const Icon = config.icon;
                return (
                  <div key={key} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className={config.color}>
                        <Icon className="w-3 h-3 mr-1" />
                        {config.label}
                      </Badge>
                      <span className="text-sm text-slate-500">({count})</span>
                    </div>
                    <span className="font-medium">€{value.toFixed(2)}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}