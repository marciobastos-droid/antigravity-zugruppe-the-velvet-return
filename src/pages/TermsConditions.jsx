import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TermsConditions() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Link to={createPageUrl("ZuGruppe")}>
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </Link>

        <div className="bg-white rounded-xl shadow-lg p-8 md:p-12">
          <div className="flex items-center gap-3 mb-6">
            <FileText className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900">
              Termos e Condições
            </h1>
          </div>

          <p className="text-sm text-slate-600 mb-8">
            Última atualização: {new Date().toLocaleDateString('pt-PT', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          <div className="space-y-6 text-slate-700">
            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">1. Aceitação dos Termos</h2>
              <p>
                Ao aceder e utilizar a plataforma Zugruppe, você aceita e concorda em ficar vinculado 
                a estes Termos e Condições. Se não concordar com estes termos, não deverá utilizar os nossos serviços.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">2. Uso Aceitável</h2>
              <p>Ao utilizar a plataforma, você concorda em não:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Violar qualquer lei ou regulamento aplicável</li>
                <li>Publicar conteúdo falso, enganoso ou fraudulento</li>
                <li>Infringir direitos de propriedade intelectual de terceiros</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">3. Lei Aplicável</h2>
              <p>
                Estes Termos e Condições são regidos pela lei portuguesa.
              </p>
            </section>

            <section className="bg-blue-50 p-6 rounded-lg border border-blue-200">
              <h2 className="text-xl font-bold text-slate-900 mb-3">Contacto</h2>
              <p className="font-medium">Email: info@zugruppe.com</p>
              <p className="font-medium">Empresa: Privileged Approach Unipessoal Lda</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}