import React from "react";
import { Helmet } from "react-helmet-async";

/**
 * Componente de SEO otimizado para audiências internacionais
 * Gera meta tags otimizadas para mercados internacionais interessados em imóveis em Portugal
 */
export default function InternationalSEO({ property, locale = 'pt' }) {
  const generateInternationalKeywords = () => {
    const baseKeywords = {
      pt: [
        "imóveis portugal",
        "propriedades portugal",
        "casas portugal",
        "apartamentos portugal",
        "investimento imobiliário portugal",
        "comprar casa portugal"
      ],
      en: [
        "portugal real estate",
        "properties in portugal",
        "houses for sale portugal",
        "apartments portugal",
        "portugal property investment",
        "buy house portugal",
        "golden visa portugal",
        "portugal homes for sale",
        "algarve properties",
        "lisbon apartments"
      ],
      es: [
        "inmobiliaria portugal",
        "propiedades en portugal",
        "casas en portugal",
        "apartamentos portugal",
        "inversión inmobiliaria portugal",
        "comprar casa portugal",
        "visa dorada portugal"
      ],
      fr: [
        "immobilier portugal",
        "propriétés au portugal",
        "maisons à vendre portugal",
        "appartements portugal",
        "investissement immobilier portugal",
        "acheter maison portugal",
        "visa or portugal"
      ],
      de: [
        "immobilien portugal",
        "immobilien in portugal",
        "häuser portugal",
        "wohnungen portugal",
        "immobilieninvestition portugal",
        "haus kaufen portugal",
        "goldenes visum portugal"
      ]
    };

    const cityKeywords = {
      en: `${property.city} portugal real estate, ${property.city} properties, buy in ${property.city}`,
      es: `${property.city} portugal inmobiliaria, propiedades ${property.city}`,
      fr: `${property.city} portugal immobilier, propriétés ${property.city}`,
      de: `${property.city} portugal immobilien`
    };

    const typeKeywords = {
      apartment: {
        en: "apartment, flat, condo",
        es: "apartamento, piso",
        fr: "appartement",
        de: "wohnung, apartment"
      },
      house: {
        en: "house, villa, home",
        es: "casa, chalet, villa",
        fr: "maison, villa",
        de: "haus, villa"
      },
      farm: {
        en: "farm, estate, country house, quinta",
        es: "finca, hacienda, quinta",
        fr: "ferme, domaine, quinta",
        de: "bauernhof, landgut, quinta"
      }
    };

    const keywords = [
      ...baseKeywords[locale] || baseKeywords.en,
      cityKeywords[locale] || `${property.city} portugal`,
      typeKeywords[property.property_type]?.[locale] || property.property_type
    ];

    return keywords.join(", ");
  };

  const generateInternationalDescription = () => {
    const descriptions = {
      pt: `${property.title} em ${property.city}, Portugal. ${property.bedrooms ? `${property.bedrooms} quartos` : ''} ${property.price ? `por €${property.price.toLocaleString()}` : ''}. Imóvel de qualidade em Portugal.`,
      en: `${property.title} in ${property.city}, Portugal. ${property.bedrooms ? `${property.bedrooms} bedrooms` : ''} ${property.price ? `for €${property.price.toLocaleString()}` : ''}. Premium Portugal real estate. Perfect for investment, golden visa, or relocation to Portugal.`,
      es: `${property.title} en ${property.city}, Portugal. ${property.bedrooms ? `${property.bedrooms} habitaciones` : ''} ${property.price ? `por €${property.price.toLocaleString()}` : ''}. Inmueble de calidad en Portugal. Ideal para inversión y visa dorada.`,
      fr: `${property.title} à ${property.city}, Portugal. ${property.bedrooms ? `${property.bedrooms} chambres` : ''} ${property.price ? `pour €${property.price.toLocaleString()}` : ''}. Immobilier de qualité au Portugal. Parfait pour investissement et visa or.`,
      de: `${property.title} in ${property.city}, Portugal. ${property.bedrooms ? `${property.bedrooms} Schlafzimmer` : ''} ${property.price ? `für €${property.price.toLocaleString()}` : ''}. Hochwertige Immobilie in Portugal. Ideal für Investment und goldenes Visum.`
    };

    return descriptions[locale] || descriptions.en;
  };

  return (
    <Helmet>
      <meta name="keywords" content={generateInternationalKeywords()} />
      <meta name="description" content={generateInternationalDescription()} />
      
      {/* Open Graph for international sharing */}
      <meta property="og:locale" content={locale === 'pt' ? 'pt_PT' : locale === 'en' ? 'en_US' : locale === 'es' ? 'es_ES' : 'fr_FR'} />
      <meta property="og:site_name" content="Zugruppe - Portugal Real Estate" />
      
      {/* Geographic targeting */}
      <meta name="geo.region" content="PT" />
      <meta name="geo.placename" content={property.city} />
      
      {/* International audience tags */}
      <meta name="audience" content="international buyers, expats, investors" />
      <meta name="target" content="portugal real estate market" />
    </Helmet>
  );
}