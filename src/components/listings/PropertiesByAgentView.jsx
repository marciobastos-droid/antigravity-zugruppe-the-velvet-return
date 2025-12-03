import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Search, User, Building2, MapPin, Euro, UserCog, Filter, Users, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function PropertiesByAgentView() {
  const queryClient = useQueryClient();
  const [searchAgent, setSearchAgent] = useState("");
  const [selectedAgentFilter, setSelectedAgentFilter] = useState("all");
  const [reassignDialogOpen, setReassignDialogOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [newAgent, setNewAgent] = useState("");
  const [expandedAgents, setExpandedAgents] = useState(new Set());

  const { data: properties = [], isLoading: loadingProperties } = useQuery({
    queryKey: ['allProperties'],
    queryFn: () => base44.entities.Property.list('-updated_date'),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  // Criar mapa de agentes
  const agentMap = useMemo(() => {
    const map = {};
    users.forEach(u => {
      map[u.email] = u.display_name || u.full_name || u.email.split('@')[0];
    });
    return map;
  }, [users]);

  // Filtrar agentes pela pesquisa
  const filteredAgents = useMemo(() => {
    if (!searchAgent) return users;
    const search = searchAgent.toLowerCase();
    return users.filter(u => 
      (u.display_name || u.full_name || u.email).toLowerCase().includes(search)
    );
  }, [users, searchAgent]);

  // Agrupar propriedades por agente
  const propertiesByAgent = useMemo(() => {
    const grouped = {};
    
    // Inicializar com "Sem Agente"
    grouped["unassigned"] = {
      agent: null,
      agentName: "Sem Agente Atribuído",
      properties: []
    };

    // Agrupar por agente
    properties.forEach(prop => {
      const agentEmail = prop.assigned_consultant || prop.agent_id;
      
      if (!agentEmail) {
        grouped["unassigned"].properties.push(prop);
      } else {
        if (!grouped[agentEmail]) {
          grouped[agentEmail] = {
            agent: agentEmail,
            agentName: agentMap[agentEmail] || agentEmail.split('@')[0],
            properties: []
          };
        }
        grouped[agentEmail].properties.push(prop);
      }
    });

    return grouped;
  }, [properties, agentMap]);

  // Filtrar grupos por pesquisa de agente e filtro selecionado
  const filteredGroups = useMemo(() => {
    let groups = Object.entries(propertiesByAgent);
    
    // Filtrar por pesquisa
    if (searchAgent) {
      const search = searchAgent.toLowerCase();
      groups = groups.filter(([key, group]) => 
        group.agentName.toLowerCase().includes(search) ||
        (group.agent && group.agent.toLowerCase().includes(search))
      );
    }

    // Filtrar por agente selecionado
    if (selectedAgentFilter !== "all") {
      groups = groups.filter(([key]) => key === selectedAgentFilter);
    }

    // Ordenar: primeiro com mais propriedades
    groups.sort((a, b) => b[1].properties.length - a[1].properties.length);

    return groups;
  }, [propertiesByAgent, searchAgent, selectedAgentFilter]);

  const reassignMutation = useMutation({
    mutationFn: async ({ propertyId, agentEmail }) => {
      const agentName = agentEmail ? agentMap[agentEmail] : null;
      await base44.entities.Property.update(propertyId, {
        assigned_consultant: agentEmail || null,
        assigned_consultant_name: agentName || null
      });
    },
    onSuccess: () => {
      toast.success("Agente atribuído com sucesso");
      queryClient.invalidateQueries({ queryKey: ['allProperties'] });
      setReassignDialogOpen(false);
      setSelectedProperty(null);
      setNewAgent("");
    },
    onError: () => {
      toast.error("Erro ao atribuir agente");
    }
  });

  const handleReassign = (property) => {
    setSelectedProperty(property);
    setNewAgent(property.assigned_consultant || "");
    setReassignDialogOpen(true);
  };

  const toggleAgentExpanded = (agentKey) => {
    setExpandedAgents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(agentKey)) {
        newSet.delete(agentKey);
      } else {
        newSet.add(agentKey);
      }
      return newSet;
    });
  };

  const statusLabels = {
    active: { label: "Ativo", color: "bg-green-100 text-green-800" },
    pending: { label: "Pendente", color: "bg-yellow-100 text-yellow-800" },
    sold: { label: "Vendido", color: "bg-blue-100 text-blue-800" },
    rented: { label: "Arrendado", color: "bg-purple-100 text-purple-800" },
    off_market: { label: "Desativado", color: "bg-slate-100 text-slate-800" }
  };

  // Estatísticas
  const stats = useMemo(() => {
    const totalProperties = properties.length;
    const assignedProperties = properties.filter(p => p.assigned_consultant).length;
    const unassignedProperties = totalProperties - assignedProperties;
    const agentsWithProperties = Object.keys(propertiesByAgent).filter(k => k !== "unassigned" && propertiesByAgent[k].properties.length > 0).length;
    
    return { totalProperties, assignedProperties, unassignedProperties, agentsWithProperties };
  }, [properties, propertiesByAgent]);

  if (loadingProperties) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalProperties}</p>
                <p className="text-xs text-slate-500">Total Imóveis</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <UserCog className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.assignedProperties}</p>
                <p className="text-xs text-slate-500">Com Agente</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <User className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.unassignedProperties}</p>
                <p className="text-xs text-slate-500">Sem Agente</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.agentsWithProperties}</p>
                <p className="text-xs text-slate-500">Agentes Ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Pesquisar por nome do agente..."
                value={searchAgent}
                onChange={(e) => setSearchAgent(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedAgentFilter} onValueChange={setSelectedAgentFilter}>
              <SelectTrigger className="w-full md:w-64">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filtrar por agente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Agentes</SelectItem>
                <SelectItem value="unassigned">Sem Agente Atribuído</SelectItem>
                {users.map(u => (
                  <SelectItem key={u.email} value={u.email}>
                    {u.display_name || u.full_name || u.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Properties by Agent */}
      <div className="space-y-4">
        {filteredGroups.map(([agentKey, group]) => (
          <Card key={agentKey} className={group.properties.length === 0 ? "opacity-50" : ""}>
            <CardHeader 
              className="cursor-pointer hover:bg-slate-50 transition-colors"
              onClick={() => toggleAgentExpanded(agentKey)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {expandedAgents.has(agentKey) ? (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-slate-400" />
                  )}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    agentKey === "unassigned" ? "bg-amber-100" : "bg-slate-100"
                  }`}>
                    <User className={`w-5 h-5 ${agentKey === "unassigned" ? "text-amber-600" : "text-slate-600"}`} />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{group.agentName}</CardTitle>
                    {group.agent && (
                      <p className="text-sm text-slate-500">{group.agent}</p>
                    )}
                  </div>
                </div>
                <Badge variant="secondary" className="text-lg px-3 py-1">
                  {group.properties.length} imóveis
                </Badge>
              </div>
            </CardHeader>
            
            {expandedAgents.has(agentKey) && group.properties.length > 0 && (
              <CardContent className="pt-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ref</TableHead>
                      <TableHead>Imóvel</TableHead>
                      <TableHead>Localização</TableHead>
                      <TableHead>Preço</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.properties.map(property => (
                      <TableRow key={property.id}>
                        <TableCell className="font-mono text-sm">
                          {property.ref_id || "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {property.images?.[0] && (
                              <img 
                                src={property.images[0]} 
                                alt="" 
                                className="w-12 h-12 rounded object-cover"
                              />
                            )}
                            <div>
                              <Link 
                                to={`${createPageUrl("PropertyDetails")}?id=${property.id}`}
                                className="font-medium text-slate-900 hover:text-blue-600"
                              >
                                {property.title}
                              </Link>
                              <p className="text-xs text-slate-500">
                                {property.property_type} • {property.listing_type === 'sale' ? 'Venda' : 'Arrendamento'}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-slate-600">
                            <MapPin className="w-3 h-3" />
                            {property.city}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 font-medium">
                            <Euro className="w-3 h-3" />
                            {property.price?.toLocaleString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusLabels[property.status]?.color || "bg-slate-100"}>
                            {statusLabels[property.status]?.label || property.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReassign(property)}
                          >
                            <UserCog className="w-4 h-4 mr-1" />
                            Alterar Agente
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            )}
          </Card>
        ))}

        {filteredGroups.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <User className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">Nenhum agente encontrado</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Reassign Dialog */}
      <Dialog open={reassignDialogOpen} onOpenChange={setReassignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Agente Atribuído</DialogTitle>
          </DialogHeader>
          
          {selectedProperty && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="font-medium">{selectedProperty.title}</p>
                <p className="text-sm text-slate-500">{selectedProperty.city} • €{selectedProperty.price?.toLocaleString()}</p>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Novo Agente</label>
                <Select value={newAgent} onValueChange={setNewAgent}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar agente..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Sem Agente</SelectItem>
                    {users.map(u => (
                      <SelectItem key={u.email} value={u.email}>
                        {u.display_name || u.full_name || u.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setReassignDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => reassignMutation.mutate({ 
                propertyId: selectedProperty.id, 
                agentEmail: newAgent 
              })}
              disabled={reassignMutation.isPending}
            >
              {reassignMutation.isPending ? "A guardar..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}