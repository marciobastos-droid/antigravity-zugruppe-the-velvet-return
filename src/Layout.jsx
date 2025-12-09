import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Home, Plus, LayoutDashboard, MessageSquare, Building2, Users, Menu, X, Wrench, BarChart3, FileBarChart } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import NotificationBell from "./components/notifications/NotificationBell";
import { Toaster } from "sonner";
import LanguageCurrencySelector from "./components/i18n/LanguageCurrencySelector";
import { LocalizationProvider } from "./components/i18n/LocalizationContext";
import { HelmetProvider } from "react-helmet-async";


// Pages where layout should be minimal (no header/footer)
const MINIMAL_LAYOUT_PAGES = ["Home"];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [user, setUser] = React.useState(null);
  const [userPermissions, setUserPermissions] = React.useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  // Carregar permissões do utilizador
  React.useEffect(() => {
    if (user?.email) {
      base44.entities.UserPermission.filter({ user_email: user.email })
        .then(perms => {
          if (perms.length > 0) {
            setUserPermissions(perms[0].permissions);
          }
        })
        .catch(() => {});
    }
  }, [user?.email]);

  // Render minimal layout for Home page
  if (MINIMAL_LAYOUT_PAGES.includes(currentPageName)) {
    return <>{children}</>;
  }

  const userTypeNormalized = user?.user_type?.toLowerCase() || '';
  const isAdmin = user && (user.role === 'admin' || userTypeNormalized === 'admin' || userTypeNormalized === 'gestor');
  const isGestor = user && userTypeNormalized === 'gestor';
  const isAgente = user && userTypeNormalized === 'agente';
  const userType = userTypeNormalized || user?.role || 'user';

  // Definir visibilidade por tipo de utilizador: 'all', 'admin', 'gestor', 'agente', ou array como ['admin', 'gestor']
  // pagePermKey é usado para verificar permissões granulares
  const allNavItems = [
    { name: "Dashboard", path: createPageUrl("Dashboard"), icon: BarChart3, id: "nav-dashboard", visibility: 'all', pagePermKey: 'dashboard' },
    { name: "WebSite", path: createPageUrl("ZuGruppe"), icon: Building2, id: "nav-zugruppe", visibility: 'all', pagePermKey: 'browse' },
    { name: "Imóveis", path: createPageUrl("MyListings"), icon: LayoutDashboard, id: "nav-properties", visibility: 'all', pagePermKey: 'my_listings' },
    { name: "CRM", path: createPageUrl("CRMAdvanced"), icon: Users, id: "nav-crm", visibility: 'all', pagePermKey: 'crm' },
    
    { name: "Tools", path: createPageUrl("Tools"), icon: Wrench, id: "nav-tools", visibility: ['admin', 'gestor'], pagePermKey: 'tools' },
    { name: "Equipa", path: createPageUrl("TeamManagement"), icon: Users, id: "nav-team", visibility: ['admin', 'gestor'], pagePermKey: 'team' },
    { name: "Franchising", path: createPageUrl("Franchising"), icon: Building2, id: "nav-franchising", visibility: ['admin'], pagePermKey: 'franchising' },
    ];

  // Verificar se utilizador tem permissão para uma página específica
  const hasPagePermission = (pagePermKey) => {
    // Admins e gestores têm acesso total
    if (isAdmin) return true;
    // Se tem permissões granulares definidas, verificar
    if (userPermissions?.pages && pagePermKey) {
      return userPermissions.pages[pagePermKey] === true;
    }
    // Se tem permissão de ferramentas (tools), dar acesso
    if (pagePermKey === 'tools' && userPermissions?.tools) {
      // Verifica se tem pelo menos uma ferramenta permitida
      const hasAnyTool = Object.values(userPermissions.tools).some(v => v === true);
      if (hasAnyTool) return true;
    }
    return false;
  };

  // Filtrar itens baseado na visibilidade e permissões
  const navItems = allNavItems.filter(item => {
    // Se é página com visibilidade 'all', sempre mostrar
    if (item.visibility === 'all') return true;

    // Para páginas restritas, verificar permissões granulares primeiro
    if (item.pagePermKey && hasPagePermission(item.pagePermKey)) {
      return true;
    }

    // Fallback para verificação por tipo de utilizador
    if (Array.isArray(item.visibility)) {
      return item.visibility.includes(userType) || (isAdmin && item.visibility.includes('admin'));
    }
    return item.visibility === userType || (isAdmin && item.visibility === 'admin');
  });

  return (
    <HelmetProvider>
      <LocalizationProvider>
        <div className="min-h-screen bg-slate-50">
          <Toaster position="top-right" richColors />
      <style>{`
        :root {
          --color-primary: #0f172a;
          --color-accent: #d4af37;
          --color-secondary: #1e293b;
        }
        @media (max-width: 768px) {
          body {
            font-size: 14px;
          }
        }
      `}</style>
      
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 backdrop-blur-lg bg-white/95">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
          <div className="flex justify-between items-center h-14 sm:h-16 md:h-20">
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
              <LanguageCurrencySelector variant="compact" />
              {user && <NotificationBell user={user} />}
              {user ? (
                <div className="hidden lg:flex items-center gap-3">
                    <div className="text-right hidden xl:block">
                      <p className="text-sm font-medium text-slate-900">{user.full_name}</p>
                      <p className="text-xs text-slate-500">
                        {user.user_type === 'admin' ? 'Administrador' : 
                         user.user_type === 'gestor' ? 'Gestor' : 
                         user.user_type === 'agente' ? 'Agente' : user.email}
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
                      onClick={() => base44.auth.logout()}
                      className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
                    >
                      Sair
                    </button>
                  </div>
              ) : (
                <button
                  onClick={() => base44.auth.redirectToLogin()}
                  className="hidden lg:block px-3 md:px-4 py-2 bg-slate-900 text-white rounded-lg font-medium text-sm hover:bg-slate-800 transition-colors duration-200"
                >
                  Entrar
                </button>
              )}

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-1.5 sm:p-2 rounded-lg hover:bg-slate-100 transition-colors"
              >
                {mobileMenuOpen ? <X className="w-5 h-5 sm:w-6 sm:h-6" /> : <Menu className="w-5 h-5 sm:w-6 sm:h-6" />}
              </button>
            </div>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white">
            <nav className="max-w-7xl mx-auto px-3 py-2 space-y-0.5">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
                    location.pathname === item.path
                      ? "bg-slate-900 text-white"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.name}
                </Link>
              ))}
              
              {user && (
                <div className="px-3 py-2.5 border-t border-slate-200 mt-1.5 pt-3">
                  <div className="flex items-center justify-between">
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
                           user.user_type === 'agente' ? 'Agente' : 'Utilizador'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => base44.auth.logout()}
                      className="px-2.5 py-1 text-xs text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      Sair
                    </button>
                  </div>
                </div>
              )}

              {!user && (
                <button
                  onClick={() => base44.auth.redirectToLogin()}
                  className="w-full px-3 py-2.5 bg-slate-900 text-white rounded-lg font-medium text-sm hover:bg-slate-800 transition-colors duration-200"
                >
                  Entrar
                </button>
              )}
            </nav>
          </div>
        )}
      </header>

      <main className="pb-8">{children}</main>

      <footer className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white mt-16 md:mt-24 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
            backgroundSize: '32px 32px'
          }} />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Main Footer Content */}
          <div className="py-12 md:py-16">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12">
              {/* Brand Section */}
              <div className="lg:col-span-2">
                <img 
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6915a593b6edd8435f5838bd/359538617_Zugruppe01.jpg"
                  alt="Zugruppe"
                  className="h-12 mb-4 object-contain"
                />
                <p className="text-slate-400 text-sm leading-relaxed max-w-md mb-6">
                  Marketplace imobiliário premium que transforma a forma como compra, vende e gere propriedades. 
                  Tecnologia avançada para uma experiência imobiliária moderna.
                </p>
                <p className="text-slate-500 text-xs">
                  Privileged Approach Unipessoal Lda
                </p>
              </div>

              {/* Quick Links */}
              <div>
                <h3 className="font-semibold mb-4 text-white text-sm uppercase tracking-wider">
                  Navegação
                </h3>
                <div className="space-y-3">
                  {navItems.slice(0, 5).map((item) => (
                    <Link
                      key={item.name}
                      to={item.path}
                      className="block text-slate-400 hover:text-white text-sm transition-colors duration-200 hover:translate-x-1 transform"
                    >
                      → {item.name}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Contact Info */}
              <div>
                <h3 className="font-semibold mb-4 text-white text-sm uppercase tracking-wider">
                  Contacto
                </h3>
                <div className="space-y-3 text-sm text-slate-400">
                  <p className="flex items-start gap-2">
                    <span className="text-slate-500">📧</span>
                    <span>info@zugruppe.com</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="text-slate-500">📍</span>
                    <span>Portugal</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-slate-700/50 py-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-slate-500 text-xs text-center md:text-left">
                © {new Date().getFullYear()} Zugruppe. Todos os direitos reservados.
              </p>
              <div className="flex items-center gap-6 text-xs text-slate-500">
                <Link to={createPageUrl("PrivacyPolicy")} className="hover:text-white transition-colors">
                  Privacidade
                </Link>
                <span>•</span>
                <a href="#" className="hover:text-white transition-colors">
                  Termos
                </a>
                <span>•</span>
                <Link to={createPageUrl("DenunciationChannel")} className="hover:text-white transition-colors">
                  Canal de Denúncias
                </Link>
              </div>
            </div>
          </div>
        </div>
      </footer>
      </div>
      </LocalizationProvider>
      </HelmetProvider>
      );
      }