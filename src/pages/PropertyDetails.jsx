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
  Building2, Ruler, Zap, Wrench, Send, Loader2, Check, Image as ImageIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2 as Loader2Icon } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import PropertyCard from "../components/browse/PropertyCard";
import { CURRENCY_SYMBOLS, convertToEUR } from "../components/utils/currencyConverter";
import EditPropertyDialog from "../components/listings/EditPropertyDialog";
import MaintenanceManager from "../components/property/MaintenanceManager";
import LeaseManager from "../components/property/LeaseManager";
import PropertyDocumentManager from "../components/property/PropertyDocumentManager";
import ScheduleViewing from "../components/property/ScheduleViewing";
import QuickAppointmentButton from "../components/crm/QuickAppointmentButton";
import PublicationStatus from "../components/property/PublicationStatus";
import PropertyQualityScore from "../components/property/PropertyQualityScore";
import AIPricingAnalysis from "../components/property/AIPricingAnalysis";
import PremiumAnalytics from "../components/subscription/PremiumAnalytics";
import { usePropertyEngagement } from "../components/website/PropertyEngagementTracker";
import { 
  generatePropertyMetaDescription, 
  generatePropertyKeywords, 
  generatePropertyStructuredData,
  generatePropertySEOUrl 
} from "../components/utils/seoHelpers";
import { useLocalization } from "../components/i18n/LocalizationContext";
import { QUERY_CONFIG } from "../components/utils/queryClient";

