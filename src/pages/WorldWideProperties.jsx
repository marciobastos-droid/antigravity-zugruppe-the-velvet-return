import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Globe, Filter, MapPin, Euro, Bed, Bath, Maximize, ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PropertyCard from "../components/browse/PropertyCard";
import SEOHead from "../components/seo/SEOHead";
import { useDynamicPropertySEO, generateCanonicalURL } from "../components/seo/useDynamicPropertySEO";
import { useLocalization } from "../components/i18n/LocalizationContext";

export default function WorldWideProperties() {
  const { locale } = useLocalization();
  const [countryFilter, setCountryFilter] = React.useState("all");
  const [listingTypeFilter, setListingTypeFilter] = React.useState("all");
  const [propertyTypeFilter, setPropertyTypeFilter] = React.useState("all");
  const [sortBy, setSortBy] = React.useState("newest");

  const { data: properties = [], isLoading } = useQuery({
    queryKey: ['worldwideProperties'],
    queryFn: async () => {
      const allProperties = await base44.entities.Property.list('-created_date');
      
      // Filtrar apenas imóveis fora de Portugal
      // Considerar ativo se status='active' OU availability_status está disponível/pendente
      return allProperties.filter(p => 
        (p.status === 'active' || p.availability_status === 'available' || p.availability_status === 'pending_validation') &&
        p.country && 
        p.country !== 'Portugal'
      );
    }
  });

  const countries = React.useMemo(() => {
    const uniqueCountries = [...new Set(properties.map(p => p.country).filter(Boolean))];
    return uniqueCountries.sort();
  }, [properties]);

  const propertyTypes = React.useMemo(() => {
    const uniqueTypes = [...new Set(properties.map(p => p.property_type).filter(Boolean))];
    return uniqueTypes;
  }, [properties]);

  const filteredProperties = React.useMemo(() => {
    let filtered = [...properties];

    if (countryFilter !== "all") {
      filtered = filtered.filter(p => p.country === countryFilter);
    }

    if (listingTypeFilter !== "all") {
      filtered = filtered.filter(p => p.listing_type === listingTypeFilter);
    }

    if (propertyTypeFilter !== "all") {
      filtered = filtered.filter(p => p.property_type === propertyTypeFilter);
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
  }, [properties, countryFilter, listingTypeFilter, propertyTypeFilter, sortBy]);

  // SEO dinâmico
  const dynamicSEO = useDynamicPropertySEO({
    properties: filteredProperties,
    filters: {
      listing_type: listingTypeFilter,
      property_type: propertyTypeFilter,
      country: countryFilter
    },
    pageType: "worldwide",
    locale
  });

  const canonicalURL = React.useMemo(() => {
    const baseURL = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : '';
    return generateCanonicalURL(baseURL, {
      listing_type: listingTypeFilter,
      property_type: propertyTypeFilter,
      country: countryFilter
    });
  }, [listingTypeFilter, propertyTypeFilter, countryFilter]);

  const propertyTypeLabels = {
    apartment: "Apartamento",
    house: "Moradia",
    land: "Terreno",
    building: "Prédio",
    farm: "Quinta",
    store: "Loja",
    warehouse: "Armazém",
    office: "Escritório"
  };

  return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-slate-50">
      <SEOHead
        title={dynamicSEO.title}
        description={dynamicSEO.description}
        keywords={dynamicSEO.keywords}
        type="website"
        image="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6915a593b6edd8435f5838bd/359538617_Zugruppe01.jpg"
        url={canonicalURL}
        structuredData={dynamicSEO.structuredData}
      />
      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 text-white py-16 sm:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: 'url(https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6915a593b6edd8435f5838bd/4bb5e1390_ChatGPTImage2_01_202611_34_48.png)' }} />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-black/60" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link to={createPageUrl("Website")} className="inline-block mb-6">
            <Button 
              variant="ghost" 
              className="group gap-2 text-white/90 hover:text-white hover:bg-white/10 border border-white/20 hover:border-white/40 backdrop-blur-sm transition-all duration-300 px-6 py-6"
            >
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
              <span className="font-medium">Voltar</span>
            </Button>
          </Link>
          
          <div className="flex items-center gap-3 mb-4">
            <Globe className="w-12 h-12 text-blue-300" />
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold">WorldWide Properties</h1>
          </div>
          <p className="text-xl sm:text-2xl text-blue-100 max-w-3xl">
            Imóveis exclusivos ao redor do mundo
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-4 text-blue-200">
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              <span className="font-semibold">{countries.length} Países</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              <span className="font-semibold">{properties.length} Imóveis Internacionais</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Filters */}
        <Card className="mb-8 border-blue-200 bg-gradient-to-r from-blue-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-5 h-5 text-blue-700" />
              <h3 className="font-semibold text-slate-900">Filtros</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">País</label>
                <Select value={countryFilter} onValueChange={setCountryFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Países</SelectItem>
                    {countries.map(country => (
                      <SelectItem key={country} value={country}>{country}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Tipo de Negócio</label>
                <Select value={listingTypeFilter} onValueChange={setListingTypeFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="sale">Venda</SelectItem>
                    <SelectItem value="rent">Arrendamento</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Tipo de Imóvel</label>
                <Select value={propertyTypeFilter} onValueChange={setPropertyTypeFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {propertyTypes.map(type => (
                      <SelectItem key={type} value={type}>
                        {propertyTypeLabels[type] || type}
                      </SelectItem>
                    ))}
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
                    <SelectItem value="newest">Mais Recentes</SelectItem>
                    <SelectItem value="price_desc">Preço: Maior para Menor</SelectItem>
                    <SelectItem value="price_asc">Preço: Menor para Maior</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
              <span>A mostrar <strong>{filteredProperties.length}</strong> imóveis internacionais</span>
              {(countryFilter !== "all" || listingTypeFilter !== "all" || propertyTypeFilter !== "all") && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    setCountryFilter("all");
                    setListingTypeFilter("all");
                    setPropertyTypeFilter("all");
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
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900" />
          </div>
        ) : filteredProperties.length === 0 ? (
          <Card className="text-center py-20">
            <CardContent>
              <Globe className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Nenhum imóvel internacional encontrado</h3>
              <p className="text-slate-600">Ajuste os filtros ou volte mais tarde</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProperties.map(property => (
              <div key={property.id} className="relative">
                <div className="absolute top-4 right-4 z-10">
                  <Badge className="bg-blue-600 text-white border-0 shadow-lg">
                    <Globe className="w-3 h-3 mr-1" />
                    {property.country}
                  </Badge>
                </div>
                <PropertyCard property={property} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Legal */}
      <footer className="bg-slate-900 text-white py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center gap-4">
            <div className="flex flex-wrap justify-center gap-3 text-xs text-slate-400">
              <a
                href="https://www.consumidor.gov.pt/resolucao-de-litigios.aspx"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors"
              >
                Resolução Alternativa de Litígios
              </a>
              <span>•</span>
              <a
                href="https://www.livroreclamacoes.pt/Inicio/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors"
              >
                Livro de Reclamações online
              </a>
              <span>•</span>
              <Link to={createPageUrl("TermsConditions")} className="hover:text-white transition-colors">
                Termos e Condições
              </Link>
              <span>•</span>
              <Link to={createPageUrl("PrivacyPolicy")} className="hover:text-white transition-colors">
                Política de Privacidade
              </Link>
              <span>•</span>
              <Link to={createPageUrl("CookiePolicy")} className="hover:text-white transition-colors">
                Política de Cookies
              </Link>
              <span>•</span>
              <Link to={createPageUrl("DenunciationChannel")} className="hover:text-white transition-colors">
                Canal de Denúncias
              </Link>
              <span>•</span>
              <Link to={createPageUrl("ManageData")} className="hover:text-white transition-colors">
                Gerir Dados
              </Link>
            </div>
            <p className="text-xs text-slate-500">
              © {new Date().getFullYear()} Zugruppe. Todos os direitos reservados. | Licença IMPIC 11355
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}