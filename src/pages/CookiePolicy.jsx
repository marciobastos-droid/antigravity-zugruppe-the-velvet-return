import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CookiePolicy() {
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
            <Cookie className="w-8 h-8 text-amber-600" />
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900">
              Política de Cookies
            </h1>
          </div>

          <p className="text-sm text-slate-600 mb-8">
            Última atualização: {new Date().toLocaleDateString('pt-PT', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          <div className="space-y-6 text-slate-700">
            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">O que são Cookies?</h2>
              <p>
                Cookies são pequenos ficheiros de texto que são armazenados no seu dispositivo quando visita um website.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">Como Utilizamos Cookies</h2>
              <ul className="list-disc list-inside space-y-2">
                <li><strong>Cookies Essenciais:</strong> Necessários para o funcionamento básico</li>
                <li><strong>Cookies de Análise:</strong> Para entender como usa o site</li>
                <li><strong>Cookies de Marketing:</strong> Para publicidade relevante</li>
              </ul>
            </section>

            <section className="bg-blue-50 p-6 rounded-lg border border-blue-200">
              <h2 className="text-xl font-bold text-slate-900 mb-3">Contacto</h2>
              <p className="font-medium">Email: info@zugruppe.com</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}