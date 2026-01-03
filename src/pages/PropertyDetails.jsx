import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import OptimizedImage from "../components/common/OptimizedImage";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  ArrowLeft, MapPin, Bed, Bath, Maximize, Calendar, 
  Home, Star, Heart, Edit, ExternalLink, Hash, MessageCircle,
  Phone, Mail, User, ChevronLeft, ChevronRight, X,
  Building2, Ruler, Zap, Wrench, Send, Loader2, Check, Camera, FileDown
} from "lucide-react";
import DynamicContactForm from "../components/forms/DynamicContactForm";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";
import PropertyCard from "../components/browse/PropertyCard";
import { CURRENCY_SYMBOLS, convertToEUR } from "../components/utils/currencyConverter";
import QuickAppointmentButton from "../components/crm/QuickAppointmentButton";
import { usePropertyEngagement } from "../components/website/PropertyEngagementTracker";
import { useTrackView } from "../components/portal/useTrackView";

// Import Leaflet components normally (lazy loading causes initialization issues)
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';

// Lazy load heavy management components only
const EditPropertyDialog = React.lazy(() => import("../components/listings/EditPropertyDialog"));
const MaintenanceManager = React.lazy(() => import("../components/property/MaintenanceManager"));
const LeaseManager = React.lazy(() => import("../components/property/LeaseManager"));
const PropertyDocumentManager = React.lazy(() => import("../components/property/PropertyDocumentManager"));
const PublicationStatus = React.lazy(() => import("../components/property/PublicationStatus"));
const PropertyQualityScore = React.lazy(() => import("../components/property/PropertyQualityScore"));
const AIPricingAnalysis = React.lazy(() => import("../components/property/AIPricingAnalysis"));
const PremiumAnalytics = React.lazy(() => import("../components/subscription/PremiumAnalytics"));
const PropertyBrochureGenerator = React.lazy(() => import("../components/property/PropertyBrochureGenerator"));
import { 
  generatePropertyMetaDescription, 
  generatePropertyKeywords, 
  generatePropertyStructuredData,
  generatePropertySEOUrl 
} from "../components/utils/seoHelpers";
import { useLocalization } from "../components/i18n/LocalizationContext";
import { QUERY_CONFIG } from "../components/utils/queryClient";
import SEOHead from "../components/seo/SEOHead";

import { HelmetProvider } from "react-helmet-async";
import VisitorTracker from "../components/tracking/VisitorTracker";
import { useTranslatedProperty } from "../components/i18n/TranslatedContent";
import MultiCurrencyPrice from "../components/property/MultiCurrencyPrice";
import InternationalSEO from "../components/seo/InternationalSEO";
import AutoTranslateButton from "../components/property/AutoTranslateButton";

