import React from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Upload, Loader2, CheckCircle2, Info } from "lucide-react";
import { toast } from "sonner";

export default function DSARRequestForm({ onSuccess }) {
  const [formData, setFormData] = React.useState({
    request_type: "access",
    requester_name: "",
    requester_email: "",
    requester_phone: "",
    description: ""
  });
  const [identificationFile, setIdentificationFile] = React.useState(null);
  const [submitted, setSubmitted] = React.useState(false);

  const submitMutation = useMutation({
    mutationFn: async (data) => {
      let identificationUrl = null;
      
      // Upload do documento de identificação
      if (identificationFile) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: identificationFile });
        identificationUrl = file_url;
      }

      // Calcular prazo (30 dias)
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 30);

      // Criar pedido DSAR
      const dsarRequest = await base44.entities.DSARRequest.create({
        ...data,
        identification_document: identificationUrl,
        status: "pending_validation",
        deadline_date: deadline.toISOString()
      });

      // Registar no log RGPD
      await base44.entities.GDPRLog.create({
        contact_email: data.requester_email,
        action_type: `data_${data.request_type}_request`,
        description: `Pedido de ${getRequestTypeLabel(data.request_type).toLowerCase()} submetido`,
        legal_basis: "consent",
        request_status: "pending",
        metadata: {
          dsar_request_id: dsarRequest.id
        }
      });

      // Notificar administradores
      await base44.functions.invoke('sendGmail', {
        to: "info@zuconnect.pt",
        subject: `Novo Pedido RGPD - ${getRequestTypeLabel(data.request_type)}`,
        body: `
Novo pedido RGPD recebido:

Tipo: ${getRequestTypeLabel(data.request_type)}
Nome: ${data.requester_name}
Email: ${data.requester_email}
Prazo legal: ${deadline.toLocaleDateString('pt-PT')}

Descrição:
${data.description}

Por favor, processe este pedido no painel de administração RGPD.
        `
      });

      return dsarRequest;
    },
    onSuccess: () => {
      setSubmitted(true);
      toast.success("Pedido submetido com sucesso");
      onSuccess?.();
    },
    onError: (error) => {
      toast.error("Erro ao submeter pedido: " + error.message);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    submitMutation.mutate(formData);
  };

  const getRequestTypeLabel = (type) => {
    const labels = {
      access: "Acesso aos Dados",
      rectification: "Retificação de Dados",
      erasure: "Eliminação de Dados (Direito ao Esquecimento)",
      restriction: "Limitação do Tratamento",
      portability: "Portabilidade de Dados",
      objection: "Oposição ao Tratamento"
    };
    return labels[type] || type;
  };

  if (submitted) {
    return (
      <Card className="border-2 border-green-200">
        <CardContent className="pt-6 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Pedido Submetido</h3>
          <p className="text-slate-600 mb-4">
            Recebemos o seu pedido e iremos processá-lo dentro do prazo legal de 30 dias.
            Receberá uma confirmação por email.
          </p>
          <Button onClick={() => setSubmitted(false)} variant="outline">
            Submeter Outro Pedido
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-blue-200">
      <CardHeader className="bg-blue-50">
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-600" />
          Exercer Direitos RGPD
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Info Box */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-2">Os seus direitos RGPD:</p>
                <ul className="space-y-1 text-xs">
                  <li><strong>Acesso:</strong> Saber que dados temos sobre si</li>
                  <li><strong>Retificação:</strong> Corrigir dados incorretos</li>
                  <li><strong>Eliminação:</strong> Apagar os seus dados (direito ao esquecimento)</li>
                  <li><strong>Limitação:</strong> Restringir o tratamento dos seus dados</li>
                  <li><strong>Portabilidade:</strong> Receber os seus dados em formato estruturado</li>
                  <li><strong>Oposição:</strong> Opor-se ao tratamento dos seus dados</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Tipo de Pedido */}
          <div>
            <Label>Tipo de Pedido *</Label>
            <Select 
              value={formData.request_type} 
              onValueChange={(v) => setFormData({...formData, request_type: v})}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="access">Acesso aos Dados</SelectItem>
                <SelectItem value="rectification">Retificação de Dados</SelectItem>
                <SelectItem value="erasure">Eliminação de Dados</SelectItem>
                <SelectItem value="restriction">Limitação do Tratamento</SelectItem>
                <SelectItem value="portability">Portabilidade de Dados</SelectItem>
                <SelectItem value="objection">Oposição ao Tratamento</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Dados Pessoais */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Nome Completo *</Label>
              <Input
                value={formData.requester_name}
                onChange={(e) => setFormData({...formData, requester_name: e.target.value})}
                required
              />
            </div>
            <div>
              <Label>Email *</Label>
              <Input
                type="email"
                value={formData.requester_email}
                onChange={(e) => setFormData({...formData, requester_email: e.target.value})}
                required
              />
            </div>
          </div>

          <div>
            <Label>Telefone</Label>
            <Input
              type="tel"
              value={formData.requester_phone}
              onChange={(e) => setFormData({...formData, requester_phone: e.target.value})}
              placeholder="+351 912 345 678"
            />
          </div>

          {/* Descrição */}
          <div>
            <Label>Descrição do Pedido</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              rows={4}
              placeholder="Descreva o seu pedido em detalhe..."
            />
          </div>

          {/* Upload de Identificação */}
          <div>
            <Label>Documento de Identificação *</Label>
            <p className="text-xs text-slate-600 mb-2">
              Para validar a sua identidade, anexe cópia do CC, Passaporte ou documento oficial
            </p>
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 hover:border-blue-400 transition-colors">
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setIdentificationFile(e.target.files[0])}
                className="w-full text-sm"
                required
              />
              {identificationFile && (
                <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  {identificationFile.name}
                </p>
              )}
            </div>
          </div>

          {/* Aviso de Prazo */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <p className="text-xs text-slate-700">
              <strong>Prazo legal:</strong> Responderemos ao seu pedido no prazo de 30 dias.
              Em casos complexos, poderemos prorrogar por mais 60 dias, informando-o do motivo.
            </p>
          </div>

          {/* Submit */}
          <Button 
            type="submit" 
            className="w-full bg-blue-600 hover:bg-blue-700"
            disabled={submitMutation.isPending}
          >
            {submitMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                A submeter...
              </>
            ) : (
              <>
                <Shield className="w-4 h-4 mr-2" />
                Submeter Pedido
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}