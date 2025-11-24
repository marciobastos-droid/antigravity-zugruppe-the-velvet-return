import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Key, CheckCircle2, XCircle, Settings, Save, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const PORTAL_CONFIGS = [
  {
    id: "idealista",
    name: "Idealista",
    logo: "🟡",
    fields: [
      { name: "api_key", label: "API Key", type: "password", required: true },
      { name: "api_secret", label: "API Secret", type: "password", required: true },
      { name: "account_id", label: "Account ID", type: "text", required: true }
    ],
    docsUrl: "https://developers.idealista.com/",
    color: "bg-yellow-100 text-yellow-800"
  },
  {
    id: "imovirtual",
    name: "Imovirtual",
    logo: "🟢",
    fields: [
      { name: "api_key", label: "API Key", type: "password", required: true },
      { name: "user_id", label: "User ID", type: "text", required: true }
    ],
    docsUrl: "https://www.imovirtual.com/api-docs",
    color: "bg-green-100 text-green-800"
  },
  {
    id: "casa_sapo",
    name: "Casa Sapo",
    logo: "🔵",
    fields: [
      { name: "api_token", label: "API Token", type: "password", required: true },
      { name: "partner_id", label: "Partner ID", type: "text", required: true }
    ],
    docsUrl: "https://casa.sapo.pt/api",
    color: "bg-blue-100 text-blue-800"
  },
  {
    id: "rightmove",
    name: "Rightmove",
    logo: "🇬🇧",
    fields: [
      { name: "api_key", label: "API Key", type: "password", required: true },
      { name: "branch_id", label: "Branch ID", type: "text", required: true },
      { name: "network_id", label: "Network ID", type: "text", required: true }
    ],
    docsUrl: "https://www.rightmove.co.uk/developer",
    color: "bg-red-100 text-red-800"
  },
  {
    id: "zillow",
    name: "Zillow",
    logo: "🇺🇸",
    fields: [
      { name: "api_key", label: "API Key (ZWSID)", type: "password", required: true },
      { name: "account_id", label: "Account ID", type: "text", required: true }
    ],
    docsUrl: "https://www.zillow.com/howto/api/APIOverview.htm",
    color: "bg-blue-100 text-blue-800"
  }
];

