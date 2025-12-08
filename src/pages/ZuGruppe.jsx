import React from "react";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  Search, Home, Building2, MapPin, 
  Bed, Bath, Maximize, Star, ArrowRight,
  TrendingUp, Users, Shield, Sparkles, Phone, Mail, CheckCircle, Globe
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export default function ZuGruppe() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = React.useState("");

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

  const { data: properties = [], isLoading } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list('-created_date', 6)
  });

  const featuredProperties = properties.filter(p => p.status === 'active' && p.featured).slice(0, 3);

  const features = [
    {
      icon: Building2,
      title: "Gestão Completa de Imóveis",
      description: "Sistema avançado para gerir todo o seu portfólio imobiliário em Portugal e no estrangeiro"
    },
    {
      icon: Users,
      title: "CRM Inteligente",
      description: "Gerencie leads, clientes e oportunidades com ferramentas de automação e IA integrada"
    },
    {
      icon: TrendingUp,
      title: "Análise de Mercado",
      description: "Insights em tempo real sobre tendências do mercado e avaliações de propriedades"
    },
    {
      icon: Sparkles,
      title: "IA Integrada",
      description: "Matching automático de clientes, geração de conteúdo e otimização de anúncios"
    },
    {
      icon: Globe,
      title: "Multi-Portal",
      description: "Publique imóveis em múltiplos portais e plataformas com um clique"
    },
    {
      icon: Shield,
      title: "Segurança Premium",
      description: "Plataforma segura com backups automáticos e conformidade RGPD"
    }
  ];

