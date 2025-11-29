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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  UserPlus, Search, Phone, Mail, MapPin, Building2, 
  Calendar, MessageSquare, Edit, Trash2, Eye, X, 
  Tag as TagIcon, DollarSign, Clock, User, Filter, Home, Target,
  TrendingUp, Euro, Bed, Square, Sparkles, ChevronDown, Globe, Facebook, Users2, Megaphone,
  Star, Zap, AlertCircle, CheckCircle2, Briefcase, Heart, Shield, Award, Flame, Snowflake, ThermometerSun,
  LayoutGrid, List, Link2
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { format } from "date-fns";
import CommunicationHistory from "./CommunicationHistory";
import WhatsAppConversation from "./WhatsAppConversation";
import AddCommunicationDialog from "./AddCommunicationDialog";
import ContactMatching from "./ContactMatching";
import MatchingReport from "../matching/MatchingReport";
import ClientsTable from "./ClientsTable";
import SendEmailDialog from "../email/SendEmailDialog";
import ClientPortalManager from "./ClientPortalManager";
import OpportunityFormDialog from "../opportunities/OpportunityFormDialog";
import ContactOpportunities from "./ContactOpportunities";
import TagSelector from "../tags/TagSelector";

function BulkTagSelector({ onTagSelect }) {
  const [open, setOpen] = React.useState(false);
  const { data: tags = [] } = useQuery({
    queryKey: ['tags'],
    queryFn: () => base44.entities.Tag.list('name')
  });

  const contactTags = tags.filter(t => t.category === 'contact' || t.category === 'general');

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8">
          <TagIcon className="w-4 h-4 mr-1" />
          Etiqueta
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2" align="start">
        <div className="max-h-48 overflow-y-auto space-y-1">
          {contactTags.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-2">Sem etiquetas</p>
          ) : (
            contactTags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => { onTagSelect(tag.name); setOpen(false); }}
                className="w-full flex items-center p-2 rounded-lg text-left hover:bg-slate-50"
              >
                <Badge
                  style={{
                    backgroundColor: `${tag.color}20`,
                    color: tag.color,
                    borderColor: tag.color
                  }}
                  className="border"
                >
                  <TagIcon className="w-3 h-3 mr-1" />
                  {tag.name}
                </Badge>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}


