import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Heart, Trash2, ArrowLeft, Home, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import PropertyCard from "../components/browse/PropertyCard";
import { useGuestFeatures } from "../components/visitors/useGuestFeatures";
import { Badge } from "@/components/ui/badge";
import { useLocalization } from "../components/i18n/LocalizationContext";

export default function Favorites() {
  const { t } = useLocalization();
  const queryClient = useQueryClient();
  const { user, favorites: guestFavorites, removeFavorite: removeGuestFavorite, isGuest } = useGuestFeatures();

  // Fetch user's saved properties if logged in
  const { data: savedProperties = [] } = useQuery({
    queryKey: ['savedProperties', user?.email],
    queryFn: async () => {
      const all = await base44.entities.SavedProperty.list();
      return all.filter(sp => sp.user_email === user.email);
    },
    enabled: !!user
  });

  const { data: allProperties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list(),
    enabled: savedProperties.length > 0 || guestFavorites.length > 0
  });

  const removeMutation = useMutation({
    mutationFn: (id) => base44.entities.SavedProperty.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedProperties'] });
    },
  });

  const handleRemove = async (propertyId, savedPropertyId) => {
    if (isGuest) {
      await removeGuestFavorite(propertyId);
    } else if (savedPropertyId) {
      removeMutation.mutate(savedPropertyId);
    }
  };

  // Get favorite properties
  const favoriteProperties = React.useMemo(() => {
    if (isGuest) {
      return guestFavorites
        .map(fav => allProperties.find(p => p.id === fav.property_id))
        .filter(Boolean);
    } else {
      return savedProperties
        .map(saved => allProperties.find(p => p.id === saved.property_id))
        .filter(Boolean);
    }
  }, [isGuest, guestFavorites, savedProperties, allProperties]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl("Website")}>
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t('common.back')}
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
                <Heart className="w-8 h-8 text-red-500" />
                {t('common.favorites')}
              </h1>
              <p className="text-slate-600 text-sm mt-1">
                {favoriteProperties.length} {favoriteProperties.length === 1 ? 'imóvel guardado' : 'imóveis guardados'}
              </p>
            </div>
          </div>

          {isGuest && favoriteProperties.length > 0 && (
            <Button 
              onClick={() => base44.auth.redirectToLogin()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Registar para Sincronizar
            </Button>
          )}
        </div>

        {/* Guest Notice */}
        {isGuest && favoriteProperties.length > 0 && (
          <Card className="mb-6 border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Heart className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-blue-900 mb-1">Favoritos guardados localmente</h3>
                  <p className="text-sm text-blue-700 mb-3">
                    Os seus favoritos estão guardados apenas neste navegador. Registe-se para:
                  </p>
                  <ul className="text-sm text-blue-700 space-y-1 mb-3">
                    <li>✓ Aceder em qualquer dispositivo</li>
                    <li>✓ Receber alertas quando os preços baixarem</li>
                    <li>✓ Agendar visitas com um clique</li>
                    <li>✓ Contacto prioritário com consultores</li>
                  </ul>
                  <Button 
                    size="sm"
                    onClick={() => base44.auth.redirectToLogin()}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Registar Agora
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Properties Grid */}
        {favoriteProperties.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {favoriteProperties.map((property) => {
              const savedProperty = isGuest 
                ? guestFavorites.find(f => f.property_id === property.id)
                : savedProperties.find(s => s.property_id === property.id);

              return (
                <div key={property.id} className="relative">
                  <PropertyCard property={property} />
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleRemove(property.id, savedProperty?.id)}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Heart className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">
              Ainda não tem favoritos
            </h3>
            <p className="text-slate-600 mb-6">
              Explore os nossos imóveis e clique no ❤️ para guardar os seus preferidos
            </p>
            <Link to={createPageUrl("Website")}>
              <Button>
                <Home className="w-4 h-4 mr-2" />
                Explorar Imóveis
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}