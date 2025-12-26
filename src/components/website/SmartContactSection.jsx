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
    <section className={`py-12 md:py-20 ${className}`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">

            {title}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-lg text-slate-600 max-w-2xl mx-auto">

            {subtitle}
          </motion.p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
          {/* Contact Info */}
          {showContactInfo &&
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-6">

              <div>
                <h3 className="text-2xl font-bold text-slate-900 mb-6">
                  Informações de Contacto
                </h3>
                
                <div className="space-y-4">
                  <div className="flex items-start gap-4 p-4 rounded-lg bg-white border border-slate-200 hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Mail className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">Email</p>
                      <a href="mailto:info@zuconnect.pt" className="text-blue-600 hover:text-blue-700">
                        info@zuconnect.pt
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 rounded-lg bg-white border border-slate-200 hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Phone className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">Telefone</p>
                      <a href="tel:+351234026615" className="text-green-600 hover:text-green-700">
                        +351 234 026 615
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 rounded-lg bg-white border border-slate-200 hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <MessageCircle className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">WhatsApp</p>
                      <a href="https://wa.me/351912345678" target="_blank" className="text-purple-600 hover:text-purple-700">
                        Enviar mensagem
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 rounded-lg bg-white border border-slate-200 hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-6 h-6 text-amber-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">Morada</p>
                      <p className="text-slate-600 text-sm">
                        Lisboa, Portugal
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <Card className="bg-gradient-to-br from-slate-800 to-slate-900 text-white border-0">
                <CardContent className="p-6">
                  <h4 className="font-bold text-lg mb-3">Horário de Atendimento</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Segunda a Sexta:</span>
                      <span className="font-semibold">09:00 - 19:00</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Sábado:</span>
                      <span className="font-semibold">10:00 - 14:00</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Domingo:</span>
                      <span>Encerrado</span>
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