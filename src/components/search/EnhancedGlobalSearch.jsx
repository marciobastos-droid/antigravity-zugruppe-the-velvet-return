import React, { useState, useEffect, useRef, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  Search, Building2, Users, Target, Home, User, 
  MapPin, Euro, Phone, Mail, Calendar, Hash,
  TrendingUp, Clock, Filter, Sparkles
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";

export default function EnhancedGlobalSearch() {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeTab, setActiveTab] = useState("all");
  const [advancedMode, setAdvancedMode] = useState(false);
  const inputRef = useRef(null);

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus input when dialog opens
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setSearchTerm("");
      setSelectedIndex(0);
      setActiveTab("all");
    }
  }, [open]);

  // Fetch data with debounce
  const debouncedSearch = useDebounce(searchTerm, 300);

  const { data: properties = [], isLoading: loadingProps } = useQuery({
    queryKey: ['globalSearchProperties', debouncedSearch],
    queryFn: async () => {
      if (!debouncedSearch || debouncedSearch.length < 2) return [];
      const all = await base44.entities.Property.list('-updated_date', 100);
      return all.filter(p => 
        matchesSearch(p, debouncedSearch, ['title', 'city', 'state', 'address', 'ref_id', 'description'])
      ).slice(0, activeTab === "all" ? 5 : 20);
    },
    enabled: debouncedSearch.length >= 2
  });

  const { data: contacts = [], isLoading: loadingContacts } = useQuery({
    queryKey: ['globalSearchContacts', debouncedSearch],
    queryFn: async () => {
      if (!debouncedSearch || debouncedSearch.length < 2) return [];
      const all = await base44.entities.ClientContact.list('-updated_date', 100);
      return all.filter(c => 
        matchesSearch(c, debouncedSearch, ['full_name', 'email', 'phone', 'company_name', 'city'])
      ).slice(0, activeTab === "all" ? 5 : 20);
    },
    enabled: debouncedSearch.length >= 2
  });

  const { data: opportunities = [], isLoading: loadingOpps } = useQuery({
    queryKey: ['globalSearchOpportunities', debouncedSearch],
    queryFn: async () => {
      if (!debouncedSearch || debouncedSearch.length < 2) return [];
      const all = await base44.entities.Opportunity.list('-updated_date', 100);
      return all.filter(o => 
        matchesSearch(o, debouncedSearch, ['buyer_name', 'buyer_email', 'buyer_phone', 'location', 'property_title', 'ref_id'])
      ).slice(0, activeTab === "all" ? 5 : 20);
    },
    enabled: debouncedSearch.length >= 2
  });

  const { data: developments = [], isLoading: loadingDevs } = useQuery({
    queryKey: ['globalSearchDevelopments', debouncedSearch],
    queryFn: async () => {
      if (!debouncedSearch || debouncedSearch.length < 2) return [];
      const all = await base44.entities.Development.list('-updated_date', 50);
      return all.filter(d => 
        matchesSearch(d, debouncedSearch, ['name', 'city', 'developer', 'address'])
      ).slice(0, activeTab === "all" ? 5 : 20);
    },
    enabled: debouncedSearch.length >= 2
  });

  const isLoading = loadingProps || loadingContacts || loadingOpps || loadingDevs;
  const hasResults = properties.length > 0 || contacts.length > 0 || opportunities.length > 0 || developments.length > 0;

  // Flatten all results for keyboard navigation
  const allResults = useMemo(() => {
    if (activeTab === "properties") return properties.map(p => ({ type: 'property', data: p }));
    if (activeTab === "contacts") return contacts.map(c => ({ type: 'contact', data: c }));
    if (activeTab === "opportunities") return opportunities.map(o => ({ type: 'opportunity', data: o }));
    if (activeTab === "developments") return developments.map(d => ({ type: 'development', data: d }));
    
    return [
      ...properties.map(p => ({ type: 'property', data: p })),
      ...contacts.map(c => ({ type: 'contact', data: c })),
      ...opportunities.map(o => ({ type: 'opportunity', data: o })),
      ...developments.map(d => ({ type: 'development', data: d }))
    ];
  }, [properties, contacts, opportunities, developments, activeTab]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!open) return;
      
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, allResults.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && allResults[selectedIndex]) {
        e.preventDefault();
        handleSelect(allResults[selectedIndex]);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, allResults, selectedIndex]);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [debouncedSearch, activeTab]);

  const handleSelect = (result) => {
    setOpen(false);
  };

  const getResultUrl = (result) => {
    switch (result.type) {
      case 'property':
        return `${createPageUrl("PropertyDetails")}?id=${result.data.id}`;
      case 'contact':
        return `${createPageUrl("CRMAdvanced")}?tab=clients`;
      case 'opportunity':
        return `${createPageUrl("CRMAdvanced")}?tab=opportunities`;
      case 'development':
        return `${createPageUrl("MyListings")}`;
      default:
        return "#";
    }
  };

  const renderPropertyResult = (property, idx) => {
    const globalIdx = allResults.findIndex(r => r.type === 'property' && r.data.id === property.id);
    return (
      <Link
        key={property.id}
        to={`${createPageUrl("PropertyDetails")}?id=${property.id}`}
        onClick={() => setOpen(false)}
        className={`block px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors ${
          selectedIndex === globalIdx ? 'bg-slate-100' : ''
        }`}
      >
        <div className="flex items-start gap-3">
          {property.images?.[0] ? (
            <img src={property.images[0]} alt="" className="w-12 h-12 rounded object-cover flex-shrink-0" />
          ) : (
            <div className="w-12 h-12 bg-slate-100 rounded flex items-center justify-center flex-shrink-0">
              <Home className="w-6 h-6 text-slate-400" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-slate-900 truncate">{property.title}</p>
            <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 flex-wrap">
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {property.city}
              </span>
              <span className="flex items-center gap-1 text-green-600 font-semibold">
                <Euro className="w-3 h-3" />
                {property.price?.toLocaleString()}
              </span>
              {property.bedrooms > 0 && <span>T{property.bedrooms}</span>}
              {property.ref_id && (
                <Badge variant="outline" className="text-xs font-mono">{property.ref_id}</Badge>
              )}
            </div>
          </div>
        </div>
      </Link>
    );
  };

  const renderContactResult = (contact) => {
    const globalIdx = allResults.findIndex(r => r.type === 'contact' && r.data.id === contact.id);
    return (
      <Link
        key={contact.id}
        to={`${createPageUrl("CRMAdvanced")}?tab=clients`}
        onClick={() => setOpen(false)}
        className={`block px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors ${
          selectedIndex === globalIdx ? 'bg-slate-100' : ''
        }`}
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white font-semibold text-sm">
              {contact.full_name?.[0]?.toUpperCase() || '?'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-slate-900 truncate">{contact.full_name}</p>
            <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 flex-wrap">
              {contact.email && (
                <span className="flex items-center gap-1 truncate">
                  <Mail className="w-3 h-3" />
                  {contact.email}
                </span>
              )}
              {contact.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {contact.phone}
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>
    );
  };

  const renderOpportunityResult = (opp) => {
    const globalIdx = allResults.findIndex(r => r.type === 'opportunity' && r.data.id === opp.id);
    return (
      <Link
        key={opp.id}
        to={`${createPageUrl("CRMAdvanced")}?tab=opportunities`}
        onClick={() => setOpen(false)}
        className={`block px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors ${
          selectedIndex === globalIdx ? 'bg-slate-100' : ''
        }`}
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center flex-shrink-0">
            <Target className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-slate-900 truncate">{opp.buyer_name}</p>
            <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 flex-wrap">
              {opp.property_title && (
                <span className="flex items-center gap-1 truncate">
                  <Building2 className="w-3 h-3" />
                  {opp.property_title}
                </span>
              )}
              {opp.status && (
                <Badge variant="outline" className="text-xs">
                  {opp.status === 'new' ? 'Novo' :
                   opp.status === 'contacted' ? 'Contactado' :
                   opp.status === 'won' ? 'Ganho' : opp.status}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </Link>
    );
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
      >
        <Search className="w-4 h-4" />
        <span className="hidden lg:inline">Pesquisar...</span>
        <kbd className="hidden lg:inline-flex items-center gap-1 px-2 py-0.5 text-xs font-mono bg-slate-100 border border-slate-300 rounded">
          <span>⌘K</span>
        </kbd>
      </button>

      {/* Search Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl p-0 gap-0 max-h-[90vh]">
          {/* Search Input */}
          <div className="p-4 border-b sticky top-0 bg-white z-10">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                ref={inputRef}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Pesquisar em tudo... (imóveis, contactos, oportunidades)"
                className="pl-10 h-12 text-base border-0 focus-visible:ring-0"
              />
            </div>
            
            {/* Category Tabs */}
            {searchTerm.length >= 2 && (
              <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-3">
                <TabsList className="grid w-full grid-cols-5 h-9">
                  <TabsTrigger value="all" className="text-xs">
                    Todos ({properties.length + contacts.length + opportunities.length + developments.length})
                  </TabsTrigger>
                  <TabsTrigger value="properties" className="text-xs">
                    Imóveis ({properties.length})
                  </TabsTrigger>
                  <TabsTrigger value="contacts" className="text-xs">
                    Contactos ({contacts.length})
                  </TabsTrigger>
                  <TabsTrigger value="opportunities" className="text-xs">
                    Oportunidades ({opportunities.length})
                  </TabsTrigger>
                  <TabsTrigger value="developments" className="text-xs">
                    Empreend. ({developments.length})
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            )}
          </div>

          {/* Results */}
          <ScrollArea className="max-h-[calc(90vh-180px)]">
            <div className="p-4">
              {searchTerm.length < 2 ? (
                <div className="text-center py-12 text-slate-500">
                  <Search className="w-16 h-16 mx-auto mb-4 opacity-20" />
                  <p className="text-base font-medium mb-2">Busca Global Inteligente</p>
                  <p className="text-sm">Digite pelo menos 2 caracteres para pesquisar</p>
                  <div className="mt-6 space-y-2 text-xs">
                    <p className="flex items-center justify-center gap-2">
                      <Building2 className="w-4 h-4" /> Imóveis por título, cidade, morada, ref
                    </p>
                    <p className="flex items-center justify-center gap-2">
                      <Users className="w-4 h-4" /> Contactos por nome, email, telefone
                    </p>
                    <p className="flex items-center justify-center gap-2">
                      <Target className="w-4 h-4" /> Oportunidades por comprador, imóvel
                    </p>
                  </div>
                </div>
              ) : isLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-900 mx-auto" />
                  <p className="text-sm text-slate-500 mt-3">A pesquisar em todas as bases de dados...</p>
                </div>
              ) : !hasResults ? (
                <div className="text-center py-12 text-slate-500">
                  <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium">Nenhum resultado encontrado</p>
                  <p className="text-xs mt-1">Tente com outros termos de pesquisa</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {(activeTab === "all" || activeTab === "properties") && properties.length > 0 && (
                    <div>
                      <h3 className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2 sticky top-0 bg-white">
                        <Building2 className="w-4 h-4" />
                        Imóveis ({properties.length})
                      </h3>
                      <div className="space-y-1">
                        {properties.map((property, idx) => renderPropertyResult(property, idx))}
                      </div>
                    </div>
                  )}

                  {(activeTab === "all" || activeTab === "contacts") && contacts.length > 0 && (
                    <div>
                      <h3 className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2 sticky top-0 bg-white">
                        <Users className="w-4 h-4" />
                        Contactos ({contacts.length})
                      </h3>
                      <div className="space-y-1">
                        {contacts.map((contact) => renderContactResult(contact))}
                      </div>
                    </div>
                  )}

                  {(activeTab === "all" || activeTab === "opportunities") && opportunities.length > 0 && (
                    <div>
                      <h3 className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2 sticky top-0 bg-white">
                        <Target className="w-4 h-4" />
                        Oportunidades ({opportunities.length})
                      </h3>
                      <div className="space-y-1">
                        {opportunities.map((opp) => renderOpportunityResult(opp))}
                      </div>
                    </div>
                  )}

                  {(activeTab === "all" || activeTab === "developments") && developments.length > 0 && (
                    <div>
                      <h3 className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2 sticky top-0 bg-white">
                        <Building2 className="w-4 h-4" />
                        Empreendimentos ({developments.length})
                      </h3>
                      <div className="space-y-1">
                        {developments.map((dev) => {
                          const globalIdx = allResults.findIndex(r => r.type === 'development' && r.data.id === dev.id);
                          return (
                            <Link
                              key={dev.id}
                              to={`${createPageUrl("MyListings")}`}
                              onClick={() => setOpen(false)}
                              className={`block px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors ${
                                selectedIndex === globalIdx ? 'bg-slate-100' : ''
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                {dev.images?.[0] ? (
                                  <img src={dev.images[0]} alt="" className="w-12 h-12 rounded object-cover flex-shrink-0" />
                                ) : (
                                  <div className="w-12 h-12 bg-purple-100 rounded flex items-center justify-center flex-shrink-0">
                                    <Building2 className="w-6 h-6 text-purple-600" />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-slate-900 truncate">{dev.name}</p>
                                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                                    <span className="flex items-center gap-1">
                                      <MapPin className="w-3 h-3" />
                                      {dev.city}
                                    </span>
                                    {dev.developer && (
                                      <span className="truncate">{dev.developer}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Footer */}
          {hasResults && (
            <div className="p-3 border-t bg-slate-50 flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <kbd className="px-2 py-0.5 bg-white border rounded">↑↓</kbd>
                  Navegar
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-2 py-0.5 bg-white border rounded">Enter</kbd>
                  Abrir
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-2 py-0.5 bg-white border rounded">Esc</kbd>
                  Fechar
                </span>
              </div>
              <span className="font-medium">{allResults.length} resultados totais</span>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// Debounce hook
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

// Search matcher helper
function matchesSearch(item, searchTerm, fields) {
  const lowerSearch = searchTerm.toLowerCase();
  return fields.some(field => {
    const value = item[field];
    if (!value) return false;
    return String(value).toLowerCase().includes(lowerSearch);
  });
}