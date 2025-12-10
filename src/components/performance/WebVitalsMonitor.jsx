import React from "react";
import { onCLS, onFID, onFCP, onLCP, onTTFB, onINP } from "web-vitals";

/**
 * Monitora Core Web Vitals e envia para analytics
 */
export default function WebVitalsMonitor({ enabled = true }) {
  React.useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const sendToAnalytics = (metric) => {
      const body = JSON.stringify({
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
        delta: metric.delta,
        id: metric.id,
        navigationType: metric.navigationType,
        pathname: window.location.pathname
      });

      // Enviar para o servidor/analytics
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/web-vitals', body);
      } else {
        fetch('/api/web-vitals', {
          method: 'POST',
          body,
          headers: { 'Content-Type': 'application/json' },
          keepalive: true
        }).catch(console.error);
      }

      // Log em desenvolvimento
      if (process.env.NODE_ENV === 'development') {
        console.log('[Web Vitals]', metric.name, metric.value, metric.rating);
      }
    };

    // Monitorar métricas
    onCLS(sendToAnalytics);  // Cumulative Layout Shift
    onFID(sendToAnalytics);  // First Input Delay
    onFCP(sendToAnalytics);  // First Contentful Paint
    onLCP(sendToAnalytics);  // Largest Contentful Paint
    onTTFB(sendToAnalytics); // Time to First Byte
    onINP(sendToAnalytics);  // Interaction to Next Paint
  }, [enabled]);

  return null;
}

/**
 * Hook para acessar Web Vitals programaticamente
 */
export function useWebVitals(callback) {
  React.useEffect(() => {
    if (!callback) return;

    onCLS(callback);
    onFID(callback);
    onFCP(callback);
    onLCP(callback);
    onTTFB(callback);
    onINP(callback);
  }, [callback]);
}