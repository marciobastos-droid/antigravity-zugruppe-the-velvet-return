import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Users, Building2, Mail, Bell, TrendingUp, ArrowRight } from "lucide-react";

export default function AIMatchingSuggestions({ user }) {
  const [newMatches, setNewMatches] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list('-created_date'),
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['buyerProfiles'],
    queryFn: () => base44.entities.BuyerProfile.list('-created_date'),
  });

  const isAdmin = user && (user.role === 'admin' || user.user_type === 'admin' || user.user_type === 'gestor');

  React.useEffect(() => {
    findNewMatches();
  }, [properties, profiles]);

  const findNewMatches = async () => {
    if (properties.length === 0 || profiles.length === 0) {
      setLoading(false);
      return;
    }

    const recentProperties = properties
      .filter(p => p.status === 'active')
      .filter(p => {
        const daysSinceCreated = (new Date() - new Date(p.created_date)) / (1000 * 60 * 60 * 24);
        return daysSinceCreated <= 7;
      })
      .slice(0, 5);

    if (recentProperties.length === 0) {
      setLoading(false);
      return;
    }

    const activeProfiles = profiles.filter(p => p.status === 'active');
    const matches = [];

    for (const property of recentProperties) {
      const matchingProfiles = activeProfiles.filter(profile => {
        if (profile.listing_type !== 'both' && profile.listing_type !== property.listing_type) return false;
        if (profile.budget_min && property.price < profile.budget_min) return false;
        if (profile.budget_max && property.price > profile.budget_max) return false;
        if (profile.bedrooms_min && (!property.bedrooms || property.bedrooms < profile.bedrooms_min)) return false;
        if (profile.property_types?.length > 0 && !profile.property_types.includes(property.property_type)) return false;
        if (profile.locations?.length > 0) {
          const matchesLoc = profile.locations.some(loc =>
            property.city?.toLowerCase().includes(loc.toLowerCase()) ||
            property.state?.toLowerCase().includes(loc.toLowerCase())
          );
          if (!matchesLoc) return false;
        }
        return true;
      });

      if (matchingProfiles.length > 0) {
        matches.push({
          property,
          profiles: matchingProfiles.slice(0, 3),
          totalMatches: matchingProfiles.length
        });
      }
    }

    setNewMatches(matches.slice(0, 3));
    setLoading(false);
  };

  const notifyClients = async (match) => {
    try {
      for (const profile of match.profiles) {
        await base44.integrations.Core.SendEmail({
          to: profile.buyer_email,
          subject: `🏠 Novo Imóvel que Corresponde às Suas Preferências!`,
          body: `Olá ${profile.buyer_name},

Temos um novo imóvel que pode ser perfeito para si!

${match.property.title}
📍 ${match.property.city}, ${match.property.state}
💰 €${match.property.price?.toLocaleString()}
🛏️ ${match.property.bedrooms || 0} quartos • 🚿 ${match.property.bathrooms || 0} WC • 📐 ${match.property.square_feet || 0}m²

${match.property.description || ''}

Ver detalhes: ${window.location.origin}${createPageUrl("PropertyDetails")}?id=${match.property.id}

Cumprimentos,
Equipa Zugruppe`
        });
      }
      toast.success(`Notificações enviadas para ${match.profiles.length} clientes`);
    } catch (error) {
      toast.error("Erro ao enviar notificações");
    }
  };

  if (loading) {
    return (
      <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50">
        <CardContent className="p-6 text-center">
          <Sparkles className="w-8 h-8 text-amber-600 animate-pulse mx-auto" />
          <p className="text-sm text-slate-600 mt-2">A processar matches...</p>
        </CardContent>
      </Card>
    );
  }

  if (newMatches.length === 0) {
    return (
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="w-5 h-5 text-amber-600" />
            Sugestões IA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600">Nenhuma sugestão nova no momento</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-amber-600" />
          Sugestões de Matching IA
        </CardTitle>
        <p className="text-sm text-slate-600">
          Novos imóveis com clientes interessados
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {newMatches.map((match, idx) => (
          <Card key={idx} className="bg-white border-amber-200">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="w-4 h-4 text-blue-600" />
                    <Link 
                      to={`${createPageUrl("PropertyDetails")}?id=${match.property.id}`}
                      className="font-semibold text-slate-900 hover:text-blue-600"
                    >
                      {match.property.title}
                    </Link>
                  </div>
                  <p className="text-sm text-slate-600">
                    €{match.property.price?.toLocaleString()} • {match.property.city}
                  </p>
                </div>
                <Badge className="bg-green-100 text-green-700">
                  <Users className="w-3 h-3 mr-1" />
                  {match.totalMatches} match{match.totalMatches > 1 ? 'es' : ''}
                </Badge>
              </div>

              <div className="bg-slate-50 rounded-lg p-3 mb-3">
                <p className="text-xs font-medium text-slate-700 mb-2">Clientes Interessados:</p>
                <div className="space-y-1">
                  {match.profiles.map((profile, pIdx) => (
                    <div key={pIdx} className="flex items-center justify-between text-xs">
                      <span className="text-slate-600">{profile.buyer_name}</span>
                      <span className="text-slate-500">{profile.buyer_email}</span>
                    </div>
                  ))}
                  {match.totalMatches > match.profiles.length && (
                    <p className="text-xs text-slate-500 mt-1">
                      +{match.totalMatches - match.profiles.length} mais
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => notifyClients(match)}
                  className="flex-1"
                >
                  <Bell className="w-3 h-3 mr-1" />
                  Notificar Clientes
                </Button>
                <Link to={createPageUrl("ClientPreferences")} className="flex-1">
                  <Button size="sm" variant="outline" className="w-full">
                    <ArrowRight className="w-3 h-3 mr-1" />
                    Ver Perfis
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}

        <Link to={createPageUrl("ClientPreferences")}>
          <Button className="w-full bg-amber-600 hover:bg-amber-700">
            <Sparkles className="w-4 h-4 mr-2" />
            Ver Todos os Matches
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}