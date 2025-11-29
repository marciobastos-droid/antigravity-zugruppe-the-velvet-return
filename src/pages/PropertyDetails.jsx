import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  ArrowLeft, MapPin, Bed, Bath, Maximize, Calendar, 
  Home, Star, Heart, Edit, ExternalLink, Hash, MessageCircle,
  Phone, Mail, User, ChevronLeft, ChevronRight, X,
  Building2, Ruler, Zap, Wrench, Send, Loader2, Check
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
import DocumentManager from "../components/property/DocumentManager";

export default function PropertyDetails() {
  const urlParams = new URLSearchParams(window.location.search);
  const propertyId = urlParams.get('id');
  
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

  const { data: property, isLoading } = useQuery({
    queryKey: ['property', propertyId],
    queryFn: async () => {
      const properties = await base44.entities.Property.list();
      return properties.find(p => p.id === propertyId);
    },
    enabled: !!propertyId
  });

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me(),
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
    queryFn: () => base44.entities.Property.list(),
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: () => base44.entities.Agent.list(),
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

  if (!property) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Imóvel não encontrado</h2>
          <Link to={createPageUrl("Browse")}>
            <Button>Voltar à Navegação</Button>
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

  const isOwner = user && property.created_by === user.email;
  
  // Find assigned agent
  const assignedAgent = agents.find(a => a.id === property.agent_id || a.email === property.agent_id);

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
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </Link>
          
          <div className="flex gap-2">
            {user && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className={isSaved ? "border-red-500 text-red-600" : ""}
              >
                <Heart className={`w-4 h-4 ${isSaved ? "fill-current" : ""}`} />
              </Button>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleWhatsAppShare}
              className="bg-green-500 hover:bg-green-600 text-white border-0"
            >
              <MessageCircle className="w-4 h-4" />
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
                      onClick={(e) => { e.stopPropagation(); navigateGallery('prev'); }}
                      className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); navigateGallery('next'); }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>
                  </>
                )}
                
                {/* Image Counter */}
                <div className="absolute bottom-4 right-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm">
                  {selectedImage + 1} / {images.length}
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
                {/* Header with Ref ID, Title and Edit Button */}
                <div className="mb-6">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1">
                      {property.ref_id && (
                        <Badge variant="outline" className="mb-2 text-sm font-mono">
                          <Hash className="w-3 h-3 mr-1" />
                          {property.ref_id}
                        </Badge>
                      )}
                      <h1 className="text-2xl md:text-3xl font-bold text-slate-900">{property.title}</h1>
                    </div>
                    {isOwner && (
                      <Button
                        onClick={() => setEditingProperty(property)}
                        className="bg-blue-600 hover:bg-blue-700 flex-shrink-0"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Editar Imóvel
                      </Button>
                    )}
                  </div>
                  <div className="flex items-center text-slate-600">
                    <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span className="text-sm md:text-base">
                      {property.address && `${property.address}, `}
                      {property.city}, {property.state}
                      {property.zip_code && ` - ${property.zip_code}`}
                      {property.country && property.country !== 'Portugal' && `, ${property.country}`}
                    </span>
                  </div>
                </div>

                {/* Price, Type and Key Features - Compact Layout */}
                <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl p-5 mb-6 text-white">
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                    <div>
                      <div className="text-3xl md:text-4xl font-bold">
                        €{property.price?.toLocaleString()}
                        {property.listing_type === 'rent' && <span className="text-lg font-normal text-slate-300">/mês</span>}
                      </div>
                      <div className="flex gap-2 mt-2">
                        <Badge className="bg-white/20 text-white border-0">
                          {property.listing_type === 'sale' ? 'Venda' : 'Arrendamento'}
                        </Badge>
                        <Badge className="bg-white/10 text-white border-white/30">
                          <Home className="w-3 h-3 mr-1" />
                          {propertyTypeLabels[property.property_type] || property.property_type}
                        </Badge>
                      </div>
                    </div>
                    {property.energy_certificate && (
                      <Badge className={`${energyCertificateColors[property.energy_certificate]} text-lg px-3 py-1`}>
                        {property.energy_certificate === 'isento' ? 'Isento' : property.energy_certificate}
                      </Badge>
                    )}
                  </div>
                  
                  {/* Key Features - Inline */}
                  <div className="grid grid-cols-4 gap-3 pt-4 border-t border-white/20">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1.5 mb-1">
                        <Bed className="w-4 h-4 text-slate-300" />
                        <span className="text-xl font-bold">{property.bedrooms || 0}</span>
                      </div>
                      <div className="text-xs text-slate-400">Quartos</div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1.5 mb-1">
                        <Bath className="w-4 h-4 text-slate-300" />
                        <span className="text-xl font-bold">{property.bathrooms || 0}</span>
                      </div>
                      <div className="text-xs text-slate-400">WCs</div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1.5 mb-1">
                        <Maximize className="w-4 h-4 text-slate-300" />
                        <span className="text-xl font-bold">{property.useful_area || property.square_feet || 0}</span>
                      </div>
                      <div className="text-xs text-slate-400">m²</div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1.5 mb-1">
                        <Calendar className="w-4 h-4 text-slate-300" />
                        <span className="text-xl font-bold">{property.year_built || '-'}</span>
                      </div>
                      <div className="text-xs text-slate-400">Ano</div>
                    </div>
                  </div>
                </div>

                {/* Areas and Details - More Compact */}
                {(property.gross_area > 0 || property.front_count > 0 || property.year_renovated > 0 || property.garage || property.sun_exposure || property.finishes) && (
                <div className="pb-6 border-b border-slate-200">
                  <h3 className="text-base font-semibold text-slate-900 mb-3">Detalhes</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {property.gross_area > 0 && (
                      <div className="flex items-center gap-2 text-sm">
                        <Ruler className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-600">Bruta:</span>
                        <span className="font-medium">{property.gross_area} m²</span>
                      </div>
                    )}
                    {property.front_count > 0 && (
                      <div className="flex items-center gap-2 text-sm">
                        <Building2 className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-600">Frentes:</span>
                        <span className="font-medium">{property.front_count}</span>
                      </div>
                    )}
                    {property.year_renovated > 0 && (
                      <div className="flex items-center gap-2 text-sm">
                        <Wrench className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-600">Renovado:</span>
                        <span className="font-medium">{property.year_renovated}</span>
                      </div>
                    )}
                    {property.garage && property.garage !== 'none' && (
                      <div className="flex items-center gap-2 text-sm">
                        <Home className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-600">Garagem:</span>
                        <span className="font-medium">{property.garage}</span>
                      </div>
                    )}
                  </div>
                  
                  {property.finishes && (
                    <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-sm text-amber-800"><span className="font-medium">Acabamentos:</span> {property.finishes}</p>
                    </div>
                  )}
                </div>
                )}

                {/* Description */}
                <div className="py-5 border-b border-slate-200">
                  <h3 className="text-base font-semibold text-slate-900 mb-2">Descrição</h3>
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                    {property.description || 'Sem descrição disponível.'}
                  </p>
                </div>

                {/* Amenities and Tags - Combined */}
                {((property.amenities && property.amenities.length > 0) || (property.tags && property.tags.length > 0)) && (
                  <div className="py-5 border-b border-slate-200">
                    {property.amenities && property.amenities.length > 0 && (
                      <div className="mb-3">
                        <h3 className="text-base font-semibold text-slate-900 mb-2">Comodidades</h3>
                        <div className="flex flex-wrap gap-1.5">
                          {property.amenities.map((amenity, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs py-1 px-2">
                              <Check className="w-3 h-3 mr-1" />
                              {amenity}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {property.tags && property.tags.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium text-slate-700 mb-2">Tags</h3>
                        <div className="flex flex-wrap gap-1.5">
                          {property.tags.map((tag, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* External Links */}
                {(property.external_id || property.source_url) && (
                  <div className="pt-4">
                    <div className="flex flex-wrap items-center gap-2">
                      {property.external_id && (
                        <Badge variant="outline" className="text-xs">
                          <Hash className="w-3 h-3 mr-1" />
                          {property.external_id}
                        </Badge>
                      )}
                      {property.source_url && (
                        <a href={property.source_url} target="_blank" rel="noopener noreferrer">
                          <Badge variant="outline" className="text-xs hover:bg-blue-50 cursor-pointer">
                            <ExternalLink className="w-3 h-3 mr-1" />
                            Original
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
                  <div className="h-80 rounded-lg overflow-hidden border border-slate-200">
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
                  <p className="text-sm text-slate-500 mt-3">
                    {property.address && `${property.address}, `}{property.city}, {property.state}
                    {property.zip_code && ` - ${property.zip_code}`}
                  </p>
                </CardContent>
              </Card>
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
                      <DocumentManager 
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
            {/* Agent Card - Only show if property is published on portals */}
            {property.published_portals && property.published_portals.length > 0 && (
            <Card className="sticky top-24">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Agente Responsável</CardTitle>
              </CardHeader>
              <CardContent>
                {assignedAgent ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      {assignedAgent.photo_url ? (
                        <img 
                          src={assignedAgent.photo_url} 
                          alt={assignedAgent.full_name}
                          className="w-16 h-16 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center">
                          <User className="w-8 h-8 text-slate-500" />
                        </div>
                      )}
                      <div>
                        <h4 className="font-semibold text-slate-900">{assignedAgent.full_name}</h4>
                        {assignedAgent.specialization && (
                          <p className="text-sm text-slate-600">{assignedAgent.specialization}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      {assignedAgent.phone && (
                        <a 
                          href={`tel:${assignedAgent.phone}`}
                          className="flex items-center gap-2 text-slate-700 hover:text-blue-600"
                        >
                          <Phone className="w-4 h-4" />
                          {assignedAgent.phone}
                        </a>
                      )}
                      {assignedAgent.email && (
                        <a 
                          href={`mailto:${assignedAgent.email}`}
                          className="flex items-center gap-2 text-slate-700 hover:text-blue-600"
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
                ) : (
                  <div className="text-center py-4">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <User className="w-8 h-8 text-slate-400" />
                    </div>
                    <p className="text-slate-600">Agente não atribuído</p>
                  </div>
                )}

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
            )}
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