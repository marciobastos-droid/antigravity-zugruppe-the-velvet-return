import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Zap, Flame, ThermometerSun, Snowflake, Bell, Settings2,
  Play, Loader2, CheckCircle2, TrendingUp, Users, RefreshCw,
  AlertTriangle, Clock, Mail, MessageSquare
} from "lucide-react";
import { toast } from "sonner";
import { calculateLeadScore } from "../opportunities/AILeadScoring";

// Scoring criteria weights - configurable
const DEFAULT_WEIGHTS = {
  source_quality: 15,
  budget_defined: 20,
  contact_completeness: 15,
  engagement_level: 25,
  recency: 15,
  intent_signals: 10
};

// Score thresholds for categorization
const DEFAULT_THRESHOLDS = {
  hot: 70,
  warm: 45,
  cold: 25
};

export function calculateAutomatedScore(opportunity, communications = [], settings = {}) {
  const weights = settings.weights || DEFAULT_WEIGHTS;
  const thresholds = settings.thresholds || DEFAULT_THRESHOLDS;
  
  let score = 0;
  const factors = [];
  const signals = [];

  // 1. Source Quality (0-15 pts default)
  const sourceScores = {
    referral: 15,
    direct_contact: 14,
    website: 12,
    real_estate_portal: 10,
    facebook_ads: 8,
    google_ads: 8,
    instagram: 6,
    linkedin: 7,
    networking: 11,
    email_marketing: 5,
    other: 4
  };
  const sourceWeight = weights.source_quality / 15;
  const sourceScore = (sourceScores[opportunity.lead_source] || 4) * sourceWeight;
  score += sourceScore;
  if (sourceScore >= 10) {
    factors.push({ label: "Origem qualificada", positive: true, weight: sourceScore });
    signals.push("high_quality_source");
  }

  // 2. Budget Defined (0-20 pts default)
  const budgetWeight = weights.budget_defined / 20;
  let budgetScore = 0;
  if (opportunity.budget) {
    if (opportunity.budget >= 500000) budgetScore = 20 * budgetWeight;
    else if (opportunity.budget >= 250000) budgetScore = 17 * budgetWeight;
    else if (opportunity.budget >= 100000) budgetScore = 14 * budgetWeight;
    else budgetScore = 10 * budgetWeight;
    factors.push({ label: `Orçamento: €${opportunity.budget.toLocaleString()}`, positive: true, weight: budgetScore });
    signals.push("budget_defined");
  }
  score += budgetScore;

  // 3. Contact Completeness (0-15 pts default)
  const contactWeight = weights.contact_completeness / 15;
  let contactScore = 0;
  if (opportunity.buyer_email) contactScore += 5 * contactWeight;
  if (opportunity.buyer_phone) contactScore += 5 * contactWeight;
  if (opportunity.buyer_name?.split(' ').length > 1) contactScore += 3 * contactWeight;
  if (opportunity.location) contactScore += 2 * contactWeight;
  score += contactScore;
  if (contactScore >= 10) {
    factors.push({ label: "Dados completos", positive: true, weight: contactScore });
    signals.push("complete_contact");
  } else if (!opportunity.buyer_phone && !opportunity.buyer_email) {
    factors.push({ label: "Sem contacto", positive: false, weight: -5 });
    signals.push("missing_contact");
    score -= 5;
  }

  // 4. Engagement Level (0-25 pts default)
  const engagementWeight = weights.engagement_level / 25;
  const leadComms = communications.filter(c => 
    c.contact_id === opportunity.profile_id || 
    c.contact_id === opportunity.contact_id ||
    c.opportunity_id === opportunity.id
  );
  
  // Recent interactions (last 7 days)
  const recentComms = leadComms.filter(c => {
    const date = new Date(c.communication_date || c.created_date);
    return (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24) <= 7;
  });
  
  let engagementScore = 0;
  const totalInteractions = leadComms.length + (opportunity.follow_ups?.length || 0);
  
  if (totalInteractions >= 5) {
    engagementScore = 25 * engagementWeight;
    signals.push("high_engagement");
  } else if (totalInteractions >= 3) {
    engagementScore = 18 * engagementWeight;
    signals.push("medium_engagement");
  } else if (totalInteractions >= 1) {
    engagementScore = 10 * engagementWeight;
  }
  
  // Bonus for recent activity
  if (recentComms.length >= 2) {
    engagementScore += 5 * engagementWeight;
    signals.push("recent_activity");
  }
  
  score += engagementScore;
  if (engagementScore > 15) {
    factors.push({ label: `${totalInteractions} interações`, positive: true, weight: engagementScore });
  }

  // 5. Recency (0-15 pts default)
  const recencyWeight = weights.recency / 15;
  const lastActivity = opportunity.last_contact_date || opportunity.created_date;
  const daysSinceActivity = Math.floor((Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24));
  
  let recencyScore = 0;
  if (daysSinceActivity <= 2) {
    recencyScore = 15 * recencyWeight;
    signals.push("very_recent");
    factors.push({ label: "Atividade recente (<2 dias)", positive: true, weight: recencyScore });
  } else if (daysSinceActivity <= 7) {
    recencyScore = 12 * recencyWeight;
    signals.push("recent");
  } else if (daysSinceActivity <= 14) {
    recencyScore = 8 * recencyWeight;
  } else if (daysSinceActivity <= 30) {
    recencyScore = 4 * recencyWeight;
  } else {
    factors.push({ label: `Inativo há ${daysSinceActivity} dias`, positive: false, weight: 0 });
    signals.push("stale_lead");
  }
  score += recencyScore;

  // 6. Intent Signals (0-10 pts default)
  const intentWeight = weights.intent_signals / 10;
  let intentScore = 0;
  
  if (opportunity.property_id || opportunity.property_type_interest) {
    intentScore += 4 * intentWeight;
    signals.push("specific_interest");
  }
  if (opportunity.message && opportunity.message.length > 50) {
    intentScore += 3 * intentWeight;
    signals.push("detailed_message");
  }
  if (opportunity.priority === 'high') {
    intentScore += 3 * intentWeight;
    signals.push("high_priority");
  }
  
  score += intentScore;
  if (intentScore > 5) {
    factors.push({ label: "Interesse específico", positive: true, weight: intentScore });
  }

  // Determine qualification category
  const finalScore = Math.min(100, Math.max(0, Math.round(score)));
  let qualification;
  if (finalScore >= thresholds.hot) qualification = 'hot';
  else if (finalScore >= thresholds.warm) qualification = 'warm';
  else if (finalScore >= thresholds.cold) qualification = 'cold';
  else qualification = 'unqualified';

  // Calculate urgency level
  let urgency = 'normal';
  if (signals.includes('high_engagement') && signals.includes('recent_activity')) urgency = 'high';
  else if (signals.includes('very_recent') && signals.includes('budget_defined')) urgency = 'high';
  else if (signals.includes('stale_lead')) urgency = 'low';

  return {
    score: finalScore,
    qualification,
    factors,
    signals,
    urgency,
    needsAttention: qualification === 'hot' || (qualification === 'warm' && urgency === 'high'),
    scoredAt: new Date().toISOString()
  };
}

