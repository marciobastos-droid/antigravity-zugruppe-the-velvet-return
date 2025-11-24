import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Loader2, CheckCircle2, AlertCircle, User, Building, Users, Home, MapPin } from "lucide-react";
import { toast } from "sonner";

export default function ImportLeads() {
  const queryClient = useQueryClient();
  const [leadType, setLeadType] = React.useState("comprador");
  const [text, setText] = React.useState("");
  const [propertyId, setPropertyId] = React.useState("");
  const [location, setLocation] = React.useState("");
  const [processing, setProcessing] = React.useState(false);
  const [result, setResult] = React.useState(null);

  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list('-created_date')
  });

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me(),
  });

  const myProperties = properties.filter(p => p.created_by === user?.email);

  const processText = async () => {
    setProcessing(true);
    setResult(null);

    try {
      const property = propertyId ? properties.find(p => p.id === propertyId) : null;
      
      let promptAddition = "";
      let schemaAddition = {};
      
      if (leadType === "comprador") {
        promptAddition = `
- budget: Orçamento (número)
- property_type_interest: Tipo de imóvel
- bedrooms_min: Quartos mínimos
- locations: Array de localizações`;
        schemaAddition = {
          budget: { type: "number" },
          property_type_interest: { type: "string" },
          bedrooms_min: { type: "number" },
          locations: { type: "array", items: { type: "string" } }
        };
      } else if (leadType === "vendedor") {
        promptAddition = `- property_to_sell: Descrição do imóvel a vender`;
        schemaAddition = { property_to_sell: { type: "string" } };
      } else {
        promptAddition = `
- company_name: Nome da empresa
- partnership_type: Tipo de parceria`;
        schemaAddition = {
          company_name: { type: "string" },
          partnership_type: { type: "string" }
        };
      }
      
      const extracted = await base44.integrations.Core.InvokeLLM({
        prompt: `Analise o texto e extraia informações de ${leadType}:

${text}

Extrair: buyer_name, buyer_email, buyer_phone, location, message${promptAddition}`,
        response_json_schema: {
          type: "object",
          properties: {
            buyer_name: { type: "string" },
            buyer_email: { type: "string" },
            buyer_phone: { type: "string" },
            location: { type: "string" },
            message: { type: "string" },
            ...schemaAddition
          },
          required: ["buyer_name", "message"]
        }
      });

      if (!extracted.buyer_name || !extracted.message) {
        throw new Error("Informação insuficiente");
      }

      if (extracted.buyer_email && !extracted.buyer_email.includes('@')) {
        extracted.buyer_email = "";
      }

      const opportunityData = {
        lead_type: leadType,
        property_id: property?.id || "",
        property_title: property?.title || "Sem imóvel associado",
        seller_email: property?.created_by || user?.email || "",
        buyer_name: extracted.buyer_name,
        buyer_email: extracted.buyer_email || "",
        buyer_phone: extracted.buyer_phone || "",
        location: location || extracted.location || "",
        message: extracted.message,
        status: "new",
        follow_ups: []
      };

      if (leadType === "comprador") {
        opportunityData.budget = extracted.budget || 0;
        opportunityData.property_type_interest = extracted.property_type_interest || "";
        
        await base44.entities.BuyerProfile.create({
          buyer_name: extracted.buyer_name,
          buyer_email: extracted.buyer_email || "",
          buyer_phone: extracted.buyer_phone || "",
          listing_type: "sale",
          property_types: extracted.property_type_interest ? [extracted.property_type_interest] : [],
          locations: extracted.locations && extracted.locations.length > 0 ? extracted.locations : (extracted.location ? [extracted.location] : []),
          budget_min: 0,
          budget_max: extracted.budget || 0,
          bedrooms_min: extracted.bedrooms_min || 0,
          status: "active"
        });
      } else if (leadType === "vendedor") {
        opportunityData.property_to_sell = extracted.property_to_sell || "";
      } else {
        opportunityData.company_name = extracted.company_name || "";
        opportunityData.partnership_type = extracted.partnership_type || "";
      }

      const createdOpportunity = await base44.entities.Opportunity.create(opportunityData);

      // Create notification for imported lead
      if (user) {
        await base44.entities.Notification.create({
          title: "Novo Lead Importado",
          message: `Lead "${extracted.buyer_name}" foi importado com sucesso`,
          type: "lead",
          priority: "medium",
          user_email: user.email,
          related_type: "Opportunity",
          related_id: createdOpportunity.id,
          action_url: "/Opportunities"
        });
      }

      setResult({
        success: true,
        data: extracted,
        property: property,
        profileCreated: leadType === "comprador",
        message: leadType === "comprador" 
          ? "Oportunidade criada e perfil de cliente gerado!"
          : "Oportunidade criada com sucesso!"
      });

      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['buyerProfiles'] });
      toast.success("Lead criado!");

    } catch (error) {
      setResult({
        success: false,
        message: error.message || "Erro ao processar"
      });
      toast.error("Erro ao criar lead");
    }

    setProcessing(false);
  };

  const leadTypeConfig = {
    comprador: { icon: User, color: "from-blue-600 to-cyan-600", description: "Interessado em comprar" },
    vendedor: { icon: Building, color: "from-green-600 to-emerald-600", description: "Quer vender" },
    parceiro: { icon: Users, color: "from-purple-600 to-pink-600", description: "Proposta de parceria" }
  };

  const config = leadTypeConfig[leadType];
  const Icon = config.icon;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Tipo de Lead
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {Object.entries(leadTypeConfig).map(([type, typeConfig]) => {
              const TypeIcon = typeConfig.icon;
              return (
                <button
                  key={type}
                  onClick={() => setLeadType(type)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    leadType === type ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className={`w-10 h-10 bg-gradient-to-br ${typeConfig.color} rounded-lg flex items-center justify-center mx-auto mb-2`}>
                    <TypeIcon className="w-5 h-5 text-white" />
                  </div>
                  <p className="font-semibold text-slate-900 capitalize">{type}</p>
                  <p className="text-xs text-slate-600 mt-1">{typeConfig.description}</p>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="w-5 h-5" />
            Imóvel (Opcional)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={propertyId} onValueChange={setPropertyId}>
            <SelectTrigger>
              <SelectValue placeholder="Sem imóvel associado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>Sem imóvel</SelectItem>
              {properties.filter(p => p.status === 'active').map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.title} - {p.city} - €{p.price?.toLocaleString()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-slate-600 mt-2">
            Associe um imóvel específico a este lead (opcional)
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Localização (Opcional)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Ex: Lisboa, Porto..."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cole o Texto</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`Cole aqui qualquer texto sobre o ${leadType}...`}
            rows={10}
            className="text-sm"
          />

          <Button
            onClick={processText}
            disabled={processing || !text}
            className={`w-full bg-gradient-to-r ${config.color}`}
          >
            {processing ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                A processar com IA...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                Processar e Criar Lead
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card className={result.success ? "border-green-500 border-2" : "border-red-500 border-2"}>
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              {result.success ? (
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              ) : (
                <AlertCircle className="w-8 h-8 text-red-600" />
              )}
              <div className="flex-1">
                <h3 className={`text-xl font-bold mb-2 ${result.success ? "text-green-900" : "text-red-900"}`}>
                  {result.success ? "✅ Lead Criado!" : "❌ Erro"}
                </h3>
                <p className="text-slate-700 mb-4">{result.message}</p>
                
                {result.success && result.data && (
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                    <h4 className="font-semibold text-slate-900 mb-3">Dados Extraídos:</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-slate-500">Nome</p>
                        <p className="font-semibold">{result.data.buyer_name}</p>
                      </div>
                      {result.data.buyer_email && (
                        <div>
                          <p className="text-xs text-slate-500">Email</p>
                          <p>{result.data.buyer_email}</p>
                        </div>
                      )}
                      {result.data.buyer_phone && (
                        <div>
                          <p className="text-xs text-slate-500">Telefone</p>
                          <p>{result.data.buyer_phone}</p>
                        </div>
                      )}
                      {result.data.budget > 0 && (
                        <div>
                          <p className="text-xs text-slate-500">Orçamento</p>
                          <p>€{result.data.budget.toLocaleString()}</p>
                        </div>
                      )}
                    </div>
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