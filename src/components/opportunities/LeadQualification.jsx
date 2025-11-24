import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Sparkles, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { toast } from "sonner";

export const qualifyLead = async (lead) => {
  try {
    const analysisPrompt = `Analisa este lead imobiliário e atribui uma qualificação:

DADOS DO LEAD:
- Nome: ${lead.buyer_name}
- Email: ${lead.buyer_email || 'não fornecido'}
- Telefone: ${lead.buyer_phone || 'não fornecido'}
- Localização: ${lead.location || 'não especificada'}
- Orçamento: ${lead.budget ? `€${Number(lead.budget).toLocaleString()}` : 'não especificado'}
- Tipo de imóvel: ${lead.property_type_interest || 'não especificado'}
- Mensagem: ${lead.message || 'nenhuma'}

CRITÉRIOS DE QUALIFICAÇÃO:

HOT (75-100 pontos):
- Orçamento definido e realista
- Contactos completos (email + telefone)
- Localização específica
- Tipo de imóvel claro
- Mensagem detalhada e urgente
- Indica prontidão para comprar/alugar

WARM (40-74 pontos):
- Alguma informação incompleta
- Orçamento vago ou amplo
- Interesse demonstrado mas não urgente
- Contactos parciais
- Mensagem genérica

COLD (0-39 pontos):
- Dados muito incompletos
- Sem orçamento definido
- Mensagem muito vaga
- Contacto único
- Sem urgência aparente

RETORNA um JSON com:
{
  "score": number (0-100),
  "status": "hot" | "warm" | "cold",
  "reasoning": "explicação em português",
  "strengths": ["ponto forte 1", "ponto forte 2"],
  "concerns": ["preocupação 1", "preocupação 2"],
  "recommended_actions": ["ação 1", "ação 2"]
}`;

    const qualification = await base44.integrations.Core.InvokeLLM({
      prompt: analysisPrompt,
      response_json_schema: {
        type: "object",
        properties: {
          score: { type: "number" },
          status: { type: "string" },
          reasoning: { type: "string" },
          strengths: { type: "array", items: { type: "string" } },
          concerns: { type: "array", items: { type: "string" } },
          recommended_actions: { type: "array", items: { type: "string" } }
        }
      }
    });

    return {
      qualification_status: qualification.status,
      qualification_score: qualification.score,
      qualification_details: qualification,
      qualification_date: new Date().toISOString()
    };
  } catch (error) {
    console.error("Erro ao qualificar lead:", error);
    return null;
  }
};

export const getQualificationColor = (status) => {
  switch (status) {
    case 'hot':
      return 'bg-red-100 text-red-800 border-red-300';
    case 'warm':
      return 'bg-orange-100 text-orange-800 border-orange-300';
    case 'cold':
      return 'bg-blue-100 text-blue-800 border-blue-300';
    default:
      return 'bg-slate-100 text-slate-800 border-slate-300';
  }
};

export const getQualificationIcon = (status) => {
  switch (status) {
    case 'hot':
      return TrendingUp;
    case 'warm':
      return Minus;
    case 'cold':
      return TrendingDown;
    default:
      return Sparkles;
  }
};

export const getQualificationLabel = (status) => {
  switch (status) {
    case 'hot':
      return '🔥 Hot Lead';
    case 'warm':
      return '🟡 Warm Lead';
    case 'cold':
      return '❄️ Cold Lead';
    default:
      return 'Não Qualificado';
  }
};

export default function LeadQualification({ lead, onQualified }) {
  const [qualifying, setQualifying] = useState(false);

  const handleQualify = async () => {
    setQualifying(true);
    
    const qualificationData = await qualifyLead(lead);
    
    if (qualificationData) {
      try {
        await base44.entities.Opportunity.update(lead.id, qualificationData);
        toast.success("Lead qualificado com IA!");
        if (onQualified) onQualified();
      } catch (error) {
        toast.error("Erro ao guardar qualificação");
      }
    } else {
      toast.error("Erro ao qualificar lead");
    }
    
    setQualifying(false);
  };

  if (lead.qualification_status) {
    const Icon = getQualificationIcon(lead.qualification_status);
    
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Badge className={`${getQualificationColor(lead.qualification_status)} border`}>
            <Icon className="w-3 h-3 mr-1" />
            {getQualificationLabel(lead.qualification_status)}
          </Badge>
          <span className="text-sm text-slate-600">
            Score: {lead.qualification_score}/100
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleQualify}
            disabled={qualifying}
          >
            <Sparkles className="w-3 h-3 mr-1" />
            Re-qualificar
          </Button>
        </div>

        {lead.qualification_details && (
          <Card className="border-purple-200 bg-purple-50">
            <CardContent className="p-3 space-y-2">
              {lead.qualification_details.reasoning && (
                <div>
                  <p className="text-xs font-semibold text-purple-900 mb-1">Análise:</p>
                  <p className="text-xs text-purple-700">{lead.qualification_details.reasoning}</p>
                </div>
              )}
              
              {lead.qualification_details.strengths?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-green-900 mb-1">✓ Pontos Fortes:</p>
                  <ul className="text-xs text-green-700 list-disc list-inside">
                    {lead.qualification_details.strengths.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {lead.qualification_details.concerns?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-orange-900 mb-1">⚠ Preocupações:</p>
                  <ul className="text-xs text-orange-700 list-disc list-inside">
                    {lead.qualification_details.concerns.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {lead.qualification_details.recommended_actions?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-blue-900 mb-1">💡 Ações Recomendadas:</p>
                  <ul className="text-xs text-blue-700 list-disc list-inside">
                    {lead.qualification_details.recommended_actions.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleQualify}
      disabled={qualifying}
      className="border-purple-300 text-purple-700 hover:bg-purple-50"
    >
      {qualifying ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          A qualificar...
        </>
      ) : (
        <>
          <Sparkles className="w-4 h-4 mr-2" />
          Qualificar com IA
        </>
      )}
    </Button>
  );
}