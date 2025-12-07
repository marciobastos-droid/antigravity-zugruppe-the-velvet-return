import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText, CheckCircle2, Calendar, Building2, User, AlertCircle, Sparkles, Bell, Download } from "lucide-react";
import { toast } from "sonner";

export default function ContractAutomation() {
  const queryClient = useQueryClient();
  const [contractType, setContractType] = useState("sale"); // sale, purchase, lease
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [selectedOpportunity, setSelectedOpportunity] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [generatedContract, setGeneratedContract] = useState(null);
  
  const [contractData, setContractData] = useState({
    party_a_name: "",
    party_a_email: "",
    party_a_phone: "",
    party_a_nif: "",
    party_b_name: "",
    party_b_email: "",
    party_b_phone: "",
    party_b_nif: "",
    contract_value: "",
    deposit_amount: "",
    signature_date: "",
    deed_date: "",
    start_date: "",
    end_date: "",
    monthly_value: "",
    notes: ""
  });

  const { data: properties = [] } = useQuery({
    queryKey: ['propertiesForContract'],
    queryFn: () => base44.entities.Property.filter({ status: "active" })
  });

  const { data: opportunities = [] } = useQuery({
    queryKey: ['opportunitiesForContract'],
    queryFn: () => base44.entities.Opportunity.list('-created_date')
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const createContractMutation = useMutation({
    mutationFn: async (contractData) => {
      return await base44.entities.Contract.create(contractData);
    },
    onSuccess: async (createdContract) => {
      // Criar notificações para datas importantes
      const notifications = [];
      
      if (createdContract.signature_date) {
        const signatureDate = new Date(createdContract.signature_date);
        const reminderDate = new Date(signatureDate);
        reminderDate.setDate(reminderDate.getDate() - 3);
        
        notifications.push({
          type: "contract_signature",
          title: "Assinatura de Contrato",
          message: `Contrato ${createdContract.contract_type === 'sale' ? 'de venda' : createdContract.contract_type === 'lease' ? 'de arrendamento' : 'de compra'} - ${createdContract.property_title} - Assinatura agendada`,
          priority: "high",
          target_date: createdContract.signature_date,
          related_entity: "Contract",
          related_entity_id: createdContract.id,
          assigned_to: user?.email
        });
      }

      if (createdContract.deed_date) {
        const deedDate = new Date(createdContract.deed_date);
        const reminderDate = new Date(deedDate);
        reminderDate.setDate(reminderDate.getDate() - 7);
        
        notifications.push({
          type: "deed_date",
          title: "Escritura Agendada",
          message: `Escritura do imóvel ${createdContract.property_title} - ${deedDate.toLocaleDateString('pt-PT')}`,
          priority: "high",
          target_date: createdContract.deed_date,
          related_entity: "Contract",
          related_entity_id: createdContract.id,
          assigned_to: user?.email
        });
      }

      if (createdContract.end_date && contractType === 'lease') {
        const endDate = new Date(createdContract.end_date);
        const reminderDate = new Date(endDate);
        reminderDate.setDate(reminderDate.getDate() - 30);
        
        notifications.push({
          type: "contract_renewal",
          title: "Renovação de Contrato",
          message: `Contrato de arrendamento ${createdContract.property_title} - Termina em ${endDate.toLocaleDateString('pt-PT')}`,
          priority: "medium",
          target_date: createdContract.end_date,
          related_entity: "Contract",
          related_entity_id: createdContract.id,
          assigned_to: user?.email
        });
      }

      // Criar notificações
      for (const notif of notifications) {
        try {
          await base44.entities.Notification.create(notif);
        } catch (error) {
          console.error("Erro ao criar notificação:", error);
        }
      }

      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toast.success(`Contrato criado com ${notifications.length} alertas automáticos!`);
    }
  });

  // Auto-preencher dados quando selecionar imóvel
  React.useEffect(() => {
    if (selectedProperty) {
      const property = properties.find(p => p.id === selectedProperty);
      if (property) {
        setContractData(prev => ({
          ...prev,
          contract_value: property.price || "",
          deposit_amount: property.price ? Math.round(property.price * 0.1) : "", // 10% default
        }));
      }
    }
  }, [selectedProperty, properties]);

  // Auto-preencher dados quando selecionar oportunidade
  React.useEffect(() => {
    if (selectedOpportunity) {
      const opp = opportunities.find(o => o.id === selectedOpportunity);
      if (opp) {
        setContractData(prev => ({
          ...prev,
          party_b_name: opp.buyer_name || "",
          party_b_email: opp.buyer_email || "",
          party_b_phone: opp.buyer_phone || ""
        }));
      }
    }
  }, [selectedOpportunity, opportunities]);

  const generateContractDocument = async () => {
    if (!selectedProperty) {
      toast.error("Selecione um imóvel");
      return;
    }

    if (!contractData.party_a_name || !contractData.party_b_name) {
      toast.error("Preencha os dados das partes");
      return;
    }

    setGenerating(true);

    try {
      const property = properties.find(p => p.id === selectedProperty);
      
      const contractPrompt = contractType === 'sale' ? `
Gera um CONTRATO DE PROMESSA DE COMPRA E VENDA profissional em português de Portugal.

DADOS DO IMÓVEL:
- Tipo: ${property.property_type}
- Morada: ${property.address}, ${property.city}, ${property.state}
- Valor: €${contractData.contract_value}
- Referência: ${property.ref_id}

PRIMEIRA PARTE (Promitente Vendedor):
- Nome: ${contractData.party_a_name}
- NIF: ${contractData.party_a_nif || 'A preencher'}
- Email: ${contractData.party_a_email}
- Telefone: ${contractData.party_a_phone}

SEGUNDA PARTE (Promitente Comprador):
- Nome: ${contractData.party_b_name}
- NIF: ${contractData.party_b_nif || 'A preencher'}
- Email: ${contractData.party_b_email}
- Telefone: ${contractData.party_b_phone}

CONDIÇÕES FINANCEIRAS:
- Valor total: €${contractData.contract_value}
- Sinal: €${contractData.deposit_amount}
- Data de assinatura: ${contractData.signature_date || 'A definir'}
- Data da escritura: ${contractData.deed_date || 'A definir'}

INSTRUÇÕES:
1. Cria um contrato completo e profissional
2. Inclui todas as cláusulas essenciais
3. Linguagem jurídica formal portuguesa
4. Estrutura clara com numeração de cláusulas
5. Inclui cláusulas sobre: sinal, prazo, escritura, incumprimento, despesas
6. Formato pronto para impressão e assinatura
7. Inclui local para assinaturas das partes no final

Retorna apenas o texto do contrato completo.
` : contractType === 'lease' ? `
Gera um CONTRATO DE ARRENDAMENTO profissional em português de Portugal.

DADOS DO IMÓVEL:
- Tipo: ${property.property_type}
- Morada: ${property.address}, ${property.city}, ${property.state}
- Renda mensal: €${contractData.monthly_value}
- Referência: ${property.ref_id}

SENHORIO:
- Nome: ${contractData.party_a_name}
- NIF: ${contractData.party_a_nif || 'A preencher'}
- Email: ${contractData.party_a_email}

ARRENDATÁRIO:
- Nome: ${contractData.party_b_name}
- NIF: ${contractData.party_b_nif || 'A preencher'}
- Email: ${contractData.party_b_email}

CONDIÇÕES:
- Renda mensal: €${contractData.monthly_value}
- Caução: €${contractData.deposit_amount || contractData.monthly_value * 2}
- Data de início: ${contractData.start_date}
- Data de fim: ${contractData.end_date || 'Indeterminado'}

INSTRUÇÕES:
1. Cria um contrato de arrendamento completo
2. Inclui cláusulas de: renda, caução, prazo, obras, rescisão, responsabilidades
3. Conforme legislação portuguesa
4. Linguagem jurídica formal
5. Estrutura clara numerada
6. Formato pronto para assinatura

Retorna apenas o texto do contrato.
` : "";

      const contractText = await base44.integrations.Core.InvokeLLM({
        prompt: contractPrompt
      });

      setGeneratedContract(contractText);
      toast.success("Contrato gerado com IA!");

    } catch (error) {
      toast.error("Erro ao gerar contrato");
      console.error(error);
    }

    setGenerating(false);
  };

  const saveContract = async () => {
    if (!selectedProperty || !generatedContract) {
      toast.error("Gere primeiro o contrato");
      return;
    }

    const property = properties.find(p => p.id === selectedProperty);
    
    const contractToSave = {
      contract_type: contractType,
      property_id: selectedProperty,
      property_title: property.title,
      property_address: `${property.address}, ${property.city}`,
      status: "draft",
      contract_value: Number(contractData.contract_value),
      monthly_value: contractData.monthly_value ? Number(contractData.monthly_value) : undefined,
      party_a_name: contractData.party_a_name,
      party_a_email: contractData.party_a_email,
      party_a_phone: contractData.party_a_phone,
      party_a_nif: contractData.party_a_nif,
      party_b_name: contractData.party_b_name,
      party_b_email: contractData.party_b_email,
      party_b_phone: contractData.party_b_phone,
      party_b_nif: contractData.party_b_nif,
      deposit_amount: contractData.deposit_amount ? Number(contractData.deposit_amount) : undefined,
      signature_date: contractData.signature_date || undefined,
      deed_date: contractData.deed_date || undefined,
      start_date: contractData.start_date || undefined,
      end_date: contractData.end_date || undefined,
      notes: `CONTRATO GERADO AUTOMATICAMENTE:\n\n${generatedContract}\n\n${contractData.notes || ''}`
    };

    createContractMutation.mutate(contractToSave);
  };

  return (
    <div className="space-y-6">
      <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            Automação de Contratos
          </CardTitle>
          <p className="text-sm text-slate-600">
            Gere contratos automaticamente com dados do imóvel e cliente + alertas de datas importantes
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Contract Type */}
          <div>
            <Label>Tipo de Contrato</Label>
            <Select value={contractType} onValueChange={setContractType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sale">Promessa de Compra e Venda (CPCV)</SelectItem>
                <SelectItem value="lease">Contrato de Arrendamento</SelectItem>
                <SelectItem value="purchase">Contrato de Compra</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Property Selection */}
          <div>
            <Label className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Imóvel *
            </Label>
            <Select value={selectedProperty || ""} onValueChange={setSelectedProperty}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o imóvel..." />
              </SelectTrigger>
              <SelectContent>
                {properties.map(property => (
                  <SelectItem key={property.id} value={property.id}>
                    {property.title} - {property.city} - €{property.price?.toLocaleString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Opportunity Selection */}
          <div>
            <Label className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Cliente (Oportunidade)
            </Label>
            <Select value={selectedOpportunity || ""} onValueChange={setSelectedOpportunity}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma oportunidade (opcional)..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>Nenhuma</SelectItem>
                {opportunities.filter(o => o.property_id === selectedProperty).map(opp => (
                  <SelectItem key={opp.id} value={opp.id}>
                    {opp.buyer_name} - {opp.buyer_email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Party A (Seller/Landlord) */}
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">
                {contractType === 'lease' ? 'Senhorio (Primeira Parte)' : 'Vendedor (Primeira Parte)'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Nome *</Label>
                  <Input
                    value={contractData.party_a_name}
                    onChange={(e) => setContractData({...contractData, party_a_name: e.target.value})}
                    placeholder="Nome completo"
                  />
                </div>
                <div>
                  <Label className="text-xs">NIF *</Label>
                  <Input
                    value={contractData.party_a_nif}
                    onChange={(e) => setContractData({...contractData, party_a_nif: e.target.value})}
                    placeholder="000000000"
                  />
                </div>
                <div>
                  <Label className="text-xs">Email</Label>
                  <Input
                    type="email"
                    value={contractData.party_a_email}
                    onChange={(e) => setContractData({...contractData, party_a_email: e.target.value})}
                    placeholder="email@exemplo.com"
                  />
                </div>
                <div>
                  <Label className="text-xs">Telefone</Label>
                  <Input
                    value={contractData.party_a_phone}
                    onChange={(e) => setContractData({...contractData, party_a_phone: e.target.value})}
                    placeholder="+351 912 345 678"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Party B (Buyer/Tenant) */}
          <Card className="border-green-200 bg-green-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">
                {contractType === 'lease' ? 'Inquilino (Segunda Parte)' : 'Comprador (Segunda Parte)'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Nome *</Label>
                  <Input
                    value={contractData.party_b_name}
                    onChange={(e) => setContractData({...contractData, party_b_name: e.target.value})}
                    placeholder="Nome completo"
                  />
                </div>
                <div>
                  <Label className="text-xs">NIF *</Label>
                  <Input
                    value={contractData.party_b_nif}
                    onChange={(e) => setContractData({...contractData, party_b_nif: e.target.value})}
                    placeholder="000000000"
                  />
                </div>
                <div>
                  <Label className="text-xs">Email</Label>
                  <Input
                    type="email"
                    value={contractData.party_b_email}
                    onChange={(e) => setContractData({...contractData, party_b_email: e.target.value})}
                    placeholder="email@exemplo.com"
                  />
                </div>
                <div>
                  <Label className="text-xs">Telefone</Label>
                  <Input
                    value={contractData.party_b_phone}
                    onChange={(e) => setContractData({...contractData, party_b_phone: e.target.value})}
                    placeholder="+351 912 345 678"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Financial & Dates */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Condições Financeiras e Datas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">
                    {contractType === 'lease' ? 'Renda Mensal (€)' : 'Valor Total (€)'} *
                  </Label>
                  <Input
                    type="number"
                    value={contractType === 'lease' ? contractData.monthly_value : contractData.contract_value}
                    onChange={(e) => contractType === 'lease' 
                      ? setContractData({...contractData, monthly_value: e.target.value})
                      : setContractData({...contractData, contract_value: e.target.value})}
                    placeholder="250000"
                  />
                </div>
                <div>
                  <Label className="text-xs">
                    {contractType === 'lease' ? 'Caução (€)' : 'Sinal/Depósito (€)'}
                  </Label>
                  <Input
                    type="number"
                    value={contractData.deposit_amount}
                    onChange={(e) => setContractData({...contractData, deposit_amount: e.target.value})}
                    placeholder={contractType === 'lease' ? "2 meses de renda" : "10% do valor"}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Data de Assinatura
                  </Label>
                  <Input
                    type="date"
                    value={contractData.signature_date}
                    onChange={(e) => setContractData({...contractData, signature_date: e.target.value})}
                  />
                </div>
                {contractType === 'sale' && (
                  <div>
                    <Label className="text-xs flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Data da Escritura
                    </Label>
                    <Input
                      type="date"
                      value={contractData.deed_date}
                      onChange={(e) => setContractData({...contractData, deed_date: e.target.value})}
                    />
                  </div>
                )}
              </div>

              {contractType === 'lease' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Data de Início</Label>
                    <Input
                      type="date"
                      value={contractData.start_date}
                      onChange={(e) => setContractData({...contractData, start_date: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Data de Fim</Label>
                    <Input
                      type="date"
                      value={contractData.end_date}
                      onChange={(e) => setContractData({...contractData, end_date: e.target.value})}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          <div>
            <Label className="text-xs">Notas/Condições Especiais</Label>
            <Textarea
              value={contractData.notes}
              onChange={(e) => setContractData({...contractData, notes: e.target.value})}
              placeholder="Condições ou cláusulas especiais a incluir..."
              rows={3}
            />
          </div>

          {/* Generate Button */}
          <Button
            onClick={generateContractDocument}
            disabled={generating || !selectedProperty || !contractData.party_a_name || !contractData.party_b_name}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                A gerar contrato com IA...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Gerar Contrato Automático
              </>
            )}
          </Button>

          {/* Alerts Info */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Bell className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-amber-900">
                <p className="font-medium mb-1">Alertas Automáticos</p>
                <p className="text-amber-700">
                  ✓ Lembrete 3 dias antes da assinatura<br />
                  ✓ Lembrete 7 dias antes da escritura<br />
                  ✓ Lembrete 30 dias antes do fim do contrato (arrendamento)
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Generated Contract Preview */}
      {generatedContract && (
        <Card className="border-green-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                Contrato Gerado
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const blob = new Blob([generatedContract], { type: 'text/plain' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `contrato_${contractType}_${selectedProperty}.txt`;
                    a.click();
                    window.URL.revokeObjectURL(url);
                  }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Descarregar
                </Button>
                <Button
                  onClick={saveContract}
                  disabled={createContractMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {createContractMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      A guardar...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Guardar Contrato
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-white border border-slate-200 rounded-lg p-6 max-h-96 overflow-y-auto">
              <pre className="whitespace-pre-wrap text-sm text-slate-900 font-serif">
                {generatedContract}
              </pre>
            </div>
            
            {/* Important Dates Summary */}
            {(contractData.signature_date || contractData.deed_date || contractData.end_date) && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm font-medium text-blue-900 mb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Datas Importantes (Alertas Automáticos)
                </p>
                <div className="space-y-1 text-xs text-blue-700">
                  {contractData.signature_date && (
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-white">
                        Assinatura: {new Date(contractData.signature_date).toLocaleDateString('pt-PT')}
                      </Badge>
                      <span className="text-xs text-blue-600">→ Alerta 3 dias antes</span>
                    </div>
                  )}
                  {contractData.deed_date && (
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-white">
                        Escritura: {new Date(contractData.deed_date).toLocaleDateString('pt-PT')}
                      </Badge>
                      <span className="text-xs text-blue-600">→ Alerta 7 dias antes</span>
                    </div>
                  )}
                  {contractData.end_date && (
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-white">
                        Fim/Renovação: {new Date(contractData.end_date).toLocaleDateString('pt-PT')}
                      </Badge>
                      <span className="text-xs text-blue-600">→ Alerta 30 dias antes</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card className="border-slate-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-slate-700">
              <p className="font-medium text-slate-900 mb-1">Como funciona:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Selecione o imóvel e tipo de contrato</li>
                <li>Preencha os dados das partes (auto-preenchido se selecionar oportunidade)</li>
                <li>Defina valores e datas importantes</li>
                <li>A IA gera um contrato profissional completo</li>
                <li>Alertas automáticos são criados para todas as datas importantes</li>
                <li>Guarde o contrato no sistema para acompanhamento</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}