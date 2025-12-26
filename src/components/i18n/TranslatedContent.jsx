import React from "react";
import { useLocalization } from "./LocalizationContext";

/**
 * Componente que renderiza conteúdo traduzido baseado no locale atual
 */
export default function TranslatedContent({ property, field = "description" }) {
  const { locale } = useLocalization();

  // Se tiver tradução disponível, usar
  if (property?.translations?.[locale]?.[field]) {
    return <>{property.translations[locale][field]}</>;
  }

  // Fallback para conteúdo original em português
  return <>{property?.[field] || ''}</>;
}

/**
 * Hook para obter conteúdo traduzido
 */
export function useTranslatedProperty(property) {
  const { locale } = useLocalization();

  return React.useMemo(() => {
    if (!property) return null;

    // Se não houver traduções ou estiver em português, retornar original
    if (locale === 'pt' || !property.translations?.[locale]) {
      return property;
    }

    // Retornar propriedade com campos traduzidos
    return {
      ...property,
      title: property.translations[locale].title || property.title,
      description: property.translations[locale].description || property.description,
      amenities: property.translations[locale].amenities || property.amenities
    };
  }, [property, locale]);
}