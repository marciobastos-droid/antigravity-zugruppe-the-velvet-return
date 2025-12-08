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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Users, Plus, Search, Edit, Trash2, Building2, User, 
  Mail, Phone, MapPin, FileText, Euro, ChevronRight,
  StickyNote, CheckCircle2, Clock, AlertCircle, Download, UserPlus
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const clientTypeConfig = {
  agent: { label: "Agente", icon: User, color: "bg-blue-100 text-blue-700" },
  agency: { label: "Agência", icon: Building2, color: "bg-purple-100 text-purple-700" },
  company: { label: "Empresa", icon: Building2, color: "bg-slate-100 text-slate-700" },
  individual: { label: "Particular", icon: User, color: "bg-green-100 text-green-700" }
};

const statusConfig = {
  draft: { label: "Rascunho", color: "bg-slate-100 text-slate-700" },
  pending: { label: "Pendente", color: "bg-amber-100 text-amber-700" },
  sent: { label: "Enviada", color: "bg-blue-100 text-blue-700" },
  paid: { label: "Paga", color: "bg-green-100 text-green-700" },
  overdue: { label: "Vencida", color: "bg-red-100 text-red-700" },
  cancelled: { label: "Cancelada", color: "bg-slate-100 text-slate-500" }
};

export default function InvoiceClientsManager() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    nif: "",
    address: "",
    client_type: "agent",
    business_category: "",
    notes: "",
    payment_terms: 30,
    default_vat_rate: 23,
    is_active: true
  });

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['invoiceClients'],
    queryFn: () => base44.entities.InvoiceClient.list('-created_date')
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => base44.entities.Invoice.list('-created_date')
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.InvoiceClient.create(data),
    onSuccess: () => {
      toast.success("Cliente criado com sucesso");
      queryClient.invalidateQueries({ queryKey: ['invoiceClients'] });
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.InvoiceClient.update(id, data),
    onSuccess: () => {
      toast.success("Cliente atualizado");
      queryClient.invalidateQueries({ queryKey: ['invoiceClients'] });
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.InvoiceClient.delete(id),
    onSuccess: () => {
      toast.success("Cliente eliminado");
      queryClient.invalidateQueries({ queryKey: ['invoiceClients'] });
      setSelectedClient(null);
    }
  });

  // Get unique clients from invoices that are not yet in InvoiceClient
  const getInvoiceClientsNotRegistered = () => {
    const existingEmails = new Set(clients.map(c => c.email?.toLowerCase()).filter(Boolean));
    const existingNames = new Set(clients.map(c => c.name?.toLowerCase()).filter(Boolean));
    
    const uniqueInvoiceClients = new Map();
    
    invoices.forEach(inv => {
      if (!inv.recipient_name) return;
      
      const key = inv.recipient_email?.toLowerCase() || inv.recipient_name?.toLowerCase();
      const alreadyExists = existingEmails.has(inv.recipient_email?.toLowerCase()) || 
                           existingNames.has(inv.recipient_name?.toLowerCase());
      
      if (!alreadyExists && !uniqueInvoiceClients.has(key)) {
        uniqueInvoiceClients.set(key, {
          name: inv.recipient_name,
          email: inv.recipient_email || "",
          nif: inv.recipient_nif || "",
          address: inv.recipient_address || "",
          client_type: inv.invoice_type === 'agency' ? 'agency' : 'agent'
        });
      }
    });
    
    return Array.from(uniqueInvoiceClients.values());
  };

  const importFromInvoicesMutation = useMutation({
    mutationFn: async (clientsToImport) => {
      const results = [];
      for (const client of clientsToImport) {
        results.push(await base44.entities.InvoiceClient.create({
          ...client,
          payment_terms: 30,
          default_vat_rate: 23,
          is_active: true
        }));
      }
      return results;
    },
    onSuccess: (data) => {
      toast.success(`${data.length} clientes importados das faturas`);
      queryClient.invalidateQueries({ queryKey: ['invoiceClients'] });
    }
  });

  const invoiceClientsToImport = getInvoiceClientsNotRegistered();

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      nif: "",
      address: "",
      client_type: "agent",
      business_category: "",
      notes: "",
      payment_terms: 30,
      default_vat_rate: 23,
      is_active: true
    });
    setEditingClient(null);
    setDialogOpen(false);
  };

  const handleEdit = (client) => {
    setEditingClient(client);
    setFormData({
      name: client.name || "",
      email: client.email || "",
      phone: client.phone || "",
      nif: client.nif || "",
      address: client.address || "",
      client_type: client.client_type || "agent",
      business_category: client.business_category || "",
      notes: client.notes || "",
      payment_terms: client.payment_terms || 30,
      default_vat_rate: client.default_vat_rate || 23,
      is_active: client.is_active !== false
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingClient) {
      updateMutation.mutate({ id: editingClient.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  // Get client invoices
  const getClientInvoices = (client) => {
    const clientEmail = client.email?.toLowerCase().trim();
    const clientName = client.name?.toLowerCase().trim();
    
    return invoices.filter(inv => {
      const invEmail = inv.recipient_email?.toLowerCase().trim();
      const invName = inv.recipient_name?.toLowerCase().trim();
      
      // Match by email (if both exist)
      if (clientEmail && invEmail && clientEmail === invEmail) return true;
      
      // Match by name (if both exist)
      if (clientName && invName && clientName === invName) return true;
      
      return false;
    });
  };

  // Get client stats
  const getClientStats = (client) => {
    const clientInvoices = getClientInvoices(client);
    const totalInvoiced = clientInvoices.reduce((sum, i) => sum + (i.total_amount || 0), 0);
    const totalPaid = clientInvoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + (i.total_amount || 0), 0);
    const totalPending = clientInvoices.filter(i => ['pending', 'sent'].includes(i.status)).reduce((sum, i) => sum + (i.total_amount || 0), 0);
    return { totalInvoiced, totalPaid, totalPending, count: clientInvoices.length };
  };

  // Filter clients
  const filteredClients = clients.filter(client => {
    const matchesSearch = !searchTerm || 
      client.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.nif?.includes(searchTerm);
    const matchesType = typeFilter === "all" || client.client_type === typeFilter;
    const matchesCategory = categoryFilter === "all" || client.business_category === categoryFilter;
    return matchesSearch && matchesType && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-7 h-7 text-blue-600" />
            Gestão de Clientes
          </h2>
          <p className="text-slate-600">Gerir clientes, agentes e agências para faturação</p>
        </div>
        <div className="flex gap-2">
          {invoiceClientsToImport.length > 0 && (
            <Button 
              variant="outline" 
              onClick={() => importFromInvoicesMutation.mutate(invoiceClientsToImport)}
              disabled={importFromInvoicesMutation.isPending}
              className="border-green-300 text-green-700 hover:bg-green-50"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              {importFromInvoicesMutation.isPending ? "A importar..." : `Importar ${invoiceClientsToImport.length} das Faturas`}
            </Button>
          )}
          <Button onClick={() => setDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Novo Cliente
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid md:grid-cols-4 gap-3">
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Pesquisar por nome, email ou NIF..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Tipos</SelectItem>
                <SelectItem value="agent">Agente</SelectItem>
                <SelectItem value="agency">Agência</SelectItem>
                <SelectItem value="company">Empresa</SelectItem>
                <SelectItem value="individual">Particular</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Categorias</SelectItem>
                <SelectItem value="mediacao">Mediação</SelectItem>
                <SelectItem value="arrendamento">Arrendamento</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Clients List */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Clientes ({filteredClients.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[600px]">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                </div>
              ) : filteredClients.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>Nenhum cliente encontrado</p>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredClients.map((client) => {
                    const typeConf = clientTypeConfig[client.client_type] || clientTypeConfig.agent;
                    const TypeIcon = typeConf.icon;
                    const stats = getClientStats(client);
                    const isSelected = selectedClient?.id === client.id;

                    return (
                      <button
                        key={client.id}
                        onClick={() => setSelectedClient(client)}
                        className={`w-full p-4 text-left hover:bg-slate-50 transition-colors ${
                          isSelected ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-3 min-w-0">
                            <div className={`p-2 rounded-lg ${typeConf.color}`}>
                              <TypeIcon className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-slate-900 truncate">{client.name}</p>
                              <p className="text-xs text-slate-500 truncate">{client.email}</p>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                               <Badge variant="outline" className="text-xs">
                                 {stats.count} faturas
                               </Badge>
                               {client.business_category && (
                                 <Badge className={client.business_category === 'mediacao' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'} variant="outline">
                                   {client.business_category === 'mediacao' ? 'Mediação' : 'Arrendamento'}
                                 </Badge>
                               )}
                               {stats.totalPending > 0 && (
                                 <Badge className="bg-amber-100 text-amber-700 text-xs">
                                   €{stats.totalPending.toFixed(0)} pendente
                                 </Badge>
                               )}
                              </div>
                            </div>
                          </div>
                          <ChevronRight className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform ${isSelected ? 'rotate-90' : ''}`} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Client Details */}
        <Card className="lg:col-span-2">
          {!selectedClient ? (
            <div className="flex items-center justify-center h-[600px] text-slate-500">
              <div className="text-center">
                <User className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p>Selecione um cliente para ver detalhes</p>
              </div>
            </div>
          ) : (
            <>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-lg ${clientTypeConfig[selectedClient.client_type]?.color || 'bg-slate-100'}`}>
                      {React.createElement(clientTypeConfig[selectedClient.client_type]?.icon || User, { className: "w-6 h-6" })}
                    </div>
                    <div>
                      <CardTitle className="text-xl">{selectedClient.name}</CardTitle>
                      <div className="flex gap-2 mt-1">
                        <Badge className={clientTypeConfig[selectedClient.client_type]?.color}>
                          {clientTypeConfig[selectedClient.client_type]?.label}
                        </Badge>
                        {selectedClient.business_category && (
                          <Badge className={selectedClient.business_category === 'mediacao' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}>
                            {selectedClient.business_category === 'mediacao' ? 'Mediação' : 'Arrendamento'}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(selectedClient)}>
                      <Edit className="w-4 h-4 mr-1" />
                      Editar
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-red-600 hover:bg-red-50"
                      onClick={() => {
                        if (confirm('Eliminar este cliente?')) {
                          deleteMutation.mutate(selectedClient.id);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[520px] pr-4">
                  <div className="space-y-6">
                    {/* Contact Info */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                        <Mail className="w-5 h-5 text-slate-400" />
                        <div>
                          <p className="text-xs text-slate-500">Email</p>
                          <p className="font-medium">{selectedClient.email || '-'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                        <Phone className="w-5 h-5 text-slate-400" />
                        <div>
                          <p className="text-xs text-slate-500">Telefone</p>
                          <p className="font-medium">{selectedClient.phone || '-'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                        <FileText className="w-5 h-5 text-slate-400" />
                        <div>
                          <p className="text-xs text-slate-500">NIF</p>
                          <p className="font-medium">{selectedClient.nif || '-'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                        <MapPin className="w-5 h-5 text-slate-400" />
                        <div>
                          <p className="text-xs text-slate-500">Morada</p>
                          <p className="font-medium text-sm">{selectedClient.address || '-'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Stats */}
                    {(() => {
                      const stats = getClientStats(selectedClient);
                      return (
                        <div className="grid grid-cols-3 gap-4">
                          <div className="p-4 bg-blue-50 rounded-lg text-center">
                            <p className="text-2xl font-bold text-blue-700">€{stats.totalInvoiced.toFixed(0)}</p>
                            <p className="text-xs text-blue-600">Total Faturado</p>
                          </div>
                          <div className="p-4 bg-green-50 rounded-lg text-center">
                            <p className="text-2xl font-bold text-green-700">€{stats.totalPaid.toFixed(0)}</p>
                            <p className="text-xs text-green-600">Total Pago</p>
                          </div>
                          <div className="p-4 bg-amber-50 rounded-lg text-center">
                            <p className="text-2xl font-bold text-amber-700">€{stats.totalPending.toFixed(0)}</p>
                            <p className="text-xs text-amber-600">Pendente</p>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Notes */}
                    {selectedClient.notes && (
                      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <StickyNote className="w-4 h-4 text-yellow-600" />
                          <span className="font-medium text-yellow-800">Notas</span>
                        </div>
                        <p className="text-sm text-yellow-900 whitespace-pre-wrap">{selectedClient.notes}</p>
                      </div>
                    )}

                    {/* Invoice History */}
                    <div>
                      <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        Histórico de Faturas
                      </h4>
                      {(() => {
                        const clientInvoices = getClientInvoices(selectedClient);
                        if (clientInvoices.length === 0) {
                          return (
                            <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-lg">
                              <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
                              <p>Nenhuma fatura emitida</p>
                            </div>
                          );
                        }
                        return (
                          <div className="space-y-2">
                            {clientInvoices.map(invoice => {
                              const status = statusConfig[invoice.status] || statusConfig.draft;
                              return (
                                <div key={invoice.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                                  <div className="flex items-center gap-3">
                                    <div className="text-center">
                                      <p className="text-xs text-slate-500">
                                        {invoice.issue_date ? format(new Date(invoice.issue_date), 'MMM', { locale: ptBR }) : '-'}
                                      </p>
                                      <p className="font-bold text-lg text-slate-700">
                                        {invoice.issue_date ? format(new Date(invoice.issue_date), 'd') : '-'}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="font-medium text-slate-900">{invoice.invoice_number}</p>
                                      <Badge className={`${status.color} text-xs`}>{status.label}</Badge>
                                    </div>
                                  </div>
                                  <p className="font-bold text-slate-900">€{invoice.total_amount?.toFixed(2) || '0.00'}</p>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Settings */}
                    <div className="p-4 bg-slate-50 rounded-lg">
                      <h4 className="font-medium text-slate-900 mb-3">Configurações de Faturação</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-slate-500">Prazo de Pagamento</p>
                          <p className="font-medium">{selectedClient.payment_terms || 30} dias</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Taxa IVA</p>
                          <p className="font-medium">{selectedClient.default_vat_rate || 23}%</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </CardContent>
            </>
          )}
        </Card>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setDialogOpen(open); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingClient ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Nome *</Label>
                <Input
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Nome completo ou empresa"
                />
              </div>
              <div>
                <Label>Email *</Label>
                <Input
                  required
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="email@exemplo.com"
                />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  placeholder="+351 900 000 000"
                />
              </div>
              <div>
                <Label>NIF</Label>
                <Input
                  value={formData.nif}
                  onChange={(e) => setFormData({...formData, nif: e.target.value})}
                  placeholder="123456789"
                />
              </div>
              <div>
                <Label>Tipo de Cliente</Label>
                <Select value={formData.client_type} onValueChange={(v) => setFormData({...formData, client_type: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="agent">Agente</SelectItem>
                    <SelectItem value="agency">Agência</SelectItem>
                    <SelectItem value="company">Empresa</SelectItem>
                    <SelectItem value="individual">Particular</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Categoria de Negócio</Label>
                <Select value={formData.business_category} onValueChange={(v) => setFormData({...formData, business_category: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Nenhuma</SelectItem>
                    <SelectItem value="mediacao">Mediação</SelectItem>
                    <SelectItem value="arrendamento">Arrendamento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>Morada</Label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  placeholder="Morada completa"
                />
              </div>
              <div>
                <Label>Prazo de Pagamento (dias)</Label>
                <Input
                  type="number"
                  value={formData.payment_terms}
                  onChange={(e) => setFormData({...formData, payment_terms: parseInt(e.target.value) || 30})}
                />
              </div>
              <div>
                <Label>Taxa IVA (%)</Label>
                <Input
                  type="number"
                  value={formData.default_vat_rate}
                  onChange={(e) => setFormData({...formData, default_vat_rate: parseInt(e.target.value) || 23})}
                />
              </div>
              <div className="col-span-2">
                <Label>Notas</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Notas sobre o cliente..."
                  rows={3}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="button" variant="outline" onClick={resetForm} className="flex-1">
                Cancelar
              </Button>
              <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700">
                {editingClient ? "Atualizar" : "Criar Cliente"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}