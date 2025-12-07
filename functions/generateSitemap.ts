import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Fetch all active properties
    const properties = await base44.asServiceRole.entities.Property.filter({
      status: 'active'
    });

    const baseUrl = 'https://app.base44.com'; // Replace with actual domain
    const today = new Date().toISOString().split('T')[0];

    // Build sitemap XML
    let sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n';
    sitemap += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    // Home page
    sitemap += `  <url>\n    <loc>${baseUrl}/</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>\n`;

    // Main pages
    const mainPages = [
      { path: '/ZuGruppe', priority: '0.9', changefreq: 'daily' },
      { path: '/Dashboard', priority: '0.8', changefreq: 'daily' },
      { path: '/MyListings', priority: '0.8', changefreq: 'daily' },
      { path: '/PrivacyPolicy', priority: '0.5', changefreq: 'monthly' },
      { path: '/TermsConditions', priority: '0.5', changefreq: 'monthly' },
      { path: '/CookiePolicy', priority: '0.5', changefreq: 'monthly' },
      { path: '/ManageData', priority: '0.5', changefreq: 'monthly' },
      { path: '/DenunciationChannel', priority: '0.5', changefreq: 'monthly' }
    ];

    mainPages.forEach(page => {
      sitemap += `  <url>\n    <loc>${baseUrl}${page.path}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${page.changefreq}</changefreq>\n    <priority>${page.priority}</priority>\n  </url>\n`;
    });

    // Property detail pages
    properties.forEach(property => {
      const lastmod = property.updated_date ? new Date(property.updated_date).toISOString().split('T')[0] : today;
      sitemap += `  <url>\n    <loc>${baseUrl}/PropertyDetails?id=${property.id}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>\n`;
    });

    sitemap += '</urlset>';

    return new Response(sitemap, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600'
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});