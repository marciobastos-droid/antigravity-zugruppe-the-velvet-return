import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { maxResults = 50, query = '', pageToken = null } = await req.json();

    // Get Gmail access token
    const accessToken = await base44.asServiceRole.connectors.getAccessToken("gmail");

    // Fetch messages list
    const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}${query ? `&q=${encodeURIComponent(query)}` : ''}${pageToken ? `&pageToken=${pageToken}` : ''}`;
    
    const listResponse = await fetch(listUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!listResponse.ok) {
      const error = await listResponse.text();
      throw new Error(`Gmail API error: ${error}`);
    }

    const listData = await listResponse.json();
    
    if (!listData.messages || listData.messages.length === 0) {
      return Response.json({ messages: [], nextPageToken: null });
    }

    // Fetch full details for each message
    const messages = await Promise.all(
      listData.messages.map(async (msg) => {
        const msgUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`;
        const msgResponse = await fetch(msgUrl, {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });

        if (!msgResponse.ok) return null;
        
        const msgData = await msgResponse.json();
        
        // Parse headers
        const getHeader = (name) => {
          const header = msgData.payload.headers.find(h => h.name.toLowerCase() === name.toLowerCase());
          return header ? header.value : '';
        };

        const from = getHeader('From');
        const fromMatch = from.match(/(.+?)\s*<(.+?)>/) || [null, from, from];
        const fromName = fromMatch[1]?.replace(/"/g, '').trim() || '';
        const fromEmail = fromMatch[2] || from;

        // Extract body
        let body = '';
        const getBody = (payload) => {
          if (payload.body?.data) {
            return atob(payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
          }
          if (payload.parts) {
            for (const part of payload.parts) {
              if (part.mimeType === 'text/plain' || part.mimeType === 'text/html') {
                if (part.body?.data) {
                  return atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
                }
              }
              if (part.parts) {
                const nested = getBody(part);
                if (nested) return nested;
              }
            }
          }
          return '';
        };
        body = getBody(msgData.payload);

        // Get attachments info
        const attachments = [];
        const getAttachments = (payload) => {
          if (payload.parts) {
            payload.parts.forEach(part => {
              if (part.filename && part.body?.attachmentId) {
                attachments.push({
                  filename: part.filename,
                  mimeType: part.mimeType,
                  size: part.body.size
                });
              }
              if (part.parts) {
                getAttachments(part);
              }
            });
          }
        };
        getAttachments(msgData.payload);

        return {
          gmail_id: msgData.id,
          thread_id: msgData.threadId,
          subject: getHeader('Subject'),
          from_email: fromEmail,
          from_name: fromName,
          to_email: getHeader('To'),
          snippet: msgData.snippet,
          body: body,
          received_date: new Date(parseInt(msgData.internalDate)).toISOString(),
          labels: msgData.labelIds || [],
          has_attachments: attachments.length > 0,
          attachments: attachments
        };
      })
    );

    return Response.json({ 
      messages: messages.filter(Boolean),
      nextPageToken: listData.nextPageToken || null
    });

  } catch (error) {
    console.error('Error fetching Gmail messages:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});