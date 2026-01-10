import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, Phone, MapPin, MessageCircle } from "lucide-react";
import DynamicContactForm from "../forms/DynamicContactForm";
import { motion } from "framer-motion";
import { useLocalization } from "../i18n/LocalizationContext";

/**
 * Secção de contacto inteligente para o website
 * Usa DynamicContactForm com tracking integrado
 */
export default function SmartContactSection({
  title,
  subtitle,
  variant = "default",
  showContactInfo = true,
  className = "",
  brandColor = "#d22630" // red for residential, gray for commercial
}) {
  const { t } = useLocalization();
  
  // Determine if using residential (red) or commercial (gray) theme
  const isResidential = brandColor === "#d22630";
  
  // Default titles based on localization
  const defaultTitle = title || t('contact.title') || "Encontre o Seu Lar Ideal";
  const defaultSubtitle = subtitle || t('contact.subtitle') || "A nossa equipa está pronta para o ajudar a encontrar a casa dos seus sonhos";
  
  return (
    <section className={`py-12 md:py-16 ${className}`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8 md:mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-3">
            {defaultTitle}
          </h2>
          <p className="text-sm md:text-base text-slate-600 max-w-2xl mx-auto">
            {defaultSubtitle}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
          {/* Contact Info */}
          {showContactInfo && (
            <div className="space-y-3">
              <a 
                href="mailto:info@zugruppe.com"
                className={`flex items-center gap-4 p-4 rounded-lg border-2 transition-all hover:shadow-md ${
                  isResidential 
                    ? 'border-red-100 hover:border-red-300 bg-red-50/50'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                }`}
              >
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  isResidential ? 'bg-red-600' : 'bg-slate-700'
                }`}>
                  <Mail className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-slate-500">{t('contact.email') || 'Email'}</p>
                  <p className={`font-semibold ${isResidential ? 'text-red-700' : 'text-slate-900'}`}>
                    info@zugruppe.com
                  </p>
                </div>
              </a>

              <a 
                href="tel:+351234026615"
                className={`flex items-center gap-4 p-4 rounded-lg border-2 transition-all hover:shadow-md ${
                  isResidential 
                    ? 'border-red-100 hover:border-red-300 bg-red-50/50'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                }`}
              >
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  isResidential ? 'bg-red-600' : 'bg-slate-700'
                }`}>
                  <Phone className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-slate-500">{t('contact.phone') || 'Telefone'}</p>
                  <p className={`font-semibold ${isResidential ? 'text-red-700' : 'text-slate-900'}`}>
                    +351 234 026 615
                  </p>
                </div>
              </a>

              <a 
                href="https://wa.me/351910239889"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 p-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 transition-all hover:shadow-md border-2 border-emerald-600"
              >
                <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-emerald-100">WhatsApp</p>
                  <p className="font-semibold text-white">
                    {t('contact.sendMessage') || 'Enviar mensagem'}
                  </p>
                </div>
              </a>

              <div className={`flex items-start gap-4 p-4 rounded-lg border-2 ${
                isResidential 
                  ? 'border-red-100 bg-red-50/50'
                  : 'border-slate-200 bg-slate-50/50'
              }`}>
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  isResidential ? 'bg-red-600' : 'bg-slate-700'
                }`}>
                  <MapPin className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-slate-500">{t('contact.address') || 'Morada'}</p>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    Praça Marquês de Pombal 2<br />
                    3810-133 Aveiro, Portugal
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Contact Form */}
          <div>
            <Card className="shadow-lg border-2 border-slate-200">
              <CardContent className="p-6 md:p-8">
                <DynamicContactForm
                  context="general"
                  showInterestType={false}
                  variant={variant}
                  onSuccess={(data) => {
                    if (data.guest_email) {
                      localStorage.setItem('guest_email', data.guest_email);
                    }
                  }} 
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}