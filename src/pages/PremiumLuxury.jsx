import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Crown, Filter, MapPin, Euro, Bed, Bath, Maximize, Star, ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PropertyCard from "../components/browse/PropertyCard";
import SEOHead from "../components/seo/SEOHead";
import { HelmetProvider } from "react-helmet-async";

export default function PremiumLuxury() {
  const [cityFilter, setCityFilter] = React.useState("all");
  const [priceFilter, setPriceFilter] = React.useState("all");
  const [sortBy, setSortBy] = React.useState("price_desc");

  const { data: properties = [], isLoading } = useQuery({
    queryKey: ['premiumProperties'],
    queryFn: async () => {
      const allProperties = await base44.entities.Property.filter({
        status: 'active',
        visibility: 'public',
        country: 'Portugal'
      });
      
      // Filtrar apenas imóveis premium (featured ou preço > 500k)
      return allProperties.filter(p => 
        p.featured === true || 
        (p.price && p.price >= 500000) ||
        p.tags?.some(tag => tag.toLowerCase().includes('luxo') || tag.toLowerCase().includes('premium'))
      );
    }
  });

  const cities = React.useMemo(() => {
    const uniqueCities = [...new Set(properties.map(p => p.city).filter(Boolean))];
    return uniqueCities.sort();
  }, [properties]);

  const filteredProperties = React.useMemo(() => {
    let filtered = [...properties];

    if (cityFilter !== "all") {
      filtered = filtered.filter(p => p.city === cityFilter);
    }

    if (priceFilter !== "all") {
      const [min, max] = priceFilter.split('-').map(Number);
      filtered = filtered.filter(p => {
        if (!p.price) return false;
        if (max) return p.price >= min && p.price <= max;
        return p.price >= min;
      });
    }

    // Sorting
    if (sortBy === "price_desc") {
      filtered.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sortBy === "price_asc") {
      filtered.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sortBy === "newest") {
      filtered.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    }

    return filtered;
  }, [properties, cityFilter, priceFilter, sortBy]);

  // SEO dinâmico baseado em filtros
  const dynamicSEO = React.useMemo(() => {
    const parts = ["Coleção Premium Luxo"];
    const keywords = ["imóveis premium", "luxo", "portugal", "alto padrão"];
    
    if (cityFilter !== "all") {
      parts.push(cityFilter);
      keywords.push(cityFilter.toLowerCase());
    }
    
    if (priceFilter !== "all") {
      const [min, max] = priceFilter.split('-').map(Number);
      if (max) {
        parts.push(`€${(min/1000)}k-€${(max/1000000)}M`);
      } else {
        parts.push(`acima de €${(min/1000000)}M`);
      }
    }
    
    const title = parts.join(" | ") + " | Zugruppe";
    const description = `${filteredProperties.length} imóveis de luxo premium ${cityFilter !== "all" ? `em ${cityFilter}` : 'em Portugal'}. Moradias, apartamentos e propriedades exclusivas com preços acima de €500.000. Qualidade, conforto e requinte.`;
    const keywordsStr = keywords.join(", ");
    
    return { title, description, keywords: keywordsStr };
  }, [filteredProperties.length, cityFilter, priceFilter]);

  return (
    <HelmetProvider>
      <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-slate-50">
      <SEOHead
        title={dynamicSEO.title}
        description={dynamicSEO.description}
        keywords={dynamicSEO.keywords}
        type="website"
        image="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6915a593b6edd8435f5838bd/359538617_Zugruppe01.jpg"
        url={typeof window !== 'undefined' ? window.location.href : ''}
      />
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-amber-900 via-amber-800 to-amber-900 text-white py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link to={createPageUrl("Website")} className="inline-block mb-6">
            <Button variant="outline" className="text-white border-white hover:bg-white/10">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </Link>
          
          <div className="flex items-center gap-3 mb-4">
            <Crown className="w-12 h-12 text-amber-300" />
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold">Coleção Premium Luxo</h1>
          </div>
          <p className="text-xl sm:text-2xl text-amber-100 max-w-3xl">
            Imóveis exclusivos de alto padrão em Portugal
          </p>
          <div className="mt-6 flex items-center gap-6 text-amber-200">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5" />
              <span className="font-semibold">{properties.length} Imóveis Premium</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Filters */}
        <Card className="mb-8 border-amber-200 bg-gradient-to-r from-amber-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-5 h-5 text-amber-700" />
              <h3 className="font-semibold text-slate-900">Filtros</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Cidade</label>
                <Select value={cityFilter} onValueChange={setCityFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Cidades</SelectItem>
                    {cities.map(city => (
                      <SelectItem key={city} value={city}>{city}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Preço</label>
                <Select value={priceFilter} onValueChange={setPriceFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Preços</SelectItem>
                    <SelectItem value="500000-1000000">€500k - €1M</SelectItem>
                    <SelectItem value="1000000-2000000">€1M - €2M</SelectItem>
                    <SelectItem value="2000000-5000000">€2M - €5M</SelectItem>
                    <SelectItem value="5000000-999999999">€5M+</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Ordenar por</label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="price_desc">Preço: Maior para Menor</SelectItem>
                    <SelectItem value="price_asc">Preço: Menor para Maior</SelectItem>
                    <SelectItem value="newest">Mais Recentes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
              <span>A mostrar <strong>{filteredProperties.length}</strong> imóveis premium</span>
              {(cityFilter !== "all" || priceFilter !== "all") && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    setCityFilter("all");
                    setPriceFilter("all");
                  }}
                >
                  Limpar Filtros
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Properties Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-900" />
          </div>
        ) : filteredProperties.length === 0 ? (
          <Card className="text-center py-20">
            <CardContent>
              <Crown className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Nenhum imóvel premium encontrado</h3>
              <p className="text-slate-600">Ajuste os filtros ou volte mais tarde</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProperties.map(property => (
              <div key={property.id} className="relative">
                <div className="absolute top-4 right-4 z-10">
                  <Badge className="bg-amber-500 text-white border-0 shadow-lg">
                    <Crown className="w-3 h-3 mr-1" />
                    Premium
                  </Badge>
                </div>
                <PropertyCard property={property} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
    </HelmetProvider>
  );
}