import React from "react";
import { createPageUrl } from "@/utils";
import { Building2, Users, TrendingUp, Star, Search, Home as HomeIcon, Briefcase, Heart, Map, Lightbulb } from "lucide-react";
import { motion } from "framer-motion";
import HeroWithForm from "../components/website/HeroWithForm";
import SmartContactSection from "../components/website/SmartContactSection";
import LinkCardsSection from "../components/website/LinkCardsSection";
import VisitorTracker from "../components/tracking/VisitorTracker";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import SEOHead from "../components/seo/SEOHead";
import { HelmetProvider } from "react-helmet-async";

export default function Home() {
  const { data: properties = [] } = useQuery({
    queryKey: ['properties', 'count'],
    queryFn: async () => {
      const props = await base44.entities.Property.list();
      return props.filter(p => p.status === 'active');
    }
  });

  const stats = [
    { value: properties.length + '+', label: 'Imóveis Ativos' },
    { value: '500+', label: 'Clientes Satisfeitos' },
    { value: '15+', label: 'Anos de Experiência' }
  ];

  // Primeira secção de 5 cards
  const topCards = [
    {
      icon: Building2,
      title: "Imóveis Residenciais",
      description: "Descubra apartamentos e moradias para viver",
      color: "from-blue-500 to-blue-600",
      link: createPageUrl("Website") + "?listing_type=sale&property_type=apartment"
    },
    {
      icon: Briefcase,
      title: "Espaços Comerciais",
      description: "Lojas, escritórios e armazéns para o seu negócio",
      color: "from-purple-500 to-purple-600",
      link: createPageUrl("Website") + "?property_type=commercial"
    },
    {
      icon: TrendingUp,
      title: "Investimento",
      description: "Oportunidades de investimento imobiliário",
      color: "from-green-500 to-green-600",
      link: createPageUrl("Website") + "?featured=true"
    },
    {
      icon: Map,
      title: "Terrenos",
      description: "Terrenos para construção e desenvolvimento",
      color: "from-amber-500 to-amber-600",
      link: createPageUrl("Website") + "?property_type=land"
    },
    {
      icon: Star,
      title: "Destaques",
      description: "Os nossos imóveis em destaque este mês",
      color: "from-rose-500 to-rose-600",
      link: createPageUrl("Website") + "?featured=true"
    }
  ];

  // Segunda secção de 5 cards
  const bottomCards = [
    {
      icon: HomeIcon,
      title: "Comprar Casa",
      description: "Encontre a sua casa de sonho em Portugal",
      color: "from-cyan-500 to-cyan-600",
      link: createPageUrl("Website") + "?listing_type=sale"
    },
    {
      icon: Users,
      title: "Arrendamento",
      description: "Imóveis para arrendar em várias localizações",
      color: "from-indigo-500 to-indigo-600",
      link: createPageUrl("Website") + "?listing_type=rent"
    },
    {
      icon: Heart,
      title: "Consultoria",
      description: "Apoio especializado em todo o processo",
      color: "from-pink-500 to-pink-600",
      link: createPageUrl("Website")
    },
    {
      icon: Lightbulb,
      title: "Avaliação",
      description: "Avalie o seu imóvel gratuitamente",
      color: "from-orange-500 to-orange-600",
      link: createPageUrl("Website")
    },
    {
      icon: Search,
      title: "Procura Avançada",
      description: "Ferramentas para encontrar o imóvel ideal",
      color: "from-teal-500 to-teal-600",
      link: createPageUrl("Website")
    }
  ];

  return (
    <HelmetProvider>
      <div className="min-h-screen bg-white">
        <VisitorTracker pageType="website" pageTitle="ZuConnect - Home" />
        
        <SEOHead
          title="Zugruppe - Imobiliária de Confiança em Portugal | Compra, Venda e Arrendamento"
          description="Encontre o imóvel ideal com a Zugruppe. Especialistas em compra, venda e arrendamento de imóveis residenciais e comerciais em Portugal. Apoio personalizado em todas as etapas."
          keywords="imobiliária portugal, comprar casa portugal, venda imoveis, arrendamento, apartamentos, moradias, zugruppe, imóveis lisboa, imóveis porto"
          type="website"
          image="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6915a593b6edd8435f5838bd/359538617_Zugruppe01.jpg"
          url={typeof window !== 'undefined' ? window.location.href : ''}
          structuredData={{
            "@context": "https://schema.org",
            "@type": "RealEstateAgent",
            "name": "Zugruppe",
            "description": "Imobiliária de confiança em Portugal especializada em compra, venda e arrendamento",
            "url": "https://zugruppe.base44.app",
            "logo": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6915a593b6edd8435f5838bd/359538617_Zugruppe01.jpg",
            "areaServed": {
              "@type": "Country",
              "name": "Portugal"
            },
            "address": {
              "@type": "PostalAddress",
              "addressCountry": "PT",
              "addressLocality": "Lisboa"
            },
            "telephone": "+351234026615",
            "email": "info@zuconnect.pt",
            "priceRange": "€€€",
            "openingHours": "Mo-Fr 09:00-19:00, Sa 10:00-14:00",
            "aggregateRating": {
              "@type": "AggregateRating",
              "ratingValue": "4.8",
              "reviewCount": "150"
            }
          }}
        />

        {/* Hero with Form */}
        <HeroWithForm 
          title="Encontre o Seu Imóvel de Sonho"
          subtitle="Apoio personalizado em todas as etapas da sua jornada imobiliária"
          stats={stats}
        />

        {/* Primeira Secção - 5 Cards */}
        <LinkCardsSection
          title="Explore as Nossas Categorias"
          subtitle="Encontre o tipo de imóvel que procura"
          cards={topCards}
        />

        {/* Segunda Secção - 5 Cards */}
        <LinkCardsSection
          title="Os Nossos Serviços"
          subtitle="Soluções completas para todas as suas necessidades"
          cards={bottomCards}
        />

        {/* Contact Section */}
        <SmartContactSection
          title="Pronto para Começar?"
          subtitle="Entre em contacto connosco e descubra como podemos ajudá-lo"
          showContactInfo={true}
        />
      </div>
    </HelmetProvider>
  );
}