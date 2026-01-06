import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { propertyId, action, feedback } = await req.json();

    if (!propertyId || !action) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get property
    const properties = await base44.asServiceRole.entities.Property.filter({ id: propertyId });
    const property = properties[0];

    if (!property) {
      return Response.json({ error: 'Property not found' }, { status: 404 });
    }

    // Get workflow
    let workflow = null;
    if (property.approval_workflow_id) {
      const workflows = await base44.asServiceRole.entities.ApprovalWorkflow.filter({ 
        id: property.approval_workflow_id 
      });
      workflow = workflows[0];
    } else {
      // Get default workflow
      const defaultWorkflows = await base44.asServiceRole.entities.ApprovalWorkflow.filter({ 
        is_default: true,
        is_active: true
      });
      workflow = defaultWorkflows[0];
    }

    if (!workflow) {
      return Response.json({ error: 'No workflow configured' }, { status: 400 });
    }

    const currentStep = property.current_approval_step || 1;
    const step = workflow.steps?.find(s => s.step_number === currentStep);

    if (!step) {
      return Response.json({ error: 'Invalid workflow step' }, { status: 400 });
    }

    // Check user has permission for this step
    const userRole = user.user_type?.toLowerCase() || user.role;
    const canApprove = userRole === 'admin' || 
                       userRole === step.required_role ||
                       (step.pending_approver_emails && step.pending_approver_emails.includes(user.email));

    if (!canApprove) {
      return Response.json({ 
        error: `Apenas ${step.required_role} pode aprovar neste passo` 
      }, { status: 403 });
    }

    const now = new Date().toISOString();
    const submittedDate = new Date(property.approval_submitted_date || property.created_date);
    const durationHours = Math.round((new Date() - submittedDate) / (1000 * 60 * 60));

    // Log approval history
    await base44.asServiceRole.entities.ApprovalHistory.create({
      property_id: property.id,
      property_title: property.title,
      workflow_id: workflow.id,
      current_step: currentStep,
      total_steps: workflow.steps.length,
      step_name: step.step_name,
      action: action,
      action_by: user.email,
      action_by_name: user.full_name,
      action_by_role: userRole,
      feedback: feedback || null,
      duration_hours: durationHours
    });

    let propertyUpdate = {};
    let notifications = [];

    if (action === 'approved') {
      // Check if there are more steps
      if (currentStep < workflow.steps.length) {
        // Move to next step
        const nextStep = workflow.steps.find(s => s.step_number === currentStep + 1);
        
        propertyUpdate = {
          approval_status: 'in_progress',
          current_approval_step: currentStep + 1,
          approval_step_name: nextStep.step_name,
          pending_approver_role: nextStep.required_role,
          pending_approver_emails: nextStep.notify_emails || null
        };

        // Notify next approvers
        const notifyRole = nextStep.required_role;
        const usersToNotify = await base44.asServiceRole.entities.User.filter({
          user_type: notifyRole
        });

        for (const notifyUser of usersToNotify) {
          notifications.push({
            title: `Aprovação Necessária: ${property.title}`,
            message: `O imóvel "${property.title}" foi aprovado em ${step.step_name} e aguarda sua aprovação em ${nextStep.step_name}.`,
            type: 'approval',
            priority: 'high',
            user_email: notifyUser.email,
            related_entity: 'Property',
            related_entity_id: property.id,
            action_url: `/property/${property.id}`,
            broadcast_type: 'individual'
          });
        }
      } else {
        // Final approval
        propertyUpdate = {
          approval_status: 'approved',
          approved_by: user.email,
          approved_date: now,
          approval_feedback: feedback || null,
          availability_status: 'available'
        };

        // Notify property owner
        notifications.push({
          title: `Imóvel Aprovado: ${property.title}`,
          message: `O seu imóvel "${property.title}" foi aprovado e está agora visível no website.`,
          type: 'approval',
          priority: 'high',
          user_email: property.created_by,
          related_entity: 'Property',
          related_entity_id: property.id,
          broadcast_type: 'individual'
        });
      }
    } else if (action === 'rejected') {
      propertyUpdate = {
        approval_status: 'rejected',
        approved_by: user.email,
        approved_date: now,
        approval_feedback: feedback || null,
        rejection_reason: feedback || 'Rejeitado'
      };

      // Notify property owner
      notifications.push({
        title: `Imóvel Rejeitado: ${property.title}`,
        message: `O seu imóvel "${property.title}" foi rejeitado em ${step.step_name}. Motivo: ${feedback || 'Não especificado'}`,
        type: 'approval',
        priority: 'high',
        user_email: property.created_by,
        related_entity: 'Property',
        related_entity_id: property.id,
        broadcast_type: 'individual'
      });
    }

    // Update property
    await base44.asServiceRole.entities.Property.update(property.id, propertyUpdate);

    // Send notifications
    for (const notif of notifications) {
      await base44.asServiceRole.entities.Notification.create(notif);
    }

    // Send email notification
    const emailSubject = action === 'approved' 
      ? `✅ Imóvel Aprovado${currentStep < workflow.steps.length ? ' - Próximo Passo' : ''}`
      : `❌ Imóvel Rejeitado`;

    const emailBody = notifications[0]?.message || '';

    if (property.created_by) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: property.created_by,
        subject: emailSubject,
        body: emailBody
      });
    }

    return Response.json({ 
      success: true,
      nextStep: currentStep < workflow.steps.length ? workflow.steps.find(s => s.step_number === currentStep + 1) : null,
      finalApproval: currentStep >= workflow.steps.length && action === 'approved'
    });

  } catch (error) {
    console.error('Error in approval workflow:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});