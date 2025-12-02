import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check content type to determine how to parse the request
    const contentType = req.headers.get('content-type') || '';
    
    let videoFile, title, description, privacyStatus;
    
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      videoFile = formData.get('video');
      title = formData.get('title') || 'Vídeo Imobiliário';
      description = formData.get('description') || 'Vídeo criado com ZuGruppe';
      privacyStatus = formData.get('privacyStatus') || 'private';
    } else {
      // JSON body with base64 video
      const body = await req.json();
      title = body.title || 'Vídeo Imobiliário';
      description = body.description || 'Vídeo criado com ZuGruppe';
      privacyStatus = body.privacyStatus || 'private';
      
      if (body.videoBase64) {
        // Convert base64 to blob
        const base64Data = body.videoBase64.split(',')[1] || body.videoBase64;
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        videoFile = new Blob([bytes], { type: 'video/webm' });
        videoFile.size = bytes.length;
      }
    }

    if (!videoFile) {
      return Response.json({ error: 'No video file provided' }, { status: 400 });
    }

    // Get YouTube access token via Google Drive connector
    const accessToken = await base44.asServiceRole.connectors.getAccessToken("googledrive");

    // Get video as ArrayBuffer
    const videoBuffer = await videoFile.arrayBuffer();
    const videoSize = videoBuffer.byteLength;

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
      body: videoBuffer
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