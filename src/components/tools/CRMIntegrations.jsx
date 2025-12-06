import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Trash2, Edit, RefreshCw, CheckCircle, XCircle, Activity, Settings, AlertCircle } from "lucide-react";
import moment from "moment";

export default function CRMIntegrations() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIntegration, setEditingIntegration] = useState(null);
  const [testingId, setTestingId] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    crm_type: "salesforce",
    api_url: "",
    api_key: "",
    field_mapping: {},
    sync_on_create: true,
    sync_on_update: true,
    is_active: true
  });

  const { data: integrations = [] } = useQuery({
    queryKey: ['crmIntegrations'],
    queryFn: () => base44.entities.CRMIntegration.list('-created_date')
  });

  const { data: syncLogs = [] } = useQuery({
    queryKey: ['crmSyncLogs'],
    queryFn: () => base44.entities.CRMSyncLog.list('-created_date', 100)
  });

  const { data: propertySchema } = useQuery({
    queryKey: ['propertySchema'],
    queryFn: () => base44.entities.Property.schema()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.CRMIntegration.create(data),
    onSuccess: () => {
      toast.success("Integração criada");
      queryClient.invalidateQueries({ queryKey: ['crmIntegrations'] });
      setDialogOpen(false);
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CRMIntegration.update(id, data),
    onSuccess: () => {
      toast.success("Integração atualizada");
      queryClient.invalidateQueries({ queryKey: ['crmIntegrations'] });
      setDialogOpen(false);
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CRMIntegration.delete(id),
    onSuccess: () => {
      toast.success("Integração removida");
      queryClient.invalidateQueries({ queryKey: ['crmIntegrations'] });
    }
  });

  const testMutation = useMutation({
    mutationFn: async (integrationId) => {
      const response = await base44.functions.invoke('testCRMIntegration', { integration_id: integrationId });
      return response.data;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success("Conexão testada com sucesso!");
      } else {
        toast.error(`Erro: ${data.error}`);
      }
      setTestingId(null);
    },
    onError: () => {
      toast.error("Erro ao testar conexão");
      setTestingId(null);
    }
  });

  const syncAllMutation = useMutation({
    mutationFn: async (integrationId) => {
      const response = await base44.functions.invoke('syncAllPropertiesToCRM', { integration_id: integrationId });
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(`Sincronização iniciada: ${data.synced} imóveis`);
      queryClient.invalidateQueries({ queryKey: ['crmSyncLogs'] });
    }
  });

  const resetForm = () => {
    setFormData({
      name: "",
      crm_type: "salesforce",
      api_url: "",
      api_key: "",
      field_mapping: {},
      sync_on_create: true,
      sync_on_update: true,
      is_active: true
    });
    setEditingIntegration(null);
  };

  const handleEdit = (integration) => {
    setEditingIntegration(integration);
    setFormData({
      name: integration.name,
      crm_type: integration.crm_type,
      api_url: integration.api_url || "",
      api_key: integration.api_key || "",
      field_mapping: integration.field_mapping || {},
      sync_on_create: integration.sync_on_create ?? true,
      sync_on_update: integration.sync_on_update ?? true,
      is_active: integration.is_active ?? true
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingIntegration) {
      updateMutation.mutate({ id: editingIntegration.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleFieldMappingChange = (appField, crmField) => {
    setFormData(prev => ({
      ...prev,
      field_mapping: {
        ...prev.field_mapping,
        [appField]: crmField
      }
    }));
  };

  const removeFieldMapping = (appField) => {
    const newMapping = { ...formData.field_mapping };
    delete newMapping[appField];
    setFormData(prev => ({ ...prev, field_mapping: newMapping }));
  };

  const availableFields = propertySchema ? Object.keys(propertySchema.properties) : [];

  const crmTemplates = {
    salesforce: {
      name: "Salesforce",
      commonFields: {
        title: "Name",
        price: "Price__c",
        address: "Street",
        city: "City",
        state: "State",
        description: "Description"
      }
    },
    hubspot: {
      name: "HubSpot",
      commonFields: {
        title: "name",
        price: "price",
        address: "address",
        city: "city",
        state: "state",
        description: "description"
      }
    },
    pipedrive: {
      name: "Pipedrive",
      commonFields: {
        title: "title",
        price: "value",
        address: "address",
        city: "city",
        state: "state"
      }
    }
  };

  const applyTemplate = () => {
    const template = crmTemplates[formData.crm_type];
    if (template) {
      setFormData(prev => ({
        ...prev,
        field_mapping: template.commonFields
      }));
      toast.success("Template aplicado");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Integrações CRM</h2>
          <p className="text-slate-600">Configure e sincronize com CRMs externos</p>
        </div>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Integração
        </Button>
      </div>

      <Tabs defaultValue="integrations">
        <TabsList>
          <TabsTrigger value="integrations">Integrações</TabsTrigger>
          <TabsTrigger value="logs">Logs de Sincronização</TabsTrigger>
        </TabsList>

        <TabsContent value="integrations" className="space-y-4">
          {integrations.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Settings className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Nenhuma integração configurada</h3>
                <p className="text-slate-600 mb-4">Comece por adicionar uma integração CRM</p>
                <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Integração
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {integrations.map((integration) => (
                <Card key={integration.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {integration.name}
                          {integration.is_active ? (
                            <Badge className="bg-green-100 text-green-800">Ativo</Badge>
                          ) : (
                            <Badge className="bg-slate-100 text-slate-800">Inativo</Badge>
                          )}
                        </CardTitle>
                        <CardDescription>{crmTemplates[integration.crm_type]?.name || integration.crm_type}</CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(integration)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => {
                          if (confirm(`Remover integração "${integration.name}"?`)) {
                            deleteMutation.mutate(integration.id);
                          }
                        }}>
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-sm space-y-1">
                      <p className="text-slate-600">
                        <strong>Campos mapeados:</strong> {Object.keys(integration.field_mapping || {}).length}
                      </p>
                      {integration.last_sync && (
                        <p className="text-slate-600">
                          <strong>Última sincronização:</strong> {moment(integration.last_sync).fromNow()}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setTestingId(integration.id);
                          testMutation.mutate(integration.id);
                        }}
                        disabled={testingId === integration.id}
                      >
                        {testingId === integration.id ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            A testar...
                          </>
                        ) : (
                          <>
                            <Activity className="w-4 h-4 mr-2" />
                            Testar Conexão
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => syncAllMutation.mutate(integration.id)}
                        disabled={syncAllMutation.isPending}
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Sincronizar Todos
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          {syncLogs.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Activity className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600">Nenhum log de sincronização disponível</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b">
                      <tr>
                        <th className="text-left p-3 text-sm font-semibold text-slate-900">Data</th>
                        <th className="text-left p-3 text-sm font-semibold text-slate-900">Integração</th>
                        <th className="text-left p-3 text-sm font-semibold text-slate-900">Imóvel</th>
                        <th className="text-left p-3 text-sm font-semibold text-slate-900">Ação</th>
                        <th className="text-left p-3 text-sm font-semibold text-slate-900">Status</th>
                        <th className="text-left p-3 text-sm font-semibold text-slate-900">Mensagem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {syncLogs.map((log) => (
                        <tr key={log.id} className="border-b hover:bg-slate-50">
                          <td className="p-3 text-sm text-slate-600">
                            {moment(log.created_date).format('DD/MM/YYYY HH:mm')}
                          </td>
                          <td className="p-3 text-sm text-slate-900">{log.integration_name}</td>
                          <td className="p-3 text-sm text-slate-900">{log.property_title}</td>
                          <td className="p-3">
                            <Badge variant="outline">{log.action}</Badge>
                          </td>
                          <td className="p-3">
                            {log.status === 'success' ? (
                              <Badge className="bg-green-100 text-green-800">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Sucesso
                              </Badge>
                            ) : (
                              <Badge className="bg-red-100 text-red-800">
                                <XCircle className="w-3 h-3 mr-1" />
                                Erro
                              </Badge>
                            )}
                          </td>
                          <td className="p-3 text-sm text-slate-600">
                            {log.error_message || log.external_id || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog de Configuração */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingIntegration ? 'Editar' : 'Nova'} Integração CRM</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6 mt-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Nome da Integração *</Label>
                <Input
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Salesforce Principal"
                />
              </div>
              <div>
                <Label>Tipo de CRM *</Label>
                <Select value={formData.crm_type} onValueChange={(v) => setFormData({ ...formData, crm_type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="salesforce">Salesforce</SelectItem>
                    <SelectItem value="hubspot">HubSpot</SelectItem>
                    <SelectItem value="pipedrive">Pipedrive</SelectItem>
                    <SelectItem value="zoho">Zoho CRM</SelectItem>
                    <SelectItem value="custom">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>URL da API</Label>
              <Input
                value={formData.api_url}
                onChange={(e) => setFormData({ ...formData, api_url: e.target.value })}
                placeholder="https://api.exemplo.com"
              />
            </div>

            <div>
              <Label>Chave de API / Token</Label>
              <Input
                type="password"
                value={formData.api_key}
                onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                placeholder="Insira a chave de API"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div>
                <p className="font-medium text-slate-900">Sincronizar ao criar imóvel</p>
                <p className="text-sm text-slate-600">Enviar automaticamente novos imóveis</p>
              </div>
              <Switch
                checked={formData.sync_on_create}
                onCheckedChange={(checked) => setFormData({ ...formData, sync_on_create: checked })}
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div>
                <p className="font-medium text-slate-900">Sincronizar ao atualizar imóvel</p>
                <p className="text-sm text-slate-600">Enviar atualizações automaticamente</p>
              </div>
              <Switch
                checked={formData.sync_on_update}
                onCheckedChange={(checked) => setFormData({ ...formData, sync_on_update: checked })}
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div>
                <p className="font-medium text-slate-900">Integração Ativa</p>
                <p className="text-sm text-slate-600">Ativar/desativar esta integração</p>
              </div>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>

            {/* Mapeamento de Campos */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label>Mapeamento de Campos</Label>
                <Button type="button" variant="outline" size="sm" onClick={applyTemplate}>
                  Aplicar Template
                </Button>
              </div>
              
              <div className="border rounded-lg p-4 space-y-3 max-h-64 overflow-y-auto">
                {Object.entries(formData.field_mapping).map(([appField, crmField]) => (
                  <div key={appField} className="flex gap-2 items-center">
                    <Input value={appField} disabled className="flex-1" />
                    <span className="text-slate-400">→</span>
                    <Input
                      value={crmField}
                      onChange={(e) => handleFieldMappingChange(appField, e.target.value)}
                      placeholder="Campo no CRM"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFieldMapping(appField)}
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                ))}
              </div>

              <Select
                onValueChange={(field) => {
                  if (!formData.field_mapping[field]) {
                    handleFieldMappingChange(field, '');
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Adicionar campo..." />
                </SelectTrigger>
                <SelectContent>
                  {availableFields
                    .filter(f => !formData.field_mapping[f])
                    .map(field => (
                      <SelectItem key={field} value={field}>{field}</SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>

              <div className="flex items-start gap-2 text-sm text-slate-600 bg-blue-50 p-3 rounded-lg">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <p>Configure o mapeamento entre os campos da aplicação e os campos do seu CRM externo.</p>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">
                Cancelar
              </Button>
              <Button type="submit" className="flex-1">
                {editingIntegration ? 'Guardar' : 'Criar'} Integração
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}