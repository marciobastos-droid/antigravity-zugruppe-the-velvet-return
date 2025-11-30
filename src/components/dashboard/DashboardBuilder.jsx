import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus, Save, Trash2, Settings, GripVertical, X, Sparkles, Loader2,
  LayoutDashboard, Copy, ChevronDown, Edit, BarChart3, PieChart, List,
  Hash, Users, Zap, MoreHorizontal, TrendingUp, Bell, FileText, GitBranch
} from "lucide-react";
import { toast } from "sonner";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { widgetTypes, widgetCategories, getWidgetsByCategory } from "./widgets/WidgetRegistry";
import WidgetRenderer from "./widgets/WidgetRenderer";

const iconMap = {
  Hash, BarChart3, PieChart, List, Users, Zap, MoreHorizontal, TrendingUp, Bell, FileText, GitBranch
};

export default function DashboardBuilder({ onClose }) {
  const queryClient = useQueryClient();
  const [selectedDashboard, setSelectedDashboard] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [showWidgetPicker, setShowWidgetPicker] = useState(false);
  const [showDashboardDialog, setShowDashboardDialog] = useState(false);
  const [showWidgetConfig, setShowWidgetConfig] = useState(null);
  const [aiSuggesting, setAiSuggesting] = useState(false);
  const [dashboardForm, setDashboardForm] = useState({ name: "", description: "" });
  const [widgets, setWidgets] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  // Load current user
  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: dashboards = [], isLoading } = useQuery({
    queryKey: ['customDashboards'],
    queryFn: () => base44.entities.CustomDashboard.list('name')
  });

  // Filter dashboards - show user's own + shared dashboards
  const userDashboards = dashboards.filter(db => 
    db.created_by === currentUser?.email || db.is_shared
  );

  const { data: dashboardData } = useQuery({
    queryKey: ['dashboardData'],
    queryFn: async () => {
      const [properties, opportunities, clients] = await Promise.all([
        base44.entities.Property.list('-created_date'),
        base44.entities.Opportunity.list('-created_date'),
        base44.entities.ClientContact.list('-created_date')
      ]);

      // Build metrics
      const activeProps = properties.filter(p => p.status === 'active');
      const newLeads = opportunities.filter(o => o.status === 'new');
      const hotLeads = opportunities.filter(o => o.qualification_status === 'hot');

      const metrics = {
        total_properties: { value: properties.length, label: "Total Imóveis", trend: 5 },
        active_properties: { value: activeProps.length, label: "Imóveis Ativos", trend: 3 },
        total_leads: { value: opportunities.length, label: "Total Leads", trend: 12 },
        new_leads: { value: newLeads.length, label: "Novos Leads", trend: 8 },
        hot_leads: { value: hotLeads.length, label: "Leads Quentes", trend: -2 },
        total_clients: { value: clients.length, label: "Total Clientes", trend: 4 },
        total_value: { value: activeProps.reduce((s, p) => s + (p.price || 0), 0), label: "Valor Portfolio", trend: 7 },
        avg_price: { value: activeProps.length ? Math.round(activeProps.reduce((s, p) => s + (p.price || 0), 0) / activeProps.length) : 0, label: "Preço Médio", trend: 2 }
      };

      // Build chart data
      const propertyTypes = {};
      properties.forEach(p => { propertyTypes[p.property_type] = (propertyTypes[p.property_type] || 0) + 1; });
      
      const propertyStatus = {};
      properties.forEach(p => { propertyStatus[p.status] = (propertyStatus[p.status] || 0) + 1; });

      const leadStatus = {};
      opportunities.forEach(o => { leadStatus[o.status] = (leadStatus[o.status] || 0) + 1; });

      const leadSources = {};
      opportunities.forEach(o => { leadSources[o.lead_source || 'other'] = (leadSources[o.lead_source || 'other'] || 0) + 1; });

      const listingTypes = { sale: 0, rent: 0 };
      properties.forEach(p => { listingTypes[p.listing_type] = (listingTypes[p.listing_type] || 0) + 1; });

      const cityCounts = {};
      properties.forEach(p => { if (p.city) cityCounts[p.city] = (cityCounts[p.city] || 0) + 1; });

      const charts = {
        property_types: Object.entries(propertyTypes).map(([name, value]) => ({ name, value })),
        property_status: Object.entries(propertyStatus).map(([name, value]) => ({ name, value })),
        lead_status: Object.entries(leadStatus).map(([name, value]) => ({ name, value })),
        lead_sources: Object.entries(leadSources).map(([name, value]) => ({ name, value })),
        listing_types: Object.entries(listingTypes).map(([name, value]) => ({ name: name === 'sale' ? 'Venda' : 'Arrendamento', value })),
        properties_by_city: Object.entries(cityCounts).slice(0, 8).map(([name, value]) => ({ name, value }))
      };

      // Lists
      const lists = {
        properties: properties.slice(0, 10).map(p => ({ id: p.id, title: p.title, subtitle: `€${p.price?.toLocaleString()}`, created_date: p.created_date })),
        leads: opportunities.slice(0, 10).map(o => ({ id: o.id, title: o.buyer_name, name: o.buyer_name, subtitle: o.status, created_date: o.created_date })),
        clients: clients.slice(0, 10).map(c => ({ id: c.id, title: c.full_name, name: c.full_name, subtitle: c.city, created_date: c.created_date }))
      };

      // Pipeline
      const pipeline = {};
      opportunities.forEach(o => {
        if (!pipeline[o.status]) pipeline[o.status] = { count: 0, value: 0 };
        pipeline[o.status].count++;
        pipeline[o.status].value += o.budget || o.estimated_value || 0;
      });

      // Followups
      const followups = opportunities
        .filter(o => o.next_followup_date)
        .map(o => ({ date: o.next_followup_date, client_name: o.buyer_name, type: 'follow-up' }))
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      return { metrics, charts, lists, pipeline, followups };
    }
  });

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (data.id) {
        return base44.entities.CustomDashboard.update(data.id, data);
      }
      return base44.entities.CustomDashboard.create(data);
    },
    onSuccess: () => {
      toast.success("Dashboard guardado!");
      queryClient.invalidateQueries({ queryKey: ['customDashboards'] });
      setShowDashboardDialog(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CustomDashboard.delete(id),
    onSuccess: () => {
      toast.success("Dashboard eliminado");
      queryClient.invalidateQueries({ queryKey: ['customDashboards'] });
      setSelectedDashboard(null);
    }
  });

  useEffect(() => {
    if (selectedDashboard) {
      setWidgets(selectedDashboard.widgets || []);
    }
  }, [selectedDashboard]);

  const handleAISuggest = async () => {
    setAiSuggesting(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Sugere widgets para um dashboard imobiliário baseado nestes dados:
- ${dashboardData?.metrics?.total_properties?.value || 0} imóveis
- ${dashboardData?.metrics?.total_leads?.value || 0} leads
- ${dashboardData?.metrics?.total_clients?.value || 0} clientes

Widgets disponíveis: metric_card, pie_chart, bar_chart, line_chart, recent_list, quick_actions, pipeline_summary, followup_alerts

Sugere 4-6 widgets com configurações específicas para um dashboard útil.`,
        response_json_schema: {
          type: "object",
          properties: {
            widgets: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: { type: "string" },
                  title: { type: "string" },
                  config: { type: "object" }
                }
              }
            }
          }
        }
      });

      if (result.widgets?.length > 0) {
        const suggestedWidgets = result.widgets.map((w, idx) => ({
          id: `widget_${Date.now()}_${idx}`,
          type: w.type,
          title: w.title,
          x: (idx % 3) * 4,
          y: Math.floor(idx / 3) * 4,
          w: widgetTypes[w.type]?.defaultSize?.w || 4,
          h: widgetTypes[w.type]?.defaultSize?.h || 3,
          config: w.config || {}
        }));
        setWidgets(suggestedWidgets);
        toast.success(`${suggestedWidgets.length} widgets sugeridos pela IA!`);
      }
    } catch (error) {
      toast.error("Erro ao obter sugestões");
    }
    setAiSuggesting(false);
  };

  const addWidget = (widgetType) => {
    const type = widgetTypes[widgetType];
    const newWidget = {
      id: `widget_${Date.now()}`,
      type: widgetType,
      title: type.name,
      x: 0,
      y: widgets.length > 0 ? Math.max(...widgets.map(w => w.y + w.h)) : 0,
      w: type.defaultSize.w,
      h: type.defaultSize.h,
      config: {}
    };
    setWidgets([...widgets, newWidget]);
    setShowWidgetPicker(false);
  };

  const removeWidget = (widgetId) => {
    setWidgets(widgets.filter(w => w.id !== widgetId));
  };

  const updateWidgetConfig = (widgetId, newConfig) => {
    setWidgets(widgets.map(w => w.id === widgetId ? { ...w, config: { ...w.config, ...newConfig } } : w));
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const reordered = Array.from(widgets);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    setWidgets(reordered);
  };

  const handleSaveDashboard = () => {
    saveMutation.mutate({
      ...(selectedDashboard?.id ? { id: selectedDashboard.id } : {}),
      name: dashboardForm.name || selectedDashboard?.name || "Novo Dashboard",
      description: dashboardForm.description || selectedDashboard?.description || "",
      widgets,
      is_shared: dashboardForm.is_shared || selectedDashboard?.is_shared || false
    });
  };

  // Save user's default dashboard preference
  const saveAsDefault = async (dashboardId) => {
    try {
      await base44.auth.updateMe({ default_dashboard_id: dashboardId });
      toast.success("Dashboard definido como padrão");
    } catch (error) {
      toast.error("Erro ao guardar preferência");
    }
  };

  const widgetsByCategory = getWidgetsByCategory();

  return (
    <div className="flex h-[calc(100vh-200px)] gap-4">
      {/* Sidebar - Dashboard List */}
      <div className="w-64 bg-white rounded-xl border border-slate-200 flex flex-col">
        <div className="p-4 border-b">
          <h3 className="font-semibold text-slate-900">Dashboards</h3>
        </div>
        <ScrollArea className="flex-1 p-2">
          {userDashboards.map(db => (
            <button
              key={db.id}
              onClick={() => { setSelectedDashboard(db); setEditMode(false); }}
              className={`w-full text-left p-3 rounded-lg mb-1 transition-colors ${
                selectedDashboard?.id === db.id ? 'bg-blue-50 border border-blue-200' : 'hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-900 flex-1">{db.name}</span>
                {currentUser?.default_dashboard_id === db.id && (
                  <Badge variant="secondary" className="text-xs">Padrão</Badge>
                )}
                {db.is_shared && db.created_by !== currentUser?.email && (
                  <Badge variant="outline" className="text-xs">Partilhado</Badge>
                )}
              </div>
              <div className="text-xs text-slate-500">{db.widgets?.length || 0} widgets</div>
            </button>
          ))}
        </ScrollArea>
        <div className="p-3 border-t">
          <Button 
            onClick={() => { 
              setSelectedDashboard(null); 
              setWidgets([]); 
              setDashboardForm({ name: "", description: "" });
              setEditMode(true);
            }} 
            className="w-full"
            variant="outline"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Dashboard
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-white rounded-xl border border-slate-200 flex flex-col overflow-hidden">
        {selectedDashboard || editMode ? (
          <>
            {/* Toolbar */}
            <div className="p-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-3">
                {editMode ? (
                  <Input
                    value={dashboardForm.name || selectedDashboard?.name || ""}
                    onChange={(e) => setDashboardForm({ ...dashboardForm, name: e.target.value })}
                    placeholder="Nome do Dashboard"
                    className="w-64"
                  />
                ) : (
                  <h2 className="text-lg font-semibold">{selectedDashboard?.name}</h2>
                )}
                <Badge variant="outline">{widgets.length} widgets</Badge>
              </div>
              <div className="flex items-center gap-2">
                {editMode ? (
                  <>
                    <Button variant="outline" onClick={handleAISuggest} disabled={aiSuggesting}>
                      {aiSuggesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                      Sugerir IA
                    </Button>
                    <Button variant="outline" onClick={() => setShowWidgetPicker(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Widget
                    </Button>
                    <Button onClick={handleSaveDashboard} disabled={saveMutation.isPending}>
                      <Save className="w-4 h-4 mr-2" />
                      Guardar
                    </Button>
                    <Button variant="ghost" onClick={() => setEditMode(false)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" onClick={() => setEditMode(true)}>
                      <Edit className="w-4 h-4 mr-2" />
                      Editar
                    </Button>
                    {selectedDashboard && currentUser?.default_dashboard_id !== selectedDashboard.id && (
                      <Button 
                        variant="outline"
                        onClick={() => saveAsDefault(selectedDashboard.id)}
                      >
                        Definir Padrão
                      </Button>
                    )}
                    {selectedDashboard && selectedDashboard.created_by === currentUser?.email && (
                      <Button 
                        variant="ghost" 
                        className="text-red-600"
                        onClick={() => deleteMutation.mutate(selectedDashboard.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Widget Grid */}
            <ScrollArea className="flex-1 p-4">
              {widgets.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  <LayoutDashboard className="w-16 h-16 mb-4" />
                  <p className="text-lg font-medium mb-2">Dashboard vazio</p>
                  <p className="text-sm mb-4">Adicione widgets ou peça sugestões à IA</p>
                  {editMode && (
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setShowWidgetPicker(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Adicionar Widget
                      </Button>
                      <Button onClick={handleAISuggest} disabled={aiSuggesting}>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Sugerir com IA
                      </Button>
                    </div>
                  )}
                </div>
              ) : editMode ? (
                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable droppableId="widgets">
                    {(provided) => (
                      <div {...provided.droppableProps} ref={provided.innerRef} className="grid grid-cols-12 gap-4">
                        {widgets.map((widget, index) => (
                          <Draggable key={widget.id} draggableId={widget.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={`col-span-${widget.w || 4} bg-white border rounded-xl shadow-sm overflow-hidden ${
                                  snapshot.isDragging ? 'shadow-lg ring-2 ring-blue-500' : ''
                                }`}
                                style={{ 
                                  ...provided.draggableProps.style,
                                  minHeight: `${(widget.h || 3) * 60}px`,
                                  gridColumn: `span ${Math.min(widget.w || 4, 12)}`
                                }}
                              >
                                <div className="p-2 bg-slate-50 border-b flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <div {...provided.dragHandleProps} className="cursor-grab">
                                      <GripVertical className="w-4 h-4 text-slate-400" />
                                    </div>
                                    <span className="text-sm font-medium text-slate-700">{widget.title}</span>
                                  </div>
                                  <div className="flex gap-1">
                                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setShowWidgetConfig(widget)}>
                                      <Settings className="w-3 h-3" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-6 w-6 text-red-500" onClick={() => removeWidget(widget.id)}>
                                      <X className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                                <div className="p-3" style={{ height: `${(widget.h || 3) * 60 - 48}px` }}>
                                  <WidgetRenderer widget={widget} data={dashboardData} />
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              ) : (
                <div className="grid grid-cols-12 gap-4">
                  {widgets.map((widget) => (
                    <div
                      key={widget.id}
                      className="bg-white border rounded-xl shadow-sm overflow-hidden"
                      style={{ 
                        minHeight: `${(widget.h || 3) * 60}px`,
                        gridColumn: `span ${Math.min(widget.w || 4, 12)}`
                      }}
                    >
                      <div className="p-2 bg-slate-50 border-b">
                        <span className="text-sm font-medium text-slate-700">{widget.title}</span>
                      </div>
                      <div className="p-3" style={{ height: `${(widget.h || 3) * 60 - 48}px` }}>
                        <WidgetRenderer widget={widget} data={dashboardData} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400">
            <div className="text-center">
              <LayoutDashboard className="w-16 h-16 mx-auto mb-4" />
              <p className="text-lg font-medium">Selecione ou crie um dashboard</p>
            </div>
          </div>
        )}
      </div>

      {/* Widget Picker Dialog */}
      <Dialog open={showWidgetPicker} onOpenChange={setShowWidgetPicker}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Adicionar Widget</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="metrics">
            <TabsList className="grid grid-cols-6">
              {Object.entries(widgetCategories).map(([key, cat]) => {
                const Icon = iconMap[cat.icon] || Hash;
                return (
                  <TabsTrigger key={key} value={key} className="text-xs">
                    <Icon className="w-4 h-4 mr-1" />
                    {cat.name}
                  </TabsTrigger>
                );
              })}
            </TabsList>
            {Object.entries(widgetsByCategory).map(([category, categoryWidgets]) => (
              <TabsContent key={category} value={category} className="mt-4">
                <div className="grid grid-cols-2 gap-3">
                  {categoryWidgets.map(widget => {
                    const Icon = iconMap[widget.icon] || Hash;
                    return (
                      <button
                        key={widget.id}
                        onClick={() => addWidget(widget.id)}
                        className="p-4 border rounded-lg text-left hover:bg-slate-50 hover:border-blue-300 transition-colors"
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Icon className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <div className="font-medium text-slate-900">{widget.name}</div>
                            <div className="text-xs text-slate-500">{widget.description}</div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Widget Config Dialog */}
      <Dialog open={!!showWidgetConfig} onOpenChange={() => setShowWidgetConfig(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurar Widget</DialogTitle>
          </DialogHeader>
          {showWidgetConfig && (
            <div className="space-y-4">
              <div>
                <Label>Título</Label>
                <Input
                  value={showWidgetConfig.title}
                  onChange={(e) => {
                    const newTitle = e.target.value;
                    setWidgets(widgets.map(w => w.id === showWidgetConfig.id ? { ...w, title: newTitle } : w));
                    setShowWidgetConfig({ ...showWidgetConfig, title: newTitle });
                  }}
                />
              </div>
              
              {widgetTypes[showWidgetConfig.type]?.configSchema && 
                Object.entries(widgetTypes[showWidgetConfig.type].configSchema).map(([key, schema]) => (
                  <div key={key}>
                    <Label>{schema.label}</Label>
                    {schema.type === "select" ? (
                      <Select
                        value={showWidgetConfig.config?.[key] || ""}
                        onValueChange={(v) => {
                          updateWidgetConfig(showWidgetConfig.id, { [key]: v });
                          setShowWidgetConfig({ ...showWidgetConfig, config: { ...showWidgetConfig.config, [key]: v } });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {schema.options.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : schema.type === "boolean" ? (
                      <div className="flex items-center gap-2 mt-1">
                        <Switch
                          checked={showWidgetConfig.config?.[key] ?? schema.default ?? false}
                          onCheckedChange={(v) => {
                            updateWidgetConfig(showWidgetConfig.id, { [key]: v });
                            setShowWidgetConfig({ ...showWidgetConfig, config: { ...showWidgetConfig.config, [key]: v } });
                          }}
                        />
                        <span className="text-sm text-slate-600">{schema.label}</span>
                      </div>
                    ) : schema.type === "textarea" ? (
                      <Textarea
                        value={showWidgetConfig.config?.[key] || schema.default || ""}
                        onChange={(e) => {
                          updateWidgetConfig(showWidgetConfig.id, { [key]: e.target.value });
                          setShowWidgetConfig({ ...showWidgetConfig, config: { ...showWidgetConfig.config, [key]: e.target.value } });
                        }}
                        rows={4}
                      />
                    ) : schema.type === "number" ? (
                      <Input
                        type="number"
                        value={showWidgetConfig.config?.[key] || schema.default || ""}
                        min={schema.min}
                        max={schema.max}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          updateWidgetConfig(showWidgetConfig.id, { [key]: val });
                          setShowWidgetConfig({ ...showWidgetConfig, config: { ...showWidgetConfig.config, [key]: val } });
                        }}
                      />
                    ) : null}
                  </div>
                ))
              }

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Largura (1-12)</Label>
                  <Input
                    type="number"
                    min={2}
                    max={12}
                    value={showWidgetConfig.w || 4}
                    onChange={(e) => {
                      const val = Math.min(12, Math.max(2, parseInt(e.target.value) || 4));
                      setWidgets(widgets.map(w => w.id === showWidgetConfig.id ? { ...w, w: val } : w));
                      setShowWidgetConfig({ ...showWidgetConfig, w: val });
                    }}
                  />
                </div>
                <div>
                  <Label>Altura (1-8)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={8}
                    value={showWidgetConfig.h || 3}
                    onChange={(e) => {
                      const val = Math.min(8, Math.max(1, parseInt(e.target.value) || 3));
                      setWidgets(widgets.map(w => w.id === showWidgetConfig.id ? { ...w, h: val } : w));
                      setShowWidgetConfig({ ...showWidgetConfig, h: val });
                    }}
                  />
                </div>
              </div>

              <Button onClick={() => setShowWidgetConfig(null)} className="w-full">
                Concluído
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}