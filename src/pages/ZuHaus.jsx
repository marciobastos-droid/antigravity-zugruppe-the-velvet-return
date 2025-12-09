import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import SEOHead from "../components/seo/SEOHead";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  Search, MapPin, Home, Phone, Mail, Euro, Bed, Bath, Maximize,
  Heart, Share2, MessageCircle, Star, ChevronRight, Check, ArrowRight
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
import LazyImage from "../components/common/LazyImage";

export default function ZuHaus() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = React.useState("");
  const [city, setCity] = React.useState("all");
  const [listingType, setListingType] = React.useState("all");
  const [priceMin, setPriceMin] = React.useState("");
  const [priceMax, setPriceMax] = React.useState("");
  const [bedrooms, setBedrooms] = React.useState("all");
  const [contactDialogOpen, setContactDialogOpen] = React.useState(false);
  const [selectedProperty, setSelectedProperty] = React.useState(null);

  const { data: properties = [], isLoading } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list('-created_date')
  });

  const RESIDENTIAL_TYPES = ['apartment', 'house', 'condo', 'townhouse', 'farm'];
  
  const filteredProperties = React.useMemo(() => {
    return properties.filter(p => {
      const publishedPages = Array.isArray(p.published_pages) ? p.published_pages : [];
      const isPublished = publishedPages.includes("zuhaus");
      const isResidential = RESIDENTIAL_TYPES.includes(p.property_type);
      const isActive = p.status === 'active';
      
      const matchesSearch = !searchTerm || 
        p.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.address?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCity = city === "all" || p.city === city;
      const matchesListingType = listingType === "all" || p.listing_type === listingType;
      const matchesBedrooms = bedrooms === "all" || 
        (bedrooms === "4+" ? p.bedrooms >= 4 : p.bedrooms === parseInt(bedrooms));
      
      const matchesPrice = 
        (!priceMin || p.price >= Number(priceMin)) &&
        (!priceMax || p.price <= Number(priceMax));
      
      return isPublished && isResidential && isActive && matchesSearch && matchesCity && 
             matchesListingType && matchesPrice && matchesBedrooms;
    });
  }, [properties, searchTerm, city, listingType, priceMin, priceMax, bedrooms]);

  const allCities = [...new Set(properties
    .filter(p => RESIDENTIAL_TYPES.includes(p.property_type))
    .map(p => p.city)
    .filter(Boolean))].sort();

  const featuredProperties = filteredProperties.filter(p => p.featured).slice(0, 3);

  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleContactSubmit = async (formData) => {
    setIsSubmitting(true);
    try {
      await base44.entities.Opportunity.create({
        lead_type: "comprador",
        buyer_name: formData.name,
        buyer_email: formData.email,
        buyer_phone: formData.phone,
        message: `[ZuHaus] ${formData.message}\n\nImóvel de interesse: ${selectedProperty?.title || 'Geral'}`,
        property_id: selectedProperty?.id || null,
        property_title: selectedProperty?.title || null,
        status: "new",
        lead_source: "website"
      });
      toast.success("Mensagem enviada com sucesso!");
      setTimeout(() => {
        setContactDialogOpen(false);
        setSelectedProperty(null);
      }, 2000);
    } catch (error) {
      toast.error("Erro ao enviar mensagem.");
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePropertyContact = (property) => {
    setSelectedProperty(property);
    setContactDialogOpen(true);
  };

  const defaultMessage = selectedProperty 
    ? `Estou interessado no imóvel "${selectedProperty.title}"${selectedProperty.ref_id ? ` - Ref: ${selectedProperty.ref_id}` : ''}`
    : "Gostaria de obter mais informações sobre os vossos imóveis.";

  const propertyTypeLabels = {
    apartment: "Apartamento",
    house: "Moradia",
    condo: "Condomínio",
    townhouse: "Casa Geminada",
    farm: "Quinta/Herdade"
  };

  return (
    <div className="min-h-screen bg-white">
      <SEOHead
        title="ZuHaus - Imóveis Residenciais Premium"
        description="A sua casa de sonho está aqui. Apartamentos, moradias e condomínios cuidadosamente selecionados para você e sua família em Portugal."
        keywords="imóveis residenciais, apartamentos, moradias, casas, T1, T2, T3, T4, venda, arrendamento, Portugal"
        image="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6915a593b6edd8435f5838bd/a0e94a9a1_ZUHAUS_branco_vermelho-trasnparente_c-slogan.png"
      />
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#000000] via-[#2a2a2a] to-[#d22630]">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1600')] bg-cover bg-center opacity-20" />
        
        <div className="relative max-w-7xl mx-auto px-4 py-12 md:py-20">
          <div className="text-center mb-8">
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6915a593b6edd8435f5838bd/a0e94a9a1_ZUHAUS_branco_vermelho-trasnparente_c-slogan.png"
              alt="ZuHaus"
              className="h-20 md:h-28 lg:h-36 w-auto object-contain mx-auto mb-6"
            />
            <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold text-white mb-3">
              A Sua Casa de Sonho Está Aqui
            </h1>
            <p className="text-lg md:text-xl text-slate-200 max-w-2xl mx-auto">
              Imóveis residenciais cuidadosamente selecionados para você e sua família
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
                  <Select value={listingType} onValueChange={setListingType}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Tipo" />
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
                  
                  <Select value={bedrooms} onValueChange={setBedrooms}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Quartos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Qualquer</SelectItem>
                      <SelectItem value="1">T1</SelectItem>
                      <SelectItem value="2">T2</SelectItem>
                      <SelectItem value="3">T3</SelectItem>
                      <SelectItem value="4+">T4+</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Button className="bg-[#d22630] hover:bg-[#a01d26] h-10 col-span-2 md:col-span-1">
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
              <div className="w-16 h-16 bg-[#d22630] rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-bold text-lg mb-2">Seleção Criteriosa</h3>
              <p className="text-slate-600">Cada imóvel é cuidadosamente avaliado pela nossa equipa</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-[#d22630] rounded-full flex items-center justify-center mx-auto mb-4">
                <Phone className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-bold text-lg mb-2">Apoio Personalizado</h3>
              <p className="text-slate-600">Consultores dedicados em cada passo do processo</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-[#d22630] rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-bold text-lg mb-2">Experiência Premium</h3>
              <p className="text-slate-600">Serviço de excelência do início ao fim</p>
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
                <h2 className="text-3xl font-bold text-slate-900 mb-2">Imóveis em Destaque</h2>
                <p className="text-slate-600">As melhores oportunidades do momento</p>
              </div>
              <Star className="w-8 h-8 text-amber-400 fill-amber-400" />
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {featuredProperties.map(property => (
                <PropertyCardEnhanced 
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
                Visualize todos os imóveis disponíveis geograficamente
              </p>
            </div>
            <PropertiesMap 
              properties={filteredProperties} 
              brandColor="#d22630"
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
              className="border-[#d22630] text-[#d22630] hover:bg-[#d22630] hover:text-white"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Contacte-nos
            </Button>
          </div>

          {filteredProperties.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProperties.map(property => (
                <PropertyCardEnhanced 
                  key={property.id} 
                  property={property}
                  onContact={handlePropertyContact}
                />
              ))}
            </div>
          ) : (
            <Card className="text-center py-16">
              <CardContent>
                <Home className="w-20 h-20 text-slate-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-slate-900 mb-2">
                  Nenhum imóvel encontrado
                </h3>
                <p className="text-slate-600 mb-6">
                  Tente ajustar os filtros ou contacte-nos para encontrar o imóvel ideal
                </p>
                <Button 
                  onClick={() => setContactDialogOpen(true)}
                  className="bg-[#d22630] hover:bg-[#a01d26]"
                >
                  Falar com um Consultor
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-[#d22630] to-[#a01d26] py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Não Encontrou o que Procura?
          </h2>
          <p className="text-xl text-slate-100 mb-8">
            A nossa equipa pode ajudá-lo a encontrar a casa perfeita
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg"
              onClick={() => setContactDialogOpen(true)}
              className="bg-white text-[#d22630] hover:bg-slate-100 text-lg px-8"
            >
              <MessageCircle className="w-5 h-5 mr-2" />
              Contactar Agora
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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl">Contacte-nos</DialogTitle>
            <p className="text-sm text-slate-600">
              Preencha o formulário e entraremos em contacto brevemente
            </p>
          </DialogHeader>
          <ContactFormEnhanced
            onSubmit={handleContactSubmit}
            isSubmitting={isSubmitting}
            selectedProperty={selectedProperty}
            defaultMessage={defaultMessage}
            brandColor="#d22630"
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

const PropertyCardEnhanced = React.memo(({ property, onContact }) => {
  const [imgIndex, setImgIndex] = React.useState(0);
  const images = property.images?.length > 0 ? property.images : [];

  const propertyTypeLabels = {
    apartment: "Apartamento",
    house: "Moradia",
    condo: "Condomínio",
    townhouse: "Casa Geminada",
    farm: "Quinta/Herdade"
  };

  return (
    <Card className="group overflow-hidden hover:shadow-xl transition-all duration-300">
      <div className="relative">
        <Link to={`${createPageUrl("PropertyDetails")}?id=${property.id}`}>
          <div className="relative h-56 overflow-hidden bg-slate-100">
            {images[imgIndex] ? (
              <LazyImage
                src={images[imgIndex]}
                alt={property.title}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
                <Home className="w-16 h-16 text-slate-300" />
              </div>
            )}
            <div className="absolute top-3 left-3">
              <Badge className="bg-white text-slate-900 border-0">
                {property.listing_type === 'sale' ? 'Venda' : 'Arrendamento'}
              </Badge>
            </div>
            {property.featured && (
              <div className="absolute top-3 right-3">
                <Badge className="bg-amber-400 text-slate-900 border-0">
                  <Star className="w-3 h-3 mr-1 fill-current" />
                  Destaque
                </Badge>
              </div>
            )}
            
            {images.length > 1 && (
              <>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                  {images.slice(0, 5).map((_, i) => (
                    <button
                      key={i}
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setImgIndex(i); }}
                      className={`w-1.5 h-1.5 rounded-full transition-all ${i === imgIndex ? 'bg-white w-4' : 'bg-white/60'}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </Link>
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
          <div className="text-lg font-bold text-white">
            {CURRENCY_SYMBOLS[property.currency] || '€'}{property.price?.toLocaleString()}
            {property.listing_type === 'rent' && <span className="text-sm font-normal">/mês</span>}
          </div>
          {property.currency && property.currency !== 'EUR' && (() => {
            const eurValue = convertToEUR(property.price, property.currency);
            return eurValue ? (
              <div className="text-xs text-white/90 mt-1">
                ≈ €{eurValue.toLocaleString()} {property.listing_type === 'rent' && '/mês'}
              </div>
            ) : null;
          })()}
        </div>
      </div>

      <CardContent className="p-4">
        <Link to={`${createPageUrl("PropertyDetails")}?id=${property.id}`}>
          <h3 className="font-bold text-slate-900 line-clamp-1 mb-1 group-hover:text-[#d22630] transition-colors">
            {property.title}
          </h3>
          <p className="text-sm text-slate-600 flex items-center gap-1 mb-3">
            <MapPin className="w-4 h-4" />
            {property.city}
          </p>
        </Link>

        <div className="flex items-center gap-4 text-sm text-slate-600 mb-3 pb-3 border-b">
          {property.bedrooms > 0 && (
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

        <div className="flex gap-2">
          <Link to={`${createPageUrl("PropertyDetails")}?id=${property.id}`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full">
              Ver Detalhes
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
          <Button 
            size="sm" 
            onClick={(e) => {
              e.stopPropagation();
              onContact(property);
            }}
            className="bg-[#d22630] hover:bg-[#a01d26]"
          >
            <MessageCircle className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});