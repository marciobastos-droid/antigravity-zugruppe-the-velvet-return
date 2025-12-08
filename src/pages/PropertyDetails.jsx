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
  Building2, Ruler, Zap, Wrench, Send, Loader2, Check, Share2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  const queryClient = useQueryClient();
  
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
      try {
        const properties = await base44.entities.Property.filter({ id: propertyId });
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
    const text = `${property.title} - ${property.currency === 'EUR' ? '€' : '$'}${property.price?.toLocaleString()}\n${url}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    setSendingMessage(true);
    
    try {
      const refData = await base44.functions.invoke('generateRefId', { entity_type: 'Opportunity' });
      
      await base44.entities.Opportunity.create({
        ref_id: refData.data.ref_id,
        lead_type: 'comprador',
        property_id: property.id,
        property_title: property.title,
        seller_email: property.created_by || property.agent_id,
        buyer_name: contactForm.name,
        buyer_email: contactForm.email,
        buyer_phone: contactForm.phone,
        message: `[Website] Interesse no imóvel ${property.ref_id || property.id}:\n\n${contactForm.message}`,
        status: 'new',
        lead_source: 'website'
      });

      setMessageSent(true);
      toast.success("Mensagem enviada! Entraremos em contacto em breve.");
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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#d22630] mx-auto mb-4" />
          <p className="text-slate-600">A carregar imóvel...</p>
        </div>
      </div>
    );
  }

  if (!propertyId || error || !property) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Home className="w-20 h-20 text-slate-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Imóvel não encontrado</h2>
          <Link to={createPageUrl("ZuGruppe")}>
            <Button className="bg-[#d22630] hover:bg-[#a01d26] mt-4">Ver Imóveis</Button>
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
    office: "Escritório",
    condo: "Condomínio",
    townhouse: "Casa Geminada"
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
    available: "bg-green-500 text-white",
    sold: "bg-red-500 text-white",
    reserved: "bg-amber-500 text-white",
    rented: "bg-blue-500 text-white",
    prospecting: "bg-purple-500 text-white",
    withdrawn: "bg-slate-500 text-white",
    pending_validation: "bg-orange-500 text-white"
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section with Image */}
      <div className="relative">
        <div className="relative h-[50vh] md:h-[60vh] lg:h-[70vh] overflow-hidden bg-slate-900">
          <img
            src={images[selectedImage]}
            alt={property.title}
            className="w-full h-full object-cover opacity-90"
          />
          
          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          
          {/* Navigation */}
          <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10">
            <Link to={createPageUrl("ZuGruppe")}>
              <Button variant="ghost" className="bg-white/90 hover:bg-white backdrop-blur-sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
            </Link>
            
            <div className="flex gap-2">
              {user && (
                <Button
                  variant="ghost"
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending}
                  className={`bg-white/90 hover:bg-white backdrop-blur-sm ${isSaved ? "text-red-600" : ""}`}
                >
                  <Heart className={`w-5 h-5 ${isSaved ? "fill-current" : ""}`} />
                </Button>
              )}
              <Button
                variant="ghost"
                onClick={handleWhatsAppShare}
                className="bg-white/90 hover:bg-white backdrop-blur-sm"
              >
                <Share2 className="w-5 h-5" />
              </Button>
              {isOwner && (
                <Button
                  variant="ghost"
                  onClick={() => setEditingProperty(property)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Editar
                </Button>
              )}
            </div>
          </div>
          
          {/* Image Gallery Navigation */}
          {images.length > 1 && (
            <>
              <button
                onClick={() => navigateGallery('prev')}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/90 rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-all"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={() => navigateGallery('next')}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/90 rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-all"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}
          
          {/* Bottom Info Overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-wrap gap-2 mb-3">
                {property.featured && (
                  <Badge className="bg-amber-400 text-slate-900 border-0">
                    <Star className="w-3 h-3 mr-1 fill-current" />
                    Destaque
                  </Badge>
                )}
                <Badge className={availabilityColors[property.availability_status] || "bg-green-500 text-white"}>
                  {availabilityLabels[property.availability_status] || "Disponível"}
                </Badge>
                <Badge className="bg-white/90 text-slate-900 border-0">
                  {property.listing_type === 'sale' ? 'Venda' : 'Arrendamento'}
                </Badge>
              </div>
              
              <div className="text-white">
                <div className="text-4xl md:text-5xl lg:text-6xl font-bold mb-2">
                  {property.currency === 'EUR' ? '€' : '$'}{property.price?.toLocaleString()}
                  {property.listing_type === 'rent' && <span className="text-2xl font-normal">/mês</span>}
                </div>
                {images.length > 1 && (
                  <button
                    onClick={() => setGalleryOpen(true)}
                    className="text-sm text-white/90 hover:text-white flex items-center gap-2 mt-2"
                  >
                    Ver todas as {images.length} fotos
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Thumbnail Strip */}
        {images.length > 1 && (
          <div className="bg-slate-900 py-3">
            <div className="max-w-7xl mx-auto px-4 overflow-x-auto">
              <div className="flex gap-2">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`flex-shrink-0 w-24 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                      selectedImage === idx ? 'border-amber-400 ring-2 ring-amber-200' : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Details */}
          <div className="lg:col-span-2 space-y-8">
            {/* Property Header */}
            <div>
              {property.ref_id && (
                <Badge variant="outline" className="mb-3 text-sm font-mono">
                  <Hash className="w-3 h-3 mr-1" />
                  {property.ref_id}
                </Badge>
              )}
              <h1 className="text-3xl md:text-5xl font-bold text-slate-900 mb-4">{property.title}</h1>
              <div className="flex items-center text-slate-600 text-lg mb-4">
                <MapPin className="w-6 h-6 mr-2 text-[#d22630] flex-shrink-0" />
                <span>
                  {property.address && `${property.address}, `}
                  {property.city}, {property.state}
                  {property.country && property.country !== 'Portugal' && `, ${property.country}`}
                </span>
              </div>
              
              {/* Quick Stats */}
              <div className="flex flex-wrap gap-4 mt-6">
                {property.bedrooms !== undefined && (
                  <div className="flex items-center gap-3 bg-slate-50 px-5 py-3 rounded-xl">
                    <Bed className="w-6 h-6 text-[#d22630]" />
                    <div>
                      <div className="text-2xl font-bold text-slate-900">T{property.bedrooms}</div>
                      <div className="text-xs text-slate-600">Quartos</div>
                    </div>
                  </div>
                )}
                {property.bathrooms > 0 && (
                  <div className="flex items-center gap-3 bg-slate-50 px-5 py-3 rounded-xl">
                    <Bath className="w-6 h-6 text-[#d22630]" />
                    <div>
                      <div className="text-2xl font-bold text-slate-900">{property.bathrooms}</div>
                      <div className="text-xs text-slate-600">WC</div>
                    </div>
                  </div>
                )}
                {(property.useful_area || property.square_feet) > 0 && (
                  <div className="flex items-center gap-3 bg-slate-50 px-5 py-3 rounded-xl">
                    <Maximize className="w-6 h-6 text-[#d22630]" />
                    <div>
                      <div className="text-2xl font-bold text-slate-900">{property.useful_area || property.square_feet}</div>
                      <div className="text-xs text-slate-600">m²</div>
                    </div>
                  </div>
                )}
                {property.year_built && (
                  <div className="flex items-center gap-3 bg-slate-50 px-5 py-3 rounded-xl">
                    <Calendar className="w-6 h-6 text-[#d22630]" />
                    <div>
                      <div className="text-2xl font-bold text-slate-900">{property.year_built}</div>
                      <div className="text-xs text-slate-600">Ano</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            <Card className="shadow-md">
              <CardContent className="p-6 md:p-8">
                <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Building2 className="w-6 h-6 text-[#d22630]" />
                  Sobre Este Imóvel
                </h2>
                <div className="prose prose-lg max-w-none">
                  <p className="text-slate-700 leading-relaxed whitespace-pre-line text-base">
                    {property.description || 'Sem descrição disponível.'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Details Grid */}
            <Card className="shadow-md">
              <CardContent className="p-6 md:p-8">
                <h2 className="text-2xl font-bold text-slate-900 mb-6">Características</h2>
                <div className="grid md:grid-cols-2 gap-6">
                  {property.gross_area > 0 && (
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                        <Ruler className="w-6 h-6 text-slate-600" />
                      </div>
                      <div>
                        <div className="text-sm text-slate-500">Área Bruta</div>
                        <div className="font-semibold text-lg text-slate-900">{property.gross_area} m²</div>
                      </div>
                    </div>
                  )}
                  {(property.useful_area || property.square_feet) > 0 && (
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                        <Maximize className="w-6 h-6 text-slate-600" />
                      </div>
                      <div>
                        <div className="text-sm text-slate-500">Área Útil</div>
                        <div className="font-semibold text-lg text-slate-900">{property.useful_area || property.square_feet} m²</div>
                      </div>
                    </div>
                  )}
                  {property.front_count > 0 && (
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-slate-600" />
                      </div>
                      <div>
                        <div className="text-sm text-slate-500">Número de Frentes</div>
                        <div className="font-semibold text-lg text-slate-900">{property.front_count}</div>
                      </div>
                    </div>
                  )}
                  {property.year_renovated > 0 && (
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                        <Wrench className="w-6 h-6 text-slate-600" />
                      </div>
                      <div>
                        <div className="text-sm text-slate-500">Renovado em</div>
                        <div className="font-semibold text-lg text-slate-900">{property.year_renovated}</div>
                      </div>
                    </div>
                  )}
                  {property.energy_certificate && (
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                        <Zap className="w-6 h-6 text-slate-600" />
                      </div>
                      <div>
                        <div className="text-sm text-slate-500">Certificado Energético</div>
                        <Badge className={`${energyCertificateColors[property.energy_certificate]} font-bold mt-1`}>
                          {property.energy_certificate === 'isento' ? 'Isento' : property.energy_certificate}
                        </Badge>
                      </div>
                    </div>
                  )}
                  {property.garage && property.garage !== 'none' && (
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                        <span className="text-2xl">🚗</span>
                      </div>
                      <div>
                        <div className="text-sm text-slate-500">Estacionamento</div>
                        <div className="font-semibold text-lg text-slate-900">
                          {property.garage === 'box' ? 'Box' : 
                           property.garage === 'exterior' ? 'Exterior' : 
                           `${property.garage} lugar${parseInt(property.garage) > 1 ? 'es' : ''}`}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {property.finishes && (
                  <div className="mt-6 p-4 bg-amber-50 border-l-4 border-amber-400 rounded">
                    <h4 className="font-semibold text-amber-900 mb-1">Acabamentos</h4>
                    <p className="text-amber-800">{property.finishes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Amenities */}
            {property.amenities && property.amenities.length > 0 && (
              <Card className="shadow-md">
                <CardContent className="p-6 md:p-8">
                  <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                    <Star className="w-6 h-6 text-[#d22630]" />
                    Comodidades
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {property.amenities.map((amenity, idx) => (
                      <div key={idx} className="flex items-center gap-3 text-slate-700 bg-slate-50 px-4 py-3 rounded-lg">
                        <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                        <span className="font-medium">{amenity}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Map */}
            {property.city && (
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <MapPin className="w-6 h-6 text-[#d22630]" />
                    Localização
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-96 rounded-xl overflow-hidden border-2 border-slate-200">
                    <MapContainer 
                      center={[41.1579, -8.6291]} 
                      zoom={13} 
                      style={{ height: '100%', width: '100%' }}
                      scrollWheelZoom={false}
                    >
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      <Marker position={[41.1579, -8.6291]}>
                        <Popup>
                          <strong>{property.title}</strong><br />
                          {property.address}, {property.city}
                        </Popup>
                      </Marker>
                    </MapContainer>
                  </div>
                  <div className="mt-4 p-4 bg-slate-50 rounded-lg">
                    <p className="text-slate-700 font-medium">
                      {property.address && `${property.address}, `}{property.city}, {property.state}
                      {property.zip_code && ` - ${property.zip_code}`}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Owner Management Section */}
            {isOwner && (
              <>
                <PublicationStatus property={property} variant="detailed" />
                
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
              </>
            )}

            {/* Similar Properties */}
            {similarProperties.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-6">Imóveis Semelhantes</h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {similarProperties.map((prop) => (
                    <PropertyCard key={prop.id} property={prop} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Contact Sticky Card */}
          <div>
            <Card className="sticky top-6 shadow-xl border-2 border-[#d22630]">
              <CardContent className="p-6">
                {/* Agent Info */}
                {assignedAgent ? (
                  <div className="mb-6 pb-6 border-b">
                    <h3 className="text-sm font-semibold text-slate-500 uppercase mb-4">Consultor Responsável</h3>
                    <div className="flex items-center gap-4 mb-4">
                      {assignedAgent.photo_url ? (
                        <img 
                          src={assignedAgent.photo_url} 
                          alt={assignedAgent.full_name || assignedAgent.display_name}
                          className="w-16 h-16 rounded-full object-cover border-2 border-slate-200"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center">
                          <User className="w-8 h-8 text-slate-500" />
                        </div>
                      )}
                      <div>
                        <h4 className="font-bold text-slate-900">{assignedAgent.full_name || assignedAgent.display_name}</h4>
                        {assignedAgent.specialization && (
                          <p className="text-sm text-slate-600">{assignedAgent.specialization}</p>
                        )}
                      </div>
                    </div>
                    {assignedAgent.bio && (
                      <p className="text-sm text-slate-600 mb-3">{assignedAgent.bio}</p>
                    )}
                    <div className="space-y-2">
                      {assignedAgent.phone && (
                        <a 
                          href={`tel:${assignedAgent.phone}`}
                          className="flex items-center gap-2 text-slate-700 hover:text-[#d22630] transition-colors"
                        >
                          <Phone className="w-4 h-4" />
                          <span className="font-medium">{assignedAgent.phone}</span>
                        </a>
                      )}
                      {assignedAgent.email && (
                        <a 
                          href={`mailto:${assignedAgent.email}`}
                          className="flex items-center gap-2 text-slate-700 hover:text-[#d22630] transition-colors"
                        >
                          <Mail className="w-4 h-4" />
                          <span className="font-medium text-sm">{assignedAgent.email}</span>
                        </a>
                      )}
                    </div>
                  </div>
                ) : property.assigned_consultant_name || property.assigned_consultant ? (
                  <div className="mb-6 pb-6 border-b">
                    <h3 className="text-sm font-semibold text-slate-500 uppercase mb-4">Consultor Responsável</h3>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center">
                        <User className="w-6 h-6 text-slate-500" />
                      </div>
                      <h4 className="font-bold text-slate-900">
                        {property.assigned_consultant_name || property.assigned_consultant}
                      </h4>
                    </div>
                  </div>
                ) : (
                  <div className="mb-6 pb-6 border-b text-center">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Building2 className="w-8 h-8 text-[#d22630]" />
                    </div>
                    <p className="text-sm text-slate-600">Zugruppe</p>
                  </div>
                )}

                {/* Owner-only: Assignment */}
                {isOwner && (
                  <div className="mb-6 pb-6 border-b space-y-3">
                    <div>
                      <Label className="text-xs text-slate-500 mb-1.5 block">Atribuir Agente</Label>
                      <Select 
                        value={property.agent_id || ""} 
                        onValueChange={handleAgentChange}
                        disabled={updatePropertyMutation.isPending}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecionar..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={null}>Nenhum</SelectItem>
                          {allUsers.map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.full_name || u.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-xs text-slate-500 mb-1.5 block">Visibilidade</Label>
                      <Select 
                        value={property.visibility || "public"} 
                        onValueChange={handleVisibilityChange}
                        disabled={updatePropertyMutation.isPending}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="public">🌐 Público</SelectItem>
                          <SelectItem value="team_only">👥 Apenas Equipa</SelectItem>
                          <SelectItem value="private">🔒 Privado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {/* Contact Form */}
                {!isOwner && (
                  <>
                    <h3 className="font-bold text-lg text-slate-900 mb-4">Interessado?</h3>
                    
                    {messageSent ? (
                      <div className="text-center py-8 bg-green-50 rounded-xl border-2 border-green-200">
                        <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Check className="w-8 h-8 text-white" />
                        </div>
                        <h5 className="font-bold text-green-900 text-lg mb-2">Mensagem Enviada!</h5>
                        <p className="text-sm text-green-700 mb-4">Entraremos em contacto em menos de 24h.</p>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setMessageSent(false)}
                          className="border-green-600 text-green-700"
                        >
                          Enviar outra mensagem
                        </Button>
                      </div>
                    ) : (
                      <form onSubmit={handleContactSubmit} className="space-y-4">
                        <div>
                          <Label htmlFor="name" className="text-sm font-medium">Nome *</Label>
                          <Input
                            id="name"
                            required
                            value={contactForm.name}
                            onChange={(e) => setContactForm({...contactForm, name: e.target.value})}
                            placeholder="O seu nome completo"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="email" className="text-sm font-medium">Email *</Label>
                          <Input
                            id="email"
                            type="email"
                            required
                            value={contactForm.email}
                            onChange={(e) => setContactForm({...contactForm, email: e.target.value})}
                            placeholder="seu.email@exemplo.com"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="phone" className="text-sm font-medium">Telefone *</Label>
                          <Input
                            id="phone"
                            required
                            value={contactForm.phone}
                            onChange={(e) => setContactForm({...contactForm, phone: e.target.value})}
                            placeholder="+351 912 345 678"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="message" className="text-sm font-medium">Mensagem *</Label>
                          <Textarea
                            id="message"
                            required
                            value={contactForm.message}
                            onChange={(e) => setContactForm({...contactForm, message: e.target.value})}
                            placeholder={`Tenho interesse neste imóvel. Gostaria de saber mais informações...`}
                            rows={4}
                            className="mt-1 resize-none"
                          />
                        </div>
                        <Button 
                          type="submit" 
                          className="w-full bg-[#d22630] hover:bg-[#a01d26] text-white h-12 text-base font-semibold shadow-lg"
                          disabled={sendingMessage}
                        >
                          {sendingMessage ? (
                            <>
                              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                              A enviar...
                            </>
                          ) : (
                            <>
                              <Send className="w-5 h-5 mr-2" />
                              Quero Saber Mais
                            </>
                          )}
                        </Button>
                        
                        <div className="flex gap-2 pt-2">
                          <Button
                            type="button"
                            variant="outline"
                            className="flex-1 border-2 border-[#d22630] text-[#d22630] hover:bg-[#d22630] hover:text-white"
                            asChild
                          >
                            <a href="tel:+351123456789">
                              <Phone className="w-4 h-4 mr-2" />
                              Ligar
                            </a>
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className="flex-1 border-2 border-green-600 text-green-700 hover:bg-green-600 hover:text-white"
                            onClick={handleWhatsAppShare}
                          >
                            <MessageCircle className="w-4 h-4 mr-2" />
                            WhatsApp
                          </Button>
                        </div>
                        
                        <p className="text-xs text-center text-slate-500 mt-3">
                          ✓ Resposta garantida em 24h
                        </p>
                      </form>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      
      {/* Fullscreen Gallery Modal */}
      <Dialog open={galleryOpen} onOpenChange={setGalleryOpen}>
        <DialogContent className="max-w-7xl w-full h-[95vh] p-0 bg-black">
          <div className="relative w-full h-full flex items-center justify-center">
            <button
              onClick={() => setGalleryOpen(false)}
              className="absolute top-4 right-4 z-10 w-12 h-12 bg-white/20 hover:bg-white/40 rounded-full flex items-center justify-center text-white transition-all"
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
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-14 h-14 bg-white/20 hover:bg-white/40 rounded-full flex items-center justify-center text-white transition-all"
                >
                  <ChevronLeft className="w-8 h-8" />
                </button>
                <button
                  onClick={() => navigateGallery('next')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-14 h-14 bg-white/20 hover:bg-white/40 rounded-full flex items-center justify-center text-white transition-all"
                >
                  <ChevronRight className="w-8 h-8" />
                </button>
              </>
            )}
            
            {/* Image Counter & Thumbnails */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3">
              <div className="bg-black/70 text-white px-4 py-2 rounded-full text-sm font-medium">
                {selectedImage + 1} / {images.length}
              </div>
              <div className="flex gap-2 bg-black/50 p-2 rounded-lg max-w-[90vw] overflow-x-auto">
                {images.slice(0, 10).map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`flex-shrink-0 w-16 h-12 rounded overflow-hidden border-2 transition-all ${
                      selectedImage === idx ? 'border-white' : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
                {images.length > 10 && (
                  <div className="flex-shrink-0 w-16 h-12 rounded bg-white/20 flex items-center justify-center text-white text-xs">
                    +{images.length - 10}
                  </div>
                )}
              </div>
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
  );
}