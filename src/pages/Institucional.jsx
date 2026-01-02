import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Building2, Users, Award, Globe, Heart, Target, 
  TrendingUp, Shield, Sparkles, ArrowRight, Phone, Mail, MapPin
} from "lucide-react";
import SEOHead from "../components/seo/SEOHead";
import { HelmetProvider } from "react-helmet-async";

export default function Institucional() {
  const brands = [
    {
      name: "ZuHaus",
      subtitle: "Imóveis Residenciais",
      description: "Especialistas em encontrar o lar perfeito para cada família. Apartamentos, moradias e espaços que transformam sonhos em realidade.",
      logo: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6915a593b6edd8435f5838bd/a0e94a9a1_ZUHAUS_branco_vermelho-trasnparente_c-slogan.png",
      color: "from-red-600 to-pink-600",
      link: createPageUrl("Website") + "?tab=residential"
    },
    {
      name: "ZuHandel",
      subtitle: "Espaços Comerciais",
      description: "Soluções comerciais que impulsionam o seu negócio. Lojas, escritórios e armazéns estrategicamente localizados.",
      logo: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6915a593b6edd8435f5838bd/fbf7ef631_WaterMarkZuHandel.png",
      color: "from-slate-600 to-slate-800",
      link: createPageUrl("Website") + "?tab=commercial"
    },
    {
      name: "Premium Luxo",
      subtitle: "Imóveis de Luxo",
      description: "Propriedades exclusivas para clientes exigentes. Luxo, conforto e exclusividade em cada detalhe.",
      logo: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6915a593b6edd8435f5838bd/c00740fb7_ZUGRUPPE_branco_azul-trasnparente_c-slogan1.png",
      color: "from-amber-500 to-yellow-600",
      link: createPageUrl("PremiumLuxury")
    },
    {
      name: "Worldwide",
      subtitle: "Imóveis Internacionais",
      description: "O mundo é o nosso mercado. Propriedades nos destinos mais procurados a nível internacional.",
      logo: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6915a593b6edd8435f5838bd/359538617_Zugruppe01.jpg",
      color: "from-blue-600 to-indigo-600",
      link: createPageUrl("WorldWideProperties")
    }
  ];

  const values = [
    {
      icon: Heart,
      title: "Paixão pelo que Fazemos",
      description: "Cada imóvel é tratado com dedicação e comprometimento absoluto."
    },
    {
      icon: Shield,
      title: "Transparência Total",
      description: "Processos claros, comunicação honesta e relações de confiança."
    },
    {
      icon: Target,
      title: "Foco no Cliente",
      description: "O seu sucesso e satisfação são a nossa prioridade máxima."
    },
    {
      icon: Sparkles,
      title: "Inovação Constante",
      description: "Tecnologia de ponta e métodos modernos ao serviço do imobiliário."
    },
    {
      icon: TrendingUp,
      title: "Excelência nos Resultados",
      description: "Compromisso com a qualidade e superação de expectativas."
    },
    {
      icon: Globe,
      title: "Visão Global",
      description: "Presença local com alcance internacional para melhor servir."
    }
  ];

  const stats = [
    { number: "1000+", label: "Imóveis Vendidos" },
    { number: "500+", label: "Clientes Satisfeitos" },
    { number: "15+", label: "Anos de Experiência" },
    { number: "20+", label: "Consultores Especializados" }
  ];

  return (
    <HelmetProvider>
      <div className="min-h-screen bg-slate-50">
        <SEOHead
          title="ZuGruppe - Sobre Nós | Imobiliária de Confiança em Portugal"
          description="Conheça a ZuGruppe, grupo imobiliário líder em Portugal. Com as marcas ZuHaus, ZuHandel e Premium Luxo, oferecemos soluções completas em imobiliário residencial, comercial e de luxo."
          keywords="zugruppe, imobiliária portugal, sobre zugruppe, zuhaus, zuhandel, imóveis luxo portugal, grupo imobiliário"
          image="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6915a593b6edd8435f5838bd/359538617_Zugruppe01.jpg"
        />

        {/* Hero Section */}
        <div className="relative bg-white overflow-hidden">
          <div className="relative max-w-7xl mx-auto px-4 py-20 md:py-32">
            <div className="text-center">
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6915a593b6edd8435f5838bd/c00740fb7_ZUGRUPPE_branco_azul-trasnparente_c-slogan1.png"
                alt="ZuGruppe"
                className="h-32 md:h-40 w-auto mx-auto mb-8"
              />
              <div className="flex flex-wrap items-center justify-center gap-4">
                <Link to={createPageUrl("Website")}>
                  <Button size="lg" className="bg-slate-900 text-white hover:bg-slate-800">
                    <Building2 className="w-5 h-5 mr-2" />
                    Ver Imóveis
                  </Button>
                </Link>
                <a href="#contacto">
                  <Button size="lg" variant="outline" className="border-slate-900 text-slate-900 hover:bg-slate-100">
                    <Phone className="w-5 h-5 mr-2" />
                    Fale Connosco
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="bg-white py-12 border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-4xl md:text-5xl font-bold text-blue-600 mb-2">{stat.number}</div>
                  <div className="text-slate-600">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Mission Section */}
        <div className="max-w-7xl mx-auto px-4 py-16 md:py-24">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="mb-4 bg-blue-100 text-blue-800">Nossa Missão</Badge>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">
                Transformar o Mercado Imobiliário
              </h2>
              <p className="text-lg text-slate-600 mb-6 leading-relaxed">
                Na ZuGruppe, acreditamos que cada propriedade conta uma história e cada cliente tem um sonho único. 
                A nossa missão é conectar pessoas aos espaços perfeitos, sejam lares acolhedores, escritórios estratégicos 
                ou investimentos de alto valor.
              </p>
              <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                Com tecnologia de ponta, uma equipa experiente e um compromisso inabalável com a excelência, 
                redefinimos o que significa trabalhar com imobiliário em Portugal e no mundo.
              </p>
              <div className="flex items-center gap-4">
                <Award className="w-12 h-12 text-blue-600" />
                <div>
                  <div className="font-semibold text-slate-900">Licença IMPIC 11355</div>
                  <div className="text-sm text-slate-600">Certificação Oficial</div>
                </div>
              </div>
            </div>
            <div className="relative">
              <img 
                src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800"
                alt="Equipa ZuGruppe"
                className="rounded-2xl shadow-2xl"
              />
              <div className="absolute -bottom-6 -left-6 bg-blue-600 text-white p-6 rounded-xl shadow-xl">
                <div className="text-3xl font-bold mb-1">15+</div>
                <div className="text-sm">Anos de Experiência</div>
              </div>
            </div>
          </div>
        </div>

        {/* Values Section */}
        <div className="bg-slate-100 py-16 md:py-24">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-12">
              <Badge className="mb-4 bg-blue-100 text-blue-800">Nossos Valores</Badge>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                O Que Nos Define
              </h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                Princípios que guiam cada decisão e cada interação com os nossos clientes
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {values.map((value, index) => (
                <Card key={index} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                      <value.icon className="w-6 h-6 text-blue-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">{value.title}</h3>
                    <p className="text-slate-600">{value.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* Brands Section */}
        <div className="max-w-7xl mx-auto px-4 py-16 md:py-24">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-blue-100 text-blue-800">Nossas Marcas</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Um Grupo, Múltiplas Especialidades
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Cada marca do grupo ZuGruppe é especialista no seu segmento, garantindo o melhor serviço em cada área
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {brands.map((brand, index) => (
              <Card key={index} className="overflow-hidden hover:shadow-xl transition-all group">
                <div className={`bg-gradient-to-br ${brand.color} p-8 text-white`}>
                  <img 
                    src={brand.logo}
                    alt={brand.name}
                    className="h-20 w-auto mb-4 object-contain"
                  />
                  <h3 className="text-2xl font-bold mb-2">{brand.name}</h3>
                  <p className="text-white/90 text-sm font-medium mb-4">{brand.subtitle}</p>
                </div>
                <CardContent className="p-6">
                  <p className="text-slate-600 mb-6 leading-relaxed">{brand.description}</p>
                  <Link to={brand.link}>
                    <Button className="w-full group-hover:bg-blue-600 transition-colors">
                      Explorar {brand.name}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Contact Section */}
        <div id="contacto" className="bg-gradient-to-br from-blue-600 to-indigo-700 py-16 md:py-24">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Vamos Trabalhar Juntos?
              </h2>
              <p className="text-xl text-blue-100 max-w-2xl mx-auto">
                Entre em contacto connosco e descubra como podemos ajudá-lo a alcançar os seus objetivos
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Phone className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-2">Telefone</h3>
                  <a href="tel:+351234026615" className="text-blue-600 hover:underline">
                    +351 234 026 615
                  </a>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Mail className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-2">Email</h3>
                  <a href="mailto:info@zuconnect.pt" className="text-blue-600 hover:underline">
                    info@zuconnect.pt
                  </a>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MapPin className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-2">Localização</h3>
                  <p className="text-slate-600 text-sm">Lisboa, Portugal</p>
                </CardContent>
              </Card>
            </div>
            <div className="text-center mt-12">
              <Link to={createPageUrl("Website")}>
                <Button size="lg" className="bg-white text-blue-600 hover:bg-slate-100">
                  <Building2 className="w-5 h-5 mr-2" />
                  Ver Todos os Imóveis
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </HelmetProvider>
  );
}