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
                  full_name: { type: "string", description: "Nome completo" },
                  email: { type: "string", description: "Email válido" },
                  phone: { type: "string", description: "Telefone com código do país se possível" },
                  company_name: { type: "string", description: "Nome da empresa" },
                  job_title: { type: "string", description: "Cargo/função" },
                  address: { type: "string", description: "Morada completa" },
                  city: { type: "string", description: "Cidade" },
                  state: { type: "string", description: "Estado/Distrito" },
                  zip_code: { type: "string", description: "Código postal" },
                  country: { type: "string", description: "País" },
                  linkedin_url: { type: "string", description: "URL do LinkedIn" },
                  website: { type: "string", description: "Website pessoal ou da empresa" },
                  interests: { type: "array", items: { type: "string" }, description: "Interesses imobiliários (compra, venda, locais, tipos de imóvel)" },
                  budget_range: { type: "string", description: "Faixa de orçamento se mencionado" },
                  notes: { type: "string", description: "Notas adicionais" }
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
                  buyer_name: { type: "string", description: "Nome completo" },
                  buyer_email: { type: "string", description: "Email válido" },
                  buyer_phone: { type: "string", description: "Telefone" },
                  location: { type: "string", description: "Localização de interesse" },
                  preferred_cities: { type: "array", items: { type: "string" }, description: "Cidades preferidas" },
                  budget: { type: "number", description: "Orçamento em euros" },
                  budget_min: { type: "number", description: "Orçamento mínimo" },
                  budget_max: { type: "number", description: "Orçamento máximo" },
                  property_type_interest: { type: "string", description: "Tipo de imóvel de interesse" },
                  bedrooms_min: { type: "number", description: "Mínimo de quartos desejado" },
                  area_min: { type: "number", description: "Área mínima desejada em m²" },
                  desired_amenities: { type: "array", items: { type: "string" }, description: "Características desejadas" },
                  urgency: { type: "string", description: "Urgência (imediato, 1 mês, 3 meses, etc.)" },
                  financing_needed: { type: "boolean", description: "Se precisa de financiamento" },
                  message: { type: "string", description: "Mensagem ou comentários adicionais" },
                  lead_source: { type: "string", description: "Fonte do lead" }
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
      // Filter out sold/reserved items
      const filteredItems = (data.items || []).filter(item => {
        const status = (item.status || item.availability_status || "").toLowerCase();
        const title = (item.title || item.name || "").toLowerCase();
        const isSoldOrReserved = 
          status.includes("vendido") || status.includes("sold") ||
          status.includes("reservado") || status.includes("reserved") ||
          title.includes("vendido") || title.includes("sold") ||
          title.includes("reservado") || title.includes("reserved");
        return !isSoldOrReserved;
      });
      
      const filteredData = { ...data, items: filteredItems };
      setExtractedData(filteredData);
      setSelectedItems(filteredItems.map((_, idx) => idx) || []);
      setSelectedConfig(config);
      setActiveTab("preview");
      
      const removedCount = (data.items?.length || 0) - filteredItems.length;
      if (removedCount > 0) {
        toast.success(`${filteredItems.length} registos encontrados (${removedCount} vendidos/reservados excluídos)`);
      } else {
        toast.success(`${filteredItems.length} registos encontrados`);
      }
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
            // Validação de dados essenciais
            if (!item.title || item.title.length < 5) {
              results.errors.push({ item: item.title || "Sem título", error: "Título inválido ou muito curto" });
              results.items.push({ name: item.title || "Sem título", status: "error" });
              continue;
            }

            if (!validatePrice(item.price)) {
              results.errors.push({ item: item.title, error: "Preço inválido" });
              results.items.push({ name: item.title, status: "error" });
              continue;
            }

            if (!item.city || item.city.length < 2) {
              results.errors.push({ item: item.title, error: "Localização inválida" });
              results.items.push({ name: item.title, status: "error" });
              continue;
            }

            const { data: refData } = await base44.functions.invoke('generateRefId', { entity_type: 'Property' });
            
            // Determinar URL de origem - garantir sempre presente
            let finalSourceUrl = selectedConfig?.url || url; // URL base como fallback
            
            // Se o imóvel tem URL próprio válido, usar esse
            const hasValidSourceUrl = item.source_url && 
              item.source_url.startsWith('http') && 
              item.source_url !== selectedConfig?.url && 
              item.source_url !== url &&
              !item.source_url.includes('undefined');
            
            if (hasValidSourceUrl) {
              finalSourceUrl = ensureValidUrl(item.source_url);
            }
            
            // Se o imóvel tem URL próprio, tentar obter mais detalhes
            let enrichedData = {};
              
            if (hasValidSourceUrl) {
              try {
                console.log(`Enriching property from: ${item.source_url}`);
                const detailResult = await base44.integrations.Core.InvokeLLM({
                  prompt: `Analisa DETALHADAMENTE a página deste imóvel e extrai TODOS os dados disponíveis.

URL DO IMÓVEL: ${item.source_url}

EXTRAI OS SEGUINTES DADOS (se disponíveis na página):

📝 DESCRIÇÃO E TÍTULO:
- description: descrição COMPLETA do imóvel (todo o texto do anúncio, sem resumir)
- title: título melhorado se o atual for genérico

🏠 CARACTERÍSTICAS PRINCIPAIS:
- bedrooms: número de quartos (T1=1, T2=2, etc.)
- bathrooms: número de casas de banho
- useful_area: área útil em m²
- gross_area: área bruta de construção em m²
- balcony_area: área da varanda/terraço em m²
- storage_room: se tem arrecadação (boolean)
- storage_area: área da arrecadação em m²

🔧 DETALHES TÉCNICOS E ESTADO:
- energy_certificate: certificado energético (A+, A, B, B-, C, D, E, F ou isento)
- year_built: ano de construção (número)
- year_renovated: ano da última renovação (se aplicável)
- floor: andar (ex: "3º", "R/C", "Cave", "Cobertura")
- total_floors: número total de andares do prédio
- parking: estacionamento/garagem (ex: "1 lugar", "Box", "2 lugares", "Sem garagem")
- condition: estado de conservação detalhado (ex: "Novo", "Muito Bom", "Bom", "Para Renovar")
- orientation: orientação solar (Norte, Sul, Nascente, Poente, etc.)
- elevator: se tem elevador (boolean)

💰 INFORMAÇÕES FINANCEIRAS:
- condominium_fee: valor mensal do condomínio em euros (número)
- imt_tax: IMT estimado (se mencionado)
- property_tax: IMI anual (se mencionado)

🎨 ACABAMENTOS E DETALHES:
- amenities: array DETALHADO com TODAS as características mencionadas (ex: ["Varanda", "Elevador", "Ar condicionado central", "Cozinha equipada", "Arrecadação", "Vidros duplos", "Porta blindada", "Vídeo porteiro", "Piscina", "Jardim", "Ginásio", "Sauna", "Garagem Box", "Terraço", "Suite", "Closet", "Lareira", "Aquecimento central", "Painéis solares", "Alarme", "Condomínio fechado"])
- kitchen_equipped: se cozinha está equipada (boolean)
- furnished: se está mobilado (boolean)
- heating_type: tipo de aquecimento (ex: "Central", "AC", "Radiadores", "Piso radiante")
- window_type: tipo de janelas (ex: "Vidros duplos", "Alumínio", "PVC")
- flooring: tipo de pavimento (ex: "Madeira", "Cerâmico", "Mármore", "Flutuante")

📸 MULTIMÉDIA:
- images: array com URLs de TODAS as fotos do imóvel (máximo qualidade)
- virtual_tour_url: URL do tour virtual 360º (se disponível)
- video_url: URL de vídeo do imóvel (se disponível)

📍 LOCALIZAÇÃO COMPLETA:
- address: morada completa e detalhada
- city: cidade/concelho
- state: distrito
- zip_code: código postal
- neighborhood: bairro/freguesia
- proximity_features: array com pontos de interesse próximos (ex: ["Metro 5min", "Escola", "Supermercado", "Parque"])

Extrai o MÁXIMO de informação possível. Não inventes - apenas extrai o que está explicitamente na página.`,
                  add_context_from_internet: true,
                  response_json_schema: {
                    type: "object",
                    properties: {
                      description: { type: "string" },
                      title: { type: "string" },
                      images: { type: "array", items: { type: "string" } },
                      amenities: { type: "array", items: { type: "string" } },
                      energy_certificate: { type: "string" },
                      year_built: { type: "number" },
                      year_renovated: { type: "number" },
                      floor: { type: "string" },
                      total_floors: { type: "number" },
                      parking: { type: "string" },
                      condition: { type: "string" },
                      orientation: { type: "string" },
                      elevator: { type: "boolean" },
                      gross_area: { type: "number" },
                      useful_area: { type: "number" },
                      balcony_area: { type: "number" },
                      storage_room: { type: "boolean" },
                      storage_area: { type: "number" },
                      bedrooms: { type: "number" },
                      bathrooms: { type: "number" },
                      condominium_fee: { type: "number" },
                      imt_tax: { type: "number" },
                      property_tax: { type: "number" },
                      kitchen_equipped: { type: "boolean" },
                      furnished: { type: "boolean" },
                      heating_type: { type: "string" },
                      window_type: { type: "string" },
                      flooring: { type: "string" },
                      virtual_tour_url: { type: "string" },
                      video_url: { type: "string" },
                      address: { type: "string" },
                      city: { type: "string" },
                      state: { type: "string" },
                      zip_code: { type: "string" },
                      neighborhood: { type: "string" },
                      proximity_features: { type: "array", items: { type: "string" } }
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

            // Normalizar e enriquecer amenities
            const rawAmenities = [
              ...(item.amenities || []), 
              ...(enrichedData.amenities || []),
              ...(enrichedData.proximity_features || [])
            ];
            
            const normalizedAmenities = [...new Set(rawAmenities)]
              .filter(a => a && a.length > 2)
              .map(a => a.trim());

            // Adicionar amenities derivados de outros campos
            if (enrichedData.elevator) normalizedAmenities.push("Elevador");
            if (enrichedData.storage_room) normalizedAmenities.push("Arrecadação");
            if (enrichedData.kitchen_equipped) normalizedAmenities.push("Cozinha Equipada");
            if (enrichedData.furnished) normalizedAmenities.push("Mobilado");
            if (enrichedData.balcony_area && enrichedData.balcony_area > 0) normalizedAmenities.push("Varanda");
            if (enrichedData.heating_type) normalizedAmenities.push(enrichedData.heating_type);
            if (enrichedData.window_type) normalizedAmenities.push(enrichedData.window_type);
            
            const uniqueAmenities = [...new Set(normalizedAmenities)];

            // Combinar e validar imagens
            const combinedImages = [
              ...(enrichedData.images || []),
              ...(item.images || [])
            ].filter(img => img && img.startsWith('http')).slice(0, 30); // Max 30 imagens

            // Combinar vídeos se houver
            const videos = [];
            if (enrichedData.video_url) videos.push(enrichedData.video_url);
            if (enrichedData.virtual_tour_url) videos.push(enrichedData.virtual_tour_url);

            // Construir notas internas detalhadas
            const internalNotesArray = [];
            if (enrichedData.floor) internalNotesArray.push(`Andar: ${enrichedData.floor}`);
            if (enrichedData.total_floors) internalNotesArray.push(`Total andares edifício: ${enrichedData.total_floors}`);
            if (enrichedData.condominium_fee) internalNotesArray.push(`Condomínio: €${enrichedData.condominium_fee}/mês`);
            if (enrichedData.imt_tax) internalNotesArray.push(`IMT estimado: €${enrichedData.imt_tax}`);
            if (enrichedData.property_tax) internalNotesArray.push(`IMI anual: €${enrichedData.property_tax}`);
            if (enrichedData.balcony_area) internalNotesArray.push(`Área varanda: ${enrichedData.balcony_area}m²`);
            if (enrichedData.storage_area) internalNotesArray.push(`Área arrecadação: ${enrichedData.storage_area}m²`);
            if (enrichedData.flooring) internalNotesArray.push(`Pavimento: ${enrichedData.flooring}`);
            if (enrichedData.neighborhood) internalNotesArray.push(`Bairro: ${enrichedData.neighborhood}`);
            
            const internalNotes = internalNotesArray.join(' | ');

            // Construir descrição enriquecida se a original for curta
            let finalDescription = enrichedData.description || item.description || "";
            if (finalDescription.length < 100 && enrichedData.condition) {
              finalDescription = `${finalDescription}\n\nEstado: ${enrichedData.condition}`.trim();
            }

            const propertyData = {
              ref_id: refData.ref_id,
              title: (enrichedData.title || item.title).trim(),
              description: finalDescription.trim(),
              price: Number(item.price),
              property_type: mapPropertyType(item.property_type),
              listing_type: item.listing_type?.toLowerCase()?.includes("arrend") ? "rent" : "sale",
              bedrooms: Number(enrichedData.bedrooms || item.bedrooms || 0),
              bathrooms: Number(enrichedData.bathrooms || item.bathrooms || 0),
              useful_area: Number(enrichedData.useful_area || item.area || 0),
              gross_area: Number(enrichedData.gross_area || 0),
              square_feet: Number(enrichedData.useful_area || item.area || 0),
              address: (enrichedData.address || item.address || "").trim(),
              city: (enrichedData.city || item.city || "").trim(),
              state: (enrichedData.state || item.state || "").trim(),
              zip_code: enrichedData.zip_code?.trim() || undefined,
              country: "Portugal",
              images: combinedImages,
              videos: videos.length > 0 ? videos : undefined,
              amenities: uniqueAmenities,
              external_id: (item.external_id || "").trim(),
              source_url: finalSourceUrl,
              energy_certificate: mapEnergyCert(enrichedData.energy_certificate || item.energy_certificate),
              year_built: enrichedData.year_built || item.year_built || undefined,
              year_renovated: enrichedData.year_renovated || undefined,
              finishes: (enrichedData.condition || item.condition || "").trim() || undefined,
              garage: mapGarage(enrichedData.parking || item.parking),
              sun_exposure: mapSunExposure(enrichedData.orientation),
              internal_notes: internalNotes || undefined,
              status: "active",
              availability_status: "available",
              tags: ["Importado", "Sync Externa"]
            };

            await base44.entities.Property.create(propertyData);
            results.created++;
            results.items.push({ name: item.title, status: "success" });

          } else if (targetType === "contacts") {
            // Validação de contactos
            if (!item.full_name || item.full_name.length < 2) {
              results.errors.push({ item: item.full_name || "Sem nome", error: "Nome inválido" });
              results.items.push({ name: item.full_name || "Sem nome", status: "error" });
              continue;
            }

            if (item.email && !validateEmail(item.email)) {
              results.errors.push({ item: item.full_name, error: "Email inválido" });
              results.items.push({ name: item.full_name, status: "error" });
              continue;
            }

            if (item.phone && !validatePhone(item.phone)) {
              results.errors.push({ item: item.full_name, error: "Telefone inválido" });
              results.items.push({ name: item.full_name, status: "error" });
              continue;
            }

            if (item.email) {
              const existing = await base44.entities.ClientContact.filter({ email: item.email });
              if (existing.length > 0) {
                results.items.push({ name: item.full_name, status: "duplicate" });
                continue;
              }
            }

            const { data: refData } = await base44.functions.invoke('generateRefId', { entity_type: 'ClientContact' });
            
            // Construir notas enriquecidas
            const contactNotesArray = [];
            if (item.notes) contactNotesArray.push(item.notes);
            if (item.interests?.length > 0) contactNotesArray.push(`Interesses: ${item.interests.join(', ')}`);
            if (item.budget_range) contactNotesArray.push(`Orçamento: ${item.budget_range}`);
            if (item.linkedin_url) contactNotesArray.push(`LinkedIn: ${item.linkedin_url}`);
            if (item.website) contactNotesArray.push(`Website: ${item.website}`);
            contactNotesArray.push(`Importado de: ${selectedConfig?.url || url}`);

            const contactData = {
              ref_id: refData.ref_id,
              full_name: item.full_name.trim(),
              email: item.email?.trim() || "",
              phone: item.phone?.trim() || "",
              company_name: item.company_name?.trim() || "",
              job_title: item.job_title?.trim() || "",
              address: item.address?.trim() || "",
              city: item.city?.trim() || "",
              state: item.state?.trim() || "",
              zip_code: item.zip_code?.trim() || "",
              country: item.country?.trim() || "Portugal",
              notes: contactNotesArray.join('\n'),
              source: "other",
              contact_type: "client"
            };

            await base44.entities.ClientContact.create(contactData);
            results.created++;
            results.items.push({ name: item.full_name, status: "success" });

          } else if (targetType === "developments") {
            // Validação de empreendimentos
            if (!item.name || item.name.length < 3) {
              results.errors.push({ item: item.name || "Sem nome", error: "Nome inválido" });
              results.items.push({ name: item.name || "Sem nome", status: "error" });
              continue;
            }

            if (!item.city) {
              results.errors.push({ item: item.name, error: "Localização inválida" });
              results.items.push({ name: item.name, status: "error" });
              continue;
            }

            // Determinar URL de origem para empreendimentos
            const developmentSourceUrl = item.source_url && item.source_url.startsWith('http')
              ? ensureValidUrl(item.source_url)
              : ensureValidUrl(selectedConfig?.url || url);

            // Validar e normalizar imagens
            const validImages = (item.images || [])
              .filter(img => img && img.startsWith('http'))
              .slice(0, 30);

            // Normalizar amenities
            const validAmenities = (item.amenities || [])
              .filter(a => a && a.length > 2)
              .map(a => a.trim());

            const developmentData = {
              name: item.name.trim(),
              description: (item.description || "").trim(),
              developer_name: (item.developer_name || "").trim(),
              address: (item.address || "").trim(),
              city: item.city.trim(),
              district: (item.state || "").trim(),
              total_units: Number(item.total_units || 0),
              available_units: Number(item.available_units || item.total_units || 0),
              price_from: Number(item.price_from || 0),
              price_to: Number(item.price_to || 0),
              completion_date: item.completion_date || undefined,
              status: mapDevelopmentStatus(item.status),
              property_types: item.property_types || [],
              amenities: validAmenities,
              images: validImages,
              source_url: developmentSourceUrl,
              external_id: (item.external_id || "").trim()
            };

            await base44.entities.Development.create(developmentData);
            results.created++;
            results.items.push({ name: item.name, status: "success" });

          } else if (targetType === "opportunities") {
            // Validação de oportunidades
            if (!item.buyer_name || item.buyer_name.length < 2) {
              results.errors.push({ item: item.buyer_name || "Sem nome", error: "Nome inválido" });
              results.items.push({ name: item.buyer_name || "Sem nome", status: "error" });
              continue;
            }

            if (item.buyer_email && !validateEmail(item.buyer_email)) {
              results.errors.push({ item: item.buyer_name, error: "Email inválido" });
              results.items.push({ name: item.buyer_name, status: "error" });
              continue;
            }

            if (item.buyer_phone && !validatePhone(item.buyer_phone)) {
              results.errors.push({ item: item.buyer_name, error: "Telefone inválido" });
              results.items.push({ name: item.buyer_name, status: "error" });
              continue;
            }

            const { data: refData } = await base44.functions.invoke('generateRefId', { entity_type: 'Opportunity' });
            
            // Construir mensagem enriquecida
            const messageArray = [];
            if (item.message) messageArray.push(item.message);
            if (item.preferred_cities?.length > 0) messageArray.push(`Cidades: ${item.preferred_cities.join(', ')}`);
            if (item.bedrooms_min) messageArray.push(`Mín. ${item.bedrooms_min} quartos`);
            if (item.area_min) messageArray.push(`Mín. ${item.area_min}m²`);
            if (item.desired_amenities?.length > 0) messageArray.push(`Deseja: ${item.desired_amenities.join(', ')}`);
            if (item.urgency) messageArray.push(`Urgência: ${item.urgency}`);
            if (item.financing_needed) messageArray.push(`Necessita financiamento`);
            messageArray.push(`Importado de: ${selectedConfig?.url || url}`);

            const oppData = {
              ref_id: refData.ref_id,
              lead_type: "comprador",
              buyer_name: item.buyer_name.trim(),
              buyer_email: item.buyer_email?.trim() || "",
              buyer_phone: item.buyer_phone?.trim() || "",
              location: (item.preferred_cities?.join(', ') || item.location)?.trim() || "",
              budget: Number(item.budget_max || item.budget || 0),
              property_type_interest: item.property_type_interest?.trim() || "",
              message: messageArray.join('\n'),
              lead_source: "other",
              source_url: ensureValidUrl(selectedConfig?.url || url),
              source_detail: item.lead_source?.trim() || undefined,
              urgency: mapUrgency(item.urgency),
              financing_status: item.financing_needed ? "pending" : "unknown",
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

  // Validation helpers
  const validateEmail = (email) => {
    if (!email) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePrice = (price) => {
    const num = Number(price);
    return !isNaN(num) && num > 0 && num < 1000000000;
  };

  const validatePhone = (phone) => {
    if (!phone) return true; // Optional field
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length >= 9 && cleaned.length <= 15;
  };

  const ensureValidUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `https://${url}`;
  };

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

  const mapSunExposure = (orientation) => {
    if (!orientation) return undefined;
    const lower = orientation.toLowerCase();
    if (lower.includes("norte") && lower.includes("sul")) return "north_south";
    if (lower.includes("nascente") && lower.includes("poente")) return "east_west";
    if (lower.includes("este") && lower.includes("oeste")) return "east_west";
    if (lower.includes("todas")) return "all";
    if (lower.includes("norte") || lower.includes("north")) return "north";
    if (lower.includes("sul") || lower.includes("south")) return "south";
    if (lower.includes("nascente") || lower.includes("este") || lower.includes("east")) return "east";
    if (lower.includes("poente") || lower.includes("oeste") || lower.includes("west")) return "west";
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

  const mapUrgency = (urgency) => {
    if (!urgency) return undefined;
    const lower = urgency.toLowerCase();
    if (lower.includes("imed") || lower.includes("urgent") || lower.includes("agora")) return "immediate";
    if (lower.includes("1 m") || lower.includes("mês")) return "1_month";
    if (lower.includes("3 m")) return "3_months";
    if (lower.includes("6 m")) return "6_months";
    if (lower.includes("1 ano") || lower.includes("year")) return "1_year";
    if (lower.includes("explorar") || lower.includes("look")) return "just_looking";
    return undefined;
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