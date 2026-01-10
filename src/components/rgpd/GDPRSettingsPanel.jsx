import React from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Settings, Calendar, Trash2, AlertCircle, CheckCircle2, Loader2, Shield } from "lucide-react";
import { toast } from "sonner";

export default function GDPRSettingsPanel() {
  const [retentionDays, setRetentionDays] = React.useState(1095); // 3 anos padrão
  const [autoCleanupEnabled, setAutoCleanupEnabled] = React.useState(false);

  const runRetentionMutation = useMutation({
    mutationFn: async () => {
      const { data } = await base44.functions.invoke('processDataRetention', {
        retention_days: retentionDays
      });
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Processamento concluído: ${data.anonymized} contacto(s) anonimizado(s)`);
    },
    onError: (error) => {
      toast.error("Erro ao processar retenção: " + error.message);
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-purple-100 rounded-lg">
          <Settings className="w-6 h-6 text-purple-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Configurações RGPD</h2>
          <p className="text-sm text-slate-600">Gerir políticas de retenção e conformidade</p>
        </div>
      </div>

      {/* Política de Retenção */}
      <Card className="border-purple-200">
        <CardHeader className="bg-purple-50">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-600" />
            Política de Retenção de Dados
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Obrigação Legal RGPD</p>
                <p>
                  Os dados pessoais devem ser conservados apenas pelo tempo necessário para as finalidades
                  para as quais são tratados. Após este período, devem ser anonimizados ou eliminados.
                </p>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <Label className="text-sm font-medium mb-2 block">
                Período de Retenção (dias)
              </Label>
              <Input
                type="number"
                min="365"
                max="3650"
                value={retentionDays}
                onChange={(e) => setRetentionDays(Number(e.target.value))}
                className="text-lg"
              />
              <p className="text-xs text-slate-500 mt-1">
                ≈ {Math.floor(retentionDays / 365)} ano(s) e {retentionDays % 365} dia(s)
              </p>
              
              <div className="mt-3 space-y-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setRetentionDays(1095)}
                  className="w-full"
                >
                  3 anos (Recomendado)
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setRetentionDays(1825)}
                  className="w-full"
                >
                  5 anos (Dados fiscais)
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setRetentionDays(3650)}
                  className="w-full"
                >
                  10 anos (Contratos)
                </Button>
              </div>
            </div>

            <div>
              <div className="p-4 bg-slate-50 rounded-lg border h-full flex flex-col justify-between">
                <div>
                  <h4 className="font-semibold text-slate-900 mb-3">O que será processado:</h4>
                  <ul className="space-y-2 text-sm text-slate-700">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>Contactos sem consentimento RGPD</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>Sem atividade há mais de {retentionDays} dias</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>Sem oportunidades ou contratos ativos</span>
                    </li>
                  </ul>
                </div>
                
                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded border border-amber-200">
                    ⚠️ Dados serão anonimizados, não eliminados completamente
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <Button
              onClick={() => runRetentionMutation.mutate()}
              disabled={runRetentionMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {runRetentionMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  A processar...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Executar Limpeza Manual
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas de Conformidade */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Estatísticas de Conformidade</CardTitle>
        </CardHeader>
        <CardContent>
          <ConformityStats />
        </CardContent>
      </Card>

      {/* Informações Legais */}
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-2">
            <Shield className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-amber-800">
              <p className="font-medium mb-2">Notas Legais Importantes</p>
              <ul className="space-y-1 text-xs">
                <li>• <strong>Artigo 5º RGPD:</strong> Princípio da limitação da conservação</li>
                <li>• <strong>Prazo mínimo:</strong> 3 anos para fins de gestão de clientes</li>
                <li>• <strong>Prazo fiscal:</strong> 5 anos para documentos com relevância fiscal</li>
                <li>• <strong>Contratos:</strong> 10 anos após conclusão (Código Civil)</li>
                <li>• <strong>Anonimização:</strong> Preserva histórico para estatísticas sem dados pessoais</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ConformityStats() {
  const { data: contacts = [] } = useQuery({
    queryKey: ['clientContacts'],
    queryFn: () => base44.entities.ClientContact.list()
  });

  const stats = React.useMemo(() => {
    const total = contacts.length;
    const withConsent = contacts.filter(c => c.rgpd_data_processing_consent).length;
    const withoutConsent = total - withConsent;
    const revoked = contacts.filter(c => c.rgpd_consent_revoked).length;
    const marketingConsent = contacts.filter(c => c.rgpd_marketing_consent).length;
    const thirdPartyConsent = contacts.filter(c => c.rgpd_third_party_sharing_consent).length;

    return {
      total,
      withConsent,
      withoutConsent,
      revoked,
      marketingConsent,
      thirdPartyConsent,
      consentRate: total > 0 ? ((withConsent / total) * 100).toFixed(1) : 0
    };
  }, [contacts]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
        <p className="text-xs text-green-600 mb-1">Com Consentimento</p>
        <p className="text-3xl font-bold text-green-700">{stats.withConsent}</p>
        <p className="text-xs text-green-600 mt-1">{stats.consentRate}% do total</p>
      </div>

      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <p className="text-xs text-amber-600 mb-1">Sem Consentimento</p>
        <p className="text-3xl font-bold text-amber-700">{stats.withoutConsent}</p>
        <p className="text-xs text-amber-600 mt-1">Requer atenção</p>
      </div>

      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-xs text-red-600 mb-1">Revogados</p>
        <p className="text-3xl font-bold text-red-700">{stats.revoked}</p>
        <p className="text-xs text-red-600 mt-1">Não contactar</p>
      </div>

      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs text-blue-600 mb-1">Marketing</p>
        <p className="text-3xl font-bold text-blue-700">{stats.marketingConsent}</p>
        <p className="text-xs text-blue-600 mt-1">Podem receber</p>
      </div>
    </div>
  );
}