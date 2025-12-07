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
import { UploadCloud, Loader2, FileText, CheckCircle2, AlertCircle, Shield } from 'lucide-react';

export default function DenunciationChannel() {
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
        subject: `Nova Denúncia: ${data.subject}`,
        body: `Uma nova denúncia foi submetida.\n\nAssunto: ${data.subject}\nDescrição: ${data.description}\nAnónimo: ${data.is_anonymous ? 'Sim' : 'Não'}\n${data.email ? `Email: ${data.email}\n` : ''}${data.phone ? `Telefone: ${data.phone}\n` : ''}${data.attachment_urls?.length > 0 ? `Anexos: ${data.attachment_urls.join(', ')}` : ''}`,
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
      toast.error('Por favor, aceite os termos e condições.');
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
        toast.error('Erro ao carregar arquivos');
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
        <Card className="shadow-xl border-slate-200">
          <CardContent className="p-8 md:p-12">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                <Shield className="w-8 h-8 text-blue-600" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">Canal de Denúncias</h1>
              <p className="text-slate-600 text-sm md:text-base leading-relaxed">
                A sua denúncia será tratada ao abrigo da Lei{' '}
                <a 
                  href="https://diariodarepublica.pt/dr/detalhe/lei/93-2021-176147929" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-blue-600 hover:underline font-medium"
                >
                  n.º 93/2021, 20 de dezembro
                </a>.
                <br />Garantimos a total confidencialidade e proteção dos seus dados.
              </p>
            </div>

            {submissionSuccess && (
              <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-4 rounded-lg mb-6 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Denúncia enviada com sucesso!</p>
                  <p className="text-sm mt-1">Agradecemos o seu contributo. A denúncia será analisada em breve.</p>
                </div>
              </div>
            )}

            {submissionError && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-4 rounded-lg mb-6 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Erro ao enviar denúncia</p>
                  <p className="text-sm mt-1">Por favor, tente novamente ou contacte-nos diretamente.</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="subject" className="text-base font-semibold">Assunto da Denúncia *</Label>
                <Input
                  id="subject"
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="Ex: Irregularidades na gestão de dados"
                  required
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="description" className="text-base font-semibold">Descrição Detalhada *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descreva a situação com o máximo de detalhes possível..."
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
                  <Label htmlFor="anonymous" className="font-semibold cursor-pointer">Enviar denúncia anonimamente</Label>
                  <p className="text-sm text-slate-600 mt-1">Ao selecionar esta opção, a sua identidade não será registada.</p>
                </div>
              </div>

              {!formData.is_anonymous && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div>
                    <Label htmlFor="email" className="font-semibold">O seu Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="o-seu-email@exemplo.com"
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone" className="font-semibold">O seu Telefone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="+351 9XX XXX XXX"
                      className="mt-2"
                    />
                  </div>
                  <p className="text-xs text-slate-600 col-span-2">
                    Forneça pelo menos um meio de contacto (email ou telefone) para denúncias não anónimas.
                  </p>
                </div>
              )}

              <div>
                <Label htmlFor="attachment" className="text-base font-semibold">Anexar Ficheiro(s)</Label>
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
                      <span className="font-semibold">Clique para carregar</span> ou arraste e solte
                    </p>
                    <p className="text-xs text-slate-500">PDF, JPG, PNG (máx. 5MB por ficheiro)</p>
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
                    Declaro que li, compreendi e aceito os{' '}
                    <a href={createPageUrl("PrivacyPolicy")} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">
                      Termos e condições
                    </a>
                    {' '}e a{' '}
                    <a href={createPageUrl("PrivacyPolicy")} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">
                      Política de Privacidade
                    </a>
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
                    A enviar...
                  </>
                ) : (
                  'Enviar Denúncia'
                )}
              </Button>

              <p className="text-xs text-slate-500 text-center">
                As denúncias são tratadas de forma confidencial e de acordo com a legislação vigente.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}