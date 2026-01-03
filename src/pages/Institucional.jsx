import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Building2, Users, Award, Globe, Heart, Target,
  TrendingUp, Shield, Sparkles, ArrowRight, Phone, Mail, MapPin, Send, Loader2, CheckCircle2 } from
"lucide-react";
import SEOHead from "../components/seo/SEOHead";
import { HelmetProvider } from "react-helmet-async";
import { useLocalization } from "../components/i18n/LocalizationContext";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

export default function Institucional() {
  const { t, locale } = useLocalization();
  const [formData, setFormData] = React.useState({
    name: '',
    email: '',
    phone: '',
    message: ''
  });
  const [submitSuccess, setSubmitSuccess] = React.useState(false);

  const sendContactMutation = useMutation({
    mutationFn: async (data) => {
      await base44.integrations.Core.SendEmail({
        to: "info@zugruppe.com",
        subject: `Novo Contacto: ${data.name}`,
        body: `Nome: ${data.name}\nEmail: ${data.email}\nTelefone: ${data.phone}\n\nMensagem:\n${data.message}`
      });
    },
    onSuccess: () => {
      setSubmitSuccess(true);
      setFormData({ name: '', email: '', phone: '', message: '' });
      toast.success(locale === 'en' ? 'Message sent successfully!' : locale === 'es' ? '¡Mensaje enviado con éxito!' : locale === 'fr' ? 'Message envoyé avec succès!' : 'Mensagem enviada com sucesso!');
      setTimeout(() => setSubmitSuccess(false), 5000);
    },
    onError: () => {
      toast.error(locale === 'en' ? 'Error sending message' : locale === 'es' ? 'Error al enviar mensaje' : locale === 'fr' ? 'Erreur lors de l\'envoi' : 'Erro ao enviar mensagem');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    sendContactMutation.mutate(formData);
  };

  const brands = [
  {
    name: t('institutional.brandsData.zuhaus.name'),
    subtitle: t('institutional.brandsData.zuhaus.subtitle'),
    description: t('institutional.brandsData.zuhaus.description'),
    logo: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6915a593b6edd8435f5838bd/62bf6ee34_ZuHausA01.jpg",
    link: createPageUrl("Website") + "?tab=residential"
  },
  {
    name: t('institutional.brandsData.zuhandel.name'),
    subtitle: t('institutional.brandsData.zuhandel.subtitle'),
    description: t('institutional.brandsData.zuhandel.description'),
    logo: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6915a593b6edd8435f5838bd/46b20d014_ZUHANDEL_square.jpg",
    link: createPageUrl("Website") + "?tab=commercial"
  },
  {
    name: t('institutional.brandsData.premium.name'),
    subtitle: t('institutional.brandsData.premium.subtitle'),
    description: t('institutional.brandsData.premium.description'),
    logo: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6915a593b6edd8435f5838bd/c00740fb7_ZUGRUPPE_branco_azul-trasnparente_c-slogan1.png",
    bgImage: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6915a593b6edd8435f5838bd/4e6f195ab_ImagemImovelLuxo.jpg",
    link: createPageUrl("PremiumLuxury")
  },
  {
    name: t('institutional.brandsData.worldwide.name'),
    subtitle: t('institutional.brandsData.worldwide.subtitle'),
    description: t('institutional.brandsData.worldwide.description'),
    logo: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6915a593b6edd8435f5838bd/359538617_Zugruppe01.jpg",
    bgImage: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6915a593b6edd8435f5838bd/d6375d583_WorldWide.jpg",
    link: createPageUrl("WorldWideProperties")
  }];


  const services = [
  {
    name: t('institutional.servicesData.finance.name'),
    subtitle: t('institutional.servicesData.finance.subtitle'),
    description: t('institutional.servicesData.finance.description'),
    logo: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6915a593b6edd8435f5838bd/a85a26869_LogoZuFinance.jpg",
    link: createPageUrl("Website")
  },
  {
    name: t('institutional.servicesData.garden.name'),
    subtitle: t('institutional.servicesData.garden.subtitle'),
    description: t('institutional.servicesData.garden.description'),
    logo: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6915a593b6edd8435f5838bd/e079a713e_LogoZuGarden.png",
    link: createPageUrl("Website")
  },
  {
    name: t('institutional.servicesData.projekt.name'),
    subtitle: t('institutional.servicesData.projekt.subtitle'),
    description: t('institutional.servicesData.projekt.description'),
    logo: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6915a593b6edd8435f5838bd/b8697fed0_ZUPROJEKT.pdf",
    link: createPageUrl("Website")
  }];


  const values = [
  {
    icon: Heart,
    title: t('institutional.valuesList.passion'),
    description: t('institutional.valuesList.passionDesc')
  },
  {
    icon: Shield,
    title: t('institutional.valuesList.transparency'),
    description: t('institutional.valuesList.transparencyDesc')
  },
  {
    icon: Target,
    title: t('institutional.valuesList.clientFocus'),
    description: t('institutional.valuesList.clientFocusDesc')
  },
  {
    icon: Sparkles,
    title: t('institutional.valuesList.innovation'),
    description: t('institutional.valuesList.innovationDesc')
  },
  {
    icon: TrendingUp,
    title: t('institutional.valuesList.excellence'),
    description: t('institutional.valuesList.excellenceDesc')
  },
  {
    icon: Globe,
    title: t('institutional.valuesList.globalVision'),
    description: t('institutional.valuesList.globalVisionDesc')
  }];


  const stats = [
  { number: "100+", label: t('institutional.stats.propertiesSold') },
  { number: "500+", label: t('institutional.stats.satisfiedClients') },
  { number: "15+", label: t('institutional.stats.yearsExperience') },
  { number: "20+", label: t('institutional.stats.consultants') }];


  return (
    <HelmetProvider>
      <div className="min-h-screen bg-slate-50">
        <SEOHead
          title={`ZuGruppe - ${t('institutional.title')} | ${locale === 'en' ? 'Trusted Real Estate in Portugal' : locale === 'es' ? 'Inmobiliaria de Confianza en Portugal' : locale === 'fr' ? 'Immobilier de Confiance au Portugal' : 'Imobiliária de Confiança em Portugal'}`}
          description={locale === 'en' 
            ? "Meet ZuGruppe, leading real estate group in Portugal. With brands ZuHaus, ZuHandel and Premium Luxury, we offer complete solutions in residential, commercial and luxury real estate."
            : locale === 'es'
            ? "Conozca ZuGruppe, grupo inmobiliario líder en Portugal. Con las marcas ZuHaus, ZuHandel y Premium Lujo, ofrecemos soluciones completas en inmobiliaria residencial, comercial y de lujo."
            : locale === 'fr'
            ? "Découvrez ZuGruppe, groupe immobilier leader au Portugal. Avec les marques ZuHaus, ZuHandel et Premium Luxe, nous proposons des solutions complètes en immobilier résidentiel, commercial et de luxe."
            : "Conheça a ZuGruppe, grupo imobiliário líder em Portugal. Com as marcas ZuHaus, ZuHandel e Premium Luxo, oferecemos soluções completas em imobiliário residencial, comercial e de luxo."}
          keywords="zugruppe, imobiliária portugal, sobre zugruppe, zuhaus, zuhandel, imóveis luxo portugal, grupo imobiliário"
          image="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6915a593b6edd8435f5838bd/359538617_Zugruppe01.jpg" />


        {/* Hero Section */}
        <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1600')] bg-cover bg-center opacity-10" />
          <div className="relative max-w-7xl mx-auto px-4 py-12 md:py-16">
            <div className="text-center">
              <img
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6915a593b6edd8435f5838bd/c00740fb7_ZUGRUPPE_branco_azul-trasnparente_c-slogan1.png"
                alt="ZuGruppe"
                className="h-32 md:h-40 lg:h-48 w-auto mx-auto" />
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="bg-white py-12 border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map((stat, index) =>
              <div key={index} className="text-center">
                  <div className="text-4xl md:text-5xl font-bold text-blue-600 mb-2">{stat.number}</div>
                  <div className="text-slate-600">{stat.label}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mission Section */}
        <div className="max-w-7xl mx-auto px-4 py-16 md:py-24">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="mb-4 bg-blue-100 text-blue-800">
                {locale === 'en' ? 'Our Mission' : locale === 'es' ? 'Nuestra Misión' : locale === 'fr' ? 'Notre Mission' : 'Nossa Missão'}
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">
                {t('institutional.mission')}
              </h2>
              <p className="text-lg text-slate-600 mb-6 leading-relaxed">
                {t('institutional.missionText')}
              </p>
              <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                {t('institutional.commitment')}
              </p>
              <div className="flex items-center gap-4">
                <Award className="w-12 h-12 text-blue-600" />
                <div>
                  <div className="font-semibold text-slate-900">
                    {locale === 'en' ? 'License' : locale === 'es' ? 'Licencia' : locale === 'fr' ? 'Licence' : 'Licença'} IMPIC 11355
                  </div>
                  <div className="text-sm text-slate-600">
                    {locale === 'en' ? 'Official Certification' : locale === 'es' ? 'Certificación Oficial' : locale === 'fr' ? 'Certification Officielle' : 'Certificação Oficial'}
                  </div>
                </div>
              </div>
            </div>
            <div className="relative">
              <img
                src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800"
                alt="Equipa ZuGruppe"
                className="rounded-2xl shadow-2xl" />

              <div className="absolute -bottom-6 -left-6 bg-blue-600 text-white p-6 rounded-xl shadow-xl">
                <div className="text-3xl font-bold mb-1">15+</div>
                <div className="text-sm">{t('institutional.stats.yearsExperience')}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Values Section */}
        <div className="bg-slate-100 py-16 md:py-24">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-12">
              <Badge className="mb-4 bg-blue-100 text-blue-800">
                {locale === 'en' ? 'Our Values' : locale === 'es' ? 'Nuestros Valores' : locale === 'fr' ? 'Nos Valeurs' : 'Nossos Valores'}
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                {t('institutional.values')}
              </h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                {t('institutional.valuesSubtitle')}
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {values.map((value, index) =>
              <Card key={index} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                      <value.icon className="w-6 h-6 text-blue-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">{value.title}</h3>
                    <p className="text-slate-600">{value.description}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>

        {/* Brands Section */}
        <div className="max-w-7xl mx-auto px-4 py-16 md:py-24">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-blue-100 text-blue-800">
              {locale === 'en' ? 'Our Brands' : locale === 'es' ? 'Nuestras Marcas' : locale === 'fr' ? 'Nos Marques' : 'Nossas Marcas'}
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              {t('institutional.brands')}
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              {t('institutional.brandsSubtitle')}
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-16">
            {brands.slice(0, 2).map((brand, index) =>
            <Card key={index} className="overflow-hidden hover:shadow-xl transition-all group bg-white">
                <CardContent className="p-8">
                  <div className="flex items-center justify-center mb-6 min-h-[120px]">
                    <img
                    src={brand.logo}
                    alt={brand.name}
                    className="max-h-24 w-auto object-contain" />

                  </div>
                  <p className="text-blue-600 text-sm font-medium mb-4">{brand.subtitle}</p>
                  <p className="text-slate-600 mb-6 leading-relaxed text-sm">{brand.description}</p>
                  <Link to={brand.link}>
                    <Button className="w-full group-hover:bg-blue-600 transition-colors">
                      {locale === 'en' ? 'Explore' : locale === 'es' ? 'Explorar' : locale === 'fr' ? 'Explorer' : 'Explorar'} {brand.name}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </div>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {brands.slice(2).map((brand, index) =>
            <Card key={index} className="overflow-hidden hover:shadow-xl transition-all group relative">
                {brand.bgImage && (
                  <div 
                    className="absolute inset-0 bg-cover bg-center opacity-20 group-hover:opacity-30 transition-opacity"
                    style={{ backgroundImage: `url(${brand.bgImage})` }}
                  />
                )}
                <CardContent className="p-8 relative z-10 bg-white/95 backdrop-blur-sm">
                  <div className="flex items-center justify-center mb-6 min-h-[120px]">
                    <img
                    src={brand.logo}
                    alt={brand.name}
                    className="max-h-24 w-auto object-contain" />

                  </div>
                  <p className="text-blue-600 text-sm font-medium mb-4">{brand.subtitle}</p>
                  <p className="text-slate-600 mb-6 leading-relaxed text-sm">{brand.description}</p>
                  <Link to={brand.link}>
                    <Button className="w-full group-hover:bg-blue-600 transition-colors">
                      {locale === 'en' ? 'Explore' : locale === 'es' ? 'Explorar' : locale === 'fr' ? 'Explorer' : 'Explorar'} {brand.name}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Services Section */}
        <div className="bg-slate-100 py-16 md:py-24">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-12">
              <Badge className="mb-4 bg-green-100 text-green-800">
                {locale === 'en' ? 'Our Services' : locale === 'es' ? 'Nuestros Servicios' : locale === 'fr' ? 'Nos Services' : 'Nossos Serviços'}
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                {t('institutional.services')}
              </h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                {t('institutional.servicesSubtitle')}
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {services.map((service, index) =>
              <Card key={index} className="overflow-hidden hover:shadow-xl transition-all group bg-white">
                  <CardContent className="p-8">
                    <div className="flex items-center justify-center mb-6 min-h-[120px]">
                      <img
                      src={service.logo}
                      alt={service.name}
                      className="max-h-24 w-auto object-contain" />

                    </div>
                    <p className="text-green-600 text-sm font-medium mb-4">{service.subtitle}</p>
                    <p className="text-slate-600 mb-6 leading-relaxed text-sm">{service.description}</p>
                    <Link to={service.link}>
                      <Button variant="outline" className="w-full group-hover:bg-green-50 transition-colors">
                        {locale === 'en' ? 'Learn More' : locale === 'es' ? 'Saber Más' : locale === 'fr' ? 'En Savoir Plus' : 'Saber Mais'}
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>

        {/* Contact Section */}
        <div id="contacto" className="bg-gradient-to-br from-blue-600 to-indigo-700 py-16 md:py-24">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                {t('institutional.contact')}
              </h2>
              <p className="text-xl text-blue-100 max-w-2xl mx-auto">
                {t('institutional.contactSubtitle')}
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-12 max-w-6xl mx-auto">
              {/* Contact Info Cards */}
              <div className="space-y-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Phone className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900 mb-1">{t('common.phone')}</h3>
                        <a href="tel:+351234026615" className="text-blue-600 hover:underline">
                          +351 234 026 615
                        </a>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Mail className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900 mb-1">{t('common.email')}</h3>
                        <a href="mailto:info@zugruppe.com" className="text-blue-600 hover:underline">
                          info@zugruppe.com
                        </a>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900 mb-1">
                          {locale === 'en' ? 'Location' : locale === 'es' ? 'Ubicación' : locale === 'fr' ? 'Emplacement' : 'Localização'}
                        </h3>
                        <p className="text-slate-600 text-sm">Aveiro, Porto e Lisboa</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Contact Form */}
              <Card>
                <CardContent className="p-6">
                  {submitSuccess ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="w-8 h-8 text-green-600" />
                      </div>
                      <h3 className="text-xl font-semibold text-slate-900 mb-2">
                        {locale === 'en' ? 'Message sent!' : locale === 'es' ? '¡Mensaje enviado!' : locale === 'fr' ? 'Message envoyé!' : 'Mensagem enviada!'}
                      </h3>
                      <p className="text-slate-600">
                        {locale === 'en' ? 'We will contact you soon.' : locale === 'es' ? 'Nos pondremos en contacto pronto.' : locale === 'fr' ? 'Nous vous recontacterons bientôt.' : 'Entraremos em contacto em breve.'}
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-900 mb-2">
                          {t('contact.name')} *
                        </label>
                        <Input
                          value={formData.name}
                          onChange={(e) => setFormData({...formData, name: e.target.value})}
                          placeholder={locale === 'en' ? 'Your name' : locale === 'es' ? 'Su nombre' : locale === 'fr' ? 'Votre nom' : 'O seu nome'}
                          required
                          className="bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-900 mb-2">
                          {t('common.email')} *
                        </label>
                        <Input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({...formData, email: e.target.value})}
                          placeholder={locale === 'en' ? 'your-email@example.com' : 'o-seu-email@exemplo.com'}
                          required
                          className="bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-900 mb-2">
                          {t('common.phone')}
                        </label>
                        <Input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({...formData, phone: e.target.value})}
                          placeholder="+351 9XX XXX XXX"
                          className="bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-900 mb-2">
                          {t('contact.message')} *
                        </label>
                        <Textarea
                          value={formData.message}
                          onChange={(e) => setFormData({...formData, message: e.target.value})}
                          placeholder={t('contact.messagePlaceholder')}
                          rows={5}
                          required
                          className="bg-white"
                        />
                      </div>
                      <Button
                        type="submit"
                        className="w-full bg-white text-blue-600 hover:bg-blue-50"
                        disabled={sendContactMutation.isPending}
                      >
                        {sendContactMutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            {t('contact.sending')}
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4 mr-2" />
                            {t('contact.send')}
                          </>
                        )}
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>
            </div>
            <div className="text-center mt-12">
              <Link to={createPageUrl("Website")}>
                <Button size="lg" className="bg-white text-blue-600 hover:bg-slate-100">
                  <Building2 className="w-5 h-5 mr-2" />
                  {locale === 'en' ? 'View All Properties' : locale === 'es' ? 'Ver Todas las Propiedades' : locale === 'fr' ? 'Voir Toutes les Propriétés' : 'Ver Todos os Imóveis'}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </HelmetProvider>);

}