import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Users, Sparkles, Loader2, User, Phone, Mail, Euro,
  MapPin, Bed, Target, CheckCircle2, ArrowRight, Send, MessageSquare
} from "lucide-react";
import { toast } from "sonner";

export default function AIBuyerMatcher({ property }) {
  const [isMatching, setIsMatching] = React.useState(false);
  const [matches, setMatches] = React.useState([]);
  const [selectedBuyers, setSelectedBuyers] = React.useState([]);

  const { data: contacts = [] } = useQuery({
    queryKey: ['clientContacts'],
    queryFn: () => base44.entities.ClientContact.list(),
  });

  const { data: opportunities = [] } = useQuery({
    queryKey: ['opportunities'],
    queryFn: () => base44.entities.Opportunity.list(),
  });

  const { data: communications = [] } = useQuery({
    queryKey: ['communicationLogs'],
    queryFn: () => base44.entities.CommunicationLog.list(),
  });

  const findMatches = async () => {
    setIsMatching(true);
    try {
      // Get buyers with requirements
      const buyerProfiles = contacts.filter(c => 
        c.contact_type === 'client' && 
        c.property_requirements && 
        Object.keys(c.property_requirements).length > 0
      );

      // Get active opportunities (potential buyers)
      const buyerOpportunities = opportunities.filter(o => 
        o.lead_type === 'comprador' && 
        o.status !== 'lost' && 
        o.status !== 'won'
      );

      // Combine for analysis
      const allBuyers = [
        ...buyerProfiles.map(c => ({
          type: 'contact',
          id: c.id,
          name: c.full_name,
          email: c.email,
          phone: c.phone,
          requirements: c.property_requirements,
          communications: communications.filter(comm => comm.contact_id === c.id).length,
          lastContact: c.last_contact_date
        })),
        ...buyerOpportunities.map(o => ({
          type: 'opportunity',
          id: o.id,
          name: o.buyer_name,
          email: o.buyer_email,
          phone: o.buyer_phone,
          budget: o.budget,
          location: o.location,
          propertyType: o.property_type_interest,
          status: o.status,
          qualification: o.qualification_status,
          score: o.qualification_score
        }))
      ];

      if (allBuyers.length === 0) {
        toast.info("Nenhum comprador encontrado com requisitos definidos");
        setIsMatching(false);
        return;
      }

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Analisa este imóvel e encontra os melhores compradores potenciais.

IMÓVEL:
- Título: ${property.title}
- Tipo: ${property.property_type}
- Localização: ${property.city}, ${property.state}
- Preço: €${property.price?.toLocaleString()}
- Área: ${property.square_feet || property.useful_area || 0} m²
- Quartos: ${property.bedrooms || 0}
- Casas de banho: ${property.bathrooms || 0}
- Amenidades: ${property.amenities?.join(', ') || 'N/A'}

COMPRADORES POTENCIAIS (${allBuyers.length}):
${JSON.stringify(allBuyers.slice(0, 30), null, 2)}

INSTRUÇÕES:
1. Analisa cada comprador e verifica compatibilidade com o imóvel
2. Considera: orçamento, localização, tipo de imóvel, área, quartos
3. Considera também engagement (comunicações, qualificação)
4. Ordena por score de compatibilidade (0-100)
5. Retorna os top 10 matches

Para cada match, fornece:
- buyer_id: ID do comprador
- buyer_type: "contact" ou "opportunity"
- match_score: 0-100
- match_reasons: array de razões de match
- mismatch_factors: array de fatores que não batem
- suggested_approach: sugestão de abordagem (máximo 100 chars)`,
        response_json_schema: {
          type: "object",
          properties: {
            matches: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  buyer_id: { type: "string" },
                  buyer_type: { type: "string" },
                  match_score: { type: "number" },
                  match_reasons: { type: "array", items: { type: "string" } },
                  mismatch_factors: { type: "array", items: { type: "string" } },
                  suggested_approach: { type: "string" }
                }
              }
            }
          }
        }
      });

      // Enrich with original data
      const enrichedMatches = result.matches.map(match => {
        const buyer = allBuyers.find(b => b.id === match.buyer_id);
        return { ...match, buyer };
      }).filter(m => m.buyer);

      setMatches(enrichedMatches);
      toast.success(`${enrichedMatches.length} compradores compatíveis encontrados!`);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao procurar compradores");
    }
    setIsMatching(false);
  };

  const toggleSelectBuyer = (buyerId) => {
    setSelectedBuyers(prev => 
      prev.includes(buyerId) ? prev.filter(id => id !== buyerId) : [...prev, buyerId]
    );
  };

  const sendToSelected = async () => {
    if (selectedBuyers.length === 0) {
      toast.error("Selecione pelo menos um comprador");
      return;
    }
    
    const selectedMatches = matches.filter(m => selectedBuyers.includes(m.buyer_id));
    
    // Create communication logs for each selected buyer
    for (const match of selectedMatches) {
      if (match.buyer?.email) {
        await base44.entities.CommunicationLog.create({
          contact_id: match.buyer_type === 'contact' ? match.buyer_id : null,
          opportunity_id: match.buyer_type === 'opportunity' ? match.buyer_id : null,
          contact_name: match.buyer.name,
          property_id: property.id,
          property_title: property.title,
          communication_type: 'property_match',
          direction: 'outbound',
          subject: `Match de imóvel: ${property.title}`,
          summary: `Imóvel sugerido com score de ${match.match_score}%`,
          communication_date: new Date().toISOString()
        });
      }
    }
    
    toast.success(`${selectedBuyers.length} compradores notificados!`);
    setSelectedBuyers([]);
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-amber-600';
    return 'text-slate-500';
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-blue-50">
          <CardContent className="p-3">
            <div className="text-xs text-blue-600 mb-1">Contactos com Requisitos</div>
            <div className="text-xl font-bold text-blue-900">
              {contacts.filter(c => c.property_requirements && Object.keys(c.property_requirements).length > 0).length}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-amber-50">
          <CardContent className="p-3">
            <div className="text-xs text-amber-600 mb-1">Leads Compradores</div>
            <div className="text-xl font-bold text-amber-900">
              {opportunities.filter(o => o.lead_type === 'comprador' && o.status !== 'lost').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Match Button */}
      <Button
        onClick={findMatches}
        disabled={isMatching}
        className="w-full bg-purple-600 hover:bg-purple-700"
      >
        {isMatching ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            A procurar compradores...
          </>
        ) : (
          <>
            <Users className="w-4 h-4 mr-2" />
            Encontrar Compradores com IA
          </>
        )}
      </Button>

      {/* Results */}
      {matches.length > 0 && (
        <div className="space-y-3 pt-4 border-t">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-purple-600" />
              <span className="font-medium text-sm">{matches.length} Compradores Compatíveis</span>
            </div>
            {selectedBuyers.length > 0 && (
              <Button size="sm" onClick={sendToSelected} className="bg-green-600 hover:bg-green-700">
                <Send className="w-3 h-3 mr-1" />
                Enviar ({selectedBuyers.length})
              </Button>
            )}
          </div>

          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {matches.map((match, idx) => (
              <Card 
                key={match.buyer_id} 
                className={`cursor-pointer transition-all ${
                  selectedBuyers.includes(match.buyer_id) ? 'ring-2 ring-purple-500 bg-purple-50' : 'hover:bg-slate-50'
                }`}
                onClick={() => toggleSelectBuyer(match.buyer_id)}
              >
                <CardContent className="p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
                        <User className="w-4 h-4 text-slate-600" />
                      </div>
                      <div>
                        <div className="font-medium text-slate-900">{match.buyer?.name}</div>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <Badge variant="outline" className="text-xs">
                            {match.buyer_type === 'contact' ? 'Contacto' : 'Lead'}
                          </Badge>
                          {match.buyer?.qualification && (
                            <Badge className={`text-xs ${
                              match.buyer.qualification === 'hot' ? 'bg-red-100 text-red-700' :
                              match.buyer.qualification === 'warm' ? 'bg-amber-100 text-amber-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>
                              {match.buyer.qualification}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-xl font-bold ${getScoreColor(match.match_score)}`}>
                        {match.match_score}%
                      </div>
                      <div className="text-xs text-slate-500">match</div>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="flex items-center gap-3 text-xs text-slate-600 mb-2">
                    {match.buyer?.phone && (
                      <a 
                        href={`tel:${match.buyer.phone}`} 
                        className="flex items-center gap-1 hover:text-blue-600"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Phone className="w-3 h-3" />
                        {match.buyer.phone}
                      </a>
                    )}
                    {match.buyer?.email && (
                      <a 
                        href={`mailto:${match.buyer.email}`} 
                        className="flex items-center gap-1 hover:text-blue-600"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Mail className="w-3 h-3" />
                        {match.buyer.email}
                      </a>
                    )}
                  </div>

                  {/* Match Reasons */}
                  <div className="flex flex-wrap gap-1 mb-2">
                    {match.match_reasons?.slice(0, 3).map((reason, i) => (
                      <Badge key={i} variant="outline" className="text-xs bg-green-50 border-green-200 text-green-700">
                        ✓ {reason}
                      </Badge>
                    ))}
                  </div>

                  {/* Mismatch (if any) */}
                  {match.mismatch_factors?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {match.mismatch_factors.slice(0, 2).map((factor, i) => (
                        <Badge key={i} variant="outline" className="text-xs bg-red-50 border-red-200 text-red-600">
                          ✗ {factor}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Suggested Approach */}
                  {match.suggested_approach && (
                    <div className="text-xs text-purple-700 bg-purple-50 p-2 rounded mt-2">
                      💡 {match.suggested_approach}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}