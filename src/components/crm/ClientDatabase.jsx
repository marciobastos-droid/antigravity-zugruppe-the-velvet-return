import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  UserPlus, Search, Phone, Mail, MapPin, Building2, 
  Calendar, MessageSquare, Edit, Trash2, Eye, X, 
  Tag, DollarSign, Clock, User, Filter
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import CommunicationHistory from "./CommunicationHistory";
import AddCommunicationDialog from "./AddCommunicationDialog";
import ContactMatching from "./ContactMatching";

export default function ClientDatabase() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingClient, setEditingClient] = React.useState(null);
  const [selectedClient, setSelectedClient] = React.useState(null);
  const [commDialogOpen, setCommDialogOpen] = React.useState(false);

  const [formData, setFormData] = React.useState({
    full_name: "",
    email: "",
    phone: "",
    secondary_phone: "",
    address: "",
    city: "",
    postal_code: "",
    nif: "",
    contact_type: "client",
    status: "active",
    source: "",
    company_name: "",
    job_title: "",
    birthday: "",
    preferred_contact_method: "phone",
    tags: [],
    notes: ""
  });

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['clientContacts'],
    queryFn: () => base44.entities.ClientContact.list('-created_date')
  });

  const { data: communications = [] } = useQuery({
    queryKey: ['communicationLogs'],
    queryFn: () => base44.entities.CommunicationLog.list('-communication_date')
  });

  const { data: opportunities = [] } = useQuery({
    queryKey: ['opportunities'],
    queryFn: () => base44.entities.Opportunity.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ClientContact.create(data),
    onSuccess: () => {
      toast.success("Contacto criado");
      queryClient.invalidateQueries({ queryKey: ['clientContacts'] });
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ClientContact.update(id, data),
    onSuccess: () => {
      toast.success("Contacto atualizado");
      queryClient.invalidateQueries({ queryKey: ['clientContacts'] });
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ClientContact.delete(id),
    onSuccess: () => {
      toast.success("Contacto eliminado");
      queryClient.invalidateQueries({ queryKey: ['clientContacts'] });
      setSelectedClient(null);
    }
  });

  const resetForm = () => {
    setFormData({
      full_name: "",
      email: "",
      phone: "",
      secondary_phone: "",
      address: "",
      city: "",
      postal_code: "",
      nif: "",
      contact_type: "client",
      status: "active",
      source: "",
      company_name: "",
      job_title: "",
      birthday: "",
      preferred_contact_method: "phone",
      tags: [],
      notes: ""
    });
    setEditingClient(null);
    setDialogOpen(false);
  };

  const handleEdit = (client) => {
    setEditingClient(client);
    setFormData({
      full_name: client.full_name || "",
      email: client.email || "",
      phone: client.phone || "",
      secondary_phone: client.secondary_phone || "",
      address: client.address || "",
      city: client.city || "",
      postal_code: client.postal_code || "",
      nif: client.nif || "",
      contact_type: client.contact_type || "client",
      status: client.status || "active",
      source: client.source || "",
      company_name: client.company_name || "",
      job_title: client.job_title || "",
      birthday: client.birthday || "",
      preferred_contact_method: client.preferred_contact_method || "phone",
      tags: client.tags || [],
      notes: client.notes || ""
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      assigned_agent: user?.email
    };
    
    if (editingClient) {
      updateMutation.mutate({ id: editingClient.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (id, name) => {
    if (window.confirm(`Eliminar contacto "${name}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  const getClientCommunications = (clientId) => {
    return communications.filter(c => c.contact_id === clientId);
  };

  const getClientOpportunities = (clientEmail) => {
    return opportunities.filter(o => o.buyer_email === clientEmail);
  };

  const filteredClients = clients.filter(c => {
    const matchesSearch = searchTerm === "" ||
      c.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone?.includes(searchTerm);
    
    const matchesType = typeFilter === "all" || c.contact_type === typeFilter;
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const typeLabels = {
    client: "Cliente",
    partner: "Parceiro",
    investor: "Investidor",
    vendor: "Fornecedor",
    other: "Outro"
  };

  const typeColors = {
    client: "bg-blue-100 text-blue-800",
    partner: "bg-purple-100 text-purple-800",
    investor: "bg-green-100 text-green-800",
    vendor: "bg-orange-100 text-orange-800",
    other: "bg-slate-100 text-slate-800"
  };

  const statusColors = {
    active: "bg-green-100 text-green-800",
    inactive: "bg-slate-100 text-slate-600",
    prospect: "bg-amber-100 text-amber-800"
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Base de Dados de Contactos</h2>
          <p className="text-slate-600">{clients.length} contactos registados</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setDialogOpen(open); }}>
          <DialogTrigger asChild>
            <Button className="bg-slate-900 hover:bg-slate-800">
              <UserPlus className="w-4 h-4 mr-2" />
              Novo Contacto
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingClient ? "Editar Contacto" : "Novo Contacto"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Nome Completo *</Label>
                  <Input
                    required
                    value={formData.full_name}
                    onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                    placeholder="João Silva"
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="joao@exemplo.com"
                  />
                </div>
                <div>
                  <Label>Telefone Principal</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder="+351 912 345 678"
                  />
                </div>
                <div>
                  <Label>Telefone Secundário</Label>
                  <Input
                    value={formData.secondary_phone}
                    onChange={(e) => setFormData({...formData, secondary_phone: e.target.value})}
                    placeholder="+351 912 345 679"
                  />
                </div>
                <div>
                  <Label>Tipo de Contacto</Label>
                  <Select value={formData.contact_type} onValueChange={(v) => setFormData({...formData, contact_type: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="client">Cliente</SelectItem>
                      <SelectItem value="partner">Parceiro</SelectItem>
                      <SelectItem value="investor">Investidor</SelectItem>
                      <SelectItem value="vendor">Fornecedor</SelectItem>
                      <SelectItem value="other">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Estado</Label>
                  <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="inactive">Inativo</SelectItem>
                      <SelectItem value="prospect">Prospect</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <Label>Morada</Label>
                  <Input
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    placeholder="Rua exemplo, nº 123"
                  />
                </div>
                <div>
                  <Label>Código Postal</Label>
                  <Input
                    value={formData.postal_code}
                    onChange={(e) => setFormData({...formData, postal_code: e.target.value})}
                    placeholder="1000-000"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Cidade</Label>
                  <Input
                    value={formData.city}
                    onChange={(e) => setFormData({...formData, city: e.target.value})}
                    placeholder="Lisboa"
                  />
                </div>
                <div>
                  <Label>NIF</Label>
                  <Input
                    value={formData.nif}
                    onChange={(e) => setFormData({...formData, nif: e.target.value})}
                    placeholder="123456789"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Empresa</Label>
                  <Input
                    value={formData.company_name}
                    onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                    placeholder="Nome da empresa"
                  />
                </div>
                <div>
                  <Label>Cargo</Label>
                  <Input
                    value={formData.job_title}
                    onChange={(e) => setFormData({...formData, job_title: e.target.value})}
                    placeholder="Diretor Comercial"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Origem</Label>
                  <Select value={formData.source} onValueChange={(v) => setFormData({...formData, source: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="facebook_ads">Facebook Ads</SelectItem>
                      <SelectItem value="website">Website</SelectItem>
                      <SelectItem value="referral">Indicação</SelectItem>
                      <SelectItem value="direct_contact">Contacto Direto</SelectItem>
                      <SelectItem value="networking">Networking</SelectItem>
                      <SelectItem value="other">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Método de Contacto Preferido</Label>
                  <Select value={formData.preferred_contact_method} onValueChange={(v) => setFormData({...formData, preferred_contact_method: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="phone">Telefone</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Data de Nascimento</Label>
                <Input
                  type="date"
                  value={formData.birthday}
                  onChange={(e) => setFormData({...formData, birthday: e.target.value})}
                />
              </div>

              <div>
                <Label>Notas</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Notas sobre o contacto..."
                  rows={3}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="button" variant="outline" onClick={resetForm} className="flex-1">
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1 bg-slate-900 hover:bg-slate-800">
                  {editingClient ? "Atualizar" : "Criar Contacto"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Pesquisar por nome, email ou telefone..."
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Tipos</SelectItem>
                  <SelectItem value="client">Clientes</SelectItem>
                  <SelectItem value="partner">Parceiros</SelectItem>
                  <SelectItem value="investor">Investidores</SelectItem>
                  <SelectItem value="vendor">Fornecedores</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Estados</SelectItem>
                  <SelectItem value="active">Ativos</SelectItem>
                  <SelectItem value="inactive">Inativos</SelectItem>
                  <SelectItem value="prospect">Prospects</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Client List */}
      <div className="grid gap-4">
        {filteredClients.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <User className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Nenhum contacto encontrado</h3>
              <p className="text-slate-600">Crie o primeiro contacto para começar</p>
            </CardContent>
          </Card>
        ) : (
          filteredClients.map((client) => {
            const clientComms = getClientCommunications(client.id);
            const clientOpps = getClientOpportunities(client.email);
            
            return (
              <Card key={client.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h3 className="text-lg font-semibold text-slate-900">{client.full_name}</h3>
                        <Badge className={typeColors[client.contact_type]}>
                          {typeLabels[client.contact_type]}
                        </Badge>
                        <Badge className={statusColors[client.status]}>
                          {client.status === 'active' ? 'Ativo' : client.status === 'inactive' ? 'Inativo' : 'Prospect'}
                        </Badge>
                      </div>

                      <div className="grid md:grid-cols-3 gap-2 text-sm text-slate-600 mb-3">
                        {client.email && (
                          <div className="flex items-center gap-1">
                            <Mail className="w-4 h-4" />
                            {client.email}
                          </div>
                        )}
                        {client.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="w-4 h-4" />
                            {client.phone}
                          </div>
                        )}
                        {client.city && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {client.city}
                          </div>
                        )}
                        {client.company_name && (
                          <div className="flex items-center gap-1">
                            <Building2 className="w-4 h-4" />
                            {client.company_name}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" />
                          {clientComms.length} comunicações
                        </span>
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          {clientOpps.length} oportunidades
                        </span>
                        {client.last_contact_date && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Último contacto: {format(new Date(client.last_contact_date), "d MMM", { locale: ptBR })}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 ml-4">
                      <Button variant="outline" size="sm" onClick={() => setSelectedClient(client)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleEdit(client)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleDelete(client.id, client.full_name)}
                        className="text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Client Detail Panel */}
      {selectedClient && (
        <Dialog open={!!selectedClient} onOpenChange={(open) => !open && setSelectedClient(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>{selectedClient.full_name}</span>
                <Badge className={typeColors[selectedClient.contact_type]}>
                  {typeLabels[selectedClient.contact_type]}
                </Badge>
              </DialogTitle>
            </DialogHeader>

            <Tabs defaultValue="details" className="mt-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="details">Detalhes</TabsTrigger>
                <TabsTrigger value="communications">Comunicações</TabsTrigger>
                <TabsTrigger value="opportunities">Oportunidades</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="mt-4">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-semibold text-slate-900">Informação de Contacto</h4>
                    <div className="space-y-2 text-sm">
                      {selectedClient.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-slate-500" />
                          <a href={`mailto:${selectedClient.email}`} className="text-blue-600 hover:underline">
                            {selectedClient.email}
                          </a>
                        </div>
                      )}
                      {selectedClient.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-slate-500" />
                          <a href={`tel:${selectedClient.phone}`} className="text-blue-600 hover:underline">
                            {selectedClient.phone}
                          </a>
                        </div>
                      )}
                      {selectedClient.secondary_phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-slate-500" />
                          {selectedClient.secondary_phone}
                        </div>
                      )}
                      {selectedClient.address && (
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-slate-500 mt-0.5" />
                          <span>
                            {selectedClient.address}
                            {selectedClient.postal_code && `, ${selectedClient.postal_code}`}
                            {selectedClient.city && ` - ${selectedClient.city}`}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-semibold text-slate-900">Informação Profissional</h4>
                    <div className="space-y-2 text-sm">
                      {selectedClient.company_name && (
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-slate-500" />
                          {selectedClient.company_name}
                        </div>
                      )}
                      {selectedClient.job_title && (
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-slate-500" />
                          {selectedClient.job_title}
                        </div>
                      )}
                      {selectedClient.nif && (
                        <div className="flex items-center gap-2">
                          <Tag className="w-4 h-4 text-slate-500" />
                          NIF: {selectedClient.nif}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {selectedClient.notes && (
                  <div className="mt-6">
                    <h4 className="font-semibold text-slate-900 mb-2">Notas</h4>
                    <p className="text-sm text-slate-600 whitespace-pre-wrap bg-slate-50 p-3 rounded-lg">
                      {selectedClient.notes}
                    </p>
                  </div>
                )}

                <div className="flex gap-2 mt-6">
                  <Button 
                    onClick={() => { setCommDialogOpen(true); }}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Registar Comunicação
                  </Button>
                  <Button variant="outline" onClick={() => handleEdit(selectedClient)}>
                    <Edit className="w-4 h-4 mr-2" />
                    Editar
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="communications" className="mt-4">
                <CommunicationHistory contactId={selectedClient.id} />
              </TabsContent>

              <TabsContent value="opportunities" className="mt-4">
                {getClientOpportunities(selectedClient.email).length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <DollarSign className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhuma oportunidade associada</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {getClientOpportunities(selectedClient.email).map((opp) => (
                      <Card key={opp.id}>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium text-slate-900">{opp.property_title || "Oportunidade"}</h4>
                              <p className="text-sm text-slate-600">{opp.message?.substring(0, 100)}...</p>
                            </div>
                            <Badge>{opp.status}</Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      )}

      {/* Add Communication Dialog */}
      {selectedClient && (
        <AddCommunicationDialog
          open={commDialogOpen}
          onOpenChange={setCommDialogOpen}
          contactId={selectedClient.id}
          contactName={selectedClient.full_name}
        />
      )}
    </div>
  );
}