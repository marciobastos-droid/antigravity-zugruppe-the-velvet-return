import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  FileText, Upload, Download, Trash2, Eye, Search, Filter,
  FolderOpen, File, FileSpreadsheet, FileImage, Calendar,
  Lock, Users, Globe, Plus, X, Tag
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const categoryConfig = {
  contract: { label: "Contrato", icon: FileText, color: "bg-blue-100 text-blue-700" },
  manual: { label: "Manual", icon: FolderOpen, color: "bg-purple-100 text-purple-700" },
  financial_report: { label: "Relatório Financeiro", icon: FileSpreadsheet, color: "bg-green-100 text-green-700" },
  marketing: { label: "Marketing", icon: FileImage, color: "bg-pink-100 text-pink-700" },
  training: { label: "Formação", icon: Users, color: "bg-amber-100 text-amber-700" },
  legal: { label: "Legal", icon: Lock, color: "bg-red-100 text-red-700" },
  operational: { label: "Operacional", icon: File, color: "bg-slate-100 text-slate-700" },
  other: { label: "Outro", icon: File, color: "bg-gray-100 text-gray-700" }
};

const visibilityConfig = {
  admin_only: { label: "Apenas Admin", icon: Lock, color: "bg-red-100 text-red-700" },
  franchisee: { label: "Franqueado", icon: Users, color: "bg-blue-100 text-blue-700" },
  all: { label: "Todos", icon: Globe, color: "bg-green-100 text-green-700" }
};

const getFileIcon = (fileType) => {
  if (fileType?.includes('pdf')) return FileText;
  if (fileType?.includes('sheet') || fileType?.includes('excel')) return FileSpreadsheet;
  if (fileType?.includes('image')) return FileImage;
  return File;
};

