import React, { useEffect, useState } from "react";
import { toast } from "sonner";

export default function PWAProvider({ children }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    // Registar service worker
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/service-worker.js')
          .then((registration) => {
            console.log('Service Worker registado:', registration.scope);

            // Verificar atualizações
            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing;
              
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('Nova versão disponível');
                  setUpdateAvailable(true);
                  toast.info(
                    'Nova versão disponível! Recarregue para atualizar.',
                    {
                      duration: Infinity,
                      action: {
                        label: 'Atualizar',
                        onClick: () => window.location.reload()
                      }
                    }
                  );
                }
              });
            });
          })
          .catch((error) => {
            console.error('Erro ao registar Service Worker:', error);
          });
      });
    }

    // Monitorar estado de conexão
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Conexão restabelecida', { duration: 3000 });
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('Sem conexão - Modo offline', { duration: 5000 });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <>
      {children}
      {!isOnline && (
        <div className="fixed bottom-0 left-0 right-0 bg-amber-500 text-white text-center py-2 text-sm font-medium z-50">
          ⚠️ Modo Offline - Algumas funcionalidades podem estar limitadas
        </div>
      )}
    </>
  );
}