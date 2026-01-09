import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Globe, ExternalLink, Home, Building2, TrendingUp, FileText, Loader2, CheckCircle2, Calendar, AlertCircle, Clock, RefreshCw } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const AVAILABLE_PORTALS = [
  { id: "idealista", name: "Idealista", icon: ExternalLink, color: "text-green-600" },
  { id: "imovirtual", name: "Imovirtual", icon: ExternalLink, color: "text-blue-600" },
  { id: "casafari", name: "Casafari", icon: ExternalLink, color: "text-orange-600" },
  { id: "olx", name: "OLX", icon: ExternalLink, color: "text-purple-600" },
  { id: "supercasa", name: "Supercasa", icon: ExternalLink, color: "text-red-600" },
  { id: "custojusto", name: "Custo Justo", icon: ExternalLink, color: "text-yellow-600" }
];

const AVAILABLE_PAGES = [
  { id: "zuhaus", name: "ZuHaus", icon: Home, description: "Plataforma residencial especializada", color: "#d22630" },
  { id: "zuhandel", name: "ZuHandel", icon: Building2, description: "Plataforma comercial especializada", color: "#75787b" },
  { id: "homepage_featured", name: "Homepage - Destaque", icon: Home, description: "Imóveis em destaque na página inicial" },
  { id: "investor_section", name: "Secção Investidores", icon: TrendingUp, description: "Página dedicada a investidores" },
  { id: "premium_luxury", name: "Premium Luxo", icon: FileText, description: "Imóveis de luxo premium" },
  { id: "worldwide", name: "WorldWide Properties", icon: Globe, description: "Propriedades internacionais" }
];

