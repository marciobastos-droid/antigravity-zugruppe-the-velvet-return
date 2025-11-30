import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileText, Plus, Download, Trash2, Upload, Lock, Globe, AlertCircle, 
  Eye, Building2, User, Filter, Search, Calendar
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { toast } from "sonner";

const DOC_TYPES = {
  contract: { label: "📄 Contrato", color: "bg-blue-100 text-blue-800" },
  proposal: { label: "📋 Proposta", color: "bg-purple-100 text-purple-800" },
  brochure: { label: "📰 Brochura", color: "bg-green-100 text-green-800" },
  identification: { label: "🪪 Identificação", color: "bg-amber-100 text-amber-800" },
  proof_of_funds: { label: "💰 Prova Fundos", color: "bg-emerald-100 text-emerald-800" },
  reservation: { label: "📝 Reserva", color: "bg-indigo-100 text-indigo-800" },
  cpcv: { label: "✍️ CPCV", color: "bg-pink-100 text-pink-800" },
  deed: { label: "📜 Escritura", color: "bg-orange-100 text-orange-800" },
  other: { label: "📁 Outro", color: "bg-slate-100 text-slate-800" }
};

const STATUS_LABELS = {
  draft: { label: "Rascunho", color: "bg-slate-100 text-slate-700" },
  pending: { label: "Pendente", color: "bg-yellow-100 text-yellow-800" },
  signed: { label: "Assinado", color: "bg-green-100 text-green-800" },
  expired: { label: "Expirado", color: "bg-red-100 text-red-800" },
  cancelled: { label: "Cancelado", color: "bg-gray-100 text-gray-600" }
};

