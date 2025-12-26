import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Home, TrendingUp } from "lucide-react";
import DynamicContactForm from "../forms/DynamicContactForm";
import { motion } from "framer-motion";

/**
 * Hero section com formulário de contacto integrado
 */
export default function HeroWithForm({ 
  title = "Encontre o Seu Imóvel de Sonho",
  subtitle = "Apoio personalizado em todas as etapas da sua jornada imobiliária",
  stats = []
}) {
  return (
    <section className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white py-16 md:py-24">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.4"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
        }} />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Text Content */}
          <div>
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6"
            >
              {title}
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-lg md:text-xl text-slate-300 mb-8"
            >
              {subtitle}
            </motion.p>

            {/* Stats */}
            {stats.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="grid grid-cols-3 gap-6 mb-8"
              >
                {stats.map((stat, idx) => (
                  <div key={idx}>
                    <div className="text-3xl md:text-4xl font-bold text-blue-400 mb-1">
                      {stat.value}
                    </div>
                    <div className="text-sm text-slate-400">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </motion.div>
            )}

            {/* Features */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-wrap gap-4"
            >
              <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full backdrop-blur-sm">
                <Search className="w-4 h-4 text-blue-400" />
                <span className="text-sm">Pesquisa Personalizada</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full backdrop-blur-sm">
                <Home className="w-4 h-4 text-green-400" />
                <span className="text-sm">Portfólio Exclusivo</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full backdrop-blur-sm">
                <TrendingUp className="w-4 h-4 text-purple-400" />
                <span className="text-sm">Análise de Mercado</span>
              </div>
            </motion.div>
          </div>

          {/* Right: Contact Form */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="shadow-2xl">
              <CardContent className="p-6 md:p-8">
                <h3 className="text-2xl font-bold text-slate-900 mb-2">
                  Comece Agora
                </h3>
                <p className="text-slate-600 mb-6">
                  Preencha o formulário e entraremos em contacto
                </p>
                
                <DynamicContactForm
                  context="general"
                  showInterestType={false}
                  variant="default"
                  onSuccess={(data) => {
                    if (data.guest_email) {
                      localStorage.setItem('guest_email', data.guest_email);
                    }
                  }}
                />
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </section>
  );
}