import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tantml:react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { 
  Upload, FileText, Loader2, Wand2, Building2, User, 
  CheckCircle2, AlertCircle, Calendar, MapPin, Euro,
  Bed, Bath, Maximize, Home, Phone, Mail, Briefcase,
  Download, Eye, Copy, Plus, Save, Edit, FileSignature
} from "lucide-react";
import { toast } from "sonner";

export default function OCRProcessor() {
  const queryClient = useQueryClient();
  const [file, setFile] = useState(null);
  const [fileUrl, setFileUrl] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [ocrResult, setOcrResult] = useState(null);
  const [selectedProperties, setSelectedProperties] = useState([]);
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [applying, setApplying] = useState(false);
  const [contractDataDialogOpen, setContractDataDialogOpen] = useState(false);
  const [dealDataDialogOpen, setDealDataDialogOpen] = useState(false);
  const [extractedContractData, setExtractedContractData] = useState(null);
  const [extractedDealData, setExtractedDealData] = useState(null);

  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    if (!selectedFile.type.includes('pdf')) {
      toast.error("Apenas ficheiros PDF são suportados");
      return;
    }

    setFile(selectedFile);
    setOcrResult(null);
    setSelectedProperties([]);
    setSelectedContacts([]);
  };

  const processDocument = async () => {
    if (!file) {
      toast.error("Selecione um ficheiro PDF");
      return;
    }

    setProcessing(true);

    try {
      // Upload file
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFileUrl(file_url);

      // Process with OCR
      const response = await base44.functions.invoke('processOCRDocument', {
        file_url: file_url
      });

      if (response.data.success) {
        setOcrResult(response.data.data);
        
        // Auto-select all found items
        if (response.data.data.properties) {
          setSelectedProperties(response.data.data.properties.map((_, idx) => idx));
        }
        if (response.data.data.contacts) {
          setSelectedContacts(response.data.data.contacts.map((_, idx) => idx));
        }

        toast.success(`OCR concluído: ${response.data.properties_found} imóveis, ${response.data.contacts_found} contactos`);
      } else {
        toast.error("Erro no OCR: " + response.data.error);
      }
    } catch (error) {
      toast.error("Erro ao processar documento");
      console.error(error);
    }

    setProcessing(false);
  };

  const createPropertyMutation = useMutation({
    mutationFn: (data) => base44.entities.Property.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
    }
  });

  const createContactMutation = useMutation({
    mutationFn: (data) => base44.entities.ClientContact.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientContacts'] });
    }
  });

  const applyExtractedData = async () => {
    setApplying(true);
    let propertiesCreated = 0;
    let contactsCreated = 0;

    try {
      // Create selected properties
      if (ocrResult.properties) {
        for (const idx of selectedProperties) {
          const prop = ocrResult.properties[idx];
          try {
            await createPropertyMutation.mutateAsync({
              ...prop,
              status: 'active',
              visibility: 'private',
              internal_notes: `Importado via OCR de ${file.name} em ${new Date().toLocaleDateString()}`
            });
            propertiesCreated++;
          } catch (error) {
            console.error("Erro ao criar imóvel:", error);
          }
        }
      }

      // Create selected contacts
      if (ocrResult.contacts) {
        for (const idx of selectedContacts) {
          const contact = ocrResult.contacts[idx];
          try {
            // Check if contact already exists
            const existing = await base44.entities.ClientContact.filter({ 
              email: contact.email 
            });

            if (existing.length === 0) {
              await createContactMutation.mutateAsync({
                ...contact,
                source: 'ocr_import',
                tags: ['ocr', file.name.split('.')[0]]
              });
              contactsCreated++;
            }
          } catch (error) {
            console.error("Erro ao criar contacto:", error);
          }
        }
      }

      toast.success(`Criados: ${propertiesCreated} imóveis, ${contactsCreated} contactos`);
      
      // Reset
      setFile(null);
      setFileUrl(null);
      setOcrResult(null);
      setSelectedProperties([]);
      setSelectedContacts([]);
    } catch (error) {
      toast.error("Erro ao aplicar dados");
    }

    setApplying(false);
  };

  const togglePropertySelection = (idx) => {
    setSelectedProperties(prev => 
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    );
  };

  const toggleContactSelection = (idx) => {
    setSelectedContacts(prev => 
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    );
  };

  const createContractFromOCR = () => {
    if (!ocrResult?.contract_data) {
      toast.error("Nenhum dado de contrato extraído");
      return;
    }
    setExtractedContractData(ocrResult.contract_data);
    setContractDataDialogOpen(true);
  };

  const createDealFromOCR = () => {
    if (!ocrResult?.contract_data) {
      toast.error("Nenhum dado de negócio extraído");
      return;
    }
    setExtractedDealData(ocrResult.contract_data);
    setDealDataDialogOpen(true);
  };

  const saveContractMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.Contract.create(data);
    },
    onSuccess: () => {
      toast.success("Contrato criado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      setContractDataDialogOpen(false);
      setFile(null);
      setOcrResult(null);
    }
  });

  const saveDealMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.DealFolder.create(data);
    },
    onSuccess: () => {
      toast.success("Negócio criado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ['dealFolders'] });
      setDealDataDialogOpen(false);
      setFile(null);
      setOcrResult(null);
    }
  });

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Upload Card */}
      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-purple-600" />
            Processador OCR Inteligente
          </CardTitle>
          <p className="text-sm text-slate-600">
            Carregue um PDF para extrair automaticamente dados de imóveis e contactos
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed border-purple-300 rounded-lg p-8 text-center hover:border-purple-400 transition-colors bg-purple-50/50">
            <input
              type="file"
              accept="application/pdf"
              onChange={handleFileSelect}
              className="hidden"
              id="ocr-upload"
              disabled={processing}
            />
            <label htmlFor="ocr-upload" className="cursor-pointer">
              {file ? (
                <>
                  <FileText className="w-12 h-12 text-purple-600 mx-auto mb-3" />
                  <p className="font-medium text-slate-900 mb-1">{file.name}</p>
                  <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                </>
              ) : (
                <>
                  <Upload className="w-12 h-12 text-purple-400 mx-auto mb-3" />
                  <p className="text-slate-700 font-medium mb-1">Clique para carregar PDF</p>
                  <p className="text-sm text-slate-500">Suporta documentos de angariação, avaliações, contratos, etc.</p>
                </>
              )}
            </label>
          </div>

          <Button
            onClick={processDocument}
            disabled={!file || processing}
            className="w-full bg-purple-600 hover:bg-purple-700"
            size="lg"
          >
            {processing ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Processando com IA...
              </>
            ) : (
              <>
                <Wand2 className="w-5 h-5 mr-2" />
                Processar com OCR
              </>
            )}
          </Button>

          {ocrResult && (
            <div className="space-y-3 pt-4 border-t">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span className="font-semibold text-green-900">OCR Completo</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-slate-600">Tipo:</span>
                    <Badge className="ml-2 text-xs">{ocrResult.document_type}</Badge>
                  </div>
                  <div>
                    <span className="text-slate-600">Imóveis:</span>
                    <Badge className="ml-2 bg-blue-100 text-blue-800 text-xs">
                      {ocrResult.properties?.length || 0}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-slate-600">Contactos:</span>
                    <Badge className="ml-2 bg-green-100 text-green-800 text-xs">
                      {ocrResult.contacts?.length || 0}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-slate-600">Datas:</span>
                    <Badge className="ml-2 bg-amber-100 text-amber-800 text-xs">
                      {ocrResult.important_dates?.length || 0}
                    </Badge>
                  </div>
                </div>
                {ocrResult.summary && (
                  <p className="text-xs text-slate-600 mt-3 italic">"{ocrResult.summary}"</p>
                )}
                
                {/* Contract/Deal Actions */}
                {ocrResult.contract_data && (
                  <div className="mt-4 pt-3 border-t border-green-300 flex gap-2">
                    <Button
                      onClick={createContractFromOCR}
                      variant="outline"
                      size="sm"
                      className="flex-1 border-blue-300 text-blue-700 hover:bg-blue-50"
                    >
                      <FileSignature className="w-4 h-4 mr-2" />
                      Criar Contrato
                    </Button>
                    <Button
                      onClick={createDealFromOCR}
                      variant="outline"
                      size="sm"
                      className="flex-1 border-purple-300 text-purple-700 hover:bg-purple-50"
                    >
                      <Briefcase className="w-4 h-4 mr-2" />
                      Criar Negócio
                    </Button>
                  </div>
                )}
              </div>

              {fileUrl && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => window.open(fileUrl, '_blank')}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Ver PDF Original
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Dados Extraídos</span>
            {ocrResult && (
              <Button
                onClick={applyExtractedData}
                disabled={applying || (selectedProperties.length === 0 && selectedContacts.length === 0)}
                className="bg-green-600 hover:bg-green-700"
              >
                {applying ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Aplicando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Aplicar Selecionados
                  </>
                )}
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!ocrResult ? (
            <div className="text-center py-20">
              <Wand2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 mb-2">Carregue e processe um PDF</p>
              <p className="text-sm text-slate-400">A IA extrairá dados de imóveis e contactos automaticamente</p>
            </div>
          ) : (
            <Tabs defaultValue="properties" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="properties">
                  <Building2 className="w-4 h-4 mr-2" />
                  Imóveis ({ocrResult.properties?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="contacts">
                  <User className="w-4 h-4 mr-2" />
                  Contactos ({ocrResult.contacts?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="dates">
                  <Calendar className="w-4 h-4 mr-2" />
                  Datas ({ocrResult.important_dates?.length || 0})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="properties" className="mt-4">
                <ScrollArea className="h-[500px]">
                  {!ocrResult.properties || ocrResult.properties.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      Nenhum imóvel encontrado
                    </div>
                  ) : (
                    <div className="space-y-3 pr-4">
                      {ocrResult.properties.map((prop, idx) => (
                        <Card key={idx} className={`border-2 ${selectedProperties.includes(idx) ? 'border-blue-400 bg-blue-50' : 'border-slate-200'}`}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-start gap-3 flex-1">
                                <Checkbox
                                  checked={selectedProperties.includes(idx)}
                                  onCheckedChange={() => togglePropertySelection(idx)}
                                />
                                <div className="flex-1">
                                  <h4 className="font-semibold text-slate-900">
                                    {prop.title || 'Sem título'}
                                  </h4>
                                  {prop.property_type && (
                                    <Badge className="mt-1 text-xs">{prop.property_type}</Badge>
                                  )}
                                </div>
                              </div>
                              <Badge variant={prop.price ? "default" : "outline"} className="ml-2">
                                {prop.price ? `€${prop.price.toLocaleString()}` : 'Sem preço'}
                              </Badge>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-sm">
                              {prop.address && (
                                <div className="flex items-center gap-2 text-slate-700">
                                  <MapPin className="w-3 h-3 text-slate-500" />
                                  <span className="truncate">{prop.address}</span>
                                </div>
                              )}
                              {prop.city && (
                                <div className="flex items-center gap-2 text-slate-700">
                                  <Home className="w-3 h-3 text-slate-500" />
                                  <span>{prop.city}</span>
                                </div>
                              )}
                              {prop.bedrooms && (
                                <div className="flex items-center gap-2 text-slate-700">
                                  <Bed className="w-3 h-3 text-slate-500" />
                                  {prop.bedrooms} quartos
                                </div>
                              )}
                              {prop.bathrooms && (
                                <div className="flex items-center gap-2 text-slate-700">
                                  <Bath className="w-3 h-3 text-slate-500" />
                                  {prop.bathrooms} WCs
                                </div>
                              )}
                              {prop.gross_area && (
                                <div className="flex items-center gap-2 text-slate-700">
                                  <Maximize className="w-3 h-3 text-slate-500" />
                                  {prop.gross_area}m²
                                </div>
                              )}
                              {prop.energy_certificate && (
                                <div className="flex items-center gap-2 text-slate-700">
                                  <span className="text-xs">⚡ Cert. {prop.energy_certificate}</span>
                                </div>
                              )}
                            </div>

                            {prop.description && (
                              <p className="text-xs text-slate-600 mt-2 line-clamp-2 italic">
                                {prop.description}
                              </p>
                            )}

                            {prop.owner_name && (
                              <div className="mt-2 pt-2 border-t">
                                <p className="text-xs text-slate-500">
                                  Proprietário: <strong>{prop.owner_name}</strong>
                                  {prop.owner_nif && ` (NIF: ${prop.owner_nif})`}
                                </p>
                              </div>
                            )}

                            {prop.amenities && prop.amenities.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {prop.amenities.slice(0, 5).map((amenity, i) => (
                                  <Badge key={i} variant="outline" className="text-xs">
                                    {amenity}
                                  </Badge>
                                ))}
                                {prop.amenities.length > 5 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{prop.amenities.length - 5}
                                  </Badge>
                                )}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="contacts" className="mt-4">
                <ScrollArea className="h-[500px]">
                  {!ocrResult.contacts || ocrResult.contacts.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      <User className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      Nenhum contacto encontrado
                    </div>
                  ) : (
                    <div className="space-y-3 pr-4">
                      {ocrResult.contacts.map((contact, idx) => (
                        <Card key={idx} className={`border-2 ${selectedContacts.includes(idx) ? 'border-green-400 bg-green-50' : 'border-slate-200'}`}>
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <Checkbox
                                checked={selectedContacts.includes(idx)}
                                onCheckedChange={() => toggleContactSelection(idx)}
                              />
                              <div className="flex-1">
                                <h4 className="font-semibold text-slate-900">
                                  {contact.full_name || 'Sem nome'}
                                </h4>
                                {contact.role && (
                                  <Badge className="mt-1 text-xs capitalize">{contact.role}</Badge>
                                )}
                                
                                <div className="space-y-1 mt-2 text-sm">
                                  {contact.email && (
                                    <div className="flex items-center gap-2 text-slate-700">
                                      <Mail className="w-3 h-3 text-slate-500" />
                                      {contact.email}
                                    </div>
                                  )}
                                  {contact.phone && (
                                    <div className="flex items-center gap-2 text-slate-700">
                                      <Phone className="w-3 h-3 text-slate-500" />
                                      {contact.phone}
                                    </div>
                                  )}
                                  {contact.company_name && (
                                    <div className="flex items-center gap-2 text-slate-700">
                                      <Briefcase className="w-3 h-3 text-slate-500" />
                                      {contact.company_name}
                                    </div>
                                  )}
                                  {contact.nif && (
                                    <div className="text-xs text-slate-600">
                                      NIF: {contact.nif}
                                    </div>
                                  )}
                                  {contact.address && (
                                    <div className="flex items-center gap-2 text-slate-600 text-xs">
                                      <MapPin className="w-3 h-3" />
                                      {contact.address}
                                    </div>
                                  )}
                                </div>

                                {contact.notes && (
                                  <p className="text-xs text-slate-500 mt-2 italic">
                                    {contact.notes}
                                  </p>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="dates" className="mt-4">
                <ScrollArea className="h-[500px]">
                  {!ocrResult.important_dates || ocrResult.important_dates.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      Nenhuma data importante encontrada
                    </div>
                  ) : (
                    <div className="space-y-2 pr-4">
                      {ocrResult.important_dates.map((dateInfo, idx) => (
                        <div key={idx} className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                          <div className="flex items-start gap-2">
                            <Calendar className="w-4 h-4 text-amber-600 mt-0.5" />
                            <div>
                              <p className="font-semibold text-amber-900">{dateInfo.date}</p>
                              <p className="text-sm text-amber-700">{dateInfo.description}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      {/* Instructions Card */}
      {!ocrResult && (
        <Card className="h-fit bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
          <CardHeader>
            <CardTitle className="text-lg">Como Funciona</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0">
                1
              </div>
              <p className="text-slate-700">
                <strong>Carregue um PDF</strong> de angariação, avaliação, proposta ou contrato
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0">
                2
              </div>
              <p className="text-slate-700">
                <strong>A IA processa</strong> e extrai automaticamente dados de imóveis e contactos
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0">
                3
              </div>
              <p className="text-slate-700">
                <strong>Reveja os dados</strong> extraídos e selecione o que deseja aplicar
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0">
                4
              </div>
              <p className="text-slate-700">
                <strong>Clique "Aplicar"</strong> para criar imóveis e contactos no sistema
              </p>
            </div>

            <div className="mt-4 p-3 bg-white rounded-lg border border-purple-200">
              <p className="text-xs font-semibold text-purple-900 mb-2">✨ Capacidades IA</p>
              <ul className="text-xs text-slate-600 space-y-1">
                <li>• Extrai moradas, preços, áreas, quartos</li>
                <li>• Identifica proprietários e mediadores</li>
                <li>• Deteta datas importantes (escrituras, visitas)</li>
                <li>• Reconhece características e comodidades</li>
                <li>• Processa múltiplos imóveis num documento</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contract Data Dialog */}
      <ContractDataReviewDialog
        open={contractDataDialogOpen}
        onOpenChange={setContractDataDialogOpen}
        contractData={extractedContractData}
        fileUrl={fileUrl}
        onSave={(data) => saveContractMutation.mutate(data)}
        isSaving={saveContractMutation.isPending}
      />

      {/* Deal Data Dialog */}
      <DealDataReviewDialog
        open={dealDataDialogOpen}
        onOpenChange={setDealDataDialogOpen}
        dealData={extractedDealData}
        fileUrl={fileUrl}
        onSave={(data) => saveDealMutation.mutate(data)}
        isSaving={saveDealMutation.isPending}
      />
    </div>
  );
}

// Contract Data Review Dialog Component
function ContractDataReviewDialog({ open, onOpenChange, contractData, fileUrl, onSave, isSaving }) {
  const [formData, setFormData] = useState({});

  React.useEffect(() => {
    if (contractData && open) {
      setFormData({
        contract_type: contractData.contract_type || "sale",
        property_title: contractData.property_title || "",
        property_address: contractData.property_address || "",
        contract_value: contractData.contract_value || "",
        monthly_value: contractData.monthly_value || "",
        party_a_name: contractData.party_a_name || "",
        party_a_email: contractData.party_a_email || "",
        party_a_phone: contractData.party_a_phone || "",
        party_a_nif: contractData.party_a_nif || "",
        party_b_name: contractData.party_b_name || "",
        party_b_email: contractData.party_b_email || "",
        party_b_phone: contractData.party_b_phone || "",
        party_b_nif: contractData.party_b_nif || "",
        signature_date: contractData.signature_date || "",
        deed_date: contractData.deed_date || "",
        start_date: contractData.start_date || "",
        end_date: contractData.end_date || "",
        deposit_amount: contractData.deposit_amount || "",
        commission_amount: contractData.commission_amount || "",
        notes: contractData.notes || "",
        status: "draft",
        documents: fileUrl ? [{
          name: "Documento OCR",
          url: fileUrl,
          upload_date: new Date().toISOString(),
          type: "contract"
        }] : []
      });
    }
  }, [contractData, fileUrl, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      contract_value: formData.contract_value ? Number(formData.contract_value) : 0,
      monthly_value: formData.monthly_value ? Number(formData.monthly_value) : undefined,
      deposit_amount: formData.deposit_amount ? Number(formData.deposit_amount) : undefined,
      commission_amount: formData.commission_amount ? Number(formData.commission_amount) : undefined
    };
    onSave(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSignature className="w-5 h-5 text-blue-600" />
            Rever e Criar Contrato
          </DialogTitle>
          <p className="text-sm text-slate-600">Reveja os dados extraídos e ajuste conforme necessário</p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Tipo de Contrato *</Label>
              <select
                value={formData.contract_type}
                onChange={(e) => setFormData({...formData, contract_type: e.target.value})}
                className="w-full h-10 px-3 rounded-md border border-slate-200"
                required
              >
                <option value="sale">Venda</option>
                <option value="purchase">Compra</option>
                <option value="lease">Arrendamento</option>
              </select>
            </div>
            <div>
              <Label>Valor do Contrato (€) *</Label>
              <Input
                type="number"
                required
                value={formData.contract_value}
                onChange={(e) => setFormData({...formData, contract_value: e.target.value})}
              />
            </div>
          </div>

          <div>
            <Label>Imóvel *</Label>
            <Input
              required
              value={formData.property_title}
              onChange={(e) => setFormData({...formData, property_title: e.target.value})}
              placeholder="Título do imóvel"
            />
          </div>

          <div>
            <Label>Morada do Imóvel</Label>
            <Input
              value={formData.property_address}
              onChange={(e) => setFormData({...formData, property_address: e.target.value})}
              placeholder="Morada completa"
            />
          </div>

          {/* Party A */}
          <div className="border-t pt-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <User className="w-4 h-4 text-blue-600" />
              Parte A (Vendedor/Senhorio)
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Nome Completo *</Label>
                <Input
                  required
                  value={formData.party_a_name}
                  onChange={(e) => setFormData({...formData, party_a_name: e.target.value})}
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.party_a_email}
                  onChange={(e) => setFormData({...formData, party_a_email: e.target.value})}
                />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input
                  value={formData.party_a_phone}
                  onChange={(e) => setFormData({...formData, party_a_phone: e.target.value})}
                />
              </div>
              <div>
                <Label>NIF</Label>
                <Input
                  value={formData.party_a_nif}
                  onChange={(e) => setFormData({...formData, party_a_nif: e.target.value})}
                />
              </div>
            </div>
          </div>

          {/* Party B */}
          <div className="border-t pt-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <User className="w-4 h-4 text-green-600" />
              Parte B (Comprador/Inquilino)
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Nome Completo *</Label>
                <Input
                  required
                  value={formData.party_b_name}
                  onChange={(e) => setFormData({...formData, party_b_name: e.target.value})}
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.party_b_email}
                  onChange={(e) => setFormData({...formData, party_b_email: e.target.value})}
                />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input
                  value={formData.party_b_phone}
                  onChange={(e) => setFormData({...formData, party_b_phone: e.target.value})}
                />
              </div>
              <div>
                <Label>NIF</Label>
                <Input
                  value={formData.party_b_nif}
                  onChange={(e) => setFormData({...formData, party_b_nif: e.target.value})}
                />
              </div>
            </div>
          </div>

          {/* Financial Details */}
          <div className="border-t pt-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Euro className="w-4 h-4 text-green-600" />
              Valores
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              {formData.contract_type === 'lease' && (
                <div>
                  <Label>Valor Mensal (€)</Label>
                  <Input
                    type="number"
                    value={formData.monthly_value}
                    onChange={(e) => setFormData({...formData, monthly_value: e.target.value})}
                  />
                </div>
              )}
              <div>
                <Label>Caução/Sinal (€)</Label>
                <Input
                  type="number"
                  value={formData.deposit_amount}
                  onChange={(e) => setFormData({...formData, deposit_amount: e.target.value})}
                />
              </div>
              <div>
                <Label>Comissão (€)</Label>
                <Input
                  type="number"
                  value={formData.commission_amount}
                  onChange={(e) => setFormData({...formData, commission_amount: e.target.value})}
                />
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="border-t pt-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-purple-600" />
              Datas Importantes
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Data de Assinatura</Label>
                <Input
                  type="date"
                  value={formData.signature_date}
                  onChange={(e) => setFormData({...formData, signature_date: e.target.value})}
                />
              </div>
              {formData.contract_type !== 'lease' && (
                <div>
                  <Label>Data de Escritura</Label>
                  <Input
                    type="date"
                    value={formData.deed_date}
                    onChange={(e) => setFormData({...formData, deed_date: e.target.value})}
                  />
                </div>
              )}
              <div>
                <Label>Data de Início</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                />
              </div>
              {formData.contract_type === 'lease' && (
                <div>
                  <Label>Data de Fim</Label>
                  <Input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label>Notas</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              rows={3}
              placeholder="Observações adicionais..."
            />
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving} className="flex-1 bg-blue-600 hover:bg-blue-700">
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  A criar...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Criar Contrato
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Deal Data Review Dialog Component
function DealDataReviewDialog({ open, onOpenChange, dealData, fileUrl, onSave, isSaving }) {
  const [formData, setFormData] = useState({});

  React.useEffect(() => {
    if (dealData && open) {
      setFormData({
        deal_name: dealData.deal_name || `${dealData.contract_type === 'sale' ? 'Venda' : dealData.contract_type === 'purchase' ? 'Compra' : 'Arrendamento'} - ${dealData.property_title || 'Imóvel'}`,
        property_title: dealData.property_title || "",
        property_address: dealData.property_address || "",
        deal_type: dealData.contract_type || "sale",
        deal_value: dealData.contract_value || "",
        buyer_name: dealData.party_b_name || "",
        buyer_nif: dealData.party_b_nif || "",
        seller_name: dealData.party_a_name || "",
        seller_nif: dealData.party_a_nif || "",
        status: "in_progress",
        completion_date: dealData.deed_date || dealData.signature_date || "",
        notes: dealData.notes || "",
        documents: fileUrl ? [{
          name: "Documento OCR",
          category: dealData.document_type === 'cpcv' ? 'cpcv' : dealData.document_type === 'escritura' ? 'escritura' : 'other',
          url: fileUrl,
          upload_date: new Date().toISOString()
        }] : []
      });
    }
  }, [dealData, fileUrl, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      deal_value: formData.deal_value ? Number(formData.deal_value) : 0
    };
    onSave(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-purple-600" />
            Rever e Criar Negócio
          </DialogTitle>
          <p className="text-sm text-slate-600">Reveja os dados extraídos e ajuste conforme necessário</p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Nome do Negócio *</Label>
              <Input
                required
                value={formData.deal_name}
                onChange={(e) => setFormData({...formData, deal_name: e.target.value})}
                placeholder="Ex: Venda T3 Lisboa"
              />
            </div>
            <div>
              <Label>Tipo de Negócio *</Label>
              <select
                value={formData.deal_type}
                onChange={(e) => setFormData({...formData, deal_type: e.target.value})}
                className="w-full h-10 px-3 rounded-md border border-slate-200"
                required
              >
                <option value="sale">Venda</option>
                <option value="purchase">Compra</option>
                <option value="lease">Arrendamento</option>
              </select>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Imóvel</Label>
              <Input
                value={formData.property_title}
                onChange={(e) => setFormData({...formData, property_title: e.target.value})}
                placeholder="Título do imóvel"
              />
            </div>
            <div>
              <Label>Valor do Negócio (€)</Label>
              <Input
                type="number"
                value={formData.deal_value}
                onChange={(e) => setFormData({...formData, deal_value: e.target.value})}
              />
            </div>
          </div>

          <div>
            <Label>Morada do Imóvel</Label>
            <Input
              value={formData.property_address}
              onChange={(e) => setFormData({...formData, property_address: e.target.value})}
            />
          </div>

          {/* Buyer Info */}
          <div className="border-t pt-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <User className="w-4 h-4 text-green-600" />
              Comprador/Inquilino
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Nome Completo</Label>
                <Input
                  value={formData.buyer_name}
                  onChange={(e) => setFormData({...formData, buyer_name: e.target.value})}
                />
              </div>
              <div>
                <Label>NIF</Label>
                <Input
                  value={formData.buyer_nif}
                  onChange={(e) => setFormData({...formData, buyer_nif: e.target.value})}
                />
              </div>
            </div>
          </div>

          {/* Seller Info */}
          <div className="border-t pt-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <User className="w-4 h-4 text-blue-600" />
              Vendedor/Senhorio
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Nome Completo</Label>
                <Input
                  value={formData.seller_name}
                  onChange={(e) => setFormData({...formData, seller_name: e.target.value})}
                />
              </div>
              <div>
                <Label>NIF</Label>
                <Input
                  value={formData.seller_nif}
                  onChange={(e) => setFormData({...formData, seller_nif: e.target.value})}
                />
              </div>
            </div>
          </div>

          {/* Completion Date */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Data de Conclusão</Label>
              <Input
                type="date"
                value={formData.completion_date}
                onChange={(e) => setFormData({...formData, completion_date: e.target.value})}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label>Notas</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              rows={3}
              placeholder="Observações adicionais..."
            />
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving} className="flex-1 bg-purple-600 hover:bg-purple-700">
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  A criar...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Criar Negócio
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}