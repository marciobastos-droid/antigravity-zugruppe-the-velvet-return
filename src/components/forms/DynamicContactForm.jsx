import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Send, Loader2, User, Mail, Phone, MessageSquare, Sparkles, Calendar } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import SmartInput from "./SmartInput";
import SmartTextarea from "./SmartTextarea";
import { useSmartForm } from "./useSmartForm";
import { base44 } from "@/api/base44Client";
import { useVisitorTracking } from "../tracking/VisitorTracker";
import { cn } from "@/lib/utils";

/**
 * Formulário de contacto dinâmico e inteligente
 * Adapta-se ao contexto (imóvel, lead, geral) e valida em tempo real
 */
export default function DynamicContactForm({ 
  propertyId,
  propertyTitle,
  leadId,
  onSuccess,
  context = "property", // "property", "general", "lead"
  showInterestType = false,
  variant = "default" // "default", "compact", "inline"
}) {
  const {
    formData,
    fieldErrors,
    touchedFields,
    currentUser,
    recentContacts,
    updateField,
    touchField,
    validateForm,
    autofillUserData,
    suggestFromEmail,
    resetForm
  } = useSmartForm();

  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [interestType, setInterestType] = useState(null);
  const [emailSuggestions, setEmailSuggestions] = useState([]);
  const [showScheduling, setShowScheduling] = useState(false);
  const { trackAction } = useVisitorTracking();

  // Auto-preencher dados do utilizador ao carregar
  useEffect(() => {
    if (currentUser && !formData.name && !formData.email) {
      autofillUserData();
    }
  }, [currentUser]);

  // Sugestões de email
  useEffect(() => {
    if (formData.email && formData.email.length > 2) {
      const matches = recentContacts
        .filter(c => c.email?.toLowerCase().includes(formData.email.toLowerCase()))
        .slice(0, 3);
      setEmailSuggestions(matches);
    } else {
      setEmailSuggestions([]);
    }
  }, [formData.email, recentContacts]);

  // Validação schema
  const validationSchema = {
    name: { required: true, minLength: 2, maxLength: 100 },
    email: { required: true, email: true },
    phone: { required: false, phone: true },
    message: { 
      required: true, 
      minLength: 10, 
      maxLength: 1000,
      custom: (value) => {
        if (value && value.split(' ').length < 3) {
          return 'Por favor, seja mais específico na sua mensagem';
        }
        return null;
      }
    }
  };

  // Step 1: Tipo de interesse (apenas para propriedades)
  const handleInterestSelect = (type) => {
    setInterestType(type);
    setCurrentStep(2);
  };

  // Step 2: Dados de contacto
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm(validationSchema)) {
      toast.error("Por favor, corrija os erros no formulário");
      return;
    }

    setSending(true);

    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone || '',
        message: formData.message,
        property_id: propertyId,
        property_title: propertyTitle,
        interest_type: interestType,
        source_page: context,
        wants_appointment: showScheduling
      };

      const { data } = await base44.functions.invoke('submitPublicContact', payload);

      if (data.success) {
        toast.success("Mensagem enviada com sucesso!");
        setSent(true);
        
        // Guardar email do guest para tracking
        if (data.guest_email) {
          localStorage.setItem('guest_email', data.guest_email);
        }

        // Track contact submission
        trackAction('contact_submitted', {
          property_id: propertyId,
          interest_type: interestType,
          wants_appointment: showScheduling
        });

        resetForm();
        
        if (onSuccess) {
          onSuccess(data);
        }
      } else {
        throw new Error(data.error || 'Erro ao enviar mensagem');
      }
    } catch (error) {
      toast.error(`Erro: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setSending(false);
    }
  };

  // Success State
  if (sent) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-8 sm:py-12"
      >
        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 sm:w-10 sm:h-10 text-green-600" />
        </div>
        <h3 className="text-lg sm:text-xl font-bold text-green-900 mb-2">Mensagem Enviada!</h3>
        <p className="text-sm sm:text-base text-slate-600 mb-6">
          Entraremos em contacto consigo brevemente.
        </p>
        <Button 
          variant="outline" 
          size={variant === "compact" ? "sm" : "default"}
          onClick={() => {
            setSent(false);
            setCurrentStep(showInterestType ? 1 : 2);
            setInterestType(null);
          }}
        >
          Enviar Outra Mensagem
        </Button>
      </motion.div>
    );
  }

  // Step 1: Interest Type (apenas se showInterestType)
  if (showInterestType && currentStep === 1) {
    return (
      <div className="space-y-4">
        <div className="text-center mb-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Como podemos ajudar?</h3>
          <p className="text-sm text-slate-600">Selecione o tipo de interesse</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleInterestSelect('visit')}
            className="p-4 border-2 border-slate-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
          >
            <Calendar className="w-6 h-6 text-blue-600 mb-2" />
            <h4 className="font-semibold text-slate-900 mb-1">Agendar Visita</h4>
            <p className="text-xs text-slate-600">Quero visitar este imóvel</p>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleInterestSelect('info')}
            className="p-4 border-2 border-slate-200 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all text-left"
          >
            <MessageSquare className="w-6 h-6 text-purple-600 mb-2" />
            <h4 className="font-semibold text-slate-900 mb-1">Pedir Informações</h4>
            <p className="text-xs text-slate-600">Tenho dúvidas sobre este imóvel</p>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleInterestSelect('financing')}
            className="p-4 border-2 border-slate-200 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all text-left"
          >
            <Sparkles className="w-6 h-6 text-green-600 mb-2" />
            <h4 className="font-semibold text-slate-900 mb-1">Financiamento</h4>
            <p className="text-xs text-slate-600">Preciso de ajuda com crédito</p>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleInterestSelect('other')}
            className="p-4 border-2 border-slate-200 rounded-xl hover:border-slate-500 hover:bg-slate-50 transition-all text-left"
          >
            <Mail className="w-6 h-6 text-slate-600 mb-2" />
            <h4 className="font-semibold text-slate-900 mb-1">Outro Assunto</h4>
            <p className="text-xs text-slate-600">Contacto geral</p>
          </motion.button>
        </div>
      </div>
    );
  }

  // Step 2: Contact Form
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {interestType && (
        <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <Badge className="bg-blue-600">
            {interestType === 'visit' ? 'Visita' : 
             interestType === 'info' ? 'Informações' :
             interestType === 'financing' ? 'Financiamento' : 'Outro'}
          </Badge>
          <button
            type="button"
            onClick={() => {
              setInterestType(null);
              setCurrentStep(1);
            }}
            className="text-xs text-blue-600 hover:text-blue-700 ml-auto"
          >
            Alterar
          </button>
        </div>
      )}

      <SmartInput
        label="Nome"
        name="name"
        value={formData.name || ''}
        onChange={(value) => updateField('name', value, validationSchema.name)}
        onBlur={() => touchField('name', validationSchema.name)}
        error={fieldErrors.name}
        touched={touchedFields.name}
        required
        placeholder="O seu nome completo"
        icon={User}
        autoComplete="name"
        success
      />

      <SmartInput
        label="Email"
        name="email"
        type="email"
        value={formData.email || ''}
        onChange={(value) => updateField('email', value, validationSchema.email)}
        onBlur={() => touchField('email', validationSchema.email)}
        error={fieldErrors.email}
        touched={touchedFields.email}
        required
        placeholder="email@exemplo.com"
        icon={Mail}
        autoComplete="email"
        suggestions={emailSuggestions}
        onSuggestionClick={(contact) => {
          updateField('name', contact.full_name, validationSchema.name);
          updateField('email', contact.email, validationSchema.email);
          updateField('phone', contact.phone || '', validationSchema.phone);
          setEmailSuggestions([]);
          toast.success("Dados preenchidos automaticamente");
        }}
        success
      />

      <SmartInput
        label="Telefone"
        name="phone"
        type="tel"
        value={formData.phone || ''}
        onChange={(value) => updateField('phone', value, validationSchema.phone)}
        onBlur={() => touchField('phone', validationSchema.phone)}
        error={fieldErrors.phone}
        touched={touchedFields.phone}
        placeholder="+351 912 345 678"
        icon={Phone}
        autoComplete="tel"
        description="Opcional, mas ajuda-nos a contactá-lo mais rapidamente"
      />

      {/* Opção de agendamento (aparece dinamicamente para visitas) */}
      <AnimatePresence>
        {interestType === 'visit' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <Card className="bg-purple-50 border-purple-200">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-purple-600 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-purple-900 text-sm mb-1">
                      Quer agendar uma visita agora?
                    </h4>
                    <p className="text-xs text-purple-700 mb-3">
                      Entraremos em contacto para confirmar a melhor data
                    </p>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant={showScheduling ? "default" : "outline"}
                        onClick={() => setShowScheduling(!showScheduling)}
                        className={showScheduling ? "bg-purple-600" : ""}
                      >
                        {showScheduling ? 'Sim, agendar' : 'Não, apenas informações'}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <SmartTextarea
        label="Mensagem"
        name="message"
        value={formData.message || ''}
        onChange={(value) => updateField('message', value, validationSchema.message)}
        onBlur={() => touchField('message', validationSchema.message)}
        error={fieldErrors.message}
        touched={touchedFields.message}
        required
        placeholder={
          interestType === 'visit' 
            ? "Indique as suas preferências de data e horário para a visita..."
            : interestType === 'financing'
            ? "Descreva a sua situação financeira e que tipo de apoio necessita..."
            : propertyTitle
            ? `Tenho interesse no imóvel "${propertyTitle}". Gostaria de saber mais sobre...`
            : "Como podemos ajudá-lo? Descreva o que procura..."
        }
        icon={MessageSquare}
        rows={variant === "compact" ? 3 : 5}
        maxLength={1000}
        minLength={10}
        autoExpand={variant === "inline"}
      />

      {/* Sugestões de mensagem rápida */}
      {!formData.message && context === "property" && (
        <div className="space-y-2">
          <p className="text-xs text-slate-500">Sugestões rápidas:</p>
          <div className="flex flex-wrap gap-2">
            {[
              "Quero agendar uma visita",
              "Gostaria de mais informações",
              "Qual é a disponibilidade?",
              "Aceita propostas?"
            ].map((suggestion) => (
              <Button
                key={suggestion}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => updateField('message', suggestion, validationSchema.message)}
                className="text-xs"
              >
                {suggestion}
              </Button>
            ))}
          </div>
        </div>
      )}

      <Button 
        type="submit" 
        className={cn(
          "w-full bg-slate-900 hover:bg-slate-800",
          variant === "compact" && "h-9 text-sm"
        )}
        disabled={sending}
      >
        {sending ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            A enviar...
          </>
        ) : (
          <>
            <Send className="w-4 h-4 mr-2" />
            Enviar Mensagem
          </>
        )}
      </Button>

      {/* Info sobre privacidade */}
      <p className="text-xs text-slate-500 text-center">
        Ao enviar, concorda com o processamento dos seus dados de contacto
      </p>
    </form>
  );
}