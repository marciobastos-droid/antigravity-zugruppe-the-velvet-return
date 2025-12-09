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
import { 
  FileText, Plus, Download, Trash2, Upload, Lock, Globe, AlertCircle,
  Eye, X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Search, Wand2, CheckCircle
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { toast } from "sonner";

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

export default function PropertyDocumentManager({ propertyId, propertyTitle }) {
  const queryClient = useQueryClient();
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [zoom, setZoom] = useState(100);
  const [currentPage, setCurrentPage] = useState(0);

  const [formData, setFormData] = useState({
    document_type: "other",
    description: "",
    expiry_date: "",
    is_public: false,
    status: "draft"
  });

  const [processingOCR, setProcessingOCR] = useState(false);
  const [ocrProgress, setOcrProgress] = useState({ current: 0, total: 0 });

  const { data: documents = [] } = useQuery({
    queryKey: ['property-documents', propertyId],
    queryFn: () => base44.entities.PropertyDocument.filter({ property_id: propertyId }, '-upload_date'),
    enabled: !!propertyId
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

  const processDocumentOCR = async (fileUrl, fileName, fileType) => {
    // Apenas processar PDFs e imagens
    if (!fileType?.includes('pdf') && !fileType?.includes('image')) {
      return null;
    }

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Analisa este documento e extrai as seguintes informações em formato JSON:
- document_name: nome do documento ou título (string)
- document_type: tipo do documento (escolhe o mais apropriado: deed, energy_certificate, insurance, tax_document, floor_plan, inspection_report, building_permit, lease_agreement, contract, proposal, brochure, cpcv, appraisal, invoice, technical_specs, other)
- expiry_date: data de validade/expiração se existir (formato YYYY-MM-DD ou null)
- key_entities: nomes de pessoas, empresas ou entidades mencionadas (array de strings)
- important_dates: outras datas relevantes mencionadas (array de objetos com {date: "YYYY-MM-DD", description: "descrição"})
- summary: resumo breve do conteúdo (string, máx 200 caracteres)
- detected_fields: quaisquer campos estruturados encontrados (objeto com pares chave-valor)

Se não conseguires extrair alguma informação, usa null ou array vazio.`,
        file_urls: [fileUrl],
        response_json_schema: {
          type: "object",
          properties: {
            document_name: { type: "string" },
            document_type: { type: "string" },
            expiry_date: { type: ["string", "null"] },
            key_entities: { type: "array", items: { type: "string" } },
            important_dates: { 
              type: "array", 
              items: { 
                type: "object",
                properties: {
                  date: { type: "string" },
                  description: { type: "string" }
                }
              }
            },
            summary: { type: "string" },
            detected_fields: { type: "object" }
          }
        }
      });

      return result;
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

        // Process OCR
        const uploadedUrl = file_url || file_uri;
        const ocrData = await processDocumentOCR(uploadedUrl, file.name, file.type);

        // Use OCR data if available, otherwise use form data
        const docData = {
          property_id: propertyId,
          property_title: propertyTitle,
          document_name: ocrData?.document_name || file.name.split('.')[0],
          document_type: ocrData?.document_type || formData.document_type,
          description: ocrData?.summary || formData.description,
          expiry_date: ocrData?.expiry_date || formData.expiry_date || null,
          is_public: formData.is_public,
          status: formData.status,
          file_url,
          file_uri,
          file_size: file.size,
          file_type: file.type,
          upload_date: new Date().toISOString(),
          // OCR metadata
          ocr_processed: !!ocrData,
          ocr_data: ocrData ? {
            key_entities: ocrData.key_entities || [],
            important_dates: ocrData.important_dates || [],
            detected_fields: ocrData.detected_fields || {},
            processed_at: new Date().toISOString()
          } : null
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

  const resetForm = () => {
    setUploadDialogOpen(false);
    setSelectedFiles([]);
    setFormData({
      document_type: "other",
      description: "",
      expiry_date: "",
      is_public: false,
      status: "draft"
    });
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
      // Pesquisar em metadados OCR
      doc.ocr_data?.key_entities?.some(e => e.toLowerCase().includes(searchTerm.toLowerCase())) ||
      doc.ocr_data?.detected_fields && Object.values(doc.ocr_data.detected_fields).some(v => 
        String(v).toLowerCase().includes(searchTerm.toLowerCase())
      );
    
    if (categoryFilter === "all") return matchesSearch;
    
    const category = Object.values(DOC_CATEGORIES).find(cat => 
      cat.types.some(t => t.id === doc.document_type)
    );
    return matchesSearch && category && DOC_CATEGORIES[categoryFilter]?.types.some(t => t.id === doc.document_type);
  });

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
            <Button onClick={() => setUploadDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Documentos
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {documents.length > 3 && (
            <div className="flex gap-2 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Pesquisar documentos..."
                  className="pl-8"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Categorias</SelectItem>
                  {Object.entries(DOC_CATEGORIES).map(([key, cat]) => (
                    <SelectItem key={key} value={key}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {filteredDocs.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <FileText className="w-16 h-16 mx-auto mb-3 opacity-30" />
              <p>Sem documentos</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredDocs.map((doc) => {
                const typeInfo = getDocTypeInfo(doc.document_type);
                const daysUntilExpiry = doc.expiry_date ? differenceInDays(new Date(doc.expiry_date), new Date()) : null;
                const isExpired = daysUntilExpiry !== null && daysUntilExpiry < 0;
                const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry >= 0 && daysUntilExpiry <= 30;
                const statusInfo = STATUS_OPTIONS.find(s => s.value === doc.status) || STATUS_OPTIONS[0];

                return (
                  <div 
                    key={doc.id} 
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      isExpired ? "border-red-200 bg-red-50" : "hover:bg-slate-50 border-slate-200"
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
                      {(isImage(doc.file_type) || isPDF(doc.file_type)) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handleViewDocument(doc)}
                          title="Visualizar"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => handleDownload(doc)}
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
                            deleteMutation.mutate(doc.id);
                          }
                        }}
                        title="Eliminar"
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
            {/* Header */}
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

            {/* Viewer */}
            <div className="flex-1 overflow-auto bg-slate-100 p-4">
              <div className="grid lg:grid-cols-3 gap-4 h-full">
                {/* Document Preview - 2/3 width */}
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

                {/* OCR Metadata Panel - 1/3 width */}
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
    </>
  );
}