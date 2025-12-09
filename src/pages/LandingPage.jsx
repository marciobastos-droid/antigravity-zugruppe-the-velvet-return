import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Phone, Mail, MapPin, Send, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import SEOHead from "../components/seo/SEOHead";

export default function LandingPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const slug = window.location.pathname.split('/lp/')[1] || urlParams.get('slug');
  const isPreview = urlParams.get('preview') === 'true';
  const queryClient = useQueryClient();

  const [formData, setFormData] = React.useState({
    name: '',
    email: '',
    phone: '',
    message: ''
  });
  const [submitted, setSubmitted] = React.useState(false);

  const { data: page, isLoading, error } = useQuery({
    queryKey: ['landingPage', slug],
    queryFn: async () => {
      const pages = await base44.entities.LandingPage.filter({ slug: slug });
      if (pages.length === 0) throw new Error('Landing page não encontrada');
      
      const page = pages[0];
      
      // Track view (only for published pages, not preview)
      const isPreviewMode = new URLSearchParams(window.location.search).get('preview') === 'true';
      if (page.status === 'published' && !isPreviewMode) {
        await base44.entities.LandingPage.update(page.id, {
          analytics: {
            ...page.analytics,
            views: (page.analytics?.views || 0) + 1
          }
        });
      }
      
      return page;
    },
    enabled: !!slug,
    retry: false
  });

  const submitMutation = useMutation({
    mutationFn: async (data) => {
      // Create opportunity
      const { data: refData } = await base44.functions.invoke('generateRefId', { entity_type: 'Opportunity' });
      
      await base44.entities.Opportunity.create({
        ref_id: refData.ref_id,
        lead_type: 'comprador',
        buyer_name: data.name,
        buyer_email: data.email,
        buyer_phone: data.phone,
        message: `Contacto via Landing Page: ${page.title}\n\n${data.message}`,
        status: 'new',
        lead_source: 'landing_page',
        landing_page_slug: slug
      });

      // Update conversion analytics
      await base44.entities.LandingPage.update(page.id, {
        analytics: {
          ...page.analytics,
          conversions: (page.analytics?.conversions || 0) + 1,
          conversion_rate: ((page.analytics?.conversions || 0) + 1) / (page.analytics?.views || 1) * 100
        }
      });
    },
    onSuccess: () => {
      setSubmitted(true);
      toast.success('Mensagem enviada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['landingPage', slug] });
    },
    onError: () => {
      toast.error('Erro ao enviar mensagem. Tente novamente.');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    submitMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Página não encontrada</h2>
          <p className="text-slate-600">A landing page que procura não existe ou foi removida.</p>
        </div>
      </div>
    );
  }

  // Allow preview mode even for draft pages
  if (page.status !== 'published' && !isPreview) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Página não disponível</h2>
          <p className="text-slate-600">Esta landing page ainda não foi publicada.</p>
        </div>
      </div>
    );
  }

  const theme = page.theme || {};
  const hero = page.content?.hero || {};
  const contactForm = page.content?.contact_form || {};

  return (
    <div className="min-h-screen bg-white">
      {/* Preview Banner */}
      {isPreview && (
        <div className="bg-amber-500 text-white px-4 py-2 text-center font-semibold sticky top-0 z-50">
          🔍 Modo Pré-visualização - Esta página não está publicada
        </div>
      )}
      
      <SEOHead
        title={page.seo?.meta_title || page.title}
        description={page.seo?.meta_description || hero.subheadline}
        image={page.seo?.og_image || hero.background_image}
      />

      <style>{`
        :root {
          --primary: ${theme.primary_color || '#3b82f6'};
          --secondary: ${theme.secondary_color || '#1e40af'};
        }
      `}</style>

      {/* Hero Section */}
      <div 
        className="relative bg-cover bg-center py-20 md:py-32"
        style={{ 
          backgroundImage: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url(${hero.background_image})` 
        }}
      >
        <div className="max-w-6xl mx-auto px-4 text-center text-white">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            {hero.headline}
          </h1>
          {hero.subheadline && (
            <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto">
              {hero.subheadline}
            </p>
          )}
          <Button 
            size="lg"
            onClick={() => document.getElementById('contacto')?.scrollIntoView({ behavior: 'smooth' })}
            style={{ backgroundColor: theme.primary_color }}
            className="text-white hover:opacity-90"
          >
            {hero.cta_text || 'Saber Mais'}
          </Button>
        </div>
      </div>

      {/* Contact Form Section */}
      {contactForm.enabled && (
        <div id="contacto" className="py-16 bg-slate-50">
          <div className="max-w-2xl mx-auto px-4">
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <h2 className="text-3xl font-bold text-slate-900 mb-2 text-center">
                {contactForm.title || 'Entre em Contacto'}
              </h2>
              <p className="text-slate-600 text-center mb-8">
                Preencha o formulário e entraremos em contacto consigo brevemente
              </p>

              {submitted ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-10 h-10 text-green-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">Mensagem Enviada!</h3>
                  <p className="text-slate-600">
                    Obrigado pelo seu contacto. Responderemos o mais breve possível.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label>Nome *</Label>
                    <Input
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="O seu nome completo"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Email *</Label>
                      <Input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="seu@email.com"
                      />
                    </div>
                    <div>
                      <Label>Telefone</Label>
                      <Input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+351 912 345 678"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Mensagem *</Label>
                    <Textarea
                      required
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="Como podemos ajudar?"
                      rows={5}
                    />
                  </div>

                  <Button 
                    type="submit" 
                    size="lg" 
                    className="w-full"
                    disabled={submitMutation.isPending}
                    style={{ backgroundColor: theme.primary_color }}
                  >
                    {submitMutation.isPending ? (
                      <>Enviando...</>
                    ) : (
                      <>
                        <Send className="w-5 h-5 mr-2" />
                        Enviar Mensagem
                      </>
                    )}
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-8">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <img 
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6915a593b6edd8435f5838bd/359538617_Zugruppe01.jpg"
            alt="Zugruppe"
            className="h-12 mx-auto mb-4 opacity-80"
          />
          <p className="text-slate-400 text-sm">
            © {new Date().getFullYear()} Zugruppe. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}