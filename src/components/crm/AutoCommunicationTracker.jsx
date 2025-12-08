import React, { useEffect } from "react";
import { base44 } from "@/api/base44Client";

/**
 * Hook para registar automaticamente comunicações
 * Uso: const trackCommunication = useAutoCommunicationTracker();
 *      await trackCommunication({ type: 'email', contact_id, subject, summary });
 */
export function useAutoCommunicationTracker() {
  const trackCommunication = async ({
    contact_id,
    contact_email,
    opportunity_id,
    type,
    direction = 'outbound',
    subject,
    summary,
    outcome = 'successful',
    metadata
  }) => {
    try {
      await base44.functions.invoke('logCommunication', {
        contact_id,
        contact_email,
        opportunity_id,
        type,
        direction,
        subject,
        summary,
        outcome,
        metadata
      });
    } catch (error) {
      console.error('Error tracking communication:', error);
    }
  };

  return trackCommunication;
}

/**
 * Component que intercepta comunicações e auto-regista
 */
export default function AutoCommunicationTracker({ children, enabled = true }) {
  useEffect(() => {
    if (!enabled) return;

    // Intercept clicks em links de tel: e mailto:
    const handleClick = async (e) => {
      const target = e.target.closest('a');
      if (!target) return;

      const href = target.href;

      // Phone call tracking
      if (href.startsWith('tel:')) {
        const phone = href.replace('tel:', '');
        const contactName = target.dataset.contactName || 'Cliente';
        const contactId = target.dataset.contactId;
        
        setTimeout(async () => {
          try {
            await base44.functions.invoke('logCommunication', {
              contact_id: contactId,
              type: 'call',
              direction: 'outbound',
              subject: `Chamada para ${contactName}`,
              summary: `Chamada iniciada para ${phone}`,
              outcome: 'successful'
            });
          } catch (error) {
            console.error('Error logging call:', error);
          }
        }, 1000);
      }

      // Email tracking
      if (href.startsWith('mailto:')) {
        const email = href.replace('mailto:', '').split('?')[0];
        const contactName = target.dataset.contactName || email;
        const contactId = target.dataset.contactId;
        
        setTimeout(async () => {
          try {
            await base44.functions.invoke('logCommunication', {
              contact_id: contactId,
              contact_email: email,
              type: 'email',
              direction: 'outbound',
              subject: `Email para ${contactName}`,
              summary: `Email iniciado para ${email}`,
              outcome: 'successful'
            });
          } catch (error) {
            console.error('Error logging email:', error);
          }
        }, 1000);
      }
    };

    document.addEventListener('click', handleClick);

    return () => {
      document.removeEventListener('click', handleClick);
    };
  }, [enabled]);

  return <>{children}</>;
}