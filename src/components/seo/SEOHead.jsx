import React from 'react';
import { Helmet } from 'react-helmet-async';

export default function SEOHead({ 
  title = 'Zugruppe - Marketplace Imobiliário Premium',
  description = 'Plataforma imobiliária líder em Portugal. Descubra imóveis exclusivos, tecnologia avançada e serviço personalizado.',
  keywords = 'imóveis, portugal, casas, apartamentos, vendas, arrendamento',
  image = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6915a593b6edd8435f5838bd/359538617_Zugruppe01.jpg',
  url = 'https://app.base44.com',
  type = 'website',
  noindex = false
}) {
  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      {noindex && <meta name="robots" content="noindex,nofollow" />}

      {/* Open Graph */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:url" content={url} />
      <meta property="og:site_name" content="Zugruppe" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {/* Additional SEO */}
      <link rel="canonical" href={url} />
      <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
      <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
    </Helmet>
  );
}