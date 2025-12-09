/**
 * Registra Service Worker para cache CDN
 */

export function registerServiceWorker() {
  if (typeof window === 'undefined') return;
  
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[CDN] Service Worker registrado:', registration.scope);
          
          // Atualizar SW automaticamente
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            
            newWorker?.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('[CDN] Nova versão disponível. Recarregando...');
                window.location.reload();
              }
            });
          });
        })
        .catch((error) => {
          console.error('[CDN] Erro ao registrar Service Worker:', error);
        });
    });
  }
}

export function unregisterServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();
      })
      .catch((error) => {
        console.error('[CDN] Erro ao desregistrar Service Worker:', error);
      });
  }
}