export default function BulkPublicationDialog({ open, onOpenChange, selectedPropertyIds, properties }) {
  const queryClient = useQueryClient();
  const [selectedPortals, setSelectedPortals] = React.useState([]);
  const [selectedPages, setSelectedPages] = React.useState([]);
  const [mode, setMode] = React.useState("add"); // "add", "replace", "remove", "schedule", "republish", "deactivate"
  const [activeTab, setActiveTab] = React.useState("immediate"); // "immediate", "scheduled", "logs"
  const [scheduledDate, setScheduledDate] = React.useState("");
  const [scheduledTime, setScheduledTime] = React.useState("");
  const [scheduleNotes, setScheduleNotes] = React.useState("");
  
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  // Fetch recent logs for selected properties
  const { data: recentLogs = [], isLoading: logsLoading } = useQuery({
    queryKey: ['publicationLogs', selectedPropertyIds],
    queryFn: async () => {
      if (!selectedPropertyIds || selectedPropertyIds.length === 0) return [];
      const logs = await base44.entities.PublicationLog.list('-created_date', 100);
      return logs.filter(log => selectedPropertyIds.includes(log.property_id));
    },
    enabled: open && activeTab === "logs"
  });
  
  const updateMutation = useMutation({
    mutationFn: async ({ portals, pages, mode, scheduledDate, scheduledTime, scheduleNotes }) => {
      const selectedProperties = properties.filter(p => selectedPropertyIds.includes(p.id));
      const batchId = `batch_${Date.now()}`;
      
      // Se for agendamento
      if (mode === "schedule") {
        const publishAt = new Date(`${scheduledDate}T${scheduledTime}`);
        
        for (const property of selectedProperties) {
          // Criar agendamentos
          for (const portal of portals) {
            await base44.entities.ScheduledPublication.create({
              property_id: property.id,
              property_ref_id: property.ref_id,
              property_title: property.title,
              target_type: "portal",
              target_id: portal,
              target_name: AVAILABLE_PORTALS.find(p => p.id === portal)?.name || portal,
              publish_at: publishAt.toISOString(),
              status: "pending",
              notes: scheduleNotes,
              created_by: user?.email
            });
          }
          
          for (const page of pages) {
            await base44.entities.ScheduledPublication.create({
              property_id: property.id,
              property_ref_id: property.ref_id,
              property_title: property.title,
              target_type: "page",
              target_id: page,
              target_name: AVAILABLE_PAGES.find(p => p.id === page)?.name || page,
              publish_at: publishAt.toISOString(),
              status: "pending",
              notes: scheduleNotes,
              created_by: user?.email
            });
          }
          
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        return;
      }
      
      // Processar em lotes de 3 para evitar rate limit
      const batchSize = 3;
      
      for (let i = 0; i < selectedProperties.length; i += batchSize) {
        const batch = selectedProperties.slice(i, i + batchSize);
        
        for (const property of batch) {
          let newPortals, newPages;
          const currentPortals = Array.isArray(property.published_portals) ? property.published_portals : [];
          const currentPages = Array.isArray(property.published_pages) ? property.published_pages : [];
          
          if (mode === "add") {
            newPortals = [...new Set([...currentPortals, ...portals])];
            newPages = [...new Set([...currentPages, ...pages])];
          } else if (mode === "remove" || mode === "deactivate") {
            newPortals = currentPortals.filter(p => !portals.includes(p));
            newPages = currentPages.filter(p => !pages.includes(p));
          } else if (mode === "replace") {
            newPortals = portals;
            newPages = pages;
          } else if (mode === "republish") {
            // Forçar republicação (remove e adiciona de novo)
            newPortals = [...new Set([...currentPortals, ...portals])];
            newPages = [...new Set([...currentPages, ...pages])];
          }
          
          try {
            await base44.entities.Property.update(property.id, {
              published_portals: newPortals,
              published_pages: newPages
            });
            
            // Criar logs de sucesso
            for (const portal of portals) {
              await base44.entities.PublicationLog.create({
                property_id: property.id,
                property_ref_id: property.ref_id,
                property_title: property.title,
                operation_type: mode === "republish" ? "republish" : mode === "remove" || mode === "deactivate" ? "unpublish" : "publish",
                target_type: "portal",
                target_id: portal,
                target_name: AVAILABLE_PORTALS.find(p => p.id === portal)?.name || portal,
                status: "success",
                batch_id: batchId,
                executed_by: user?.email,
                execution_time: new Date().toISOString()
              });
            }
            
            for (const page of pages) {
              await base44.entities.PublicationLog.create({
                property_id: property.id,
                property_ref_id: property.ref_id,
                property_title: property.title,
                operation_type: mode === "republish" ? "republish" : mode === "remove" || mode === "deactivate" ? "unpublish" : "publish",
                target_type: "page",
                target_id: page,
                target_name: AVAILABLE_PAGES.find(p => p.id === page)?.name || page,
                status: "success",
                batch_id: batchId,
                executed_by: user?.email,
                execution_time: new Date().toISOString()
              });
            }
            
          } catch (error) {
            // Criar logs de falha
            for (const portal of portals) {
              await base44.entities.PublicationLog.create({
                property_id: property.id,
                property_ref_id: property.ref_id,
                property_title: property.title,
                operation_type: mode === "republish" ? "republish" : mode === "remove" || mode === "deactivate" ? "unpublish" : "publish",
                target_type: "portal",
                target_id: portal,
                target_name: AVAILABLE_PORTALS.find(p => p.id === portal)?.name || portal,
                status: "failed",
                error_message: error.message,
                batch_id: batchId,
                executed_by: user?.email,
                execution_time: new Date().toISOString()
              });
            }
            
            for (const page of pages) {
              await base44.entities.PublicationLog.create({
                property_id: property.id,
                property_ref_id: property.ref_id,
                property_title: property.title,
                operation_type: mode === "republish" ? "republish" : mode === "remove" || mode === "deactivate" ? "unpublish" : "publish",
                target_type: "page",
                target_id: page,
                target_name: AVAILABLE_PAGES.find(p => p.id === page)?.name || page,
                status: "failed",
                error_message: error.message,
                batch_id: batchId,
                executed_by: user?.email,
                execution_time: new Date().toISOString()
              });
            }
            
            throw error;
          }
          
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        if (i + batchSize < selectedProperties.length) {
          await new Promise(resolve => setTimeout(resolve, 800));
        }
      }
    },
    onSuccess: (_, variables) => {
      if (variables.mode === "schedule") {
        toast.success(`${selectedPropertyIds.length} publicaç${selectedPropertyIds.length > 1 ? 'ões agendadas' : 'ão agendada'} com sucesso`);
      } else {
        toast.success(`Publicação atualizada em ${selectedPropertyIds.length} imóveis`);
      }
      queryClient.invalidateQueries({ queryKey: ['myProperties'] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['publicationLogs'] });
      queryClient.invalidateQueries({ queryKey: ['scheduledPublications'] });
      onOpenChange(false);
      resetState();
    },
    onError: (error) => {
      console.error('Bulk publication error:', error);
      toast.error(`Erro ao atualizar publicação: ${error.message || 'Erro desconhecido'}`);
    }
  });

  const resetState = () => {
    setSelectedPortals([]);
    setSelectedPages([]);
    setMode("add");
    setActiveTab("immediate");
    setScheduledDate("");
    setScheduledTime("");
    setScheduleNotes("");
  };

  const handleClose = () => {
    resetState();
    onOpenChange(false);
  };

  const togglePortal = (portalId) => {
    setSelectedPortals(prev => 
      prev.includes(portalId)
        ? prev.filter(p => p !== portalId)
        : [...prev, portalId]
    );
  };

  const togglePage = (pageId) => {
    setSelectedPages(prev => 
      prev.includes(pageId)
        ? prev.filter(p => p !== pageId)
        : [...prev, pageId]
    );
  };

  const handleSubmit = () => {
    if (selectedPortals.length === 0 && selectedPages.length === 0) {
      toast.error("Selecione pelo menos um portal ou página");
      return;
    }
    
    if (mode === "schedule") {
      if (!scheduledDate || !scheduledTime) {
        toast.error("Defina a data e hora do agendamento");
        return;
      }
      
      const scheduleDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
      if (scheduleDateTime <= new Date()) {
        toast.error("A data/hora deve ser no futuro");
        return;
      }
    }
    
    updateMutation.mutate({
      portals: selectedPortals,
      pages: selectedPages,
      mode,
      scheduledDate,
      scheduledTime,
      scheduleNotes
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-600" />
            Gestão de Publicação em Massa
          </DialogTitle>
          <p className="text-sm text-slate-600 mt-2">
            {selectedPropertyIds.length} {selectedPropertyIds.length === 1 ? "imóvel selecionado" : "imóveis selecionados"}
          </p>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="immediate">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Publicação Imediata
            </TabsTrigger>
            <TabsTrigger value="scheduled">
              <Calendar className="w-4 h-4 mr-2" />
              Agendar Publicação
            </TabsTrigger>
            <TabsTrigger value="logs">
              <FileText className="w-4 h-4 mr-2" />
              Histórico
            </TabsTrigger>
          </TabsList>

          <TabsContent value="immediate" className="space-y-6 mt-4">
          {/* Mode Selection */}
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <Label className="text-sm font-semibold mb-3 block">Modo de Atualização</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <button
                  onClick={() => setMode("add")}
                  className={`p-2.5 rounded-lg border-2 transition-all text-left ${
                    mode === "add"
                      ? "border-blue-500 bg-white"
                      : "border-slate-200 hover:border-slate-300 bg-white/50"
                  }`}
                >
                  <p className="font-medium text-sm text-slate-900">Adicionar</p>
                  <p className="text-xs text-slate-600 mt-0.5">Adicionar às publicações</p>
                </button>
                <button
                  onClick={() => setMode("remove")}
                  className={`p-2.5 rounded-lg border-2 transition-all text-left ${
                    mode === "remove"
                      ? "border-red-500 bg-white"
                      : "border-slate-200 hover:border-slate-300 bg-white/50"
                  }`}
                >
                  <p className="font-medium text-sm text-slate-900">Remover</p>
                  <p className="text-xs text-slate-600 mt-0.5">Remover das publicações</p>
                </button>
                <button
                  onClick={() => setMode("deactivate")}
                  className={`p-2.5 rounded-lg border-2 transition-all text-left ${
                    mode === "deactivate"
                      ? "border-orange-500 bg-white"
                      : "border-slate-200 hover:border-slate-300 bg-white/50"
                  }`}
                >
                  <p className="font-medium text-sm text-slate-900">Desativar</p>
                  <p className="text-xs text-slate-600 mt-0.5">Desativar publicações</p>
                </button>
                <button
                  onClick={() => setMode("republish")}
                  className={`p-2.5 rounded-lg border-2 transition-all text-left ${
                    mode === "republish"
                      ? "border-green-500 bg-white"
                      : "border-slate-200 hover:border-slate-300 bg-white/50"
                  }`}
                >
                  <p className="font-medium text-sm text-slate-900">Republicar</p>
                  <p className="text-xs text-slate-600 mt-0.5">Forçar republicação</p>
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Portais Selection */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-base font-semibold">Portais Imobiliários</Label>
              {(mode === "remove" || mode === "deactivate") && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSelectedPortals(AVAILABLE_PORTALS.map(p => p.id))}
                >
                  Selecionar Todos
                </Button>
              )}
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {AVAILABLE_PORTALS.map((portal) => {
                const Icon = portal.icon;
                const isSelected = selectedPortals.includes(portal.id);
                
                return (
                  <div
                    key={portal.id}
                    onClick={() => togglePortal(portal.id)}
                    className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      isSelected
                        ? "border-blue-500 bg-blue-50"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => togglePortal(portal.id)}
                    />
                    <Icon className={`w-5 h-5 ${isSelected ? portal.color : "text-slate-400"}`} />
                    <span className={`font-medium ${isSelected ? "text-slate-900" : "text-slate-600"}`}>
                      {portal.name}
                    </span>
                  </div>
                );
              })}
            </div>
            {selectedPortals.length > 0 && (
              <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300 mt-3">
                {selectedPortals.length} {selectedPortals.length === 1 ? "portal selecionado" : "portais selecionados"}
              </Badge>
            )}
          </div>

          {/* Pages Selection */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-base font-semibold">Páginas do Website</Label>
              {(mode === "remove" || mode === "deactivate") && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSelectedPages(AVAILABLE_PAGES.map(p => p.id))}
                >
                  Selecionar Todos
                </Button>
              )}
            </div>
            <div className="space-y-2">
              {AVAILABLE_PAGES.map((page) => {
                const Icon = page.icon;
                const isSelected = selectedPages.includes(page.id);
                
                return (
                  <div
                    key={page.id}
                    onClick={() => togglePage(page.id)}
                    className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      isSelected
                        ? "border-green-500 bg-green-50"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => togglePage(page.id)}
                      className="mt-0.5"
                    />
                    <Icon className={`w-5 h-5 mt-0.5 ${isSelected ? "text-green-600" : "text-slate-400"}`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className={`font-medium ${isSelected ? "text-slate-900" : "text-slate-600"}`}>
                          {page.name}
                        </p>
                        {page.color && (
                          <Badge style={{ backgroundColor: page.color, color: "white", borderColor: page.color }} className="text-xs px-2 py-0.5">
                            {page.name}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{page.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            {selectedPages.length > 0 && (
              <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300 mt-3">
                {selectedPages.length} {selectedPages.length === 1 ? "página selecionada" : "páginas selecionadas"}
              </Badge>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-4 border-t mt-6">
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={updateMutation.isPending || (selectedPortals.length === 0 && selectedPages.length === 0)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  A processar...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  {mode === "add" ? "Adicionar a" : 
                   mode === "remove" ? "Remover de" : 
                   mode === "deactivate" ? "Desativar em" :
                   mode === "republish" ? "Republicar em" : 
                   "Substituir em"} {selectedPropertyIds.length} Imóveis
                </>
              )}
            </Button>
          </div>
        </TabsContent>

          {/* Scheduled Tab */}
          <TabsContent value="scheduled" className="space-y-6 mt-4">
            <Card className="border-purple-200 bg-purple-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-5 h-5 text-purple-600" />
                  <Label className="text-sm font-semibold">Agendar Publicação Futura</Label>
                </div>
                <p className="text-xs text-slate-600 mb-4">
                  Defina quando os imóveis devem ser publicados automaticamente
                </p>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm mb-1.5 block">Data de Publicação</Label>
                    <Input
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div>
                    <Label className="text-sm mb-1.5 block">Hora de Publicação</Label>
                    <Input
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="mt-4">
                  <Label className="text-sm mb-1.5 block">Notas (opcional)</Label>
                  <Textarea
                    value={scheduleNotes}
                    onChange={(e) => setScheduleNotes(e.target.value)}
                    placeholder="Ex: Publicação da campanha de primavera..."
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Portais Selection */}
            <div>
              <Label className="text-base font-semibold mb-3 block">Portais Imobiliários</Label>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                {AVAILABLE_PORTALS.map((portal) => {
                  const Icon = portal.icon;
                  const isSelected = selectedPortals.includes(portal.id);
                  
                  return (
                    <div
                      key={portal.id}
                      onClick={() => togglePortal(portal.id)}
                      className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        isSelected
                          ? "border-blue-500 bg-blue-50"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <Checkbox checked={isSelected} />
                      <Icon className={`w-5 h-5 ${isSelected ? portal.color : "text-slate-400"}`} />
                      <span className={`font-medium text-sm ${isSelected ? "text-slate-900" : "text-slate-600"}`}>
                        {portal.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Pages Selection */}
            <div>
              <Label className="text-base font-semibold mb-3 block">Páginas do Website</Label>
              <div className="space-y-2">
                {AVAILABLE_PAGES.map((page) => {
                  const Icon = page.icon;
                  const isSelected = selectedPages.includes(page.id);
                  
                  return (
                    <div
                      key={page.id}
                      onClick={() => togglePage(page.id)}
                      className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        isSelected
                          ? "border-green-500 bg-green-50"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <Checkbox checked={isSelected} className="mt-0.5" />
                      <Icon className={`w-5 h-5 mt-0.5 ${isSelected ? "text-green-600" : "text-slate-400"}`} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className={`font-medium text-sm ${isSelected ? "text-slate-900" : "text-slate-600"}`}>
                            {page.name}
                          </p>
                          {page.color && (
                            <Badge style={{ backgroundColor: page.color, color: "white", borderColor: page.color }} className="text-xs px-2 py-0.5">
                              {page.name}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{page.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t">
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  setMode("schedule");
                  handleSubmit();
                }}
                disabled={updateMutation.isPending || (selectedPortals.length === 0 && selectedPages.length === 0) || !scheduledDate || !scheduledTime}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    A agendar...
                  </>
                ) : (
                  <>
                    <Calendar className="w-4 h-4 mr-2" />
                    Agendar para {selectedPropertyIds.length} Imóveis
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          {/* Logs Tab */}
          <TabsContent value="logs" className="mt-4">
            {logsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              </div>
            ) : recentLogs.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-600">Sem registos de publicação</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {recentLogs.map((log) => (
                  <Card key={log.id} className={
                    log.status === "success" ? "border-green-200 bg-green-50" :
                    log.status === "failed" ? "border-red-200 bg-red-50" :
                    "border-slate-200"
                  }>
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                          log.status === "success" ? "bg-green-500" :
                          log.status === "failed" ? "bg-red-500" :
                          "bg-slate-400"
                        }`}>
                          {log.status === "success" ? (
                            <CheckCircle2 className="w-4 h-4 text-white" />
                          ) : log.status === "failed" ? (
                            <AlertCircle className="w-4 h-4 text-white" />
                          ) : (
                            <Clock className="w-4 h-4 text-white" />
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <p className="font-medium text-sm text-slate-900">
                                {log.property_title}
                                {log.property_ref_id && (
                                  <Badge variant="outline" className="ml-2 text-xs">
                                    {log.property_ref_id}
                                  </Badge>
                                )}
                              </p>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <Badge variant="outline" className="text-xs">
                                  {log.operation_type === "publish" ? "Publicação" :
                                   log.operation_type === "unpublish" ? "Remoção" :
                                   log.operation_type === "republish" ? "Republicação" : log.operation_type}
                                </Badge>
                                <Badge className={log.target_type === "portal" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}>
                                  {log.target_name}
                                </Badge>
                              </div>
                            </div>
                            
                            <div className="text-right text-xs text-slate-500 flex-shrink-0">
                              {new Date(log.created_date).toLocaleString('pt-PT', {
                                day: '2-digit',
                                month: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </div>
                          
                          {log.error_message && (
                            <div className="mt-2 p-2 bg-red-100 rounded text-xs text-red-800">
                              <AlertCircle className="w-3 h-3 inline mr-1" />
                              {log.error_message}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            
            <div className="flex justify-end pt-4 border-t mt-4">
              <Button variant="outline" onClick={handleClose}>
                Fechar
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}