import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/**
 * Hook para formulários inteligentes com:
 * - Preenchimento automático de dados do utilizador
 * - Sugestões baseadas em histórico de contactos
 * - Validação em tempo real
 */
export function useSmartForm() {
  const [formData, setFormData] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [touchedFields, setTouchedFields] = useState({});

  // Buscar dados do utilizador atual
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      try {
        return await base44.auth.me();
      } catch {
        return null;
      }
    }
  });

  // Buscar contactos recentes para autocompletar
  const { data: recentContacts = [] } = useQuery({
    queryKey: ['recentContacts'],
    queryFn: async () => {
      try {
        const contacts = await base44.entities.ClientContact.list('-created_date', 10);
        return contacts;
      } catch {
        return [];
      }
    }
  });

  // Auto-preencher com dados do utilizador
  const autofillUserData = () => {
    if (currentUser) {
      setFormData(prev => ({
        ...prev,
        name: prev.name || currentUser.full_name || '',
        email: prev.email || currentUser.email || '',
        phone: prev.phone || currentUser.phone || ''
      }));
    }
  };

  // Sugerir dados com base no email digitado
  const suggestFromEmail = (email) => {
    if (!email || email.length < 3) return null;
    
    const match = recentContacts.find(c => 
      c.email?.toLowerCase().includes(email.toLowerCase())
    );
    
    return match ? {
      name: match.full_name,
      email: match.email,
      phone: match.phone
    } : null;
  };

  // Validação de campo individual
  const validateField = (fieldName, value, rules = {}) => {
    const errors = [];

    if (rules.required && (!value || value.toString().trim() === '')) {
      errors.push('Campo obrigatório');
    }

    if (rules.email && value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        errors.push('Email inválido');
      }
    }

    if (rules.phone && value) {
      const phoneRegex = /^[\d\s()+\-]{9,}$/;
      if (!phoneRegex.test(value)) {
        errors.push('Telefone inválido');
      }
    }

    if (rules.minLength && value && value.length < rules.minLength) {
      errors.push(`Mínimo ${rules.minLength} caracteres`);
    }

    if (rules.maxLength && value && value.length > rules.maxLength) {
      errors.push(`Máximo ${rules.maxLength} caracteres`);
    }

    if (rules.pattern && value && !rules.pattern.test(value)) {
      errors.push(rules.patternMessage || 'Formato inválido');
    }

    if (rules.custom && value) {
      const customError = rules.custom(value, formData);
      if (customError) errors.push(customError);
    }

    setFieldErrors(prev => ({
      ...prev,
      [fieldName]: errors.length > 0 ? errors[0] : null
    }));

    return errors.length === 0;
  };

  // Atualizar campo
  const updateField = (fieldName, value, validationRules) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
    
    // Validar apenas se o campo já foi tocado
    if (touchedFields[fieldName] && validationRules) {
      validateField(fieldName, value, validationRules);
    }
  };

  // Marcar campo como tocado
  const touchField = (fieldName, validationRules) => {
    setTouchedFields(prev => ({ ...prev, [fieldName]: true }));
    
    // Validar imediatamente quando o campo perde o foco
    if (validationRules) {
      validateField(fieldName, formData[fieldName], validationRules);
    }
  };

  // Validar formulário completo
  const validateForm = (validationSchema) => {
    let isValid = true;
    const newErrors = {};

    Object.entries(validationSchema).forEach(([fieldName, rules]) => {
      const value = formData[fieldName];
      if (!validateField(fieldName, value, rules)) {
        isValid = false;
      }
    });

    return isValid;
  };

  // Reset do formulário
  const resetForm = () => {
    setFormData({});
    setFieldErrors({});
    setTouchedFields({});
  };

  return {
    formData,
    fieldErrors,
    touchedFields,
    currentUser,
    recentContacts,
    updateField,
    touchField,
    validateField,
    validateForm,
    autofillUserData,
    suggestFromEmail,
    resetForm
  };
}