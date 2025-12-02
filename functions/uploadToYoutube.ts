import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const videoFile = formData.get('video');
    const title = formData.get('title') || 'Vídeo Imobiliário';
    const description = formData.get('description') || 'Vídeo criado com ZuGruppe';
    const privacyStatus = formData.get('privacyStatus') || 'private';

    if (!videoFile) {
      return Response.json({ error: 'No video file provided' }, { status: 400 });
    }

    // Get YouTube access token via Google Drive connector
    const accessToken = await base44.asServiceRole.connectors.getAccessToken("googledrive");

    // Step 1: Initialize resumable upload
    const initResponse = await fetch(
      'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Upload-Content-Type': videoFile.type || 'video/webm',
          'X-Upload-Content-Length': videoFile.size.toString()
        },
        body: JSON.stringify({
          snippet: {
            title: title,
            description: description,
            categoryId: '22' // People & Blogs
          },
          status: {
            privacyStatus: privacyStatus,
            selfDeclaredMadeForKids: false
          }
        })
      }
    );

    if (!initResponse.ok) {
      const errorText = await initResponse.text();
      console.error('YouTube init error:', errorText);
      return Response.json({ 
        error: 'Failed to initialize YouTube upload', 
        details: errorText 
      }, { status: 500 });
    }

    const uploadUrl = initResponse.headers.get('Location');
    
    if (!uploadUrl) {
      return Response.json({ error: 'No upload URL returned' }, { status: 500 });
    }

    // Step 2: Upload the video content
    const videoBuffer = await videoFile.arrayBuffer();
    
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': videoFile.type || 'video/webm',
        'Content-Length': videoFile.size.toString()
      },
      body: videoBuffer
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('YouTube upload error:', errorText);
      return Response.json({ 
        error: 'Failed to upload video to YouTube', 
        details: errorText 
      }, { status: 500 });
    }

    const videoData = await uploadResponse.json();

    return Response.json({
      success: true,
      videoId: videoData.id,
      videoUrl: `https://www.youtube.com/watch?v=${videoData.id}`,
      title: videoData.snippet?.title,
      status: videoData.status?.uploadStatus
    });

  } catch (error) {
    console.error('Upload error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});