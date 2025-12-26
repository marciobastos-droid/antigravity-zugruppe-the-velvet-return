import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowRight, Building2, Users, TrendingUp, Star, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import HeroWithForm from "../components/website/HeroWithForm";
import SmartContactSection from "../components/website/SmartContactSection";
import VisitorTracker from "../components/tracking/VisitorTracker";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";

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

  const services = [
    {
      icon: Building2,
      title: "Imóveis Residenciais",
      description: "Encontre a casa dos seus sonhos com a nossa ajuda personalizada",
      color: "blue",
      link: createPageUrl("Website") + "?tab=residential"
    },
    {
      icon: Users,
      title: "Espaços Comerciais",
      description: "Soluções comerciais para o crescimento do seu negócio",
      color: "purple",
      link: createPageUrl("Website") + "?tab=commercial"
    },
    {
      icon: TrendingUp,
      title: "Consultoria",
      description: "Análise de mercado e apoio em todas as etapas do processo",
      color: "green",
      link: createPageUrl("Website")
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Visitor Tracking */}
      <VisitorTracker pageType="website" pageTitle="ZuConnect - Home" />

      {/* Hero with Form */}
      <HeroWithForm 
        title="Encontre o Seu Imóvel de Sonho"
        subtitle="Apoio personalizado em todas as etapas da sua jornada imobiliária"
        stats={stats}
      />

      {/* Services Section */}
      <section className="py-20 bg-gradient-to-b from-white to-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-4xl font-bold text-slate-900 mb-4"
            >
              Os Nossos Serviços
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-lg text-slate-600 max-w-2xl mx-auto"
            >
              Soluções completas para todas as suas necessidades imobiliárias
            </motion.p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {services.map((service, idx) => {
              const Icon = service.icon;
              const colorClasses = {
                blue: "from-blue-500 to-blue-600",
                purple: "from-purple-500 to-purple-600",
                green: "from-green-500 to-green-600"
              };

              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <Link to={service.link}>
                    <Card className="h-full hover:shadow-xl transition-all duration-300 group cursor-pointer border-2 hover:border-blue-300">
                      <CardContent className="p-8">
                        <div className={`w-16 h-16 bg-gradient-to-br ${colorClasses[service.color]} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                          <Icon className="w-8 h-8 text-white" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-blue-600 transition-colors">
                          {service.title}
                        </h3>
                        <p className="text-slate-600 mb-4">
                          {service.description}
                        </p>
                        <div className="flex items-center text-blue-600 font-semibold group-hover:gap-2 transition-all">
                          Saber mais
                          <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-20 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-4xl font-bold mb-4"
            >
              Porquê Escolher-nos?
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-lg text-slate-300 max-w-2xl mx-auto"
            >
              Experiência, profissionalismo e resultados comprovados
            </motion.p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: Star, title: "Excelência", description: "Serviço premium em todas as interações" },
              { icon: Users, title: "Equipa Dedicada", description: "Profissionais experientes ao seu serviço" },
              { icon: TrendingUp, title: "Resultados", description: "Histórico comprovado de sucesso" },
              { icon: Search, title: "Pesquisa Avançada", description: "Tecnologia para encontrar o imóvel ideal" }
            ].map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="text-center"
              >
                <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <item.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                <p className="text-slate-400">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <SmartContactSection
        title="Pronto para Começar?"
        subtitle="Entre em contacto connosco e descubra como podemos ajudá-lo"
        showContactInfo={true}
      />
    </div>
  );
}