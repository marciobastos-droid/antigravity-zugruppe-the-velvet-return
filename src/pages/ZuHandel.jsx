import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list('-created_date')
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
      await base44.entities.Opportunity.create({
        lead_type: "comprador",
        buyer_name: formData.name,
        buyer_email: formData.email,
        buyer_phone: formData.phone,
        company_name: formData.company,
        message: `[ZuHandel] ${formData.message}\n\nImóvel de interesse: ${selectedProperty?.title || 'Geral'}`,
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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl">Contacte os Nossos Especialistas</DialogTitle>
            <p className="text-sm text-slate-600">
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

function CommercialPropertyCard({ property, onContact }) {
  const [imgError, setImgError] = React.useState(false);
  const [imgIndex, setImgIndex] = React.useState(0);
  const images = property.images?.length > 0 ? property.images : [];

  const propertyTypeLabels = {
    store: "Loja",
    warehouse: "Armazém",
    office: "Escritório",
    building: "Prédio"
  };

  return (
    <Card className="group overflow-hidden hover:shadow-xl transition-all duration-300">
      <div className="relative">
        <Link to={`${createPageUrl("PropertyDetails")}?id=${property.id}`}>
          <div className="relative h-56 overflow-hidden bg-slate-100">
            {!imgError && images[imgIndex] ? (
              <img
                src={images[imgIndex]}
                alt={property.title}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
                <Building2 className="w-16 h-16 text-slate-300" />
              </div>
            )}
            <div className="absolute top-3 left-3 flex gap-2">
              <Badge className="bg-white text-slate-900 border-0">
                {propertyTypeLabels[property.property_type]}
              </Badge>
              <Badge className={property.listing_type === 'sale' ? 'bg-green-500' : 'bg-blue-500'}>
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
          <h3 className="font-bold text-slate-900 line-clamp-1 mb-1 group-hover:text-[#75787b] transition-colors">
            {property.title}
          </h3>
          <p className="text-sm text-slate-600 flex items-center gap-1 mb-3">
            <MapPin className="w-4 h-4" />
            {property.city}
          </p>
        </Link>

        <div className="flex items-center gap-4 text-sm text-slate-600 mb-3 pb-3 border-b">
          {(property.useful_area || property.square_feet) > 0 && (
            <span className="flex items-center gap-1">
              <Maximize className="w-4 h-4" />
              {property.useful_area || property.square_feet}m²
            </span>
          )}
          {property.ref_id && (
            <span className="text-xs font-mono text-slate-500">
              Ref: {property.ref_id}
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
            className="bg-[#75787b] hover:bg-[#5a5c5e]"
          >
            <MessageCircle className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}