import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  Search, Filter, X, Home, Building2, MapPin, 
  Bed, Bath, Maximize, Star, ChevronDown, SlidersHorizontal,
  Grid3X3, List, Heart, Phone, Mail, Euro, Calendar,
  ChevronLeft, ChevronRight, Sparkles, Zap, Car, TreePine, Check
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { debounce } from "lodash";
import { ALL_DISTRICTS, getMunicipalitiesByDistrict } from "../components/common/PortugalLocations";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ZuGruppe() {
  const [activeTab, setActiveTab] = React.useState("all");
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
  const [availability, setAvailability] = React.useState("all");
  
  // Advanced filters
  const [pricePerSqmRange, setPricePerSqmRange] = React.useState([0, 10000]);
  const [yearBuiltRange, setYearBuiltRange] = React.useState([1900, 2025]);
  const [energyCertificate, setEnergyCertificate] = React.useState("all");
  const [parking, setParking] = React.useState("all");
  const [selectedAmenities, setSelectedAmenities] = React.useState([]);
  const [showAdvancedFilters, setShowAdvancedFilters] = React.useState(false);
  
  // Debounced state for range inputs
  const [debouncedPricePerSqm, setDebouncedPricePerSqm] = React.useState([0, 10000]);
  const [debouncedYearBuilt, setDebouncedYearBuilt] = React.useState([1900, 2025]);
  
  const ITEMS_PER_PAGE = 12;
  
  // Debounce price per sqm
  React.useEffect(() => {
    const handler = debounce(() => {
      setDebouncedPricePerSqm(pricePerSqmRange);
      setCurrentPage(1);
    }, 500);
    handler();
    return () => handler.cancel();
  }, [pricePerSqmRange]);
  
  // Debounce year built
  React.useEffect(() => {
    const handler = debounce(() => {
      setDebouncedYearBuilt(yearBuiltRange);
      setCurrentPage(1);
    }, 500);
    handler();
    return () => handler.cancel();
  }, [yearBuiltRange]);
  
  // Common amenities for filtering
  const COMMON_AMENITIES = [
    { value: "piscina", label: "Piscina", icon: "🏊" },
    { value: "garagem", label: "Garagem", icon: "🚗" },
    { value: "jardim", label: "Jardim", icon: "🌳" },
    { value: "terraço", label: "Terraço", icon: "☀️" },
    { value: "varanda", label: "Varanda", icon: "🏠" },
    { value: "elevador", label: "Elevador", icon: "🛗" },
    { value: "ar condicionado", label: "Ar Condicionado", icon: "❄️" },
    { value: "lareira", label: "Lareira", icon: "🔥" },
    { value: "arrecadação", label: "Arrecadação", icon: "📦" },
    { value: "vista mar", label: "Vista Mar", icon: "🌊" },
    { value: "condomínio fechado", label: "Condomínio Fechado", icon: "🔒" },
    { value: "churrasqueira", label: "Churrasqueira", icon: "🍖" }
  ];
  
  const ENERGY_CERTIFICATES = ["A+", "A", "B", "B-", "C", "D", "E", "F", "isento"];
  const PARKING_OPTIONS = [
    { value: "all", label: "Todos" },
    { value: "none", label: "Sem garagem" },
    { value: "1", label: "1 lugar" },
    { value: "2", label: "2 lugares" },
    { value: "3+", label: "3+ lugares" },
    { value: "box", label: "Box" }
  ];

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

  const RESIDENTIAL_TYPES = ['apartment', 'house', 'condo', 'townhouse', 'farm'];
  const COMMERCIAL_TYPES = ['store', 'warehouse', 'office', 'building'];

  const activeProperties = properties.filter(p => p.status === 'active');
  
  // Filtrar por tab ativa
  const tabFilteredProperties = React.useMemo(() => {
    if (activeTab === "residential") {
      return activeProperties.filter(p => RESIDENTIAL_TYPES.includes(p.property_type));
    } else if (activeTab === "commercial") {
      return activeProperties.filter(p => COMMERCIAL_TYPES.includes(p.property_type));
    }
    return activeProperties;
  }, [activeTab, activeProperties]);

  const allCities = [...new Set(tabFilteredProperties.map(p => p.city).filter(Boolean))].sort();
  const featuredProperties = activeProperties.filter(p => p.featured).slice(0, 4);

  const filteredProperties = tabFilteredProperties.filter((property) => {
    const matchesSearch = debouncedSearch === "" ||
      property.title?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      property.city?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      property.address?.toLowerCase().includes(debouncedSearch.toLowerCase());
    
    const matchesListingType = listingType === "all" || property.listing_type === listingType;
    const matchesPropertyType = propertyType === "all" || property.property_type === propertyType;
    const matchesCity = city === "all" || property.city === city;
    const matchesCountry = country === "all" || property.country === country;
    const matchesDistrict = district === "all" || property.state === district;
    const matchesAvailability = availability === "all" || property.availability_status === availability;
    
    const matchesBedrooms = bedrooms === "all" ||
      (bedrooms === "0" && property.bedrooms === 0) ||
      (bedrooms === "1" && property.bedrooms === 1) ||
      (bedrooms === "2" && property.bedrooms === 2) ||
      (bedrooms === "3" && property.bedrooms === 3) ||
      (bedrooms === "4" && property.bedrooms === 4) ||
      (bedrooms === "5+" && property.bedrooms >= 5);
    
    const matchesPrice = property.price >= priceRange[0] && property.price <= priceRange[1];
    
    // Advanced filters
    const area = property.useful_area || property.square_feet || 0;
    const pricePerSqm = area > 0 ? property.price / area : 0;
    const matchesPricePerSqm = debouncedPricePerSqm[0] === 0 && debouncedPricePerSqm[1] === 10000 ||
      (pricePerSqm >= debouncedPricePerSqm[0] && pricePerSqm <= debouncedPricePerSqm[1]);
    
    const matchesYearBuilt = debouncedYearBuilt[0] === 1900 && debouncedYearBuilt[1] === 2025 ||
      (property.year_built >= debouncedYearBuilt[0] && property.year_built <= debouncedYearBuilt[1]);
    
    const matchesEnergyCert = energyCertificate === "all" || property.energy_certificate === energyCertificate;
    
    const matchesParking = parking === "all" || 
      (parking === "none" && (!property.garage || property.garage === "none")) ||
      (parking === "3+" && parseInt(property.garage) >= 3) ||
      property.garage === parking;
    
    const matchesAmenities = selectedAmenities.length === 0 ||
      selectedAmenities.every(amenity => 
        property.amenities?.some(a => a.toLowerCase().includes(amenity.toLowerCase()))
      );

    return matchesSearch && matchesListingType && matchesPropertyType && matchesCity && 
           matchesBedrooms && matchesPrice && matchesCountry && matchesDistrict && 
           matchesAvailability && matchesPricePerSqm && matchesYearBuilt && 
           matchesEnergyCert && matchesParking && matchesAmenities;
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
    setAvailability("all");
    setPricePerSqmRange([0, 10000]);
    setYearBuiltRange([1900, 2025]);
    setEnergyCertificate("all");
    setParking("all");
    setSelectedAmenities([]);
    setCurrentPage(1);
  };

  const hasActiveFilters = listingType !== "all" || propertyType !== "all" || 
    bedrooms !== "all" || city !== "all" || priceRange[0] > 0 || priceRange[1] < 2000000 ||
    country !== "all" || district !== "all" || availability !== "all" ||
    pricePerSqmRange[0] > 0 || pricePerSqmRange[1] < 10000 ||
    yearBuiltRange[0] > 1900 || yearBuiltRange[1] < 2025 ||
    energyCertificate !== "all" || parking !== "all" || selectedAmenities.length > 0;
  
  const advancedFilterCount = [
    pricePerSqmRange[0] > 0 || pricePerSqmRange[1] < 10000,
    yearBuiltRange[0] > 1900 || yearBuiltRange[1] < 2025,
    energyCertificate !== "all",
    parking !== "all",
    selectedAmenities.length > 0
  ].filter(Boolean).length;

  React.useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, listingType, propertyType, bedrooms, city, priceRange, sortBy, country, district, availability, energyCertificate, parking, selectedAmenities]);
  
  const toggleAmenity = (amenity) => {
    setSelectedAmenities(prev => 
      prev.includes(amenity) 
        ? prev.filter(a => a !== amenity)
        : [...prev, amenity]
    );
  };

  const propertyTypeLabels = {
    apartment: "Apartamento",
    house: "Moradia",
    land: "Terreno",
    building: "Prédio",
    farm: "Quinta/Herdade",
    store: "Loja",
    warehouse: "Armazém",
    office: "Escritório"
  };

  const availabilityLabels = {
    available: "Disponível",
    sold: "Vendido",
    reserved: "Reservado",
    rented: "Arrendado",
    prospecting: "Em Prospecção",
    withdrawn: "Retirado",
    pending_validation: "Por validar"
  };

  const countries = ["Portugal", "United Arab Emirates", "United Kingdom", "Angola"];
  const municipalitiesForDistrict = getMunicipalitiesByDistrict(district);

  // Reset city when district changes
  React.useEffect(() => {
    if (district !== "all" && city !== "all" && !municipalitiesForDistrict.includes(city)) {
      setCity("all");
    }
  }, [district]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-slate-600">A carregar imóveis...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Section */}
      <div className={`relative overflow-hidden ${
        activeTab === "residential" 
          ? "bg-gradient-to-br from-[#000000] via-[#2a2a2a] to-[#d22630]"
          : activeTab === "commercial"
          ? "bg-gradient-to-br from-[#000000] via-[#2a2a2a] to-[#75787b]"
          : "bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900"
      }`}>
        <div className={`absolute inset-0 bg-cover bg-center opacity-20 ${
          activeTab === "residential"
            ? "bg-[url('https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1600')]"
            : activeTab === "commercial"
            ? "bg-[url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1600')]"
            : "bg-[url('https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1600')]"
        }`} />
        <div className="relative max-w-7xl mx-auto px-4 py-16 md:py-24">
          <div className="text-center mb-10">
            <div className="flex items-center justify-center mb-4">
              <img 
                src={
                  activeTab === "residential"
                    ? "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6915a593b6edd8435f5838bd/a0e94a9a1_ZUHAUS_branco_vermelho-trasnparente_c-slogan.png"
                    : activeTab === "commercial"
                    ? "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6915a593b6edd8435f5838bd/fbf7ef631_WaterMarkZuHandel.png"
                    : "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6915a593b6edd8435f5838bd/c00740fb7_ZUGRUPPE_branco_azul-trasnparente_c-slogan1.png"
                }
                alt={activeTab === "residential" ? "ZuHaus" : activeTab === "commercial" ? "ZuHandel" : "ZuGruppe"}
                className="h-24 md:h-32 lg:h-40 w-auto object-contain"
              />
            </div>
          </div>

          {/* Search Card */}
          <div className="max-w-4xl mx-auto">
            <Card className="shadow-2xl border-0">
              <CardContent className="p-4 md:p-6">
                {/* Tabs de Categoria */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
                  <TabsList className="grid grid-cols-3 w-full">
                    <TabsTrigger value="all" className="flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      Todos os Imóveis
                    </TabsTrigger>
                    <TabsTrigger value="residential" className="flex items-center gap-2">
                      <Home className="w-4 h-4" />
                      Residencial
                    </TabsTrigger>
                    <TabsTrigger value="commercial" className="flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      Comercial
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

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
                      <Badge className="bg-blue-600 text-white ml-1">
                        {[listingType !== "all", propertyType !== "all", bedrooms !== "all", city !== "all", priceRange[0] > 0 || priceRange[1] < 2000000].filter(Boolean).length}
                      </Badge>
                    )}
                  </Button>
                </div>

                {/* Extended Filters */}
                {showFilters && (
                  <div className="mt-4 pt-4 border-t border-slate-200 space-y-4">
                    {/* Row 1: Natureza, Quartos, Negócio, Disponibilidade */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <label className="text-xs font-medium text-slate-600 mb-1.5 block">Natureza</label>
                        <Select value={propertyType} onValueChange={setPropertyType}>
                          <SelectTrigger>
                            <SelectValue placeholder="Todas" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todas</SelectItem>
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
                      <div>
                        <label className="text-xs font-medium text-slate-600 mb-1.5 block">Disponibilidade</label>
                        <Select value={availability} onValueChange={setAvailability}>
                          <SelectTrigger>
                            <SelectValue placeholder="Todas" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todas</SelectItem>
                            {Object.entries(availabilityLabels).map(([key, label]) => (
                              <SelectItem key={key} value={key}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
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

                    {/* Row 2: País, Distrito, Concelho */}
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
                    
                    {/* Advanced Filters Toggle */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 mt-2"
                    >
                      <SlidersHorizontal className="w-4 h-4 mr-2" />
                      {showAdvancedFilters ? "Esconder Filtros Avançados" : "Mostrar Filtros Avançados"}
                      {advancedFilterCount > 0 && (
                        <Badge className="ml-2 bg-blue-600 text-white">{advancedFilterCount}</Badge>
                      )}
                    </Button>
                    
                    {/* Advanced Filters Section */}
                    {showAdvancedFilters && (
                      <div className="mt-4 pt-4 border-t border-dashed border-slate-300 space-y-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-3">
                          <Sparkles className="w-4 h-4 text-blue-600" />
                          Filtros Avançados
                        </div>
                        
                        {/* Row: Price per sqm, Year Built */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs font-medium text-slate-600 mb-1.5 block">
                              Preço/m²: €{pricePerSqmRange[0].toLocaleString()} - €{pricePerSqmRange[1].toLocaleString()}
                            </label>
                            <Slider
                              value={pricePerSqmRange}
                              onValueChange={setPricePerSqmRange}
                              min={0}
                              max={10000}
                              step={100}
                              className="mt-2"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-slate-600 mb-1.5 block">
                              Ano Construção: {yearBuiltRange[0]} - {yearBuiltRange[1]}
                            </label>
                            <Slider
                              value={yearBuiltRange}
                              onValueChange={setYearBuiltRange}
                              min={1900}
                              max={2025}
                              step={1}
                              className="mt-2"
                            />
                          </div>
                        </div>
                        
                        {/* Row: Energy Certificate, Parking */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          <div>
                            <label className="text-xs font-medium text-slate-600 mb-1.5 block flex items-center gap-1">
                              <Zap className="w-3 h-3" />
                              Cert. Energético
                            </label>
                            <Select value={energyCertificate} onValueChange={setEnergyCertificate}>
                              <SelectTrigger>
                                <SelectValue placeholder="Todos" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">Todos</SelectItem>
                                {ENERGY_CERTIFICATES.map(cert => (
                                  <SelectItem key={cert} value={cert}>
                                    {cert === "isento" ? "Isento" : cert}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-slate-600 mb-1.5 block flex items-center gap-1">
                              <Car className="w-3 h-3" />
                              Estacionamento
                            </label>
                            <Select value={parking} onValueChange={setParking}>
                              <SelectTrigger>
                                <SelectValue placeholder="Todos" />
                              </SelectTrigger>
                              <SelectContent>
                                {PARKING_OPTIONS.map(opt => (
                                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          {/* Amenities Multi-Select */}
                          <div className="md:col-span-1 col-span-2">
                            <label className="text-xs font-medium text-slate-600 mb-1.5 block flex items-center gap-1">
                              <TreePine className="w-3 h-3" />
                              Comodidades
                            </label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full justify-between h-10">
                                  {selectedAmenities.length === 0 
                                    ? "Selecionar..." 
                                    : `${selectedAmenities.length} selecionada${selectedAmenities.length > 1 ? 's' : ''}`
                                  }
                                  <ChevronDown className="w-4 h-4 ml-2 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-64 p-2" align="start">
                                <div className="max-h-64 overflow-y-auto space-y-1">
                                  {COMMON_AMENITIES.map((amenity) => (
                                    <div
                                      key={amenity.value}
                                      onClick={() => toggleAmenity(amenity.value)}
                                      className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-slate-100 ${
                                        selectedAmenities.includes(amenity.value) ? "bg-blue-50" : ""
                                      }`}
                                    >
                                      <div className={`w-4 h-4 border rounded flex items-center justify-center ${
                                        selectedAmenities.includes(amenity.value) ? "bg-blue-600 border-blue-600" : "border-slate-300"
                                      }`}>
                                        {selectedAmenities.includes(amenity.value) && <Check className="w-3 h-3 text-white" />}
                                      </div>
                                      <span className="mr-1">{amenity.icon}</span>
                                      <span className="text-sm">{amenity.label}</span>
                                    </div>
                                  ))}
                                </div>
                                {selectedAmenities.length > 0 && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="w-full mt-2 text-red-600"
                                    onClick={() => setSelectedAmenities([])}
                                  >
                                    Limpar Seleção
                                  </Button>
                                )}
                              </PopoverContent>
                            </Popover>
                          </div>
                        </div>
                        
                        {/* Selected Amenities Display */}
                        {selectedAmenities.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {selectedAmenities.map(amenity => {
                              const amenityData = COMMON_AMENITIES.find(a => a.value === amenity);
                              return (
                                <Badge 
                                  key={amenity} 
                                  variant="secondary" 
                                  className="gap-1 cursor-pointer hover:bg-red-100"
                                  onClick={() => toggleAmenity(amenity)}
                                >
                                  {amenityData?.icon} {amenityData?.label || amenity}
                                  <X className="w-3 h-3" />
                                </Badge>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

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
                          {country !== "all" && (
                            <Badge variant="secondary" className="gap-1">
                              {country}
                              <X className="w-3 h-3 cursor-pointer" onClick={() => setCountry("all")} />
                            </Badge>
                          )}
                          {district !== "all" && (
                            <Badge variant="secondary" className="gap-1">
                              {district}
                              <X className="w-3 h-3 cursor-pointer" onClick={() => setDistrict("all")} />
                            </Badge>
                          )}
                          {availability !== "all" && (
                            <Badge variant="secondary" className="gap-1">
                              {availabilityLabels[availability]}
                              <X className="w-3 h-3 cursor-pointer" onClick={() => setAvailability("all")} />
                            </Badge>
                          )}
                          {energyCertificate !== "all" && (
                            <Badge variant="secondary" className="gap-1">
                              Cert. {energyCertificate}
                              <X className="w-3 h-3 cursor-pointer" onClick={() => setEnergyCertificate("all")} />
                            </Badge>
                          )}
                          {parking !== "all" && (
                            <Badge variant="secondary" className="gap-1">
                              {PARKING_OPTIONS.find(p => p.value === parking)?.label}
                              <X className="w-3 h-3 cursor-pointer" onClick={() => setParking("all")} />
                            </Badge>
                          )}
                          {(pricePerSqmRange[0] > 0 || pricePerSqmRange[1] < 10000) && (
                            <Badge variant="secondary" className="gap-1">
                              €{pricePerSqmRange[0]}-{pricePerSqmRange[1]}/m²
                              <X className="w-3 h-3 cursor-pointer" onClick={() => setPricePerSqmRange([0, 10000])} />
                            </Badge>
                          )}
                          {(yearBuiltRange[0] > 1900 || yearBuiltRange[1] < 2025) && (
                            <Badge variant="secondary" className="gap-1">
                              {yearBuiltRange[0]}-{yearBuiltRange[1]}
                              <X className="w-3 h-3 cursor-pointer" onClick={() => setYearBuiltRange([1900, 2025])} />
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

      {/* Featured Properties */}
      {featuredProperties.length > 0 && !hasActiveFilters && !debouncedSearch && activeTab === "all" && (
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Star className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Imóveis em Destaque</h2>
              <p className="text-slate-600">As melhores oportunidades selecionadas para si</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {featuredProperties.map(property => (
              <PropertyCardCompact key={property.id} property={property} featured />
            ))}
          </div>
        </div>
      )}

      {/* Results Section */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Results Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {filteredProperties.length} {activeTab === "residential" ? "imóveis residenciais" : activeTab === "commercial" ? "imóveis comerciais" : "imóveis"} encontrados
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
                  ? <PropertyCardCompact key={property.id} property={property} />
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
      <div className={`py-12 ${
        activeTab === "residential"
          ? "bg-gradient-to-r from-[#d22630] to-[#a01d26]"
          : activeTab === "commercial"
          ? "bg-gradient-to-r from-[#75787b] to-[#5a5c5e]"
          : "bg-gradient-to-r from-blue-600 to-blue-700"
      }`}>
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            {activeTab === "residential" 
              ? "Procura a sua casa de sonho?"
              : activeTab === "commercial"
              ? "Procura um espaço comercial específico?"
              : "Não encontrou o que procura?"
            }
          </h2>
          <p className={`mb-6 max-w-2xl mx-auto ${
            activeTab === "residential" ? "text-slate-200" : activeTab === "commercial" ? "text-slate-200" : "text-blue-100"
          }`}>
            {activeTab === "residential"
              ? "A nossa equipa especializada pode ajudá-lo a encontrar o imóvel residencial ideal para si e para a sua família."
              : activeTab === "commercial"
              ? "A nossa equipa especializada pode ajudá-lo a encontrar o imóvel comercial ideal para o seu negócio."
              : "A nossa equipa pode ajudá-lo a encontrar o imóvel perfeito. Entre em contacto connosco!"
            }
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" className={
              activeTab === "residential"
                ? "bg-white text-[#d22630] hover:bg-slate-100"
                : activeTab === "commercial"
                ? "bg-white text-[#75787b] hover:bg-slate-100"
                : "bg-white text-blue-600 hover:bg-blue-50"
            }>
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

          {/* Footer Legal */}
          <footer className="bg-slate-900 text-white py-8 mt-0">
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

// Compact Card for Grid View
function PropertyCardCompact({ property, featured }) {
  const [imgError, setImgError] = React.useState(false);
  const [imgIndex, setImgIndex] = React.useState(0);
  const images = property.images?.length > 0 ? property.images : [];

  const propertyTypeLabels = {
    apartment: "Apartamento", house: "Moradia", land: "Terreno",
    building: "Prédio", farm: "Quinta/Herdade", store: "Loja", warehouse: "Armazém", office: "Escritório"
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
        
        {/* Badges */}
        <div className="absolute top-3 left-3 flex gap-2">
          {featured && (
            <Badge className="bg-amber-400 text-slate-900 border-0">
              <Star className="w-3 h-3 mr-1" />
              Destaque
            </Badge>
          )}
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
        <h3 className="font-semibold text-slate-900 line-clamp-1 group-hover:text-blue-600 transition-colors mb-1">
          {property.title}
        </h3>
        <p className="text-sm text-slate-500 flex items-center gap-1 mb-3">
          <MapPin className="w-3.5 h-3.5" />
          {property.city}
        </p>
        
        <div className="flex items-center gap-4 text-sm text-slate-600">
          {(property.bedrooms !== undefined && property.bedrooms !== null) && (
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
    apartment: "Apartamento", house: "Moradia", land: "Terreno",
    building: "Prédio", farm: "Quinta/Herdade", store: "Loja", warehouse: "Armazém", office: "Escritório"
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
              <h3 className="text-lg font-semibold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
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
            {(property.bedrooms !== undefined && property.bedrooms !== null) && (
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