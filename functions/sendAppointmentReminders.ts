import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Buscar visitas que precisam de lembrete (24h antes)
    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in25Hours = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    const appointments = await base44.asServiceRole.entities.Appointment.list();
    
    const appointmentsToRemind = appointments.filter(apt => {
      if (!apt.appointment_date) return false;
      if (apt.status === 'completed' || apt.status === 'cancelled' || apt.status === 'no_show') return false;
      
      const aptDate = new Date(apt.appointment_date);
      // Enviar lembrete entre 24h e 25h antes
      return aptDate >= in24Hours && aptDate <= in25Hours;
    });

    console.log(`[Reminders] Found ${appointmentsToRemind.length} appointments to remind`);

    const results = {
      total: appointmentsToRemind.length,
      agent_reminders: 0,
      client_reminders: 0,
      errors: []
    };

    for (const apt of appointmentsToRemind) {
      try {
        // Lembrete ao agente
        if (apt.assigned_agent && !apt.agent_reminder_sent) {
          try {
            await base44.asServiceRole.integrations.Core.SendEmail({
              to: apt.assigned_agent,
              subject: `🔔 Lembrete: Visita amanhã - ${apt.property_title || apt.title}`,
              body: `
                <h2>Lembrete de Visita</h2>
                <p>Tem uma visita agendada para amanhã:</p>
                <ul>
                  <li><strong>Cliente:</strong> ${apt.client_name}</li>
                  <li><strong>Imóvel:</strong> ${apt.property_title || 'N/A'}</li>
                  <li><strong>Data/Hora:</strong> ${new Date(apt.appointment_date).toLocaleString('pt-PT')}</li>
                  <li><strong>Duração:</strong> ${apt.duration_minutes || 60} minutos</li>
                  ${apt.property_address ? `<li><strong>Morada:</strong> ${apt.property_address}</li>` : ''}
                  ${apt.client_phone ? `<li><strong>Contacto Cliente:</strong> ${apt.client_phone}</li>` : ''}
                </ul>
                ${apt.notes ? `<p><strong>Notas:</strong> ${apt.notes}</p>` : ''}
              `
            });
            
            await base44.asServiceRole.entities.Appointment.update(apt.id, {
              agent_reminder_sent: true,
              reminder_sent_date: new Date().toISOString()
            });
            
            results.agent_reminders++;
          } catch (error) {
            console.error(`Error sending agent reminder for ${apt.id}:`, error);
            results.errors.push({ appointment_id: apt.id, type: 'agent', error: error.message });
          }
        }

        // Lembrete ao cliente
        if (apt.client_email && !apt.client_reminder_sent) {
          try {
            await base44.asServiceRole.integrations.Core.SendEmail({
              to: apt.client_email,
              subject: `🏠 Lembrete: Visita ao imóvel amanhã`,
              body: `
                <h2>Olá ${apt.client_name},</h2>
                <p>Este é um lembrete da sua visita agendada para amanhã:</p>
                <ul>
                  <li><strong>Imóvel:</strong> ${apt.property_title || apt.title}</li>
                  <li><strong>Data/Hora:</strong> ${new Date(apt.appointment_date).toLocaleString('pt-PT')}</li>
                  ${apt.property_address ? `<li><strong>Morada:</strong> ${apt.property_address}</li>` : ''}
                  <li><strong>Duração:</strong> ${apt.duration_minutes || 60} minutos</li>
                </ul>
                <p>Aguardamos por si!</p>
                <p>Se precisar de remarcar, por favor contacte-nos.</p>
              `
            });
            
            await base44.asServiceRole.entities.Appointment.update(apt.id, {
              client_reminder_sent: true,
              reminder_sent: true,
              reminder_sent_date: new Date().toISOString()
            });
            
            results.client_reminders++;
          } catch (error) {
            console.error(`Error sending client reminder for ${apt.id}:`, error);
            results.errors.push({ appointment_id: apt.id, type: 'client', error: error.message });
          }
        }
      } catch (error) {
        console.error(`Error processing appointment ${apt.id}:`, error);
        results.errors.push({ appointment_id: apt.id, type: 'general', error: error.message });
      }
    }

    return Response.json({
      success: true,
      ...results,
      message: `Enviados ${results.agent_reminders} lembretes a agentes e ${results.client_reminders} a clientes`
    });
  } catch (error) {
    console.error('[sendAppointmentReminders] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});