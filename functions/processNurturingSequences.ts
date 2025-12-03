import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const now = new Date();
    const results = {
      processed: 0,
      emails_sent: 0,
      tasks_created: 0,
      enrollments_created: 0,
      exits: 0,
      errors: []
    };

    // Get all active sequences
    const sequences = await base44.asServiceRole.entities.LeadNurturingSequence.filter({ is_active: true });
    
    // Get all active enrollments
    const enrollments = await base44.asServiceRole.entities.LeadEnrollment.filter({ status: 'active' });
    
    // Get all opportunities for auto-enrollment checks
    const opportunities = await base44.asServiceRole.entities.Opportunity.list('-created_date', 500);
    
    // Get appointments for exit condition checks
    const appointments = await base44.asServiceRole.entities.Appointment.list('-created_date', 100);
    
    // Get contacts for conversion checks
    const contacts = await base44.asServiceRole.entities.ClientContact.list('-created_date', 200);
    const convertedLeadIds = new Set();
    contacts.forEach(c => {
      if (c.linked_opportunity_ids) {
        c.linked_opportunity_ids.forEach(id => convertedLeadIds.add(id));
      }
    });

    // Get existing enrollments to avoid duplicates
    const allEnrollments = await base44.asServiceRole.entities.LeadEnrollment.list();
    const enrolledLeadSequences = new Set(
      allEnrollments.map(e => `${e.lead_id}_${e.sequence_id}`)
    );

    // 1. Process auto-enrollments for trigger-based sequences
    for (const sequence of sequences) {
      if (sequence.trigger_type === 'manual') continue;

      const eligibleLeads = opportunities.filter(lead => {
        // Check if already enrolled in this sequence
        if (enrolledLeadSequences.has(`${lead.id}_${sequence.id}`)) return false;
        
        // Check if already in another nurturing
        if (lead.nurturing_status === 'active') return false;

        const conditions = sequence.trigger_conditions || {};

        // Check trigger type
        if (sequence.trigger_type === 'new_lead') {
          // Only leads created in last 24 hours with status 'new'
          const createdAt = new Date(lead.created_date);
          const hoursAgo = (now - createdAt) / (1000 * 60 * 60);
          if (hoursAgo > 24 || lead.status !== 'new') return false;
        }

        if (sequence.trigger_type === 'no_contact') {
          const noContactDays = conditions.no_contact_days || 3;
          const lastContact = lead.last_contact_date ? new Date(lead.last_contact_date) : new Date(lead.created_date);
          const daysSinceContact = (now - lastContact) / (1000 * 60 * 60 * 24);
          if (daysSinceContact < noContactDays) return false;
        }

        if (sequence.trigger_type === 'inactivity') {
          const inactivityDays = conditions.inactivity_days || 7;
          const lastActivity = lead.last_engagement_date || lead.updated_date;
          const lastActivityDate = new Date(lastActivity);
          const daysSinceActivity = (now - lastActivityDate) / (1000 * 60 * 60 * 24);
          if (daysSinceActivity < inactivityDays) return false;
        }

        if (sequence.trigger_type === 'status_change' && conditions.target_status) {
          if (lead.status !== conditions.target_status) return false;
        }

        // Check additional conditions
        if (conditions.lead_source?.length > 0) {
          if (!conditions.lead_source.includes(lead.lead_source)) return false;
        }

        if (conditions.lead_type?.length > 0) {
          if (!conditions.lead_type.includes(lead.lead_type)) return false;
        }

        if (conditions.qualification_status?.length > 0) {
          if (!conditions.qualification_status.includes(lead.qualification_status)) return false;
        }

        if (conditions.status?.length > 0) {
          if (!conditions.status.includes(lead.status)) return false;
        }

        return true;
      });

      // Enroll eligible leads
      for (const lead of eligibleLeads) {
        try {
          const firstStep = sequence.steps?.[0];
          const delayMs = ((firstStep?.delay_days || 0) * 24 + (firstStep?.delay_hours || 0)) * 60 * 60 * 1000;
          
          await base44.asServiceRole.entities.LeadEnrollment.create({
            lead_id: lead.id,
            contact_id: lead.contact_id,
            sequence_id: sequence.id,
            sequence_name: sequence.name,
            current_step: 0,
            status: 'active',
            enrolled_at: now.toISOString(),
            enrolled_by: 'auto',
            next_action_date: new Date(now.getTime() + delayMs).toISOString(),
            completed_steps: [],
            metrics: { emails_sent: 0, emails_opened: 0, emails_clicked: 0, tasks_created: 0 }
          });

          await base44.asServiceRole.entities.Opportunity.update(lead.id, {
            nurturing_sequence_id: sequence.id,
            nurturing_status: 'active'
          });

          await base44.asServiceRole.entities.LeadNurturingSequence.update(sequence.id, {
            total_enrolled: (sequence.total_enrolled || 0) + 1
          });

          results.enrollments_created++;
          enrolledLeadSequences.add(`${lead.id}_${sequence.id}`);
        } catch (err) {
          results.errors.push(`Enroll error for lead ${lead.id}: ${err.message}`);
        }
      }
    }

    // 2. Process active enrollments - execute pending steps
    for (const enrollment of enrollments) {
      try {
        const sequence = sequences.find(s => s.id === enrollment.sequence_id);
        if (!sequence) continue;

        const lead = opportunities.find(o => o.id === enrollment.lead_id);
        if (!lead) continue;

        // Check exit conditions
        const exitConditions = sequence.exit_conditions || {};
        let shouldExit = false;
        let exitReason = null;

        // Check if lead replied (status changed to contacted or beyond)
        if (exitConditions.on_reply && ['contacted', 'visit_scheduled', 'proposal', 'negotiation', 'won'].includes(lead.status)) {
          if (lead.status !== 'new') {
            shouldExit = true;
            exitReason = 'replied';
          }
        }

        // Check status change exit
        if (exitConditions.on_status_change?.length > 0) {
          if (exitConditions.on_status_change.includes(lead.status)) {
            shouldExit = true;
            exitReason = 'status_changed';
          }
        }

        // Check conversion
        if (exitConditions.on_conversion && convertedLeadIds.has(lead.id)) {
          shouldExit = true;
          exitReason = 'converted';
        }

        // Check appointment scheduled
        if (exitConditions.on_appointment) {
          const hasAppointment = appointments.some(a => 
            a.lead_id === lead.id && 
            new Date(a.appointment_date) > now
          );
          if (hasAppointment) {
            shouldExit = true;
            exitReason = 'appointment';
          }
        }

        // Check max days
        if (exitConditions.max_days) {
          const enrolledAt = new Date(enrollment.enrolled_at);
          const daysEnrolled = (now - enrolledAt) / (1000 * 60 * 60 * 24);
          if (daysEnrolled > exitConditions.max_days) {
            shouldExit = true;
            exitReason = 'max_days';
          }
        }

        if (shouldExit) {
          await base44.asServiceRole.entities.LeadEnrollment.update(enrollment.id, {
            status: 'exited',
            exit_reason: exitReason,
            completed_at: now.toISOString()
          });

          await base44.asServiceRole.entities.Opportunity.update(lead.id, {
            nurturing_status: 'exited'
          });

          await base44.asServiceRole.entities.LeadNurturingSequence.update(sequence.id, {
            total_exited: (sequence.total_exited || 0) + 1
          });

          results.exits++;
          continue;
        }

        // Check if it's time to execute next step
        if (!enrollment.next_action_date) continue;
        
        const nextActionDate = new Date(enrollment.next_action_date);
        if (nextActionDate > now) continue;

        const currentStepIndex = enrollment.current_step || 0;
        const step = sequence.steps?.[currentStepIndex];
        
        if (!step) {
          // Sequence completed
          await base44.asServiceRole.entities.LeadEnrollment.update(enrollment.id, {
            status: 'completed',
            exit_reason: 'completed',
            completed_at: now.toISOString()
          });

          await base44.asServiceRole.entities.Opportunity.update(lead.id, {
            nurturing_status: 'completed'
          });

          await base44.asServiceRole.entities.LeadNurturingSequence.update(sequence.id, {
            total_completed: (sequence.total_completed || 0) + 1
          });

          continue;
        }

        if (!step.is_active) {
          // Skip inactive step
          const nextStep = sequence.steps?.[currentStepIndex + 1];
          const delayMs = nextStep ? ((nextStep.delay_days || 0) * 24 + (nextStep.delay_hours || 0)) * 60 * 60 * 1000 : 0;
          
          await base44.asServiceRole.entities.LeadEnrollment.update(enrollment.id, {
            current_step: currentStepIndex + 1,
            next_action_date: nextStep ? new Date(now.getTime() + delayMs).toISOString() : null,
            completed_steps: [...(enrollment.completed_steps || []), {
              step_number: step.step_number,
              completed_at: now.toISOString(),
              action_type: step.action_type,
              result: 'skipped',
              details: 'Step inactive'
            }]
          });
          continue;
        }

        // Check step conditions
        const stepCondition = step.condition || {};
        let skipStep = false;

        if (stepCondition.skip_if_contacted && lead.status !== 'new') {
          skipStep = true;
        }

        if (skipStep) {
          const nextStep = sequence.steps?.[currentStepIndex + 1];
          const delayMs = nextStep ? ((nextStep.delay_days || 0) * 24 + (nextStep.delay_hours || 0)) * 60 * 60 * 1000 : 0;
          
          await base44.asServiceRole.entities.LeadEnrollment.update(enrollment.id, {
            current_step: currentStepIndex + 1,
            next_action_date: nextStep ? new Date(now.getTime() + delayMs).toISOString() : null,
            completed_steps: [...(enrollment.completed_steps || []), {
              step_number: step.step_number,
              completed_at: now.toISOString(),
              action_type: step.action_type,
              result: 'skipped',
              details: 'Condition not met'
            }]
          });
          continue;
        }

        // Execute step action
        let actionResult = 'sent';
        const metrics = enrollment.metrics || { emails_sent: 0, emails_opened: 0, emails_clicked: 0, tasks_created: 0 };

        if (step.action_type === 'email' && lead.buyer_email) {
          // Personalize email
          let subject = step.email_subject || 'Informação sobre imóveis';
          let body = step.email_body || '';
          
          subject = subject.replace(/\{\{nome\}\}/g, lead.buyer_name || 'Cliente');
          body = body.replace(/\{\{nome\}\}/g, lead.buyer_name || 'Cliente');
          body = body.replace(/\{\{localizacao\}\}/g, lead.location || '');
          
          try {
            await base44.asServiceRole.integrations.Core.SendEmail({
              to: lead.buyer_email,
              subject: subject,
              body: body
            });
            
            metrics.emails_sent++;
            results.emails_sent++;

            // Log communication
            await base44.asServiceRole.entities.CommunicationLog.create({
              communication_type: 'email',
              direction: 'outbound',
              contact_name: lead.buyer_name,
              contact_email: lead.buyer_email,
              opportunity_id: lead.id,
              subject: subject,
              content: body,
              communication_date: now.toISOString(),
              status: 'sent',
              source: 'nurturing',
              metadata: {
                sequence_id: sequence.id,
                sequence_name: sequence.name,
                step_number: step.step_number
              }
            });
          } catch (emailErr) {
            actionResult = 'failed';
            results.errors.push(`Email error for lead ${lead.id}: ${emailErr.message}`);
          }
        }

        if (step.action_type === 'task') {
          try {
            await base44.asServiceRole.entities.Task.create({
              title: step.task_title?.replace(/\{\{nome\}\}/g, lead.buyer_name || 'Lead') || 'Follow-up',
              description: step.task_description?.replace(/\{\{nome\}\}/g, lead.buyer_name || 'Lead') || '',
              assigned_to: step.assigned_to || lead.assigned_to,
              related_to: 'opportunity',
              related_id: lead.id,
              related_name: lead.buyer_name,
              due_date: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
              priority: 'medium',
              status: 'pending',
              source: 'nurturing'
            });
            
            metrics.tasks_created++;
            results.tasks_created++;
          } catch (taskErr) {
            actionResult = 'failed';
            results.errors.push(`Task error for lead ${lead.id}: ${taskErr.message}`);
          }
        }

        if (step.action_type === 'notification') {
          try {
            const notifyTo = step.assigned_to || lead.assigned_to;
            if (notifyTo) {
              await base44.asServiceRole.entities.Notification.create({
                title: 'Nurturing: Ação Necessária',
                message: step.notification_message?.replace(/\{\{nome\}\}/g, lead.buyer_name || 'Lead') || 
                         `Follow-up necessário para ${lead.buyer_name}`,
                type: 'lead',
                priority: 'medium',
                user_email: notifyTo,
                related_id: lead.id,
                related_type: 'Opportunity',
                action_url: `/CRMAdvanced?tab=opportunities`
              });
            }
          } catch (notifErr) {
            results.errors.push(`Notification error: ${notifErr.message}`);
          }
        }

        // Update enrollment to next step
        const nextStep = sequence.steps?.[currentStepIndex + 1];
        const delayMs = nextStep ? ((nextStep.delay_days || 0) * 24 + (nextStep.delay_hours || 0)) * 60 * 60 * 1000 : 0;
        
        await base44.asServiceRole.entities.LeadEnrollment.update(enrollment.id, {
          current_step: currentStepIndex + 1,
          next_action_date: nextStep ? new Date(now.getTime() + delayMs).toISOString() : null,
          completed_steps: [...(enrollment.completed_steps || []), {
            step_number: step.step_number,
            completed_at: now.toISOString(),
            action_type: step.action_type,
            result: actionResult
          }],
          metrics
        });

        results.processed++;

      } catch (enrollErr) {
        results.errors.push(`Enrollment ${enrollment.id} error: ${enrollErr.message}`);
      }
    }

    return Response.json({
      success: true,
      timestamp: now.toISOString(),
      results
    });

  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});