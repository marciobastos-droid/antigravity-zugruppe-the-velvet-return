import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, Phone, MapPin, MessageCircle } from "lucide-react";
import DynamicContactForm from "../forms/DynamicContactForm";
import { motion } from "framer-motion";

/**
 * Secção de contacto inteligente para o website
 * Usa DynamicContactForm com tracking integrado
 */
export default function SmartContactSection({
  title = "Entre em Contacto",
  subtitle = "Estamos aqui para o ajudar. Envie-nos a sua mensagem.",
  variant = "default", // "default", "minimal", "featured"
  showContactInfo = true,
  className = ""
}) {
  return (
    <section className={`py-16 md:py-24 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 bg-clip-text text-transparent mb-6">
            {title}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
            {subtitle}
          </motion.p>
        </div>

        <div className="grid md:grid-cols-2 gap-10 lg:gap-16">
          {/* Contact Info */}
          {showContactInfo &&
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-8">

              <div>
                <h3 className="text-2xl font-bold text-white mb-8">
                  Informações de Contacto
                </h3>
                
                <div className="space-y-4">
                  <motion.a 
                    href="mailto:info@zugruppe.com"
                    whileHover={{ scale: 1.02, x: 4 }}
                    className="flex items-start gap-5 p-6 rounded-2xl bg-gradient-to-br from-slate-800/90 via-slate-800/80 to-slate-900/90 backdrop-blur-sm border border-amber-500/20 hover:border-amber-400/40 hover:shadow-2xl hover:shadow-amber-500/10 transition-all group cursor-pointer">
                    <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform shadow-lg shadow-amber-500/20">
                      <Mail className="w-7 h-7 text-slate-900" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-300 mb-1 text-sm">Email</p>
                      <p className="text-amber-400 group-hover:text-amber-300 font-medium text-lg">
                        info@zugruppe.com
                      </p>
                    </div>
                  </motion.a>

                  <motion.a 
                    href="tel:+351234026615"
                    whileHover={{ scale: 1.02, x: 4 }}
                    className="flex items-start gap-5 p-6 rounded-2xl bg-gradient-to-br from-slate-800/90 via-slate-800/80 to-slate-900/90 backdrop-blur-sm border border-emerald-500/20 hover:border-emerald-400/40 hover:shadow-2xl hover:shadow-emerald-500/10 transition-all group cursor-pointer">
                    <div className="w-14 h-14 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform shadow-lg shadow-emerald-500/20">
                      <Phone className="w-7 h-7 text-slate-900" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-300 mb-1 text-sm">Telefone</p>
                      <p className="text-emerald-400 group-hover:text-emerald-300 font-medium text-lg">
                        +351 234 026 615
                      </p>
                    </div>
                  </motion.a>

                  <motion.a 
                    href="https://wa.me/351910239889"
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ scale: 1.02, x: 4 }}
                    className="flex items-start gap-5 p-6 rounded-2xl bg-gradient-to-br from-emerald-900/40 via-emerald-900/30 to-green-900/40 backdrop-blur-sm border border-emerald-500/30 hover:border-emerald-400/50 hover:shadow-2xl hover:shadow-emerald-500/20 transition-all group cursor-pointer">
                    <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform shadow-lg shadow-emerald-500/30">
                      <MessageCircle className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-300 mb-1 text-sm">WhatsApp</p>
                      <p className="text-emerald-400 group-hover:text-emerald-300 font-medium text-lg">
                        Enviar mensagem
                      </p>
                    </div>
                  </motion.a>

                  <motion.div 
                    whileHover={{ scale: 1.02, x: 4 }}
                    className="flex items-start gap-5 p-6 rounded-2xl bg-gradient-to-br from-slate-800/90 via-slate-800/80 to-slate-900/90 backdrop-blur-sm border border-amber-500/20 hover:border-amber-400/40 hover:shadow-2xl hover:shadow-amber-500/10 transition-all group">
                    <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform shadow-lg shadow-amber-500/20">
                      <MapPin className="w-7 h-7 text-slate-900" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-300 mb-1 text-sm">Morada</p>
                      <p className="text-slate-200 text-base leading-relaxed">
                        Praça Marquês de Pombal 2<br />
                        3810-133 Aveiro, Portugal
                      </p>
                    </div>
                  </motion.div>
                </div>
              </div>

              <Card className="bg-gradient-to-br from-amber-900/30 via-amber-800/20 to-amber-900/30 backdrop-blur-sm text-white border border-amber-500/30 shadow-2xl shadow-amber-500/10 overflow-hidden relative">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(251,191,36,0.1),transparent_50%)] pointer-events-none" />
                <CardContent className="p-8 relative">
                  <h4 className="font-bold text-xl mb-6 flex items-center gap-3 text-amber-400">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-lg shadow-emerald-400/50" />
                    Horário de Atendimento
                  </h4>
                  <div className="space-y-4 text-base">
                    <div className="flex justify-between items-center pb-4 border-b border-amber-500/20">
                      <span className="text-slate-300">Segunda a Sexta</span>
                      <span className="font-bold text-amber-400">09:00 - 19:00</span>
                    </div>
                    <div className="flex justify-between items-center pb-4 border-b border-amber-500/20">
                      <span className="text-slate-300">Sábado</span>
                      <span className="font-bold text-amber-400">10:00 - 14:00</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Domingo</span>
                      <span className="text-slate-500 italic">Encerrado</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          }

          {/* Contact Form */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: showContactInfo ? 0.2 : 0 }}>

            <Card className="shadow-2xl shadow-amber-500/20 border border-amber-500/20 bg-gradient-to-br from-white/95 via-white/90 to-white/95 backdrop-blur-xl overflow-hidden relative">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(251,191,36,0.08),transparent_50%)] pointer-events-none" />
              <CardContent className="p-8 md:p-10 relative">
                <DynamicContactForm
                  context="general"
                  showInterestType={false}
                  variant={variant}
                  onSuccess={(data) => {
                    // Guardar email do guest para tracking futuro
                    if (data.guest_email) {
                      localStorage.setItem('guest_email', data.guest_email);
                    }
                  }} />

              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </section>);

}