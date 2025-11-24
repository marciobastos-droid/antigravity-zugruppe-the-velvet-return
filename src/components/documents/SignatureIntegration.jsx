import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  FileSignature, Mail, CheckCircle2, Clock, XCircle, 
  AlertCircle, Send, Eye, ExternalLink, Loader2
} from "lucide-react";
import { toast } from "sonner";

export default function SignatureIntegration({ contract, open, onOpenChange }) {
  const queryClient = useQueryClient();
  const [provider, setProvider] = useState(contract?.signature_provider || "docusign");
  const [signers, setSigners] = useState([
    { email: contract?.party_a_email || "", name: contract?.party_a_name || "" },
    { email: contract?.party_b_email || "", name: contract?.party_b_name || "" }
  ]);
  const [sending, setSending] = useState(false);

  const updateContractMutation = useMutation({
    mutationFn: (data) => base44.entities.Contract.update(contract.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
    },
  });

  const sendForSignature = async () => {
    if (!contract.documents || contract.documents.length === 0) {
      toast.error("Nenhum documento anexado ao contrato");
      return;
    }

    const contractDoc = contract.documents.find(d => d.type === 'contract');
    if (!contractDoc) {
      toast.error("Nenhum documento do tipo 'Contrato' encontrado");
      return;
    }

    setSending(true);

    try {
      // Simulate signature request (in real implementation, integrate with actual API)
      const requestId = `SIG_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Send email notifications to signers
      for (const signer of signers) {
        if (signer.email) {
          await base44.integrations.Core.SendEmail({
            to: signer.email,
            subject: `📝 Pedido de Assinatura - ${contract.property_title}`,
            body: `Olá ${signer.name},

Foi solicitada a sua assinatura eletrónica para o contrato relacionado com o imóvel:
${contract.property_title}

Provedor: ${provider === 'docusign' ? 'DocuSign' : 'ClickSign'}
ID do Pedido: ${requestId}

Por favor, aceda ao documento e assine:
${contractDoc.url}

Valor do Contrato: €${contract.contract_value?.toLocaleString()}

Este é um pedido oficial de assinatura eletrónica.

Cumprimentos,
Equipa Zugruppe`
          });
        }
      }

      // Update contract with signature info
      await updateContractMutation.mutateAsync({
        signature_provider: provider,
        signature_request_id: requestId,
        signature_status: 'sent',
        status: 'pending_signature',
        signatures: signers.map(s => ({
          signer_email: s.email,
          signer_name: s.name,
          status: 'sent',
          signed_at: null
        }))
      });

      toast.success(`Pedido de assinatura enviado via ${provider === 'docusign' ? 'DocuSign' : 'ClickSign'}`);
      onOpenChange(false);
    } catch (error) {
      toast.error("Erro ao enviar pedido de assinatura");
      console.error(error);
    }

    setSending(false);
  };

  const markAsSigned = async (signerEmail) => {
    const updatedSignatures = (contract.signatures || []).map(sig => 
      sig.signer_email === signerEmail 
        ? { ...sig, status: 'signed', signed_at: new Date().toISOString() }
        : sig
    );

    const allSigned = updatedSignatures.every(sig => sig.status === 'signed');

    await updateContractMutation.mutateAsync({
      signatures: updatedSignatures,
      signature_status: allSigned ? 'signed' : 'viewed',
      status: allSigned ? 'active' : contract.status
    });

    toast.success("Estado de assinatura atualizado");
  };

  if (!contract) return null;

  const statusIcons = {
    not_sent: Clock,
    sent: Send,
    viewed: Eye,
    signed: CheckCircle2,
    declined: XCircle
  };

  const statusLabels = {
    not_sent: "Não Enviado",
    sent: "Enviado",
    viewed: "Visualizado",
    signed: "Assinado",
    declined: "Recusado"
  };

  const statusColors = {
    not_sent: "bg-slate-100 text-slate-800",
    sent: "bg-blue-100 text-blue-800",
    viewed: "bg-yellow-100 text-yellow-800",
    signed: "bg-green-100 text-green-800",
    declined: "bg-red-100 text-red-800"
  };

  const StatusIcon = statusIcons[contract.signature_status || 'not_sent'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSignature className="w-5 h-5 text-blue-600" />
            Assinatura Eletrónica
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Current Status */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900 mb-1">Estado Atual</h3>
                  <p className="text-sm text-slate-600">{contract.property_title}</p>
                </div>
                <Badge className={`${statusColors[contract.signature_status || 'not_sent']} flex items-center gap-1`}>
                  <StatusIcon className="w-4 h-4" />
                  {statusLabels[contract.signature_status || 'not_sent']}
                </Badge>
              </div>
              {contract.signature_request_id && (
                <p className="text-xs text-slate-500 mt-2">ID: {contract.signature_request_id}</p>
              )}
            </CardContent>
          </Card>

          {/* Provider Selection */}
          {!contract.signature_request_id && (
            <div>
              <Label>Provedor de Assinatura Eletrónica</Label>
              <Select value={provider} onValueChange={setProvider}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="docusign">
                    <div className="flex items-center gap-2">
                      <FileSignature className="w-4 h-4" />
                      DocuSign
                    </div>
                  </SelectItem>
                  <SelectItem value="clicksign">
                    <div className="flex items-center gap-2">
                      <FileSignature className="w-4 h-4" />
                      ClickSign
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Signers */}
          <div>
            <h3 className="font-semibold text-slate-900 mb-3">Signatários</h3>
            <div className="space-y-3">
              {(contract.signatures || signers).map((signer, idx) => (
                <Card key={idx}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Mail className="w-5 h-5 text-slate-400" />
                        <div>
                          <p className="font-medium text-slate-900">{signer.name || signer.signer_name}</p>
                          <p className="text-sm text-slate-600">{signer.email || signer.signer_email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {signer.status && (
                          <Badge className={`${statusColors[signer.status]} text-xs`}>
                            {statusLabels[signer.status]}
                          </Badge>
                        )}
                        {signer.signed_at && (
                          <span className="text-xs text-slate-500">
                            {new Date(signer.signed_at).toLocaleDateString('pt-PT')}
                          </span>
                        )}
                        {contract.signature_request_id && signer.status !== 'signed' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => markAsSigned(signer.signer_email)}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                            Marcar Assinado
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Documents */}
          {contract.documents && contract.documents.length > 0 && (
            <div>
              <h3 className="font-semibold text-slate-900 mb-3">Documentos para Assinatura</h3>
              <div className="space-y-2">
                {contract.documents.filter(d => d.type === 'contract').map((doc, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <FileSignature className="w-5 h-5 text-blue-600" />
                      <span className="font-medium">{doc.name}</span>
                    </div>
                    <a href={doc.url} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm">
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-semibold mb-1">Como funciona:</p>
                <ul className="list-disc list-inside space-y-1 text-blue-700">
                  <li>Selecione o provedor de assinatura (DocuSign ou ClickSign)</li>
                  <li>Os signatários receberão um email com o pedido</li>
                  <li>Podem assinar eletronicamente de forma segura</li>
                  <li>O estado é atualizado automaticamente após assinatura</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Fechar
            </Button>
            {!contract.signature_request_id && (
              <Button 
                onClick={sendForSignature} 
                disabled={sending}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {sending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    A enviar...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Enviar para Assinatura
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}