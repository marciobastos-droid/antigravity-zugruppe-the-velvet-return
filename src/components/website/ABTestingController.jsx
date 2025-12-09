import React from "react";

/**
 * A/B Testing Controller
 * Manages different variants of CTAs and layouts for conversion optimization
 */

// CTA Variants
export const CTA_VARIANTS = {
  variant_a: {
    primary: "Contactar Agora",
    secondary: "Ver Mais Imóveis",
    style: "default"
  },
  variant_b: {
    primary: "Agende uma Visita Gratuita",
    secondary: "Falar com um Especialista",
    style: "urgent"
  },
  variant_c: {
    primary: "Encontre o Seu Imóvel Ideal",
    secondary: "Receber Recomendações Personalizadas",
    style: "personalized"
  }
};

// Layout Variants
export const LAYOUT_VARIANTS = {
  variant_a: {
    name: "Padrão",
    showFeatured: true,
    showFiltersExpanded: false,
    gridColumns: 4
  },
  variant_b: {
    name: "Foco em Destaque",
    showFeatured: true,
    showFiltersExpanded: true,
    gridColumns: 3
  },
  variant_c: {
    name: "Compacto",
    showFeatured: false,
    showFiltersExpanded: false,
    gridColumns: 4
  }
};

/**
 * Hook to manage A/B testing
 * Assigns variant on first visit and persists it
 */
export function useABTesting() {
  const [ctaVariant, setCtaVariant] = React.useState('variant_a');
  const [layoutVariant, setLayoutVariant] = React.useState('variant_a');

  React.useEffect(() => {
    // Check if user already has a variant assigned
    let assignedCTA = localStorage.getItem('ab_cta_variant');
    let assignedLayout = localStorage.getItem('ab_layout_variant');

    // If not, randomly assign one
    if (!assignedCTA) {
      const variants = Object.keys(CTA_VARIANTS);
      assignedCTA = variants[Math.floor(Math.random() * variants.length)];
      localStorage.setItem('ab_cta_variant', assignedCTA);
      
      // Track assignment
      trackABEvent('variant_assigned', { type: 'cta', variant: assignedCTA });
    }

    if (!assignedLayout) {
      const variants = Object.keys(LAYOUT_VARIANTS);
      assignedLayout = variants[Math.floor(Math.random() * variants.length)];
      localStorage.setItem('ab_layout_variant', assignedLayout);
      
      // Track assignment
      trackABEvent('variant_assigned', { type: 'layout', variant: assignedLayout });
    }

    setCtaVariant(assignedCTA);
    setLayoutVariant(assignedLayout);
  }, []);

  const trackConversion = (conversionType) => {
    trackABEvent('conversion', {
      type: conversionType,
      ctaVariant,
      layoutVariant
    });
  };

  const trackCTAClick = (ctaType) => {
    trackABEvent('cta_click', {
      cta: ctaType,
      ctaVariant,
      layoutVariant
    });
  };

  return {
    ctaVariant,
    layoutVariant,
    cta: CTA_VARIANTS[ctaVariant],
    layout: LAYOUT_VARIANTS[layoutVariant],
    trackConversion,
    trackCTAClick
  };
}

/**
 * Track A/B testing events
 * In production, this should send to analytics service
 */
function trackABEvent(eventName, data) {
  // Log to console for development
  console.log('[A/B Test]', eventName, data);

  // Store in localStorage for now (in production, send to analytics)
  const events = JSON.parse(localStorage.getItem('ab_test_events') || '[]');
  events.push({
    timestamp: new Date().toISOString(),
    event: eventName,
    ...data
  });
  
  // Keep only last 100 events
  if (events.length > 100) {
    events.shift();
  }
  
  localStorage.setItem('ab_test_events', JSON.stringify(events));
}

/**
 * Get A/B test results
 * Useful for analyzing conversion rates
 */
export function getABTestResults() {
  const events = JSON.parse(localStorage.getItem('ab_test_events') || '[]');
  
  const results = {
    cta: {
      variant_a: { assigned: 0, conversions: 0, clicks: 0 },
      variant_b: { assigned: 0, conversions: 0, clicks: 0 },
      variant_c: { assigned: 0, conversions: 0, clicks: 0 }
    },
    layout: {
      variant_a: { assigned: 0, conversions: 0 },
      variant_b: { assigned: 0, conversions: 0 },
      variant_c: { assigned: 0, conversions: 0 }
    }
  };

  events.forEach(event => {
    if (event.event === 'variant_assigned') {
      if (event.type === 'cta') {
        results.cta[event.variant].assigned++;
      } else if (event.type === 'layout') {
        results.layout[event.variant].assigned++;
      }
    } else if (event.event === 'conversion') {
      if (event.ctaVariant && results.cta[event.ctaVariant]) {
        results.cta[event.ctaVariant].conversions++;
      }
      if (event.layoutVariant && results.layout[event.layoutVariant]) {
        results.layout[event.layoutVariant].conversions++;
      }
    } else if (event.event === 'cta_click') {
      if (event.ctaVariant && results.cta[event.ctaVariant]) {
        results.cta[event.ctaVariant].clicks++;
      }
    }
  });

  // Calculate conversion rates
  Object.keys(results.cta).forEach(variant => {
    const data = results.cta[variant];
    data.conversionRate = data.assigned > 0 ? (data.conversions / data.assigned * 100).toFixed(2) : 0;
    data.clickRate = data.assigned > 0 ? (data.clicks / data.assigned * 100).toFixed(2) : 0;
  });

  Object.keys(results.layout).forEach(variant => {
    const data = results.layout[variant];
    data.conversionRate = data.assigned > 0 ? (data.conversions / data.assigned * 100).toFixed(2) : 0;
  });

  return results;
}