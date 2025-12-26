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
    <section className={`py-16 md:py-24 bg-gradient-to-b from-slate-50 to-white ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent mb-6">
            {title}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
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
                <h3 className="text-2xl font-bold text-slate-900 mb-8">
                  Informações de Contacto
                </h3>
                
                <div className="space-y-4">
                  <motion.a 
                    href="mailto:info@zuconnect.pt"
                    whileHover={{ scale: 1.02, x: 4 }}
                    className="flex items-start gap-5 p-5 rounded-2xl bg-white border border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all group cursor-pointer">
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                      <Mail className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 mb-1">Email</p>
                      <p className="text-blue-600 group-hover:text-blue-700 font-medium">
                        info@zuconnect.pt
                      </p>
                    </div>
                  </motion.a>

                  <motion.a 
                    href="tel:+351234026615"
                    whileHover={{ scale: 1.02, x: 4 }}
                    className="flex items-start gap-5 p-5 rounded-2xl bg-white border border-slate-200 hover:border-green-300 hover:shadow-lg transition-all group cursor-pointer">
                    <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                      <Phone className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 mb-1">Telefone</p>
                      <p className="text-green-600 group-hover:text-green-700 font-medium">
                        +351 234 026 615
                      </p>
                    </div>
                  </motion.a>

                  <motion.a 
                    href="https://wa.me/351910239889"
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ scale: 1.02, x: 4 }}
                    className="flex items-start gap-5 p-5 rounded-2xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 hover:border-green-300 hover:shadow-lg transition-all group cursor-pointer">
                    <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                      <MessageCircle className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 mb-1">WhatsApp</p>
                      <p className="text-green-600 group-hover:text-green-700 font-medium">
                        Enviar mensagem
                      </p>
                    </div>
                  </motion.a>

                  <motion.div 
                    whileHover={{ scale: 1.02, x: 4 }}
                    className="flex items-start gap-5 p-5 rounded-2xl bg-white border border-slate-200 hover:border-amber-300 hover:shadow-lg transition-all group">
                    <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                      <MapPin className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 mb-1">Morada</p>
                      <p className="text-slate-600">
                        Lisboa, Portugal
                      </p>
                    </div>
                  </motion.div>
                </div>
              </div>

              <Card className="bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 text-white border-0 shadow-xl overflow-hidden relative">
                <div className="absolute inset-0 bg-grid-white/[0.02] pointer-events-none" />
                <CardContent className="p-8 relative">
                  <h4 className="font-bold text-xl mb-6 flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    Horário de Atendimento
                  </h4>
                  <div className="space-y-4 text-base">
                    <div className="flex justify-between items-center pb-3 border-b border-slate-700">
                      <span className="text-slate-300">Segunda a Sexta</span>
                      <span className="font-bold text-white">09:00 - 19:00</span>
                    </div>
                    <div className="flex justify-between items-center pb-3 border-b border-slate-700">
                      <span className="text-slate-300">Sábado</span>
                      <span className="font-bold text-white">10:00 - 14:00</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Domingo</span>
                      <span className="text-slate-500">Encerrado</span>
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

            <Card className="shadow-lg border-slate-200">
              <CardContent className="p-6 md:p-8">
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