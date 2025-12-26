import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShoppingCart, Home as HomeIcon, Handshake, Building2, User, Mail, Phone, MapPin, Euro, Sparkles, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import SmartInput from "./SmartInput";
import SmartTextarea from "./SmartTextarea";
import { useSmartForm } from "./useSmartForm";
import { base44 } from "@/api/base44Client";

/**
 * Formulário dinâmico de oportunidades
 * Adapta-se ao tipo de lead (comprador, vendedor, parceiro)
 */
export default function DynamicOpportunityForm({ 
  opportunity = null,
  onSuccess,
  onCancel
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
    resetForm
  } = useSmartForm();

  const [saving, setSaving] = useState(false);
  const [leadType, setLeadType] = useState(opportunity?.lead_type || 'comprador');
  const [emailSuggestions, setEmailSuggestions] = useState([]);

  // Pre-fill data se for edição
  useEffect(() => {
    if (opportunity) {
      updateField('buyer_name', opportunity.buyer_name);
      updateField('buyer_email', opportunity.buyer_email);
      updateField('buyer_phone', opportunity.buyer_phone);
      updateField('location', opportunity.location);
      updateField('budget', opportunity.budget);
      updateField('property_type_interest', opportunity.property_type_interest);
      updateField('message', opportunity.message);
      updateField('company_name', opportunity.company_name);
      updateField('partnership_type', opportunity.partnership_type);
      updateField('property_to_sell', opportunity.property_to_sell);
    } else if (currentUser && !formData.buyer_name) {
      autofillUserData();
      // Mapear campos do utilizador para o formato do formulário
      updateField('buyer_name', currentUser.full_name);
      updateField('buyer_email', currentUser.email);
      updateField('buyer_phone', currentUser.phone);
    }
  }, [opportunity, currentUser]);

  // Sugestões de email
  useEffect(() => {
    if (formData.buyer_email && formData.buyer_email.length > 2) {
      const matches = recentContacts
        .filter(c => c.email?.toLowerCase().includes(formData.buyer_email.toLowerCase()))
        .slice(0, 3);
      setEmailSuggestions(matches);
    } else {
      setEmailSuggestions([]);
    }
  }, [formData.buyer_email, recentContacts]);

  // Validation schemas por tipo de lead
  const getValidationSchema = () => {
    const baseSchema = {
      buyer_name: { required: true, minLength: 2, maxLength: 100 },
      buyer_email: { required: true, email: true },
      buyer_phone: { required: false, phone: true }
    };

    if (leadType === 'comprador') {
      return {
        ...baseSchema,
        location: { required: false, minLength: 2 },
        budget: { required: false },
        property_type_interest: { required: false }
      };
    } else if (leadType === 'vendedor') {
      return {
        ...baseSchema,
        property_to_sell: { required: true, minLength: 10 }
      };
    } else if (leadType.includes('parceiro')) {
      return {
        ...baseSchema,
        company_name: { required: true, minLength: 2 },
        partnership_type: { required: false }
      };
    }

    return baseSchema;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const schema = getValidationSchema();
    if (!validateForm(schema)) {
      toast.error("Por favor, corrija os erros no formulário");
      return;
    }

    setSaving(true);

    try {
      const data = {
        lead_type: leadType,
        buyer_name: formData.buyer_name,
        buyer_email: formData.buyer_email,
        buyer_phone: formData.buyer_phone || '',
        location: formData.location || '',
        budget: formData.budget ? Number(formData.budget) : undefined,
        property_type_interest: formData.property_type_interest || '',
        message: formData.message || '',
        company_name: formData.company_name || '',
        partnership_type: formData.partnership_type || '',
        property_to_sell: formData.property_to_sell || '',
        status: 'new',
        priority: 'medium'
      };

      if (opportunity) {
        await base44.entities.Opportunity.update(opportunity.id, data);
        toast.success("Oportunidade atualizada!");
      } else {
        await base44.entities.Opportunity.create(data);
        toast.success("Oportunidade criada!");
      }

      resetForm();
      if (onSuccess) onSuccess();
    } catch (error) {
      toast.error("Erro ao guardar: " + (error.message || "Erro desconhecido"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Lead Type Selector */}
      {!opportunity && (
        <div>
          <Label className="text-sm font-medium text-slate-700 mb-3 block">
            Tipo de Oportunidade <span className="text-red-500">*</span>
          </Label>
          <Tabs value={leadType} onValueChange={setLeadType}>
            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
              <TabsTrigger value="comprador" className="text-xs sm:text-sm">
                <ShoppingCart className="w-4 h-4 mr-1" />
                Comprador
              </TabsTrigger>
              <TabsTrigger value="vendedor" className="text-xs sm:text-sm">
                <HomeIcon className="w-4 h-4 mr-1" />
                Vendedor
              </TabsTrigger>
              <TabsTrigger value="parceiro_comprador" className="text-xs sm:text-sm">
                <Handshake className="w-4 h-4 mr-1" />
                Parceiro C
              </TabsTrigger>
              <TabsTrigger value="parceiro_vendedor" className="text-xs sm:text-sm">
                <Building2 className="w-4 h-4 mr-1" />
                Parceiro V
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      )}

      {/* Dados de Contacto */}
      <div className="space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
        <h4 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
          <User className="w-4 h-4" />
          Dados de Contacto
        </h4>

        <SmartInput
          label="Nome"
          name="buyer_name"
          value={formData.buyer_name || ''}
          onChange={(value) => updateField('buyer_name', value, getValidationSchema().buyer_name)}
          onBlur={() => touchField('buyer_name', getValidationSchema().buyer_name)}
          error={fieldErrors.buyer_name}
          touched={touchedFields.buyer_name}
          required
          placeholder={leadType.includes('parceiro') ? "Nome da empresa/responsável" : "Nome completo"}
          icon={User}
          success
        />

        <SmartInput
          label="Email"
          name="buyer_email"
          type="email"
          value={formData.buyer_email || ''}
          onChange={(value) => updateField('buyer_email', value, getValidationSchema().buyer_email)}
          onBlur={() => touchField('buyer_email', getValidationSchema().buyer_email)}
          error={fieldErrors.buyer_email}
          touched={touchedFields.buyer_email}
          required
          placeholder="email@exemplo.com"
          icon={Mail}
          suggestions={emailSuggestions}
          onSuggestionClick={(contact) => {
            updateField('buyer_name', contact.full_name, getValidationSchema().buyer_name);
            updateField('buyer_email', contact.email, getValidationSchema().buyer_email);
            updateField('buyer_phone', contact.phone || '', getValidationSchema().buyer_phone);
            setEmailSuggestions([]);
            toast.success("Dados do contacto carregados");
          }}
          success
        />

        <SmartInput
          label="Telefone"
          name="buyer_phone"
          type="tel"
          value={formData.buyer_phone || ''}
          onChange={(value) => updateField('buyer_phone', value, getValidationSchema().buyer_phone)}
          onBlur={() => touchField('buyer_phone', getValidationSchema().buyer_phone)}
          error={fieldErrors.buyer_phone}
          touched={touchedFields.buyer_phone}
          placeholder="+351 912 345 678"
          icon={Phone}
        />
      </div>

      {/* Campos Dinâmicos por Tipo de Lead */}
      <AnimatePresence mode="wait">
        {leadType === 'comprador' && (
          <motion.div
            key="comprador"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200"
          >
            <h4 className="font-semibold text-blue-900 text-sm flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" />
              Preferências de Compra
            </h4>

            <SmartInput
              label="Localização Pretendida"
              name="location"
              value={formData.location || ''}
              onChange={(value) => updateField('location', value)}
              placeholder="Ex: Lisboa, Porto, Cascais..."
              icon={MapPin}
            />

            <SmartInput
              label="Orçamento Máximo"
              name="budget"
              type="number"
              value={formData.budget || ''}
              onChange={(value) => updateField('budget', value)}
              placeholder="Ex: 500000"
              icon={Euro}
              description="Opcional - ajuda-nos a encontrar opções adequadas"
            />

            <div>
              <Label className="text-sm font-medium text-slate-700 mb-2 block">
                Tipo de Imóvel
              </Label>
              <Select 
                value={formData.property_type_interest || ''} 
                onValueChange={(value) => updateField('property_type_interest', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="apartment">Apartamento</SelectItem>
                  <SelectItem value="house">Moradia</SelectItem>
                  <SelectItem value="land">Terreno</SelectItem>
                  <SelectItem value="store">Loja</SelectItem>
                  <SelectItem value="office">Escritório</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </motion.div>
        )}

        {leadType === 'vendedor' && (
          <motion.div
            key="vendedor"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-4 p-4 bg-green-50 rounded-lg border border-green-200"
          >
            <h4 className="font-semibold text-green-900 text-sm flex items-center gap-2">
              <HomeIcon className="w-4 h-4" />
              Imóvel a Vender
            </h4>

            <SmartTextarea
              label="Descrição do Imóvel"
              name="property_to_sell"
              value={formData.property_to_sell || ''}
              onChange={(value) => updateField('property_to_sell', value, getValidationSchema().property_to_sell)}
              onBlur={() => touchField('property_to_sell', getValidationSchema().property_to_sell)}
              error={fieldErrors.property_to_sell}
              touched={touchedFields.property_to_sell}
              required
              placeholder="Descreva o imóvel que pretende vender: tipo, localização, características..."
              rows={4}
              maxLength={500}
              minLength={10}
            />
          </motion.div>
        )}

        {leadType.includes('parceiro') && (
          <motion.div
            key="parceiro"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-4 p-4 bg-purple-50 rounded-lg border border-purple-200"
          >
            <h4 className="font-semibold text-purple-900 text-sm flex items-center gap-2">
              <Handshake className="w-4 h-4" />
              Informações de Parceria
            </h4>

            <SmartInput
              label="Nome da Empresa"
              name="company_name"
              value={formData.company_name || ''}
              onChange={(value) => updateField('company_name', value, getValidationSchema().company_name)}
              onBlur={() => touchField('company_name', getValidationSchema().company_name)}
              error={fieldErrors.company_name}
              touched={touchedFields.company_name}
              required
              placeholder="Nome da empresa ou organização"
              icon={Building2}
              success
            />

            <SmartInput
              label="Tipo de Parceria"
              name="partnership_type"
              value={formData.partnership_type || ''}
              onChange={(value) => updateField('partnership_type', value)}
              placeholder="Ex: Angariador, Construtor, Investidor..."
              icon={Sparkles}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mensagem Adicional */}
      <SmartTextarea
        label="Notas Adicionais"
        name="message"
        value={formData.message || ''}
        onChange={(value) => updateField('message', value)}
        placeholder="Informações adicionais, preferências, observações..."
        rows={3}
        maxLength={500}
      />

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
            Cancelar
          </Button>
        )}
        <Button 
          type="submit" 
          disabled={saving}
          className="flex-1 bg-slate-900 hover:bg-slate-800"
          onClick={handleSubmit}
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              A guardar...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              {opportunity ? 'Atualizar' : 'Criar'} Oportunidade
            </>
          )}
        </Button>
      </div>
    </form>
  );
}