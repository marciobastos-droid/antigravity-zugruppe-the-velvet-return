import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { LayoutDashboard, Building2, Users, Wrench, BarChart3, Target, ArrowRight, Phone } from "lucide-react";

export default function Home() {
  // 5 Cards para páginas da app
  const appCards = [
    {
      title: "Dashboard",
      description: "Painel de controlo e estatísticas",
      icon: BarChart3,
      link: createPageUrl("Dashboard"),
      color: "from-blue-500 to-blue-600"
    },
    {
      title: "Imóveis",
      description: "Gerir os seus anúncios",
      icon: LayoutDashboard,
      link: createPageUrl("MyListings"),
      color: "from-purple-500 to-purple-600"
    },
    {
      title: "CRM",
      description: "Gestão de clientes e leads",
      icon: Users,
      link: createPageUrl("CRMAdvanced") + "?tab=clients",
      color: "from-green-500 to-green-600"
    },
    {
      title: "Oportunidades",
      description: "Gestão de oportunidades de negócio",
      icon: Target,
      link: createPageUrl("CRMAdvanced") + "?tab=opportunities",
      color: "from-amber-500 to-amber-600"
    },
    {
      title: "Ferramentas",
      description: "Ferramentas e integrações",
      icon: Wrench,
      link: createPageUrl("Tools"),
      color: "from-rose-500 to-rose-600"
    }
  ];

  // 5 Cards com logos das marcas ZU - todos mostram imagens agora
  const brandCards = [
    {
      title: "ZU'HAUS",
      subtitle: "IMOBILIÁRIA RESIDENCIAL",
      link: "https://www.zuhaus.pt",
      logo: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6915a593b6edd8435f5838bd/c9093f98f_ZuHausA01.jpg",
      isExternal: true
    },
    {
      title: "ZUHANDEL",
      subtitle: "IMOBILIÁRIA COMERCIAL",
      link: "https://www.zuhaus.pt",
      logo: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6915a593b6edd8435f5838bd/4b8e979d6_ZUHANDEL_square.jpg",
      isExternal: true
    },
    {
      title: "ZU'PROJEKT",
      subtitle: "DESENVOLVIMENTO E PROJETOS",
      link: createPageUrl("Website"),
      logo: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6915a593b6edd8435f5838bd/c9d32a40a_LogoZUPROJEKT_white_background2.jpg",
      isExternal: false
    },
    {
      title: "ZU'GARDEN",
      subtitle: "GESTÃO IMOBILIÁRIA INTERNACIONAL",
      link: createPageUrl("Website"),
      logo: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6915a593b6edd8435f5838bd/bfb9390a5_LogoZuGarden.png",
      isExternal: false
    },
    {
      title: "ZU'FINANCE",
      subtitle: "INTERMEDIAÇÃO DE CRÉDITO",
      link: createPageUrl("Website"),
      logo: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6915a593b6edd8435f5838bd/652891fc8_LogoZuFinance.jpg",
      isExternal: false
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section - Foco Emocional */}
      <section className="relative py-20 sm:py-28 bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-40" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            {/* Logo */}
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6915a593b6edd8435f5838bd/359538617_Zugruppe01.jpg"
              alt="Zugruppe"
              className="h-20 sm:h-28 mx-auto mb-8 object-contain drop-shadow-2xl"
            />
            
            {/* Título Emocional */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              A Casa dos Seus Sonhos,<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
                Construída com Excelência
              </span>
            </h1>
            
            {/* Subtítulo */}
            <p className="text-lg sm:text-xl text-slate-300 max-w-3xl mx-auto mb-10 leading-relaxed">
              Transformamos a sua visão em realidade com <strong className="text-white">rapidez</strong>, 
              <strong className="text-white"> qualidade superior</strong> e um 
              <strong className="text-white"> acompanhamento dedicado</strong> em cada etapa do projeto.
            </p>
            
            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {/* CTA Principal */}
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
              >
                <Link to={createPageUrl("Website")}>
                  <button className="group flex items-center gap-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-2xl shadow-blue-900/50 transition-all duration-300">
                    <Phone className="w-5 h-5" />
                    Pedir Orçamento Gratuito
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                </Link>
              </motion.div>
              
              {/* CTA Secundário */}
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
              >
                <Link to={createPageUrl("Website")}>
                  <button className="group flex items-center gap-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white px-8 py-4 rounded-xl font-semibold text-lg border-2 border-white/30 hover:border-white/50 transition-all duration-300">
                    <Building2 className="w-5 h-5" />
                    Ver Projetos Recentes
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                </Link>
              </motion.div>
            </div>

            {/* Trust Indicators */}
            <div className="mt-12 pt-8 border-t border-white/20">
              <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto">
                <div>
                  <div className="text-3xl font-bold text-blue-400 mb-1">+500</div>
                  <div className="text-sm text-slate-400">Projetos Concluídos</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-blue-400 mb-1">98%</div>
                  <div className="text-sm text-slate-400">Clientes Satisfeitos</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-blue-400 mb-1">25+</div>
                  <div className="text-sm text-slate-400">Anos de Experiência</div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Secção 1: Cards de Páginas da App */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.h2 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-2xl font-bold text-slate-900 text-center mb-8"
          >
            Acesso Rápido
          </motion.h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {appCards.map((card, idx) => {
              const Icon = card.icon;
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <Link to={card.link}>
                    <Card className="h-full hover:shadow-xl transition-all duration-300 group cursor-pointer border-2 hover:border-blue-400">
                      <CardContent className="p-4 flex flex-col items-center text-center">
                        <div className={`w-12 h-12 bg-gradient-to-br ${card.color} rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <h3 className="text-base font-bold text-slate-900 mb-1 group-hover:text-blue-600 transition-colors">
                          {card.title}
                        </h3>
                        <p className="text-xs text-slate-600">
                          {card.description}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Secção 2: Cards das Marcas ZU */}
      <section className="py-12 bg-white border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.h2 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-2xl font-bold text-slate-900 text-center mb-8"
          >
            As Nossas Marcas
          </motion.h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {brandCards.map((brand, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
              >
                {brand.isExternal ? (
                  <a href={brand.link} target="_blank" rel="noopener noreferrer">
                    <Card className="h-full hover:shadow-xl transition-all duration-300 group cursor-pointer border-2 hover:border-slate-300">
                      <CardContent className="p-4 flex flex-col items-center text-center">
                        <div className="w-full h-24 flex items-center justify-center group-hover:scale-105 transition-transform">
                          <img 
                            src={brand.logo} 
                            alt={brand.title}
                            className="max-w-full max-h-full object-contain"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </a>
                ) : (
                  <Link to={brand.link}>
                    <Card className="h-full hover:shadow-xl transition-all duration-300 group cursor-pointer border-2 hover:border-slate-300">
                      <CardContent className="p-4 flex flex-col items-center text-center">
                        <div className="w-full h-24 flex items-center justify-center group-hover:scale-105 transition-transform">
                          <img 
                            src={brand.logo} 
                            alt={brand.title}
                            className="max-w-full max-h-full object-contain"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}