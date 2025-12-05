import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { 
  Globe, Download, Loader2, Check, AlertTriangle, 
  Building2, Users, Target, RefreshCw, ExternalLink,
  FileJson, CheckCircle, XCircle, Eye, Save
} from "lucide-react";
import { toast } from "sonner";

const dataTypes = [
  { value: "properties", label: "Imóveis", icon: Building2, entity: "Property" },
  { value: "contacts", label: "Contactos", icon: Users, entity: "ClientContact" },
  { value: "opportunities", label: "Oportunidades", icon: Target, entity: "Opportunity" }
];

const propertyFieldMappings = {
  title: ["title", "name", "titulo", "nome", "property_name"],
  description: ["description", "descricao", "desc", "details"],
  price: ["price", "preco", "valor", "value", "amount"],
  bedrooms: ["bedrooms", "quartos", "rooms", "beds"],
  bathrooms: ["bathrooms", "casas_de_banho", "wc", "baths"],
  square_feet: ["area", "square_feet", "size", "metros", "m2", "sqm"],
  address: ["address", "morada", "endereco", "location"],
  city: ["city", "cidade", "concelho", "locality"],
  state: ["state", "distrito", "region", "province"],
  property_type: ["property_type", "tipo", "type", "category"],
  listing_type: ["listing_type", "transaction", "negocio", "operation"]
};

const contactFieldMappings = {
  buyer_name: ["name", "nome", "full_name", "buyer_name", "contact_name"],
  buyer_email: ["email", "e-mail", "buyer_email", "contact_email"],
  buyer_phone: ["phone", "telefone", "mobile", "buyer_phone", "contact_phone"],
  profile_type: ["type", "tipo", "profile_type", "category"]
};

const opportunityFieldMappings = {
  buyer_name: ["name", "nome", "lead_name", "contact_name", "buyer_name"],
  buyer_email: ["email", "e-mail", "lead_email", "buyer_email"],
  buyer_phone: ["phone", "telefone", "lead_phone", "buyer_phone"],
  lead_type: ["type", "tipo", "lead_type"],
  status: ["status", "estado", "stage"],
  message: ["message", "mensagem", "notes", "comments"]
};

