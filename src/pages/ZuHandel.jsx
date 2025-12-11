import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import SEOHead from "../components/seo/SEOHead";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  Search, MapPin, Building2, Phone, Mail, Euro, Maximize,
  MessageCircle, Star, ChevronRight, Check, ArrowRight, TrendingUp, Users, Award
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import ContactFormEnhanced from "../components/forms/ContactFormEnhanced";
import { CURRENCY_SYMBOLS, convertToEUR } from "../components/utils/currencyConverter";
import PropertiesMap from "../components/maps/PropertiesMap";
import OptimizedImage from "../components/common/OptimizedImage";

export default function ZuHandel() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = React.useState("");
  const [city, setCity] = React.useState("all");
  const [listingType, setListingType] = React.useState("all");
  const [propertyType, setPropertyType] = React.useState("all");
  const [priceMin, setPriceMin] = React.useState("");
  const [priceMax, setPriceMax] = React.useState("");
  const [contactDialogOpen, setContactDialogOpen] = React.useState(false);
  const [selectedProperty, setSelectedProperty] = React.useState(null);

  const { data: properties = [], isLoading } = useQuery({
    queryKey: ['properties', 'zuhandel'],
    queryFn: () => base44.entities.Property.list('-created_date'),
    staleTime: 0 // Force refresh on navigation
  });

  const COMMERCIAL_TYPES = ['store', 'warehouse', 'office', 'building'];
  
  const filteredProperties = React.useMemo(() => {
    return properties.filter(p => {
      const publishedPages = Array.isArray(p.published_pages) ? p.published_pages : [];
      const isPublished = publishedPages.includes("zuhandel");
      const isCommercial = COMMERCIAL_TYPES.includes(p.property_type);
      const isActive = p.status === 'active';
      
      const matchesSearch = !searchTerm || 
        p.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.address?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCity = city === "all" || p.city === city;
      const matchesListingType = listingType === "all" || p.listing_type === listingType;
      const matchesPropertyType = propertyType === "all" || p.property_type === propertyType;
      
      const matchesPrice = 
        (!priceMin || p.price >= Number(priceMin)) &&
        (!priceMax || p.price <= Number(priceMax));
      
      return isPublished && isCommercial && isActive && matchesSearch && matchesCity && 
             matchesListingType && matchesPropertyType && matchesPrice;
    });
  }, [properties, searchTerm, city, listingType, propertyType, priceMin, priceMax]);

  const allCities = [...new Set(properties
    .filter(p => COMMERCIAL_TYPES.includes(p.property_type))
    .map(p => p.city)
    .filter(Boolean))].sort();

  const featuredProperties = filteredProperties.filter(p => p.featured).slice(0, 3);

  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleContactSubmit = async (formData) => {
    setIsSubmitting(true);
    try {
      const response = await base44.functions.invoke('submitPublicContact', {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        company: formData.company,
        message: formData.message,
        property_id: selectedProperty?.id,
        property_title: selectedProperty?.title,
        source_page: 'ZuHandel'
      });

      toast.success("Mensagem enviada com sucesso!");
      setContactDialogOpen(false);
      setSelectedProperty(null);
      setIsSubmitting(false);
    } catch (error) {
      console.error('[ZuHandel] Error sending message:', error);
      setIsSubmitting(false);
      toast.error("Erro ao enviar mensagem. Por favor tente novamente.");
    }
  };

  const handlePropertyContact = (property) => {
    setSelectedProperty(property);
    setContactDialogOpen(true);
  };

  const defaultMessage = selectedProperty 
    ? `Estou interessado no imóvel comercial "${selectedProperty.title}"${selectedProperty.ref_id ? ` - Ref: ${selectedProperty.ref_id}` : ''}`
    : "Gostaria de obter mais informações sobre os vossos espaços comerciais.";

  const propertyTypeLabels = {
    store: "Loja",
    warehouse: "Armazém",
    office: "Escritório",
    building: "Prédio"
  };

  return (
    <div className="min-h-screen bg-white">
      <SEOHead
        title="ZuHandel - Espaços Comerciais de Excelência"
        description="Encontre o espaço comercial ideal para o seu negócio. Lojas, escritórios, armazéns e prédios nas melhores localizações comerciais de Portugal."
        keywords="espaços comerciais, lojas, escritórios, armazéns, imóveis comerciais, negócios, venda, arrendamento, Portugal"
        image="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6915a593b6edd8435f5838bd/fbf7ef631_WaterMarkZuHandel.png"
      />
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#000000] via-[#2a2a2a] to-[#75787b]">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1600')] bg-cover bg-center opacity-20" />
        
        <div className="relative max-w-7xl mx-auto px-4 py-12 md:py-20">
          <div className="text-center mb-8">
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6915a593b6edd8435f5838bd/fbf7ef631_WaterMarkZuHandel.png"
              alt="ZuHandel"
              className="h-20 md:h-28 lg:h-36 w-auto object-contain mx-auto mb-6"
            />
            <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold text-white mb-3">
              Espaços Comerciais de Excelência
            </h1>
            <p className="text-lg md:text-xl text-slate-200 max-w-2xl mx-auto">
              Encontre o espaço ideal para o seu negócio prosperar
            </p>
          </div>

          {/* Search Box */}
          <Card className="max-w-4xl mx-auto shadow-2xl">
            <CardContent className="p-4 md:p-6">
              <div className="space-y-3">
                <div className="flex flex-col md:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <Input
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Pesquisar por localização, título..."
                      className="pl-12 h-12 text-base"
                    />
                  </div>
                  <Select value={city} onValueChange={setCity}>
                    <SelectTrigger className="w-full md:w-48 h-12">
                      <MapPin className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Cidade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {allCities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <Select value={propertyType} onValueChange={setPropertyType}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os tipos</SelectItem>
                      <SelectItem value="store">Loja</SelectItem>
                      <SelectItem value="office">Escritório</SelectItem>
                      <SelectItem value="warehouse">Armazém</SelectItem>
                      <SelectItem value="building">Prédio</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={listingType} onValueChange={setListingType}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Negócio" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Comprar ou Arrendar</SelectItem>
                      <SelectItem value="sale">Comprar</SelectItem>
                      <SelectItem value="rent">Arrendar</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Input
                    type="number"
                    placeholder="Preço Mín (€)"
                    value={priceMin}
                    onChange={(e) => setPriceMin(e.target.value)}
                    className="h-10"
                  />
                  
                  <Input
                    type="number"
                    placeholder="Preço Máx (€)"
                    value={priceMax}
                    onChange={(e) => setPriceMax(e.target.value)}
                    className="h-10"
                  />
                  
                  <Button className="bg-[#75787b] hover:bg-[#5a5c5e] h-10 col-span-2 md:col-span-1">
                    <Search className="w-4 h-4 mr-2" />
                    Pesquisar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-slate-50 py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-[#75787b] rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-bold text-lg mb-2">Localizações Premium</h3>
              <p className="text-slate-600">Espaços nas melhores zonas comerciais</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-[#75787b] rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-bold text-lg mb-2">Consultoria Especializada</h3>
              <p className="text-slate-600">Expertise em imóveis comerciais</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-[#75787b] rounded-full flex items-center justify-center mx-auto mb-4">
                <Award className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-bold text-lg mb-2">Soluções À Medida</h3>
              <p className="text-slate-600">Adaptadas às necessidades do seu negócio</p>
            </div>
          </div>
        </div>
      </div>

      {/* Featured Properties */}
      {featuredProperties.length > 0 && (
        <div className="py-12 bg-white">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold text-slate-900 mb-2">Oportunidades em Destaque</h2>
                <p className="text-slate-600">Os melhores espaços comerciais disponíveis</p>
              </div>
              <Star className="w-8 h-8 text-amber-400 fill-amber-400" />
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {featuredProperties.map(property => (
                <CommercialPropertyCard 
                  key={property.id} 
                  property={property} 
                  onContact={handlePropertyContact}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Interactive Map Section */}
      {filteredProperties.length > 0 && (
        <div className="py-12 bg-white">
          <div className="max-w-7xl mx-auto px-4">
            <div className="mb-6">
              <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">
                Explore no Mapa
              </h2>
              <p className="text-slate-600">
                Visualize todos os espaços comerciais disponíveis geograficamente
              </p>
            </div>
            <PropertiesMap 
              properties={filteredProperties} 
              brandColor="#75787b"
              height="500px"
            />
          </div>
        </div>
      )}

      {/* All Properties */}
      <div className="py-12 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900">
              {filteredProperties.length} {filteredProperties.length === 1 ? 'Imóvel Disponível' : 'Imóveis Disponíveis'}
            </h2>
            <Button 
              onClick={() => setContactDialogOpen(true)}
              variant="outline"
              className="border-[#75787b] text-[#75787b] hover:bg-[#75787b] hover:text-white"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Contacte-nos
            </Button>
          </div>

          {filteredProperties.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProperties.map(property => (
                <CommercialPropertyCard 
                  key={property.id} 
                  property={property}
                  onContact={handlePropertyContact}
                />
              ))}
            </div>
          ) : (
            <Card className="text-center py-16">
              <CardContent>
                <Building2 className="w-20 h-20 text-slate-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-slate-900 mb-2">
                  Nenhum imóvel encontrado
                </h3>
                <p className="text-slate-600 mb-6">
                  Tente ajustar os filtros ou contacte-nos para encontrar o espaço ideal
                </p>
                <Button 
                  onClick={() => setContactDialogOpen(true)}
                  className="bg-[#75787b] hover:bg-[#5a5c5e]"
                >
                  Falar com um Especialista
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-[#75787b] to-[#5a5c5e] py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Procura um Espaço Específico?
          </h2>
          <p className="text-xl text-slate-100 mb-8">
            Os nossos especialistas em comercial podem ajudá-lo
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg"
              onClick={() => setContactDialogOpen(true)}
              className="bg-white text-[#75787b] hover:bg-slate-100 text-lg px-8"
            >
              <MessageCircle className="w-5 h-5 mr-2" />
              Contactar Especialista
            </Button>
            <Button 
              size="lg"
              variant="outline"
              className="border-2 border-white text-white hover:bg-white/10 text-lg px-8"
              asChild
            >
              <a href="tel:+351123456789">
                <Phone className="w-5 h-5 mr-2" />
                (+351) 123 456 789
              </a>
            </Button>
          </div>
        </div>
      </div>

      {/* Contact Dialog */}
      <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader className="pb-2 sm:pb-4">
            <DialogTitle className="text-lg sm:text-2xl">Contacte os Nossos Especialistas</DialogTitle>
            <p className="text-xs sm:text-sm text-slate-600">
              Preencha o formulário e entraremos em contacto brevemente
            </p>
          </DialogHeader>
          <ContactFormEnhanced
            onSubmit={handleContactSubmit}
            isSubmitting={isSubmitting}
            showCompanyField={true}
            selectedProperty={selectedProperty}
            defaultMessage={defaultMessage}
            brandColor="#75787b"
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

const CommercialPropertyCard = React.memo(({ property, onContact }) => {
  const [imgIndex, setImgIndex] = React.useState(0);
  const images = property.images?.length > 0 ? property.images : [];

  const propertyTypeLabels = {
    store: "Loja",
    warehouse: "Armazém",
    office: "Escritório",
    building: "Prédio"
  };

  return (
    <Card className="group overflow-hidden hover:shadow-xl transition-all duration-300 h-full flex flex-col">
      <div className="relative">
        <Link to={`${createPageUrl("PropertyDetails")}?id=${property.id}`}>
          <div className="relative h-48 sm:h-56 overflow-hidden bg-slate-100">
            {images[imgIndex] ? (
              <OptimizedImage
                src={images[imgIndex]}
                alt={property.title}
                className="w-full h-full"
                priority={imgIndex === 0}
                fallbackIcon={Building2}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
                <Building2 className="w-12 h-12 sm:w-16 sm:h-16 text-slate-300" />
              </div>
            )}
            <div className="absolute top-2 sm:top-3 left-2 sm:left-3 flex gap-1.5 flex-wrap max-w-[calc(100%-1rem)]">
              <Badge className="bg-white text-slate-900 border-0 text-xs">
                {propertyTypeLabels[property.property_type]}
              </Badge>
              <Badge className={`text-xs ${property.listing_type === 'sale' ? 'bg-green-500' : 'bg-blue-500'}`}>
                {property.listing_type === 'sale' ? 'Venda' : 'Arrendamento'}
              </Badge>
            </div>
            {property.featured && (
              <div className="absolute top-2 sm:top-3 right-2 sm:right-3">
                <Badge className="bg-amber-400 text-slate-900 border-0 text-xs">
                  <Star className="w-3 h-3 mr-1 fill-current" />
                  Destaque
                </Badge>
              </div>
            )}
            
            {images.length > 1 && (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                {images.slice(0, 5).map((_, i) => (
                  <button
                    key={i}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setImgIndex(i); }}
                    className={`w-2 h-2 sm:w-1.5 sm:h-1.5 rounded-full transition-all touch-manipulation ${i === imgIndex ? 'bg-white w-4 sm:w-4' : 'bg-white/60'}`}
                  />
                ))}
              </div>
            )}
          </div>
        </Link>
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3 sm:p-4">
          <div className="text-base sm:text-lg font-bold text-white">
            {CURRENCY_SYMBOLS[property.currency] || '€'}{property.price?.toLocaleString()}
            {property.listing_type === 'rent' && <span className="text-xs sm:text-sm font-normal">/mês</span>}
          </div>
          {property.currency && property.currency !== 'EUR' && (() => {
            const eurValue = convertToEUR(property.price, property.currency);
            return eurValue ? (
              <div className="text-xs text-white/90 mt-0.5 sm:mt-1">
                ≈ €{eurValue.toLocaleString()} {property.listing_type === 'rent' && '/mês'}
              </div>
            ) : null;
          })()}
        </div>
      </div>

      <CardContent className="p-3 sm:p-4 flex-1 flex flex-col">
        <Link to={`${createPageUrl("PropertyDetails")}?id=${property.id}`}>
          <h3 className="font-bold text-base sm:text-lg text-slate-900 line-clamp-2 mb-1 group-hover:text-[#75787b] transition-colors min-h-[3rem] sm:min-h-0">
            {property.title}
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 flex items-center gap-1 mb-2 sm:mb-3">
            <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
            <span className="truncate">{property.city}</span>
          </p>
        </Link>

        <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm text-slate-600 mb-2 sm:mb-3 pb-2 sm:pb-3 border-b flex-wrap">
          {(property.useful_area || property.square_feet) > 0 && (
            <span className="flex items-center gap-1">
              <Maximize className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="font-medium">{property.useful_area || property.square_feet}m²</span>
            </span>
          )}
          {property.ref_id && (
            <span className="text-xs font-mono text-slate-500">
              Ref: {property.ref_id}
            </span>
          )}
        </div>

        <div className="flex gap-2 mt-auto">
          <Link to={`${createPageUrl("PropertyDetails")}?id=${property.id}`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full h-9 sm:h-10 text-xs sm:text-sm touch-manipulation active:scale-95 transition-transform">
              Ver Detalhes
              <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-1 sm:ml-2" />
            </Button>
          </Link>
          <Button 
            size="sm" 
            onClick={(e) => {
              e.stopPropagation();
              onContact(property);
            }}
            className="bg-[#75787b] hover:bg-[#5a5c5e] h-9 sm:h-10 px-3 sm:px-4 touch-manipulation active:scale-95 transition-transform"
          >
            <MessageCircle className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});