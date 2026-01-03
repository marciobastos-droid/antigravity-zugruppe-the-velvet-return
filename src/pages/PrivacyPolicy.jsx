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
          <button className="inline-flex items-center text-slate-600 hover:text-slate-900 mb-8">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('common.back')}
          </button>
        </Link>

        <div className="bg-white rounded-xl shadow-sm p-8 md:p-12">
          <div className="flex items-center gap-3 mb-8">
            <Shield className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-slate-900">{t('legal.privacyTitle')}</h1>
          </div>

          <div className="prose prose-slate max-w-none">
            <p className="text-slate-600 mb-6">
              {t('legal.termsUpdated')}: {new Date().toLocaleDateString(locale === 'en' ? 'en-US' : locale === 'es' ? 'es-ES' : locale === 'fr' ? 'fr-FR' : 'pt-PT')}
            </p>

            <section className="mb-6">
              <p className="text-slate-600">{t('legal.privacyIntro')}</p>
            </section>

            <section className="mb-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">1. {t('legal.dataCollection')}</h2>
              <p className="text-slate-600">{t('legal.dataCollectionText')}</p>
            </section>

            <section className="mb-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">2. {t('legal.dataUse')}</h2>
              <p className="text-slate-600">{t('legal.dataUseText')}</p>
            </section>

            <section className="mb-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">3. {t('legal.dataSharing')}</h2>
              <p className="text-slate-600">{t('legal.dataSharingText')}</p>
            </section>

            <section className="mb-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">4. {t('legal.dataSecurity')}</h2>
              <p className="text-slate-600">{t('legal.dataSecurityText')}</p>
            </section>

            <section className="mb-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">5. {t('legal.yourRights')}</h2>
              <p className="text-slate-600">{t('legal.yourRightsText')}</p>
            </section>

            <section className="mb-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">6. {t('legal.cookies')}</h2>
              <p className="text-slate-600">{t('legal.cookiesText')}</p>
            </section>

            <section className="mb-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">7. {t('legal.dataRetention')}</h2>
              <p className="text-slate-600">{t('legal.dataRetentionText')}</p>
            </section>

            <section className="mb-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">8. {t('legal.thirdParty')}</h2>
              <p className="text-slate-600">{t('legal.thirdPartyText')}</p>
            </section>

            <section className="bg-blue-50 p-6 rounded-lg border border-blue-200">
              <h2 className="text-xl font-bold text-slate-900 mb-3">{t('legal.contact')}</h2>
              <p className="font-medium">Email: privacidade@zugruppe.com</p>
              <p className="font-medium">
                {locale === 'en' ? 'Company' : locale === 'es' ? 'Empresa' : locale === 'fr' ? 'Entreprise' : 'Empresa'}: Privileged Approach Unipessoal Lda
              </p>
              <p>Portugal</p>
            </section>
          </div>
        </div>

        <p className="text-center text-slate-500 text-sm mt-8">
          © {new Date().getFullYear()} Zugruppe. {t('footer.rights')}.
        </p>
      </div>
    </div>
  );
}