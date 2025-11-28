import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  MessageSquare, Settings, CheckCircle2, XCircle, 
  RefreshCw, Eye, EyeOff, Copy, ExternalLink, Loader2,
  Phone, Key, Building2, Shield
} from "lucide-react";
import { toast } from "sonner";

export default function WhatsAppAgentConfig() {
  const queryClient = useQueryClient();
  const [showToken, setShowToken] = React.useState(false);
  const [testing, setTesting] = React.useState(false);
  const [config, setConfig] = React.useState({
    phone_number_id: "",
    access_token: "",
    business_account_id: "",
    webhook_verify_token: "",
    is_active: false
  });

  const { data: user, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  React.useEffect(() => {
    if (user?.whatsapp_config) {
      setConfig({
        phone_number_id: user.whatsapp_config.phone_number_id || "",
        access_token: user.whatsapp_config.access_token || "",
        business_account_id: user.whatsapp_config.business_account_id || "",
        webhook_verify_token: user.whatsapp_config.webhook_verify_token || generateVerifyToken(),
        is_active: user.whatsapp_config.is_active || false
      });
    } else {
      setConfig(prev => ({
        ...prev,
        webhook_verify_token: generateVerifyToken()
      }));
    }
  }, [user]);

  const generateVerifyToken = () => {
    return 'wa_' + Math.random().toString(36).substring(2, 15);
  };

  const saveMutation = useMutation({
    mutationFn: async (whatsappConfig) => {
      await base44.auth.updateMe({ whatsapp_config: whatsappConfig });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      toast.success("Configuração WhatsApp guardada!");
    },
    onError: (error) => {
      toast.error("Erro ao guardar: " + error.message);
    }
  });

  const handleSave = () => {
    saveMutation.mutate(config);
  };

  const testConnection = async () => {
    if (!config.phone_number_id || !config.access_token) {
      toast.error("Preencha o Phone Number ID e Access Token");
      return;
    }

    setTesting(true);
    try {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${config.phone_number_id}`,
        {
          headers: {
            'Authorization': `Bearer ${config.access_token}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        toast.success(`Conexão OK! Número: ${data.display_phone_number || data.verified_name}`);
        setConfig(prev => ({ ...prev, is_active: true }));
      } else {
        const error = await response.json();
        toast.error(`Erro: ${error.error?.message || 'Credenciais inválidas'}`);
        setConfig(prev => ({ ...prev, is_active: false }));
      }
    } catch (error) {
      toast.error("Erro ao testar conexão");
    }
    setTesting(false);
  };

  const copyWebhookUrl = () => {
    const webhookUrl = `${window.location.origin}/api/webhooks/whatsapp`;
    navigator.clipboard.writeText(webhookUrl);
    toast.success("URL copiado!");
  };

  const copyVerifyToken = () => {
    navigator.clipboard.writeText(config.webhook_verify_token);
    toast.success("Token copiado!");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card className={config.is_active ? "border-green-500 bg-green-50" : "border-slate-200"}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${config.is_active ? 'bg-green-500' : 'bg-slate-300'}`}>
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">WhatsApp Business</h3>
                <p className="text-sm text-slate-600">
                  {config.is_active ? 'Integração ativa' : 'Não configurado'}
                </p>
              </div>
            </div>
            {config.is_active ? (
              <Badge className="bg-green-600">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Conectado
              </Badge>
            ) : (
              <Badge variant="outline" className="text-slate-500">
                <XCircle className="w-3 h-3 mr-1" />
                Desconectado
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Configuration Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Configuração da API
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <h4 className="font-medium text-blue-900 mb-2">📋 Como obter as credenciais:</h4>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>Aceda ao <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer" className="underline">Meta for Developers</a></li>
              <li>Crie ou selecione uma app com WhatsApp Business</li>
              <li>Em WhatsApp → API Setup, encontre o Phone Number ID</li>
              <li>Gere um Access Token permanente em System Users</li>
            </ol>
          </div>

          <div className="grid gap-4">
            <div>
              <Label className="flex items-center gap-2 mb-1.5">
                <Phone className="w-4 h-4" />
                Phone Number ID
              </Label>
              <Input
                value={config.phone_number_id}
                onChange={(e) => setConfig(prev => ({ ...prev, phone_number_id: e.target.value }))}
                placeholder="Ex: 123456789012345"
              />
            </div>

            <div>
              <Label className="flex items-center gap-2 mb-1.5">
                <Key className="w-4 h-4" />
                Access Token
              </Label>
              <div className="relative">
                <Input
                  type={showToken ? "text" : "password"}
                  value={config.access_token}
                  onChange={(e) => setConfig(prev => ({ ...prev, access_token: e.target.value }))}
                  placeholder="EAAxxxxxxxx..."
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2"
                  onClick={() => setShowToken(!showToken)}
                >
                  {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <div>
              <Label className="flex items-center gap-2 mb-1.5">
                <Building2 className="w-4 h-4" />
                Business Account ID (opcional)
              </Label>
              <Input
                value={config.business_account_id}
                onChange={(e) => setConfig(prev => ({ ...prev, business_account_id: e.target.value }))}
                placeholder="Ex: 123456789012345"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              onClick={testConnection}
              variant="outline"
              disabled={testing}
              className="flex-1"
            >
              {testing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Testar Conexão
            </Button>
            <Button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {saveMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mr-2" />
              )}
              Guardar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Webhook Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Configuração do Webhook
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600">
            Configure o webhook na sua app Meta para receber mensagens automaticamente.
          </p>

          <div>
            <Label className="mb-1.5 block">Webhook URL</Label>
            <div className="flex gap-2">
              <Input
                value={`${window.location.origin}/api/webhooks/whatsapp`}
                readOnly
                className="bg-slate-50"
              />
              <Button variant="outline" onClick={copyWebhookUrl}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div>
            <Label className="mb-1.5 block">Verify Token</Label>
            <div className="flex gap-2">
              <Input
                value={config.webhook_verify_token}
                readOnly
                className="bg-slate-50 font-mono text-sm"
              />
              <Button variant="outline" onClick={copyVerifyToken}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <div>
              <p className="font-medium text-slate-900">Sincronização automática</p>
              <p className="text-sm text-slate-500">Receber mensagens em tempo real</p>
            </div>
            <Switch
              checked={config.is_active}
              onCheckedChange={(checked) => setConfig(prev => ({ ...prev, is_active: checked }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Help Link */}
      <div className="text-center">
        <a
          href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
        >
          <ExternalLink className="w-4 h-4" />
          Documentação oficial da API WhatsApp
        </a>
      </div>
    </div>
  );
}