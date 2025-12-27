import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { imageUrl } = await req.json();

    if (!imageUrl) {
      return Response.json({ error: 'imageUrl is required' }, { status: 400 });
    }

    // Validate URL
    try {
      new URL(imageUrl);
    } catch {
      return Response.json({ error: 'Invalid URL' }, { status: 400 });
    }

    // Fetch image from URL
    const imageResponse = await fetch(imageUrl);
    
    if (!imageResponse.ok) {
      return Response.json({ 
        error: `Failed to fetch image: ${imageResponse.statusText}` 
      }, { status: 400 });
    }

    // Check content type
    const contentType = imageResponse.headers.get('content-type');
    if (!contentType || !contentType.startsWith('image/')) {
      return Response.json({ 
        error: 'URL does not point to an image' 
      }, { status: 400 });
    }

    // Convert to blob and upload
    const blob = await imageResponse.blob();
    const file = new File([blob], 'imported-image.jpg', { type: contentType });

    const { file_url } = await base44.integrations.Core.UploadFile({ file });

    return Response.json({ 
      success: true, 
      file_url 
    });

  } catch (error) {
    console.error('Error importing image:', error);
    return Response.json({ 
      error: error.message || 'Failed to import image' 
    }, { status: 500 });
  }
});