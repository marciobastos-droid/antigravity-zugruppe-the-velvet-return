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
- budget_min: Orçamento mínimo (número)
- budget_max: Orçamento máximo (número)
- property_types: Array de tipos de imóvel (house, apartment, townhouse, condo, land, commercial)
- listing_type: Tipo de negócio (sale, rent, both)
- bedrooms_min: Quartos mínimos (número)
- bedrooms_max: Quartos máximos (número)
- bathrooms_min: Casas de banho mínimas (número)
- area_min: Área mínima em m² (número)
- area_max: Área máxima em m² (número)
- locations: Array de localizações/cidades de interesse
- amenities: Array de comodidades desejadas (garagem, piscina, varanda, elevador, etc)
- additional_notes: Notas adicionais sobre requisitos`;
        schemaAddition = {
          budget_min: { type: "number" },
          budget_max: { type: "number" },
          property_types: { type: "array", items: { type: "string" } },
          listing_type: { type: "string" },
          bedrooms_min: { type: "number" },
          bedrooms_max: { type: "number" },
          bathrooms_min: { type: "number" },
          area_min: { type: "number" },
          area_max: { type: "number" },
          locations: { type: "array", items: { type: "string" } },
          amenities: { type: "array", items: { type: "string" } },
          additional_notes: { type: "string" }
        };
      } else if (leadType === "vendedor") {
        promptAddition = `- property_to_sell: Descrição do imóvel a vender`;
        schemaAddition = { property_to_sell: { type: "string" } };
      } else {
        // Parceiro - também pode ter requisitos de imóvel que procura para clientes
        promptAddition = `
- company_name: Nome da empresa
- partnership_type: Tipo de parceria (Angariador, Construtor, Investidor, Mediador, etc)
- specialization: Especialização ou área de atuação
- locations: Localizações onde atua ou procura imóveis

SE O PARCEIRO MENCIONAR REQUISITOS DE IMÓVEIS QUE PROCURA:
- budget_min: Orçamento mínimo (número)
- budget_max: Orçamento máximo (número)
- property_types: Array de tipos de imóvel (house, apartment, townhouse, condo, land, commercial)
- listing_type: Tipo de negócio (sale, rent, both)
- bedrooms_min: Quartos mínimos (número)
- bedrooms_max: Quartos máximos (número)
- bathrooms_min: Casas de banho mínimas (número)
- area_min: Área mínima em m² (número)
- area_max: Área máxima em m² (número)
- amenities: Array de comodidades desejadas
- additional_notes: Notas adicionais sobre requisitos`;
        schemaAddition = {
          company_name: { type: "string" },
          partnership_type: { type: "string" },
          specialization: { type: "string" },
          locations: { type: "array", items: { type: "string" } },
          budget_min: { type: "number" },
          budget_max: { type: "number" },
          property_types: { type: "array", items: { type: "string" } },
          listing_type: { type: "string" },
          bedrooms_min: { type: "number" },
          bedrooms_max: { type: "number" },
          bathrooms_min: { type: "number" },
          area_min: { type: "number" },
          area_max: { type: "number" },
          amenities: { type: "array", items: { type: "string" } },
          additional_notes: { type: "string" }
        };
      }
      
      const leadTypeLabels = {
        comprador: "comprador/cliente interessado em comprar imóvel",
        vendedor: "vendedor/proprietário que quer vender imóvel",
        parceiro: "parceiro de negócio/empresa imobiliária"
      };

      const extracted = await base44.integrations.Core.InvokeLLM({
        prompt: `Analise cuidadosamente o seguinte texto e extraia TODAS as informações disponíveis sobre este ${leadTypeLabels[leadType]}:

TEXTO:
${text}

INSTRUÇÕES:
- Extrai todos os dados de contacto: nome, email, telefone
- Extrai localização mencionada
- Resume a mensagem/pedido principal
${promptAddition}