export default function ExternalDataSync() {
  const [url, setUrl] = useState("");
  const [dataType, setDataType] = useState("properties");
  const [fetchedData, setFetchedData] = useState(null);
  const [mappedData, setMappedData] = useState([]);
  const [activeTab, setActiveTab] = useState("fetch");
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState(null);
  
  const queryClient = useQueryClient();

  const fetchMutation = useMutation({
    mutationFn: async () => {
      // Use LLM to fetch and parse the data from URL
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Fetch and extract structured data from this URL: ${url}
        
The data should be extracted as ${dataType}. 

For properties, extract: title, description, price, bedrooms, bathrooms, area/size, address, city, state/district, property type, listing type (sale/rent).

For contacts, extract: name, email, phone, type (buyer/seller/partner).

For opportunities/leads, extract: name, email, phone, type, status, message/notes.

Return ONLY a valid JSON object with this structure:
{
  "success": true/false,
  "source": "website name or domain",
  "total_records": number,
  "data": [array of extracted records],
  "errors": ["any extraction errors"]
}

If the URL cannot be accessed or no data found, return success: false with appropriate error message.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            source: { type: "string" },
            total_records: { type: "number" },
            data: { 
              type: "array",
              items: { type: "object" }
            },
            errors: { 
              type: "array",
              items: { type: "string" }
            }
          },
          required: ["success", "data"]
        }
      });

      return response;
    },
    onSuccess: (data) => {
      setFetchedData(data);
      if (data.success && data.data?.length > 0) {
        const mapped = mapDataToEntity(data.data, dataType);
        setMappedData(mapped);
        setActiveTab("preview");
        toast.success(`${data.total_records || data.data.length} registos encontrados!`);
      } else {
        toast.error(data.errors?.[0] || "Nenhum dado encontrado");
      }
    },
    onError: (error) => {
      toast.error("Erro ao obter dados: " + error.message);
    }
  });

  const mapDataToEntity = (data, type) => {
    const mappings = type === "properties" ? propertyFieldMappings :
                     type === "contacts" ? contactFieldMappings :
                     opportunityFieldMappings;

    return data.map(item => {
      const mapped = {};
      
      for (const [targetField, sourceFields] of Object.entries(mappings)) {
        for (const sourceField of sourceFields) {
          const value = item[sourceField] || item[sourceField.toLowerCase()] || 
                       item[sourceField.toUpperCase()];
          if (value !== undefined && value !== null && value !== "") {
            mapped[targetField] = value;
            break;
          }
        }
      }

      // Add unmapped fields to a notes/description field
      const mappedKeys = Object.values(mappings).flat();
      const unmappedFields = Object.entries(item)
        .filter(([key]) => !mappedKeys.some(mk => 
          mk.toLowerCase() === key.toLowerCase()))
        .map(([key, value]) => `${key}: ${value}`)
        .join("\n");

      if (unmappedFields && type === "properties") {
        mapped.internal_notes = unmappedFields;
      } else if (unmappedFields && type === "opportunities") {
        mapped.message = (mapped.message || "") + "\n\nDados adicionais:\n" + unmappedFields;
      }

      return mapped;
    });
  };

  const importMutation = useMutation({
    mutationFn: async () => {
      const entityType = dataTypes.find(d => d.value === dataType)?.entity;
      const results = { created: 0, errors: [] };
      
      for (let i = 0; i < mappedData.length; i++) {
        try {
          const record = { ...mappedData[i] };
          
          // Add defaults based on entity type
          if (entityType === "Property") {
            record.status = record.status || "active";
            record.listing_type = record.listing_type || "sale";
            record.property_type = record.property_type || "apartment";
            record.source_url = url;
            if (record.price) record.price = parseFloat(String(record.price).replace(/[^\d.]/g, "")) || 0;
            if (record.bedrooms) record.bedrooms = parseInt(record.bedrooms) || 0;
            if (record.bathrooms) record.bathrooms = parseInt(record.bathrooms) || 0;
            if (record.square_feet) record.square_feet = parseFloat(String(record.square_feet).replace(/[^\d.]/g, "")) || 0;
          } else if (entityType === "Opportunity") {
            record.lead_type = record.lead_type || "comprador";
            record.status = record.status || "new";
            record.lead_source = "website";
            record.source_url = url;
          } else if (entityType === "ClientContact") {
            record.profile_type = record.profile_type || "cliente_comprador";
          }

          await base44.entities[entityType].create(record);
          results.created++;
        } catch (error) {
          results.errors.push(`Registo ${i + 1}: ${error.message}`);
        }
        
        setImportProgress(Math.round(((i + 1) / mappedData.length) * 100));
      }

      return results;
    },
    onSuccess: (results) => {
      setImportResults(results);
      setActiveTab("results");
      queryClient.invalidateQueries();
      toast.success(`${results.created} registos importados com sucesso!`);
    },
    onError: (error) => {
      toast.error("Erro na importação: " + error.message);
    }
  });

  const resetSync = () => {
    setUrl("");
    setFetchedData(null);
    setMappedData([]);
    setImportProgress(0);
    setImportResults(null);
    setActiveTab("fetch");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="w-6 h-6 text-blue-600" />
          Sincronização de Dados Externos
        </CardTitle>
        <CardDescription>
          Importe dados de websites externos diretamente para o sistema
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="fetch">1. Obter Dados</TabsTrigger>
            <TabsTrigger value="preview" disabled={!fetchedData?.success}>2. Pré-visualizar</TabsTrigger>
            <TabsTrigger value="results" disabled={!importResults}>3. Resultados</TabsTrigger>
          </TabsList>

          <TabsContent value="fetch" className="space-y-6 mt-6">
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
                        ? "border-blue-500 bg-blue-50"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <type.icon className={`w-8 h-8 mx-auto mb-2 ${
                      dataType === type.value ? "text-blue-600" : "text-slate-400"
                    }`} />
                    <p className="font-medium">{type.label}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* URL Input */}
            <div>
              <Label htmlFor="sync-url">URL do Website</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="sync-url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://exemplo.com/imoveis ou https://exemplo.com/api/data"
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => url && window.open(url, '_blank')}
                  disabled={!url}
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                Introduza o URL de uma página web, feed RSS, ou endpoint API com dados estruturados
              </p>
            </div>

            {/* Fetch Button */}
            <Button
              onClick={() => fetchMutation.mutate()}
              disabled={!url || fetchMutation.isPending}
              className="w-full bg-blue-600 hover:bg-blue-700"
              size="lg"
            >
              {fetchMutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  A obter dados...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5 mr-2" />
                  Obter e Analisar Dados
                </>
              )}
            </Button>

            {/* Error Display */}
            {fetchedData && !fetchedData.success && (
              <Alert variant="destructive">
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>
                  {fetchedData.errors?.join(", ") || "Não foi possível obter dados do URL fornecido"}
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          <TabsContent value="preview" className="mt-6">
            {fetchedData?.success && (
              <div className="space-y-4">
                {/* Summary */}
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge className="bg-green-100 text-green-800">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      {mappedData.length} Registos
                    </Badge>
                    <Badge variant="outline">
                      Fonte: {fetchedData.source || new URL(url).hostname}
                    </Badge>
                    <Badge variant="outline">
                      {dataTypes.find(d => d.value === dataType)?.label}
                    </Badge>
                  </div>
                  <Button variant="outline" size="sm" onClick={resetSync}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Recomeçar
                  </Button>
                </div>

                {/* Data Preview */}
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-slate-100 px-4 py-2 border-b">
                    <h4 className="font-medium flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      Pré-visualização dos Dados Mapeados
                    </h4>
                  </div>
                  <div className="max-h-96 overflow-auto">
                    {mappedData.slice(0, 10).map((item, idx) => (
                      <div key={idx} className="p-4 border-b last:border-b-0 hover:bg-slate-50">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-slate-900">
                              {item.title || item.buyer_name || `Registo ${idx + 1}`}
                            </p>
                            {item.price && (
                              <p className="text-green-600 font-semibold">€{Number(item.price).toLocaleString()}</p>
                            )}
                            {item.buyer_email && (
                              <p className="text-sm text-slate-600">{item.buyer_email}</p>
                            )}
                            {item.city && (
                              <p className="text-sm text-slate-500">{item.city}{item.state ? `, ${item.state}` : ''}</p>
                            )}
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            #{idx + 1}
                          </Badge>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {Object.entries(item).slice(0, 5).map(([key, value]) => (
                            <Badge key={key} variant="outline" className="text-xs">
                              {key}: {String(value).substring(0, 20)}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                    {mappedData.length > 10 && (
                      <div className="p-4 text-center text-slate-500 bg-slate-50">
                        ... e mais {mappedData.length - 10} registos
                      </div>
                    )}
                  </div>
                </div>

                {/* Import Button */}
                <Button
                  onClick={() => importMutation.mutate()}
                  disabled={importMutation.isPending || mappedData.length === 0}
                  className="w-full bg-green-600 hover:bg-green-700"
                  size="lg"
                >
                  {importMutation.isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      A importar... {importProgress}%
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5 mr-2" />
                      Importar {mappedData.length} Registos
                    </>
                  )}
                </Button>

                {importMutation.isPending && (
                  <Progress value={importProgress} className="w-full" />
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="results" className="mt-6">
            {importResults && (
              <div className="space-y-4">
                {/* Success Summary */}
                <div className="text-center py-8">
                  <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${
                    importResults.errors.length === 0 ? 'bg-green-100' : 'bg-amber-100'
                  }`}>
                    {importResults.errors.length === 0 ? (
                      <CheckCircle className="w-8 h-8 text-green-600" />
                    ) : (
                      <AlertTriangle className="w-8 h-8 text-amber-600" />
                    )}
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">
                    Importação Concluída
                  </h3>
                  <p className="text-slate-600">
                    {importResults.created} de {mappedData.length} registos importados com sucesso
                  </p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-3xl font-bold text-green-600">{importResults.created}</p>
                      <p className="text-sm text-slate-500">Importados</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-3xl font-bold text-red-600">{importResults.errors.length}</p>
                      <p className="text-sm text-slate-500">Erros</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Errors */}
                {importResults.errors.length > 0 && (
                  <Alert variant="destructive">
                    <AlertTriangle className="w-4 h-4" />
                    <AlertDescription>
                      <strong>Erros encontrados:</strong>
                      <ul className="list-disc ml-4 mt-2">
                        {importResults.errors.slice(0, 5).map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                      {importResults.errors.length > 5 && (
                        <p className="mt-2">... e mais {importResults.errors.length - 5} erros</p>
                      )}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                  <Button onClick={resetSync} variant="outline" className="flex-1">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Nova Sincronização
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}