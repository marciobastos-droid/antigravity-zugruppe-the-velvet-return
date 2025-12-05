import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Home, Sparkles, Loader2, Euro, Bed, Bath, Maximize, 
  MapPin, Check, X, Eye, Plus, ChevronDown, ChevronUp,
  Send, Mail, MessageSquare, Save, Trash2
} from "lucide-react";
import { toast } from "sonner";
import { createPageUrl } from "@/utils";

export default function LeadPropertyMatching({ lead, onAssociateProperty, onUpdate }) {
  const queryClient = useQueryClient();
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [isMatching, setIsMatching] = React.useState(false);
  const [matches, setMatches] = React.useState([]);

  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list('-created_date'),
  });

  // Buscar contacto ligado para obter requisitos
  const { data: linkedContact } = useQuery({
    queryKey: ['linkedContactForMatching', lead.id, lead.contact_id, lead.buyer_email],
    queryFn: async () => {
      if (lead.contact_id) {
        const contacts = await base44.entities.ClientContact.filter({ id: lead.contact_id });
        if (contacts[0]) return contacts[0];
      }
      // Procurar pelo email
      if (lead.buyer_email) {
        const allContacts = await base44.entities.ClientContact.list();
        return allContacts.find(c => c.email === lead.buyer_email) || null;
      }
      return null;
    },
    enabled: !!lead
  });

  const requirements = linkedContact?.property_requirements || {};

  const activeProperties = properties.filter(p => p.status === 'active');

  // Verificar se imóvel cumpre requisitos obrigatórios (hard filters)
  const meetsHardRequirements = (property) => {
    const req = requirements;
    
    // Verificar tipo de negócio
    if (req.listing_type && req.listing_type !== 'both') {
      if (property.listing_type !== req.listing_type) return false;
    }
    
    // Verificar orçamento máximo (exclusivo)
    if (req.budget_max && req.budget_max > 0) {
      if (property.price > req.budget_max * 1.1) return false; // 10% tolerância
    }
    
    // Verificar orçamento mínimo
    if (req.budget_min && req.budget_min > 0) {
      if (property.price < req.budget_min * 0.8) return false; // 20% tolerância
    }
    
    // Verificar localizações (se definidas)
    if (req.locations && req.locations.length > 0) {
      const propertyLocation = `${property.city || ''} ${property.state || ''} ${property.address || ''}`.toLowerCase();
      const matchesLocation = req.locations.some(loc => 
        propertyLocation.includes(loc.toLowerCase())
      );
      if (!matchesLocation) return false;
    }
    
    // Verificar tipos de imóvel (se definidos)
    if (req.property_types && req.property_types.length > 0) {
      if (!req.property_types.includes(property.property_type)) return false;
    }
    
    // Verificar quartos mínimos
    if (req.bedrooms_min && req.bedrooms_min > 0) {
      if (!property.bedrooms || property.bedrooms < req.bedrooms_min) return false;
    }
    
    // Verificar quartos máximos
    if (req.bedrooms_max && req.bedrooms_max > 0) {
      if (property.bedrooms && property.bedrooms > req.bedrooms_max) return false;
    }
    
    // Verificar área mínima
    if (req.area_min && req.area_min > 0) {
      const area = property.useful_area || property.square_feet || 0;
      if (area < req.area_min * 0.9) return false; // 10% tolerância
    }
    
    // Verificar casas de banho mínimas
    if (req.bathrooms_min && req.bathrooms_min > 0) {
      if (!property.bathrooms || property.bathrooms < req.bathrooms_min) return false;
    }
    
    return true;
  };

  const calculateBasicScore = (property) => {
    let score = 0;
    let maxScore = 0;
    const req = requirements;

    // Se temos requisitos do contacto, usar esses
    if (Object.keys(req).length > 0) {
      // Location matching (30 points)
      if (req.locations && req.locations.length > 0) {
        maxScore += 30;
        const propertyLocation = `${property.city || ''} ${property.state || ''}`.toLowerCase();
        if (req.locations.some(loc => propertyLocation.includes(loc.toLowerCase()))) {
          score += 30;
        }
      }

      // Budget matching (40 points)
      const budgetMax = req.budget_max || lead.budget;
      const budgetMin = req.budget_min || 0;
      if (budgetMax && budgetMax > 0) {
        maxScore += 40;
        const price = property.price || 0;
        
        if (price >= budgetMin && price <= budgetMax) {
          score += 40;
        } else if (price <= budgetMax * 1.1 && price >= budgetMin * 0.9) {
          score += 30;
        } else if (price <= budgetMax * 1.2) {
          score += 15;
        }
      }

      // Property type matching (15 points)
      if (req.property_types && req.property_types.length > 0) {
        maxScore += 15;
        if (req.property_types.includes(property.property_type)) {
          score += 15;
        }
      }

      // Bedrooms matching (10 points)
      if (req.bedrooms_min || req.bedrooms_max) {
        maxScore += 10;
        const beds = property.bedrooms || 0;
        const matchesMin = !req.bedrooms_min || beds >= req.bedrooms_min;
        const matchesMax = !req.bedrooms_max || beds <= req.bedrooms_max;
        if (matchesMin && matchesMax) {
          score += 10;
        } else if (matchesMin || matchesMax) {
          score += 5;
        }
      }

      // Area matching (5 points)
      if (req.area_min || req.area_max) {
        maxScore += 5;
        const area = property.useful_area || property.square_feet || 0;
        const matchesMin = !req.area_min || area >= req.area_min;
        const matchesMax = !req.area_max || area <= req.area_max;
        if (matchesMin && matchesMax) {
          score += 5;
        }
      }
    } else {
      // Fallback para dados do lead se não houver requisitos
      // Location matching (30 points)
      if (lead.location) {
        maxScore += 30;
        if (property.city?.toLowerCase().includes(lead.location.toLowerCase()) ||
            property.state?.toLowerCase().includes(lead.location.toLowerCase()) ||
            property.address?.toLowerCase().includes(lead.location.toLowerCase())) {
          score += 30;
        }
      }

      // Budget matching (40 points)
      if (lead.budget && lead.budget > 0) {
        maxScore += 40;
        const budget = lead.budget;
        const price = property.price || 0;
        
        if (price <= budget * 1.1 && price >= budget * 0.7) {
          score += 40;
        } else if (price <= budget * 1.2 && price >= budget * 0.5) {
          score += 25;
        } else if (price <= budget * 1.5) {
          score += 10;
        }
      }

      // Property type matching (20 points)
      if (lead.property_type_interest) {
        maxScore += 20;
        const interest = lead.property_type_interest.toLowerCase();
        const propType = property.property_type?.toLowerCase() || '';
        
        if (interest.includes(propType) || propType.includes(interest) ||
            (interest.includes('apartamento') && propType === 'apartment') ||
            (interest.includes('moradia') && propType === 'house') ||
            (interest.includes('t1') && property.bedrooms === 1) ||
            (interest.includes('t2') && property.bedrooms === 2) ||
            (interest.includes('t3') && property.bedrooms === 3) ||
            (interest.includes('t4') && property.bedrooms >= 4)) {
          score += 20;
        }
      }

      // Listing type (10 points)
      maxScore += 10;
      if (lead.lead_type === 'comprador' && property.listing_type === 'sale') {
        score += 10;
      } else if (lead.lead_type === 'vendedor' && property.listing_type === 'rent') {
        score += 5;
      }
    }

    return maxScore > 0 ? Math.round((score / maxScore) * 100) : 50;
  };

  const runMatching = async () => {
    setIsMatching(true);
    setIsExpanded(true);

    try {
      // Primeiro filtrar imóveis que cumprem requisitos obrigatórios
      const hasRequirements = Object.keys(requirements).length > 0;
      const eligibleProperties = hasRequirements 
        ? activeProperties.filter(meetsHardRequirements)
        : activeProperties;

      // Calculate basic scores for eligible properties
      const scoredProperties = eligibleProperties.map(property => ({
        ...property,
        score: calculateBasicScore(property)
      }));

      // Sort by score and get top matches
      const topMatches = scoredProperties
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

      // If we have enough data, use AI to refine
      if (lead.message || lead.property_type_interest || lead.location) {
        try {
          const leadContext = `
            Nome: ${lead.buyer_name}
            Tipo: ${lead.lead_type}
            Localização: ${lead.location || 'Não especificada'}
            Orçamento: ${lead.budget ? `€${lead.budget.toLocaleString()}` : 'Não especificado'}
            Tipo de imóvel: ${lead.property_type_interest || 'Não especificado'}
            Mensagem: ${lead.message || 'Sem mensagem'}
          `;

          const propertiesContext = topMatches.map(p => `
            ID: ${p.id}
            Título: ${p.title}
            Preço: €${p.price?.toLocaleString()}
            Tipo: ${p.property_type}
            Localização: ${p.city}, ${p.state}
            Quartos: ${p.bedrooms || 'N/A'}
            Área: ${p.useful_area || p.square_feet || 'N/A'} m²
            Score básico: ${p.score}%
          `).join('\n---\n');

          const aiResult = await base44.integrations.Core.InvokeLLM({
            prompt: `Analisa a compatibilidade entre este lead e os imóveis disponíveis.

LEAD:
${leadContext}

IMÓVEIS:
${propertiesContext}

Para cada imóvel, dá um score de 0-100 e uma breve razão. Ordena do mais compatível para o menos.`,
            response_json_schema: {
              type: "object",
              properties: {
                matches: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      property_id: { type: "string" },
                      ai_score: { type: "number" },
                      reason: { type: "string" }
                    }
                  }
                }
              }
            }
          });

          // Merge AI scores with basic scores
          const enhancedMatches = topMatches.map(property => {
            const aiMatch = aiResult.matches?.find(m => m.property_id === property.id);
            return {
              ...property,
              aiScore: aiMatch?.ai_score || property.score,
              reason: aiMatch?.reason || '',
              finalScore: aiMatch?.ai_score 
                ? Math.round((property.score + aiMatch.ai_score) / 2)
                : property.score
            };
          });

          setMatches(enhancedMatches.sort((a, b) => b.finalScore - a.finalScore));
        } catch {
          // If AI fails, use basic scores
          setMatches(topMatches.map(p => ({ ...p, finalScore: p.score, reason: '' })));
        }
      } else {
        setMatches(topMatches.map(p => ({ ...p, finalScore: p.score, reason: '' })));
      }

      toast.success(`Encontrados ${topMatches.length} imóveis compatíveis`);
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
                    <Badge 
                      className={`text-xs flex-shrink-0 ${
                        property.finalScore >= 70 ? 'bg-green-100 text-green-800' :
                        property.finalScore >= 40 ? 'bg-amber-100 text-amber-800' :
                        'bg-slate-100 text-slate-800'
                      }`}
                    >
                      {property.finalScore}%
                    </Badge>
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

                  {property.reason && (
                    <p className="text-xs text-purple-600 mt-1 line-clamp-1">
                      💡 {property.reason}
                    </p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 mt-2 pt-2 border-t">
                <Progress value={property.finalScore} className="flex-1 h-1.5" />
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
            </div>
          ))}

          {matches.length > 0 && (
            <p className="text-xs text-center text-slate-500">
              {matches.length} imóveis compatíveis
              {Object.keys(requirements).length > 0 
                ? ` (filtrados de ${activeProperties.filter(meetsHardRequirements).length} elegíveis)`
                : ` de ${activeProperties.length} disponíveis`
              }
            </p>
          )}
        </CardContent>
      )}
    </Card>
  );
}