import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Globe, Settings, RefreshCw, CheckCircle2, XCircle, 
  Loader2, Download, Upload, ExternalLink, Clock,
  Building2, MapPin, Euro, Bed, AlertCircle, Sparkles,
  Eye, Trash2, Link2, Unlink, Calendar, TrendingUp,
  Search, Filter, MoreHorizontal, Play, Pause
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const PORTALS = [
  {
    id: "idealista",
    name: "Idealista",
    domain: "idealista.pt",
    logo: "https://www.idealista.pt/favicon.ico",
    color: "bg-yellow-100 text-yellow-800 border-yellow-300",
    description: "Portal líder em Portugal e Espanha",
    features: ["Importação de listagens", "Sincronização automática", "Exportação XML"]
  },
  {
    id: "imovirtual",
    name: "Imovirtual",
    domain: "imovirtual.com",
    logo: "https://www.imovirtual.com/favicon.ico",
    color: "bg-green-100 text-green-800 border-green-300",
    description: "Um dos maiores portais imobiliários",
    features: ["Importação de listagens", "Feed XML", "API REST"]
  },
  {
    id: "casasapo",
    name: "Casa Sapo",
    domain: "casa.sapo.pt",
    logo: "https://casa.sapo.pt/favicon.ico",
    color: "bg-blue-100 text-blue-800 border-blue-300",
    description: "Portal tradicional português",
    features: ["Importação de listagens", "Sincronização"]
  },
  {
    id: "supercasa",
    name: "Supercasa",
    domain: "supercasa.pt",
    logo: "https://supercasa.pt/favicon.ico",
    color: "bg-red-100 text-red-800 border-red-300",
    description: "Portal premium de imóveis",
    features: ["Importação de listagens", "API"]
  },
  {
    id: "remax",
    name: "RE/MAX",
    domain: "remax.pt",
    logo: "https://www.remax.pt/favicon.ico",
    color: "bg-red-100 text-red-800 border-red-300",
    description: "Rede imobiliária internacional",
    features: ["Importação de listagens"]
  },
  {
    id: "era",
    name: "ERA",
    domain: "era.pt",
    logo: "https://www.era.pt/favicon.ico",
    color: "bg-orange-100 text-orange-800 border-orange-300",
    description: "Rede imobiliária nacional",
    features: ["Importação de listagens"]
  }
];

