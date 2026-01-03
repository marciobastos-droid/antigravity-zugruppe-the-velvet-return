import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { UploadCloud, Loader2, FileText, CheckCircle2, AlertCircle, Shield, ArrowLeft } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { useLocalization } from '../components/i18n/LocalizationContext';
import { Link } from 'react-router-dom';

export default function DenunciationChannel() {
  const { t, locale } = useLocalization();
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    is_anonymous: false,
    email: '',
    phone: '',
    attachment_files: [],
    termsAccepted: false
  });
  const [isUploading, setIsUploading] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  const [submissionError, setSubmissionError] = useState(false);

  const createDenunciationMutation = useMutation({
    mutationFn: async (data) => {
      const denunciation = await base44.entities.Denunciation.create(data);
      
      await base44.integrations.Core.SendEmail({
        to: "info@zugruppe.com",
        subject: `${locale === 'en' ? 'New Report' : locale === 'es' ? 'Nueva Denuncia' : locale === 'fr' ? 'Nouvelle Dénonciation' : 'Nova Denúncia'}: ${data.subject}`,
        body: `${locale === 'en' ? 'A new report has been submitted.' : locale === 'es' ? 'Se ha enviado una nueva denuncia.' : locale === 'fr' ? 'Une nouvelle dénonciation a été soumise.' : 'Uma nova denúncia foi submetida.'}\n\n${locale === 'en' ? 'Subject' : locale === 'es' ? 'Asunto' : locale === 'fr' ? 'Sujet' : 'Assunto'}: ${data.subject}\n${locale === 'en' ? 'Description' : locale === 'es' ? 'Descripción' : locale === 'fr' ? 'Description' : 'Descrição'}: ${data.description}\n${locale === 'en' ? 'Anonymous' : locale === 'es' ? 'Anónimo' : locale === 'fr' ? 'Anonyme' : 'Anónimo'}: ${data.is_anonymous ? (locale === 'en' ? 'Yes' : locale === 'es' ? 'Sí' : locale === 'fr' ? 'Oui' : 'Sim') : 'No'}\n${data.email ? `Email: ${data.email}\n` : ''}${data.phone ? `${locale === 'en' ? 'Phone' : locale === 'es' ? 'Teléfono' : locale === 'fr' ? 'Téléphone' : 'Telefone'}: ${data.phone}\n` : ''}${data.attachment_urls?.length > 0 ? `${locale === 'en' ? 'Attachments' : locale === 'es' ? 'Adjuntos' : locale === 'fr' ? 'Pièces jointes' : 'Anexos'}: ${data.attachment_urls.join(', ')}` : ''}`,
      });

      return denunciation;
    },
    onSuccess: () => {
      setSubmissionSuccess(true);
      setSubmissionError(false);
      setFormData({
        subject: '',
        description: '',
        is_anonymous: false,
        email: '',
        phone: '',
        attachment_files: [],
        termsAccepted: false
      });
    },
    onError: () => {
      setSubmissionError(true);
      setSubmissionSuccess(false);
    },
  });

  const handleFileChange = (e) => {
    setFormData(prev => ({ ...prev, attachment_files: Array.from(e.target.files) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmissionSuccess(false);
    setSubmissionError(false);

    if (!formData.termsAccepted) {
      toast.error(t('legal.acceptTerms'));
      return;
    }

    const uploadedUrls = [];
    if (formData.attachment_files.length > 0) {
      setIsUploading(true);
      try {
        for (const file of formData.attachment_files) {
          const { file_url } = await base44.integrations.Core.UploadFile({ file });
          uploadedUrls.push(file_url);
        }
      } catch (error) {
        toast.error(locale === 'en' ? 'Error uploading files' : locale === 'es' ? 'Error al cargar archivos' : locale === 'fr' ? 'Erreur lors du téléchargement des fichiers' : 'Erro ao carregar arquivos');
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    }
    
    const dataToSubmit = {
      subject: formData.subject,
      description: formData.description,
      is_anonymous: formData.is_anonymous,
      email: formData.is_anonymous ? undefined : formData.email,
      phone: formData.is_anonymous ? undefined : formData.phone,
      attachment_urls: uploadedUrls,
    };
    
    createDenunciationMutation.mutate(dataToSubmit);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <Link to={createPageUrl("Website")}>
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('common.back')}
          </Button>
        </Link>
        
        <Card className="shadow-xl border-slate-200">
          <CardContent className="p-8 md:p-12">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                <Shield className="w-8 h-8 text-blue-600" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">{t('legal.denunciationTitle')}</h1>
              <p className="text-slate-600 text-sm md:text-base leading-relaxed">
                {t('legal.denunciationIntro')}
                {locale === 'pt' && (
                  <>
                    {' '}
                    <a 
                      href="https://diariodarepublica.pt/dr/detalhe/lei/93-2021-176147929" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-blue-600 hover:underline font-medium"
                    >
                      Lei n.º 93/2021, 20 de dezembro
                    </a>.
                  </>
                )}
              </p>
            </div>

            {submissionSuccess && (
              <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-4 rounded-lg mb-6 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">{t('legal.denunciationSuccess')}</p>
                  <p className="text-sm mt-1">
                    {locale === 'en' ? 'Thank you for your contribution. The report will be analyzed shortly.' 
                      : locale === 'es' ? 'Gracias por su contribución. La denuncia será analizada en breve.'
                      : locale === 'fr' ? 'Merci pour votre contribution. La dénonciation sera analysée sous peu.'
                      : 'Agradecemos o seu contributo. A denúncia será analisada em breve.'}
                  </p>
                </div>
              </div>
            )}

            {submissionError && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-4 rounded-lg mb-6 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">{t('legal.denunciationError')}</p>
                  <p className="text-sm mt-1">
                    {locale === 'en' ? 'Please try again or contact us directly.'
                      : locale === 'es' ? 'Por favor, intente nuevamente o contáctenos directamente.'
                      : locale === 'fr' ? 'Veuillez réessayer ou nous contacter directement.'
                      : 'Por favor, tente novamente ou contacte-nos diretamente.'}
                  </p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="subject" className="text-base font-semibold">{t('legal.subject')} *</Label>
                <Input
                  id="subject"
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder={locale === 'en' ? 'e.g.: Data management irregularities' : locale === 'es' ? 'Ej: Irregularidades en la gestión de datos' : locale === 'fr' ? 'Ex: Irrégularités dans la gestion des données' : 'Ex: Irregularidades na gestão de dados'}
                  required
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="description" className="text-base font-semibold">{t('legal.description')} *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder={t('legal.descriptionPlaceholder')}
                  rows={7}
                  required
                  className="mt-2"
                />
              </div>

              <div className="flex items-start space-x-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <Checkbox
                  id="anonymous"
                  checked={formData.is_anonymous}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_anonymous: checked }))}
                />
                <div className="flex-1">
                  <Label htmlFor="anonymous" className="font-semibold cursor-pointer">{t('legal.anonymous')}</Label>
                  <p className="text-sm text-slate-600 mt-1">{t('legal.anonymousText')}</p>
                </div>
              </div>

              {!formData.is_anonymous && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div>
                    <Label htmlFor="email" className="font-semibold">{t('common.email')}</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder={locale === 'en' ? 'your-email@example.com' : 'o-seu-email@exemplo.com'}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone" className="font-semibold">{t('common.phone')}</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="+351 9XX XXX XXX"
                      className="mt-2"
                    />
                  </div>
                  <p className="text-xs text-slate-600 col-span-2">{t('legal.contactDetails')}</p>
                </div>
              )}

              <div>
                <Label htmlFor="attachment" className="text-base font-semibold">{t('legal.attachments')}</Label>
                <div className="mt-2 flex items-center justify-center w-full">
                  <label
                    htmlFor="attachment"
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 border-dashed rounded-lg cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors"
                  >
                    {isUploading ? (
                      <Loader2 className="w-8 h-8 text-slate-500 animate-spin" />
                    ) : (
                      <UploadCloud className="w-8 h-8 text-slate-500" />
                    )}
                    <p className="mt-2 text-sm text-slate-600">
                      <span className="font-semibold">
                        {locale === 'en' ? 'Click to upload' : locale === 'es' ? 'Clic para cargar' : locale === 'fr' ? 'Cliquer pour télécharger' : 'Clique para carregar'}
                      </span> {locale === 'en' ? 'or drag and drop' : locale === 'es' ? 'o arrastre y suelte' : locale === 'fr' ? 'ou glisser-déposer' : 'ou arraste e solte'}
                    </p>
                    <p className="text-xs text-slate-500">PDF, JPG, PNG ({locale === 'en' ? 'max. 5MB per file' : locale === 'es' ? 'máx. 5MB por archivo' : locale === 'fr' ? 'max. 5MB par fichier' : 'máx. 5MB por ficheiro'})</p>
                  </label>
                  <input
                    id="attachment"
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleFileChange}
                    disabled={isUploading}
                    accept="application/pdf,image/jpeg,image/png"
                  />
                </div>
                {formData.attachment_files.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {formData.attachment_files.map((file, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm text-slate-700 p-2 bg-slate-50 rounded">
                        <FileText className="w-4 h-4" />
                        <span className="flex-1">{file.name}</span>
                        <span className="text-xs text-slate-500">({Math.round(file.size / 1024)} KB)</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-start space-x-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
                <Checkbox
                  id="terms_conditions"
                  checked={formData.termsAccepted}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, termsAccepted: checked }))}
                  required
                />
                <div className="flex-1">
                  <Label htmlFor="terms_conditions" className="text-sm cursor-pointer">
                    {t('legal.acceptTerms')}
                  </Label>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3 text-lg font-semibold rounded-lg transition-colors"
                disabled={createDenunciationMutation.isPending || isUploading}
              >
                {createDenunciationMutation.isPending || isUploading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    {t('contact.sending')}
                  </>
                ) : (
                  t('legal.submitDenunciation')
                )}
              </Button>

              <p className="text-xs text-slate-500 text-center">
                {locale === 'en' ? 'Reports are treated confidentially and in accordance with current legislation.'
                  : locale === 'es' ? 'Las denuncias se tratan de forma confidencial y de acuerdo con la legislación vigente.'
                  : locale === 'fr' ? 'Les dénonciations sont traitées de manière confidentielle et conformément à la législation en vigueur.'
                  : 'As denúncias são tratadas de forma confidencial e de acordo com a legislação vigente.'}
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}