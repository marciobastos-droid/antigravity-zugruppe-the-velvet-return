import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, eventData, eventId, timeMin, timeMax } = await req.json();

    // Get OAuth access token for Google Calendar
    const accessToken = await base44.asServiceRole.connectors.getAccessToken("googlecalendar");

    if (!accessToken) {
      return Response.json({ error: 'Google Calendar not connected' }, { status: 400 });
    }

    const calendarId = 'primary';
    const baseUrl = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`;

    switch (action) {
      case 'list': {
        // List events within a time range
        const params = new URLSearchParams({
          timeMin: timeMin || new Date().toISOString(),
          timeMax: timeMax || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          singleEvents: 'true',
          orderBy: 'startTime',
          maxResults: '50'
        });

        const response = await fetch(`${baseUrl}?${params}`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          const error = await response.text();
          return Response.json({ error: 'Failed to fetch events', details: error }, { status: response.status });
        }

        const data = await response.json();
        return Response.json({ success: true, events: data.items || [] });
      }

      case 'create': {
        // Create a new calendar event
        const event = {
          summary: eventData.title,
          description: eventData.description || '',
          start: {
            dateTime: eventData.startDateTime,
            timeZone: 'Europe/Lisbon'
          },
          end: {
            dateTime: eventData.endDateTime,
            timeZone: 'Europe/Lisbon'
          },
          attendees: eventData.attendees?.map(email => ({ email })) || [],
          reminders: {
            useDefault: false,
            overrides: [
              { method: 'email', minutes: 24 * 60 },
              { method: 'popup', minutes: 30 }
            ]
          }
        };

        if (eventData.location) {
          event.location = eventData.location;
        }

        const response = await fetch(baseUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(event)
        });

        if (!response.ok) {
          const error = await response.text();
          return Response.json({ error: 'Failed to create event', details: error }, { status: response.status });
        }

        const createdEvent = await response.json();
        return Response.json({ success: true, event: createdEvent });
      }

      case 'update': {
        // Update an existing event
        const event = {
          summary: eventData.title,
          description: eventData.description || '',
          start: {
            dateTime: eventData.startDateTime,
            timeZone: 'Europe/Lisbon'
          },
          end: {
            dateTime: eventData.endDateTime,
            timeZone: 'Europe/Lisbon'
          }
        };

        if (eventData.location) {
          event.location = eventData.location;
        }

        const response = await fetch(`${baseUrl}/${eventId}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(event)
        });

        if (!response.ok) {
          const error = await response.text();
          return Response.json({ error: 'Failed to update event', details: error }, { status: response.status });
        }

        const updatedEvent = await response.json();
        return Response.json({ success: true, event: updatedEvent });
      }

      case 'delete': {
        const response = await fetch(`${baseUrl}/${eventId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });

        if (!response.ok && response.status !== 204) {
          const error = await response.text();
          return Response.json({ error: 'Failed to delete event', details: error }, { status: response.status });
        }

        return Response.json({ success: true });
      }

      default:
        return Response.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});