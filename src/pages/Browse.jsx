import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Search, Filter, X, Home, ArrowRight, Building2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import PropertyCard from "../components/browse/PropertyCard";
import FeaturedProperties from "../components/browse/FeaturedProperties";
import { debounce } from "lodash";

export default function Browse() {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [categoryTab, setCategoryTab] = React.useState("residential");
  const [propertyType, setPropertyType] = React.useState("all");
  const [listingType, setListingType] = React.useState("all");
  const [bedrooms, setBedrooms] = React.useState("all");
  const [priceMin, setPriceMin] = React.useState("");
  const [priceMax, setPriceMax] = React.useState("");
  const [yearMin, setYearMin] = React.useState("");
  const [yearMax, setYearMax] = React.useState("");
  const [areaMin, setAreaMin] = React.useState("");
  const [areaMax, setAreaMax] = React.useState("");
  const [showFilters, setShowFilters] = React.useState(false);
  
  const ITEMS_PER_PAGE = 12;

  // Debounced search
  React.useEffect(() => {
    const debouncedUpdate = debounce(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 500);
    
    debouncedUpdate();
    return () => debouncedUpdate.cancel();
  }, [searchTerm]);

  const { data: properties = [], isLoading } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list('-created_date')
  });

  const filteredProperties = properties.filter((property) => {
    if (property.status !== 'active') return false;

    // Category filter (residential vs commercial)
    const isCommercial = property.property_type === 'commercial';
    if (categoryTab === 'residential' && isCommercial) return false;
    if (categoryTab === 'commercial' && !isCommercial) return false;

    // Search term (using debounced value)
    const matchesSearch = debouncedSearch === "" ||
      property.title?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      property.city?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      property.state?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      property.address?.toLowerCase().includes(debouncedSearch.toLowerCase());

    // Property type
    const matchesType = propertyType === "all" || property.property_type === propertyType;

    // Listing type
    const matchesListingType = listingType === "all" || property.listing_type === listingType;

    // Bedrooms (Tipologia)
    const matchesBedrooms = bedrooms === "all" ||
      bedrooms === "0" && property.bedrooms === 0 ||
      bedrooms === "1" && property.bedrooms === 1 ||
      bedrooms === "2" && property.bedrooms === 2 ||
      bedrooms === "3" && property.bedrooms === 3 ||
      bedrooms === "4" && property.bedrooms === 4 ||
      bedrooms === "5+" && property.bedrooms >= 5;

    // Price range
    const matchesPriceMin = priceMin === "" || property.price >= parseFloat(priceMin);
    const matchesPriceMax = priceMax === "" || property.price <= parseFloat(priceMax);

    // Year range
    const matchesYearMin = yearMin === "" || property.year_built && property.year_built >= parseInt(yearMin);
    const matchesYearMax = yearMax === "" || property.year_built && property.year_built <= parseInt(yearMax);

    // Area range (useful_area or square_feet)
    const propertyArea = property.useful_area || property.square_feet || 0;
    const matchesAreaMin = areaMin === "" || propertyArea >= parseFloat(areaMin);
    const matchesAreaMax = areaMax === "" || propertyArea <= parseFloat(areaMax);

    return matchesSearch && matchesType && matchesListingType && matchesBedrooms &&
      matchesPriceMin && matchesPriceMax && matchesYearMin && matchesYearMax &&
      matchesAreaMin && matchesAreaMax;
  });

  const clearFilters = () => {
    setSearchTerm("");
    setPropertyType("all");
    setListingType("all");
    setBedrooms("all");
    setPriceMin("");
    setPriceMax("");
    setYearMin("");
    setYearMax("");
    setAreaMin("");
    setAreaMax("");
    setCurrentPage(1);
  };

  const hasActiveFilters = searchTerm || propertyType !== "all" || listingType !== "all" ||
    bedrooms !== "all" || priceMin || priceMax || yearMin || yearMax ||
    areaMin || areaMax;
  
  // Pagination
  const totalPages = Math.ceil(filteredProperties.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedProperties = filteredProperties.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  
  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [categoryTab, propertyType, listingType, bedrooms, priceMin, priceMax, yearMin, yearMax, areaMin, areaMax]);

  const residentialCount = properties.filter(p => p.status === 'active' && p.property_type !== 'commercial').length;
  const commercialCount = properties.filter(p => p.status === 'active' && p.property_type === 'commercial').length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Hero Section */}
      <div className="bg-[#4cb5f5] text-white py-12 from-slate-900 via-slate-800 to-slate-900 md:py-20 relative overflow-hidden">
        <div 
          className="absolute inset-0 pointer-events-none opacity-10"
          style={{
            backgroundImage: 'url(https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6915a593b6edd8435f5838bd/359538617_Zugruppe01.jpg)',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            backgroundSize: '40%'
          }}
        />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-5xl font-bold mb-4">Plataforma ZuConnect</h1>
            <p className="text-lg md:text-xl text-slate-300">
              {properties.length} imóveis disponíveis
            </p>
          </div>

          {/* Main Search Bar */}
          <div className="max-w-3xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Pesquisar por localização, título..."
                className="pl-12 pr-4 h-14 text-lg bg-white"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Image Panels */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Link to={createPageUrl("Opportunities")}>
            <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer group">
              <div className="relative h-64">
                <img
                  src="https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=400&fit=crop"
                  alt="Oportunidades"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end p-6">
                  <div className="text-white">
                    <h3 className="text-2xl font-bold mb-2">Oportunidades</h3>
                    <p className="text-slate-200 mb-3">Gerir leads e oportunidades de negócio</p>
                    <Button className="bg-white text-slate-900 hover:bg-slate-100">
                      Ver Oportunidades
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </Link>

          <Link to={createPageUrl("Tools")}>
            <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer group">
              <div className="relative h-64">
                <img
                  src="https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&h=400&fit=crop"
                  alt="Ferramentas"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end p-6">
                  <div className="text-white">
                    <h3 className="text-2xl font-bold mb-2">Ferramentas</h3>
                    <p className="text-slate-200 mb-3">Aceder a todas as ferramentas de gestão</p>
                    <Button className="bg-white text-slate-900 hover:bg-slate-100">
                      Explorar Ferramentas
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </Link>
        </div>

        {/* Featured Properties */}
        <FeaturedProperties properties={properties.filter((p) => p.featured && p.status === 'active')} />

        {/* Category Tabs */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-6 border-b border-slate-200">
            <button
              onClick={() => {
                setCategoryTab("residential");
                setPropertyType("all");
              }}
              className={`pb-4 px-4 font-semibold transition-all relative ${
                categoryTab === "residential"
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <div className="flex items-center gap-2">
                <Home className="w-5 h-5" />
                <span>Residenciais</span>
                <Badge variant="secondary" className="ml-2">
                  {residentialCount}
                </Badge>
              </div>
            </button>
            <button
              onClick={() => {
                setCategoryTab("commercial");
                setPropertyType("commercial");
              }}
              className={`pb-4 px-4 font-semibold transition-all relative ${
                categoryTab === "commercial"
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                <span>Comerciais</span>
                <Badge variant="secondary" className="ml-2">
                  {commercialCount}
                </Badge>
              </div>
            </button>
          </div>

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-slate-900">
                {categoryTab === "residential" ? "Imóveis Residenciais" : "Imóveis Comerciais"}
              </h2>
              {hasActiveFilters && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  {filteredProperties.length} resultado{filteredProperties.length !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2"
            >
              <Filter className="w-4 h-4" />
              Filtros
            </Button>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <Card className="mb-6 border-2 border-slate-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-lg text-slate-900">Filtros Avançados</h3>
                  {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="text-red-600">
                      <X className="w-4 h-4 mr-1" />
                      Limpar Tudo
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {/* Listing Type */}
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">Tipo de Negócio</label>
                    <Select value={listingType} onValueChange={setListingType}>
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

                  {/* Property Type - Only for residential */}
                  {categoryTab === "residential" && (
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">Tipo de Imóvel</label>
                      <Select value={propertyType} onValueChange={setPropertyType}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos os Tipos</SelectItem>
                          <SelectItem value="house">Moradia</SelectItem>
                          <SelectItem value="apartment">Apartamento</SelectItem>
                          <SelectItem value="condo">Condomínio</SelectItem>
                          <SelectItem value="townhouse">Casa Geminada</SelectItem>
                          <SelectItem value="building">Prédio</SelectItem>
                          <SelectItem value="land">Terreno</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Tipologia (Bedrooms) - Only for residential */}
                  {categoryTab === "residential" && (
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">Tipologia</label>
                      <Select value={bedrooms} onValueChange={setBedrooms}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas</SelectItem>
                          <SelectItem value="0">T0</SelectItem>
                          <SelectItem value="1">T1</SelectItem>
                          <SelectItem value="2">T2</SelectItem>
                          <SelectItem value="3">T3</SelectItem>
                          <SelectItem value="4">T4</SelectItem>
                          <SelectItem value="5+">T5+</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Price Min */}
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">Preço Mínimo (€)</label>
                    <Input
                      type="number"
                      value={priceMin}
                      onChange={(e) => setPriceMin(e.target.value)}
                      placeholder="50000"
                    />
                  </div>

                  {/* Price Max */}
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">Preço Máximo (€)</label>
                    <Input
                      type="number"
                      value={priceMax}
                      onChange={(e) => setPriceMax(e.target.value)}
                      placeholder="500000"
                    />
                  </div>

                  {/* Area Min */}
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">Área Mínima (m²)</label>
                    <Input
                      type="number"
                      value={areaMin}
                      onChange={(e) => setAreaMin(e.target.value)}
                      placeholder="50"
                    />
                  </div>

                  {/* Area Max */}
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">Área Máxima (m²)</label>
                    <Input
                      type="number"
                      value={areaMax}
                      onChange={(e) => setAreaMax(e.target.value)}
                      placeholder="300"
                    />
                  </div>

                  {/* Year Min */}
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">Ano de Construção (Min)</label>
                    <Input
                      type="number"
                      value={yearMin}
                      onChange={(e) => setYearMin(e.target.value)}
                      placeholder="2000"
                    />
                  </div>

                  {/* Year Max */}
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">Ano de Construção (Max)</label>
                    <Input
                      type="number"
                      value={yearMax}
                      onChange={(e) => setYearMax(e.target.value)}
                      placeholder="2024"
                    />
                  </div>
                </div>

                {/* Active Filters Display */}
                {hasActiveFilters && (
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <p className="text-sm font-medium text-slate-700 mb-2">Filtros Ativos:</p>
                    <div className="flex flex-wrap gap-2">
                      {listingType !== "all" && (
                        <Badge variant="secondary" className="gap-1">
                          {listingType === 'sale' ? 'Venda' : 'Arrendamento'}
                          <button onClick={() => setListingType("all")} className="ml-1 hover:text-red-600">
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      )}
                      {propertyType !== "all" && categoryTab === "residential" && (
                        <Badge variant="secondary" className="gap-1">
                          {propertyType === 'house' ? 'Moradia' : propertyType === 'apartment' ? 'Apartamento' : propertyType === 'condo' ? 'Condomínio' : propertyType === 'townhouse' ? 'Casa Geminada' : propertyType === 'land' ? 'Terreno' : propertyType}
                          <button onClick={() => setPropertyType("all")} className="ml-1 hover:text-red-600">
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      )}
                      {bedrooms !== "all" && (
                        <Badge variant="secondary" className="gap-1">
                          T{bedrooms}
                          <button onClick={() => setBedrooms("all")} className="ml-1 hover:text-red-600">
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      )}
                      {priceMin && (
                        <Badge variant="secondary" className="gap-1">
                          Min: €{parseFloat(priceMin).toLocaleString()}
                          <button onClick={() => setPriceMin("")} className="ml-1 hover:text-red-600">
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      )}
                      {priceMax && (
                        <Badge variant="secondary" className="gap-1">
                          Max: €{parseFloat(priceMax).toLocaleString()}
                          <button onClick={() => setPriceMax("")} className="ml-1 hover:text-red-600">
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      )}
                      {areaMin && (
                        <Badge variant="secondary" className="gap-1">
                          Área Min: {areaMin}m²
                          <button onClick={() => setAreaMin("")} className="ml-1 hover:text-red-600">
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      )}
                      {areaMax && (
                        <Badge variant="secondary" className="gap-1">
                          Área Max: {areaMax}m²
                          <button onClick={() => setAreaMax("")} className="ml-1 hover:text-red-600">
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      )}
                      {yearMin && (
                        <Badge variant="secondary" className="gap-1">
                          Ano Min: {yearMin}
                          <button onClick={() => setYearMin("")} className="ml-1 hover:text-red-600">
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      )}
                      {yearMax && (
                        <Badge variant="secondary" className="gap-1">
                          Ano Max: {yearMax}
                          <button onClick={() => setYearMax("")} className="ml-1 hover:text-red-600">
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Properties Grid */}
        {filteredProperties.length > 0 ? (
          <>
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-slate-600">
                A mostrar {startIndex + 1}-{Math.min(startIndex + ITEMS_PER_PAGE, filteredProperties.length)} de {filteredProperties.length} imóveis
              </p>
              {totalPages > 1 && (
                <p className="text-sm text-slate-600">
                  Página {currentPage} de {totalPages}
                </p>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedProperties.map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>
            {totalPages > 1 && (
              <div className="mt-8">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                    {[...Array(totalPages)].map((_, i) => {
                      const page = i + 1;
                      if (
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1)
                      ) {
                        return (
                          <PaginationItem key={page}>
                            <PaginationLink
                              onClick={() => setCurrentPage(page)}
                              isActive={currentPage === page}
                              className="cursor-pointer"
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      } else if (page === currentPage - 2 || page === currentPage + 2) {
                        return <PaginationItem key={page}>...</PaginationItem>;
                      }
                      return null;
                    })}
                    <PaginationItem>
                      <PaginationNext 
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </>
        ) : (
          <Card className="text-center py-20">
            <CardContent>
              <Home className="w-16 h-16 text-slate-400 mx-auto mb-4" />
              <h3 className="text-2xl font-semibold text-slate-900 mb-2">
                Nenhum imóvel encontrado
              </h3>
              <p className="text-slate-600 mb-6">
                Tente ajustar os seus filtros de pesquisa
              </p>
              {hasActiveFilters && (
                <Button onClick={clearFilters} variant="outline">
                  Limpar Filtros
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}