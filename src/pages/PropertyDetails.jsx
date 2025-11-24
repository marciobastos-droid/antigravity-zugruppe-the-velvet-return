import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  ArrowLeft, MapPin, Bed, Bath, Maximize, Calendar, 
  Home, Star, Heart, Edit, ExternalLink, Hash, MessageCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
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

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <Link to={createPageUrl("Browse")}>
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar aos Anúncios
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
              Partilhar WhatsApp
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-200">
            <div className="relative h-96 md:h-[600px]">
              <img
                src={images[selectedImage]}
                alt={property.title}
                className="w-full h-full object-cover"
              />
              {property.featured && (
                <Badge className="absolute top-4 left-4 bg-amber-400 text-slate-900 border-0">
                  <Star className="w-3 h-3 mr-1 fill-current" />
                  Destaque
                </Badge>
              )}
            </div>
            {images.length > 1 && (
              <div className="grid grid-cols-4 gap-2 p-4">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`h-24 rounded-lg overflow-hidden border-2 transition-all ${
                      selectedImage === idx ? 'border-amber-400' : 'border-transparent'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <Card>
            <CardContent className="p-8">
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <h1 className="text-4xl font-bold text-slate-900 mb-3">{property.title}</h1>
                  <div className="flex items-center text-slate-600 text-lg mb-3">
                    <MapPin className="w-5 h-5 mr-2" />
                    {property.address}, {property.city}, {property.state} {property.zip_code}
                  </div>
                  
                  {(property.external_id || property.source_url) && (
                    <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-slate-200">
                      {property.external_id && (
                        <Badge variant="secondary" className="text-sm">
                          <Hash className="w-4 h-4 mr-1" />
                          ID: {property.external_id}
                        </Badge>
                      )}
                      {property.source_url && (
                        <a
                          href={property.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex"
                        >
                          <Badge variant="secondary" className="text-sm hover:bg-blue-100 cursor-pointer">
                            <ExternalLink className="w-4 h-4 mr-1" />
                            Ver Anúncio Original
                          </Badge>
                        </a>
                      )}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-4xl font-bold text-slate-900">
                    €{property.price?.toLocaleString()}
                  </div>
                  <Badge className="mt-2">
                    {property.listing_type === 'sale' ? 'Venda' : 'Arrendamento'}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-6 border-y border-slate-200">
                <div className="text-center">
                  <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <Bed className="w-6 h-6 text-slate-700" />
                  </div>
                  <div className="text-2xl font-bold text-slate-900">{property.bedrooms || 0}</div>
                  <div className="text-sm text-slate-600">Quartos</div>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <Bath className="w-6 h-6 text-slate-700" />
                  </div>
                  <div className="text-2xl font-bold text-slate-900">{property.bathrooms || 0}</div>
                  <div className="text-sm text-slate-600">Casas de Banho</div>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <Maximize className="w-6 h-6 text-slate-700" />
                  </div>
                  <div className="text-2xl font-bold text-slate-900">
                    {property.square_feet?.toLocaleString() || 0}
                  </div>
                  <div className="text-sm text-slate-600">m²</div>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <Calendar className="w-6 h-6 text-slate-700" />
                  </div>
                  <div className="text-2xl font-bold text-slate-900">{property.year_built || 'N/A'}</div>
                  <div className="text-sm text-slate-600">Ano</div>
                </div>
              </div>

              {property.energy_certificate && (
                <div className="mt-6 flex items-center gap-3">
                  <h3 className="text-lg font-semibold text-slate-900">Certificado Energético:</h3>
                  <Badge className={`text-lg px-4 py-2 font-bold ${energyCertificateColors[property.energy_certificate]}`}>
                    {property.energy_certificate === 'isento' ? 'Isento' : property.energy_certificate}
                  </Badge>
                </div>
              )}

              <div className="mt-6">
                <h2 className="text-2xl font-bold text-slate-900 mb-4">Sobre Este Imóvel</h2>
                <p className="text-slate-700 leading-relaxed whitespace-pre-line">
                  {property.description || 'Sem descrição disponível.'}
                </p>
              </div>

              <div className="mt-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Tipo de Imóvel</h3>
                <Badge variant="outline" className="text-base">
                  <Home className="w-4 h-4 mr-2" />
                  {property.property_type === 'house' ? 'Moradia' : 
                   property.property_type === 'apartment' ? 'Apartamento' :
                   property.property_type === 'condo' ? 'Condomínio' :
                   property.property_type === 'townhouse' ? 'Casa Geminada' :
                   property.property_type === 'building' ? 'Prédio' :
                   property.property_type === 'land' ? 'Terreno' :
                   property.property_type === 'commercial' ? 'Comercial' :
                   property.property_type?.charAt(0).toUpperCase() + property.property_type?.slice(1)}
                </Badge>
              </div>

              {property.amenities && property.amenities.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">Comodidades</h3>
                  <div className="flex flex-wrap gap-2">
                    {property.amenities.map((amenity, idx) => (
                      <Badge key={idx} variant="secondary">
                        {amenity}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

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

          {similarProperties.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Imóveis Semelhantes</CardTitle>
                <p className="text-sm text-slate-600">
                  Outros imóveis na mesma zona
                </p>
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
        
        <EditPropertyDialog
          property={editingProperty}
          open={!!editingProperty}
          onOpenChange={(open) => !open && setEditingProperty(null)}
        />
      </div>
    </div>
  );
}