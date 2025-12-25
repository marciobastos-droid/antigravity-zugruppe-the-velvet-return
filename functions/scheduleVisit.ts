import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

const CUSTOM_DOMAIN = 'https://zuhaus.pt';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      appointmentId,
      clientEmail, 
      clientPhone, 
      agentEmail,
      propertyOwnerEmail,
      sendCalendarInvite = true 
    } = await req.json();

    if (!appointmentId) {
      return Response.json({ error: 'Appointment ID required' }, { status: 400 });
    }

    // Fetch appointment details
    const appointments = await base44.asServiceRole.entities.Appointment.filter({ id: appointmentId });
    if (!appointments || appointments.length === 0) {
      return Response.json({ error: 'Appointment not found' }, { status: 404 });
    }

    const appointment = appointments[0];
    const appointmentDate = new Date(appointment.appointment_date);
    const endDate = new Date(appointmentDate.getTime() + (appointment.duration_minutes || 60) * 60000);

    // Format dates for calendar
    const formatDateForCalendar = (date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const results = {
      emailsSent: [],
      smsSent: [],
      calendarInvite: null
    };

    // Email body
    const emailBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1e293b; margin-bottom: 20px;">Visita Agendada</h2>
        
        <div style="background: #f8fafc; border-left: 4px solid #0f172a; padding: 16px; margin: 20px 0;">
          <h3 style="margin: 0 0 12px 0; color: #334155;">${appointment.title}</h3>
          
          <div style="margin: 8px 0;">
            <strong>📅 Data:</strong> ${appointmentDate.toLocaleDateString('pt-PT', { 
              weekday: 'long', 
              day: 'numeric', 
              month: 'long', 
              year: 'numeric' 
            })}
          </div>
          
          <div style="margin: 8px 0;">
            <strong>🕐 Hora:</strong> ${appointmentDate.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
          </div>
          
          <div style="margin: 8px 0;">
            <strong>⏱️ Duração:</strong> ${appointment.duration_minutes || 60} minutos
          </div>
          
          ${appointment.property_title ? `
            <div style="margin: 8px 0;">
              <strong>🏠 Imóvel:</strong> ${appointment.property_title}
            </div>
          ` : ''}
          
          ${appointment.property_address ? `
            <div style="margin: 8px 0;">
              <strong>📍 Morada:</strong> ${appointment.property_address}
            </div>
          ` : ''}
          
          ${appointment.client_name ? `
            <div style="margin: 8px 0;">
              <strong>👤 Cliente:</strong> ${appointment.client_name}
            </div>
          ` : ''}
          
          ${appointment.notes ? `
            <div style="margin: 16px 0 8px 0;">
              <strong>📝 Notas:</strong>
              <p style="margin: 4px 0 0 0; color: #475569;">${appointment.notes}</p>
            </div>
          ` : ''}
        </div>
        
        <p style="color: #64748b; font-size: 14px; margin-top: 20px;">
          Para qualquer alteração, por favor contacte-nos.
        </p>
        
        <p style="color: #64748b; margin-top: 20px;">
          Cumprimentos,<br/>
          <strong>Equipa Zugruppe</strong>
        </p>
      </div>
    `;

    // Send email to client using Resend
    if (clientEmail) {
      try {
        const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
        if (RESEND_API_KEY) {
          const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${RESEND_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'noreply@zugruppe.pt',
              to: clientEmail,
              subject: `✅ Visita Confirmada: ${appointment.property_title || appointment.title}`,
              html: emailBody,
              text: `Visita Agendada\n\n${appointment.title}\nData: ${appointmentDate.toLocaleDateString('pt-PT')}\nHora: ${appointmentDate.toLocaleTimeString('pt-PT')}`
            }),
          });
          
          if (response.ok) {
            results.emailsSent.push(clientEmail);
          }
        }
      } catch (error) {
        console.error('Error sending email to client:', error);
      }
    }

    // Send email to agent using Resend
    if (agentEmail && agentEmail !== clientEmail) {
      try {
        const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
        if (RESEND_API_KEY) {
          const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${RESEND_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'noreply@zugruppe.pt',
              to: agentEmail,
              subject: `📅 Nova Visita Agendada: ${appointment.property_title || appointment.title}`,
              html: emailBody,
              text: `Nova Visita Agendada\n\n${appointment.title}\nData: ${appointmentDate.toLocaleDateString('pt-PT')}\nHora: ${appointmentDate.toLocaleTimeString('pt-PT')}`
            }),
          });
          
          if (response.ok) {
            results.emailsSent.push(agentEmail);
          }
        }
      } catch (error) {
        console.error('Error sending email to agent:', error);
      }
    }

    // Send email to property owner
    if (propertyOwnerEmail && propertyOwnerEmail !== agentEmail && propertyOwnerEmail !== clientEmail) {
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: propertyOwnerEmail,
          subject: `Visita Agendada ao Seu Imóvel: ${appointment.property_title}`,
          body: emailBody
        });
        results.emailsSent.push(propertyOwnerEmail);
      } catch (error) {
        console.error('Error sending email to owner:', error);
      }
    }

    // Create Google Calendar event if requested
    if (sendCalendarInvite && agentEmail) {
      try {
        const accessToken = await base44.asServiceRole.connectors.getAccessToken("googlecalendar");
        
        const calendarEvent = {
          summary: appointment.title,
          description: `Visita ao imóvel: ${appointment.property_title || ''}\n\nCliente: ${appointment.client_name || ''}\n\n${appointment.notes || ''}`,
          location: appointment.property_address || '',
          start: {
            dateTime: appointmentDate.toISOString(),
            timeZone: 'Europe/Lisbon'
          },
          end: {
            dateTime: endDate.toISOString(),
            timeZone: 'Europe/Lisbon'
          },
          attendees: [
            ...(clientEmail ? [{ email: clientEmail }] : []),
            ...(agentEmail ? [{ email: agentEmail }] : [])
          ],
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
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(calendarEvent)
        });

        if (response.ok) {
          const event = await response.json();
          results.calendarInvite = {
            id: event.id,
            link: event.htmlLink
          };
          
          // Update appointment with calendar event ID
          await base44.asServiceRole.entities.Appointment.update(appointmentId, {
            calendar_event_id: event.id,
            calendar_event_link: event.htmlLink
          });
        }
      } catch (error) {
        console.error('Error creating calendar event:', error);
        results.calendarError = error.message;
      }
    }

    // Update appointment status
    await base44.asServiceRole.entities.Appointment.update(appointmentId, {
      status: 'confirmed',
      reminder_sent: true
    });

    return Response.json({ 
      success: true,
      results 
    });

  } catch (error) {
    console.error('Error in scheduleVisit:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});