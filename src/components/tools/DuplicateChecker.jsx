import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Search, Loader2, AlertTriangle, CheckCircle2, 
  Copy, Trash2, Eye, MapPin, Euro, Bed, 
  Sparkles, RefreshCw, ChevronDown, ChevronUp,
  Building2, ExternalLink, Merge
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function DuplicateChecker() {
  const [analyzing, setAnalyzing] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [progressText, setProgressText] = React.useState("");
  const [duplicateGroups, setDuplicateGroups] = React.useState([]);
  const [expandedGroups, setExpandedGroups] = React.useState({});
  const [selectedForDeletion, setSelectedForDeletion] = React.useState([]);
  const [lastAnalysis, setLastAnalysis] = React.useState(null);

  const { data: properties = [], isLoading, refetch } = useQuery({
    queryKey: ['properties-duplicates'],
    queryFn: () => base44.entities.Property.list('-created_date')
  });

  const analyzeDuplicates = async () => {
    setAnalyzing(true);
    setProgress(0);
    setProgressText("A preparar análise...");
    setDuplicateGroups([]);
    setSelectedForDeletion([]);

    try {
      // Step 1: Group by basic criteria first (fast pre-filter)
      setProgressText("A agrupar imóveis por características...");
      setProgress(10);

      const propertyGroups = {};
      properties.forEach(p => {
        // Create a key based on city, price range, bedrooms, and property type
        const priceRange = Math.floor((p.price || 0) / 50000) * 50000;
        const key = `${p.city?.toLowerCase() || 'unknown'}_${priceRange}_${p.bedrooms || 0}_${p.property_type || 'unknown'}`;
        
        if (!propertyGroups[key]) {
          propertyGroups[key] = [];
        }
        propertyGroups[key].push(p);
      });

      // Filter groups with potential duplicates (more than 1 property)
      const potentialDuplicates = Object.values(propertyGroups).filter(group => group.length > 1);
      
      if (potentialDuplicates.length === 0) {
        setDuplicateGroups([]);
        setLastAnalysis(new Date());
        toast.success("Nenhum duplicado potencial encontrado!");
        setAnalyzing(false);
        return;
      }

      setProgress(30);
      setProgressText(`A analisar ${potentialDuplicates.length} grupos com IA...`);

      // Step 2: Use AI to analyze each group for true duplicates
      const confirmedDuplicates = [];
      const totalGroups = potentialDuplicates.length;
      
      for (let i = 0; i < totalGroups; i++) {
        const group = potentialDuplicates[i];
        setProgress(30 + Math.round((i / totalGroups) * 60));
        setProgressText(`A analisar grupo ${i + 1} de ${totalGroups}...`);

        // Skip groups that are too large (likely false positives)
        if (group.length > 10) continue;

        // Prepare data for AI analysis
        const propertiesData = group.map(p => ({
          id: p.id,
          ref_id: p.ref_id,
          title: p.title,
          address: p.address,
          city: p.city,
          price: p.price,
          bedrooms: p.bedrooms,
          bathrooms: p.bathrooms,
          square_feet: p.square_feet,
          useful_area: p.useful_area,
          external_id: p.external_id,
          source_url: p.source_url,
          description: p.description?.substring(0, 200)
        }));

        try {
          const result = await base44.integrations.Core.InvokeLLM({
            prompt: `Analisa estes imóveis e identifica se são duplicados (o mesmo imóvel listado várias vezes).

IMÓVEIS:
${JSON.stringify(propertiesData, null, 2)}

CRITÉRIOS DE DUPLICAÇÃO:
- Mesmo endereço ou endereços muito similares
- Preços iguais ou muito próximos (diferença < 5%)
- Mesma tipologia (quartos, WCs)
- Áreas iguais ou muito próximas
- Títulos ou descrições muito semelhantes
- Mesmo external_id ou source_url similar

Retorna APENAS grupos de IDs que são verdadeiros duplicados.
Se não houver duplicados, retorna array vazio.`,
            response_json_schema: {
              type: "object",
              properties: {
                duplicate_groups: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      ids: { type: "array", items: { type: "string" } },
                      confidence: { type: "number" },
                      reason: { type: "string" }
                    }
                  }
                }
              }
            }
          });

          if (result.duplicate_groups?.length > 0) {
            result.duplicate_groups.forEach(dupGroup => {
              if (dupGroup.ids?.length > 1 && dupGroup.confidence >= 70) {
                const fullProperties = dupGroup.ids
                  .map(id => group.find(p => p.id === id))
                  .filter(Boolean);
                
                if (fullProperties.length > 1) {
                  confirmedDuplicates.push({
                    properties: fullProperties,
                    confidence: dupGroup.confidence,
                    reason: dupGroup.reason
                  });
                }
              }
            });
          }
        } catch (error) {
          console.error("Error analyzing group:", error);
        }
      }

      setProgress(95);
      setProgressText("A finalizar análise...");

      // Remove overlapping groups (keep the one with highest confidence)
      const uniqueGroups = [];
      const usedIds = new Set();

      confirmedDuplicates
        .sort((a, b) => b.confidence - a.confidence)
        .forEach(group => {
          const newIds = group.properties.filter(p => !usedIds.has(p.id));
          if (newIds.length > 1) {
            uniqueGroups.push({
              ...group,
              properties: newIds
            });
            newIds.forEach(p => usedIds.add(p.id));
          }
        });

      setDuplicateGroups(uniqueGroups);
      setLastAnalysis(new Date());
      setProgress(100);

      if (uniqueGroups.length > 0) {
        const totalDuplicates = uniqueGroups.reduce((sum, g) => sum + g.properties.length - 1, 0);
        toast.warning(`Encontrados ${uniqueGroups.length} grupos com ${totalDuplicates} duplicados!`);
      } else {
        toast.success("Nenhum duplicado encontrado!");
      }

    } catch (error) {
      console.error("Error analyzing duplicates:", error);
      toast.error("Erro ao analisar duplicados");
    }

    setAnalyzing(false);
  };

  const toggleGroup = (index) => {
    setExpandedGroups(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const toggleSelection = (propertyId) => {
    setSelectedForDeletion(prev => 
      prev.includes(propertyId)
        ? prev.filter(id => id !== propertyId)
        : [...prev, propertyId]
    );
  };

  const selectAllExceptFirst = (group) => {
    const idsToSelect = group.properties.slice(1).map(p => p.id);
    setSelectedForDeletion(prev => {
      const newSelection = [...prev];
      idsToSelect.forEach(id => {
        if (!newSelection.includes(id)) {
          newSelection.push(id);
        }
      });
      return newSelection;
    });
  };

  const deleteSelected = async () => {
    if (selectedForDeletion.length === 0) {
      toast.error("Nenhum imóvel selecionado");
      return;
    }

    if (!window.confirm(`Tem certeza que deseja eliminar ${selectedForDeletion.length} imóvel(is)?`)) {
      return;
    }

    try {
      for (const id of selectedForDeletion) {
        await base44.entities.Property.delete(id);
      }
      toast.success(`${selectedForDeletion.length} imóveis eliminados!`);
      setSelectedForDeletion([]);
      refetch();
      analyzeDuplicates();
    } catch (error) {
      toast.error("Erro ao eliminar imóveis");
    }
  };

  const propertyTypeLabels = {
    apartment: "Apartamento",
    house: "Moradia",
    land: "Terreno",
    building: "Prédio",
    farm: "Quinta",
    store: "Loja",
    warehouse: "Armazém",
    office: "Escritório"
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 90) return "bg-red-100 text-red-800 border-red-200";
    if (confidence >= 80) return "bg-orange-100 text-orange-800 border-orange-200";
    return "bg-yellow-100 text-yellow-800 border-yellow-200";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Sparkles className="w-5 h-5 text-purple-600" />
            </div>
            Verificador de Duplicados com IA
          </CardTitle>
          <p className="text-sm text-slate-600">
            Analisa automaticamente a base de dados para encontrar imóveis duplicados usando inteligência artificial.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-slate-900">{properties.length}</div>
                <div className="text-xs text-slate-600">Total de Imóveis</div>
              </div>
              {lastAnalysis && (
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">{duplicateGroups.length}</div>
                  <div className="text-xs text-slate-600">Grupos Duplicados</div>
                </div>
              )}
            </div>
            
            <Button
              onClick={analyzeDuplicates}
              disabled={analyzing || properties.length === 0}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {analyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  A analisar...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Analisar Duplicados
                </>
              )}
            </Button>
          </div>

          {analyzing && (
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">{progressText}</span>
                <span className="font-medium">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {lastAnalysis && (
            <p className="text-xs text-slate-500 mt-4">
              Última análise: {lastAnalysis.toLocaleString('pt-PT')}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Action Bar */}
      {selectedForDeletion.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <span className="font-medium text-red-900">
                  {selectedForDeletion.length} imóvel(is) selecionado(s) para eliminação
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedForDeletion([])}
                >
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={deleteSelected}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Eliminar Selecionados
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {duplicateGroups.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">
              Grupos de Duplicados Encontrados
            </h3>
            <Badge variant="outline" className="text-purple-600 border-purple-200">
              {duplicateGroups.reduce((sum, g) => sum + g.properties.length - 1, 0)} duplicados
            </Badge>
          </div>

          {duplicateGroups.map((group, index) => (
            <Card key={index} className="overflow-hidden">
              <div 
                className="p-4 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => toggleGroup(index)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg shadow-sm">
                      <Copy className="w-4 h-4 text-slate-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900">
                        Grupo #{index + 1} - {group.properties.length} imóveis
                      </h4>
                      <p className="text-sm text-slate-600">{group.reason}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={getConfidenceColor(group.confidence)}>
                      {group.confidence}% confiança
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); selectAllExceptFirst(group); }}
                    >
                      <Merge className="w-4 h-4 mr-1" />
                      Manter 1º
                    </Button>
                    {expandedGroups[index] ? (
                      <ChevronUp className="w-5 h-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                </div>
              </div>

              {expandedGroups[index] && (
                <CardContent className="p-4 border-t">
                  <div className="space-y-3">
                    {group.properties.map((property, pIndex) => (
                      <div 
                        key={property.id}
                        className={`flex items-start gap-4 p-3 rounded-lg border transition-colors ${
                          selectedForDeletion.includes(property.id)
                            ? 'bg-red-50 border-red-200'
                            : pIndex === 0
                            ? 'bg-green-50 border-green-200'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <Checkbox
                          checked={selectedForDeletion.includes(property.id)}
                          onCheckedChange={() => toggleSelection(property.id)}
                          className="mt-1"
                        />
                        
                        {/* Image */}
                        <div className="w-20 h-20 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                          {property.images?.[0] ? (
                            <img 
                              src={property.images[0]} 
                              alt={property.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Building2 className="w-8 h-8 text-slate-300" />
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                {pIndex === 0 && (
                                  <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">
                                    Original
                                  </Badge>
                                )}
                                {property.ref_id && (
                                  <Badge variant="outline" className="text-xs">
                                    {property.ref_id}
                                  </Badge>
                                )}
                              </div>
                              <h5 className="font-medium text-slate-900 line-clamp-1 mt-1">
                                {property.title}
                              </h5>
                            </div>
                            <Link
                              to={`${createPageUrl("PropertyDetails")}?id=${property.id}`}
                              target="_blank"
                              className="p-1.5 hover:bg-slate-100 rounded"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink className="w-4 h-4 text-slate-400" />
                            </Link>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-slate-600">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5" />
                              {property.city}
                            </span>
                            <span className="flex items-center gap-1">
                              <Euro className="w-3.5 h-3.5" />
                              {property.price?.toLocaleString()}
                            </span>
                            {property.bedrooms > 0 && (
                              <span className="flex items-center gap-1">
                                <Bed className="w-3.5 h-3.5" />
                                T{property.bedrooms}
                              </span>
                            )}
                            <Badge variant="outline" className="text-xs">
                              {propertyTypeLabels[property.property_type] || property.property_type}
                            </Badge>
                          </div>

                          {property.external_id && (
                            <p className="text-xs text-slate-500 mt-1">
                              ID Externo: {property.external_id}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      ) : lastAnalysis && !analyzing ? (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-green-900 mb-2">
              Sem Duplicados Encontrados
            </h3>
            <p className="text-green-700">
              A sua base de dados está limpa! Não foram encontrados imóveis duplicados.
            </p>
          </CardContent>
        </Card>
      ) : !analyzing && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Search className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-700 mb-2">
              Pronto para Analisar
            </h3>
            <p className="text-slate-500 mb-4">
              Clique no botão acima para iniciar a análise de duplicados com IA.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Tips */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <h4 className="font-medium text-blue-900 mb-2">💡 Dicas</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• A IA analisa títulos, endereços, preços e características para identificar duplicados</li>
            <li>• O primeiro imóvel de cada grupo é marcado como "Original" - geralmente o mais antigo</li>
            <li>• Use "Manter 1º" para selecionar rapidamente todos os duplicados exceto o original</li>
            <li>• Revise sempre os resultados antes de eliminar - a IA pode errar em casos complexos</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}