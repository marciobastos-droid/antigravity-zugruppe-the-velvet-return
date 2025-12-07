import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "../components/seo/SEOHead";

export default function ManageData() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-12 px-4">
      <SEOHead 
        title="Gerir os Seus Dados - Zugruppe"
        description="Exerça os seus direitos RGPD. Aceda, retifique ou elimine os seus dados pessoais."
      />
      <div className="max-w-4xl mx-auto">
        <Link to={createPageUrl("ZuGruppe")}>
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </Link>

        <div className="bg-white rounded-xl shadow-lg p-8 md:p-12">
          <div className="flex items-center gap-3 mb-6">
            <Database className="w-8 h-8 text-green-600" />
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900">
              Gerir os Seus Dados
            </h1>
          </div>

          <div className="space-y-6 text-slate-700">
            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">Os Seus Direitos</h2>
              <p className="mb-3">
                De acordo com o RGPD, você tem direito a:
              </p>
              <ul className="list-disc list-inside space-y-2">
                <li>Aceder aos seus dados pessoais</li>
                <li>Retificar dados incorretos ou incompletos</li>
                <li>Apagar os seus dados ("direito ao esquecimento")</li>
                <li>Limitar o tratamento dos seus dados</li>
                <li>Portabilidade dos dados</li>
                <li>Opor-se ao tratamento dos seus dados</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">Como Exercer os Seus Direitos</h2>
              <p>
                Para exercer qualquer um destes direitos, contacte-nos através de:
              </p>
              <p className="mt-3 font-medium">Email: info@zugruppe.com</p>
              <p className="mt-2 text-sm text-slate-600">
                Responderemos ao seu pedido no prazo de 30 dias.
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