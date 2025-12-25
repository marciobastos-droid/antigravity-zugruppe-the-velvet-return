import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { appointmentIds } = await req.json();

    // Get access token from app connector
    const accessToken = await base44.asServiceRole.connectors.getAccessToken("googlecalendar");
    
    if (!accessToken) {
      return Response.json({ 
        error: 'Google Calendar not connected. Please authorize access first.' 
      }, { status: 400 });
    }

    // Fetch appointments to sync
    let appointments = [];
    if (appointmentIds && appointmentIds.length > 0) {
      appointments = await base44.entities.Appointment.filter({ 
        id: { $in: appointmentIds } 
      });
    } else {
      // Sync all user's appointments that don't have a google_event_id yet
      appointments = await base44.asServiceRole.entities.Appointment.filter({
        assigned_agent: user.email
      });
      // Filter only those without google_event_id
      appointments = appointments.filter(a => !a.google_event_id && a.status !== 'cancelled');
    }

    const synced = [];
    const errors = [];

    for (const appointment of appointments) {
      try {
        // Skip if already synced
        if (appointment.google_event_id) {
          continue;
        }

        const startDateTime = new Date(appointment.appointment_date);
        const endDateTime = new Date(startDateTime.getTime() + (appointment.duration_minutes || 60) * 60000);

        const event = {
          summary: appointment.title || 'Visita ao Imóvel',
          description: `Cliente: ${appointment.client_name}\nEmail: ${appointment.client_email || ''}\nTelefone: ${appointment.client_phone || ''}\n\n${appointment.notes || ''}`,
          start: {
            dateTime: startDateTime.toISOString(),
            timeZone: 'Europe/Lisbon',
          },
          end: {
            dateTime: endDateTime.toISOString(),
            timeZone: 'Europe/Lisbon',
          },
          location: appointment.property_address || '',
          attendees: [
            { email: appointment.client_email, displayName: appointment.client_name }
          ].filter(a => a.email),
          reminders: {
            useDefault: false,
            overrides: [
              { method: 'email', minutes: 24 * 60 },
              { method: 'popup', minutes: 30 }
            ]
          }
        };

        const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(event),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || 'Failed to create event');
        }

        const createdEvent = await response.json();

        // Update appointment with Google Calendar event ID
        await base44.asServiceRole.entities.Appointment.update(appointment.id, {
          google_event_id: createdEvent.id,
          google_calendar_synced: true,
          google_calendar_link: createdEvent.htmlLink
        });

        synced.push({
          appointment_id: appointment.id,
          event_id: createdEvent.id,
          title: appointment.title
        });

      } catch (error) {
        console.error(`Error syncing appointment ${appointment.id}:`, error);
        errors.push({
          appointment_id: appointment.id,
          error: error.message
        });
      }
    }

    return Response.json({
      success: true,
      synced: synced.length,
      failed: errors.length,
      details: { synced, errors }
    });

  } catch (error) {
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});