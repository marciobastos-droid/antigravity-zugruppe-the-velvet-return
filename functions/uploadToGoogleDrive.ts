import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { file_url, filename, mimeType, folderId } = await req.json();

    if (!file_url || !filename) {
      return Response.json({ error: 'file_url and filename are required' }, { status: 400 });
    }

    // Get OAuth access token for Google Drive
    const accessToken = await base44.asServiceRole.connectors.getAccessToken("googledrive");

    if (!accessToken) {
      return Response.json({ 
        error: 'Google Drive not connected. Please authorize access first.',
        needsAuth: true
      }, { status: 400 });
    }

    // Download the file
    const fileResponse = await fetch(file_url);
    if (!fileResponse.ok) {
      return Response.json({ error: 'Failed to download file' }, { status: 400 });
    }

    const fileBlob = await fileResponse.blob();

    // Prepare metadata
    const metadata = {
      name: filename,
      mimeType: mimeType || 'application/octet-stream'
    };

    if (folderId) {
      metadata.parents = [folderId];
    }

    // Create multipart request body
    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const metadataPart = delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata);

    const filePart = delimiter +
      `Content-Type: ${mimeType || 'application/octet-stream'}\r\n\r\n`;

    // Convert blob to array buffer
    const fileArrayBuffer = await fileBlob.arrayBuffer();

    // Combine parts
    const encoder = new TextEncoder();
    const metadataBytes = encoder.encode(metadataPart);
    const filePartBytes = encoder.encode(filePart);
    const closeDelimiterBytes = encoder.encode(closeDelimiter);

    const totalLength = metadataBytes.length + filePartBytes.length + fileArrayBuffer.byteLength + closeDelimiterBytes.length;
    const body = new Uint8Array(totalLength);
    
    let offset = 0;
    body.set(metadataBytes, offset);
    offset += metadataBytes.length;
    body.set(filePartBytes, offset);
    offset += filePartBytes.length;
    body.set(new Uint8Array(fileArrayBuffer), offset);
    offset += fileArrayBuffer.byteLength;
    body.set(closeDelimiterBytes, offset);

    // Upload to Google Drive
    const uploadResponse = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
        'Content-Length': totalLength.toString()
      },
      body: body
    });

    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.text();
      console.error('Drive upload error:', errorData);
      return Response.json({ 
        error: 'Failed to upload to Google Drive', 
        details: errorData 
      }, { status: uploadResponse.status });
    }

    const uploadedFile = await uploadResponse.json();

    // Set file permissions to anyone with link can view (optional)
    try {
      await fetch(`https://www.googleapis.com/drive/v3/files/${uploadedFile.id}/permissions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          role: 'reader',
          type: 'anyone'
        })
      });
    } catch (error) {
      console.warn('Could not set file permissions:', error);
    }

    return Response.json({
      success: true,
      file: {
        id: uploadedFile.id,
        name: uploadedFile.name,
        mimeType: uploadedFile.mimeType,
        webViewLink: `https://drive.google.com/file/d/${uploadedFile.id}/view`,
        webContentLink: uploadedFile.webContentLink
      }
    });

  } catch (error) {
    console.error('Error in uploadToGoogleDrive:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});