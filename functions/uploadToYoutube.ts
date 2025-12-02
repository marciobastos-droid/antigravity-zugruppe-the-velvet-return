import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // JSON body with base64 video
    const body = await req.json();
    const title = body.title || 'Vídeo Imobiliário';
    const description = body.description || 'Vídeo criado com ZuGruppe';
    const privacyStatus = body.privacyStatus || 'private';
    
    if (!body.videoBase64) {
      return Response.json({ error: 'No video data provided' }, { status: 400 });
    }

    // Convert base64 to Uint8Array
    const base64Data = body.videoBase64.includes(',') 
      ? body.videoBase64.split(',')[1] 
      : body.videoBase64;
    
    const binaryString = atob(base64Data);
    const videoBytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      videoBytes[i] = binaryString.charCodeAt(i);
    }
    
    const videoSize = videoBytes.length;

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
          'X-Upload-Content-Type': 'video/webm',
          'X-Upload-Content-Length': videoSize.toString()
        },
        body: JSON.stringify({
          snippet: {
            title: title.substring(0, 100), // YouTube title limit
            description: description.substring(0, 5000), // YouTube description limit
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
      }, { status: initResponse.status });
    }

    const uploadUrl = initResponse.headers.get('Location');
    
    if (!uploadUrl) {
      return Response.json({ error: 'No upload URL returned' }, { status: 500 });
    }

    // Step 2: Upload the video content
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'video/webm',
        'Content-Length': videoSize.toString()
      },
      body: videoBytes
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('YouTube upload error:', errorText);
      return Response.json({ 
        error: 'Failed to upload video to YouTube', 
        details: errorText 
      }, { status: uploadResponse.status });
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