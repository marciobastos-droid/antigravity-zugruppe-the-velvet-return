import { useMemo } from 'react';

/**
 * Hook para gerar SEO dinâmico baseado em filtros de imóveis
 * @param {Object} params - Parâmetros de configuração
 * @param {Array} params.properties - Lista de imóveis filtrados
 * @param {Object} params.filters - Filtros ativos
 * @param {string} params.pageType - Tipo de página (residential, commercial, luxury, worldwide)
 * @param {string} params.locale - Idioma atual
 * @returns {Object} - { title, description, keywords, structuredData }
 */
export function useDynamicPropertySEO({ properties, filters, pageType, locale = 'pt' }) {
  
  const propertyTypeLabels = {
    apartment: { pt: "Apartamento", en: "Apartment", es: "Apartamento", fr: "Appartement" },
    house: { pt: "Moradia", en: "House", es: "Casa", fr: "Maison" },
    land: { pt: "Terreno", en: "Land", es: "Terreno", fr: "Terrain" },
    building: { pt: "Prédio", en: "Building", es: "Edificio", fr: "Immeuble" },
    farm: { pt: "Quinta", en: "Farm", es: "Finca", fr: "Ferme" },
    store: { pt: "Loja", en: "Store", es: "Tienda", fr: "Magasin" },
    warehouse: { pt: "Armazém", en: "Warehouse", es: "Almacén", fr: "Entrepôt" },
    office: { pt: "Escritório", en: "Office", es: "Oficina", fr: "Bureau" },
    condo: { pt: "Condomínio", en: "Condo", es: "Condominio", fr: "Copropriété" },
    townhouse: { pt: "Casa Geminada", en: "Townhouse", es: "Casa Adosada", fr: "Maison de Ville" }
  };

  const basePageTitles = {
    residential: { pt: "Imóveis Residenciais", en: "Residential Properties", es: "Propiedades Residenciales", fr: "Propriétés Résidentielles" },
    commercial: { pt: "Espaços Comerciais", en: "Commercial Spaces", es: "Espacios Comerciales", fr: "Espaces Commerciaux" },
    luxury: { pt: "Imóveis de Luxo Premium", en: "Premium Luxury Properties", es: "Propiedades de Lujo Premium", fr: "Propriétés de Luxe Premium" },
    worldwide: { pt: "Imóveis Internacionais", en: "International Properties", es: "Propiedades Internacionales", fr: "Propriétés Internationales" }
  };

  const seo = useMemo(() => {
    const lang = locale || 'pt';
    const parts = [];
    const keywordParts = [];
    const contextParts = []; // Para descrição mais natural

    // Título base da página
    const baseTitle = basePageTitles[pageType]?.[lang] || basePageTitles[pageType]?.pt || "Imóveis";
    parts.push(baseTitle);
    keywordParts.push(baseTitle.toLowerCase());

    // Tipo de negócio
    if (filters?.listing_type && filters.listing_type !== "all") {
      const businessType = filters.listing_type === "sale" 
        ? (lang === 'en' ? "For Sale" : lang === 'es' ? "En Venta" : lang === 'fr' ? "À Vendre" : "Venda")
        : (lang === 'en' ? "For Rent" : lang === 'es' ? "En Alquiler" : lang === 'fr' ? "À Louer" : "Arrendamento");
      parts.push(businessType);
      keywordParts.push(businessType.toLowerCase());
      contextParts.push(`para ${businessType.toLowerCase()}`);
    }

    // Tipo de imóvel
    if (filters?.property_type && filters.property_type !== "all") {
      const typeLabel = propertyTypeLabels[filters.property_type]?.[lang] || 
                        propertyTypeLabels[filters.property_type]?.pt || 
                        filters.property_type;
      parts.push(typeLabel);
      keywordParts.push(typeLabel.toLowerCase());
      contextParts.push(typeLabel.toLowerCase());
    }

    // Tipologia (T's)
    if (filters?.bedrooms && filters.bedrooms !== "all") {
      const bedroomLabel = filters.bedrooms === "5+" ? "T5+" : `T${filters.bedrooms}`;
      parts.push(bedroomLabel);
      keywordParts.push(bedroomLabel.toLowerCase());
      contextParts.push(bedroomLabel);
    }

    // Localização - País
    if (filters?.country && filters.country !== "all") {
      if (filters.country === "international") {
        parts.push(lang === 'en' ? "International" : lang === 'es' ? "Internacional" : lang === 'fr' ? "International" : "Internacional");
        keywordParts.push("internacional", "international");
      } else {
        parts.push(filters.country);
        keywordParts.push(filters.country.toLowerCase());
        contextParts.push(`em ${filters.country}`);
      }
    }

    // Localização - Concelho
    if (filters?.city && filters.city !== "all") {
      parts.push(filters.city);
      keywordParts.push(filters.city.toLowerCase());
      contextParts.push(`em ${filters.city}`);
    } 
    // Localização - Distrito (se concelho não especificado)
    else if (filters?.district && filters.district !== "all") {
      parts.push(filters.district);
      keywordParts.push(filters.district.toLowerCase());
      contextParts.push(`em ${filters.district}`);
    }

    // Intervalo de Preço
    if (filters?.priceMin || filters?.priceMax) {
      if (filters.priceMin && filters.priceMax) {
        const priceRange = `€${Number(filters.priceMin).toLocaleString()}-${Number(filters.priceMax).toLocaleString()}`;
        parts.push(priceRange);
        contextParts.push(`entre ${priceRange}`);
      } else if (filters.priceMax) {
        const priceLabel = `até €${Number(filters.priceMax).toLocaleString()}`;
        parts.push(priceLabel);
        contextParts.push(priceLabel);
      } else if (filters.priceMin) {
        const priceLabel = `a partir de €${Number(filters.priceMin).toLocaleString()}`;
        parts.push(priceLabel);
        contextParts.push(priceLabel);
      }
    }

    // Intervalo de Área
    if (filters?.useful_area?.min || filters?.useful_area?.max) {
      if (filters.useful_area.min && filters.useful_area.max) {
        contextParts.push(`${filters.useful_area.min}-${filters.useful_area.max}m²`);
      } else if (filters.useful_area.min) {
        contextParts.push(`a partir de ${filters.useful_area.min}m²`);
      } else if (filters.useful_area.max) {
        contextParts.push(`até ${filters.useful_area.max}m²`);
      }
    }

    // Comodidades selecionadas
    if (filters?.specific_amenities && filters.specific_amenities.length > 0) {
      const firstAmenity = filters.specific_amenities[0];
      if (filters.specific_amenities.length === 1) {
        contextParts.push(`com ${firstAmenity.toLowerCase()}`);
        keywordParts.push(firstAmenity.toLowerCase());
      } else {
        contextParts.push(`com ${firstAmenity.toLowerCase()} e mais comodidades`);
        filters.specific_amenities.forEach(am => keywordParts.push(am.toLowerCase()));
      }
    }

    // Certificado Energético
    if (filters?.energy_certificate && filters.energy_certificate !== "all") {
      contextParts.push(`certificado energético ${filters.energy_certificate}`);
      keywordParts.push(`certificado energético ${filters.energy_certificate}`);
    }

    // Disponibilidade
    if (filters?.availability && filters.availability !== "all") {
      const availLabels = {
        available: { pt: "Disponível", en: "Available", es: "Disponible", fr: "Disponible" },
        reserved: { pt: "Reservado", en: "Reserved", es: "Reservado", fr: "Réservé" }
      };
      const availLabel = availLabels[filters.availability]?.[lang] || availLabels[filters.availability]?.pt;
      if (availLabel) {
        contextParts.push(availLabel.toLowerCase());
      }
    }

    // Construir título final
    const title = parts.slice(0, 6).join(" | ") + " | Zugruppe";

    // Construir descrição otimizada
    let description;
    const count = properties.length;
    const propertyWord = count === 1 
      ? (lang === 'en' ? "property" : lang === 'es' ? "propiedad" : lang === 'fr' ? "propriété" : "imóvel")
      : (lang === 'en' ? "properties" : lang === 'es' ? "propiedades" : lang === 'fr' ? "propriétés" : "imóveis");

    if (count === 0) {
      description = lang === 'pt' 
        ? `Procura por ${contextParts.join(" ")}. Explore outras opções disponíveis na Zugruppe, a sua imobiliária de confiança.`
        : lang === 'en'
        ? `Search for ${contextParts.join(" ")}. Explore other available options at Zugruppe, your trusted real estate agency.`
        : `Búsqueda de ${contextParts.join(" ")}. Explore otras opciones disponibles en Zugruppe.`;
    } else {
      // Adicionar localização se não estiver já incluída
      const locationContext = filters?.city && filters.city !== "all" 
        ? filters.city 
        : filters?.district && filters.district !== "all"
        ? filters.district
        : filters?.country && filters.country !== "all" && filters.country !== "Portugal"
        ? filters.country
        : "Portugal";

      description = lang === 'pt'
        ? `Descubra ${count} ${propertyWord} ${contextParts.join(" ")} em ${locationContext}. Imóveis de qualidade com fotos, características detalhadas e localização. ${filters?.listing_type === 'sale' ? 'Compre' : filters?.listing_type === 'rent' ? 'Arrende' : 'Explore'} o seu próximo imóvel com a Zugruppe.`
        : lang === 'en'
        ? `Discover ${count} ${propertyWord} ${contextParts.join(" ")} in ${locationContext}. Quality properties with photos, detailed features and location. ${filters?.listing_type === 'sale' ? 'Buy' : filters?.listing_type === 'rent' ? 'Rent' : 'Explore'} your next property with Zugruppe.`
        : `Descubra ${count} ${propertyWord} ${contextParts.join(" ")} en ${locationContext}. Propiedades de calidad con fotos, características y ubicación.`;
    }

    // Construir keywords otimizadas
    const baseKeywords = ["imóveis", "portugal", "zugruppe", "real estate"];
    
    // Adicionar keywords específicas por tipo de página
    if (pageType === "residential") {
      baseKeywords.push("apartamentos", "moradias", "casas", "apartments", "houses");
    } else if (pageType === "commercial") {
      baseKeywords.push("lojas", "escritórios", "armazéns", "commercial", "offices", "retail");
    } else if (pageType === "luxury") {
      baseKeywords.push("luxo", "premium", "luxury", "high-end", "exclusive");
    } else if (pageType === "worldwide") {
      baseKeywords.push("internacional", "international", "global", "overseas");
    }

    // Adicionar localização às keywords
    if (filters?.city && filters.city !== "all") {
      baseKeywords.push(filters.city.toLowerCase());
    }
    if (filters?.district && filters.district !== "all") {
      baseKeywords.push(filters.district.toLowerCase());
    }
    if (filters?.country && filters.country !== "all") {
      baseKeywords.push(filters.country.toLowerCase());
    }

    // Adicionar tipologias comuns às keywords
    if (filters?.bedrooms && filters.bedrooms !== "all") {
      baseKeywords.push(`t${filters.bedrooms}`, `${filters.bedrooms} quartos`, `${filters.bedrooms} bedrooms`);
    }

    // Adicionar tipo de negócio
    if (filters?.listing_type === "sale") {
      baseKeywords.push("venda", "comprar", "for sale", "buy");
    } else if (filters?.listing_type === "rent") {
      baseKeywords.push("arrendamento", "alugar", "rent", "rental");
    }

    const keywords = [...new Set([...baseKeywords, ...keywordParts])].join(", ");

    // Structured Data otimizado
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "name": parts.join(" - "),
      "description": description,
      "numberOfItems": properties.length,
      "itemListElement": properties.slice(0, 10).map((property, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "item": {
          "@type": "RealEstateListing",
          "name": property.title,
          "description": property.description?.substring(0, 200),
          "url": `https://zugruppe.base44.app/PropertyDetails?id=${property.id}`,
          "image": property.images?.[0] || "",
          "offers": {
            "@type": "Offer",
            "price": property.price,
            "priceCurrency": property.currency || "EUR",
            "availability": property.availability_status === "available" 
              ? "https://schema.org/InStock" 
              : "https://schema.org/OutOfStock"
          },
          "address": {
            "@type": "PostalAddress",
            "addressLocality": property.city,
            "addressRegion": property.state,
            "addressCountry": property.country || "PT"
          }
        }
      }))
    };

    // Dados agregados para metadados adicionais
    const priceRange = properties.length > 0 
      ? {
          min: Math.min(...properties.map(p => p.price || 0).filter(p => p > 0)),
          max: Math.max(...properties.map(p => p.price || 0))
        }
      : { min: 0, max: 0 };

    return {
      title,
      description,
      keywords,
      structuredData,
      meta: {
        propertyCount: properties.length,
        priceRange,
        hasFilters: contextParts.length > 0
      }
    };
  }, [properties, filters, pageType, locale]);

  return seo;
}

/**
 * Gerar URL canônica com filtros para SEO
 */
export function generateCanonicalURL(baseURL, filters) {
  const params = new URLSearchParams();
  
  // Incluir apenas filtros relevantes para SEO
  if (filters.listing_type && filters.listing_type !== "all") {
    params.set('type', filters.listing_type);
  }
  if (filters.property_type && filters.property_type !== "all") {
    params.set('category', filters.property_type);
  }
  if (filters.bedrooms && filters.bedrooms !== "all") {
    params.set('beds', filters.bedrooms);
  }
  if (filters.city && filters.city !== "all") {
    params.set('city', filters.city);
  }
  if (filters.district && filters.district !== "all") {
    params.set('district', filters.district);
  }
  if (filters.country && filters.country !== "all") {
    params.set('country', filters.country);
  }
  if (filters.priceMin) {
    params.set('minPrice', filters.priceMin);
  }
  if (filters.priceMax) {
    params.set('maxPrice', filters.priceMax);
  }

  const queryString = params.toString();
  return queryString ? `${baseURL}?${queryString}` : baseURL;
}