const formatFileSize = (bytes) => {
  if (!bytes) return '-';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

export default function FranchiseDocuments({ franchise, isAdmin = true }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [uploading, setUploading] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    document_name: "",
    category: "contract",
    description: "",
    visibility: "franchisee",
    expiry_date: "",
    version: "",
    tags: []
  });
  const [tagInput, setTagInput] = useState("");

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['franchiseDocuments', franchise?.id],
    queryFn: () => base44.entities.FranchiseDocument.filter({ franchise_id: franchise.id }, '-created_date'),
    enabled: !!franchise?.id
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.FranchiseDocument.create(data),
    onSuccess: () => {
      toast.success("Documento carregado com sucesso");
      queryClient.invalidateQueries({ queryKey: ['franchiseDocuments', franchise?.id] });
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.FranchiseDocument.delete(id),
    onSuccess: () => {
      toast.success("Documento eliminado");
      queryClient.invalidateQueries({ queryKey: ['franchiseDocuments', franchise?.id] });
    }
  });

  const resetForm = () => {
    setFormData({
      document_name: "",
      category: "contract",
      description: "",
      visibility: "franchisee",
      expiry_date: "",
      version: "",
      tags: []
    });
    setTagInput("");
    setDialogOpen(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      const docData = {
        ...formData,
        franchise_id: franchise.id,
        franchise_name: franchise.name,
        file_url,
        file_type: file.type,
        file_size: file.size,
        uploaded_by: user?.email,
        document_name: formData.document_name || file.name
      };

      createMutation.mutate(docData);
    } catch (error) {
      toast.error("Erro ao carregar ficheiro");
      console.error(error);
    }
    setUploading(false);
    e.target.value = '';
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({ ...formData, tags: [...formData.tags, tagInput.trim()] });
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag) => {
    setFormData({ ...formData, tags: formData.tags.filter(t => t !== tag) });
  };

  // Filter documents based on visibility
  const visibleDocuments = documents.filter(doc => {
    if (isAdmin) return true;
    if (doc.visibility === 'all') return true;
    if (doc.visibility === 'franchisee') return true;
    return false;
  });

  const filteredDocuments = visibleDocuments.filter(doc => {
    const matchesSearch = !searchTerm || 
      doc.document_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || doc.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Group by category
  const groupedDocs = filteredDocuments.reduce((acc, doc) => {
    const cat = doc.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(doc);
    return acc;
  }, {});

  if (!franchise) {
    return (
      <div className="text-center py-12 text-slate-500">
        <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>Selecione uma franquia para ver documentos</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-blue-600" />
            Documentos - {franchise.name}
          </h3>
          <p className="text-sm text-slate-500">{visibleDocuments.length} documentos</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Novo Documento
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Pesquisar documentos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas Categorias</SelectItem>
            {Object.entries(categoryConfig).map(([key, config]) => (
              <SelectItem key={key} value={key}>{config.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Documents List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : filteredDocuments.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <FolderOpen className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Nenhum documento</h3>
            <p className="text-slate-600">
              {isAdmin ? "Adicione o primeiro documento para esta franquia." : "Não há documentos disponíveis."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedDocs).map(([category, docs]) => {
            const catConfig = categoryConfig[category] || categoryConfig.other;
            const CatIcon = catConfig.icon;
            
            return (
              <div key={category}>
                <div className="flex items-center gap-2 mb-3">
                  <div className={`p-1.5 rounded ${catConfig.color}`}>
                    <CatIcon className="w-4 h-4" />
                  </div>
                  <h4 className="font-semibold text-slate-700">{catConfig.label}</h4>
                  <Badge variant="outline">{docs.length}</Badge>
                </div>
                <div className="grid gap-3">
                  {docs.map(doc => {
                    const FileIcon = getFileIcon(doc.file_type);
                    const visConfig = visibilityConfig[doc.visibility] || visibilityConfig.franchisee;
                    const isExpired = doc.expiry_date && new Date(doc.expiry_date) < new Date();

                    return (
                      <Card key={doc.id} className={`hover:shadow-md transition-shadow ${isExpired ? 'border-red-200 bg-red-50/30' : ''}`}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3 min-w-0 flex-1">
                              <div className="p-2 bg-slate-100 rounded-lg">
                                <FileIcon className="w-6 h-6 text-slate-600" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-semibold text-slate-900 truncate">{doc.document_name}</p>
                                  {doc.version && (
                                    <Badge variant="outline" className="text-xs">v{doc.version}</Badge>
                                  )}
                                  {isAdmin && (
                                    <Badge className={`${visConfig.color} text-xs`}>
                                      {visConfig.label}
                                    </Badge>
                                  )}
                                  {isExpired && (
                                    <Badge className="bg-red-100 text-red-700 text-xs">Expirado</Badge>
                                  )}
                                </div>
                                {doc.description && (
                                  <p className="text-sm text-slate-600 mt-1 line-clamp-2">{doc.description}</p>
                                )}
                                <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {doc.created_date ? format(new Date(doc.created_date), "dd/MM/yyyy", { locale: ptBR }) : '-'}
                                  </span>
                                  <span>{formatFileSize(doc.file_size)}</span>
                                  {doc.expiry_date && (
                                    <span className={isExpired ? 'text-red-600' : ''}>
                                      Expira: {format(new Date(doc.expiry_date), "dd/MM/yyyy")}
                                    </span>
                                  )}
                                </div>
                                {doc.tags?.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {doc.tags.map(tag => (
                                      <Badge key={tag} variant="outline" className="text-xs">
                                        <Tag className="w-2.5 h-2.5 mr-1" />
                                        {tag}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => window.open(doc.file_url, '_blank')}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  const a = document.createElement('a');
                                  a.href = doc.file_url;
                                  a.download = doc.document_name;
                                  a.click();
                                }}
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                              {isAdmin && (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="text-red-600 hover:bg-red-50"
                                  onClick={() => {
                                    if (confirm('Eliminar este documento?')) {
                                      deleteMutation.mutate(doc.id);
                                    }
                                  }}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setDialogOpen(open); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Novo Documento
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Nome do Documento</Label>
                <Input
                  value={formData.document_name}
                  onChange={(e) => setFormData({...formData, document_name: e.target.value})}
                  placeholder="Nome do documento (opcional)"
                />
                <p className="text-xs text-slate-500 mt-1">Se vazio, será usado o nome do ficheiro</p>
              </div>
              <div>
                <Label>Categoria *</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({...formData, category: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>{config.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Visibilidade</Label>
                <Select value={formData.visibility} onValueChange={(v) => setFormData({...formData, visibility: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin_only">Apenas Admin</SelectItem>
                    <SelectItem value="franchisee">Franqueado</SelectItem>
                    <SelectItem value="all">Todos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Versão</Label>
                <Input
                  value={formData.version}
                  onChange={(e) => setFormData({...formData, version: e.target.value})}
                  placeholder="1.0"
                />
              </div>
              <div>
                <Label>Data de Expiração</Label>
                <Input
                  type="date"
                  value={formData.expiry_date}
                  onChange={(e) => setFormData({...formData, expiry_date: e.target.value})}
                />
              </div>
              <div className="col-span-2">
                <Label>Descrição</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Descrição do documento..."
                  rows={2}
                />
              </div>
              <div className="col-span-2">
                <Label>Tags</Label>
                <div className="flex gap-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    placeholder="Adicionar tag..."
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                  />
                  <Button type="button" variant="outline" onClick={handleAddTag}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {formData.tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="gap-1">
                        {tag}
                        <button onClick={() => handleRemoveTag(tag)}>
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* File Upload */}
            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              <Upload className="w-10 h-10 mx-auto text-slate-400 mb-3" />
              <p className="text-sm text-slate-600 mb-2">
                Arraste um ficheiro ou clique para selecionar
              </p>
              <input
                type="file"
                onChange={handleFileUpload}
                className="hidden"
                id="doc-upload"
                disabled={uploading}
              />
              <label htmlFor="doc-upload">
                <Button variant="outline" asChild disabled={uploading}>
                  <span>{uploading ? "A carregar..." : "Selecionar Ficheiro"}</span>
                </Button>
              </label>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={resetForm} className="flex-1">
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}