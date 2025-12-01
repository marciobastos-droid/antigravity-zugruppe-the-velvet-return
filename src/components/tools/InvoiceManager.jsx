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
  Receipt, TrendingUp, X, Upload, BarChart3, CreditCard, Copy, QrCode
} from "lucide-react";
import { toast } from "sonner";
import { format, addDays, isAfter, isBefore } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, AreaChart, Area, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useAgentNames } from "../common/useAgentNames";
import InvoiceClientsManager from "./InvoiceClientsManager";

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

// Generate Multibanco reference from invoice ID
const generateMBReference = (invoiceId, amount) => {
  const entity = "21551"; // Simulated entity
  // Generate reference based on invoice ID hash
  const hash = invoiceId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const reference = String(hash % 1000000000).padStart(9, '0');
  const formatted = `${reference.slice(0,3)} ${reference.slice(3,6)} ${reference.slice(6,9)}`;
  return { entity, reference: formatted, amount: amount?.toFixed(2) || '0.00' };
};

export default function InvoiceManager() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentInvoice, setPaymentInvoice] = useState(null);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [activeTab, setActiveTab] = useState("list");
  const [importData, setImportData] = useState([]);
  const [importing, setImporting] = useState(false);
  const [selectedInvoices, setSelectedInvoices] = useState([]);
  const [bulkPaymentDialogOpen, setBulkPaymentDialogOpen] = useState(false);
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
    queryFn: async () => {
      const allInvoices = await base44.entities.Invoice.list('-created_date');
      
      // Auto-update overdue invoices
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const overdueUpdates = [];
      for (const inv of allInvoices) {
        // Check if invoice should be marked as overdue
        if ((inv.status === 'pending' || inv.status === 'sent') && inv.due_date) {
          const dueDate = new Date(inv.due_date);
          dueDate.setHours(0, 0, 0, 0);
          if (dueDate < today) {
            overdueUpdates.push(inv.id);
          }
        }
      }
      
      // Update overdue invoices in background
      if (overdueUpdates.length > 0) {
        Promise.all(overdueUpdates.map(id => 
          base44.entities.Invoice.update(id, { status: 'overdue' })
        )).catch(console.error);
      }
      
      // Return invoices with corrected status for immediate display
      return allInvoices.map(inv => {
        if ((inv.status === 'pending' || inv.status === 'sent') && inv.due_date) {
          const dueDate = new Date(inv.due_date);
          dueDate.setHours(0, 0, 0, 0);
          if (dueDate < today) {
            return { ...inv, status: 'overdue' };
          }
        }
        return inv;
      });
    }
  });

  const { users, getAgentName } = useAgentNames();

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
      
      // For PDF and other files, use AI extraction with InvokeLLM for better results
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Analisa cuidadosamente este documento PDF de fatura portuguesa e extrai TODOS os dados com precisão.

INSTRUÇÕES DE EXTRAÇÃO:

1. NÚMERO DA FATURA (invoice_number):
   - Procura por: "Fatura nº", "FT", "FAT", "Factura", "Invoice", "Nº", "Documento"
   - Extrai o número COMPLETO incluindo prefixos e ano (ex: "FT 2024/00123", "FAT-2024-0001")

2. DADOS DO CLIENTE/DESTINATÁRIO:
   - recipient_name: Nome completo do cliente (procura após "Cliente:", "Destinatário:", "Nome:", "Exmo.")
   - recipient_email: Email do cliente se presente
   - recipient_nif: Número de contribuinte (9 dígitos, procura "NIF:", "Contribuinte:", "NIPC:")
   - recipient_address: Morada completa do cliente

3. DADOS DO EMITENTE (se o cliente não estiver claro, pode ser o emitente):
   - Verifica quem está a PAGAR vs quem está a RECEBER

4. DATAS (converter para YYYY-MM-DD):
   - issue_date: Data de emissão (procura "Data:", "Emissão:", "Data de emissão")
   - due_date: Data de vencimento (procura "Vencimento:", "Data limite", "Prazo de pagamento")

5. VALORES MONETÁRIOS (extrair APENAS números, sem € ou separadores):
   - total_amount: Valor TOTAL com IVA (procura "Total:", "Total a pagar:", "Valor total")
   - subtotal: Valor base sem IVA (procura "Subtotal:", "Base tributável:", "Incidência")
   - vat_amount: Valor do IVA (procura "IVA:", "Taxa:", "Imposto")
   - ATENÇÃO: Usa ponto (.) como separador decimal, não vírgula

