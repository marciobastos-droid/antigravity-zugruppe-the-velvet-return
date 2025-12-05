import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ success: false, error: 'Nao autenticado' });
    }

    const { url } = await req.json();

    if (!url) {
      return Response.json({ success: false, error: 'URL e obrigatorio' });
    }

    // Use TinyURL API (free, no API key required)
    const response = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`);
    
    if (!response.ok) {
      // Fallback: return original URL if shortening fails
      return Response.json({ success: true, shortUrl: url, original: true });
    }

    const shortUrl = await response.text();

    return Response.json({ 
      success: true, 
      shortUrl: shortUrl.trim(),
      originalUrl: url
    });

  } catch (error) {
    console.error('Error shortening URL:', error);
    // Return original URL as fallback
    return Response.json({ 
      success: false, 
      error: error.message 
    });
  }
});