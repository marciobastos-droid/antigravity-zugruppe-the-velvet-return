import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Home, Plus, LayoutDashboard, MessageSquare, Building2, Users, Menu, X, Wrench, BarChart3, Sparkles, FileBarChart } from "lucide-react";
import { base44 } from "@/api/base44Client";
import NotificationBell from "./components/notifications/NotificationBell";

// Pages where layout should be minimal (no header/footer)
const MINIMAL_LAYOUT_PAGES = ["Home"];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [user, setUser] = React.useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

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
  const allNavItems = [
    { name: "Dashboard", path: createPageUrl("Dashboard"), icon: BarChart3, id: "nav-dashboard", visibility: 'all' },
    { name: "Navegar", path: createPageUrl("Browse"), icon: Building2, id: "nav-browse", visibility: 'all' },
    { name: "Imóveis", path: createPageUrl("MyListings"), icon: LayoutDashboard, id: "nav-properties", visibility: 'all' },
    { name: "CRM", path: createPageUrl("CRMAdvanced"), icon: Users, id: "nav-crm", visibility: 'all' },
    { name: "Tools", path: createPageUrl("Tools"), icon: Wrench, id: "nav-tools", visibility: ['admin', 'gestor'] },
    { name: "Relatórios", path: createPageUrl("Reports"), icon: FileBarChart, id: "nav-reports", visibility: ['admin', 'gestor', 'agente'] },
    { name: "Utilizadores", path: createPageUrl("UserManagement"), icon: Users, id: "nav-users", visibility: ['admin'] },
  ];

  // Filtrar itens baseado na visibilidade
  const navItems = allNavItems.filter(item => {
    if (item.visibility === 'all') return true;
    if (Array.isArray(item.visibility)) {
      return item.visibility.includes(userType) || (isAdmin && item.visibility.includes('admin'));
    }
    return item.visibility === userType || (isAdmin && item.visibility === 'admin');
  });

  return (
    <div className="min-h-screen bg-slate-50">
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
          <div className="flex justify-between items-center h-16 md:h-20">
            <Link to={createPageUrl("Home")} className="flex items-center gap-2 md:gap-3 group flex-shrink-0">
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6915a593b6edd8435f5838bd/359538617_Zugruppe01.jpg"
                alt="Zugruppe Logo"
                className="h-8 md:h-12 w-auto object-contain transform group-hover:scale-105 transition-transform duration-200"
              />
            </Link>

            <nav className="hidden lg:flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.path}
                  id={item.id}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
                    location.pathname === item.path
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.name}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-2 md:gap-3">
              {user && <NotificationBell user={user} />}
              {user ? (
                <div className="hidden md:flex items-center gap-3">
                  <div className="text-right hidden lg:block">
                    <p className="text-sm font-medium text-slate-900">{user.full_name}</p>
                    <p className="text-xs text-slate-500">
                      {user.user_type === 'admin' ? 'Administrador' : 
                       user.user_type === 'gestor' ? 'Gestor' : 
                       user.user_type === 'agente' ? 'Agente' : user.email}
                    </p>
                  </div>
                  <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-slate-700 to-slate-900 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-semibold text-xs md:text-sm">
                      {user.full_name?.[0]?.toUpperCase() || "U"}
                    </span>
                  </div>
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
                  className="hidden md:block px-3 md:px-4 py-2 bg-slate-900 text-white rounded-lg font-medium text-sm hover:bg-slate-800 transition-colors duration-200"
                >
                  Entrar
                </button>
              )}

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200 bg-white">
            <nav className="max-w-7xl mx-auto px-3 py-3 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-base transition-all duration-200 ${
                    location.pathname === item.path
                      ? "bg-slate-900 text-white"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </Link>
              ))}
              
              {user && (
                <div className="px-4 py-3 border-t border-slate-200 mt-2 pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-slate-700 to-slate-900 rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold text-sm">
                          {user.full_name?.[0]?.toUpperCase() || "U"}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{user.full_name}</p>
                        <p className="text-xs text-slate-500">
                          {user.user_type === 'admin' ? 'Administrador' : 
                           user.user_type === 'gestor' ? 'Gestor' : 
                           user.user_type === 'agente' ? 'Agente' : user.email}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => base44.auth.logout()}
                      className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      Sair
                    </button>
                  </div>
                </div>
              )}
              
              {!user && (
                <button
                  onClick={() => base44.auth.redirectToLogin()}
                  className="w-full px-4 py-3 bg-slate-900 text-white rounded-lg font-medium text-base hover:bg-slate-800 transition-colors duration-200"
                >
                  Entrar
                </button>
              )}
            </nav>
          </div>
        )}
      </header>

      <main className="pb-8">{children}</main>

      <footer className="bg-[#27251f] text-white mt-12 md:mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            <div>
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6915a593b6edd8435f5838bd/359538617_Zugruppe01.jpg"
                alt="Zugruppe Logo"
                className="h-8 md:h-10 w-auto object-contain mb-3 md:mb-4 brightness-0 invert"
              />
              <p className="text-white/70 text-sm">
                Privileged Approach Unipessoal Lda
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-3 md:mb-4 text-[#4cb5f5] text-base">Links Rápidos</h3>
              <div className="space-y-2">
                {navItems.slice(0, 5).map((item) => (
                  <Link
                    key={item.name}
                    to={item.path}
                    className="block text-white/70 hover:text-[#4cb5f5] text-sm transition-colors duration-200"
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-3 md:mb-4 text-[#4cb5f5] text-base">Contacto</h3>
              <p className="text-white/70 text-sm">
                Marketplace imobiliário premium
                <br />
                para uma vida moderna
              </p>
            </div>
          </div>
          <div className="border-t border-white/20 mt-6 md:mt-8 pt-6 md:pt-8 text-center text-white/50 text-xs md:text-sm">
            © 2025 Zugruppe. Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}