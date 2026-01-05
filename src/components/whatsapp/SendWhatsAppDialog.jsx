import React from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageCircle, Loader2, Send, FileText } from "lucide-react";
import { toast } from "sonner";

const MESSAGE_TEMPLATES = {
  property_inquiry: {
    name: "Interesse em Imóvel",
    generate: (property) => `Olá! 👋

Vi que tem interesse no imóvel ${property.title}.

📍 Localização: ${property.city}
💰 Preço: €${property.price?.toLocaleString()}
🛏️ Tipologia: T${property.bedrooms || 0}
📐 Área: ${property.useful_area || property.square_feet || '-'}m²

Gostaria de agendar uma visita ou esclarecer alguma dúvida?

Estou à disposição!`
  },
  visit_confirmation: {
    name: "Confirmação de Visita",
    generate: (property, extra) => `Olá! 👋

Confirmação da sua visita:

🏠 Imóvel: ${property.title}
📍 Local: ${property.address || property.city}
📅 Data: ${extra?.date || '[DATA]'}
⏰ Hora: ${extra?.time || '[HORA]'}

Aguardo a sua presença! Qualquer dúvida, estou disponível.`
  },
  lead_followup: {
    name: "Follow-up de Lead",
    generate: (lead) => `Olá ${lead.buyer_name}! 👋

Como está? Entrei em contacto para dar seguimento ao seu interesse.

${lead.property_title ? `🏠 Imóvel: ${lead.property_title}` : ''}
${lead.location ? `📍 Zona de interesse: ${lead.location}` : ''}
${lead.budget ? `💰 Orçamento: €${lead.budget?.toLocaleString()}` : ''}

Já pensou melhor no que procura? Tenho algumas novidades que podem interessar!`
  },
  new_match: {
    name: "Novo Imóvel Disponível",
    generate: (property, lead) => `Olá ${lead?.buyer_name || 'Cliente'}! 👋

Tenho um imóvel perfeito para si:

🏠 ${property.title}
📍 ${property.city}${property.address ? `, ${property.address}` : ''}
💰 €${property.price?.toLocaleString()}
🛏️ T${property.bedrooms || 0} | 🚿 ${property.bathrooms || 0} WC | 📐 ${property.useful_area || property.square_feet || '-'}m²

${property.description ? `\n${property.description.substring(0, 150)}...` : ''}

Gostaria de agendar uma visita?`
  },
  custom: {
    name: "Mensagem Personalizada",
    generate: () => ""
  }
};

export default function SendWhatsAppDialog({ 
  open, 
  onOpenChange, 
  recipient,
  property,
  lead,
  context = "general"
}) {
  const [sending, setSending] = React.useState(false);
  const [selectedTemplate, setSelectedTemplate] = React.useState("custom");
  const [message, setMessage] = React.useState("");
  const [phoneNumber, setPhoneNumber] = React.useState("");

  React.useEffect(() => {
    if (open) {
      // Set phone number from recipient
      const phone = recipient?.phone || recipient?.buyer_phone || lead?.buyer_phone || "";
      setPhoneNumber(phone);

      // Auto-select template based on context
      if (context === "property" && property) {
        setSelectedTemplate("property_inquiry");
        setMessage(MESSAGE_TEMPLATES.property_inquiry.generate(property));
      } else if (context === "lead" && lead) {
        setSelectedTemplate("lead_followup");
        setMessage(MESSAGE_TEMPLATES.lead_followup.generate(lead));
      } else {
        setSelectedTemplate("custom");
        setMessage("");
      }
    }
  }, [open, recipient, property, lead, context]);

  const handleTemplateChange = (templateId) => {
    setSelectedTemplate(templateId);
    
    if (templateId === "custom") {
      setMessage("");
      return;
    }

    const template = MESSAGE_TEMPLATES[templateId];
    if (template && template.generate) {
      const generatedMessage = template.generate(property || {}, lead);
      setMessage(generatedMessage);
    }
  };

  const handleSend = async () => {
    if (!phoneNumber || !phoneNumber.trim()) {
      toast.error("Número de telefone não especificado");
      return;
    }

    if (!message || !message.trim()) {
      toast.error("Escreva uma mensagem");
      return;
    }

    setSending(true);

    try {
      const { data } = await base44.functions.invoke('sendWhatsAppMessage', {
        to: phoneNumber,
        message: message
      });

      if (data.success) {
        toast.success("Mensagem WhatsApp enviada!");
        
        // Log communication if we have lead or property context
        if (lead?.id) {
          try {
            await base44.entities.Opportunity.update(lead.id, {
              communication_history: [
                ...(lead.communication_history || []),
                {
                  type: 'whatsapp',
                  message: message,
                  sent_at: new Date().toISOString(),
                  sent_by: (await base44.auth.me()).email,
                  status: 'sent'
                }
              ],
              last_contact_date: new Date().toISOString()
            });
          } catch (e) {
            console.warn('Failed to update opportunity:', e);
          }
        }

        onOpenChange(false);
        setMessage("");
        setSelectedTemplate("custom");
      } else {
        throw new Error(data.error || 'Erro ao enviar mensagem');
      }
    } catch (error) {
      console.error('[WhatsApp] Send error:', error);
      toast.error("Erro ao enviar: " + (error.message || "Erro desconhecido"));
    }

    setSending(false);
  };

  const recipientName = recipient?.name || recipient?.buyer_name || lead?.buyer_name || "Cliente";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-green-600" />
            Enviar WhatsApp para {recipientName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Phone Number */}
          <div>
            <Label>Número de Telefone</Label>
            <div className="flex gap-2 mt-1">
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+351 912 345 678"
                className="flex-1 h-10 px-3 rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const cleanNumber = phoneNumber.replace(/\D/g, '');
                  window.open(`https://wa.me/${cleanNumber}`, '_blank');
                }}
                disabled={!phoneNumber}
              >
                Abrir WhatsApp
              </Button>
            </div>
          </div>

          {/* Template Selector */}
          <div>
            <Label className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Template de Mensagem
            </Label>
            <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(MESSAGE_TEMPLATES).map(([key, template]) => (
                  <SelectItem key={key} value={key}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Message */}
          <div>
            <Label>Mensagem</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Escreva a sua mensagem..."
              rows={12}
              className="mt-1 font-mono text-sm"
            />
            <p className="text-xs text-slate-500 mt-1">
              {message.length} caracteres
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSend}
              disabled={sending || !phoneNumber || !message}
              className="bg-green-600 hover:bg-green-700"
            >
              {sending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  A enviar...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Enviar WhatsApp
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}