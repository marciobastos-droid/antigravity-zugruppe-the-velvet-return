import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  ArrowRight, Building2, Users, BarChart3, MessageSquare, 
  Wrench, FileText, Calendar, Search, UserPlus, TrendingUp,
  Home as HomeIcon, Sparkles
} from "lucide-react";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";

export default function Home() {
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me(),
  });

  const quickActions = [
    {
      icon: BarChart3,
      title: "Dashboard",
      description: "Visão geral e métricas",
      path: "Dashboard",
      color: "from-[#4cb5f5] to-[#3da5e5]"
    },
    {
      icon: Building2,
      title: "Imóveis",
      description: "Gerir portfolio",
      path: "MyListings",
      color: "from-emerald-500 to-emerald-600"
    },
    {
      icon: MessageSquare,
      title: "Oportunidades",
      description: "Pipeline de vendas",
      path: "Opportunities",
      color: "from-violet-500 to-violet-600"
    },
    {
      icon: Users,
      title: "Clientes",
      description: "Perfis e matching",
      path: "ClientPreferences",
      color: "from-amber-500 to-amber-600"
    },
    {
      icon: Search,
      title: "Explorar",
      description: "Pesquisar imóveis",
      path: "Browse",
      color: "from-rose-500 to-rose-600"
    },
    {
      icon: Wrench,
      title: "Ferramentas",
      description: "Utilitários e integrações",
      path: "Tools",
      color: "from-slate-600 to-slate-700"
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen bg-[#27251f]">
      {/* Hero Section */}
      <section className="relative pt-12 pb-8 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-[#4cb5f5]/20 via-transparent to-transparent"></div>
          <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-[#4cb5f5]/10 via-transparent to-transparent"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-8"
          >
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6915a593b6edd8435f5838bd/359538617_Zugruppe01.jpg"
              alt="Zugruppe"
              className="h-24 md:h-32 w-auto mx-auto filter brightness-0 invert drop-shadow-xl"
            />
          </motion.div>

          {/* Welcome Message */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-center mb-12"
          >
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
              {user ? `Olá, ${user.full_name?.split(' ')[0] || 'Bem-vindo'}!` : 'Bem-vindo ao CRM'}
            </h1>
            <p className="text-lg text-slate-300">
              O que pretende fazer hoje?
            </p>
          </motion.div>

          {/* Quick Actions Grid */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 max-w-4xl mx-auto"
          >
            {quickActions.map((action) => (
              <motion.div key={action.path} variants={itemVariants}>
                <Link to={createPageUrl(action.path)}>
                  <Card className="group cursor-pointer bg-white/5 backdrop-blur-sm border-white/10 hover:bg-white/10 hover:border-[#4cb5f5]/50 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-[#4cb5f5]/10">
                    <CardContent className="p-6 text-center">
                      <div className={`w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${action.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                        <action.icon className="w-7 h-7 text-white" />
                      </div>
                      <h3 className="font-semibold text-white text-lg mb-1">{action.title}</h3>
                      <p className="text-sm text-slate-400">{action.description}</p>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Quick Stats Section */}
      <section className="py-12 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="text-center"
          >
            <Link to={createPageUrl("Dashboard")}>
              <Button size="lg" className="bg-[#4cb5f5] hover:bg-[#3da5e5] text-[#27251f] font-semibold px-8 py-6 text-lg rounded-full shadow-lg shadow-[#4cb5f5]/25 transition-all hover:scale-105">
                <BarChart3 className="w-5 h-5 mr-2" />
                Ver Dashboard Completo
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-slate-500 text-sm">
            © 2025 Zugruppe - Privileged Approach Unipessoal Lda
          </p>
        </div>
      </footer>
    </div>
  );
}