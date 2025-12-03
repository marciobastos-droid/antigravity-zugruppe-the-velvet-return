import React from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Upload, FileText, Loader2, CheckCircle2, AlertCircle, ExternalLink, Hash, ImageIcon, Globe, AlertTriangle, Eye, X, ArrowRight, Building2, Users2, User, MessageSquareText, Search, Sparkles } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

const propertySchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    description: { type: "string" },
    property_type: { type: "string", enum: ["apartment", "house", "land", "building", "farm", "store", "warehouse", "office"] },
    listing_type: { type: "string", enum: ["sale", "rent"] },
    price: { type: "number" },
    bedrooms: { type: "number" },
    bathrooms: { type: "number" },
    square_feet: { type: "number" },
    address: { type: "string" },
    city: { type: "string" },
    state: { type: "string" },
    zip_code: { type: "string" },
    year_built: { type: "number" },
    images: { type: "array", items: { type: "string" } },
    amenities: { type: "array", items: { type: "string" } },
    external_id: { type: "string" },
    source_url: { type: "string" }
  },
  required: ["title", "property_type", "listing_type", "price", "city"]
};

const portalGroups = {
  genericos: {
    label: "Portais Genéricos",
    portals: [
      { name: "Idealista", domain: "idealista.pt", color: "bg-yellow-100 text-yellow-800" },
      { name: "Imovirtual", domain: "imovirtual.com", color: "bg-green-100 text-green-800" },
      { name: "Supercasa", domain: "supercasa.pt", color: "bg-red-100 text-red-800" },
      { name: "Casa SAPO", domain: "casa.sapo.pt", color: "bg-blue-100 text-blue-800" },
      { name: "Infocasa", domain: "infocasa.pt", color: "bg-purple-100 text-purple-800" },
      { name: "CustoJusto", domain: "custojusto.pt", color: "bg-orange-100 text-orange-800" },
      { name: "OLX", domain: "olx.pt", color: "bg-teal-100 text-teal-800" }
    ]
  },
  redes: {
    label: "Redes Imobiliárias",
    portals: [
      { name: "RE/MAX", domain: "remax.pt", color: "bg-red-100 text-red-800" },
      { name: "ERA", domain: "era.pt", color: "bg-blue-100 text-blue-800" },
      { name: "Century 21", domain: "century21.pt", color: "bg-amber-100 text-amber-800" },
      { name: "Keller Williams", domain: "kwportugal.pt", color: "bg-rose-100 text-rose-800" },
      { name: "Luximos", domain: "luximos.pt", color: "bg-amber-100 text-amber-800" },
      { name: "JLL", domain: "jll.pt", color: "bg-blue-100 text-blue-800" }
    ]
  },
  internacionais: {
    label: "Internacionais",
    portals: [
      { name: "Kyero", domain: "kyero.com", color: "bg-emerald-100 text-emerald-800" },
      { name: "Green Acres", domain: "green-acres.pt", color: "bg-green-100 text-green-800" },
      { name: "Quatru", domain: "quatru.pt", color: "bg-indigo-100 text-indigo-800" },
      { name: "ImovelWeb", domain: "imovelweb.com", color: "bg-cyan-100 text-cyan-800" }
    ]
  }
};

const supportedPortals = [
  ...portalGroups.genericos.portals,
  ...portalGroups.redes.portals,
  ...portalGroups.internacionais.portals
];

const fieldLabels = {
  title: "Título",
  description: "Descrição",
  property_type: "Tipo de Imóvel",
  listing_type: "Tipo de Anúncio",
  price: "Preço",
  bedrooms: "Quartos",
  bathrooms: "WCs",
  square_feet: "Área (m²)",
  address: "Morada",
  city: "Cidade",
  state: "Distrito",
  zip_code: "Código Postal",
  year_built: "Ano de Construção",
  images: "Imagens",
  amenities: "Comodidades"
};

const detectPropertyTypes = async (title, description, price) => {
  try {
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Analisa este imóvel e classifica-o corretamente:

TÍTULO: "${title}"
DESCRIÇÃO: ${description || 'Sem descrição'}
PREÇO: €${price || 0}

INSTRUÇÕES:
1. property_type - Natureza do imóvel:
   - "apartment" = Apartamento, andar, flat
   - "house" = Moradia, vivenda, casa independente
   - "land" = Terreno, lote
   - "building" = Prédio inteiro
   - "farm" = Quinta, herdade, propriedade rural
   - "store" = Loja, espaço comercial
   - "warehouse" = Armazém, pavilhão industrial
   - "office" = Escritório, gabinete

2. listing_type - Tipo de negócio:
   - "sale" = Venda (preços tipicamente > €50.000)
   - "rent" = Arrendamento (preços tipicamente < €5.000/mês)

Analisa o contexto do título, descrição e preço para determinar corretamente.`,
      response_json_schema: {
        type: "object",
        properties: {
          property_type: { type: "string", enum: ["apartment", "house", "land", "building", "farm", "store", "warehouse", "office"] },
          listing_type: { type: "string", enum: ["sale", "rent"] }
        }
      }
    });
    return result;
  } catch {
    return null;
  }
};

const generatePropertyTags = async (property) => {
  try {
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Gera tags e categorias para este imóvel para organização e pesquisa.

IMÓVEL:
Título: ${property.title || ''}
Tipo: ${property.property_type || ''}
Localização: ${property.city || ''}, ${property.state || ''}
Preço: €${property.price || 0}
${property.bedrooms ? `Quartos: ${property.bedrooms}` : ''}
${property.square_feet ? `Área: ${property.square_feet}m²` : ''}
${property.year_built ? `Ano: ${property.year_built}` : ''}
Descrição: ${property.description || 'Sem descrição'}
Comodidades: ${property.amenities?.join(', ') || 'Nenhuma'}

INSTRUÇÕES:
1. Gera 5-8 tags relevantes
2. Inclui: localização (zona/bairro), estilo (moderno, renovado, luxo), target (família, investimento), diferenciadores
3. PORTUGUÊS, minúsculas, sem acentos
4. Tags úteis para pesquisa

Retorna array de strings.`,
      response_json_schema: {
        type: "object",
        properties: {
          tags: { type: "array", items: { type: "string" } }
        }
      }
    });
    return result.tags || [];
  } catch {
    return [];
  }
};

const validateProperty = (prop, portalName) => {
  const errors = [];
  const warnings = [];
  
  // Validação mínima - apenas campos obrigatórios básicos
  if (!prop.title || prop.title.trim().length === 0) {
    errors.push("Título ausente");
  }
  
  // Avisos informativos (não bloqueiam)
  if (!prop.price || prop.price <= 0) {
    warnings.push("Preço não especificado");
  }
  
  if (!prop.city) {
    warnings.push("Cidade não especificada");
  }
  
  if (!prop.images || prop.images.length === 0) {
    warnings.push("Sem imagens");
  }
  
  return { errors, warnings, isValid: errors.length === 0 };
};

// Função para criar ou atualizar imóveis, verificando duplicados por ref_id
const createOrUpdateProperties = async (base44, properties, queryClient) => {
  const results = { created: [], updated: [], errors: [] };
  
  // Buscar todos os ref_ids existentes
  const existingProperties = await base44.entities.Property.list('-created_date', 10000);
  const existingByRefId = new Map();
  existingProperties.forEach(p => {
    if (p.ref_id) {
      existingByRefId.set(p.ref_id, p);
    }
  });
  
  for (const property of properties) {
    try {
      // Verificar se já existe um imóvel com este ref_id
      const existing = existingByRefId.get(property.ref_id);
      
      if (existing) {
        // Atualizar imóvel existente
        const { id, created_date, updated_date, created_by, ...updateData } = property;
        await base44.entities.Property.update(existing.id, updateData);
        results.updated.push({ ...existing, ...updateData });
        console.log(`[ImportProperties] ATUALIZADO: ${property.ref_id} - ${property.title}`);
      } else {
        // Criar novo imóvel
        const created = await base44.entities.Property.create(property);
        results.created.push(created);
        console.log(`[ImportProperties] CRIADO: ${property.ref_id} - ${property.title}`);
      }
    } catch (error) {
      console.error(`[ImportProperties] ERRO ao processar ${property.ref_id}:`, error);
      results.errors.push({ property, error: error.message });
    }
  }
  
  return results;
};

// Função para bulk create/update com verificação de duplicados
const bulkCreateOrUpdate = async (base44, properties) => {
  // Buscar todos os ref_ids existentes de uma vez
  const existingProperties = await base44.entities.Property.list('-created_date', 10000);
  const existingByRefId = new Map();
  existingProperties.forEach(p => {
    if (p.ref_id) {
      existingByRefId.set(p.ref_id, p);
    }
  });
  
  const toCreate = [];
  const toUpdate = [];
  
  for (const property of properties) {
    const existing = existingByRefId.get(property.ref_id);
    if (existing) {
      toUpdate.push({ id: existing.id, data: property });
    } else {
      toCreate.push(property);
    }
  }
  
  const results = { created: [], updated: [], total: 0 };
  
  // Criar novos imóveis em bulk
  if (toCreate.length > 0) {
    const created = await base44.entities.Property.bulkCreate(toCreate);
    results.created = created;
    console.log(`[ImportProperties] BULK CRIADOS: ${created.length} imóveis`);
  }
  
  // Atualizar imóveis existentes um a um (bulk update não está disponível)
  for (const { id, data } of toUpdate) {
    try {
      const { ref_id, ...updateData } = data; // Manter o ref_id original
      await base44.entities.Property.update(id, updateData);
      results.updated.push({ id, ...data });
      console.log(`[ImportProperties] ATUALIZADO: ${data.ref_id} - ${data.title}`);
    } catch (error) {
      console.error(`[ImportProperties] ERRO ao atualizar ${data.ref_id}:`, error);
    }
  }
  
  results.total = results.created.length + results.updated.length;
  
  return results;
};

