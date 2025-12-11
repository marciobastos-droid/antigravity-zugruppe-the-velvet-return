import React from "react";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle, Loader2, Phone, Mail, User, Building2 } from "lucide-react";

export default function ContactFormEnhanced({ 
  onSubmit, 
  isSubmitting = false,
  showCompanyField = false,
  selectedProperty = null,
  defaultMessage = "",
  brandColor = "#0f172a"
}) {
  const { 
    register, 
    handleSubmit, 
    formState: { errors, touchedFields },
    reset,
    watch 
  } = useForm({
    mode: "onChange",
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      company: "",
      message: defaultMessage
    }
  });

  const [submitStatus, setSubmitStatus] = React.useState(null); // 'success' | 'error' | null

  React.useEffect(() => {
    if (defaultMessage) {
      reset({ message: defaultMessage });
    }
  }, [defaultMessage, reset]);

  const handleFormSubmit = async (data) => {
    setSubmitStatus(null);
    try {
      await onSubmit(data);
      setSubmitStatus('success');
      reset();
    } catch (error) {
      setSubmitStatus('error');
    }
  };

  // Phone validation regex (Portuguese format)
  const phoneRegex = /^(\+351\s?)?[29]\d{8}$/;
  
  // Email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const formValues = watch();

  if (submitStatus === 'success') {
    return (
      <div className="text-center py-6 sm:py-8 space-y-3 sm:space-y-4">
        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-10 h-10 sm:w-12 sm:h-12 text-green-600" />
        </div>
        <div>
          <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2">Mensagem Enviada!</h3>
          <p className="text-sm sm:text-base text-slate-600 mb-3 sm:mb-4 px-4">
            Obrigado pelo seu contacto. A nossa equipa irá responder brevemente.
          </p>
          {selectedProperty && (
            <p className="text-xs sm:text-sm text-slate-500 bg-slate-50 p-3 rounded-lg">
              <strong>Imóvel:</strong> {selectedProperty.title}
            </p>
          )}
        </div>
        <Button 
          variant="outline" 
          onClick={() => setSubmitStatus(null)}
          className="mt-3 sm:mt-4 h-10 sm:h-11 touch-manipulation"
        >
          Enviar Outra Mensagem
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-3 sm:space-y-4">
      {selectedProperty && (
        <Alert className="bg-blue-50 border-blue-200">
          <Building2 className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-xs sm:text-sm text-blue-900">
            <strong>Imóvel selecionado:</strong> {selectedProperty.title}
            {selectedProperty.ref_id && <span className="ml-2 text-blue-700">({selectedProperty.ref_id})</span>}
          </AlertDescription>
        </Alert>
      )}

      {submitStatus === 'error' && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            Erro ao enviar mensagem. Por favor tente novamente.
          </AlertDescription>
        </Alert>
      )}

      {/* Name Field */}
      <div className="space-y-1.5">
        <Label htmlFor="name" className="flex items-center gap-1.5 text-sm">
          <User className="w-3.5 h-3.5" />
          Nome Completo *
        </Label>
        <Input
          id="name"
          {...register("name", { 
            required: "Nome é obrigatório",
            minLength: { value: 3, message: "Nome deve ter pelo menos 3 caracteres" }
          })}
          placeholder="João Silva"
          className={`h-10 sm:h-11 text-sm sm:text-base touch-manipulation ${errors.name ? "border-red-500" : touchedFields.name && !errors.name ? "border-green-500" : ""}`}
        />
        {errors.name && (
          <p className="text-xs text-red-600 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {errors.name.message}
          </p>
        )}
        {touchedFields.name && !errors.name && (
          <p className="text-xs text-green-600 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Válido
          </p>
        )}
      </div>

      {/* Email Field */}
      <div className="space-y-1.5">
        <Label htmlFor="email" className="flex items-center gap-1.5 text-sm">
          <Mail className="w-3.5 h-3.5" />
          Email *
        </Label>
        <Input
          id="email"
          type="email"
          {...register("email", { 
            required: "Email é obrigatório",
            pattern: { 
              value: emailRegex, 
              message: "Email inválido" 
            }
          })}
          placeholder="joao.silva@exemplo.com"
          className={`h-10 sm:h-11 text-sm sm:text-base touch-manipulation ${errors.email ? "border-red-500" : touchedFields.email && !errors.email ? "border-green-500" : ""}`}
        />
        {errors.email && (
          <p className="text-xs text-red-600 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {errors.email.message}
          </p>
        )}
        {touchedFields.email && !errors.email && formValues.email && (
          <p className="text-xs text-green-600 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Válido
          </p>
        )}
      </div>

      {/* Phone Field */}
      <div className="space-y-1.5">
        <Label htmlFor="phone" className="flex items-center gap-1.5 text-sm">
          <Phone className="w-3.5 h-3.5" />
          Telefone *
        </Label>
        <Input
          id="phone"
          type="tel"
          {...register("phone", { 
            required: "Telefone é obrigatório",
            pattern: { 
              value: phoneRegex, 
              message: "Telefone inválido (ex: 912345678 ou +351 912345678)" 
            }
          })}
          placeholder="+351 912 345 678"
          className={`h-10 sm:h-11 text-sm sm:text-base touch-manipulation ${errors.phone ? "border-red-500" : touchedFields.phone && !errors.phone ? "border-green-500" : ""}`}
        />
        {errors.phone && (
          <p className="text-xs text-red-600 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {errors.phone.message}
          </p>
        )}
        {touchedFields.phone && !errors.phone && formValues.phone && (
          <p className="text-xs text-green-600 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Válido
          </p>
        )}
      </div>

      {/* Company Field (conditional) */}
      {showCompanyField && (
        <div className="space-y-1.5">
          <Label htmlFor="company" className="flex items-center gap-1.5 text-sm">
            <Building2 className="w-3.5 h-3.5" />
            Empresa (opcional)
          </Label>
          <Input
            id="company"
            {...register("company")}
            placeholder="Nome da empresa"
            className="h-10 sm:h-11 text-sm sm:text-base touch-manipulation"
          />
        </div>
      )}

      {/* Message Field */}
      <div className="space-y-1.5">
        <Label htmlFor="message" className="text-sm">
          Mensagem *
          <span className="text-xs text-slate-500 ml-2">
            ({formValues.message?.length || 0}/500)
          </span>
        </Label>
        <Textarea
          id="message"
          {...register("message", { 
            required: "Mensagem é obrigatória",
            minLength: { value: 10, message: "Mensagem deve ter pelo menos 10 caracteres" },
            maxLength: { value: 500, message: "Mensagem não pode ter mais de 500 caracteres" }
          })}
          placeholder="Descreva o seu interesse ou questão..."
          rows={4}
          className={`resize-none text-sm sm:text-base touch-manipulation ${errors.message ? "border-red-500" : touchedFields.message && !errors.message ? "border-green-500" : ""}`}
        />
        {errors.message && (
          <p className="text-xs text-red-600 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {errors.message.message}
          </p>
        )}
      </div>

      {/* Submit Button */}
      <Button 
        type="submit" 
        className="w-full h-11 sm:h-12 text-sm sm:text-base font-medium touch-manipulation active:scale-95 transition-transform"
        style={{ backgroundColor: brandColor }}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2 animate-spin" />
            A enviar...
          </>
        ) : (
          <>
            <Mail className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            Enviar Mensagem
          </>
        )}
      </Button>

      <p className="text-xs text-center text-slate-500 leading-relaxed">
        Ao enviar, concorda que a nossa equipa entre em contacto consigo.
      </p>
    </form>
  );
}