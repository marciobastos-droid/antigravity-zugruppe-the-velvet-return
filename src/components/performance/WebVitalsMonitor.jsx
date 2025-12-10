import React from "react";
import { onCLS, onFID, onLCP, onFCP, onTTFB, onINP } from "web-vitals";

/**
 * Monitor de Core Web Vitals
 * Captura e reporta métricas de performance críticas
 */
export default function WebVitalsMonitor({ enabled = true, debug = false }) {
  React.useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const reportMetric = (metric) => {
      if (debug) {
        console.log(`[Web Vitals] ${metric.name}:`, {
          value: metric.value,
          rating: metric.rating,
          delta: metric.delta,
          id: metric.id
        });
      }

      // Enviar para analytics (Google Analytics, etc)
      if (window.gtag) {
        window.gtag('event', metric.name, {
          value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
          metric_id: metric.id,
          metric_value: metric.value,
          metric_delta: metric.delta,
          metric_rating: metric.rating
        });
      }

      // Enviar para backend (opcional)
      if (navigator.sendBeacon) {
        const body = JSON.stringify({
          name: metric.name,
          value: metric.value,
          rating: metric.rating,
          delta: metric.delta,
          id: metric.id,
          url: window.location.href,
          timestamp: Date.now()
        });
        
        navigator.sendBeacon('/api/web-vitals', body);
      }
    };

    // Capturar métricas
    onCLS(reportMetric);  // Cumulative Layout Shift
    onFID(reportMetric);  // First Input Delay
    onLCP(reportMetric);  // Largest Contentful Paint
    onFCP(reportMetric);  // First Contentful Paint
    onTTFB(reportMetric); // Time to First Byte
    onINP(reportMetric);  // Interaction to Next Paint
  }, [enabled, debug]);

  return null; // Componente invisível
}

/**
 * Hook para monitoramento manual de performance
 */
export function useWebVitals(callback) {
  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    onCLS(callback);
    onFID(callback);
    onLCP(callback);
    onFCP(callback);
    onTTFB(callback);
    onINP(callback);
  }, [callback]);
}

/**
 * Hook para capturar métricas específicas
 */
export function usePerformanceMetrics() {
  const [metrics, setMetrics] = React.useState({
    cls: null,
    fid: null,
    lcp: null,
    fcp: null,
    ttfb: null,
    inp: null
  });

  React.useEffect(() => {
    const updateMetric = (metric) => {
      setMetrics(prev => ({
        ...prev,
        [metric.name.toLowerCase()]: {
          value: metric.value,
          rating: metric.rating,
          delta: metric.delta
        }
      }));
    };

    onCLS(updateMetric);
    onFID(updateMetric);
    onLCP(updateMetric);
    onFCP(updateMetric);
    onTTFB(updateMetric);
    onINP(updateMetric);
  }, []);

  return metrics;
}