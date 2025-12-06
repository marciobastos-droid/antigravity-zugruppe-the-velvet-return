import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, Building2, AlertCircle, CheckCircle2, Loader2, Settings, Eye } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

export default function CasafariSync() {
  const queryClient = useQueryClient();
  const [testingConfig, setTestingConfig] = React.useState(false);

  const { data: casafariImoveis = [], isLoading } = useQuery({
    queryKey: ['casafariImoveis'],
    queryFn: () => base44.entities.ImoveisCasafari.list('-UltimaAtualizacao', 100)
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

  const syncMutation = useMutation({
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
                Sincronização Casafari
              </CardTitle>
              <p className="text-sm text-slate-600 mt-2">
                Importe imóveis automaticamente dos feeds de alertas da Casafari
              </p>
            </div>
            <Badge variant="outline" className="bg-white">
              {casafariImoveis.length} imóveis
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Status & Actions */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-600" />
              Configuração
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-slate-600">
                Configure as seguintes variáveis de ambiente no painel Base44:
              </p>
              <ul className="text-xs space-y-1 text-slate-500 list-disc list-inside">
                <li>CASAFARI_EMAIL</li>
                <li>CASAFARI_PASSWORD</li>
                <li>CASAFARI_FEED_ID</li>
                <li>LAST_SYNC_CHECKPOINT</li>
              </ul>
            </div>
            <Button
              onClick={() => testConfigMutation.mutate()}
              disabled={testConfigMutation.isPending}
              variant="outline"
              className="w-full"
            >
              {testConfigMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  A testar...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Testar Configuração
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-green-600" />
              Sincronização
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {lastSync && (
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-xs text-green-700 mb-1">Última sincronização:</p>
                <p className="text-sm font-medium text-green-900">
                  {format(new Date(lastSync), "d 'de' MMMM 'às' HH:mm", { locale: pt })}
                </p>
              </div>
            )}
            <Button
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {syncMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  A sincronizar...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Sincronizar Agora
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Properties */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Imóveis Recentes ({casafariImoveis.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : casafariImoveis.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600">Nenhum imóvel sincronizado</p>
              <p className="text-sm text-slate-500 mt-1">Execute a sincronização para importar dados</p>
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
                      {imovel.PrecoVenda && (
                        <span>€{imovel.PrecoVenda.toLocaleString()}</span>
                      )}
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

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-medium mb-1">Como funciona:</p>
              <ol className="list-decimal list-inside space-y-1 text-blue-800">
                <li>Configure as credenciais da Casafari no painel de segredos</li>
                <li>Teste a configuração para verificar se está tudo correto</li>
                <li>Execute a sincronização para importar imóveis dos seus feeds</li>
                <li>Os imóveis são guardados na entidade ImoveisCasafari</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}