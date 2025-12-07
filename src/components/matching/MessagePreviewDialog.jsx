import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, MessageCircle, Send, X, Eye, Copy, Home } from "lucide-react";
import { toast } from "sonner";

export default function MessagePreviewDialog({ 
  open, 
  onOpenChange, 
  sendMethod, 
  contact, 
  properties, 
  message,
  subject,
  onConfirmSend 
}) {
  const [sending, setSending] = React.useState(false);

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(message);
    toast.success("Mensagem copiada!");
  };

  const handleSend = async () => {
    setSending(true);
    await onConfirmSend();
    setSending(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Pré-visualização da Mensagem
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Header Info */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div>
              <p className="text-sm text-slate-600">Para:</p>
              <p className="font-semibold text-slate-900">{contact.full_name}</p>
              <p className="text-sm text-slate-600">
                {sendMethod === 'email' ? contact.email : contact.phone}
              </p>
            </div>
            <Badge className={sendMethod === 'whatsapp' ? 'bg-green-500' : 'bg-blue-500'}>
              {sendMethod === 'whatsapp' ? (
                <><MessageCircle className="w-3 h-3 mr-1" /> WhatsApp</>
              ) : (
                <><Mail className="w-3 h-3 mr-1" /> Email</>
              )}
            </Badge>
          </div>

          {/* Properties Summary */}
          <Card>
            <CardContent className="p-4">
              <h4 className="font-semibold text-slate-900 mb-3">
                {properties.length} Imóvel{properties.length > 1 ? 'is' : ''} Selecionado{properties.length > 1 ? 's' : ''}
              </h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {properties.map((p, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                    {p.images?.[0] ? (
                      <img src={p.images[0]} alt="" className="w-12 h-12 object-cover rounded" />
                    ) : (
                      <div className="w-12 h-12 bg-slate-200 rounded flex items-center justify-center">
                        <Home className="w-5 h-5 text-slate-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{p.title}</p>
                      <p className="text-xs text-slate-600">€{p.price?.toLocaleString()}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {p.matchScore}%
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Message Preview */}
          <Card>
            <CardContent className="p-4">
              {sendMethod === 'email' && subject && (
                <div className="mb-4 pb-4 border-b">
                  <p className="text-xs text-slate-500 mb-1">Assunto:</p>
                  <p className="font-semibold text-slate-900">{subject}</p>
                </div>
              )}
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 max-h-96 overflow-y-auto">
                <pre className="whitespace-pre-wrap font-sans text-sm text-slate-700">
                  {message}
                </pre>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button variant="outline" onClick={handleCopyMessage}>
              <Copy className="w-4 h-4 mr-2" />
              Copiar
            </Button>
            <Button 
              onClick={handleSend}
              disabled={sending}
              className={sendMethod === 'whatsapp' ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}
            >
              {sending ? (
                <>Enviando...</>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Enviar {sendMethod === 'whatsapp' ? 'WhatsApp' : 'Email'}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}