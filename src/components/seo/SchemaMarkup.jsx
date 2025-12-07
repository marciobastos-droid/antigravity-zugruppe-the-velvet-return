import React from 'react';
import { Helmet } from 'react-helmet-async';

export function OrganizationSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    "name": "Zugruppe",
    "legalName": "Privileged Approach Unipessoal Lda",
    "url": "https://app.base44.com",
    "logo": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6915a593b6edd8435f5838bd/359538617_Zugruppe01.jpg",
    "description": "Marketplace imobiliário premium em Portugal",
    "address": {
      "@type": "PostalAddress",
      "addressCountry": "PT"
    },
    "contactPoint": {
      "@type": "ContactPoint",
      "email": "info@zugruppe.com",
      "contactType": "customer service"
    }
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
    </Helmet>
  );
}

export function PropertySchema({ property }) {
  if (!property) return null;

  const schema = {
    "@context": "https://schema.org",
    "@type": property.listing_type === 'sale' ? "SingleFamilyResidence" : "Apartment",
    "name": property.title,
    "description": property.description,
    "address": {
      "@type": "PostalAddress",
      "streetAddress": property.address,
      "addressLocality": property.city,
      "addressRegion": property.state,
      "addressCountry": property.country || "PT",
      "postalCode": property.zip_code
    },
    "geo": property.latitude && property.longitude ? {
      "@type": "GeoCoordinates",
      "latitude": property.latitude,
      "longitude": property.longitude
    } : undefined,
    "numberOfRooms": property.bedrooms,
    "numberOfBathroomsTotal": property.bathrooms,
    "floorSize": {
      "@type": "QuantitativeValue",
      "value": property.useful_area || property.square_feet,
      "unitCode": "MTK"
    },
    "image": property.images || [],
    "offers": {
      "@type": "Offer",
      "price": property.price,
      "priceCurrency": "EUR",
      "availability": property.status === 'active' ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      "priceValidUntil": new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    },
    "yearBuilt": property.year_built
  };

  // Remove undefined fields
  Object.keys(schema).forEach(key => schema[key] === undefined && delete schema[key]);

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
    </Helmet>
  );
}

export function BreadcrumbSchema({ items }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": item.url
    }))
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
    </Helmet>
  );
}