import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Download, FileText, FileSpreadsheet, BarChart3, PieChart, TrendingUp,
  Building2, Users, Target, Calendar, Filter, Loader2, Eye, Printer
} from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import {
  BarChart, Bar, LineChart, Line, PieChart as RechartsPie, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

const entityConfigs = {
  properties: {
    name: "Imóveis",
    icon: Building2,
    fields: [
      { key: "ref_id", label: "Referência" },
      { key: "title", label: "Título" },
      { key: "property_type", label: "Tipo" },
      { key: "listing_type", label: "Negócio" },
      { key: "price", label: "Preço", format: (v) => v ? `€${v.toLocaleString()}` : "" },
      { key: "city", label: "Cidade" },
      { key: "state", label: "Distrito" },
      { key: "bedrooms", label: "Quartos" },
      { key: "bathrooms", label: "WCs" },
      { key: "square_feet", label: "Área (m²)" },
      { key: "status", label: "Estado" },
      { key: "availability_status", label: "Disponibilidade" },
      { key: "assigned_consultant", label: "Consultor" },
      { key: "created_date", label: "Data Criação", format: (v) => v ? format(new Date(v), "dd/MM/yyyy") : "" }
    ],
    defaultFields: ["ref_id", "title", "property_type", "price", "city", "status", "created_date"]
  },
  opportunities: {
    name: "Leads/Oportunidades",
    icon: Target,
    fields: [
      { key: "ref_id", label: "Referência" },
      { key: "buyer_name", label: "Nome" },
      { key: "buyer_email", label: "Email" },
      { key: "buyer_phone", label: "Telefone" },
      { key: "lead_type", label: "Tipo Lead" },
      { key: "status", label: "Estado" },
      { key: "priority", label: "Prioridade" },
      { key: "qualification_status", label: "Qualificação" },
      { key: "budget", label: "Orçamento", format: (v) => v ? `€${v.toLocaleString()}` : "" },
      { key: "lead_source", label: "Origem" },
      { key: "assigned_to", label: "Atribuído a" },
      { key: "created_date", label: "Data Criação", format: (v) => v ? format(new Date(v), "dd/MM/yyyy") : "" }
    ],
    defaultFields: ["buyer_name", "buyer_email", "status", "priority", "lead_source", "created_date"]
  },
  clients: {
    name: "Contactos",
    icon: Users,
    fields: [
      { key: "full_name", label: "Nome" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Telefone" },
      { key: "profile_type", label: "Tipo Perfil" },
      { key: "city", label: "Cidade" },
      { key: "lead_source", label: "Origem" },
      { key: "assigned_agent", label: "Agente" },
      { key: "created_date", label: "Data Criação", format: (v) => v ? format(new Date(v), "dd/MM/yyyy") : "" }
    ],
    defaultFields: ["full_name", "email", "phone", "profile_type", "city", "created_date"]
  }
};

export default function ReportsExporter() {
  const [activeTab, setActiveTab] = useState("export");
  const [selectedEntity, setSelectedEntity] = useState("properties");
  const [selectedFields, setSelectedFields] = useState(entityConfigs.properties.defaultFields);
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedAgent, setSelectedAgent] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [exporting, setExporting] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const reportRef = useRef(null);

  // Fetch data
  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list('-created_date')
  });

  const { data: opportunities = [] } = useQuery({
    queryKey: ['opportunities'],
    queryFn: () => base44.entities.Opportunity.list('-created_date')
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clientContacts'],
    queryFn: () => base44.entities.ClientContact.list('-created_date')
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list()
  });

  const agents = users.filter(u => u.user_type === 'agente' || u.user_type === 'gestor' || u.role === 'admin');

  // Get data based on selected entity
  const getEntityData = () => {
    let data = [];
    switch (selectedEntity) {
      case "properties": data = properties; break;
      case "opportunities": data = opportunities; break;
      case "clients": data = clients; break;
    }
    return data;
  };

  // Apply filters
  const getFilteredData = () => {
    let data = getEntityData();

    // Date filter
    if (dateFrom) {
      data = data.filter(item => new Date(item.created_date) >= new Date(dateFrom));
    }
    if (dateTo) {
      data = data.filter(item => new Date(item.created_date) <= new Date(dateTo + "T23:59:59"));
    }

    // Agent filter
    if (selectedAgent !== "all") {
      data = data.filter(item => {
        const agentField = selectedEntity === "properties" ? "assigned_consultant" :
                          selectedEntity === "opportunities" ? "assigned_to" : "assigned_agent";
        return item[agentField] === selectedAgent;
      });
    }

    // Status filter
    if (selectedStatus !== "all") {
      data = data.filter(item => item.status === selectedStatus);
    }

    return data;
  };

  // Handle entity change
  const handleEntityChange = (entity) => {
    setSelectedEntity(entity);
    setSelectedFields(entityConfigs[entity].defaultFields);
    setSelectedStatus("all");
  };

  // Toggle field selection
  const toggleField = (fieldKey) => {
    setSelectedFields(prev =>
      prev.includes(fieldKey)
        ? prev.filter(f => f !== fieldKey)
        : [...prev, fieldKey]
    );
  };

  // Export to CSV
  const exportToCSV = () => {
    const data = getFilteredData();
    const config = entityConfigs[selectedEntity];
    const fields = config.fields.filter(f => selectedFields.includes(f.key));

    const headers = fields.map(f => f.label).join(",");
    const rows = data.map(item =>
      fields.map(f => {
        let value = item[f.key];
        if (f.format) value = f.format(value);
        // Escape quotes and wrap in quotes if contains comma
        if (typeof value === "string" && (value.includes(",") || value.includes('"'))) {
          value = `"${value.replace(/"/g, '""')}"`;
        }
        return value ?? "";
      }).join(",")
    );

    const csv = [headers, ...rows].join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${config.name}_${format(new Date(), "yyyy-MM-dd_HHmm")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${data.length} registos exportados para CSV`);
  };

  // Generate PDF report
  const exportToPDF = async () => {
    setExporting(true);
    try {
      const data = getFilteredData();
      const config = entityConfigs[selectedEntity];
      const fields = config.fields.filter(f => selectedFields.includes(f.key));

      // Create printable HTML
      const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Relatório ${config.name}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #1e293b; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }
            .meta { color: #64748b; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background: #1e293b; color: white; padding: 10px; text-align: left; }
            td { padding: 8px; border-bottom: 1px solid #e2e8f0; }
            tr:nth-child(even) { background: #f8fafc; }
            .summary { display: flex; gap: 20px; margin: 20px 0; }
            .stat { background: #f1f5f9; padding: 15px; border-radius: 8px; text-align: center; }
            .stat-value { font-size: 24px; font-weight: bold; color: #1e293b; }
            .stat-label { color: #64748b; font-size: 12px; }
            @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
          </style>
        </head>
        <body>
          <h1>Relatório de ${config.name}</h1>
          <div class="meta">
            <p>Período: ${format(new Date(dateFrom), "dd/MM/yyyy")} a ${format(new Date(dateTo), "dd/MM/yyyy")}</p>
            <p>Total de registos: ${data.length}</p>
            <p>Gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm")}</p>
          </div>
          
          <div class="summary">
            ${selectedEntity === "properties" ? `
              <div class="stat"><div class="stat-value">${data.filter(d => d.status === 'active').length}</div><div class="stat-label">Ativos</div></div>
              <div class="stat"><div class="stat-value">${data.filter(d => d.status === 'sold').length}</div><div class="stat-label">Vendidos</div></div>
              <div class="stat"><div class="stat-value">€${(data.reduce((s, d) => s + (d.price || 0), 0) / 1000000).toFixed(1)}M</div><div class="stat-label">Valor Total</div></div>
            ` : selectedEntity === "opportunities" ? `
              <div class="stat"><div class="stat-value">${data.filter(d => d.status === 'new').length}</div><div class="stat-label">Novos</div></div>
              <div class="stat"><div class="stat-value">${data.filter(d => d.status === 'contacted').length}</div><div class="stat-label">Contactados</div></div>
              <div class="stat"><div class="stat-value">${data.filter(d => d.status === 'won').length}</div><div class="stat-label">Ganhos</div></div>
            ` : `
              <div class="stat"><div class="stat-value">${data.length}</div><div class="stat-label">Total Contactos</div></div>
            `}
          </div>

          <table>
            <thead>
              <tr>${fields.map(f => `<th>${f.label}</th>`).join("")}</tr>
            </thead>
            <tbody>
              ${data.slice(0, 100).map(item => `
                <tr>
                  ${fields.map(f => {
                    let value = item[f.key];
                    if (f.format) value = f.format(value);
                    return `<td>${value ?? ""}</td>`;
                  }).join("")}
                </tr>
              `).join("")}
            </tbody>
          </table>
          ${data.length > 100 ? `<p style="color: #64748b; margin-top: 10px;">Mostrando 100 de ${data.length} registos</p>` : ""}
        </body>
        </html>
      `;

      const printWindow = window.open("", "_blank");
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };

      toast.success("Relatório PDF gerado");
    } catch (error) {
      toast.error("Erro ao gerar PDF");
    }
    setExporting(false);
  };

  // Generate preview
  const generatePreview = () => {
    const data = getFilteredData();
    setPreviewData(data.slice(0, 20));
  };

  // Get status options based on entity
  const getStatusOptions = () => {
    switch (selectedEntity) {
      case "properties":
        return [
          { value: "active", label: "Ativo" },
          { value: "pending", label: "Pendente" },
          { value: "sold", label: "Vendido" },
          { value: "rented", label: "Arrendado" },
          { value: "off_market", label: "Fora do Mercado" }
        ];
      case "opportunities":
        return [
          { value: "new", label: "Novo" },
          { value: "contacted", label: "Contactado" },
          { value: "qualified", label: "Qualificado" },
          { value: "proposal", label: "Proposta" },
          { value: "negotiation", label: "Negociação" },
          { value: "won", label: "Ganho" },
          { value: "lost", label: "Perdido" }
        ];
      default:
        return [];
    }
  };

  // Charts data
  const getChartsData = () => {
    const data = getFilteredData();
    
    if (selectedEntity === "properties") {
      const byType = {};
      const byStatus = {};
      const byCity = {};
      data.forEach(p => {
        byType[p.property_type] = (byType[p.property_type] || 0) + 1;
        byStatus[p.status] = (byStatus[p.status] || 0) + 1;
        if (p.city) byCity[p.city] = (byCity[p.city] || 0) + 1;
      });
      return {
        byType: Object.entries(byType).map(([name, value]) => ({ name, value })),
        byStatus: Object.entries(byStatus).map(([name, value]) => ({ name, value })),
        byCity: Object.entries(byCity).slice(0, 8).map(([name, value]) => ({ name, value }))
      };
    }

    if (selectedEntity === "opportunities") {
      const byStatus = {};
      const bySource = {};
      const byPriority = {};
      data.forEach(o => {
        byStatus[o.status] = (byStatus[o.status] || 0) + 1;
        bySource[o.lead_source || 'other'] = (bySource[o.lead_source || 'other'] || 0) + 1;
        byPriority[o.priority || 'medium'] = (byPriority[o.priority || 'medium'] || 0) + 1;
      });
      return {
        byStatus: Object.entries(byStatus).map(([name, value]) => ({ name, value })),
        bySource: Object.entries(bySource).map(([name, value]) => ({ name, value })),
        byPriority: Object.entries(byPriority).map(([name, value]) => ({ name, value }))
      };
    }

    return {};
  };

  const chartsData = getChartsData();
  const filteredCount = getFilteredData().length;
  const config = entityConfigs[selectedEntity];
  const EntityIcon = config.icon;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Relatórios e Exportações
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-3 w-full max-w-md">
              <TabsTrigger value="export">Exportar Dados</TabsTrigger>
              <TabsTrigger value="reports">Relatórios</TabsTrigger>
              <TabsTrigger value="charts">Gráficos</TabsTrigger>
            </TabsList>

            {/* Common Filters */}
            <div className="mt-6 p-4 bg-slate-50 rounded-lg space-y-4">
              <div className="flex items-center gap-2 mb-3">
                <Filter className="w-4 h-4 text-slate-500" />
                <span className="font-medium text-slate-700">Filtros</span>
              </div>

              <div className="grid md:grid-cols-5 gap-4">
                <div>
                  <Label>Entidade</Label>
                  <Select value={selectedEntity} onValueChange={handleEntityChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="properties">Imóveis</SelectItem>
                      <SelectItem value="opportunities">Leads</SelectItem>
                      <SelectItem value="clients">Contactos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Data Início</Label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>

                <div>
                  <Label>Data Fim</Label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>

                <div>
                  <Label>Agente</Label>
                  <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {agents.map(a => (
                        <SelectItem key={a.email} value={a.email}>{a.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Estado</Label>
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {getStatusOptions().map(s => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <Badge variant="secondary" className="text-sm">
                  <EntityIcon className="w-4 h-4 mr-1" />
                  {filteredCount} {config.name.toLowerCase()} encontrados
                </Badge>
              </div>
            </div>

            {/* Export Tab */}
            <TabsContent value="export" className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Campos a Exportar</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {config.fields.map(field => (
                      <div key={field.key} className="flex items-center space-x-2">
                        <Checkbox
                          id={field.key}
                          checked={selectedFields.includes(field.key)}
                          onCheckedChange={() => toggleField(field.key)}
                        />
                        <label htmlFor={field.key} className="text-sm cursor-pointer">
                          {field.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-3">
                <Button onClick={exportToCSV} className="bg-green-600 hover:bg-green-700">
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Exportar CSV
                </Button>
                <Button onClick={exportToPDF} disabled={exporting} className="bg-red-600 hover:bg-red-700">
                  {exporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
                  Exportar PDF
                </Button>
                <Button variant="outline" onClick={generatePreview}>
                  <Eye className="w-4 h-4 mr-2" />
                  Pré-visualizar
                </Button>
              </div>

              {/* Preview Table */}
              {previewData && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Pré-visualização (20 primeiros)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[300px]">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-100 sticky top-0">
                          <tr>
                            {config.fields.filter(f => selectedFields.includes(f.key)).map(f => (
                              <th key={f.key} className="text-left p-2 font-medium">{f.label}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {previewData.map((item, idx) => (
                            <tr key={idx} className="border-b">
                              {config.fields.filter(f => selectedFields.includes(f.key)).map(f => (
                                <td key={f.key} className="p-2">
                                  {f.format ? f.format(item[f.key]) : item[f.key] ?? "-"}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Reports Tab */}
            <TabsContent value="reports" className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
                  <CardContent className="p-4">
                    <div className="text-3xl font-bold text-blue-700">{filteredCount}</div>
                    <div className="text-sm text-blue-600">Total {config.name}</div>
                  </CardContent>
                </Card>

                {selectedEntity === "properties" && (
                  <>
                    <Card className="bg-gradient-to-br from-green-50 to-green-100">
                      <CardContent className="p-4">
                        <div className="text-3xl font-bold text-green-700">
                          €{(getFilteredData().reduce((s, p) => s + (p.price || 0), 0) / 1000000).toFixed(1)}M
                        </div>
                        <div className="text-sm text-green-600">Valor Total</div>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-amber-50 to-amber-100">
                      <CardContent className="p-4">
                        <div className="text-3xl font-bold text-amber-700">
                          €{filteredCount > 0 ? Math.round(getFilteredData().reduce((s, p) => s + (p.price || 0), 0) / filteredCount / 1000) : 0}k
                        </div>
                        <div className="text-sm text-amber-600">Preço Médio</div>
                      </CardContent>
                    </Card>
                  </>
                )}

                {selectedEntity === "opportunities" && (
                  <>
                    <Card className="bg-gradient-to-br from-green-50 to-green-100">
                      <CardContent className="p-4">
                        <div className="text-3xl font-bold text-green-700">
                          {getFilteredData().filter(o => o.status === 'won').length}
                        </div>
                        <div className="text-sm text-green-600">Ganhos</div>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-amber-50 to-amber-100">
                      <CardContent className="p-4">
                        <div className="text-3xl font-bold text-amber-700">
                          {filteredCount > 0 ? ((getFilteredData().filter(o => o.status === 'won').length / filteredCount) * 100).toFixed(0) : 0}%
                        </div>
                        <div className="text-sm text-amber-600">Taxa Conversão</div>
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>

              <Button onClick={exportToPDF} disabled={exporting}>
                <Printer className="w-4 h-4 mr-2" />
                Imprimir Relatório Completo
              </Button>
            </TabsContent>

            {/* Charts Tab */}
            <TabsContent value="charts" className="space-y-4">
              <div className="grid md:grid-cols-2 gap-6">
                {selectedEntity === "properties" && (
                  <>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Por Tipo de Imóvel</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={250}>
                          <RechartsPie>
                            <Pie
                              data={chartsData.byType || []}
                              cx="50%"
                              cy="50%"
                              outerRadius={80}
                              dataKey="value"
                              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            >
                              {(chartsData.byType || []).map((_, idx) => (
                                <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </RechartsPie>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Por Estado</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={250}>
                          <BarChart data={chartsData.byStatus || []}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    <Card className="md:col-span-2">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Por Cidade</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={250}>
                          <BarChart data={chartsData.byCity || []} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" />
                            <YAxis dataKey="name" type="category" width={100} />
                            <Tooltip />
                            <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </>
                )}

                {selectedEntity === "opportunities" && (
                  <>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Por Estado</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={250}>
                          <RechartsPie>
                            <Pie
                              data={chartsData.byStatus || []}
                              cx="50%"
                              cy="50%"
                              outerRadius={80}
                              dataKey="value"
                              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            >
                              {(chartsData.byStatus || []).map((_, idx) => (
                                <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </RechartsPie>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Por Origem</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={250}>
                          <BarChart data={chartsData.bySource || []}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    <Card className="md:col-span-2">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Por Prioridade</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart data={chartsData.byPriority || []}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="value" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}