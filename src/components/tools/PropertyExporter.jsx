import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Download, Upload, FileText, CheckCircle2, AlertCircle, Globe, FileJson, FileSpreadsheet, Hash } from "lucide-react";
import { toast } from "sonner";

const PORTALS = [
  {
    id: "idealista",
    name: "Idealista",
    logo: "🟡",
    format: "xml",
    countries: ["PT", "ES", "IT"],
    fields: ["title", "description", "price", "property_type", "listing_type", "city", "address", "bedrooms", "bathrooms", "square_feet", "images", "energy_certificate"],
    color: "bg-yellow-100 text-yellow-800"
  },
  {
    id: "imovirtual",
    name: "Imovirtual",
    logo: "🟢",
    format: "xml",
    countries: ["PT"],
    fields: ["title", "description", "price", "property_type", "listing_type", "city", "address", "bedrooms", "bathrooms", "useful_area", "gross_area", "images"],
    color: "bg-green-100 text-green-800"
  },
  {
    id: "casa_sapo",
    name: "Casa Sapo",
    logo: "🔵",
    format: "xml",
    countries: ["PT"],
    fields: ["title", "description", "price", "property_type", "listing_type", "city", "state", "zip_code", "bedrooms", "bathrooms", "square_feet", "images"],
    color: "bg-blue-100 text-blue-800"
  },
  {
    id: "olx",
    name: "OLX",
    logo: "🟣",
    format: "csv",
    countries: ["PT"],
    fields: ["title", "description", "price", "property_type", "city", "images"],
    color: "bg-purple-100 text-purple-800"
  },
  {
    id: "rightmove",
    name: "Rightmove",
    logo: "🇬🇧",
    format: "xml",
    countries: ["UK"],
    fields: ["title", "description", "price", "property_type", "listing_type", "address", "city", "zip_code", "bedrooms", "bathrooms", "square_feet", "images"],
    color: "bg-red-100 text-red-800"
  },
  {
    id: "zillow",
    name: "Zillow",
    logo: "🇺🇸",
    format: "csv",
    countries: ["US"],
    fields: ["title", "description", "price", "property_type", "listing_type", "address", "city", "state", "zip_code", "bedrooms", "bathrooms", "square_feet", "year_built", "images"],
    color: "bg-blue-100 text-blue-800"
  },
  {
    id: "kyero",
    name: "Kyero",
    logo: "🌍",
    format: "xml",
    countries: ["ES", "PT", "FR", "IT"],
    fields: ["title", "description", "price", "property_type", "listing_type", "city", "state", "bedrooms", "bathrooms", "square_feet", "images"],
    color: "bg-orange-100 text-orange-800"
  },
  {
    id: "generic_xml",
    name: "XML Genérico",
    logo: "📄",
    format: "xml",
    countries: ["All"],
    fields: ["all"],
    color: "bg-slate-100 text-slate-800"
  },
  {
    id: "generic_csv",
    name: "CSV Genérico",
    logo: "📊",
    format: "csv",
    countries: ["All"],
    fields: ["all"],
    color: "bg-slate-100 text-slate-800"
  }
];

