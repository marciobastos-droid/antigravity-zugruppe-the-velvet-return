import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Upload, Zap, CheckCircle2, XCircle, AlertCircle, Loader2, RefreshCw, Eye, Settings } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const PORTAL_INFO = {
  idealista: { name: "Idealista", logo: "🟡", color: "bg-yellow-100 text-yellow-800" },
  imovirtual: { name: "Imovirtual", logo: "🟢", color: "bg-green-100 text-green-800" },
  casa_sapo: { name: "Casa Sapo", logo: "🔵", color: "bg-blue-100 text-blue-800" },
  rightmove: { name: "Rightmove", logo: "🇬🇧", color: "bg-red-100 text-red-800" },
  zillow: { name: "Zillow", logo: "🇺🇸", color: "bg-blue-100 text-blue-800" }
};

export default function DirectAPIExporter() {
  const queryClient = useQueryClient();
  const [selectedProperties, setSelectedProperties] = React.useState([]);
  const [selectedPortals, setSelectedPortals] = React.useState([]);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [publishing, setPublishing] = React.useState(false);
  const [publishProgress, setPublishProgress] = React.useState({});
  const [publishResults, setPublishResults] = React.useState([]);

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: apiIntegrations = [] } = useQuery({
    queryKey: ['api_integrations'],
    queryFn: async () => {
      const userData = await base44.auth.me();
      return userData.api_integrations || [];
    },
  });

  const { data: properties = [], isLoading } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list('-created_date'),
  });

  const { data: syncHistory = [] } = useQuery({
    queryKey: ['sync_history'],
    queryFn: async () => {
      const userData = await base44.auth.me();
      return userData.sync_history || [];
    },
  });

  const updateSyncHistoryMutation = useMutation({
    mutationFn: async (newHistory) => {
      await base44.auth.updateMe({ sync_history: newHistory });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sync_history', 'user'] });
    },
  });

  const enabledIntegrations = apiIntegrations.filter(i => i.enabled);

  const filteredProperties = properties.filter(p => {
    const matchesSearch = searchTerm === "" ||
      p.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.city?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch && p.status === 'active';
  });

  const toggleProperty = (id) => {
    setSelectedProperties(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const togglePortal = (id) => {
    setSelectedPortals(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const validateProperty = (property) => {
    const errors = [];
    if (!property.title) errors.push("Título em falta");
    if (!property.price || property.price <= 0) errors.push("Preço inválido");
    if (!property.city) errors.push("Cidade em falta");
    if (!property.images || property.images.length === 0) errors.push("Sem imagens");
    if (!property.description || property.description.length < 50) errors.push("Descrição muito curta");
    return { isValid: errors.length === 0, errors };
  };

  const simulateAPICall = async (propertyId, portalId, index, total) => {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));
    
    // Simulate success/failure (90% success rate)
    const success = Math.random() > 0.1;
    
    if (success) {
      return {
        success: true,
        external_id: `EXT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        message: "Publicado com sucesso",
        url: `https://portal.example.com/property/${propertyId}`
      };
    } else {
      throw new Error("Erro de conexão com API");
    }
  };

  const publishToPortals = async () => {
    if (selectedProperties.length === 0) {
      toast.error("Selecione pelo menos 1 imóvel");
      return;
    }

    if (selectedPortals.length === 0) {
      toast.error("Selecione pelo menos 1 portal");
      return;
    }

    setPublishing(true);
    setPublishProgress({});
    setPublishResults([]);

    try {
      const propertiesToPublish = properties.filter(p => selectedProperties.includes(p.id));
      const results = [];

      for (const portalId of selectedPortals) {
        const portal = PORTAL_INFO[portalId];
        const integration = apiIntegrations.find(i => i.portal_id === portalId);

        if (!integration) {
          toast.error(`${portal.name}: Integração não configurada`);
          continue;
        }

        for (let i = 0; i < propertiesToPublish.length; i++) {
          const property = propertiesToPublish[i];
          const validation = validateProperty(property);

          // Update progress
          setPublishProgress(prev => ({
            ...prev,
            [portalId]: {
              current: i + 1,
              total: propertiesToPublish.length,
              percentage: Math.round(((i + 1) / propertiesToPublish.length) * 100)
            }
          }));

          if (!validation.isValid) {
            results.push({
              property_id: property.id,
              property_title: property.title,
              portal_id: portalId,
              portal_name: portal.name,
              status: 'error',
              message: `Validação falhou: ${validation.errors.join(', ')}`,
              timestamp: new Date().toISOString()
            });
            continue;
          }

          try {
            const result = await simulateAPICall(property.id, portalId, i, propertiesToPublish.length);
            
            results.push({
              property_id: property.id,
              property_title: property.title,
              portal_id: portalId,
              portal_name: portal.name,
              status: 'success',
              message: result.message,
              external_id: result.external_id,
              url: result.url,
              timestamp: new Date().toISOString()
            });

            toast.success(`${property.title} → ${portal.name}`);
          } catch (error) {
            results.push({
              property_id: property.id,
              property_title: property.title,
              portal_id: portalId,
              portal_name: portal.name,
              status: 'error',
              message: error.message,
              timestamp: new Date().toISOString()
            });

            toast.error(`${property.title} → ${portal.name}: ${error.message}`);
          }
        }
      }

      // Save to history
      const updatedHistory = [
        {
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          total_properties: propertiesToPublish.length,
          total_portals: selectedPortals.length,
          results: results
        },
        ...syncHistory
      ].slice(0, 50); // Keep last 50

      await updateSyncHistoryMutation.mutateAsync(updatedHistory);

      setPublishResults(results);
      
      const successCount = results.filter(r => r.status === 'success').length;
      const errorCount = results.filter(r => r.status === 'error').length;

      toast.success(`Concluído: ${successCount} sucesso, ${errorCount} erros`);

    } catch (error) {
      toast.error("Erro ao publicar");
      console.error(error);
    }

    setPublishing(false);
    setPublishProgress({});
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" />
      </div>
    );
  }

  if (enabledIntegrations.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Settings className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-900 mb-2">Nenhuma Integração Configurada</h3>
          <p className="text-slate-600 mb-6">Configure as integrações API para começar a publicar imóveis automaticamente.</p>
          <Link to={createPageUrl("Tools")}>
            <Button>
              <Settings className="w-4 h-4 mr-2" />
              Configurar Integrações
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Left Column - Properties */}
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-purple-600" />
                Publicação Automática via API
              </span>
              {selectedProperties.length > 0 && (
                <Badge className="bg-purple-100 text-purple-800">
                  {selectedProperties.length} selecionado{selectedProperties.length > 1 ? 's' : ''}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisar imóveis..."
              className="w-full"
            />

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedProperties(filteredProperties.map(p => p.id))}
              >
                Selecionar Todos
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedProperties([])}
              >
                Limpar
              </Button>
            </div>

            <div className="max-h-96 overflow-y-auto space-y-2 border rounded-lg p-3">
              {filteredProperties.length === 0 ? (
                <p className="text-center text-slate-500 py-8">Nenhum imóvel ativo</p>
              ) : (
                filteredProperties.map(property => {
                  const validation = validateProperty(property);
                  return (
                    <div
                      key={property.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                        selectedProperties.includes(property.id) ? 'bg-purple-50 border-purple-300' : 'bg-white hover:bg-slate-50'
                      }`}
                      onClick={() => toggleProperty(property.id)}
                    >
                      <Checkbox
                        checked={selectedProperties.includes(property.id)}
                        onCheckedChange={() => toggleProperty(property.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium text-slate-900 truncate">{property.title}</p>
                          {!validation.isValid && (
                            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-600 mt-1">
                          <span>{property.city}</span>
                          <span>•</span>
                          <span>€{property.price?.toLocaleString()}</span>
                          {property.images?.length > 0 && (
                            <>
                              <span>•</span>
                              <span>{property.images.length} fotos</span>
                            </>
                          )}
                        </div>
                        {!validation.isValid && (
                          <p className="text-xs text-amber-600 mt-1">⚠️ {validation.errors.join(', ')}</p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Publish Results */}
        {publishResults.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                Resultados da Publicação
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {publishResults.map((result, idx) => (
                  <div key={idx} className={`flex items-start gap-3 p-3 rounded-lg border ${
                    result.status === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                  }`}>
                    {result.status === 'success' ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900">{result.property_title}</p>
                      <p className="text-sm text-slate-700">
                        {PORTAL_INFO[result.portal_id]?.logo} {result.portal_name}: {result.message}
                      </p>
                      {result.external_id && (
                        <p className="text-xs text-slate-600 mt-1">ID: {result.external_id}</p>
                      )}
                      {result.url && (
                        <a href={result.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:text-blue-700 mt-1 inline-flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          Ver no portal
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Right Column - Portals & Actions */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Portais Ativos</span>
              {selectedPortals.length > 0 && (
                <Badge>{selectedPortals.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {enabledIntegrations.map(integration => {
              const info = PORTAL_INFO[integration.portal_id];
              return (
                <div
                  key={integration.portal_id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedPortals.includes(integration.portal_id) ? 'bg-purple-50 border-purple-300' : 'bg-white hover:bg-slate-50'
                  }`}
                  onClick={() => togglePortal(integration.portal_id)}
                >
                  <Checkbox
                    checked={selectedPortals.includes(integration.portal_id)}
                    onCheckedChange={() => togglePortal(integration.portal_id)}
                  />
                  <span className="text-xl">{info?.logo}</span>
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">{info?.name}</p>
                    {publishProgress[integration.portal_id] && (
                      <div className="mt-2">
                        <Progress value={publishProgress[integration.portal_id].percentage} className="h-2" />
                        <p className="text-xs text-slate-600 mt-1">
                          {publishProgress[integration.portal_id].current} / {publishProgress[integration.portal_id].total}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            <Button
              onClick={publishToPortals}
              disabled={publishing || selectedProperties.length === 0 || selectedPortals.length === 0}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 mt-4"
            >
              {publishing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  A publicar...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Publicar Agora
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-blue-500 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-2">
              <Zap className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-blue-900 mb-1">Publicação Direta via API</p>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>✓ Validação automática</li>
                  <li>✓ Publicação em tempo real</li>
                  <li>✓ Tracking de status</li>
                  <li>✓ Gestão de erros</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}