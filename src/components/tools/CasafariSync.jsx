import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Upload, Loader2, CheckCircle2, AlertCircle, RefreshCw, 
  FileJson, Globe, Building2, Clock, Download
} from "lucide-react";
import { toast } from "sonner";

export default function CasafariSync() {
  const queryClient = useQueryClient();
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState("");
  const [results, setResults] = useState(null);
  const [jsonInput, setJsonInput] = useState("");
  const [file, setFile] = useState(null);
  const [lastSync, setLastSync] = useState(null);

  // Process Casafari JSON data
  const processCasafariData = async (data) => {
    setImporting(true);
    setProgress("A processar dados do Casafari...");
    setResults(null);

    try {
      let properties = [];

      // Handle different Casafari export formats
      if (Array.isArray(data)) {
        properties = data;
      } else if (data.properties) {
        properties = data.properties;
      } else if (data.listings) {
        properties = data.listings;
      } else if (data.results) {
        properties = data.results;
      } else if (typeof data === 'object' && data.id) {
        // Single property
        properties = [data];
      }

      if (properties.length === 0) {
        throw new Error("Nenhum imóvel encontrado nos dados");
      }

      setProgress(`A mapear ${properties.length} imóveis do Casafari...`);

      // Map Casafari fields to our schema
      const mappedProperties = properties.map(p => {
        // Casafari field mapping (adapt based on actual Casafari export format)
        const mapped = {
          title: p.title || p.name || p.headline || `Imóvel ${p.id || p.reference}`,
          description: p.description || p.text || p.details || "",
          price: parseFloat(p.price || p.salePrice || p.rentPrice || p.value || 0),
          property_type: mapPropertyType(p.propertyType || p.type || p.category),
          listing_type: mapListingType(p.transactionType || p.listingType || p.operation),
          bedrooms: parseInt(p.bedrooms || p.rooms || p.typology?.replace(/\D/g, '') || 0),
          bathrooms: parseInt(p.bathrooms || p.wc || 0),
          square_feet: parseFloat(p.area || p.usefulArea || p.netArea || p.grossArea || 0),
          gross_area: parseFloat(p.grossArea || p.totalArea || 0),
          useful_area: parseFloat(p.usefulArea || p.netArea || p.area || 0),
          address: p.address || p.street || p.location?.address || "",
          city: p.city || p.municipality || p.location?.city || p.concelho || "",
          state: p.district || p.state || p.location?.district || p.distrito || "",
          zip_code: p.zipCode || p.postalCode || p.location?.postalCode || "",
          year_built: parseInt(p.yearBuilt || p.constructionYear || 0) || undefined,
          energy_certificate: p.energyCertificate || p.energyClass || p.cer || undefined,
          images: extractImages(p),
          amenities: extractAmenities(p),
          external_id: p.id || p.reference || p.externalId || p.casafariId,
          source_url: p.url || p.link || p.sourceUrl || "Casafari Import",
          // Casafari specific
          floor: p.floor || p.floorNumber,
          parking_spaces: parseInt(p.parkingSpaces || p.garage || 0),
          latitude: p.latitude || p.location?.lat,
          longitude: p.longitude || p.location?.lng,
        };

        return mapped;
      });

      setProgress(`A validar ${mappedProperties.length} imóveis...`);

      // Filter valid properties
      const validProperties = mappedProperties.filter(p => 
        p.title && p.title.length > 0
      );

      if (validProperties.length === 0) {
        throw new Error("Nenhum imóvel válido após mapeamento");
      }

      setProgress(`A gerar referências para ${validProperties.length} imóveis...`);

      // Generate ref_ids
      const { data: refData } = await base44.functions.invoke('generateRefId', { 
        entity_type: 'Property', 
        count: validProperties.length 
      });
      const refIds = refData.ref_ids || [refData.ref_id];

      // Prepare properties for import
      const propertiesWithRefIds = validProperties.map((p, index) => ({
        ...p,
        ref_id: refIds[index],
        status: "active",
        address: p.address || p.city,
        state: p.state || p.city,
      }));

      setProgress(`A guardar ${propertiesWithRefIds.length} imóveis...`);

      // Check for existing properties by external_id
      const existingProperties = await base44.entities.Property.list('-created_date', 10000);
      const existingByExternalId = new Map();
      existingProperties.forEach(p => {
        if (p.external_id) {
          existingByExternalId.set(p.external_id, p);
        }
      });

      const toCreate = [];
      const toUpdate = [];

      for (const property of propertiesWithRefIds) {
        const existing = existingByExternalId.get(property.external_id);
        if (existing) {
          toUpdate.push({ id: existing.id, data: property });
        } else {
          toCreate.push(property);
        }
      }

      let created = [];
      let updated = [];

      // Create new properties
      if (toCreate.length > 0) {
        created = await base44.entities.Property.bulkCreate(toCreate);
      }

      // Update existing properties
      for (const { id, data } of toUpdate) {
        try {
          const { ref_id, ...updateData } = data;
          await base44.entities.Property.update(id, updateData);
          updated.push({ id, ...data });
        } catch (error) {
          console.error(`Erro ao atualizar ${data.external_id}:`, error);
        }
      }

      const totalProcessed = created.length + updated.length;

      setResults({
        success: true,
        total: totalProcessed,
        created: created.length,
        updated: updated.length,
        properties: [...created, ...updated].slice(0, 5),
        message: `✅ ${totalProcessed} imóveis sincronizados!\n📥 ${created.length} criados\n🔄 ${updated.length} atualizados`
      });

      setLastSync(new Date());
      await queryClient.invalidateQueries({ queryKey: ['properties'] });
      await queryClient.invalidateQueries({ queryKey: ['myProperties'] });
      toast.success(`${totalProcessed} imóveis sincronizados do Casafari!`);

    } catch (error) {
      console.error("Casafari sync error:", error);
      setResults({ 
        success: false, 
        message: `❌ ${error.message || "Erro ao processar dados"}`
      });
      toast.error(error.message || "Erro na sincronização");
    }

    setImporting(false);
  };

  // Map Casafari property types to our schema
  const mapPropertyType = (type) => {
    if (!type) return "apartment";
    const t = type.toLowerCase();
    if (t.includes("apartamento") || t.includes("apartment") || t.includes("flat")) return "apartment";
    if (t.includes("moradia") || t.includes("house") || t.includes("villa")) return "house";
    if (t.includes("terreno") || t.includes("land") || t.includes("plot")) return "land";
    if (t.includes("prédio") || t.includes("building")) return "building";
    if (t.includes("quinta") || t.includes("farm") || t.includes("rural")) return "farm";
    if (t.includes("loja") || t.includes("store") || t.includes("shop")) return "store";
    if (t.includes("armazém") || t.includes("warehouse")) return "warehouse";
    if (t.includes("escritório") || t.includes("office")) return "office";
    return "apartment";
  };

  // Map Casafari listing types
  const mapListingType = (type) => {
    if (!type) return "sale";
    const t = type.toLowerCase();
    if (t.includes("arrendamento") || t.includes("rent") || t.includes("aluguer")) return "rent";
    return "sale";
  };

  // Extract images from Casafari data
  const extractImages = (p) => {
    let images = [];
    if (p.images && Array.isArray(p.images)) {
      images = p.images.map(img => typeof img === 'string' ? img : img.url || img.src);
    } else if (p.photos && Array.isArray(p.photos)) {
      images = p.photos.map(img => typeof img === 'string' ? img : img.url || img.src);
    } else if (p.media && Array.isArray(p.media)) {
      images = p.media.filter(m => m.type === 'image').map(m => m.url);
    } else if (p.mainImage) {
      images = [p.mainImage];
    }
    return images.filter(Boolean).slice(0, 20);
  };

  // Extract amenities from Casafari data
  const extractAmenities = (p) => {
    let amenities = [];
    if (p.amenities && Array.isArray(p.amenities)) {
      amenities = p.amenities;
    } else if (p.features && Array.isArray(p.features)) {
      amenities = p.features;
    } else if (p.characteristics && Array.isArray(p.characteristics)) {
      amenities = p.characteristics;
    }
    
    // Add boolean features
    if (p.hasPool || p.pool) amenities.push("Piscina");
    if (p.hasGarden || p.garden) amenities.push("Jardim");
    if (p.hasGarage || p.garage) amenities.push("Garagem");
    if (p.hasElevator || p.elevator) amenities.push("Elevador");
    if (p.hasBalcony || p.balcony) amenities.push("Varanda");
    if (p.hasTerrace || p.terrace) amenities.push("Terraço");
    if (p.hasAirConditioning || p.airConditioning) amenities.push("Ar Condicionado");
    if (p.hasCentralHeating || p.centralHeating) amenities.push("Aquecimento Central");
    
    return [...new Set(amenities)].filter(Boolean);
  };

  // Handle JSON text input
  const handleJsonImport = () => {
    if (!jsonInput.trim()) {
      toast.error("Cole o JSON do Casafari");
      return;
    }

    try {
      const data = JSON.parse(jsonInput);
      processCasafariData(data);
    } catch (error) {
      toast.error("JSON inválido. Verifique o formato.");
    }
  };

  // Handle file upload
  const handleFileUpload = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);

    try {
      const text = await selectedFile.text();
      const data = JSON.parse(text);
      processCasafariData(data);
    } catch (error) {
      toast.error("Erro ao ler ficheiro. Verifique se é um JSON válido.");
    }
  };

  return (
    <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-blue-600" />
          Sincronização Casafari
        </CardTitle>
        <p className="text-sm text-slate-500">
          Importe imóveis diretamente do Casafari via JSON exportado
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {lastSync && (
          <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-100 p-2 rounded">
            <Clock className="w-4 h-4" />
            Última sincronização: {lastSync.toLocaleString('pt-PT')}
          </div>
        )}

        <Tabs defaultValue="json" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="json" className="flex items-center gap-2">
              <FileJson className="w-4 h-4" />
              Colar JSON
            </TabsTrigger>
            <TabsTrigger value="file" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Ficheiro JSON
            </TabsTrigger>
          </TabsList>

          <TabsContent value="json" className="space-y-4 mt-4">
            <div>
              <Label>Cole o JSON exportado do Casafari</Label>
              <Textarea
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                placeholder={`Cole aqui o JSON do Casafari...

Exemplo de formato esperado:
{
  "properties": [
    {
      "id": "12345",
      "title": "Apartamento T3 em Lisboa",
      "price": 350000,
      "propertyType": "apartment",
      "transactionType": "sale",
      "bedrooms": 3,
      "area": 120,
      "city": "Lisboa",
      ...
    }
  ]
}`}
                rows={10}
                className="font-mono text-sm"
              />
            </div>

            <Button
              onClick={handleJsonImport}
              disabled={importing || !jsonInput.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {importing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {progress}
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Sincronizar do JSON
                </>
              )}
            </Button>
          </TabsContent>

          <TabsContent value="file" className="space-y-4 mt-4">
            <div className="border-2 border-dashed border-blue-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
                id="casafari-file-upload"
                disabled={importing}
              />
              <label htmlFor="casafari-file-upload" className="cursor-pointer">
                <FileJson className="w-12 h-12 text-blue-400 mx-auto mb-4" />
                <p className="text-slate-700 font-medium mb-1">
                  {file ? file.name : "Clique para carregar ficheiro JSON"}
                </p>
                <p className="text-sm text-slate-500">Exportação JSON do Casafari</p>
              </label>
            </div>
          </TabsContent>
        </Tabs>

        {/* Help section */}
        <div className="bg-blue-100 border border-blue-200 rounded-lg p-3">
          <p className="text-xs text-blue-900 font-medium mb-1">📋 Como exportar do Casafari:</p>
          <ol className="text-xs text-blue-700 list-decimal list-inside space-y-1">
            <li>Aceda ao Casafari e faça login</li>
            <li>Vá a "Os Meus Imóveis" ou faça uma pesquisa</li>
            <li>Selecione os imóveis que deseja exportar</li>
            <li>Clique em "Exportar" → "JSON"</li>
            <li>Cole o JSON aqui ou carregue o ficheiro</li>
          </ol>
        </div>

        {/* Results */}
        {results && (
          <Card className={results.success ? "border-green-500" : "border-red-500"}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                {results.success ? (
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-red-600" />
                )}
                <div className="flex-1">
                  <p className="text-slate-700 whitespace-pre-line">{results.message}</p>
                  
                  {results.success && results.properties?.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <p className="text-sm font-medium text-slate-700">Imóveis processados:</p>
                      {results.properties.map((prop, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm bg-slate-50 p-2 rounded">
                          <Badge variant="outline">{prop.ref_id}</Badge>
                          <span className="truncate flex-1">{prop.title}</span>
                          <span className="text-slate-500">€{prop.price?.toLocaleString()}</span>
                        </div>
                      ))}
                      {results.total > 5 && (
                        <p className="text-xs text-slate-500 text-center">
                          E mais {results.total - 5} imóveis...
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}