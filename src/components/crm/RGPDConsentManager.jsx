import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Shield, Mail, CheckCircle, XCircle, Send, Loader2, AlertTriangle, Clock, FileText } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

export default function RGPDConsentManager({ contact, onUpdate }) {
  const queryClient = useQueryClient();
  const [sendConsentDialogOpen, setSendConsentDialogOpen] = useState(false);
  const [manualConsentDialogOpen, setManualConsentDialogOpen] = useState(false);
  const [manualConsent, setManualConsent] = useState({
    method: "presencial",
    data_processing: true,
    marketing: false,
    third_party: false
  });

  const sendConsentEmailMutation = useMutation({
    mutationFn: async () => {
      // Generate unique consent token
      const consentToken = `${contact.id}_${Date.now()}`;
      const consentUrl = `${window.location.origin}/rgpd-consent?token=${consentToken}&contact_id=${contact.id}`;

      const emailBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #0f172a; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e2e8f0; }
    .button { display: inline-block; background: #0f172a; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-radius: 0 0 8px 8px; }
    .info-box { background: #f1f5f9; padding: 15px; border-left: 4px solid #0f172a; margin: 20px 0; }
    h2 { color: #0f172a; margin-top: 0; }
    ul { padding-left: 20px; }
    li { margin: 10px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin:0;">🔒 Pedido de Consentimento RGPD</h1>
    </div>
    
    <div class="content">
      <h2>Olá ${contact.full_name},</h2>
      
      <p>
        Em conformidade com o <strong>Regulamento Geral de Proteção de Dados (RGPD)</strong>, 
        solicitamos o seu consentimento para processarmos os seus dados pessoais.
      </p>

      <div class="info-box">
        <strong>📋 Que dados recolhemos:</strong>
        <ul>
          <li>Nome completo, email e telefone</li>
          <li>Preferências de imóveis e histórico de pesquisas</li>
          <li>Interações com a nossa plataforma</li>
        </ul>
      </div>

      <div class="info-box">
        <strong>🎯 Finalidade do tratamento:</strong>
        <ul>
          <li>Prestar serviços imobiliários solicitados</li>
          <li>Enviar informações sobre imóveis do seu interesse</li>
          <li>Comunicar sobre os nossos serviços (apenas com o seu consentimento)</li>
        </ul>
      </div>

      <div class="info-box">
        <strong>✅ Os seus direitos:</strong>
        <ul>
          <li>Acesso aos seus dados pessoais</li>
          <li>Retificação de dados incorretos</li>
          <li>Eliminação dos dados ("direito ao esquecimento")</li>
          <li>Limitação do tratamento</li>
          <li>Portabilidade dos dados</li>
          <li>Oposição ao tratamento</li>
          <li>Revogar o consentimento a qualquer momento</li>
        </ul>
      </div>

      <p style="text-align: center; margin: 30px 0;">
        <a href="${consentUrl}" class="button">
          ✓ Aceitar e Dar Consentimento
        </a>
      </p>

      <p style="font-size: 14px; color: #64748b;">
        <strong>Nota:</strong> Pode revogar o seu consentimento a qualquer momento contactando-nos através do email 
        ou através da área de cliente na nossa plataforma.
      </p>

      <p style="font-size: 14px; color: #64748b; margin-top: 20px;">
        Para mais informações sobre como tratamos os seus dados, consulte a nossa 
        <a href="${window.location.origin}/politica-privacidade" style="color: #0f172a;">Política de Privacidade</a>.
      </p>
    </div>
    
    <div class="footer">
      <p>Este email foi enviado por Zugruppe - Real Estate CRM</p>
      <p>Se não solicitou esta informação, pode ignorar este email.</p>
    </div>
  </div>
</body>
</html>
      `;

      await base44.integrations.Core.SendEmail({
        to: contact.email,
        subject: "🔒 Consentimento RGPD - Proteção dos Seus Dados",
        body: emailBody
      });

      // Update contact with request sent date
      await base44.entities.ClientContact.update(contact.id, {
        rgpd_request_sent_date: new Date().toISOString()
      });
    },
    onSuccess: () => {
      toast.success("Email de consentimento RGPD enviado!");
      setSendConsentDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['clientContact'] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
    onError: (error) => {
      toast.error("Erro ao enviar email: " + error.message);
    }
  });

  const registerManualConsentMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.ClientContact.update(contact.id, {
        rgpd_consent: true,
        rgpd_consent_date: new Date().toISOString(),
        rgpd_consent_method: manualConsent.method,
        rgpd_data_processing_consent: manualConsent.data_processing,
        rgpd_marketing_consent: manualConsent.marketing,
        rgpd_third_party_sharing_consent: manualConsent.third_party,
        rgpd_consent_revoked: false
      });
    },
    onSuccess: () => {
      toast.success("Consentimento RGPD registado!");
      setManualConsentDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['clientContact'] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      if (onUpdate) onUpdate();
    }
  });

  const revokeConsentMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.ClientContact.update(contact.id, {
        rgpd_consent: false,
        rgpd_consent_revoked: true,
        rgpd_consent_revoked_date: new Date().toISOString(),
        rgpd_marketing_consent: false,
        rgpd_third_party_sharing_consent: false
      });
    },
    onSuccess: () => {
      toast.success("Consentimento RGPD revogado");
      queryClient.invalidateQueries({ queryKey: ['clientContact'] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      if (onUpdate) onUpdate();
    }
  });

  const hasConsent = contact.rgpd_consent === true;
  const isRevoked = contact.rgpd_consent_revoked === true;
  const hasPendingRequest = contact.rgpd_request_sent_date && !hasConsent;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Consentimento RGPD
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Atual */}
        <div className="p-4 rounded-lg border-2 bg-slate-50">
          <div className="flex items-center justify-between mb-3">
            <span className="font-semibold text-slate-700">Estado:</span>
            {hasConsent ? (
              <Badge className="bg-green-100 text-green-800 border-green-300">
                <CheckCircle className="w-3 h-3 mr-1" />
                Consentimento Dado
              </Badge>
            ) : isRevoked ? (
              <Badge className="bg-red-100 text-red-800 border-red-300">
                <XCircle className="w-3 h-3 mr-1" />
                Consentimento Revogado
              </Badge>
            ) : hasPendingRequest ? (
              <Badge className="bg-amber-100 text-amber-800 border-amber-300">
                <Clock className="w-3 h-3 mr-1" />
                Pedido Enviado
              </Badge>
            ) : (
              <Badge className="bg-slate-100 text-slate-800 border-slate-300">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Sem Consentimento
              </Badge>
            )}
          </div>

          {/* Consent Details */}
          {hasConsent && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Data:</span>
                <span className="font-medium">
                  {contact.rgpd_consent_date ? format(new Date(contact.rgpd_consent_date), "dd/MM/yyyy HH:mm", { locale: pt }) : '-'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Método:</span>
                <span className="font-medium capitalize">{contact.rgpd_consent_method || '-'}</span>
              </div>
              
              <div className="pt-2 border-t space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Processamento de Dados:</span>
                  {contact.rgpd_data_processing_consent ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-slate-400" />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Marketing:</span>
                  {contact.rgpd_marketing_consent ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-slate-400" />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Partilha com Terceiros:</span>
                  {contact.rgpd_third_party_sharing_consent ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </div>
            </div>
          )}

          {hasPendingRequest && !hasConsent && (
            <div className="text-sm text-amber-700 mt-2">
              Pedido enviado em {format(new Date(contact.rgpd_request_sent_date), "dd/MM/yyyy HH:mm", { locale: pt })}
            </div>
          )}

          {isRevoked && (
            <div className="text-sm text-red-700 mt-2">
              Revogado em {contact.rgpd_consent_revoked_date ? format(new Date(contact.rgpd_consent_revoked_date), "dd/MM/yyyy HH:mm", { locale: pt }) : '-'}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          {!hasConsent && (
            <>
              <Button
                onClick={() => setSendConsentDialogOpen(true)}
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={sendConsentEmailMutation.isPending}
              >
                <Mail className="w-4 h-4 mr-2" />
                Enviar Pedido de Consentimento por Email
              </Button>
              
              <Button
                variant="outline"
                onClick={() => setManualConsentDialogOpen(true)}
                className="w-full"
              >
                <FileText className="w-4 h-4 mr-2" />
                Registar Consentimento Manual
              </Button>
            </>
          )}

          {hasConsent && !isRevoked && (
            <Button
              variant="outline"
              onClick={() => {
                if (confirm("Tem a certeza que deseja revogar o consentimento RGPD deste cliente? Esta ação limitará as comunicações futuras.")) {
                  revokeConsentMutation.mutate();
                }
              }}
              className="w-full border-red-300 text-red-600 hover:bg-red-50"
              disabled={revokeConsentMutation.isPending}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Revogar Consentimento
            </Button>
          )}
        </div>

        {/* Send Email Dialog */}
        <Dialog open={sendConsentDialogOpen} onOpenChange={setSendConsentDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Enviar Pedido de Consentimento RGPD</DialogTitle>
              <DialogDescription>
                Será enviado um email para <strong>{contact.email}</strong> com um link para dar consentimento formal.
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  O email incluirá informação sobre:
                </p>
                <ul className="text-sm text-blue-800 mt-2 space-y-1 list-disc list-inside">
                  <li>Que dados recolhemos</li>
                  <li>Como usamos os dados</li>
                  <li>Direitos do titular dos dados</li>
                  <li>Link para dar consentimento</li>
                </ul>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setSendConsentDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={() => sendConsentEmailMutation.mutate()}
                disabled={sendConsentEmailMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {sendConsentEmailMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    A enviar...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Enviar Email
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Manual Consent Dialog */}
        <Dialog open={manualConsentDialogOpen} onOpenChange={setManualConsentDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registar Consentimento Manual</DialogTitle>
              <DialogDescription>
                Use esta opção para registar consentimento obtido presencialmente, por telefone ou outro método.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div>
                <Label>Método de Obtenção</Label>
                <select
                  value={manualConsent.method}
                  onChange={(e) => setManualConsent({...manualConsent, method: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                >
                  <option value="presencial">Presencial</option>
                  <option value="telefone">Telefone</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="email">Email</option>
                  <option value="website">Website</option>
                  <option value="outro">Outro</option>
                </select>
              </div>

              <div className="space-y-3 border-t pt-4">
                <Label>Consentimentos Específicos:</Label>
                
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="data-processing"
                    checked={manualConsent.data_processing}
                    onCheckedChange={(checked) => setManualConsent({...manualConsent, data_processing: checked})}
                  />
                  <div className="flex-1">
                    <label htmlFor="data-processing" className="text-sm font-medium cursor-pointer">
                      Processamento de Dados Pessoais
                    </label>
                    <p className="text-xs text-slate-500 mt-1">
                      Consentimento para armazenar e processar dados pessoais para prestação de serviços
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Checkbox
                    id="marketing"
                    checked={manualConsent.marketing}
                    onCheckedChange={(checked) => setManualConsent({...manualConsent, marketing: checked})}
                  />
                  <div className="flex-1">
                    <label htmlFor="marketing" className="text-sm font-medium cursor-pointer">
                      Comunicações de Marketing
                    </label>
                    <p className="text-xs text-slate-500 mt-1">
                      Consentimento para receber newsletters e comunicações comerciais
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Checkbox
                    id="third-party"
                    checked={manualConsent.third_party}
                    onCheckedChange={(checked) => setManualConsent({...manualConsent, third_party: checked})}
                  />
                  <div className="flex-1">
                    <label htmlFor="third-party" className="text-sm font-medium cursor-pointer">
                      Partilha com Parceiros
                    </label>
                    <p className="text-xs text-slate-500 mt-1">
                      Consentimento para partilhar dados com parceiros selecionados
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setManualConsentDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={() => registerManualConsentMutation.mutate()}
                disabled={registerManualConsentMutation.isPending || !manualConsent.data_processing}
                className="bg-green-600 hover:bg-green-700"
              >
                {registerManualConsentMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    A registar...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Registar Consentimento
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}