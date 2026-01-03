import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Shield } from "lucide-react";
import { useLocalization } from "../components/i18n/LocalizationContext";

export default function PrivacyPolicy() {
  const { t, locale } = useLocalization();
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <Link to={createPageUrl("Website")}>
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('common.back')}
          </Button>
        </Link>

        <div className="bg-white rounded-xl shadow-lg p-8 md:p-12">
          <div className="flex items-center gap-3 mb-6">
            <FileText className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900">
              {t('legal.termsTitle')}
            </h1>
          </div>

          <p className="text-sm text-slate-600 mb-8">
            {t('legal.termsUpdated')}: {new Date().toLocaleDateString(locale === 'en' ? 'en-US' : locale === 'es' ? 'es-ES' : locale === 'fr' ? 'fr-FR' : 'pt-PT', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          <div className="space-y-6 text-slate-700">
            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">1. {t('legal.termsAcceptance')}</h2>
              <p>{t('legal.termsAcceptanceText')}</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">2. {t('legal.acceptableUse')}</h2>
              <p>{t('legal.acceptableUseText')}</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>{t('legal.prohibitedActions.illegal')}</li>
                <li>{t('legal.prohibitedActions.spam')}</li>
                <li>{t('legal.prohibitedActions.harm')}</li>
                <li>{t('legal.prohibitedActions.violation')}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">3. {t('legal.applicableLaw')}</h2>
              <p>{t('legal.applicableLawText')}</p>
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

        <p className="text-center text-slate-500 text-sm mt-8">
          © {new Date().getFullYear()} Zugruppe. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}