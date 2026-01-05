import React from "react";
import { MessageCircle } from "lucide-react";

export default function FloatingWhatsAppButton() {
  const whatsappUrl = "https://wa.me/351910239889?text=Olá, visitei o vosso site ZuHaus e gostaria de mais informações...";

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed top-20 right-4 sm:top-24 sm:right-6 z-40 w-14 h-14 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-110 group"
      aria-label="Contactar via WhatsApp"
    >
      <MessageCircle className="w-7 h-7 group-hover:scale-110 transition-transform" />
      <span className="absolute -bottom-8 right-0 bg-slate-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
        WhatsApp
      </span>
    </a>
  );
}