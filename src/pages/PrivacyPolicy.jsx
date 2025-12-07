import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Shield } from "lucide-react";
import SEOHead from "../components/seo/SEOHead";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-slate-50">
      <SEOHead 
        title="Política de Privacidade - Zugruppe"
        description="Política de Privacidade da Zugruppe. Saiba como protegemos e tratamos os seus dados pessoais de acordo com o RGPD."
      />
      <div className="max-w-4xl mx-auto px-4 py-12">
        <Link 
          to={createPageUrl("Home")} 
          className="inline-flex items-center text-slate-600 hover:text-slate-900 mb-8"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Link>

        <div className="bg-white rounded-xl shadow-sm p-8 md:p-12">
          <div className="flex items-center gap-3 mb-8">
            <Shield className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-slate-900">Política de Privacidade</h1>
          </div>

          <div className="prose prose-slate max-w-none">
            <p className="text-slate-600 mb-6">
              Última atualização: {new Date().toLocaleDateString('pt-PT')}
            </p>

            <h2 className="text-xl font-semibold text-slate-900 mt-8 mb-4">1. Introdução</h2>
            <p className="text-slate-600 mb-4">
              A Privileged Approach Unipessoal Lda ("Zugruppe", "nós" ou "nosso") está comprometida em proteger a sua privacidade. 
              Esta Política de Privacidade explica como recolhemos, usamos, divulgamos e protegemos as suas informações pessoais 
              quando utiliza os nossos serviços e plataforma.
            </p>

            <h2 className="text-xl font-semibold text-slate-900 mt-8 mb-4">2. Informações que Recolhemos</h2>
            <p className="text-slate-600 mb-4">Podemos recolher os seguintes tipos de informações:</p>
            <ul className="list-disc pl-6 text-slate-600 mb-4 space-y-2">
              <li><strong>Dados de identificação:</strong> nome, email, telefone, morada</li>
              <li><strong>Dados profissionais:</strong> empresa, cargo, NIF</li>
              <li><strong>Dados de utilização:</strong> informações sobre como utiliza a nossa plataforma</li>
              <li><strong>Dados de comunicação:</strong> mensagens trocadas através da plataforma</li>
              <li><strong>Dados de imóveis:</strong> preferências e requisitos de imóveis</li>
            </ul>

            <h2 className="text-xl font-semibold text-slate-900 mt-8 mb-4">3. Como Utilizamos as Suas Informações</h2>
            <p className="text-slate-600 mb-4">Utilizamos as suas informações para:</p>
            <ul className="list-disc pl-6 text-slate-600 mb-4 space-y-2">
              <li>Fornecer e melhorar os nossos serviços</li>
              <li>Comunicar consigo sobre imóveis e oportunidades</li>
              <li>Processar transações e pedidos</li>
              <li>Enviar informações sobre novos imóveis que correspondam às suas preferências</li>
              <li>Cumprir obrigações legais e regulamentares</li>
              <li>Proteger os nossos direitos e propriedade</li>
            </ul>

            <h2 className="text-xl font-semibold text-slate-900 mt-8 mb-4">4. Partilha de Informações</h2>
            <p className="text-slate-600 mb-4">
              Podemos partilhar as suas informações com:
            </p>
            <ul className="list-disc pl-6 text-slate-600 mb-4 space-y-2">
              <li>Agentes e consultores imobiliários autorizados</li>
              <li>Prestadores de serviços que nos auxiliam nas operações</li>
              <li>Autoridades quando exigido por lei</li>
            </ul>
            <p className="text-slate-600 mb-4">
              Não vendemos as suas informações pessoais a terceiros.
            </p>

            <h2 className="text-xl font-semibold text-slate-900 mt-8 mb-4">5. Segurança dos Dados</h2>
            <p className="text-slate-600 mb-4">
              Implementamos medidas de segurança técnicas e organizacionais adequadas para proteger as suas informações 
              contra acesso não autorizado, alteração, divulgação ou destruição.
            </p>

            <h2 className="text-xl font-semibold text-slate-900 mt-8 mb-4">6. Os Seus Direitos</h2>
            <p className="text-slate-600 mb-4">Ao abrigo do RGPD, tem direito a:</p>
            <ul className="list-disc pl-6 text-slate-600 mb-4 space-y-2">
              <li>Aceder às suas informações pessoais</li>
              <li>Retificar dados incorretos</li>
              <li>Solicitar a eliminação dos seus dados</li>
              <li>Opor-se ao tratamento dos seus dados</li>
              <li>Portabilidade dos dados</li>
              <li>Retirar o consentimento a qualquer momento</li>
            </ul>

            <h2 className="text-xl font-semibold text-slate-900 mt-8 mb-4">7. Cookies</h2>
            <p className="text-slate-600 mb-4">
              Utilizamos cookies e tecnologias similares para melhorar a sua experiência na plataforma. 
              Pode gerir as suas preferências de cookies através das definições do seu navegador.
            </p>

            <h2 className="text-xl font-semibold text-slate-900 mt-8 mb-4">8. Retenção de Dados</h2>
            <p className="text-slate-600 mb-4">
              Mantemos as suas informações pessoais apenas pelo tempo necessário para cumprir os fins para os quais 
              foram recolhidas, ou conforme exigido por lei.
            </p>

            <h2 className="text-xl font-semibold text-slate-900 mt-8 mb-4">9. Integrações com Terceiros</h2>
            <p className="text-slate-600 mb-4">
              A nossa plataforma pode integrar-se com serviços de terceiros (como Google, Facebook, WhatsApp). 
              Estas integrações estão sujeitas às políticas de privacidade desses serviços.
            </p>

            <h2 className="text-xl font-semibold text-slate-900 mt-8 mb-4">10. Alterações a Esta Política</h2>
            <p className="text-slate-600 mb-4">
              Podemos atualizar esta Política de Privacidade periodicamente. Notificá-lo-emos sobre alterações 
              significativas através da plataforma ou por email.
            </p>

            <h2 className="text-xl font-semibold text-slate-900 mt-8 mb-4">11. Contacto</h2>
            <p className="text-slate-600 mb-4">
              Para questões sobre esta Política de Privacidade ou sobre os seus dados pessoais, contacte-nos:
            </p>
            <div className="bg-slate-50 p-4 rounded-lg text-slate-600">
              <p><strong>Privileged Approach Unipessoal Lda</strong></p>
              <p>Email: privacidade@zugruppe.com</p>
              <p>Portugal</p>
            </div>
          </div>
        </div>

        <p className="text-center text-slate-500 text-sm mt-8">
          © {new Date().getFullYear()} Zugruppe. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}