import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Sparkles, Loader2, MapPin, Phone, Mail, Building2, 
  User, CheckCircle2, AlertCircle, Globe, TrendingUp,
  Home, Zap, RefreshCw
} from "lucide-react";
import { toast } from "sonner";

export default function DataEnrichment({ 
  type, // "property" or "contact"
  record, 
  open, 
  onOpenChange,
  onEnriched 
}) {
  const queryClient = useQueryClient();
  const [enrichedData, setEnrichedData] = useState(null);
  const [selectedFields, setSelectedFields] = useState({});
  const [enriching, setEnriching] = useState(false);

  const enrichProperty = async (property) => {
    const prompt = `Analisa este imóvel e enriquece os dados com informação adicional verificada:

IMÓVEL ATUAL:
- Título: ${property.title || 'N/A'}
- Morada: ${property.address || 'N/A'}
- Cidade: ${property.city || 'N/A'}
- Distrito: ${property.state || 'N/A'}
- Código Postal: ${property.zip_code || 'N/A'}
- Tipo: ${property.property_type || 'N/A'}
- Preço: €${property.price || 0}
- Quartos: ${property.bedrooms || 'N/A'}
- WCs: ${property.bathrooms || 'N/A'}
- Área: ${property.useful_area || property.square_feet || 'N/A'}m²
- Ano: ${property.year_built || 'N/A'}
- Descrição: ${property.description || 'N/A'}

TAREFAS:
1. Verificar e corrigir a morada (formato português correto)
2. Sugerir código postal se ausente (baseado na cidade/morada)
3. Estimar ano de construção se ausente (baseado no tipo e zona)
4. Sugerir amenidades típicas para este tipo de imóvel
5. Validar se o preço está dentro da média de mercado
6. Sugerir tags relevantes para SEO
7. Identificar pontos de interesse próximos (escolas, transportes, comércio)

Retorna APENAS campos que possam ser melhorados ou adicionados.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          address_verified: { type: "string", description: "Morada verificada e formatada" },
          zip_code_suggested: { type: "string", description: "Código postal sugerido" },
          year_built_estimated: { type: "number", description: "Ano de construção estimado" },
          amenities_suggested: { type: "array", items: { type: "string" }, description: "Amenidades sugeridas" },
          tags_suggested: { type: "array", items: { type: "string" }, description: "Tags para SEO" },
          price_analysis: { 
            type: "object",
            properties: {
              market_average: { type: "number" },
              price_position: { type: "string", enum: ["below_market", "market_value", "above_market"] },
              recommendation: { type: "string" }
            }
          },
          nearby_points: { type: "array", items: { type: "string" }, description: "Pontos de interesse próximos" },
          energy_certificate_estimated: { type: "string", enum: ["A+", "A", "B", "B-", "C", "D", "E", "F"] },
          improvements: { type: "array", items: { type: "string" }, description: "Melhorias sugeridas nos dados" },
          confidence_score: { type: "number", description: "Confiança nas sugestões (0-100)" }
        }
      }
    });

    return result;
  };

  const enrichContact = async (contact) => {
    const prompt = `Analisa este contacto e enriquece os dados com informação adicional:

CONTACTO ATUAL:
- Nome: ${contact.full_name || 'N/A'}
- Email: ${contact.email || 'N/A'}
- Telefone: ${contact.phone || 'N/A'}
- Telefone Secundário: ${contact.secondary_phone || 'N/A'}
- Morada: ${contact.address || 'N/A'}
- Cidade: ${contact.city || 'N/A'}
- Código Postal: ${contact.postal_code || 'N/A'}
- NIF: ${contact.nif || 'N/A'}
- Empresa: ${contact.company_name || 'N/A'}
- Cargo: ${contact.job_title || 'N/A'}
- Tipo: ${contact.contact_type || 'N/A'}
- Origem: ${contact.source || 'N/A'}

TAREFAS:
1. Validar formato do email
2. Validar e formatar número de telefone (formato português +351)
3. Verificar formato do NIF (9 dígitos)
4. Se empresa presente, pesquisar informações da empresa (setor, tamanho)
5. Sugerir método de contacto preferido baseado nos dados
6. Classificar potencial do cliente (investidor, comprador, vendedor)
7. Sugerir tags relevantes

Retorna APENAS campos que possam ser melhorados ou adicionados.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          phone_formatted: { type: "string", description: "Telefone formatado (+351...)" },
          email_valid: { type: "boolean", description: "Email válido" },
          email_suggestion: { type: "string", description: "Sugestão de correção de email" },
          nif_valid: { type: "boolean", description: "NIF válido" },
          company_info: {
            type: "object",
            properties: {
              sector: { type: "string" },
              size: { type: "string", enum: ["micro", "small", "medium", "large"] },
              website: { type: "string" }
            }
          },
          preferred_contact_suggested: { type: "string", enum: ["phone", "email", "whatsapp", "sms"] },
          client_potential: { type: "string", enum: ["high", "medium", "low"] },
          client_type_suggested: { type: "string", enum: ["investor", "buyer", "seller", "renter"] },
          tags_suggested: { type: "array", items: { type: "string" } },
          address_formatted: { type: "string" },
          improvements: { type: "array", items: { type: "string" } },
          confidence_score: { type: "number" }
        }
      }
    });

    return result;
  };

  const handleEnrich = async () => {
    setEnriching(true);
    try {
      let result;
      if (type === "property") {
        result = await enrichProperty(record);
      } else {
        result = await enrichContact(record);
      }
      setEnrichedData(result);
      
      // Pre-select high-confidence fields
      const initialSelection = {};
      Object.keys(result).forEach(key => {
        if (result.confidence_score >= 70 && key !== 'confidence_score' && key !== 'improvements') {
          initialSelection[key] = true;
        }
      });
      setSelectedFields(initialSelection);
      
      toast.success("Dados enriquecidos com sucesso!");
    } catch (error) {
      toast.error("Erro ao enriquecer dados");
      console.error(error);
    }
    setEnriching(false);
  };

  const applyMutation = useMutation({
    mutationFn: async () => {
      const updates = {};
      
      if (type === "property") {
        if (selectedFields.address_verified) updates.address = enrichedData.address_verified;
        if (selectedFields.zip_code_suggested) updates.zip_code = enrichedData.zip_code_suggested;
        if (selectedFields.year_built_estimated) updates.year_built = enrichedData.year_built_estimated;
        if (selectedFields.amenities_suggested) {
          updates.amenities = [...(record.amenities || []), ...enrichedData.amenities_suggested];
        }
        if (selectedFields.tags_suggested) {
          updates.tags = [...(record.tags || []), ...enrichedData.tags_suggested];
        }
        if (selectedFields.energy_certificate_estimated && !record.energy_certificate) {
          updates.energy_certificate = enrichedData.energy_certificate_estimated;
        }
        
        await base44.entities.Property.update(record.id, updates);
      } else {
        if (selectedFields.phone_formatted) updates.phone = enrichedData.phone_formatted;
        if (selectedFields.preferred_contact_suggested) updates.preferred_contact_method = enrichedData.preferred_contact_suggested;
        if (selectedFields.tags_suggested) {
          updates.tags = [...(record.tags || []), ...enrichedData.tags_suggested];
        }
        if (selectedFields.address_formatted) updates.address = enrichedData.address_formatted;
        
        await base44.entities.ClientContact.update(record.id, updates);
      }
      
      return updates;
    },
    onSuccess: (updates) => {
      queryClient.invalidateQueries({ queryKey: type === "property" ? ['properties'] : ['clientContacts'] });
      toast.success("Dados atualizados com sucesso!");
      onOpenChange(false);
      if (onEnriched) onEnriched(updates);
    }
  });

  const toggleField = (field) => {
    setSelectedFields(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const renderPropertyEnrichment = () => {
    if (!enrichedData) return null;

    return (
      <div className="space-y-4">
        {/* Confidence Score */}
        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
          <span className="font-medium">Confiança da Análise</span>
          <Badge className={enrichedData.confidence_score >= 70 ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}>
            {enrichedData.confidence_score}%
          </Badge>
        </div>

        {/* Address */}
        {enrichedData.address_verified && enrichedData.address_verified !== record.address && (
          <EnrichmentField
            icon={MapPin}
            label="Morada Verificada"
            currentValue={record.address}
            newValue={enrichedData.address_verified}
            selected={selectedFields.address_verified}
            onToggle={() => toggleField('address_verified')}
          />
        )}

        {/* Zip Code */}
        {enrichedData.zip_code_suggested && !record.zip_code && (
          <EnrichmentField
            icon={MapPin}
            label="Código Postal"
            currentValue={record.zip_code || "Não definido"}
            newValue={enrichedData.zip_code_suggested}
            selected={selectedFields.zip_code_suggested}
            onToggle={() => toggleField('zip_code_suggested')}
          />
        )}

        {/* Year Built */}
        {enrichedData.year_built_estimated && !record.year_built && (
          <EnrichmentField
            icon={Home}
            label="Ano de Construção (Estimado)"
            currentValue="Não definido"
            newValue={enrichedData.year_built_estimated.toString()}
            selected={selectedFields.year_built_estimated}
            onToggle={() => toggleField('year_built_estimated')}
          />
        )}

        {/* Energy Certificate */}
        {enrichedData.energy_certificate_estimated && !record.energy_certificate && (
          <EnrichmentField
            icon={Zap}
            label="Certificado Energético (Estimado)"
            currentValue="Não definido"
            newValue={enrichedData.energy_certificate_estimated}
            selected={selectedFields.energy_certificate_estimated}
            onToggle={() => toggleField('energy_certificate_estimated')}
          />
        )}

        {/* Amenities */}
        {enrichedData.amenities_suggested?.length > 0 && (
          <div className="p-3 border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Checkbox 
                  checked={selectedFields.amenities_suggested} 
                  onCheckedChange={() => toggleField('amenities_suggested')}
                />
                <span className="font-medium">Amenidades Sugeridas</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {enrichedData.amenities_suggested.map((a, i) => (
                <Badge key={i} variant="secondary" className="text-xs">{a}</Badge>
              ))}
            </div>
          </div>
        )}

        {/* Tags */}
        {enrichedData.tags_suggested?.length > 0 && (
          <div className="p-3 border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Checkbox 
                  checked={selectedFields.tags_suggested} 
                  onCheckedChange={() => toggleField('tags_suggested')}
                />
                <span className="font-medium">Tags SEO Sugeridas</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {enrichedData.tags_suggested.map((t, i) => (
                <Badge key={i} variant="outline" className="text-xs">{t}</Badge>
              ))}
            </div>
          </div>
        )}

        {/* Price Analysis */}
        {enrichedData.price_analysis && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span className="font-medium text-blue-900">Análise de Preço</span>
            </div>
            <div className="text-sm text-blue-800">
              <p>Média de mercado: €{enrichedData.price_analysis.market_average?.toLocaleString()}</p>
              <p>Posição: {
                enrichedData.price_analysis.price_position === 'below_market' ? 'Abaixo do mercado' :
                enrichedData.price_analysis.price_position === 'above_market' ? 'Acima do mercado' : 'Valor de mercado'
              }</p>
              {enrichedData.price_analysis.recommendation && (
                <p className="mt-1 italic">{enrichedData.price_analysis.recommendation}</p>
              )}
            </div>
          </div>
        )}

        {/* Nearby Points */}
        {enrichedData.nearby_points?.length > 0 && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="w-4 h-4 text-green-600" />
              <span className="font-medium text-green-900">Pontos de Interesse</span>
            </div>
            <ul className="text-sm text-green-800 list-disc list-inside">
              {enrichedData.nearby_points.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Improvements */}
        {enrichedData.improvements?.length > 0 && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <span className="font-medium text-amber-900">Sugestões de Melhoria</span>
            </div>
            <ul className="text-sm text-amber-800 list-disc list-inside">
              {enrichedData.improvements.map((i, idx) => (
                <li key={idx}>{i}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  const renderContactEnrichment = () => {
    if (!enrichedData) return null;

    return (
      <div className="space-y-4">
        {/* Confidence Score */}
        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
          <span className="font-medium">Confiança da Análise</span>
          <Badge className={enrichedData.confidence_score >= 70 ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}>
            {enrichedData.confidence_score}%
          </Badge>
        </div>

        {/* Phone */}
        {enrichedData.phone_formatted && enrichedData.phone_formatted !== record.phone && (
          <EnrichmentField
            icon={Phone}
            label="Telefone Formatado"
            currentValue={record.phone || "Não definido"}
            newValue={enrichedData.phone_formatted}
            selected={selectedFields.phone_formatted}
            onToggle={() => toggleField('phone_formatted')}
          />
        )}

        {/* Email Validation */}
        {enrichedData.email_valid !== undefined && (
          <div className="p-3 border rounded-lg">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-slate-500" />
              <span className="font-medium">Validação de Email</span>
              {enrichedData.email_valid ? (
                <Badge className="bg-green-100 text-green-800">Válido</Badge>
              ) : (
                <Badge className="bg-red-100 text-red-800">Inválido</Badge>
              )}
            </div>
            {enrichedData.email_suggestion && (
              <p className="text-sm text-slate-600 mt-1">Sugestão: {enrichedData.email_suggestion}</p>
            )}
          </div>
        )}

        {/* Preferred Contact */}
        {enrichedData.preferred_contact_suggested && (
          <EnrichmentField
            icon={Phone}
            label="Método de Contacto Preferido"
            currentValue={record.preferred_contact_method || "Não definido"}
            newValue={enrichedData.preferred_contact_suggested}
            selected={selectedFields.preferred_contact_suggested}
            onToggle={() => toggleField('preferred_contact_suggested')}
          />
        )}

        {/* Client Potential */}
        {enrichedData.client_potential && (
          <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <User className="w-4 h-4 text-purple-600" />
              <span className="font-medium text-purple-900">Potencial do Cliente</span>
            </div>
            <Badge className={
              enrichedData.client_potential === 'high' ? "bg-green-100 text-green-800" :
              enrichedData.client_potential === 'medium' ? "bg-amber-100 text-amber-800" :
              "bg-slate-100 text-slate-800"
            }>
              {enrichedData.client_potential === 'high' ? 'Alto' :
               enrichedData.client_potential === 'medium' ? 'Médio' : 'Baixo'}
            </Badge>
            {enrichedData.client_type_suggested && (
              <span className="ml-2 text-sm text-purple-700">
                Tipo: {
                  enrichedData.client_type_suggested === 'investor' ? 'Investidor' :
                  enrichedData.client_type_suggested === 'buyer' ? 'Comprador' :
                  enrichedData.client_type_suggested === 'seller' ? 'Vendedor' : 'Arrendatário'
                }
              </span>
            )}
          </div>
        )}

        {/* Company Info */}
        {enrichedData.company_info && (enrichedData.company_info.sector || enrichedData.company_info.size) && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="w-4 h-4 text-blue-600" />
              <span className="font-medium text-blue-900">Informação da Empresa</span>
            </div>
            <div className="text-sm text-blue-800 space-y-1">
              {enrichedData.company_info.sector && <p>Setor: {enrichedData.company_info.sector}</p>}
              {enrichedData.company_info.size && (
                <p>Dimensão: {
                  enrichedData.company_info.size === 'micro' ? 'Micro' :
                  enrichedData.company_info.size === 'small' ? 'Pequena' :
                  enrichedData.company_info.size === 'medium' ? 'Média' : 'Grande'
                }</p>
              )}
              {enrichedData.company_info.website && (
                <p>Website: <a href={enrichedData.company_info.website} target="_blank" rel="noopener noreferrer" className="underline">{enrichedData.company_info.website}</a></p>
              )}
            </div>
          </div>
        )}

        {/* Tags */}
        {enrichedData.tags_suggested?.length > 0 && (
          <div className="p-3 border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Checkbox 
                  checked={selectedFields.tags_suggested} 
                  onCheckedChange={() => toggleField('tags_suggested')}
                />
                <span className="font-medium">Tags Sugeridas</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {enrichedData.tags_suggested.map((t, i) => (
                <Badge key={i} variant="outline" className="text-xs">{t}</Badge>
              ))}
            </div>
          </div>
        )}

        {/* Improvements */}
        {enrichedData.improvements?.length > 0 && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <span className="font-medium text-amber-900">Sugestões de Melhoria</span>
            </div>
            <ul className="text-sm text-amber-800 list-disc list-inside">
              {enrichedData.improvements.map((i, idx) => (
                <li key={idx}>{i}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  const hasSelectedFields = Object.values(selectedFields).some(v => v);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            Enriquecer Dados - {type === "property" ? "Imóvel" : "Contacto"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Record Summary */}
          <Card className="bg-slate-50">
            <CardContent className="p-4">
              <h4 className="font-medium mb-2">Registo Atual</h4>
              {type === "property" ? (
                <div className="text-sm space-y-1">
                  <p><strong>Título:</strong> {record.title}</p>
                  <p><strong>Morada:</strong> {record.address || 'N/A'}, {record.city}</p>
                  <p><strong>Preço:</strong> €{record.price?.toLocaleString()}</p>
                </div>
              ) : (
                <div className="text-sm space-y-1">
                  <p><strong>Nome:</strong> {record.full_name}</p>
                  <p><strong>Email:</strong> {record.email || 'N/A'}</p>
                  <p><strong>Telefone:</strong> {record.phone || 'N/A'}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Enrich Button */}
          {!enrichedData && (
            <Button
              onClick={handleEnrich}
              disabled={enriching}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              {enriching ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  A enriquecer dados com IA...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Enriquecer com IA
                </>
              )}
            </Button>
          )}

          {/* Enrichment Results */}
          {enrichedData && (
            <>
              {type === "property" ? renderPropertyEnrichment() : renderContactEnrichment()}

              <div className="flex gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setEnrichedData(null);
                    setSelectedFields({});
                  }}
                  className="flex-1"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Re-analisar
                </Button>
                <Button
                  onClick={() => applyMutation.mutate()}
                  disabled={!hasSelectedFields || applyMutation.isPending}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {applyMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                  )}
                  Aplicar Selecionados
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EnrichmentField({ icon: Icon, label, currentValue, newValue, selected, onToggle }) {
  return (
    <div className={`p-3 border rounded-lg transition-colors ${selected ? 'border-green-500 bg-green-50' : ''}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Checkbox checked={selected} onCheckedChange={onToggle} />
          <Icon className="w-4 h-4 text-slate-500" />
          <span className="font-medium">{label}</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-slate-500">Atual:</span>
          <p className="text-slate-700">{currentValue}</p>
        </div>
        <div>
          <span className="text-green-600">Novo:</span>
          <p className="text-green-700 font-medium">{newValue}</p>
        </div>
      </div>
    </div>
  );
}