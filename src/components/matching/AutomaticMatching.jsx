import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Zap, Loader2, Play, Pause, Clock, Users, Building2,
  Mail, Bell, CheckCircle2, AlertCircle, Settings,
  TrendingUp, Calendar, Send, Eye, RefreshCw, 
  MailCheck, Target, Sparkles, Filter, History
} from "lucide-react";
import { toast } from "sonner";
import moment from "moment";

export default function AutomaticMatching() {
  const queryClient = useQueryClient();
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState("");
  const [matchResults, setMatchResults] = useState([]);
  const [activeTab, setActiveTab] = useState("run");
  
  // Settings state
  const [settings, setSettings] = useState({
    minScore: 70,
    maxMatchesPerProfile: 5,
    notifyByEmail: true,
    createNotifications: true,
    onlyNewProperties: true,
    daysToConsiderNew: 7
  });

  // Fetch data
  const { data: profiles = [], isLoading: loadingProfiles } = useQuery({
    queryKey: ['buyerProfiles'],
    queryFn: () => base44.entities.BuyerProfile.list('-created_date')
  });

  const { data: properties = [], isLoading: loadingProperties } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list('-created_date')
  });

  const { data: interactions = [] } = useQuery({
    queryKey: ['propertyInteractions'],
    queryFn: () => base44.entities.PropertyInteraction.list('-created_date')
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ['matchNotifications'],
    queryFn: () => base44.entities.Notification.filter({ type: 'lead' }, '-created_date', 50)
  });

  const activeProfiles = profiles.filter(p => p.status === 'active');
  const activeProperties = properties.filter(p => 
    p.status === 'active' && p.availability_status === 'available'
  );

  // Calculate match score
  const calculateMatchScore = (profile, property) => {
    let score = 0;
    let maxScore = 0;

    // Price match (30 points)
    maxScore += 30;
    if (profile.budget_min || profile.budget_max) {
      const price = property.price || 0;
      const min = profile.budget_min || 0;
      const max = profile.budget_max || Infinity;
      
      if (price >= min && price <= max) {
        score += 30;
      } else if (price >= min * 0.9 && price <= max * 1.1) {
        score += 15;
      }
    } else {
      score += 20;
    }

    // Location match (25 points)
    maxScore += 25;
    if (profile.locations?.length > 0) {
      const propertyLocation = (property.city || '').toLowerCase();
      const propertyState = (property.state || '').toLowerCase();
      const matched = profile.locations.some(loc => 
        propertyLocation.includes(loc.toLowerCase()) || 
        propertyState.includes(loc.toLowerCase()) ||
        loc.toLowerCase().includes(propertyLocation)
      );
      if (matched) score += 25;
    } else {
      score += 15;
    }

    // Property type match (20 points)
    maxScore += 20;
    if (profile.property_types?.length > 0) {
      if (profile.property_types.includes(property.property_type)) {
        score += 20;
      }
    } else {
      score += 12;
    }

    // Bedrooms match (15 points)
    maxScore += 15;
    if (profile.bedrooms_min) {
      if (property.bedrooms >= profile.bedrooms_min) {
        score += 15;
      } else if (property.bedrooms >= profile.bedrooms_min - 1) {
        score += 7;
      }
    } else {
      score += 10;
    }

    // Listing type match (10 points)
    maxScore += 10;
    if (profile.listing_type && profile.listing_type !== 'both') {
      if (property.listing_type === profile.listing_type) {
        score += 10;
      }
    } else {
      score += 10;
    }

    return Math.round((score / maxScore) * 100);
  };

  // Check if property was already sent to profile
  const wasAlreadySent = (profileId, propertyId) => {
    return interactions.some(i => 
      i.profile_id === profileId && 
      i.property_id === propertyId &&
      i.interaction_type === 'contacted'
    );
  };

  // Run automatic matching
  const runAutomaticMatching = async () => {
    setRunning(true);
    setProgress(0);
    setProgressText("A iniciar matching automático...");
    setMatchResults([]);

    const results = [];
    const cutoffDate = moment().subtract(settings.daysToConsiderNew, 'days').toDate();

    try {
      // Filter properties if only new
      let propertiesToMatch = activeProperties;
      if (settings.onlyNewProperties) {
        propertiesToMatch = activeProperties.filter(p => 
          new Date(p.created_date) >= cutoffDate
        );
      }

      setProgressText(`A analisar ${activeProfiles.length} perfis com ${propertiesToMatch.length} imóveis...`);
      setProgress(10);

      const totalProfiles = activeProfiles.length;

      for (let i = 0; i < totalProfiles; i++) {
        const profile = activeProfiles[i];
        setProgress(10 + Math.round((i / totalProfiles) * 70));
        setProgressText(`A processar perfil ${i + 1} de ${totalProfiles}: ${profile.buyer_name}`);

        // Calculate scores for all properties
        const matches = propertiesToMatch
          .map(property => ({
            property,
            score: calculateMatchScore(profile, property),
            alreadySent: wasAlreadySent(profile.id, property.id)
          }))
          .filter(m => m.score >= settings.minScore && !m.alreadySent)
          .sort((a, b) => b.score - a.score)
          .slice(0, settings.maxMatchesPerProfile);

        if (matches.length > 0) {
          results.push({
            profile,
            matches,
            sent: false
          });
        }
      }

      setProgress(85);
      setProgressText(`Encontrados ${results.length} perfis com matches. A criar notificações...`);

      // Create notifications and interactions
      for (const result of results) {
        const profile = result.profile;
        
        for (const match of result.matches) {
          // Create interaction record
          await base44.entities.PropertyInteraction.create({
            profile_id: profile.id,
            property_id: match.property.id,
            interaction_type: 'contacted',
            match_score: match.score,
            property_features: {
              title: match.property.title,
              price: match.property.price,
              city: match.property.city
            }
          });

          // Create notification if enabled
          if (settings.createNotifications) {
            await base44.entities.Notification.create({
              title: `Novo match para ${profile.buyer_name}`,
              message: `${match.property.title} (${match.score}% compatibilidade) - €${match.property.price?.toLocaleString()}`,
              type: 'lead',
              priority: match.score >= 90 ? 'high' : 'medium',
              related_id: profile.id,
              related_type: 'BuyerProfile',
              user_email: profile.assigned_agent || profile.buyer_email,
              metadata: {
                property_id: match.property.id,
                match_score: match.score
              }
            });
          }
        }

        // Update profile last match date
        await base44.entities.BuyerProfile.update(profile.id, {
          last_match_date: new Date().toISOString()
        });

        result.sent = true;
      }

      setProgress(100);
      setMatchResults(results);
      
      const totalMatches = results.reduce((sum, r) => sum + r.matches.length, 0);
      toast.success(`Matching concluído! ${totalMatches} matches encontrados para ${results.length} perfis.`);

      queryClient.invalidateQueries({ queryKey: ['propertyInteractions'] });
      queryClient.invalidateQueries({ queryKey: ['matchNotifications'] });
      queryClient.invalidateQueries({ queryKey: ['buyerProfiles'] });

    } catch (error) {
      console.error("Error in automatic matching:", error);
      toast.error("Erro no matching automático");
    }

    setRunning(false);
  };

  const isLoading = loadingProfiles || loadingProperties;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  const recentMatches = interactions
    .filter(i => i.interaction_type === 'contacted')
    .slice(0, 20);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 border-emerald-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Matching Automático</h2>
              <p className="text-sm text-slate-600 font-normal">
                Execute matching em massa e notifique clientes automaticamente
              </p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white/80 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-emerald-600">{activeProfiles.length}</div>
              <div className="text-sm text-slate-600">Perfis Ativos</div>
            </div>
            <div className="bg-white/80 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-teal-600">{activeProperties.length}</div>
              <div className="text-sm text-slate-600">Imóveis Disponíveis</div>
            </div>
            <div className="bg-white/80 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-cyan-600">
                {activeProperties.filter(p => 
                  new Date(p.created_date) >= moment().subtract(settings.daysToConsiderNew, 'days').toDate()
                ).length}
              </div>
              <div className="text-sm text-slate-600">Novos ({settings.daysToConsiderNew}d)</div>
            </div>
            <div className="bg-white/80 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-blue-600">{interactions.length}</div>
              <div className="text-sm text-slate-600">Total Matches</div>
            </div>
            <div className="bg-white/80 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-purple-600">
                {profiles.filter(p => p.last_match_date).length}
              </div>
              <div className="text-sm text-slate-600">Perfis Notificados</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="run" className="flex items-center gap-2">
            <Play className="w-4 h-4" />
            Executar
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Configurações
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="w-4 h-4" />
            Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="run" className="space-y-4 mt-4">
          {/* Run Matching Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="w-4 h-4" />
                Executar Matching Automático
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Current Settings Summary */}
              <div className="mb-6 p-4 bg-slate-50 rounded-lg">
                <h4 className="font-medium text-slate-900 mb-2">Configurações Atuais</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Score Mínimo: {settings.minScore}%</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Máx. Matches: {settings.maxMatchesPerProfile}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={settings.onlyNewProperties ? "default" : "outline"}>
                      {settings.onlyNewProperties ? `Só novos (${settings.daysToConsiderNew}d)` : "Todos imóveis"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={settings.createNotifications ? "default" : "outline"}>
                      {settings.createNotifications ? "Notificações ON" : "Notificações OFF"}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Run Button */}
              <div className="flex justify-center">
                <Button
                  size="lg"
                  onClick={runAutomaticMatching}
                  disabled={running || activeProfiles.length === 0}
                  className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 px-8"
                >
                  {running ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      A processar...
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5 mr-2" />
                      Iniciar Matching Automático
                    </>
                  )}
                </Button>
              </div>

              {/* Progress */}
              {running && (
                <div className="mt-6 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">{progressText}</span>
                    <span className="font-medium">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              )}

              {/* Results */}
              {!running && matchResults.length > 0 && (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-slate-900">
                      Resultados do Matching
                    </h4>
                    <Badge className="bg-emerald-100 text-emerald-800">
                      {matchResults.reduce((sum, r) => sum + r.matches.length, 0)} matches enviados
                    </Badge>
                  </div>

                  <ScrollArea className="h-80">
                    <div className="space-y-3">
                      {matchResults.map((result, idx) => (
                        <div key={idx} className="p-4 border rounded-lg bg-white">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-semibold">
                                {result.profile.buyer_name?.[0]?.toUpperCase()}
                              </div>
                              <div>
                                <h5 className="font-medium text-slate-900">{result.profile.buyer_name}</h5>
                                <p className="text-xs text-slate-500">{result.profile.buyer_email}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{result.matches.length} matches</Badge>
                              {result.sent && (
                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                              )}
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2 mt-2">
                            {result.matches.map((match, mIdx) => (
                              <Badge key={mIdx} variant="secondary" className="text-xs">
                                {match.property.title?.substring(0, 25)}... ({match.score}%)
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {!running && matchResults.length === 0 && progress === 100 && (
                <div className="mt-6 text-center py-8">
                  <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-2" />
                  <p className="text-slate-600">Nenhum novo match encontrado com os critérios atuais.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Configurações do Matching
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Min Score */}
              <div className="space-y-3">
                <Label className="flex items-center justify-between">
                  <span>Score Mínimo de Compatibilidade</span>
                  <Badge variant="outline">{settings.minScore}%</Badge>
                </Label>
                <Slider
                  value={[settings.minScore]}
                  onValueChange={([val]) => setSettings(s => ({ ...s, minScore: val }))}
                  min={50}
                  max={95}
                  step={5}
                  className="w-full"
                />
                <p className="text-xs text-slate-500">
                  Apenas imóveis com score igual ou superior serão incluídos
                </p>
              </div>

              {/* Max Matches Per Profile */}
              <div className="space-y-3">
                <Label className="flex items-center justify-between">
                  <span>Máximo de Matches por Perfil</span>
                  <Badge variant="outline">{settings.maxMatchesPerProfile}</Badge>
                </Label>
                <Slider
                  value={[settings.maxMatchesPerProfile]}
                  onValueChange={([val]) => setSettings(s => ({ ...s, maxMatchesPerProfile: val }))}
                  min={1}
                  max={10}
                  step={1}
                  className="w-full"
                />
              </div>

              {/* Days to Consider New */}
              <div className="space-y-3">
                <Label className="flex items-center justify-between">
                  <span>Considerar Novos (dias)</span>
                  <Badge variant="outline">{settings.daysToConsiderNew} dias</Badge>
                </Label>
                <Slider
                  value={[settings.daysToConsiderNew]}
                  onValueChange={([val]) => setSettings(s => ({ ...s, daysToConsiderNew: val }))}
                  min={1}
                  max={30}
                  step={1}
                  className="w-full"
                />
              </div>

              {/* Toggles */}
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Apenas Imóveis Novos</Label>
                    <p className="text-xs text-slate-500">Considerar apenas imóveis criados recentemente</p>
                  </div>
                  <Switch
                    checked={settings.onlyNewProperties}
                    onCheckedChange={(checked) => setSettings(s => ({ ...s, onlyNewProperties: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Criar Notificações</Label>
                    <p className="text-xs text-slate-500">Criar notificações no sistema para cada match</p>
                  </div>
                  <Switch
                    checked={settings.createNotifications}
                    onCheckedChange={(checked) => setSettings(s => ({ ...s, createNotifications: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Notificar por Email</Label>
                    <p className="text-xs text-slate-500">Enviar email aos clientes com os matches</p>
                  </div>
                  <Switch
                    checked={settings.notifyByEmail}
                    onCheckedChange={(checked) => setSettings(s => ({ ...s, notifyByEmail: checked }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <History className="w-4 h-4" />
                  Histórico de Matches
                </span>
                <Badge variant="outline">{recentMatches.length} registos</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentMatches.length > 0 ? (
                <ScrollArea className="h-96">
                  <div className="space-y-2">
                    {recentMatches.map((interaction, idx) => {
                      const profile = profiles.find(p => p.id === interaction.profile_id);
                      const property = properties.find(p => p.id === interaction.property_id);
                      
                      return (
                        <div key={idx} className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-sm font-medium">
                              {profile?.buyer_name?.[0]?.toUpperCase() || '?'}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-900">
                                {profile?.buyer_name || 'Perfil desconhecido'}
                              </p>
                              <p className="text-xs text-slate-500">
                                {property?.title?.substring(0, 40) || 'Imóvel'}...
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="text-xs">
                              {interaction.match_score}%
                            </Badge>
                            <span className="text-xs text-slate-400">
                              {moment(interaction.created_date).fromNow()}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-12">
                  <History className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500">Sem histórico de matches</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}