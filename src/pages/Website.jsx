import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import SEOHead from "../components/seo/SEOHead";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  Search, Filter, X, Home, Building2, MapPin, 
  Bed, Bath, Maximize, Star, ChevronDown, SlidersHorizontal,
  Grid3X3, List, Heart, Phone, Mail, Euro, Calendar,
  ChevronLeft, ChevronRight, Zap, Car, TreePine, Check
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
import { CURRENCY_SYMBOLS, convertToEUR } from "../components/utils/currencyConverter";
import PropertiesMap from "../components/maps/PropertiesMap";
import OptimizedImage from "../components/common/OptimizedImage";
import ImagePreloader from "../components/seo/ImagePreloader";
import ExitIntentPopup from "../components/website/ExitIntentPopup";
import AIChatWidget from "../components/website/AIChatWidget";
import { useABTesting } from "../components/website/ABTestingController";
import { HelmetProvider } from "react-helmet-async";
import { usePropertyEngagement } from "../components/website/PropertyEngagementTracker";
import { generatePropertySEOUrl } from "../components/utils/seoHelpers";
import { useLocalization } from "../components/i18n/LocalizationContext";
import { QUERY_CONFIG } from "../components/utils/queryClient";
import { useGuestFeatures } from "../components/visitors/useGuestFeatures";
import RegisterPromptDialog from "../components/visitors/RegisterPromptDialog";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { handleApiError } from "../components/errors/apiErrorHandler";
import ErrorBoundary from "../components/errors/ErrorBoundary";
import { Settings } from "lucide-react";
import LandingPageBuilder from "../components/website/LandingPageBuilder";
import DynamicFormBuilder from "../components/website/DynamicFormBuilder";
import SEOManager from "../components/website/SEOManager";
import VisitorTracker from "../components/tracking/VisitorTracker";
import SmartContactSection from "../components/website/SmartContactSection";
import { useTranslatedProperty } from "../components/i18n/TranslatedContent";
import MultiCurrencyPrice from "../components/property/MultiCurrencyPrice";

