import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, Building2, AlertCircle, CheckCircle2, Loader2, Settings, Eye, Download, TrendingUp, Database } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function CasafariSync() {
  const queryClient = useQueryClient();
  const [syncResults, setSyncResults] = React.useState(null);

  const { data: casafariImoveis = [], isLoading: loadingCasafari } = useQuery({
    queryKey: ['casafariImoveis'],
    queryFn: () => base44.entities.ImoveisCasafari.list('-UltimaAtualizacao', 100)
  });

  const { data: importedProperties = [], isLoading: loadingProps } = useQuery({
    queryKey: ['casafariProperties'],
    queryFn: async () => {
      const props = await base44.entities.Property.filter({ tags: 'Casafari' });
      return props.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).slice(0, 50);
    }
  });

  const testConfigMutation = useMutation({
    mutationFn: () => base44.functions.invoke('testCasafariConfig'),
    onSuccess: (response) => {
      const data = response.data;
      if (data.success && data.details.allConfigured) {
        toast.success(data.message);
      } else {
        toast.error(data.message);
      }
    },
    onError: () => {
      toast.error("Erro ao testar configuração");
    }
  });

  const importMutation = useMutation({
    mutationFn: () => base44.functions.invoke('importCasafariToProperties'),
    onSuccess: (response) => {
      const data = response.data;
      if (data.success) {
        setSyncResults(data);
        toast.success(data.message);
        queryClient.invalidateQueries({ queryKey: ['casafariProperties'] });
        queryClient.invalidateQueries({ queryKey: ['properties'] });
        queryClient.invalidateQueries({ queryKey: ['myProperties'] });
      } else {
        toast.error(data.error || "Erro na importação");
      }
    },
    onError: (error) => {
      toast.error("Erro ao importar: " + (error.message || "Erro desconhecido"));
    }
  });

  const syncLegacyMutation = useMutation({
    mutationFn: () => base44.functions.invoke('syncCasafari'),
    onSuccess: (response) => {
      const data = response.data;
      if (data.success) {
        toast.success(data.message);
        queryClient.invalidateQueries({ queryKey: ['casafariImoveis'] });
      } else {
        toast.error(data.error || "Erro na sincronização");
      }
    },
    onError: (error) => {
      toast.error("Erro ao sincronizar: " + (error.message || "Erro desconhecido"));
    }
  });

  const lastSync = casafariImoveis.length > 0 
    ? casafariImoveis[0].UltimaAtualizacao 
    : null;

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Building2 className="w-6 h-6 text-orange-600" />
                Integração Casafari
              </CardTitle>
              <p className="text-sm text-slate-600 mt-2">
                Importe e sincronize imóveis automaticamente dos feeds Casafari
              </p>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline" className="bg-white">
                {importedProperties.length} importados
              </Badge>
              <Badge className="bg-orange-100 text-orange-800">
                {casafariImoveis.length} no feed
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Sync Results */}
      {syncResults && (
        <Card className="border-green-300 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
              <div className="flex-1">
                <p className="font-semibold text-green-900">Sincronização Concluída!</p>
                <p className="text-sm text-green-700">
                  {syncResults.imported} novos • {syncResults.updated} atualizados • {syncResults.errors} erros
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSyncResults(null)}
              >
                ✕
              </Button>
            </div>
            {syncResults.total > 0 && (
              <Progress 
                value={((syncResults.imported + syncResults.updated) / syncResults.total) * 100} 
                className="mt-3 h-2"
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Importados</p>
                <p className="text-2xl font-bold text-slate-900">{importedProperties.length}</p>
              </div>
              <Database className="w-8 h-8 text-blue-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">No Feed</p>
                <p className="text-2xl font-bold text-slate-900">{casafariImoveis.length}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-orange-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Última Sync</p>
                <p className="text-sm font-semibold text-slate-900">
                  {lastSync ? format(new Date(lastSync), "dd/MM HH:mm") : 'Nunca'}
                </p>
              </div>
              <RefreshCw className="w-8 h-8 text-green-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="grid md:grid-cols-2 gap-4">
        <Button
          onClick={() => testConfigMutation.mutate()}
          disabled={testConfigMutation.isPending}
          variant="outline"
          className="h-auto py-4"
        >
          {testConfigMutation.isPending ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              A testar configuração...
            </>
          ) : (
            <>
              <Settings className="w-5 h-5 mr-2" />
              <div className="text-left">
                <div className="font-semibold">Testar Configuração</div>
                <div className="text-xs text-slate-500">Verificar credenciais Casafari</div>
              </div>
            </>
          )}
        </Button>

        <Button
          onClick={() => importMutation.mutate()}
          disabled={importMutation.isPending}
          className="h-auto py-4 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700"
        >
          {importMutation.isPending ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              A importar para Property...
            </>
          ) : (
            <>
              <Download className="w-5 h-5 mr-2" />
              <div className="text-left">
                <div className="font-semibold">Importar para Property</div>
                <div className="text-xs opacity-90">Sincronizar feeds → imóveis</div>
              </div>
            </>
          )}
        </Button>
      </div>

      <Tabs defaultValue="properties" className="mt-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="properties">Imóveis Importados</TabsTrigger>
          <TabsTrigger value="feed">Feed Casafari (Raw)</TabsTrigger>
        </TabsList>

        {/* Imported Properties Tab */}
        <TabsContent value="properties" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Imóveis na Entidade Property ({importedProperties.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingProps ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                </div>
              ) : importedProperties.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-600">Nenhum imóvel importado ainda</p>
                  <p className="text-sm text-slate-500 mt-1">Clique em "Importar para Property" acima</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {importedProperties.map((property) => (
                    <div
                      key={property.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 truncate">
                          {property.title}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                          <span>{property.ref_id}</span>
                          {property.city && <span>📍 {property.city}</span>}
                          {property.price && <span>€{property.price.toLocaleString()}</span>}
                          {property.bedrooms > 0 && <span>T{property.bedrooms}</span>}
                        </div>
                      </div>
                      <Badge className="ml-3 bg-green-100 text-green-800">
                        {property.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Feed Raw Data Tab */}
        <TabsContent value="feed" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  Feed Casafari Raw ({casafariImoveis.length})
                </CardTitle>
                <Button
                  onClick={() => syncLegacyMutation.mutate()}
                  disabled={syncLegacyMutation.isPending}
                  variant="outline"
                  size="sm"
                >
                  {syncLegacyMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      A sincronizar...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Atualizar Feed
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingCasafari ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                </div>
              ) : casafariImoveis.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-600">Nenhum dado no feed</p>
                  <p className="text-sm text-slate-500 mt-1">Os dados raw da Casafari aparecem aqui</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {casafariImoveis.map((imovel) => (
                    <div
                      key={imovel.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 truncate">
                          {imovel.Titulo || 'Sem título'}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                          {imovel.Tipo && <span>{imovel.Tipo}</span>}
                          {imovel.PrecoVenda && <span>€{imovel.PrecoVenda.toLocaleString()}</span>}
                          {imovel.Quartos && <span>{imovel.Quartos} quartos</span>}
                        </div>
                      </div>
                      <Badge variant="outline" className="ml-3">
                        {imovel.StatusVenda || 'N/A'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-medium mb-2">Como funciona:</p>
              <ol className="list-decimal list-inside space-y-1 text-blue-800">
                <li>Configure as credenciais no painel Base44 (Settings → Secrets)</li>
                <li>Teste a configuração com o botão acima</li>
                <li>Clique em "Importar para Property" para sincronizar</li>
                <li>Os imóveis são mapeados e guardados como Property</li>
                <li>Atualização automática do LAST_SYNC_CHECKPOINT</li>
              </ol>
              <p className="mt-3 text-xs text-blue-700">
                <strong>Nota:</strong> Após cada sincronização bem-sucedida, atualize manualmente a variável LAST_SYNC_CHECKPOINT no painel de segredos com o novo checkpoint sugerido.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}