export default function PropertyDetails() {
  const { t, locale } = useLocalization();
  
  // Auth check for admin features only - page is public
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  
  React.useEffect(() => {
    base44.auth.isAuthenticated().then(setIsAuthenticated).catch(() => setIsAuthenticated(false));
  }, []);

  const urlParams = new URLSearchParams(window.location.search);
  const propertyId = urlParams.get('id');
  
  // Debug logging
  React.useEffect(() => {
    console.log('[PropertyDetails] URL:', window.location.href);
    console.log('[PropertyDetails] Property ID:', propertyId);
    console.log('[PropertyDetails] Search params:', urlParams.toString());
  }, [propertyId]);
  
  const [selectedImage, setSelectedImage] = React.useState(0);
  const [editingProperty, setEditingProperty] = React.useState(null);
  const [galleryOpen, setGalleryOpen] = React.useState(false);
  const [contactForm, setContactForm] = React.useState({
    name: '',
    email: '',
    phone: '',
    message: ''
  });
  const [sendingMessage, setSendingMessage] = React.useState(false);
  const [messageSent, setMessageSent] = React.useState(false);
  const [appointmentScheduled, setAppointmentScheduled] = React.useState(false);

  const { data: property, isLoading, error } = useQuery({
    queryKey: ['property', propertyId],
    queryFn: async () => {
      console.log('[PropertyDetails] Fetching property with ID:', propertyId);
      try {
        const properties = await base44.entities.Property.filter({ id: propertyId });
        console.log('[PropertyDetails] Properties found:', properties?.length);
        if (!properties || properties.length === 0) {
          console.error('[PropertyDetails] No property found with ID:', propertyId);
          throw new Error('Property not found');
        }
        console.log('[PropertyDetails] Property loaded:', properties[0].title);
        return properties[0];
      } catch (err) {
        console.error('[PropertyDetails] Error fetching property:', err);
        throw err;
      }
    },
    enabled: !!propertyId,
    retry: 1,
    ...QUERY_CONFIG.properties
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

  const { data: savedProperties = [] } = useQuery({
    queryKey: ['savedProperties', user?.email],
    queryFn: async () => {
      if (!user) return [];
      const all = await base44.entities.SavedProperty.list();
      return all.filter(sp => sp.user_email === user.email);
    },
    enabled: !!user
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

  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: async () => {
      try {
        return await base44.entities.Agent.list();
      } catch {
        return [];
      }
    },
    ...QUERY_CONFIG.agents
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: async () => {
      try {
        return await base44.entities.User.list();
      } catch {
        return [];
      }
    },
    ...QUERY_CONFIG.user
  });

  const updatePropertyMutation = useMutation({
    mutationFn: (data) => base44.entities.Property.update(propertyId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['property', propertyId] });
      toast.success("Imóvel atualizado!");
    },
  });

  const queryClient = useQueryClient();

  const isSaved = savedProperties.some(sp => sp.property_id === propertyId);
  
  // Track engagement
  const { trackAction } = usePropertyEngagement(propertyId, property?.title);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (isSaved) {
        const saved = savedProperties.find(sp => sp.property_id === propertyId);
        await base44.entities.SavedProperty.delete(saved.id);
      } else {
        await base44.entities.SavedProperty.create({
          property_id: propertyId,
          property_title: property.title,
          property_image: property.images?.[0],
          user_email: user.email
        });
        // Track save action
        trackAction('shortlisted', { user_email: user.email });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedProperties'] });
      toast.success(isSaved ? "Imóvel removido dos guardados" : "Imóvel guardado com sucesso!");
    },
  });

  const handleWhatsAppShare = () => {
    const url = window.location.href;
    const text = `${property.title} - €${property.price?.toLocaleString()}\n${url}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    setSendingMessage(true);
    
    try {
      const { data: refData } = await base44.functions.invoke('generateRefId', { entity_type: 'Opportunity' });
      
      await base44.entities.Opportunity.create({
        ref_id: refData.ref_id,
        lead_type: 'comprador',
        property_id: property.id,
        property_title: property.title,
        seller_email: property.created_by || property.agent_id,
        buyer_name: contactForm.name,
        buyer_email: contactForm.email,
        buyer_phone: contactForm.phone,
        message: `Contacto via página do imóvel:\n\n${contactForm.message}`,
        status: 'new',
        lead_source: 'website'
      });

      console.log('[PropertyDetails] Message sent successfully, showing confirmation');
      toast.success("Mensagem enviada com sucesso!");
      
      // Track contact action (non-blocking)
      try {
        trackAction('contacted', { 
          contact_name: contactForm.name,
          contact_email: contactForm.email 
        });
      } catch (trackError) {
        console.warn('[PropertyDetails] Tracking failed:', trackError);
      }
      
      // Show confirmation and reset
      setContactForm({ name: '', email: '', phone: '', message: '' });
      setSendingMessage(false);
      setMessageSent(true);
    } catch (error) {
      console.error('[PropertyDetails] Error sending message:', error);
      toast.error("Erro ao enviar mensagem");
      setSendingMessage(false);
    }
  };

  const navigateGallery = (direction) => {
    const images = property.images || [];
    if (direction === 'prev') {
      setSelectedImage(prev => prev === 0 ? images.length - 1 : prev - 1);
    } else {
      setSelectedImage(prev => prev === images.length - 1 ? 0 : prev + 1);
    }
  };

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

  if (!propertyId) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">ID do imóvel não especificado</h2>
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

  const images = property.images && property.images.length > 0 
    ? property.images 
    : ["https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1200"];

  const similarProperties = allProperties
    .filter(p => 
      p.id !== propertyId &&
      p.status === 'active' &&
      (p.city === property.city || p.state === property.state) &&
      p.property_type === property.property_type
    )
    .slice(0, 3);

  const isOwner = user && (property.created_by === user.email || user.role === 'admin' || user.user_type?.toLowerCase() === 'admin' || user.user_type?.toLowerCase() === 'gestor');

    // Find assigned agent or consultant - check both Agent entity and User entity
    const assignedAgent = agents.find(a => a.id === property.agent_id || a.email === property.agent_id) 
      || allUsers.find(u => u.id === property.agent_id || u.email === property.agent_id)
      || allUsers.find(u => u.email === property.assigned_consultant); // Check consultant by email

    const handleAgentChange = (agentId) => {
      const agent = allUsers.find(u => u.id === agentId) || agents.find(a => a.id === agentId);
      updatePropertyMutation.mutate({
        agent_id: agentId || null,
        agent_name: agent?.full_name || null
      });
    };

    const handleVisibilityChange = (visibility) => {
      updatePropertyMutation.mutate({ visibility });
    };

  // Generate SEO-friendly URL for meta tags and sharing (not for internal navigation)
  const seoCanonicalUrl = React.useMemo(() => {
    if (property && typeof window !== 'undefined') {
      const baseUrl = window.location.origin;
      return `${baseUrl}${generatePropertySEOUrl(property)}?id=${property.id}`;
    }
    return typeof window !== 'undefined' ? window.location.href : '';
  }, [property]);

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

  // SEO Meta Tags
  const metaTitle = `${property.title} | ${property.city} | Zugruppe`;
  const metaDescription = generatePropertyMetaDescription(property);
  const metaKeywords = generatePropertyKeywords(property);
  const propertyImage = images[0];
  const structuredData = generatePropertyStructuredData(property, propertyImage);

  return (
    <div className="min-h-screen bg-slate-50">
      <SEOHead
        title={metaTitle}
        description={metaDescription}
        keywords={metaKeywords}
        image={propertyImage}
        url={seoCanonicalUrl}
        structuredData={structuredData}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link to={createPageUrl("Website")}>
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('common.back')}
            </Button>
          </Link>
          
          <div className="flex gap-2">
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
            
            {user && (
              <Button
                variant="outline"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className={isSaved ? "border-red-500 text-red-600" : ""}
              >
                <Heart className={`w-4 h-4 mr-2 ${isSaved ? "fill-current" : ""}`} />
                {isSaved ? t('contact.savedProperty') : t('contact.saveProperty')}
              </Button>
            )}
            
            <Button
              variant="outline"
              onClick={handleWhatsAppShare}
              className="bg-green-500 hover:bg-green-600 text-white border-0"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              {t('contact.shareProperty')}
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Main Content - Left Column */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
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
                    <ImageIcon className="w-3 h-3 sm:w-4 sm:h-4" />
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
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 mb-2 sm:mb-3">{property.title}</h1>
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
                      <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900">
                        {CURRENCY_SYMBOLS[property.currency] || '€'}{property.price?.toLocaleString()}
                        {property.listing_type === 'rent' && <span className="text-sm sm:text-base md:text-lg font-normal text-slate-500">{t('common.perMonth')}</span>}
                      </div>
                      {property.currency && property.currency !== 'EUR' && (() => {
                        const eurValue = convertToEUR(property.price, property.currency);
                        return eurValue ? (
                          <div className="text-sm sm:text-base md:text-lg text-slate-500 mt-1">
                            ≈ €{eurValue.toLocaleString()} {property.listing_type === 'rent' && '/mês'}
                          </div>
                        ) : null;
                      })()}
                    <div className="flex gap-1.5 sm:gap-2 mt-2 flex-wrap">
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
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 py-4 sm:py-6 border-b border-slate-200">
                  <div className="text-center p-3 sm:p-4 bg-slate-50 rounded-xl">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white rounded-lg flex items-center justify-center mx-auto mb-1.5 sm:mb-2 shadow-sm">
                      <Bed className="w-4 h-4 sm:w-5 sm:h-5 text-slate-700" />
                    </div>
                    <div className="text-xl sm:text-2xl font-bold text-slate-900">{property.bedrooms || 0}</div>
                    <div className="text-xs sm:text-sm text-slate-600">{t('property.details.bedrooms')}</div>
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
                    {property.description || (locale === 'en' ? 'No description available.' : 'Sem descrição disponível.')}
                  </p>
                </div>

                {/* Amenities */}
                {property.amenities && property.amenities.length > 0 && (
                  <div className="py-6 border-b border-slate-200">
                    <h3 className="text-lg font-semibold text-slate-900 mb-3">{t('property.details.amenities')}</h3>
                    <div className="flex flex-wrap gap-2">
                      {property.amenities.map((amenity, idx) => (
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
            {property.city && (() => {
              // Coordenadas de cidades portuguesas
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
              
              // Usar coordenadas da propriedade ou da cidade
              const coords = property.latitude && property.longitude 
                ? [property.latitude, property.longitude]
                : cityCoords[property.city] || [39.5, -8.0]; // Centro de Portugal como fallback
              
              return (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="w-5 h-5" />
                      {t('property.details.location')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-96 rounded-xl overflow-hidden border-2 border-slate-200 shadow-lg">
                      <MapContainer 
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
              );
            })()}

            {/* AI Features - Quality Score & Pricing */}
            {isOwner && (
              <>
                <PropertyQualityScore property={property} />
                <AIPricingAnalysis property={property} />
                <PremiumAnalytics propertyId={property.id} />
              </>
            )}

            {/* Publication Status */}
            {isOwner && (
              <PublicationStatus property={property} variant="detailed" />
            )}

            {/* Property Management Section */}
            {isOwner && (
              <Card>
                <CardHeader>
                  <CardTitle>Gestão do Imóvel</CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="maintenance" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="maintenance">Manutenção</TabsTrigger>
                      <TabsTrigger value="leases">Arrendamentos</TabsTrigger>
                      <TabsTrigger value="documents">Documentos</TabsTrigger>
                    </TabsList>
                    
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
                    
                    <TabsContent value="documents" className="mt-6">
                      <PropertyDocumentManager 
                        propertyId={propertyId} 
                        propertyTitle={property.title}
                      />
                    </TabsContent>
                  </Tabs>
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
                      <PropertyCard key={prop.id} property={prop} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar - Right Column */}
          <div className="space-y-4 sm:space-y-6">
            {/* Agent Card */}
            <Card className="lg:sticky lg:top-24">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">{t('property.details.assignedAgent')}</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Agent Assignment (only for owners/admins) */}
                {isOwner && (
                  <div className="mb-4 pb-4 border-b">
                    <Label className="text-xs text-slate-500 mb-1 block">Atribuir Agente</Label>
                    <Select 
                      value={property.agent_id || ""} 
                      onValueChange={handleAgentChange}
                      disabled={updatePropertyMutation.isPending}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecionar agente..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={null}>Nenhum</SelectItem>
                        {allUsers.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
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

                {assignedAgent ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      {assignedAgent.photo_url ? (
                        <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-slate-200 bg-slate-100 flex-shrink-0">
                          <img 
                            src={assignedAgent.photo_url} 
                            alt={assignedAgent.display_name || assignedAgent.full_name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              console.warn('[PropertyDetails] Agent photo failed to load:', assignedAgent.photo_url);
                              e.target.style.display = 'none';
                              e.target.parentElement.innerHTML = `<div class="w-full h-full bg-slate-200 flex items-center justify-center"><svg class="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg></div>`;
                            }}
                          />
                        </div>
                      ) : (
                        <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center border-2 border-slate-300 flex-shrink-0">
                          <User className="w-8 h-8 text-slate-500" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-slate-900 truncate">{assignedAgent.display_name || assignedAgent.full_name}</h4>
                        {assignedAgent.specialization && (
                          <p className="text-sm text-slate-600 truncate">{assignedAgent.specialization}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      {assignedAgent.phone && (
                        <a 
                          href={`tel:${assignedAgent.phone}`}
                          className="flex items-center gap-2 text-slate-700 hover:text-blue-600 transition-colors"
                        >
                          <Phone className="w-4 h-4" />
                          {assignedAgent.phone}
                        </a>
                      )}
                      {assignedAgent.email && (
                        <a 
                          href={`mailto:${assignedAgent.email}`}
                          className="flex items-center gap-2 text-slate-700 hover:text-blue-600 transition-colors"
                        >
                          <Mail className="w-4 h-4" />
                          {assignedAgent.email}
                        </a>
                      )}
                    </div>
                    
                    {assignedAgent.bio && (
                      <p className="text-sm text-slate-600 pt-2 border-t">{assignedAgent.bio}</p>
                    )}
                  </div>
                ) : property.agent_name ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center">
                        <User className="w-6 h-6 text-slate-500" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900">{property.agent_name}</h4>
                        <p className="text-sm text-slate-600">Agente Imobiliário</p>
                      </div>
                    </div>
                  </div>
                ) : property.assigned_consultant_name || property.assigned_consultant ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center">
                        <User className="w-6 h-6 text-slate-500" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900">
                          {property.assigned_consultant_name || property.assigned_consultant}
                        </h4>
                        <p className="text-sm text-slate-600">Consultor Responsável</p>
                      </div>
                    </div>
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

                  {messageSent ? (
                    <div className="text-center py-6 sm:py-8 bg-green-50 rounded-lg border-2 border-green-200">
                      <div className="w-12 h-12 sm:w-16 sm:h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-3">
                        <Check className="w-6 h-6 sm:w-8 sm:h-8 text-green-600" />
                      </div>
                      <h5 className="text-base sm:text-lg font-semibold text-green-900 mb-1">{t('contact.messageSent')}</h5>
                      <p className="text-xs sm:text-sm text-green-700 px-4">{t('contact.messageConfirmation')}</p>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="mt-3 sm:mt-4"
                        onClick={() => setMessageSent(false)}
                      >
                        {t('contact.sendAnother')}
                      </Button>
                    </div>
                  ) : (
                    <form onSubmit={handleContactSubmit} className="space-y-3 sm:space-y-4">
                      <div>
                        <Label htmlFor="name" className="text-xs sm:text-sm">{t('contact.name')} {t('contact.required')}</Label>
                        <Input
                          id="name"
                          required
                          value={contactForm.name}
                          onChange={(e) => setContactForm({...contactForm, name: e.target.value})}
                          placeholder={locale === 'en' ? 'Your name' : 'O seu nome'}
                          className="h-9 sm:h-10 text-sm"
                        />
                      </div>
                      <div>
                        <Label htmlFor="email" className="text-xs sm:text-sm">{t('contact.email')} {t('contact.required')}</Label>
                        <Input
                          id="email"
                          type="email"
                          required
                          value={contactForm.email}
                          onChange={(e) => setContactForm({...contactForm, email: e.target.value})}
                          placeholder={locale === 'en' ? 'email@example.com' : 'email@exemplo.com'}
                          className="h-9 sm:h-10 text-sm"
                        />
                      </div>
                      <div>
                        <Label htmlFor="phone" className="text-xs sm:text-sm">{t('contact.phone')}</Label>
                        <Input
                          id="phone"
                          value={contactForm.phone}
                          onChange={(e) => setContactForm({...contactForm, phone: e.target.value})}
                          placeholder="+351 912 345 678"
                          className="h-9 sm:h-10 text-sm"
                        />
                      </div>
                      <div>
                        <Label htmlFor="message" className="text-xs sm:text-sm">{t('contact.message')} {t('contact.required')}</Label>
                        <Textarea
                          id="message"
                          required
                          value={contactForm.message}
                          onChange={(e) => setContactForm({...contactForm, message: e.target.value})}
                          placeholder={t('contact.messagePlaceholder', { title: property.title })}
                          rows={4}
                          className="text-sm resize-none"
                        />
                      </div>
                      <Button 
                        type="submit" 
                        className="w-full bg-slate-900 hover:bg-slate-800 h-10 sm:h-11 text-sm sm:text-base"
                        disabled={sendingMessage}
                      >
                        {sendingMessage ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            {t('contact.sending')}
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4 mr-2" />
                            {t('contact.submit')}
                          </>
                        )}
                      </Button>
                    </form>
                  )}
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
        
        <EditPropertyDialog
          property={editingProperty}
          open={!!editingProperty}
          onOpenChange={(open) => !open && setEditingProperty(null)}
        />
      </div>
    </div>
  );
}