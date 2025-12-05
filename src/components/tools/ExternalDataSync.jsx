import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Globe, Loader2, Check, AlertTriangle, Building2, Users, Target,
  Download, ExternalLink, Search, RefreshCw, FileJson, Eye, X
} from "lucide-react";
import { toast } from "sonner";

const dataTypes = [
  { value: "properties", label: "Imóveis", icon: Building2, entity: "Property" },
  { value: "contacts", label: "Contactos", icon: Users, entity: "ClientContact" },
  { value: "opportunities", label: "Oportunidades", icon: Target, entity: "Opportunity" }
];

export default function ExternalDataSync() {
  const queryClient = useQueryClient();
  const [url, setUrl] = useState("");
  const [dataType, setDataType] = useState("properties");
  const [extractedData, setExtractedData] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [activeTab, setActiveTab] = useState("input");
  const [importResult, setImportResult] = useState(null);

  const fetchMutation = useMutation({
    mutationFn: async () => {
      if (!url) throw new Error("URL é obrigatório");

      // Use LLM to extract structured data from the URL
      const typeConfig = dataTypes.find(t => t.value === dataType);
      
      let schema;
      if (dataType === "properties") {
        schema = {
          type: "object",
          properties: {
            items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  price: { type: "number" },
                  property_type: { type: "string" },
                  listing_type: { type: "string" },
                  bedrooms: { type: "number" },
                  bathrooms: { type: "number" },
                  area: { type: "number" },
                  address: { type: "string" },
                  city: { type: "string" },
                  state: { type: "string" },
                  images: { type: "array", items: { type: "string" } },
                  amenities: { type: "array", items: { type: "string" } },
                  external_id: { type: "string" },
                  source_url: { type: "string" }
                }
              }
            },
            source_name: { type: "string" },
            total_found: { type: "number" }
          }
        };
      } else if (dataType === "contacts") {
        schema = {
          type: "object",
          properties: {
            items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  full_name: { type: "string" },
                  email: { type: "string" },
                  phone: { type: "string" },
                  company_name: { type: "string" },
                  job_title: { type: "string" },
                  city: { type: "string" },
                  notes: { type: "string" }
                }
              }
            },
            source_name: { type: "string" },
            total_found: { type: "number" }
          }
        };
      } else {
        schema = {
          type: "object",
          properties: {
            items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  buyer_name: { type: "string" },
                  buyer_email: { type: "string" },
                  buyer_phone: { type: "string" },
                  location: { type: "string" },
                  budget: { type: "number" },
                  property_type_interest: { type: "string" },
                  message: { type: "string" },
                  lead_source: { type: "string" }
                }
              }
            },
            source_name: { type: "string" },
            total_found: { type: "number" }
          }
        };
      }

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Analisa o conteúdo desta página web e extrai TODOS os dados de ${typeConfig.label.toLowerCase()} que encontrares.

URL: ${url}

INSTRUÇÕES:
- Extrai TODOS os registos que encontrares na página
- Mantém os dados o mais completos possível
- Se for uma lista, extrai cada item individualmente
- Inclui o nome/fonte do site em source_name
- Para imóveis: extrai preço, tipo, localização, área, quartos, fotos
- Para contactos: extrai nome, email, telefone, empresa
- Para oportunidades: extrai dados do lead/interessado

