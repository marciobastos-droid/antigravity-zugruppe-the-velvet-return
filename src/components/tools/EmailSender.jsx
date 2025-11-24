import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Mail, Send, Users, Sparkles, Copy, FileText } from "lucide-react";
import { toast } from "sonner";

export default function EmailSender() {
  const [recipientType, setRecipientType] = React.useState("custom");
  const [selectedLeads, setSelectedLeads] = React.useState([]);
  const [customEmail, setCustomEmail] = React.useState("");
  const [fromName, setFromName] = React.useState("");
  const [subject, setSubject] = React.useState("");
  const [body, setBody] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [useTemplate, setUseTemplate] = React.useState("");
  const [generatingWithAI, setGeneratingWithAI] = React.useState(false);

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: opportunities = [] } = useQuery({
    queryKey: ['opportunities'],
    queryFn: () => base44.entities.Opportunity.list('-created_date'),
  });

  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list('-created_date'),
  });

  const activeLeads = opportunities.filter(o => o.buyer_email && o.status !== 'closed');

  const emailTemplates = {
    property_inquiry: {
      name: "Resposta a Interesse em Imóvel",
      subject: "Informações sobre o imóvel que solicitou",
      body: `Olá,

Obrigado pelo seu interesse no nosso imóvel.

Ficamos ao dispor para agendar uma visita ou esclarecer qualquer dúvida.

Contacte-nos:
- Email: ${user?.email || ''}
- Telefone: [INSERIR]

Cumprimentos,
${user?.full_name || 'A nossa equipa'}`
    },
    property_match: {
      name: "Envio de Imóveis Correspondentes",
      subject: "Imóveis que correspondem ao seu perfil",
      body: `Olá,

Encontrámos alguns imóveis que podem interessar-lhe com base nas suas preferências.

[INSERIR LISTA DE IMÓVEIS]

Quer saber mais ou agendar visitas? Contacte-nos!

Cumprimentos,
${user?.full_name || 'A nossa equipa'}`
    },
    follow_up: {
      name: "Follow-up Geral",
      subject: "Como podemos ajudar?",
      body: `Olá,

Estamos a fazer follow-up do seu contacto recente.

Tem alguma questão ou gostaria de avançar com alguma propriedade?

Estamos disponíveis para ajudar.

Cumprimentos,
${user?.full_name || 'A nossa equipa'}`
    },
    appointment_confirmation: {
      name: "Confirmação de Visita",
      subject: "Confirmação de Visita ao Imóvel",
      body: `Olá,

Confirmamos a sua visita ao imóvel:

Data: [INSERIR DATA]
Hora: [INSERIR HORA]
Morada: [INSERIR MORADA]

Por favor confirme a sua presença.

Cumprimentos,
${user?.full_name || 'A nossa equipa'}`
    }
  };

  const generateEmailWithAI = async () => {
    if (!subject) {
      toast.error("Defina o assunto primeiro");
      return;
    }

    setGeneratingWithAI(true);

    try {
      const recipientInfo = recipientType === 'leads' && selectedLeads.length > 0
        ? `Destinatários: ${selectedLeads.length} lead(s) selecionado(s)`
        : recipientType === 'custom' && customEmail
        ? `Destinatário: ${customEmail}`
        : 'Email geral';

      const generatedBody = await base44.integrations.Core.InvokeLLM({
        prompt: `Cria um email profissional para contexto imobiliário português.

CONTEXTO:
- Assunto: ${subject}
- ${recipientInfo}
- Remetente: ${fromName || user?.full_name || 'Equipa'}

INSTRUÇÕES:
1. Tom profissional mas acolhedor
2. Direto ao ponto
3. Incluir call-to-action clara
4. Assinatura adequada
5. 100-200 palavras
6. Formato adequado para email HTML simples

${body ? `RASCUNHO ATUAL (usa como base):\n${body}` : ''}

Retorna APENAS o corpo do email, bem formatado.`,
      });

      setBody(generatedBody);
      toast.success("Email gerado com IA!");
    } catch (error) {
      toast.error("Erro ao gerar email");
      console.error(error);
    }

    setGeneratingWithAI(false);
  };

  const applyTemplate = (templateKey) => {
    const template = emailTemplates[templateKey];
    if (template) {
      setSubject(template.subject);
      setBody(template.body);
      setUseTemplate("");
      toast.success("Template aplicado!");
    }
  };

  const sendEmail = async () => {
    if (!subject || !body) {
      toast.error("Preencha assunto e mensagem");
      return;
    }

    let recipients = [];

    if (recipientType === 'custom') {
      if (!customEmail) {
        toast.error("Insira um email");
        return;
      }
      recipients = [customEmail];
    } else if (recipientType === 'leads') {
      if (selectedLeads.length === 0) {
        toast.error("Selecione pelo menos um lead");
        return;
      }
      recipients = selectedLeads
        .map(id => opportunities.find(o => o.id === id))
        .filter(o => o?.buyer_email)
        .map(o => o.buyer_email);
    } else if (recipientType === 'all_leads') {
      recipients = activeLeads.map(o => o.buyer_email);
      if (recipients.length === 0) {
        toast.error("Nenhum lead disponível");
        return;
      }
    }

    if (recipients.length === 0) {
      toast.error("Nenhum destinatário válido");
      return;
    }

    setSending(true);

    try {
      for (const email of recipients) {
        await base44.integrations.Core.SendEmail({
          from_name: fromName || user?.full_name || undefined,
          to: email,
          subject: subject,
          body: body
        });
      }

      toast.success(`Email enviado para ${recipients.length} destinatário(s)!`);
      
      // Clear form
      setCustomEmail("");
      setSelectedLeads([]);
      setSubject("");
      setBody("");
      setFromName("");
    } catch (error) {
      toast.error("Erro ao enviar email");
      console.error(error);
    }

    setSending(false);
  };

  const toggleLead = (leadId) => {
    setSelectedLeads(prev => 
      prev.includes(leadId) 
        ? prev.filter(id => id !== leadId)
        : [...prev, leadId]
    );
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Configuration */}
      <div className="space-y-6">
        <Card className="border-blue-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-blue-600" />
              Configuração do Email
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Nome do Remetente (opcional)</Label>
              <Input
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
                placeholder={user?.full_name || "Nome da sua empresa"}
              />
              <p className="text-xs text-slate-500 mt-1">
                Deixe vazio para usar o nome padrão da aplicação
              </p>
            </div>

            <div>
              <Label>Tipo de Destinatário</Label>
              <Select value={recipientType} onValueChange={setRecipientType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Email Personalizado</SelectItem>
                  <SelectItem value="leads">Selecionar Leads</SelectItem>
                  <SelectItem value="all_leads">Todos os Leads Ativos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {recipientType === 'custom' && (
              <div>
                <Label>Email do Destinatário *</Label>
                <Input
                  type="email"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  placeholder="cliente@exemplo.com"
                />
              </div>
            )}

            {recipientType === 'leads' && (
              <div>
                <Label>Selecionar Leads ({selectedLeads.length} selecionados)</Label>
                <div className="border rounded-lg max-h-60 overflow-y-auto">
                  {activeLeads.length === 0 ? (
                    <p className="text-sm text-slate-500 p-4 text-center">Nenhum lead disponível</p>
                  ) : (
                    <div className="divide-y">
                      {activeLeads.map((lead) => (
                        <label 
                          key={lead.id}
                          className="flex items-center gap-3 p-3 hover:bg-slate-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedLeads.includes(lead.id)}
                            onChange={() => toggleLead(lead.id)}
                            className="rounded"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">
                              {lead.buyer_name}
                            </p>
                            <p className="text-xs text-slate-600 truncate">{lead.buyer_email}</p>
                          </div>
                          {lead.qualification_status && (
                            <Badge variant="outline" className="text-xs">
                              {lead.qualification_status}
                            </Badge>
                          )}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {recipientType === 'all_leads' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-900">
                  <Users className="w-4 h-4 inline mr-1" />
                  Enviará para {activeLeads.length} lead(s) ativo(s)
                </p>
              </div>
            )}

            <div>
              <Label>Usar Template</Label>
              <Select value={useTemplate} onValueChange={applyTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolher template..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(emailTemplates).map(([key, template]) => (
                    <SelectItem key={key} value={key}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Dica Profissional</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-600">
              💡 Use a IA para gerar emails personalizados baseados no assunto e destinatários.
              Também pode usar templates pré-definidos para situações comuns.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Email Composition */}
      <div className="space-y-6">
        <Card className="border-purple-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-600" />
              Compor Email
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Assunto *</Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Ex: Informações sobre o imóvel em Lisboa"
              />
            </div>

            <div>
              <Label className="flex items-center justify-between">
                <span>Mensagem *</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={generateEmailWithAI}
                  disabled={generatingWithAI || !subject}
                  className="text-purple-600 border-purple-300"
                >
                  {generatingWithAI ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                      A gerar...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3 h-3 mr-2" />
                      Gerar com IA
                    </>
                  )}
                </Button>
              </Label>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Escreva a sua mensagem ou use a IA para gerar..."
                rows={12}
              />
            </div>

            <div className="bg-slate-50 rounded-lg p-3 border">
              <p className="text-xs text-slate-600 mb-2">Pré-visualização:</p>
              <div className="bg-white rounded p-3 text-sm text-slate-700 whitespace-pre-line max-h-40 overflow-y-auto">
                {body || "A mensagem aparecerá aqui..."}
              </div>
            </div>

            <Button 
              onClick={sendEmail}
              disabled={sending || !subject || !body}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {sending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  A enviar...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Enviar Email
                  {recipientType === 'leads' && selectedLeads.length > 0 && ` (${selectedLeads.length})`}
                  {recipientType === 'all_leads' && ` (${activeLeads.length})`}
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Statistics */}
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-900">{activeLeads.length}</div>
                <div className="text-xs text-blue-700">Leads Disponíveis</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-indigo-900">{properties.length}</div>
                <div className="text-xs text-indigo-700">Imóveis Ativos</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}