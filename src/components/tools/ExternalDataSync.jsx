import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { 
  Globe, Loader2, Check, AlertTriangle, Building2, Users, Target,
  Download, ExternalLink, Search, RefreshCw, Eye, Plus, Settings,
  Clock, Trash2, Play, Save, Calendar, Edit2, MoreVertical
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

const dataTypes = [
  { value: "properties", label: "Imóveis", icon: Building2, entity: "Property" },
  { value: "developments", label: "Empreendimentos", icon: Building2, entity: "Development" },
  { value: "contacts", label: "Contactos", icon: Users, entity: "ClientContact" },
  { value: "opportunities", label: "Oportunidades", icon: Target, entity: "Opportunity" }
];

const frequencyOptions = [
  { value: "daily", label: "Diariamente" },
  { value: "weekly", label: "Semanalmente" },
  { value: "monthly", label: "Mensalmente" }
];

export default function ExternalDataSync() {
  const queryClient = useQueryClient();
  const [url, setUrl] = useState("");
  const [dataType, setDataType] = useState("properties");
  const [configName, setConfigName] = useState("");
  const [extractedData, setExtractedData] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [activeTab, setActiveTab] = useState("sources");
  const [importResult, setImportResult] = useState(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [editingConfig, setEditingConfig] = useState(null);
  const [selectedConfig, setSelectedConfig] = useState(null);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  const [syncFrequency, setSyncFrequency] = useState("daily");

  // Fetch saved configurations
  const { data: savedConfigs = [], isLoading: loadingConfigs } = useQuery({
    queryKey: ['syncConfigurations'],
    queryFn: () => base44.entities.SyncConfiguration.list('-created_date')
  });

  // Save configuration mutation
  const saveConfigMutation = useMutation({
    mutationFn: async (data) => {
      if (editingConfig) {
        return await base44.entities.SyncConfiguration.update(editingConfig.id, data);
      }
      return await base44.entities.SyncConfiguration.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['syncConfigurations'] });
      setShowSaveDialog(false);
      setEditingConfig(null);
      setConfigName("");
      toast.success(editingConfig ? "Configuração atualizada" : "Configuração guardada");
    }
  });

  // Delete configuration mutation
  const deleteConfigMutation = useMutation({
    mutationFn: (id) => base44.entities.SyncConfiguration.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['syncConfigurations'] });
      toast.success("Configuração eliminada");
    }
  });

  // Update config mutation (for toggling auto-sync)
  const updateConfigMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SyncConfiguration.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['syncConfigurations'] });
    }
  });

  const fetchMutation = useMutation({
    mutationFn: async (configToUse) => {
      const targetUrl = configToUse?.url || url;
      const targetType = configToUse?.data_type || dataType;
      
      if (!targetUrl) throw new Error("URL é obrigatório");

      const typeConfig = dataTypes.find(t => t.value === targetType);
      
      let schema;
      if (targetType === "properties") {
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
                  source_url: { type: "string", description: "URL direto para a página do imóvel" },
                  energy_certificate: { type: "string" },
                  year_built: { type: "number" },
                  floor: { type: "string" },
                  parking: { type: "string" },
                  condition: { type: "string" }
                }
              }
            },
            source_name: { type: "string" },
            total_found: { type: "number" }
          }
        };
      } else if (targetType === "developments") {
        schema = {
          type: "object",
          properties: {
            items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string", description: "Nome do empreendimento" },
                  description: { type: "string" },
                  developer_name: { type: "string", description: "Nome do promotor/construtor" },
                  address: { type: "string" },
                  city: { type: "string" },
                  state: { type: "string" },
                  total_units: { type: "number", description: "Número total de frações" },
                  available_units: { type: "number" },
                  price_from: { type: "number", description: "Preço mínimo" },
                  price_to: { type: "number", description: "Preço máximo" },
                  completion_date: { type: "string", description: "Data de conclusão prevista" },
                  status: { type: "string", description: "Em construção, Concluído, Em planta, etc." },
                  property_types: { type: "array", items: { type: "string" }, description: "Tipos de frações (T0, T1, T2, etc.)" },
                  amenities: { type: "array", items: { type: "string" } },
                  images: { type: "array", items: { type: "string" } },
                  source_url: { type: "string", description: "URL direto para a página do empreendimento" },
                  external_id: { type: "string" }
                }
              }
            },
            source_name: { type: "string" },
            total_found: { type: "number" }
          }
        };
      } else if (targetType === "contacts") {
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

      // First, fetch the actual page content
      let pageContent = "";
      try {
        const fetchResult = await fetch(`https://r.jina.ai/${encodeURIComponent(targetUrl)}`);
        if (fetchResult.ok) {
          pageContent = await fetchResult.text();
          // Limit content size to avoid token limits
          if (pageContent.length > 50000) {
            pageContent = pageContent.substring(0, 50000);
          }
        }
      } catch (e) {
        console.log("Could not fetch page directly, using LLM with internet context");
      }

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Analisa CUIDADOSAMENTE o conteúdo desta página web e extrai TODOS os ${typeConfig.label.toLowerCase()} listados.

URL: ${targetUrl}

${pageContent ? `CONTEÚDO DA PÁGINA:
${pageContent}

` : ""}FILTROS IMPORTANTES:
- NÃO incluir imóveis/empreendimentos com status "Vendido", "Sold", "Reservado", "Reserved" ou similares
- Apenas extrair imóveis DISPONÍVEIS para venda ou arrendamento

INSTRUÇÕES CRÍTICAS:
1. Procura por TODOS os cards/itens de listagem na página
2. Cada card representa um imóvel ou empreendimento diferente
3. Extrai os dados de CADA UM separadamente
4. Se houver 10 imóveis na página, deves retornar 10 itens no array
5. Não inventes dados - extrai apenas o que está visível

PARA IMÓVEIS - EXTRAI DE CADA CARD:
- title: título/nome do anúncio
- price: preço em número (remove € e pontos)
- property_type: apartamento, moradia, terreno, loja, etc.
- listing_type: "sale" ou "rent"
- bedrooms: número de quartos (T2=2, T3=3)
- bathrooms: casas de banho
- area: área em m²
- city: cidade/concelho
- state: distrito
- address: morada se disponível
- images: array com URLs das fotos
- source_url: link COMPLETO para a página de detalhes deste imóvel
- external_id: referência/ID do anúncio

PARA EMPREENDIMENTOS:
- name: nome do empreendimento
- developer_name: promotor/construtor
- city, state: localização
- total_units: número de frações
- price_from: preço mínimo
- price_to: preço máximo
- status: em construção, concluído, em planta
- property_types: tipologias disponíveis (T1, T2, T3, etc.)
- images: fotos
- source_url: link para página do empreendimento

IMPORTANTE:
- Retorna TODOS os itens encontrados, não apenas alguns
- Se um dado não estiver disponível, omite o campo
- URLs devem ser completos (começar com https://)

Retorna um JSON com o array "items" contendo todos os registos encontrados.`,
        add_context_from_internet: true,
        response_json_schema: schema
      });

      return { data: result, config: configToUse };
    },
    onSuccess: ({ data, config }) => {
      setExtractedData(data);
      setSelectedItems(data.items?.map((_, idx) => idx) || []);
      setSelectedConfig(config);
      setActiveTab("preview");
      toast.success(`${data.items?.length || 0} registos encontrados`);
    },
    onError: (error) => {
      console.error('Fetch error:', error);
      toast.error(error.message || "Erro ao extrair dados", { duration: 10000 });
      setExtractedData({ error: true, errorMessage: error.message || "Erro desconhecido ao extrair dados da página" });
      setActiveTab("preview");
    }
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!extractedData?.items?.length || selectedItems.length === 0) {
        throw new Error("Nenhum item selecionado para importar");
      }

      const itemsToImport = extractedData.items.filter((_, idx) => selectedItems.includes(idx));
      const results = { created: 0, errors: [], items: [] };
      const targetType = selectedConfig?.data_type || dataType;

      for (const item of itemsToImport) {
        try {
          if (targetType === "properties") {
            const { data: refData } = await base44.functions.invoke('generateRefId', { entity_type: 'Property' });
            
            // Se o imóvel tem URL próprio, tentar obter mais detalhes
            let enrichedData = {};
            const hasValidSourceUrl = item.source_url && 
              item.source_url.startsWith('http') && 
              item.source_url !== selectedConfig?.url && 
              item.source_url !== url &&
              !item.source_url.includes('undefined');
              
            if (hasValidSourceUrl) {
              try {
                console.log(`Enriching property from: ${item.source_url}`);
                const detailResult = await base44.integrations.Core.InvokeLLM({
                  prompt: `Analisa a página de detalhes deste imóvel e extrai TODOS os dados disponíveis.

URL DO IMÓVEL: ${item.source_url}

EXTRAI OS SEGUINTES DADOS (se disponíveis):

DESCRIÇÃO:
- description: descrição completa do imóvel (texto integral do anúncio)

CARACTERÍSTICAS PRINCIPAIS:
- bedrooms: número de quartos (T1=1, T2=2, etc.)
- bathrooms: número de casas de banho
- useful_area: área útil em m²
- gross_area: área bruta em m²

DETALHES TÉCNICOS:
- energy_certificate: certificado energético (A+, A, B, B-, C, D, E, F ou isento)
- year_built: ano de construção (número)
- floor: andar (ex: "3º", "R/C", "Cave", etc.)
- parking: estacionamento/garagem (ex: "1 lugar", "Box", "2 lugares", "Sem garagem")
- condition: estado de conservação (ex: "Novo", "Usado", "Renovado", "Para recuperar")

IMAGENS:
- images: array com URLs de TODAS as fotos do imóvel (em alta resolução se possível)

COMODIDADES:
- amenities: array com todas as características (ex: ["Varanda", "Elevador", "Ar condicionado", "Arrecadação"])

LOCALIZAÇÃO:
- address: morada completa
- city: cidade/concelho
- state: distrito

Extrai o máximo de informação possível da página.`,
                  add_context_from_internet: true,
                  response_json_schema: {
                    type: "object",
                    properties: {
                      description: { type: "string" },
                      images: { type: "array", items: { type: "string" } },
                      amenities: { type: "array", items: { type: "string" } },
                      energy_certificate: { type: "string" },
                      year_built: { type: "number" },
                      floor: { type: "string" },
                      parking: { type: "string" },
                      condition: { type: "string" },
                      gross_area: { type: "number" },
                      useful_area: { type: "number" },
                      bedrooms: { type: "number" },
                      bathrooms: { type: "number" },
                      address: { type: "string" },
                      city: { type: "string" },
                      state: { type: "string" }
                    }
                  }
                });
                enrichedData = detailResult || {};
                console.log(`Enriched data for ${item.title}:`, enrichedData);
              } catch (e) {
                console.error('Failed to enrich property:', e);
                results.items.push({ name: item.title, status: "success", note: "Sem dados adicionais" });
              }
            }
            
            // Mapear certificado energético
            const mapEnergyCert = (cert) => {
              if (!cert) return undefined;
              const upper = cert.toUpperCase().trim();
              if (["A+", "A", "B", "B-", "C", "D", "E", "F"].includes(upper)) return upper;
              if (upper.includes("ISENTO") || upper.includes("EXEMPT")) return "isento";
              return undefined;
            };

            const propertyData = {
              ref_id: refData.ref_id,
              title: item.title || "Imóvel importado",
              description: enrichedData.description || item.description || "",
              price: item.price || 0,
              property_type: mapPropertyType(item.property_type),
              listing_type: item.listing_type?.toLowerCase()?.includes("arrend") ? "rent" : "sale",
              bedrooms: enrichedData.bedrooms || item.bedrooms || 0,
              bathrooms: enrichedData.bathrooms || item.bathrooms || 0,
              useful_area: enrichedData.useful_area || item.area || 0,
              gross_area: enrichedData.gross_area || 0,
              square_feet: enrichedData.useful_area || item.area || 0,
              address: enrichedData.address || item.address || "",
              city: enrichedData.city || item.city || "",
              state: enrichedData.state || item.state || "",
              images: (enrichedData.images?.length > 0 ? enrichedData.images : item.images) || [],
              amenities: [...new Set([...(item.amenities || []), ...(enrichedData.amenities || [])])],
              external_id: item.external_id || "",
              source_url: hasValidSourceUrl ? item.source_url : (selectedConfig?.url || url),
              energy_certificate: mapEnergyCert(enrichedData.energy_certificate || item.energy_certificate),
              year_built: enrichedData.year_built || item.year_built || undefined,
              finishes: enrichedData.condition || item.condition || undefined,
              garage: mapGarage(enrichedData.parking || item.parking),
              internal_notes: enrichedData.floor ? `Andar: ${enrichedData.floor}` : undefined,
              status: "active",
              availability_status: "available"
            };

            await base44.entities.Property.create(propertyData);
            results.created++;
            results.items.push({ name: item.title, status: "success" });

          } else if (targetType === "contacts") {
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
              notes: item.notes || `Importado de: ${selectedConfig?.url || url}`,
              source: "other",
              contact_type: "client"
            };

            await base44.entities.ClientContact.create(contactData);
            results.created++;
            results.items.push({ name: item.full_name, status: "success" });

          } else if (targetType === "developments") {
            // Create Development
            const developmentData = {
              name: item.name || "Empreendimento importado",
              description: item.description || "",
              developer_name: item.developer_name || "",
              address: item.address || "",
              city: item.city || "",
              district: item.state || "",
              total_units: item.total_units || 0,
              available_units: item.available_units || item.total_units || 0,
              price_from: item.price_from || 0,
              price_to: item.price_to || 0,
              completion_date: item.completion_date || undefined,
              status: mapDevelopmentStatus(item.status),
              property_types: item.property_types || [],
              amenities: item.amenities || [],
              images: item.images || [],
              source_url: item.source_url || selectedConfig?.url || url,
              external_id: item.external_id || ""
            };

            await base44.entities.Development.create(developmentData);
            results.created++;
            results.items.push({ name: item.name, status: "success" });

          } else if (targetType === "opportunities") {
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
              message: item.message || `Importado de: ${selectedConfig?.url || url}`,
              lead_source: "other",
              source_url: selectedConfig?.url || url,
              status: "new"
            };

            const created = await base44.entities.Opportunity.create(oppData);
            results.created++;
            results.items.push({ name: item.buyer_name, status: "success" });

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

      // Update config with sync stats if using saved config
      if (selectedConfig) {
        await base44.entities.SyncConfiguration.update(selectedConfig.id, {
          last_sync_date: new Date().toISOString(),
          last_sync_status: results.errors.length > 0 ? "error" : "success",
          last_sync_count: results.created,
          total_synced: (selectedConfig.total_synced || 0) + results.created
        });
        queryClient.invalidateQueries({ queryKey: ['syncConfigurations'] });
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

  const mapGarage = (parking) => {
    if (!parking) return undefined;
    const lower = parking.toLowerCase();
    if (lower.includes("box")) return "box";
    if (lower.includes("exterior")) return "exterior";
    if (lower.includes("4") || lower.includes("quatro")) return "4+";
    if (lower.includes("3") || lower.includes("três")) return "3";
    if (lower.includes("2") || lower.includes("dois") || lower.includes("duas")) return "2";
    if (lower.includes("1") || lower.includes("um") || lower.includes("uma") || lower.includes("sim") || lower.includes("yes")) return "1";
    if (lower.includes("não") || lower.includes("no") || lower.includes("sem")) return "none";
    return undefined;
  };

  const mapDevelopmentStatus = (status) => {
    if (!status) return "under_construction";
    const lower = status.toLowerCase();
    if (lower.includes("conclu") || lower.includes("pronto") || lower.includes("finished") || lower.includes("complete")) return "completed";
    if (lower.includes("planta") || lower.includes("projeto") || lower.includes("planned")) return "planned";
    if (lower.includes("constru") || lower.includes("obra") || lower.includes("building")) return "under_construction";
    if (lower.includes("vend") || lower.includes("sold")) return "sold_out";
    return "under_construction";
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
    setSelectedConfig(null);
    setActiveTab("sources");
  };

  const handleSaveConfig = () => {
    saveConfigMutation.mutate({
      name: configName || `Sync ${dataTypes.find(t => t.value === dataType)?.label}`,
      url,
      data_type: dataType,
      auto_sync_enabled: autoSyncEnabled,
      sync_frequency: autoSyncEnabled ? syncFrequency : undefined,
      is_active: true
    });
  };

  const handleEditConfig = (config) => {
    setEditingConfig(config);
    setConfigName(config.name);
    setUrl(config.url);
    setDataType(config.data_type);
    setAutoSyncEnabled(config.auto_sync_enabled || false);
    setSyncFrequency(config.sync_frequency || "daily");
    setShowSaveDialog(true);
  };

  const handleUpdateConfig = () => {
    saveConfigMutation.mutate({
      name: configName,
      url,
      data_type: dataType,
      auto_sync_enabled: autoSyncEnabled,
      sync_frequency: autoSyncEnabled ? syncFrequency : undefined
    });
  };

  const handleRunSync = (config) => {
    setSelectedConfig(config);
    fetchMutation.mutate(config);
  };

  const handleToggleAutoSync = (config, enabled) => {
    updateConfigMutation.mutate({
      id: config.id,
      data: { auto_sync_enabled: enabled }
    });
    toast.success(enabled ? "Sincronização automática ativada" : "Sincronização automática desativada");
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
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="sources">Fontes Guardadas</TabsTrigger>
            <TabsTrigger value="new">Nova Sincronização</TabsTrigger>
            <TabsTrigger value="preview" disabled={!extractedData}>Pré-visualizar</TabsTrigger>
            <TabsTrigger value="result" disabled={!importResult}>Resultado</TabsTrigger>
          </TabsList>

          {/* Saved Sources Tab */}
          <TabsContent value="sources" className="mt-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold">Fontes de Dados Configuradas</h3>
                <Button onClick={() => setActiveTab("new")} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Fonte
                </Button>
              </div>

              {loadingConfigs ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                </div>
              ) : savedConfigs.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-lg">
                  <Globe className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-600 mb-4">Nenhuma fonte configurada</p>
                  <Button onClick={() => setActiveTab("new")}>
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Primeira Fonte
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {savedConfigs.map((config) => {
                    const TypeIcon = dataTypes.find(t => t.value === config.data_type)?.icon || Globe;
                    return (
                      <div
                        key={config.id}
                        className="p-4 border rounded-lg hover:border-indigo-300 transition-all bg-white"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-indigo-100 rounded-lg">
                              <TypeIcon className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div>
                              <h4 className="font-medium">{config.name}</h4>
                              <p className="text-sm text-slate-500 truncate max-w-md">{config.url}</p>
                              <div className="flex flex-wrap gap-2 mt-2">
                                <Badge variant="secondary">
                                  {dataTypes.find(t => t.value === config.data_type)?.label}
                                </Badge>
                                {config.auto_sync_enabled && (
                                  <Badge className="bg-green-100 text-green-800">
                                    <Clock className="w-3 h-3 mr-1" />
                                    {frequencyOptions.find(f => f.value === config.sync_frequency)?.label}
                                  </Badge>
                                )}
                                {config.last_sync_date && (
                                  <Badge variant="outline">
                                    Última: {format(new Date(config.last_sync_date), "dd/MM HH:mm", { locale: pt })}
                                  </Badge>
                                )}
                                {config.total_synced > 0 && (
                                  <Badge variant="outline">
                                    {config.total_synced} importados
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleRunSync(config)}
                              disabled={fetchMutation.isPending}
                            >
                              {fetchMutation.isPending && selectedConfig?.id === config.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Play className="w-4 h-4" />
                              )}
                            </Button>
                            
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEditConfig(config)}>
                                  <Edit2 className="w-4 h-4 mr-2" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleToggleAutoSync(config, !config.auto_sync_enabled)}>
                                  <Clock className="w-4 h-4 mr-2" />
                                  {config.auto_sync_enabled ? "Desativar Auto-Sync" : "Ativar Auto-Sync"}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => window.open(config.url, '_blank')}>
                                  <ExternalLink className="w-4 h-4 mr-2" />
                                  Abrir URL
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => deleteConfigMutation.mutate(config.id)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Eliminar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>

          {/* New Sync Tab */}
          <TabsContent value="new" className="space-y-6 mt-6">
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
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={() => {
                  setSelectedConfig(null);
                  fetchMutation.mutate(null);
                }}
                disabled={!url || fetchMutation.isPending}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700"
              >
                {fetchMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    A extrair...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Extrair Dados
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setConfigName("");
                  setAutoSyncEnabled(false);
                  setSyncFrequency("daily");
                  setEditingConfig(null);
                  setShowSaveDialog(true);
                }}
                disabled={!url}
              >
                <Save className="w-4 h-4 mr-2" />
                Guardar Fonte
              </Button>
            </div>

            {/* Help */}
            <Alert>
              <Search className="w-4 h-4" />
              <AlertDescription>
                <strong>Exemplos de URLs suportados:</strong>
                <ul className="list-disc ml-4 mt-2 text-sm">
                  <li>Páginas de resultados de portais imobiliários</li>
                  <li>Listagens de imóveis de agências</li>
                  <li>Diretórios de contactos profissionais</li>
                </ul>
              </AlertDescription>
            </Alert>
          </TabsContent>

          {/* Preview Tab */}
          <TabsContent value="preview" className="mt-6">
            {extractedData?.error && (
              <div className="space-y-4">
                <Alert variant="destructive">
                  <AlertTriangle className="w-5 h-5" />
                  <AlertDescription>
                    <strong className="block mb-2">Erro ao extrair dados</strong>
                    <p className="text-sm">{extractedData.errorMessage}</p>
                    <div className="mt-3 p-3 bg-red-50 rounded text-xs font-mono overflow-auto max-h-32">
                      {extractedData.errorDetails || "Verifique se o URL está acessível e contém dados estruturados."}
                    </div>
                  </AlertDescription>
                </Alert>
                <Button onClick={resetForm} variant="outline" className="w-full">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Tentar Novamente
                </Button>
              </div>
            )}
            {extractedData && !extractedData.error && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">
                      {extractedData.items?.length || 0} Registos Encontrados
                    </h3>
                    {extractedData.source_name && (
                      <p className="text-sm text-slate-500">Fonte: {extractedData.source_name}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={toggleAll}>
                      {selectedItems.length === extractedData.items?.length ? "Desmarcar" : "Selecionar"} Todos
                    </Button>
                    <Badge variant="secondary">{selectedItems.length} selecionados</Badge>
                  </div>
                </div>

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
                        <Checkbox checked={selectedItems.includes(idx)} />
                        <div className="flex-1 min-w-0">
                          {(selectedConfig?.data_type || dataType) === "properties" && (
                            <>
                              <p className="font-medium truncate">{item.title || "Sem título"}</p>
                              <div className="flex flex-wrap gap-2 mt-1 text-sm text-slate-600">
                                {item.price > 0 && <span>€{item.price.toLocaleString()}</span>}
                                {item.city && <span>• {item.city}</span>}
                                {item.bedrooms > 0 && <span>• T{item.bedrooms}</span>}
                              </div>
                              {item.source_url && item.source_url.startsWith('http') && (
                                <a 
                                  href={item.source_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex items-center gap-1 mt-1 text-xs text-indigo-600 hover:text-indigo-800 hover:underline"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  <span className="truncate max-w-xs">Ver página do imóvel</span>
                                </a>
                              )}
                              {(!item.source_url || !item.source_url.startsWith('http')) && (
                                <div className="flex items-center gap-1 mt-1 text-xs text-amber-600">
                                  <AlertTriangle className="w-3 h-3" />
                                  <span>URL individual não encontrado</span>
                                </div>
                              )}
                            </>
                          )}
                          {(selectedConfig?.data_type || dataType) === "contacts" && (
                            <>
                              <p className="font-medium">{item.full_name || "Sem nome"}</p>
                              <div className="text-sm text-slate-600">
                                {item.email && <span>{item.email}</span>}
                                {item.phone && <span> • {item.phone}</span>}
                              </div>
                            </>
                          )}
                          {(selectedConfig?.data_type || dataType) === "developments" && (
                            <>
                              <p className="font-medium truncate">{item.name || "Sem nome"}</p>
                              <div className="flex flex-wrap gap-2 mt-1 text-sm text-slate-600">
                                {item.city && <span>{item.city}</span>}
                                {item.total_units > 0 && <span>• {item.total_units} frações</span>}
                                {item.price_from > 0 && <span>• desde €{item.price_from.toLocaleString()}</span>}
                              </div>
                              {item.source_url && item.source_url.startsWith('http') && (
                                <a 
                                  href={item.source_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex items-center gap-1 mt-1 text-xs text-indigo-600 hover:text-indigo-800 hover:underline"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  <span className="truncate max-w-xs">Ver página do empreendimento</span>
                                </a>
                              )}
                            </>
                          )}
                          {(selectedConfig?.data_type || dataType) === "opportunities" && (
                            <>
                              <p className="font-medium">{item.buyer_name || "Sem nome"}</p>
                              <div className="text-sm text-slate-600">
                                {item.buyer_email && <span>{item.buyer_email}</span>}
                                {item.location && <span> • {item.location}</span>}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={resetForm} className="flex-1">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Voltar
                  </Button>
                  <Button
                    onClick={() => importMutation.mutate()}
                    disabled={selectedItems.length === 0 || importMutation.isPending}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    {importMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4 mr-2" />
                    )}
                    Importar {selectedItems.length}
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Result Tab */}
          <TabsContent value="result" className="mt-6">
            {importResult && (
              <div className="space-y-4">
                <div className="text-center py-6 bg-green-50 rounded-lg border border-green-200">
                  <Check className="w-12 h-12 text-green-600 mx-auto mb-2" />
                  <h3 className="text-xl font-bold text-green-900">Importação Concluída</h3>
                  <p className="text-green-700">{importResult.created} registos importados</p>
                </div>

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

                {importResult.errors?.length > 0 && (
                  <Alert variant="destructive">
                    <AlertTriangle className="w-4 h-4" />
                    <AlertDescription>
                      <strong className="block mb-2">{importResult.errors.length} erros durante a importação:</strong>
                      <ul className="list-disc ml-4 text-sm space-y-1 max-h-32 overflow-auto">
                        {importResult.errors.map((err, idx) => (
                          <li key={idx}>
                            <span className="font-medium">{err.item}:</span> {err.error}
                          </li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                <Button onClick={resetForm} className="w-full">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Nova Importação
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Global Error Display */}
        {(fetchMutation.error || importMutation.error) && (
          <Alert variant="destructive" className="mt-4">
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>
              <strong>Erro: </strong>
              {fetchMutation.error?.message || importMutation.error?.message || "Ocorreu um erro inesperado"}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>

      {/* Save Configuration Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingConfig ? "Editar Fonte" : "Guardar Fonte de Dados"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="configName">Nome da Configuração</Label>
              <Input
                id="configName"
                value={configName}
                onChange={(e) => setConfigName(e.target.value)}
                placeholder="Ex: Imóveis Idealista Lisboa"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label>Sincronização Automática</Label>
                <p className="text-sm text-slate-500">Executar automaticamente</p>
              </div>
              <Switch
                checked={autoSyncEnabled}
                onCheckedChange={setAutoSyncEnabled}
              />
            </div>

            {autoSyncEnabled && (
              <div>
                <Label>Frequência</Label>
                <Select value={syncFrequency} onValueChange={setSyncFrequency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {frequencyOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>Cancelar</Button>
            <Button onClick={editingConfig ? handleUpdateConfig : handleSaveConfig} disabled={saveConfigMutation.isPending}>
              {saveConfigMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              {editingConfig ? "Atualizar" : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}