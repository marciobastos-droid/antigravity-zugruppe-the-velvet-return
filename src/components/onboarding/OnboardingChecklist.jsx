import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, ArrowRight, Sparkles, X } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const CHECKLIST_ITEMS = [
  {
    id: "first_property_added",
    title: "Adicionar o primeiro imóvel",
    description: "Comece por adicionar um imóvel à plataforma",
    action: "Adicionar Imóvel",
    link: createPageUrl("AddListing"),
    icon: "🏠"
  },
  {
    id: "first_lead_added",
    title: "Adicionar o primeiro lead",
    description: "Importe ou adicione manualmente um lead",
    action: "Gerir Leads",
    link: createPageUrl("Opportunities"),
    icon: "👤"
  },
  {
    id: "first_client_profile_created",
    title: "Criar perfil de cliente",
    description: "Crie um perfil detalhado com as preferências do cliente",
    action: "Criar Perfil",
    link: createPageUrl("ClientPreferences"),
    icon: "📋"
  },
  {
    id: "first_match_sent",
    title: "Enviar primeiro match",
    description: "Use a IA para encontrar o imóvel perfeito para um cliente",
    action: "Ver Matches",
    link: createPageUrl("ClientPreferences"),
    icon: "✨"
  },
  {
    id: "profile_completed",
    title: "Completar o seu perfil",
    description: "Adicione informações sobre a sua agência",
    action: "Editar Perfil",
    link: createPageUrl("Dashboard"),
    icon: "⚙️"
  }
];

export default function OnboardingChecklist({ progress, onDismiss }) {
  const completedSteps = progress?.steps_completed || {};
  const completedCount = Object.values(completedSteps).filter(Boolean).length;
  const totalSteps = CHECKLIST_ITEMS.length;
  const progressPercentage = (completedCount / totalSteps) * 100;

  const isCompleted = completedCount === totalSteps;

  return (
    <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            <CardTitle className="text-lg">Primeiros Passos</CardTitle>
          </div>
          <button onClick={onDismiss} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">
              {completedCount} de {totalSteps} tarefas completas
            </span>
            <Badge className={isCompleted ? "bg-green-600" : "bg-blue-600"}>
              {Math.round(progressPercentage)}%
            </Badge>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isCompleted ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">
              Parabéns! 🎉
            </h3>
            <p className="text-slate-600">
              Completou todas as tarefas de onboarding. Está pronto para usar a plataforma!
            </p>
          </div>
        ) : (
          CHECKLIST_ITEMS.map((item) => {
            const isCompleted = completedSteps[item.id];
            return (
              <div
                key={item.id}
                className={`p-4 rounded-lg border-2 transition-all ${
                  isCompleted
                    ? "bg-green-50 border-green-200"
                    : "bg-white border-slate-200 hover:border-blue-300"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : (
                      <Circle className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2">
                      <span className="text-xl">{item.icon}</span>
                      <div className="flex-1">
                        <h4 className={`font-semibold ${isCompleted ? "text-green-900" : "text-slate-900"}`}>
                          {item.title}
                        </h4>
                        <p className="text-sm text-slate-600 mt-1">{item.description}</p>
                        {!isCompleted && (
                          <Link to={item.link}>
                            <Button size="sm" variant="outline" className="mt-2">
                              {item.action}
                              <ArrowRight className="w-3 h-3 ml-1" />
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}