export default function Website() {
  const [showWebsiteTools, setShowWebsiteTools] = React.useState(false);
  const { t, locale } = useLocalization();
  
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      try {
        return await base44.auth.me();
      } catch {
        return null;
      }
    }
  });

  const isAdmin = user && (user.role === 'admin' || user.user_type === 'admin' || user.user_type === 'gestor');
  
  const { data: properties = [], isLoading, error: propertiesError } = useQuery({
    queryKey: ['properties', 'website'],
    queryFn: async () => {
      try {
        return await base44.entities.Property.list('-created_date');
      } catch (error) {
        handleApiError(error, {
          endpoint: 'Property.list',
          customMessage: 'Erro ao carregar imóveis. Tente recarregar a página.',
          showToast: true
        });
        throw error;
      }
    },
    staleTime: 0, // Force refresh on navigation
    retry: 2
  });

  // A/B Testing
  const { cta, layout, trackConversion, trackCTAClick } = useABTesting();
  
  // Guest features
  const { addFavorite, removeFavorite, isFavorite, favoritesCount, isGuest } = useGuestFeatures();
  const [showRegisterPrompt, setShowRegisterPrompt] = React.useState(false);

  // Calculate dynamic ranges based on actual data
  const dataRanges = React.useMemo(() => {
    if (properties.length === 0) return { maxPrice: 2000000, maxPricePerSqm: 10000, minYear: 1900, maxYear: 2025 };
    
    const prices = properties.map(p => p.price || 0).filter(p => p > 0);
    const years = properties.map(p => p.year_built).filter(y => y > 0);
    const pricesPerSqm = properties.map(p => {
      const area = p.useful_area || p.square_feet || 0;
      return area > 0 ? p.price / area : 0;
    }).filter(p => p > 0);
    
    return {
      maxPrice: prices.length > 0 ? Math.ceil(Math.max(...prices) * 1.1 / 50000) * 50000 : 2000000,
      maxPricePerSqm: pricesPerSqm.length > 0 ? Math.ceil(Math.max(...pricesPerSqm) * 1.1 / 500) * 500 : 10000,
      minYear: years.length > 0 ? Math.min(...years) : 1900,
      maxYear: new Date().getFullYear()
    };
  }, [properties]);

  const [activeTab, setActiveTab] = React.useState("residential");
  const [searchTerm, setSearchTerm] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [listingType, setListingType] = React.useState("all");
  const [propertyType, setPropertyType] = React.useState("all");
  const [bedrooms, setBedrooms] = React.useState("all");
  const [priceMin, setPriceMin] = React.useState("");
  const [priceMax, setPriceMax] = React.useState("");
  const [city, setCity] = React.useState("all");
  const [sortBy, setSortBy] = React.useState("recent");
  const [showFilters, setShowFilters] = React.useState(false);
  const [viewMode, setViewMode] = React.useState("grid");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [country, setCountry] = React.useState("all");
  const [district, setDistrict] = React.useState("all");
  const [availability, setAvailability] = React.useState("all");
  
  // Advanced filters
  const [pricePerSqmRange, setPricePerSqmRange] = React.useState([0, 0]); // Will be set after data loads
  const [yearBuiltRange, setYearBuiltRange] = React.useState([0, 0]); // Will be set after data loads
  const [energyCertificate, setEnergyCertificate] = React.useState("all");
  const [parking, setParking] = React.useState("all");
  const [selectedAmenities, setSelectedAmenities] = React.useState([]);
  const [showAdvancedFilters, setShowAdvancedFilters] = React.useState(false);
  
  // Debounced state for range inputs
  const [debouncedPricePerSqm, setDebouncedPricePerSqm] = React.useState([0, 0]);
  const [debouncedYearBuilt, setDebouncedYearBuilt] = React.useState([0, 0]);
  const [showMapView, setShowMapView] = React.useState(false);

  // Initialize ranges when data loads
  React.useEffect(() => {
    if (properties.length > 0 && pricePerSqmRange[1] === 0) {
      setPricePerSqmRange([0, dataRanges.maxPricePerSqm]);
      setYearBuiltRange([dataRanges.minYear, dataRanges.maxYear]);
      setDebouncedPricePerSqm([0, dataRanges.maxPricePerSqm]);
      setDebouncedYearBuilt([dataRanges.minYear, dataRanges.maxYear]);
    }
  }, [properties, dataRanges]);
  
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

  const RESIDENTIAL_TYPES = ['apartment', 'house', 'condo', 'townhouse', 'farm'];
  const COMMERCIAL_TYPES = ['store', 'warehouse', 'office', 'building'];

  const activeProperties = properties.filter(p => p.status === 'active');
  
  // Filtrar por tab ativa e publicação
  const tabFilteredProperties = React.useMemo(() => {
    let filtered = activeProperties;
    
    // Debug: contar configurações
    const totalActive = activeProperties.length;
    const withPublishedPages = activeProperties.filter(p => {
      const pp = Array.isArray(p.published_pages) ? p.published_pages : [];
      return pp.length > 0;
    }).length;
    const withZugruppe = activeProperties.filter(p => 
      (Array.isArray(p.published_pages) ? p.published_pages : []).includes("zugruppe")
    ).length;
    const withZuhaus = activeProperties.filter(p => 
      (Array.isArray(p.published_pages) ? p.published_pages : []).includes("zuhaus")
    ).length;
    const withZuhandel = activeProperties.filter(p => 
      (Array.isArray(p.published_pages) ? p.published_pages : []).includes("zuhandel")
    ).length;
    
    console.log('[Website Debug]', {
      totalActive,
      withPublishedPages,
      configured: { zugruppe: withZugruppe, zuhaus: withZuhaus, zuhandel: withZuhandel },
      activeTab
    });
    
    // Filtrar por publicação: apenas mostrar imóveis publicados na página correta
    filtered = filtered.filter(p => {
      const publishedPages = Array.isArray(p.published_pages) ? p.published_pages : [];
      
      // Se não tem published_pages definido OU está vazio, não mostrar
      if (!publishedPages || publishedPages.length === 0) {
        console.log('[Website] Rejected (no pages):', p.ref_id || p.id);
        return false;
      }
      
      // Verificar se está publicado na página correspondente à tab
      if (activeTab === "residential") {
        const isResidential = RESIDENTIAL_TYPES.includes(p.property_type);
        const hasZuhaus = publishedPages.includes("zuhaus");
        const pass = hasZuhaus && isResidential;
        if (!pass) {
          console.log('[Website] Rejected (residential):', p.ref_id || p.id, { 
            type: p.property_type, 
            isResidential, 
            hasZuhaus, 
            publishedPages 
          });
        }
        return pass;
      } else if (activeTab === "commercial") {
        const isCommercial = COMMERCIAL_TYPES.includes(p.property_type);
        const hasZuhandel = publishedPages.includes("zuhandel");
        const pass = hasZuhandel && isCommercial;
        if (!pass) {
          console.log('[Website] Rejected (commercial):', p.ref_id || p.id, { 
            type: p.property_type, 
            isCommercial, 
            hasZuhandel, 
            publishedPages 
          });
        }
        return pass;
      } else {
        const hasZugruppe = publishedPages.includes("zugruppe");
        if (!hasZugruppe) {
          console.log('[Website] Rejected (all):', p.ref_id || p.id, { publishedPages });
        }
        return hasZugruppe;
      }
    });
    
    console.log('[Website] Filtered result:', filtered.length, 'properties');
    return filtered;
  }, [activeTab, activeProperties]);

  const allCities = [...new Set(tabFilteredProperties.map(p => p.city).filter(Boolean))].sort();
  const featuredProperties = activeProperties.filter(p => p.featured && p.published_pages?.length > 0).slice(0, 4);

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

    const matchesPrice = 
      (!priceMin || property.price >= Number(priceMin)) &&
      (!priceMax || property.price <= Number(priceMax));

    // Advanced filters
    const area = property.useful_area || property.square_feet || 0;
    const pricePerSqm = area > 0 ? property.price / area : 0;
    const matchesPricePerSqm = !debouncedPricePerSqm[1] || debouncedPricePerSqm[1] === dataRanges.maxPricePerSqm ||
      (pricePerSqm >= debouncedPricePerSqm[0] && pricePerSqm <= debouncedPricePerSqm[1]);

    const matchesYearBuilt = !debouncedYearBuilt[1] || debouncedYearBuilt[1] === dataRanges.maxYear ||
      !property.year_built || (property.year_built >= debouncedYearBuilt[0] && property.year_built <= debouncedYearBuilt[1]);
    
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
    setPriceMin("");
    setPriceMax("");
    setCity("all");
    setCountry("all");
    setDistrict("all");
    setAvailability("all");
    setPricePerSqmRange([0, dataRanges.maxPricePerSqm]);
    setYearBuiltRange([dataRanges.minYear, dataRanges.maxYear]);
    setEnergyCertificate("all");
    setParking("all");
    setSelectedAmenities([]);
    setCurrentPage(1);
  };

  const hasActiveFilters = listingType !== "all" || propertyType !== "all" || 
    bedrooms !== "all" || city !== "all" || priceMin || priceMax ||
    country !== "all" || district !== "all" || availability !== "all" ||
    pricePerSqmRange[0] > 0 || (pricePerSqmRange[1] < dataRanges.maxPricePerSqm && pricePerSqmRange[1] > 0) ||
    yearBuiltRange[0] > dataRanges.minYear || (yearBuiltRange[1] < dataRanges.maxYear && yearBuiltRange[1] > 0) ||
    energyCertificate !== "all" || parking !== "all" || selectedAmenities.length > 0;
  
  const advancedFilterCount = [
    pricePerSqmRange[0] > 0 || (pricePerSqmRange[1] < dataRanges.maxPricePerSqm && pricePerSqmRange[1] > 0),
    yearBuiltRange[0] > dataRanges.minYear || (yearBuiltRange[1] < dataRanges.maxYear && yearBuiltRange[1] > 0),
    energyCertificate !== "all",
    parking !== "all",
    selectedAmenities.length > 0
  ].filter(Boolean).length;

  React.useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, listingType, propertyType, bedrooms, city, priceMin, priceMax, sortBy, country, district, availability, energyCertificate, parking, selectedAmenities]);
  
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

  // Handle toggle favorite
  const handleToggleFavorite = async (property) => {
    if (isFavorite(property.id)) {
      await removeFavorite(property.id);
      toast.success('Imóvel removido dos favoritos');
    } else {
      const result = await addFavorite(property);
      toast.success('Imóvel adicionado aos favoritos');
      
      // Show register prompt if user has 3 favorites
      if (result === 'prompt_register') {
        setTimeout(() => setShowRegisterPrompt(true), 500);
      }
    }
  };

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

  // SEO dinâmico baseado em filtros ativos
  const generateDynamicSEO = () => {
    const baseTitles = {
      all: locale === 'en' ? "Properties" : locale === 'es' ? "Propiedades" : locale === 'fr' ? "Propriétés" : "Imóveis",
      residential: locale === 'en' ? "Residential Properties" : locale === 'es' ? "Propiedades Residenciales" : locale === 'fr' ? "Propriétés Résidentielles" : "Imóveis Residenciais",
      commercial: locale === 'en' ? "Commercial Spaces" : locale === 'es' ? "Espacios Comerciales" : locale === 'fr' ? "Espaces Commerciaux" : "Espaços Comerciais"
    };

    const parts = [baseTitles[activeTab]];
    const keywordParts = [];

    // Tipo de imóvel
    if (propertyType !== "all") {
      const typeLabel = propertyTypeLabels[propertyType];
      parts.push(typeLabel);
      keywordParts.push(typeLabel.toLowerCase());
    }

    // Tipologia
    if (bedrooms !== "all") {
      const bedroomLabel = `T${bedrooms}`;
      parts.push(bedroomLabel);
      keywordParts.push(bedroomLabel.toLowerCase());
    }

    // Localização
    if (city !== "all") {
      parts.push(city);
      keywordParts.push(city.toLowerCase());
    } else if (district !== "all") {
      parts.push(district);
      keywordParts.push(district.toLowerCase());
    }

    // Tipo de negócio
    if (listingType !== "all") {
      const typeLabel = listingType === "sale" ? "Venda" : "Arrendamento";
      parts.push(`para ${typeLabel}`);
      keywordParts.push(typeLabel.toLowerCase());
    }

    // Preço
    if (priceMax) {
      parts.push(`até €${Number(priceMax).toLocaleString()}`);
    }

    const title = parts.join(" | ") + " | Zugruppe";

    // Descrição dinâmica
    let description = `${filteredProperties.length} ${parts.join(" ")}`;
    if (filteredProperties.length === 0) {
      description = `Procura por ${parts.join(" ").toLowerCase()}. Explore outras opções disponíveis.`;
    } else {
      description += ` disponíveis. Explore imóveis de qualidade com fotos, características e localização.`;
    }

    // Keywords
    const baseKeywords = ["imóveis", "portugal", "zugruppe"];
    if (activeTab === "residential") baseKeywords.push("apartamentos", "moradias", "casas");
    if (activeTab === "commercial") baseKeywords.push("lojas", "escritórios", "armazéns");

    const keywords = [...baseKeywords, ...keywordParts].join(", ");

    return { title, description, keywords };
  };

  const dynamicSEO = generateDynamicSEO();

  // Generate alternate language URLs
  const currentURL = typeof window !== 'undefined' ? window.location.href : '';
  const baseURL = currentURL.split('?')[0];
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const alternateLanguages = ['pt', 'en', 'es', 'fr'].map(lang => {
    const params = new URLSearchParams(searchParams);
    params.set('lang', lang);
    return {
      locale: lang === 'pt' ? 'pt-PT' : lang === 'en' ? 'en-US' : lang === 'es' ? 'es-ES' : 'fr-FR',
      url: `${baseURL}?${params.toString()}`
    };
  });

  return (
    <ErrorBoundary name="Website Page">
      <HelmetProvider>
        <div className="min-h-screen bg-slate-50">
        {/* Visitor Tracking */}
        <VisitorTracker pageType="website" pageTitle="ZuGruppe - Browse Properties" />
        
        <SEOHead
          title={dynamicSEO.title}
          description={dynamicSEO.description}
          keywords={dynamicSEO.keywords}
          type="website"
          image="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6915a593b6edd8435f5838bd/359538617_Zugruppe01.jpg"
          url={typeof window !== 'undefined' ? window.location.href : ''}
          structuredData={{
            "@context": "https://schema.org",
            "@type": "RealEstateAgent",
            "name": "Zugruppe",
            "description": dynamicSEO.description,
            "url": "https://zugruppe.base44.app",
            "logo": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6915a593b6edd8435f5838bd/359538617_Zugruppe01.jpg",
            "areaServed": "Portugal",
            "knowsAbout": ["Residential Real Estate", "Commercial Real Estate", "Property Management"],
            "numberOfItems": filteredProperties.length,
            "priceRange": `€${Math.min(...filteredProperties.map(p => p.price || 0))} - €${Math.max(...filteredProperties.map(p => p.price || 0))}`,
            "address": {
              "@type": "PostalAddress",
              "addressCountry": "PT",
              "addressLocality": "Lisboa"
            },
            "telephone": "+351234026615",
            "email": "info@zuconnect.pt"
          }}
          alternateLanguages={alternateLanguages}
        />
      {/* Admin Tools - Floating Button */}
      {isAdmin && (
        <div className="fixed bottom-6 left-6 z-50">
          <Button
            onClick={() => setShowWebsiteTools(!showWebsiteTools)}
            className="w-14 h-14 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700"
          >
            <Settings className="w-6 h-6" />
          </Button>
        </div>
      )}

      {/* Website Tools Panel */}
      {showWebsiteTools && isAdmin && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900">Ferramentas do Website</h2>
              <Button variant="ghost" onClick={() => setShowWebsiteTools(false)}>
                Fechar
              </Button>
            </div>
            <div className="p-6">
              <Tabs defaultValue="landing" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="landing">Landing Pages</TabsTrigger>
                  <TabsTrigger value="forms">Formulários Dinâmicos</TabsTrigger>
                  <TabsTrigger value="seo">Gestor de SEO</TabsTrigger>
                </TabsList>
                <TabsContent value="landing" className="mt-6">
                  <LandingPageBuilder />
                </TabsContent>
                <TabsContent value="forms" className="mt-6">
                  <DynamicFormBuilder />
                </TabsContent>
                <TabsContent value="seo" className="mt-6">
                  <SEOManager />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      )}

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
              <CardContent className="p-3 sm:p-4 md:p-6">
                {/* Tabs de Categoria */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-3 sm:mb-4">
                  <TabsList className="grid grid-cols-3 w-full h-auto">
                    <TabsTrigger value="all" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 text-xs sm:text-sm">
                      <Building2 className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="hidden sm:inline">{t('pages.zugruppe.all')}</span>
                      <span className="sm:hidden">{t('common.all')}</span>
                    </TabsTrigger>
                    <TabsTrigger value="residential" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 text-xs sm:text-sm">
                      <Home className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="hidden sm:inline">{t('pages.zugruppe.residential')}</span>
                      <span className="sm:hidden">{locale === 'en' ? 'Home' : 'Residencial'}</span>
                    </TabsTrigger>
                    <TabsTrigger value="commercial" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 text-xs sm:text-sm">
                      <Building2 className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="hidden sm:inline">{t('pages.zugruppe.commercial')}</span>
                      <span className="sm:hidden">{locale === 'en' ? 'Shop' : 'Comercial'}</span>
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                {/* Quick Filter Tabs */}
                <div className="flex gap-1.5 sm:gap-2 mb-3 sm:mb-4 overflow-x-auto pb-2 -mx-1 px-1">
                  <Button 
                    variant={listingType === "all" ? "default" : "outline"}
                    onClick={() => setListingType("all")}
                    size="sm"
                    className="whitespace-nowrap flex-1 sm:flex-initial text-xs sm:text-sm"
                  >
                    {t('common.all')}
                  </Button>
                  <Button 
                    variant={listingType === "sale" ? "default" : "outline"}
                    onClick={() => setListingType("sale")}
                    size="sm"
                    className="whitespace-nowrap flex-1 sm:flex-initial text-xs sm:text-sm"
                  >
                    🏷️ {t('property.listing.buy')}
                  </Button>
                  <Button 
                    variant={listingType === "rent" ? "default" : "outline"}
                    onClick={() => setListingType("rent")}
                    size="sm"
                    className="whitespace-nowrap flex-1 sm:flex-initial text-xs sm:text-sm"
                  >
                    🔑 {t('property.listing.toRent')}
                  </Button>
                </div>

                {/* Main Search */}
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 sm:w-5 sm:h-5" />
                    <Input
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder={t('property.search.searchPlaceholder')}
                      className="pl-10 sm:pl-12 h-10 sm:h-12 text-sm sm:text-base md:text-lg border-slate-200"
                    />
                  </div>
                  <Select value={city} onValueChange={setCity}>
                    <SelectTrigger className="w-full sm:w-40 md:w-48 h-10 sm:h-12 text-sm sm:text-base">
                      <MapPin className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 text-slate-400" />
                      <SelectValue placeholder={t('property.details.city')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('property.search.allCities')}</SelectItem>
                      {allCities.map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button 
                    onClick={() => setShowFilters(!showFilters)}
                    variant="outline"
                    className="h-10 sm:h-12 gap-1 sm:gap-2 text-sm sm:text-base"
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                    <span>{t('property.search.filters')}</span>
                    {hasActiveFilters && (
                      <Badge className="bg-blue-600 text-white ml-1 text-xs">
                        {[listingType !== "all", propertyType !== "all", bedrooms !== "all", city !== "all", priceMin, priceMax].filter(Boolean).length}
                      </Badge>
                    )}
                  </Button>
                </div>

                {/* Extended Filters */}
                {(showFilters || layout.showFiltersExpanded) && (
                  <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-slate-200 space-y-3 sm:space-y-4">
                    {/* Row 1: Natureza, Quartos, Preço Min/Max */}
                    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
                      <div>
                        <label className="text-xs font-medium text-slate-600 mb-1 sm:mb-1.5 block">Natureza</label>
                        <Select value={propertyType} onValueChange={setPropertyType}>
                          <SelectTrigger className="h-9 sm:h-10 text-xs sm:text-sm">
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
                        <label className="text-xs font-medium text-slate-600 mb-1 sm:mb-1.5 block">Quartos</label>
                        <Select value={bedrooms} onValueChange={setBedrooms}>
                          <SelectTrigger className="h-9 sm:h-10 text-xs sm:text-sm">
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
                        <label className="text-xs font-medium text-slate-600 mb-1 sm:mb-1.5 block">Preço Min</label>
                        <Input
                          type="number"
                          placeholder="€0"
                          value={priceMin}
                          onChange={(e) => setPriceMin(e.target.value)}
                          className="h-9 sm:h-10 text-xs sm:text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-600 mb-1 sm:mb-1.5 block">Preço Max</label>
                        <Input
                          type="number"
                          placeholder="€∞"
                          value={priceMax}
                          onChange={(e) => setPriceMax(e.target.value)}
                          className="h-9 sm:h-10 text-xs sm:text-sm"
                        />
                      </div>
                    </div>

                    {/* Row 1.5: Disponibilidade */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
                      <div className="col-span-1">
                        <label className="text-xs font-medium text-slate-600 mb-1 sm:mb-1.5 block">Disponibilidade</label>
                        <Select value={availability} onValueChange={setAvailability}>
                          <SelectTrigger className="h-9 sm:h-10 text-xs sm:text-sm">
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
                    </div>

                    {/* Row 2: País, Distrito, Concelho */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
                      <div>
                        <label className="text-xs font-medium text-slate-600 mb-1 sm:mb-1.5 block">País</label>
                        <Select value={country} onValueChange={setCountry}>
                          <SelectTrigger className="h-9 sm:h-10 text-xs sm:text-sm">
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
                        <label className="text-xs font-medium text-slate-600 mb-1 sm:mb-1.5 block">Distrito</label>
                        <Select value={district} onValueChange={setDistrict}>
                          <SelectTrigger className="h-9 sm:h-10 text-xs sm:text-sm">
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
                        <label className="text-xs font-medium text-slate-600 mb-1 sm:mb-1.5 block">Concelho</label>
                        <Select value={city} onValueChange={setCity} disabled={district === "all"}>
                          <SelectTrigger className="h-9 sm:h-10 text-xs sm:text-sm">
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
                          <Star className="w-4 h-4 text-blue-600" />
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
                              max={dataRanges.maxPricePerSqm}
                              step={Math.ceil(dataRanges.maxPricePerSqm / 100)}
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
                              min={dataRanges.minYear}
                              max={dataRanges.maxYear}
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
                          {priceMin && (
                            <Badge variant="secondary" className="gap-1">
                              Min: €{Number(priceMin).toLocaleString()}
                              <X className="w-3 h-3 cursor-pointer" onClick={() => setPriceMin("")} />
                            </Badge>
                          )}
                          {priceMax && (
                            <Badge variant="secondary" className="gap-1">
                              Max: €{Number(priceMax).toLocaleString()}
                              <X className="w-3 h-3 cursor-pointer" onClick={() => setPriceMax("")} />
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
                          {(pricePerSqmRange[0] > 0 || (pricePerSqmRange[1] < dataRanges.maxPricePerSqm && pricePerSqmRange[1] > 0)) && (
                            <Badge variant="secondary" className="gap-1">
                              €{pricePerSqmRange[0]}-{pricePerSqmRange[1]}/m²
                              <X className="w-3 h-3 cursor-pointer" onClick={() => setPricePerSqmRange([0, dataRanges.maxPricePerSqm])} />
                            </Badge>
                          )}
                          {(yearBuiltRange[0] > dataRanges.minYear || (yearBuiltRange[1] < dataRanges.maxYear && yearBuiltRange[1] > 0)) && (
                            <Badge variant="secondary" className="gap-1">
                              {yearBuiltRange[0]}-{yearBuiltRange[1]}
                              <X className="w-3 h-3 cursor-pointer" onClick={() => setYearBuiltRange([dataRanges.minYear, dataRanges.maxYear])} />
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

      {/* Exit Intent Popup */}
      <ExitIntentPopup />

      {/* AI Chat Widget */}
      <AIChatWidget />

      {/* Register Prompt for Guests */}
      <RegisterPromptDialog 
        open={showRegisterPrompt} 
        onOpenChange={setShowRegisterPrompt}
        favoritesCount={favoritesCount}
      />

      {/* Featured Properties */}
      {layout.showFeatured && featuredProperties.length > 0 && !hasActiveFilters && !debouncedSearch && (
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-8 sm:py-12">
          <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
            <div className="p-1.5 sm:p-2 bg-amber-100 rounded-lg">
              <Star className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-lg sm:text-2xl font-bold text-slate-900">Imóveis em Destaque</h2>
              <p className="text-xs sm:text-base text-slate-600 hidden sm:block">As melhores oportunidades selecionadas para si</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {featuredProperties.map((property, index) => (
              <PropertyCardCompact 
                key={property.id} 
                property={property} 
                featured 
                index={index} 
                t={t} 
                locale={locale}
                onToggleFavorite={handleToggleFavorite}
                isFavorited={isFavorite(property.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Results Section */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-6 sm:py-8">
        {/* Results Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div>
            <h2 className="text-base sm:text-xl font-bold text-slate-900">
              {filteredProperties.length} {activeTab === "residential" ? t('property.results.residential') : activeTab === "commercial" ? t('property.results.commercial') : (locale === 'en' ? 'properties' : 'imóveis')}
            </h2>
            {hasActiveFilters && (
              <p className="text-xs sm:text-sm text-slate-600">{t('property.results.withFilters')}</p>
            )}
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-36 sm:w-44 h-9 sm:h-10 text-xs sm:text-sm">
                <SelectValue placeholder={t('property.search.sortBy')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">{t('property.search.recent')}</SelectItem>
                <SelectItem value="price_asc">{t('property.search.priceAsc')}</SelectItem>
                <SelectItem value="price_desc">{t('property.search.priceDesc')}</SelectItem>
                <SelectItem value="area">{t('property.search.area')}</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex border rounded-lg overflow-hidden">
              <Button 
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => { setViewMode("grid"); setShowMapView(false); }}
                className="rounded-none h-9 w-9 p-0"
                title="Vista Grid"
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
              <Button 
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => { setViewMode("list"); setShowMapView(false); }}
                className="rounded-none h-9 w-9 p-0 hidden sm:flex"
                title="Vista Lista"
              >
                <List className="w-4 h-4" />
              </Button>
              <Button 
                variant={showMapView ? "default" : "ghost"}
                size="sm"
                onClick={() => setShowMapView(!showMapView)}
                className="rounded-none h-9 w-9 p-0"
                title="Vista Mapa"
              >
                <MapPin className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Map View */}
        {showMapView && paginatedProperties.length > 0 && (
          <div className="mb-8">
            <PropertiesMap 
              properties={sortedProperties} 
              brandColor={
                activeTab === "residential" ? "#d22630" : 
                activeTab === "commercial" ? "#75787b" : 
                "#3b82f6"
              }
              height="600px"
            />
          </div>
        )}

        {/* Properties Grid/List */}
        {paginatedProperties.length > 0 ? (
          <>
            {/* Pré-carregar imagens da próxima página (apenas primeiras 4) */}
            <ImagePreloader 
              images={sortedProperties.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE)
                .flatMap(p => p.images?.[0] || [])
                .filter(Boolean)
                .slice(0, 4)}
            />
            
            <div className={viewMode === "grid" 
              ? `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 ${layout.gridColumns === 4 ? 'xl:grid-cols-4' : ''} gap-3 sm:gap-4 lg:gap-5`
              : "space-y-3 sm:space-y-4"
            }>
              {paginatedProperties.map((property, index) => (
                viewMode === "grid" 
                  ? <PropertyCardCompact 
                      key={property.id} 
                      property={property} 
                      index={index} 
                      t={t} 
                      locale={locale}
                      onToggleFavorite={handleToggleFavorite}
                      isFavorited={isFavorite(property.id)}
                    />
                  : <PropertyCardList 
                      key={property.id} 
                      property={property} 
                      index={index} 
                      t={t} 
                      locale={locale}
                      onToggleFavorite={handleToggleFavorite}
                      isFavorited={isFavorite(property.id)}
                    />
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
              {t('property.results.noProperties')}
            </h3>
            <p className="text-slate-600 mb-6 max-w-md mx-auto">
              {t('property.results.adjustFilters')}
            </p>
            <Button onClick={clearFilters}>
              {t('common.clearAll')}
            </Button>
          </div>
        )}
      </div>

      {/* Contact Section */}
      <SmartContactSection
        title={activeTab === "residential" 
          ? "Encontre o Seu Lar Ideal"
          : activeTab === "commercial"
          ? "O Espaço Perfeito para o Seu Negócio"
          : "Como Podemos Ajudar?"}
        subtitle={activeTab === "residential"
          ? "A nossa equipa está pronta para o ajudar a encontrar a casa dos seus sonhos"
          : activeTab === "commercial"
          ? "Soluções comerciais personalizadas para o seu sucesso"
          : "Preencha o formulário e entraremos em contacto consigo"}
        showContactInfo={true}
        className={activeTab === "residential"
          ? "bg-gradient-to-br from-red-50 to-pink-50"
          : activeTab === "commercial"
          ? "bg-gradient-to-br from-slate-50 to-gray-100"
          : "bg-gradient-to-br from-blue-50 to-indigo-50"}
      />

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

        {/* Floating Home Button - Only for authenticated users */}
        {user && (
          <Link to={createPageUrl("Home")} className="fixed bottom-6 right-6 z-50 group">
            <button className="w-14 h-14 bg-white shadow-lg rounded-full flex items-center justify-center hover:shadow-xl transition-all duration-200 hover:scale-110 border-2 border-slate-200">
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6915a593b6edd8435f5838bd/359538617_Zugruppe01.jpg"
                alt="Zugruppe"
                className="w-10 h-10 object-contain"
              />
            </button>
          </Link>
        )}
        </HelmetProvider>
        );
        }

// Compact Card for Grid View - Highly Optimized Memoization
const PropertyCardCompact = React.memo(({ property, featured, index, t, locale, onToggleFavorite, isFavorited }) => {
  const [imgIndex, setImgIndex] = React.useState(0);
  const images = property.images?.length > 0 ? property.images : [];
  const translatedProperty = useTranslatedProperty(property);

  return (
    <div className="group bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 border border-slate-100 relative">
      <Link 
        to={`${createPageUrl("PropertyDetails")}?id=${property.id}`}
        className="block"
      >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
        {images[imgIndex] ? (
          <OptimizedImage
            src={images[imgIndex]}
            alt={property.title}
            width={800}
            height={600}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="w-full h-full"
            priority={index < 4}
            quality={80}
            blur={true}
            fallbackIcon={Home}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
            <Home className="w-12 h-12 text-slate-300" />
          </div>
        )}

        {/* Image Navigation */}
        {images.length > 1 && (
          <>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
              {images.slice(0, 5).map((_, i) => (
                <button
                  key={i}
                  onClick={(e) => { e.preventDefault(); setImgIndex(i); }}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${i === imgIndex ? 'bg-white w-4' : 'bg-white/60'}`}
                />
              ))}
            </div>
          </>
        )}
        
        {/* Badges */}
        <div className="absolute top-3 left-3 flex gap-2 flex-wrap">
          {featured && (
            <Badge className="bg-amber-400 text-slate-900 border-0">
              <Star className="w-3 h-3 mr-1" />
              {t('common.featured')}
            </Badge>
          )}
          <Badge className="bg-white/95 text-slate-800 border-0">
            {t(`property.listing.${property.listing_type}`)}
          </Badge>
        </div>

        {/* Price */}
        <div className="absolute bottom-2 right-2">
          <div className="bg-white/95 backdrop-blur-sm shadow-sm px-1.5 py-0.5 rounded border border-slate-200">
            <div className="text-[10px] font-bold text-slate-900">
              {CURRENCY_SYMBOLS[property.currency] || '€'}{property.price?.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 sm:p-4">
        <h3 className="font-semibold text-sm sm:text-base text-slate-900 line-clamp-1 group-hover:text-blue-600 transition-colors mb-1">
          {translatedProperty?.title || property.title}
        </h3>
        <p className="text-xs sm:text-sm text-slate-500 flex items-center gap-1 mb-2 sm:mb-3">
          <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
          <span className="truncate">{property.city}</span>
        </p>
        
        <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-slate-600">
          {(property.bedrooms !== undefined && property.bedrooms !== null) && (
            <span className="flex items-center gap-1">
              <Bed className="w-3 h-3 sm:w-4 sm:h-4" />
              T{property.bedrooms}
            </span>
          )}
          {property.bathrooms > 0 && (
            <span className="flex items-center gap-1">
              <Bath className="w-3 h-3 sm:w-4 sm:h-4" />
              {property.bathrooms}
            </span>
          )}
          {(property.useful_area || property.square_feet) > 0 && (
            <span className="flex items-center gap-1">
              <Maximize className="w-3 h-3 sm:w-4 sm:h-4" />
              {property.useful_area || property.square_feet}m²
            </span>
          )}
        </div>

        <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-slate-100 flex items-center gap-1.5 sm:gap-2 flex-wrap">
          {property.ref_id && (
            <Badge className="bg-slate-900 text-white border-0 text-[10px] sm:text-xs font-mono px-1.5 sm:px-2 py-0.5">
              {property.ref_id}
            </Badge>
          )}
          <Badge variant="outline" className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5">
            {t(`property.types.${property.property_type}`) || property.property_type}
          </Badge>
        </div>
      </div>
      </Link>

      {/* Favorite Button */}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggleFavorite?.(property);
        }}
        className="absolute top-3 right-3 w-9 h-9 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110 z-10"
      >
        <Heart className={`w-5 h-5 ${isFavorited ? 'fill-red-500 text-red-500' : 'text-slate-600'}`} />
      </button>
    </div>
    );
    }, (prevProps, nextProps) => {
    // Custom comparison for better performance
    return prevProps.property.id === nextProps.property.id &&
         prevProps.isFavorited === nextProps.isFavorited &&
         prevProps.locale === nextProps.locale;
    });

    // List Card for List View - Highly Optimized Memoization
    const PropertyCardList = React.memo(({ property, index, t, locale, onToggleFavorite, isFavorited }) => {
    const image = property.images?.[0];
    const translatedProperty = useTranslatedProperty(property);

    return (
    <div className="group flex bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all border border-slate-100 relative">
      <Link 
        to={`${createPageUrl("PropertyDetails")}?id=${property.id}`}
        className="flex flex-1"
      >
      {/* Image */}
      <div className="relative w-72 flex-shrink-0 overflow-hidden bg-slate-100">
        {image ? (
          <OptimizedImage
            src={image}
            alt={property.title}
            width={640}
            height={480}
            sizes="288px"
            className="w-full h-full"
            priority={index < 3}
            quality={80}
            blur={true}
            fallbackIcon={Home}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Home className="w-12 h-12 text-slate-300" />
          </div>
        )}
        <Badge className="absolute top-3 left-3 bg-white/95 text-slate-800 border-0">
          {t(`property.listing.${property.listing_type}`)}
        </Badge>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 sm:p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-3 sm:gap-4">
            <div className="flex-1 min-w-0">
              <h3 className="text-base sm:text-lg font-semibold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2 sm:line-clamp-1">
                {translatedProperty?.title || property.title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 flex items-center gap-1 mt-1">
                <MapPin className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="truncate">{property.city}{property.address && `, ${property.address}`}</span>
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-base sm:text-xl font-bold text-slate-900">
                {CURRENCY_SYMBOLS[property.currency] || '€'}{property.price?.toLocaleString()}
              </div>
              {property.listing_type === 'rent' && (
                <span className="text-[10px] sm:text-xs text-slate-500">/mês</span>
              )}
              {property.currency && property.currency !== 'EUR' && (() => {
                const eurValue = convertToEUR(property.price, property.currency);
                return eurValue ? (
                  <div className="text-[10px] sm:text-xs text-slate-500">
                    ≈ €{eurValue.toLocaleString()}
                  </div>
                ) : null;
              })()}
            </div>
          </div>
          
          {property.description && (
            <p className="text-xs sm:text-sm text-slate-600 mt-2 sm:mt-3 line-clamp-2 hidden sm:block">
              {property.description}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-slate-100">
          <div className="flex items-center gap-3 sm:gap-5 text-xs sm:text-sm text-slate-600">
            {(property.bedrooms !== undefined && property.bedrooms !== null) && (
              <span className="flex items-center gap-1 sm:gap-1.5">
                <Bed className="w-3 h-3 sm:w-4 sm:h-4" />
                T{property.bedrooms}
              </span>
            )}
            {property.bathrooms > 0 && (
              <span className="flex items-center gap-1 sm:gap-1.5">
                <Bath className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">{property.bathrooms} WC</span>
                <span className="sm:hidden">{property.bathrooms}</span>
              </span>
            )}
            {(property.useful_area || property.square_feet) > 0 && (
              <span className="flex items-center gap-1 sm:gap-1.5">
                <Maximize className="w-3 h-3 sm:w-4 sm:h-4" />
                {property.useful_area || property.square_feet}m²
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            {property.ref_id && (
              <Badge className="bg-slate-900 text-white border-0 text-[10px] sm:text-xs font-mono px-1.5 sm:px-2 py-0.5">
                {property.ref_id}
              </Badge>
            )}
            <Badge variant="outline" className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 hidden sm:inline-flex">
              {t(`property.types.${property.property_type}`) || property.property_type}
            </Badge>
          </div>
        </div>
      </div>
      </Link>

      {/* Favorite Button */}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggleFavorite?.(property);
        }}
        className="absolute top-4 right-4 w-10 h-10 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110 z-10"
      >
        <Heart className={`w-5 h-5 ${isFavorited ? 'fill-red-500 text-red-500' : 'text-slate-600'}`} />
      </button>
    </div>
  );
});