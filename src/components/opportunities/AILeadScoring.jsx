import React from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Sparkles, Flame, ThermometerSun, Snowflake, 
  Loader2, CheckCircle2, TrendingUp, AlertCircle,
  Phone, Mail, Euro, MapPin, Calendar
} from "lucide-react";
import { toast } from "sonner";

const qualificationConfig = {
  hot: { label: "Hot", icon: Flame, color: "text-red-600", bg: "bg-red-100", border: "border-red-300" },
  warm: { label: "Warm", icon: ThermometerSun, color: "text-amber-600", bg: "bg-amber-100", border: "border-amber-300" },
  cold: { label: "Cold", icon: Snowflake, color: "text-blue-600", bg: "bg-blue-100", border: "border-blue-300" },
  unqualified: { label: "Não Qualificado", icon: AlertCircle, color: "text-slate-600", bg: "bg-slate-100", border: "border-slate-300" }
};

export function calculateLeadScore(opportunity, communications = []) {
  let score = 0;
  const factors = [];

  // 1. Source Quality (0-20 points)
  const sourceScores = {
    referral: 20,
    direct_contact: 18,
    website: 15,
    real_estate_portal: 12,
    facebook_ads: 10,
    google_ads: 10,
    instagram: 8,
    linkedin: 8,
    networking: 12,
    email_marketing: 5,
    other: 5
  };
  const sourceScore = sourceScores[opportunity.lead_source] || 5;
  score += sourceScore;
  if (sourceScore >= 15) factors.push({ label: "Origem de qualidade", positive: true });

  // 2. Budget (0-25 points)
  if (opportunity.budget) {
    if (opportunity.budget >= 500000) {
      score += 25;
      factors.push({ label: "Orçamento alto (>500k)", positive: true });
    } else if (opportunity.budget >= 250000) {
      score += 20;
      factors.push({ label: "Orçamento médio-alto", positive: true });
    } else if (opportunity.budget >= 100000) {
      score += 15;
    } else {
      score += 10;
    }
  }

  // 3. Contact Info Completeness (0-15 points)
  let contactScore = 0;
  if (opportunity.buyer_email) contactScore += 5;
  if (opportunity.buyer_phone) contactScore += 5;
  if (opportunity.location) contactScore += 5;
  score += contactScore;
  if (contactScore >= 10) factors.push({ label: "Dados de contacto completos", positive: true });

  // 4. Engagement / Interactions (0-20 points)
  const oppCommunications = communications.filter(c => c.contact_id === opportunity.profile_id || c.opportunity_id === opportunity.id);
  const interactionCount = oppCommunications.length + (opportunity.follow_ups?.length || 0);
  
  if (interactionCount >= 5) {
    score += 20;
    factors.push({ label: `${interactionCount} interações registadas`, positive: true });
  } else if (interactionCount >= 3) {
    score += 15;
  } else if (interactionCount >= 1) {
    score += 10;
  }

  // 5. Recency (0-10 points)
  const daysSinceCreation = Math.floor((Date.now() - new Date(opportunity.created_date).getTime()) / (1000 * 60 * 60 * 24));
  if (daysSinceCreation <= 3) {
    score += 10;
    factors.push({ label: "Lead recente (<3 dias)", positive: true });
  } else if (daysSinceCreation <= 7) {
    score += 8;
  } else if (daysSinceCreation <= 14) {
    score += 5;
  } else if (daysSinceCreation > 30) {
    factors.push({ label: "Lead antigo (>30 dias)", positive: false });
  }

  // 6. Priority Flag (0-5 points)
  if (opportunity.priority === 'high') {
    score += 5;
    factors.push({ label: "Prioridade alta", positive: true });
  }

  // 7. Property Interest (0-5 points)
  if (opportunity.property_id || opportunity.property_type_interest) {
    score += 5;
    factors.push({ label: "Interesse específico em imóvel", positive: true });
  }

  // Negative factors
  if (!opportunity.buyer_phone && !opportunity.buyer_email) {
    score -= 10;
    factors.push({ label: "Sem contacto disponível", positive: false });
  }

  if (opportunity.status === 'lost') {
    score = Math.max(0, score - 30);
    factors.push({ label: "Lead perdido", positive: false });
  }

  // Determine qualification
  let qualification;
  if (score >= 70) qualification = 'hot';
  else if (score >= 45) qualification = 'warm';
  else if (score >= 25) qualification = 'cold';
  else qualification = 'unqualified';

  return {
    score: Math.min(100, Math.max(0, score)),
    qualification,
    factors
  };
}

