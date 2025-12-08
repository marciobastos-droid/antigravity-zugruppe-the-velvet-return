import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import EditPropertyDialog from "../components/listings/EditPropertyDialog";
import MaintenanceManager from "../components/property/MaintenanceManager";
import LeaseManager from "../components/property/LeaseManager";
import PropertyDocumentManager from "../components/property/PropertyDocumentManager";
import ScheduleViewing from "../components/property/ScheduleViewing";
import QuickAppointmentButton from "../components/crm/QuickAppointmentButton";
import PublicationStatus from "../components/property/PublicationStatus";

export default function PropertyDetails() {
  const urlParams = new URLSearchParams(window.location.search);
  const propertyId = urlParams.get('id');
  
  console.log('[PropertyDetails] Property ID from URL:', propertyId);
  
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

  const { data: property, isLoading, error } = useQuery({
    queryKey: ['property', propertyId],
    queryFn: async () => {
      console.log('[PropertyDetails] Fetching property with ID:', propertyId);
      try {
        // Tentar buscar como utilizador público primeiro
        const properties = await base44.entities.Property.filter({ id: propertyId });
        console.log('[PropertyDetails] Properties found:', properties);
        if (!properties || properties.length === 0) {
          throw new Error('Property not found');
        }
        return properties[0];
      } catch (err) {
        console.error('[PropertyDetails] Error:', err);
        throw err;
      }
    },
    enabled: !!propertyId,
    retry: 1
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
      // Create an inquiry/opportunity
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

      setMessageSent(true);
      toast.success("Mensagem enviada com sucesso!");
      setContactForm({ name: '', email: '', phone: '', message: '' });
    } catch (error) {
      toast.error("Erro ao enviar mensagem");
    }
    
    setSendingMessage(false);
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900" />
      </div>
    );
  }

  if (!propertyId) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">ID do imóvel não especificado</h2>
          <p className="text-slate-600 mb-4">O link está incompleto ou inválido</p>
          <Link to={createPageUrl("ZuGruppe")}>
            <Button>Ver Imóveis</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (error || (!isLoading && !property)) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Imóvel não encontrado</h2>
          <p className="text-slate-600 mb-4">ID: {propertyId}</p>
          <Link to={createPageUrl("ZuGruppe")}>
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

    // Find assigned agent - check both Agent entity and User entity
    const assignedAgent = agents.find(a => a.id === property.agent_id || a.email === property.agent_id) 
      || allUsers.find(u => u.id === property.agent_id || u.email === property.agent_id);

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
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link to={createPageUrl("Browse")}>
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
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
                Editar
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
                {isSaved ? "Guardado" : "Guardar"}
              </Button>
            )}
            
            <Button
              variant="outline"
              onClick={handleWhatsAppShare}
              className="bg-green-500 hover:bg-green-600 text-white border-0"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Partilhar
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content - Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Image Gallery */}
            <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-200">
              <div 
                className="relative h-80 md:h-[500px] cursor-pointer group"
                onClick={() => setGalleryOpen(true)}
              >
                <img
                  src={images[selectedImage]}
                  alt={property.title}
                  className="w-full h-full object-cover"
                />
                
                {/* Navigation Arrows */}
                {images.length > 1 && (
                  <>
                    <button
                      onClick={(e) => { 
                        if (e && e.stopPropagation) e.stopPropagation(); 
                        navigateGallery('prev'); 
                      }}
                      className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button
                      onClick={(e) => { 
                        if (e && e.stopPropagation) e.stopPropagation(); 
                        navigateGallery('next'); 
                      }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>
                  </>
                )}
                
                {/* View All Photos Button - Prominent */}
                <div className="absolute bottom-4 right-4 flex items-center gap-2">
                  <button
                    onClick={() => setGalleryOpen(true)}
                    className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-900 px-4 py-2 rounded-lg shadow-lg font-semibold text-sm transition-all hover:scale-105 border border-slate-200"
                  >
                    <ImageIcon className="w-4 h-4" />
                    <span>Ver todas as {images.length} fotos</span>
                  </button>
                </div>
                
                {/* Badges */}
                <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                  {property.featured && (
                    <Badge className="bg-amber-400 text-slate-900 border-0">
                      <Star className="w-3 h-3 mr-1 fill-current" />
                      Destaque
                    </Badge>
                  )}
                  <Badge className={availabilityColors[property.availability_status] || "bg-green-100 text-green-800"}>
                    {availabilityLabels[property.availability_status] || "Disponível"}
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
              <CardContent className="p-6 md:p-8">
                {/* Header with Ref ID and Title */}
                <div className="mb-6">
                  {property.ref_id && (
                    <Badge variant="outline" className="mb-2 text-sm font-mono">
                      <Hash className="w-3 h-3 mr-1" />
                      {property.ref_id}
                    </Badge>
                  )}
                  <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">{property.title}</h1>
                  <div className="flex items-center text-slate-600 text-lg">
                    <MapPin className="w-5 h-5 mr-2 flex-shrink-0" />
                    <span>
                      {property.address && `${property.address}, `}
                      {property.city}, {property.state}
                      {property.zip_code && ` - ${property.zip_code}`}
                      {property.country && property.country !== 'Portugal' && `, ${property.country}`}
                    </span>
                  </div>
                </div>

                {/* Price and Type */}
                <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-200">
                  <div>
                    <div className="text-4xl font-bold text-slate-900">
                      {property.currency === 'EUR' ? '€' : 
                       property.currency === 'USD' ? '$' :
                       property.currency === 'GBP' ? '£' :
                       property.currency === 'AED' ? 'د.إ' :
                       property.currency === 'AOA' ? 'Kz' :
                       property.currency === 'BRL' ? 'R$' :
                       property.currency || '€'}{property.price?.toLocaleString()}
                      {property.listing_type === 'rent' && <span className="text-lg font-normal text-slate-500">/mês</span>}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Badge className="bg-slate-900 text-white">
                        {property.listing_type === 'sale' ? 'Venda' : 'Arrendamento'}
                      </Badge>
                      <Badge variant="outline">
                        <Home className="w-3 h-3 mr-1" />
                        {propertyTypeLabels[property.property_type] || property.property_type}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Key Features Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-6 border-b border-slate-200">
                  <div className="text-center p-4 bg-slate-50 rounded-xl">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center mx-auto mb-2 shadow-sm">
                      <Bed className="w-5 h-5 text-slate-700" />
                    </div>
                    <div className="text-2xl font-bold text-slate-900">{property.bedrooms || 0}</div>
                    <div className="text-sm text-slate-600">Quartos</div>
                  </div>
                  <div className="text-center p-4 bg-slate-50 rounded-xl">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center mx-auto mb-2 shadow-sm">
                      <Bath className="w-5 h-5 text-slate-700" />
                    </div>
                    <div className="text-2xl font-bold text-slate-900">{property.bathrooms || 0}</div>
                    <div className="text-sm text-slate-600">WCs</div>
                  </div>
                  <div className="text-center p-4 bg-slate-50 rounded-xl">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center mx-auto mb-2 shadow-sm">
                      <Maximize className="w-5 h-5 text-slate-700" />
                    </div>
                    <div className="text-2xl font-bold text-slate-900">
                      {property.useful_area || property.square_feet || 0}
                    </div>
                    <div className="text-sm text-slate-600">m² úteis</div>
                  </div>
                  <div className="text-center p-4 bg-slate-50 rounded-xl">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center mx-auto mb-2 shadow-sm">
                      <Calendar className="w-5 h-5 text-slate-700" />
                    </div>
                    <div className="text-2xl font-bold text-slate-900">{property.year_built || 'N/A'}</div>
                    <div className="text-sm text-slate-600">Ano</div>
                  </div>
                </div>

                {/* Areas, Energy Certificate, Details */}
                <div className="py-6 border-b border-slate-200">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Detalhes do Imóvel</h3>
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
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">Descrição</h3>
                  <p className="text-slate-700 leading-relaxed whitespace-pre-line">
                    {property.description || 'Sem descrição disponível.'}
                  </p>
                </div>

                {/* Amenities */}
                {property.amenities && property.amenities.length > 0 && (
                  <div className="py-6 border-b border-slate-200">
                    <h3 className="text-lg font-semibold text-slate-900 mb-3">Comodidades</h3>
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
                  <div className="py-6 border-b border-slate-200">
                    <h3 className="text-lg font-semibold text-slate-900 mb-3">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {property.tags.map((tag, idx) => (
                        <Badge key={idx} variant="outline" className="text-sm">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* External Links */}
                {(property.external_id || property.source_url) && (
                  <div className="pt-6">
                    <div className="flex flex-wrap items-center gap-2">
                      {property.external_id && (
                        <Badge variant="secondary" className="text-sm">
                          <Hash className="w-3 h-3 mr-1" />
                          ID Externo: {property.external_id}
                        </Badge>
                      )}
                      {property.source_url && (
                        <a href={property.source_url} target="_blank" rel="noopener noreferrer">
                          <Badge variant="secondary" className="text-sm hover:bg-blue-100 cursor-pointer">
                            <ExternalLink className="w-3 h-3 mr-1" />
                            Ver Anúncio Original
                          </Badge>
                        </a>
                      )}
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
                    Localização
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-96 rounded-xl overflow-hidden border-2 border-slate-200 shadow-lg">
                    <MapContainer 
                      center={[41.1579, -8.6291]} 
                      zoom={14} 
                      style={{ height: '100%', width: '100%' }}
                      scrollWheelZoom={true}
                      zoomControl={true}
                    >
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      <Marker position={[41.1579, -8.6291]}>
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
                  <CardTitle>Imóveis Semelhantes</CardTitle>
                  <p className="text-sm text-slate-600">Outros imóveis na mesma zona</p>
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
          <div className="space-y-6">
            {/* Agent Card */}
                              <Card className="sticky top-24">
                                <CardHeader className="pb-4">
                                  <CardTitle className="text-lg">Agente Responsável</CardTitle>
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
                        <img 
                          src={assignedAgent.photo_url} 
                          alt={assignedAgent.full_name || assignedAgent.display_name}
                          className="w-16 h-16 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center">
                          <User className="w-8 h-8 text-slate-500" />
                        </div>
                      )}
                      <div>
                        <h4 className="font-semibold text-slate-900">{assignedAgent.full_name || assignedAgent.display_name}</h4>
                        {assignedAgent.specialization && (
                          <p className="text-sm text-slate-600">{assignedAgent.specialization}</p>
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
                    <p className="text-slate-600">Agente não atribuído</p>
                  </div>
                )}

                {/* Schedule Viewing Button */}
                <div className="mt-6 pt-6 border-t">
                  <QuickAppointmentButton 
                    propertyId={property.id}
                    variant="default"
                    size="default"
                  />
                </div>

                {/* Contact Form */}
                <div className="mt-6 pt-6 border-t">
                  <h4 className="font-semibold text-slate-900 mb-4">Contactar sobre este imóvel</h4>
                  
                  {messageSent ? (
                    <div className="text-center py-6 bg-green-50 rounded-lg border border-green-200">
                      <Check className="w-12 h-12 text-green-600 mx-auto mb-2" />
                      <h5 className="font-semibold text-green-900">Mensagem Enviada!</h5>
                      <p className="text-sm text-green-700 mt-1">Entraremos em contacto brevemente.</p>
                      <Button 
                        variant="outline" 
                        className="mt-4"
                        onClick={() => setMessageSent(false)}
                      >
                        Enviar outra mensagem
                      </Button>
                    </div>
                  ) : (
                    <form onSubmit={handleContactSubmit} className="space-y-4">
                      <div>
                        <Label htmlFor="name">Nome *</Label>
                        <Input
                          id="name"
                          required
                          value={contactForm.name}
                          onChange={(e) => setContactForm({...contactForm, name: e.target.value})}
                          placeholder="O seu nome"
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">Email *</Label>
                        <Input
                          id="email"
                          type="email"
                          required
                          value={contactForm.email}
                          onChange={(e) => setContactForm({...contactForm, email: e.target.value})}
                          placeholder="email@exemplo.com"
                        />
                      </div>
                      <div>
                        <Label htmlFor="phone">Telefone</Label>
                        <Input
                          id="phone"
                          value={contactForm.phone}
                          onChange={(e) => setContactForm({...contactForm, phone: e.target.value})}
                          placeholder="+351 912 345 678"
                        />
                      </div>
                      <div>
                        <Label htmlFor="message">Mensagem *</Label>
                        <Textarea
                          id="message"
                          required
                          value={contactForm.message}
                          onChange={(e) => setContactForm({...contactForm, message: e.target.value})}
                          placeholder={`Olá, tenho interesse no imóvel "${property.title}". Gostaria de obter mais informações...`}
                          rows={4}
                        />
                      </div>
                      <Button 
                        type="submit" 
                        className="w-full bg-slate-900 hover:bg-slate-800"
                        disabled={sendingMessage}
                      >
                        {sendingMessage ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            A enviar...
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4 mr-2" />
                            Enviar Mensagem
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