export default function PropertyDetails() {
  const { t, locale } = useLocalization();
  
  // Auth check for admin features only - page is public
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  
  React.useEffect(() => {
    base44.auth.isAuthenticated().then(setIsAuthenticated).catch(() => setIsAuthenticated(false));
  }, []);

  const urlParams = new URLSearchParams(window.location.search);
  const propertyId = urlParams.get('id');
  const propertySlug = urlParams.get('slug');
  
  const [selectedImage, setSelectedImage] = React.useState(0);
  const [editingProperty, setEditingProperty] = React.useState(null);
  const [galleryOpen, setGalleryOpen] = React.useState(false);
  const [brochureOpen, setBrochureOpen] = React.useState(false);
  const [contactForm, setContactForm] = React.useState({
    name: '',
    email: '',
    phone: '',
    message: ''
  });
  const [sendingMessage, setSendingMessage] = React.useState(false);
  const [messageSent, setMessageSent] = React.useState(false);
  const [appointmentScheduled, setAppointmentScheduled] = React.useState(false);

  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  const queryClient = useQueryClient();
  
  const { data: property, isLoading, error } = useQuery({
    queryKey: ['property', propertyId, propertySlug],
    queryFn: async () => {
      console.log('[PropertyDetails] Fetching property - ID:', propertyId, 'Slug:', propertySlug);
      try {
        let properties;
        
        // Tentar primeiro por slug se disponível
        if (propertySlug) {
          properties = await base44.entities.Property.filter({ slug: propertySlug });
          console.log('[PropertyDetails] Found by slug:', properties?.length);
        }
        
        // Fallback para ID se slug não encontrou
        if (!properties || properties.length === 0) {
          if (propertyId) {
            properties = await base44.entities.Property.filter({ id: propertyId });
            console.log('[PropertyDetails] Found by ID:', properties?.length);
          }
        }
        
        if (!properties || properties.length === 0) {
          console.error('[PropertyDetails] No property found');
          throw new Error('Property not found');
        }
        
        console.log('[PropertyDetails] Property loaded:', properties[0].title);
        return properties[0];
      } catch (err) {
        console.error('[PropertyDetails] Error fetching property:', err);
        throw err;
      }
    },
    enabled: !!(propertyId || propertySlug),
    retry: 1,
    ...QUERY_CONFIG.singleProperty
  });

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      try {
        return await base44.auth.me();
      } catch {
        return null;
      }
    },
    ...QUERY_CONFIG.user
  });



  const { data: allProperties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: async () => {
      try {
        return await base44.entities.Property.list();
      } catch {
        return [];
      }
    },
    ...QUERY_CONFIG.properties
  });

  const { data: consultorProfiles = [] } = useQuery({
    queryKey: ['consultorProfiles'],
    queryFn: async () => {
      try {
        const profiles = await base44.entities.ConsultorProfile.filter({ is_active: true });
        console.log('[PropertyDetails] ConsultorProfiles loaded:', profiles.length);
        return profiles;
      } catch (error) {
        console.error('[PropertyDetails] Error loading consultor profiles:', error);
        return [];
      }
    },
    staleTime: 5 * 60 * 1000
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: async () => {
      try {
        const agentList = await base44.entities.Agent.filter({ is_active: true });
        console.log('[PropertyDetails] Agents loaded:', agentList.length);
        return agentList;
      } catch (error) {
        console.error('[PropertyDetails] Error loading agents:', error);
        return [];
      }
    },
    staleTime: 5 * 60 * 1000
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsersForConsultant'],
    queryFn: async () => {
      try {
        const users = await base44.entities.User.list();
        const sorted = users.sort((a, b) => {
          const nameA = a.display_name || a.full_name || a.email;
          const nameB = b.display_name || b.full_name || b.email;
          return nameA.localeCompare(nameB);
        });
        return sorted;
      } catch (error) {
        console.error('[PropertyDetails] Error loading users:', error);
        return [];
      }
    },
    staleTime: 0,
    cacheTime: 60000
  });

  // ALL CUSTOM HOOKS MUST BE CALLED UNCONDITIONALLY BEFORE ANY RETURNS

  const { trackAction } = usePropertyEngagement(propertyId, property?.title);
  useTrackView(propertyId, property, 'website');
  const translatedProperty = useTranslatedProperty(property);

  // ALL MUTATIONS MUST BE BEFORE CONDITIONAL RETURNS
  const updatePropertyMutation = useMutation({
    mutationFn: (data) => base44.entities.Property.update(propertyId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['property', propertyId] });
      toast.success("Imóvel atualizado!");
    },
  });



  // ALL MEMOIZED VALUES MUST BE BEFORE CONDITIONAL RETURNS
  const images = React.useMemo(() => {
    return property?.images && property.images.length > 0 
      ? property.images 
      : ["https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1200"];
  }, [property?.images]);

  const similarProperties = React.useMemo(() => {
    return allProperties
      .filter(p => 
        p.id !== propertyId &&
        p.status === 'active' &&
        p.visibility === 'public' &&
        p.published_pages?.length > 0 &&
        (p.city === property?.city || p.state === property?.state) &&
        p.property_type === property?.property_type
      )
      .slice(0, 3);
  }, [allProperties, propertyId, property?.city, property?.state, property?.property_type]);

  const isOwner = React.useMemo(() => {
    return user && (property?.created_by === user.email || user.role === 'admin' || user.user_type?.toLowerCase() === 'admin' || user.user_type?.toLowerCase() === 'gestor');
  }, [user, property?.created_by]);

  const assignedConsultant = React.useMemo(() => {
    if (!property) {
      return null;
    }

    // Prioridade 1: Buscar na entidade Agent pelo agent_id
    if (property.agent_id) {
      const agent = agents.find(a => a.id === property.agent_id || a.agent_id === property.agent_id);
      if (agent) {
        console.log('[PropertyDetails] Found agent by agent_id:', agent);
        return {
          email: agent.email,
          full_name: agent.full_name,
          display_name: agent.full_name,
          phone: agent.phone,
          whatsapp: agent.phone, // Usar phone como whatsapp se não houver campo separado
          photo_url: agent.photo_url,
          specialization: agent.specialization,
          bio: agent.bio,
          linkedin_url: agent.profile_url,
          instagram_url: null
        };
      }
    }

    // Prioridade 2: Buscar no ConsultorProfile pelo assigned_consultant (email)
    if (property.assigned_consultant) {
      const consultorProfile = consultorProfiles.find(p => p.user_email === property.assigned_consultant);
      
      if (consultorProfile) {
        console.log('[PropertyDetails] Found consultant profile:', consultorProfile);
        return {
          email: consultorProfile.user_email,
          full_name: consultorProfile.display_name,
          display_name: consultorProfile.display_name,
          phone: consultorProfile.phone,
          whatsapp: consultorProfile.whatsapp,
          photo_url: consultorProfile.photo_url,
          specialization: consultorProfile.specialization,
          bio: consultorProfile.bio,
          languages: consultorProfile.languages,
          linkedin_url: consultorProfile.linkedin_url,
          instagram_url: consultorProfile.instagram_url
        };
      }
    }

    // Prioridade 3: Campos diretos no Property (assigned_consultant_*)
    if (property.assigned_consultant_name || property.assigned_consultant_email) {
      console.log('[PropertyDetails] Using direct fields from property');
      return {
        email: property.assigned_consultant_email || property.assigned_consultant,
        full_name: property.assigned_consultant_name,
        display_name: property.assigned_consultant_name,
        phone: property.assigned_consultant_phone,
        whatsapp: property.assigned_consultant_phone,
        photo_url: property.assigned_consultant_photo,
        specialization: null,
        bio: null
      };
    }

    console.log('[PropertyDetails] No consultant found');
    return null;
  }, [property, agents, consultorProfiles]);

  const seoCanonicalUrl = React.useMemo(() => {
    if (property && typeof window !== 'undefined') {
      const baseUrl = window.location.origin;
      return `${baseUrl}${generatePropertySEOUrl(property)}?id=${property.id}`;
    }
    return typeof window !== 'undefined' ? window.location.href : '';
  }, [property]);

  const metaTitle = React.useMemo(() => {
    if (!property) return 'Zugruppe';
    
    const parts = [];
    const typeMap = {
      apartment: 'Apartamento',
      house: 'Moradia',
      land: 'Terreno',
      building: 'Prédio',
      farm: 'Quinta',
      store: 'Loja',
      warehouse: 'Armazém',
      office: 'Escritório'
    };
    
    // Tipologia + Tipo
    if (property.bedrooms !== undefined && property.bedrooms !== null) {
      parts.push(`T${property.bedrooms}`);
    }
    
    parts.push(typeMap[property.property_type] || property.property_type);
    
    // Localização
    if (property.city) parts.push(property.city);
    if (property.state && property.state !== property.city) parts.push(property.state);
    
    // Ação
    parts.push(property.listing_type === 'sale' ? 'Venda' : 'Arrendamento');
    
    // Área se relevante
    if (property.useful_area || property.square_feet) {
      parts.push(`${property.useful_area || property.square_feet}m²`);
    }
    
    // Preço
    if (property.price) {
      parts.push(`€${property.price.toLocaleString()}`);
    }
    
    return `${parts.join(' • ')} | Zugruppe`;
  }, [property]);
  const metaDescription = React.useMemo(() => property ? generatePropertyMetaDescription(property) : '', [property]);
  const metaKeywords = React.useMemo(() => property ? generatePropertyKeywords(property) : '', [property]);
  const propertyImage = React.useMemo(() => images[0], [images]);
  const structuredData = React.useMemo(() => property ? generatePropertyStructuredData(property, propertyImage) : null, [property, propertyImage]);

  const alternateLanguages = React.useMemo(() => [
    { locale: 'pt-PT', url: `${seoCanonicalUrl}&lang=pt` },
    { locale: 'en-US', url: `${seoCanonicalUrl}&lang=en` },
    { locale: 'es-ES', url: `${seoCanonicalUrl}&lang=es` },
    { locale: 'fr-FR', url: `${seoCanonicalUrl}&lang=fr` }
  ], [seoCanonicalUrl]);



  // Callback functions - stable references
  const handleWhatsAppShare = React.useCallback(() => {
    if (!property) return;
    const url = window.location.href;
    const text = `${property.title} - €${property.price?.toLocaleString()}\n${url}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank');
  }, [property]);

  const handleContactSubmit = React.useCallback(async (e) => {
    e.preventDefault();

    if (!contactForm.name || !contactForm.email || !contactForm.message) {
      toast.error("Por favor preencha todos os campos obrigatórios");
      return;
    }

    setSendingMessage(true);

    try {
      const { data } = await base44.functions.invoke('submitPublicContact', {
        name: contactForm.name,
        email: contactForm.email,
        phone: contactForm.phone,
        message: contactForm.message,
        property_id: property.id,
        property_title: property.title,
        source_page: 'PropertyDetails'
      });

      if (data.success) {
        toast.success("Mensagem enviada com sucesso!");

        // Track contact action (non-blocking, only if authenticated)
        if (user?.email) {
          try {
            trackAction('contacted', { 
              contact_name: contactForm.name,
              contact_email: contactForm.email 
            });
          } catch (trackError) {
            console.warn('[PropertyDetails] Tracking failed:', trackError);
          }
        }

        // Show confirmation and reset
        setContactForm({ name: '', email: '', phone: '', message: '' });
        setSendingMessage(false);
        setMessageSent(true);
      } else {
        throw new Error(data.error || 'Erro ao enviar mensagem');
      }
    } catch (error) {
      console.error('[PropertyDetails] Error sending message:', error);
      setSendingMessage(false);
      toast.error(`Erro ao enviar mensagem: ${error.message || 'Erro desconhecido'}`);
    }
  }, [property, contactForm, user?.email, trackAction]);

  const navigateGallery = React.useCallback((direction) => {
    if (!property?.images) return;
    const imgs = property.images;
    if (direction === 'prev') {
      setSelectedImage(prev => prev === 0 ? imgs.length - 1 : prev - 1);
    } else {
      setSelectedImage(prev => prev === imgs.length - 1 ? 0 : prev + 1);
    }
  }, [property?.images]);

  const handleConsultantChange = React.useCallback((email) => {
    updatePropertyMutation.mutate({
      assigned_consultant: email || null
    });
  }, [updatePropertyMutation]);

  const handleVisibilityChange = React.useCallback((visibility) => {
    updatePropertyMutation.mutate({ visibility });
  }, [updatePropertyMutation]);

  // Debug logging - now as effect
  React.useEffect(() => {
    console.log('[PropertyDetails] URL:', window.location.href);
    console.log('[PropertyDetails] Property ID:', propertyId);
    console.log('[PropertyDetails] Search params:', urlParams.toString());
  }, [propertyId]);

  // NOW SAFE TO DO CONDITIONAL RETURNS - ALL HOOKS CALLED ABOVE
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto mb-4" />
          <p className="text-slate-600">A carregar imóvel...</p>
          <p className="text-xs text-slate-400 mt-2">ID: {propertyId}</p>
        </div>
      </div>
    );
  }

  if (!propertyId && !propertySlug) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Imóvel não especificado</h2>
          <p className="text-slate-600 mb-4">O link está incompleto ou inválido</p>
          <Link to={createPageUrl("Website")}>
            <Button>Ver Imóveis</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (error || (!isLoading && !property)) {
    console.error('[PropertyDetails] Render error state:', { error, property, isLoading, propertyId });
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Imóvel não encontrado</h2>
          <p className="text-slate-600 mb-2">ID: {propertyId}</p>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 text-left">
              <p className="text-sm font-semibold text-red-900 mb-1">Erro:</p>
              <p className="text-xs text-red-700 font-mono">{error.message}</p>
            </div>
          )}
          <Link to={createPageUrl("Website")}>
            <Button>Ver Imóveis</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Constant lookups
  const energyCertificateColors = {
    'A+': 'bg-green-600 text-white',
    'A': 'bg-green-500 text-white',
    'B': 'bg-lime-500 text-white',
    'B-': 'bg-yellow-400 text-slate-900',
    'C': 'bg-yellow-500 text-slate-900',
    'D': 'bg-orange-500 text-white',
    'E': 'bg-orange-600 text-white',
    'F': 'bg-red-600 text-white',
    'isento': 'bg-slate-300 text-slate-700'
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

  const availabilityColors = {
    available: "bg-green-100 text-green-800 border-green-300",
    sold: "bg-red-100 text-red-800 border-red-300",
    reserved: "bg-amber-100 text-amber-800 border-amber-300",
    rented: "bg-blue-100 text-blue-800 border-blue-300",
    prospecting: "bg-purple-100 text-purple-800 border-purple-300",
    withdrawn: "bg-slate-100 text-slate-800 border-slate-300",
    pending_validation: "bg-orange-100 text-orange-800 border-orange-300"
  };

  return (
    <HelmetProvider>
      <div className="min-h-screen bg-slate-50">
        {/* Visitor Tracking */}
        {property && <VisitorTracker pageType="property" pageId={property.id} pageTitle={property.title} />}
        
        {/* SEO Meta Tags */}
        <SEOHead
          title={metaTitle}
          description={metaDescription}
          keywords={metaKeywords}
          image={propertyImage}
          url={seoCanonicalUrl}
          type="product"
          price={property.price}
          currency={property.currency || "EUR"}
          availability={property.availability_status === "available" ? "in stock" : "out of stock"}
          propertyType={property.property_type}
          location={{
            city: property.city,
            state: property.state,
            country: property.country || "Portugal"
          }}
          structuredData={structuredData}
          alternateLanguages={alternateLanguages}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-0 sm:justify-between mb-6">
          <Link to={createPageUrl("Website")} className="order-1 sm:order-none">
            <Button variant="outline" className="w-full sm:w-auto h-11 active:bg-slate-100">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('common.back')}
            </Button>
          </Link>

          <div className="flex flex-wrap gap-2 order-2 sm:order-none">
            {isOwner && (
              <Button
                variant="outline"
                onClick={() => setEditingProperty(property)}
                className="border-blue-500 text-blue-600 hover:bg-blue-50"
              >
                <Edit className="w-4 h-4 mr-2" />
                {t('common.edit')}
              </Button>
            )}
            

            
            <Button
              variant="outline"
              onClick={handleWhatsAppShare}
              className="bg-green-500 hover:bg-green-600 text-white border-0 h-11 active:bg-green-700"
            >
              <MessageCircle className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">{t('contact.shareProperty')}</span>
            </Button>

            {isAuthenticated && (
              <Button
                variant="outline"
                onClick={() => setBrochureOpen(true)}
                className="bg-blue-500 hover:bg-blue-600 text-white border-0"
              >
                <FileDown className="w-4 h-4 mr-2" />
                Brochura PDF
              </Button>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Main Content - Left Column */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6 order-2 lg:order-1">
            {/* Image Gallery */}
            <div className="bg-white rounded-xl sm:rounded-2xl overflow-hidden shadow-sm border border-slate-200">
              <div 
                className="relative h-64 sm:h-80 md:h-[500px] cursor-pointer group"
                onClick={() => setGalleryOpen(true)}
              >
                <OptimizedImage
                  src={images[selectedImage]}
                  alt={property.title}
                  className="w-full h-full"
                  priority={selectedImage === 0}
                />
                
                {/* Navigation Arrows */}
                {images.length > 1 && (
                  <>
                    <button
                      onClick={(e) => { 
                        e?.stopPropagation?.(); 
                        navigateGallery('prev'); 
                      }}
                      className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button
                      onClick={(e) => { 
                        e?.stopPropagation?.(); 
                        navigateGallery('next'); 
                      }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>
                  </>
                )}
                
                {/* View All Photos Button - Prominent */}
                <div className="absolute bottom-3 sm:bottom-4 right-3 sm:right-4 flex items-center gap-2">
                  <button
                    onClick={() => setGalleryOpen(true)}
                    className="flex items-center gap-1.5 sm:gap-2 bg-white hover:bg-slate-50 text-slate-900 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg shadow-lg font-semibold text-xs sm:text-sm transition-all hover:scale-105 border border-slate-200"
                  >
                    <Camera className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">{t('common.viewAll')} {images.length} {t('common.photos')}</span>
                    <span className="sm:hidden">{images.length} {t('common.photos')}</span>
                  </button>
                </div>
                
                {/* Badges */}
                <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                  {property.featured && (
                    <Badge className="bg-amber-400 text-slate-900 border-0">
                      <Star className="w-3 h-3 mr-1 fill-current" />
                      {t('common.featured')}
                    </Badge>
                  )}
                  <Badge className={availabilityColors[property.availability_status] || "bg-green-100 text-green-800"}>
                    {t(`property.status.${property.availability_status}`) || t('property.status.available')}
                  </Badge>
                </div>
              </div>
              
              {/* Thumbnail Strip */}
              {images.length > 1 && (
                <div className="flex gap-2 p-3 overflow-x-auto">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImage(idx)}
                      className={`flex-shrink-0 w-20 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                        selectedImage === idx ? 'border-amber-400 ring-2 ring-amber-200' : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Property Info Card */}
            <Card>
              <CardContent className="p-4 sm:p-6 md:p-8">
                {/* Header with Ref ID and Title */}
                <div className="mb-4 sm:mb-6">
                  {property.ref_id && (
                   <Badge variant="outline" className="mb-2 text-xs sm:text-sm font-mono">
                     <Hash className="w-3 h-3 mr-1" />
                     {property.ref_id}
                   </Badge>
                  )}
                  {isOwner && (
                   <div className="mb-3">
                     <AutoTranslateButton 
                       property={property}
                       onTranslated={(translations) => {
                         queryClient.invalidateQueries({ queryKey: ['property', propertyId] });
                       }}
                     />
                   </div>
                  )}
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 mb-2 sm:mb-3">{translatedProperty?.title || property.title}</h1>
                  <div className="flex items-start sm:items-center text-slate-600 text-sm sm:text-base md:text-lg">
                    <MapPin className="w-4 h-4 sm:w-5 sm:h-5 mr-2 flex-shrink-0 mt-0.5 sm:mt-0" />
                    <span className="leading-snug">
                      {property.address && `${property.address}, `}
                      {property.city}, {property.state}
                      {property.zip_code && ` - ${property.zip_code}`}
                      {property.country && property.country !== 'Portugal' && `, ${property.country}`}
                    </span>
                  </div>
                </div>

                {/* Price and Type */}
                <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4 pb-4 sm:pb-6 border-b border-slate-200">
                  <div>
                    <MultiCurrencyPrice
                      price={property.price}
                      currency={property.currency}
                      listingType={property.listing_type}
                      showAlternatives={true}
                      variant="full"
                    />
                    <div className="flex gap-1.5 sm:gap-2 mt-3 flex-wrap">
                      <Badge className="bg-slate-900 text-white text-xs sm:text-sm">
                        {t(`property.listing.${property.listing_type}`)}
                      </Badge>
                      <Badge variant="outline" className="text-xs sm:text-sm">
                        <Home className="w-3 h-3 mr-1" />
                        {t(`property.types.${property.property_type}`) || property.property_type}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Key Features Grid */}
                <div className="grid grid-cols-2 gap-3 py-4 sm:py-6 border-b border-slate-200">
                  <div className="text-center p-4 sm:p-4 bg-slate-50 rounded-xl min-h-[100px] flex flex-col justify-center">
                    <div className="w-10 h-10 sm:w-10 sm:h-10 bg-white rounded-lg flex items-center justify-center mx-auto mb-2 shadow-sm">
                      <Bed className="w-5 h-5 sm:w-5 sm:h-5 text-slate-700" />
                    </div>
                    <div className="text-2xl sm:text-2xl font-bold text-slate-900">{property.bedrooms || 0}</div>
                    <div className="text-sm sm:text-sm text-slate-600">{t('property.details.bedrooms')}</div>
                  </div>
                  <div className="text-center p-3 sm:p-4 bg-slate-50 rounded-xl">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white rounded-lg flex items-center justify-center mx-auto mb-1.5 sm:mb-2 shadow-sm">
                      <Bath className="w-4 h-4 sm:w-5 sm:h-5 text-slate-700" />
                    </div>
                    <div className="text-xl sm:text-2xl font-bold text-slate-900">{property.bathrooms || 0}</div>
                    <div className="text-xs sm:text-sm text-slate-600">{t('property.details.bathrooms')}</div>
                  </div>
                  <div className="text-center p-3 sm:p-4 bg-slate-50 rounded-xl">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white rounded-lg flex items-center justify-center mx-auto mb-1.5 sm:mb-2 shadow-sm">
                      <Maximize className="w-4 h-4 sm:w-5 sm:h-5 text-slate-700" />
                    </div>
                    <div className="text-xl sm:text-2xl font-bold text-slate-900">
                      {property.useful_area || property.square_feet || 0}
                    </div>
                    <div className="text-xs sm:text-sm text-slate-600">m²</div>
                  </div>
                  <div className="text-center p-3 sm:p-4 bg-slate-50 rounded-xl">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white rounded-lg flex items-center justify-center mx-auto mb-1.5 sm:mb-2 shadow-sm">
                      <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-slate-700" />
                    </div>
                    <div className="text-xl sm:text-2xl font-bold text-slate-900">{property.year_built || 'N/A'}</div>
                    <div className="text-xs sm:text-sm text-slate-600">{t('property.details.year')}</div>
                  </div>
                </div>

                {/* Areas, Energy Certificate, Details */}
                <div className="py-6 border-b border-slate-200">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">{t('property.details.propertyDetails')}</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {property.gross_area > 0 && (
                      <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                        <Ruler className="w-5 h-5 text-slate-500" />
                        <div>
                          <div className="text-sm text-slate-500">Área Bruta</div>
                          <div className="font-semibold">{property.gross_area} m²</div>
                        </div>
                      </div>
                    )}
                    {(property.useful_area || property.square_feet) > 0 && (
                      <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                        <Maximize className="w-5 h-5 text-slate-500" />
                        <div>
                          <div className="text-sm text-slate-500">Área Útil</div>
                          <div className="font-semibold">{property.useful_area || property.square_feet} m²</div>
                        </div>
                      </div>
                    )}
                    {property.front_count > 0 && (
                      <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                        <Building2 className="w-5 h-5 text-slate-500" />
                        <div>
                          <div className="text-sm text-slate-500">Frentes</div>
                          <div className="font-semibold">{property.front_count}</div>
                        </div>
                      </div>
                    )}
                    {property.year_renovated > 0 && (
                      <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                        <Wrench className="w-5 h-5 text-slate-500" />
                        <div>
                          <div className="text-sm text-slate-500">Renovado</div>
                          <div className="font-semibold">{property.year_renovated}</div>
                        </div>
                      </div>
                    )}
                    {property.energy_certificate && (
                      <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                        <Zap className="w-5 h-5 text-slate-500" />
                        <div>
                          <div className="text-sm text-slate-500">Cert. Energético</div>
                          <Badge className={`${energyCertificateColors[property.energy_certificate]} font-bold`}>
                            {property.energy_certificate === 'isento' ? 'Isento' : property.energy_certificate}
                          </Badge>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {property.finishes && (
                    <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <h4 className="font-semibold text-amber-900 mb-1">Acabamentos</h4>
                      <p className="text-amber-800">{property.finishes}</p>
                    </div>
                  )}
                </div>

                {/* Description */}
                <div className="py-6 border-b border-slate-200">
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">{t('property.details.description')}</h3>
                  <p className="text-slate-700 leading-relaxed whitespace-pre-line">
                    {translatedProperty?.description || property.description || (locale === 'en' ? 'No description available.' : 'Sem descrição disponível.')}
                  </p>
                </div>

                {/* Amenities */}
                {(translatedProperty?.amenities || property.amenities)?.length > 0 && (
                  <div className="py-6 border-b border-slate-200">
                    <h3 className="text-lg font-semibold text-slate-900 mb-3">{t('property.details.amenities')}</h3>
                    <div className="flex flex-wrap gap-2">
                      {(translatedProperty?.amenities || property.amenities).map((amenity, idx) => (
                        <Badge key={idx} variant="secondary" className="text-sm py-1.5 px-3">
                          <Check className="w-3 h-3 mr-1.5" />
                          {amenity}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tags */}
                {property.tags && property.tags.length > 0 && (
                  <div className="py-6">
                    <h3 className="text-lg font-semibold text-slate-900 mb-3">{t('property.details.tags')}</h3>
                    <div className="flex flex-wrap gap-2">
                      {property.tags.map((tag, idx) => (
                        <Badge key={idx} variant="outline" className="text-sm">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                </CardContent>
                </Card>

            {/* Map */}
            {property.city && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    {t('property.details.location')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <PropertyMap property={property} />
                  <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-slate-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-slate-700">
                        {property.address && <div className="font-medium">{property.address}</div>}
                        <div>{property.zip_code && `${property.zip_code} `}{property.city}, {property.state}</div>
                        {property.country && property.country !== 'Portugal' && (
                          <div className="text-slate-500 mt-1">{property.country}</div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* AI Features - Quality Score & Pricing */}
            {isOwner && (
              <React.Suspense fallback={<Card><CardContent className="p-8"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></CardContent></Card>}>
                <PropertyQualityScore property={property} />
                <AIPricingAnalysis property={property} />
                <PremiumAnalytics propertyId={property.id} />
              </React.Suspense>
            )}

            {/* Publication Status */}
            {isOwner && (
              <React.Suspense fallback={<Card><CardContent className="p-4"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></CardContent></Card>}>
                <PublicationStatus property={property} variant="detailed" />
              </React.Suspense>
            )}

            {/* Property Management Section */}
            {isOwner && (
              <Card>
                <CardHeader>
                  <CardTitle>Gestão do Imóvel</CardTitle>
                </CardHeader>
                <CardContent>
                  <React.Suspense fallback={<div className="py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>}>
                    <Tabs defaultValue="documents" className="w-full">
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="documents">Documentos</TabsTrigger>
                        <TabsTrigger value="maintenance">Manutenção</TabsTrigger>
                        <TabsTrigger value="leases">Arrendamentos</TabsTrigger>
                      </TabsList>

                      <TabsContent value="documents" className="mt-6">
                        <PropertyDocumentManager 
                          propertyId={propertyId} 
                          propertyTitle={property.title}
                        />
                      </TabsContent>

                      <TabsContent value="maintenance" className="mt-6">
                        <MaintenanceManager 
                          propertyId={propertyId} 
                          propertyTitle={property.title}
                        />
                      </TabsContent>

                      <TabsContent value="leases" className="mt-6">
                        <LeaseManager 
                          propertyId={propertyId} 
                          propertyTitle={property.title}
                          propertyAddress={`${property.address}, ${property.city}`}
                        />
                      </TabsContent>
                    </Tabs>
                  </React.Suspense>
                </CardContent>
              </Card>
            )}

            {/* Similar Properties */}
            {similarProperties.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>{t('property.details.similarProperties')}</CardTitle>
                  <p className="text-sm text-slate-600">{locale === 'en' ? 'Other properties in the same area' : 'Outros imóveis na mesma zona'}</p>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {similarProperties.map((prop) => (
                      <PropertyCard key={prop.id} property={prop} hideMetadata={true} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar - Right Column */}
          <div className="space-y-4 sm:space-y-6 order-1 lg:order-2">
            {/* Agent Card */}
            <Card className="lg:sticky lg:top-24">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Consultor Responsável</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Consultant Assignment (only for owners/admins) */}
                {isOwner && (
                  <div className="mb-4 pb-4 border-b">
                    <Label className="text-xs text-slate-500 mb-1 block">Atribuir Consultor</Label>
                    <Select 
                      value={property.assigned_consultant || ""} 
                      onValueChange={handleConsultantChange}
                      disabled={updatePropertyMutation.isPending}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecionar consultor..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={null}>Nenhum</SelectItem>
                        {allUsers.map((u) => (
                          <SelectItem key={u.id} value={u.email}>
                            {u.display_name || u.full_name || u.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Label className="text-xs text-slate-500 mb-1 mt-3 block">Visibilidade</Label>
                    <Select 
                      value={property.visibility || "public"} 
                      onValueChange={handleVisibilityChange}
                      disabled={updatePropertyMutation.isPending}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">Público</SelectItem>
                        <SelectItem value="team_only">Apenas Equipa</SelectItem>
                        <SelectItem value="private">Privado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {assignedConsultant ? (
                  <div className="space-y-4">
                    <ConsultantAvatar consultant={assignedConsultant} />

                    <div className="space-y-2">
                      {assignedConsultant.whatsapp && (
                        <a 
                          href={`https://wa.me/${assignedConsultant.whatsapp.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-green-700 hover:text-green-600 transition-colors"
                        >
                          <MessageCircle className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">WhatsApp</span>
                        </a>
                      )}
                      {assignedConsultant.phone && (
                        <a 
                          href={`tel:${assignedConsultant.phone}`}
                          className="flex items-center gap-2 text-slate-700 hover:text-blue-600 transition-colors"
                        >
                          <Phone className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">{assignedConsultant.phone}</span>
                        </a>
                      )}
                      {assignedConsultant.email && (
                        <a 
                          href={`mailto:${assignedConsultant.email}`}
                          className="flex items-center gap-2 text-slate-700 hover:text-blue-600 transition-colors"
                        >
                          <Mail className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">{assignedConsultant.email}</span>
                        </a>
                      )}
                    </div>

                    {assignedConsultant.bio && (
                      <p className="text-sm text-slate-600 pt-2 border-t">{assignedConsultant.bio}</p>
                    )}

                    {(assignedConsultant.linkedin_url || assignedConsultant.instagram_url) && (
                      <div className="flex gap-2 pt-2 border-t">
                        {assignedConsultant.linkedin_url && (
                          <a 
                            href={assignedConsultant.linkedin_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                        {assignedConsultant.instagram_url && (
                          <a 
                            href={assignedConsultant.instagram_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-pink-600 hover:text-pink-700"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <User className="w-8 h-8 text-slate-400" />
                    </div>
                    <p className="text-slate-600">{t('property.details.noAgent')}</p>
                  </div>
                )}

                {/* Schedule Viewing Button */}
                <div className="mt-6 pt-6 border-t">
                  <QuickAppointmentButton 
                    propertyId={property.id}
                    variant="default"
                    size="default"
                    onSuccess={() => {
                      console.log('[PropertyDetails] Appointment scheduled successfully');
                      setAppointmentScheduled(true);
                    }}
                  />
                </div>

                {/* Contact Form */}
                <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t">
                  <h4 className="font-semibold text-sm sm:text-base text-slate-900 mb-3 sm:mb-4">{t('property.details.contactAgent')}</h4>

                  <DynamicContactForm
                    propertyId={property.id}
                    propertyTitle={property.title}
                    context="property"
                    showInterestType={true}
                    variant="default"
                    onSuccess={() => {
                      setMessageSent(true);
                      if (user?.email) {
                        trackAction('contacted', { 
                          contact_name: contactForm.name,
                          contact_email: contactForm.email 
                        });
                      }
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        
        {/* Fullscreen Gallery Modal */}
        <Dialog open={galleryOpen} onOpenChange={setGalleryOpen}>
          <DialogContent className="max-w-6xl w-full h-[90vh] p-0 bg-black">
            <div className="relative w-full h-full flex items-center justify-center">
              <button
                onClick={() => setGalleryOpen(false)}
                className="absolute top-4 right-4 z-10 w-10 h-10 bg-white/20 hover:bg-white/40 rounded-full flex items-center justify-center text-white"
              >
                <X className="w-6 h-6" />
              </button>
              
              <img
                src={images[selectedImage]}
                alt={property.title}
                className="max-w-full max-h-full object-contain"
              />
              
              {images.length > 1 && (
                <>
                  <button
                    onClick={() => navigateGallery('prev')}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/20 hover:bg-white/40 rounded-full flex items-center justify-center text-white"
                  >
                    <ChevronLeft className="w-8 h-8" />
                  </button>
                  <button
                    onClick={() => navigateGallery('next')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/20 hover:bg-white/40 rounded-full flex items-center justify-center text-white"
                  >
                    <ChevronRight className="w-8 h-8" />
                  </button>
                </>
              )}
              
              {/* Thumbnail strip at bottom */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 bg-black/50 p-2 rounded-lg">
                {images.slice(0, 8).map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`w-14 h-10 rounded overflow-hidden border-2 transition-all ${
                      selectedImage === idx ? 'border-white' : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
                {images.length > 8 && (
                  <div className="w-14 h-10 rounded bg-white/20 flex items-center justify-center text-white text-sm">
                    +{images.length - 8}
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
        
        {editingProperty && (
          <React.Suspense fallback={null}>
            <EditPropertyDialog
              property={editingProperty}
              open={!!editingProperty}
              onOpenChange={(open) => !open && setEditingProperty(null)}
            />
          </React.Suspense>
        )}

        {brochureOpen && (
          <React.Suspense fallback={null}>
            <PropertyBrochureGenerator
              property={property}
              open={brochureOpen}
              onOpenChange={setBrochureOpen}
            />
          </React.Suspense>
        )}
        </div>
      </div>
    </HelmetProvider>
  );
}

// Memoized Map Component with proper Leaflet cleanup
const PropertyMap = React.memo(({ property }) => {
  const [mapKey, setMapKey] = React.useState(0);
  
  const cityCoords = {
    'Lisboa': [38.7223, -9.1393],
    'Porto': [41.1579, -8.6291],
    'Braga': [41.5454, -8.4265],
    'Coimbra': [40.2033, -8.4103],
    'Faro': [37.0194, -7.9304],
    'Aveiro': [40.6443, -8.6455],
    'Viseu': [40.6566, -7.9122],
    'Setúbal': [38.5244, -8.8882],
    'Évora': [38.5742, -7.9078],
    'Leiria': [39.7437, -8.8071],
    'Funchal': [32.6669, -16.9241],
    'Ponta Delgada': [37.7412, -25.6756],
    'Cascais': [38.6979, -9.4215],
    'Sintra': [38.8029, -9.3817],
    'Oeiras': [38.6939, -9.3106],
    'Almada': [38.6799, -9.1571],
    'Matosinhos': [41.1820, -8.6896],
    'Vila Nova de Gaia': [41.1239, -8.6118]
  };
  
  const coords = property.latitude && property.longitude 
    ? [property.latitude, property.longitude]
    : cityCoords[property.city] || [39.5, -8.0];
  
  // Force remount when property changes to avoid Leaflet reinitialization errors
  React.useEffect(() => {
    setMapKey(prev => prev + 1);
  }, [property.id]);
  
  return (
    <div className="h-96 rounded-xl overflow-hidden border-2 border-slate-200 shadow-lg">
      <MapContainer 
        key={`map-${property.id}-${mapKey}`}
        center={coords} 
        zoom={14} 
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={coords}>
          <Popup>
            <div className="p-2">
              <strong className="text-base">{property.title}</strong><br />
              <span className="text-sm text-slate-600">
                {property.address}, {property.city}
              </span><br />
              <span className="text-lg font-bold text-green-600">
                €{property.price?.toLocaleString()}
              </span>
            </div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}, (prev, next) => prev.property.id === next.property.id);

// Consultant Avatar Component with proper error handling
const ConsultantAvatar = React.memo(({ consultant }) => {
  const [imageError, setImageError] = React.useState(false);
  
  React.useEffect(() => {
    setImageError(false);
  }, [consultant.photo_url]);

  return (
    <div className="flex items-center gap-4">
      {consultant.photo_url && !imageError ? (
        <img
          src={consultant.photo_url}
          alt={consultant.display_name || consultant.full_name}
          className="w-16 h-16 rounded-full object-cover border-2 border-slate-200 flex-shrink-0"
          onError={() => {
            console.error('[ConsultantAvatar] Failed to load photo:', consultant.photo_url);
            setImageError(true);
          }}
        />
      ) : (
        <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center border-2 border-slate-300 flex-shrink-0">
          <User className="w-8 h-8 text-slate-500" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-slate-900 truncate">{consultant.display_name || consultant.full_name}</h4>
        {consultant.specialization && (
          <p className="text-sm text-slate-600 truncate">{consultant.specialization}</p>
        )}
      </div>
    </div>
  );
});