export async function scoreLeadWithAI(opportunity) {
  try {
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Analisa este lead imobiliário e atribui uma qualificação baseada nos dados disponíveis.

DADOS DO LEAD:
- Nome: ${opportunity.buyer_name || 'Não disponível'}
- Email: ${opportunity.buyer_email || 'Não disponível'}
- Telefone: ${opportunity.buyer_phone || 'Não disponível'}
- Tipo: ${opportunity.lead_type || 'comprador'}
- Origem: ${opportunity.lead_source || 'Desconhecida'}
- Orçamento: ${opportunity.budget ? `€${opportunity.budget.toLocaleString()}` : 'Não definido'}
- Localização de interesse: ${opportunity.location || 'Não especificada'}
- Tipo de imóvel: ${opportunity.property_type_interest || 'Não especificado'}
- Mensagem: ${opportunity.message || 'Nenhuma'}
- Data de criação: ${opportunity.created_date}
- Estado atual: ${opportunity.status}
- Prioridade: ${opportunity.priority || 'normal'}

INSTRUÇÕES:
1. Analisa a qualidade e completude dos dados
2. Considera o potencial de conversão
3. Avalia o nível de interesse demonstrado
4. Atribui uma qualificação: "hot", "warm", "cold" ou "unqualified"
5. Atribui um score de 0-100
6. Explica brevemente a razão (máximo 100 caracteres)

CRITÉRIOS:
- HOT (70-100): Lead com alto potencial, dados completos, orçamento definido, interesse claro
- WARM (45-69): Lead promissor, alguns dados, potencial médio
- COLD (25-44): Lead com pouco interesse ou dados incompletos
- UNQUALIFIED (0-24): Lead sem potencial ou dados insuficientes`,
      response_json_schema: {
        type: "object",
        properties: {
          qualification: { type: "string", enum: ["hot", "warm", "cold", "unqualified"] },
          score: { type: "number" },
          reason: { type: "string" }
        }
      }
    });

    return result;
  } catch (error) {
    console.error("Erro ao qualificar lead com IA:", error);
    return null;
  }
}

export default function AILeadScoring({ opportunity, communications = [], onScoreUpdate, compact = false }) {
  const queryClient = useQueryClient();
  const [isScoring, setIsScoring] = React.useState(false);
  const [localScore, setLocalScore] = React.useState(null);

  // Calculate local score
  const calculatedScore = React.useMemo(() => {
    return calculateLeadScore(opportunity, communications);
  }, [opportunity, communications]);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Opportunity.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      onScoreUpdate?.();
    }
  });

  const handleAIScore = async () => {
    setIsScoring(true);
    try {
      const aiResult = await scoreLeadWithAI(opportunity);
      
      if (aiResult) {
        setLocalScore(aiResult);
        
        // Update the opportunity with AI score
        await updateMutation.mutateAsync({
          id: opportunity.id,
          data: {
            qualification_status: aiResult.qualification,
            qualification_score: aiResult.score,
            qualification_details: {
              ai_reason: aiResult.reason,
              scored_at: new Date().toISOString(),
              method: 'ai'
            }
          }
        });
        
        toast.success(`Lead qualificado como ${qualificationConfig[aiResult.qualification].label}`);
      } else {
        // Fallback to calculated score
        await updateMutation.mutateAsync({
          id: opportunity.id,
          data: {
            qualification_status: calculatedScore.qualification,
            qualification_score: calculatedScore.score,
            qualification_details: {
              factors: calculatedScore.factors,
              scored_at: new Date().toISOString(),
              method: 'algorithm'
            }
          }
        });
        toast.success(`Lead qualificado automaticamente`);
      }
    } catch (error) {
      toast.error("Erro ao qualificar lead");
    }
    setIsScoring(false);
  };

  const handleQuickScore = async () => {
    try {
      await updateMutation.mutateAsync({
        id: opportunity.id,
        data: {
          qualification_status: calculatedScore.qualification,
          qualification_score: calculatedScore.score,
          qualification_details: {
            factors: calculatedScore.factors,
            scored_at: new Date().toISOString(),
            method: 'algorithm'
          }
        }
      });
      toast.success(`Lead qualificado como ${qualificationConfig[calculatedScore.qualification].label}`);
    } catch (error) {
      toast.error("Erro ao qualificar lead");
    }
  };

  const currentScore = localScore || (opportunity.qualification_score ? {
    score: opportunity.qualification_score,
    qualification: opportunity.qualification_status,
    reason: opportunity.qualification_details?.ai_reason
  } : calculatedScore);

  const config = qualificationConfig[currentScore.qualification] || qualificationConfig.unqualified;
  const Icon = config.icon;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Badge className={`${config.bg} ${config.color} ${config.border} border`}>
          <Icon className="w-3 h-3 mr-1" />
          {currentScore.score}
        </Badge>
        {!opportunity.qualification_score && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleQuickScore}
            disabled={updateMutation.isPending}
            className="h-6 px-2 text-xs"
          >
            <Sparkles className="w-3 h-3" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className={`${config.border} border-2`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            Lead Scoring
          </div>
          <Badge className={`${config.bg} ${config.color}`}>
            <Icon className="w-4 h-4 mr-1" />
            {config.label}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Score Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Score</span>
            <span className={`text-2xl font-bold ${config.color}`}>
              {currentScore.score}
              <span className="text-sm font-normal text-slate-500">/100</span>
            </span>
          </div>
          <Progress 
            value={currentScore.score} 
            className={`h-3 ${
              currentScore.qualification === 'hot' ? '[&>div]:bg-red-500' :
              currentScore.qualification === 'warm' ? '[&>div]:bg-amber-500' :
              currentScore.qualification === 'cold' ? '[&>div]:bg-blue-500' :
              '[&>div]:bg-slate-400'
            }`}
          />
        </div>

        {/* Factors */}
        {calculatedScore.factors.length > 0 && (
          <div className="space-y-1">
            <span className="text-sm font-medium text-slate-700">Fatores:</span>
            <div className="flex flex-wrap gap-1">
              {calculatedScore.factors.slice(0, 4).map((factor, idx) => (
                <Badge 
                  key={idx} 
                  variant="outline" 
                  className={`text-xs ${factor.positive ? 'text-green-700 border-green-300' : 'text-red-700 border-red-300'}`}
                >
                  {factor.positive ? '✓' : '✗'} {factor.label}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* AI Reason */}
        {currentScore.reason && (
          <div className="text-sm text-slate-600 bg-slate-50 p-2 rounded-lg">
            💡 {currentScore.reason}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            onClick={handleQuickScore}
            disabled={updateMutation.isPending}
            variant="outline"
            size="sm"
            className="flex-1"
          >
            <TrendingUp className="w-4 h-4 mr-1" />
            Algoritmo
          </Button>
          <Button
            onClick={handleAIScore}
            disabled={isScoring || updateMutation.isPending}
            size="sm"
            className="flex-1 bg-purple-600 hover:bg-purple-700"
          >
            {isScoring ? (
              <>
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                A analisar...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-1" />
                IA Scoring
              </>
            )}
          </Button>
        </div>

        {opportunity.qualification_details?.scored_at && (
          <p className="text-xs text-slate-500 text-center">
            Última análise: {new Date(opportunity.qualification_details.scored_at).toLocaleString('pt-PT')}
            {opportunity.qualification_details.method === 'ai' && ' (IA)'}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// Bulk scoring function for multiple leads
export async function bulkScoreLeads(opportunities, updateFn) {
  const results = [];
  
  for (const opp of opportunities) {
    const score = calculateLeadScore(opp);
    
    await updateFn({
      id: opp.id,
      data: {
        qualification_status: score.qualification,
        qualification_score: score.score,
        qualification_details: {
          factors: score.factors,
          scored_at: new Date().toISOString(),
          method: 'algorithm'
        }
      }
    });
    
    results.push({ id: opp.id, ...score });
  }
  
  return results;
}