import React from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Phone, MessageCircle, Clock, CheckCircle2, XCircle, Voicemail, PhoneOff, RotateCcw } from "lucide-react";
import { toast } from "sonner";

export default function QuickContactActions({ contact, onCommunicationLogged }) {
  const queryClient = useQueryClient();
  const [callDialogOpen, setCallDialogOpen] = React.useState(false);
  const [whatsappDialogOpen, setWhatsappDialogOpen] = React.useState(false);
  const [callData, setCallData] = React.useState({
    call_outcome: "",
    call_duration_seconds: "",
    summary: "",
    call_quality_rating: "",
    follow_up_required: false,
    follow_up_notes: ""
  });
  const [whatsappData, setWhatsappData] = React.useState({
    message: "",
    summary: ""
  });

  const logCommunicationMutation = useMutation({
    mutationFn: async (data) => {
      const user = await base44.auth.me();
      return base44.entities.CommunicationLog.create({
        ...data,
        agent_email: user?.email,
        agent_name: user?.full_name
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communicationLogs'] });
      if (onCommunicationLogged) onCommunicationLogged();
    }
  });

  const handleInitiateCall = () => {
    if (!contact.phone) {
      toast.error("Contacto não tem número de telefone");
      return;
    }
    // Open phone dialer
    window.open(`tel:${contact.phone}`, '_self');
    // Open dialog to log call after
    setCallDialogOpen(true);
  };

  const handleLogCall = () => {
    if (!callData.call_outcome) {
      toast.error("Selecione o resultado da chamada");
      return;
    }

    const durationMinutes = callData.call_duration_seconds 
      ? Math.ceil(Number(callData.call_duration_seconds) / 60) 
      : undefined;

    logCommunicationMutation.mutate({
      contact_id: contact.id,
      contact_name: contact.full_name,
      communication_type: "phone_call",
      direction: "outbound",
      subject: `Chamada para ${contact.full_name}`,
      summary: callData.summary || `Chamada telefónica - ${getCallOutcomeLabel(callData.call_outcome)}`,
      outcome: mapCallOutcomeToGeneral(callData.call_outcome),
      call_outcome: callData.call_outcome,
      call_duration_seconds: callData.call_duration_seconds ? Number(callData.call_duration_seconds) : undefined,
      duration_minutes: durationMinutes,
      call_quality_rating: callData.call_quality_rating ? Number(callData.call_quality_rating) : undefined,
      communication_date: new Date().toISOString(),
      follow_up_required: callData.follow_up_required,
      follow_up_notes: callData.follow_up_notes
    }, {
      onSuccess: () => {
        toast.success("Chamada registada com sucesso");
        setCallDialogOpen(false);
        resetCallData();
      }
    });
  };

  const handleInitiateWhatsApp = () => {
    if (!contact.phone) {
      toast.error("Contacto não tem número de telefone");
      return;
    }
    setWhatsappDialogOpen(true);
  };

  const handleSendWhatsApp = () => {
    const phone = contact.phone.replace(/\D/g, '');
    const message = whatsappData.message || "";
    const whatsappUrl = `https://wa.me/${phone}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
    
    // Open WhatsApp
    window.open(whatsappUrl, '_blank');

    // Log the communication
    logCommunicationMutation.mutate({
      contact_id: contact.id,
      contact_name: contact.full_name,
      communication_type: "whatsapp",
      direction: "outbound",
      subject: `WhatsApp para ${contact.full_name}`,
      summary: whatsappData.summary || whatsappData.message?.substring(0, 100) || "Mensagem WhatsApp enviada",
      detailed_notes: whatsappData.message,
      whatsapp_status: "sent",
      communication_date: new Date().toISOString()
    }, {
      onSuccess: () => {
        toast.success("Mensagem WhatsApp registada");
        setWhatsappDialogOpen(false);
        resetWhatsappData();
      }
    });
  };

  const resetCallData = () => {
    setCallData({
      call_outcome: "",
      call_duration_seconds: "",
      summary: "",
      call_quality_rating: "",
      follow_up_required: false,
      follow_up_notes: ""
    });
  };

  const resetWhatsappData = () => {
    setWhatsappData({
      message: "",
      summary: ""
    });
  };

  const getCallOutcomeLabel = (outcome) => {
    const labels = {
      answered: "Atendida",
      no_answer: "Sem resposta",
      busy: "Ocupado",
      voicemail: "Caixa de correio",
      wrong_number: "Número errado",
      callback_scheduled: "Callback agendado",
      completed: "Concluída com sucesso"
    };
    return labels[outcome] || outcome;
  };

  const mapCallOutcomeToGeneral = (callOutcome) => {
    const mapping = {
      answered: "successful",
      no_answer: "no_answer",
      busy: "no_answer",
      voicemail: "no_answer",
      wrong_number: "other",
      callback_scheduled: "callback_requested",
      completed: "successful"
    };
    return mapping[callOutcome] || "other";
  };

  return (
    <>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleInitiateCall}
          disabled={!contact.phone}
          className="text-green-600 hover:bg-green-50 border-green-200"
        >
          <Phone className="w-4 h-4 mr-1" />
          Ligar
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleInitiateWhatsApp}
          disabled={!contact.phone}
          className="text-green-600 hover:bg-green-50 border-green-200"
        >
          <MessageCircle className="w-4 h-4 mr-1" />
          WhatsApp
        </Button>
      </div>

      {/* Call Log Dialog */}
      <Dialog open={callDialogOpen} onOpenChange={setCallDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Phone className="w-5 h-5 text-green-600" />
              Registar Chamada - {contact.full_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Resultado da Chamada *</Label>
              <Select value={callData.call_outcome} onValueChange={(v) => setCallData({...callData, call_outcome: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Como correu a chamada?" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="completed">
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      Concluída com sucesso
                    </span>
                  </SelectItem>
                  <SelectItem value="answered">
                    <span className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-blue-600" />
                      Atendida
                    </span>
                  </SelectItem>
                  <SelectItem value="no_answer">
                    <span className="flex items-center gap-2">
                      <PhoneOff className="w-4 h-4 text-orange-600" />
                      Sem resposta
                    </span>
                  </SelectItem>
                  <SelectItem value="busy">
                    <span className="flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-red-600" />
                      Ocupado
                    </span>
                  </SelectItem>
                  <SelectItem value="voicemail">
                    <span className="flex items-center gap-2">
                      <Voicemail className="w-4 h-4 text-purple-600" />
                      Caixa de correio
                    </span>
                  </SelectItem>
                  <SelectItem value="callback_scheduled">
                    <span className="flex items-center gap-2">
                      <RotateCcw className="w-4 h-4 text-amber-600" />
                      Callback agendado
                    </span>
                  </SelectItem>
                  <SelectItem value="wrong_number">
                    <span className="flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-slate-600" />
                      Número errado
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Duração (segundos)</Label>
                <div className="relative">
                  <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    type="number"
                    value={callData.call_duration_seconds}
                    onChange={(e) => setCallData({...callData, call_duration_seconds: e.target.value})}
                    placeholder="120"
                    className="pl-8"
                  />
                </div>
              </div>
              <div>
                <Label>Qualidade (1-5)</Label>
                <Select value={callData.call_quality_rating} onValueChange={(v) => setCallData({...callData, call_quality_rating: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Avaliar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">⭐⭐⭐⭐⭐ Excelente</SelectItem>
                    <SelectItem value="4">⭐⭐⭐⭐ Boa</SelectItem>
                    <SelectItem value="3">⭐⭐⭐ Regular</SelectItem>
                    <SelectItem value="2">⭐⭐ Fraca</SelectItem>
                    <SelectItem value="1">⭐ Má</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Notas / Resumo</Label>
              <Textarea
                value={callData.summary}
                onChange={(e) => setCallData({...callData, summary: e.target.value})}
                placeholder="O que foi discutido na chamada..."
                rows={3}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setCallDialogOpen(false)} className="flex-1">
                Cancelar
              </Button>
              <Button 
                onClick={handleLogCall} 
                disabled={logCommunicationMutation.isPending}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {logCommunicationMutation.isPending ? "A guardar..." : "Registar Chamada"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* WhatsApp Dialog */}
      <Dialog open={whatsappDialogOpen} onOpenChange={setWhatsappDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-green-600" />
              Enviar WhatsApp - {contact.full_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-sm text-green-800">
                <strong>Número:</strong> {contact.phone}
              </p>
            </div>

            <div>
              <Label>Mensagem (opcional)</Label>
              <Textarea
                value={whatsappData.message}
                onChange={(e) => setWhatsappData({...whatsappData, message: e.target.value})}
                placeholder="Escreva a mensagem para pré-preencher no WhatsApp..."
                rows={4}
              />
              <p className="text-xs text-slate-500 mt-1">
                A mensagem será aberta no WhatsApp para editar antes de enviar
              </p>
            </div>

            <div>
              <Label>Resumo para registo</Label>
              <Input
                value={whatsappData.summary}
                onChange={(e) => setWhatsappData({...whatsappData, summary: e.target.value})}
                placeholder="Resumo breve desta comunicação..."
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setWhatsappDialogOpen(false)} className="flex-1">
                Cancelar
              </Button>
              <Button 
                onClick={handleSendWhatsApp} 
                disabled={logCommunicationMutation.isPending}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                {logCommunicationMutation.isPending ? "A abrir..." : "Abrir WhatsApp"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}