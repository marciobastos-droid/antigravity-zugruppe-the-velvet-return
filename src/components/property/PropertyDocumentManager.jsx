import React, { useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { 
  FileText, Plus, Download, Trash2, Upload, Lock, Globe, AlertCircle,
  Eye, X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Search, Wand2, CheckCircle,
  Folder, User, Building2, Link2, ExternalLink, Filter
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { toast } from "sonner";
import GoogleDriveUploader from "../documents/GoogleDriveUploader";

const DOC_CATEGORIES = {
  legal: {
    label: "📜 Documentos Legais",
    color: "bg-blue-50 border-blue-200",
    types: [
      { id: "deed", label: "Escritura", icon: "📜" },
      { id: "cpcv", label: "CPCV (Promessa)", icon: "✍️" },
      { id: "building_permit", label: "Licença de Utilização", icon: "🏗️" },
      { id: "lease_agreement", label: "Contrato de Arrendamento", icon: "📝" },
    ]
  },
  technical: {
    label: "🔧 Documentos Técnicos",
    color: "bg-green-50 border-green-200",
    types: [
      { id: "energy_certificate", label: "Certificado Energético", icon: "⚡" },
      { id: "floor_plan", label: "Plantas", icon: "📐" },
      { id: "inspection_report", label: "Relatório de Inspeção", icon: "🔍" },
      { id: "technical_specs", label: "Ficha Técnica", icon: "📋" },
    ]
  },
  financial: {
    label: "💰 Documentos Financeiros",
    color: "bg-amber-50 border-amber-200",
    types: [
      { id: "tax_document", label: "IMI / Caderneta", icon: "💰" },
      { id: "insurance", label: "Seguro", icon: "🛡️" },
      { id: "appraisal", label: "Avaliação", icon: "📊" },
      { id: "invoice", label: "Fatura", icon: "🧾" },
    ]
  },
  marketing: {
    label: "📸 Marketing",
    color: "bg-purple-50 border-purple-200",
    types: [
      { id: "brochure", label: "Brochura", icon: "📰" },
      { id: "video", label: "Vídeo", icon: "🎥" },
      { id: "virtual_tour", label: "Tour Virtual", icon: "🌐" },
    ]
  },
  other: {
    label: "📁 Outros",
    color: "bg-slate-50 border-slate-200",
    types: [
      { id: "other", label: "Outro", icon: "📄" },
    ]
  }
};

const STATUS_OPTIONS = [
  { value: "draft", label: "Rascunho", color: "bg-slate-100 text-slate-700" },
  { value: "pending", label: "Pendente", color: "bg-yellow-100 text-yellow-800" },
  { value: "signed", label: "Assinado", color: "bg-green-100 text-green-800" },
  { value: "expired", label: "Expirado", color: "bg-red-100 text-red-800" },
  { value: "cancelled", label: "Cancelado", color: "bg-gray-100 text-gray-600" }
];

export default function PropertyDocumentManager({ propertyId, propertyTitle, contactId, contactName }) {
  const queryClient = useQueryClient();
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [viewMode, setViewMode] = useState("folders");
  const [expandedFolders, setExpandedFolders] = useState(["legal", "technical", "financial"]);
  const [zoom, setZoom] = useState(100);
  const [currentPage, setCurrentPage] = useState(0);
  const [linkContactDialogOpen, setLinkContactDialogOpen] = useState(false);
  const [selectedDocForLink, setSelectedDocForLink] = useState(null);

  const [formData, setFormData] = useState({
    document_type: "other",
    description: "",
    expiry_date: "",
    is_public: false,
    status: "draft",
    linked_contact_ids: contactId ? [contactId] : [],
    linked_contact_names: contactName ? [contactName] : [],
    custom_category: ""
  });

  const [processingOCR, setProcessingOCR] = useState(false);
  const [ocrProgress, setOcrProgress] = useState({ current: 0, total: 0 });

  const { data: documents = [] } = useQuery({
    queryKey: ['property-documents', propertyId],
    queryFn: () => base44.entities.PropertyDocument.filter({ property_id: propertyId }, '-upload_date'),
    enabled: !!propertyId
  });

  const { data: allContacts = [] } = useQuery({
    queryKey: ['clientContacts'],
    queryFn: () => base44.entities.ClientContact.list(),
  });

  const { data: customTags = [] } = useQuery({
    queryKey: ['documentTags'],
    queryFn: () => base44.entities.Tag.filter({ tag_type: 'document' }),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.PropertyDocument.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['property-documents'] });
      toast.success("Documento adicionado");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.PropertyDocument.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['property-documents'] });
      toast.success("Documento eliminado");
    },
  });

  const handleFilesSelect = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(files);
  };

  const processDocumentOCR = async (fileUrl, fileName, fileType, documentId = null) => {
    if (!fileType?.includes('pdf') && !fileType?.includes('image')) {
      return null;
    }

    try {
      const response = await base44.functions.invoke('processPropertyDocumentOCR', {
        file_url: fileUrl,
        document_id: documentId,
        property_id: propertyId
      });

      if (response.data.success) {
        let suggestedName = fileName.split('.')[0];
        const extractedData = response.data.extracted_data;
        
        if (extractedData.suggested_filename) {
          suggestedName = extractedData.suggested_filename;
        } else if (extractedData.document_type === 'energy_certificate') {
          suggestedName = `Certificado Energético - ${extractedData.property_address || propertyTitle}`;
        } else if (extractedData.document_type === 'deed') {
          suggestedName = `Escritura - ${extractedData.property_address || propertyTitle}`;
        } else if (extractedData.document_type === 'cpcv') {
          suggestedName = `CPCV - ${extractedData.buyer_name || 'Cliente'}`;
        } else if (extractedData.key_entities?.length > 0) {
          suggestedName = extractedData.key_entities[0];
        } else if (extractedData.description) {
          suggestedName = extractedData.description.substring(0, 50);
        }

        return {
          document_name: suggestedName,
          document_type: extractedData.document_type || 'other',
          expiry_date: extractedData.expiry_date || null,
          key_entities: response.data.extracted_data.key_entities || [],
          important_dates: response.data.extracted_data.important_dates || [],
          summary: response.data.extracted_data.description?.substring(0, 200) || '',
          detected_fields: response.data.extracted_data,
          property_data_extracted: response.data.fields_updated || []
        };
      }

      return null;
    } catch (error) {
      console.error("OCR Error:", error);
      return null;
    }
  };

  const handleUploadMultiple = async () => {
    if (selectedFiles.length === 0) {
      toast.error("Selecione pelo menos um ficheiro");
      return;
    }

    setUploading(true);
    setProcessingOCR(true);
    setOcrProgress({ current: 0, total: selectedFiles.length });

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        setOcrProgress({ current: i + 1, total: selectedFiles.length });

        let file_url, file_uri;
        
        if (formData.is_public) {
          const result = await base44.integrations.Core.UploadFile({ file });
          file_url = result.file_url;
        } else {
          const result = await base44.integrations.Core.UploadPrivateFile({ file });
          file_uri = result.file_uri;
        }

        const uploadedUrl = file_url || file_uri;
        const ocrData = await processDocumentOCR(uploadedUrl, file.name, file.type);

        const docData = {
          property_id: propertyId,
          property_title: propertyTitle,
          document_name: ocrData?.document_name || file.name.split('.')[0],
          document_type: ocrData?.document_type || formData.document_type,
          description: ocrData?.summary || formData.description,
          expiry_date: ocrData?.expiry_date || formData.expiry_date || null,
          is_public: formData.is_public,
          status: formData.status,
          tags: formData.custom_category ? [formData.custom_category] : [],
          file_url,
          file_uri,
          file_size: file.size,
          file_type: file.type,
          upload_date: new Date().toISOString(),
          ocr_processed: !!ocrData,
          ocr_data: ocrData ? {
            key_entities: ocrData.key_entities || [],
            important_dates: ocrData.important_dates || [],
            detected_fields: ocrData.detected_fields || {},
            processed_at: new Date().toISOString()
          } : null,
          linked_contact_ids: formData.linked_contact_ids || [],
          linked_contact_names: formData.linked_contact_names || []
        };

        await createMutation.mutateAsync(docData);
      }
      
      toast.success(`${selectedFiles.length} documentos processados com OCR`);
      resetForm();
    } catch (error) {
      toast.error("Erro ao carregar ficheiros");
    }
    setUploading(false);
    setProcessingOCR(false);
  };

  const handleGoogleDriveUpload = async (driveFileData) => {
    // Create document record with Drive link
    const docData = {
      property_id: propertyId,
      property_title: propertyTitle,
      document_name: driveFileData.name,
      document_type: formData.document_type,
      description: formData.description,
      expiry_date: formData.expiry_date || null,
      is_public: false,
      status: formData.status,
      tags: formData.custom_category ? [formData.custom_category] : [],
      file_url: driveFileData.drive_link,
      google_drive_id: driveFileData.drive_id,
      file_type: driveFileData.mime_type,
      upload_date: new Date().toISOString(),
      linked_contact_ids: formData.linked_contact_ids || [],
      linked_contact_names: formData.linked_contact_names || []
    };

    await createMutation.mutateAsync(docData);
    toast.success("Documento do Google Drive vinculado!");
  };

  const resetForm = () => {
    setUploadDialogOpen(false);
    setSelectedFiles([]);
    setFormData({
      document_type: "other",
      description: "",
      expiry_date: "",
      is_public: false,
      status: "draft",
      linked_contact_ids: contactId ? [contactId] : [],
      linked_contact_names: contactName ? [contactName] : [],
      custom_category: ""
    });
  };

  const updateDocumentMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PropertyDocument.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['property-documents'] });
      toast.success("Documento atualizado");
      setLinkContactDialogOpen(false);
    },
  });

  const handleLinkContact = (contactToLink) => {
    const currentLinked = selectedDocForLink.linked_contact_ids || [];
    const currentNames = selectedDocForLink.linked_contact_names || [];
    
    if (currentLinked.includes(contactToLink.id)) {
      updateDocumentMutation.mutate({
        id: selectedDocForLink.id,
        data: {
          linked_contact_ids: currentLinked.filter(id => id !== contactToLink.id),
          linked_contact_names: currentNames.filter(name => name !== contactToLink.full_name)
        }
      });
    } else {
      updateDocumentMutation.mutate({
        id: selectedDocForLink.id,
        data: {
          linked_contact_ids: [...currentLinked, contactToLink.id],
          linked_contact_names: [...currentNames, contactToLink.full_name]
        }
      });
    }
  };

  const handleViewDocument = async (doc) => {
    try {
      let url;
      if (doc.file_uri) {
        const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ 
          file_uri: doc.file_uri,
          expires_in: 3600
        });
        url = signed_url;
      } else if (doc.file_url) {
        url = doc.file_url;
      }

      setSelectedDoc({ ...doc, viewUrl: url });
      setViewerOpen(true);
      setZoom(100);
      setCurrentPage(0);
    } catch (error) {
      toast.error("Erro ao abrir documento");
    }
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
      toast.error("Erro ao descarregar ficheiro");
    }
  };

  const getDocTypeInfo = (type) => {
    for (const category of Object.values(DOC_CATEGORIES)) {
      const docType = category.types.find(t => t.id === type);
      if (docType) return docType;
    }
    return { id: type, label: type, icon: "📄" };
  };

  const filteredDocs = documents.filter(doc => {
    const matchesSearch = !searchTerm || 
      doc.document_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())) ||
      doc.ocr_data?.key_entities?.some(e => e.toLowerCase().includes(searchTerm.toLowerCase())) ||
      doc.ocr_data?.detected_fields && Object.values(doc.ocr_data.detected_fields).some(v => 
        String(v).toLowerCase().includes(searchTerm.toLowerCase())
      ) ||
      doc.linked_contact_names?.some(name => name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (categoryFilter === "all") return matchesSearch;
    
    const category = Object.values(DOC_CATEGORIES).find(cat => 
      cat.types.some(t => t.id === doc.document_type)
    );
    return matchesSearch && category && DOC_CATEGORIES[categoryFilter]?.types.some(t => t.id === doc.document_type);
  });

  const docsByCategory = React.useMemo(() => {
    const grouped = {};
    Object.keys(DOC_CATEGORIES).forEach(catKey => {
      grouped[catKey] = filteredDocs.filter(doc => {
        return DOC_CATEGORIES[catKey].types.some(t => t.id === doc.document_type);
      });
    });
    return grouped;
  }, [filteredDocs]);

  const isImage = (fileType) => fileType?.startsWith('image/');
  const isPDF = (fileType) => fileType === 'application/pdf';

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Documentos do Imóvel ({documents.length})
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                <Button 
                  size="sm" 
                  variant={viewMode === "folders" ? "default" : "ghost"}
                  className="h-7 px-2"
                  onClick={() => setViewMode("folders")}
                >
                  <Folder className="w-4 h-4" />
                </Button>
                <Button 
                  size="sm" 
                  variant={viewMode === "list" ? "default" : "ghost"}
                  className="h-7 px-2"
                  onClick={() => setViewMode("list")}
                >
                  <FileText className="w-4 h-4" />
                </Button>
              </div>
              <Button onClick={() => setUploadDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Pesquisar documentos, OCR, contactos..."
                className="pl-8 h-9"
              />
            </div>
            {viewMode === "list" && (
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-48 h-9">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Categorias</SelectItem>
                  {Object.entries(DOC_CATEGORIES).map(([key, cat]) => (
                    <SelectItem key={key} value={key}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {filteredDocs.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <FileText className="w-16 h-16 mx-auto mb-3 opacity-30" />
              <p>Sem documentos</p>
            </div>
          ) : viewMode === "folders" ? (
            <Accordion type="multiple" value={expandedFolders} onValueChange={setExpandedFolders} className="space-y-2">
              {Object.entries(DOC_CATEGORIES).map(([catKey, category]) => {
                const categoryDocs = docsByCategory[catKey] || [];
                if (categoryDocs.length === 0 && searchTerm) return null;

                return (
                  <AccordionItem key={catKey} value={catKey} className={`border rounded-lg ${category.color}`}>
                    <AccordionTrigger className="px-4 py-3 hover:no-underline">
                      <div className="flex items-center justify-between w-full pr-4">
                        <div className="flex items-center gap-3">
                          <Folder className="w-5 h-5 text-slate-600" />
                          <span className="font-semibold text-slate-900">{category.label}</span>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {categoryDocs.length}
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-3">
                      {categoryDocs.length === 0 ? (
                        <p className="text-sm text-slate-500 text-center py-4">Sem documentos nesta categoria</p>
                      ) : (
                        <div className="space-y-2 mt-2">
                          {categoryDocs.map((doc) => (
                            <DocumentRow 
                              key={doc.id} 
                              doc={doc} 
                              onView={handleViewDocument}
                              onDownload={handleDownload}
                              onDelete={() => deleteMutation.mutate(doc.id)}
                              onLinkContact={() => {
                                setSelectedDocForLink(doc);
                                setLinkContactDialogOpen(true);
                              }}
                              getDocTypeInfo={getDocTypeInfo}
                              isImage={isImage}
                              isPDF={isPDF}
                            />
                          ))}
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          ) : (
            <div className="space-y-2">
              {filteredDocs.map((doc) => (
                <DocumentRow 
                  key={doc.id} 
                  doc={doc} 
                  onView={handleViewDocument}
                  onDownload={handleDownload}
                  onDelete={() => deleteMutation.mutate(doc.id)}
                  onLinkContact={() => {
                    setSelectedDocForLink(doc);
                    setLinkContactDialogOpen(true);
                  }}
                  getDocTypeInfo={getDocTypeInfo}
                  isImage={isImage}
                  isPDF={isPDF}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Adicionar Documentos</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Ficheiros * (Múltiplos)</Label>
              <div className="border-2 border-dashed rounded-lg p-6 text-center hover:bg-slate-50 transition-colors">
                <input
                  type="file"
                  multiple
                  onChange={handleFilesSelect}
                  className="hidden"
                  id="doc-upload-multiple"
                  disabled={uploading}
                />
                <label htmlFor="doc-upload-multiple" className="cursor-pointer">
                  <Upload className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-600 mb-1">
                    {selectedFiles.length > 0 
                      ? `${selectedFiles.length} ficheiro${selectedFiles.length > 1 ? 's' : ''} selecionado${selectedFiles.length > 1 ? 's' : ''}`
                      : "Clique ou arraste ficheiros"
                    }
                  </p>
                  <p className="text-xs text-slate-500">PDF, DOC, JPG, PNG, etc.</p>
                </label>
              </div>
              {selectedFiles.length > 0 && (
                <div className="mt-2 space-y-1">
                  {selectedFiles.map((file, idx) => (
                    <div key={idx} className="text-xs text-slate-600 flex items-center gap-2">
                      <FileText className="w-3 h-3" />
                      {file.name} ({(file.size / 1024).toFixed(1)} KB)
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Google Drive Upload Option */}
            <div className="border-t pt-4">
              <GoogleDriveUploader 
                onUploadSuccess={handleGoogleDriveUpload}
                disabled={uploading}
              />
            </div>

            <div>
              <Label>Categoria de Documento</Label>
              <Select value={formData.document_type} onValueChange={(v) => setFormData({...formData, document_type: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  {Object.entries(DOC_CATEGORIES).map(([catKey, category]) => (
                    <React.Fragment key={catKey}>
                      <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 bg-slate-50">
                        {category.label}
                      </div>
                      {category.types.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.icon} {type.label}
                        </SelectItem>
                      ))}
                    </React.Fragment>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Estado</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Data de Expiração</Label>
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
                id="is_public"
                checked={formData.is_public}
                onChange={(e) => setFormData({...formData, is_public: e.target.checked})}
                className="rounded"
              />
              <Label htmlFor="is_public" className="text-sm cursor-pointer">
                Documento público (visível em feeds e integrações)
              </Label>
            </div>

            <div>
              <Label>Categoria Personalizada (opcional)</Label>
              <div className="flex gap-2">
                <Select value={formData.custom_category} onValueChange={(v) => setFormData({...formData, custom_category: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar categoria..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Sem categoria</SelectItem>
                    {customTags.map((tag) => (
                      <SelectItem key={tag.id} value={tag.name}>
                        {tag.icon} {tag.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    const tagName = prompt("Nome da nova categoria:");
                    if (tagName) {
                      const icon = prompt("Emoji (opcional):", "📁");
                      await base44.entities.Tag.create({
                        tag_type: "document",
                        name: tagName,
                        icon: icon || "📁",
                        category: "custom"
                      });
                      queryClient.invalidateQueries({ queryKey: ['documentTags'] });
                      toast.success("Categoria criada");
                    }
                  }}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">Vincular a Contactos</Label>
              <div className="border rounded-lg p-3 bg-slate-50 max-h-40 overflow-y-auto">
                {allContacts.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-2">Sem contactos disponíveis</p>
                ) : (
                  <div className="space-y-1">
                    {allContacts.slice(0, 10).map(contact => {
                      const isLinked = formData.linked_contact_ids?.includes(contact.id);
                      return (
                        <div key={contact.id} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`contact-${contact.id}`}
                            checked={isLinked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({
                                  ...formData,
                                  linked_contact_ids: [...(formData.linked_contact_ids || []), contact.id],
                                  linked_contact_names: [...(formData.linked_contact_names || []), contact.full_name]
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  linked_contact_ids: formData.linked_contact_ids?.filter(id => id !== contact.id) || [],
                                  linked_contact_names: formData.linked_contact_names?.filter(name => name !== contact.full_name) || []
                                });
                              }
                            }}
                            className="rounded"
                          />
                          <Label htmlFor={`contact-${contact.id}`} className="text-xs cursor-pointer flex-1">
                            {contact.full_name}
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {processingOCR && (
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Wand2 className="w-4 h-4 text-purple-600 animate-pulse" />
                  <span className="text-sm font-medium text-purple-900">
                    Processando OCR... ({ocrProgress.current}/{ocrProgress.total})
                  </span>
                </div>
                <div className="w-full bg-purple-200 rounded-full h-2">
                  <div 
                    className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(ocrProgress.current / ocrProgress.total) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-purple-700 mt-2">
                  Extraindo informações automaticamente dos documentos...
                </p>
              </div>
            )}

            <div className="flex gap-2 justify-end pt-2 border-t">
              <Button variant="outline" onClick={resetForm} disabled={uploading}>
                Cancelar
              </Button>
              <Button onClick={handleUploadMultiple} disabled={uploading || selectedFiles.length === 0}>
                {uploading ? (
                  <>
                    <Wand2 className="w-4 h-4 mr-2 animate-pulse" />
                    Processando OCR...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Adicionar com OCR ({selectedFiles.length})
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Document Viewer Dialog */}
      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent className="max-w-6xl max-h-[95vh] p-0">
          <div className="flex flex-col h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b bg-slate-50">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{selectedDoc && getDocTypeInfo(selectedDoc.document_type).icon}</span>
                <div>
                  <h3 className="font-semibold text-slate-900">{selectedDoc?.document_name}</h3>
                  <p className="text-xs text-slate-500">
                    {selectedDoc && getDocTypeInfo(selectedDoc.document_type).label}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {selectedDoc && isPDF(selectedDoc.file_type) && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setZoom(Math.max(50, zoom - 10))}
                    >
                      <ZoomOut className="w-4 h-4" />
                    </Button>
                    <span className="text-sm text-slate-600 min-w-[50px] text-center">{zoom}%</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setZoom(Math.min(200, zoom + 10))}
                    >
                      <ZoomIn className="w-4 h-4" />
                    </Button>
                  </>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload(selectedDoc)}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Descarregar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewerOpen(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-auto bg-slate-100 p-4">
              <div className="grid lg:grid-cols-3 gap-4 h-full">
                <div className="lg:col-span-2 h-full">
                  {selectedDoc && isImage(selectedDoc.file_type) && (
                    <div className="flex items-center justify-center h-full">
                      <img
                        src={selectedDoc.viewUrl}
                        alt={selectedDoc.document_name}
                        className="max-w-full max-h-full object-contain shadow-lg"
                        style={{ transform: `scale(${zoom / 100})` }}
                      />
                    </div>
                  )}
                  {selectedDoc && isPDF(selectedDoc.file_type) && (
                    <div className="flex items-center justify-center h-full">
                      <iframe
                        src={`${selectedDoc.viewUrl}#zoom=${zoom}`}
                        className="w-full h-full border-0 shadow-lg bg-white"
                        title={selectedDoc.document_name}
                      />
                    </div>
                  )}
                </div>

                {selectedDoc?.ocr_data && (
                  <div className="lg:col-span-1 bg-white rounded-lg p-4 shadow-sm overflow-y-auto">
                    <div className="flex items-center gap-2 mb-4 pb-3 border-b">
                      <Wand2 className="w-4 h-4 text-purple-600" />
                      <h4 className="font-semibold text-slate-900">Dados Extraídos (OCR)</h4>
                    </div>

                    <div className="space-y-4 text-sm">
                      {selectedDoc.ocr_data.key_entities?.length > 0 && (
                        <div>
                          <Label className="text-xs text-slate-500 mb-1 block">Entidades Mencionadas</Label>
                          <div className="flex flex-wrap gap-1">
                            {selectedDoc.ocr_data.key_entities.map((entity, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {entity}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {selectedDoc.ocr_data.important_dates?.length > 0 && (
                        <div>
                          <Label className="text-xs text-slate-500 mb-1 block">Datas Importantes</Label>
                          <div className="space-y-2">
                            {selectedDoc.ocr_data.important_dates.map((date, idx) => (
                              <div key={idx} className="text-xs bg-slate-50 p-2 rounded">
                                <div className="font-medium text-slate-900">{date.date}</div>
                                <div className="text-slate-600">{date.description}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {selectedDoc.ocr_data.detected_fields && Object.keys(selectedDoc.ocr_data.detected_fields).length > 0 && (
                        <div>
                          <Label className="text-xs text-slate-500 mb-1 block">Campos Detetados</Label>
                          <div className="space-y-1">
                            {Object.entries(selectedDoc.ocr_data.detected_fields).map(([key, value], idx) => (
                              <div key={idx} className="text-xs flex justify-between bg-slate-50 p-2 rounded">
                                <span className="font-medium text-slate-600">{key}:</span>
                                <span className="text-slate-900">{String(value)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {selectedDoc.ocr_data.processed_at && (
                        <div className="pt-3 border-t">
                          <p className="text-xs text-slate-400">
                            Processado: {format(new Date(selectedDoc.ocr_data.processed_at), 'dd/MM/yyyy HH:mm')}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Link Contact Dialog */}
      <Dialog open={linkContactDialogOpen} onOpenChange={setLinkContactDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Vincular Documento a Contactos</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            <p className="text-sm text-slate-600">
              Documento: <strong>{selectedDocForLink?.document_name}</strong>
            </p>
            
            {selectedDocForLink?.linked_contact_names?.length > 0 && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <Label className="text-xs font-semibold text-green-900 mb-2 block">Contactos Vinculados</Label>
                <div className="flex flex-wrap gap-1">
                  {selectedDocForLink.linked_contact_names.map((name, idx) => (
                    <Badge key={idx} className="bg-green-100 text-green-800 text-xs">
                      <User className="w-3 h-3 mr-1" />
                      {name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="border rounded-lg p-3 max-h-64 overflow-y-auto space-y-1">
              {allContacts.map(contact => {
                const isLinked = selectedDocForLink?.linked_contact_ids?.includes(contact.id);
                return (
                  <div 
                    key={contact.id} 
                    className={`flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 cursor-pointer ${
                      isLinked ? 'bg-blue-50 border border-blue-200' : ''
                    }`}
                    onClick={() => handleLinkContact(contact)}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isLinked}
                        onChange={() => {}}
                        className="rounded"
                      />
                      <span className="text-sm font-medium">{contact.full_name}</span>
                    </div>
                    {isLinked && <CheckCircle className="w-4 h-4 text-blue-600" />}
                  </div>
                );
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Document Row Component
function DocumentRow({ doc, onView, onDownload, onDelete, onLinkContact, getDocTypeInfo, isImage, isPDF }) {
  const typeInfo = getDocTypeInfo(doc.document_type);
  const daysUntilExpiry = doc.expiry_date ? differenceInDays(new Date(doc.expiry_date), new Date()) : null;
  const isExpired = daysUntilExpiry !== null && daysUntilExpiry < 0;
  const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry >= 0 && daysUntilExpiry <= 30;
  const statusInfo = STATUS_OPTIONS.find(s => s.value === doc.status) || STATUS_OPTIONS[0];

  return (
    <div 
      className={`flex items-center justify-between p-3 rounded-lg border ${
        isExpired ? "border-red-200 bg-red-50" : "hover:bg-slate-50 border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <span className="text-2xl flex-shrink-0">{typeInfo.icon}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-medium text-slate-900 truncate">{doc.document_name}</p>
            {doc.ocr_processed && (
              <Badge className="bg-purple-100 text-purple-700 text-xs" title="Processado com OCR">
                <Wand2 className="w-3 h-3" />
              </Badge>
            )}
            {doc.google_drive_id && (
              <a
                href={doc.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700"
                title="Ver no Google Drive"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
          {doc.description && (
            <p className="text-xs text-slate-600 truncate mt-0.5">{doc.description}</p>
          )}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Badge variant="outline" className="text-xs">
              {typeInfo.label}
            </Badge>
            <Badge className={`text-xs ${statusInfo.color}`}>
              {statusInfo.label}
            </Badge>
            {doc.is_public ? (
              <Badge variant="outline" className="text-xs">
                <Globe className="w-3 h-3 mr-1" />
                Público
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs">
                <Lock className="w-3 h-3 mr-1" />
                Privado
              </Badge>
            )}
            {isExpired && (
              <Badge className="bg-red-100 text-red-800 text-xs">
                <AlertCircle className="w-3 h-3 mr-1" />
                Expirado
              </Badge>
            )}
            {isExpiringSoon && !isExpired && (
              <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                {daysUntilExpiry}d restantes
              </Badge>
            )}
            {doc.linked_contact_names?.length > 0 && (
              <Badge variant="outline" className="text-xs bg-blue-50 border-blue-200 text-blue-800">
                <User className="w-3 h-3 mr-1" />
                {doc.linked_contact_names.length} contacto{doc.linked_contact_names.length > 1 ? 's' : ''}
              </Badge>
            )}
            {doc.tags?.length > 0 && (
              <Badge variant="outline" className="text-xs bg-indigo-50 border-indigo-200 text-indigo-800">
                {doc.tags[0]}
              </Badge>
            )}
            {doc.ocr_data?.key_entities?.length > 0 && (
              <Badge variant="outline" className="text-xs">
                {doc.ocr_data.key_entities.slice(0, 2).join(', ')}
                {doc.ocr_data.key_entities.length > 2 && ` +${doc.ocr_data.key_entities.length - 2}`}
              </Badge>
            )}
            {doc.upload_date && (
              <span className="text-xs text-slate-500">
                {format(new Date(doc.upload_date), 'dd/MM/yyyy HH:mm')}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex gap-1 flex-shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={onLinkContact}
          title="Vincular a contacto"
        >
          <Link2 className="w-4 h-4" />
        </Button>
        {(isImage(doc.file_type) || isPDF(doc.file_type)) && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => onView(doc)}
            title="Visualizar"
          >
            <Eye className="w-4 h-4" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => onDownload(doc)}
          title="Descarregar"
        >
          <Download className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
          onClick={() => {
            if (confirm("Eliminar documento?")) {
              onDelete();
            }
          }}
          title="Eliminar"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}