export async function processLeadQualification(opportunity, communications, settings, updateFn, notifyFn) {
  const result = calculateAutomatedScore(opportunity, communications, settings);
  
  const previousStatus = opportunity.qualification_status;
  const previousScore = opportunity.qualification_score || 0;
  
  // Update the opportunity
  await updateFn({
    id: opportunity.id,
    data: {
      qualification_status: result.qualification,
      qualification_score: result.score,
      qualification_date: result.scoredAt,
      qualification_details: {
        factors: result.factors,
        signals: result.signals,
        urgency: result.urgency,
        method: 'automated',
        previous_status: previousStatus,
        previous_score: previousScore
      }
    }
  });

  // Check if notification needed
  const scoreImproved = result.score > previousScore + 10;
  const becameHot = result.qualification === 'hot' && previousStatus !== 'hot';
  const needsNotification = becameHot || (scoreImproved && result.qualification === 'hot');

  if (needsNotification && notifyFn) {
    await notifyFn({
      type: becameHot ? 'lead_became_hot' : 'lead_score_improved',
      opportunity,
      result,
      previousStatus,
      previousScore
    });
  }

  return { ...result, notified: needsNotification };
}

export default function AutomatedLeadQualification() {
  const queryClient = useQueryClient();
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [results, setResults] = useState(null);
  const [settings, setSettings] = useState({
    weights: DEFAULT_WEIGHTS,
    thresholds: DEFAULT_THRESHOLDS,
    autoNotify: true,
    notifyOnHot: true,
    notifyOnScoreIncrease: true
  });

  const { data: opportunities = [] } = useQuery({
    queryKey: ['opportunities'],
    queryFn: () => base44.entities.Opportunity.list('-created_date')
  });

  const { data: communications = [] } = useQuery({
    queryKey: ['allCommunications'],
    queryFn: () => base44.entities.CommunicationLog.list('-created_date', 500)
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Opportunity.update(id, data)
  });

  const notifyMutation = useMutation({
    mutationFn: async ({ type, opportunity, result }) => {
      // Create notification for the assigned agent
      const agentEmail = opportunity.assigned_to || currentUser?.email;
      if (!agentEmail) return;

      const notificationData = {
        user_email: agentEmail,
        title: type === 'lead_became_hot' 
          ? `🔥 Lead Hot: ${opportunity.buyer_name}`
          : `📈 Score aumentou: ${opportunity.buyer_name}`,
        message: type === 'lead_became_hot'
          ? `O lead ${opportunity.buyer_name} foi qualificado como HOT (${result.score}/100). Requer atenção imediata!`
          : `O score do lead ${opportunity.buyer_name} subiu para ${result.score}/100.`,
        type: 'lead_qualification',
        priority: result.qualification === 'hot' ? 'high' : 'medium',
        link: `/CRMAdvanced?tab=opportunities&id=${opportunity.id}`,
        is_read: false
      };

      return base44.entities.Notification.create(notificationData);
    }
  });

  const unqualifiedLeads = opportunities.filter(o => 
    !o.qualification_status || o.qualification_status === 'unqualified'
  );

  const activeLeads = opportunities.filter(o => 
    !['won', 'lost'].includes(o.status)
  );

  const runBulkQualification = async (leadsToProcess) => {
    setProcessing(true);
    setProgress({ current: 0, total: leadsToProcess.length });
    
    const processedResults = {
      hot: [],
      warm: [],
      cold: [],
      unqualified: [],
      notified: 0,
      errors: 0
    };

    for (let i = 0; i < leadsToProcess.length; i++) {
      const opp = leadsToProcess[i];
      setProgress({ current: i + 1, total: leadsToProcess.length });

      try {
        const result = await processLeadQualification(
          opp,
          communications,
          settings,
          updateMutation.mutateAsync,
          settings.autoNotify ? notifyMutation.mutateAsync : null
        );

        processedResults[result.qualification].push({
          id: opp.id,
          name: opp.buyer_name,
          score: result.score,
          previousScore: opp.qualification_score || 0
        });

        if (result.notified) processedResults.notified++;
      } catch (error) {
        console.error(`Error processing lead ${opp.id}:`, error);
        processedResults.errors++;
      }

      // Small delay to avoid overwhelming the API
      await new Promise(r => setTimeout(r, 100));
    }

    setResults(processedResults);
    setProcessing(false);
    queryClient.invalidateQueries({ queryKey: ['opportunities'] });
    
    toast.success(`${leadsToProcess.length - processedResults.errors} leads qualificados!`);
  };

  const qualificationCounts = {
    hot: opportunities.filter(o => o.qualification_status === 'hot').length,
    warm: opportunities.filter(o => o.qualification_status === 'warm').length,
    cold: opportunities.filter(o => o.qualification_status === 'cold').length,
    unqualified: opportunities.filter(o => !o.qualification_status || o.qualification_status === 'unqualified').length
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Zap className="w-6 h-6 text-purple-600" />
            Qualificação Automática de Leads
          </h2>
          <p className="text-sm text-slate-600">
            Categorize leads automaticamente em Hot, Warm e Cold
          </p>
        </div>
      </div>

      {/* Current Distribution */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 text-center">
            <Flame className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-red-700">{qualificationCounts.hot}</p>
            <p className="text-sm text-red-600">Hot Leads</p>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 text-center">
            <ThermometerSun className="w-8 h-8 text-amber-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-amber-700">{qualificationCounts.warm}</p>
            <p className="text-sm text-amber-600">Warm Leads</p>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4 text-center">
            <Snowflake className="w-8 h-8 text-blue-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-blue-700">{qualificationCounts.cold}</p>
            <p className="text-sm text-blue-600">Cold Leads</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 bg-slate-50">
          <CardContent className="p-4 text-center">
            <AlertTriangle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-slate-700">{qualificationCounts.unqualified}</p>
            <p className="text-sm text-slate-600">Não Qualificados</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="run">
        <TabsList>
          <TabsTrigger value="run">Executar</TabsTrigger>
          <TabsTrigger value="settings">Configurações</TabsTrigger>
          <TabsTrigger value="results">Resultados</TabsTrigger>
        </TabsList>

        <TabsContent value="run" className="space-y-4 mt-4">
          {/* Processing Progress */}
          {processing && (
            <Card className="border-purple-200 bg-purple-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
                  <span className="font-medium">A processar leads...</span>
                </div>
                <Progress value={(progress.current / progress.total) * 100} className="h-2" />
                <p className="text-sm text-slate-600 mt-2">
                  {progress.current} de {progress.total} leads processados
                </p>
              </CardContent>
            </Card>
          )}

          {/* Action Cards */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  Leads Não Qualificados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600 mb-4">
                  {unqualifiedLeads.length} leads aguardam qualificação
                </p>
                <Button
                  onClick={() => runBulkQualification(unqualifiedLeads)}
                  disabled={processing || unqualifiedLeads.length === 0}
                  className="w-full"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Qualificar {unqualifiedLeads.length} Leads
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 text-blue-500" />
                  Recalcular Todos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600 mb-4">
                  Recalcular scores de {activeLeads.length} leads ativos
                </p>
                <Button
                  onClick={() => runBulkQualification(activeLeads)}
                  disabled={processing || activeLeads.length === 0}
                  variant="outline"
                  className="w-full"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Recalcular Todos
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notificações Automáticas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Notificar agentes automaticamente</Label>
                  <p className="text-xs text-slate-500">Envia notificação quando um lead muda de categoria</p>
                </div>
                <Switch
                  checked={settings.autoNotify}
                  onCheckedChange={(v) => setSettings(s => ({ ...s, autoNotify: v }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Notificar quando lead fica Hot</Label>
                  <p className="text-xs text-slate-500">Alerta imediato para leads de alta prioridade</p>
                </div>
                <Switch
                  checked={settings.notifyOnHot}
                  onCheckedChange={(v) => setSettings(s => ({ ...s, notifyOnHot: v }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Notificar aumento significativo de score</Label>
                  <p className="text-xs text-slate-500">Quando score aumenta mais de 10 pontos</p>
                </div>
                <Switch
                  checked={settings.notifyOnScoreIncrease}
                  onCheckedChange={(v) => setSettings(s => ({ ...s, notifyOnScoreIncrease: v }))}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Limites de Categorização</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="flex justify-between mb-2">
                  <Label className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-red-500" />
                    Limite Hot
                  </Label>
                  <span className="text-sm font-medium">{settings.thresholds.hot}+</span>
                </div>
                <Slider
                  value={[settings.thresholds.hot]}
                  onValueChange={([v]) => setSettings(s => ({ 
                    ...s, 
                    thresholds: { ...s.thresholds, hot: v } 
                  }))}
                  min={50}
                  max={90}
                  step={5}
                />
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <Label className="flex items-center gap-2">
                    <ThermometerSun className="w-4 h-4 text-amber-500" />
                    Limite Warm
                  </Label>
                  <span className="text-sm font-medium">{settings.thresholds.warm}-{settings.thresholds.hot - 1}</span>
                </div>
                <Slider
                  value={[settings.thresholds.warm]}
                  onValueChange={([v]) => setSettings(s => ({ 
                    ...s, 
                    thresholds: { ...s.thresholds, warm: v } 
                  }))}
                  min={20}
                  max={settings.thresholds.hot - 5}
                  step={5}
                />
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <Label className="flex items-center gap-2">
                    <Snowflake className="w-4 h-4 text-blue-500" />
                    Limite Cold
                  </Label>
                  <span className="text-sm font-medium">{settings.thresholds.cold}-{settings.thresholds.warm - 1}</span>
                </div>
                <Slider
                  value={[settings.thresholds.cold]}
                  onValueChange={([v]) => setSettings(s => ({ 
                    ...s, 
                    thresholds: { ...s.thresholds, cold: v } 
                  }))}
                  min={10}
                  max={settings.thresholds.warm - 5}
                  step={5}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="mt-4">
          {results ? (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-3">
                <div className="p-3 bg-red-50 rounded-lg text-center">
                  <p className="text-xl font-bold text-red-700">{results.hot.length}</p>
                  <p className="text-xs text-red-600">Hot</p>
                </div>
                <div className="p-3 bg-amber-50 rounded-lg text-center">
                  <p className="text-xl font-bold text-amber-700">{results.warm.length}</p>
                  <p className="text-xs text-amber-600">Warm</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg text-center">
                  <p className="text-xl font-bold text-blue-700">{results.cold.length}</p>
                  <p className="text-xs text-blue-600">Cold</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg text-center">
                  <p className="text-xl font-bold text-green-700">{results.notified}</p>
                  <p className="text-xs text-green-600">Notificações</p>
                </div>
              </div>

              {results.hot.length > 0 && (
                <Card className="border-red-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Flame className="w-4 h-4 text-red-500" />
                      Hot Leads ({results.hot.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {results.hot.map(lead => (
                        <div key={lead.id} className="flex items-center justify-between p-2 bg-red-50 rounded">
                          <span className="text-sm font-medium">{lead.name}</span>
                          <div className="flex items-center gap-2">
                            {lead.previousScore > 0 && (
                              <span className="text-xs text-slate-500">
                                {lead.previousScore} →
                              </span>
                            )}
                            <Badge className="bg-red-100 text-red-700">{lead.score}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-slate-500">
                <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Execute uma qualificação para ver os resultados</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}