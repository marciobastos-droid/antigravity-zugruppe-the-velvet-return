import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Globe, ExternalLink, Home, Building2, TrendingUp, FileText } from "lucide-react";

const AVAILABLE_PORTALS = [
  { id: "idealista", name: "Idealista", icon: ExternalLink, color: "text-green-600" },
  { id: "imovirtual", name: "Imovirtual", icon: ExternalLink, color: "text-blue-600" },
  { id: "casafari", name: "Casafari", icon: ExternalLink, color: "text-orange-600" },
  { id: "olx", name: "OLX", icon: ExternalLink, color: "text-purple-600" },
  { id: "supercasa", name: "Supercasa", icon: ExternalLink, color: "text-red-600" },
  { id: "custojusto", name: "Custo Justo", icon: ExternalLink, color: "text-yellow-600" }
];

const AVAILABLE_PAGES = [
  { id: "zugruppe", name: "ZuGruppe", icon: Building2, description: "Listagem principal de imóveis" },
  { id: "zuhaus", name: "ZuHaus - Residencial", icon: Home, description: "Página dedicada a imóveis residenciais" },
  { id: "zuhandel", name: "ZuHandel - Comercial", icon: Building2, description: "Página dedicada a imóveis comerciais" },
  { id: "homepage_featured", name: "Homepage - Destaque", icon: Home, description: "Imóveis em destaque na página inicial" },
  { id: "investor_section", name: "Secção Investidores", icon: TrendingUp, description: "Página dedicada a investidores" },
  { id: "luxury_collection", name: "Coleção Luxo", icon: FileText, description: "Imóveis de luxo premium" }
];

export default function PublicationManager({ property, onChange }) {
  const [publishedPortals, setPublishedPortals] = React.useState(property?.published_portals || []);
  const [publishedPages, setPublishedPages] = React.useState(property?.published_pages || ["zugruppe"]);
  const [config, setConfig] = React.useState(property?.publication_config || {
    auto_publish: false,
    exclude_from_feeds: false
  });

  const updateParent = React.useCallback(() => {
    onChange({
      published_portals: publishedPortals,
      published_pages: publishedPages,
      publication_config: config
    });
  }, [publishedPortals, publishedPages, config, onChange]);

  const togglePortal = (portalId) => {
    setPublishedPortals(prev => {
      const newPortals = prev.includes(portalId)
        ? prev.filter(p => p !== portalId)
        : [...prev, portalId];
      
      // Update parent immediately
      setTimeout(() => {
        onChange({
          published_portals: newPortals,
          published_pages: publishedPages,
          publication_config: config
        });
      }, 0);
      
      return newPortals;
    });
  };

  const togglePage = (pageId) => {
    setPublishedPages(prev => {
      const newPages = prev.includes(pageId)
        ? prev.filter(p => p !== pageId)
        : [...prev, pageId];
      
      // Update parent immediately
      setTimeout(() => {
        onChange({
          published_portals: publishedPortals,
          published_pages: newPages,
          publication_config: config
        });
      }, 0);
      
      return newPages;
    });
  };

  return (
    <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Globe className="w-5 h-5 text-blue-600" />
          Gestão de Publicação
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Portais Imobiliários */}
        <div>
          <Label className="text-base font-semibold mb-3 block">Portais Imobiliários</Label>
          <p className="text-sm text-slate-600 mb-4">Selecione os portais onde este imóvel deve ser publicado</p>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {AVAILABLE_PORTALS.map((portal) => {
              const Icon = portal.icon;
              const isSelected = publishedPortals.includes(portal.id);
              
              return (
                <div
                  key={portal.id}
                  onClick={() => togglePortal(portal.id)}
                  className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    isSelected
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => togglePortal(portal.id)}
                  />
                  <Icon className={`w-5 h-5 ${isSelected ? portal.color : "text-slate-400"}`} />
                  <span className={`font-medium ${isSelected ? "text-slate-900" : "text-slate-600"}`}>
                    {portal.name}
                  </span>
                </div>
              );
            })}
          </div>
          
          {publishedPortals.length > 0 && (
            <div className="mt-3 flex items-center gap-2">
              <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
                {publishedPortals.length} {publishedPortals.length === 1 ? "portal selecionado" : "portais selecionados"}
              </Badge>
            </div>
          )}
        </div>

        {/* Páginas do Site */}
        <div>
          <Label className="text-base font-semibold mb-3 block">Páginas do Website</Label>
          <p className="text-sm text-slate-600 mb-4">Selecione as páginas onde este imóvel deve aparecer</p>
          
          <div className="space-y-2">
            {AVAILABLE_PAGES.map((page) => {
              const Icon = page.icon;
              const isSelected = publishedPages.includes(page.id);
              
              return (
                <div
                  key={page.id}
                  onClick={() => togglePage(page.id)}
                  className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    isSelected
                      ? "border-green-500 bg-green-50"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => togglePage(page.id)}
                    className="mt-0.5"
                  />
                  <Icon className={`w-5 h-5 mt-0.5 ${isSelected ? "text-green-600" : "text-slate-400"}`} />
                  <div className="flex-1">
                    <p className={`font-medium ${isSelected ? "text-slate-900" : "text-slate-600"}`}>
                      {page.name}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">{page.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
          
          {publishedPages.length > 0 && (
            <div className="mt-3 flex items-center gap-2">
              <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                {publishedPages.length} {publishedPages.length === 1 ? "página selecionada" : "páginas selecionadas"}
              </Badge>
            </div>
          )}
        </div>

        {/* Configurações Adicionais */}
        <div className="space-y-3 pt-4 border-t">
          <Label className="text-base font-semibold">Configurações</Label>
          
          <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
            <div>
              <p className="font-medium text-slate-900">Publicação Automática</p>
              <p className="text-sm text-slate-500">Publicar automaticamente em novos portais/páginas</p>
            </div>
            <Switch
              checked={config.auto_publish}
              onCheckedChange={(checked) => {
                const newConfig = { ...config, auto_publish: checked };
                setConfig(newConfig);
                setTimeout(() => {
                  onChange({
                    published_portals: publishedPortals,
                    published_pages: publishedPages,
                    publication_config: newConfig
                  });
                }, 0);
              }}
            />
          </div>
          
          <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
            <div>
              <p className="font-medium text-slate-900">Excluir de Feeds</p>
              <p className="text-sm text-slate-500">Não incluir em feeds XML/API automáticos</p>
            </div>
            <Switch
              checked={config.exclude_from_feeds}
              onCheckedChange={(checked) => {
                const newConfig = { ...config, exclude_from_feeds: checked };
                setConfig(newConfig);
                setTimeout(() => {
                  onChange({
                    published_portals: publishedPortals,
                    published_pages: publishedPages,
                    publication_config: newConfig
                  });
                }, 0);
              }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}