export default function PortalIntegrations() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = React.useState("portals");
  const [selectedPortal, setSelectedPortal] = React.useState(null);
  const [configDialogOpen, setConfigDialogOpen] = React.useState(false);
  const [importDialogOpen, setImportDialogOpen] = React.useState(false);
  const [importing, setImporting] = React.useState(false);
  const [importProgress, setImportProgress] = React.useState("");
  const [searchUrl, setSearchUrl] = React.useState("");
  const [importedListings, setImportedListings] = React.useState([]);
  const [selectedListings, setSelectedListings] = React.useState([]);
  const [syncSchedule, setSyncSchedule] = React.useState("manual");

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  // Get portal configurations from user data
  const portalConfigs = user?.portal_integrations || {};

  const saveMutation = useMutation({
    mutationFn: async (configs) => {
      await base44.auth.updateMe({ portal_integrations: configs });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      toast.success("Configuração guardada!");
    }
  });

  const importFromPortal = async (portalId, url) => {
    setImporting(true);
    setImportProgress("A analisar URL...");
    setImportedListings([]);

    try {
      const portal = PORTALS.find(p => p.id === portalId);
      
      // Use Gemini API for intelligent extraction
      setImportProgress(`A extrair listagens de ${portal.name}...`);
      
      const { data } = await base44.functions.invoke('searchPropertyAI', { url });

      if (!data.success) {
        throw new Error(data.error || 'Erro ao extrair dados');
      }

      const properties = Array.isArray(data.property) ? data.property : [data.property];
      
      setImportedListings(properties.map((p, idx) => ({
        ...p,
        id: `temp_${idx}`,
        portal: portalId,
        source_url: url,
        selected: true
      })));

      setImportProgress("");
      toast.success(`${properties.length} imóvel(is) encontrado(s)!`);

    } catch (error) {
      console.error("Import error:", error);
      toast.error(error.message || "Erro ao importar");
      setImportProgress("");
    }

    setImporting(false);
  };

  const importMultipleListings = async () => {
    const toImport = importedListings.filter(l => selectedListings.includes(l.id));
    
    if (toImport.length === 0) {
      toast.error("Selecione pelo menos um imóvel");
      return;
    }

    setImporting(true);
    setImportProgress(`A importar ${toImport.length} imóveis...`);

    try {
      // Generate ref_ids
      const { data: refData } = await base44.functions.invoke('generateRefId', { 
        entity_type: 'Property', 
        count: toImport.length 
      });
      const refIds = refData.ref_ids || [refData.ref_id];

      const propertiesToCreate = toImport.map((p, idx) => ({
        title: p.title,
        description: p.description,
        property_type: p.property_type || 'apartment',
        listing_type: p.listing_type || 'sale',
        price: p.price,
        bedrooms: p.bedrooms,
        bathrooms: p.bathrooms,
        square_feet: p.square_feet,
        address: p.address || p.city,
        city: p.city,
        state: p.state || p.city,
        images: p.images || [],
        amenities: p.amenities || [],
        source_url: p.source_url,
        external_id: p.external_id,
        ref_id: refIds[idx],
        status: "active"
      }));

      await base44.entities.Property.bulkCreate(propertiesToCreate);

      queryClient.invalidateQueries({ queryKey: ['properties'] });
      toast.success(`${toImport.length} imóveis importados!`);
      setImportDialogOpen(false);
      setImportedListings([]);
      setSelectedListings([]);

    } catch (error) {
      toast.error("Erro ao guardar imóveis");
    }

    setImporting(false);
    setImportProgress("");
  };

  const togglePortalActive = (portalId) => {
    const currentConfigs = { ...portalConfigs };
    if (!currentConfigs[portalId]) {
      currentConfigs[portalId] = { active: true, lastSync: null };
    } else {
      currentConfigs[portalId].active = !currentConfigs[portalId].active;
    }
    saveMutation.mutate(currentConfigs);
  };

  const openImportDialog = (portal) => {
    setSelectedPortal(portal);
    setSearchUrl("");
    setImportedListings([]);
    setSelectedListings([]);
    setImportDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-indigo-600 rounded-xl">
                <Globe className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Integrações com Portais</h2>
                <p className="text-slate-600">Importe listagens de portais imobiliários automaticamente</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline" className="text-indigo-700 border-indigo-300">
                {PORTALS.length} portais disponíveis
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="portals">Portais</TabsTrigger>
          <TabsTrigger value="import">Importação Rápida</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
        </TabsList>

        {/* Portals Tab */}
        <TabsContent value="portals" className="mt-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {PORTALS.map((portal) => {
              const config = portalConfigs[portal.id] || {};
              const isActive = config.active;

              return (
                <Card key={portal.id} className={`transition-all hover:shadow-lg ${isActive ? 'border-green-300' : ''}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${portal.color}`}>
                          <Globe className="w-5 h-5" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{portal.name}</CardTitle>
                          <p className="text-xs text-slate-500">{portal.domain}</p>
                        </div>
                      </div>
                      <Switch
                        checked={isActive}
                        onCheckedChange={() => togglePortalActive(portal.id)}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-slate-600">{portal.description}</p>
                    
                    <div className="flex flex-wrap gap-1">
                      {portal.features.map((feature, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                    </div>

                    {config.lastSync && (
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <Clock className="w-3 h-3" />
                        Última sync: {format(new Date(config.lastSync), "dd/MM HH:mm")}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => openImportDialog(portal)}
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Importar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedPortal(portal);
                          setConfigDialogOpen(true);
                        }}
                      >
                        <Settings className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Quick Import Tab */}
        <TabsContent value="import" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                Importação Rápida com IA
              </CardTitle>
              <p className="text-sm text-slate-500">
                Cole o URL de qualquer imóvel ou pesquisa e a IA extrairá os dados automaticamente
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <div className="flex-1">
                  <Input
                    value={searchUrl}
                    onChange={(e) => setSearchUrl(e.target.value)}
                    placeholder="https://www.idealista.pt/imovel/12345678/ ou URL de pesquisa..."
                    className="text-sm"
                  />
                </div>
                <Button
                  onClick={() => {
                    const portal = PORTALS.find(p => searchUrl.includes(p.domain));
                    if (portal) {
                      importFromPortal(portal.id, searchUrl);
                    } else {
                      importFromPortal("other", searchUrl);
                    }
                  }}
                  disabled={!searchUrl || importing}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {importing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {importProgress}
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Importar com IA
                    </>
                  )}
                </Button>
              </div>

              {/* Detected Portal */}
              {searchUrl && (
                <div className="flex items-center gap-2">
                  {PORTALS.find(p => searchUrl.includes(p.domain)) ? (
                    <Badge className={PORTALS.find(p => searchUrl.includes(p.domain))?.color}>
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      {PORTALS.find(p => searchUrl.includes(p.domain))?.name} detetado
                    </Badge>
                  ) : (
                    <Badge variant="outline">
                      Portal genérico - extração com IA
                    </Badge>
                  )}
                </div>
              )}

              {/* Imported Listings Preview */}
              {importedListings.length > 0 && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-slate-900">
                      {importedListings.length} imóvel(is) encontrado(s)
                    </h4>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedListings(
                          selectedListings.length === importedListings.length
                            ? []
                            : importedListings.map(l => l.id)
                        )}
                      >
                        {selectedListings.length === importedListings.length ? 'Desselecionar' : 'Selecionar'} Todos
                      </Button>
                      <Button
                        size="sm"
                        onClick={importMultipleListings}
                        disabled={selectedListings.length === 0 || importing}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Importar {selectedListings.length} Selecionados
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-3 max-h-[400px] overflow-y-auto">
                    {importedListings.map((listing) => (
                      <Card key={listing.id} className={`transition-all ${selectedListings.includes(listing.id) ? 'border-green-500 bg-green-50' : ''}`}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            <Checkbox
                              checked={selectedListings.includes(listing.id)}
                              onCheckedChange={(checked) => {
                                setSelectedListings(
                                  checked
                                    ? [...selectedListings, listing.id]
                                    : selectedListings.filter(id => id !== listing.id)
                                );
                              }}
                            />
                            
                            {listing.images?.[0] && (
                              <img
                                src={listing.images[0]}
                                alt=""
                                className="w-24 h-20 object-cover rounded-lg"
                                onError={(e) => e.target.style.display = 'none'}
                              />
                            )}

                            <div className="flex-1 min-w-0">
                              <h5 className="font-semibold text-slate-900 truncate">{listing.title}</h5>
                              <div className="flex flex-wrap gap-2 mt-1 text-sm text-slate-600">
                                {listing.price > 0 && (
                                  <span className="flex items-center gap-1">
                                    <Euro className="w-3 h-3" />
                                    €{listing.price?.toLocaleString()}
                                  </span>
                                )}
                                {listing.city && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    {listing.city}
                                  </span>
                                )}
                                {listing.bedrooms > 0 && (
                                  <span className="flex items-center gap-1">
                                    <Bed className="w-3 h-3" />
                                    T{listing.bedrooms}
                                  </span>
                                )}
                              </div>
                            </div>

                            <a
                              href={listing.source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-700"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Supported Portals */}
              <div className="bg-slate-50 rounded-lg p-4 mt-4">
                <h4 className="text-sm font-medium text-slate-700 mb-2">Portais suportados:</h4>
                <div className="flex flex-wrap gap-2">
                  {PORTALS.map((portal) => (
                    <Badge key={portal.id} className={portal.color}>
                      {portal.name}
                    </Badge>
                  ))}
                  <Badge variant="outline">+ Qualquer URL com IA</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Histórico de Importações
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-slate-500">
                <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Histórico de importações aparecerá aqui</p>
                <p className="text-sm">Importe imóveis para ver o histórico</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedPortal && (
                <>
                  <div className={`p-2 rounded-lg ${selectedPortal.color}`}>
                    <Globe className="w-5 h-5" />
                  </div>
                  Importar de {selectedPortal?.name}
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>URL do imóvel ou pesquisa</Label>
              <Input
                value={searchUrl}
                onChange={(e) => setSearchUrl(e.target.value)}
                placeholder={`https://www.${selectedPortal?.domain}/imovel/...`}
                className="mt-1"
              />
            </div>

            <Button
              onClick={() => importFromPortal(selectedPortal?.id, searchUrl)}
              disabled={!searchUrl || importing}
              className="w-full"
            >
              {importing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {importProgress}
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Extrair Listagens
                </>
              )}
            </Button>

            {/* Results */}
            {importedListings.length > 0 && (
              <div className="space-y-3 pt-4 border-t max-h-[300px] overflow-y-auto">
                {importedListings.map((listing) => (
                  <div key={listing.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <Checkbox
                      checked={selectedListings.includes(listing.id)}
                      onCheckedChange={(checked) => {
                        setSelectedListings(
                          checked
                            ? [...selectedListings, listing.id]
                            : selectedListings.filter(id => id !== listing.id)
                        );
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{listing.title}</p>
                      <p className="text-sm text-slate-500">
                        €{listing.price?.toLocaleString()} • {listing.city}
                      </p>
                    </div>
                  </div>
                ))}

                <Button
                  onClick={importMultipleListings}
                  disabled={selectedListings.length === 0 || importing}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  Importar {selectedListings.length} Imóveis
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Config Dialog */}
      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Configurar {selectedPortal?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Sincronização Automática</Label>
              <Select value={syncSchedule} onValueChange={setSyncSchedule}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="daily">Diária</SelectItem>
                  <SelectItem value="weekly">Semanal</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500 mt-1">
                Define a frequência de verificação de novos imóveis
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                💡 A integração usa IA para extrair dados automaticamente de qualquer URL do portal.
              </p>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setConfigDialogOpen(false)} className="flex-1">
                Cancelar
              </Button>
              <Button className="flex-1" onClick={() => {
                toast.success("Configuração guardada!");
                setConfigDialogOpen(false);
              }}>
                Guardar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}