export default function DocumentUploader({ 
  leadId, 
  leadName, 
  propertyId, 
  propertyTitle,
  entityType = "lead" // "lead" or "property"
}) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [typeFilter, setTypeFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    document_name: "",
    document_type: "other",
    description: "",
    expiry_date: "",
    is_private: true,
    status: "draft"
  });
  const [selectedFile, setSelectedFile] = useState(null);

  // Query for lead documents
  const { data: leadDocuments = [] } = useQuery({
    queryKey: ['lead-documents', leadId],
    queryFn: () => base44.entities.LeadDocument.filter({ lead_id: leadId }, '-upload_date'),
    enabled: !!leadId && entityType === "lead"
  });

  // Query for property documents
  const { data: propertyDocuments = [] } = useQuery({
    queryKey: ['property-documents', propertyId],
    queryFn: () => base44.entities.PropertyDocument.filter({ property_id: propertyId }, '-upload_date'),
    enabled: !!propertyId && entityType === "property"
  });

  // Query for lead documents associated with property
  const { data: propertyLeadDocuments = [] } = useQuery({
    queryKey: ['property-lead-documents', propertyId],
    queryFn: () => base44.entities.LeadDocument.filter({ property_id: propertyId }, '-upload_date'),
    enabled: !!propertyId && entityType === "property"
  });

  const documents = entityType === "lead" 
    ? leadDocuments 
    : [...propertyDocuments, ...propertyLeadDocuments];

  const createLeadDocMutation = useMutation({
    mutationFn: (data) => base44.entities.LeadDocument.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-documents'] });
      queryClient.invalidateQueries({ queryKey: ['property-lead-documents'] });
      toast.success("Documento adicionado");
      resetForm();
    },
  });

  const createPropertyDocMutation = useMutation({
    mutationFn: (data) => base44.entities.PropertyDocument.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['property-documents'] });
      toast.success("Documento adicionado");
      resetForm();
    },
  });

  const deleteLeadDocMutation = useMutation({
    mutationFn: (id) => base44.entities.LeadDocument.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-documents'] });
      queryClient.invalidateQueries({ queryKey: ['property-lead-documents'] });
      toast.success("Documento eliminado");
    },
  });

  const deletePropertyDocMutation = useMutation({
    mutationFn: (id) => base44.entities.PropertyDocument.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['property-documents'] });
      toast.success("Documento eliminado");
    },
  });

  const resetForm = () => {
    setDialogOpen(false);
    setFormData({
      document_name: "",
      document_type: "other",
      description: "",
      expiry_date: "",
      is_private: true,
      status: "draft"
    });
    setSelectedFile(null);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      if (!formData.document_name) {
        setFormData({...formData, document_name: file.name.split('.')[0]});
      }
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile || !formData.document_name) {
      toast.error("Selecione um ficheiro e dê um nome");
      return;
    }

    setUploading(true);
    try {
      let file_url, file_uri;
      
      if (formData.is_private) {
        const result = await base44.integrations.Core.UploadPrivateFile({ file: selectedFile });
        file_uri = result.file_uri;
      } else {
        const result = await base44.integrations.Core.UploadFile({ file: selectedFile });
        file_url = result.file_url;
      }

      const docData = {
        ...formData,
        file_url,
        file_uri,
        file_size: selectedFile.size,
        file_type: selectedFile.type,
        upload_date: new Date().toISOString()
      };

      if (entityType === "lead") {
        createLeadDocMutation.mutate({
          ...docData,
          lead_id: leadId,
          lead_name: leadName,
          property_id: propertyId || null,
          property_title: propertyTitle || null
        });
      } else {
        createPropertyDocMutation.mutate({
          ...docData,
          property_id: propertyId,
          property_title: propertyTitle
        });
      }
    } catch (error) {
      toast.error("Erro ao carregar ficheiro");
    }
    setUploading(false);
  };

  const handleDownload = async (doc) => {
    try {
      if (doc.file_uri) {
        const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ 
          file_uri: doc.file_uri,
          expires_in: 300
        });
        window.open(signed_url, '_blank');
      } else if (doc.file_url) {
        window.open(doc.file_url, '_blank');
      }
    } catch (error) {
      toast.error("Erro ao abrir ficheiro");
    }
  };

  const handleDelete = (doc) => {
    if (!confirm("Eliminar documento?")) return;
    
    if (doc.lead_id) {
      deleteLeadDocMutation.mutate(doc.id);
    } else {
      deletePropertyDocMutation.mutate(doc.id);
    }
  };

  const filteredDocs = documents.filter(doc => {
    const matchesType = typeFilter === "all" || doc.document_type === typeFilter;
    const matchesSearch = !searchTerm || 
      doc.document_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.description?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Documentos ({documents.length})
          </CardTitle>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-1" />
                Adicionar
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Adicionar Documento</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label>Ficheiro *</Label>
                  <div className="border-2 border-dashed rounded-lg p-4 text-center hover:bg-slate-50 transition-colors">
                    <input
                      type="file"
                      onChange={handleFileSelect}
                      className="hidden"
                      id={`doc-upload-${entityType}`}
                      disabled={uploading}
                    />
                    <label htmlFor={`doc-upload-${entityType}`} className="cursor-pointer">
                      <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                      <p className="text-sm text-slate-600">
                        {selectedFile ? selectedFile.name : "Clique para carregar"}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">PDF, DOC, JPG, PNG</p>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Nome *</Label>
                    <Input
                      value={formData.document_name}
                      onChange={(e) => setFormData({...formData, document_name: e.target.value})}
                      placeholder="Nome do documento"
                    />
                  </div>
                  <div>
                    <Label>Tipo</Label>
                    <Select value={formData.document_type} onValueChange={(v) => setFormData({...formData, document_type: v})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(DOC_TYPES).map(([key, { label }]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Estado</Label>
                    <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(STATUS_LABELS).map(([key, { label }]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Expiração</Label>
                    <Input
                      type="date"
                      value={formData.expiry_date}
                      onChange={(e) => setFormData({...formData, expiry_date: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <Label>Descrição</Label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Descrição opcional..."
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_private"
                    checked={formData.is_private}
                    onChange={(e) => setFormData({...formData, is_private: e.target.checked})}
                    className="rounded"
                  />
                  <Label htmlFor="is_private" className="text-sm cursor-pointer">
                    Documento privado (acesso restrito)
                  </Label>
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <Button variant="outline" onClick={resetForm}>Cancelar</Button>
                  <Button onClick={handleSubmit} disabled={uploading || !selectedFile}>
                    {uploading ? "A carregar..." : "Adicionar"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent>
        {documents.length > 3 && (
          <div className="flex gap-2 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Pesquisar..."
                className="pl-8 h-8 text-sm"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-32 h-8">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {Object.entries(DOC_TYPES).map(([key, { label }]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {filteredDocs.length === 0 ? (
          <div className="text-center py-6 text-slate-500">
            <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Sem documentos</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {filteredDocs.map((doc) => {
              const daysUntilExpiry = doc.expiry_date ? differenceInDays(new Date(doc.expiry_date), new Date()) : null;
              const isExpired = daysUntilExpiry !== null && daysUntilExpiry < 0;
              const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry >= 0 && daysUntilExpiry <= 30;
              const docType = DOC_TYPES[doc.document_type] || DOC_TYPES.other;
              const statusInfo = STATUS_LABELS[doc.status] || STATUS_LABELS.draft;
              
              return (
                <div 
                  key={doc.id} 
                  className={`flex items-center justify-between p-2 rounded-lg border ${
                    isExpired ? "border-red-200 bg-red-50" : "hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-lg flex-shrink-0">
                      {docType.label.split(' ')[0]}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm text-slate-900 truncate">
                        {doc.document_name}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <Badge className={`text-xs ${docType.color}`}>
                          {docType.label.split(' ').slice(1).join(' ')}
                        </Badge>
                        <Badge className={`text-xs ${statusInfo.color}`}>
                          {statusInfo.label}
                        </Badge>
                        {doc.is_private && (
                          <Lock className="w-3 h-3 text-slate-400" />
                        )}
                        {isExpired && (
                          <Badge className="text-xs bg-red-100 text-red-800">
                            Expirado
                          </Badge>
                        )}
                        {isExpiringSoon && !isExpired && (
                          <Badge className="text-xs bg-yellow-100 text-yellow-800">
                            {daysUntilExpiry}d
                          </Badge>
                        )}
                        {doc.lead_name && entityType === "property" && (
                          <Badge variant="outline" className="text-xs">
                            <User className="w-3 h-3 mr-1" />
                            {doc.lead_name.split(' ')[0]}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => handleDownload(doc)}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-red-600 hover:bg-red-50"
                      onClick={() => handleDelete(doc)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}