6. DESCRIÇÃO DOS SERVIÇOS (service_description):
   - MUITO IMPORTANTE: Extrai a descrição COMPLETA dos serviços/produtos
   - Procura na tabela de itens, linhas de detalhe, campo "Descrição"
   - Se houver múltiplos itens, junta-os separados por "; "
   - Exemplos: "Consultoria imobiliária", "Comissão de venda", "Mensalidade Janeiro 2024"

7. ESTADO (status):
   - "paid" se indicar: "Pago", "Liquidado", "Recebido", carimbo de pagamento
   - "pending" caso contrário

8. NOTAS (notes):
   - Observações, condições de pagamento, referências MB, IBAN

FORMATO DE RESPOSTA:
Retorna um array com todas as faturas encontradas no documento.`,
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: {
            invoices: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  invoice_number: { type: "string", description: "Número completo da fatura" },
                  recipient_name: { type: "string", description: "Nome do cliente/destinatário" },
                  recipient_email: { type: "string", description: "Email do cliente" },
                  recipient_nif: { type: "string", description: "NIF/Contribuinte (9 dígitos)" },
                  recipient_address: { type: "string", description: "Morada completa" },
                  issue_date: { type: "string", description: "Data de emissão (YYYY-MM-DD)" },
                  due_date: { type: "string", description: "Data de vencimento (YYYY-MM-DD)" },
                  total_amount: { type: "number", description: "Valor total COM IVA" },
                  subtotal: { type: "number", description: "Valor SEM IVA" },
                  vat_amount: { type: "number", description: "Valor do IVA" },
                  service_description: { type: "string", description: "Descrição completa dos serviços/produtos" },
                  status: { type: "string", description: "paid ou pending" },
                  notes: { type: "string", description: "Observações e notas adicionais" }
                }
              }
            }
          }
        }
      });

      if (result && result.invoices) {
        const data = Array.isArray(result.invoices) ? result.invoices : [result.invoices];
        
        if (data.length > 0 && (data[0].recipient_name || data[0].invoice_number)) {
          setImportData(data.map(inv => ({
            ...inv,
            status: inv.status || 'draft',
            invoice_type: 'service',
            recipient_type: 'agent',
            items: inv.service_description ? [{
              description: inv.service_description,
              quantity: 1,
              unit_price: inv.subtotal || inv.total_amount || 0,
              vat_rate: inv.vat_amount && inv.subtotal ? Math.round((inv.vat_amount / inv.subtotal) * 100) : 23,
              total: inv.total_amount || 0
            }] : []
          })));
          toast.success(`${data.length} fatura(s) extraída(s) do PDF`);
        } else {
          toast.error("Não foram encontrados dados de fatura no PDF");
        }
      } else {
        toast.error("Erro ao processar PDF - verifique se o documento contém faturas válidas");
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

  const bulkMarkAsPaidMutation = useMutation({
    mutationFn: async (ids) => {
      const paid_date = format(new Date(), "yyyy-MM-dd");
      for (const id of ids) {
        await base44.entities.Invoice.update(id, { status: 'paid', paid_date });
      }
      return ids.length;
    },
    onSuccess: (count) => {
      toast.success(`${count} faturas marcadas como pagas`);
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setSelectedInvoices([]);
      setBulkPaymentDialogOpen(false);
    }
  });

  const toggleSelectInvoice = (id) => {
    setSelectedInvoices(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    const payableInvoices = filteredInvoices.filter(i => i.status === 'sent' || i.status === 'pending');
    if (selectedInvoices.length === payableInvoices.length) {
      setSelectedInvoices([]);
    } else {
      setSelectedInvoices(payableInvoices.map(i => i.id));
    }
  };

  const handleSendInvoice = async (invoice) => {
    try {
      const mb = generateMBReference(invoice.id, invoice.total_amount);
      const paymentLink = `${window.location.origin}${window.location.pathname}?pay=${invoice.id}`;
      
      await base44.integrations.Core.SendEmail({
        to: invoice.recipient_email,
        subject: `Fatura ${invoice.invoice_number} - Pagamento`,
        body: `Caro(a) ${invoice.recipient_name},

Segue a fatura ${invoice.invoice_number} no valor de €${invoice.total_amount?.toFixed(2)}.