Sê minucioso na extração, mesmo que os dados estejam implícitos no texto.`,
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

      // Also create a ClientContact with requirements
      const contactTypeMap = {
        'comprador': 'client',
        'vendedor': 'client',
        'parceiro': 'partner'
      };

      const contactData = {
        full_name: extracted.buyer_name,
        email: extracted.buyer_email || "",
        phone: extracted.buyer_phone || "",
        city: location || extracted.location || (extracted.locations?.[0]) || "",
        contact_type: contactTypeMap[leadType] || 'client',
        source: "other",
        notes: extracted.message || "",
        linked_opportunity_ids: []
      };

      if (leadType === "comprador") {
        opportunityData.budget = extracted.budget_max || extracted.budget_min || 0;
        opportunityData.property_type_interest = extracted.property_types?.[0] || "";
        
        // Add property requirements to contact - AI already extracted these
        contactData.property_requirements = {
          listing_type: extracted.listing_type || "sale",
          property_types: extracted.property_types || [],
          locations: extracted.locations?.length > 0 ? extracted.locations : (extracted.location ? [extracted.location] : []),
          budget_min: extracted.budget_min || 0,
          budget_max: extracted.budget_max || 0,
          bedrooms_min: extracted.bedrooms_min || null,
          bedrooms_max: extracted.bedrooms_max || null,
          bathrooms_min: extracted.bathrooms_min || null,
          area_min: extracted.area_min || null,
          area_max: extracted.area_max || null,
          amenities: extracted.amenities || [],
          additional_notes: extracted.additional_notes || ""
        };
        
        // Also create buyer profile for legacy compatibility
        await base44.entities.BuyerProfile.create({
          buyer_name: extracted.buyer_name,
          buyer_email: extracted.buyer_email || "",
          buyer_phone: extracted.buyer_phone || "",
          listing_type: extracted.listing_type || "sale",
          property_types: extracted.property_types || [],
          locations: extracted.locations?.length > 0 ? extracted.locations : (extracted.location ? [extracted.location] : []),
          budget_min: extracted.budget_min || 0,
          budget_max: extracted.budget_max || 0,
          bedrooms_min: extracted.bedrooms_min || 0,
          square_feet_min: extracted.area_min || 0,
          desired_amenities: extracted.amenities || [],
          additional_notes: extracted.additional_notes || "",
          status: "active"
        });
      } else if (leadType === "vendedor") {
        opportunityData.property_to_sell = extracted.property_to_sell || "";
        contactData.notes = `Imóvel a vender: ${extracted.property_to_sell || ""}\n\n${extracted.message || ""}`;
      } else {
        // Parceiro
        opportunityData.company_name = extracted.company_name || "";
        opportunityData.partnership_type = extracted.partnership_type || "";
        contactData.company_name = extracted.company_name || "";
        contactData.job_title = extracted.partnership_type || "";
        contactData.city = extracted.locations?.[0] || location || extracted.location || "";
        
        // Build detailed notes for partner
        const partnerNotes = [];
        if (extracted.partnership_type) partnerNotes.push(`Tipo de Parceria: ${extracted.partnership_type}`);
        if (extracted.company_name) partnerNotes.push(`Empresa: ${extracted.company_name}`);
        if (extracted.specialization) partnerNotes.push(`Especialização: ${extracted.specialization}`);
        if (extracted.locations?.length) partnerNotes.push(`Localizações de atuação: ${extracted.locations.join(", ")}`);
        if (extracted.message) partnerNotes.push(`\nMensagem:\n${extracted.message}`);
        
        contactData.notes = partnerNotes.join("\n");
        
        // Store partner requirements in property_requirements (including property search criteria if available)
        const hasPropertyRequirements = extracted.budget_min || extracted.budget_max || 
          extracted.property_types?.length || extracted.bedrooms_min || extracted.area_min;
        
        contactData.property_requirements = {
          listing_type: extracted.listing_type || "sale",
          property_types: extracted.property_types || [],
          locations: extracted.locations || [],
          budget_min: extracted.budget_min || 0,
          budget_max: extracted.budget_max || 0,
          bedrooms_min: extracted.bedrooms_min || null,
          bedrooms_max: extracted.bedrooms_max || null,
          bathrooms_min: extracted.bathrooms_min || null,
          area_min: extracted.area_min || null,
          area_max: extracted.area_max || null,
          amenities: extracted.amenities || [],
          additional_notes: `Tipo: ${extracted.partnership_type || "Parceiro"}\nEspecialização: ${extracted.specialization || ""}\n${extracted.additional_notes || ""}`
        };

        // Also set budget on opportunity for partner
        if (extracted.budget_max || extracted.budget_min) {
          opportunityData.budget = extracted.budget_max || extracted.budget_min || 0;
        }
      }

      // Check if contact already exists (by email or phone)
      let existingContact = null;
      if (extracted.buyer_email) {
        const contactsByEmail = await base44.entities.ClientContact.filter({ email: extracted.buyer_email });
        if (contactsByEmail.length > 0) {
          existingContact = contactsByEmail[0];
        }
      }
      if (!existingContact && extracted.buyer_phone) {
        const contactsByPhone = await base44.entities.ClientContact.filter({ phone: extracted.buyer_phone });
        if (contactsByPhone.length > 0) {
          existingContact = contactsByPhone[0];
        }
      }

      let contactId;
      if (existingContact) {
        // Update existing contact with new requirements if provided
        const updateData = {};
        if (contactData.property_requirements && Object.keys(contactData.property_requirements).length > 0) {
          updateData.property_requirements = contactData.property_requirements;
        }
        if (contactData.notes && !existingContact.notes?.includes(contactData.notes)) {
          updateData.notes = existingContact.notes 
            ? `${existingContact.notes}\n\n--- Nova entrada ---\n${contactData.notes}`
            : contactData.notes;
        }
        if (Object.keys(updateData).length > 0) {
          await base44.entities.ClientContact.update(existingContact.id, updateData);
        }
        contactId = existingContact.id;
      } else {
        // Create new ClientContact
        const createdContact = await base44.entities.ClientContact.create(contactData);
        contactId = createdContact?.id;
      }

      // Link opportunity to contact
      opportunityData.profile_id = contactId;
      const createdOpportunity = await base44.entities.Opportunity.create(opportunityData);

      // Update contact with opportunity link (append to existing array)
      if (contactId) {
        const existingOpportunityIds = existingContact?.linked_opportunity_ids || [];
        await base44.entities.ClientContact.update(contactId, {
          linked_opportunity_ids: [...existingOpportunityIds, createdOpportunity.id]
        });
      }

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
          action_url: "/CRMAdvanced"
        });
      }

      const requirementsExtracted = (
        extracted.budget_min || extracted.budget_max || 
        extracted.property_types?.length || extracted.locations?.length ||
        extracted.bedrooms_min || extracted.area_min ||
        extracted.amenities?.length
      ) || (leadType === "parceiro" && (
        extracted.partnership_type || extracted.company_name || 
        extracted.specialization
      ));

      setResult({
        success: true,
        data: extracted,
        property: property,
        profileCreated: leadType === "comprador",
        contactCreated: !existingContact,
        contactUpdated: !!existingContact,
        requirementsExtracted: requirementsExtracted,
        message: existingContact
          ? `Oportunidade adicionada ao contacto existente "${existingContact.full_name}"${requirementsExtracted ? " com requisitos atualizados!" : "!"}`
          : leadType === "comprador" 
            ? `Lead e contacto criados${requirementsExtracted ? " com requisitos de imóvel extraídos!" : "!"}`
            : leadType === "parceiro"
            ? "Lead e contacto de parceiro criados!"
            : "Lead e contacto criados!"
      });

      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['buyerProfiles'] });
      queryClient.invalidateQueries({ queryKey: ['clientContacts'] });
      toast.success("Lead e contacto criados!");

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
                      {(result.data.budget_min > 0 || result.data.budget_max > 0) && (
                        <div>
                          <p className="text-xs text-slate-500">Orçamento</p>
                          <p>
                            {result.data.budget_min > 0 && `€${result.data.budget_min.toLocaleString()}`}
                            {result.data.budget_min > 0 && result.data.budget_max > 0 && " - "}
                            {result.data.budget_max > 0 && `€${result.data.budget_max.toLocaleString()}`}
                          </p>
                        </div>
                      )}
                      {result.data.locations?.length > 0 && (
                        <div>
                          <p className="text-xs text-slate-500">Localizações</p>
                          <p>{result.data.locations.join(", ")}</p>
                        </div>
                      )}
                      {result.data.property_types?.length > 0 && (
                        <div>
                          <p className="text-xs text-slate-500">Tipos de Imóvel</p>
                          <p>{result.data.property_types.join(", ")}</p>
                        </div>
                      )}
                      {result.data.bedrooms_min > 0 && (
                        <div>
                          <p className="text-xs text-slate-500">Quartos</p>
                          <p>
                            {result.data.bedrooms_min}
                            {result.data.bedrooms_max > 0 && ` - ${result.data.bedrooms_max}`}
                          </p>
                        </div>
                      )}
                      {result.data.area_min > 0 && (
                        <div>
                          <p className="text-xs text-slate-500">Área</p>
                          <p>
                            {result.data.area_min}m²
                            {result.data.area_max > 0 && ` - ${result.data.area_max}m²`}
                          </p>
                        </div>
                      )}
                      {result.data.amenities?.length > 0 && (
                        <div className="col-span-2">
                          <p className="text-xs text-slate-500">Comodidades</p>
                          <p>{result.data.amenities.join(", ")}</p>
                        </div>
                      )}
                      {result.data.company_name && (
                        <div>
                          <p className="text-xs text-slate-500">Empresa</p>
                          <p>{result.data.company_name}</p>
                        </div>
                      )}
                      {result.data.partnership_type && (
                        <div>
                          <p className="text-xs text-slate-500">Tipo de Parceria</p>
                          <p>{result.data.partnership_type}</p>
                        </div>
                      )}
                      {result.data.specialization && (
                        <div>
                          <p className="text-xs text-slate-500">Especialização</p>
                          <p>{result.data.specialization}</p>
                        </div>
                      )}
                      </div>
                    {result.requirementsExtracted && (
                      <div className="mt-3 pt-3 border-t border-slate-200">
                        <p className="text-xs text-green-600 font-medium">
                          ✅ Requisitos de imóvel extraídos e guardados no contacto
                        </p>
                      </div>
                    )}
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