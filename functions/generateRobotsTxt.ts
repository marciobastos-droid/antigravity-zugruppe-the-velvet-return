Deno.serve(async (req) => {
  const baseUrl = "https://zugruppe.com"; // Alterar para URL de produção
  
  const robotsTxt = `User-agent: *
Allow: /
Disallow: /dashboard
Disallow: /admin
Disallow: /my-listings
Disallow: /crm

# Sitemaps
Sitemap: ${baseUrl}/api/sitemap.xml

# Crawl-delay
Crawl-delay: 1

# Specific bot rules
User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

User-agent: facebookexternalhit
Allow: /
`;

  return new Response(robotsTxt, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=604800, immutable',
      'CDN-Cache-Control': 'max-age=604800',
      'Vary': 'Accept-Encoding',
      'X-Content-Type-Options': 'nosniff'
    }
  });
});