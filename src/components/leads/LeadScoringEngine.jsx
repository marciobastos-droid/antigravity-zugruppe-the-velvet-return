import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Target, TrendingUp, TrendingDown, Minus, Phone, Mail,
  MapPin, Euro, Calendar, MessageSquare, Eye, Clock,
  Sparkles, RefreshCw, Info, Zap, Award
} from "lucide-react";
import { toast } from "sonner";

// Scoring weights
const SCORING_WEIGHTS = {
  contactCompleteness: 20,
  budgetClarity: 15,
  locationSpecificity: 10,
  engagement: 25,
  recency: 15,
  intentSignals: 15
};

export const calculateLeadScore = (lead, communications = [], propertyViews = []) => {
  let score = 0;
  const breakdown = [];

  // 1. Contact Completeness (20 pts)
  let contactScore = 0;
  if (lead.buyer_email) contactScore += 8;
  if (lead.buyer_phone) contactScore += 8;
  if (lead.buyer_name && lead.buyer_name.split(' ').length > 1) contactScore += 4;
  breakdown.push({
    category: "Dados de Contacto",
    score: contactScore,
    max: SCORING_WEIGHTS.contactCompleteness,
    details: [
      lead.buyer_email ? "✓ Email" : "✗ Email em falta",
      lead.buyer_phone ? "✓ Telefone" : "✗ Telefone em falta",
      lead.buyer_name?.split(' ').length > 1 ? "✓ Nome completo" : "✗ Nome incompleto"
    ]
  });
  score += contactScore;

  // 2. Budget Clarity (15 pts)
  let budgetScore = 0;
  if (lead.budget) {
    budgetScore += 10;
    if (lead.budget >= 100000) budgetScore += 5; // Higher budgets score more
  }
  breakdown.push({
    category: "Orçamento",
    score: budgetScore,
    max: SCORING_WEIGHTS.budgetClarity,
    details: lead.budget ? [`✓ €${lead.budget.toLocaleString()}`] : ["✗ Orçamento não definido"]
  });
  score += budgetScore;

  // 3. Location Specificity (10 pts)
  let locationScore = 0;
  if (lead.location) {
    locationScore += 7;
    if (lead.location.includes(',') || lead.location.length > 10) locationScore += 3;
  }
  breakdown.push({
    category: "Localização",
    score: locationScore,
    max: SCORING_WEIGHTS.locationSpecificity,
    details: lead.location ? [`✓ ${lead.location}`] : ["✗ Localização não especificada"]
  });
  score += locationScore;

  // 4. Engagement (25 pts)
  let engagementScore = 0;
  const recentComms = communications.filter(c => {
    const date = new Date(c.communication_date || c.created_date);
    const daysDiff = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
    return daysDiff <= 30;
  });
  
  engagementScore += Math.min(recentComms.length * 5, 15);
  engagementScore += Math.min(propertyViews.length * 2, 10);
  
  breakdown.push({
    category: "Engagement",
    score: engagementScore,
    max: SCORING_WEIGHTS.engagement,
    details: [
      `${recentComms.length} interações nos últimos 30 dias`,
      `${propertyViews.length} imóveis visualizados`
    ]
  });
  score += engagementScore;

  // 5. Recency (15 pts)
  let recencyScore = 0;
  const lastContact = lead.last_contact_date ? new Date(lead.last_contact_date) : new Date(lead.created_date);
  const daysSinceContact = (Date.now() - lastContact.getTime()) / (1000 * 60 * 60 * 24);
  
  if (daysSinceContact <= 3) recencyScore = 15;
  else if (daysSinceContact <= 7) recencyScore = 12;
  else if (daysSinceContact <= 14) recencyScore = 8;
  else if (daysSinceContact <= 30) recencyScore = 4;
  else recencyScore = 0;
  
  breakdown.push({
    category: "Recência",
    score: recencyScore,
    max: SCORING_WEIGHTS.recency,
    details: [`Último contacto: ${Math.round(daysSinceContact)} dias atrás`]
  });
  score += recencyScore;

  // 6. Intent Signals (15 pts)
  let intentScore = 0;
  if (lead.property_type_interest) intentScore += 5;
  if (lead.message && lead.message.length > 50) intentScore += 5;
  if (lead.status === 'qualified' || lead.status === 'proposal') intentScore += 5;
  
  breakdown.push({
    category: "Sinais de Intenção",
    score: intentScore,
    max: SCORING_WEIGHTS.intentSignals,
    details: [
      lead.property_type_interest ? `✓ Interesse: ${lead.property_type_interest}` : "✗ Tipo não especificado",
      lead.message?.length > 50 ? "✓ Mensagem detalhada" : "✗ Mensagem curta/ausente",
      ['qualified', 'proposal', 'negotiation'].includes(lead.status) ? "✓ Em processo ativo" : "○ Fase inicial"
    ]
  });
  score += intentScore;

  return {
    score: Math.round(score),
    maxScore: 100,
    breakdown,
    grade: score >= 80 ? 'A' : score >= 60 ? 'B' : score >= 40 ? 'C' : score >= 20 ? 'D' : 'F',
    status: score >= 70 ? 'hot' : score >= 40 ? 'warm' : 'cold'
  };
};

