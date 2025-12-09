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
  structuredData
}) {
  const siteName = "Zugruppe";
  const defaultTitle = "Zugruppe - Imóveis Premium em Portugal e no Mundo";
  const defaultDescription = "Encontre o seu imóvel ideal com a Zugruppe. Apartamentos, moradias e espaços comerciais de excelência em Portugal e internacionalmente.";
  const defaultImage = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6915a593b6edd8435f5838bd/c00740fb7_ZUGRUPPE_branco_azul-trasnparente_c-slogan1.png";
  const BASE_DOMAIN = "https://zugruppe.base44.app";

  const fullTitle = title ? `${title} | ${siteName}` : defaultTitle;
  const metaDescription = description || defaultDescription;
  const metaImage = image || defaultImage;
  const canonical = url || (typeof window !== "undefined" ? `${BASE_DOMAIN}${window.location.pathname}${window.location.search}` : BASE_DOMAIN);

  // Gerar structured data automaticamente se for imóvel
  let autoStructuredData = structuredData;
  
  if (!autoStructuredData && type === "product" && price) {
    autoStructuredData = {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": title,
      "description": metaDescription,
      "image": metaImage,
      "offers": {
        "@type": "Offer",
        "url": canonical,
        "priceCurrency": currency,
        "price": price,
        "availability": `https://schema.org/${availability === "available" ? "InStock" : "OutOfStock"}`,
        "seller": {
          "@type": "Organization",
          "name": siteName
        }
      }
    };

    // Adicionar dados específicos de imóvel
    if (propertyType) {
      autoStructuredData["@type"] = "Apartment"; // ou House, Store, etc
      autoStructuredData.additionalType = "RealEstateListing";
    }

    if (location) {
      autoStructuredData.address = {
        "@type": "PostalAddress",
        "addressLocality": location.city,
        "addressRegion": location.state,
        "addressCountry": location.country || "Portugal"
      };
    }
  }

  return (
    <Helmet>
      {/* Basic Meta Tags */}
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
      <meta property="og:locale" content="pt_PT" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={metaDescription} />
      <meta name="twitter:image" content={metaImage} />

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
    </Helmet>
  );
}