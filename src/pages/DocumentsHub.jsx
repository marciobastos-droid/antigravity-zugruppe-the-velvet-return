import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  FileText, Search, Filter, Download, Eye, Lock, Unlock,
  TrendingUp, Calendar, AlertCircle, CheckCircle2
} from "lucide-react";
import DocumentSearch from "../components/documents/DocumentSearch";
import PermissionsManager from "../components/documents/PermissionsManager";

export default function DocumentsHub() {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [permissionsDocument, setPermissionsDocument] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ['contracts'],
    queryFn: () => base44.entities.Contract.list('-created_date'),
  });

  // Flatten all documents from all contracts
  const allDocuments = contracts.flatMap(contract => 
    (contract.documents || []).map(doc => ({
      ...doc,
      contract_id: contract.id,
      contract_type: contract.contract_type,
      contract_status: contract.status,
      property_title: contract.property_title,
      contract_value: contract.contract_value,
      access_permissions: contract.access_permissions || [],
      assigned_agent: contract.assigned_agent,
      created_by: contract.created_by
    }))
  );

  const isAdmin = user && (user.role === 'admin' || user.user_type === 'admin' || user.user_type === 'gestor');

  // Filter documents based on permissions
  const accessibleDocuments = allDocuments.filter(doc => {
    if (isAdmin) return true;
    if (doc.created_by === user?.email) return true;
    if (doc.assigned_agent === user?.email) return true;
    if (doc.access_permissions.includes(user?.email)) return true;
    return false;
  });

  const filteredDocuments = accessibleDocuments.filter(doc => {
    const matchesSearch = searchTerm === "" || 
      doc.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.property_title?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === "all" || doc.type === typeFilter;
    const matchesStatus = statusFilter === "all" || doc.contract_status === statusFilter;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  // Statistics
  const stats = {
    total: accessibleDocuments.length,
    contracts: accessibleDocuments.filter(d => d.type === 'contract').length,
    pending: accessibleDocuments.filter(d => d.contract_status === 'pending_signature').length,
    signed: accessibleDocuments.filter(d => d.contract_status === 'active').length
  };

  const typeLabels = {
    contract: "Contrato",
    annex: "Anexo",
    invoice: "Fatura",
    identification: "Identificação",
    other: "Outro"
  };

  const statusColors = {
    draft: "bg-slate-100 text-slate-800",
    pending_signature: "bg-yellow-100 text-yellow-800",
    active: "bg-green-100 text-green-800",
    completed: "bg-blue-100 text-blue-800",
    cancelled: "bg-red-100 text-red-800"
  };

  const hasAccess = (doc) => {
    if (isAdmin) return true;
    if (doc.created_by === user?.email) return true;
    if (doc.assigned_agent === user?.email) return true;
    if (doc.access_permissions.includes(user?.email)) return true;
    return false;
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
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Hub de Documentos</h1>
          <p className="text-slate-600">Gestão centralizada de todos os documentos de contratos</p>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Total Documentos</p>
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
                  <p className="text-sm text-slate-600 mb-1">Contratos</p>
                  <p className="text-3xl font-bold text-blue-600">{stats.contracts}</p>
                </div>
                <TrendingUp className="w-10 h-10 text-blue-400" />
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
                <AlertCircle className="w-10 h-10 text-yellow-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Assinados</p>
                  <p className="text-3xl font-bold text-green-600">{stats.signed}</p>
                </div>
                <CheckCircle2 className="w-10 h-10 text-green-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="grid md:grid-cols-4 gap-4">
              <div className="md:col-span-2 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Pesquisar documentos..."
                  className="pl-10"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Tipo de Documento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Tipos</SelectItem>
                  <SelectItem value="contract">Contrato</SelectItem>
                  <SelectItem value="annex">Anexo</SelectItem>
                  <SelectItem value="invoice">Fatura</SelectItem>
                  <SelectItem value="identification">Identificação</SelectItem>
                  <SelectItem value="other">Outro</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Estados</SelectItem>
                  <SelectItem value="draft">Rascunho</SelectItem>
                  <SelectItem value="pending_signature">Pendente</SelectItem>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="completed">Concluído</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
              >
                <Search className="w-4 h-4 mr-2" />
                Pesquisa Avançada em PDF
              </Button>
            </div>
          </CardContent>
        </Card>

        {showAdvancedSearch && (
          <DocumentSearch documents={accessibleDocuments} onClose={() => setShowAdvancedSearch(false)} />
        )}

        {/* Documents Table */}
        <Card>
          <CardHeader>
            <CardTitle>Documentos ({filteredDocuments.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filteredDocuments.map((doc, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4 flex-1">
                    <FileText className="w-8 h-8 text-slate-400" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-slate-900">{doc.name}</h4>
                        {doc.type && (
                          <Badge variant="outline" className="text-xs">
                            {typeLabels[doc.type] || doc.type}
                          </Badge>
                        )}
                        <Badge className={`text-xs ${statusColors[doc.contract_status]}`}>
                          {doc.contract_status}
                        </Badge>
                      </div>
                      <div className="text-sm text-slate-600 flex items-center gap-4">
                        <span>{doc.property_title}</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(doc.upload_date).toLocaleDateString('pt-PT')}
                        </span>
                        {doc.access_permissions.length > 0 && (
                          <span className="flex items-center gap-1 text-blue-600">
                            <Lock className="w-3 h-3" />
                            {doc.access_permissions.length} utilizador(es) com acesso
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <a href={doc.url} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4 mr-2" />
                        Ver
                      </Button>
                    </a>
                    <a href={doc.url} download>
                      <Button variant="outline" size="sm">
                        <Download className="w-4 h-4" />
                      </Button>
                    </a>
                    {(isAdmin || doc.created_by === user?.email) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPermissionsDocument(doc)}
                      >
                        <Lock className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {filteredDocuments.length === 0 && (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-900 mb-2">Nenhum documento encontrado</h3>
                <p className="text-slate-600">Tente ajustar os filtros de pesquisa</p>
              </div>
            )}
          </CardContent>
        </Card>

        {permissionsDocument && (
          <PermissionsManager
            document={permissionsDocument}
            contract={contracts.find(c => c.id === permissionsDocument.contract_id)}
            open={!!permissionsDocument}
            onOpenChange={(open) => !open && setPermissionsDocument(null)}
          />
        )}
      </div>
    </div>
  );
}