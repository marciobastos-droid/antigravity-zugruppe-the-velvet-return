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
import { Upload, FileText, Loader2, CheckCircle2, AlertCircle, ExternalLink, Hash, ImageIcon, Globe, AlertTriangle, Eye, Edit, X, ArrowRight, FileInput, Building2, Users2, User } from "lucide-react";
import { toast } from "sonner";

const propertySchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    description: { type: "string" },
    property_type: { type: "string", enum: ["house", "apartment", "condo", "townhouse", "land", "commercial"] },
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

const supportedPortals = [
  { name: "Idealista", domain: "idealista.pt", color: "bg-yellow-100 text-yellow-800" },
  { name: "Imovirtual", domain: "imovirtual.com", color: "bg-green-100 text-green-800" },
  { name: "Casa Sapo", domain: "casa.sapo.pt", color: "bg-blue-100 text-blue-800" },
  { name: "OLX", domain: "olx.pt", color: "bg-purple-100 text-purple-800" },
  { name: "Supercasa", domain: "supercasa.pt", color: "bg-red-100 text-red-800" },
  { name: "Custojusto", domain: "custojusto.pt", color: "bg-orange-100 text-orange-800" },
  { name: "JLL", domain: "jll.pt", color: "bg-indigo-100 text-indigo-800" },
  { name: "Zugruppe", domain: "zugruppe.com", color: "bg-slate-900 text-amber-400" }
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

const detectPropertyTypes = async (title, description) => {
  try {
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Analisa: "${title}" - ${description || ''}. Retorna property_type ("house", "apartment", "condo", "townhouse", "land", "commercial") e listing_type ("sale" ou "rent").`,
      response_json_schema: {
        type: "object",
        properties: {
          property_type: { type: "string" },
          listing_type: { type: "string" }
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
  
  // Validações obrigatórias
  if (!prop.title || prop.title.length < 5) {
    errors.push("Título inválido ou muito curto");
  }
  
  if (!prop.price || prop.price <= 0) {
    errors.push("Preço inválido ou ausente");
  } else {
    // Validação específica de preço
    if (prop.listing_type === 'sale' && prop.price < 10000) {
      errors.push(`Preço muito baixo para venda: €${prop.price}`);
    }
    if (prop.listing_type === 'rent' && prop.price < 100) {
      warnings.push(`Preço baixo para arrendamento: €${prop.price}`);
    }
    if (prop.price > 10000000) {
      warnings.push(`Preço muito alto: €${prop.price.toLocaleString()}`);
    }
  }
  
  if (!prop.city || prop.city.length < 2) {
    errors.push("Cidade inválida ou ausente");
  }
  
  if (!prop.property_type) {
    errors.push("Tipo de imóvel ausente");
  }
  
  if (!prop.listing_type) {
    errors.push("Tipo de anúncio ausente");
  }
  
  // Validações de qualidade
  if (!prop.description || prop.description.length < 50) {
    warnings.push("Descrição muito curta ou ausente");
  }
  
  if (!prop.images || prop.images.length === 0) {
    warnings.push("Sem imagens");
  } else if (prop.images.length < 3) {
    warnings.push(`Poucas imagens (${prop.images.length})`);
  }
  
  if (!prop.amenities || prop.amenities.length === 0) {
    warnings.push("Sem amenidades");
  }
  
  if (!prop.bedrooms && prop.property_type === 'apartment') {
    warnings.push("Número de quartos ausente");
  }
  
  if (!prop.square_feet) {
    warnings.push("Área não especificada");
  }
  
  return { errors, warnings, isValid: errors.length === 0 };
};

export default function ImportProperties() {
  const queryClient = useQueryClient();
  const [file, setFile] = React.useState(null);
  const [fileType, setFileType] = React.useState(null);
  const [url, setUrl] = React.useState("");

  const [importing, setImporting] = React.useState(false);
  const [progress, setProgress] = React.useState("");
  const [results, setResults] = React.useState(null);
  const [validationDetails, setValidationDetails] = React.useState(null);
  const [propertyOwnership, setPropertyOwnership] = React.useState("own"); // "own", "partner", "private"
  const [selectedPartner, setSelectedPartner] = React.useState(null);
  const [privateOwnerName, setPrivateOwnerName] = React.useState("");
  const [privateOwnerPhone, setPrivateOwnerPhone] = React.useState("");
  
  const { data: partners = [] } = useQuery({
    queryKey: ['partners'],
    queryFn: async () => {
      const profiles = await base44.entities.BuyerProfile.list();
      return profiles.filter(p => p.profile_type === 'parceiro');
    },
  });
  
  // CSV Preview State
  const [csvPreview, setCsvPreview] = React.useState(null);
  const [columnMapping, setColumnMapping] = React.useState({});
  const [previewData, setPreviewData] = React.useState([]);
  const [selectedRows, setSelectedRows] = React.useState([]);
  const [editingRow, setEditingRow] = React.useState(null); // Not used in this version but kept for consistency with outline
  const [showPreview, setShowPreview] = React.useState(false);

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
    
    try {
      const properties = processMappedData();
      
      if (properties.length === 0) {
        throw new Error("Nenhum dado válido para importar");
      }

      setProgress(`A validar ${properties.length} imóveis...`);

      const processedProperties = await Promise.all(
        properties.map(async (p) => {
          if (!p.property_type || !p.listing_type) {
            const detected = await detectPropertyTypes(p.title, p.description);
            if (detected) {
              return {
                ...p,
                property_type: p.property_type || detected.property_type || 'apartment',
                listing_type: p.listing_type || detected.listing_type || 'sale'
              };
            }
          }
          return p;
        })
      );

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

      setProgress(`A guardar ${validProperties.length} imóveis...`);

      // Gerar tags com IA para cada imóvel válido
      setProgress(`A gerar tags com IA para ${validProperties.length} imóveis...`);
      const propertiesWithTags = await Promise.all(
        validProperties.map(async (p) => {
          const tags = await generatePropertyTags(p);
          return { ...p, tags };
        })
      );

      setProgress(`A guardar ${propertiesWithTags.length} imóveis...`);

      const created = await base44.entities.Property.bulkCreate(
        propertiesWithTags.map(p => ({
          ...p,
          status: "active",
          address: p.address || p.city,
          state: p.state || p.city,
          source_url: 'CSV Import',
          is_partner_property: propertyOwnership === "partner",
          partner_id: propertyOwnership === "partner" ? selectedPartner?.id : undefined,
          partner_name: propertyOwnership === "partner" ? selectedPartner?.buyer_name : 
                        propertyOwnership === "private" ? privateOwnerName : undefined,
          internal_notes: propertyOwnership === "private" && privateOwnerPhone ? 
                         `Proprietário particular: ${privateOwnerName} - Tel: ${privateOwnerPhone}` : undefined
        }))
      );
      
      setResults({
        success: true,
        count: created.length,
        properties: created,
        message: `✅ ${created.length} imóveis importados de CSV!\n${invalidProperties.length > 0 ? `⚠️ ${invalidProperties.length} rejeitados por validação` : ''}`
      });
      
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      toast.success(`${created.length} imóveis importados!`);
      setShowPreview(false); // Close the dialog on success

    } catch (error) {
      setResults({ success: false, message: error.message || "Erro ao processar CSV" });
      toast.error("Erro na importação");
    }
    
    setImporting(false);
  };

  const importFromText = async () => {
    if (!textInput || textInput.trim().length < 50) {
      toast.error("Insira texto descritivo sobre imóvel(is)");
      return;
    }

    setImporting(true);
    setProgress("A extrair dados do texto...");
    setResults(null);
    setValidationDetails(null);

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Extrai dados de imóveis do seguinte texto. Pode conter um ou vários imóveis.

TEXTO:
${textInput}

INSTRUÇÕES:
- Identifica TODOS os imóveis mencionados
- Extrai dados estruturados de cada um
- Preços em formato numérico (495.000 € = 495000)
- Se algo não está claro, infere baseado no contexto
- Áreas em m²
- property_type: "house", "apartment", "condo", "townhouse", "land", "commercial"
- listing_type: "sale" ou "rent"

Retorna array de imóveis em JSON estruturado.`,
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
                  property_type: { type: "string" },
                  listing_type: { type: "string" },
                  price: { type: "number" },
                  bedrooms: { type: "number" },
                  bathrooms: { type: "number" },
                  square_feet: { type: "number" },
                  address: { type: "string" },
                  city: { type: "string" },
                  state: { type: "string" },
                  zip_code: { type: "string" },
                  year_built: { type: "number" },
                  amenities: { type: "array", items: { type: "string" } }
                }
              }
            }
          }
        }
      });

      if (!result?.properties || result.properties.length === 0) {
        throw new Error("Nenhum imóvel identificado no texto. Forneça informações mais detalhadas.");
      }

      setProgress(`${result.properties.length} imóvel(is) identificado(s)... A validar...`);

      const validationResults = result.properties.map(prop => ({
        property: prop,
        validation: validateProperty(prop, 'Texto')
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
        throw new Error("Nenhum imóvel passou na validação. Forneça mais informações (preço, localização, tipo).");
      }

      // Gerar tags com IA para cada imóvel
      setProgress(`A gerar tags com IA para ${validProperties.length} imóvel(is)...`);
      const propertiesWithTags = await Promise.all(
        validProperties.map(async (v) => {
          const tags = await generatePropertyTags(v.property);
          return { ...v, property: { ...v.property, tags } };
        })
      );

      setProgress(`A guardar ${propertiesWithTags.length} imóvel(is)...`);

      const created = await base44.entities.Property.bulkCreate(
        propertiesWithTags.map(v => ({
          ...v.property,
          status: "active",
          address: v.property.address || v.property.city,
          state: v.property.state || v.property.city,
          source_url: 'Importação por Texto',
          is_partner_property: propertyOwnership === "partner",
          partner_id: propertyOwnership === "partner" ? selectedPartner?.id : undefined,
          partner_name: propertyOwnership === "partner" ? selectedPartner?.buyer_name : 
                        propertyOwnership === "private" ? privateOwnerName : undefined,
          internal_notes: propertyOwnership === "private" && privateOwnerPhone ? 
                         `Proprietário particular: ${privateOwnerName} - Tel: ${privateOwnerPhone}` : undefined
        }))
      );

      setResults({
        success: true,
        count: created.length,
        properties: created,
        message: `✅ ${created.length} imóvel(is) criado(s) a partir do texto!\n${invalidProperties.length > 0 ? `⚠️ ${invalidProperties.length} rejeitado(s) por falta de dados` : ''}`
      });

      queryClient.invalidateQueries({ queryKey: ['properties', 'myProperties'] });
      toast.success(`${created.length} imóvel(is) importado(s)!`);
      setTextInput("");

    } catch (error) {
      setResults({ success: false, message: error.message || "Erro ao processar texto" });
      toast.error("Erro ao importar");
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

      setProgress(`A processar ${properties.length} imóveis...`);

      const processedProperties = await Promise.all(
        properties.map(async (p) => {
          if (!p.property_type || !p.listing_type) {
            const detected = await detectPropertyTypes(p.title, p.description);
            if (detected) {
              return {
                ...p,
                property_type: p.property_type || detected.property_type || 'apartment',
                listing_type: p.listing_type || detected.listing_type || 'sale'
              };
            }
          }
          return p;
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

      const created = await base44.entities.Property.bulkCreate(
        propertiesWithTags.map(p => ({
          ...p,
          status: "active",
          address: p.address || p.city,
          state: p.state || p.city,
          is_partner_property: propertyOwnership === "partner",
          partner_id: propertyOwnership === "partner" ? selectedPartner?.id : undefined,
          partner_name: propertyOwnership === "partner" ? selectedPartner?.buyer_name : 
                        propertyOwnership === "private" ? privateOwnerName : undefined,
          internal_notes: propertyOwnership === "private" && privateOwnerPhone ? 
                         `Proprietário particular: ${privateOwnerName} - Tel: ${privateOwnerPhone}` : undefined
        }))
      );
      
      setResults({
        success: true,
        count: created.length,
        properties: created,
        message: `${created.length} imóveis importados de JSON!`
      });
      
      queryClient.invalidateQueries({ queryKey: ['properties'] });
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
        const processedProperties = await Promise.all(
          result.output.properties.map(async (p) => {
            if (!p.property_type || !p.listing_type) {
              const detected = await detectPropertyTypes(p.title, p.description);
              if (detected) {
                return { ...p, property_type: p.property_type || detected.property_type, listing_type: p.listing_type || detected.listing_type };
              }
            }
            return p;
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
        
        queryClient.invalidateQueries({ queryKey: ['properties'] });
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
    setImporting(true);
    setValidationDetails(null);
    const portal = detectPortal(url);
    setProgress(`A aceder a ${portal.name}...`);
    
    try {
      const urlObj = new URL(url);
      const baseUrl = urlObj.origin;
      const isDetailPage = url.match(/\/imovel\/|\/anuncio\/|\/propriedade\/|\/property\//);
      
      setProgress(isDetailPage ? "A extrair imóvel..." : "A extrair listagem...");
      
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `És um especialista em web scraping de portais imobiliários portugueses. Extrai TODOS os dados do imóvel em ${url}. PREÇO é CRÍTICO - formato português usa ponto como separador de milhares (495.000 € = 495000).`,
        add_context_from_internet: true,
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
                  property_type: { type: "string" },
                  listing_type: { type: "string" },
                  price: { type: "number" },
                  bedrooms: { type: "number" },
                  bathrooms: { type: "number" },
                  square_feet: { type: "number" },
                  address: { type: "string" },
                  city: { type: "string" },
                  state: { type: "string" },
                  zip_code: { type: "string" },
                  year_built: { type: "number" },
                  external_id: { type: "string" },
                  amenities: { type: "array", items: { type: "string" } },
                  images: { type: "array", items: { type: "string" } }
                },
                required: ["title", "price", "city"]
              }
            }
          }
        }
      });

      if (!result?.properties || result.properties.length === 0) {
        throw new Error(`Nenhum imóvel encontrado em ${portal.name}. Verifica o link.`);
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
        return { ...p, images, source_url: url };
      });

      const processedProperties = await Promise.all(
        propertiesWithImages.map(async (p) => {
          if (!p.property_type || !p.listing_type) {
            const detected = await detectPropertyTypes(p.title, p.description);
            if (detected) {
              return {
                ...p,
                property_type: p.property_type || detected.property_type || 'apartment',
                listing_type: p.listing_type || detected.listing_type || 'sale'
              };
            }
          }
          return p;
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

      const created = await base44.entities.Property.bulkCreate(
        propertiesWithTags.map(p => ({ 
          ...p, 
          status: "active", 
          featured: false,
          address: p.address || p.city,
          state: p.state || p.city,
          is_partner_property: propertyOwnership === "partner",
          partner_id: propertyOwnership === "partner" ? selectedPartner?.id : undefined,
          partner_name: propertyOwnership === "partner" ? selectedPartner?.buyer_name : 
                        propertyOwnership === "private" ? privateOwnerName : undefined,
          internal_notes: propertyOwnership === "private" && privateOwnerPhone ? 
                         `Proprietário particular: ${privateOwnerName} - Tel: ${privateOwnerPhone}` : undefined
        }))
      );

      const countWithImages = created.filter(p => p.images?.length > 0).length;
      const totalImages = created.reduce((sum, p) => sum + (p.images?.length || 0), 0);
      
      setResults({
        success: true,
        count: created.length,
        properties: created,
        portal: portal,
        stats: { withImages: countWithImages, totalImages },
        message: `✅ ${created.length} imóveis importados!\n📸 ${countWithImages} com fotos (${totalImages} imagens)\n${invalidProperties.length > 0 ? `⚠️ ${invalidProperties.length} rejeitados por validação` : ''}`
      });
      
      queryClient.invalidateQueries({ queryKey: ['properties', 'myProperties'] });
      toast.success(`${created.length} imóveis importados!`);

    } catch (error) {
      setResults({ success: false, message: error.message || "Erro ao importar" });
      toast.error("Erro ao importar");
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
        setFileType(extension === 'csv' ? 'csv' : 'excel'); // Differentiate CSV from Excel
        if (extension === 'csv') {
          handleCSVPreview(selectedFile); // Directly show preview for CSV
        }
      } else {
        setFileType(null);
        toast.error("Formato de ficheiro não suportado.");
      }
    }
  };

  const handleFileImport = () => {
    if (!file) {
      toast.error("Nenhum ficheiro selecionado.");
      return;
    }

    if (fileType === 'json') {
      importFromJSON(file);
    } else if (fileType === 'csv') {
      // If the preview is already open, the actual import button is inside the dialog
      // This button is for initiating the preview if it wasn't opened automatically
      handleCSVPreview(file); 
    } else if (fileType === 'excel') { // Fallback for XLSX/XLS using LLM extraction
      importFromCSV(file);
    }
  };

  const detectedPortal = url ? detectPortal(url) : null;

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
                onValueChange={(id) => setSelectedPartner(partners.find(p => p.id === id))}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Selecione o parceiro..." />
                </SelectTrigger>
                <SelectContent>
                  {partners.map(partner => (
                    <SelectItem key={partner.id} value={partner.id}>
                      {partner.buyer_name} - {partner.buyer_email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedPartner && (
                <p className="text-xs text-purple-600 mt-2">
                  ✓ Imóveis serão atribuídos a {selectedPartner.buyer_name}
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



      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Importar de Website
          </CardTitle>
          <p className="text-sm text-slate-500">Extração precisa com validação rigorosa de preços</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2 mb-3">
            {supportedPortals.map((portal) => (
              <Badge key={portal.domain} className={portal.color} variant="secondary">
                {portal.name}
              </Badge>
            ))}
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
          
          <Button
            onClick={importFromURL}
            disabled={importing || !url}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {importing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {progress}
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Importar com IA
              </>
            )}
          </Button>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-900 font-medium mb-1">🔒 Sistema Melhorado</p>
            <p className="text-xs text-blue-700">
              ✓ Extração precisa de preços formato português (495.000 € = 495000)
              <br />
              ✓ Validação rigorosa antes de importar
              <br />
              ✓ Suporte para Idealista, Imovirtual, Casa Sapo e mais
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
              accept=".csv,.xlsx,.xls,.json"
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
              <p className="text-sm text-slate-500">CSV, Excel ou JSON</p>
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
                  {fileType === 'csv' ? `Pré-visualizar CSV` : `Processar ${fileType?.toUpperCase()}`}
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

              {/* Actions */}
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowPreview(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleImportFromPreview}
                  disabled={importing || selectedRows.length === 0}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {importing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {progress}
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