import React, { useState, useMemo, useCallback, memo, lazy, Suspense } from "react";
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
  Tag as TagIcon, Clock, User, Filter, Home, Target,
  TrendingUp, Euro, Bed, Sparkles, ChevronDown, Globe, Facebook, Users2,
  Star, Zap, AlertCircle, CheckCircle2, Flame, Snowflake, ThermometerSun,
  LayoutGrid, List, Link2
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { format } from "date-fns";
import ClientsTable from "./ClientsTable";
import TagSelector from "../tags/TagSelector";
import QuickContactActions from "./QuickContactActions";
import { useAgentNames } from "@/components/common/useAgentNames";
import { useAuditLog } from "../audit/useAuditLog";

// Lazy load heavy components
const CommunicationHistory = lazy(() => import("./CommunicationHistory"));
const WhatsAppConversation = lazy(() => import("./WhatsAppConversation"));
const AddCommunicationDialog = lazy(() => import("./AddCommunicationDialog"));
const SendEmailDialog = lazy(() => import("../email/SendEmailDialog"));
const EmailHistoryPanel = lazy(() => import("../email/EmailHistoryPanel"));
const ClientPortalManager = lazy(() => import("./ClientPortalManager"));
const OpportunityFormDialog = lazy(() => import("../opportunities/OpportunityFormDialog"));