export default function ClientDatabase() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [sourceFilter, setSourceFilter] = React.useState("all");
  const [cityFilter, setCityFilter] = React.useState("all");
  const [tagFilter, setTagFilter] = React.useState("all");
  const [hasRequirementsFilter, setHasRequirementsFilter] = React.useState("all");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingClient, setEditingClient] = React.useState(null);
  const [selectedClient, setSelectedClient] = React.useState(null);
  const [commDialogOpen, setCommDialogOpen] = React.useState(false);
  const [matchingReportOpen, setMatchingReportOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState("details");
  const [showAdvancedFilters, setShowAdvancedFilters] = React.useState(false);
  const [viewMode, setViewMode] = React.useState("table"); // "table" or "cards"
  const [emailDialogOpen, setEmailDialogOpen] = React.useState(false);
  const [emailRecipient, setEmailRecipient] = React.useState(null);
  const [opportunityDialogOpen, setOpportunityDialogOpen] = React.useState(false);


  const [formData, setFormData] = React.useState({
    first_name: "",
    last_name: "",
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
    notes: "",
    property_requirements: null
  });

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['clientContacts', user?.email],
    queryFn: async () => {
      if (!user) return [];
      const allClients = await base44.entities.ClientContact.list('-created_date');
      
      const userType = user.user_type?.toLowerCase() || '';
      const permissions = user.permissions || {};
      
      // Admins e gestores veem todos
      if (user.role === 'admin' || userType === 'admin' || userType === 'gestor') {
        return allClients;
      }
      
      // Verifica permissão canViewAllLeads
      if (permissions.canViewAllLeads === true) {
        return allClients;
      }
      
      // Agentes veem apenas os seus contactos
      return allClients.filter(c => 
        c.assigned_agent === user.email || c.created_by === user.email
      );
    },
    enabled: !!user
  });

  const { data: communications = [] } = useQuery({
    queryKey: ['communicationLogs', user?.email],
    queryFn: async () => {
      if (!user) return [];
      const allComms = await base44.entities.CommunicationLog.list('-communication_date');
      
      const userType = user.user_type?.toLowerCase() || '';
      if (user.role === 'admin' || userType === 'admin' || userType === 'gestor') {
        return allComms;
      }
      
      return allComms.filter(c => c.agent_email === user.email || c.created_by === user.email);
    },
    enabled: !!user
  });

  const { data: opportunities = [] } = useQuery({
    queryKey: ['opportunities', user?.email],
    queryFn: async () => {
      if (!user) return [];
      const allOpps = await base44.entities.Opportunity.list();
      
      const userType = user.user_type?.toLowerCase() || '';
      if (user.role === 'admin' || userType === 'admin' || userType === 'gestor') {
        return allOpps;
      }
      
      return allOpps.filter(o => 
        o.seller_email === user.email || o.assigned_to === user.email || o.created_by === user.email
      );
    },
    enabled: !!user
  });

  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list()
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const { data: refData } = await base44.functions.invoke('generateRefId', { entity_type: 'ClientContact' });
      return base44.entities.ClientContact.create({ ...data, ref_id: refData.ref_id });
    },
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
      // Update selectedClient if it was the one being edited
      if (selectedClient && editingClient && selectedClient.id === editingClient.id) {
        setSelectedClient(prev => prev ? { ...prev, ...formData } : null);
      }
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

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids) => {
      await Promise.all(ids.map(id => base44.entities.ClientContact.delete(id)));
    },
    onSuccess: (_, ids) => {
      toast.success(`${ids.length} contactos eliminados`);
      setSelectedContacts([]);
      setBulkDeleteConfirm(false);
      queryClient.invalidateQueries({ queryKey: ['clientContacts'] });
    }
  });

  const bulkUpdateTypeMutation = useMutation({
    mutationFn: async ({ ids, type }) => {
      await Promise.all(ids.map(id => base44.entities.ClientContact.update(id, { contact_type: type })));
    },
    onSuccess: (_, { ids, type }) => {
      toast.success(`${ids.length} contactos atualizados para "${typeLabels[type]}"`);
      setSelectedContacts([]);
      queryClient.invalidateQueries({ queryKey: ['clientContacts'] });
    }
  });

  const bulkAddTagMutation = useMutation({
    mutationFn: async ({ ids, tag }) => {
      const contactsToUpdate = clients.filter(c => ids.includes(c.id));
      await Promise.all(contactsToUpdate.map(contact => {
        const currentTags = contact.tags || [];
        if (!currentTags.includes(tag)) {
          return base44.entities.ClientContact.update(contact.id, { tags: [...currentTags, tag] });
        }
        return Promise.resolve();
      }));
    },
    onSuccess: (_, { ids, tag }) => {
      toast.success(`Etiqueta "${tag}" adicionada a ${ids.length} contactos`);
      setSelectedContacts([]);
      queryClient.invalidateQueries({ queryKey: ['clientContacts'] });
    }
  });

  const resetForm = () => {
    setFormData({
      first_name: "",
      last_name: "",
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
      notes: "",
      property_requirements: null
    });
    setEditingClient(null);
    setDialogOpen(false);
  };

  const handleEdit = (client) => {
    setEditingClient(client);
    setFormData({
      first_name: client.first_name || "",
      last_name: client.last_name || "",
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
      notes: client.notes || "",
      property_requirements: client.property_requirements || null
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      assigned_agent: editingClient ? (editingClient.assigned_agent || user?.email) : user?.email
    };
    
    if (editingClient) {
      updateMutation.mutate({ id: editingClient.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const [deleteConfirm, setDeleteConfirm] = React.useState(null);
  const [selectedContacts, setSelectedContacts] = React.useState([]);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = React.useState(false);

  const handleDelete = (id, name, e) => {
    // Prevent event propagation issues on mobile
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setDeleteConfirm({ id, name });
  };

  const confirmDelete = () => {
    if (deleteConfirm) {
      deleteMutation.mutate(deleteConfirm.id);
      setDeleteConfirm(null);
    }
  };

  const toggleSelectContact = (id) => {
    setSelectedContacts(prev =>
      prev.includes(id) ? prev.filter(cid => cid !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    setSelectedContacts(prev =>
      prev.length === filteredClients.length ? [] : filteredClients.map(c => c.id)
    );
  };

  const getClientCommunications = (clientId) => {
    return communications.filter(c => c.contact_id === clientId);
  };

  const getClientOpportunities = (client) => {
    // Match by profile_id OR by linked_opportunity_ids
    const linkedIds = client.linked_opportunity_ids || [];
    return opportunities.filter(o => 
      o.profile_id === client.id || linkedIds.includes(o.id)
    );
  };

  // Calculate matching score for a client
  const calculateMatchingScore = (client) => {
    const req = client.property_requirements;
    if (!req || Object.keys(req).length === 0) return 0;
    
    const activeProperties = properties.filter(p => p.status === 'active');
    if (activeProperties.length === 0) return 0;

    let matchCount = 0;
    activeProperties.forEach(property => {
      let matches = true;
      
      if (req.locations?.length > 0) {
        matches = matches && req.locations.some(loc => 
          property.city?.toLowerCase().includes(loc.toLowerCase())
        );
      }
      if (req.budget_max && property.price > req.budget_max * 1.15) matches = false;
      if (req.budget_min && property.price < req.budget_min * 0.85) matches = false;
      if (req.bedrooms_min && property.bedrooms < req.bedrooms_min) matches = false;
      
      if (matches) matchCount++;
    });

    return Math.min(100, Math.round((matchCount / Math.min(activeProperties.length, 10)) * 100));
  };

  // Get all unique cities and tags
  const allCities = [...new Set(clients.map(c => c.city).filter(Boolean))].sort();
  const allTags = [...new Set(clients.flatMap(c => c.tags || []))].sort();

  const filteredClients = clients.filter(c => {
    const matchesSearch = searchTerm === "" ||
      c.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone?.includes(searchTerm) ||
      c.company_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === "all" || 
      (typeFilter === "empty" && (!c.contact_type || c.contact_type === "")) || 
      c.contact_type === typeFilter;
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    const matchesSource = sourceFilter === "all" || c.source === sourceFilter;
    const matchesCity = cityFilter === "all" || c.city === cityFilter;
    const matchesTag = tagFilter === "all" || c.tags?.includes(tagFilter);
    
    const hasReqs = c.property_requirements && (
      c.property_requirements.budget_min || c.property_requirements.budget_max ||
      c.property_requirements.locations?.length || c.property_requirements.property_types?.length
    );
    const matchesHasRequirements = hasRequirementsFilter === "all" || 
      (hasRequirementsFilter === "yes" && hasReqs) ||
      (hasRequirementsFilter === "no" && !hasReqs);
    
    return matchesSearch && matchesType && matchesStatus && matchesSource && 
           matchesCity && matchesTag && matchesHasRequirements;
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
        <div className="flex gap-2">
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
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label>Primeiro Nome</Label>
                  <Input
                    value={formData.first_name}
                    onChange={(e) => {
                      const firstName = e.target.value;
                      const fullName = `${firstName} ${formData.last_name}`.trim();
                      setFormData({...formData, first_name: firstName, full_name: fullName});
                    }}
                    placeholder="João"
                  />
                </div>
                <div>
                  <Label>Último Nome</Label>
                  <Input
                    value={formData.last_name}
                    onChange={(e) => {
                      const lastName = e.target.value;
                      const fullName = `${formData.first_name} ${lastName}`.trim();
                      setFormData({...formData, last_name: lastName, full_name: fullName});
                    }}
                    placeholder="Silva"
                  />
                </div>
                <div>
                  <Label>Nome Completo *</Label>
                  <Input
                    required
                    value={formData.full_name}
                    onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                    placeholder="João Silva"
                  />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
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
                <Label>Etiquetas</Label>
                <TagSelector
                  selectedTags={formData.tags}
                  onTagsChange={(tags) => setFormData({...formData, tags})}
                  category="contact"
                  placeholder="Adicionar etiquetas..."
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
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-4">
            <div className="grid md:grid-cols-5 gap-3">
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Nome, email, telefone, empresa..."
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Tipos</SelectItem>
                  <SelectItem value="empty">Sem Tipo</SelectItem>
                  <SelectItem value="client">Clientes</SelectItem>
                  <SelectItem value="partner">Parceiros</SelectItem>
                  <SelectItem value="investor">Investidores</SelectItem>
                  <SelectItem value="vendor">Fornecedores</SelectItem>
                </SelectContent>
              </Select>
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
              <Button 
                variant="outline" 
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="flex items-center gap-2"
              >
                <Filter className="w-4 h-4" />
                Mais Filtros
                <ChevronDown className={`w-4 h-4 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} />
              </Button>
            </div>

            {showAdvancedFilters && (
              <div className="grid md:grid-cols-5 gap-3 pt-3 border-t">
                <Select value={sourceFilter} onValueChange={setSourceFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Origem" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas Origens</SelectItem>
                    <SelectItem value="facebook_ads">Facebook Ads</SelectItem>
                    <SelectItem value="website">Website</SelectItem>
                    <SelectItem value="referral">Indicação</SelectItem>
                    <SelectItem value="direct_contact">Contacto Direto</SelectItem>
                    <SelectItem value="networking">Networking</SelectItem>
                    <SelectItem value="other">Outro</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={cityFilter} onValueChange={setCityFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Cidade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas Cidades</SelectItem>
                    {allCities.map(city => (
                      <SelectItem key={city} value={city}>{city}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={tagFilter} onValueChange={setTagFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tag" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas Tags</SelectItem>
                    {allTags.map(tag => (
                      <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={hasRequirementsFilter} onValueChange={setHasRequirementsFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Requisitos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="yes">Com Requisitos</SelectItem>
                    <SelectItem value="no">Sem Requisitos</SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  variant="ghost" 
                  onClick={() => {
                    setTypeFilter("all");
                    setStatusFilter("all");
                    setSourceFilter("all");
                    setCityFilter("all");
                    setTagFilter("all");
                    setHasRequirementsFilter("all");
                    setSearchTerm("");
                  }}
                  className="text-slate-600"
                >
                  Limpar Filtros
                </Button>
              </div>
            )}

            {/* Quick Tags */}
            {allTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {allTags.slice(0, 10).map(tag => (
                  <Badge 
                    key={tag}
                    variant={tagFilter === tag ? "default" : "outline"}
                    className="cursor-pointer hover:bg-slate-100"
                    onClick={() => setTagFilter(tagFilter === tag ? "all" : tag)}
                  >
                    <TagIcon className="w-3 h-3 mr-1" />
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedContacts.length > 0 && (
        <Card className="border-blue-300 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <Users2 className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-blue-900">
                  {selectedContacts.length} contacto{selectedContacts.length > 1 ? 's' : ''} selecionado{selectedContacts.length > 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Select onValueChange={(value) => bulkUpdateTypeMutation.mutate({ ids: selectedContacts, type: value })}>
                  <SelectTrigger className="w-40 h-8 text-sm">
                    <SelectValue placeholder="Alterar tipo..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="client">Cliente</SelectItem>
                    <SelectItem value="partner">Parceiro</SelectItem>
                    <SelectItem value="investor">Investidor</SelectItem>
                    <SelectItem value="vendor">Fornecedor</SelectItem>
                    <SelectItem value="other">Outro</SelectItem>
                  </SelectContent>
                </Select>
                <BulkTagSelector 
                  onTagSelect={(tag) => bulkAddTagMutation.mutate({ ids: selectedContacts, tag })}
                />
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setBulkDeleteConfirm(true)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Eliminar
                </Button>
                <Button variant="outline" size="sm" onClick={() => setSelectedContacts([])}>
                  Cancelar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* View Mode Toggle */}
      <div className="flex justify-between items-center mb-4">
        <Button variant="outline" size="sm" onClick={toggleSelectAll}>
          {selectedContacts.length === filteredClients.length && filteredClients.length > 0 ? 'Desselecionar' : 'Selecionar'} Todos
        </Button>
        <div className="flex border rounded-lg overflow-hidden">
          <Button
            variant={viewMode === "table" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("table")}
            className="rounded-none"
          >
            <List className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === "cards" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("cards")}
            className="rounded-none"
          >
            <LayoutGrid className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Client List */}
      {viewMode === "table" ? (
        <ClientsTable
          clients={filteredClients}
          communications={communications}
          opportunities={opportunities}
          onClientClick={(client) => { setActiveTab("details"); setSelectedClient(client); }}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onMatching={(client) => { setActiveTab("matching"); setSelectedClient(client); }}
        />
      ) : (
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
            const clientOpps = getClientOpportunities(client);
            const matchScore = calculateMatchingScore(client);
            const req = client.property_requirements;
            const hasRequirements = req && (req.budget_min || req.budget_max || req.locations?.length || req.property_types?.length);
            
            return (
              <Card key={client.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 md:p-6">
                  {/* Mobile Header with Avatar and Actions */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Avatar */}
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-bold text-sm md:text-base">
                          {client.full_name?.[0]?.toUpperCase() || '?'}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base md:text-xl font-bold text-slate-900 truncate">{client.full_name}</h3>
                        <div className="flex items-center gap-1.5 flex-wrap mt-1">
                          <Badge className={`${typeColors[client.contact_type]} text-xs`}>
                            {typeLabels[client.contact_type]}
                          </Badge>
                          <Badge className={`${statusColors[client.status]} text-xs`}>
                            {client.status === 'active' ? 'Ativo' : client.status === 'inactive' ? 'Inativo' : 'Prospect'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    {/* Match Score - Compact on Mobile */}
                    {hasRequirements && (
                      <div className="text-center p-2 md:p-3 bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg md:rounded-xl border border-purple-100 flex-shrink-0">
                        <div className="flex items-center justify-center gap-1 mb-0.5">
                          <Sparkles className="w-3 h-3 text-purple-500" />
                          <span className="text-xs text-purple-600 hidden md:inline">Match</span>
                        </div>
                        <div className={`text-base md:text-lg font-bold ${
                          matchScore >= 70 ? 'text-green-600' : 
                          matchScore >= 40 ? 'text-amber-600' : 'text-slate-500'
                        }`}>
                          {matchScore}%
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Contact Info - Stacked on Mobile */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-sm text-slate-600 mb-3">
                    {client.phone && (
                      <a href={`tel:${client.phone}`} className="flex items-center gap-2 p-2 md:p-0 bg-slate-50 md:bg-transparent rounded-lg hover:bg-slate-100 transition-colors">
                        <Phone className="w-4 h-4 flex-shrink-0 text-green-600" />
                        <span className="truncate">{client.phone}</span>
                      </a>
                    )}
                    {client.email && (
                      <a href={`mailto:${client.email}`} className="flex items-center gap-2 p-2 md:p-0 bg-slate-50 md:bg-transparent rounded-lg hover:bg-slate-100 transition-colors">
                        <Mail className="w-4 h-4 flex-shrink-0 text-blue-600" />
                        <span className="truncate">{client.email}</span>
                      </a>
                    )}
                    {client.city && (
                      <div className="flex items-center gap-2 p-2 md:p-0 bg-slate-50 md:bg-transparent rounded-lg">
                        <MapPin className="w-4 h-4 flex-shrink-0 text-red-500" />
                        <span>{client.city}</span>
                      </div>
                    )}
                    {client.company_name && (
                      <div className="flex items-center gap-2 p-2 md:p-0 bg-slate-50 md:bg-transparent rounded-lg truncate">
                        <Building2 className="w-4 h-4 flex-shrink-0 text-purple-600" />
                        <span className="truncate">{client.company_name}</span>
                      </div>
                    )}
                  </div>

                  {/* Status Badges - Scrollable on Mobile */}
                  <div className="flex gap-1.5 flex-wrap mb-3 max-h-16 overflow-y-auto md:max-h-none">
                    {clientOpps.some(o => o.priority === 'high') && (
                      <Badge className="bg-red-100 text-red-700 border-red-200 text-xs">
                        <Flame className="w-3 h-3 mr-1" />
                        Prioritário
                      </Badge>
                    )}
                    {clientOpps.some(o => o.qualification_status === 'hot') && (
                      <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-xs">
                        <ThermometerSun className="w-3 h-3 mr-1" />
                        Quente
                      </Badge>
                    )}
                    {clientOpps.some(o => o.qualification_status === 'warm') && !clientOpps.some(o => o.qualification_status === 'hot') && (
                      <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs">
                        <Zap className="w-3 h-3 mr-1" />
                        Morno
                      </Badge>
                    )}
                    {clientOpps.some(o => o.qualification_status === 'cold') && (
                      <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs">
                        <Snowflake className="w-3 h-3 mr-1" />
                        Frio
                      </Badge>
                    )}
                    {clientComms.length >= 5 && (
                      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">
                        <MessageSquare className="w-3 h-3 mr-1" />
                        Engajado
                      </Badge>
                    )}
                    {clientOpps.some(o => o.status === 'scheduled') && (
                      <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 text-xs">
                        <Calendar className="w-3 h-3 mr-1" />
                        Visita
                      </Badge>
                    )}
                    {clientOpps.some(o => o.status === 'closed') && (
                      <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Fechado
                      </Badge>
                    )}
                    {new Date(client.created_date) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) && (
                      <Badge className="bg-cyan-100 text-cyan-700 border-cyan-200 text-xs">
                        <Star className="w-3 h-3 mr-1" />
                        Novo
                      </Badge>
                    )}
                    {client.last_contact_date && new Date(client.last_contact_date) < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) && (
                      <Badge className="bg-rose-100 text-rose-700 border-rose-200 text-xs">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        30d+
                      </Badge>
                    )}
                    {client.tags?.slice(0, 2).map(tag => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {client.tags?.length > 2 && (
                      <Badge variant="outline" className="text-xs">+{client.tags.length - 2}</Badge>
                    )}
                  </div>

                  {/* Requirements Summary - Compact on Mobile */}
                  {hasRequirements && (
                    <div className="flex flex-wrap items-center gap-2 mb-3 p-2 md:p-3 bg-blue-50 rounded-lg text-xs md:text-sm">
                      <Target className="w-3 h-3 text-blue-600" />
                      {req.budget_max > 0 && (
                        <span className="flex items-center gap-1 text-blue-700">
                          <Euro className="w-3 h-3" />
                          {req.budget_min > 0 ? `${(req.budget_min/1000).toFixed(0)}k-` : ''}
                          {(req.budget_max/1000).toFixed(0)}k
                        </span>
                      )}
                      {req.bedrooms_min > 0 && (
                        <span className="flex items-center gap-1 text-blue-700">
                          <Bed className="w-3 h-3" />
                          T{req.bedrooms_min}+
                        </span>
                      )}
                      {req.locations?.length > 0 && (
                        <span className="flex items-center gap-1 text-blue-700">
                          <MapPin className="w-3 h-3" />
                          {req.locations[0]}{req.locations.length > 1 && ` +${req.locations.length - 1}`}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Stats Row - Compact */}
                  <div className="flex items-center gap-3 md:gap-5 text-xs md:text-sm flex-wrap mb-3">
                    {client.source && (
                      <div className="flex items-center gap-1 text-slate-600">
                        {client.source === 'facebook_ads' ? <Facebook className="w-3 h-3 text-blue-600" /> :
                         client.source === 'website' ? <Globe className="w-3 h-3 text-green-600" /> :
                         client.source === 'referral' ? <Users2 className="w-3 h-3 text-purple-600" /> :
                         <TagIcon className="w-3 h-3" />}
                        <span className="hidden md:inline">
                          {client.source === 'facebook_ads' ? 'Facebook' : 
                           client.source === 'website' ? 'Website' :
                           client.source === 'referral' ? 'Indicação' :
                           client.source === 'direct_contact' ? 'Direto' : 'Outro'}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-1 text-slate-500">
                      <MessageSquare className="w-3 h-3" />
                      {clientComms.length}
                    </div>
                    <div className={`flex items-center gap-1 ${clientOpps.length > 0 ? 'text-green-600 font-medium' : 'text-slate-500'}`}>
                      <TrendingUp className="w-3 h-3" />
                      {clientOpps.length}
                    </div>
                    {client.last_contact_date && (
                      <div className="flex items-center gap-1 text-slate-500">
                        <Clock className="w-3 h-3" />
                        {format(new Date(client.last_contact_date), "dd/MM")}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons - Full Width on Mobile */}
                  <div className="flex gap-2 pt-3 border-t">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => { setActiveTab("matching"); setSelectedClient(client); }}
                      className="flex-1 md:flex-none text-purple-600 hover:bg-purple-50"
                    >
                      <Home className="w-4 h-4 md:mr-1" />
                      <span className="hidden md:inline">Match</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => { setActiveTab("details"); setSelectedClient(client); }}
                      className="flex-1 md:flex-none"
                    >
                      <Eye className="w-4 h-4 md:mr-1" />
                      <span className="hidden md:inline">Ver</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleEdit(client)}
                      className="flex-1 md:flex-none"
                    >
                      <Edit className="w-4 h-4 md:mr-1" />
                      <span className="hidden md:inline">Editar</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={(e) => handleDelete(client.id, client.full_name, e)}
                      className="flex-1 md:flex-none text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Opportunities Preview */}
                  {clientOpps.length > 0 && (
                    <div className="mt-3 pt-3 border-t flex flex-wrap gap-1.5">
                      {clientOpps.slice(0, 3).map(opp => (
                        <Badge 
                          key={opp.id} 
                          variant="outline"
                          className={`text-xs ${
                            opp.status === 'new' ? 'border-blue-300 text-blue-700 bg-blue-50' :
                            opp.status === 'contacted' ? 'border-amber-300 text-amber-700 bg-amber-50' :
                            opp.status === 'scheduled' ? 'border-purple-300 text-purple-700 bg-purple-50' :
                            'border-green-300 text-green-700 bg-green-50'
                          }`}
                        >
                          {opp.lead_type === 'comprador' ? '🏠' : opp.lead_type === 'vendedor' ? '🏷️' : '🤝'}
                          <span className="hidden md:inline ml-1">{opp.property_title?.substring(0, 15) || opp.lead_type}</span>
                          <span className="md:hidden ml-1">{opp.property_title?.substring(0, 8) || opp.lead_type?.substring(0, 4)}</span>
                        </Badge>
                      ))}
                      {clientOpps.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{clientOpps.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
      )}

      {/* Client Detail Panel */}
      {selectedClient && (
        <Dialog open={!!selectedClient} onOpenChange={(open) => !open && setSelectedClient(null)}>
                        <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>{selectedClient.full_name}</span>
                <Badge className={typeColors[selectedClient.contact_type]}>
                  {typeLabels[selectedClient.contact_type]}
                </Badge>
              </DialogTitle>
            </DialogHeader>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="details">Detalhes</TabsTrigger>
                <TabsTrigger value="matching">Matching</TabsTrigger>
                <TabsTrigger value="whatsapp" className="flex items-center gap-1">
                  <MessageSquare className="w-3 h-3 text-green-600" />
                  WhatsApp
                </TabsTrigger>
                <TabsTrigger value="communications">Comunicações</TabsTrigger>
                <TabsTrigger value="opportunities">Oportunidades</TabsTrigger>
                <TabsTrigger value="portal" className="flex items-center gap-1">
                  <Link2 className="w-3 h-3" />
                  Portal
                </TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="mt-4">
                {/* Quick Info Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                  <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="p-3 text-center">
                      <p className="text-xs text-blue-600 mb-1">Tipo</p>
                      <Badge className={typeColors[selectedClient.contact_type]}>
                        {typeLabels[selectedClient.contact_type]}
                      </Badge>
                    </CardContent>
                  </Card>
                  <Card className="bg-green-50 border-green-200">
                    <CardContent className="p-3 text-center">
                      <p className="text-xs text-green-600 mb-1">Estado</p>
                      <Badge className={statusColors[selectedClient.status]}>
                        {selectedClient.status === 'active' ? 'Ativo' : selectedClient.status === 'inactive' ? 'Inativo' : 'Prospect'}
                      </Badge>
                    </CardContent>
                  </Card>
                  <Card className="bg-purple-50 border-purple-200">
                    <CardContent className="p-3 text-center">
                      <p className="text-xs text-purple-600 mb-1">Origem</p>
                      <span className="text-sm font-medium text-purple-900">
                        {selectedClient.source === 'facebook_ads' ? 'Facebook' : 
                         selectedClient.source === 'website' ? 'Website' :
                         selectedClient.source === 'referral' ? 'Indicação' :
                         selectedClient.source === 'direct_contact' ? 'Direto' :
                         selectedClient.source === 'networking' ? 'Networking' :
                         selectedClient.source || 'N/A'}
                      </span>
                    </CardContent>
                  </Card>
                  <Card className="bg-amber-50 border-amber-200">
                    <CardContent className="p-3 text-center">
                      <p className="text-xs text-amber-600 mb-1">Agente</p>
                      <span className="text-sm font-medium text-amber-900 truncate block">
                        {selectedClient.assigned_agent?.split('@')[0] || 'N/A'}
                      </span>
                    </CardContent>
                  </Card>
                </div>

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
                      {selectedClient.preferred_contact_method && (
                        <div className="flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-slate-500" />
                          Preferência: {selectedClient.preferred_contact_method === 'phone' ? 'Telefone' : 
                                       selectedClient.preferred_contact_method === 'email' ? 'Email' :
                                       selectedClient.preferred_contact_method === 'whatsapp' ? 'WhatsApp' : 'SMS'}
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
                          <TagIcon className="w-4 h-4 text-slate-500" />
                          NIF: {selectedClient.nif}
                        </div>
                      )}
                      {selectedClient.birthday && (
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-slate-500" />
                          Aniversário: {format(new Date(selectedClient.birthday), "dd/MM/yyyy")}
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

                <div className="flex flex-wrap gap-2 mt-6">
                  <Button 
                    onClick={() => { 
                      setEmailRecipient({
                        type: 'client',
                        id: selectedClient.id,
                        name: selectedClient.full_name,
                        email: selectedClient.email,
                        data: {
                          name: selectedClient.full_name,
                          email: selectedClient.email,
                          phone: selectedClient.phone,
                          city: selectedClient.city,
                          company_name: selectedClient.company_name
                        }
                      });
                      setEmailDialogOpen(true);
                    }}
                    className="bg-green-600 hover:bg-green-700"
                    disabled={!selectedClient.email}
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Enviar Email
                  </Button>
                  <Button 
                    onClick={() => { setCommDialogOpen(true); }}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Registar Comunicação
                  </Button>
                  <Button 
                    onClick={() => setMatchingReportOpen(true)}
                    className="bg-indigo-600 hover:bg-indigo-700"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Relatório de Matching
                  </Button>
                  <Button 
                    onClick={() => setOpportunityDialogOpen(true)}
                    className="bg-amber-600 hover:bg-amber-700"
                  >
                    <Target className="w-4 h-4 mr-2" />
                    Nova Oportunidade
                  </Button>
                  <Button variant="outline" onClick={() => handleEdit(selectedClient)}>
                    <Edit className="w-4 h-4 mr-2" />
                    Editar
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="matching" className="mt-4">
                <ContactMatching contact={selectedClient} />
              </TabsContent>

              <TabsContent value="whatsapp" className="mt-4">
                <WhatsAppConversation 
                  contact={selectedClient} 
                  onMessageSent={() => queryClient.invalidateQueries({ queryKey: ['communicationLogs'] })}
                />
              </TabsContent>

              <TabsContent value="communications" className="mt-4">
                <CommunicationHistory contactId={selectedClient.id} />
              </TabsContent>

              <TabsContent value="opportunities" className="mt-4">
                <ContactOpportunities contact={selectedClient} />
              </TabsContent>

              <TabsContent value="portal" className="mt-4">
                <ClientPortalManager client={selectedClient} />
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

      {/* Matching Report Dialog */}
      {selectedClient && (
        <MatchingReport
          contact={selectedClient}
          open={matchingReportOpen}
          onOpenChange={setMatchingReportOpen}
        />
      )}

      {/* Send Email Dialog */}
      <SendEmailDialog
        open={emailDialogOpen}
        onOpenChange={setEmailDialogOpen}
        recipient={emailRecipient}
      />

      {/* Opportunity Form Dialog */}
      {selectedClient && (
        <OpportunityFormDialog
          open={opportunityDialogOpen}
          onOpenChange={setOpportunityDialogOpen}
          prefillContact={selectedClient}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ['opportunities'] });
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmar Eliminação</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-slate-600">
              Tem a certeza que deseja eliminar o contacto <strong>"{deleteConfirm?.name}"</strong>?
            </p>
            <p className="text-sm text-slate-500 mt-2">Esta ação não pode ser revertida.</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setDeleteConfirm(null)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button 
              onClick={confirmDelete}
              className="flex-1 bg-red-600 hover:bg-red-700"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Eliminar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog open={bulkDeleteConfirm} onOpenChange={setBulkDeleteConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Eliminar {selectedContacts.length} Contactos</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-slate-600">
              Tem a certeza que deseja eliminar <strong>{selectedContacts.length} contactos</strong>?
            </p>
            <p className="text-sm text-red-600 mt-2">Esta ação não pode ser revertida!</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setBulkDeleteConfirm(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button 
              onClick={() => bulkDeleteMutation.mutate(selectedContacts)}
              disabled={bulkDeleteMutation.isPending}
              className="flex-1 bg-red-600 hover:bg-red-700"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {bulkDeleteMutation.isPending ? "A eliminar..." : "Eliminar Todos"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}