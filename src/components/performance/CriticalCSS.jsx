import React from "react";

/**
 * Critical CSS inline para melhorar First Contentful Paint
 * Carrega estilos essenciais antes do CSS completo
 */
export default function CriticalCSS() {
  return (
    <style dangerouslySetInnerHTML={{
      __html: `
        /* Critical CSS - Above the fold */
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        
        body {
          font-family: system-ui, -apple-system, sans-serif;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        
        /* Loading states */
        .skeleton {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
          background-size: 200% 100%;
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        /* Prevent layout shift */
        img {
          max-width: 100%;
          height: auto;
          display: block;
        }
        
        /* Performance hints */
        img[loading="lazy"] {
          content-visibility: auto;
        }
        
        /* Smooth scrolling */
        html {
          scroll-behavior: smooth;
        }
        
        /* Optimize text rendering */
        body {
          text-rendering: optimizeSpeed;
          font-feature-settings: "kern" 1;
        }
      `
    }} />
  );
}