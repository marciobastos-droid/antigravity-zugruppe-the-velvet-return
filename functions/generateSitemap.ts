import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Buscar todos os imóveis ativos e publicados
    const properties = await base44.asServiceRole.entities.Property.filter({ status: 'active' });

    const baseUrl = "https://zugruppe.com"; // Alterar para URL de produção
    const today = new Date().toISOString().split('T')[0];

    // URLs estáticas
    const staticUrls = [
      { loc: baseUrl, priority: 1.0, changefreq: 'daily' },
      { loc: `${baseUrl}/zugruppe`, priority: 0.9, changefreq: 'daily' },
      { loc: `${baseUrl}/zuhaus`, priority: 0.9, changefreq: 'daily' },
      { loc: `${baseUrl}/zuhandel`, priority: 0.9, changefreq: 'daily' },
      { loc: `${baseUrl}/dashboard`, priority: 0.5, changefreq: 'weekly' },
      { loc: `${baseUrl}/privacy-policy`, priority: 0.3, changefreq: 'monthly' },
      { loc: `${baseUrl}/terms-conditions`, priority: 0.3, changefreq: 'monthly' }
    ];

    // URLs dinâmicas dos imóveis (com slugs amigáveis)
    const propertyUrls = properties
      .filter(p => {
        const pages = Array.isArray(p.published_pages) ? p.published_pages : [];
        return p.status === 'active' && p.visibility === 'public' && pages.length > 0;
      })
      .map(p => {
        // Usar slug se disponível, senão fallback para ID
        const url = p.slug 
          ? `${baseUrl}/property-details?slug=${p.slug}` 
          : `${baseUrl}/property-details?id=${p.id}`;
        
        return {
          loc: url,
          lastmod: p.updated_date ? new Date(p.updated_date).toISOString().split('T')[0] : today,
          priority: p.featured ? 0.9 : 0.8,
          changefreq: 'weekly',
          image: p.images && p.images.length > 0 ? p.images[0] : null,
          title: p.title,
          price: p.price,
          city: p.city
        };
      });

    // Gerar XML do sitemap
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${staticUrls.map(url => `  <url>
    <loc>${url.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`).join('\n')}
${propertyUrls.map(url => `  <url>
    <loc>${url.loc}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>${url.image ? `
    <image:image>
      <image:loc>${url.image}</image:loc>
      <image:title>${url.title || 'Property'}</image:title>
    </image:image>` : ''}
  </url>`).join('\n')}
</urlset>`;

    return new Response(sitemap, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=7200, stale-while-revalidate=86400',
        'CDN-Cache-Control': 'max-age=7200',
        'Surrogate-Control': 'max-age=7200',
        'ETag': `"sitemap-${Date.now()}"`,
        'Vary': 'Accept-Encoding'
      }
    });
  } catch (error) {
    console.error('[Sitemap] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});