Data de vencimento: ${invoice.due_date ? format(new Date(invoice.due_date), "dd/MM/yyyy") : 'N/A'}

═══════════════════════════════════
DADOS PARA PAGAMENTO MULTIBANCO
═══════════════════════════════════
Entidade: ${mb.entity}
Referência: ${mb.reference}
Valor: €${mb.amount}
═══════════════════════════════════

Ou pague por MB Way/Transferência:
IBAN: PT50 0000 0000 0000 0000 0000 0
MB Way: +351 900 000 000

Após o pagamento, responda a este email com o comprovativo.

Obrigado.`
      });
      handleStatusChange(invoice, 'sent');
      toast.success("Fatura enviada por email com dados de pagamento");
    } catch (error) {
      toast.error("Erro ao enviar email");
    }
  };

  const handleOpenPayment = (invoice) => {
    setPaymentInvoice(invoice);
    setPaymentDialogOpen(true);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado!");
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
                          {getAgentName(agent.email)}
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

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-green-600" />
              Pagamento da Fatura
            </DialogTitle>
          </DialogHeader>
          {paymentInvoice && (
            <div className="space-y-4 mt-4">
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-600">Fatura</p>
                <p className="text-xl font-bold">{paymentInvoice.invoice_number}</p>
                <p className="text-3xl font-bold text-green-600 mt-2">
                  €{paymentInvoice.total_amount?.toFixed(2)}
                </p>
              </div>

              {/* Multibanco */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                    <span className="text-white font-bold text-xs">MB</span>
                  </div>
                  <span className="font-semibold">Multibanco</span>
                </div>
                {(() => {
                  const mb = generateMBReference(paymentInvoice.id, paymentInvoice.total_amount);
                  return (
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600">Entidade:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold">{mb.entity}</span>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => copyToClipboard(mb.entity)}>
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600">Referência:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold">{mb.reference}</span>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => copyToClipboard(mb.reference.replace(/\s/g, ''))}>
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600">Valor:</span>
                        <span className="font-mono font-bold">€{mb.amount}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* MB Way */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-red-500 rounded flex items-center justify-center">
                    <span className="text-white font-bold text-xs">MW</span>
                  </div>
                  <span className="font-semibold">MB Way</span>
                </div>
                <p className="text-sm text-slate-600">
                  Envie €{paymentInvoice.total_amount?.toFixed(2)} para o número:
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-mono font-bold">+351 900 000 000</span>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => copyToClipboard("+351900000000")}>
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              {/* Transfer */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Euro className="w-5 h-5 text-slate-600" />
                  <span className="font-semibold">Transferência Bancária</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono">PT50 0000 0000 0000 0000 0000 0</span>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => copyToClipboard("PT50000000000000000000000")}>
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setPaymentDialogOpen(false)} className="flex-1">
                  Fechar
                </Button>
                <Button 
                  onClick={() => {
                    handleStatusChange(paymentInvoice, 'paid');
                    setPaymentDialogOpen(false);
                  }} 
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Confirmar Pagamento
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk Payment Confirmation Dialog */}
      <Dialog open={bulkPaymentDialogOpen} onOpenChange={setBulkPaymentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Confirmar Pagamento em Massa
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <p className="text-sm text-green-600 mb-1">Total a marcar como pago</p>
              <p className="text-3xl font-bold text-green-700">
                €{filteredInvoices.filter(i => selectedInvoices.includes(i.id)).reduce((sum, i) => sum + (i.total_amount || 0), 0).toFixed(2)}
              </p>
              <p className="text-sm text-green-600 mt-1">{selectedInvoices.length} fatura{selectedInvoices.length > 1 ? 's' : ''}</p>
            </div>

            <div className="max-h-48 overflow-y-auto border rounded-lg divide-y">
              {filteredInvoices.filter(i => selectedInvoices.includes(i.id)).map(invoice => (
                <div key={invoice.id} className="p-2 flex items-center justify-between text-sm">
                  <div>
                    <span className="font-medium">{invoice.invoice_number}</span>
                    <span className="text-slate-500 ml-2">{invoice.recipient_name}</span>
                  </div>
                  <span className="font-medium">€{invoice.total_amount?.toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setBulkPaymentDialogOpen(false)} className="flex-1">
                Cancelar
              </Button>
              <Button 
                onClick={() => bulkMarkAsPaidMutation.mutate(selectedInvoices)}
                disabled={bulkMarkAsPaidMutation.isPending}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                {bulkMarkAsPaidMutation.isPending ? "A processar..." : "Confirmar Pagamento"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
          <TabsTrigger value="clients" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Clientes
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Análise Financeira
          </TabsTrigger>
        </TabsList>

        <TabsContent value="clients" className="mt-4">
          <InvoiceClientsManager />
        </TabsContent>

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

      {/* Bulk Actions */}
      {selectedInvoices.length > 0 && (
        <Card className="border-green-300 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span className="font-medium text-green-900">
                  {selectedInvoices.length} fatura{selectedInvoices.length > 1 ? 's' : ''} selecionada{selectedInvoices.length > 1 ? 's' : ''}
                </span>
                <span className="text-sm text-green-700">
                  (€{filteredInvoices.filter(i => selectedInvoices.includes(i.id)).reduce((sum, i) => sum + (i.total_amount || 0), 0).toFixed(2)})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setBulkPaymentDialogOpen(true)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Marcar como Pagas
                </Button>
                <Button variant="outline" onClick={() => setSelectedInvoices([])}>
                  Cancelar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
          {/* Select All for payable invoices */}
          {filteredInvoices.some(i => i.status === 'sent' || i.status === 'pending') && (
            <div className="mt-3 pt-3 border-t">
              <Button variant="outline" size="sm" onClick={toggleSelectAll}>
                {selectedInvoices.length === filteredInvoices.filter(i => i.status === 'sent' || i.status === 'pending').length 
                  ? 'Desselecionar Todas' 
                  : 'Selecionar Pendentes/Enviadas'}
              </Button>
            </div>
          )}
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
                  <div key={invoice.id} className={`p-4 hover:bg-slate-50 transition-colors ${selectedInvoices.includes(invoice.id) ? 'bg-green-50' : ''}`}>
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 min-w-0 flex-1">
                        {/* Checkbox for payable invoices */}
                        {(invoice.status === 'sent' || invoice.status === 'pending') && (
                          <input
                            type="checkbox"
                            checked={selectedInvoices.includes(invoice.id)}
                            onChange={() => toggleSelectInvoice(invoice.id)}
                            className="w-4 h-4 rounded border-slate-300 text-green-600 focus:ring-green-500 cursor-pointer"
                          />
                        )}
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
                          <>
                            <Button variant="outline" size="sm" onClick={() => handleOpenPayment(invoice)}>
                              <CreditCard className="w-4 h-4 mr-1" />
                              Pagar
                            </Button>
                            <Button variant="outline" size="sm" className="text-green-600" onClick={() => handleStatusChange(invoice, 'paid')}>
                              <CheckCircle2 className="w-4 h-4" />
                            </Button>
                          </>
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
  const [periodFilter, setPeriodFilter] = useState("year");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedQuarter, setSelectedQuarter] = useState(Math.floor(new Date().getMonth() / 3) + 1);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [typeFilter, setTypeFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [activeChart, setActiveChart] = useState("monthly");

  const currentYear = new Date().getFullYear();
  const availableYears = [...new Set(invoices.map(i => new Date(i.issue_date || i.created_date).getFullYear()))].sort((a, b) => b - a);
  if (!availableYears.includes(currentYear)) availableYears.unshift(currentYear);

  // Get unique clients
  const uniqueClients = [...new Set(invoices.map(i => i.recipient_email || i.recipient_name))].filter(Boolean);

  // Filter invoices based on selections
  const filteredInvoices = invoices.filter(inv => {
    if (!inv.issue_date && !inv.created_date) return false;
    const date = new Date(inv.issue_date || inv.created_date);
    const year = date.getFullYear();
    const month = date.getMonth();
    const quarter = Math.floor(month / 3) + 1;

    // Period filter
    if (periodFilter === "year" && year !== selectedYear) return false;
    if (periodFilter === "quarter" && (year !== selectedYear || quarter !== selectedQuarter)) return false;
    if (periodFilter === "month" && (year !== selectedYear || month !== selectedMonth)) return false;

    // Type filter
    if (typeFilter !== "all" && inv.invoice_type !== typeFilter) return false;

    // Client filter
    if (clientFilter !== "all" && (inv.recipient_email !== clientFilter && inv.recipient_name !== clientFilter)) return false;

    return true;
  });

  // Monthly revenue data for selected year
  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const monthInvoices = filteredInvoices.filter(inv => {
      const date = new Date(inv.issue_date || inv.created_date);
      return date.getFullYear() === selectedYear && date.getMonth() === i;
    });

    const paid = monthInvoices.filter(i => i.status === 'paid');
    const pending = monthInvoices.filter(i => i.status === 'sent' || i.status === 'pending');

    return {
      month: format(new Date(selectedYear, i, 1), 'MMM', { locale: ptBR }),
      monthFull: format(new Date(selectedYear, i, 1), 'MMMM', { locale: ptBR }),
      faturado: monthInvoices.reduce((sum, i) => sum + (i.total_amount || 0), 0),
      recebido: paid.reduce((sum, i) => sum + (i.total_amount || 0), 0),
      pendente: pending.reduce((sum, i) => sum + (i.total_amount || 0), 0),
      count: monthInvoices.length
    };
  });

  // Quarterly data
  const quarterlyData = [1, 2, 3, 4].map(q => {
    const quarterInvoices = filteredInvoices.filter(inv => {
      const date = new Date(inv.issue_date || inv.created_date);
      return date.getFullYear() === selectedYear && Math.floor(date.getMonth() / 3) + 1 === q;
    });

    return {
      quarter: `T${q}`,
      faturado: quarterInvoices.reduce((sum, i) => sum + (i.total_amount || 0), 0),
      recebido: quarterInvoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + (i.total_amount || 0), 0),
      pendente: quarterInvoices.filter(i => i.status === 'sent' || i.status === 'pending').reduce((sum, i) => sum + (i.total_amount || 0), 0),
      count: quarterInvoices.length
    };
  });

  // Yearly comparison (last 3 years)
  const yearlyData = availableYears.slice(0, 4).map(year => {
    const yearInvoices = invoices.filter(inv => {
      const date = new Date(inv.issue_date || inv.created_date);
      return date.getFullYear() === year;
    });

    return {
      year: year.toString(),
      faturado: yearInvoices.reduce((sum, i) => sum + (i.total_amount || 0), 0),
      recebido: yearInvoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + (i.total_amount || 0), 0),
      count: yearInvoices.length
    };
  }).reverse();

  // By type
  const byType = Object.keys(typeConfig).map(type => ({
    name: typeConfig[type].label,
    value: filteredInvoices.filter(i => i.invoice_type === type).reduce((sum, i) => sum + (i.total_amount || 0), 0),
    count: filteredInvoices.filter(i => i.invoice_type === type).length
  })).filter(t => t.value > 0);

  // By service description
  const serviceInvoices = filteredInvoices.filter(i => i.invoice_type === 'service' || i.items?.length > 0);
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
  const clientTotals = filteredInvoices.reduce((acc, inv) => {
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
  const totalFaturado = filteredInvoices.reduce((sum, i) => sum + (i.total_amount || 0), 0);
  const totalRecebido = filteredInvoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + (i.total_amount || 0), 0);
  const totalPendente = filteredInvoices.filter(i => i.status === 'sent' || i.status === 'pending').reduce((sum, i) => sum + (i.total_amount || 0), 0);
  const totalVencido = filteredInvoices.filter(i => i.status === 'overdue' || (i.status === 'sent' && i.due_date && isBefore(new Date(i.due_date), new Date()))).reduce((sum, i) => sum + (i.total_amount || 0), 0);

  // Growth calculation
  const previousPeriodInvoices = invoices.filter(inv => {
    const date = new Date(inv.issue_date || inv.created_date);
    if (periodFilter === "year") return date.getFullYear() === selectedYear - 1;
    if (periodFilter === "quarter") {
      const prevQ = selectedQuarter === 1 ? 4 : selectedQuarter - 1;
      const prevY = selectedQuarter === 1 ? selectedYear - 1 : selectedYear;
      return date.getFullYear() === prevY && Math.floor(date.getMonth() / 3) + 1 === prevQ;
    }
    if (periodFilter === "month") {
      const prevM = selectedMonth === 0 ? 11 : selectedMonth - 1;
      const prevY = selectedMonth === 0 ? selectedYear - 1 : selectedYear;
      return date.getFullYear() === prevY && date.getMonth() === prevM;
    }
    return false;
  });
  const previousTotal = previousPeriodInvoices.reduce((sum, i) => sum + (i.total_amount || 0), 0);
  const growthRate = previousTotal > 0 ? ((totalFaturado - previousTotal) / previousTotal * 100).toFixed(1) : null;

  const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-medium">Filtros:</span>
            </div>
            
            <Select value={periodFilter} onValueChange={setPeriodFilter}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Mês</SelectItem>
                <SelectItem value="quarter">Trimestre</SelectItem>
                <SelectItem value="year">Ano</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map(y => (
                  <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {periodFilter === "quarter" && (
              <Select value={selectedQuarter.toString()} onValueChange={(v) => setSelectedQuarter(parseInt(v))}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">T1</SelectItem>
                  <SelectItem value="2">T2</SelectItem>
                  <SelectItem value="3">T3</SelectItem>
                  <SelectItem value="4">T4</SelectItem>
                </SelectContent>
              </Select>
            )}

            {periodFilter === "month" && (
              <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => (
                    <SelectItem key={i} value={i.toString()}>
                      {format(new Date(2024, i, 1), 'MMMM', { locale: ptBR })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <div className="h-6 w-px bg-slate-200" />

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Tipos</SelectItem>
                {Object.entries(typeConfig).map(([key, config]) => (
                  <SelectItem key={key} value={key}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={clientFilter} onValueChange={setClientFilter}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Cliente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Clientes</SelectItem>
                {uniqueClients.slice(0, 20).map(client => (
                  <SelectItem key={client} value={client}>{client}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Badge variant="outline" className="ml-auto">
              {filteredInvoices.length} faturas
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <p className="text-sm text-blue-600 mb-1">Total Faturado</p>
            <p className="text-2xl font-bold text-blue-900">€{totalFaturado.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</p>
            <p className="text-xs text-blue-600">{filteredInvoices.length} faturas</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <p className="text-sm text-green-600 mb-1">Total Recebido</p>
            <p className="text-2xl font-bold text-green-900">€{totalRecebido.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</p>
            <p className="text-xs text-green-600">{((totalRecebido/totalFaturado)*100 || 0).toFixed(0)}% do total</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <CardContent className="p-4">
            <p className="text-sm text-amber-600 mb-1">Pendente</p>
            <p className="text-2xl font-bold text-amber-900">€{totalPendente.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</p>
            <p className="text-xs text-amber-600">A aguardar</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="p-4">
            <p className="text-sm text-red-600 mb-1">Vencido</p>
            <p className="text-2xl font-bold text-red-900">€{totalVencido.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</p>
            <p className="text-xs text-red-600">Requer atenção</p>
          </CardContent>
        </Card>
        <Card className={`bg-gradient-to-br ${growthRate >= 0 ? 'from-emerald-50 to-emerald-100 border-emerald-200' : 'from-rose-50 to-rose-100 border-rose-200'}`}>
          <CardContent className="p-4">
            <p className={`text-sm mb-1 ${growthRate >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>Crescimento</p>
            <p className={`text-2xl font-bold ${growthRate >= 0 ? 'text-emerald-900' : 'text-rose-900'}`}>
              {growthRate !== null ? `${growthRate > 0 ? '+' : ''}${growthRate}%` : 'N/A'}
            </p>
            <p className={`text-xs ${growthRate >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>vs período anterior</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart Selector */}
      <div className="flex gap-2">
        <Button 
          variant={activeChart === "monthly" ? "default" : "outline"} 
          size="sm"
          onClick={() => setActiveChart("monthly")}
        >
          Mensal
        </Button>
        <Button 
          variant={activeChart === "quarterly" ? "default" : "outline"} 
          size="sm"
          onClick={() => setActiveChart("quarterly")}
        >
          Trimestral
        </Button>
        <Button 
          variant={activeChart === "yearly" ? "default" : "outline"} 
          size="sm"
          onClick={() => setActiveChart("yearly")}
        >
          Anual
        </Button>
        <Button 
          variant={activeChart === "comparison" ? "default" : "outline"} 
          size="sm"
          onClick={() => setActiveChart("comparison")}
        >
          Comparativo
        </Button>
      </div>

      {/* Interactive Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Main Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              {activeChart === "monthly" && `Faturação Mensal ${selectedYear}`}
              {activeChart === "quarterly" && `Faturação Trimestral ${selectedYear}`}
              {activeChart === "yearly" && "Evolução Anual"}
              {activeChart === "comparison" && "Faturado vs Recebido"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              {activeChart === "monthly" && (
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" stroke="#64748b" />
                  <YAxis stroke="#64748b" tickFormatter={(v) => `€${(v/1000).toFixed(0)}k`} />
                  <Tooltip 
                    formatter={(value) => [`€${value.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}`, '']}
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                  />
                  <Legend />
                  <Bar dataKey="recebido" name="Recebido" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="pendente" name="Pendente" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              )}
              {activeChart === "quarterly" && (
                <BarChart data={quarterlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="quarter" stroke="#64748b" />
                  <YAxis stroke="#64748b" tickFormatter={(v) => `€${(v/1000).toFixed(0)}k`} />
                  <Tooltip 
                    formatter={(value) => [`€${value.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}`, '']}
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                  />
                  <Legend />
                  <Bar dataKey="faturado" name="Faturado" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="recebido" name="Recebido" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              )}
              {activeChart === "yearly" && (
                <LineChart data={yearlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="year" stroke="#64748b" />
                  <YAxis stroke="#64748b" tickFormatter={(v) => `€${(v/1000).toFixed(0)}k`} />
                  <Tooltip 
                    formatter={(value) => [`€${value.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}`, '']}
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="faturado" name="Faturado" stroke="#3b82f6" strokeWidth={3} dot={{ r: 6 }} />
                  <Line type="monotone" dataKey="recebido" name="Recebido" stroke="#10b981" strokeWidth={3} dot={{ r: 6 }} />
                </LineChart>
              )}
              {activeChart === "comparison" && (
                <AreaChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" stroke="#64748b" />
                  <YAxis stroke="#64748b" tickFormatter={(v) => `€${(v/1000).toFixed(0)}k`} />
                  <Tooltip 
                    formatter={(value) => [`€${value.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}`, '']}
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="faturado" name="Faturado" fill="#3b82f6" fillOpacity={0.3} stroke="#3b82f6" strokeWidth={2} />
                  <Area type="monotone" dataKey="recebido" name="Recebido" fill="#10b981" fillOpacity={0.3} stroke="#10b981" strokeWidth={2} />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* By Type Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Por Tipo de Fatura</CardTitle>
          </CardHeader>
          <CardContent>
            {byType.length === 0 ? (
              <p className="text-center text-slate-500 py-8">Sem dados</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={byType}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {byType.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`€${value.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}`, 'Valor']} />
                </PieChart>
              </ResponsiveContainer>
            )}
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
                  <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer" onClick={() => setClientFilter(client.email || client.name)}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center font-semibold text-white" style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}>
                        {idx + 1}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{client.name}</p>
                        <p className="text-xs text-slate-500">{client.count} faturas</p>
                      </div>
                    </div>
                    <p className="font-bold text-slate-900">€{client.total.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* By Service */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Por Serviço</CardTitle>
          </CardHeader>
          <CardContent>
            {topServices.length === 0 ? (
              <p className="text-center text-slate-500 py-8">Sem dados de serviços</p>
            ) : (
              <div className="space-y-3">
                {topServices.map((service, idx) => {
                  const maxValue = topServices[0]?.value || 1;
                  const percentage = (service.value / maxValue) * 100;
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm truncate flex-1" title={service.name}>{service.name}</p>
                        <p className="font-bold text-slate-900 ml-2">€{service.value.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</p>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-500" 
                          style={{ width: `${percentage}%`, backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                        />
                      </div>
                      <p className="text-xs text-slate-500">{service.count} faturas</p>
                    </div>
                  );
                })}
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
                const count = filteredInvoices.filter(i => i.status === key).length;
                const value = filteredInvoices.filter(i => i.status === key).reduce((sum, i) => sum + (i.total_amount || 0), 0);
                if (count === 0) return null;
                
                const Icon = config.icon;
                const percentage = totalFaturado > 0 ? (value / totalFaturado) * 100 : 0;
                return (
                  <div key={key} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge className={config.color}>
                          <Icon className="w-3 h-3 mr-1" />
                          {config.label}
                        </Badge>
                        <span className="text-sm text-slate-500">({count})</span>
                      </div>
                      <span className="font-medium">€{value.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${key === 'paid' ? 'bg-green-500' : key === 'overdue' ? 'bg-red-500' : 'bg-amber-400'}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
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