export default function ZuGruppe() {
  const navigate = useNavigate();

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

  // Redirect to dashboard if already logged in
  React.useEffect(() => {
    if (user) {
      navigate(createPageUrl("Dashboard"));
    }
  }, [user, navigate]);

  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list('-created_date', 6)
  });

  const featuredProperties = properties.filter(p => p.status === 'active' && p.featured).slice(0, 3);

  const features = [
    {
      icon: Building2,
      title: "Gestão Completa de Imóveis",
      description: "Sistema avançado para gerir todo o seu portfólio imobiliário"
    },
    {
      icon: Users,
      title: "CRM Inteligente",
      description: "Gerencie leads, clientes e oportunidades com automação e IA"
    },
    {
      icon: TrendingUp,
      title: "Análise de Mercado",
      description: "Insights em tempo real sobre tendências e avaliações"
    },
    {
      icon: Sparkles,
      title: "IA Integrada",
      description: "Matching automático, geração de conteúdo e otimização"
    }
  ];

  const benefits = [
    "Gestão centralizada de imóveis e clientes",
    "Automação de marketing e comunicação",
    "Análise de dados e relatórios detalhados",
    "Integração com portais imobiliários",
    "Suporte técnico dedicado 24/7",
    "Ferramentas de IA para produtividade"
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1600')] bg-cover bg-center opacity-10" />
        
        {/* Header */}
        <div className="relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
              >
                <img 
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6915a593b6edd8435f5838bd/359538617_Zugruppe01.jpg"
                  alt="Zugruppe"
                  className="h-10 sm:h-12 w-auto"
                />
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
              >
                <Button 
                  onClick={() => base44.auth.redirectToLogin()}
                  className="bg-white text-slate-900 hover:bg-slate-100"
                >
                  Entrar
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Hero Content */}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center lg:text-left"
            >
              <div className="inline-block mb-6 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20">
                <span className="text-sm font-medium text-white flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Plataforma Premium de Gestão Imobiliária
                </span>
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                Transforme o seu
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
                  negócio imobiliário
                </span>
              </h1>
              
              <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto lg:mx-0">
                Gerencie imóveis, clientes e oportunidades com tecnologia avançada e inteligência artificial integrada.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Button 
                  size="lg"
                  onClick={() => base44.auth.redirectToLogin()}
                  className="bg-white text-slate-900 hover:bg-slate-100 px-8 py-6 text-lg rounded-xl shadow-xl"
                >
                  Começar Agora
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <Button 
                  size="lg"
                  variant="outline"
                  className="border-2 border-white text-white hover:bg-white hover:text-slate-900 px-8 py-6 text-lg rounded-xl"
                >
                  <Phone className="w-5 h-5 mr-2" />
                  Contactar
                </Button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="hidden lg:block"
            >
              <div className="relative">
                <img 
                  src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&h=600&fit=crop"
                  alt="Modern Real Estate"
                  className="rounded-2xl shadow-2xl"
                />
                <div className="absolute -bottom-6 -left-6 bg-white rounded-xl shadow-xl p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-slate-900">500+</div>
                      <div className="text-sm text-slate-600">Imóveis Geridos</div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Tudo o que precisa numa só plataforma
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Ferramentas profissionais para maximizar a eficiência do seu negócio imobiliário
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
              >
                <Card className="h-full hover:shadow-lg transition-all duration-300 border-slate-200">
                  <CardContent className="p-6">
                    <div className="w-14 h-14 bg-gradient-to-br from-slate-900 to-slate-700 rounded-xl flex items-center justify-center mb-4">
                      <feature.icon className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">{feature.title}</h3>
                    <p className="text-slate-600">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Featured Properties */}
      {featuredProperties.length > 0 && (
        <div className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-12">
              <div>
                <h2 className="text-3xl font-bold text-slate-900 mb-2 flex items-center gap-3">
                  <Star className="w-8 h-8 text-amber-500 fill-amber-500" />
                  Imóveis em Destaque
                </h2>
                <p className="text-slate-600">As melhores oportunidades do momento</p>
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredProperties.map(property => (
                <PropertyCardCompact key={property.id} property={property} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Benefits Section */}
      <div className="py-20 bg-gradient-to-br from-slate-900 to-slate-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-3xl sm:text-4xl font-bold mb-6">
                Porquê escolher a Zugruppe?
              </h2>
              <p className="text-slate-300 text-lg mb-8">
                A plataforma mais completa para profissionais do setor imobiliário
              </p>
              
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    className="flex items-center gap-3"
                  >
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-slate-200">{benefit}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="grid grid-cols-2 gap-6"
            >
              <Card className="bg-white/10 backdrop-blur-sm border-white/20">
                <CardContent className="p-6 text-center">
                  <div className="text-4xl font-bold text-white mb-2">1000+</div>
                  <div className="text-slate-300">Clientes Ativos</div>
                </CardContent>
              </Card>
              <Card className="bg-white/10 backdrop-blur-sm border-white/20">
                <CardContent className="p-6 text-center">
                  <div className="text-4xl font-bold text-white mb-2">500+</div>
                  <div className="text-slate-300">Imóveis</div>
                </CardContent>
              </Card>
              <Card className="bg-white/10 backdrop-blur-sm border-white/20">
                <CardContent className="p-6 text-center">
                  <div className="text-4xl font-bold text-white mb-2">98%</div>
                  <div className="text-slate-300">Satisfação</div>
                </CardContent>
              </Card>
              <Card className="bg-white/10 backdrop-blur-sm border-white/20">
                <CardContent className="p-6 text-center">
                  <div className="text-4xl font-bold text-white mb-2">24/7</div>
                  <div className="text-slate-300">Suporte</div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-20 bg-gradient-to-r from-blue-600 to-blue-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
              Pronto para começar?
            </h2>
            <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
              Junte-se a centenas de profissionais que já transformaram o seu negócio imobiliário
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg"
                onClick={() => base44.auth.redirectToLogin()}
                className="bg-white text-blue-600 hover:bg-slate-100 px-8 py-6 text-lg rounded-xl shadow-xl"
              >
                Aceder à Plataforma
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button 
                size="lg"
                variant="outline"
                className="border-2 border-white text-white hover:bg-white hover:text-blue-600 px-8 py-6 text-lg rounded-xl"
              >
                <Mail className="w-5 h-5 mr-2" />
                Contactar Equipa
              </Button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
            <div className="lg:col-span-2">
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6915a593b6edd8435f5838bd/359538617_Zugruppe01.jpg"
                alt="Zugruppe"
                className="h-10 mb-4"
              />
              <p className="text-slate-400 text-sm max-w-md">
                Marketplace imobiliário premium que transforma a forma como compra, vende e gere propriedades.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4 text-white">Links Úteis</h3>
              <div className="space-y-2 text-sm">
                <Link to={createPageUrl("PrivacyPolicy")} className="block text-slate-400 hover:text-white transition-colors">
                  Política de Privacidade
                </Link>
                <Link to={createPageUrl("TermsConditions")} className="block text-slate-400 hover:text-white transition-colors">
                  Termos e Condições
                </Link>
                <Link to={createPageUrl("DenunciationChannel")} className="block text-slate-400 hover:text-white transition-colors">
                  Canal de Denúncias
                </Link>
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4 text-white">Contacto</h3>
              <div className="space-y-2 text-sm text-slate-400">
                <p className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  info@zugruppe.com
                </p>
                <p className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Portugal
                </p>
              </div>
            </div>
          </div>
          
          <div className="border-t border-slate-700 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-slate-500 text-sm">
              © {new Date().getFullYear()} Zugruppe - Privileged Approach Unipessoal Lda | Licença IMPIC 11355
            </p>
            <div className="flex gap-4 text-xs text-slate-500">
              <a href="https://www.consumidor.gov.pt/resolucao-de-litigios.aspx" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                Resolução de Litígios
              </a>
              <a href="https://www.livroreclamacoes.pt/Inicio/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                Livro de Reclamações
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Compact Card for Grid View
function PropertyCardCompact({ property, featured }) {
  const [imgError, setImgError] = React.useState(false);
  const [imgIndex, setImgIndex] = React.useState(0);
  const images = property.images?.length > 0 ? property.images : [];

  const propertyTypeLabels = {
    apartment: "Apartamento", house: "Moradia", land: "Terreno",
    building: "Prédio", farm: "Quinta/Herdade", store: "Loja", warehouse: "Armazém", office: "Escritório"
  };

  return (
    <Link 
      to={`${createPageUrl("PropertyDetails")}?id=${property.id}`}
      className="group bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 border border-slate-100"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
        {!imgError && images[imgIndex] ? (
          <img
            src={images[imgIndex]}
            alt={property.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={() => setImgError(true)}
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
            <div className="absolute bottom-2 left-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-lg transition-all">
              📷 Ver todas as {images.length} fotos
            </div>
          </>
        )}
        
        {/* Badges */}
        <div className="absolute top-3 left-3 flex gap-2 flex-wrap">
          {featured && (
            <Badge className="bg-amber-400 text-slate-900 border-0">
              <Star className="w-3 h-3 mr-1" />
              Destaque
            </Badge>
          )}
          <Badge className="bg-white/95 text-slate-800 border-0">
            {property.listing_type === 'sale' ? 'Venda' : 'Arrendamento'}
          </Badge>
        </div>

        {/* Price */}
        <div className="absolute bottom-3 right-3">
          <div className="bg-slate-900/90 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg font-bold">
            €{property.price?.toLocaleString()}
            {property.listing_type === 'rent' && <span className="text-xs font-normal">/mês</span>}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-slate-900 line-clamp-1 group-hover:text-blue-600 transition-colors mb-1">
          {property.title}
        </h3>
        <p className="text-sm text-slate-500 flex items-center gap-1 mb-3">
          <MapPin className="w-3.5 h-3.5" />
          {property.city}
        </p>
        
        <div className="flex items-center gap-4 text-sm text-slate-600">
          {(property.bedrooms !== undefined && property.bedrooms !== null) && (
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

        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2">
          {property.ref_id && (
            <Badge className="bg-slate-900 text-white border-0 text-xs font-mono">
              {property.ref_id}
            </Badge>
          )}
          <Badge variant="outline" className="text-xs">
            {propertyTypeLabels[property.property_type] || property.property_type}
          </Badge>
        </div>
      </div>
    </Link>
  );
}

// List Card for List View
function PropertyCardList({ property }) {
  const [imgError, setImgError] = React.useState(false);
  const image = property.images?.[0];

  const propertyTypeLabels = {
    apartment: "Apartamento", house: "Moradia", land: "Terreno",
    building: "Prédio", farm: "Quinta/Herdade", store: "Loja", warehouse: "Armazém", office: "Escritório"
  };

  return (
    <Link 
      to={`${createPageUrl("PropertyDetails")}?id=${property.id}`}
      className="group flex bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all border border-slate-100"
    >
      {/* Image */}
      <div className="relative w-72 flex-shrink-0 overflow-hidden bg-slate-100">
        {!imgError && image ? (
          <img
            src={image}
            alt={property.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Home className="w-12 h-12 text-slate-300" />
          </div>
        )}
        <Badge className="absolute top-3 left-3 bg-white/95 text-slate-800 border-0">
          {property.listing_type === 'sale' ? 'Venda' : 'Arrendamento'}
        </Badge>
      </div>

      {/* Content */}
      <div className="flex-1 p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                {property.title}
              </h3>
              <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                <MapPin className="w-4 h-4" />
                {property.city}{property.address && `, ${property.address}`}
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-slate-900">
                €{property.price?.toLocaleString()}
              </div>
              {property.listing_type === 'rent' && (
                <span className="text-sm text-slate-500">/mês</span>
              )}
            </div>
          </div>
          
          {property.description && (
            <p className="text-sm text-slate-600 mt-3 line-clamp-2">
              {property.description}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-5 text-sm text-slate-600">
            {(property.bedrooms !== undefined && property.bedrooms !== null) && (
              <span className="flex items-center gap-1.5">
                <Bed className="w-4 h-4" />
                T{property.bedrooms}
              </span>
            )}
            {property.bathrooms > 0 && (
              <span className="flex items-center gap-1.5">
                <Bath className="w-4 h-4" />
                {property.bathrooms} WC
              </span>
            )}
            {(property.useful_area || property.square_feet) > 0 && (
              <span className="flex items-center gap-1.5">
                <Maximize className="w-4 h-4" />
                {property.useful_area || property.square_feet}m²
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {property.ref_id && (
              <Badge className="bg-slate-900 text-white border-0 text-xs font-mono">
                {property.ref_id}
              </Badge>
            )}
            <Badge variant="outline">
              {propertyTypeLabels[property.property_type] || property.property_type}
            </Badge>
          </div>
        </div>
      </div>
    </Link>
  );
}