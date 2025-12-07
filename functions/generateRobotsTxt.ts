Deno.serve(async (req) => {
  const baseUrl = 'https://app.base44.com'; // Replace with actual domain

  const robotsTxt = `User-agent: *
Allow: /
Allow: /ZuGruppe
Allow: /PropertyDetails
Disallow: /Dashboard
Disallow: /MyListings
Disallow: /CRMAdvanced
Disallow: /Tools
Disallow: /TeamManagement
Disallow: /AddListing

Sitemap: ${baseUrl}/api/generateSitemap

# Crawl-delay
Crawl-delay: 1
`;

  return new Response(robotsTxt, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, max-age=86400'
    }
  });
});