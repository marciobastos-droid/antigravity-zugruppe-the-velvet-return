import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Sparkles, Mail, MessageSquare, Copy, RefreshCw, Loader2, 
  FileText, User, Clock, CheckCircle, Send, History, Zap,
  ThumbsUp, ThumbsDown, Wand2
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

const emailTones = [
  { value: "professional", label: "Profissional" },
  { value: "friendly", label: "Amigável" },
  { value: "formal", label: "Formal" },
  { value: "urgent", label: "Urgente" }
];

const emailTypes = [
  { value: "followup", label: "Follow-up", icon: RefreshCw },
  { value: "introduction", label: "Apresentação", icon: User },
  { value: "proposal", label: "Proposta", icon: FileText },
  { value: "reminder", label: "Lembrete", icon: Clock },
  { value: "thankyou", label: "Agradecimento", icon: ThumbsUp },
  { value: "meeting", label: "Agendar Reunião", icon: MessageSquare }
];

export default function AICommunicationAssistant({ contact, opportunity, communications = [], properties = [] }) {
  const [activeTab, setActiveTab] = useState("draft");
  const [emailType, setEmailType] = useState("followup");
  const [tone, setTone] = useState("professional");
  const [additionalContext, setAdditionalContext] = useState("");
  const [generatedContent, setGeneratedContent] = useState(null);
  const [summary, setSummary] = useState(null);
  const [templates, setTemplates] = useState([]);

  // Build client context
  const clientName = contact?.full_name || opportunity?.buyer_name || "Cliente";
  const clientEmail = contact?.email || opportunity?.buyer_email || "";
  const clientPhone = contact?.phone || opportunity?.buyer_phone || "";
  const clientLocation = contact?.city || opportunity?.location || "";
  const clientBudget = contact?.property_requirements?.budget_max || opportunity?.budget || 0;
  const clientPropertyTypes = contact?.property_requirements?.property_types || [];
  const clientLocations = contact?.property_requirements?.locations || [];

  // Generate email draft mutation
  const generateEmailMutation = useMutation({
    mutationFn: async () => {
      const recentComms = communications.slice(0, 5).map(c => ({
        type: c.type,
        date: c.sent_at || c.date,
        subject: c.subject,
        preview: c.message?.substring(0, 200)
      }));

      const matchingProperties = properties.filter(p => {
        if (clientBudget && p.price > clientBudget * 1.2) return false;
        if (clientLocations.length && !clientLocations.some(loc => 
          p.city?.toLowerCase().includes(loc.toLowerCase()) ||
          p.state?.toLowerCase().includes(loc.toLowerCase())
        )) return false;
        return true;
      }).slice(0, 3);

      const prompt = `Gera um email profissional em português de Portugal para um cliente imobiliário.

DADOS DO CLIENTE:
- Nome: ${clientName}
- Email: ${clientEmail}
- Localização: ${clientLocation || "Não especificada"}
- Orçamento: ${clientBudget ? `€${clientBudget.toLocaleString()}` : "Não especificado"}
- Tipos de imóvel de interesse: ${clientPropertyTypes.join(", ") || "Não especificado"}
- Localizações de interesse: ${clientLocations.join(", ") || "Não especificadas"}

HISTÓRICO DE COMUNICAÇÕES RECENTES:
${recentComms.length > 0 ? recentComms.map(c => `- ${c.type} em ${c.date}: ${c.subject || c.preview || "Sem assunto"}`).join("\n") : "Sem histórico de comunicações"}

IMÓVEIS COMPATÍVEIS DISPONÍVEIS:
${matchingProperties.length > 0 ? matchingProperties.map(p => `- ${p.title} em ${p.city}: €${p.price?.toLocaleString()} (T${p.bedrooms || "?"}, ${p.square_feet || p.useful_area || "?"}m²)`).join("\n") : "Nenhum imóvel específico selecionado"}

TIPO DE EMAIL: ${emailTypes.find(t => t.value === emailType)?.label}
TOM: ${emailTones.find(t => t.value === tone)?.label}
${additionalContext ? `CONTEXTO ADICIONAL: ${additionalContext}` : ""}

INSTRUÇÕES:
- Escreve um email personalizado e relevante
- Usa o nome do cliente
- Se for follow-up, referencia interações anteriores
- Se houver imóveis compatíveis, menciona-os naturalmente
- Mantém o tom ${tone}
- Inclui uma call-to-action clara
- Assina como "Equipa [Nome da Imobiliária]"`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            subject: { type: "string", description: "Assunto do email" },
            body: { type: "string", description: "Corpo do email" },
            key_points: { type: "array", items: { type: "string" }, description: "Pontos-chave do email" },
            suggested_followup_date: { type: "string", description: "Data sugerida para próximo follow-up" }
          }
        }
      });

      return result;
    },
    onSuccess: (data) => {
      setGeneratedContent(data);
      toast.success("Email gerado com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao gerar email: " + error.message);
    }
  });

  // Generate interaction summary mutation
  const generateSummaryMutation = useMutation({
    mutationFn: async () => {
      if (communications.length === 0) {
        throw new Error("Sem histórico de comunicações para resumir");
      }

      const commsData = communications.map(c => ({
        type: c.type,
        date: c.sent_at || c.date,
        subject: c.subject,
        message: c.message,
        status: c.status
      }));

      const prompt = `Analisa o histórico de comunicações deste cliente e gera um resumo executivo em português.

CLIENTE: ${clientName}
PERFIL: ${contact?.contact_type || opportunity?.lead_type || "Cliente"}
ORÇAMENTO: ${clientBudget ? `€${clientBudget.toLocaleString()}` : "Não especificado"}

HISTÓRICO DE COMUNICAÇÕES:
${JSON.stringify(commsData, null, 2)}

GERA:
1. Resumo geral da relação com o cliente
2. Principais interesses e necessidades identificados
3. Estado atual do relacionamento (quente/morno/frio)
4. Próximos passos recomendados
5. Alertas ou preocupações`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            summary: { type: "string", description: "Resumo executivo" },
            relationship_status: { type: "string", enum: ["hot", "warm", "cold"], description: "Estado da relação" },
            key_interests: { type: "array", items: { type: "string" }, description: "Principais interesses" },
            concerns: { type: "array", items: { type: "string" }, description: "Preocupações identificadas" },
            recommended_actions: { type: "array", items: { type: "string" }, description: "Ações recomendadas" },
            next_contact_suggestion: { type: "string", description: "Sugestão para próximo contacto" },
            engagement_score: { type: "number", description: "Score de engagement 0-100" }
          }
        }
      });

      return result;
    },
    onSuccess: (data) => {
      setSummary(data);
      toast.success("Resumo gerado!");
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  // Generate templates mutation
  const generateTemplatesMutation = useMutation({
    mutationFn: async () => {
      const prompt = `Gera 4 templates de comunicação personalizados para este cliente imobiliário em português de Portugal.

PERFIL DO CLIENTE:
- Nome: ${clientName}
- Tipo: ${contact?.contact_type || opportunity?.lead_type || "Cliente"}
- Orçamento: ${clientBudget ? `€${clientBudget.toLocaleString()}` : "Não especificado"}
- Localizações de interesse: ${clientLocations.join(", ") || "Várias"}
- Tipos de imóvel: ${clientPropertyTypes.join(", ") || "Vários"}

Gera templates para:
1. Apresentação de novo imóvel
2. Follow-up após visita
3. Proposta comercial
4. Pedido de feedback`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            templates: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  type: { type: "string" },
                  subject: { type: "string" },
                  body: { type: "string" },
                  best_use_case: { type: "string" }
                }
              }
            }
          }
        }
      });

      return result.templates || [];
    },
    onSuccess: (data) => {
      setTemplates(data);
      toast.success("Templates gerados!");
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado!");
  };

  const relationshipColors = {
    hot: "bg-green-100 text-green-800",
    warm: "bg-amber-100 text-amber-800",
    cold: "bg-blue-100 text-blue-800"
  };

  const relationshipLabels = {
    hot: "Quente",
    warm: "Morno",
    cold: "Frio"
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="w-5 h-5 text-purple-600" />
          Assistente de Comunicação IA
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="draft" className="gap-1">
              <Mail className="w-4 h-4" />
              <span className="hidden sm:inline">Rascunho</span>
            </TabsTrigger>
            <TabsTrigger value="summary" className="gap-1">
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">Resumo</span>
            </TabsTrigger>
            <TabsTrigger value="templates" className="gap-1">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Templates</span>
            </TabsTrigger>
          </TabsList>

          {/* Email Draft Tab */}
          <TabsContent value="draft" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1 block">Tipo de Email</Label>
                <Select value={emailType} onValueChange={setEmailType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {emailTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        <span className="flex items-center gap-2">
                          <type.icon className="w-4 h-4" />
                          {type.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs mb-1 block">Tom</Label>
                <Select value={tone} onValueChange={setTone}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {emailTones.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-xs mb-1 block">Contexto Adicional (opcional)</Label>
              <Textarea
                value={additionalContext}
                onChange={(e) => setAdditionalContext(e.target.value)}
                placeholder="Ex: O cliente mostrou interesse no apartamento T3 em Cascais..."
                rows={2}
              />
            </div>

            <Button
              onClick={() => generateEmailMutation.mutate()}
              disabled={generateEmailMutation.isPending}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              {generateEmailMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />A gerar...</>
              ) : (
                <><Wand2 className="w-4 h-4 mr-2" />Gerar Email</>
              )}
            </Button>

            {generatedContent && (
              <div className="space-y-3 pt-3 border-t">
                <div className="flex items-center justify-between">
                  <Label className="font-medium">Assunto:</Label>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(generatedContent.subject)}>
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
                <p className="text-sm bg-slate-50 p-2 rounded">{generatedContent.subject}</p>

                <div className="flex items-center justify-between">
                  <Label className="font-medium">Corpo do Email:</Label>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(generatedContent.body)}>
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
                <ScrollArea className="h-48">
                  <div className="text-sm bg-slate-50 p-3 rounded whitespace-pre-wrap">
                    {generatedContent.body}
                  </div>
                </ScrollArea>

                {generatedContent.key_points?.length > 0 && (
                  <div>
                    <Label className="text-xs text-slate-500">Pontos-chave:</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {generatedContent.key_points.map((point, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">{point}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => generateEmailMutation.mutate()}
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Regenerar
                  </Button>
                  <Button 
                    size="sm" 
                    className="flex-1"
                    onClick={() => copyToClipboard(`Assunto: ${generatedContent.subject}\n\n${generatedContent.body}`)}
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    Copiar Tudo
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Summary Tab */}
          <TabsContent value="summary" className="space-y-4 mt-4">
            <div className="text-center text-sm text-slate-500 mb-3">
              <History className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              Analisa o histórico de {communications.length} comunicações
            </div>

            <Button
              onClick={() => generateSummaryMutation.mutate()}
              disabled={generateSummaryMutation.isPending || communications.length === 0}
              className="w-full"
            >
              {generateSummaryMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />A analisar...</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-2" />Gerar Resumo</>
              )}
            </Button>

            {summary && (
              <div className="space-y-4 pt-3 border-t">
                <div className="flex items-center gap-2">
                  <Badge className={relationshipColors[summary.relationship_status]}>
                    {relationshipLabels[summary.relationship_status]}
                  </Badge>
                  <Badge variant="outline">
                    Engagement: {summary.engagement_score}%
                  </Badge>
                </div>

                <div>
                  <Label className="text-xs text-slate-500">Resumo</Label>
                  <p className="text-sm mt-1">{summary.summary}</p>
                </div>

                {summary.key_interests?.length > 0 && (
                  <div>
                    <Label className="text-xs text-slate-500">Interesses Identificados</Label>
                    <ul className="list-disc ml-4 text-sm mt-1">
                      {summary.key_interests.map((interest, i) => (
                        <li key={i}>{interest}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {summary.recommended_actions?.length > 0 && (
                  <div>
                    <Label className="text-xs text-slate-500">Ações Recomendadas</Label>
                    <ul className="list-disc ml-4 text-sm mt-1 text-green-700">
                      {summary.recommended_actions.map((action, i) => (
                        <li key={i}>{action}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {summary.concerns?.length > 0 && (
                  <div>
                    <Label className="text-xs text-slate-500">Alertas</Label>
                    <ul className="list-disc ml-4 text-sm mt-1 text-amber-700">
                      {summary.concerns.map((concern, i) => (
                        <li key={i}>{concern}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {summary.next_contact_suggestion && (
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <Label className="text-xs text-blue-600">Próximo Contacto Sugerido</Label>
                    <p className="text-sm text-blue-800 mt-1">{summary.next_contact_suggestion}</p>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-4 mt-4">
            <Button
              onClick={() => generateTemplatesMutation.mutate()}
              disabled={generateTemplatesMutation.isPending}
              className="w-full"
            >
              {generateTemplatesMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />A gerar...</>
              ) : (
                <><Zap className="w-4 h-4 mr-2" />Gerar Templates Personalizados</>
              )}
            </Button>

            {templates.length > 0 && (
              <div className="space-y-3">
                {templates.map((template, idx) => (
                  <div key={idx} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-medium text-sm">{template.name}</p>
                        <p className="text-xs text-slate-500">{template.best_use_case}</p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => copyToClipboard(`Assunto: ${template.subject}\n\n${template.body}`)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="bg-slate-50 rounded p-2 text-xs">
                      <p className="font-medium text-slate-600">Assunto: {template.subject}</p>
                      <p className="text-slate-500 mt-1 line-clamp-3">{template.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}