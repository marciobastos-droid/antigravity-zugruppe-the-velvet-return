import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocalization } from "../components/i18n/LocalizationContext";

export default function CookiePolicy() {
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
            <Cookie className="w-8 h-8 text-amber-600" />
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900">
              {t('legal.cookiePolicyTitle')}
            </h1>
          </div>

          <p className="text-sm text-slate-600 mb-8">
            {t('legal.termsUpdated')}: {new Date().toLocaleDateString(locale === 'en' ? 'en-US' : locale === 'es' ? 'es-ES' : locale === 'fr' ? 'fr-FR' : 'pt-PT', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          <div className="space-y-6 text-slate-700">
            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">{t('legal.whatAreCookies')}</h2>
              <p>{t('legal.whatAreCookiesText')}</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">{t('legal.howWeUseCookies')}</h2>
              <p className="mb-4">{t('legal.howWeUseCookiesText')}</p>
              <ul className="list-disc list-inside space-y-2">
                <li>{t('legal.cookieTypes.essential')}</li>
                <li>{t('legal.cookieTypes.analytics')}</li>
                <li>{t('legal.cookieTypes.marketing')}</li>
              </ul>
            </section>

            <section className="bg-blue-50 p-6 rounded-lg border border-blue-200">
              <h2 className="text-xl font-bold text-slate-900 mb-3">{t('legal.contact')}</h2>
              <p className="font-medium">Email: info@zugruppe.com</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}