Retorna os dados estruturados no formato JSON especificado.`,
        add_context_from_internet: true,
        response_json_schema: schema
      });

      return result;
    },
    onSuccess: (data) => {
      setExtractedData(data);
      setSelectedItems(data.items?.map((_, idx) => idx) || []);
      setActiveTab("preview");
      toast.success(`${data.items?.length || 0} registos encontrados`);
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao extrair dados");
    }
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!extractedData?.items?.length || selectedItems.length === 0) {
        throw new Error("Nenhum item selecionado para importar");
      }

      const itemsToImport = extractedData.items.filter((_, idx) => selectedItems.includes(idx));
      const results = { created: 0, errors: [], items: [] };

      for (const item of itemsToImport) {
        try {
          if (dataType === "properties") {
            // Generate ref_id
            const { data: refData } = await base44.functions.invoke('generateRefId', { entity_type: 'Property' });
            
            const propertyData = {
              ref_id: refData.ref_id,
              title: item.title || "Imóvel importado",
              description: item.description || "",
              price: item.price || 0,
              property_type: mapPropertyType(item.property_type),
              listing_type: item.listing_type?.toLowerCase()?.includes("arrend") ? "rent" : "sale",
              bedrooms: item.bedrooms || 0,
              bathrooms: item.bathrooms || 0,
              useful_area: item.area || 0,
              square_feet: item.area || 0,
              address: item.address || "",
              city: item.city || "",
              state: item.state || "",
              images: item.images || [],
              amenities: item.amenities || [],
              external_id: item.external_id || "",
              source_url: item.source_url || url,
              status: "active",
              availability_status: "available"
            };

            await base44.entities.Property.create(propertyData);
            results.created++;
            results.items.push({ name: item.title, status: "success" });

          } else if (dataType === "contacts") {
            // Check for duplicates
            if (item.email) {
              const existing = await base44.entities.ClientContact.filter({ email: item.email });
              if (existing.length > 0) {
                results.items.push({ name: item.full_name, status: "duplicate" });
                continue;
              }
            }

            const { data: refData } = await base44.functions.invoke('generateRefId', { entity_type: 'ClientContact' });
            
            const contactData = {
              ref_id: refData.ref_id,
              full_name: item.full_name || "Contacto importado",
              email: item.email || "",
              phone: item.phone || "",
              company_name: item.company_name || "",
              job_title: item.job_title || "",
              city: item.city || "",
              notes: item.notes || `Importado de: ${url}`,
              source: "other",
              contact_type: "client"
            };

            await base44.entities.ClientContact.create(contactData);
            results.created++;
            results.items.push({ name: item.full_name, status: "success" });

          } else if (dataType === "opportunities") {
            const { data: refData } = await base44.functions.invoke('generateRefId', { entity_type: 'Opportunity' });
            
            const oppData = {
              ref_id: refData.ref_id,
              lead_type: "comprador",
              buyer_name: item.buyer_name || "Lead importado",
              buyer_email: item.buyer_email || "",
              buyer_phone: item.buyer_phone || "",
              location: item.location || "",
              budget: item.budget || 0,
              property_type_interest: item.property_type_interest || "",
              message: item.message || `Importado de: ${url}`,
              lead_source: "other",
              source_url: url,
              status: "new"
            };

            const created = await base44.entities.Opportunity.create(oppData);
            results.created++;
            results.items.push({ name: item.buyer_name, status: "success" });

            // Notify about new lead
            try {
              await base44.functions.invoke('notifyNewLead', {
                lead: { ...oppData, id: created.id },
                source: 'import',
                notify_admins: true,
                send_email: false
              });
            } catch (e) {
              console.error('Notification failed:', e);
            }
          }
        } catch (error) {
          results.errors.push({ item: item.title || item.full_name || item.buyer_name, error: error.message });
          results.items.push({ name: item.title || item.full_name || item.buyer_name, status: "error" });
        }
      }

      return results;
    },
    onSuccess: (results) => {
      setImportResult(results);
      setActiveTab("result");
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['clientContacts'] });
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      toast.success(`${results.created} registos importados com sucesso`);
    },
    onError: (error) => {
      toast.error(error.message || "Erro na importação");
    }
  });

  const mapPropertyType = (type) => {
    if (!type) return "apartment";
    const lower = type.toLowerCase();
    if (lower.includes("apart") || lower.includes("t1") || lower.includes("t2") || lower.includes("t3") || lower.includes("t4")) return "apartment";
    if (lower.includes("morad") || lower.includes("vivend") || lower.includes("casa") || lower.includes("house")) return "house";
    if (lower.includes("terren") || lower.includes("land")) return "land";
    if (lower.includes("loja") || lower.includes("comerc") || lower.includes("store") || lower.includes("shop")) return "store";
    if (lower.includes("escrit") || lower.includes("office")) return "office";
    if (lower.includes("armaz") || lower.includes("warehouse")) return "warehouse";
    if (lower.includes("préd") || lower.includes("build")) return "building";
    if (lower.includes("quint") || lower.includes("herd") || lower.includes("farm")) return "farm";
    return "apartment";
  };

  const toggleItem = (idx) => {
    setSelectedItems(prev => 
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    );
  };

  const toggleAll = () => {
    if (selectedItems.length === extractedData?.items?.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(extractedData?.items?.map((_, idx) => idx) || []);
    }
  };

  const resetForm = () => {
    setUrl("");
    setExtractedData(null);
    setSelectedItems([]);
    setImportResult(null);
    setActiveTab("input");
  };

  const typeConfig = dataTypes.find(t => t.value === dataType);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="w-6 h-6 text-indigo-600" />
          Sincronização de Dados Externos
        </CardTitle>
        <CardDescription>
          Importe dados de websites externos automaticamente usando IA
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="input">Configurar</TabsTrigger>
            <TabsTrigger value="preview" disabled={!extractedData}>Pré-visualizar</TabsTrigger>
            <TabsTrigger value="result" disabled={!importResult}>Resultado</TabsTrigger>
          </TabsList>

          <TabsContent value="input" className="space-y-6 mt-6">
            {/* Data Type Selection */}
            <div>
              <Label className="mb-3 block">Tipo de Dados a Importar</Label>
              <div className="grid grid-cols-3 gap-3">
                {dataTypes.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setDataType(type.value)}
                    className={`p-4 rounded-lg border-2 text-center transition-all ${
                      dataType === type.value
                        ? "border-indigo-500 bg-indigo-50"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <type.icon className={`w-8 h-8 mx-auto mb-2 ${
                      dataType === type.value ? "text-indigo-600" : "text-slate-400"
                    }`} />
                    <p className="font-medium">{type.label}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* URL Input */}
            <div>
              <Label htmlFor="url" className="mb-2 block">URL da Página</Label>
              <div className="flex gap-2">
                <Input
                  id="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://exemplo.com/imoveis"
                  className="flex-1"
                />
                {url && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => window.open(url, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Cole o URL de uma página com listagem de {typeConfig?.label.toLowerCase()}
              </p>
            </div>

            {/* Examples */}
            <Alert>
              <Search className="w-4 h-4" />
              <AlertDescription>
                <strong>Exemplos de URLs suportados:</strong>
                <ul className="list-disc ml-4 mt-2 text-sm">
                  <li>Páginas de resultados de portais imobiliários</li>
                  <li>Listagens de imóveis de agências</li>
                  <li>Diretórios de contactos profissionais</li>
                  <li>Páginas de leads/formulários preenchidos</li>
                </ul>
              </AlertDescription>
            </Alert>

            {/* Fetch Button */}
            <Button
              onClick={() => fetchMutation.mutate()}
              disabled={!url || fetchMutation.isPending}
              className="w-full bg-indigo-600 hover:bg-indigo-700"
              size="lg"
            >
              {fetchMutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  A extrair dados com IA...
                </>
              ) : (
                <>
                  <Search className="w-5 h-5 mr-2" />
                  Extrair Dados da Página
                </>
              )}
            </Button>
          </TabsContent>

          <TabsContent value="preview" className="mt-6">
            {extractedData && (
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">
                      {extractedData.items?.length || 0} {typeConfig?.label} Encontrados
                    </h3>
                    {extractedData.source_name && (
                      <p className="text-sm text-slate-500">Fonte: {extractedData.source_name}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={toggleAll}>
                      {selectedItems.length === extractedData.items?.length ? "Desmarcar Todos" : "Selecionar Todos"}
                    </Button>
                    <Badge variant="secondary">
                      {selectedItems.length} selecionados
                    </Badge>
                  </div>
                </div>

                {/* Items List */}
                <div className="max-h-96 overflow-y-auto space-y-2 border rounded-lg p-2">
                  {extractedData.items?.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => toggleItem(idx)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedItems.includes(idx)
                          ? "border-indigo-500 bg-indigo-50"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedItems.includes(idx)}
                          onCheckedChange={() => toggleItem(idx)}
                        />
                        <div className="flex-1 min-w-0">
                          {dataType === "properties" && (
                            <>
                              <p className="font-medium truncate">{item.title || "Sem título"}</p>
                              <div className="flex flex-wrap gap-2 mt-1 text-sm text-slate-600">
                                {item.price > 0 && <span>€{item.price.toLocaleString()}</span>}
                                {item.city && <span>• {item.city}</span>}
                                {item.bedrooms > 0 && <span>• T{item.bedrooms}</span>}
                                {item.area > 0 && <span>• {item.area}m²</span>}
                              </div>
                            </>
                          )}
                          {dataType === "contacts" && (
                            <>
                              <p className="font-medium">{item.full_name || "Sem nome"}</p>
                              <div className="flex flex-wrap gap-2 mt-1 text-sm text-slate-600">
                                {item.email && <span>{item.email}</span>}
                                {item.phone && <span>• {item.phone}</span>}
                                {item.company_name && <span>• {item.company_name}</span>}
                              </div>
                            </>
                          )}
                          {dataType === "opportunities" && (
                            <>
                              <p className="font-medium">{item.buyer_name || "Sem nome"}</p>
                              <div className="flex flex-wrap gap-2 mt-1 text-sm text-slate-600">
                                {item.buyer_email && <span>{item.buyer_email}</span>}
                                {item.location && <span>• {item.location}</span>}
                                {item.budget > 0 && <span>• €{item.budget.toLocaleString()}</span>}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setActiveTab("input")} className="flex-1">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Nova Pesquisa
                  </Button>
                  <Button
                    onClick={() => importMutation.mutate()}
                    disabled={selectedItems.length === 0 || importMutation.isPending}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    {importMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        A importar...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Importar {selectedItems.length} {typeConfig?.label}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="result" className="mt-6">
            {importResult && (
              <div className="space-y-4">
                {/* Summary */}
                <div className="text-center py-6 bg-green-50 rounded-lg border border-green-200">
                  <Check className="w-12 h-12 text-green-600 mx-auto mb-2" />
                  <h3 className="text-xl font-bold text-green-900">
                    Importação Concluída
                  </h3>
                  <p className="text-green-700">
                    {importResult.created} {typeConfig?.label.toLowerCase()} importados com sucesso
                  </p>
                </div>

                {/* Items Status */}
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {importResult.items?.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                      <span className="truncate">{item.name}</span>
                      <Badge className={
                        item.status === "success" ? "bg-green-100 text-green-800" :
                        item.status === "duplicate" ? "bg-yellow-100 text-yellow-800" :
                        "bg-red-100 text-red-800"
                      }>
                        {item.status === "success" ? "Importado" :
                         item.status === "duplicate" ? "Duplicado" : "Erro"}
                      </Badge>
                    </div>
                  ))}
                </div>

                {/* Errors */}
                {importResult.errors?.length > 0 && (
                  <Alert variant="destructive">
                    <AlertTriangle className="w-4 h-4" />
                    <AlertDescription>
                      <strong>{importResult.errors.length} erros:</strong>
                      <ul className="list-disc ml-4 mt-1">
                        {importResult.errors.slice(0, 5).map((err, idx) => (
                          <li key={idx}>{err.item}: {err.error}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Actions */}
                <Button onClick={resetForm} className="w-full">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Nova Importação
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}