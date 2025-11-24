import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  FileText, Plus, Search, Calendar, AlertCircle, 
  CheckCircle2, Clock, Eye, Edit, Trash2, Download, 
  Lock, Folder, TrendingUp, Bell
} from "lucide-react";
import { toast } from "sonner";
import CreateContractDialog from "../contracts/CreateContractDialog";
import ContractDetailsDialog from "../contracts/ContractDetailsDialog";
import SignatureIntegration from "../documents/SignatureIntegration";
import DocumentPermissionsDialog from "../documents/DocumentPermissionsDialog";
import DocumentViewerDialog from "../documents/DocumentViewerDialog";

export default function DocumentsAndContracts() {
  const queryClient = useQueryClient();
  const [view, setView] = React.useState("contracts"); // contracts or documents
  const [searchTerm, setSearchTerm] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [docTypeFilter, setDocTypeFilter] = React.useState("all");
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [detailsContract, setDetailsContract] = React.useState(null);
  const [editingContract, setEditingContract] = React.useState(null);
  const [signatureContract, setSignatureContract] = React.useState(null);
  const [permissionsDoc, setPermissionsDoc] = React.useState(null);
  const [viewingDoc, setViewingDoc] = React.useState(null);

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

  const isAdmin = user && (user.role === 'admin' || user.user_type === 'admin' || user.user_type === 'gestor');

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

  // Extract all documents
  const allDocuments = contracts.flatMap(contract => 
    (contract.documents || []).map(doc => ({
      ...doc,
      contract_id: contract.id,
      contract_title: contract.property_title,
      contract_type: contract.contract_type,
      contract_status: contract.status,
      contract_value: contract.contract_value,
      parties: `${contract.party_a_name} / ${contract.party_b_name}`,
      hasAccess: isAdmin || 
                 contract.created_by === user?.email || 
                 contract.assigned_agent === user?.email ||
                 contract.access_permissions?.some(p => p.user_email === user?.email)
    }))
  ).filter(doc => doc.hasAccess);

  const filteredContracts = contracts.filter(c => {
    const matchesSearch = searchTerm === "" || 
      c.property_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.party_a_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.party_b_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === "all" || c.contract_type === typeFilter;
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const filteredDocuments = allDocuments.filter(doc => {
    const matchesSearch = searchTerm === "" || 
      doc.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.contract_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.indexed_content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.parties?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = docTypeFilter === "all" || doc.type === docTypeFilter;
    const matchesStatus = statusFilter === "all" || doc.contract_status === statusFilter;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const getExpirationWarning = (contract) => {
    if (!contract.end_date) return null;
    const today = new Date();
    const endDate = new Date(contract.end_date);
    const daysLeft = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
    
    if (daysLeft < 0) return { text: "Expirado", color: "text-red-600", days: daysLeft };
    if (daysLeft <= 30) return { text: `Expira em ${daysLeft} dias`, color: "text-orange-600", days: daysLeft };
    if (daysLeft <= 60) return { text: `Expira em ${daysLeft} dias`, color: "text-yellow-600", days: daysLeft };
    return null;
  };

  const contractStats = {
    total: contracts.length,
    active: contracts.filter(c => c.status === 'active').length,
    pending: contracts.filter(c => c.status === 'pending_signature').length,
    expiring: contracts.filter(c => {
      const warning = getExpirationWarning(c);
      return warning && warning.days <= 30 && warning.days >= 0;
    }).length
  };

  const docStats = {
    total: allDocuments.length,
    contracts: allDocuments.filter(d => d.type === 'contract').length,
    financial: allDocuments.filter(d => d.type === 'financial').length,
    recent: allDocuments.filter(d => {
      const uploadDate = new Date(d.upload_date);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return uploadDate >= weekAgo;
    }).length
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

  const docTypeLabels = {
    contract: "Contrato",
    annex: "Anexo",
    id: "Identificação",
    proof_residence: "Comp. Residência",
    financial: "Financeiro",
    other: "Outro"
  };

  const docTypeColors = {
    contract: "bg-blue-100 text-blue-800",
    annex: "bg-purple-100 text-purple-800",
    id: "bg-green-100 text-green-800",
    proof_residence: "bg-yellow-100 text-yellow-800",
    financial: "bg-red-100 text-red-800",
    other: "bg-slate-100 text-slate-800"
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* View Toggle */}
      <div className="flex gap-2">
        <Button
          variant={view === "contracts" ? "default" : "outline"}
          onClick={() => {
            setView("contracts");
            setSearchTerm("");
          }}
          className="flex items-center gap-2"
        >
          <FileText className="w-4 h-4" />
          Contratos ({contracts.length})
        </Button>
        <Button
          variant={view === "documents" ? "default" : "outline"}
          onClick={() => {
            setView("documents");
            setSearchTerm("");
          }}
          className="flex items-center gap-2"
        >
          <Folder className="w-4 h-4" />
          Documentos ({allDocuments.length})
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {view === "contracts" ? (
          <>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Total</p>
                    <p className="text-3xl font-bold text-slate-900">{contractStats.total}</p>
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
                    <p className="text-3xl font-bold text-green-600">{contractStats.active}</p>
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
                    <p className="text-3xl font-bold text-yellow-600">{contractStats.pending}</p>
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
                    <p className="text-3xl font-bold text-orange-600">{contractStats.expiring}</p>
                  </div>
                  <Bell className="w-10 h-10 text-orange-400" />
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Total</p>
                    <p className="text-3xl font-bold text-slate-900">{docStats.total}</p>
                  </div>
                  <Folder className="w-10 h-10 text-slate-400" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Contratos</p>
                    <p className="text-3xl font-bold text-blue-600">{docStats.contracts}</p>
                  </div>
                  <FileText className="w-10 h-10 text-blue-400" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Financeiros</p>
                    <p className="text-3xl font-bold text-red-600">{docStats.financial}</p>
                  </div>
                  <FileText className="w-10 h-10 text-red-400" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Últimos 7 dias</p>
                    <p className="text-3xl font-bold text-green-600">{docStats.recent}</p>
                  </div>
                  <TrendingUp className="w-10 h-10 text-green-400" />
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Actions Bar */}
      {view === "contracts" && (
        <div className="flex justify-end">
          <Button onClick={() => setCreateDialogOpen(true)} className="bg-slate-900 hover:bg-slate-800">
            <Plus className="w-4 h-4 mr-2" />
            Novo Contrato
          </Button>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={view === "contracts" ? "Pesquisar contratos..." : "Pesquisar documentos..."}
                className="pl-10"
              />
            </div>
            {view === "contracts" ? (
              <>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tipo de Contrato" />
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
                    <SelectValue placeholder="Estado" />
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
              </>
            ) : (
              <>
                <Select value={docTypeFilter} onValueChange={setDocTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tipo de Documento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Tipos</SelectItem>
                    <SelectItem value="contract">Contratos</SelectItem>
                    <SelectItem value="annex">Anexos</SelectItem>
                    <SelectItem value="id">Identificação</SelectItem>
                    <SelectItem value="proof_residence">Comp. Residência</SelectItem>
                    <SelectItem value="financial">Financeiros</SelectItem>
                    <SelectItem value="other">Outros</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Estado do Contrato" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Estados</SelectItem>
                    <SelectItem value="draft">Rascunho</SelectItem>
                    <SelectItem value="pending_signature">Pendente</SelectItem>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="completed">Concluído</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {view === "contracts" ? (
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
                          <p className="font-semibold text-slate-700 mb-1">Parte A:</p>
                          <p>{contract.party_a_name}</p>
                        </div>
                        <div>
                          <p className="font-semibold text-slate-700 mb-1">Parte B:</p>
                          <p>{contract.party_b_name}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-700">Valor:</span>
                          <span className="text-slate-900 font-bold">€{contract.contract_value?.toLocaleString()}</span>
                        </div>
                        {contract.documents?.length > 0 && (
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-slate-500" />
                            <span className="text-slate-600">{contract.documents.length} documento(s)</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 ml-4">
                      <Button variant="outline" size="sm" onClick={() => setDetailsContract(contract)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => {
                        setEditingContract(contract);
                        setCreateDialogOpen(true);
                      }}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setSignatureContract(contract)} className="text-blue-600">
                        📝
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => {
                        if (window.confirm("Eliminar este contrato?")) deleteMutation.mutate(contract.id);
                      }} className="text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {filteredContracts.length === 0 && (
            <Card className="text-center py-12">
              <CardContent>
                <FileText className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-900 mb-2">Nenhum contrato encontrado</h3>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredDocuments.map((doc, idx) => (
            <Card key={idx} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <FileText className="w-5 h-5 text-slate-600" />
                      <h3 className="text-lg font-bold text-slate-900">{doc.name}</h3>
                      <Badge className={docTypeColors[doc.type] || docTypeColors.other}>
                        {docTypeLabels[doc.type] || doc.type}
                      </Badge>
                    </div>

                    <div className="grid md:grid-cols-2 gap-3 text-sm text-slate-600">
                      <div>
                        <span className="font-semibold">Contrato:</span> {doc.contract_title}
                      </div>
                      <div>
                        <span className="font-semibold">Partes:</span> {doc.parties}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 ml-4">
                    <Button variant="outline" size="sm" onClick={() => setViewingDoc(doc)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                    <a href={doc.url} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm">
                        <Download className="w-4 h-4" />
                      </Button>
                    </a>
                    {isAdmin && (
                      <Button variant="outline" size="sm" onClick={() => setPermissionsDoc({ ...doc, contract: contracts.find(c => c.id === doc.contract_id) })}>
                        <Lock className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {filteredDocuments.length === 0 && (
            <Card className="text-center py-12">
              <CardContent>
                <FileText className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-900 mb-2">Nenhum documento encontrado</h3>
              </CardContent>
            </Card>
          )}
        </div>
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

      <DocumentPermissionsDialog
        document={permissionsDoc}
        open={!!permissionsDoc}
        onOpenChange={(open) => !open && setPermissionsDoc(null)}
      />

      <DocumentViewerDialog
        document={viewingDoc}
        open={!!viewingDoc}
        onOpenChange={(open) => !open && setViewingDoc(null)}
      />
    </div>
  );
}