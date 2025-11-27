import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Home, Sparkles, Loader2, Euro, Bed, Bath, Maximize, 
  MapPin, Check, X, Eye, Plus, ChevronDown, ChevronUp 
} from "lucide-react";
import { toast } from "sonner";
import MatchCriteriaDisplay, { evaluateCriteria, MatchScoreBadge } from "../matching/MatchCriteriaDisplay";

export default function LeadPropertyMatching({ lead, onAssociateProperty }) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [isMatching, setIsMatching] = React.useState(false);
  const [matches, setMatches] = React.useState([]);
  const [expandedMatch, setExpandedMatch] = React.useState(null);

  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list('-created_date'),
  });

  const activeProperties = properties.filter(p => p.status === 'active');

  // Build requirements from lead data
  const getRequirementsFromLead = () => {
    return {
      budget_min: lead.budget ? lead.budget * 0.7 : null,
      budget_max: lead.budget || null,
      locations: lead.location ? [lead.location] : [],
      property_types: lead.property_type_interest ? [lead.property_type_interest.toLowerCase()] : [],
      listing_type: lead.lead_type === 'comprador' ? 'sale' : null,
      bedrooms_min: null,
      area_min: null
    };
  };

  const runMatching = async () => {
    setIsMatching(true);
    setIsExpanded(true);

    try {
      const requirements = getRequirementsFromLead();
      
      // Calculate scores with detailed criteria for all properties
      const scoredProperties = activeProperties.map(property => {
        const evaluation = evaluateCriteria(requirements, property);
        return {
          ...property,
          score: evaluation.score,
          criteria: evaluation.criteria,
          matchedCount: evaluation.matchedCount,
          totalCriteria: evaluation.totalCriteria,
          matchRatio: evaluation.matchRatio
        };
      });

      // Sort by score (descending), then by matched criteria count
      const sortedMatches = scoredProperties
        .filter(p => p.score >= 20) // Include partial matches
        .sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          return b.matchedCount - a.matchedCount;
        })
        .slice(0, 10);

      // If we have enough data, use AI to refine top matches
      if (lead.message || lead.property_type_interest || lead.location) {
        try {
          const topForAI = sortedMatches.slice(0, 5);
          const leadContext = `
            Nome: ${lead.buyer_name}
            Tipo: ${lead.lead_type}
            Localização: ${lead.location || 'Não especificada'}
            Orçamento: ${lead.budget ? `€${lead.budget.toLocaleString()}` : 'Não especificado'}
            Tipo de imóvel: ${lead.property_type_interest || 'Não especificado'}
            Mensagem: ${lead.message || 'Sem mensagem'}
          `;

          const propertiesContext = topForAI.map(p => `
            ID: ${p.id}
            Título: ${p.title}
            Preço: €${p.price?.toLocaleString()}
            Tipo: ${p.property_type}
            Localização: ${p.city}, ${p.state}
            Quartos: ${p.bedrooms || 'N/A'}
            Área: ${p.useful_area || p.square_feet || 'N/A'} m²
            Score: ${p.score}% (${p.matchRatio} critérios)
          `).join('\n---\n');

          const aiResult = await base44.integrations.Core.InvokeLLM({
            prompt: `Analisa a compatibilidade entre este lead e os imóveis. Dá uma razão curta para cada match.

LEAD:
${leadContext}

IMÓVEIS:
${propertiesContext}`,
            response_json_schema: {
              type: "object",
              properties: {
                matches: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      property_id: { type: "string" },
                      reason: { type: "string" }
                    }
                  }
                }
              }
            }
          });

          // Merge AI reasons
          sortedMatches.forEach(property => {
            const aiMatch = aiResult.matches?.find(m => m.property_id === property.id);
            if (aiMatch) {
              property.reason = aiMatch.reason;
            }
          });
        } catch {
          // AI failed, continue without reasons
        }
      }

      setMatches(sortedMatches);
      toast.success(`Encontrados ${sortedMatches.length} imóveis compatíveis`);
    } catch (error) {
      toast.error("Erro ao procurar imóveis");
    }

    setIsMatching(false);
  };

  const handleAssociate = (property) => {
    if (onAssociateProperty) {
      onAssociateProperty(property.id);
      toast.success(`Imóvel "${property.title}" associado ao lead`);
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

  return (
    <Card className="border-purple-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Home className="w-4 h-4 text-purple-600" />
            Property Matching
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={runMatching}
              disabled={isMatching}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isMatching ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  A procurar...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-1" />
                  Encontrar Imóveis
                </>
              )}
            </Button>
            {matches.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-3">
          {/* Lead criteria summary */}
          <div className="flex flex-wrap gap-2 text-xs">
            {lead.location && (
              <Badge variant="outline" className="bg-purple-50">
                <MapPin className="w-3 h-3 mr-1" />
                {lead.location}
              </Badge>
            )}
            {lead.budget > 0 && (
              <Badge variant="outline" className="bg-green-50">
                <Euro className="w-3 h-3 mr-1" />
                até €{lead.budget.toLocaleString()}
              </Badge>
            )}
            {lead.property_type_interest && (
              <Badge variant="outline" className="bg-blue-50">
                <Home className="w-3 h-3 mr-1" />
                {lead.property_type_interest}
              </Badge>
            )}
          </div>

          {matches.length === 0 && !isMatching && (
            <p className="text-sm text-slate-500 text-center py-4">
              Clique em "Encontrar Imóveis" para procurar matches
            </p>
          )}

          {matches.map((property, idx) => (
            <div 
              key={property.id}
              className="border rounded-lg p-3 hover:shadow-md transition-shadow bg-white"
            >
              <div className="flex gap-3">
                {/* Image */}
                <div className="w-20 h-16 rounded overflow-hidden flex-shrink-0 bg-slate-100">
                  {property.images?.[0] ? (
                    <img 
                      src={property.images[0]} 
                      alt={property.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Home className="w-6 h-6 text-slate-300" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-medium text-sm text-slate-900 truncate">
                        {property.title}
                      </h4>
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <MapPin className="w-3 h-3" />
                        {property.city}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <Badge 
                        className={`text-xs ${
                          property.score >= 70 ? 'bg-green-100 text-green-800' :
                          property.score >= 40 ? 'bg-amber-100 text-amber-800' :
                          'bg-slate-100 text-slate-800'
                        }`}
                      >
                        {property.score}%
                      </Badge>
                      {property.matchRatio && (
                        <Badge variant="outline" className="text-[10px]">
                          {property.matchRatio}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-600">
                    <span className="font-semibold text-slate-900">
                      €{property.price?.toLocaleString()}
                    </span>
                    {property.bedrooms > 0 && (
                      <span className="flex items-center gap-0.5">
                        <Bed className="w-3 h-3" />
                        T{property.bedrooms}
                      </span>
                    )}
                    {(property.useful_area || property.square_feet) > 0 && (
                      <span className="flex items-center gap-0.5">
                        <Maximize className="w-3 h-3" />
                        {property.useful_area || property.square_feet}m²
                      </span>
                    )}
                    <Badge variant="outline" className="text-[10px]">
                      {propertyTypeLabels[property.property_type] || property.property_type}
                    </Badge>
                  </div>

                  {/* Criteria indicators */}
                  {property.criteria?.length > 0 && (
                    <div className="mt-1.5">
                      <MatchCriteriaDisplay criteria={property.criteria} compact={true} />
                    </div>
                  )}

                  {property.reason && (
                    <p className="text-xs text-purple-600 mt-1 line-clamp-1">
                      💡 {property.reason}
                    </p>
                  )}
                </div>
              </div>

              {/* Expandable criteria details */}
              <Collapsible open={expandedMatch === property.id} onOpenChange={() => setExpandedMatch(expandedMatch === property.id ? null : property.id)}>
                <div className="flex items-center gap-2 mt-2 pt-2 border-t">
                  <Progress value={property.score} className="flex-1 h-1.5" />
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 text-xs">
                      {expandedMatch === property.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </Button>
                  </CollapsibleTrigger>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => window.open(`/PropertyDetails?id=${property.id}`, '_blank')}
                    className="h-7 text-xs"
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    Ver
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={() => handleAssociate(property)}
                    className="h-7 text-xs bg-purple-600 hover:bg-purple-700"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Associar
                  </Button>
                </div>
                <CollapsibleContent>
                  {property.criteria?.length > 0 && (
                    <div className="mt-2 p-2 bg-slate-50 rounded-lg">
                      <MatchCriteriaDisplay criteria={property.criteria} compact={false} />
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>
            </div>
          ))}

          {matches.length > 0 && (
            <p className="text-xs text-center text-slate-500">
              {matches.length} imóveis compatíveis de {activeProperties.length} disponíveis
            </p>
          )}
        </CardContent>
      )}
    </Card>
  );
}