import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FileText, Plus, Download, Trash2, Upload, Lock, Globe, AlertCircle } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { toast } from "sonner";

export default function DocumentManager({ propertyId, propertyTitle }) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    document_name: "",
    document_type: "other",
    description: "",
    expiry_date: "",
    is_public: false
  });
  const [selectedFile, setSelectedFile] = useState(null);

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
      setDialogOpen(false);
      setFormData({
        document_name: "",
        document_type: "other",
        description: "",
        expiry_date: "",
        is_public: false
      });
      setSelectedFile(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.PropertyDocument.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['property-documents'] });
      toast.success("Documento eliminado");
    },
  });

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      if (!formData.document_name) {
        setFormData({...formData, document_name: file.name});
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
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file: selectedFile });
      
      createMutation.mutate({
        ...formData,
        property_id: propertyId,
        property_title: propertyTitle,
        file_uri,
        file_size: selectedFile.size,
        file_type: selectedFile.type,
        upload_date: new Date().toISOString()
      });
    } catch (error) {
      toast.error("Erro ao carregar ficheiro");
    }
    setUploading(false);
  };

  const handleDownload = async (doc) => {
    try {
      const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ 
        file_uri: doc.file_uri,
        expires_in: 300
      });
      window.open(signed_url, '_blank');
    } catch (error) {
      toast.error("Erro ao descarregar ficheiro");
    }
  };

  const getDocTypeLabel = (type) => {
    const labels = {
      deed: "📜 Escritura",
      energy_certificate: "⚡ Certificado Energético",
      insurance: "🛡️ Seguro",
      tax_document: "💰 Documento Fiscal",
      floor_plan: "📐 Planta",
      inspection_report: "🔍 Relatório de Inspeção",
      building_permit: "🏗️ Licença de Construção",
      lease_agreement: "📝 Contrato de Arrendamento",
      other: "📄 Outro"
    };
    return labels[type] || type;
  };

  const getDocTypeIcon = (type) => {
    const icons = {
      deed: "📜",
      energy_certificate: "⚡",
      insurance: "🛡️",
      tax_document: "💰",
      floor_plan: "📐",
      inspection_report: "🔍",
      building_permit: "🏗️",
      lease_agreement: "📝",
      other: "📄"
    };
    return icons[type] || "📄";
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Documentos ({documents.length})
        </h3>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Documento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Adicionar Documento</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>Ficheiro *</Label>
                <div className="border-2 border-dashed rounded-lg p-6 text-center">
                  <input
                    type="file"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="doc-upload"
                    disabled={uploading}
                  />
                  <label htmlFor="doc-upload" className="cursor-pointer">
                    <Upload className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm text-slate-600 mb-1">
                      {selectedFile ? selectedFile.name : "Clique para carregar"}
                    </p>
                    <p className="text-xs text-slate-500">PDF, DOC, JPG, PNG</p>
                  </label>
                </div>
              </div>

              <div>
                <Label>Nome do Documento *</Label>
                <Input
                  value={formData.document_name}
                  onChange={(e) => setFormData({...formData, document_name: e.target.value})}
                />
              </div>

              <div>
                <Label>Tipo de Documento</Label>
                <Select value={formData.document_type} onValueChange={(v) => setFormData({...formData, document_type: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="deed">📜 Escritura</SelectItem>
                    <SelectItem value="energy_certificate">⚡ Certificado Energético</SelectItem>
                    <SelectItem value="insurance">🛡️ Seguro</SelectItem>
                    <SelectItem value="tax_document">💰 Documento Fiscal</SelectItem>
                    <SelectItem value="floor_plan">📐 Planta</SelectItem>
                    <SelectItem value="inspection_report">🔍 Relatório de Inspeção</SelectItem>
                    <SelectItem value="building_permit">🏗️ Licença</SelectItem>
                    <SelectItem value="lease_agreement">📝 Contrato</SelectItem>
                    <SelectItem value="other">📄 Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Descrição</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Descrição opcional..."
                />
              </div>

              <div>
                <Label>Data de Expiração (opcional)</Label>
                <Input
                  type="date"
                  value={formData.expiry_date}
                  onChange={(e) => setFormData({...formData, expiry_date: e.target.value})}
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSubmit} disabled={uploading || !selectedFile}>
                  {uploading ? "A carregar..." : "Adicionar"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {documents.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600">Sem documentos</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => {
            const daysUntilExpiry = doc.expiry_date ? differenceInDays(new Date(doc.expiry_date), new Date()) : null;
            const isExpired = daysUntilExpiry !== null && daysUntilExpiry < 0;
            const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry >= 0 && daysUntilExpiry <= 30;
            
            return (
              <Card key={doc.id} className={isExpired ? "border-red-300" : ""}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <span className="text-2xl">{getDocTypeIcon(doc.document_type)}</span>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-slate-900 truncate">{doc.document_name}</h4>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge variant="outline" className="text-xs">
                            {getDocTypeLabel(doc.document_type)}
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
                          {isExpiringSoon && (
                            <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                              Expira em {daysUntilExpiry} dias
                            </Badge>
                          )}
                          {doc.upload_date && (
                            <span className="text-xs text-slate-500">
                              {format(new Date(doc.upload_date), 'dd/MM/yyyy')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(doc)}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (confirm("Eliminar documento?")) {
                            deleteMutation.mutate(doc.id);
                          }
                        }}
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
      )}
    </div>
  );
}