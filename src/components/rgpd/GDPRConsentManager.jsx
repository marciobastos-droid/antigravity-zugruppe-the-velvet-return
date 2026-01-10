import React from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Shield, CheckCircle2, XCircle, AlertCircle, Calendar, Mail, Phone, FileText } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function GDPRConsentManager({ contact, onUpdate }) {
  const queryClient = useQueryClient();
  const [consentMethod, setConsentMethod] = React.useState(contact?.rgpd_consent_method || "website");

  const updateConsentMutation = useMutation({
    mutationFn: async (updates) => {
      const logData = {
        contact_id: contact.id,
        contact_email: contact.email,
        action_type: updates.rgpd_consent ? "consent_granted" : "consent_revoked",
        consent_type: "data_processing",
        description: updates.rgpd_consent 
          ? `Consentimento concedido via ${updates.rgpd_consent_method}`
          : "Consentimento revogado",
        performed_by: (await base44.auth.me()).email,
        performed_by_name: (await base44.auth.me()).full_name,
        consent_method: updates.rgpd_consent_method,
        legal_basis: "consent",
        request_status: "completed",
        completion_date: new Date().toISOString()
      };

      await base44.entities.GDPRLog.create(logData);
      return await base44.entities.ClientContact.update(contact.id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientContacts'] });
      toast.success("Consentimento atualizado");
      onUpdate?.();
    },
    onError: (error) => {
      toast.error("Erro ao atualizar consentimento: " + error.message);
    }
  });

  const handleConsentToggle = (field, value) => {
    const updates = {
      [field]: value,
      [`${field}_date`]: value ? new Date().toISOString() : undefined,
      rgpd_consent_method: value ? consentMethod : contact.rgpd_consent_method
    };

    if (field === "rgpd_consent" && !value) {
      updates.rgpd_consent_revoked = true;
      updates.rgpd_consent_revoked_date = new Date().toISOString();
    }

    updateConsentMutation.mutate(updates);
  };

  const sendConsentRequestMutation = useMutation({
    mutationFn: async () => {
      await base44.integrations.Core.SendEmail({
        to: contact.email,
        subject: "Pedido de Consentimento RGPD - ZuGruppe",
        body: `
Caro(a) ${contact.full_name},

No âmbito do Regulamento Geral sobre a Proteção de Dados (RGPD), solicitamos o seu consentimento para o tratamento dos seus dados pessoais.

Para dar o seu consentimento, por favor aceda ao seguinte link:
${window.location.origin}/app/RGPDConsent?email=${encodeURIComponent(contact.email)}

Os dados que pretendemos tratar:
- Dados de contacto (nome, email, telefone)
- Preferências de imóveis
- Histórico de comunicações

Finalidade do tratamento:
- Fornecer serviços imobiliários
- Comunicação sobre imóveis que possam interessar
- Melhoria dos nossos serviços

Para mais informações, consulte a nossa Política de Privacidade.

Com os melhores cumprimentos,
Equipa ZuGruppe
        `
      });

      await base44.entities.ClientContact.update(contact.id, {
        rgpd_request_sent_date: new Date().toISOString()
      });

      await base44.entities.GDPRLog.create({
        contact_id: contact.id,
        contact_email: contact.email,
        action_type: "consent_request_sent",
        description: "Email de pedido de consentimento enviado",
        performed_by: (await base44.auth.me()).email,
        performed_by_name: (await base44.auth.me()).full_name,
        legal_basis: "consent",
        request_status: "completed",
        completion_date: new Date().toISOString()
      });
    },
    onSuccess: () => {
      toast.success("Pedido de consentimento enviado");
      queryClient.invalidateQueries({ queryKey: ['clientContacts'] });
    },
    onError: (error) => {
      toast.error("Erro ao enviar pedido: " + error.message);
    }
  });

  const consentStatus = contact.rgpd_consent && !contact.rgpd_consent_revoked;

  return (
    <Card className="border-2 border-blue-200">
      <CardHeader className="bg-blue-50">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Shield className="w-5 h-5 text-blue-600" />
          Gestão RGPD
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        {/* Estado Geral */}
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
          <div>
            <p className="font-medium text-slate-900">Estado do Consentimento</p>
            <p className="text-xs text-slate-600 mt-1">
              {contact.rgpd_consent_date && format(new Date(contact.rgpd_consent_date), "dd/MM/yyyy HH:mm", { locale: ptBR })}
            </p>
          </div>
          {consentStatus ? (
            <Badge className="bg-green-600 text-white">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Consentimento Válido
            </Badge>
          ) : contact.rgpd_consent_revoked ? (
            <Badge className="bg-red-600 text-white">
              <XCircle className="w-3 h-3 mr-1" />
              Revogado
            </Badge>
          ) : (
            <Badge className="bg-amber-600 text-white">
              <AlertCircle className="w-3 h-3 mr-1" />
              Sem Consentimento
            </Badge>
          )}
        </div>

        <Separator />

        {/* Método de Consentimento */}
        <div className="space-y-2">
          <Label>Método de Obtenção</Label>
          <Select value={consentMethod} onValueChange={setConsentMethod}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="presencial">Presencial</SelectItem>
              <SelectItem value="telefone">Telefone</SelectItem>
              <SelectItem value="website">Website</SelectItem>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
              <SelectItem value="outro">Outro</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Consentimentos Específicos */}
        <div className="space-y-4">
          <h4 className="font-semibold text-sm text-slate-900">Tipos de Consentimento</h4>
          
          {/* Processamento de Dados */}
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex-1">
              <Label className="font-medium text-slate-900">Processamento de Dados</Label>
              <p className="text-xs text-slate-600 mt-1">
                Tratamento de dados pessoais para prestação de serviços
              </p>
            </div>
            <Switch
              checked={contact.rgpd_data_processing_consent || false}
              onCheckedChange={(v) => handleConsentToggle("rgpd_data_processing_consent", v)}
              disabled={updateConsentMutation.isPending}
            />
          </div>

          {/* Marketing */}
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex-1">
              <Label className="font-medium text-slate-900">Comunicações de Marketing</Label>
              <p className="text-xs text-slate-600 mt-1">
                Envio de newsletters, ofertas e promoções
              </p>
            </div>
            <Switch
              checked={contact.rgpd_marketing_consent || false}
              onCheckedChange={(v) => handleConsentToggle("rgpd_marketing_consent", v)}
              disabled={updateConsentMutation.isPending}
            />
          </div>

          {/* Partilha com Terceiros */}
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex-1">
              <Label className="font-medium text-slate-900">Partilha com Parceiros</Label>
              <p className="text-xs text-slate-600 mt-1">
                Partilha de dados com parceiros imobiliários de confiança
              </p>
            </div>
            <Switch
              checked={contact.rgpd_third_party_sharing_consent || false}
              onCheckedChange={(v) => handleConsentToggle("rgpd_third_party_sharing_consent", v)}
              disabled={updateConsentMutation.isPending}
            />
          </div>
        </div>

        <Separator />

        {/* Informações Adicionais */}
        <div className="space-y-2 text-xs text-slate-600">
          {contact.rgpd_request_sent_date && (
            <div className="flex items-center gap-2">
              <Mail className="w-3 h-3" />
              <span>Último pedido enviado: {format(new Date(contact.rgpd_request_sent_date), "dd/MM/yyyy", { locale: ptBR })}</span>
            </div>
          )}
          {contact.rgpd_consent_revoked_date && (
            <div className="flex items-center gap-2">
              <XCircle className="w-3 h-3 text-red-600" />
              <span>Revogado em: {format(new Date(contact.rgpd_consent_revoked_date), "dd/MM/yyyy", { locale: ptBR })}</span>
            </div>
          )}
        </div>

        <Separator />

        {/* Ações */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => sendConsentRequestMutation.mutate()}
            disabled={sendConsentRequestMutation.isPending}
            className="flex-1"
          >
            <Mail className="w-4 h-4 mr-2" />
            Enviar Pedido de Consentimento
          </Button>
        </div>

        {/* Aviso Legal */}
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-amber-800">
              <p className="font-medium mb-1">Obrigações Legais RGPD</p>
              <ul className="space-y-0.5 list-disc list-inside">
                <li>Consentimento deve ser livre, específico e informado</li>
                <li>Titular pode revogar a qualquer momento</li>
                <li>Dados devem ser eliminados após revogação (salvo obrigação legal)</li>
                <li>Responder a pedidos em 30 dias (prorrogável 60 dias)</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}