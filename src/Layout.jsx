import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Home, Plus, LayoutDashboard, MessageSquare, Building2, Users, Menu, X, Wrench, BarChart3, Star, Heart } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import NotificationBell from "./components/notifications/NotificationBell";
import { Toaster } from "sonner";
import LanguageCurrencySelector from "./components/i18n/LanguageCurrencySelector";
import GlobalSearch from "./components/search/GlobalSearch";
import { LocalizationProvider } from "./components/i18n/LocalizationContext";

import WebVitalsMonitor from "./components/performance/WebVitalsMonitor";
import PWAProvider from "./components/pwa/PWAProvider";
import PWAInstaller from "./components/pwa/PWAInstaller";
import ErrorBoundary from "./components/errors/ErrorBoundary";
// Pages where layout should be minimal (no header/footer)
const MINIMAL_LAYOUT_PAGES = ["Home", "Website", "PropertyDetails", "PremiumLuxury", "WorldWideProperties", "TermsConditions", "PrivacyPolicy", "CookiePolicy", "ManageData", "RGPDConsent", "DenunciationChannel", "ClientPortal"];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [user, setUser] = React.useState(null);
  const [userPermissions, setUserPermissions] = React.useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  // Check if minimal layout BEFORE any hooks
  const isMinimalLayout = MINIMAL_LAYOUT_PAGES.includes(currentPageName);

  React.useEffect(() => {
    if (typeof base44 !== 'undefined') {
      base44.auth.me().then(setUser).catch(() => {});
    }
  }, []);

  // Permissões já vêm no objeto user
  React.useEffect(() => {
    if (user) {
      setUserPermissions(user.permissions || null);
    }
  }, [user]);

  // Memoize calculated values to prevent infinite loops
  const { userTypeNormalized, isAdmin, isGestor, isConsultant, userType } = React.useMemo(() => {
    const normalized = user?.user_type?.toLowerCase() || '';
    const admin = user && (user.role === 'admin' || normalized === 'admin' || normalized === 'gestor');
    const gestor = user && normalized === 'gestor';
    const consultant = user && (normalized === 'consultant' || normalized === 'agente');
    // Normalize agente to consultant for consistency
    const type = normalized === 'agente' ? 'consultant' : (normalized || user?.role || 'user');
    
    return {
      userTypeNormalized: normalized,
      isAdmin: admin,
      isGestor: gestor,
      isConsultant: consultant,
      userType: type
    };
  }, [user]);

  // Debug: log user type info
  React.useEffect(() => {
    if (user) {
      console.log('[Layout Debug]', {
        email: user.email,
        userType,
        userTypeNormalized,
        role: user.role,
        isAdmin,
        isGestor,
        isConsultant,
        rawUserType: user.user_type
      });
    }
  }, [user, userType, userTypeNormalized, isAdmin, isGestor, isConsultant]);

  // Definir visibilidade por tipo de utilizador: 'all', 'admin', 'gestor', 'agente', ou array como ['admin', 'gestor']
  // pagePermKey é usado para verificar permissões granulares
  const allNavItems = React.useMemo(() => [
    { name: "Dashboard", path: createPageUrl("Dashboard"), icon: BarChart3, id: "nav-dashboard", visibility: 'all', pagePermKey: 'dashboard' },
    { name: "WebSite", path: createPageUrl("Website"), icon: Building2, id: "nav-website", visibility: 'all', pagePermKey: 'browse' },
    { name: "Imóveis", path: createPageUrl("MyListings"), icon: LayoutDashboard, id: "nav-properties", visibility: 'all', pagePermKey: 'my_listings' },
    { name: "CRM", path: createPageUrl("CRMAdvanced"), icon: Users, id: "nav-crm", visibility: 'all', pagePermKey: 'crm' },
    
    { name: "Tools", path: createPageUrl("Tools"), icon: Wrench, id: "nav-tools", visibility: ['admin', 'gestor', 'consultant'], pagePermKey: 'tools' },
    { name: "Equipa", path: createPageUrl("TeamManagement"), icon: Users, id: "nav-team", visibility: ['admin', 'gestor'], pagePermKey: 'team' },
    { name: "Franchising", path: createPageUrl("Franchising"), icon: Building2, id: "nav-franchising", visibility: ['admin'], pagePermKey: 'franchising' },
  ], []);

  // Verificar se utilizador tem permissão para uma página específica
  const hasPagePermission = React.useCallback((pagePermKey) => {
    // Admins e gestores têm acesso total
    if (isAdmin) return true;
    
    // Caso especial: página Tools
    if (pagePermKey === 'tools') {
      // Se tem a permissão explícita da página
      if (user?.permissions?.pages?.tools === true) return true;
      
      // Se tem pelo menos uma ferramenta habilitada, pode ver a página
      if (user?.permissions?.tools && typeof user.permissions.tools === 'object') {
        const hasAnyTool = Object.values(user.permissions.tools).some(v => v === true);
        return hasAnyTool;
      }
      
      return false;
    }
    
    // Para outras páginas, verificar permissão específica
    if (user?.permissions?.pages && pagePermKey) {
      return user.permissions.pages[pagePermKey] === true;
    }
    
    return false;
  }, [isAdmin, user]);

  // Filtrar itens baseado na visibilidade e permissões
  const navItems = React.useMemo(() => {
    return allNavItems.filter(item => {
      // Se é página com visibilidade 'all', sempre mostrar
      if (item.visibility === 'all') return true;

      // Para páginas restritas, verificar tipo de utilizador primeiro
      if (Array.isArray(item.visibility)) {
        const hasTypeAccess = item.visibility.includes(userType) || 
                              (isAdmin && item.visibility.includes('admin')) ||
                              (isGestor && item.visibility.includes('gestor')) ||
                              (isConsultant && item.visibility.includes('consultant'));
        
        if (hasTypeAccess) return true;
      } else if (item.visibility === userType || (isAdmin && item.visibility === 'admin')) {
        return true;
      }

      // Verificar permissões granulares como fallback
      if (item.pagePermKey && hasPagePermission(item.pagePermKey)) {
        return true;
      }

      return false;
    });
  }, [allNavItems, userType, isAdmin, isGestor, isConsultant, hasPagePermission]);

  // Render minimal layout for Home page - AFTER all hooks
  if (isMinimalLayout) {
    return (
      <ErrorBoundary name="App Root">
        <PWAProvider>
          <LocalizationProvider>
            <WebVitalsMonitor enabled={process.env.NODE_ENV === 'production'} />
            <PWAInstaller />
            {children}
          </LocalizationProvider>
        </PWAProvider>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary name="App Layout">
      <PWAProvider>
        <LocalizationProvider>
          <WebVitalsMonitor enabled={process.env.NODE_ENV === 'production'} />
          <PWAInstaller />
          <div className="min-h-screen bg-slate-50">
          <Toaster position="top-right" richColors />
          <style>{`
            :root {
              --color-primary: #0f172a;
              --color-accent: #d4af37;
              --color-secondary: #1e293b;
            }

            /* Mobile Optimizations */
            @media (max-width: 768px) {
              body {
                font-size: 16px; /* Prevent auto-zoom on iOS */
                -webkit-text-size-adjust: 100%;
              }

              /* Safe area for notch devices */
              .safe-area-inset-top {
                padding-top: env(safe-area-inset-top);
              }

              /* Touch feedback */
              .active\\:scale-98:active {
                transform: scale(0.98);
              }

              /* Smooth scrolling */
              * {
                -webkit-tap-highlight-color: transparent;
                -webkit-touch-callout: none;
              }

              /* Better touch targets */
              button, a, input, select, textarea {
                min-height: 44px;
              }

              /* Prevent text selection on buttons */
              button {
                -webkit-user-select: none;
                user-select: none;
              }
            }
          `}</style>
      
          <header className="bg-white border-b border-slate-200 sticky top-0 z-50 backdrop-blur-lg bg-white/95 safe-area-inset-top">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
          <div className="flex justify-between items-center h-16 sm:h-16 md:h-20">
                    <Link to={createPageUrl("Home")} className="flex items-center gap-2 md:gap-3 group flex-shrink-0">
                      <img 
                        src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6915a593b6edd8435f5838bd/359538617_Zugruppe01.jpg"
                        alt="Zugruppe Logo"
                        className="h-7 sm:h-8 md:h-12 w-auto object-contain transform group-hover:scale-105 transition-transform duration-200"
                      />
                    </Link>

            <nav className="hidden md:flex items-center gap-0.5 lg:gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.path}
                  id={item.id}
                  className={`flex items-center gap-1 lg:gap-2 px-2 lg:px-3 py-1.5 lg:py-2 rounded-lg font-medium text-xs lg:text-sm transition-all duration-200 ${
                    location.pathname === item.path
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  <item.icon className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                  <span className="hidden lg:inline">{item.name}</span>
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3">
              {/* Global Search */}
              <GlobalSearch />

              <LanguageCurrencySelector variant="compact" />



              {user && <NotificationBell user={user} />}
              {user ? (
                <div className="hidden lg:flex items-center gap-3">
                    <div className="text-right hidden xl:block">
                      <p className="text-sm font-medium text-slate-900">{user.full_name}</p>
                      <p className="text-xs text-slate-500">
                        {user.user_type === 'admin' ? 'Administrador' : 
                         user.user_type === 'gestor' ? 'Gestor' : 
                         (user.user_type === 'consultant' || user.user_type === 'agente') ? 'Consultor' : user.email}
                      </p>
                    </div>
                    {user.photo_url ? (
                      <img 
                        src={user.photo_url} 
                        alt={user.full_name}
                        className="w-8 h-8 md:w-10 md:h-10 rounded-full object-cover flex-shrink-0 border-2 border-slate-200"
                      />
                    ) : (
                      <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-slate-700 to-slate-900 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-semibold text-xs md:text-sm">
                          {user.full_name?.[0]?.toUpperCase() || "U"}
                        </span>
                      </div>
                    )}
                    <button
                      onClick={() => typeof base44 !== 'undefined' && base44.auth.logout()}
                      className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
                    >
                      Sair
                    </button>
                  </div>
              ) : (
                <button
                  onClick={() => typeof base44 !== 'undefined' && base44.auth.redirectToLogin()}
                  className="hidden lg:block px-3 md:px-4 py-2 bg-slate-900 text-white rounded-lg font-medium text-sm hover:bg-slate-800 transition-colors duration-200"
                >
                  Entrar
                </button>
              )}

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2.5 rounded-lg hover:bg-slate-100 transition-colors active:bg-slate-200 min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white shadow-lg">
            <nav className="max-w-7xl mx-auto px-4 py-3 space-y-1 max-h-[calc(100vh-80px)] overflow-y-auto">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-4 px-4 py-4 rounded-xl font-medium text-base transition-all duration-200 min-h-[56px] active:scale-98 ${
                    location.pathname === item.path
                      ? "bg-slate-900 text-white shadow-md"
                      : "text-slate-700 hover:bg-slate-100 active:bg-slate-200"
                  }`}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  <span className="flex-1">{item.name}</span>
                </Link>
              ))}
              
              {user && (
                <div className="px-4 py-4 border-t border-slate-200 mt-2 pt-4 bg-slate-50 rounded-xl">
                  <div className="flex items-center justify-between min-h-[56px]">
                    <div className="flex items-center gap-2.5">
                      {user.photo_url ? (
                        <img 
                          src={user.photo_url} 
                          alt={user.full_name}
                          className="w-9 h-9 rounded-full object-cover border-2 border-slate-200"
                        />
                      ) : (
                        <div className="w-9 h-9 bg-gradient-to-br from-slate-700 to-slate-900 rounded-full flex items-center justify-center">
                          <span className="text-white font-semibold text-xs">
                            {user.full_name?.[0]?.toUpperCase() || "U"}
                          </span>
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-slate-900 truncate max-w-[150px]">{user.full_name}</p>
                        <p className="text-xs text-slate-500">
                          {user.user_type === 'admin' ? 'Admin' : 
                           user.user_type === 'gestor' ? 'Gestor' : 
                           (user.user_type === 'consultant' || user.user_type === 'agente') ? 'Consultor' : 'Utilizador'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => typeof base44 !== 'undefined' && base44.auth.logout()}
                      className="px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors min-h-[44px] active:bg-red-100"
                    >
                      Sair
                    </button>
                  </div>
                </div>
              )}

              {!user && (
                <button
                  onClick={() => typeof base44 !== 'undefined' && base44.auth.redirectToLogin()}
                  className="w-full px-4 py-4 bg-slate-900 text-white rounded-xl font-medium text-base hover:bg-slate-800 transition-colors duration-200 min-h-[56px] active:bg-slate-700"
                >
                  Entrar
                </button>
              )}
            </nav>
          </div>
        )}
          </header>

          <main className="pb-8">
            <ErrorBoundary name="Page Content">
              {children}
            </ErrorBoundary>
          </main>
          </div>
          </LocalizationProvider>
          </PWAProvider>
          </ErrorBoundary>
          );
          }