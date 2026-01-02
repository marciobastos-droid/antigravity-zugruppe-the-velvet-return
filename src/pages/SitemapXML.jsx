import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Loader2, CheckCircle, AlertCircle, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function SitemapXML() {
  const [sitemapUrl, setSitemapUrl] = React.useState("");

  const { data: properties = [], isLoading } = useQuery({
    queryKey: ['allPropertiesForSitemap'],
    queryFn: () => base44.entities.Property.filter({ 
      status: 'active', 
      visibility: 'public' 
    })
  });

  React.useEffect(() => {
    // Gerar URL do sitemap
    const url = `${window.location.origin}/api/functions/generateSitemap`;
    setSitemapUrl(url);
  }, []);

  const stats = React.useMemo(() => {
    const published = properties.filter(p => 
      Array.isArray(p.published_pages) && p.published_pages.length > 0
    );
    const withSlugs = properties.filter(p => p.slug);
    const withoutSlugs = properties.filter(p => !p.slug);

    return {
      total: properties.length,
      published: published.length,
      withSlugs: withSlugs.length,
      withoutSlugs: withoutSlugs.length
    };
  }, [properties]);

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Sitemap.xml</h1>
          <p className="text-slate-600">Gerador e visualizador do sitemap para SEO</p>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-slate-600">Total Imóveis</div>
              <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-slate-600">Publicados</div>
              <div className="text-2xl font-bold text-green-600">{stats.published}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-slate-600">Com Slug</div>
              <div className="text-2xl font-bold text-blue-600">{stats.withSlugs}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-slate-600">Sem Slug</div>
              <div className="text-2xl font-bold text-amber-600">{stats.withoutSlugs}</div>
            </CardContent>
          </Card>
        </div>

        {/* Sitemap URL */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>URL do Sitemap</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 mb-4">
              <code className="flex-1 bg-slate-100 px-4 py-2 rounded-lg text-sm font-mono overflow-x-auto">
                {sitemapUrl}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(sitemapUrl);
                }}
              >
                Copiar
              </Button>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => window.open(sitemapUrl, '_blank')}
                className="flex-1"
              >
                <Download className="w-4 h-4 mr-2" />
                Visualizar Sitemap
              </Button>
            </div>

            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">Como submeter ao Google</h4>
              <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                <li>Aceda ao Google Search Console</li>
                <li>Selecione a propriedade do website</li>
                <li>Vá a "Sitemaps" no menu lateral</li>
                <li>Cole o URL do sitemap e clique em "Submeter"</li>
              </ol>
            </div>
          </CardContent>
        </Card>

        {/* Properties with/without slugs */}
        {isLoading ? (
          <Card>
            <CardContent className="p-8 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Estado dos URLs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {properties.slice(0, 10).map((property) => {
                  const hasSlug = !!property.slug;
                  const isPublished = Array.isArray(property.published_pages) && 
                                     property.published_pages.length > 0;

                  return (
                    <div 
                      key={property.id} 
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-slate-900 truncate">{property.title}</div>
                        <div className="text-xs text-slate-500 font-mono truncate">
                          {hasSlug ? (
                            <span className="text-green-600">
                              /property-details?slug={property.slug}
                            </span>
                          ) : (
                            <span className="text-amber-600">
                              /property-details?id={property.id}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        {hasSlug ? (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            SEO
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-800">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Sem Slug
                          </Badge>
                        )}
                        {!isPublished && (
                          <Badge variant="outline" className="text-slate-600">
                            Não Publicado
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {properties.length > 10 && (
                <p className="text-sm text-slate-500 text-center mt-4">
                  A mostrar 10 de {properties.length} imóveis
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}