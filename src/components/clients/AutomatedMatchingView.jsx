import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Bell, TrendingUp, MapPin, DollarSign, Bed, Maximize, Eye, RefreshCw, Send, Search, Sparkles, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function AutomatedMatchingView({ profiles = [] }) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = React.useState("");
  const [processingMatches, setProcessingMatches] = React.useState(false);
  const [expandedProfile, setExpandedProfile] = React.useState(null);

  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list('-created_date'),
  });

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me(),
  });

  const calculateMatchScore = (profile, property) => {
    let score = 0;
    let maxScore = 0;
    const reasons = [];

    // Price match
    if (profile.budget_min || profile.budget_max) {
      maxScore += 30;
      const inBudget = 
        (!profile.budget_min || property.price >= profile.budget_min) &&
        (!profile.budget_max || property.price <= profile.budget_max);
      
      if (inBudget) {
        score += 30;
        reasons.push('✓ Dentro do orçamento');
      } else {
        reasons.push('✗ Fora do orçamento');
      }
    }

    // Location match
    if (profile.locations?.length > 0) {
      maxScore += 25;
      const locationMatch = profile.locations.some(loc => 
        property.city?.toLowerCase().includes(loc.toLowerCase()) ||
        property.address?.toLowerCase().includes(loc.toLowerCase())
      );
      if (locationMatch) {
        score += 25;
        reasons.push('✓ Localização corresponde');
      } else {
        reasons.push('✗ Localização não corresponde');
      }
    }

    // Property type match
    if (profile.property_types?.length > 0) {
      maxScore += 20;
      if (profile.property_types.includes(property.property_type)) {
        score += 20;
        reasons.push('✓ Tipo de imóvel corresponde');
      } else {
        reasons.push('✗ Tipo de imóvel não corresponde');
      }
    }

    // Bedrooms
    if (profile.bedrooms_min) {
      maxScore += 10;
      if (property.bedrooms >= profile.bedrooms_min) {
        score += 10;
        reasons.push('✓ Quartos suficientes');
      } else {
        reasons.push('✗ Quartos insuficientes');
      }
    }

    // Area
    if (profile.square_feet_min) {
      maxScore += 10;
      const propertyArea = property.useful_area || property.gross_area || property.square_feet;
      if (propertyArea >= profile.square_feet_min) {
        score += 10;
        reasons.push('✓ Área adequada');
      } else {
        reasons.push('✗ Área insuficiente');
      }
    }

    // Listing type
    if (profile.listing_type && profile.listing_type !== 'both') {
      maxScore += 5;
      if (property.listing_type === profile.listing_type) {
        score += 5;
        reasons.push('✓ Tipo de anúncio corresponde');
      }
    }

    const finalScore = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
    return { score: finalScore, reasons };
  };

  const getMatchesForProfile = (profile) => {
    // Only match with active properties
    const activeProperties = properties.filter(p => p.status === 'active');
    
    const matches = activeProperties.map(property => {
      const { score, reasons } = calculateMatchScore(profile, property);
      return { property, score, reasons };
    });

    // Return only matches with score > 50%, sorted by score
    return matches
      .filter(m => m.score >= 50)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5); // Top 5 matches
  };

  const processAllMatches = async () => {
    setProcessingMatches(true);
    try {
      let totalNewMatches = 0;
      const now = new Date().toISOString();

      for (const profile of (profiles || [])) {
        const matches = getMatchesForProfile(profile);
        
        if (matches.length > 0) {
          totalNewMatches += matches.length;
          
          // Update last match date
          await base44.entities.BuyerProfile.update(profile.id, {
            last_match_date: now
          });

          // Create notification for profile owner or assigned agent
          const recipientEmail = profile.assigned_agent || profile.created_by;
          if (recipientEmail) {
            await base44.entities.Notification.create({
              title: `${matches.length} Novo(s) Match(es) para ${profile.buyer_name}`,
              message: `Encontrámos ${matches.length} propriedade(s) que correspondem às preferências do cliente.`,
              type: 'lead',
              priority: 'medium',
              user_email: recipientEmail,
              related_type: 'BuyerProfile',
              related_id: profile.id,
              action_url: '/ClientPreferences'
            });
          }
        }
      }

      queryClient.invalidateQueries({ queryKey: ['buyerProfiles'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success(`Processamento concluído! ${totalNewMatches} matches encontrados.`);
    } catch (error) {
      toast.error("Erro ao processar matches");
      console.error(error);
    }
    setProcessingMatches(false);
  };

  const sendMatchesToClient = async (profile, matches) => {
    try {
      const matchList = matches.map((m, idx) => 
        `${idx + 1}. ${m.property.title} - €${m.property.price?.toLocaleString()} - Score: ${m.score}%`
      ).join('\n');

      const emailBody = `Olá ${profile.buyer_name},\n\nEncontrámos ${matches.length} propriedade(s) que podem interessar:\n\n${matchList}\n\nVisite o nosso portal para mais detalhes.`;

      await base44.integrations.Core.SendEmail({
        to: profile.buyer_email,
        subject: `Novos Imóveis que Podem Interessar`,
        body: emailBody
      });

      toast.success(`Email enviado para ${profile.buyer_name}`);
    } catch (error) {
      toast.error("Erro ao enviar email");
    }
  };

  const filteredProfiles = (profiles || []).filter(p => {
    if (!searchTerm) return true;
    return p.buyer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           p.buyer_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           p.company_name?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const profilesWithMatches = filteredProfiles.map(profile => ({
    profile,
    matches: getMatchesForProfile(profile)
  })).filter(p => p.matches.length > 0);

  const totalMatches = profilesWithMatches.reduce((sum, p) => sum + p.matches.length, 0);

  return (
    <div className="space-y-6">
      <Card className="border-blue-500 bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="bg-blue-600 rounded-full p-3">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-1">Matching Automatizado</h3>
                <p className="text-slate-600 mb-3">
                  Sistema inteligente que encontra os melhores imóveis para cada cliente
                </p>
                <div className="flex gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <span className="text-slate-700">{profilesWithMatches.length} Perfis com Matches</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                    <span className="text-slate-700">{totalMatches} Matches Totais</span>
                  </div>
                </div>
              </div>
            </div>
            <Button 
              onClick={processAllMatches}
              disabled={processingMatches}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {processingMatches ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  A processar...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Processar Todos
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Matches por Cliente</span>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Pesquisar cliente..."
                className="pl-10"
              />
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {profilesWithMatches.length === 0 ? (
            <div className="text-center py-12">
              <TrendingUp className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Nenhum Match Encontrado</h3>
              <p className="text-slate-600">Nenhum imóvel corresponde aos critérios dos clientes atualmente.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {profilesWithMatches.map(({ profile, matches }) => (
                <Card key={profile.id} className="border-2 hover:border-blue-300 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-slate-900 text-lg">{profile.buyer_name}</h4>
                          <Badge className="bg-blue-100 text-blue-800">
                            {matches.length} Match{matches.length > 1 ? 'es' : ''}
                          </Badge>
                          {(profile.profile_type === 'parceiro_comprador' || profile.profile_type === 'parceiro_vendedor') && (
                            <Badge className={profile.profile_type === 'parceiro_comprador' ? 'bg-purple-100 text-purple-800' : 'bg-amber-100 text-amber-800'}>
                              {profile.profile_type === 'parceiro_comprador' ? 'Parceiro' : 'Parceiro Vendedor'}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-600">{profile.buyer_email}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setExpandedProfile(expandedProfile === profile.id ? null : profile.id)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          {expandedProfile === profile.id ? 'Ocultar' : 'Ver Matches'}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => sendMatchesToClient(profile, matches)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Send className="w-4 h-4 mr-2" />
                          Notificar Cliente
                        </Button>
                      </div>
                    </div>

                    {expandedProfile === profile.id && (
                      <div className="mt-4 space-y-3 border-t pt-4">
                        {matches.map(({ property, score, reasons }, idx) => (
                          <Card key={property.id} className="bg-slate-50">
                            <CardContent className="p-4">
                              <div className="flex items-start gap-4">
                                {property.images?.[0] && (
                                  <img
                                    src={property.images[0]}
                                    alt={property.title}
                                    className="w-24 h-24 object-cover rounded-lg"
                                  />
                                )}
                                <div className="flex-1">
                                  <div className="flex items-start justify-between mb-2">
                                    <div>
                                      <h5 className="font-semibold text-slate-900">{property.title}</h5>
                                      <p className="text-sm text-slate-600">{property.address}, {property.city}</p>
                                    </div>
                                    <Badge 
                                      className={
                                        score >= 80 ? 'bg-green-100 text-green-800' :
                                        score >= 65 ? 'bg-blue-100 text-blue-800' :
                                        'bg-yellow-100 text-yellow-800'
                                      }
                                    >
                                      {score}% Match
                                    </Badge>
                                  </div>
                                  <div className="flex flex-wrap gap-3 text-sm text-slate-700 mb-2">
                                    <div className="flex items-center gap-1">
                                      <DollarSign className="w-4 h-4 text-slate-500" />
                                      €{property.price?.toLocaleString()}
                                    </div>
                                    {property.bedrooms > 0 && (
                                      <div className="flex items-center gap-1">
                                        <Bed className="w-4 h-4 text-slate-500" />
                                        {property.bedrooms} Quartos
                                      </div>
                                    )}
                                    {(property.useful_area || property.gross_area) && (
                                      <div className="flex items-center gap-1">
                                        <Maximize className="w-4 h-4 text-slate-500" />
                                        {property.useful_area || property.gross_area}m²
                                      </div>
                                    )}
                                  </div>
                                  <div className="text-xs text-slate-600">
                                    {reasons.slice(0, 3).map((reason, i) => (
                                      <div key={i}>{reason}</div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}