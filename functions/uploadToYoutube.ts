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
    
    // Get YouTube access token via Google Drive connector
    const accessToken = await base44.asServiceRole.connectors.getAccessToken("googledrive");

    // Use simple upload for smaller videos (under 50MB)
    const uploadResponse = await fetch(
      'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=multipart&part=snippet,status',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'multipart/related; boundary=foo_bar_baz'
        },
        body: [
          '--foo_bar_baz',
          'Content-Type: application/json; charset=UTF-8',
          '',
          JSON.stringify({
            snippet: {
              title: title.substring(0, 100),
              description: description.substring(0, 5000),
              categoryId: '22'
            },
            status: {
              privacyStatus: privacyStatus,
              selfDeclaredMadeForKids: false
            }
          }),
          '--foo_bar_baz',
          'Content-Type: video/webm',
          'Content-Transfer-Encoding: base64',
          '',
          base64Data,
          '--foo_bar_baz--'
        ].join('\r\n')
      }
    );

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('YouTube upload error:', uploadResponse.status, errorText);
      
      // Parse error for better message
      let errorMessage = 'Failed to upload video to YouTube';
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error?.message) {
          errorMessage = errorJson.error.message;
        }
        if (errorJson.error?.errors?.[0]?.reason === 'youtubeSignupRequired') {
          errorMessage = 'A conta Google precisa de ter um canal YouTube criado. Acede a youtube.com e cria um canal primeiro.';
        }
        if (errorJson.error?.errors?.[0]?.reason === 'forbidden') {
          errorMessage = 'Acesso negado. Verifica se a API YouTube Data API v3 está ativada no Google Cloud Console.';
        }
      } catch (e) {}
      
      return Response.json({ 
        error: errorMessage, 
        details: errorText,
        status: uploadResponse.status
      }, { status: 200 }); // Return 200 so frontend gets the error message
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