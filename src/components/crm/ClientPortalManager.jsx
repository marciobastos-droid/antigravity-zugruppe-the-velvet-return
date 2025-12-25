import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Link2, Copy, Send, Plus, Trash2, Building2, 
  Eye, Clock, MessageSquare, Star, Check, X,
  ExternalLink, Mail, RefreshCw, Search
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

export default function ClientPortalManager({ client, onClose }) {
  const queryClient = useQueryClient();
  const [addPropertyDialogOpen, setAddPropertyDialogOpen] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState("");
  const [propertySearchId, setPropertySearchId] = useState("");
  const [agentNotes, setAgentNotes] = useState("");
  const [replyMessage, setReplyMessage] = useState("");

  const { data: portalAccess } = useQuery({
    queryKey: ['portal_access', client.id],
    queryFn: async () => {
      const accesses = await base44.entities.ClientPortalAccess.filter({ contact_id: client.id });
      return accesses[0] || null;
    }
  });

  const { data: interests = [] } = useQuery({
    queryKey: ['client_interests', client.id],
    queryFn: () => base44.entities.ClientPropertyInterest.filter({ contact_id: client.id })
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['client_messages', client.id],
    queryFn: () => base44.entities.ClientPortalMessage.filter({ contact_id: client.id }, 'created_date')
  });

  const { data: properties = [] } = useQuery({
    queryKey: ['all_properties'],
    queryFn: () => base44.entities.Property.filter({ status: 'active' })
  });

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const createAccessMutation = useMutation({
    mutationFn: async () => {
      const token = generateToken();
      return base44.entities.ClientPortalAccess.create({
        contact_id: client.id,
        access_token: token,
        is_active: true,
        expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() // 90 days
      });
    },
    onSuccess: () => {
      toast.success("Acesso ao portal criado!");
      queryClient.invalidateQueries({ queryKey: ['portal_access', client.id] });
    }
  });

  const toggleAccessMutation = useMutation({
    mutationFn: () => base44.entities.ClientPortalAccess.update(portalAccess.id, {
      is_active: !portalAccess.is_active
    }),
    onSuccess: () => {
      toast.success(portalAccess.is_active ? "Acesso desativado" : "Acesso ativado");
      queryClient.invalidateQueries({ queryKey: ['portal_access', client.id] });
    }
  });

  const addPropertyMutation = useMutation({
    mutationFn: async () => {
      const property = properties.find(p => p.id === selectedPropertyId);
      return base44.entities.ClientPropertyInterest.create({
        contact_id: client.id,
        property_id: selectedPropertyId,
        property_title: property.title,
        property_image: property.images?.[0],
        property_price: property.price,
        property_address: `${property.address}, ${property.city}`,
        status: "suggested",
        agent_notes: agentNotes,
        added_by: user?.email
      });
    },
    onSuccess: () => {
      toast.success("Imóvel adicionado!");
      queryClient.invalidateQueries({ queryKey: ['client_interests', client.id] });
      setAddPropertyDialogOpen(false);
      setSelectedPropertyId("");
      setAgentNotes("");
    }
  });

  const removeInterestMutation = useMutation({
    mutationFn: (id) => base44.entities.ClientPropertyInterest.delete(id),
    onSuccess: () => {
      toast.success("Imóvel removido");
      queryClient.invalidateQueries({ queryKey: ['client_interests', client.id] });
    }
  });

  const sendReplyMutation = useMutation({
    mutationFn: () => base44.entities.ClientPortalMessage.create({
      contact_id: client.id,
      agent_email: user?.email,
      sender_type: "agent",
      message: replyMessage
    }),
    onSuccess: () => {
      toast.success("Resposta enviada!");
      setReplyMessage("");
      queryClient.invalidateQueries({ queryKey: ['client_messages', client.id] });
    }
  });

  const generateToken = () => {
    return 'portal_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  const getPortalUrl = () => {
    if (!portalAccess) return "";
    return `https://zuhaus.pt/ClientPortal?token=${portalAccess.access_token}`;
  };

  const copyLink = () => {
    navigator.clipboard.writeText(getPortalUrl());
    toast.success("Link copiado!");
  };

  const sendLinkByEmail = async () => {
    try {
      await base44.integrations.Core.SendEmail({
        to: client.email,
        subject: "Acesso ao Portal do Cliente - Zugruppe",
        body: `
Olá ${client.full_name},

O seu agente criou um portal pessoal para si onde pode:
- Ver os imóveis selecionados para si
- Acompanhar as suas visitas agendadas
- Comunicar diretamente com o seu agente

Aceda ao portal através deste link:
${getPortalUrl()}

Este link é pessoal e intransmissível.

Cumprimentos,
Zugruppe
        `
      });
      toast.success("Link enviado por email!");
    } catch (error) {
      toast.error("Erro ao enviar email");
    }
  };

  const statusLabels = {
    suggested: "Sugerido",
    interested: "Interessado",
    visited: "Visitado",
    not_interested: "Não Interessado",
    negotiating: "Em Negociação"
  };

  const statusColors = {
    suggested: "bg-blue-100 text-blue-800",
    interested: "bg-green-100 text-green-800",
    visited: "bg-purple-100 text-purple-800",
    not_interested: "bg-slate-100 text-slate-800",
    negotiating: "bg-amber-100 text-amber-800"
  };

  return (
    <div className="space-y-6">
      {/* Portal Access Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5" />
            Acesso ao Portal
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!portalAccess ? (
            <div className="text-center py-6">
              <Link2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600 mb-4">Este cliente ainda não tem acesso ao portal.</p>
              <Button onClick={() => createAccessMutation.mutate()}>
                <Plus className="w-4 h-4 mr-2" />
                Criar Acesso ao Portal
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className={portalAccess.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                    {portalAccess.is_active ? "Ativo" : "Inativo"}
                  </Badge>
                  {portalAccess.last_access && (
                    <span className="text-xs text-slate-500">
                      Último acesso: {format(new Date(portalAccess.last_access), "d MMM, HH:mm", { locale: pt })}
                    </span>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleAccessMutation.mutate()}
                >
                  {portalAccess.is_active ? <X className="w-4 h-4 mr-1" /> : <Check className="w-4 h-4 mr-1" />}
                  {portalAccess.is_active ? "Desativar" : "Ativar"}
                </Button>
              </div>

              <div className="bg-slate-50 rounded-lg p-3">
                <Label className="text-xs text-slate-500">Link do Portal</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input value={getPortalUrl()} readOnly className="text-xs bg-white" />
                  <Button variant="outline" size="icon" onClick={copyLink}>
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => window.open(getPortalUrl(), '_blank')}>
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <Button onClick={sendLinkByEmail} className="w-full">
                <Mail className="w-4 h-4 mr-2" />
                Enviar Link por Email
              </Button>

              <div className="text-xs text-slate-500">
                Acessos: {portalAccess.access_count || 0} • 
                Expira: {portalAccess.expires_at ? format(new Date(portalAccess.expires_at), "d MMM yyyy", { locale: pt }) : "Nunca"}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Properties for Client */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Imóveis para o Cliente ({interests.length})
            </span>
            <Dialog open={addPropertyDialogOpen} onOpenChange={setAddPropertyDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar Imóvel ao Portal</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label>Procurar Imóvel por ID</Label>
                    <div className="flex gap-2">
                      <Input
                        value={propertySearchId}
                        onChange={(e) => setPropertySearchId(e.target.value)}
                        placeholder="Cole o ID do imóvel..."
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          const property = properties.find(p => p.id === propertySearchId.trim());
                          if (property) {
                            if (interests.some(i => i.property_id === property.id)) {
                              toast.error("Este imóvel já foi adicionado");
                            } else {
                              setSelectedPropertyId(property.id);
                              toast.success(`Imóvel selecionado: ${property.title}`);
                            }
                          } else {
                            toast.error("Imóvel não encontrado");
                          }
                        }}
                        disabled={!propertySearchId.trim()}
                      >
                        <Search className="w-4 h-4 mr-2" />
                        Procurar
                      </Button>
                    </div>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-2 text-slate-500">ou</span>
                    </div>
                  </div>

                  <div>
                    <Label>Selecionar da Lista</Label>
                    <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um imóvel..." />
                      </SelectTrigger>
                      <SelectContent>
                        {properties
                          .filter(p => !interests.some(i => i.property_id === p.id))
                          .slice(0, 50)
                          .map((property) => (
                            <SelectItem key={property.id} value={property.id}>
                              {property.ref_id || property.id.slice(0, 8)} - {property.title} - €{property.price?.toLocaleString()}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Nota para o Cliente</Label>
                    <Textarea
                      value={agentNotes}
                      onChange={(e) => setAgentNotes(e.target.value)}
                      placeholder="Ex: Este imóvel tem excelente exposição solar..."
                    />
                  </div>
                  <Button 
                    onClick={() => addPropertyMutation.mutate()} 
                    className="w-full"
                    disabled={!selectedPropertyId}
                  >
                    Adicionar ao Portal
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {interests.length === 0 ? (
            <div className="text-center py-6">
              <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">Adicione imóveis para este cliente ver no portal</p>
            </div>
          ) : (
            <div className="space-y-3">
              {interests.map((interest) => (
                <div key={interest.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  {interest.property_image && (
                    <img 
                      src={interest.property_image} 
                      alt="" 
                      className="w-16 h-16 object-cover rounded"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 truncate">{interest.property_title}</p>
                    <p className="text-sm text-slate-600">€{interest.property_price?.toLocaleString()}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={statusColors[interest.status]}>
                        {statusLabels[interest.status]}
                      </Badge>
                      {interest.client_rating && (
                        <div className="flex items-center gap-0.5">
                          {[...Array(interest.client_rating)].map((_, i) => (
                            <Star key={i} className="w-3 h-3 text-amber-400 fill-amber-400" />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeInterestMutation.mutate(interest.id)}
                    className="text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Messages */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Mensagens do Portal ({messages.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {messages.length === 0 ? (
            <div className="text-center py-6">
              <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">Nenhuma mensagem ainda</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto mb-4">
              {messages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`p-3 rounded-lg ${
                    msg.sender_type === 'client' 
                      ? 'bg-blue-50 border-l-4 border-blue-500' 
                      : 'bg-slate-50 border-l-4 border-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-slate-600">
                      {msg.sender_type === 'client' ? client.full_name : 'Você'}
                    </span>
                    <span className="text-xs text-slate-500">
                      {format(new Date(msg.created_date), "d MMM, HH:mm", { locale: pt })}
                    </span>
                  </div>
                  <p className="text-sm text-slate-900">{msg.message}</p>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <Textarea
              value={replyMessage}
              onChange={(e) => setReplyMessage(e.target.value)}
              placeholder="Escreva uma resposta..."
              className="flex-1 min-h-[60px]"
            />
            <Button
              onClick={() => sendReplyMutation.mutate()}
              disabled={!replyMessage.trim() || sendReplyMutation.isPending}
              className="self-end"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}