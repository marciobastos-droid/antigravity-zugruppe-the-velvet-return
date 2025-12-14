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
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  DollarSign, Plus, Search, Filter, Download, Building2, User, 
  Calendar, CheckCircle2, Clock, AlertCircle, TrendingUp, Pencil, Trash2,
  Receipt, PieChart, FileBarChart, Percent, Target, Upload, FileText, X, ExternalLink
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import CommissionConfigEditor from "../team/CommissionConfigEditor";
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import CommissionsReports from "./CommissionsReports";

const STATUS_CONFIG = {
  pending: { label: "Pendente", color: "bg-yellow-100 text-yellow-800", icon: Clock },
  partial: { label: "Parcial", color: "bg-blue-100 text-blue-800", icon: AlertCircle },
  paid: { label: "Pago", color: "bg-green-100 text-green-800", icon: CheckCircle2 },
  cancelled: { label: "Cancelado", color: "bg-red-100 text-red-800", icon: AlertCircle }
};

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function CommissionsManager() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("list");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCommission, setEditingCommission] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [agentFilter, setAgentFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });

  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  const [formData, setFormData] = useState({
    opportunity_id: "",
    property_title: "",
    deal_type: "sale",
    deal_value: "",
    commission_percentage: "5",
    commission_value: "",
    agent_email: "",
    agent_name: "",
    agent_split: "50",
    partner_name: "",
    partner_split: "",
    client_name: "",
    client_email: "",
    close_date: format(new Date(), 'yyyy-MM-dd'),
    payment_status: "pending",
    invoice_number: "",
    notes: "",
    attachments: []
  });

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: commissions = [] } = useQuery({
    queryKey: ['commissions'],
    queryFn: () => base44.entities.Commission.list('-close_date'),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: opportunities = [] } = useQuery({
    queryKey: ['opportunities'],
    queryFn: () => base44.entities.Opportunity.filter({ status: 'won' }),
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ['clientContacts'],
    queryFn: () => base44.entities.ClientContact.list('full_name'),
  });

  const agents = users.filter(u => u.is_active !== false);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Commission.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commissions'] });
      toast.success("Comissão registada");
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Commission.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commissions'] });
      toast.success("Comissão atualizada");
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Commission.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commissions'] });
      toast.success("Comissão eliminada");
    },
  });

  const resetForm = () => {
    setDialogOpen(false);
    setEditingCommission(null);
    setFormData({
      opportunity_id: "",
      property_title: "",
      deal_type: "sale",
      deal_value: "",
      commission_percentage: "5",
      commission_value: "",
      agent_email: "",
      agent_name: "",
      agent_split: "50",
      partner_name: "",
      partner_split: "",
      client_name: "",
      client_email: "",
      close_date: format(new Date(), 'yyyy-MM-dd'),
      payment_status: "pending",
      invoice_number: "",
      notes: "",
      attachments: []
    });
  };

  const handleEdit = (commission) => {
    setEditingCommission(commission);
    setFormData({
      opportunity_id: commission.opportunity_id || "",
      property_title: commission.property_title || "",
      deal_type: commission.deal_type || "sale",
      deal_value: commission.deal_value?.toString() || "",
      commission_percentage: commission.commission_percentage?.toString() || "5",
      commission_value: commission.commission_value?.toString() || "",
      agent_email: commission.agent_email || "",
      agent_name: commission.agent_name || "",
      agent_split: commission.agent_split?.toString() || "50",
      partner_name: commission.partner_name || "",
      partner_split: commission.partner_split?.toString() || "",
      client_name: commission.client_name || "",
      client_email: commission.client_email || "",
      close_date: commission.close_date || format(new Date(), 'yyyy-MM-dd'),
      payment_status: commission.payment_status || "pending",
      invoice_number: commission.invoice_number || "",
      notes: commission.notes || "",
      attachments: commission.attachments || []
    });
    setDialogOpen(true);
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploadingFile(true);
    try {
      const uploadedFiles = [];
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        uploadedFiles.push({
          name: file.name,
          url: file_url
        });
      }
      
      setFormData({
        ...formData,
        attachments: [...(formData.attachments || []), ...uploadedFiles]
      });
      
      toast.success(`${files.length} ficheiro(s) anexado(s)`);
    } catch (error) {
      toast.error("Erro ao fazer upload");
    }
    setUploadingFile(false);
    e.target.value = "";
  };

  const handleRemoveAttachment = (index) => {
    const newAttachments = formData.attachments.filter((_, i) => i !== index);
    setFormData({ ...formData, attachments: newAttachments });
  };

  const calculateCommission = (dealValue, percentage) => {
    return (parseFloat(dealValue) * parseFloat(percentage) / 100) || 0;
  };

  const handleDealValueChange = (value) => {
    const commValue = calculateCommission(value, formData.commission_percentage);
    setFormData({
      ...formData,
      deal_value: value,
      commission_value: commValue.toFixed(2)
    });
  };

  const handlePercentageChange = (value) => {
    const commValue = calculateCommission(formData.deal_value, value);
    setFormData({
      ...formData,
      commission_percentage: value,
      commission_value: commValue.toFixed(2)
    });
  };

  const handleAgentSelect = (email) => {
    const agent = agents.find(a => a.email === email);
    setFormData({
      ...formData,
      agent_email: email,
      agent_name: agent?.display_name || agent?.full_name || ""
    });
  };

  const handleSubmit = () => {
    const agentCommission = (parseFloat(formData.commission_value) * parseFloat(formData.agent_split) / 100) || 0;
    const partnerCommission = formData.partner_split 
      ? (parseFloat(formData.commission_value) * parseFloat(formData.partner_split) / 100) 
      : 0;

    const data = {
      ...formData,
      deal_value: parseFloat(formData.deal_value) || 0,
      commission_percentage: parseFloat(formData.commission_percentage) || 0,
      commission_value: parseFloat(formData.commission_value) || 0,
      agent_split: parseFloat(formData.agent_split) || 0,
      agent_commission: agentCommission,
      partner_split: parseFloat(formData.partner_split) || 0,
      partner_commission: partnerCommission
    };

    if (editingCommission) {
      updateMutation.mutate({ id: editingCommission.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  // Filters
  const filteredCommissions = commissions.filter(c => {
    const matchesStatus = statusFilter === "all" || c.payment_status === statusFilter;
    const matchesAgent = agentFilter === "all" || c.agent_email === agentFilter;
    const matchesSearch = !searchTerm || 
      c.property_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.agent_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDateStart = !dateRange.start || new Date(c.close_date) >= new Date(dateRange.start);
    const matchesDateEnd = !dateRange.end || new Date(c.close_date) <= new Date(dateRange.end);
    return matchesStatus && matchesAgent && matchesSearch && matchesDateStart && matchesDateEnd;
  });

  // Metrics
  const totalDealValue = filteredCommissions.reduce((sum, c) => sum + (c.deal_value || 0), 0);
  const totalCommissions = filteredCommissions.reduce((sum, c) => sum + (c.commission_value || 0), 0);
  const paidCommissions = filteredCommissions.filter(c => c.payment_status === 'paid').reduce((sum, c) => sum + (c.commission_value || 0), 0);
  const pendingCommissions = filteredCommissions.filter(c => c.payment_status === 'pending').reduce((sum, c) => sum + (c.commission_value || 0), 0);

  // Charts data
  const statusData = [
    { name: 'Pendente', value: filteredCommissions.filter(c => c.payment_status === 'pending').length },
    { name: 'Pago', value: filteredCommissions.filter(c => c.payment_status === 'paid').length },
    { name: 'Parcial', value: filteredCommissions.filter(c => c.payment_status === 'partial').length },
  ].filter(d => d.value > 0);

  const agentData = agents.map(agent => ({
    name: (agent.display_name || agent.full_name || agent.email).split(' ')[0],
    comissoes: filteredCommissions.filter(c => c.agent_email === agent.email).reduce((sum, c) => sum + (c.agent_commission || 0), 0)
  })).filter(d => d.comissoes > 0).sort((a, b) => b.comissoes - a.comissoes).slice(0, 6);

  const exportCSV = () => {
    const headers = ['Imóvel', 'Cliente', 'Agente', 'Valor Negócio', 'Comissão', 'Comissão Agente', 'Data', 'Estado'];
    const rows = filteredCommissions.map(c => [
      c.property_title,
      c.client_name,
      c.agent_name,
      c.deal_value,
      c.commission_value,
      c.agent_commission,
      c.close_date,
      STATUS_CONFIG[c.payment_status]?.label || c.payment_status
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comissoes_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <DollarSign className="w-7 h-7 text-green-600" />
            Gestão de Comissões
          </h2>
          <p className="text-slate-600">Registo e acompanhamento de comissões</p>
        </div>
        <div className="flex gap-2">
          {activeTab === "list" && (
            <>
              <Button 
                variant="outline" 
                onClick={() => setConfigDialogOpen(true)}
                className="border-blue-300 text-blue-700"
              >
                <Percent className="w-4 h-4 mr-2" />
                Configurar Splits
              </Button>
              <Button variant="outline" onClick={exportCSV}>
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </Button>
              <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetForm(); else setDialogOpen(true); }}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Nova Comissão
                  </Button>
                </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingCommission ? 'Editar Comissão' : 'Registar Nova Comissão'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>Oportunidade Fechada (opcional)</Label>
                    <Select 
                      value={formData.opportunity_id} 
                      onValueChange={(oppId) => {
                        const opp = opportunities.find(o => o.id === oppId);
                        if (opp) {
                          setFormData({
                            ...formData,
                            opportunity_id: oppId,
                            property_title: opp.property_title || formData.property_title,
                            client_name: opp.buyer_name || formData.client_name,
                            client_email: opp.buyer_email || formData.client_email,
                            agent_email: opp.assigned_to || formData.agent_email,
                            agent_name: opp.assigned_agent_name || formData.agent_name,
                            deal_value: opp.estimated_value?.toString() || formData.deal_value
                          });
                        } else {
                          setFormData({...formData, opportunity_id: ""});
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar oportunidade..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={null}>Nenhuma (manual)</SelectItem>
                        {opportunities.map(opp => (
                          <SelectItem key={opp.id} value={opp.id}>
                            {opp.buyer_name} - {opp.property_title || 'Sem título'} 
                            {opp.estimated_value ? ` (€${opp.estimated_value.toLocaleString()})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Label>Imóvel</Label>
                    <Input
                      value={formData.property_title}
                      onChange={(e) => setFormData({...formData, property_title: e.target.value})}
                      placeholder="Título do imóvel"
                    />
                  </div>
                  <div>
                    <Label>Tipo de Negócio</Label>
                    <Select value={formData.deal_type} onValueChange={(v) => setFormData({...formData, deal_type: v})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sale">Venda</SelectItem>
                        <SelectItem value="rent">Arrendamento</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Data de Fecho</Label>
                    <Input
                      type="date"
                      value={formData.close_date}
                      onChange={(e) => setFormData({...formData, close_date: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Valor do Negócio (€)</Label>
                    <Input
                      type="number"
                      value={formData.deal_value}
                      onChange={(e) => handleDealValueChange(e.target.value)}
                      placeholder="250000"
                    />
                  </div>
                  <div>
                    <Label>Comissão (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.commission_percentage}
                      onChange={(e) => handlePercentageChange(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Valor Comissão (€)</Label>
                    <Input
                      type="number"
                      value={formData.commission_value}
                      onChange={(e) => setFormData({...formData, commission_value: e.target.value})}
                      className="bg-green-50"
                    />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Agente & Splits</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Agente</Label>
                      <Select value={formData.agent_email} onValueChange={handleAgentSelect}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecionar agente" />
                        </SelectTrigger>
                        <SelectContent>
                          {agents.map(agent => (
                            <SelectItem key={agent.email} value={agent.email}>
                              {agent.display_name || agent.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Split Agente (%)</Label>
                      <Input
                        type="number"
                        value={formData.agent_split}
                        onChange={(e) => setFormData({...formData, agent_split: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label>Parceiro (opcional)</Label>
                      <Input
                        value={formData.partner_name}
                        onChange={(e) => setFormData({...formData, partner_name: e.target.value})}
                        placeholder="Nome do parceiro"
                      />
                    </div>
                    <div>
                      <Label>Split Parceiro (%)</Label>
                      <Input
                        type="number"
                        value={formData.partner_split}
                        onChange={(e) => setFormData({...formData, partner_split: e.target.value})}
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Proprietário/Promotor</h4>
                  <div className="space-y-4">
                    <div>
                      <Label>Selecionar Contacto (opcional)</Label>
                      <Select 
                        value="" 
                        onValueChange={(contactId) => {
                          const contact = contacts.find(c => c.id === contactId);
                          if (contact) {
                            setFormData({
                              ...formData,
                              client_name: contact.full_name || '',
                              client_email: contact.email || ''
                            });
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Escolher da lista de contactos..." />
                        </SelectTrigger>
                        <SelectContent>
                          {contacts.filter(c => 
                            c.contact_type === 'owner' || 
                            c.contact_type === 'promoter' || 
                            c.contact_type === 'client' ||
                            c.contact_type === 'partner'
                          ).map(contact => (
                            <SelectItem key={contact.id} value={contact.id}>
                              {contact.full_name}
                              {contact.company_name && ` (${contact.company_name})`}
                              {contact.email && ` - ${contact.email}`}
                            </SelectItem>
                          ))}
                          {contacts.length === 0 && (
                            <SelectItem value="none" disabled>Sem contactos</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Nome do Proprietário/Promotor</Label>
                        <Input
                          value={formData.client_name}
                          onChange={(e) => setFormData({...formData, client_name: e.target.value})}
                          placeholder="Nome do proprietário ou promotor"
                        />
                      </div>
                      <div>
                        <Label>Email do Proprietário/Promotor</Label>
                        <Input
                          type="email"
                          value={formData.client_email}
                          onChange={(e) => setFormData({...formData, client_email: e.target.value})}
                          placeholder="email@exemplo.com"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Estado do Pagamento</Label>
                    <Select value={formData.payment_status} onValueChange={(v) => setFormData({...formData, payment_status: v})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pendente</SelectItem>
                        <SelectItem value="partial">Parcial</SelectItem>
                        <SelectItem value="paid">Pago</SelectItem>
                        <SelectItem value="cancelled">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Nº Fatura</Label>
                    <Input
                      value={formData.invoice_number}
                      onChange={(e) => setFormData({...formData, invoice_number: e.target.value})}
                      placeholder="FT 2024/001"
                    />
                  </div>
                </div>

                <div>
                  <Label>Notas</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    placeholder="Observações adicionais..."
                    rows={2}
                  />
                </div>

                {/* Attachments Section */}
                <div className="border-t pt-4">
                  <Label className="flex items-center gap-2 mb-3">
                    <FileText className="w-4 h-4 text-blue-600" />
                    Documentos Anexados
                  </Label>
                  
                  <div className="space-y-3">
                    {/* Upload Button */}
                    <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center hover:border-blue-400 transition-colors">
                      <input
                        type="file"
                        multiple
                        onChange={handleFileUpload}
                        className="hidden"
                        id="commission-file-upload"
                        disabled={uploadingFile}
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                      />
                      <label htmlFor="commission-file-upload" className="cursor-pointer">
                        {uploadingFile ? (
                          <div className="flex items-center justify-center gap-2 text-blue-600">
                            <Clock className="w-5 h-5 animate-spin" />
                            <span className="text-sm">A carregar...</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2 text-slate-600 hover:text-blue-600">
                            <Upload className="w-5 h-5" />
                            <span className="text-sm font-medium">
                              Clique para anexar ficheiros
                            </span>
                          </div>
                        )}
                        <p className="text-xs text-slate-500 mt-1">
                          PDF, Word, Excel, Imagens
                        </p>
                      </label>
                    </div>

                    {/* Attached Files List */}
                    {formData.attachments && formData.attachments.length > 0 && (
                      <div className="space-y-2">
                        {formData.attachments.map((attachment, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg group hover:bg-slate-100"
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
                              <span className="text-sm text-slate-900 truncate">
                                {attachment.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(attachment.url, '_blank')}
                                className="h-8"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveAttachment(index)}
                                className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <Button variant="outline" onClick={resetForm}>Cancelar</Button>
                  <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                    {editingCommission ? 'Guardar' : 'Registar'}
                  </Button>
                </div>
              </div>
            </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="list" className="flex items-center gap-2">
            <Receipt className="w-4 h-4" />
            Comissões
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <FileBarChart className="w-4 h-4" />
            Relatórios
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-6 mt-6">

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Volume Negócios</p>
                <p className="text-2xl font-bold">€{totalDealValue.toLocaleString()}</p>
              </div>
              <Building2 className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Comissões</p>
                <p className="text-2xl font-bold text-green-600">€{totalCommissions.toLocaleString()}</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Pagas</p>
                <p className="text-2xl font-bold text-emerald-600">€{paidCommissions.toLocaleString()}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Pendentes</p>
                <p className="text-2xl font-bold text-amber-600">€{pendingCommissions.toLocaleString()}</p>
              </div>
              <Clock className="w-8 h-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      {commissions.length > 0 && (
        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Estado das Comissões</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <RechartsPie>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {statusData.map((_, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPie>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Comissões por Agente</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={agentData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => `€${value.toLocaleString()}`} />
                  <Bar dataKey="comissoes" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
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
                <SelectItem value="paid">Pago</SelectItem>
                <SelectItem value="partial">Parcial</SelectItem>
              </SelectContent>
            </Select>
            <Select value={agentFilter} onValueChange={setAgentFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Agente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Agentes</SelectItem>
                {agents.map(agent => (
                  <SelectItem key={agent.email} value={agent.email}>
                    {(agent.display_name || agent.full_name || agent.email).split(' ')[0]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
              className="w-36"
              placeholder="De"
            />
            <Input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
              className="w-36"
              placeholder="Até"
            />
          </div>
        </CardContent>
      </Card>

      {/* Commissions List */}
      <div className="space-y-3">
        {filteredCommissions.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600">Sem comissões registadas</p>
            </CardContent>
          </Card>
        ) : (
          filteredCommissions.map((commission) => {
            const status = STATUS_CONFIG[commission.payment_status] || STATUS_CONFIG.pending;
            const StatusIcon = status.icon;
            
            return (
              <Card key={commission.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <DollarSign className="w-6 h-6 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-slate-900 truncate">
                          {commission.property_title || 'Sem título'}
                        </h3>
                        {commission.opportunity_id && (
                          <Badge variant="outline" className="text-xs">
                            <Target className="w-3 h-3 mr-1" />
                            Oportunidade
                          </Badge>
                        )}
                        <Badge className={status.color}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {status.label}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
                        {commission.client_name && (
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {commission.client_name}
                          </span>
                        )}
                        {commission.agent_name && (
                          <span>Agente: {commission.agent_name}</span>
                        )}
                        {commission.close_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(commission.close_date), 'dd/MM/yyyy')}
                          </span>
                        )}
                      </div>
                    </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <p className="text-sm text-slate-500">
                        Negócio: €{commission.deal_value?.toLocaleString()}
                      </p>
                      <p className="text-lg font-bold text-green-600">
                        €{commission.commission_value?.toLocaleString()}
                      </p>
                      {commission.agent_commission > 0 && (
                        <p className="text-xs text-slate-500">
                          Agente: €{commission.agent_commission?.toLocaleString()}
                        </p>
                      )}
                      {commission.attachments && commission.attachments.length > 0 && (
                        <div className="flex items-center gap-1 mt-1">
                          <FileText className="w-3 h-3 text-blue-600" />
                          <span className="text-xs text-blue-700">
                            {commission.attachments.length} documento(s)
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(commission)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-red-600"
                        onClick={() => {
                          if (confirm('Eliminar comissão?')) deleteMutation.mutate(commission.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Show attachments in expanded view */}
                  {commission.attachments && commission.attachments.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-200">
                      <p className="text-xs font-medium text-slate-600 mb-2">Documentos:</p>
                      <div className="flex flex-wrap gap-2">
                        {commission.attachments.map((attachment, idx) => (
                          <a
                            key={idx}
                            href={attachment.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 px-2 py-1 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700 hover:bg-blue-100 transition-colors"
                          >
                            <FileText className="w-3 h-3" />
                            <span className="max-w-[120px] truncate">{attachment.name}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

        </TabsContent>

        <TabsContent value="reports" className="mt-6">
          <CommissionsReports />
        </TabsContent>
      </Tabs>

      {/* Commission Config Dialog */}
      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent className="max-w-2xl">
          <CommissionConfigEditor 
            user={user} 
            onSave={() => setConfigDialogOpen(false)} 
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}