import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import PropertyCard from "../components/browse/PropertyCard";
import { 
  Search, Filter, X, Home, MapPin, 
  Bed, Bath, SlidersHorizontal, ChevronDown, 
  Grid3X3, List, Phone, Mail, ChevronLeft, ChevronRight
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { debounce } from "lodash";
import { ALL_DISTRICTS, getMunicipalitiesByDistrict } from "../components/common/PortugalLocations";

export default function ZuHaus() {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [listingType, setListingType] = React.useState("all");
  const [propertyType, setPropertyType] = React.useState("all");
  const [bedrooms, setBedrooms] = React.useState("all");
  const [priceRange, setPriceRange] = React.useState([0, 2000000]);
  const [city, setCity] = React.useState("all");
  const [sortBy, setSortBy] = React.useState("recent");
  const [showFilters, setShowFilters] = React.useState(true);
  const [viewMode, setViewMode] = React.useState("grid");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [country, setCountry] = React.useState("all");
  const [district, setDistrict] = React.useState("all");

  const ITEMS_PER_PAGE = 12;

  const RESIDENTIAL_TYPES = ['apartment', 'house', 'condo', 'townhouse', 'farm'];

  React.useEffect(() => {
    const debouncedUpdate = debounce(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 400);
    debouncedUpdate();
    return () => debouncedUpdate.cancel();
  }, [searchTerm]);

  const { data: properties = [], isLoading } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list('-created_date')
  });

  // Filtrar apenas imóveis residenciais publicados em zuhaus
  const publishedProperties = properties.filter(p => {
    const isActive = p.status === 'active';
    const isResidential = RESIDENTIAL_TYPES.includes(p.property_type);
    const isPublishedInZuHaus = (p.published_pages || []).includes('zuhaus');
    return isActive && isResidential && isPublishedInZuHaus;
  });

  const allCities = [...new Set(publishedProperties.map(p => p.city).filter(Boolean))].sort();

  const filteredProperties = publishedProperties.filter((property) => {
    const matchesSearch = debouncedSearch === "" ||
      property.title?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      property.city?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      property.address?.toLowerCase().includes(debouncedSearch.toLowerCase());
    
    const matchesListingType = listingType === "all" || property.listing_type === listingType;
    const matchesPropertyType = propertyType === "all" || property.property_type === propertyType;
    const matchesCity = city === "all" || property.city === city;
    const matchesCountry = country === "all" || property.country === country;
    const matchesDistrict = district === "all" || property.state === district;
    
    const matchesBedrooms = bedrooms === "all" ||
      (bedrooms === "0" && property.bedrooms === 0) ||
      (bedrooms === "1" && property.bedrooms === 1) ||
      (bedrooms === "2" && property.bedrooms === 2) ||
      (bedrooms === "3" && property.bedrooms === 3) ||
      (bedrooms === "4" && property.bedrooms === 4) ||
      (bedrooms === "5+" && property.bedrooms >= 5);
    
    const matchesPrice = property.price >= priceRange[0] && property.price <= priceRange[1];

    return matchesSearch && matchesListingType && matchesPropertyType && matchesCity && 
           matchesBedrooms && matchesPrice && matchesCountry && matchesDistrict;
  });

  const sortedProperties = [...filteredProperties].sort((a, b) => {
    if (sortBy === "recent") return new Date(b.created_date) - new Date(a.created_date);
    if (sortBy === "price_asc") return (a.price || 0) - (b.price || 0);
    if (sortBy === "price_desc") return (b.price || 0) - (a.price || 0);
    if (sortBy === "area") return (b.useful_area || b.square_feet || 0) - (a.useful_area || a.square_feet || 0);
    return 0;
  });

  const totalPages = Math.ceil(sortedProperties.length / ITEMS_PER_PAGE);
  const paginatedProperties = sortedProperties.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const clearFilters = () => {
    setSearchTerm("");
    setListingType("all");
    setPropertyType("all");
    setBedrooms("all");
    setPriceRange([0, 2000000]);
    setCity("all");
    setCountry("all");
    setDistrict("all");
    setCurrentPage(1);
  };

  const hasActiveFilters = listingType !== "all" || propertyType !== "all" || 
    bedrooms !== "all" || city !== "all" || priceRange[0] > 0 || priceRange[1] < 2000000 ||
    country !== "all" || district !== "all";

  const propertyTypeLabels = {
    apartment: "Apartamento",
    house: "Moradia",
    condo: "Condomínio",
    townhouse: "Casa Geminada",
    farm: "Quinta/Herdade"
  };

  const countries = ["Portugal", "United Arab Emirates", "United Kingdom", "Angola"];
  const municipalitiesForDistrict = getMunicipalitiesByDistrict(district);

  React.useEffect(() => {
    if (district !== "all" && city !== "all" && !municipalitiesForDistrict.includes(city)) {
      setCity("all");
    }
  }, [district]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [listingType, propertyType, bedrooms, city, priceRange, sortBy, country, district]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#d22630] mx-auto mb-4" />
          <p className="text-slate-600">A carregar imóveis...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#000000] via-[#2a2a2a] to-[#d22630]">
        <div className="absolute inset-0 bg-cover bg-center opacity-20 bg-[url('https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1600')]" />
        <div className="relative max-w-7xl mx-auto px-4 py-16 md:py-24">
          <div className="text-center mb-10">
            <div className="flex items-center justify-center mb-4">
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6915a593b6edd8435f5838bd/a0e94a9a1_ZUHAUS_branco_vermelho-trasnparente_c-slogan.png"
                alt="ZuHaus"
                className="h-24 md:h-32 lg:h-40 w-auto object-contain"
              />
            </div>
          </div>

          {/* Search Card */}
          <div className="max-w-4xl mx-auto">
            <Card className="shadow-2xl border-0">
              <CardContent className="p-4 md:p-6">
                {/* Quick Filter Tabs */}
                <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                  <Button 
                    variant={listingType === "all" ? "default" : "outline"}
                    onClick={() => setListingType("all")}
                    className="whitespace-nowrap"
                  >
                    Todos
                  </Button>
                  <Button 
                    variant={listingType === "sale" ? "default" : "outline"}
                    onClick={() => setListingType("sale")}
                    className="whitespace-nowrap"
                  >
                    🏷️ Comprar
                  </Button>
                  <Button 
                    variant={listingType === "rent" ? "default" : "outline"}
                    onClick={() => setListingType("rent")}
                    className="whitespace-nowrap"
                  >
                    🔑 Arrendar
                  </Button>
                </div>

                {/* Main Search */}
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
                  <Button 
                    onClick={() => setShowFilters(!showFilters)}
                    variant="outline"
                    className="h-12 gap-2"
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                    <span className="hidden md:inline">Filtros</span>
                    {hasActiveFilters && (
                      <Badge className="bg-[#d22630] text-white ml-1">
                        {[listingType !== "all", propertyType !== "all", bedrooms !== "all", city !== "all", priceRange[0] > 0 || priceRange[1] < 2000000].filter(Boolean).length}
                      </Badge>
                    )}
                  </Button>
                </div>

                {/* Extended Filters */}
                {showFilters && (
                  <div className="mt-4 pt-4 border-t border-slate-200 space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <label className="text-xs font-medium text-slate-600 mb-1.5 block">Tipo</label>
                        <Select value={propertyType} onValueChange={setPropertyType}>
                          <SelectTrigger>
                            <SelectValue placeholder="Todos" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            {Object.entries(propertyTypeLabels).map(([key, label]) => (
                              <SelectItem key={key} value={key}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-600 mb-1.5 block">Quartos</label>
                        <Select value={bedrooms} onValueChange={setBedrooms}>
                          <SelectTrigger>
                            <SelectValue placeholder="Todos" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            <SelectItem value="0">T0</SelectItem>
                            <SelectItem value="1">T1</SelectItem>
                            <SelectItem value="2">T2</SelectItem>
                            <SelectItem value="3">T3</SelectItem>
                            <SelectItem value="4">T4</SelectItem>
                            <SelectItem value="5">T5</SelectItem>
                            <SelectItem value="5+">T6+</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2">
                        <label className="text-xs font-medium text-slate-600 mb-1.5 block">
                          Preço: €{priceRange[0].toLocaleString()} - €{priceRange[1].toLocaleString()}
                        </label>
                        <Slider
                          value={priceRange}
                          onValueChange={setPriceRange}
                          min={0}
                          max={2000000}
                          step={25000}
                          className="mt-2"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs font-medium text-slate-600 mb-1.5 block">País</label>
                        <Select value={country} onValueChange={setCountry}>
                          <SelectTrigger>
                            <SelectValue placeholder="Todos" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            {countries.map(c => (
                              <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-600 mb-1.5 block">Distrito</label>
                        <Select value={district} onValueChange={setDistrict}>
                          <SelectTrigger>
                            <SelectValue placeholder="Todos" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            {ALL_DISTRICTS.map(d => (
                              <SelectItem key={d} value={d}>{d}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-600 mb-1.5 block">Concelho</label>
                        <Select value={city} onValueChange={setCity} disabled={district === "all"}>
                          <SelectTrigger>
                            <SelectValue placeholder={district === "all" ? "Escolha distrito" : "Todos"} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            {municipalitiesForDistrict.map(m => (
                              <SelectItem key={m} value={m}>{m}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {hasActiveFilters && (
                      <div className="flex items-center justify-between pt-2">
                        <div className="flex flex-wrap gap-2">
                          {listingType !== "all" && (
                            <Badge variant="secondary" className="gap-1">
                              {listingType === "sale" ? "Venda" : "Arrendamento"}
                              <X className="w-3 h-3 cursor-pointer" onClick={() => setListingType("all")} />
                            </Badge>
                          )}
                          {propertyType !== "all" && (
                            <Badge variant="secondary" className="gap-1">
                              {propertyTypeLabels[propertyType]}
                              <X className="w-3 h-3 cursor-pointer" onClick={() => setPropertyType("all")} />
                            </Badge>
                          )}
                          {bedrooms !== "all" && (
                            <Badge variant="secondary" className="gap-1">
                              T{bedrooms}
                              <X className="w-3 h-3 cursor-pointer" onClick={() => setBedrooms("all")} />
                            </Badge>
                          )}
                          {city !== "all" && (
                            <Badge variant="secondary" className="gap-1">
                              {city}
                              <X className="w-3 h-3 cursor-pointer" onClick={() => setCity("all")} />
                            </Badge>
                          )}
                        </div>
                        <Button variant="ghost" size="sm" onClick={clearFilters} className="text-red-600">
                          Limpar Tudo
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Results Section */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {filteredProperties.length} imóveis residenciais encontrados
            </h2>
            {hasActiveFilters && (
              <p className="text-sm text-slate-600">Com os filtros aplicados</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Mais Recentes</SelectItem>
                <SelectItem value="price_asc">Preço: Menor → Maior</SelectItem>
                <SelectItem value="price_desc">Preço: Maior → Menor</SelectItem>
                <SelectItem value="area">Maior Área</SelectItem>
              </SelectContent>
            </Select>
            <div className="hidden md:flex border rounded-lg overflow-hidden">
              <Button 
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className="rounded-none"
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
              <Button 
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                className="rounded-none"
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {paginatedProperties.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {paginatedProperties.map(property => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-10">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <div className="flex items-center gap-1">
                  {[...Array(Math.min(totalPages, 5))].map((_, i) => {
                    let page;
                    if (totalPages <= 5) {
                      page = i + 1;
                    } else if (currentPage <= 3) {
                      page = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      page = totalPages - 4 + i;
                    } else {
                      page = currentPage - 2 + i;
                    }
                    return (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className="w-10"
                      >
                        {page}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Home className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">
              Nenhum imóvel encontrado
            </h3>
            <p className="text-slate-600 mb-6 max-w-md mx-auto">
              Tente ajustar os filtros de pesquisa para ver mais resultados
            </p>
            <Button onClick={clearFilters}>
              Limpar Filtros
            </Button>
          </div>
        )}
      </div>

      {/* Contact CTA */}
      <div className="py-12 bg-gradient-to-r from-[#d22630] to-[#a01d26]">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            Procura a sua casa de sonho?
          </h2>
          <p className="text-slate-200 mb-6 max-w-2xl mx-auto">
            A nossa equipa especializada pode ajudá-lo a encontrar o imóvel residencial ideal para si e para a sua família.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" className="bg-white text-[#d22630] hover:bg-slate-100">
              <Phone className="w-5 h-5 mr-2" />
              Contactar
            </Button>
            <Button size="lg" className="bg-white/10 text-white border-2 border-white hover:bg-white hover:text-slate-900 transition-colors">
              <Mail className="w-5 h-5 mr-2" />
              Enviar Email
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}