export default function ImportProperties() {
  const queryClient = useQueryClient();
  const [file, setFile] = React.useState(null);
  const [fileType, setFileType] = React.useState(null);
  const [url, setUrl] = React.useState("");

  const [importing, setImporting] = React.useState(false);
  const [progress, setProgress] = React.useState("");
  const [results, setResults] = React.useState(null);
  const [importProgress, setImportProgress] = React.useState({ current: 0, total: 0, isRunning: false });
  const [validationDetails, setValidationDetails] = React.useState(null);
  const [propertyOwnership, setPropertyOwnership] = React.useState("own"); // "own", "partner", "private"
  const [selectedPartner, setSelectedPartner] = React.useState(null);
  const [privateOwnerName, setPrivateOwnerName] = React.useState("");
  const [privateOwnerPhone, setPrivateOwnerPhone] = React.useState("");
  
  const { data: partners = [] } = useQuery({
    queryKey: ['partners'],
    queryFn: async () => {
      const profiles = await base44.entities.BuyerProfile.list();
      return profiles.filter(p => 
        p.profile_type === 'parceiro' || 
        p.profile_type === 'parceiro_comprador' || 
        p.profile_type === 'parceiro_vendedor'
      );
    },
  });

  const { data: clientContacts = [] } = useQuery({
    queryKey: ['partnerContacts'],
    queryFn: async () => {
      const contacts = await base44.entities.ClientContact.list();
      return contacts.filter(c => c.contact_type === 'partner');
    },
  });

  // Combine partners from both sources
  const allPartners = React.useMemo(() => {
    const combined = [];
    partners.forEach(p => combined.push({ 
      id: p.id, 
      name: p.buyer_name, 
      email: p.buyer_email,
      source: 'profile'
    }));
    clientContacts.forEach(c => combined.push({ 
      id: c.id, 
      name: c.full_name, 
      email: c.email,
      source: 'contact'
    }));
    return combined;
  }, [partners, clientContacts]);
  
  // CSV Preview State
  const [csvPreview, setCsvPreview] = React.useState(null);
  const [columnMapping, setColumnMapping] = React.useState({});
  const [previewData, setPreviewData] = React.useState([]);
  const [selectedRows, setSelectedRows] = React.useState([]);
  const [editingRow, setEditingRow] = React.useState(null);
  const [showPreview, setShowPreview] = React.useState(false);
  
  // Text Import State
  const [textInput, setTextInput] = React.useState("");
  const [textImporting, setTextImporting] = React.useState(false);
  const [textProgress, setTextProgress] = React.useState("");
  const [extractedProperties, setExtractedProperties] = React.useState([]);
  const [showTextPreview, setShowTextPreview] = React.useState(false);

  const detectPortal = (url) => {
    for (const portal of supportedPortals) {
      if (url.includes(portal.domain)) {
        return portal;
      }
    }
    return { name: "Outro Portal", domain: "", color: "bg-slate-100 text-slate-800" };
  };

  const parseCSV = (text) => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length === 0) return { headers: [], rows: [] };
    
    // Attempt to detect delimiter (comma, semicolon, tab) by checking first line
    let delimiter = ',';
    if (lines[0].includes(';')) {
        delimiter = ';';
    } else if (lines[0].includes('\t')) {
        delimiter = '\t';
    }

    const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^"|"$/g, '')); // Remove surrounding quotes
    const rows = lines.slice(1).map(line => {
      const values = line.split(delimiter).map(v => v.trim().replace(/^"|"$/g, '')); // Remove surrounding quotes
      const row = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx] || '';
      });
      return row;
    });
    
    return { headers, rows };
  };

  const handleCSVPreview = async (file) => {
    try {
      const text = await file.text();
      const { headers, rows } = parseCSV(text);
      
      if (headers.length === 0 || rows.length === 0) {
        toast.error("CSV vazio ou inválido");
        return;
      }

      // Auto-detect column mappings
      const autoMapping = {};
      const commonMappings = {
        'title': ['titulo', 'title', 'nome', 'name'],
        'description': ['descricao', 'description', 'desc'],
        'price': ['preco', 'price', 'valor', 'value'],
        'city': ['cidade', 'city', 'localidade'],
        'property_type': ['tipo', 'type', 'tipologia'],
        'listing_type': ['negocio', 'transaction', 'listing'],
        'bedrooms': ['quartos', 'bedrooms', 'rooms', 't'],
        'bathrooms': ['wc', 'bathrooms', 'casas de banho'],
        'square_feet': ['area', 'area_util', 'square_feet', 'm2', 'metros'],
        'address': ['morada', 'address', 'endereco'],
        'state': ['distrito', 'state', 'regiao'],
        'images': ['imagens', 'images', 'fotos', 'photos'],
        'amenities': ['amenities', 'comodidades', 'features']
      };

      headers.forEach(header => {
        const lowerHeader = header.toLowerCase();
        for (const [field, variants] of Object.entries(commonMappings)) {
          if (variants.some(v => lowerHeader.includes(v))) {
            autoMapping[header] = field;
            break;
          }
        }
      });

      setCsvPreview({ headers, rows });
      setColumnMapping(autoMapping);
      setPreviewData(rows.slice(0, 10)); // Show only first 10 rows for preview
      setSelectedRows(rows.map((_, idx) => idx)); // Select all by default
      setShowPreview(true);
      
      toast.success(`CSV carregado: ${rows.length} linhas`);
    } catch (error) {
      toast.error("Erro ao ler CSV");
      console.error(error);
    }
  };

  const processMappedData = () => {
    if (!csvPreview) return [];
    
    const selectedData = csvPreview.rows.filter((_, idx) => selectedRows.includes(idx));
    
    return selectedData.map(row => {
      const property = {};
      
      Object.entries(columnMapping).forEach(([csvCol, propertyField]) => {
        if (!propertyField || !row[csvCol]) return; // Skip if no mapping or no data
        
        let value = row[csvCol];
        
        // Process specific fields
        if (['price', 'bedrooms', 'bathrooms', 'square_feet', 'year_built'].includes(propertyField)) {
          // Clean number strings for Portuguese format (e.g., "120.000,50" -> 120000.50, or "120.000" -> 120000)
          value = value.toString().replace(/\./g, '').replace(/,/g, '.'); // Remove thousand separators, replace comma decimal with dot
          value = parseFloat(value); // Convert to number
          if (isNaN(value)) value = 0; // Default to 0 if not a valid number
        } else if (propertyField === 'images') {
          value = value.split(/[,;|]/).map(s => s.trim()).filter(Boolean); // Split by comma, semicolon, or pipe
        } else if (propertyField === 'amenities') {
          value = value.split(/[,;|]/).map(s => s.trim()).filter(Boolean); // Split by comma, semicolon, or pipe
        }
        
        property[propertyField] = value;
      });
      
      // Ensure required fields have valid types/fallbacks if LLM detection is skipped
      property.property_type = property.property_type || 'apartment'; // default for missing type
      property.listing_type = property.listing_type || 'sale'; // default for missing type
      
      return property;
    });
  };

  const handleImportFromPreview = async () => {
    setImporting(true);
    setProgress("A processar dados...");
    setImportProgress({ current: 0, total: 100, isRunning: true });
    
    try {
      const properties = processMappedData();
      
      if (properties.length === 0) {
        throw new Error("Nenhum dado válido para importar");
      }

      setImportProgress({ current: 10, total: 100, isRunning: true });
      setProgress(`A classificar ${properties.length} imóveis com IA...`);

      // Always use AI to detect/confirm property and listing type
      const processedProperties = await Promise.all(
        properties.map(async (p) => {
          const detected = await detectPropertyTypes(p.title, p.description, p.price);
          if (detected) {
            return {
              ...p,
              property_type: detected.property_type || p.property_type || 'apartment',
              listing_type: detected.listing_type || p.listing_type || 'sale'
            };
          }
          return {
            ...p,
            property_type: p.property_type || 'apartment',
            listing_type: p.listing_type || 'sale'
          };
        })
      );

      setImportProgress({ current: 30, total: 100, isRunning: true });
      setProgress(`A validar ${processedProperties.length} imóveis...`);

      const validationResults = processedProperties.map(prop => ({
        property: prop,
        validation: validateProperty(prop, 'CSV Import')
      }));

      const validProperties = validationResults.filter(v => v.validation.isValid).map(v => v.property);
      const invalidProperties = validationResults.filter(v => !v.validation.isValid);

      setValidationDetails({
        total: properties.length,
        valid: validProperties.length,
        invalid: invalidProperties.length,
        details: validationResults
      });


      if (validProperties.length === 0) {
        throw new Error("Nenhum imóvel passou na validação. Verifica os dados mapeados e selecionados.");
      }

      setImportProgress({ current: 50, total: 100, isRunning: true });
      setProgress(`A gerar tags com IA para ${validProperties.length} imóveis...`);
      const propertiesWithTags = await Promise.all(
        validProperties.map(async (p) => {
          const tags = await generatePropertyTags(p);
          return { ...p, tags };
        })
      );

      setImportProgress({ current: 70, total: 100, isRunning: true });
      setProgress(`A guardar ${propertiesWithTags.length} imóveis...`);

      // Generate sequential ref_ids for all properties in batch
      const { data: refData } = await base44.functions.invoke('generateRefId', { 
        entity_type: 'Property', 
        count: propertiesWithTags.length 
      });
      const refIds = refData.ref_ids || [refData.ref_id];

      const propertiesWithRefIds = propertiesWithTags.map((p, index) => ({
        ...p,
        ref_id: refIds[index],
        status: "active",
        address: p.address || p.city,
        state: p.state || p.city,
        source_url: 'CSV Import',
        is_partner_property: propertyOwnership === "partner",
        partner_id: propertyOwnership === "partner" ? selectedPartner?.id : undefined,
        partner_name: propertyOwnership === "partner" ? selectedPartner?.name : 
                      propertyOwnership === "private" ? privateOwnerName : undefined,
        internal_notes: propertyOwnership === "private" && privateOwnerPhone ? 
                       `Proprietário particular: ${privateOwnerName} - Tel: ${privateOwnerPhone}` : undefined
      }));
      
      // Usar bulk create/update com verificação de duplicados
      const importResults = await bulkCreateOrUpdate(base44, propertiesWithRefIds);
      
      setImportProgress({ current: 100, total: 100, isRunning: false });
      
      const totalProcessed = importResults.created.length + importResults.updated.length;
      setResults({
        success: true,
        count: totalProcessed,
        properties: [...importResults.created, ...importResults.updated],
        message: `✅ ${totalProcessed} imóveis processados de CSV!\n📥 ${importResults.created.length} criados\n🔄 ${importResults.updated.length} atualizados${invalidProperties.length > 0 ? `\n⚠️ ${invalidProperties.length} rejeitados por validação` : ''}`
      });
      
      await queryClient.invalidateQueries({ queryKey: ['properties'] });
      await queryClient.invalidateQueries({ queryKey: ['myProperties'] });
      toast.success(`${created.length} imóveis importados com sucesso!`);
      setShowPreview(false); // Close the dialog on success

    } catch (error) {
      setResults({ success: false, message: error.message || "Erro ao processar CSV" });
      toast.error("Erro na importação");
      setImportProgress({ current: 0, total: 0, isRunning: false });
    }
    
    setImporting(false);
  };



  const importFromJSON = async (file) => {
    setImporting(true);
    setProgress("A processar JSON...");
    
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      let properties = [];
      if (Array.isArray(data)) {
        properties = data;
      } else if (data.properties && Array.isArray(data.properties)) {
        properties = data.properties;
      } else if (typeof data === 'object') {
        properties = [data];
      }

      if (properties.length === 0) {
        throw new Error("Nenhum imóvel encontrado no JSON");
      }

      setProgress(`A classificar ${properties.length} imóveis com IA...`);

      // Always use AI to detect/confirm property and listing type
      const processedProperties = await Promise.all(
        properties.map(async (p) => {
          const detected = await detectPropertyTypes(p.title, p.description, p.price);
          if (detected) {
            return {
              ...p,
              property_type: detected.property_type || p.property_type || 'apartment',
              listing_type: detected.listing_type || p.listing_type || 'sale'
            };
          }
          return {
            ...p,
            property_type: p.property_type || 'apartment',
            listing_type: p.listing_type || 'sale'
          };
        })
      );

      const validProperties = processedProperties.filter(p => 
        p.title && p.property_type && p.listing_type && p.price && p.city
      );

      if (validProperties.length === 0) {
        throw new Error("Nenhum imóvel válido no JSON");
      }

      // Gerar tags com IA para cada imóvel
      setProgress(`A gerar tags com IA para ${validProperties.length} imóveis...`);
      const propertiesWithTags = await Promise.all(
        validProperties.map(async (p) => {
          const tags = await generatePropertyTags(p);
          return { ...p, tags };
        })
      );

      // Generate sequential ref_ids for all properties in batch
      const { data: refData } = await base44.functions.invoke('generateRefId', { 
        entity_type: 'Property', 
        count: propertiesWithTags.length 
      });
      const refIds = refData.ref_ids || [refData.ref_id];

      const propertiesWithRefIds = propertiesWithTags.map((p, index) => ({
        ...p,
        ref_id: refIds[index],
        status: "active",
        address: p.address || p.city,
        state: p.state || p.city,
        is_partner_property: propertyOwnership === "partner",
        partner_id: propertyOwnership === "partner" ? selectedPartner?.id : undefined,
        partner_name: propertyOwnership === "partner" ? selectedPartner?.name : 
                      propertyOwnership === "private" ? privateOwnerName : undefined,
        internal_notes: propertyOwnership === "private" && privateOwnerPhone ? 
                       `Proprietário particular: ${privateOwnerName} - Tel: ${privateOwnerPhone}` : undefined
      }));
      
      // Usar bulk create/update com verificação de duplicados
      const importResults = await bulkCreateOrUpdate(base44, propertiesWithRefIds);
      
      const totalProcessed = importResults.created.length + importResults.updated.length;
      setResults({
        success: true,
        count: totalProcessed,
        properties: [...importResults.created, ...importResults.updated],
        message: `✅ ${totalProcessed} imóveis processados de JSON!\n📥 ${importResults.created.length} criados\n🔄 ${importResults.updated.length} atualizados`
      });
      
      await queryClient.invalidateQueries({ queryKey: ['properties'] });
      await queryClient.invalidateQueries({ queryKey: ['myProperties'] });
      toast.success(`${created.length} imóveis importados!`);

    } catch (error) {
      setResults({ success: false, message: error.message || "Erro ao processar JSON" });
      toast.error("Erro no JSON");
    }
    
    setImporting(false);
  };

  const importFromCSV = async (file) => {
    setImporting(true);
    setProgress("A carregar ficheiro...");
    
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setProgress("A extrair dados...");
      
      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          properties: { properties: { type: "array", items: propertySchema } }
        }
      });

      if (result.status === "success" && result.output?.properties) {
        setProgress(`A classificar ${result.output.properties.length} imóveis com IA...`);
        const processedProperties = await Promise.all(
          result.output.properties.map(async (p) => {
            const detected = await detectPropertyTypes(p.title, p.description, p.price);
            if (detected) {
              return { 
                ...p, 
                property_type: detected.property_type || p.property_type || 'apartment', 
                listing_type: detected.listing_type || p.listing_type || 'sale' 
              };
            }
            return {
              ...p,
              property_type: p.property_type || 'apartment',
              listing_type: p.listing_type || 'sale'
            };
          })
        );
        
        const created = await base44.entities.Property.bulkCreate(
          processedProperties.map(p => ({ ...p, status: "active" }))
        );
        
        setResults({
          success: true,
          count: created.length,
          properties: created,
          message: `${created.length} imóveis importados!`
        });
        
        await queryClient.invalidateQueries({ queryKey: ['properties'] });
        await queryClient.invalidateQueries({ queryKey: ['myProperties'] });
        toast.success(`${created.length} imóveis importados!`);
      } else {
        throw new Error("Erro ao extrair dados");
      }
    } catch (error) {
      setResults({ success: false, message: error.message });
      toast.error("Erro");
    }
    
    setImporting(false);
  };



  const importFromURL = async () => {
    if (!url || !url.trim()) {
      toast.error("Por favor, cole um link válido");
      return;
    }

    setImporting(true);
    setValidationDetails(null);
    setResults(null);
    const portal = detectPortal(url);
    setProgress(`A analisar página de ${portal.name}...`);
    toast.info(`A processar link de ${portal.name}...`);
    
    try {
      const urlObj = new URL(url);
      const baseUrl = urlObj.origin;
      
      // Detect if it's a listing page or detail page
      const detailPatterns = /\/imovel\/|\/anuncio\/|\/propriedade\/|\/property\/|\/detalhe\/|\/ficha\/|\?id=|\/[0-9]{6,}\/?$/;
      const listingPatterns = /\/comprar|\/arrendar|\/venda|\/aluguer|\/pesquisa|\/resultados|\/listagem|\/imoveis|lista|search|results|\?/;
      
      const isDetailPage = detailPatterns.test(url) && !listingPatterns.test(url);
      const isListingPage = listingPatterns.test(url) || url.match(/\/[a-z-]+\/[a-z-]+\/?$/);
      
      setProgress(isDetailPage ? "A extrair imóvel único..." : "🔍 A detetar listagem de imóveis...");
      
      // Enhanced prompt for listing detection
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Extrai TODOS os imóveis desta página de portal imobiliário português.

URL: ${url}

EXTRAI cada imóvel com:
- title: título do anúncio
- price: preço em número (875.000€ = 875000)
- bedrooms: número de quartos (T4 = 4, T5 = 5)
- square_feet: área em m² 
- city: cidade (ex: Aveiro, Lisboa)
- state: distrito
- address: morada se disponível
- property_type: "apartment" para apartamento/penthouse/duplex, "house" para moradia
- listing_type: "sale" para venda, "rent" para arrendamento
- external_id: ID do anúncio (extrair do link, ex: 34231937)
- detail_url: link completo do anúncio
- description: descrição curta

IMPORTANTE:
- Extrai TODOS os imóveis listados na página
- Preços portugueses: 875.000€ = 875000, 1.450.000€ = 1450000
- Se URL contém "comprar" é venda, se contém "arrendar" é arrendamento
- Apenas inclui campos que consegues extrair`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            is_listing_page: { type: "boolean" },
            total_found: { type: "number" },
            properties: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  property_type: { type: "string" },
                  listing_type: { type: "string" },
                  price: { type: "number" },
                  bedrooms: { type: "number" },
                  bathrooms: { type: "number" },
                  square_feet: { type: "number" },
                  address: { type: "string" },
                  city: { type: "string" },
                  state: { type: "string" },
                  external_id: { type: "string" },
                  detail_url: { type: "string" }
                },
                required: ["title", "price"]
              }
            }
          },
          required: ["properties"]
        }
      });

      if (!result?.properties || result.properties.length === 0) {
        throw new Error(`Nenhum imóvel encontrado em ${portal.name}. Verifica o link.`);
      }
      
      // Show listing detection result
      if (result.is_listing_page) {
        setProgress(`📋 Listagem detetada! Encontrados ${result.properties.length} imóveis${result.total_found ? ` de ${result.total_found} total` : ''}`);
        toast.info(`Página de listagem detetada com ${result.properties.length} imóveis`);
      }

      setProgress("A validar dados...");

      // Validação rigorosa
      const validationResults = result.properties.map(prop => ({
        property: prop,
        validation: validateProperty(prop, portal.name)
      }));

      const validProperties = validationResults.filter(v => v.validation.isValid);
      const invalidProperties = validationResults.filter(v => !v.validation.isValid);

      setValidationDetails({
        total: result.properties.length,
        valid: validProperties.length,
        invalid: invalidProperties.length,
        details: validationResults
      });

      if (validProperties.length === 0) {
        throw new Error(`Nenhum imóvel passou na validação. Verifica os dados extraídos.`);
      }

      setProgress("A processar imagens...");

      const propertiesWithImages = validProperties.map(v => {
        const p = v.property;
        let images = p.images || [];
        images = images
          .filter(img => img && typeof img === 'string' && img.length > 10)
          .map(img => {
            img = img.trim();
            if (img.startsWith('http://') || img.startsWith('https://')) return img;
            if (img.startsWith('//')) return 'https:' + img;
            if (img.startsWith('/')) return baseUrl + img;
            return baseUrl + '/' + img;
          })
          .filter((img, idx, arr) => arr.indexOf(img) === idx)
          .slice(0, 20);
        
        // Use detail_url if available, otherwise use main URL
        const sourceUrl = p.detail_url && p.detail_url.startsWith('http') ? p.detail_url : 
                         p.detail_url ? baseUrl + p.detail_url : url;
        
        return { ...p, images, source_url: sourceUrl };
      });

      // Always use AI to detect/confirm property and listing type
      setProgress(`A classificar ${propertiesWithImages.length} imóveis com IA...`);
      const processedProperties = await Promise.all(
        propertiesWithImages.map(async (p) => {
          const detected = await detectPropertyTypes(p.title, p.description, p.price);
          if (detected) {
            return {
              ...p,
              property_type: detected.property_type || p.property_type || 'apartment',
              listing_type: detected.listing_type || p.listing_type || 'sale'
            };
          }
          return {
            ...p,
            property_type: p.property_type || 'apartment',
            listing_type: p.listing_type || 'sale'
          };
        })
      );

      // Gerar tags com IA para cada imóvel
      setProgress(`A gerar tags com IA para ${processedProperties.length} imóveis...`);
      const propertiesWithTags = await Promise.all(
        processedProperties.map(async (p) => {
          const tags = await generatePropertyTags(p);
          return { ...p, tags };
        })
      );

      setProgress("A guardar no sistema...");

      // Generate sequential ref_ids for all properties in batch
      const numProperties = propertiesWithTags.length;
      const { data: refData } = await base44.functions.invoke('generateRefId', { 
        entity_type: 'Property', 
        count: numProperties
      });
      
      // Ensure we have an array of ref_ids
      let refIds = [];
      if (refData.ref_ids && Array.isArray(refData.ref_ids)) {
        refIds = refData.ref_ids;
      } else if (refData.ref_id) {
        refIds = [refData.ref_id];
      }
      
      // Validate we have enough ref_ids
      if (refIds.length < numProperties) {
        throw new Error(`Erro ao gerar referências: pedidos ${numProperties}, recebidos ${refIds.length}`);
      }
      
      console.log(`Creating ${numProperties} properties with ref_ids:`, refIds);

      const propertiesWithRefIds = propertiesWithTags.map((p, index) => ({ 
        ...p, 
        ref_id: refIds[index],
        status: "active", 
        featured: false,
        address: p.address || p.city,
        state: p.state || p.city,
        is_partner_property: propertyOwnership === "partner",
        partner_id: propertyOwnership === "partner" ? selectedPartner?.id : undefined,
        partner_name: propertyOwnership === "partner" ? selectedPartner?.name : 
                      propertyOwnership === "private" ? privateOwnerName : undefined,
        internal_notes: propertyOwnership === "private" && privateOwnerPhone ? 
                       `Proprietário particular: ${privateOwnerName} - Tel: ${privateOwnerPhone}` : undefined
      }));
      
      // Usar bulk create/update com verificação de duplicados
      const importResults = await bulkCreateOrUpdate(base44, propertiesWithRefIds);
      const allProcessed = [...importResults.created, ...importResults.updated];

      const countWithImages = allProcessed.filter(p => p.images?.length > 0).length;
      const totalImages = allProcessed.reduce((sum, p) => sum + (p.images?.length || 0), 0);
      const totalProcessed = importResults.created.length + importResults.updated.length;
      
      setResults({
        success: true,
        count: totalProcessed,
        properties: allProcessed,
        portal: portal,
        stats: { withImages: countWithImages, totalImages },
        message: `✅ ${totalProcessed} imóveis processados!\n📥 ${importResults.created.length} criados\n🔄 ${importResults.updated.length} atualizados\n📸 ${countWithImages} com fotos (${totalImages} imagens)${invalidProperties.length > 0 ? `\n⚠️ ${invalidProperties.length} rejeitados` : ''}`
      });
      
      await queryClient.invalidateQueries({ queryKey: ['properties'] });
      await queryClient.invalidateQueries({ queryKey: ['myProperties'] });
      toast.success(`${created.length} imóveis importados!`);

    } catch (error) {
      console.error("Standard import error:", error);
      const errorMessage = error.message || "Erro ao importar";
      setResults({ 
        success: false, 
        message: `❌ ${errorMessage}\n\n💡 Sugestões:\n• Verifique se o link está correto e acessível\n• Alguns portais bloqueiam acesso automático\n• Tente copiar o link de um imóvel individual`,
        portal: portal
      });
      toast.error(errorMessage);
    }
    
    setImporting(false);
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResults(null);
      setValidationDetails(null);
      setShowPreview(false); // Reset preview state
      
      const extension = selectedFile.name.split('.').pop().toLowerCase();
              if (extension === 'json') {
                setFileType('json');
              } else if (['csv', 'xlsx', 'xls'].includes(extension)) {
                setFileType(extension === 'csv' ? 'csv' : 'excel');
                if (extension === 'csv') {
                  handleCSVPreview(selectedFile);
                }
              } else if (extension === 'pdf') {
                setFileType('pdf');
              } else {
                setFileType(null);
                toast.error("Formato de ficheiro não suportado.");
              }
    }
  };

  const importFromPDF = async (file) => {
        setImporting(true);
        setProgress("A carregar PDF...");

        try {
          const { file_url } = await base44.integrations.Core.UploadFile({ file });
          setProgress("A extrair dados do PDF com IA...");

          const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
            file_url,
            json_schema: {
              type: "object",
              properties: { 
                properties: { 
                  type: "array", 
                  items: propertySchema 
                } 
              }
            }
          });

          if (result.status === "success" && result.output?.properties) {
            const properties = result.output.properties;

            if (properties.length === 0) {
              throw new Error("Nenhum imóvel encontrado no PDF");
            }

            setProgress(`A classificar ${properties.length} imóveis com IA...`);
            const processedProperties = await Promise.all(
              properties.map(async (p) => {
                const detected = await detectPropertyTypes(p.title, p.description, p.price);
                if (detected) {
                  return { 
                    ...p, 
                    property_type: detected.property_type || p.property_type || 'apartment', 
                    listing_type: detected.listing_type || p.listing_type || 'sale' 
                  };
                }
                return {
                  ...p,
                  property_type: p.property_type || 'apartment',
                  listing_type: p.listing_type || 'sale'
                };
              })
            );

            setProgress(`A gerar tags com IA para ${processedProperties.length} imóveis...`);
            const propertiesWithTags = await Promise.all(
              processedProperties.map(async (p) => {
                const tags = await generatePropertyTags(p);
                return { ...p, tags };
              })
            );

            const { data: refData } = await base44.functions.invoke('generateRefId', { 
              entity_type: 'Property', 
              count: propertiesWithTags.length 
            });
            const refIds = refData.ref_ids || [refData.ref_id];

            const propertiesWithRefIds = propertiesWithTags.map((p, index) => ({
              ...p,
              ref_id: refIds[index],
              status: "active",
              address: p.address || p.city,
              state: p.state || p.city,
              source_url: 'PDF Import',
              is_partner_property: propertyOwnership === "partner",
              partner_id: propertyOwnership === "partner" ? selectedPartner?.id : undefined,
              partner_name: propertyOwnership === "partner" ? selectedPartner?.name : 
                            propertyOwnership === "private" ? privateOwnerName : undefined,
              internal_notes: propertyOwnership === "private" && privateOwnerPhone ? 
                             `Proprietário particular: ${privateOwnerName} - Tel: ${privateOwnerPhone}` : undefined
            }));

            const created = await base44.entities.Property.bulkCreate(propertiesWithRefIds);

            setResults({
              success: true,
              count: created.length,
              properties: created,
              message: `${created.length} imóveis importados de PDF!`
            });

            await queryClient.invalidateQueries({ queryKey: ['properties'] });
            await queryClient.invalidateQueries({ queryKey: ['myProperties'] });
            toast.success(`${created.length} imóveis importados!`);
          } else {
            throw new Error(result.details || "Erro ao extrair dados do PDF");
          }
        } catch (error) {
          setResults({ success: false, message: error.message || "Erro ao processar PDF" });
          toast.error("Erro no PDF");
        }

        setImporting(false);
      };

      const handleFileImport = () => {
        if (!file) {
          toast.error("Nenhum ficheiro selecionado.");
          return;
        }

        if (fileType === 'json') {
          importFromJSON(file);
        } else if (fileType === 'csv') {
          handleCSVPreview(file); 
        } else if (fileType === 'excel') {
          importFromCSV(file);
        } else if (fileType === 'pdf') {
          importFromPDF(file);
        }
      };

  // Função usando Gemini API - suporta listagens e páginas individuais
  const importFromURLWithGemini = async () => {
    if (!url || !url.trim()) {
      toast.error("Por favor, cole um link válido");
      return;
    }

    setImporting(true);
    setValidationDetails(null);
    setResults(null);
    const portal = detectPortal(url);
    setProgress(`🤖 A analisar ${portal.name} com IA Avançada...`);
    toast.info(`A processar link de ${portal.name}...`);

    try {
      const response = await base44.functions.invoke('searchPropertyAI', { url });
      const data = response.data;

      if (!data) {
        throw new Error('Sem resposta do servidor. Tente novamente.');
      }

      if (!data.success) {
        throw new Error(data.error || data.details || 'Erro ao extrair dados do portal');
      }

      // Check if it's a listing page with multiple properties
      if (data.is_listing_page && data.properties && data.properties.length > 0) {
        const properties = data.properties;
        setProgress(`📋 Listagem detetada! ${properties.length} imóveis encontrados...`);
        
        // Validate properties
        const validationResults = properties.map(prop => ({
          property: prop,
          validation: validateProperty(prop, portal.name)
        }));

        const validProperties = validationResults.filter(v => v.validation.isValid).map(v => v.property);
        const invalidProperties = validationResults.filter(v => !v.validation.isValid);

        setValidationDetails({
          total: properties.length,
          valid: validProperties.length,
          invalid: invalidProperties.length,
          details: validationResults
        });

        if (validProperties.length === 0) {
          throw new Error(`Nenhum imóvel passou na validação. Verifica os dados extraídos.`);
        }

        setProgress(`A gerar tags com IA para ${validProperties.length} imóveis...`);
        const propertiesWithTags = await Promise.all(
          validProperties.map(async (p) => {
            const tags = await generatePropertyTags(p);
            return { ...p, tags };
          })
        );

        setProgress("A guardar imóveis...");

        // Generate ref_ids for all properties - request exact count needed
        const numProperties = propertiesWithTags.length;
        const { data: refData } = await base44.functions.invoke('generateRefId', { 
          entity_type: 'Property', 
          count: numProperties
        });
        
        // Ensure we have an array of ref_ids
        let refIds = [];
        if (refData.ref_ids && Array.isArray(refData.ref_ids)) {
          refIds = refData.ref_ids;
        } else if (refData.ref_id) {
          refIds = [refData.ref_id];
        }
        
        // Validate we have enough ref_ids
        if (refIds.length < numProperties) {
          throw new Error(`Erro ao gerar referências: pedidos ${numProperties}, recebidos ${refIds.length}`);
        }

        // Create properties with unique ref_ids
        const propertiesWithRefIds = propertiesWithTags.map((p, index) => ({
          ...p,
          ref_id: refIds[index],
          status: "active",
          address: p.address || p.city,
          state: p.state || p.city,
          is_partner_property: propertyOwnership === "partner",
          partner_id: propertyOwnership === "partner" ? selectedPartner?.id : undefined,
          partner_name: propertyOwnership === "partner" ? selectedPartner?.name : 
                        propertyOwnership === "private" ? privateOwnerName : undefined,
          internal_notes: propertyOwnership === "private" && privateOwnerPhone ? 
                         `Proprietário particular: ${privateOwnerName} - Tel: ${privateOwnerPhone}` : undefined
        }));
        
        // Log for debugging
        console.log(`Processing ${numProperties} properties with ref_ids:`, refIds);

        // Usar bulk create/update com verificação de duplicados
        const importResults = await bulkCreateOrUpdate(base44, propertiesWithRefIds);
        const allProcessed = [...importResults.created, ...importResults.updated];

        const countWithImages = allProcessed.filter(p => p.images?.length > 0).length;
        const totalImages = allProcessed.reduce((sum, p) => sum + (p.images?.length || 0), 0);
        const totalProcessed = importResults.created.length + importResults.updated.length;

        setResults({
          success: true,
          count: totalProcessed,
          properties: allProcessed,
          portal: portal,
          stats: { withImages: countWithImages, totalImages },
          message: `✅ ${totalProcessed} imóveis processados!\n📥 ${importResults.created.length} criados\n🔄 ${importResults.updated.length} atualizados\n📸 ${countWithImages} com fotos (${totalImages} imagens)${invalidProperties.length > 0 ? `\n⚠️ ${invalidProperties.length} rejeitados` : ''}`
        });

        await queryClient.invalidateQueries({ queryKey: ['properties'] });
        await queryClient.invalidateQueries({ queryKey: ['myProperties'] });
        toast.success(`${created.length} imóveis importados!`);

      } else {
        // Single property import
        const property = data.property;
        setProgress("A gerar tags com IA...");

        // Generate tags
        const tags = await generatePropertyTags(property);
        property.tags = tags;

        setProgress("A guardar imóvel...");

        // Generate ref_id
        const { data: refData } = await base44.functions.invoke('generateRefId', { 
          entity_type: 'Property', 
          count: 1 
        });

        const propertyToCreate = {
          ...property,
          ref_id: refData.ref_id || refData.ref_ids?.[0],
          status: "active",
          address: property.address || property.city,
          state: property.state || property.city,
          is_partner_property: propertyOwnership === "partner",
          partner_id: propertyOwnership === "partner" ? selectedPartner?.id : undefined,
          partner_name: propertyOwnership === "partner" ? selectedPartner?.name : 
                        propertyOwnership === "private" ? privateOwnerName : undefined,
          internal_notes: propertyOwnership === "private" && privateOwnerPhone ? 
                         `Proprietário particular: ${privateOwnerName} - Tel: ${privateOwnerPhone}` : undefined
        };

        const created = await base44.entities.Property.create(propertyToCreate);

        setResults({
          success: true,
          count: 1,
          properties: [created],
          portal: portal,
          stats: { withImages: created.images?.length > 0 ? 1 : 0, totalImages: created.images?.length || 0 },
          message: `✅ Imóvel importado!\n📸 ${created.images?.length || 0} imagens encontradas`
        });

        await queryClient.invalidateQueries({ queryKey: ['properties'] });
        await queryClient.invalidateQueries({ queryKey: ['myProperties'] });
        toast.success("Imóvel importado com sucesso!");
      }

    } catch (error) {
      console.error("Advanced AI import error:", error);
      const errorMessage = error.message || "Erro ao importar";
      setResults({ 
        success: false, 
        message: `❌ ${errorMessage}\n\n💡 Sugestões:\n• Verifique se o link está correto\n• Tente o link de um imóvel individual\n• Use o botão "IA Padrão" como alternativa`,
        portal: portal
      });
      toast.error(errorMessage);
    }

    setImporting(false);
  };

  const detectedPortal = url ? detectPortal(url) : null;

  // Import from Text with AI
  const analyzeTextWithAI = async () => {
    if (!textInput.trim()) {
      toast.error("Por favor, cole o texto com informações do imóvel");
      return;
    }

    setTextImporting(true);
    setTextProgress("A analisar texto com IA...");
    setExtractedProperties([]);

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `És um especialista em extração de dados imobiliários. Analisa o seguinte texto e extrai TODOS os imóveis mencionados.

TEXTO A ANALISAR:
${textInput}

INSTRUÇÕES:
1. Extrai CADA imóvel mencionado no texto
2. Para cada imóvel, extrai:
   - title: título descritivo (se não existir, cria um baseado nas características)
   - description: descrição completa
   - property_type: "apartment", "house", "land", "building", "farm", "store", "warehouse", "office"
   - listing_type: "sale" ou "rent" (detecta pelo contexto/preço)
   - price: número (converte formato português: 495.000 € = 495000)
   - bedrooms: número de quartos (T2 = 2, T3 = 3, etc.)
   - bathrooms: número de WCs
   - square_feet: área útil em m²
   - gross_area: área bruta em m² (se diferente)
   - address: morada completa
   - city: cidade/concelho
   - state: distrito
   - zip_code: código postal
   - year_built: ano de construção
   - energy_certificate: certificado energético (A+, A, B, B-, C, D, E, F, isento)
   - amenities: array de comodidades (garagem, piscina, varanda, etc.)
   - floor: andar (se apartamento)
   - parking_spaces: lugares de estacionamento

3. IMPORTANTE sobre preços portugueses:
   - "495.000 €" ou "495 000€" = 495000
   - "1.200 €/mês" = 1200 (arrendamento)
   - Se preço mensal < 5000€, é provavelmente arrendamento

4. Se o texto menciona vários imóveis, extrai TODOS

Retorna um array de objetos, mesmo que seja só um imóvel.`,
        response_json_schema: {
          type: "object",
          properties: {
            properties: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  property_type: { type: "string", enum: ["apartment", "house", "land", "building", "farm", "store", "warehouse", "office"] },
                  listing_type: { type: "string", enum: ["sale", "rent"] },
                  price: { type: "number" },
                  bedrooms: { type: "number" },
                  bathrooms: { type: "number" },
                  square_feet: { type: "number" },
                  gross_area: { type: "number" },
                  address: { type: "string" },
                  city: { type: "string" },
                  state: { type: "string" },
                  zip_code: { type: "string" },
                  year_built: { type: "number" },
                  energy_certificate: { type: "string" },
                  amenities: { type: "array", items: { type: "string" } },
                  floor: { type: "number" },
                  parking_spaces: { type: "number" }
                }
              }
            },
            extraction_notes: { type: "string" }
          }
        }
      });

      if (!result?.properties || result.properties.length === 0) {
        toast.error("Não foi possível extrair nenhum imóvel do texto");
        setTextImporting(false);
        return;
      }

      setTextProgress(`Encontrados ${result.properties.length} imóvel(is). A validar...`);

      // Validate and enhance
      const validatedProperties = result.properties.map(p => ({
        ...p,
        property_type: p.property_type || 'apartment',
        listing_type: p.listing_type || 'sale',
        title: p.title || `${p.property_type === 'apartment' ? 'Apartamento' : 'Imóvel'} em ${p.city || 'Portugal'}`,
        city: p.city || '',
        price: p.price || 0
      }));

      setExtractedProperties(validatedProperties);
      setShowTextPreview(true);
      
      if (result.extraction_notes) {
        toast.info(result.extraction_notes);
      }

      toast.success(`${validatedProperties.length} imóvel(is) extraído(s) do texto!`);

    } catch (error) {
      console.error("Error analyzing text:", error);
      toast.error("Erro ao analisar texto com IA");
    }

    setTextImporting(false);
  };

  const importExtractedProperties = async () => {
    if (extractedProperties.length === 0) {
      toast.error("Nenhum imóvel para importar");
      return;
    }

    setTextImporting(true);
    setTextProgress("A gerar tags com IA...");

    try {
      // Generate tags for each property
      const propertiesWithTags = await Promise.all(
        extractedProperties.map(async (p) => {
          const tags = await generatePropertyTags(p);
          return { ...p, tags };
        })
      );

      setTextProgress("A guardar imóveis...");

      // Generate ref_ids
      const { data: refData } = await base44.functions.invoke('generateRefId', { 
        entity_type: 'Property', 
        count: propertiesWithTags.length 
      });
      const refIds = refData.ref_ids || [refData.ref_id];

      const propertiesWithRefIds = propertiesWithTags.map((p, index) => ({
        ...p,
        ref_id: refIds[index],
        status: "active",
        address: p.address || p.city,
        state: p.state || p.city,
        source_url: 'Importação por Texto',
        is_partner_property: propertyOwnership === "partner",
        partner_id: propertyOwnership === "partner" ? selectedPartner?.id : undefined,
        partner_name: propertyOwnership === "partner" ? selectedPartner?.name : 
                      propertyOwnership === "private" ? privateOwnerName : undefined,
        internal_notes: propertyOwnership === "private" && privateOwnerPhone ? 
                       `Proprietário particular: ${privateOwnerName} - Tel: ${privateOwnerPhone}` : undefined
      }));

      const created = await base44.entities.Property.bulkCreate(propertiesWithRefIds);

      setResults({
        success: true,
        count: created.length,
        properties: created,
        message: `✅ ${created.length} imóveis importados de texto!`
      });

      await queryClient.invalidateQueries({ queryKey: ['properties'] });
      await queryClient.invalidateQueries({ queryKey: ['myProperties'] });
      toast.success(`${created.length} imóveis importados!`);
      
      setShowTextPreview(false);
      setTextInput("");
      setExtractedProperties([]);

    } catch (error) {
      console.error("Error importing:", error);
      toast.error("Erro ao importar imóveis");
      setResults({ success: false, message: error.message });
    }

    setTextImporting(false);
  };

  const removeExtractedProperty = (index) => {
    setExtractedProperties(prev => prev.filter((_, i) => i !== index));
  };

  const updateExtractedProperty = (index, field, value) => {
    setExtractedProperties(prev => prev.map((p, i) => 
      i === index ? { ...p, [field]: value } : p
    ));
  };

  return (
    <div className="grid gap-6">
      {/* Property Ownership Selection */}
      <Card className="border-slate-300">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Origem do Imóvel</CardTitle>
          <p className="text-sm text-slate-500">Defina a quem pertence este imóvel</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div 
              onClick={() => { setPropertyOwnership("own"); setSelectedPartner(null); setPrivateOwnerName(""); }}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all text-center ${
                propertyOwnership === "own" 
                  ? "border-blue-500 bg-blue-50" 
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <Building2 className={`w-6 h-6 mx-auto mb-2 ${propertyOwnership === "own" ? "text-blue-600" : "text-slate-400"}`} />
              <p className={`font-medium text-sm ${propertyOwnership === "own" ? "text-blue-900" : "text-slate-700"}`}>
                Próprio
              </p>
              <p className="text-xs text-slate-500 mt-1">Imóvel da empresa</p>
            </div>
            
            <div 
              onClick={() => { setPropertyOwnership("partner"); setPrivateOwnerName(""); }}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all text-center ${
                propertyOwnership === "partner" 
                  ? "border-purple-500 bg-purple-50" 
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <Users2 className={`w-6 h-6 mx-auto mb-2 ${propertyOwnership === "partner" ? "text-purple-600" : "text-slate-400"}`} />
              <p className={`font-medium text-sm ${propertyOwnership === "partner" ? "text-purple-900" : "text-slate-700"}`}>
                Parceiro
              </p>
              <p className="text-xs text-slate-500 mt-1">Parceiro comercial</p>
            </div>
            
            <div 
              onClick={() => { setPropertyOwnership("private"); setSelectedPartner(null); }}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all text-center ${
                propertyOwnership === "private" 
                  ? "border-green-500 bg-green-50" 
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <User className={`w-6 h-6 mx-auto mb-2 ${propertyOwnership === "private" ? "text-green-600" : "text-slate-400"}`} />
              <p className={`font-medium text-sm ${propertyOwnership === "private" ? "text-green-900" : "text-slate-700"}`}>
                Particular
              </p>
              <p className="text-xs text-slate-500 mt-1">Proprietário privado</p>
            </div>
          </div>
          
          {propertyOwnership === "partner" && (
            <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
              <Label className="text-sm text-purple-900 mb-2 block">Selecione o Parceiro</Label>
              <Select 
                value={selectedPartner?.id || ""} 
                onValueChange={(id) => {
                  const partner = allPartners.find(p => p.id === id);
                  setSelectedPartner(partner);
                }}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Selecione o parceiro..." />
                </SelectTrigger>
                <SelectContent>
                  {allPartners.length === 0 ? (
                    <SelectItem value={null} disabled>Nenhum parceiro encontrado</SelectItem>
                  ) : (
                    allPartners.map(partner => (
                      <SelectItem key={partner.id} value={partner.id}>
                        {partner.name} {partner.email ? `- ${partner.email}` : ''}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {selectedPartner && (
                <p className="text-xs text-purple-600 mt-2">
                  ✓ Imóveis serão atribuídos a {selectedPartner.name}
                </p>
              )}
              {allPartners.length === 0 && (
                <p className="text-xs text-purple-600 mt-2">
                  ⚠️ Crie primeiro um contacto do tipo "Parceiro" no CRM
                </p>
              )}
            </div>
          )}
          
          {propertyOwnership === "private" && (
            <div className="p-3 bg-green-50 rounded-lg border border-green-200 space-y-3">
              <div>
                <Label className="text-sm text-green-900 mb-1.5 block">Nome do Proprietário</Label>
                <Input
                  value={privateOwnerName}
                  onChange={(e) => setPrivateOwnerName(e.target.value)}
                  placeholder="Nome completo do proprietário"
                  className="bg-white"
                />
              </div>
              <div>
                <Label className="text-sm text-green-900 mb-1.5 block">Telefone (opcional)</Label>
                <Input
                  value={privateOwnerPhone}
                  onChange={(e) => setPrivateOwnerPhone(e.target.value)}
                  placeholder="+351 912 345 678"
                  className="bg-white"
                />
              </div>
              {privateOwnerName && (
                <p className="text-xs text-green-600">
                  ✓ Imóveis serão registados como propriedade de {privateOwnerName}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>



      {/* Text Import Card */}
      <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquareText className="w-5 h-5 text-purple-600" />
            Importar de Texto com IA
          </CardTitle>
          <p className="text-sm text-slate-500">Cole texto de emails, anúncios ou descrições - a IA extrai os dados automaticamente</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder={`Cole aqui o texto com informações do(s) imóvel(is)...

Exemplos de texto que a IA consegue processar:

"Apartamento T3 em Lisboa, Parque das Nações, 120m², 3 quartos, 2 WCs, varanda, garagem box. Preço: 485.000€. Certificado energético B. Ano 2015."

"Moradia V4 para venda em Cascais, 250m² de área útil, 4 quartos, 3 casas de banho, piscina, jardim, garagem para 2 carros. 1.250.000 €"

"Arrendamento T2 renovado no Porto, 75m², 2 quartos, cozinha equipada. 850€/mês"

A IA extrai automaticamente todos os dados estruturados!`}
            rows={8}
            className="font-mono text-sm"
          />

          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              {textInput.length > 0 ? `${textInput.length} caracteres` : "Cole texto de qualquer fonte"}
            </p>
            <Button
              onClick={analyzeTextWithAI}
              disabled={textImporting || !textInput.trim()}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {textImporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {textProgress}
                </>
              ) : (
                <>
                  <MessageSquareText className="w-4 h-4 mr-2" />
                  Analisar com IA
                </>
              )}
            </Button>
          </div>

          <div className="bg-purple-100 border border-purple-200 rounded-lg p-3">
            <p className="text-xs text-purple-900 font-medium mb-1">🤖 A IA extrai automaticamente:</p>
            <p className="text-xs text-purple-700">
              ✓ Tipologia (T1, T2, V3...) → quartos
              <br />
              ✓ Preço português (495.000 € → 495000)
              <br />
              ✓ Área, localização, comodidades
              <br />
              ✓ Tipo de negócio (venda/arrendamento)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Text Preview Dialog */}
      <Dialog open={showTextPreview} onOpenChange={setShowTextPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquareText className="w-5 h-5 text-purple-600" />
              Imóveis Extraídos do Texto ({extractedProperties.length})
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 overflow-y-auto pr-2 flex-1">
            {extractedProperties.map((property, idx) => (
              <Card key={idx} className="border-purple-200">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <Input
                        value={property.title}
                        onChange={(e) => updateExtractedProperty(idx, 'title', e.target.value)}
                        className="font-semibold text-lg border-0 p-0 h-auto focus-visible:ring-0"
                        placeholder="Título do imóvel"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeExtractedProperty(idx)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                    <div>
                      <Label className="text-xs text-slate-500">Tipo</Label>
                      <Select
                        value={property.property_type}
                        onValueChange={(v) => updateExtractedProperty(idx, 'property_type', v)}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="apartment">Apartamento</SelectItem>
                          <SelectItem value="house">Moradia</SelectItem>
                          <SelectItem value="land">Terreno</SelectItem>
                          <SelectItem value="building">Prédio</SelectItem>
                          <SelectItem value="store">Loja</SelectItem>
                          <SelectItem value="office">Escritório</SelectItem>
                          <SelectItem value="warehouse">Armazém</SelectItem>
                          <SelectItem value="farm">Quinta</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500">Negócio</Label>
                      <Select
                        value={property.listing_type}
                        onValueChange={(v) => updateExtractedProperty(idx, 'listing_type', v)}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sale">Venda</SelectItem>
                          <SelectItem value="rent">Arrendamento</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500">Preço (€)</Label>
                      <Input
                        type="number"
                        value={property.price || ''}
                        onChange={(e) => updateExtractedProperty(idx, 'price', parseFloat(e.target.value) || 0)}
                        className="h-8"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500">Área (m²)</Label>
                      <Input
                        type="number"
                        value={property.square_feet || ''}
                        onChange={(e) => updateExtractedProperty(idx, 'square_feet', parseFloat(e.target.value) || 0)}
                        className="h-8"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                    <div>
                      <Label className="text-xs text-slate-500">Quartos</Label>
                      <Input
                        type="number"
                        value={property.bedrooms || ''}
                        onChange={(e) => updateExtractedProperty(idx, 'bedrooms', parseInt(e.target.value) || 0)}
                        className="h-8"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500">WCs</Label>
                      <Input
                        type="number"
                        value={property.bathrooms || ''}
                        onChange={(e) => updateExtractedProperty(idx, 'bathrooms', parseInt(e.target.value) || 0)}
                        className="h-8"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500">Cidade</Label>
                      <Input
                        value={property.city || ''}
                        onChange={(e) => updateExtractedProperty(idx, 'city', e.target.value)}
                        className="h-8"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500">Distrito</Label>
                      <Input
                        value={property.state || ''}
                        onChange={(e) => updateExtractedProperty(idx, 'state', e.target.value)}
                        className="h-8"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs text-slate-500">Morada</Label>
                    <Input
                      value={property.address || ''}
                      onChange={(e) => updateExtractedProperty(idx, 'address', e.target.value)}
                      className="h-8"
                      placeholder="Morada completa"
                    />
                  </div>

                  {property.amenities?.length > 0 && (
                    <div className="mt-2">
                      <Label className="text-xs text-slate-500">Comodidades</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {property.amenities.map((amenity, aIdx) => (
                          <Badge key={aIdx} variant="outline" className="text-xs">
                            {amenity}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {property.description && (
                    <div className="mt-2">
                      <Label className="text-xs text-slate-500">Descrição</Label>
                      <p className="text-sm text-slate-600 line-clamp-2">{property.description}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex gap-2 justify-end pt-4 border-t">
            <Button variant="outline" onClick={() => setShowTextPreview(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={importExtractedProperties}
              disabled={textImporting || extractedProperties.length === 0}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {textImporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {textProgress}
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Importar {extractedProperties.length} Imóvel(is)
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Importar de Website
          </CardTitle>
          <p className="text-sm text-slate-500">Extração precisa com validação rigorosa de preços</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 mb-3">
            <div>
              <span className="text-xs font-medium text-slate-500 mr-2">Genéricos:</span>
              <span className="inline-flex flex-wrap gap-1">
                {portalGroups.genericos.portals.map((portal) => (
                  <Badge key={portal.domain} className={portal.color} variant="secondary">
                    {portal.name}
                  </Badge>
                ))}
              </span>
            </div>
            <div>
              <span className="text-xs font-medium text-slate-500 mr-2">Redes:</span>
              <span className="inline-flex flex-wrap gap-1">
                {portalGroups.redes.portals.map((portal) => (
                  <Badge key={portal.domain} className={portal.color} variant="secondary">
                    {portal.name}
                  </Badge>
                ))}
              </span>
            </div>
            <div>
              <span className="text-xs font-medium text-slate-500 mr-2">Internacionais:</span>
              <span className="inline-flex flex-wrap gap-1">
                {portalGroups.internacionais.portals.map((portal) => (
                  <Badge key={portal.domain} className={portal.color} variant="secondary">
                    {portal.name}
                  </Badge>
                ))}
              </span>
            </div>
          </div>

          <Textarea
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Cole o link de qualquer portal imobiliário&#10;Exemplos:&#10;• https://www.idealista.pt/imovel/34570008/&#10;• https://www.imovirtual.com/anuncios/...&#10;• https://www.zugruppe.com/imovel/..."
            rows={4}
            className="font-mono text-sm"
          />

          {detectedPortal && (
            <div className={`flex items-center gap-2 p-2 rounded ${detectedPortal.color}`}>
              <Globe className="w-4 h-4" />
              <span className="text-sm font-medium">Portal detetado: {detectedPortal.name}</span>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={importFromURLWithGemini}
              disabled={importing || !url}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              {importing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {progress}
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  IA Avançada
                </>
              )}
            </Button>
            <Button
              onClick={importFromURL}
              disabled={importing || !url}
              variant="outline"
              className="border-blue-300 text-blue-700 hover:bg-blue-50"
            >
              {importing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  IA Padrão
                </>
              )}
            </Button>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-900 font-medium mb-1">🔒 Sistema Melhorado</p>
            <p className="text-xs text-blue-700">
              ✓ <strong>Deteta automaticamente listagens</strong> e importa todos os imóveis
              <br />
              ✓ Extração precisa de preços formato português (495.000 € = 495000)
              <br />
              ✓ Suporte para Idealista, Imovirtual, Casa Sapo e mais
            </p>
          </div>
          
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-xs text-amber-900 font-medium mb-1">💡 Dica: Importar múltiplos imóveis</p>
            <p className="text-xs text-amber-700">
              Cole o link de uma <strong>página de pesquisa/listagem</strong> (ex: idealista.pt/comprar-casas/lisboa/) para importar todos os imóveis de uma vez!
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Importar de Ficheiro (Melhorado)
          </CardTitle>
          <p className="text-sm text-slate-500">CSV com preview e validação interativa, Excel e JSON</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-slate-400 transition-colors">
            <input
              type="file"
              accept=".csv,.xlsx,.xls,.json,.pdf"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload-import"
              disabled={importing}
            />
            <label htmlFor="file-upload-import" className="cursor-pointer">
              <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-700 font-medium mb-1">
                {file ? `${file.name} (${fileType?.toUpperCase()})` : "Clique para carregar"}
              </p>
              <p className="text-sm text-slate-500">CSV, Excel, JSON ou PDF</p>
            </label>
          </div>

          {file && !showPreview && ( // Show this button only if a file is selected and CSV preview is not active
            <Button onClick={handleFileImport} disabled={importing} className="w-full bg-slate-900 hover:bg-slate-800">
              {importing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {progress}
                </>
              ) : (
                <>
                  {fileType === 'csv' ? <Eye className="w-4 h-4 mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                  {fileType === 'csv' ? 'Pré-visualizar CSV' : fileType === 'pdf' ? 'Extrair de PDF' : `Processar ${fileType?.toUpperCase()}`}
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* CSV Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Pré-visualização e Mapeamento de Colunas (CSV)</DialogTitle>
          </DialogHeader>
          
          {csvPreview && (
            <div className="space-y-4 overflow-y-auto pr-2"> {/* Added overflow for content */}
              {/* Column Mapping */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Mapeamento de Colunas</CardTitle>
                  <p className="text-sm text-slate-500">Associe as colunas do CSV aos campos do sistema</p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {csvPreview.headers.map((header) => (
                      <div key={header}>
                        <Label className="text-xs mb-1 block">{header}</Label>
                        <Select
                          value={columnMapping[header] || ""}
                          onValueChange={(value) => setColumnMapping({...columnMapping, [header]: value === 'null' ? null : value})} // Handle null correctly
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder="Ignorar" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="null">Ignorar</SelectItem>
                            {Object.entries(fieldLabels).map(([field, label]) => (
                              <SelectItem key={field} value={field}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Data Preview */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>Dados ({csvPreview.rows.length} linhas total, {selectedRows.length} selecionadas)</span>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setSelectedRows(csvPreview.rows.map((_, i) => i))}>
                        Selecionar Todas
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setSelectedRows([])}>
                        Desselecionar
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">
                            <Checkbox 
                              checked={selectedRows.length === csvPreview.rows.length && csvPreview.rows.length > 0}
                              onCheckedChange={(checked) => {
                                setSelectedRows(checked ? csvPreview.rows.map((_, i) => i) : []);
                              }}
                            />
                          </TableHead>
                          {csvPreview.headers.map((header) => (
                            <TableHead key={header} className="text-xs">
                              {header}
                              {columnMapping[header] && (
                                <div className="text-xs text-blue-600 mt-1">
                                  → {fieldLabels[columnMapping[header]]}
                                </div>
                              )}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewData.map((row, rowIdx) => (
                          <TableRow key={rowIdx}>
                            <TableCell>
                              <Checkbox
                                checked={selectedRows.includes(rowIdx)}
                                onCheckedChange={(checked) => {
                                  setSelectedRows(checked 
                                    ? [...selectedRows, rowIdx]
                                    : selectedRows.filter(i => i !== rowIdx)
                                  );
                                }}
                              />
                            </TableCell>
                            {csvPreview.headers.map((header) => (
                              <TableCell key={header} className="text-xs max-w-xs truncate">
                                {row[header]}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {csvPreview.rows.length > 10 && (
                    <p className="text-xs text-slate-500 mt-2 text-center">
                      A mostrar 10 de {csvPreview.rows.length} linhas
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Progress Bar */}
              {importProgress.isRunning && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-700">A importar imóveis...</span>
                    <span className="text-sm font-bold text-blue-700">
                      {importProgress.current}%
                    </span>
                  </div>
                  <Progress value={importProgress.current} className="h-2" />
                  <p className="text-xs text-blue-600 mt-1">
                    {progress}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowPreview(false)} disabled={importProgress.isRunning}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleImportFromPreview}
                  disabled={importing || selectedRows.length === 0 || importProgress.isRunning}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {importing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {importProgress.isRunning ? `${importProgress.current}%` : progress}
                    </>
                  ) : (
                    <>
                      <ArrowRight className="w-4 h-4 mr-2" />
                      Importar {selectedRows.length} Imóveis
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {validationDetails && (
        <Card className="border-blue-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-blue-600" />
              Relatório de Validação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center p-3 bg-slate-50 rounded-lg">
                <div className="text-2xl font-bold text-slate-900">{validationDetails.total}</div>
                <div className="text-sm text-slate-600">Total</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-900">{validationDetails.valid}</div>
                <div className="text-sm text-green-600">Válidos</div>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-900">{validationDetails.invalid}</div>
                <div className="text-sm text-red-600">Rejeitados</div>
              </div>
            </div>

            {validationDetails.details.slice(0, 3).map((detail, idx) => (
              <div key={idx} className="mb-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold text-slate-900">{detail.property.title || `Imóvel #${idx + 1}`}</h4>
                  {detail.validation.isValid ? (
                    <Badge className="bg-green-100 text-green-800">Válido</Badge>
                  ) : (
                    <Badge className="bg-red-100 text-red-800">Rejeitado</Badge>
                  )}
                </div>
                
                {detail.validation.errors.length > 0 && (
                  <div className="mb-2">
                    {detail.validation.errors.map((err, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-red-700">
                        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        {err}
                      </div>
                    ))}
                  </div>
                )}
                
                {detail.validation.warnings.length > 0 && (
                  <div>
                    {detail.validation.warnings.map((warn, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-amber-700">
                        <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        {warn}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {validationDetails.invalid > 3 && (
              <p className="text-sm text-slate-500 mt-2 text-center">
                E {validationDetails.invalid - 3} imóveis adicionais rejeitados...
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {results && (
        <Card className={results.success ? "border-green-500" : "border-red-500"}>
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              {results.success ? (
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              ) : (
                <AlertCircle className="w-6 h-6 text-red-600" />
              )}
              <div className="flex-1">
                <h3 className={`font-semibold mb-1 ${results.success ? "text-green-900" : "text-red-900"}`}>
                  {results.success ? "Sucesso!" : "Erro"}
                </h3>
                {results.portal && (
                  <Badge className={`${results.portal.color} mb-2`}>
                    {results.portal.name}
                  </Badge>
                )}
                <p className="text-slate-700 whitespace-pre-line mb-4">{results.message}</p>
                
                {results.success && results.properties?.length > 0 && (
                  <div className="space-y-3 mt-4">
                    <h4 className="font-semibold text-slate-900">Imóveis Importados:</h4>
                    {results.properties.slice(0, 3).map((prop, idx) => (
                      <div key={idx} className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                        <p className="font-medium text-slate-900 mb-2">{prop.title}</p>
                        <div className="flex flex-wrap gap-2 text-xs mb-2">
                          <Badge variant="outline">€{prop.price?.toLocaleString()}</Badge>
                          <Badge variant="outline">{prop.city}</Badge>
                          <div className={`flex items-center gap-1 ${prop.images?.length > 0 ? 'text-green-600' : 'text-amber-600'}`}>
                            <ImageIcon className="w-3 h-3" />
                            {prop.images?.length || 0} fotos
                          </div>
                          {prop.external_id && (
                            <div className="flex items-center gap-1 text-slate-600">
                              <Hash className="w-3 h-3" />
                              {prop.external_id}
                            </div>
                          )}
                          {prop.source_url && (
                            <a href={prop.source_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-600 hover:text-blue-700">
                              <ExternalLink className="w-3 h-3" />
                              Original
                            </a>
                          )}
                        </div>
                        {prop.images?.length > 0 && (
                          <div className="flex gap-1 overflow-x-auto pb-2">
                            {prop.images.slice(0, 5).map((img, imgIdx) => (
                              <img 
                                key={imgIdx}
                                src={img} 
                                alt=""
                                className="w-20 h-20 object-cover rounded border border-slate-300 flex-shrink-0"
                                onError={(e) => { e.target.style.opacity = '0.3'; }}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                    {results.count > 3 && (
                      <p className="text-sm text-slate-500 mt-2 text-center">
                        E {results.count - 3} imóveis adicionais importados...
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}