import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Shield, CheckCircle, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function RGPDConsent() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [contact, setContact] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [consent, setConsent] = useState({
    data_processing: false,
    marketing: false,
    third_party: false
  });

  const urlParams = new URLSearchParams(window.location.search);
  const contactId = urlParams.get('contact_id');
  const token = urlParams.get('token');

  useEffect(() => {
    if (!contactId || !token) {
      setLoading(false);
      return;
    }

    // Load contact
    base44.entities.ClientContact.filter({ id: contactId })
      .then(contacts => {
        if (contacts.length > 0) {
          setContact(contacts[0]);
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [contactId, token]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!consent.data_processing) {
      toast.error("É necessário aceitar o processamento de dados para continuar");
      return;
    }

    setSubmitting(true);

    try {
      // Get client IP
      const ipResponse = await fetch('https://api.ipify.org?format=json');
      const { ip } = await ipResponse.json();

      await base44.entities.ClientContact.update(contact.id, {
        rgpd_consent: true,
        rgpd_consent_date: new Date().toISOString(),
        rgpd_consent_method: "email",
        rgpd_consent_ip: ip,
        rgpd_data_processing_consent: consent.data_processing,
        rgpd_marketing_consent: consent.marketing,
        rgpd_third_party_sharing_consent: consent.third_party,
        rgpd_consent_revoked: false
      });

      setSubmitted(true);
      toast.success("Consentimento registado com sucesso!");
    } catch (error) {
      toast.error("Erro ao registar consentimento");
      console.error(error);
    }

    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-600" />
      </div>
    );
  }

  if (!contactId || !token || !contact) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Link Inválido</h2>
            <p className="text-slate-600">
              Este link de consentimento é inválido ou expirou.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-2xl">
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-green-900 mb-2">Consentimento Registado!</h2>
            <p className="text-slate-600 mb-6">
              Obrigado por dar o seu consentimento. Os seus dados estão protegidos e serão usados apenas para os fins indicados.
            </p>
            <p className="text-sm text-slate-500">
              Pode fechar esta janela.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardHeader className="bg-slate-900 text-white">
            <CardTitle className="flex items-center gap-3 text-2xl">
              <Shield className="w-8 h-8" />
              Consentimento RGPD
            </CardTitle>
            <p className="text-slate-300 text-sm mt-2">
              Regulamento Geral de Proteção de Dados
            </p>
          </CardHeader>
          <CardContent className="p-8">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">Olá {contact.full_name},</h3>
                <p className="text-slate-700 leading-relaxed">
                  Em conformidade com o Regulamento Geral de Proteção de Dados (RGPD), 
                  solicitamos o seu consentimento para processarmos os seus dados pessoais.
                </p>
              </div>

              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                <h4 className="font-semibold text-blue-900 mb-2">📋 Dados que recolhemos:</h4>
                <ul className="list-disc list-inside text-sm text-blue-800 space-y-1">
                  <li>Nome completo, email e telefone</li>
                  <li>Preferências de imóveis e requisitos de pesquisa</li>
                  <li>Histórico de interações e visualizações de imóveis</li>
                  <li>Comunicações trocadas connosco</li>
                </ul>
              </div>

              <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
                <h4 className="font-semibold text-green-900 mb-2">🎯 Finalidade do tratamento:</h4>
                <ul className="list-disc list-inside text-sm text-green-800 space-y-1">
                  <li>Prestar serviços imobiliários solicitados</li>
                  <li>Enviar informações sobre imóveis do seu interesse</li>
                  <li>Gerir e acompanhar propostas e negociações</li>
                  <li>Comunicar sobre os nossos serviços (apenas com o seu consentimento)</li>
                </ul>
              </div>

              <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded">
                <h4 className="font-semibold text-amber-900 mb-2">✅ Os seus direitos:</h4>
                <ul className="list-disc list-inside text-sm text-amber-800 space-y-1">
                  <li><strong>Acesso:</strong> Consultar os dados que temos sobre si</li>
                  <li><strong>Retificação:</strong> Corrigir dados incorretos ou incompletos</li>
                  <li><strong>Eliminação:</strong> Solicitar a eliminação dos seus dados ("direito ao esquecimento")</li>
                  <li><strong>Portabilidade:</strong> Receber os seus dados num formato estruturado</li>
                  <li><strong>Oposição:</strong> Opor-se ao tratamento dos seus dados</li>
                  <li><strong>Revogação:</strong> Revogar o consentimento a qualquer momento</li>
                </ul>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 pt-4 border-t-2">
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg border-2 border-slate-200">
                    <Checkbox
                      id="data-processing"
                      checked={consent.data_processing}
                      onCheckedChange={(checked) => setConsent({...consent, data_processing: checked})}
                      required
                    />
                    <div className="flex-1">
                      <label htmlFor="data-processing" className="font-medium cursor-pointer">
                        Autorizo o processamento dos meus dados pessoais *
                      </label>
                      <p className="text-sm text-slate-600 mt-1">
                        Necessário para prestar os serviços imobiliários solicitados
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg">
                    <Checkbox
                      id="marketing"
                      checked={consent.marketing}
                      onCheckedChange={(checked) => setConsent({...consent, marketing: checked})}
                    />
                    <div className="flex-1">
                      <label htmlFor="marketing" className="font-medium cursor-pointer">
                        Autorizo o envio de comunicações de marketing
                      </label>
                      <p className="text-sm text-slate-600 mt-1">
                        Newsletters, novos imóveis e promoções (opcional)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg">
                    <Checkbox
                      id="third-party"
                      checked={consent.third_party}
                      onCheckedChange={(checked) => setConsent({...consent, third_party: checked})}
                    />
                    <div className="flex-1">
                      <label htmlFor="third-party" className="font-medium cursor-pointer">
                        Autorizo a partilha com parceiros selecionados
                      </label>
                      <p className="text-sm text-slate-600 mt-1">
                        Apenas parceiros relevantes para os seus interesses (opcional)
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-100 p-4 rounded-lg">
                  <p className="text-xs text-slate-600">
                    <strong>Nota:</strong> Os campos marcados com * são obrigatórios. 
                    Pode revogar o seu consentimento a qualquer momento contactando-nos ou através da área de cliente.
                    Para mais informações, consulte a nossa <a href="/politica-privacidade" className="text-blue-600 underline">Política de Privacidade</a>.
                  </p>
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-green-600 hover:bg-green-700 h-12 text-lg"
                  disabled={submitting || !consent.data_processing}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      A processar...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Aceitar e Dar Consentimento
                    </>
                  )}
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}