import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { LayoutDashboard, Building2, Users, Wrench, BarChart3 } from "lucide-react";

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
      link: createPageUrl("CRMAdvanced"),
      color: "from-green-500 to-green-600"
    },
    {
      title: "Website",
      description: "Portal de imóveis público",
      icon: Building2,
      link: createPageUrl("Website"),
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

  // 5 Cards com logos das marcas ZU
  const brandCards = [
    {
      title: "ZU'HAUS",
      subtitle: "IMOBILIÁRIA RESIDENCIAL",
      link: "https://www.zuhaus.pt",
      logo: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6915a593b6edd8435f5838bd/c9093f98f_ZuHausA01.jpg"
    },
    {
      title: "ZUHANDEL",
      subtitle: "IMOBILIÁRIA COMERCIAL",
      link: "https://www.zuhandel.pt",
      logo: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6915a593b6edd8435f5838bd/4b8e979d6_ZUHANDEL_square.jpg"
    },
    {
      title: "ZU'PROJEKT",
      subtitle: "DESENVOLVIMENTO E PROJETOS",
      link: createPageUrl("Website"),
      logo: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6915a593b6edd8435f5838bd/da7bb604e_ZUPROJEKT.pdf"
    },
    {
      title: "ZU'GARDEN",
      subtitle: "GESTÃO IMOBILIÁRIA INTERNACIONAL",
      link: createPageUrl("Website"),
      logo: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6915a593b6edd8435f5838bd/a9283178b_Linha5MarcasZU.png"
    },
    {
      title: "ZU'FINANCE",
      subtitle: "INTERMEDIAÇÃO DE CRÉDITO",
      link: createPageUrl("Website"),
      logo: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6915a593b6edd8435f5838bd/a9283178b_Linha5MarcasZU.png"
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section com Logo */}
      <section className="py-16 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6915a593b6edd8435f5838bd/359538617_Zugruppe01.jpg"
              alt="Zugruppe"
              className="h-24 mx-auto mb-8 object-contain"
            />
            <h1 className="text-5xl font-bold text-slate-900 mb-4">
              Bem-vindo à ZuGruppe
            </h1>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Plataforma Integrada de Gestão Imobiliária
            </p>
          </motion.div>
        </div>
      </section>

      {/* Secção 1: Cards de Páginas da App */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.h2 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-3xl font-bold text-slate-900 text-center mb-12"
          >
            Acesso Rápido
          </motion.h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
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
                      <CardContent className="p-6 flex flex-col items-center text-center">
                        <div className={`w-16 h-16 bg-gradient-to-br ${card.color} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                          <Icon className="w-8 h-8 text-white" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">
                          {card.title}
                        </h3>
                        <p className="text-sm text-slate-600">
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
      <section className="py-16 bg-white border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.h2 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-3xl font-bold text-slate-900 text-center mb-12"
          >
            As Nossas Marcas
          </motion.h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {brandCards.map((brand, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
              >
                {brand.link.startsWith('http') ? (
                  <a href={brand.link} target="_blank" rel="noopener noreferrer">
                    <Card className="h-full hover:shadow-xl transition-all duration-300 group cursor-pointer border-2 hover:border-slate-300">
                      <CardContent className="p-6 flex flex-col items-center text-center">
                        <div className="w-full h-32 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
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
                      <CardContent className="p-6 flex flex-col items-center text-center">
                        <div className="w-full h-32 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                          <div className="text-center">
                            <h3 className="text-2xl font-bold text-slate-900 mb-1 tracking-tight">
                              {brand.title}
                            </h3>
                            <div className="h-1 w-12 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto mb-2"></div>
                            <p className="text-xs text-slate-500 uppercase tracking-wider">
                              {brand.subtitle}
                            </p>
                          </div>
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