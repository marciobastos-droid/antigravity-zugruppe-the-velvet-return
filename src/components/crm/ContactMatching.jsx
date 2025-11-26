import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { 
  Search, Home, MapPin, Euro, Bed, Bath, 
  Square, Sparkles, Send, Check, ExternalLink
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function ContactMatching({ contact }) {
  const [filters, setFilters] = React.useState({
    listing_type: "sale",
    property_type: "",
    city: contact?.city || "",
    priceMin: "",
    priceMax: "",
    bedroomsMin: "",
    areaMin: ""
  });
  const [matchResults, setMatchResults] = React.useState([]);
  const [analyzing, setAnalyzing] = React.useState(false);
  const [selectedProperties, setSelectedProperties] = React.useState([]);

  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list('-created_date')
  });

  const activeProperties = properties.filter(p => p.status === 'active');

  const calculateMatchScore = (property) => {
    let score = 0;
    let maxScore = 0;

    // Location match
    if (filters.city) {
      maxScore += 30;
      if (property.city?.toLowerCase().includes(filters.city.toLowerCase())) {
        score += 30;
      }
    }

    // Price match
    if (filters.priceMin || filters.priceMax) {
      maxScore += 25;
      const price = property.price || 0;
      const min = filters.priceMin ? parseFloat(filters.priceMin) : 0;
      const max = filters.priceMax ? parseFloat(filters.priceMax) : Infinity;
      if (price >= min && price <= max) {
        score += 25;
      } else if (price >= min * 0.9 && price <= max * 1.1) {
        score += 15; // Close to budget
      }
    }

    // Bedrooms match
    if (filters.bedroomsMin) {
      maxScore += 20;
      if (property.bedrooms >= parseInt(filters.bedroomsMin)) {
        score += 20;
      }
    }

    // Area match
    if (filters.areaMin) {
      maxScore += 15;
      const area = property.useful_area || property.square_feet || 0;
      if (area >= parseInt(filters.areaMin)) {
        score += 15;
      }
    }

    // Property type match
    if (filters.property_type) {
      maxScore += 10;
      if (property.property_type === filters.property_type) {
        score += 10;
      }
    }

    // Listing type match
    maxScore += 10;
    if (property.listing_type === filters.listing_type) {
      score += 10;
    }

    return maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  };

  const handleSearch = () => {
    setAnalyzing(true);
    
    setTimeout(() => {
      const scored = activeProperties.map(property => ({
        ...property,
        matchScore: calculateMatchScore(property)
      }));

      const filtered = scored
        .filter(p => p.matchScore > 0)
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, 20);

      setMatchResults(filtered);
      setAnalyzing(false);
    }, 500);
  };

  const handleAIMatch = async () => {
    setAnalyzing(true);
    try {
      const prompt = `
        Analisa os seguintes imóveis e encontra os melhores matches para um cliente com estas preferências:
        - Cidade: ${filters.city || "Qualquer"}
        - Tipo: ${filters.listing_type === 'sale' ? 'Compra' : 'Arrendamento'}
        - Tipo de imóvel: ${filters.property_type || "Qualquer"}
        - Orçamento: ${filters.priceMin || 0}€ - ${filters.priceMax || "sem limite"}€
        - Quartos mínimos: ${filters.bedroomsMin || "Qualquer"}
        - Área mínima: ${filters.areaMin || "Qualquer"}m²

        Lista de imóveis disponíveis:
        ${activeProperties.slice(0, 30).map(p => `
          ID: ${p.id}
          Título: ${p.title}
          Cidade: ${p.city}
          Preço: ${p.price}€
          Quartos: ${p.bedrooms}
          Área: ${p.useful_area || p.square_feet}m²
          Tipo: ${p.property_type}
          Listing: ${p.listing_type}
        `).join('\n')}

        Retorna um JSON com os IDs dos melhores matches ordenados por relevância:
      `;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            matches: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  score: { type: "number" },
                  reason: { type: "string" }
                }
              }
            }
          }
        }
      });

      if (result.matches) {
        const aiMatches = result.matches.map(m => {
          const property = activeProperties.find(p => p.id === m.id);
          if (property) {
            return { ...property, matchScore: m.score, aiReason: m.reason };
          }
          return null;
        }).filter(Boolean);
        
        setMatchResults(aiMatches);
      }
    } catch (error) {
      toast.error("Erro na análise AI");
      handleSearch(); // Fallback to basic search
    }
    setAnalyzing(false);
  };

  const togglePropertySelection = (propertyId) => {
    setSelectedProperties(prev => 
      prev.includes(propertyId) 
        ? prev.filter(id => id !== propertyId)
        : [...prev, propertyId]
    );
  };

  const handleSendMatches = async () => {
    if (selectedProperties.length === 0) {
      toast.error("Selecione pelo menos um imóvel");
      return;
    }

    if (!contact.email) {
      toast.error("Contacto não tem email");
      return;
    }

    try {
      const selectedProps = matchResults.filter(p => selectedProperties.includes(p.id));
      const propertyList = selectedProps.map(p => `
        • ${p.title}
        - Localização: ${p.city}
        - Preço: €${p.price?.toLocaleString()}
        - Quartos: ${p.bedrooms || 'N/A'}
        - Área: ${p.useful_area || p.square_feet || 'N/A'}m²
      `).join('\n');

      await base44.integrations.Core.SendEmail({
        to: contact.email,
        subject: `Imóveis selecionados para si - ${selectedProps.length} sugestões`,
        body: `
Olá ${contact.full_name},

Temos ${selectedProps.length} imóvel(is) que achamos que podem interessar-lhe:

${propertyList}

Entre em contacto connosco para mais informações ou para agendar uma visita.

Cumprimentos,
Zugruppe
        `
      });

      toast.success("Email enviado com sucesso!");
      setSelectedProperties([]);
    } catch (error) {
      toast.error("Erro ao enviar email");
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return "bg-green-100 text-green-800";
    if (score >= 60) return "bg-blue-100 text-blue-800";
    if (score >= 40) return "bg-amber-100 text-amber-800";
    return "bg-slate-100 text-slate-800";
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <h4 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Search className="w-4 h-4" />
            Critérios de Pesquisa
          </h4>
          
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <Label>Tipo de Anúncio</Label>
              <Select 
                value={filters.listing_type} 
                onValueChange={(v) => setFilters({...filters, listing_type: v})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sale">Venda</SelectItem>
                  <SelectItem value="rent">Arrendamento</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Tipo de Imóvel</Label>
              <Select 
                value={filters.property_type} 
                onValueChange={(v) => setFilters({...filters, property_type: v})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Todos</SelectItem>
                  <SelectItem value="apartment">Apartamento</SelectItem>
                  <SelectItem value="house">Moradia</SelectItem>
                  <SelectItem value="townhouse">Casa Geminada</SelectItem>
                  <SelectItem value="land">Terreno</SelectItem>
                  <SelectItem value="commercial">Comercial</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Cidade</Label>
              <Input
                value={filters.city}
                onChange={(e) => setFilters({...filters, city: e.target.value})}
                placeholder="Ex: Lisboa"
              />
            </div>

            <div>
              <Label>Preço Mínimo (€)</Label>
              <Input
                type="number"
                value={filters.priceMin}
                onChange={(e) => setFilters({...filters, priceMin: e.target.value})}
                placeholder="0"
              />
            </div>

            <div>
              <Label>Preço Máximo (€)</Label>
              <Input
                type="number"
                value={filters.priceMax}
                onChange={(e) => setFilters({...filters, priceMax: e.target.value})}
                placeholder="1000000"
              />
            </div>

            <div>
              <Label>Quartos Mínimos</Label>
              <Input
                type="number"
                value={filters.bedroomsMin}
                onChange={(e) => setFilters({...filters, bedroomsMin: e.target.value})}
                placeholder="0"
              />
            </div>

            <div>
              <Label>Área Mínima (m²)</Label>
              <Input
                type="number"
                value={filters.areaMin}
                onChange={(e) => setFilters({...filters, areaMin: e.target.value})}
                placeholder="0"
              />
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button onClick={handleSearch} disabled={analyzing}>
              <Search className="w-4 h-4 mr-2" />
              {analyzing ? "A pesquisar..." : "Pesquisar"}
            </Button>
            <Button onClick={handleAIMatch} disabled={analyzing} variant="outline" className="border-purple-300 text-purple-700 hover:bg-purple-50">
              <Sparkles className="w-4 h-4 mr-2" />
              Match com IA
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Selected Properties Actions */}
      {selectedProperties.length > 0 && (
        <Card className="border-green-300 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="font-medium text-green-800">
                {selectedProperties.length} imóvel(is) selecionado(s)
              </span>
              <div className="flex gap-2">
                <Button 
                  onClick={handleSendMatches}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Enviar por Email
                </Button>
                <Button variant="outline" onClick={() => setSelectedProperties([])}>
                  Limpar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {matchResults.length > 0 ? (
        <div className="space-y-3">
          <h4 className="font-semibold text-slate-900">
            {matchResults.length} imóveis encontrados
          </h4>
          
          {matchResults.map((property) => (
            <Card 
              key={property.id} 
              className={`cursor-pointer transition-all ${
                selectedProperties.includes(property.id) 
                  ? 'ring-2 ring-green-500 bg-green-50' 
                  : 'hover:shadow-md'
              }`}
              onClick={() => togglePropertySelection(property.id)}
            >
              <CardContent className="p-4">
                <div className="flex gap-4">
                  {property.images?.[0] ? (
                    <img 
                      src={property.images[0]} 
                      alt={property.title}
                      className="w-24 h-20 object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-24 h-20 bg-slate-100 rounded-lg flex items-center justify-center">
                      <Home className="w-8 h-8 text-slate-300" />
                    </div>
                  )}

                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold text-slate-900">{property.title}</h4>
                        <div className="flex items-center gap-1 text-sm text-slate-600">
                          <MapPin className="w-3 h-3" />
                          {property.city}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getScoreColor(property.matchScore)}>
                          {property.matchScore}% match
                        </Badge>
                        {selectedProperties.includes(property.id) && (
                          <Check className="w-5 h-5 text-green-600" />
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-slate-600">
                      <span className="flex items-center gap-1 font-semibold text-slate-900">
                        <Euro className="w-4 h-4" />
                        {property.price?.toLocaleString()}
                      </span>
                      {property.bedrooms && (
                        <span className="flex items-center gap-1">
                          <Bed className="w-4 h-4" />
                          {property.bedrooms}
                        </span>
                      )}
                      {property.bathrooms && (
                        <span className="flex items-center gap-1">
                          <Bath className="w-4 h-4" />
                          {property.bathrooms}
                        </span>
                      )}
                      {(property.useful_area || property.square_feet) && (
                        <span className="flex items-center gap-1">
                          <Square className="w-4 h-4" />
                          {property.useful_area || property.square_feet}m²
                        </span>
                      )}
                    </div>

                    {property.aiReason && (
                      <p className="text-xs text-purple-600 mt-2 italic">
                        ✨ {property.aiReason}
                      </p>
                    )}
                  </div>

                  <Link 
                    to={`${createPageUrl("PropertyDetails")}?id=${property.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="self-center"
                  >
                    <Button variant="ghost" size="sm">
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="text-center py-12">
          <CardContent>
            <Home className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Nenhum resultado</h3>
            <p className="text-slate-600">Use os filtros acima para encontrar imóveis compatíveis</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}