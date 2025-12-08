import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import PropertyCard from "../components/browse/PropertyCard";
import { Search, MapPin, Home } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ZuHaus() {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [city, setCity] = React.useState("all");

  const { data: properties = [], isLoading } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list('-created_date')
  });

  // Filtrar apenas imóveis residenciais publicados em ZuHaus
  const RESIDENTIAL_TYPES = ['apartment', 'house', 'condo', 'townhouse', 'farm'];
  
  const filteredProperties = React.useMemo(() => {
    return properties.filter(p => {
      // Verificar publicação
      const publishedPages = Array.isArray(p.published_pages) ? p.published_pages : [];
      const isPublished = publishedPages.includes("zuhaus");
      
      // Verificar tipo
      const isResidential = RESIDENTIAL_TYPES.includes(p.property_type);
      
      // Verificar status
      const isActive = p.status === 'active';
      
      // Verificar pesquisa
      const matchesSearch = !searchTerm || 
        p.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.city?.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Verificar cidade
      const matchesCity = city === "all" || p.city === city;
      
      // Debug: imprimir se falhar
      if (isResidential && isActive && !isPublished) {
        console.log('[ZuHaus] Property not published here:', p.ref_id || p.id, 'pages:', publishedPages);
      }
      
      return isPublished && isResidential && isActive && matchesSearch && matchesCity;
    });
  }, [properties, searchTerm, city]);

  const allCities = [...new Set(properties
    .filter(p => RESIDENTIAL_TYPES.includes(p.property_type))
    .map(p => p.city)
    .filter(Boolean))].sort();

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#000000] via-[#2a2a2a] to-[#d22630]">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1600')] bg-cover bg-center opacity-20" />
        <div className="relative max-w-7xl mx-auto px-4 py-16 md:py-24">
          <div className="text-center mb-10">
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6915a593b6edd8435f5838bd/a0e94a9a1_ZUHAUS_branco_vermelho-trasnparente_c-slogan.png"
              alt="ZuHaus"
              className="h-24 md:h-32 lg:h-40 w-auto object-contain mx-auto"
            />
          </div>

          {/* Search */}
          <div className="max-w-3xl mx-auto bg-white rounded-2xl p-6 shadow-2xl">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Pesquisar por localização, título..."
                  className="pl-12 h-12 text-lg border-slate-200"
                />
              </div>
              <Select value={city} onValueChange={setCity}>
                <SelectTrigger className="w-full md:w-48 h-12">
                  <MapPin className="w-4 h-4 mr-2 text-slate-400" />
                  <SelectValue placeholder="Cidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Cidades</SelectItem>
                  {allCities.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">
          {filteredProperties.length} imóveis residenciais encontrados
        </h2>

        {filteredProperties.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredProperties.map(property => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Home className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">
              Nenhum imóvel encontrado
            </h3>
            <p className="text-slate-600 mb-6">
              Não foram encontrados imóveis residenciais publicados no ZuHaus
            </p>
            <Link to={createPageUrl("ZuGruppe")}>
              <Button>Ver todos os imóveis</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}