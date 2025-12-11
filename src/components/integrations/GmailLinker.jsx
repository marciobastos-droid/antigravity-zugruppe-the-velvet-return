import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  Mail, Loader2, Search, Link2, User, Building2, 
  Home, Paperclip, Calendar, RefreshCw, Check, X,
  ChevronDown, ChevronUp, Eye, Tag, Filter
} from "lucide-react";
import { toast } from "sonner";
import moment from "moment";

export default function GmailLinker() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmails, setSelectedEmails] = useState([]);
  const [expandedEmail, setExpandedEmail] = useState(null);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkType, setLinkType] = useState("client");
  const [selectedLinkId, setSelectedLinkId] = useState("");
  const [linkNotes, setLinkNotes] = useState("");
  const [emailsToLink, setEmailsToLink] = useState([]);
  const [activeTab, setActiveTab] = useState("inbox");

  // Fetch Gmail messages
  const { data: gmailData, isLoading: loadingGmail, refetch: refetchGmail } = useQuery({
    queryKey: ['gmailMessages', searchQuery],
    queryFn: async () => {
      const result = await base44.functions.invoke('fetchGmailMessages', {
        maxResults: 50,
        query: searchQuery
      });
      return result.data;
    },
    enabled: false // Manual fetch
  });

  // Fetch linked messages
  const { data: linkedMessages = [], refetch: refetchLinked } = useQuery({
    queryKey: ['linkedGmailMessages'],
    queryFn: () => base44.entities.GmailMessage.list('-created_date')
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clientContacts'],
    queryFn: () => base44.entities.ClientContact.list()
  });

  const { data: opportunities = [] } = useQuery({
    queryKey: ['opportunities'],
    queryFn: () => base44.entities.Opportunity.list()
  });

  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list()
  });

  const linkMutation = useMutation({
    mutationFn: async (emailData) => {
      const user = await base44.auth.me();
      
      let linkData = {
        ...emailData,
        linked_to_type: linkType,
        linked_by: user.email,
        notes: linkNotes
      };

      if (linkType === "client") {
        const client = clients.find(c => c.id === selectedLinkId);
        linkData.linked_client_id = selectedLinkId;
        linkData.linked_client_name = client?.full_name;
      } else if (linkType === "opportunity") {
        const opp = opportunities.find(o => o.id === selectedLinkId);
        linkData.linked_opportunity_id = selectedLinkId;
        linkData.linked_client_name = opp?.buyer_name;
      } else if (linkType === "property") {
        const prop = properties.find(p => p.id === selectedLinkId);
        linkData.linked_property_id = selectedLinkId;
        linkData.linked_property_title = prop?.title;
      }

      return await base44.entities.GmailMessage.create(linkData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['linkedGmailMessages'] });
      toast.success("Email vinculado com sucesso!");
      setLinkDialogOpen(false);
      setEmailsToLink([]);
      setSelectedEmails([]);
      setLinkNotes("");
    }
  });

  const handleLinkSelected = () => {
    if (selectedEmails.length === 0) {
      toast.error("Selecione pelo menos um email");
      return;
    }

    const emails = gmailData?.messages?.filter(m => selectedEmails.includes(m.gmail_id)) || [];
    setEmailsToLink(emails);
    setLinkDialogOpen(true);
  };

  const handleConfirmLink = async () => {
    if (!selectedLinkId) {
      toast.error("Selecione o destino da vinculação");
      return;
    }

    for (const email of emailsToLink) {
      await linkMutation.mutateAsync(email);
    }
  };

  const toggleEmailSelection = (emailId) => {
    setSelectedEmails(prev =>
      prev.includes(emailId) ? prev.filter(id => id !== emailId) : [...prev, emailId]
    );
  };

  const messages = gmailData?.messages || [];
  const alreadyLinkedIds = linkedMessages.map(lm => lm.gmail_id);

  return (
    <div className="space-y-4">
      {/* Search and Fetch */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Integração Gmail
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <Label className="text-xs mb-1 block">Pesquisar emails (opcional)</Label>
              <Input
                placeholder="Ex: from:cliente@email.com, subject:imóvel, after:2024/12/01"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <p className="text-xs text-slate-500 mt-1">
                Use filtros Gmail: from:, to:, subject:, after:, before:, has:attachment
              </p>
            </div>
            <div className="pt-6">
              <Button 
                onClick={() => refetchGmail()} 
                disabled={loadingGmail}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {loadingGmail ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    A carregar...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Buscar Emails
                  </>
                )}
              </Button>
            </div>
          </div>

          {selectedEmails.length > 0 && (
            <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <span className="text-sm font-medium text-blue-800">
                {selectedEmails.length} email(s) selecionado(s)
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setSelectedEmails([])}>
                  Limpar
                </Button>
                <Button size="sm" onClick={handleLinkSelected} className="bg-green-600 hover:bg-green-700">
                  <Link2 className="w-4 h-4 mr-1" />
                  Vincular
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="inbox">
            <Mail className="w-4 h-4 mr-2" />
            Caixa de Entrada ({messages.length})
          </TabsTrigger>
          <TabsTrigger value="linked">
            <Link2 className="w-4 h-4 mr-2" />
            Emails Vinculados ({linkedMessages.length})
          </TabsTrigger>
        </TabsList>

        {/* Inbox Tab */}
        <TabsContent value="inbox" className="mt-4">
          {loadingGmail ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-blue-500" />
                <p className="text-slate-600">A carregar emails do Gmail...</p>
              </CardContent>
            </Card>
          ) : messages.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Mail className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <h3 className="font-semibold text-slate-900 mb-1">Nenhum email carregado</h3>
                <p className="text-sm text-slate-600">Clique em "Buscar Emails" para começar</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {messages.map((email) => {
                const isExpanded = expandedEmail === email.gmail_id;
                const isSelected = selectedEmails.includes(email.gmail_id);
                const isLinked = alreadyLinkedIds.includes(email.gmail_id);

                return (
                  <Card 
                    key={email.gmail_id}
                    className={`${isSelected ? 'ring-2 ring-blue-500 bg-blue-50/30' : ''} ${isLinked ? 'opacity-50' : ''}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleEmailSelection(email.gmail_id)}
                          disabled={isLinked}
                          className="mt-1"
                        />
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-slate-900 truncate">
                                {email.subject}
                              </h4>
                              <div className="flex items-center gap-2 text-sm text-slate-600 mt-1">
                                <span className="font-medium">{email.from_name || email.from_email}</span>
                                <span className="text-xs text-slate-400">
                                  {moment(email.received_date).format('DD/MM/YYYY HH:mm')}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {email.has_attachments && (
                                <Badge variant="outline" className="text-xs">
                                  <Paperclip className="w-3 h-3 mr-1" />
                                  {email.attachments?.length}
                                </Badge>
                              )}
                              {isLinked && (
                                <Badge className="bg-green-100 text-green-800 text-xs">
                                  <Check className="w-3 h-3 mr-1" />
                                  Vinculado
                                </Badge>
                              )}
                            </div>
                          </div>

                          <p className="text-sm text-slate-600 line-clamp-2 mb-2">
                            {email.snippet}
                          </p>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setExpandedEmail(isExpanded ? null : email.gmail_id)}
                            className="text-xs h-7"
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp className="w-3 h-3 mr-1" />
                                Ocultar
                              </>
                            ) : (
                              <>
                                <ChevronDown className="w-3 h-3 mr-1" />
                                Ver completo
                              </>
                            )}
                          </Button>

                          {isExpanded && (
                            <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                              <div className="space-y-2 text-sm mb-3">
                                <div>
                                  <strong className="text-slate-700">De:</strong>{" "}
                                  <span className="text-slate-600">{email.from_name} &lt;{email.from_email}&gt;</span>
                                </div>
                                <div>
                                  <strong className="text-slate-700">Para:</strong>{" "}
                                  <span className="text-slate-600">{email.to_email}</span>
                                </div>
                              </div>
                              
                              <div className="text-sm text-slate-700 whitespace-pre-wrap max-h-96 overflow-y-auto">
                                {email.body}
                              </div>

                              {email.attachments?.length > 0 && (
                                <div className="mt-3 pt-3 border-t">
                                  <strong className="text-xs text-slate-700 block mb-2">Anexos:</strong>
                                  <div className="flex flex-wrap gap-2">
                                    {email.attachments.map((att, idx) => (
                                      <Badge key={idx} variant="outline" className="text-xs">
                                        <Paperclip className="w-3 h-3 mr-1" />
                                        {att.filename}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Linked Tab */}
        <TabsContent value="linked" className="mt-4">
          {linkedMessages.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Link2 className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <h3 className="font-semibold text-slate-900 mb-1">Nenhum email vinculado</h3>
                <p className="text-sm text-slate-600">Vincule emails da caixa de entrada</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {linkedMessages.map((linked) => (
                <Card key={linked.id} className="border-green-200 bg-green-50/30">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-slate-900 mb-1">{linked.subject}</h4>
                        <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
                          <span>{linked.from_name || linked.from_email}</span>
                          <span className="text-xs text-slate-400">
                            {moment(linked.received_date).format('DD/MM/YYYY HH:mm')}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-2 mb-2">
                          {linked.linked_client_name && (
                            <Badge className="bg-blue-100 text-blue-800">
                              <User className="w-3 h-3 mr-1" />
                              {linked.linked_client_name}
                            </Badge>
                          )}
                          {linked.linked_property_title && (
                            <Badge className="bg-purple-100 text-purple-800">
                              <Home className="w-3 h-3 mr-1" />
                              {linked.linked_property_title}
                            </Badge>
                          )}
                          {linked.tags?.map(tag => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              <Tag className="w-3 h-3 mr-1" />
                              {tag}
                            </Badge>
                          ))}
                        </div>

                        {linked.notes && (
                          <p className="text-xs text-slate-600 bg-white p-2 rounded border">
                            📝 {linked.notes}
                          </p>
                        )}

                        <p className="text-sm text-slate-600 mt-2 line-clamp-2">
                          {linked.snippet}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Link Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="w-5 h-5" />
              Vincular {emailsToLink.length} Email(s)
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Selected Emails Preview */}
            <div className="p-3 bg-slate-50 rounded-lg border max-h-32 overflow-y-auto">
              <p className="text-xs text-slate-500 mb-2">Emails selecionados:</p>
              {emailsToLink.map(email => (
                <div key={email.gmail_id} className="text-sm text-slate-700 truncate">
                  • {email.subject}
                </div>
              ))}
            </div>

            {/* Link Type */}
            <div>
              <Label>Vincular a</Label>
              <Select value={linkType} onValueChange={setLinkType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="client">
                    <User className="w-4 h-4 inline mr-2" />
                    Cliente
                  </SelectItem>
                  <SelectItem value="opportunity">
                    <Building2 className="w-4 h-4 inline mr-2" />
                    Oportunidade
                  </SelectItem>
                  <SelectItem value="property">
                    <Home className="w-4 h-4 inline mr-2" />
                    Imóvel
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Select Entity */}
            <div>
              <Label>
                {linkType === 'client' ? 'Selecione o Cliente' :
                 linkType === 'opportunity' ? 'Selecione a Oportunidade' :
                 'Selecione o Imóvel'}
              </Label>
              <Select value={selectedLinkId} onValueChange={setSelectedLinkId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {linkType === 'client' && clients.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.full_name} - {c.email}
                    </SelectItem>
                  ))}
                  {linkType === 'opportunity' && opportunities.map(o => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.buyer_name} - {o.property_title || o.ref_id}
                    </SelectItem>
                  ))}
                  {linkType === 'property' && properties.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.ref_id ? `[${p.ref_id}] ` : ''}{p.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div>
              <Label>Notas (opcional)</Label>
              <Textarea
                value={linkNotes}
                onChange={(e) => setLinkNotes(e.target.value)}
                placeholder="Contexto ou observações sobre este email..."
                rows={2}
              />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setLinkDialogOpen(false)} className="flex-1">
                Cancelar
              </Button>
              <Button 
                onClick={handleConfirmLink} 
                disabled={linkMutation.isPending || !selectedLinkId}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {linkMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    A vincular...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Confirmar Vinculação
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}