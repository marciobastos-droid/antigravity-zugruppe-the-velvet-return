import React from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Globe, Building2, ExternalLink, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

// Portal definitions with URLs
const PORTAL_INFO = {
  idealista: { name: "Idealista", icon: Building2, color: "bg-yellow-100 text-yellow-800", urlPattern: null },
  imovirtual: { name: "Imovirtual", icon: Building2, color: "bg-blue-100 text-blue-800", urlPattern: null },
  custojusto: { name: "CustoJusto", icon: Building2, color: "bg-green-100 text-green-800", urlPattern: null },
  olx: { name: "OLX", icon: Building2, color: "bg-purple-100 text-purple-800", urlPattern: null },
  facebook: { name: "Facebook Marketplace", icon: Building2, color: "bg-indigo-100 text-indigo-800", urlPattern: null },
  casafari: { name: "Casafari", icon: Building2, color: "bg-orange-100 text-orange-800", urlPattern: null },
};

const PAGE_INFO = {
  zugruppe: { 
    name: "ZuGruppe Website", 
    icon: Globe, 
    color: "bg-slate-100 text-slate-800",
    getUrl: (propertyId) => `${window.location.origin}/PropertyDetails?id=${propertyId}`
  },
  landing_page: { 
    name: "Landing Page", 
    icon: Globe, 
    color: "bg-emerald-100 text-emerald-800",
    getUrl: null
  },
};

export default function PublicationStatus({ property, variant = "detailed" }) {
  const publishedPortals = property.published_portals || [];
  const publishedPages = property.published_pages || [];
  const excludedFromFeeds = property.publication_config?.exclude_from_feeds || false;

  // Detailed view for property details page
  if (variant === "detailed") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Estado de Publicação
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Website Pages */}
          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Páginas do Website
            </h4>
            {publishedPages.length === 0 ? (
              <p className="text-sm text-slate-500">Não publicado em nenhuma página</p>
            ) : (
              <div className="space-y-2">
                {publishedPages.map((pageKey) => {
                  const pageInfo = PAGE_INFO[pageKey] || { 
                    name: pageKey, 
                    icon: Globe, 
                    color: "bg-gray-100 text-gray-800" 
                  };
                  const Icon = pageInfo.icon;
                  const pageUrl = pageInfo.getUrl ? pageInfo.getUrl(property.id) : null;

                  return (
                    <div key={pageKey} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <Icon className="w-4 h-4 text-slate-600" />
                        <span className="font-medium text-slate-900">{pageInfo.name}</span>
                        <Badge className="bg-green-100 text-green-800 border-green-300">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Publicado
                        </Badge>
                      </div>
                      {pageUrl && (
                        <a href={pageUrl} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" size="sm" className="gap-2">
                            <ExternalLink className="w-3 h-3" />
                            Ver Anúncio
                          </Button>
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Real Estate Portals */}
          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Portais Imobiliários
            </h4>
            {publishedPortals.length === 0 ? (
              <p className="text-sm text-slate-500">Não publicado em nenhum portal</p>
            ) : (
              <div className="space-y-2">
                {publishedPortals.map((portalKey) => {
                  const portalInfo = PORTAL_INFO[portalKey] || { 
                    name: portalKey, 
                    icon: Building2, 
                    color: "bg-gray-100 text-gray-800" 
                  };
                  const Icon = portalInfo.icon;

                  return (
                    <div key={portalKey} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <Icon className="w-4 h-4 text-slate-600" />
                        <span className="font-medium text-slate-900">{portalInfo.name}</span>
                        <Badge className="bg-green-100 text-green-800 border-green-300">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Publicado
                        </Badge>
                      </div>
                      {property.external_id && (
                        <Badge variant="outline" className="text-xs">
                          ID: {property.external_id}
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Feed Status */}
          {excludedFromFeeds && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center gap-2 text-amber-800">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Excluído de Feeds XML/API</span>
              </div>
            </div>
          )}

          {/* Summary */}
          <div className="pt-4 border-t">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-900">{publishedPages.length}</div>
                <div className="text-xs text-blue-600">Páginas</div>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-900">{publishedPortals.length}</div>
                <div className="text-xs text-purple-600">Portais</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Compact badges for table view
  if (variant === "badges") {
    const totalChannels = publishedPages.length + publishedPortals.length;
    
    if (totalChannels === 0) {
      return (
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-slate-400">
          Não publicado
        </Badge>
      );
    }

    return (
      <div className="flex items-center gap-0.5 flex-wrap">
        {publishedPages.length > 0 && (
          <Badge className="bg-blue-100 text-blue-800 border-blue-300 text-[10px] px-1.5 py-0.5 leading-tight">
            <Globe className="w-2.5 h-2.5 mr-0.5" />
            {publishedPages.length}
          </Badge>
        )}
        {publishedPortals.length > 0 && (
          <Badge className="bg-purple-100 text-purple-800 border-purple-300 text-[10px] px-1.5 py-0.5 leading-tight">
            <Building2 className="w-2.5 h-2.5 mr-0.5" />
            {publishedPortals.length}
          </Badge>
        )}
      </div>
    );
  }

  // Icons only for very compact view
  if (variant === "icons") {
    const totalChannels = publishedPages.length + publishedPortals.length;
    
    if (totalChannels === 0) {
      return null;
    }

    return (
      <div className="flex items-center gap-1" title={`Publicado em ${totalChannels} canal${totalChannels > 1 ? 'is' : ''}`}>
        {publishedPages.length > 0 && (
          <div className="w-5 h-5 bg-blue-100 rounded flex items-center justify-center" title={`${publishedPages.length} página${publishedPages.length > 1 ? 's' : ''}`}>
            <Globe className="w-3 h-3 text-blue-600" />
          </div>
        )}
        {publishedPortals.length > 0 && (
          <div className="w-5 h-5 bg-purple-100 rounded flex items-center justify-center" title={`${publishedPortals.length} portal${publishedPortals.length > 1 ? 'is' : ''}`}>
            <Building2 className="w-3 h-3 text-purple-600" />
          </div>
        )}
      </div>
    );
  }

  return null;
}