import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocalization } from "../components/i18n/LocalizationContext";

export default function ManageData() {
  const { t, locale } = useLocalization();
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Link to={createPageUrl("Website")}>
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('common.back')}
          </Button>
        </Link>

        <div className="bg-white rounded-xl shadow-lg p-8 md:p-12">
          <div className="flex items-center gap-3 mb-6">
            <Database className="w-8 h-8 text-green-600" />
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900">
              {t('legal.manageDataTitle')}
            </h1>
          </div>

          <div className="space-y-6 text-slate-700">
            <section>
              <p className="mb-4">{t('legal.manageDataIntro')}</p>
              <h2 className="text-xl font-bold text-slate-900 mb-3">{t('legal.yourRights')}</h2>
              <ul className="list-disc list-inside space-y-2">
                <li>{t('legal.yourRightsList.access')}</li>
                <li>{t('legal.yourRightsList.rectification')}</li>
                <li>{t('legal.yourRightsList.erasure')}</li>
                <li>{t('legal.yourRightsList.portability')}</li>
                <li>{t('legal.yourRightsList.objection')}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">
                {locale === 'en' ? 'How to Exercise Your Rights' : locale === 'es' ? 'Cómo Ejercer Sus Derechos' : locale === 'fr' ? 'Comment Exercer Vos Droits' : 'Como Exercer os Seus Direitos'}
              </h2>
              <p>{t('legal.exerciseRights')}</p>
              <p className="mt-3 font-medium">Email: info@zugruppe.com</p>
              <p className="mt-2 text-sm text-slate-600">
                {locale === 'en' ? 'We will respond to your request within 30 days.'
                  : locale === 'es' ? 'Responderemos a su solicitud en un plazo de 30 días.'
                  : locale === 'fr' ? 'Nous répondrons à votre demande dans un délai de 30 jours.'
                  : 'Responderemos ao seu pedido no prazo de 30 dias.'}
              </p>
            </section>

            <section className="bg-blue-50 p-6 rounded-lg border border-blue-200">
              <h2 className="text-xl font-bold text-slate-900 mb-3">{t('legal.contact')}</h2>
              <p className="font-medium">Email: info@zugruppe.com</p>
              <p className="font-medium">
                {locale === 'en' ? 'Company' : locale === 'es' ? 'Empresa' : locale === 'fr' ? 'Entreprise' : 'Empresa'}: Privileged Approach Unipessoal Lda
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}