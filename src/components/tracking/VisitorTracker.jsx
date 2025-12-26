import React, { useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";

/**
 * Componente invisível que rastreia atividades do utilizador no website
 * Cria registos de visitas e atualiza perfis de leads/oportunidades
 */
export default function VisitorTracker({ 
  pageType = "website", // "website", "property", "development"
  pageId = null,
  pageTitle = null
}) {
  const [sessionId] = React.useState(() => {
    // Criar ou recuperar session ID do sessionStorage
    let sid = sessionStorage.getItem('visitor_session_id');
    if (!sid) {
      sid = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('visitor_session_id', sid);
    }
    return sid;
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      try {
        return await base44.auth.me();
      } catch {
        return null;
      }
    }
  });

  useEffect(() => {
    // Track page view
    trackPageView();

    // Track time on page
    const startTime = Date.now();
    
    return () => {
      const timeSpent = Math.floor((Date.now() - startTime) / 1000);
      trackTimeSpent(timeSpent);
    };
  }, [pageId, pageType]);

  const trackPageView = async () => {
    try {
      const visitorData = {
        session_id: sessionId,
        page_type: pageType,
        page_id: pageId,
        page_title: pageTitle,
        page_url: window.location.href,
        referrer: document.referrer,
        user_agent: navigator.userAgent,
        screen_width: window.screen.width,
        screen_height: window.screen.height,
        timestamp: new Date().toISOString()
      };

      if (user) {
        visitorData.user_email = user.email;
        visitorData.user_name = user.full_name;
        visitorData.is_authenticated = true;
      } else {
        visitorData.is_authenticated = false;
        // Tentar identificar visitante anónimo por email guardado em localStorage
        const guestEmail = localStorage.getItem('guest_email');
        if (guestEmail) {
          visitorData.guest_email = guestEmail;
        }
      }

      // Enviar tracking para backend
      await base44.functions.invoke('trackVisitorActivity', {
        action: 'page_view',
        data: visitorData
      });
    } catch (error) {
      // Tracking não deve quebrar a aplicação
      console.debug('Visitor tracking error:', error);
    }
  };

  const trackTimeSpent = async (seconds) => {
    if (seconds < 3) return; // Ignorar visitas muito curtas

    try {
      await base44.functions.invoke('trackVisitorActivity', {
        action: 'time_spent',
        data: {
          session_id: sessionId,
          page_type: pageType,
          page_id: pageId,
          time_spent_seconds: seconds,
          user_email: user?.email,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.debug('Time tracking error:', error);
    }
  };

  // Componente invisível
  return null;
}

/**
 * Hook para tracking de ações específicas
 */
export function useVisitorTracking() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      try {
        return await base44.auth.me();
      } catch {
        return null;
      }
    }
  });

  const trackAction = async (action, data = {}) => {
    try {
      const sessionId = sessionStorage.getItem('visitor_session_id');
      
      await base44.functions.invoke('trackVisitorActivity', {
        action,
        data: {
          session_id: sessionId,
          user_email: user?.email,
          timestamp: new Date().toISOString(),
          ...data
        }
      });
    } catch (error) {
      console.debug('Action tracking error:', error);
    }
  };

  return { trackAction };
}