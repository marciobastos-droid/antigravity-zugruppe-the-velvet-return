import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Plus, RefreshCw, Trash2, Edit, Play, Clock, CheckCircle, XCircle, AlertCircle, FileJson, FileCode, Link2, Settings, Eye } from "lucide-react";
import { toast } from "sonner";

const defaultFieldMapping = {
  external_id: 'id',
  title: 'title',
  description: 'description',
  property_type: 'type',
  listing_type: 'listing_type',
  price: 'price',
  currency: 'currency',
  bedrooms: 'bedrooms',
  bathrooms: 'bathrooms',
  square_feet: 'area',
  address: 'address',
  city: 'city',
  state: 'state',
  country: 'country',
  zip_code: 'postal_code',
  images: 'images',
  amenities: 'features'
};

export default function PropertyFeedsManager() {
  const queryClient = useQueryClient();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingFeed, setEditingFeed] = useState(null);
  const [logsDialogOpen, setLogsDialogOpen] = useState(false);
  const [selectedFeedLogs, setSelectedFeedLogs] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    feed_type: "xml",
    source_url: "",
    country: "Portugal",
    api_config: {
      method: "GET",
      auth_type: "none",
      headers: {},
      api_key: ""
    },
    field_mapping: defaultFieldMapping,
    sync_frequency: "daily",
    auto_publish: false,
    duplicate_handling: "update",
    is_active: true
  });

  const { data: feeds = [], isLoading } = useQuery({
    queryKey: ['propertyFeeds'],
    queryFn: () => base44.entities.PropertyFeed.list('-created_date')
  });

  const { data: syncLogs = [] } = useQuery({
    queryKey: ['feedSyncLogs', selectedFeedLogs],
    queryFn: () => {
      if (!selectedFeedLogs) return [];
      return base44.entities.FeedSyncLog.filter({ feed_id: selectedFeedLogs }).then(logs => 
        logs.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).slice(0, 20)
      );
    },
    enabled: !!selectedFeedLogs
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.PropertyFeed.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['propertyFeeds'] });
      toast.success("Feed criado!");
      setCreateDialogOpen(false);
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PropertyFeed.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['propertyFeeds'] });
      toast.success("Feed atualizado!");
      setCreateDialogOpen(false);
      setEditingFeed(null);
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.PropertyFeed.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['propertyFeeds'] });
      toast.success("Feed eliminado");
    }
  });

  const syncMutation = useMutation({
    mutationFn: async (feedId) => {
      const response = await base44.functions.invoke('syncPropertyFeed', { feed_id: feedId });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['propertyFeeds'] });
      queryClient.invalidateQueries({ queryKey: ['feedSyncLogs'] });
      toast.success(`Sincronização concluída: ${data.summary.created} criados, ${data.summary.updated} atualizados`);
    },
    onError: (error) => {
      toast.error("Erro na sincronização: " + error.message);
    }
  });

  const resetForm = () => {
    setFormData({
      name: "",
      feed_type: "xml",
      source_url: "",
      country: "Portugal",
      api_config: {
        method: "GET",
        auth_type: "none",
        headers: {},
        api_key: ""
      },
      field_mapping: defaultFieldMapping,
      sync_frequency: "daily",
      auto_publish: false,
      duplicate_handling: "update",
      is_active: true
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (editingFeed) {
      updateMutation.mutate({ id: editingFeed.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const statusColors = {
    success: "bg-green-100 text-green-800",
    error: "bg-red-100 text-red-800",
    partial: "bg-amber-100 text-amber-800",
    running: "bg-blue-100 text-blue-800"
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-12">A carregar...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Feeds de Imóveis</h2>
          <p className="text-slate-600">Integração com fontes externas de imóveis</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Novo Feed
        </Button>
      </div>

      {/* Feeds Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {feeds.map(feed => (
          <Card key={feed.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg mb-1">{feed.name}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {feed.feed_type === 'xml' ? <FileCode className="w-3 h-3 mr-1" /> : <FileJson className="w-3 h-3 mr-1" />}
                      {feed.feed_type.toUpperCase()}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {feed.country}
                    </Badge>
                  </div>
                </div>
                <Switch
                  checked={feed.is_active}
                  onCheckedChange={(checked) => 
                    updateMutation.mutate({ id: feed.id, data: { is_active: checked } })
                  }
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-sm">
                  <div className="flex items-center gap-2 text-slate-600 mb-1">
                    <Link2 className="w-3 h-3" />
                    <span className="truncate">{feed.source_url}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Clock className="w-3 h-3" />
                    Sync: {feed.sync_frequency}
                  </div>
                </div>

                {feed.last_sync_date && (
                  <div className="flex items-center justify-between text-xs p-2 bg-slate-50 rounded">
                    <span className="text-slate-600">Última sync:</span>
                    <Badge className={statusColors[feed.last_sync_status]}>
                      {feed.last_sync_status === 'success' ? <CheckCircle className="w-3 h-3 mr-1" /> :
                       feed.last_sync_status === 'error' ? <XCircle className="w-3 h-3 mr-1" /> :
                       <AlertCircle className="w-3 h-3 mr-1" />}
                      {feed.last_sync_status}
                    </Badge>
                  </div>
                )}

                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Importados:</span>
                  <span className="font-semibold">{feed.total_imported || 0}</span>
                </div>

                <div className="flex gap-2 pt-2 border-t">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => syncMutation.mutate(feed.id)}
                    disabled={syncMutation.isPending}
                    className="flex-1"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Sincronizar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedFeedLogs(feed.id);
                      setLogsDialogOpen(true);
                    }}
                  >
                    <Eye className="w-3 h-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingFeed(feed);
                      setFormData(feed);
                      setCreateDialogOpen(true);
                    }}
                  >
                    <Edit className="w-3 h-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => deleteMutation.mutate(feed.id)}
                    className="text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {feeds.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="p-12 text-center">
              <Link2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Nenhum feed configurado</h3>
              <p className="text-slate-600 mb-4">Crie o primeiro feed para importar imóveis</p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Criar Feed
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={(open) => {
        setCreateDialogOpen(open);
        if (!open) {
          setEditingFeed(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingFeed ? 'Editar' : 'Criar'} Feed</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6 mt-4">
            <Tabs defaultValue="basic">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">Básico</TabsTrigger>
                <TabsTrigger value="api">API Config</TabsTrigger>
                <TabsTrigger value="mapping">Mapeamento</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4 mt-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Nome do Feed *</Label>
                    <Input
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="Ex: Idealista Portugal"
                    />
                  </div>
                  <div>
                    <Label>Tipo *</Label>
                    <Select value={formData.feed_type} onValueChange={(v) => setFormData({...formData, feed_type: v})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="xml">XML Feed</SelectItem>
                        <SelectItem value="json">JSON Feed</SelectItem>
                        <SelectItem value="api">REST API</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>URL da Fonte *</Label>
                  <Input
                    required
                    value={formData.source_url}
                    onChange={(e) => setFormData({...formData, source_url: e.target.value})}
                    placeholder="https://example.com/feed.xml"
                  />
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label>País</Label>
                    <Input
                      value={formData.country}
                      onChange={(e) => setFormData({...formData, country: e.target.value})}
                      placeholder="Portugal"
                    />
                  </div>
                  <div>
                    <Label>Frequência</Label>
                    <Select value={formData.sync_frequency} onValueChange={(v) => setFormData({...formData, sync_frequency: v})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual">Manual</SelectItem>
                        <SelectItem value="hourly">Horária</SelectItem>
                        <SelectItem value="daily">Diária</SelectItem>
                        <SelectItem value="weekly">Semanal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Duplicados</Label>
                    <Select value={formData.duplicate_handling} onValueChange={(v) => setFormData({...formData, duplicate_handling: v})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="skip">Ignorar</SelectItem>
                        <SelectItem value="update">Atualizar</SelectItem>
                        <SelectItem value="create_new">Criar Novo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.auto_publish}
                      onCheckedChange={(checked) => setFormData({...formData, auto_publish: checked})}
                    />
                    <Label>Publicar automaticamente</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
                    />
                    <Label>Feed ativo</Label>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="api" className="space-y-4 mt-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Método HTTP</Label>
                    <Select 
                      value={formData.api_config.method} 
                      onValueChange={(v) => setFormData({
                        ...formData, 
                        api_config: {...formData.api_config, method: v}
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GET">GET</SelectItem>
                        <SelectItem value="POST">POST</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Tipo de Autenticação</Label>
                    <Select 
                      value={formData.api_config.auth_type} 
                      onValueChange={(v) => setFormData({
                        ...formData, 
                        api_config: {...formData.api_config, auth_type: v}
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhuma</SelectItem>
                        <SelectItem value="api_key">API Key</SelectItem>
                        <SelectItem value="bearer">Bearer Token</SelectItem>
                        <SelectItem value="basic">Basic Auth</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {formData.api_config.auth_type !== 'none' && (
                  <div>
                    <Label>API Key / Token</Label>
                    <Input
                      type="password"
                      value={formData.api_config.api_key}
                      onChange={(e) => setFormData({
                        ...formData,
                        api_config: {...formData.api_config, api_key: e.target.value}
                      })}
                      placeholder="Chave de acesso"
                    />
                  </div>
                )}
              </TabsContent>

              <TabsContent value="mapping" className="space-y-4 mt-4">
                <p className="text-sm text-slate-600 mb-4">
                  Mapeie os campos do feed externo para os campos internos. Use notação de ponto para campos aninhados (ex: address.street)
                </p>
                
                <Textarea
                  value={JSON.stringify(formData.field_mapping, null, 2)}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value);
                      setFormData({...formData, field_mapping: parsed});
                    } catch {}
                  }}
                  rows={15}
                  className="font-mono text-sm"
                />
                
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFormData({...formData, field_mapping: defaultFieldMapping})}
                >
                  Resetar para padrão
                </Button>
              </TabsContent>
            </Tabs>

            <div className="flex gap-3 pt-4 border-t">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setCreateDialogOpen(false);
                  setEditingFeed(null);
                  resetForm();
                }}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button type="submit" className="flex-1">
                {editingFeed ? 'Atualizar' : 'Criar'} Feed
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Sync Logs Dialog */}
      <Dialog open={logsDialogOpen} onOpenChange={setLogsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Histórico de Sincronizações</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 mt-4">
            {syncLogs.map(log => (
              <Card key={log.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <Badge className={statusColors[log.status]}>
                        {log.status}
                      </Badge>
                      <p className="text-xs text-slate-500 mt-1">
                        {new Date(log.created_date).toLocaleString('pt-PT')} • {log.duration_seconds}s
                      </p>
                    </div>
                    <Badge variant="outline">{log.sync_type}</Badge>
                  </div>

                  <div className="grid grid-cols-4 gap-4 text-center">
                    <div>
                      <p className="text-xs text-slate-500">Encontrados</p>
                      <p className="text-lg font-bold">{log.properties_found}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Criados</p>
                      <p className="text-lg font-bold text-green-600">{log.properties_created}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Atualizados</p>
                      <p className="text-lg font-bold text-blue-600">{log.properties_updated}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Ignorados</p>
                      <p className="text-lg font-bold text-slate-600">{log.properties_skipped}</p>
                    </div>
                  </div>

                  {log.errors?.length > 0 && (
                    <div className="mt-3 p-3 bg-red-50 rounded border border-red-200">
                      <p className="text-sm font-semibold text-red-900 mb-2">Erros ({log.errors.length}):</p>
                      <div className="space-y-1">
                        {log.errors.slice(0, 3).map((err, idx) => (
                          <p key={idx} className="text-xs text-red-700">
                            • {err.property_ref}: {err.error}
                          </p>
                        ))}
                        {log.errors.length > 3 && (
                          <p className="text-xs text-red-600">... e mais {log.errors.length - 3}</p>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {syncLogs.length === 0 && (
              <div className="text-center py-8 text-slate-500">
                <Clock className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                <p className="text-sm">Nenhuma sincronização registada</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}