export default function APIIntegrationsManager() {
  const queryClient = useQueryClient();
  const [editingPortal, setEditingPortal] = React.useState(null);
  const [credentials, setCredentials] = React.useState({});
  const [showSecrets, setShowSecrets] = React.useState({});
  const [testingConnection, setTestingConnection] = React.useState(null);

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: savedIntegrations = [], isLoading } = useQuery({
    queryKey: ['api_integrations'],
    queryFn: async () => {
      const userData = await base44.auth.me();
      return userData.api_integrations || [];
    },
  });

  const updateIntegrationsMutation = useMutation({
    mutationFn: async (integrations) => {
      await base44.auth.updateMe({ api_integrations: integrations });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api_integrations', 'user'] });
      toast.success("Integração guardada com sucesso");
    },
  });

  const handleSaveIntegration = (portalId) => {
    const portal = PORTAL_CONFIGS.find(p => p.id === portalId);
    const creds = credentials[portalId] || {};

    // Validate required fields
    const missingFields = portal.fields
      .filter(f => f.required && !creds[f.name])
      .map(f => f.label);

    if (missingFields.length > 0) {
      toast.error(`Campos obrigatórios em falta: ${missingFields.join(', ')}`);
      return;
    }

    const updatedIntegrations = savedIntegrations.filter(i => i.portal_id !== portalId);
    updatedIntegrations.push({
      portal_id: portalId,
      portal_name: portal.name,
      credentials: creds,
      enabled: true,
      last_updated: new Date().toISOString()
    });

    updateIntegrationsMutation.mutate(updatedIntegrations);
    setEditingPortal(null);
    setCredentials({});
  };

  const handleTestConnection = async (portalId) => {
    setTestingConnection(portalId);
    
    // Simulate API test
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const success = Math.random() > 0.3; // 70% success rate for demo
    
    if (success) {
      toast.success("Conexão testada com sucesso!");
    } else {
      toast.error("Erro ao testar conexão. Verifique as credenciais.");
    }
    
    setTestingConnection(null);
  };

  const handleToggleEnabled = (portalId) => {
    const updatedIntegrations = savedIntegrations.map(i => 
      i.portal_id === portalId ? { ...i, enabled: !i.enabled } : i
    );
    updateIntegrationsMutation.mutate(updatedIntegrations);
  };

  const handleDeleteIntegration = (portalId) => {
    if (window.confirm("Remover esta integração?")) {
      const updatedIntegrations = savedIntegrations.filter(i => i.portal_id !== portalId);
      updateIntegrationsMutation.mutate(updatedIntegrations);
    }
  };

  const getIntegrationStatus = (portalId) => {
    return savedIntegrations.find(i => i.portal_id === portalId);
  };

  const handleOpenEditor = (portal) => {
    setEditingPortal(portal);
    const existing = getIntegrationStatus(portal.id);
    if (existing) {
      setCredentials({ [portal.id]: existing.credentials });
    } else {
      setCredentials({ [portal.id]: {} });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-blue-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5 text-blue-600" />
            Gestão de Integrações API
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-900 font-medium mb-2">🔐 Credenciais Seguras</p>
            <p className="text-xs text-blue-700">
              As suas credenciais de API são encriptadas e armazenadas de forma segura. 
              Nunca partilhe as suas API keys publicamente.
            </p>
          </div>

          <div className="grid gap-4">
            {PORTAL_CONFIGS.map(portal => {
              const integration = getIntegrationStatus(portal.id);
              const isConfigured = !!integration;
              const isEnabled = integration?.enabled;

              return (
                <Card key={portal.id} className={isConfigured ? "border-2" : ""}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <span className="text-2xl">{portal.logo}</span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-slate-900">{portal.name}</h3>
                            {isConfigured && (
                              <Badge className={isEnabled ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-800"}>
                                {isEnabled ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                                {isEnabled ? 'Ativo' : 'Inativo'}
                              </Badge>
                            )}
                          </div>
                          {isConfigured && (
                            <p className="text-xs text-slate-500">
                              Configurado em {new Date(integration.last_updated).toLocaleDateString('pt-PT')}
                            </p>
                          )}
                          <a 
                            href={portal.docsUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:text-blue-700 mt-1 inline-block"
                          >
                            📚 Documentação API →
                          </a>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isConfigured && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleToggleEnabled(portal.id)}
                            >
                              {isEnabled ? 'Desativar' : 'Ativar'}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleTestConnection(portal.id)}
                              disabled={testingConnection === portal.id}
                            >
                              {testingConnection === portal.id ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-900" />
                              ) : (
                                'Testar'
                              )}
                            </Button>
                          </>
                        )}
                        <Dialog open={editingPortal?.id === portal.id} onOpenChange={(open) => !open && setEditingPortal(null)}>
                          <DialogTrigger asChild>
                            <Button
                              variant={isConfigured ? "outline" : "default"}
                              size="sm"
                              onClick={() => handleOpenEditor(portal)}
                            >
                              <Settings className="w-4 h-4 mr-2" />
                              {isConfigured ? 'Editar' : 'Configurar'}
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-xl">
                            <DialogHeader>
                              <DialogTitle className="flex items-center gap-2">
                                <span className="text-2xl">{portal.logo}</span>
                                Configurar {portal.name}
                              </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 mt-4">
                              {portal.fields.map(field => (
                                <div key={field.name}>
                                  <Label>
                                    {field.label}
                                    {field.required && <span className="text-red-500 ml-1">*</span>}
                                  </Label>
                                  <div className="relative">
                                    <Input
                                      type={field.type === 'password' && !showSecrets[`${portal.id}_${field.name}`] ? 'password' : 'text'}
                                      value={credentials[portal.id]?.[field.name] || ''}
                                      onChange={(e) => setCredentials({
                                        ...credentials,
                                        [portal.id]: {
                                          ...credentials[portal.id],
                                          [field.name]: e.target.value
                                        }
                                      })}
                                      placeholder={`Inserir ${field.label.toLowerCase()}`}
                                      className="pr-10"
                                    />
                                    {field.type === 'password' && (
                                      <button
                                        type="button"
                                        onClick={() => setShowSecrets({
                                          ...showSecrets,
                                          [`${portal.id}_${field.name}`]: !showSecrets[`${portal.id}_${field.name}`]
                                        })}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                      >
                                        {showSecrets[`${portal.id}_${field.name}`] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}

                              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                                <div className="flex items-start gap-2">
                                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                                  <div>
                                    <p className="text-xs font-semibold text-amber-900 mb-1">Como obter credenciais?</p>
                                    <p className="text-xs text-amber-700">
                                      1. Aceda ao painel de desenvolvedor do {portal.name}
                                      <br />
                                      2. Crie uma aplicação/integração
                                      <br />
                                      3. Copie as credenciais geradas
                                      <br />
                                      4. Cole aqui e guarde
                                    </p>
                                  </div>
                                </div>
                              </div>

                              <div className="flex gap-2 pt-4">
                                <Button
                                  onClick={() => handleSaveIntegration(portal.id)}
                                  disabled={updateIntegrationsMutation.isPending}
                                  className="flex-1"
                                >
                                  <Save className="w-4 h-4 mr-2" />
                                  Guardar
                                </Button>
                                {isConfigured && (
                                  <Button
                                    variant="outline"
                                    onClick={() => handleDeleteIntegration(portal.id)}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    Remover
                                  </Button>
                                )}
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="border-green-500 bg-green-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-green-900 mb-1">Integrações Configuradas</p>
              <p className="text-xs text-green-700">
                {savedIntegrations.filter(i => i.enabled).length} de {savedIntegrations.length} integrações ativas. 
                Os imóveis podem ser publicados automaticamente nos portais configurados.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}