import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Cookie } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function CookieBanner() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookieConsent');
    if (!consent) {
      setShowBanner(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookieConsent', 'accepted');
    setShowBanner(false);
  };

  const handleReject = () => {
    localStorage.setItem('cookieConsent', 'rejected');
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-2xl z-50 animate-in slide-in-from-bottom duration-300">
      <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <Cookie className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-slate-900 mb-1">Este site utiliza cookies</h3>
              <p className="text-sm text-slate-600">
                Utilizamos cookies para melhorar a sua experiência de navegação, analisar o tráfego do site e personalizar conteúdo. 
                Ao clicar em "Aceitar", concorda com o uso de todos os cookies. 
                Consulte a nossa{' '}
                <Link to={createPageUrl("PrivacyPolicy")} className="text-blue-600 hover:underline font-medium">
                  Política de Privacidade
                </Link>
                {' '}para mais informações.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              onClick={handleReject}
              variant="outline"
              className="flex-1 sm:flex-none"
            >
              Rejeitar
            </Button>
            <Button
              onClick={handleAccept}
              className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700"
            >
              Aceitar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}