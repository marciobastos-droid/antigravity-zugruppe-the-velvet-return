import React from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, Calendar, Mail, Phone, MessageSquare, CheckCircle2, TrendingUp } from "lucide-react";
import { toast } from "sonner";

export default function AIAssistant({ lead, onSuggestionAccept }) {
  const [analyzing, setAnalyzing] = React.useState(false);
  const [suggestion, setSuggestion] = React.useState(null);

  const getNextStepSuggestion = async () => {
    setAnalyzing(true);
    setSuggestion(null);

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Analisa este lead e sugere o PRÓXIMO PASSO ideal para avançar no pipeline de vendas.

LEAD:
Nome: ${lead.buyer_name}
Tipo: ${lead.lead_type}
Estado: ${lead.status}
Prioridade: ${lead.priority || 'medium'}
Qualificação: ${lead.qualification_status || 'Não qualificado'}
Score: ${lead.qualification_score || 'N/A'}/100

${lead.location ? `Localização: ${lead.location}` : ''}
${lead.budget ? `Orçamento: €${lead.budget}` : ''}
${lead.property_type_interest ? `Interesse: ${lead.property_type_interest}` : ''}
${lead.message ? `Mensagem: ${lead.message}` : ''}

Follow-ups anteriores: ${lead.follow_ups?.length || 0}
${lead.follow_ups?.map(f => `- ${f.type} (${f.completed ? 'Completo' : 'Pendente'}): ${f.notes}`).join('\n') || 'Nenhum'}

Notas: ${lead.quick_notes?.length || 0}
${lead.quick_notes?.slice(-3).map(n => `- ${n.text}`).join('\n') || 'Nenhuma'}

INSTRUÇÕES:
1. Considera o estado atual e histórico
2. Sugere o próximo passo CONCRETO e ACIONÁVEL
3. Inclui quando fazer (timeframe)
4. Dá 2-3 razões específicas
5. Sugere script/template se aplicável

Retorna JSON estruturado.`,
        response_json_schema: {
          type: "object",
          properties: {
            next_action: {
              type: "string",
              description: "Tipo de ação: call, email, meeting, whatsapp"
            },
            title: {
              type: "string",
              description: "Título curto da ação"
            },
            timeframe: {
              type: "string",
              description: "Quando fazer: hoje, amanhã, esta semana, etc"
            },
            priority: {
              type: "string",
              description: "Prioridade: low, medium, high"
            },
            reasons: {
              type: "array",
              items: { type: "string" },
              description: "2-3 razões específicas"
            },
            suggested_message: {
              type: "string",
              description: "Template/script sugerido"
            },
            expected_outcome: {
              type: "string",
              description: "Resultado esperado desta ação"
            }
          }
        }
      });

      setSuggestion(result);
    } catch (error) {
      toast.error("Erro ao gerar sugestão");
      console.error(error);
    }

    setAnalyzing(false);
  };

  const acceptSuggestion = async () => {
    if (!suggestion) return;
    
    const followUp = {
      type: suggestion.next_action,
      notes: `${suggestion.title}\n\n${suggestion.suggested_message || ''}`.trim(),
      date: new Date().toISOString(),
      completed: false
    };

    await onSuggestionAccept(followUp);
    setSuggestion(null);
  };

  const getActionIcon = (action) => {
    const icons = {
      call: Phone,
      email: Mail,
      meeting: Calendar,
      whatsapp: MessageSquare
    };
    return icons[action] || MessageSquare;
  };

  const getPriorityColor = (priority) => {
    const colors = {
      high: "bg-red-100 text-red-800",
      medium: "bg-yellow-100 text-yellow-800",
      low: "bg-blue-100 text-blue-800"
    };
    return colors[priority] || "bg-slate-100 text-slate-800";
  };

  return (
    <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-600" />
          Assistente IA - Próximo Passo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!suggestion && !analyzing && (
          <Button 
            onClick={getNextStepSuggestion}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Analisar e Sugerir Próximo Passo
          </Button>
        )}

        {analyzing && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
            <span className="ml-3 text-slate-600">IA a analisar...</span>
          </div>
        )}

        {suggestion && (
          <div className="space-y-4">
            <div className="bg-white rounded-lg border-2 border-purple-200 p-4">
              <div className="flex items-start gap-3 mb-3">
                {React.createElement(getActionIcon(suggestion.next_action), {
                  className: "w-6 h-6 text-purple-600 flex-shrink-0 mt-1"
                })}
                <div className="flex-1">
                  <h4 className="font-semibold text-slate-900 text-lg mb-1">
                    {suggestion.title}
                  </h4>
                  <div className="flex gap-2 flex-wrap">
                    <Badge className={getPriorityColor(suggestion.priority)}>
                      {suggestion.priority === 'high' ? 'Alta Prioridade' :
                       suggestion.priority === 'medium' ? 'Prioridade Média' : 'Prioridade Baixa'}
                    </Badge>
                    <Badge variant="outline">
                      <Calendar className="w-3 h-3 mr-1" />
                      {suggestion.timeframe}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <h5 className="text-sm font-semibold text-slate-700 mb-2">Por quê agora?</h5>
                  <ul className="space-y-1">
                    {suggestion.reasons.map((reason, idx) => (
                      <li key={idx} className="text-sm text-slate-600 flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                        {reason}
                      </li>
                    ))}
                  </ul>
                </div>

                {suggestion.suggested_message && (
                  <div>
                    <h5 className="text-sm font-semibold text-slate-700 mb-2">
                      Script Sugerido:
                    </h5>
                    <div className="bg-slate-50 rounded p-3 text-sm text-slate-700 border border-slate-200">
                      {suggestion.suggested_message}
                    </div>
                  </div>
                )}

                {suggestion.expected_outcome && (
                  <div className="bg-green-50 border border-green-200 rounded p-3">
                    <div className="flex items-start gap-2">
                      <TrendingUp className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h5 className="text-sm font-semibold text-green-900 mb-1">
                          Resultado Esperado:
                        </h5>
                        <p className="text-sm text-green-800">{suggestion.expected_outcome}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={acceptSuggestion}
                className="flex-1 bg-purple-600 hover:bg-purple-700"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Adicionar aos Follow-ups
              </Button>
              <Button 
                variant="outline"
                onClick={getNextStepSuggestion}
              >
                <Sparkles className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}