export default function LeadScoringEngine({ lead, showDetails = true, compact = false }) {
  const [scoring, setScoring] = useState(null);
  const [calculating, setCalculating] = useState(false);

  const { data: communications = [] } = useQuery({
    queryKey: ['leadCommunications', lead?.id],
    queryFn: async () => {
      if (!lead?.id) return [];
      return base44.entities.CommunicationLog.filter({ opportunity_id: lead.id });
    },
    enabled: !!lead?.id
  });

  const { data: propertyInterests = [] } = useQuery({
    queryKey: ['leadPropertyViews', lead?.contact_id],
    queryFn: async () => {
      if (!lead?.contact_id) return [];
      return base44.entities.ClientPropertyInterest.filter({ contact_id: lead.contact_id });
    },
    enabled: !!lead?.contact_id
  });

  useEffect(() => {
    if (lead) {
      const result = calculateLeadScore(lead, communications, propertyInterests);
      setScoring(result);
    }
  }, [lead, communications, propertyInterests]);

  const recalculateScore = async () => {
    setCalculating(true);
    const result = calculateLeadScore(lead, communications, propertyInterests);
    setScoring(result);
    
    // Save to lead
    try {
      await base44.entities.Opportunity.update(lead.id, {
        qualification_score: result.score,
        qualification_status: result.status,
        qualification_date: new Date().toISOString()
      });
      toast.success("Score atualizado!");
    } catch (e) {
      console.error(e);
    }
    setCalculating(false);
  };

  if (!scoring) return null;

  const getGradeColor = (grade) => {
    switch (grade) {
      case 'A': return 'bg-emerald-500 text-white';
      case 'B': return 'bg-green-500 text-white';
      case 'C': return 'bg-yellow-500 text-white';
      case 'D': return 'bg-orange-500 text-white';
      default: return 'bg-red-500 text-white';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'hot': return <TrendingUp className="w-4 h-4 text-red-500" />;
      case 'warm': return <Minus className="w-4 h-4 text-orange-500" />;
      default: return <TrendingDown className="w-4 h-4 text-blue-500" />;
    }
  };

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2 cursor-help">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${getGradeColor(scoring.grade)}`}>
                {scoring.grade}
              </div>
              <div className="text-sm">
                <span className="font-medium">{scoring.score}</span>
                <span className="text-slate-400">/100</span>
              </div>
              {getStatusIcon(scoring.status)}
            </div>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <div className="space-y-1 text-xs">
              {scoring.breakdown.map((b, i) => (
                <div key={i} className="flex justify-between gap-4">
                  <span>{b.category}</span>
                  <span className="font-medium">{b.score}/{b.max}</span>
                </div>
              ))}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Card className="border-indigo-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Target className="w-5 h-5 text-indigo-600" />
            Lead Score
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={recalculateScore}
            disabled={calculating}
          >
            <RefreshCw className={`w-4 h-4 ${calculating ? 'animate-spin' : ''}`} />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Score Display */}
        <div className="flex items-center gap-4">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-2xl ${getGradeColor(scoring.grade)}`}>
            {scoring.grade}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-3xl font-bold text-slate-900">{scoring.score}</span>
              <span className="text-slate-400">/100</span>
              {getStatusIcon(scoring.status)}
            </div>
            <Progress value={scoring.score} className="h-2" />
          </div>
        </div>

        {/* Breakdown */}
        {showDetails && (
          <div className="space-y-3 pt-2 border-t">
            {scoring.breakdown.map((category, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700">{category.category}</span>
                  <span className={`font-semibold ${category.score === category.max ? 'text-green-600' : category.score === 0 ? 'text-red-500' : 'text-slate-600'}`}>
                    {category.score}/{category.max}
                  </span>
                </div>
                <Progress value={(category.score / category.max) * 100} className="h-1.5" />
                <div className="flex flex-wrap gap-1">
                  {category.details.map((detail, i) => (
                    <Badge 
                      key={i} 
                      variant="outline" 
                      className={`text-xs ${
                        detail.startsWith('✓') ? 'border-green-300 text-green-700 bg-green-50' :
                        detail.startsWith('✗') ? 'border-red-300 text-red-700 bg-red-50' :
                        'border-slate-300 text-slate-600'
                      }`}
                    >
                      {detail}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Helper component for inline score display
export function LeadScoreBadge({ lead }) {
  const score = lead.qualification_score || 0;
  const status = lead.qualification_status;
  
  const getColor = () => {
    if (score >= 70) return 'bg-red-100 text-red-800 border-red-300';
    if (score >= 40) return 'bg-orange-100 text-orange-800 border-orange-300';
    return 'bg-blue-100 text-blue-800 border-blue-300';
  };

  return (
    <Badge className={`${getColor()} border`}>
      {status === 'hot' && '🔥'}
      {status === 'warm' && '🟡'}
      {status === 'cold' && '❄️'}
      {score}/100
    </Badge>
  );
}