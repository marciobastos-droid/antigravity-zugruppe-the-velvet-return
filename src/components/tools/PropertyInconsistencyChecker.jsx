import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertTriangle, Loader2, CheckCircle2, Brain, Building2,
  MapPin, Euro, Bed, Bath, Maximize, Search, RefreshCw,
  ChevronDown, ChevronUp, Sparkles, XCircle, AlertCircle,
  Info, Zap, FileWarning
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function PropertyInconsistencyChecker() {
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState("");
  const [results, setResults] = useState([]);
  const [expandedResults, setExpandedResults] = useState({});
  const [selectedProperties, setSelectedProperties] = useState([]);
  const [lastAnalysis, setLastAnalysis] = useState(null);

  const { data: properties = [], isLoading, refetch } = useQuery({
    queryKey: ['properties-inconsistency'],
    queryFn: () => base44.entities.Property.list('-created_date')
  });

  const activeProperties = properties.filter(p => p.status === 'active');

  const analyzeInconsistencies = async () => {
    setAnalyzing(true);
    setProgress(0);
    setProgressText("A preparar análise de inconsistências...");
    setResults([]);

    try {
      const propertiesToAnalyze = selectedProperties.length > 0
        ? activeProperties.filter(p => selectedProperties.includes(p.id))
        : activeProperties;

      if (propertiesToAnalyze.length === 0) {
        toast.error("Nenhum imóvel para analisar");
        setAnalyzing(false);
        return;
      }

      const batchSize = 5;
      const allResults = [];

      for (let i = 0; i < propertiesToAnalyze.length; i += batchSize) {
        const batch = propertiesToAnalyze.slice(i, i + batchSize);
        setProgress(Math.round((i / propertiesToAnalyze.length) * 90));
        setProgressText(`A analisar imóveis ${i + 1} a ${Math.min(i + batchSize, propertiesToAnalyze.length)} de ${propertiesToAnalyze.length}...`);

        const batchPromises = batch.map(async (property) => {
          const propertyData = {
            id: property.id,
            ref_id: property.ref_id,
            title: property.title,
            description: property.description,
            property_type: property.property_type,
            listing_type: property.listing_type,
            price: property.price,
            bedrooms: property.bedrooms,
            bathrooms: property.bathrooms,
            useful_area: property.useful_area,
            gross_area: property.gross_area,
            square_feet: property.square_feet,
            city: property.city,
            state: property.state,
            address: property.address,
            year_built: property.year_built,
            energy_certificate: property.energy_certificate,
            amenities: property.amenities
          };

          try {
            const result = await base44.integrations.Core.InvokeLLM({
              prompt: `Analisa este imóvel e identifica TODAS as inconsistências, erros ou informações suspeitas.

DADOS DO IMÓVEL:
${JSON.stringify(propertyData, null, 2)}

VERIFICA:
1. PREÇO vs CARACTERÍSTICAS: O preço faz sentido para o tipo, área e localização?
2. ÁREA vs QUARTOS: A área é suficiente para o número de quartos indicado?
3. DESCRIÇÃO vs DADOS: A descrição menciona características que contradizem os dados estruturados?
4. DADOS EM FALTA: Campos importantes que estão vazios ou com valor 0?
5. VALORES IRREAIS: Preços, áreas ou outros valores que parecem errados (ex: área de 5m², preço de €1)?
6. TIPOLOGIA: O número de quartos faz sentido para o tipo de imóvel?
7. CERTIFICADO ENERGÉTICO: Se presente, faz sentido para o ano de construção?
8. LOCALIZAÇÃO: Endereço, cidade e distrito são coerentes?
9. DESCRIÇÃO: Erros ortográficos graves, texto incompleto ou copiado de outro imóvel?
10. AMENITIES: As comodidades fazem sentido para o tipo de imóvel?

Sê rigoroso na análise. Reporta APENAS problemas reais, não suposições.`,
              response_json_schema: {
                type: "object",
                properties: {
                  has_issues: { type: "boolean" },
                  severity: { 
                    type: "string", 
                    enum: ["none", "low", "medium", "high", "critical"]
                  },
                  issues: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        category: { type: "string" },
                        description: { type: "string" },
                        severity: { type: "string" },
                        suggestion: { type: "string" }
                      }
                    }
                  },
                  missing_data: {
                    type: "array",
                    items: { type: "string" }
                  },
                  overall_quality_score: { type: "number" },
                  summary: { type: "string" }
                }
              }
            });

            return {
              property,
              ...result,
              analyzed: true
            };
          } catch (error) {
            console.error("Error analyzing property:", property.id, error);
            return {
              property,
              has_issues: false,
              severity: "none",
              issues: [],
              missing_data: [],
              overall_quality_score: 0,
              summary: "Erro na análise",
              analyzed: false,
              error: true
            };
          }
        });

        const batchResults = await Promise.all(batchPromises);
        allResults.push(...batchResults);
      }

      setProgress(95);
      setProgressText("A finalizar análise...");

      // Sort by severity and number of issues
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, none: 4 };
      allResults.sort((a, b) => {
        const sevDiff = severityOrder[a.severity] - severityOrder[b.severity];
        if (sevDiff !== 0) return sevDiff;
        return (b.issues?.length || 0) - (a.issues?.length || 0);
      });

      setResults(allResults);
      setLastAnalysis(new Date());
      setProgress(100);

      const issueCount = allResults.filter(r => r.has_issues).length;
      const criticalCount = allResults.filter(r => r.severity === 'critical' || r.severity === 'high').length;

      if (criticalCount > 0) {
        toast.warning(`Encontrados ${criticalCount} imóveis com problemas graves!`);
      } else if (issueCount > 0) {
        toast.info(`Encontrados ${issueCount} imóveis com inconsistências`);
      } else {
        toast.success("Nenhuma inconsistência encontrada!");
      }

    } catch (error) {
      console.error("Error in analysis:", error);
      toast.error("Erro na análise de inconsistências");
    }

    setAnalyzing(false);
  };

  const toggleExpand = (index) => {
    setExpandedResults(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const togglePropertySelection = (propertyId) => {
    setSelectedProperties(prev =>
      prev.includes(propertyId)
        ? prev.filter(id => id !== propertyId)
        : [...prev, propertyId]
    );
  };

  const selectAllProperties = () => {
    if (selectedProperties.length === activeProperties.length) {
      setSelectedProperties([]);
    } else {
      setSelectedProperties(activeProperties.map(p => p.id));
    }
  };

  const getSeverityConfig = (severity) => {
    switch (severity) {
      case 'critical':
        return { color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle, label: 'Crítico' };
      case 'high':
        return { color: 'bg-orange-100 text-orange-800 border-orange-200', icon: AlertTriangle, label: 'Alto' };
      case 'medium':
        return { color: 'bg-amber-100 text-amber-800 border-amber-200', icon: AlertCircle, label: 'Médio' };
      case 'low':
        return { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Info, label: 'Baixo' };
      default:
        return { color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle2, label: 'OK' };
    }
  };

  const getQualityColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-amber-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  const issuesCount = results.filter(r => r.has_issues).length;
  const criticalCount = results.filter(r => r.severity === 'critical' || r.severity === 'high').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 border-amber-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Verificador de Inconsistências com IA</h2>
              <p className="text-sm text-slate-600 font-normal">
                Analisa automaticamente os dados dos imóveis para identificar erros e informações incongruentes
              </p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/80 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-slate-900">{activeProperties.length}</div>
              <div className="text-sm text-slate-600">Imóveis Ativos</div>
            </div>
            <div className="bg-white/80 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-amber-600">{selectedProperties.length || 'Todos'}</div>
              <div className="text-sm text-slate-600">A Analisar</div>
            </div>
            {lastAnalysis && (
              <>
                <div className="bg-white/80 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-orange-600">{issuesCount}</div>
                  <div className="text-sm text-slate-600">Com Problemas</div>
                </div>
                <div className="bg-white/80 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-red-600">{criticalCount}</div>
                  <div className="text-sm text-slate-600">Críticos</div>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={selectedProperties.length === activeProperties.length && activeProperties.length > 0}
                onCheckedChange={selectAllProperties}
              />
              <span className="text-sm text-slate-600">
                {selectedProperties.length > 0
                  ? `${selectedProperties.length} imóveis selecionados`
                  : 'Selecionar todos para análise personalizada'}
              </span>
            </div>

            <div className="flex gap-2">
              {selectedProperties.length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => setSelectedProperties([])}
                >
                  Limpar Seleção
                </Button>
              )}
              <Button
                onClick={analyzeInconsistencies}
                disabled={analyzing}
                className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700"
              >
                {analyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    A analisar...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Analisar com IA
                  </>
                )}
              </Button>
            </div>
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

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">
              Resultados da Análise
            </h3>
            <div className="flex gap-2">
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                {results.filter(r => r.severity === 'critical' || r.severity === 'high').length} críticos
              </Badge>
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                {results.filter(r => r.severity === 'medium').length} médios
              </Badge>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                {results.filter(r => !r.has_issues).length} OK
              </Badge>
            </div>
          </div>

          <ScrollArea className="h-[600px]">
            <div className="space-y-3 pr-4">
              {results.map((result, index) => {
                const config = getSeverityConfig(result.severity);
                const IconComponent = config.icon;

                return (
                  <Card key={result.property.id} className={`overflow-hidden ${result.has_issues ? 'border-l-4' : ''}`}
                    style={{ borderLeftColor: result.severity === 'critical' ? '#dc2626' : 
                             result.severity === 'high' ? '#ea580c' : 
                             result.severity === 'medium' ? '#d97706' : 
                             result.severity === 'low' ? '#2563eb' : undefined }}>
                    <div
                      className="p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                      onClick={() => toggleExpand(index)}
                    >
                      <div className="flex items-start gap-4">
                        {/* Image */}
                        <div className="w-20 h-16 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                          {result.property.images?.[0] ? (
                            <img
                              src={result.property.images[0]}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Building2 className="w-6 h-6 text-slate-300" />
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                {result.property.ref_id && (
                                  <Badge variant="outline" className="text-xs font-mono">
                                    {result.property.ref_id}
                                  </Badge>
                                )}
                                <Badge className={config.color}>
                                  <IconComponent className="w-3 h-3 mr-1" />
                                  {config.label}
                                </Badge>
                              </div>
                              <h4 className="font-medium text-slate-900 line-clamp-1">
                                {result.property.title}
                              </h4>
                            </div>

                            <div className="flex items-center gap-2">
                              {result.overall_quality_score > 0 && (
                                <div className="text-center">
                                  <div className={`text-lg font-bold ${getQualityColor(result.overall_quality_score)}`}>
                                    {result.overall_quality_score}%
                                  </div>
                                  <div className="text-xs text-slate-500">Qualidade</div>
                                </div>
                              )}
                              {expandedResults[index] ? (
                                <ChevronUp className="w-5 h-5 text-slate-400" />
                              ) : (
                                <ChevronDown className="w-5 h-5 text-slate-400" />
                              )}
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-slate-600">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5" />
                              {result.property.city}
                            </span>
                            <span className="flex items-center gap-1">
                              <Euro className="w-3.5 h-3.5" />
                              {result.property.price?.toLocaleString() || 'N/A'}
                            </span>
                            {result.property.bedrooms > 0 && (
                              <span className="flex items-center gap-1">
                                <Bed className="w-3.5 h-3.5" />
                                T{result.property.bedrooms}
                              </span>
                            )}
                            <Badge variant="outline" className="text-xs">
                              {propertyTypeLabels[result.property.property_type] || result.property.property_type}
                            </Badge>
                          </div>

                          {result.summary && (
                            <p className="text-sm text-slate-600 mt-2 line-clamp-1">
                              {result.summary}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {expandedResults[index] && (
                      <div className="px-4 pb-4 border-t bg-slate-50">
                        <div className="pt-4 space-y-4">
                          {/* Issues */}
                          {result.issues?.length > 0 && (
                            <div>
                              <h5 className="font-medium text-slate-900 mb-2 flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-amber-500" />
                                Problemas Identificados ({result.issues.length})
                              </h5>
                              <div className="space-y-2">
                                {result.issues.map((issue, iIdx) => (
                                  <div key={iIdx} className="p-3 bg-white rounded-lg border">
                                    <div className="flex items-start justify-between gap-2">
                                      <div>
                                        <Badge variant="outline" className="text-xs mb-1">
                                          {issue.category}
                                        </Badge>
                                        <p className="text-sm text-slate-800">{issue.description}</p>
                                        {issue.suggestion && (
                                          <p className="text-xs text-green-700 mt-1">
                                            💡 Sugestão: {issue.suggestion}
                                          </p>
                                        )}
                                      </div>
                                      <Badge className={getSeverityConfig(issue.severity).color}>
                                        {getSeverityConfig(issue.severity).label}
                                      </Badge>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Missing Data */}
                          {result.missing_data?.length > 0 && (
                            <div>
                              <h5 className="font-medium text-slate-900 mb-2 flex items-center gap-2">
                                <FileWarning className="w-4 h-4 text-blue-500" />
                                Dados em Falta
                              </h5>
                              <div className="flex flex-wrap gap-2">
                                {result.missing_data.map((field, fIdx) => (
                                  <Badge key={fIdx} variant="secondary" className="text-xs">
                                    {field}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex gap-2 pt-2">
                            <Link
                              to={`${createPageUrl("PropertyDetails")}?id=${result.property.id}`}
                              target="_blank"
                            >
                              <Button variant="outline" size="sm">
                                Ver Imóvel
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Empty State */}
      {!analyzing && results.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Brain className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-700 mb-2">
              Pronto para Analisar
            </h3>
            <p className="text-slate-500 mb-4">
              A IA irá verificar preços, áreas, descrições e outros dados para identificar inconsistências.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Tips */}
      <Card className="bg-amber-50 border-amber-200">
        <CardContent className="p-4">
          <h4 className="font-medium text-amber-900 mb-2">💡 O que a IA verifica</h4>
          <ul className="text-sm text-amber-800 space-y-1 grid md:grid-cols-2 gap-1">
            <li>• Preço vs características do imóvel</li>
            <li>• Área vs número de quartos</li>
            <li>• Descrição vs dados estruturados</li>
            <li>• Campos importantes em falta</li>
            <li>• Valores irreais (preços, áreas)</li>
            <li>• Coerência da localização</li>
            <li>• Tipologia vs tipo de imóvel</li>
            <li>• Qualidade geral do anúncio</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}