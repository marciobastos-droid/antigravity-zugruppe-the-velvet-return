import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  Search, Filter, X, Home, MapPin, 
  Bed, Bath, Maximize, ChevronDown, SlidersHorizontal,
  Grid3X3, List, Phone, Mail, 
  ChevronLeft, ChevronRight
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { debounce } from "lodash";

// Filtra apenas imóveis residenciais
const RESIDENTIAL_TYPES = ['apartment', 'house', 'condo', 'townhouse', 'farm'];

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
  
  const ITEMS_PER_PAGE = 12;

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

  // Filtrar apenas imóveis residenciais ativos e publicados nesta página
  const residentialProperties = properties.filter(p => 
    p.status === 'active' && 
    RESIDENTIAL_TYPES.includes(p.property_type) &&
    (p.published_pages?.includes('zuhaus') || !p.published_pages)
  );

  const allCities = [...new Set(residentialProperties.map(p => p.city).filter(Boolean))].sort();

  const filteredProperties = residentialProperties.filter((property) => {
    const matchesSearch = debouncedSearch === "" ||
      property.title?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      property.city?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      property.address?.toLowerCase().includes(debouncedSearch.toLowerCase());
    
    const matchesListingType = listingType === "all" || property.listing_type === listingType;
    const matchesPropertyType = propertyType === "all" || property.property_type === propertyType;
    const matchesCity = city === "all" || property.city === city;
    const matchesPrice = property.price >= priceRange[0] && property.price <= priceRange[1];
    
    const matchesBedrooms = bedrooms === "all" ||
      (bedrooms === "0" && property.bedrooms === 0) ||
      (bedrooms === "1" && property.bedrooms === 1) ||
      (bedrooms === "2" && property.bedrooms === 2) ||
      (bedrooms === "3" && property.bedrooms === 3) ||
      (bedrooms === "4" && property.bedrooms === 4) ||
      (bedrooms === "5+" && property.bedrooms >= 5);

    return matchesSearch && matchesListingType && matchesPropertyType && matchesCity && matchesPrice && matchesBedrooms;
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
    setCurrentPage(1);
  };

  const hasActiveFilters = listingType !== "all" || propertyType !== "all" || 
    bedrooms !== "all" || city !== "all" || priceRange[0] > 0 || priceRange[1] < 2000000;

  React.useEffect(() => {
    setCurrentPage(1);
  }, [listingType, propertyType, bedrooms, city, priceRange, sortBy]);

  const propertyTypeLabels = {
    apartment: "Apartamento",
    house: "Moradia",
    condo: "Condomínio",
    townhouse: "Casa Geminada",
    farm: "Quinta/Herdade"
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#d22630] mx-auto mb-4" />
          <p className="text-slate-600">A carregar imóveis residenciais...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-[#000000] via-[#2a2a2a] to-[#d22630] overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1600')] bg-cover bg-center opacity-20" />
        <div className="relative max-w-7xl mx-auto px-4 py-16 md:py-24">
          <div className="text-center mb-10">
            <div className="flex items-center justify-center mb-4">
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6915a593b6edd8435f5838bd/a0e94a9a1_ZUHAUS_branco_vermelho-trasnparente_c-slogan.png"
                alt="ZuHaus"
                className="h-24 md:h-32 lg:h-40 w-auto object-contain"
              />
            </div>
            <p className="text-slate-400 mt-2">
              {residentialProperties.length} imóveis residenciais disponíveis
            </p>
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
                    className={`whitespace-nowrap ${listingType === "all" ? "bg-[#d22630] hover:bg-[#a01d26] text-white" : ""}`}
                  >
                    Todos
                  </Button>
                  <Button 
                    variant={listingType === "sale" ? "default" : "outline"}
                    onClick={() => setListingType("sale")}
                    className={`whitespace-nowrap ${listingType === "sale" ? "bg-[#d22630] hover:bg-[#a01d26] text-white" : ""}`}
                  >
                    🏷️ Comprar
                  </Button>
                  <Button 
                    variant={listingType === "rent" ? "default" : "outline"}
                    onClick={() => setListingType("rent")}
                    className={`whitespace-nowrap ${listingType === "rent" ? "bg-[#d22630] hover:bg-[#a01d26] text-white" : ""}`}
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
                      <Badge className="ml-1 bg-[#d22630] text-white">
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
                        <label className="text-xs font-medium text-slate-600 mb-1.5 block">Tipo de Imóvel</label>
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
                            <SelectItem value="5+">T5+</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="md:col-span-2">
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
        {/* Results Header */}
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

        {/* Properties Grid/List */}
        {paginatedProperties.length > 0 ? (
          <>
            <div className={viewMode === "grid" 
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
              : "space-y-4"
            }>
              {paginatedProperties.map(property => (
                viewMode === "grid" 
                  ? <PropertyCard key={property.id} property={property} />
                  : <PropertyCardList key={property.id} property={property} />
              ))}
            </div>

            {/* Pagination */}
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
                        className={`w-10 ${currentPage === page ? "bg-[#d22630] hover:bg-[#a01d26] text-white" : ""}`}
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
              Nenhum imóvel residencial encontrado
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
      <div className="bg-gradient-to-r from-[#d22630] to-[#a01d26] py-12 mt-12">
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
            <Button size="lg" variant="outline" className="text-white border-white hover:bg-white/10">
              <Mail className="w-5 h-5 mr-2" />
              Enviar Email
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Property Card for Grid View
function PropertyCard({ property }) {
  const [imgError, setImgError] = React.useState(false);
  const [imgIndex, setImgIndex] = React.useState(0);
  const images = property.images?.length > 0 ? property.images : [];

  const propertyTypeLabels = {
    apartment: "Apartamento", house: "Moradia", condo: "Condomínio",
    townhouse: "Casa Geminada", farm: "Quinta/Herdade"
  };

  return (
    <Link 
      to={`${createPageUrl("PropertyDetails")}?id=${property.id}`}
      className="group bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 border border-slate-100"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
        {!imgError && images[imgIndex] ? (
          <img
            src={images[imgIndex]}
            alt={property.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
            <Home className="w-12 h-12 text-slate-300" />
          </div>
        )}

        {/* Image Navigation */}
        {images.length > 1 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {images.slice(0, 5).map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.preventDefault(); setImgIndex(i); }}
                className={`w-1.5 h-1.5 rounded-full transition-all ${i === imgIndex ? 'bg-white w-4' : 'bg-white/60'}`}
              />
            ))}
          </div>
        )}
        
        {/* Badge */}
        <div className="absolute top-3 left-3">
          <Badge className="bg-white/95 text-slate-800 border-0">
            {property.listing_type === 'sale' ? 'Venda' : 'Arrendamento'}
          </Badge>
        </div>

        {/* Price */}
        <div className="absolute bottom-3 right-3">
          <div className="bg-slate-900/90 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg font-bold">
            €{property.price?.toLocaleString()}
            {property.listing_type === 'rent' && <span className="text-xs font-normal">/mês</span>}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-slate-900 line-clamp-1 group-hover:text-[#d22630] transition-colors mb-1">
          {property.title}
        </h3>
        <p className="text-sm text-slate-500 flex items-center gap-1 mb-3">
          <MapPin className="w-3.5 h-3.5" />
          {property.city}
        </p>
        
        <div className="flex items-center gap-4 text-sm text-slate-600">
          {property.bedrooms > 0 && (
            <span className="flex items-center gap-1">
              <Bed className="w-4 h-4" />
              T{property.bedrooms}
            </span>
          )}
          {property.bathrooms > 0 && (
            <span className="flex items-center gap-1">
              <Bath className="w-4 h-4" />
              {property.bathrooms}
            </span>
          )}
          {(property.useful_area || property.square_feet) > 0 && (
            <span className="flex items-center gap-1">
              <Maximize className="w-4 h-4" />
              {property.useful_area || property.square_feet}m²
            </span>
          )}
        </div>

        <div className="mt-3 pt-3 border-t border-slate-100">
          <Badge variant="outline" className="text-xs">
            {propertyTypeLabels[property.property_type] || property.property_type}
          </Badge>
        </div>
      </div>
    </Link>
  );
}

// List Card for List View
function PropertyCardList({ property }) {
  const [imgError, setImgError] = React.useState(false);
  const image = property.images?.[0];

  const propertyTypeLabels = {
    apartment: "Apartamento", house: "Moradia", condo: "Condomínio",
    townhouse: "Casa Geminada", farm: "Quinta/Herdade"
  };

  return (
    <Link 
      to={`${createPageUrl("PropertyDetails")}?id=${property.id}`}
      className="group flex bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all border border-slate-100"
    >
      {/* Image */}
      <div className="relative w-72 flex-shrink-0 overflow-hidden bg-slate-100">
        {!imgError && image ? (
          <img
            src={image}
            alt={property.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Home className="w-12 h-12 text-slate-300" />
          </div>
        )}
        <Badge className="absolute top-3 left-3 bg-white/95 text-slate-800 border-0">
          {property.listing_type === 'sale' ? 'Venda' : 'Arrendamento'}
        </Badge>
      </div>

      {/* Content */}
      <div className="flex-1 p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 group-hover:text-[#d22630] transition-colors line-clamp-1">
                {property.title}
              </h3>
              <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                <MapPin className="w-4 h-4" />
                {property.city}{property.address && `, ${property.address}`}
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-slate-900">
                €{property.price?.toLocaleString()}
              </div>
              {property.listing_type === 'rent' && (
                <span className="text-sm text-slate-500">/mês</span>
              )}
            </div>
          </div>
          
          {property.description && (
            <p className="text-sm text-slate-600 mt-3 line-clamp-2">
              {property.description}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-5 text-sm text-slate-600">
            {property.bedrooms > 0 && (
              <span className="flex items-center gap-1.5">
                <Bed className="w-4 h-4" />
                T{property.bedrooms}
              </span>
            )}
            {property.bathrooms > 0 && (
              <span className="flex items-center gap-1.5">
                <Bath className="w-4 h-4" />
                {property.bathrooms} WC
              </span>
            )}
            {(property.useful_area || property.square_feet) > 0 && (
              <span className="flex items-center gap-1.5">
                <Maximize className="w-4 h-4" />
                {property.useful_area || property.square_feet}m²
              </span>
            )}
          </div>
          <Badge variant="outline">
            {propertyTypeLabels[property.property_type] || property.property_type}
          </Badge>
        </div>
      </div>
    </Link>
  );
}