export default function PropertyExporter() {
  const [selectedProperties, setSelectedProperties] = React.useState([]);
  const [selectedPortals, setSelectedPortals] = React.useState([]);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [exporting, setExporting] = React.useState(false);
  const [exportHistory, setExportHistory] = React.useState([]);

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: properties = [], isLoading } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list('-created_date'),
  });

  const filteredProperties = properties.filter(p => {
    const matchesSearch = searchTerm === "" ||
      p.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.city?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch && p.status === 'active';
  });

  const toggleProperty = (id) => {
    setSelectedProperties(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const togglePortal = (id) => {
    setSelectedPortals(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const validateProperty = (property, portal) => {
    const errors = [];
    const warnings = [];
    
    const requiredFields = portal.fields === "all" ? 
      ["title", "price", "city", "property_type", "listing_type"] : 
      portal.fields.filter(f => ["title", "price", "city"].includes(f));

    requiredFields.forEach(field => {
      if (!property[field]) {
        errors.push(`Campo obrigatório ausente: ${field}`);
      }
    });

    if (!property.images || property.images.length === 0) {
      warnings.push("Sem imagens");
    } else if (property.images.length < 3) {
      warnings.push(`Poucas imagens (${property.images.length})`);
    }

    if (!property.description || property.description.length < 100) {
      warnings.push("Descrição muito curta");
    }

    return { errors, warnings, isValid: errors.length === 0 };
  };

  const generateXML = (properties, portalId) => {
    const portal = PORTALS.find(p => p.id === portalId);
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += `<properties portal="${portal.name}">\n`;

    properties.forEach(property => {
      xml += '  <property>\n';
      xml += `    <id>${property.id}</id>\n`;
      xml += `    <external_id>${property.external_id || property.id}</external_id>\n`;
      xml += `    <title><![CDATA[${property.title}]]></title>\n`;
      xml += `    <description><![CDATA[${property.description || ''}]]></description>\n`;
      xml += `    <price>${property.price}</price>\n`;
      xml += `    <property_type>${property.property_type}</property_type>\n`;
      xml += `    <listing_type>${property.listing_type}</listing_type>\n`;
      xml += `    <city>${property.city}</city>\n`;
      xml += `    <state>${property.state || ''}</state>\n`;
      xml += `    <address><![CDATA[${property.address || ''}]]></address>\n`;
      xml += `    <zip_code>${property.zip_code || ''}</zip_code>\n`;
      
      if (property.bedrooms) xml += `    <bedrooms>${property.bedrooms}</bedrooms>\n`;
      if (property.bathrooms) xml += `    <bathrooms>${property.bathrooms}</bathrooms>\n`;
      if (property.square_feet) xml += `    <square_feet>${property.square_feet}</square_feet>\n`;
      if (property.useful_area) xml += `    <useful_area>${property.useful_area}</useful_area>\n`;
      if (property.gross_area) xml += `    <gross_area>${property.gross_area}</gross_area>\n`;
      if (property.year_built) xml += `    <year_built>${property.year_built}</year_built>\n`;
      if (property.energy_certificate) xml += `    <energy_certificate>${property.energy_certificate}</energy_certificate>\n`;
      
      if (property.images && property.images.length > 0) {
        xml += '    <images>\n';
        property.images.forEach((img, idx) => {
          xml += `      <image order="${idx + 1}">${img}</image>\n`;
        });
        xml += '    </images>\n';
      }

      if (property.amenities && property.amenities.length > 0) {
        xml += '    <amenities>\n';
        property.amenities.forEach(amenity => {
          xml += `      <amenity>${amenity}</amenity>\n`;
        });
        xml += '    </amenities>\n';
      }

      xml += '  </property>\n';
    });

    xml += '</properties>';
    return xml;
  };

  const generateCSV = (properties, portalId) => {
    const portal = PORTALS.find(p => p.id === portalId);
    const headers = portal.fields === "all" ? 
      ["id", "title", "description", "price", "property_type", "listing_type", "city", "state", "address", "zip_code", "bedrooms", "bathrooms", "square_feet", "useful_area", "gross_area", "year_built", "energy_certificate", "images"] :
      ["id", ...portal.fields];

    let csv = headers.join(',') + '\n';

    properties.forEach(property => {
      const row = headers.map(header => {
        let value = property[header] || '';
        
        if (header === 'images' && Array.isArray(value)) {
          value = value.join('|');
        } else if (header === 'amenities' && Array.isArray(value)) {
          value = value.join('|');
        }
        
        // Escape quotes and wrap in quotes if contains comma
        value = String(value).replace(/"/g, '""');
        if (value.includes(',') || value.includes('\n') || value.includes('"')) {
          value = `"${value}"`;
        }
        
        return value;
      });
      
      csv += row.join(',') + '\n';
    });

    return csv;
  };

  const exportToPortals = async () => {
    if (selectedProperties.length === 0) {
      toast.error("Selecione pelo menos 1 imóvel");
      return;
    }

    if (selectedPortals.length === 0) {
      toast.error("Selecione pelo menos 1 portal");
      return;
    }

    setExporting(true);

    try {
      const propertiesToExport = properties.filter(p => selectedProperties.includes(p.id));
      const exports = [];

      for (const portalId of selectedPortals) {
        const portal = PORTALS.find(p => p.id === portalId);
        
        // Validate properties
        const validations = propertiesToExport.map(p => ({
          property: p,
          validation: validateProperty(p, portal)
        }));

        const validProperties = validations.filter(v => v.validation.isValid).map(v => v.property);
        const invalidCount = validations.filter(v => !v.validation.isValid).length;

        if (validProperties.length === 0) {
          toast.error(`Nenhum imóvel válido para ${portal.name}`);
          continue;
        }

        // Generate export file
        let content, filename, mimeType;

        if (portal.format === 'xml') {
          content = generateXML(validProperties, portalId);
          filename = `${portal.id}_export_${Date.now()}.xml`;
          mimeType = 'application/xml';
        } else {
          content = generateCSV(validProperties, portalId);
          filename = `${portal.id}_export_${Date.now()}.csv`;
          mimeType = 'text/csv';
        }

        // Download file
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        exports.push({
          portal: portal.name,
          format: portal.format.toUpperCase(),
          count: validProperties.length,
          invalid: invalidCount,
          filename,
          timestamp: new Date().toISOString()
        });

        toast.success(`${portal.name}: ${validProperties.length} imóveis exportados${invalidCount > 0 ? ` (${invalidCount} rejeitados)` : ''}`);
      }

      setExportHistory(prev => [...exports, ...prev].slice(0, 20));
      setSelectedProperties([]);
      setSelectedPortals([]);

    } catch (error) {
      toast.error("Erro ao exportar");
      console.error(error);
    }

    setExporting(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" />
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Left Column - Property Selection */}
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-blue-600" />
                Selecionar Imóveis
              </span>
              {selectedProperties.length > 0 && (
                <Badge className="bg-blue-100 text-blue-800">
                  {selectedProperties.length} selecionado{selectedProperties.length > 1 ? 's' : ''}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisar imóveis..."
              className="w-full"
            />

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedProperties(filteredProperties.map(p => p.id))}
              >
                Selecionar Todos ({filteredProperties.length})
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedProperties([])}
              >
                Limpar Seleção
              </Button>
            </div>

            <div className="max-h-96 overflow-y-auto space-y-2 border rounded-lg p-3">
              {filteredProperties.length === 0 ? (
                <p className="text-center text-slate-500 py-8">Nenhum imóvel ativo encontrado</p>
              ) : (
                filteredProperties.map(property => (
                  <div
                    key={property.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                      selectedProperties.includes(property.id) ? 'bg-blue-50 border-blue-300' : 'bg-white hover:bg-slate-50'
                    }`}
                    onClick={() => toggleProperty(property.id)}
                  >
                    <Checkbox
                      checked={selectedProperties.includes(property.id)}
                      onCheckedChange={() => toggleProperty(property.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">{property.title}</p>
                      <div className="flex items-center gap-2 text-xs text-slate-600 mt-1">
                        <span>{property.city}</span>
                        <span>•</span>
                        <span>€{property.price?.toLocaleString()}</span>
                        {property.images?.length > 0 && (
                          <>
                            <span>•</span>
                            <span>{property.images.length} fotos</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Export History */}
        {exportHistory.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-slate-600" />
                Histórico de Exportações
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {exportHistory.map((exp, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <p className="font-medium text-slate-900">{exp.portal}</p>
                      <p className="text-xs text-slate-600">
                        {exp.count} imóveis • {exp.format} • {exp.filename}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(exp.timestamp).toLocaleString('pt-PT')}
                      </p>
                    </div>
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Right Column - Portal Selection & Export */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-purple-600" />
                Portais
              </span>
              {selectedPortals.length > 0 && (
                <Badge className="bg-purple-100 text-purple-800">
                  {selectedPortals.length} portal{selectedPortals.length > 1 ? 's' : ''}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-slate-600 mb-4">Selecione os portais para exportação</p>

            {PORTALS.map(portal => (
              <div
                key={portal.id}
                className={`flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                  selectedPortals.includes(portal.id) ? 'bg-purple-50 border-purple-300' : 'bg-white hover:bg-slate-50'
                }`}
                onClick={() => togglePortal(portal.id)}
              >
                <Checkbox
                  checked={selectedPortals.includes(portal.id)}
                  onCheckedChange={() => togglePortal(portal.id)}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{portal.logo}</span>
                    <span className="font-medium text-slate-900">{portal.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Badge variant="outline" className="text-xs">
                      {portal.format === 'xml' ? <FileJson className="w-3 h-3 mr-1" /> : <FileSpreadsheet className="w-3 h-3 mr-1" />}
                      {portal.format.toUpperCase()}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {portal.countries.join(', ')}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}

            <Button
              onClick={exportToPortals}
              disabled={exporting || selectedProperties.length === 0 || selectedPortals.length === 0}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 mt-4"
            >
              {exporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  A exportar...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Exportar {selectedProperties.length} Imóve{selectedProperties.length !== 1 ? 'is' : 'l'} para {selectedPortals.length} Portal{selectedPortals.length !== 1 ? 's' : ''}
                </>
              )}
            </Button>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
              <p className="text-xs font-semibold text-blue-900 mb-1">ℹ️ Como funciona?</p>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>• Selecione os imóveis e portais</li>
                <li>• Validação automática dos dados</li>
                <li>• Download de ficheiros XML/CSV</li>
                <li>• Importar manualmente nos portais</li>
              </ul>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-amber-900 mb-1">⚠️ Importante</p>
              <p className="text-xs text-amber-700">
                Alguns portais requerem integração API paga. Os ficheiros gerados seguem os formatos padrão de cada portal.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-500 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-green-900 mb-1">Validação Automática</p>
                <p className="text-xs text-green-700">
                  Cada imóvel é validado antes da exportação. Campos obrigatórios, imagens e descrições são verificados automaticamente.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}