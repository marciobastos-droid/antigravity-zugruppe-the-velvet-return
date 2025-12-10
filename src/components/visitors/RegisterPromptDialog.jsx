import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Heart, Star, Bell, TrendingUp } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function RegisterPromptDialog({ open, onOpenChange, favoritesCount }) {
  const benefits = [
    {
      icon: Heart,
      title: "Sincronize os seus favoritos",
      description: `Já tem ${favoritesCount} imóveis guardados. Registe-se para aceder em qualquer dispositivo.`
    },
    {
      icon: Bell,
      title: "Receba alertas personalizados",
      description: "Seja notificado quando surgirem imóveis que correspondem aos seus critérios."
    },
    {
      icon: Star,
      title: "Acesso prioritário",
      description: "Veja novos imóveis antes de serem publicados nos portais."
    },
    {
      icon: TrendingUp,
      title: "Acompanhamento personalizado",
      description: "Um consultor dedicado irá ajudá-lo a encontrar o imóvel perfeito."
    }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">Está interessado? Registe-se!</DialogTitle>
          <DialogDescription className="text-base">
            Notamos que está a explorar vários imóveis. Crie uma conta para aproveitar estas vantagens:
          </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-4 my-6">
          {benefits.map((benefit, idx) => (
            <div key={idx} className="flex gap-3 p-4 rounded-lg bg-slate-50 border border-slate-200">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <benefit.icon className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 mb-1">{benefit.title}</h4>
                <p className="text-sm text-slate-600">{benefit.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <Button 
            onClick={() => base44.auth.redirectToLogin()}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            Criar Conta Grátis
          </Button>
          <Button 
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            Continuar a Explorar
          </Button>
        </div>

        <p className="text-xs text-center text-slate-500 mt-2">
          Ao registar-se, os seus {favoritesCount} favoritos serão automaticamente guardados na sua conta
        </p>
      </DialogContent>
    </Dialog>
  );
}