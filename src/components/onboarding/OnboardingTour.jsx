import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, ArrowRight, ArrowLeft, Check, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const TOUR_STEPS = [
  {
    id: "welcome",
    title: "Bem-vindo à Zugruppe! 🎉",
    description: "Vamos fazer um tour rápido pelas funcionalidades principais da plataforma. Demora apenas 2 minutos!",
    target: null,
    position: "center"
  },
  {
    id: "dashboard",
    title: "Dashboard",
    description: "Aqui encontra uma visão geral do seu negócio: leads, imóveis, matches e estatísticas importantes.",
    target: "dashboard-stats",
    position: "bottom"
  },
  {
    id: "properties",
    title: "Gestão de Imóveis",
    description: "Adicione e gerencie os seus imóveis. Pode importar dados de portais ou adicionar manualmente.",
    target: "nav-properties",
    position: "bottom"
  },
  {
    id: "opportunities",
    title: "CRM - Oportunidades",
    description: "Gerencie leads e oportunidades. Acompanhe o pipeline de vendas e qualifique contactos.",
    target: "nav-opportunities",
    position: "bottom"
  },
  {
    id: "clients",
    title: "Perfis de Clientes",
    description: "Crie perfis detalhados dos clientes com as suas preferências. A IA usa isso para matches automáticos.",
    target: "nav-clients",
    position: "bottom"
  },
  {
    id: "tools",
    title: "Ferramentas",
    description: "Aceda a ferramentas de marketing, importação de leads, geração de conteúdo e muito mais!",
    target: "nav-tools",
    position: "bottom"
  },
  {
    id: "complete",
    title: "Pronto para começar! 🚀",
    description: "Agora é só começar a adicionar imóveis e leads. Use o checklist para acompanhar o seu progresso.",
    target: null,
    position: "center"
  }
];

export default function OnboardingTour({ currentStep, onNext, onPrev, onComplete, onDismiss }) {
  const step = TOUR_STEPS[currentStep] || TOUR_STEPS[0];
  const isFirst = currentStep === 0;
  const isLast = currentStep === TOUR_STEPS.length - 1;

  const [position, setPosition] = React.useState({ top: 0, left: 0 });

  React.useEffect(() => {
    if (step.target) {
      const element = document.getElementById(step.target);
      if (element) {
        const rect = element.getBoundingClientRect();
        const scrollY = window.scrollY;
        const scrollX = window.scrollX;
        
        let top = rect.bottom + scrollY + 10;
        let left = rect.left + scrollX;

        if (step.position === "top") {
          top = rect.top + scrollY - 200;
        } else if (step.position === "right") {
          top = rect.top + scrollY;
          left = rect.right + scrollX + 10;
        } else if (step.position === "left") {
          top = rect.top + scrollY;
          left = rect.left + scrollX - 410;
        }

        setPosition({ top, left });
        
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        element.style.boxShadow = "0 0 0 4px rgba(59, 130, 246, 0.5)";
        element.style.transition = "box-shadow 0.3s";
        
        setTimeout(() => {
          element.style.boxShadow = "";
        }, 2000);
      }
    }
  }, [step, currentStep]);

  if (step.position === "center") {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
          >
            <Card className="w-full max-w-lg shadow-2xl border-2 border-blue-500">
              <CardContent className="p-8">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-6 h-6 text-blue-600" />
                    <h3 className="text-2xl font-bold text-slate-900">{step.title}</h3>
                  </div>
                  <button onClick={onDismiss} className="text-slate-400 hover:text-slate-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <p className="text-slate-700 text-lg mb-6 leading-relaxed">{step.description}</p>
                
                <div className="flex items-center gap-2 mb-6">
                  {TOUR_STEPS.map((_, idx) => (
                    <div
                      key={idx}
                      className={`h-2 rounded-full flex-1 transition-colors ${
                        idx === currentStep ? "bg-blue-600" : idx < currentStep ? "bg-blue-300" : "bg-slate-200"
                      }`}
                    />
                  ))}
                </div>

                <div className="flex justify-between gap-3">
                  {!isFirst && (
                    <Button variant="outline" onClick={onPrev}>
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Anterior
                    </Button>
                  )}
                  <Button 
                    onClick={isLast ? onComplete : onNext}
                    className="ml-auto bg-blue-600 hover:bg-blue-700"
                  >
                    {isLast ? (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Começar
                      </>
                    ) : (
                      <>
                        Próximo
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
                
                <div className="text-center mt-4">
                  <button onClick={onDismiss} className="text-sm text-slate-500 hover:text-slate-700">
                    Saltar tour
                  </button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        style={{ 
          position: "absolute", 
          top: `${position.top}px`, 
          left: `${position.left}px`,
          zIndex: 9999,
          width: "400px"
        }}
      >
        <Card className="shadow-2xl border-2 border-blue-500">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-3">
              <h3 className="text-lg font-bold text-slate-900">{step.title}</h3>
              <button onClick={onDismiss} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <p className="text-slate-700 mb-4">{step.description}</p>
            
            <div className="flex items-center gap-2 mb-4">
              {TOUR_STEPS.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-1.5 rounded-full flex-1 transition-colors ${
                    idx === currentStep ? "bg-blue-600" : idx < currentStep ? "bg-blue-300" : "bg-slate-200"
                  }`}
                />
              ))}
            </div>

            <div className="flex justify-between gap-2">
              {!isFirst && (
                <Button variant="outline" size="sm" onClick={onPrev}>
                  <ArrowLeft className="w-3 h-3 mr-1" />
                  Anterior
                </Button>
              )}
              <Button 
                size="sm" 
                onClick={isLast ? onComplete : onNext}
                className="ml-auto bg-blue-600 hover:bg-blue-700"
              >
                {isLast ? "Concluir" : "Próximo"}
                {!isLast && <ArrowRight className="w-3 h-3 ml-1" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}