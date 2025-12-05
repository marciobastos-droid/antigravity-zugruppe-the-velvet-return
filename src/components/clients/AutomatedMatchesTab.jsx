import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Sparkles, Bell, RefreshCw, Search, TrendingUp, Mail, User, MapPin, Euro, Bed, Bath, Maximize, ExternalLink, Building2, MessageSquare, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
// Message formatting is now done in the backend function

export default function AutomatedMatchesTab({ profiles }) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = React.useState("");
  const [expandedProfile, setExpandedProfile] = React.useState(null);

  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list('-created_date'),
  });

  const { data: sentMatches = [] } = useQuery({
    queryKey: ['sentMatches'],
    queryFn: () => base44.entities.SentMatch.list('-sent_date'),
  });

  const processMatchesMutation = useMutation({
    mutationFn: () => base44.functions.invoke('processAutomatedMatches'),
    onSuccess: (response) => {
      const data = response.data;
      toast.success(`${data.total_matches} matches encontrados para ${data.profiles_with_matches} cliente(s)!`);
      queryClient.invalidateQueries({ queryKey: ['buyerProfiles'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: () => {
      toast.error("Erro ao processar matches");
    }
  });

  const notifyClientMutation = useMutation({
    mutationFn: async ({ profile, matches }) => {
      const topMatches = matches.slice(0, 5);
      const emailBody = `Olá ${profile.buyer_name},

Encontrámos ${matches.length} imóveis que correspondem perfeitamente ao seu perfil!

MELHORES MATCHES:

${topMatches.map((m, i) => `
${i + 1}. ${m.property.title}
   Local: ${m.property.city}, ${m.property.state}
   Preço: ${m.property.price?.toLocaleString() || 'N/A'} EUR
   Detalhes: ${m.property.bedrooms || 0} quartos, ${m.property.bathrooms || 0} WC, ${(m.property.useful_area || m.property.square_feet || 0)}m²
   Compatibilidade: ${m.score}%
   
   Porquê este imóvel:
   ${m.reasons.map(r => `   - ${r}`).join('\n')}
   
   Ver detalhes: ${window.location.origin}${createPageUrl("PropertyDetails")}?id=${m.property.id}
`).join('\n---\n')}

Para ver todos os ${matches.length} imóveis encontrados, contacte o seu agente.

Cumprimentos,
Equipa Zugruppe`;

      await base44.integrations.Core.SendEmail({
        to: profile.buyer_email,
        subject: `${matches.length} Imóveis Perfeitos Para Si`,
        body: emailBody
      });

      // Registar matches enviados
      for (const match of topMatches) {
        await base44.entities.SentMatch.create({
          contact_id: profile.id,
          contact_name: profile.buyer_name,
          contact_email: profile.buyer_email,
          property_id: match.property.id,
          property_title: match.property.title,
          property_price: match.property.price,
          property_city: match.property.city,
          property_image: match.property.images?.[0],
          match_score: match.score,
          compatibility_level: match.score >= 90 ? 'excellent' : match.score >= 75 ? 'good' : 'moderate',
          key_strengths: match.reasons,
          sent_by: profile.assigned_agent || 'system',
          sent_date: new Date().toISOString()
        });
      }

      queryClient.invalidateQueries({ queryKey: ['sentMatches'] });

      return { profile, matchCount: matches.length };
    },
    onSuccess: ({ profile, matchCount }) => {
      toast.success(`Email enviado para ${profile.buyer_name} com ${matchCount} matches`);
    },
    onError: () => {
      toast.error("Erro ao enviar email");
    }
  });

  const sendWhatsAppMutation = useMutation({
    mutationFn: async ({ profile, matches }) => {
      if (!profile.buyer_phone) {
        throw new Error("Cliente nao tem numero de telefone");
      }

      const topMatches = matches.slice(0, 5);
      
      // Send properties array directly - backend will format the message with short links
      const response = await base44.functions.invoke('sendWhatsApp', {
        phoneNumber: profile.buyer_phone,
        properties: topMatches,
        clientName: profile.buyer_name,
        contactName: profile.buyer_name,
        baseUrl: window.location.origin
      });

      if (!response.data?.success) {
        throw new Error(response.data?.error || "Erro ao enviar WhatsApp");
      }

      // Registar matches enviados
      for (const match of topMatches) {
        await base44.entities.SentMatch.create({
          contact_id: profile.id,
          contact_name: profile.buyer_name,
          contact_email: profile.buyer_email,
          property_id: match.property.id,
          property_title: match.property.title,
          property_price: match.property.price,
          property_city: match.property.city,
          property_image: match.property.images?.[0],
          match_score: match.score,
          compatibility_level: match.score >= 90 ? 'excellent' : match.score >= 75 ? 'good' : 'moderate',
          key_strengths: match.reasons,
          sent_by: profile.assigned_agent || 'system',
          sent_date: new Date().toISOString()
        });
      }

      queryClient.invalidateQueries({ queryKey: ['sentMatches'] });

      return { profile, matchCount: topMatches.length };
    },
    onSuccess: ({ profile, matchCount }) => {
      toast.success(`WhatsApp enviado para ${profile.buyer_name} com ${matchCount} imoveis`);
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao enviar WhatsApp");
    }
  });

  const calculateMatchScore = (property, profile) => {
    if (!property || !profile) return { score: 0, reasons: [] };

    let score = 0;
    let maxScore = 0;
    const reasons = [];

    // Property type - PRIORIDADE MÁXIMA (40 pontos)
    if (profile.property_types?.length > 0) {
      maxScore += 40;
      if (profile.property_types.includes(property.property_type)) {
        score += 40;
        reasons.push('Tipo de imóvel preferido');
      } else {
        // Se o tipo não corresponde, retorna score 0 imediatamente
        return { score: 0, reasons: ['Tipo de imóvel não corresponde'] };
      }
    }

    // Listing type
    maxScore += 25;
    if (property.listing_type === profile.listing_type || profile.listing_type === 'both') {
      score += 25;
      reasons.push('Tipo de negócio corresponde');
    }

    // Location
    if (profile.locations?.length > 0) {
      maxScore += 20;
      const locationMatch = profile.locations.some(loc => 
        property.city?.toLowerCase().includes(loc.toLowerCase()) ||
        property.state?.toLowerCase().includes(loc.toLowerCase())
      );
      if (locationMatch) {
        score += 20;
        reasons.push(`Localização em ${property.city}`);
      }
    }

    // Price
    if (profile.budget_min || profile.budget_max) {
      maxScore += 15;
      if ((!profile.budget_min || property.price >= profile.budget_min) &&
          (!profile.budget_max || property.price <= profile.budget_max)) {
        score += 15;
        reasons.push('Preço dentro do orçamento');
      }
    }

    // Bedrooms
    if (profile.bedrooms_min) {
      maxScore += 10;
      if (property.bedrooms >= profile.bedrooms_min) {
        score += 10;
        reasons.push(`${property.bedrooms} quartos`);
      }
    }

    // Area
    if (profile.square_feet_min) {
      maxScore += 10;
      const area = property.useful_area || property.square_feet || 0;
      if (area >= profile.square_feet_min) {
        score += 10;
        reasons.push(`Área de ${area}m²`);
      }
    }

    const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
    return { score: percentage, reasons: reasons.slice(0, 3) };
  };

  const profilesWithMatches = React.useMemo(() => {
    return profiles
      .filter(p => p.status === 'active')
      .filter(p => !searchTerm || 
        p.buyer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.buyer_email?.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .map(profile => {
        const matches = properties
          .filter(prop => prop.status === 'active')
          .map(prop => ({
            property: prop,
            ...calculateMatchScore(prop, profile)
          }))
          .filter(m => m.score >= 70)
          .sort((a, b) => b.score - a.score);

        return {
          profile,
          matches,
          matchCount: matches.length,
          topScore: matches[0]?.score || 0,
          hasNewMatches: profile.last_match_date ? 
            matches.some(m => new Date(m.property.created_date) > new Date(profile.last_match_date)) : 
            matches.length > 0
        };
      })
      .sort((a, b) => b.matchCount - a.matchCount);
  }, [profiles, properties, searchTerm]);

  const totalMatches = profilesWithMatches.reduce((acc, p) => acc + p.matchCount, 0);
  const profilesWithNewMatches = profilesWithMatches.filter(p => p.hasNewMatches).length;

  const getScoreColor = (score) => {
    if (score >= 90) return "bg-green-100 text-green-800";
    if (score >= 75) return "bg-blue-100 text-blue-800";
    return "bg-yellow-100 text-yellow-800";
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-900">{profilesWithMatches.length}</div>
            <div className="text-xs text-blue-700">Clientes Ativos</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-900">{totalMatches}</div>
            <div className="text-xs text-green-700">Total de Matches</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-amber-900">{profilesWithNewMatches}</div>
            <div className="text-xs text-amber-700">Com Novos Matches</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="p-4">
            <Button 
              onClick={() => processMatchesMutation.mutate()}
              disabled={processMatchesMutation.isPending}
              className="w-full bg-purple-600 hover:bg-purple-700"
              size="sm"
            >
              {processMatchesMutation.isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  A processar...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Processar Matches
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisar cliente..."
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Profiles with Matches */}
      <div className="space-y-4">
        {profilesWithMatches.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Sparkles className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600">Nenhum cliente com matches encontrados</p>
            </CardContent>
          </Card>
        ) : (
          profilesWithMatches.map(({ profile, matches, matchCount, topScore, hasNewMatches }) => (
            <Card 
              key={profile.id} 
              className={`${hasNewMatches ? 'border-2 border-amber-400 bg-amber-50/30' : ''} hover:shadow-lg transition-shadow`}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="w-5 h-5 text-slate-600" />
                      <CardTitle className="text-lg">{profile.buyer_name}</CardTitle>
                      {hasNewMatches && (
                        <Badge className="bg-amber-500 text-white animate-pulse">
                          <Bell className="w-3 h-3 mr-1" />
                          Novos!
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-slate-600 space-y-1">
                      <p>{profile.buyer_email}</p>
                      {profile.locations?.length > 0 && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {profile.locations.join(', ')}
                        </div>
                      )}
                      {(profile.budget_min || profile.budget_max) && (
                        <div className="flex items-center gap-1">
                          <Euro className="w-3 h-3" />
                          €{profile.budget_min?.toLocaleString() || '0'} - €{profile.budget_max?.toLocaleString() || '∞'}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge className="bg-blue-600 text-white text-lg px-3 py-1">
                      {matchCount} {matchCount === 1 ? 'Match' : 'Matches'}
                    </Badge>
                    {topScore > 0 && (
                      <Badge className={getScoreColor(topScore)}>
                        <TrendingUp className="w-3 h-3 mr-1" />
                        Top: {topScore}%
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2 flex-wrap">
                  <Button
                    onClick={() => setExpandedProfile(expandedProfile === profile.id ? null : profile.id)}
                    variant="outline"
                    size="sm"
                    className="flex-1 min-w-[120px]"
                  >
                    {expandedProfile === profile.id ? 'Ocultar' : 'Ver'} Matches ({matchCount})
                  </Button>
                  <Button
                    onClick={() => notifyClientMutation.mutate({ profile, matches })}
                    disabled={notifyClientMutation.isPending || matchCount === 0}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {notifyClientMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Mail className="w-4 h-4 mr-1" />
                        Email
                      </>
                    )}
                  </Button>
                  {profile.buyer_phone && (
                    <Button
                      onClick={() => sendWhatsAppMutation.mutate({ profile, matches })}
                      disabled={sendWhatsAppMutation.isPending || matchCount === 0}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {sendWhatsAppMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <MessageSquare className="w-4 h-4 mr-1" />
                          WhatsApp
                        </>
                      )}
                    </Button>
                  )}
                </div>

                {expandedProfile === profile.id && (
                  <div className="grid gap-3 pt-4 border-t">
                    {matches.map((match) => {
                      const wasSent = sentMatches.some(sm => 
                        sm.property_id === match.property.id && 
                        sm.contact_id === profile.id
                      );
                      const sentRecord = sentMatches.find(sm => 
                        sm.property_id === match.property.id && 
                        sm.contact_id === profile.id
                      );
                      
                      return (
                        <Card key={match.property.id} className={`border-l-4 ${wasSent ? 'border-green-500 bg-green-50/30' : 'border-blue-500'}`}>
                          <CardContent className="p-4">
                            <div className="flex gap-3">
                              {match.property.images?.[0] && (
                                <img 
                                  src={match.property.images[0]} 
                                  alt={match.property.title}
                                  className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2 mb-2">
                                  <h4 className="font-semibold text-slate-900 truncate">
                                    {match.property.title}
                                  </h4>
                                  <div className="flex items-center gap-2">
                                    {wasSent && (
                                      <Badge className="bg-green-600 text-white">
                                        <CheckCircle2 className="w-3 h-3 mr-1" />
                                        Enviado
                                      </Badge>
                                    )}
                                    <Badge className={getScoreColor(match.score)}>
                                      {match.score}%
                                    </Badge>
                                  </div>
                                </div>
                                {wasSent && sentRecord && (
                                  <p className="text-xs text-green-700 mb-2">
                                    Enviado em {format(new Date(sentRecord.sent_date), "d 'de' MMM 'às' HH:mm", { locale: ptBR })}
                                    {sentRecord.client_response !== 'pending' && ` • ${sentRecord.client_response === 'interested' ? 'Interessado' : sentRecord.client_response === 'visited' ? 'Visitou' : sentRecord.client_response === 'not_interested' ? 'Não interessado' : sentRecord.client_response}`}
                                  </p>
                                )}
                              <div className="text-sm text-slate-600 space-y-1">
                                <div className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {match.property.city}, {match.property.state}
                                </div>
                                <div className="font-semibold text-slate-900">
                                  €{match.property.price?.toLocaleString()}
                                </div>
                                <div className="flex gap-3 text-xs">
                                  {match.property.bedrooms > 0 && (
                                    <span className="flex items-center gap-1">
                                      <Bed className="w-3 h-3" />
                                      {match.property.bedrooms}
                                    </span>
                                  )}
                                  {match.property.bathrooms > 0 && (
                                    <span className="flex items-center gap-1">
                                      <Bath className="w-3 h-3" />
                                      {match.property.bathrooms}
                                    </span>
                                  )}
                                  {(match.property.useful_area || match.property.square_feet) && (
                                    <span className="flex items-center gap-1">
                                      <Maximize className="w-3 h-3" />
                                      {match.property.useful_area || match.property.square_feet}m²
                                    </span>
                                  )}
                                </div>
                              </div>
                              {match.reasons.length > 0 && (
                                <div className="mt-2">
                                  <div className="flex flex-wrap gap-1">
                                    {match.reasons.map((reason, idx) => (
                                      <Badge key={idx} variant="secondary" className="text-xs">
                                        ✓ {reason}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                              <Link 
                                to={`${createPageUrl('PropertyDetails')}?id=${match.property.id}`} 
                                target="_blank"
                                className="mt-2 inline-block"
                              >
                                <Button variant="outline" size="sm">
                                  <ExternalLink className="w-3 h-3 mr-2" />
                                  Ver Detalhes
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                  </div>
                )}

                {profile.last_match_date && (
                  <p className="text-xs text-slate-500 text-center">
                    Último processamento: {format(new Date(profile.last_match_date), "d 'de' MMM, HH:mm", { locale: ptBR })}
                  </p>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}