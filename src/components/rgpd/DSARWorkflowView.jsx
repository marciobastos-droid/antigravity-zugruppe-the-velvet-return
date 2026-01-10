import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, Clock, XCircle, ArrowRight, Download, Trash2, FileText } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

const WORKFLOW_STEPS = [
  { id: "submitted", label: "Submetido", icon: Circle },
  { id: "validation", label: "Validação Identidade", icon: Clock },
  { id: "processing", label: "Em Processamento", icon: Clock },
  { id: "completed", label: "Concluído", icon: CheckCircle2 }
];

export default function DSARWorkflowView({ request, onAction }) {
  const getCurrentStep = () => {
    if (request.status === "rejected") return -1;
    if (request.status === "completed") return 3;
    if (request.status === "in_progress") return 2;
    if (request.status === "pending_validation") return 1;
    return 0;
  };

  const currentStep = getCurrentStep();
  const daysRemaining = request.deadline_date 
    ? differenceInDays(new Date(request.deadline_date), new Date())
    : null;

  const isUrgent = daysRemaining !== null && daysRemaining < 5;
  const isOverdue = daysRemaining !== null && daysRemaining < 0;

  return (
    <Card className={`border-l-4 ${
      request.status === "completed" ? "border-l-green-500" :
      request.status === "rejected" ? "border-l-red-500" :
      isOverdue ? "border-l-red-500" :
      isUrgent ? "border-l-amber-500" :
      "border-l-blue-500"
    }`}>
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-bold text-slate-900">
                {getRequestTypeLabel(request.request_type)}
              </h3>
              {getStatusBadge(request.status, daysRemaining, isOverdue)}
            </div>
            <div className="text-sm text-slate-600 space-y-1">
              <p><strong>Nome:</strong> {request.requester_name}</p>
              <p><strong>Email:</strong> {request.requester_email}</p>
            </div>
          </div>
          {request.identification_document && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.open(request.identification_document, '_blank')}
            >
              <FileText className="w-4 h-4 mr-2" />
              Ver ID
            </Button>
          )}
        </div>

        {/* Workflow Progress */}
        {request.status !== "rejected" && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              {WORKFLOW_STEPS.map((step, index) => {
                const Icon = step.icon;
                const isActive = index === currentStep;
                const isCompleted = index < currentStep;
                
                return (
                  <React.Fragment key={step.id}>
                    <div className="flex flex-col items-center flex-1">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                        isCompleted ? "bg-green-600 text-white" :
                        isActive ? "bg-blue-600 text-white animate-pulse" :
                        "bg-slate-200 text-slate-400"
                      }`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <p className={`text-xs mt-2 text-center ${
                        isCompleted ? "text-green-700 font-medium" :
                        isActive ? "text-blue-700 font-medium" :
                        "text-slate-500"
                      }`}>
                        {step.label}
                      </p>
                    </div>
                    {index < WORKFLOW_STEPS.length - 1 && (
                      <div className={`flex-1 h-0.5 mx-2 mb-8 transition-all ${
                        index < currentStep ? "bg-green-600" : "bg-slate-200"
                      }`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}

        {/* Timeline */}
        <div className="space-y-2 mb-6">
          <div className="flex items-center gap-2 text-sm">
            <Badge variant="outline" className="text-xs">
              <Clock className="w-3 h-3 mr-1" />
              Submetido
            </Badge>
            <span className="text-slate-600">
              {format(new Date(request.created_date), "dd/MM/yyyy HH:mm", { locale: ptBR })}
            </span>
          </div>
          
          {request.validated_date && (
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="outline" className="text-xs">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Validado
              </Badge>
              <span className="text-slate-600">
                {format(new Date(request.validated_date), "dd/MM/yyyy HH:mm", { locale: ptBR })}
              </span>
              {request.validated_by && (
                <span className="text-slate-500">por {request.validated_by}</span>
              )}
            </div>
          )}

          {request.deadline_date && (
            <div className="flex items-center gap-2 text-sm">
              <Badge className={`text-xs ${
                isOverdue ? "bg-red-600 text-white" :
                isUrgent ? "bg-amber-600 text-white" :
                "bg-blue-100 text-blue-800"
              }`}>
                <Calendar className="w-3 h-3 mr-1" />
                Prazo
              </Badge>
              <span className={`font-medium ${
                isOverdue ? "text-red-600" :
                isUrgent ? "text-amber-600" :
                "text-slate-600"
              }`}>
                {format(new Date(request.deadline_date), "dd/MM/yyyy", { locale: ptBR })}
                {daysRemaining !== null && (
                  <span className="ml-2">
                    ({isOverdue ? "atrasado" : `${daysRemaining} dias restantes`})
                  </span>
                )}
              </span>
            </div>
          )}

          {request.response_sent_date && (
            <div className="flex items-center gap-2 text-sm">
              <Badge className="bg-green-600 text-white text-xs">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Respondido
              </Badge>
              <span className="text-slate-600">
                {format(new Date(request.response_sent_date), "dd/MM/yyyy HH:mm", { locale: ptBR })}
              </span>
            </div>
          )}
        </div>

        {/* Description */}
        {request.description && (
          <div className="p-3 bg-slate-50 rounded-lg border mb-4">
            <p className="text-sm text-slate-700">{request.description}</p>
          </div>
        )}

        {/* Rejection Reason */}
        {request.rejection_reason && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
            <p className="text-sm font-medium text-red-900 mb-1">Motivo de Rejeição:</p>
            <p className="text-sm text-red-700">{request.rejection_reason}</p>
          </div>
        )}

        {/* Actions */}
        {request.status === "in_progress" && (
          <div className="flex gap-2 pt-4 border-t">
            {request.request_type === "access" && (
              <Button
                size="sm"
                onClick={() => onAction?.("export", request.id)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar e Enviar Dados
              </Button>
            )}
            {request.request_type === "erasure" && (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => onAction?.("delete", request.id)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Eliminar Dados
              </Button>
            )}
            {request.request_type === "rectification" && (
              <Button
                size="sm"
                onClick={() => onAction?.("rectify", request.id)}
                className="bg-amber-600 hover:bg-amber-700"
              >
                <FileText className="w-4 h-4 mr-2" />
                Retificar Dados
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function getRequestTypeLabel(type) {
  const labels = {
    access: "Acesso aos Dados",
    rectification: "Retificação de Dados",
    erasure: "Eliminação de Dados (Direito ao Esquecimento)",
    restriction: "Limitação do Tratamento",
    portability: "Portabilidade de Dados",
    objection: "Oposição ao Tratamento"
  };
  return labels[type] || type;
}

function getStatusBadge(status, daysRemaining, isOverdue) {
  if (status === "completed") {
    return (
      <Badge className="bg-green-600 text-white">
        <CheckCircle2 className="w-3 h-3 mr-1" />
        Concluído
      </Badge>
    );
  }
  if (status === "rejected") {
    return (
      <Badge className="bg-red-600 text-white">
        <XCircle className="w-3 h-3 mr-1" />
        Rejeitado
      </Badge>
    );
  }
  if (isOverdue) {
    return (
      <Badge className="bg-red-600 text-white">
        <AlertCircle className="w-3 h-3 mr-1" />
        Prazo Excedido
      </Badge>
    );
  }
  if (daysRemaining !== null && daysRemaining < 5) {
    return (
      <Badge className="bg-amber-600 text-white">
        <Clock className="w-3 h-3 mr-1" />
        Urgente ({daysRemaining}d)
      </Badge>
    );
  }
  if (status === "in_progress") {
    return (
      <Badge className="bg-blue-600 text-white">
        <Clock className="w-3 h-3 mr-1" />
        Em Progresso
      </Badge>
    );
  }
  return (
    <Badge className="bg-slate-600 text-white">
      <Clock className="w-3 h-3 mr-1" />
      Pendente
    </Badge>
  );
}