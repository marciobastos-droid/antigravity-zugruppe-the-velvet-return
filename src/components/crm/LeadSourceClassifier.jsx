import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, Facebook, Globe, Users, Mail, Phone, Building2 } from "lucide-react";
import { toast } from "sonner";

export default function LeadSourceClassifier({ lead, onSourceUpdate }) {
  const [classifying, setClassifying] = useState(false);
  const [classifiedSource, setClassifiedSource] = useState(null);

  const classifySource = async () => {
    setClassifying(true);
    setClassifiedSource(null);

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Classifica a ORIGEM deste lead com base nas informações disponíveis.

LEAD:
Nome: ${lead.buyer_name}
Email: ${lead.buyer_email || 'N/A'}
Telefone: ${lead.buyer_phone || 'N/A'}
Mensagem: ${lead.message || 'N/A'}
Source URL: ${lead.source_url || 'N/A'}
Campos do lead: ${JSON.stringify(lead, null, 2)}

POSSÍVEIS ORIGENS:
- facebook_ads: Lead vindo de campanha Facebook/Instagram Ads
- website: Formulário do website
- referral: Indicação de outro cliente
- direct_contact: Contacto direto (telefone/email)
- real_estate_portal: Portal imobiliário (Idealista, Imovirtual, etc)
- networking: Evento, networking, feira
- other: Outra origem

INSTRUÇÕES:
1. Analisa TODOS os campos disponíveis
2. Identifica padrões típicos de cada origem
3. Retorna a origem mais provável
4. Dá confiança (0-100)
5. Explica brevemente o porquê

Retorna JSON estruturado.`,
        response_json_schema: {
          type: "object",
          properties: {
            source: {
              type: "string",
              enum: ["facebook_ads", "website", "referral", "direct_contact", "real_estate_portal", "networking", "other"]
            },
            confidence: {
              type: "number",
              description: "Confiança na classificação 0-100"
            },
            reasoning: {
              type: "string",
              description: "Breve explicação da classificação"
            },
            indicators: {
              type: "array",
              items: { type: "string" },
              description: "Indicadores que levaram a esta classificação"
            }
          }
        }
      });

      setClassifiedSource(result);
      toast.success(`Origem identificada: ${getSourceLabel(result.source)}`);
    } catch (error) {
      toast.error("Erro ao classificar origem");
      console.error(error);
    }

    setClassifying(false);
  };

  const acceptClassification = () => {
    if (!classifiedSource) return;
    onSourceUpdate(classifiedSource.source);
    toast.success("Origem atualizada");
  };

  const getSourceLabel = (source) => {
    const labels = {
      facebook_ads: "Facebook Ads",
      website: "Website",
      referral: "Indicação",
      direct_contact: "Contacto Direto",
      real_estate_portal: "Portal Imobiliário",
      networking: "Networking/Evento",
      other: "Outro"
    };
    return labels[source] || source;
  };

  const getSourceIcon = (source) => {
    const icons = {
      facebook_ads: Facebook,
      website: Globe,
      referral: Users,
      direct_contact: Phone,
      real_estate_portal: Building2,
      networking: Users,
      other: Mail
    };
    return icons[source] || Mail;
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 80) return "text-green-600 bg-green-50";
    if (confidence >= 60) return "text-yellow-600 bg-yellow-50";
    return "text-orange-600 bg-orange-50";
  };

  return (
    <div className="space-y-3">
      {!classifiedSource && (
        <Button
          size="sm"
          variant="outline"
          onClick={classifySource}
          disabled={classifying}
          className="w-full border-purple-500 text-purple-600 hover:bg-purple-50"
        >
          {classifying ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Classificando origem...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Classificar Origem com IA
            </>
          )}
        </Button>
      )}

      {classifiedSource && (
        <div className="border-2 border-purple-200 rounded-lg p-3 bg-gradient-to-br from-purple-50 to-white space-y-3">
          <div className="flex items-start gap-3">
            {React.createElement(getSourceIcon(classifiedSource.source), {
              className: "w-6 h-6 text-purple-600 flex-shrink-0 mt-1"
            })}
            <div className="flex-1">
              <h4 className="font-semibold text-slate-900 mb-1">
                {getSourceLabel(classifiedSource.source)}
              </h4>
              <Badge className={`${getConfidenceColor(classifiedSource.confidence)} border-0`}>
                {classifiedSource.confidence}% confiança
              </Badge>
            </div>
          </div>

          <div className="text-sm">
            <p className="text-slate-700 mb-2">{classifiedSource.reasoning}</p>
            {classifiedSource.indicators && classifiedSource.indicators.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-600 mb-1">Indicadores:</p>
                <ul className="space-y-1">
                  {classifiedSource.indicators.map((indicator, idx) => (
                    <li key={idx} className="text-xs text-slate-600 flex items-start gap-1">
                      <span className="text-purple-600">•</span>
                      {indicator}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={acceptClassification}
              className="flex-1 bg-purple-600 hover:bg-purple-700"
            >
              Aceitar e Guardar
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={classifySource}
            >
              <Sparkles className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}