// Component to show elected properties summary
function ElectedPropertiesSummary({ contactId }) {
  const { data: propertyFeedback = [] } = useQuery({
    queryKey: ['propertyFeedback', contactId],
    queryFn: async () => {
      if (!contactId) return [];
      return await base44.entities.PropertyFeedback.filter({ contact_id: contactId });
    },
    enabled: !!contactId
  });

  const { data: properties = [] } = useQuery({
    queryKey: ['propertiesForFeedback'],
    queryFn: () => base44.entities.Property.list('-created_date', 100),
    enabled: propertyFeedback.length > 0
  });

  const favoriteIds = propertyFeedback.filter(f => f.feedback_type === 'favorite').map(f => f.property_id);
  const electedProperties = properties.filter(p => favoriteIds.includes(p.id));

  if (electedProperties.length === 0) {
    return null;
  }

  return (
    <Card className="border-amber-200 bg-amber-50/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
          Imóveis Eleitos ({electedProperties.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {electedProperties.slice(0, 3).map(property => (
            <div key={property.id} className="flex items-center gap-3 p-2 bg-white rounded-lg border">
              {property.images?.[0] ? (
                <img 
                  src={property.images[0]} 
                  alt={property.title}
                  className="w-12 h-12 object-cover rounded-lg flex-shrink-0"
                />
              ) : (
                <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Home className="w-5 h-5 text-slate-300" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-slate-900 truncate">{property.title}</p>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <MapPin className="w-3 h-3" />
                  {property.city}
                  <span className="font-medium text-slate-700">€{property.price?.toLocaleString()}</span>
                </div>
              </div>
              <a 
                href={`${createPageUrl("PropertyDetails")}?id=${property.id}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <Eye className="w-4 h-4" />
                </Button>
              </a>
            </div>
          ))}
          {electedProperties.length > 3 && (
            <p className="text-xs text-amber-600 text-center pt-1">
              +{electedProperties.length - 3} mais imóveis eleitos
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

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


// Loading fallback component
const LoadingFallback = () => (
  <div className="flex items-center justify-center py-8">
    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-600" />
  </div>
);

export default function ClientDatabase() {
    const queryClient = useQueryClient();
    const { getAgentName, getAgentOptions } = useAgentNames();
    const { logAction } = useAuditLog();
    const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState([]);
  const [hasRequirementsFilter, setHasRequirementsFilter] = useState("all");
  const [assignedAgentFilter, setAssignedAgentFilter] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [commDialogOpen, setCommDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [viewMode, setViewMode] = useState("table");
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState(null);
  const [opportunityDialogOpen, setOpportunityDialogOpen] = useState(false);


  const [formData, setFormData] = useState({
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
        property_requirements: null,
        assigned_agent: ""
      });

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list('full_name'),
    enabled: !!user && (user.role === 'admin' || user.user_type?.toLowerCase() === 'admin' || user.user_type?.toLowerCase() === 'gestor')
  });

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['clientContacts', user?.email],
    queryFn: async () => {
      if (!user) return [];
      
      const userType = user.user_type?.toLowerCase() || '';
      const permissions = user.permissions || {};
      
      // Admins e gestores veem todos
      if (user.role === 'admin' || userType === 'admin' || userType === 'gestor') {
        return await base44.entities.ClientContact.list('-created_date');
      }
      
      // Verifica permissão canViewAllLeads ou canViewAllContacts
      if (permissions.canViewAllLeads === true || permissions.canViewAllContacts === true) {
        return await base44.entities.ClientContact.list('-created_date');
      }
      
      // Para agentes: buscar apenas os contactos atribuídos ou criados por eles
      const [assignedContacts, createdContacts] = await Promise.all([
        base44.entities.ClientContact.filter({ assigned_agent: user.email }, '-created_date'),
        base44.entities.ClientContact.filter({ created_by: user.email }, '-created_date')
      ]);
      
      // Combinar e remover duplicados
      const contactMap = new Map();
      [...assignedContacts, ...createdContacts].forEach(c => {
        if (!contactMap.has(c.id)) contactMap.set(c.id, c);
      });
      
      // Ordenar por data de criação decrescente
      return Array.from(contactMap.values()).sort((a, b) => 
        new Date(b.created_date) - new Date(a.created_date)
      );
    },
    enabled: !!user,
    staleTime: 30000 // 30 second cache
  });

  // Lazy load communications only when needed (not on initial render)
  const { data: communications = [] } = useQuery({
    queryKey: ['communicationLogs', user?.email],
    queryFn: async () => {
      if (!user) return [];
      const allComms = await base44.entities.CommunicationLog.list('-communication_date', 200);
      
      const userType = user.user_type?.toLowerCase() || '';
      if (user.role === 'admin' || userType === 'admin' || userType === 'gestor') {
        return allComms;
      }
      
      return allComms.filter(c => c.agent_email === user.email || c.created_by === user.email);
    },
    enabled: !!user,
    staleTime: 60000 // 1 minute cache
  });

  // Lazy load opportunities with limit
  const { data: opportunities = [] } = useQuery({
    queryKey: ['opportunities', user?.email],
    queryFn: async () => {
      if (!user) return [];
      const allOpps = await base44.entities.Opportunity.list('-created_date', 500);
      
      const userType = user.user_type?.toLowerCase() || '';
      if (user.role === 'admin' || userType === 'admin' || userType === 'gestor') {
        return allOpps;
      }
      
      return allOpps.filter(o => 
        o.seller_email === user.email || o.assigned_to === user.email || o.created_by === user.email
      );
    },
    enabled: !!user,
    staleTime: 60000 // 1 minute cache
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const { data: refData } = await base44.functions.invoke('generateRefId', { entity_type: 'ClientContact' });
      return base44.entities.ClientContact.create({ ...data, ref_id: refData.ref_id });
    },
    onSuccess: async (result) => {
      await logAction('create', 'ClientContact', result.id, result.full_name);
      toast.success("Contacto criado");
      queryClient.invalidateQueries({ queryKey: ['clientContacts'] });
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      console.log('Updating contact:', id, data);
      const result = await base44.entities.ClientContact.update(id, data);
      console.log('Update result:', result);
      return result;
    },
    onSuccess: async (_, variables) => {
      const contact = clients.find(c => c.id === variables.id);
      await logAction('update', 'ClientContact', variables.id, contact?.full_name, {
        fields_changed: Object.keys(variables.data)
      });
      
      toast.success("Contacto atualizado");
      await queryClient.invalidateQueries({ queryKey: ['clientContacts'] });

      // Refresh selectedClient with updated data from the server
      if (selectedClient && selectedClient.id === variables.id) {
        const updatedClients = await base44.entities.ClientContact.filter({ id: variables.id });
        if (updatedClients.length > 0) {
          setSelectedClient(updatedClients[0]);
        }
      }
      resetForm();
    },
    onError: (error) => {
      console.error('Update error:', error);
      toast.error("Erro ao atualizar contacto");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ClientContact.delete(id),
    onSuccess: async (_, deletedId) => {
      const deleted = clients.find(c => c.id === deletedId);
      await logAction('delete', 'ClientContact', deletedId, deleted?.full_name);
      
      toast.success("Contacto eliminado");
      queryClient.invalidateQueries({ queryKey: ['clientContacts'] });
      setSelectedClient(null);
    }
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids) => {
      let deleted = 0;
      let failed = 0;
      for (const id of ids) {
        try {
          await base44.entities.ClientContact.delete(id);
          deleted++;
        } catch (error) {
          console.error(`Erro ao eliminar contacto ${id}:`, error);
          failed++;
        }
      }
      return { deleted, failed };
    },
    onSuccess: (result) => {
      if (result.failed > 0) {
        toast.warning(`${result.deleted} contactos eliminados, ${result.failed} falharam`);
      } else {
        toast.success(`${result.deleted} contactos eliminados com sucesso!`);
      }
      setSelectedContacts([]);
      setBulkDeleteConfirm(false);
      queryClient.invalidateQueries({ queryKey: ['clientContacts'] });
    },
    onError: (error) => {
      console.error("Erro na eliminação em massa:", error);
      toast.error("Erro ao eliminar contactos");
      setBulkDeleteConfirm(false);
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

  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0, isRunning: false });

      const bulkEditMutation = useMutation({
        mutationFn: async ({ ids, data }) => {
          const contactsToUpdate = clients.filter(c => ids.includes(c.id));
          let updated = 0;
          let failed = 0;
          const total = contactsToUpdate.length;

          setBulkProgress({ current: 0, total, isRunning: true });

          for (let i = 0; i < contactsToUpdate.length; i++) {
            const contact = contactsToUpdate[i];
            try {
              const updateData = {};

              // Only update non-empty fields
              if (data.contact_type) updateData.contact_type = data.contact_type;
              if (data.status) updateData.status = data.status;
              if (data.source) updateData.source = data.source;
              if (data.city) updateData.city = data.city;
              if (data.assigned_agent) updateData.assigned_agent = data.assigned_agent;

              // Handle tags
              let currentTags = [...(contact.tags || [])];
              if (data.add_tags?.length > 0) {
                data.add_tags.forEach(tag => {
                  if (!currentTags.includes(tag)) currentTags.push(tag);
                });
              }
              if (data.remove_tags?.length > 0) {
                currentTags = currentTags.filter(t => !data.remove_tags.includes(t));
              }
              if (data.add_tags?.length > 0 || data.remove_tags?.length > 0) {
                updateData.tags = currentTags;
              }

              if (Object.keys(updateData).length > 0) {
                await base44.entities.ClientContact.update(contact.id, updateData);
                updated++;
              }
            } catch (error) {
              console.error(`Erro ao atualizar contacto ${contact.id}:`, error);
              failed++;
            }
            setBulkProgress({ current: i + 1, total, isRunning: true });
          }
          setBulkProgress({ current: total, total, isRunning: false });
          return { updated, failed };
        },
    onSuccess: (result) => {
      if (result.failed > 0) {
        toast.warning(`${result.updated} contactos atualizados, ${result.failed} falharam`);
      } else {
        toast.success(`${result.updated} contactos atualizados com sucesso!`);
      }
      setSelectedContacts([]);
      setBulkEditDialogOpen(false);
      setBulkEditData({
        contact_type: "",
        status: "",
        source: "",
        city: "",
        assigned_agent: "",
        add_tags: [],
        remove_tags: []
      });
      queryClient.invalidateQueries({ queryKey: ['clientContacts'] });
    },
    onError: (error) => {
      console.error("Erro na edição em massa:", error);
      toast.error("Erro ao atualizar contactos");
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
              property_requirements: client.property_requirements || null,
              assigned_agent: client.assigned_agent || ""
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      assigned_agent: editingClient ? formData.assigned_agent : (formData.assigned_agent || user?.email)
    };
    
    if (editingClient) {
      updateMutation.mutate({ id: editingClient.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [bulkEditDialogOpen, setBulkEditDialogOpen] = useState(false);
  const [bulkEditData, setBulkEditData] = useState({
    contact_type: "",
    status: "",
    source: "",
    city: "",
    assigned_agent: "",
    add_tags: [],
    remove_tags: []
  });

  const handleDelete = (id, name, e) => {
    // Prevent event propagation issues on mobile
    if (e && typeof e.stopPropagation === 'function') {
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

  const toggleSelectContact = useCallback((id) => {
    setSelectedContacts(prev =>
      prev.includes(id) ? prev.filter(cid => cid !== id) : [...prev, id]
    );
  }, []);

  // Memoized maps for O(1) lookups instead of O(n) filters
  const communicationsByContact = useMemo(() => {
    const map = new Map();
    communications.forEach(c => {
      if (!map.has(c.contact_id)) map.set(c.contact_id, []);
      map.get(c.contact_id).push(c);
    });
    return map;
  }, [communications]);

  const opportunitiesByContact = useMemo(() => {
    const map = new Map();
    opportunities.forEach(o => {
      if (o.profile_id) {
        if (!map.has(o.profile_id)) map.set(o.profile_id, []);
        map.get(o.profile_id).push(o);
      }
    });
    return map;
  }, [opportunities]);

  const getClientCommunications = useCallback((clientId) => {
    return communicationsByContact.get(clientId) || [];
  }, [communicationsByContact]);

  const getClientOpportunities = useCallback((client) => {
    const fromProfile = opportunitiesByContact.get(client.id) || [];
    const linkedIds = client.linked_opportunity_ids || [];
    if (linkedIds.length === 0) return fromProfile;

    const linkedOpps = opportunities.filter(o => linkedIds.includes(o.id));
    const combined = [...fromProfile];
    linkedOpps.forEach(o => {
      if (!combined.find(x => x.id === o.id)) combined.push(o);
    });
    return combined;
  }, [opportunitiesByContact, opportunities]);

  // Disable matching score calculation - too slow
  const getMatchingScore = useCallback(() => 0, []);

  // Memoized unique values for filters
  const { allCities, allTags, allAssignedAgents } = useMemo(() => ({
    allCities: [...new Set(clients.map(c => c.city).filter(Boolean))].sort(),
    allTags: [...new Set(clients.flatMap(c => c.tags || []))].sort(),
    allAssignedAgents: [...new Set(clients.map(c => c.assigned_agent).filter(Boolean))].sort()
  }), [clients]);

  const agentOptions = useMemo(() => getAgentOptions(), [getAgentOptions]);

  // Memoized filtered clients with optimized search
  const filteredClients = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();
    const validContactTypes = ["client", "partner", "investor", "vendor", "promoter", "other"];
    const tagFilterSet = new Set(tagFilter);
    const agentFilterSet = new Set(assignedAgentFilter);
    const hasNone = agentFilterSet.has("none");

    return clients.filter(c => {
      // Quick filters first (most selective)
      if (typeFilter !== "all") {
        if (typeFilter === "empty") {
          if (c.contact_type && c.contact_type !== "" && c.contact_type !== "--" && validContactTypes.includes(c.contact_type)) return false;
        } else if (c.contact_type !== typeFilter) return false;
      }
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (sourceFilter !== "all" && c.source !== sourceFilter) return false;
      if (cityFilter !== "all" && c.city !== cityFilter) return false;

      if (tagFilterSet.size > 0) {
        const clientTags = c.tags || [];
        if (!clientTags.some(t => tagFilterSet.has(t))) return false;
      }

      if (agentFilterSet.size > 0) {
        const matchesAgent = agentFilterSet.has(c.assigned_agent);
        const matchesNone = hasNone && !c.assigned_agent;
        if (!matchesAgent && !matchesNone) return false;
      }

      if (hasRequirementsFilter !== "all") {
        const req = c.property_requirements;
        const hasReqs = req && (req.budget_min || req.budget_max || req.locations?.length || req.property_types?.length);
        if (hasRequirementsFilter === "yes" && !hasReqs) return false;
        if (hasRequirementsFilter === "no" && hasReqs) return false;
      }

      // Search last (most expensive)
      if (searchLower) {
        if (!(c.full_name?.toLowerCase().includes(searchLower) ||
              c.email?.toLowerCase().includes(searchLower) ||
              c.phone?.includes(searchTerm) ||
              c.company_name?.toLowerCase().includes(searchLower))) return false;
      }

      return true;
    });
  }, [clients, searchTerm, typeFilter, statusFilter, sourceFilter, cityFilter, tagFilter, hasRequirementsFilter, assignedAgentFilter]);

  // Memoized selected set for O(1) lookup in cards
  const selectedContactsSet = useMemo(() => new Set(selectedContacts), [selectedContacts]);

  // toggleSelectAll needs to be after filteredClients is defined
  const toggleSelectAll = useCallback(() => {
    setSelectedContacts(prev =>
      prev.length === filteredClients.length ? [] : filteredClients.map(c => c.id)
    );
  }, [filteredClients]);

  const typeLabels = useMemo(() => ({
    client: "Cliente",
    partner: "Parceiro",
    investor: "Investidor",
    vendor: "Fornecedor",
    promoter: "Promotor",
    other: "Outro"
  }), []);

  const typeColors = useMemo(() => ({
    client: "bg-blue-100 text-blue-800",
    partner: "bg-purple-100 text-purple-800",
    investor: "bg-green-100 text-green-800",
    vendor: "bg-orange-100 text-orange-800",
    promoter: "bg-indigo-100 text-indigo-800",
    other: "bg-slate-100 text-slate-800"
  }), []);

  const statusColors = useMemo(() => ({
    active: "bg-green-100 text-green-800",
    inactive: "bg-slate-100 text-slate-600",
    prospect: "bg-amber-100 text-amber-800"
  }), []);

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
                      <SelectItem value="promoter">Promotor</SelectItem>
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

              <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label>Data de Nascimento</Label>
                      <Input
                        type="date"
                        value={formData.birthday}
                        onChange={(e) => setFormData({...formData, birthday: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label>Responsável</Label>
                      <Select 
                        value={formData.assigned_agent || ""} 
                        onValueChange={(v) => setFormData({...formData, assigned_agent: v})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecionar responsável..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={null}>Sem responsável</SelectItem>
                          {users.map((u) => (
                            <SelectItem key={u.id} value={u.email}>
                              {u.display_name || u.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

              <div>
                <Label>Etiquetas</Label>
                <TagSelector
                  selectedTags={formData.tags}
                  onTagsChange={(tags) => setFormData({...formData, tags})}
                  category="contact"
                  placeholder="Adicionar etiquetas..."
                  allowCreate={true}
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
                                        <SelectItem value="promoter">Promotores</SelectItem>
                                        <SelectItem value="other">Outro</SelectItem>
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
              <div className="grid md:grid-cols-6 gap-3 pt-3 border-t">
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
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="justify-between w-full">
                      {tagFilter.length === 0 ? "Todas Tags" : `${tagFilter.length} tag(s)`}
                      <ChevronDown className="w-4 h-4 ml-2" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-48 p-2" align="start">
                    <div className="max-h-48 overflow-y-auto space-y-1">
                      {allTags.map(tag => (
                        <label key={tag} className="flex items-center gap-2 p-2 rounded hover:bg-slate-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={tagFilter.includes(tag)}
                            onChange={() => setTagFilter(prev => 
                              prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
                            )}
                            className="rounded border-slate-300"
                          />
                          <span className="text-sm">{tag}</span>
                        </label>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
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
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="justify-between w-full">
                      {assignedAgentFilter.length === 0 ? "Todos Responsáveis" : `${assignedAgentFilter.length} selecionado(s)`}
                      <ChevronDown className="w-4 h-4 ml-2" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-2" align="start">
                    <div className="max-h-48 overflow-y-auto space-y-1">
                      <label className="flex items-center gap-2 p-2 rounded hover:bg-slate-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={assignedAgentFilter.includes("none")}
                          onChange={() => setAssignedAgentFilter(prev => 
                            prev.includes("none") ? prev.filter(a => a !== "none") : [...prev, "none"]
                          )}
                          className="rounded border-slate-300"
                        />
                        <span className="text-sm text-slate-600">Sem Responsável</span>
                      </label>
                      {agentOptions.map(agent => (
                        <label key={agent.value} className="flex items-center gap-2 p-2 rounded hover:bg-slate-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={assignedAgentFilter.includes(agent.value)}
                            onChange={() => setAssignedAgentFilter(prev => 
                              prev.includes(agent.value) ? prev.filter(a => a !== agent.value) : [...prev, agent.value]
                            )}
                            className="rounded border-slate-300"
                          />
                          <span className="text-sm">{agent.label}</span>
                        </label>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
                <Button 
                  variant="ghost" 
                  onClick={() => {
                    setTypeFilter("all");
                    setStatusFilter("all");
                    setSourceFilter("all");
                    setCityFilter("all");
                    setTagFilter([]);
                    setHasRequirementsFilter("all");
                    setAssignedAgentFilter([]);
                    setSearchTerm("");
                  }}
                  className="text-slate-600"
                >
                  Limpar Filtros
                </Button>
              </div>
            )}

            {/* Quick Agent Filter Tags */}
            {agentOptions.length > 0 && (
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-xs text-slate-500 flex items-center mr-1">Responsável:</span>
                {agentOptions.map(agent => (
                  <Badge 
                    key={agent.value}
                    variant={assignedAgentFilter.includes(agent.value) ? "default" : "outline"}
                    className="cursor-pointer hover:bg-slate-100"
                    onClick={() => setAssignedAgentFilter(prev => 
                      prev.includes(agent.value) ? prev.filter(a => a !== agent.value) : [...prev, agent.value]
                    )}
                  >
                    <User className="w-3 h-3 mr-1" />
                    {agent.shortLabel}
                  </Badge>
                ))}
                <Badge 
                  variant={assignedAgentFilter.includes("none") ? "default" : "outline"}
                  className="cursor-pointer hover:bg-slate-100"
                  onClick={() => setAssignedAgentFilter(prev => 
                    prev.includes("none") ? prev.filter(a => a !== "none") : [...prev, "none"]
                  )}
                >
                  Sem Responsável
                </Badge>
                {assignedAgentFilter.length > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 px-2 text-xs text-slate-500"
                    onClick={() => setAssignedAgentFilter([])}
                  >
                    Limpar
                  </Button>
                )}
              </div>
            )}

            {/* Quick Tags */}
            {allTags.length > 0 && (
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-xs text-slate-500 flex items-center mr-1">Tags:</span>
                {allTags.slice(0, 10).map(tag => (
                  <Badge 
                    key={tag}
                    variant={tagFilter.includes(tag) ? "default" : "outline"}
                    className="cursor-pointer hover:bg-slate-100"
                    onClick={() => setTagFilter(prev => 
                      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
                    )}
                  >
                    <TagIcon className="w-3 h-3 mr-1" />
                    {tag}
                  </Badge>
                ))}
                {tagFilter.length > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 px-2 text-xs text-slate-500"
                    onClick={() => setTagFilter([])}
                  >
                    Limpar
                  </Button>
                )}
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setBulkEditDialogOpen(true)}
                  className="bg-white"
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Editar em Massa
                </Button>
                <Select onValueChange={(value) => bulkUpdateTypeMutation.mutate({ ids: selectedContacts, type: value })}>
                  <SelectTrigger className="w-40 h-8 text-sm bg-white">
                    <SelectValue placeholder="Alterar tipo..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="client">Cliente</SelectItem>
                    <SelectItem value="partner">Parceiro</SelectItem>
                    <SelectItem value="investor">Investidor</SelectItem>
                    <SelectItem value="vendor">Fornecedor</SelectItem>
                    <SelectItem value="promoter">Promotor</SelectItem>
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
                <Button variant="outline" size="sm" onClick={() => setSelectedContacts([])} className="bg-white">
                  Cancelar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* View Mode Toggle */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm"
            onClick={toggleSelectAll}
          >
            {selectedContacts.length === filteredClients.length && filteredClients.length > 0 
              ? 'Desselecionar Todos' 
              : 'Selecionar Todos'}
          </Button>
          {selectedContacts.length > 0 && (
            <span className="text-sm text-slate-600">
              {selectedContacts.length} de {filteredClients.length} selecionado(s)
            </span>
          )}
        </div>
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
          selectedContacts={selectedContacts}
          onSelectionChange={setSelectedContacts}
        />
      ) : (
      <div className="grid gap-4">
        {filteredClients.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <User className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Nenhum contacto encontrado</h3>
              <p className="text-slate-600">
                {clients.length === 0 
                  ? "Não tem contactos atribuídos. Crie um novo contacto para começar."
                  : "Ajuste os filtros de pesquisa para ver resultados."}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredClients.slice(0, 50).map((client) => {
            const clientComms = getClientCommunications(client.id);
            const clientOpps = getClientOpportunities(client);
            const req = client.property_requirements;
            const hasRequirements = req && (req.budget_min || req.budget_max || req.locations?.length || req.property_types?.length);
            
            return (
              <Card key={client.id} className={`hover:shadow-md transition-shadow ${selectedContactsSet.has(client.id) ? 'ring-2 ring-blue-500 bg-blue-50/50' : ''}`}>
                <CardContent className="p-4 md:p-6">
                  {/* Mobile Header with Avatar and Actions */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                   <div className="flex items-center gap-3 min-w-0 flex-1">
                     {/* Checkbox for selection - More Prominent */}
                     <div 
                       className="flex-shrink-0 p-2 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer" 
                       onClick={(e) => { e.stopPropagation(); toggleSelectContact(client.id); }}
                     >
                       <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                         selectedContactsSet.has(client.id) 
                           ? 'bg-blue-600 border-blue-600' 
                           : 'border-slate-300 bg-white hover:border-blue-400'
                       }`}>
                         {selectedContactsSet.has(client.id) && (
                           <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                           </svg>
                         )}
                       </div>
                     </div>
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
                    
                    {/* Requirements Indicator */}
                    {hasRequirements && (
                      <div className="text-center p-2 md:p-3 bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg md:rounded-xl border border-purple-100 flex-shrink-0">
                        <Sparkles className="w-4 h-4 text-purple-500 mx-auto" />
                        <span className="text-xs text-purple-600">Requisitos</span>
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
                <TabsTrigger value="opportunities" className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  Oportunidades
                </TabsTrigger>
                <TabsTrigger value="emails" className="flex items-center gap-1">
                  <Mail className="w-3 h-3" />
                  Emails
                </TabsTrigger>
                <TabsTrigger value="whatsapp" className="flex items-center gap-1">
                  <MessageSquare className="w-3 h-3 text-green-600" />
                  WhatsApp
                </TabsTrigger>
                <TabsTrigger value="communications">Comunicações</TabsTrigger>
                <TabsTrigger value="portal" className="flex items-center gap-1">
                  <Link2 className="w-3 h-3" />
                  Portal
                </TabsTrigger>
              </TabsList>

              <TabsContent value="opportunities" className="mt-4">
                {/* Opportunities List with Quick Access */}
                <div className="space-y-3">
                  {getClientOpportunities(selectedClient).length === 0 ? (
                    <Card className="text-center py-8">
                      <CardContent>
                        <Target className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-600 mb-3">Sem oportunidades associadas</p>
                        <Button 
                          onClick={() => setOpportunityDialogOpen(true)}
                          size="sm"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Criar Oportunidade
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-slate-900">
                          {getClientOpportunities(selectedClient).length} Oportunidade{getClientOpportunities(selectedClient).length > 1 ? 's' : ''}
                        </h4>
                        <Button 
                          onClick={() => setOpportunityDialogOpen(true)}
                          size="sm"
                          variant="outline"
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Nova
                        </Button>
                      </div>
                      {getClientOpportunities(selectedClient).map(opp => (
                        <Card key={opp.id} className="hover:shadow-md transition-shadow cursor-pointer">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                  {opp.ref_id && (
                                    <Badge variant="outline" className="text-xs font-mono">
                                      {opp.ref_id}
                                    </Badge>
                                  )}
                                  <Badge className={
                                    opp.status === 'new' ? 'bg-blue-100 text-blue-800' :
                                    opp.status === 'contacted' ? 'bg-purple-100 text-purple-800' :
                                    opp.status === 'visit_scheduled' ? 'bg-amber-100 text-amber-800' :
                                    opp.status === 'proposal' ? 'bg-indigo-100 text-indigo-800' :
                                    opp.status === 'negotiation' ? 'bg-orange-100 text-orange-800' :
                                    opp.status === 'won' ? 'bg-green-100 text-green-800' :
                                    'bg-red-100 text-red-800'
                                  }>
                                    {opp.status === 'new' ? 'Novo' :
                                     opp.status === 'contacted' ? 'Contactado' :
                                     opp.status === 'visit_scheduled' ? 'Visita Agendada' :
                                     opp.status === 'proposal' ? 'Proposta' :
                                     opp.status === 'negotiation' ? 'Negociação' :
                                     opp.status === 'won' ? 'Ganho' : 'Perdido'}
                                  </Badge>
                                  {opp.qualification_status && (
                                    <Badge className={
                                      opp.qualification_status === 'hot' ? 'bg-red-500 text-white' :
                                      opp.qualification_status === 'warm' ? 'bg-orange-500 text-white' :
                                      opp.qualification_status === 'cold' ? 'bg-blue-500 text-white' :
                                      'bg-slate-400 text-white'
                                    }>
                                      {opp.qualification_status === 'hot' ? '🔥 Hot' :
                                       opp.qualification_status === 'warm' ? '🌡️ Warm' :
                                       opp.qualification_status === 'cold' ? '❄️ Cold' : 'Não Qualificado'}
                                    </Badge>
                                  )}
                                </div>
                                <p className="font-medium text-slate-900 mb-1">
                                  {opp.lead_type === 'comprador' ? '🏠 Comprador' : 
                                   opp.lead_type === 'vendedor' ? '🏷️ Vendedor' : 
                                   opp.lead_type === 'parceiro_comprador' ? '🤝 Parceiro Comprador' : 
                                   '🤝 Parceiro Vendedor'}
                                </p>
                                {opp.property_title && (
                                  <p className="text-sm text-slate-600 flex items-center gap-1 mb-2">
                                    <Building2 className="w-3 h-3" />
                                    {opp.property_title}
                                  </p>
                                )}
                                {opp.budget && (
                                  <p className="text-sm text-green-600 font-medium">
                                    Orçamento: €{opp.budget.toLocaleString()}
                                  </p>
                                )}
                                {opp.estimated_value && (
                                  <p className="text-sm text-blue-600 font-medium">
                                    Valor Estimado: €{opp.estimated_value.toLocaleString()}
                                  </p>
                                )}
                                <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {format(new Date(opp.created_date), "dd/MM/yyyy")}
                                  </span>
                                  {opp.probability && (
                                    <span className="flex items-center gap-1">
                                      <TrendingUp className="w-3 h-3" />
                                      {opp.probability}% prob.
                                    </span>
                                  )}
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  // Abrir o LeadDetailPanel passando esta oportunidade
                                  // Implementar state para mostrar LeadDetailPanel
                                  window.open(`${createPageUrl("CRMAdvanced")}?tab=opportunities&oppId=${opp.id}`, '_blank');
                                }}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                Ver Detalhes
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="emails" className="mt-4">
                <Suspense fallback={<LoadingFallback />}>
                  <EmailHistoryPanel 
                    recipientId={selectedClient.id}
                    recipientType="client"
                  />
                </Suspense>
              </TabsContent>

              <TabsContent value="details" className="mt-4">
                {/* Quick Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
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
                      <p className="text-xs text-purple-600 mb-1">Oportunidades</p>
                      <span className="text-lg font-bold text-purple-900">
                        {getClientOpportunities(selectedClient).length}
                      </span>
                    </CardContent>
                  </Card>
                  <Card className="bg-indigo-50 border-indigo-200">
                    <CardContent className="p-3 text-center">
                      <p className="text-xs text-indigo-600 mb-1">Comunicações</p>
                      <span className="text-lg font-bold text-indigo-900">
                        {getClientCommunications(selectedClient.id).length}
                      </span>
                    </CardContent>
                  </Card>
                  <Card className="bg-amber-50 border-amber-200">
                    <CardContent className="p-3 text-center">
                      <p className="text-xs text-amber-600 mb-1">Origem</p>
                      <span className="text-sm font-medium text-amber-900">
                        {selectedClient.source === 'facebook_ads' ? 'Facebook' : 
                         selectedClient.source === 'website' ? 'Website' :
                         selectedClient.source === 'referral' ? 'Indicação' :
                         selectedClient.source === 'direct_contact' ? 'Direto' :
                         selectedClient.source === 'networking' ? 'Networking' :
                         selectedClient.source || 'N/A'}
                      </span>
                    </CardContent>
                  </Card>
                  <Card className="bg-slate-50 border-slate-200">
                    <CardContent className="p-3 text-center">
                      <p className="text-xs text-slate-600 mb-1">Responsável</p>
                      <span className="text-sm font-medium text-slate-900 truncate block">
                        {getAgentName(selectedClient.assigned_agent, 'short') || 'N/A'}
                      </span>
                    </CardContent>
                  </Card>
                </div>

                {/* Client Header with Photo */}
                <div className="flex items-start gap-4 mb-6 p-4 bg-gradient-to-r from-slate-50 to-white rounded-xl border">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-2xl">
                      {selectedClient.full_name?.[0]?.toUpperCase() || '?'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-xl font-bold text-slate-900">{selectedClient.full_name}</h3>
                      {selectedClient.ref_id && (
                        <Badge variant="outline" className="font-mono text-xs">{selectedClient.ref_id}</Badge>
                      )}
                    </div>
                    {selectedClient.company_name && (
                      <p className="text-slate-600 flex items-center gap-1 mt-1">
                        <Building2 className="w-4 h-4" />
                        {selectedClient.company_name}
                        {selectedClient.job_title && <span className="text-slate-400"> • {selectedClient.job_title}</span>}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      {selectedClient.tags?.map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          <TagIcon className="w-3 h-3 mr-1" />
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Criado: {format(new Date(selectedClient.created_date), "dd/MM/yyyy")}
                      </span>
                      {selectedClient.last_contact_date && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Último contacto: {format(new Date(selectedClient.last_contact_date), "dd/MM/yyyy")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Contact Information */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Phone className="w-4 h-4 text-green-600" />
                        Informação de Contacto
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {selectedClient.email ? (
                        <a href={`mailto:${selectedClient.email}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors group">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <Mail className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-blue-600 group-hover:underline">{selectedClient.email}</p>
                            <p className="text-xs text-slate-500">Email principal</p>
                          </div>
                        </a>
                      ) : (
                        <div className="flex items-center gap-3 p-2 text-slate-400">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                            <Mail className="w-4 h-4" />
                          </div>
                          <span className="text-sm">Sem email</span>
                        </div>
                      )}
                      
                      {selectedClient.phone ? (
                        <a href={`tel:${selectedClient.phone}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors group">
                          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                            <Phone className="w-4 h-4 text-green-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-green-600 group-hover:underline">{selectedClient.phone}</p>
                            <p className="text-xs text-slate-500">Telefone principal</p>
                          </div>
                        </a>
                      ) : (
                        <div className="flex items-center gap-3 p-2 text-slate-400">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                            <Phone className="w-4 h-4" />
                          </div>
                          <span className="text-sm">Sem telefone</span>
                        </div>
                      )}

                      {selectedClient.secondary_phone && (
                        <a href={`tel:${selectedClient.secondary_phone}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors group">
                          <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center">
                            <Phone className="w-4 h-4 text-green-500" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-green-600 group-hover:underline">{selectedClient.secondary_phone}</p>
                            <p className="text-xs text-slate-500">Telefone secundário</p>
                          </div>
                        </a>
                      )}

                      {(selectedClient.address || selectedClient.city) && (
                        <div className="flex items-start gap-3 p-2">
                          <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                            <MapPin className="w-4 h-4 text-red-500" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900">
                              {selectedClient.address || selectedClient.city}
                            </p>
                            {selectedClient.address && (
                              <p className="text-xs text-slate-500">
                                {selectedClient.postal_code && `${selectedClient.postal_code} `}
                                {selectedClient.city}
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {selectedClient.preferred_contact_method && (
                        <div className="flex items-center gap-3 p-2 bg-amber-50 rounded-lg">
                          <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                            <MessageSquare className="w-4 h-4 text-amber-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-amber-800">
                              Prefere {selectedClient.preferred_contact_method === 'phone' ? 'Telefone' : 
                                       selectedClient.preferred_contact_method === 'email' ? 'Email' :
                                       selectedClient.preferred_contact_method === 'whatsapp' ? 'WhatsApp' : 'SMS'}
                            </p>
                            <p className="text-xs text-amber-600">Método de contacto preferido</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Professional & Additional Info */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-purple-600" />
                        Informação Adicional
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {selectedClient.nif && (
                        <div className="flex items-center gap-3 p-2">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                            <TagIcon className="w-4 h-4 text-slate-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900">{selectedClient.nif}</p>
                            <p className="text-xs text-slate-500">NIF / Contribuinte</p>
                          </div>
                        </div>
                      )}

                      {selectedClient.birthday && (
                        <div className="flex items-center gap-3 p-2">
                          <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center">
                            <Calendar className="w-4 h-4 text-pink-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900">{format(new Date(selectedClient.birthday), "dd/MM/yyyy")}</p>
                            <p className="text-xs text-slate-500">Data de nascimento</p>
                          </div>
                        </div>
                      )}

                      {selectedClient.assigned_agent && (
                        <div className="flex items-center gap-3 p-2 bg-indigo-50 rounded-lg">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                            <User className="w-4 h-4 text-indigo-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-indigo-800">{getAgentName(selectedClient.assigned_agent)}</p>
                            <p className="text-xs text-indigo-600">Agente responsável</p>
                          </div>
                        </div>
                      )}

                      {/* Property Requirements Summary */}
                      {selectedClient.property_requirements && (
                        <div className="mt-4 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-100">
                          <h5 className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
                            <Target className="w-4 h-4 text-blue-600" />
                            Requisitos de Imóvel
                          </h5>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            {(selectedClient.property_requirements.budget_min || selectedClient.property_requirements.budget_max) && (
                              <div className="flex items-center gap-1 text-slate-700">
                                <Euro className="w-3 h-3 text-green-600" />
                                {selectedClient.property_requirements.budget_min ? `${(selectedClient.property_requirements.budget_min/1000).toFixed(0)}k` : '0'} - 
                                {selectedClient.property_requirements.budget_max ? ` ${(selectedClient.property_requirements.budget_max/1000).toFixed(0)}k` : ' ∞'}
                              </div>
                            )}
                            {selectedClient.property_requirements.bedrooms_min && (
                              <div className="flex items-center gap-1 text-slate-700">
                                <Bed className="w-3 h-3 text-purple-600" />
                                T{selectedClient.property_requirements.bedrooms_min}+
                              </div>
                            )}
                            {selectedClient.property_requirements.locations?.length > 0 && (
                              <div className="col-span-2 flex items-center gap-1 text-slate-700">
                                <MapPin className="w-3 h-3 text-red-500" />
                                {selectedClient.property_requirements.locations.slice(0, 3).join(', ')}
                                {selectedClient.property_requirements.locations.length > 3 && ` +${selectedClient.property_requirements.locations.length - 3}`}
                              </div>
                            )}
                            {selectedClient.property_requirements.property_types?.length > 0 && (
                              <div className="col-span-2 flex items-center gap-1 text-slate-700">
                                <Home className="w-3 h-3 text-blue-600" />
                                {selectedClient.property_requirements.property_types.slice(0, 2).join(', ')}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Important Dates Section */}
                <Card className="mt-6">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      Datas Importantes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="p-3 bg-slate-50 rounded-lg border text-center">
                        <p className="text-xs text-slate-500 mb-1">Criado em</p>
                        <p className="text-sm font-semibold text-slate-900">
                          {format(new Date(selectedClient.created_date), "dd/MM/yyyy")}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          {Math.floor((new Date() - new Date(selectedClient.created_date)) / (1000 * 60 * 60 * 24))} dias
                        </p>
                      </div>
                      
                      <div className={`p-3 rounded-lg border text-center ${
                        selectedClient.last_contact_date && 
                        new Date(selectedClient.last_contact_date) < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                          ? 'bg-red-50 border-red-200'
                          : 'bg-green-50 border-green-200'
                      }`}>
                        <p className="text-xs text-slate-500 mb-1">Último Contacto</p>
                        <p className={`text-sm font-semibold ${
                          selectedClient.last_contact_date && 
                          new Date(selectedClient.last_contact_date) < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                            ? 'text-red-700'
                            : 'text-green-700'
                        }`}>
                          {selectedClient.last_contact_date 
                            ? format(new Date(selectedClient.last_contact_date), "dd/MM/yyyy")
                            : 'Nunca'}
                        </p>
                        {selectedClient.last_contact_date && (
                          <p className="text-xs text-slate-400 mt-1">
                            há {Math.floor((new Date() - new Date(selectedClient.last_contact_date)) / (1000 * 60 * 60 * 24))} dias
                          </p>
                        )}
                      </div>

                      <div className={`p-3 rounded-lg border text-center ${
                        selectedClient.next_followup_date && 
                        new Date(selectedClient.next_followup_date) < new Date()
                          ? 'bg-amber-50 border-amber-200'
                          : 'bg-blue-50 border-blue-200'
                      }`}>
                        <p className="text-xs text-slate-500 mb-1">Próximo Follow-up</p>
                        <p className={`text-sm font-semibold ${
                          selectedClient.next_followup_date && 
                          new Date(selectedClient.next_followup_date) < new Date()
                            ? 'text-amber-700'
                            : 'text-blue-700'
                        }`}>
                          {selectedClient.next_followup_date 
                            ? format(new Date(selectedClient.next_followup_date), "dd/MM/yyyy")
                            : 'Não agendado'}
                        </p>
                        {selectedClient.next_followup_date && new Date(selectedClient.next_followup_date) < new Date() && (
                          <p className="text-xs text-amber-600 mt-1 font-medium">⚠️ Atrasado</p>
                        )}
                      </div>

                      <div className={`p-3 rounded-lg border text-center ${
                        selectedClient.birthday ? 'bg-pink-50 border-pink-200' : 'bg-slate-50'
                      }`}>
                        <p className="text-xs text-slate-500 mb-1">Aniversário</p>
                        <p className={`text-sm font-semibold ${selectedClient.birthday ? 'text-pink-700' : 'text-slate-400'}`}>
                          {selectedClient.birthday 
                            ? format(new Date(selectedClient.birthday), "dd/MM")
                            : 'Não definido'}
                        </p>
                        {selectedClient.birthday && (() => {
                          const today = new Date();
                          const bday = new Date(selectedClient.birthday);
                          bday.setFullYear(today.getFullYear());
                          if (bday < today) bday.setFullYear(today.getFullYear() + 1);
                          const daysUntil = Math.ceil((bday - today) / (1000 * 60 * 60 * 24));
                          return daysUntil <= 30 ? (
                            <p className="text-xs text-pink-600 mt-1 font-medium">🎂 Em {daysUntil} dias</p>
                          ) : null;
                        })()}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Elected Properties Section */}
                <div className="mt-6">
                  <ElectedPropertiesSummary contactId={selectedClient.id} />
                </div>

                {/* Notes Section */}
                {selectedClient.notes && (
                  <Card className="mt-6">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-slate-600" />
                        Notas
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-slate-600 whitespace-pre-wrap bg-slate-50 p-4 rounded-lg border">
                        {selectedClient.notes}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Quick Contact Actions */}
                <div className="flex flex-wrap gap-2 mt-6 mb-4 p-3 bg-slate-50 rounded-lg border">
                  <div className="w-full mb-2">
                    <span className="text-xs font-medium text-slate-500 uppercase">Ações Rápidas</span>
                  </div>
                  <QuickContactActions 
                    contact={selectedClient} 
                    onCommunicationLogged={() => queryClient.invalidateQueries({ queryKey: ['communicationLogs'] })}
                  />
                </div>

                <div className="flex flex-wrap gap-2">
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
                    onClick={() => { 
                      setEmailRecipient({
                        type: 'client',
                        id: selectedClient.id,
                        name: selectedClient.full_name,
                        email: selectedClient.email,
                        data: selectedClient
                      });
                      setEmailDialogOpen(true);
                    }}
                    className="bg-blue-600 hover:bg-blue-700"
                    disabled={!selectedClient.email}
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Enviar Email
                  </Button>
                  <Button 
                    onClick={() => { setCommDialogOpen(true); }}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Registar Comunicação
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

              <TabsContent value="whatsapp" className="mt-4">
                <Suspense fallback={<LoadingFallback />}>
                  <WhatsAppConversation 
                    contact={selectedClient} 
                    onMessageSent={() => queryClient.invalidateQueries({ queryKey: ['communicationLogs'] })}
                  />
                </Suspense>
              </TabsContent>

              <TabsContent value="communications" className="mt-4">
                <Suspense fallback={<LoadingFallback />}>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-semibold text-slate-900">
                        {getClientCommunications(selectedClient.id).length} Comunicação{getClientCommunications(selectedClient.id).length !== 1 ? 'ões' : ''}
                      </h4>
                      <Button 
                        onClick={() => setCommDialogOpen(true)}
                        size="sm"
                        variant="outline"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Registar
                      </Button>
                    </div>
                    <CommunicationHistory contactId={selectedClient.id} />
                  </div>
                </Suspense>
              </TabsContent>

              <TabsContent value="portal" className="mt-4">
                <Suspense fallback={<LoadingFallback />}>
                  <ClientPortalManager client={selectedClient} />
                </Suspense>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      )}

      {/* Add Communication Dialog */}
      {selectedClient && commDialogOpen && (
        <Suspense fallback={null}>
          <AddCommunicationDialog
            open={commDialogOpen}
            onOpenChange={setCommDialogOpen}
            contactId={selectedClient.id}
            contactName={selectedClient.full_name}
          />
        </Suspense>
      )}

      {/* Send Email Dialog */}
      {emailDialogOpen && (
        <Suspense fallback={null}>
          <SendEmailDialog
            open={emailDialogOpen}
            onOpenChange={setEmailDialogOpen}
            recipient={emailRecipient}
          />
        </Suspense>
      )}

      {/* Opportunity Form Dialog */}
      {selectedClient && opportunityDialogOpen && (
        <Suspense fallback={null}>
          <OpportunityFormDialog
            open={opportunityDialogOpen}
            onOpenChange={setOpportunityDialogOpen}
            prefillContact={selectedClient}
            onSaved={() => {
              queryClient.invalidateQueries({ queryKey: ['opportunities'] });
            }}
          />
        </Suspense>
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

      {/* Bulk Edit Dialog */}
      <Dialog open={bulkEditDialogOpen} onOpenChange={setBulkEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5 text-blue-600" />
              Editar {selectedContacts.length} Contactos em Massa
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm text-slate-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
              ⚠️ Apenas os campos preenchidos serão alterados. Campos vazios serão ignorados.
            </p>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Tipo de Contacto</Label>
                <Select 
                  value={bulkEditData.contact_type} 
                  onValueChange={(v) => setBulkEditData({...bulkEditData, contact_type: v})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Não alterar..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Não alterar</SelectItem>
                    <SelectItem value="client">Cliente</SelectItem>
                    <SelectItem value="partner">Parceiro</SelectItem>
                    <SelectItem value="investor">Investidor</SelectItem>
                    <SelectItem value="vendor">Fornecedor</SelectItem>
                    <SelectItem value="promoter">Promotor</SelectItem>
                    <SelectItem value="other">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Estado</Label>
                <Select 
                  value={bulkEditData.status} 
                  onValueChange={(v) => setBulkEditData({...bulkEditData, status: v})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Não alterar..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Não alterar</SelectItem>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                    <SelectItem value="prospect">Prospect</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Origem</Label>
                <Select 
                  value={bulkEditData.source} 
                  onValueChange={(v) => setBulkEditData({...bulkEditData, source: v})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Não alterar..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Não alterar</SelectItem>
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
                <Label>Cidade</Label>
                <Select 
                  value={bulkEditData.city} 
                  onValueChange={(v) => setBulkEditData({...bulkEditData, city: v})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Não alterar..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Não alterar</SelectItem>
                    {allCities.map(city => (
                      <SelectItem key={city} value={city}>{city}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2">
                <Label>Responsável</Label>
                <Select 
                  value={bulkEditData.assigned_agent} 
                  onValueChange={(v) => setBulkEditData({...bulkEditData, assigned_agent: v})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Não alterar..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Não alterar</SelectItem>
                    <SelectItem value="__remove__">Remover responsável</SelectItem>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.email}>
                        {u.display_name || u.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="border-t pt-4">
              <Label className="mb-2 block">Adicionar Etiquetas</Label>
              <TagSelector
                selectedTags={bulkEditData.add_tags}
                onTagsChange={(tags) => setBulkEditData({...bulkEditData, add_tags: tags})}
                category="contact"
                placeholder="Etiquetas a adicionar..."
                allowCreate={false}
              />
            </div>

            <div>
              <Label className="mb-2 block">Remover Etiquetas</Label>
              <TagSelector
                selectedTags={bulkEditData.remove_tags}
                onTagsChange={(tags) => setBulkEditData({...bulkEditData, remove_tags: tags})}
                category="contact"
                placeholder="Etiquetas a remover..."
                allowCreate={false}
              />
            </div>
          </div>

          {bulkProgress.isRunning && (
                          <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-blue-700">A atualizar contactos...</span>
                              <span className="text-sm font-bold text-blue-700">
                                {Math.round((bulkProgress.current / bulkProgress.total) * 100)}%
                              </span>
                            </div>
                            <Progress value={(bulkProgress.current / bulkProgress.total) * 100} className="h-2" />
                            <p className="text-xs text-blue-600 mt-1">
                              {bulkProgress.current} de {bulkProgress.total} contactos processados
                            </p>
                          </div>
                        )}

                        <div className="flex gap-2 pt-2">
                          <Button 
                            variant="outline" 
                            onClick={() => {
                              setBulkEditDialogOpen(false);
                              setBulkEditData({
                                contact_type: "",
                                status: "",
                                source: "",
                                city: "",
                                assigned_agent: "",
                                add_tags: [],
                                remove_tags: []
                              });
                            }}
                            className="flex-1"
                            disabled={bulkProgress.isRunning}
                          >
                            Cancelar
                          </Button>
                          <Button 
                            onClick={() => {
                              const dataToSend = {...bulkEditData};
                              if (dataToSend.assigned_agent === "__remove__") {
                                dataToSend.assigned_agent = "";
                              }
                              bulkEditMutation.mutate({ ids: selectedContacts, data: dataToSend });
                            }}
                            disabled={bulkEditMutation.isPending || bulkProgress.isRunning}
                            className="flex-1 bg-blue-600 hover:bg-blue-700"
                          >
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            {bulkProgress.isRunning ? `${Math.round((bulkProgress.current / bulkProgress.total) * 100)}%` : `Atualizar ${selectedContacts.length} Contactos`}
                          </Button>
                        </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}