import React from "react";
import { Helmet } from "react-helmet-async";

export default function SEOHead({
  title,
  description,
  keywords,
  image,
  url,
  type = "website",
  price,
  currency = "EUR",
  availability = "in stock",
  propertyType,
  location,
  structuredData,
  alternateLanguages = []
}) {
  const siteName = "Zugruppe";
  
  // Detect language from URL or use Portuguese as default
  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const lang = urlParams.get('lang') || 'pt';
  
  const defaultTitles = {
    pt: "Zugruppe - Imóveis Premium em Portugal e no Mundo",
    en: "Zugruppe - Premium Real Estate in Portugal and Worldwide",
    es: "Zugruppe - Propiedades Premium en Portugal y el Mundo",
    fr: "Zugruppe - Immobilier Premium au Portugal et dans le Monde"
  };
  
  const defaultDescriptions = {
    pt: "Encontre o seu imóvel ideal com a Zugruppe. Apartamentos, moradias e espaços comerciais de excelência em Portugal e internacionalmente.",
    en: "Find your ideal property with Zugruppe. Premium apartments, houses and commercial spaces in Portugal and internationally.",
    es: "Encuentre su propiedad ideal con Zugruppe. Apartamentos, casas y espacios comerciales de excelencia en Portugal e internacionalmente.",
    fr: "Trouvez votre propriété idéale avec Zugruppe. Appartements, maisons et espaces commerciaux d'excellence au Portugal et à l'international."
  };
  
  const defaultTitle = defaultTitles[lang] || defaultTitles.pt;
  const defaultDescription = defaultDescriptions[lang] || defaultDescriptions.pt;
  const defaultImage = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6915a593b6edd8435f5838bd/c00740fb7_ZUGRUPPE_branco_azul-trasnparente_c-slogan1.png";
  const BASE_DOMAIN = "https://zugruppe.base44.app";

  const fullTitle = title ? `${title} | ${siteName}` : defaultTitle;
  const metaDescription = description || defaultDescription;
  const metaImage = image || defaultImage;
  const canonical = url || (typeof window !== "undefined" ? `${BASE_DOMAIN}${window.location.pathname}${window.location.search}` : BASE_DOMAIN);

  // Gerar structured data automaticamente se for imóvel
  let autoStructuredData = structuredData;
  
  if (!autoStructuredData && type === "product" && price) {
    // Schema.org completo para RealEstateListing
    autoStructuredData = {
      "@context": "https://schema.org",
      "@type": propertyType === "apartment" ? "Apartment" : 
                propertyType === "house" ? "House" :
                propertyType === "store" || propertyType === "office" || propertyType === "warehouse" ? "Commercial" :
                "RealEstateListing",
      "name": title,
      "description": metaDescription,
      "image": Array.isArray(metaImage) ? metaImage : [metaImage],
      "url": canonical,
      "offers": {
        "@type": "Offer",
        "url": canonical,
        "priceCurrency": currency,
        "price": price,
        "availability": `https://schema.org/${availability === "available" || availability === "in stock" ? "InStock" : "OutOfStock"}`,
        "seller": {
          "@type": "Organization",
          "name": siteName,
          "url": BASE_DOMAIN
        }
      }
    };

    if (location) {
      autoStructuredData.address = {
        "@type": "PostalAddress",
        "addressLocality": location.city,
        "addressRegion": location.state,
        "addressCountry": location.country || "PT"
      };
    }
  }

  return (
    <Helmet>
      {/* Essential Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={metaDescription} />
      {keywords && <meta name="keywords" content={keywords} />}
      <link rel="canonical" href={canonical} />
      
      {/* Open Graph */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={metaDescription} />
      <meta property="og:image" content={metaImage} />
      <meta property="og:url" content={canonical} />
      <meta property="og:site_name" content={siteName} />
      {type === "product" && price && (
        <>
          <meta property="product:price:amount" content={price} />
          <meta property="product:price:currency" content={currency} />
        </>
      )}
      
      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={metaDescription} />
      <meta name="twitter:image" content={metaImage} />

      {/* Hreflang Tags for Multilingual Support */}
      {alternateLanguages.length > 0 && alternateLanguages.map((lang) => (
        <link key={lang.locale} rel="alternate" hrefLang={lang.locale} href={lang.url} />
      ))}
      {alternateLanguages.length > 0 && (
        <link rel="alternate" hrefLang="x-default" href={canonical} />
      )}

      {/* Structured Data */}
      {autoStructuredData && (
        <script type="application/ld+json">
          {JSON.stringify(autoStructuredData)}
        </script>
      )}

      {/* Performance & SEO */}
      <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
      <meta name="googlebot" content="index, follow" />
      <meta httpEquiv="x-ua-compatible" content="ie=edge" />
      <meta name="format-detection" content="telephone=no" />
      
      {/* Additional SEO Enhancements */}
      <meta name="author" content={siteName} />
      <meta name="publisher" content={siteName} />
      {location && (
        <>
          <meta name="geo.region" content={location.country === "Portugal" ? "PT" : location.country} />
          <meta name="geo.placename" content={location.city} />
          {location.latitude && location.longitude && (
            <meta name="geo.position" content={`${location.latitude};${location.longitude}`} />
          )}
          <meta name="ICBM" content={`${location.latitude || ''}, ${location.longitude || ''}`} />
        </>
      )}
    </Helmet>
  );
}