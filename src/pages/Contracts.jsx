
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  FileText, Plus, Search, Filter, Calendar, AlertCircle, 
  CheckCircle2, Clock, XCircle, Eye, Edit, Trash2, Download, Bell
} from "lucide-react";
import { toast } from "sonner";
import CreateContractDialog from "../components/contracts/CreateContractDialog";
import ContractDetailsDialog from "../components/contracts/ContractDetailsDialog";
import SignatureIntegration from "../components/documents/SignatureIntegration";

export default function Contracts() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailsContract, setDetailsContract] = useState(null);
  const [editingContract, setEditingContract] = useState(null);
  const [signatureContract, setSignatureContract] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ['contracts'],
    queryFn: () => base44.entities.Contract.list('-created_date'),
  });

  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Contract.delete(id),
    onSuccess: () => {
      toast.success("Contrato eliminado");
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.Contract.update(id, { status }),
    onSuccess: () => {
      toast.success("Estado atualizado");
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
    },
  });

  // Check for expiring contracts and send notifications
  useEffect(() => {
    if (!contracts.length || !user) return;

    const checkExpiringContracts = async () => {
      const today = new Date();
      const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

      for (const contract of contracts) {
        if (contract.end_date && !contract.notification_sent) {
          const endDate = new Date(contract.end_date);
          
          if (endDate <= thirtyDaysFromNow && endDate >= today) {
            const daysLeft = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
            
            try {
              await base44.integrations.Core.SendEmail({
                to: contract.assigned_agent || user.email,
                subject: `⚠️ Contrato a expirar em ${daysLeft} dias`,
                body: `O contrato para o imóvel "${contract.property_title}" expira em ${daysLeft} dias (${endDate.toLocaleDateString('pt-PT')}).\n\nPartes envolvidas:\n- ${contract.party_a_name}\n- ${contract.party_b_name}\n\nReveja o contrato e tome as medidas necessárias.`
              });

              await base44.entities.Contract.update(contract.id, { notification_sent: true });
            } catch (error) {
              console.error('Erro ao enviar notificação:', error);
            }
          }
        }
      }
    };

    checkExpiringContracts();
  }, [contracts, user]);

  const filteredContracts = contracts.filter(c => {
    const matchesSearch = searchTerm === "" || 
      c.property_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.party_a_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.party_b_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === "all" || c.contract_type === typeFilter;
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const handleDelete = (id) => {
    if (window.confirm("Tem a certeza que deseja eliminar este contrato?")) {
      deleteMutation.mutate(id);
    }
  };

  const statusLabels = {
    draft: "Rascunho",
    pending_signature: "Pendente Assinatura",
    active: "Ativo",
    completed: "Concluído",
    cancelled: "Cancelado"
  };

  const statusColors = {
    draft: "bg-slate-100 text-slate-800",
    pending_signature: "bg-yellow-100 text-yellow-800",
    active: "bg-green-100 text-green-800",
    completed: "bg-blue-100 text-blue-800",
    cancelled: "bg-red-100 text-red-800"
  };

  const typeLabels = {
    sale: "Venda",
    purchase: "Compra",
    lease: "Arrendamento"
  };

  const getExpirationWarning = (contract) => {
    if (!contract.end_date) return null;
    
    const today = new Date();
    const endDate = new Date(contract.end_date);
    const daysLeft = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
    
    if (daysLeft < 0) {
      return { text: "Expirado", color: "text-red-600", days: daysLeft };
    } else if (daysLeft <= 30) {
      return { text: `Expira em ${daysLeft} dias`, color: "text-orange-600", days: daysLeft };
    } else if (daysLeft <= 60) {
      return { text: `Expira em ${daysLeft} dias`, color: "text-yellow-600", days: daysLeft };
    }
    return null;
  };

  const stats = {
    total: contracts.length,
    active: contracts.filter(c => c.status === 'active').length,
    pending: contracts.filter(c => c.status === 'pending_signature').length,
    expiring: contracts.filter(c => {
      const warning = getExpirationWarning(c);
      return warning && warning.days <= 30 && warning.days >= 0;
    }).length
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">Gestão de Contratos</h1>
            <p className="text-slate-600">Gerir contratos de compra, venda e arrendamento</p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)} className="bg-slate-900 hover:bg-slate-800">
            <Plus className="w-4 h-4 mr-2" />
            Novo Contrato
          </Button>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Total</p>
                  <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
                </div>
                <FileText className="w-10 h-10 text-slate-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Ativos</p>
                  <p className="text-3xl font-bold text-green-600">{stats.active}</p>
                </div>
                <CheckCircle2 className="w-10 h-10 text-green-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Pendentes</p>
                  <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
                </div>
                <Clock className="w-10 h-10 text-yellow-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">A Expirar</p>
                  <p className="text-3xl font-bold text-orange-600">{stats.expiring}</p>
                </div>
                <Bell className="w-10 h-10 text-orange-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Pesquisar por imóvel ou partes..."
                  className="pl-10"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Tipos</SelectItem>
                  <SelectItem value="sale">Venda</SelectItem>
                  <SelectItem value="purchase">Compra</SelectItem>
                  <SelectItem value="lease">Arrendamento</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Estados</SelectItem>
                  <SelectItem value="draft">Rascunho</SelectItem>
                  <SelectItem value="pending_signature">Pendente Assinatura</SelectItem>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="completed">Concluído</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Contracts List */}
        <div className="grid gap-4">
          {filteredContracts.map((contract) => {
            const warning = getExpirationWarning(contract);
            return (
              <Card key={contract.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-xl font-bold text-slate-900">{contract.property_title}</h3>
                        <Badge className={statusColors[contract.status]}>
                          {statusLabels[contract.status]}
                        </Badge>
                        <Badge variant="outline">{typeLabels[contract.contract_type]}</Badge>
                        {warning && (
                          <Badge className={`${warning.color} bg-opacity-10`}>
                            <AlertCircle className="w-3 h-3 mr-1" />
                            {warning.text}
                          </Badge>
                        )}
                      </div>

                      <div className="grid md:grid-cols-2 gap-4 text-sm text-slate-600 mb-4">
                        <div>
                          <p className="font-semibold text-slate-700 mb-1">Parte A (Vendedor/Senhorio):</p>
                          <p>{contract.party_a_name}</p>
                          {contract.party_a_email && <p>{contract.party_a_email}</p>}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-700 mb-1">Parte B (Comprador/Inquilino):</p>
                          <p>{contract.party_b_name}</p>
                          {contract.party_b_email && <p>{contract.party_b_email}</p>}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-700">Valor:</span>
                          <span className="text-slate-900 font-bold">€{contract.contract_value?.toLocaleString()}</span>
                        </div>
                        {contract.monthly_value && (
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-700">Mensal:</span>
                            <span className="text-slate-900">€{contract.monthly_value?.toLocaleString()}</span>
                          </div>
                        )}
                        {contract.start_date && (
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-slate-500" />
                            <span className="text-slate-600">Início: {new Date(contract.start_date).toLocaleDateString('pt-PT')}</span>
                          </div>
                        )}
                        {contract.end_date && (
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-slate-500" />
                            <span className="text-slate-600">Fim: {new Date(contract.end_date).toLocaleDateString('pt-PT')}</span>
                          </div>
                        )}
                        {contract.documents?.length > 0 && (
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-slate-500" />
                            <span className="text-slate-600">{contract.documents.length} documento(s)</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDetailsContract(contract)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingContract(contract);
                          setCreateDialogOpen(true);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSignatureContract(contract)}
                        className="text-blue-600 hover:bg-blue-50"
                      >
                        📝
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(contract.id)}
                        className="text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredContracts.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <FileText className="w-16 h-16 text-slate-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Nenhum contrato encontrado</h3>
              <p className="text-slate-600 mb-6">
                {contracts.length === 0 ? "Comece por criar o seu primeiro contrato" : "Tente ajustar os filtros"}
              </p>
              {contracts.length === 0 && (
                <Button onClick={() => setCreateDialogOpen(true)} className="bg-slate-900 hover:bg-slate-800">
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Primeiro Contrato
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        <CreateContractDialog
          open={createDialogOpen}
          onOpenChange={(open) => {
            setCreateDialogOpen(open);
            if (!open) setEditingContract(null);
          }}
          contract={editingContract}
          properties={properties}
        />

        <ContractDetailsDialog
          contract={detailsContract}
          open={!!detailsContract}
          onOpenChange={(open) => !open && setDetailsContract(null)}
          onEdit={(contract) => {
            setDetailsContract(null);
            setEditingContract(contract);
            setCreateDialogOpen(true);
          }}
          onStatusChange={(id, status) => updateStatusMutation.mutate({ id, status })}
        />

        <SignatureIntegration
          contract={signatureContract}
          open={!!signatureContract}
          onOpenChange={(open) => !open && setSignatureContract(null)}
        />
      </div>
    </div>
  );
}
