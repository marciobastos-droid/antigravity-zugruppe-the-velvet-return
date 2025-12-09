import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { X, Phone, Mail, Send, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

export default function ExitIntentPopup() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [formData, setFormData] = React.useState({
    name: "",
    email: "",
    phone: "",
    message: ""
  });
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSubmitted, setIsSubmitted] = React.useState(false);
  const [hasShown, setHasShown] = React.useState(false);

  React.useEffect(() => {
    // Check if already shown in this session
    const shown = sessionStorage.getItem('exitIntentShown');
    if (shown) {
      setHasShown(true);
      return;
    }

    const handleMouseLeave = (e) => {
      // Only trigger if mouse leaves from top of page (exit intent)
      if (e.clientY <= 0 && !hasShown && !isSubmitted) {
        setIsOpen(true);
        setHasShown(true);
        sessionStorage.setItem('exitIntentShown', 'true');
      }
    };

    // Add delay before enabling the popup (3 seconds after page load)
    const timer = setTimeout(() => {
      document.addEventListener('mouseleave', handleMouseLeave);
    }, 3000);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [hasShown, isSubmitted]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Generate ref_id for opportunity
      const { data: refData } = await base44.functions.invoke('generateRefId', { 
        entity_type: 'Opportunity' 
      });

      // Create opportunity/lead
      await base44.entities.Opportunity.create({
        ref_id: refData.ref_id,
        lead_type: 'comprador',
        buyer_name: formData.name,
        buyer_email: formData.email,
        buyer_phone: formData.phone,
        message: `Pop-up de saída - Website:\n\n${formData.message}`,
        status: 'new',
        lead_source: 'website',
        source_detail: 'Exit Intent Popup'
      });

      // Send notification email
      try {
        await base44.integrations.Core.SendEmail({
          to: formData.email,
          subject: "Obrigado pelo seu interesse!",
          body: `Olá ${formData.name},\n\nRecebemos o seu contacto e a nossa equipa entrará em contacto consigo brevemente.\n\nObrigado pelo seu interesse!\n\nCumprimentos,\nEquipa Zugruppe`
        });
      } catch (e) {
        console.warn('Email notification failed:', e);
      }

      setIsSubmitted(true);
      toast.success("Mensagem enviada com sucesso!");
      
      // Close after 3 seconds
      setTimeout(() => {
        setIsOpen(false);
      }, 3000);
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error("Erro ao enviar mensagem. Tente novamente.");
    }
    
    setIsSubmitting(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        {!isSubmitted ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl">Espere! Não vá ainda 🏠</DialogTitle>
              <DialogDescription className="text-base">
                Deixe-nos o seu contacto e ajudamos a encontrar o imóvel perfeito para si!
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div>
                <Label htmlFor="exit-name">Nome *</Label>
                <Input
                  id="exit-name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="O seu nome"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="exit-email">Email *</Label>
                <Input
                  id="exit-email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@exemplo.com"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="exit-phone">Telefone</Label>
                <Input
                  id="exit-phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+351 912 345 678"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="exit-message">O que procura?</Label>
                <Textarea
                  id="exit-message"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Ex: Apartamento T2 em Lisboa..."
                  rows={3}
                  className="mt-1"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  className="flex-1"
                >
                  Não, obrigado
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {isSubmitting ? (
                    <>
                      <Send className="w-4 h-4 mr-2 animate-pulse" />
                      A enviar...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Enviar
                    </>
                  )}
                </Button>
              </div>
            </form>
          </>
        ) : (
          <div className="text-center py-6">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <DialogTitle className="text-2xl mb-2">Mensagem Enviada!</DialogTitle>
            <DialogDescription className="text-base">
              Obrigado pelo seu contacto. A nossa equipa entrará em contacto consigo brevemente.
            </DialogDescription>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}