import React from "react";
import { Shield, FileText, CheckCircle2, Info } from "lucide-react";
import DSARRequestForm from "../components/rgpd/DSARRequestForm";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function DSARPortal() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Portal RGPD - Exercer os Seus Direitos
          </h1>
          <p className="text-slate-600">
            Exerça os seus direitos sobre os dados pessoais que detemos sobre si
          </p>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="border-blue-200">
            <CardContent className="p-4 text-center">
              <FileText className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-900">Resposta em</p>
              <p className="text-2xl font-bold text-blue-600">30 dias</p>
              <p className="text-xs text-slate-600 mt-1">Prazo legal</p>
            </CardContent>
          </Card>

          <Card className="border-green-200">
            <CardContent className="p-4 text-center">
              <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-900">100% Seguro</p>
              <p className="text-2xl font-bold text-green-600">Validado</p>
              <p className="text-xs text-slate-600 mt-1">Identidade verificada</p>
            </CardContent>
          </Card>

          <Card className="border-purple-200">
            <CardContent className="p-4 text-center">
              <Shield className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-900">Conforme</p>
              <p className="text-2xl font-bold text-purple-600">RGPD</p>
              <p className="text-xs text-slate-600 mt-1">Lei portuguesa</p>
            </CardContent>
          </Card>
        </div>

        {/* Formulário */}
        <DSARRequestForm />

        {/* Informações Legais */}
        <Card className="mt-6 border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-slate-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-slate-700 space-y-2">
                <p className="font-medium text-slate-900">Informações Importantes:</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Todos os pedidos são validados para proteger a sua identidade</li>
                  <li>É necessário documento de identificação válido</li>
                  <li>Responderemos dentro de 30 dias (prorrogável até 60 dias em casos complexos)</li>
                  <li>Pode exercer estes direitos gratuitamente</li>
                  <li>Para mais informações, consulte a nossa <Link to={createPageUrl("PrivacyPolicy")} className="text-blue-600 hover:underline">Política de Privacidade</Link></li>
                </ul>
                
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <p className="font-medium text-slate-900 mb-1">Contacto DPO (Encarregado de Proteção de Dados):</p>
                  <p>Email: info@zuconnect.pt</p>
                  <p>Telefone: +351 234 026 615</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}