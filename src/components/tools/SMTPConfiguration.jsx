import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, CheckCircle, AlertCircle, Info, Eye, EyeOff, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export default function SMTPConfiguration() {
  const queryClient = useQueryClient();
  const [showPassword, setShowPassword] = React.useState(false);
  const [testEmail, setTestEmail] = React.useState("");
  const [testing, setTesting] = React.useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ['smtpSettings'],
    queryFn: async () => {
      const settings = await base44.entities.SMTPSettings.list();
      return settings[0];
    },
  });

  const [formData, setFormData] = React.useState({
    smtp_host: "smtp.gmail.com",
    smtp_port: 587,
    smtp_user: "",
    smtp_password: "",
    smtp_secure: true,
    from_name: "",
    from_email: "",
    is_active: true
  });

  React.useEffect(() => {
    if (settings) {
      setFormData({
        smtp_host: settings.smtp_host || "smtp.gmail.com",
        smtp_port: settings.smtp_port || 587,
        smtp_user: settings.smtp_user || "",
        smtp_password: settings.smtp_password || "",
        smtp_secure: settings.smtp_secure !== undefined ? settings.smtp_secure : true,
        from_name: settings.from_name || "",
        from_email: settings.from_email || "",
        is_active: settings.is_active !== undefined ? settings.is_active : true
      });
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (settings) {
        return await base44.entities.SMTPSettings.update(settings.id, data);
      } else {
        return await base44.entities.SMTPSettings.create(data);
      }
    },
    onSuccess: () => {
      toast.success("Configurações SMTP guardadas com sucesso");
      queryClient.invalidateQueries({ queryKey: ['smtpSettings'] });
    },
    onError: () => {
      toast.error("Erro ao guardar configurações");
    }
  });

  const handleSave = () => {
    if (!formData.smtp_user || !formData.smtp_password) {
      toast.error("Preencha o utilizador e palavra-passe SMTP");
      return;
    }
    saveMutation.mutate(formData);
  };

  const handleTest = async () => {
    if (!testEmail) {
      toast.error("Insira um email de teste");
      return;
    }

    if (!settings?.smtp_user) {
      toast.error("Configure e guarde as credenciais SMTP primeiro");
      return;
    }

    setTesting(true);
    try {
      await base44.integrations.Core.SendEmail({
        to: testEmail,
        subject: "Email de Teste - Configuração SMTP",
        body: `
          <h2>Configuração SMTP Bem-sucedida!</h2>
          <p>Este é um email de teste para confirmar que a configuração do servidor SMTP está a funcionar corretamente.</p>
          <p><strong>Servidor:</strong> ${formData.smtp_host}</p>
          <p><strong>Porta:</strong> ${formData.smtp_port}</p>
          <p><strong>Utilizador:</strong> ${formData.smtp_user}</p>
          <p>Se recebeu este email, a configuração está correta!</p>
        `
      });
      toast.success("Email de teste enviado com sucesso!");
    } catch (error) {
      toast.error("Erro ao enviar email de teste: " + (error.message || "Erro desconhecido"));
    }
    setTesting(false);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Configuração SMTP do Google
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <Info className="w-4 h-4" />
            <AlertDescription>
              <strong>Como configurar Gmail/Google Workspace:</strong>
              <ol className="list-decimal ml-4 mt-2 space-y-1 text-sm">
                <li>Aceda à sua conta Google em <a href="https://myaccount.google.com/security" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">myaccount.google.com/security <ExternalLink className="w-3 h-3" /></a></li>
                <li>Ative a "Verificação em 2 passos" (se ainda não estiver ativada)</li>
                <li>Procure por "App passwords" ou "Palavras-passe de aplicação"</li>
                <li>Crie uma nova palavra-passe de aplicação para "Mail"</li>
                <li>Copie a palavra-passe gerada (16 caracteres) e cole abaixo</li>
              </ol>
            </AlertDescription>
          </Alert>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Servidor SMTP *</Label>
              <Input
                value={formData.smtp_host}
                onChange={(e) => setFormData({...formData, smtp_host: e.target.value})}
                placeholder="smtp.gmail.com"
              />
            </div>

            <div>
              <Label>Porta SMTP *</Label>
              <Select 
                value={formData.smtp_port.toString()} 
                onValueChange={(v) => setFormData({...formData, smtp_port: parseInt(v)})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="587">587 (TLS - Recomendado)</SelectItem>
                  <SelectItem value="465">465 (SSL)</SelectItem>
                  <SelectItem value="25">25 (Sem encriptação)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Email / Utilizador SMTP *</Label>
              <Input
                type="email"
                value={formData.smtp_user}
                onChange={(e) => setFormData({...formData, smtp_user: e.target.value})}
                placeholder="seu.email@gmail.com"
              />
            </div>

            <div>
              <Label>Palavra-passe / App Password *</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={formData.smtp_password}
                  onChange={(e) => setFormData({...formData, smtp_password: e.target.value})}
                  placeholder="••••••••••••••••"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <Label>Nome do Remetente</Label>
              <Input
                value={formData.from_name}
                onChange={(e) => setFormData({...formData, from_name: e.target.value})}
                placeholder="Zugruppe Imóveis"
              />
            </div>

            <div>
              <Label>Email do Remetente</Label>
              <Input
                type="email"
                value={formData.from_email}
                onChange={(e) => setFormData({...formData, from_email: e.target.value})}
                placeholder="noreply@zugruppe.com"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-4 border-t">
            <Button 
              onClick={handleSave} 
              disabled={saveMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {saveMutation.isPending ? "A guardar..." : "Guardar Configurações"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {settings && (
        <Card className="border-green-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <CheckCircle className="w-5 h-5" />
              Testar Configuração
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 mb-4">
              Envie um email de teste para verificar se a configuração está correta.
            </p>
            <div className="flex gap-2">
              <Input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="email.teste@exemplo.com"
                className="flex-1"
              />
              <Button 
                onClick={handleTest} 
                disabled={testing || !testEmail}
                variant="outline"
                className="border-green-500 text-green-700 hover:bg-green-50"
              >
                {testing ? "A enviar..." : "Enviar Teste"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {settings && (
        <Alert className="bg-blue-50 border-blue-200">
          <AlertCircle className="w-4 h-4 text-blue-600" />
          <AlertDescription className="text-blue-900">
            <strong>Configuração atual:</strong><br />
            Servidor: {settings.smtp_host}:{settings.smtp_port} | Utilizador: {settings.smtp_user}
            {settings.is_active ? " ✓ Ativo" : " ✗ Inativo"}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}