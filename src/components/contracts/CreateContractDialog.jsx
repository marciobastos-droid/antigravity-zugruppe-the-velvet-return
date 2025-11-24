import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Upload, X, FileText } from "lucide-react";

export default function CreateContractDialog({ open, onOpenChange, contract, properties }) {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    contract_type: "lease",
    property_id: "",
    property_title: "",
    property_address: "",
    status: "draft",
    contract_value: "",
    monthly_value: "",
    party_a_name: "",
    party_a_email: "",
    party_a_phone: "",
    party_a_nif: "",
    party_b_name: "",
    party_b_email: "",
    party_b_phone: "",
    party_b_nif: "",
    signature_date: "",
    deed_date: "",
    start_date: "",
    end_date: "",
    renewal_date: "",
    deposit_amount: "",
    commission_amount: "",
    documents: [],
    notes: "",
    assigned_agent: ""
  });

  useEffect(() => {
    if (contract) {
      setFormData({
        contract_type: contract.contract_type || "lease",
        property_id: contract.property_id || "",
        property_title: contract.property_title || "",
        property_address: contract.property_address || "",
        status: contract.status || "draft",
        contract_value: contract.contract_value || "",
        monthly_value: contract.monthly_value || "",
        party_a_name: contract.party_a_name || "",
        party_a_email: contract.party_a_email || "",
        party_a_phone: contract.party_a_phone || "",
        party_a_nif: contract.party_a_nif || "",
        party_b_name: contract.party_b_name || "",
        party_b_email: contract.party_b_email || "",
        party_b_phone: contract.party_b_phone || "",
        party_b_nif: contract.party_b_nif || "",
        signature_date: contract.signature_date || "",
        deed_date: contract.deed_date || "",
        start_date: contract.start_date || "",
        end_date: contract.end_date || "",
        renewal_date: contract.renewal_date || "",
        deposit_amount: contract.deposit_amount || "",
        commission_amount: contract.commission_amount || "",
        documents: contract.documents || [],
        notes: contract.notes || "",
        assigned_agent: contract.assigned_agent || ""
      });
    } else {
      setFormData({
        contract_type: "lease",
        property_id: "",
        property_title: "",
        property_address: "",
        status: "draft",
        contract_value: "",
        monthly_value: "",
        party_a_name: "",
        party_a_email: "",
        party_a_phone: "",
        party_a_nif: "",
        party_b_name: "",
        party_b_email: "",
        party_b_phone: "",
        party_b_nif: "",
        signature_date: "",
        deed_date: "",
        start_date: "",
        end_date: "",
        renewal_date: "",
        deposit_amount: "",
        commission_amount: "",
        documents: [],
        notes: "",
        assigned_agent: ""
      });
    }
  }, [contract]);

  const mutation = useMutation({
    mutationFn: async (data) => {
      if (contract) {
        return await base44.entities.Contract.update(contract.id, data);
      } else {
        return await base44.entities.Contract.create(data);
      }
    },
    onSuccess: () => {
      toast.success(contract ? "Contrato atualizado!" : "Contrato criado!");
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Erro ao guardar contrato");
    }
  });

  const handlePropertyChange = (propertyId) => {
    const property = properties.find(p => p.id === propertyId);
    if (property) {
      setFormData({
        ...formData,
        property_id: propertyId,
        property_title: property.title,
        property_address: `${property.address}, ${property.city}`
      });
    }
  };

  const handleDocumentUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    try {
      const uploadedDocs = [];
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        uploadedDocs.push({
          name: file.name,
          url: file_url,
          upload_date: new Date().toISOString()
        });
      }
      
      setFormData(prev => ({
        ...prev,
        documents: [...prev.documents, ...uploadedDocs]
      }));
      
      toast.success(`${files.length} documento(s) carregado(s)`);
    } catch (error) {
      toast.error("Erro ao carregar documentos");
    }
    setUploading(false);
  };

  const removeDocument = (index) => {
    setFormData(prev => ({
      ...prev,
      documents: prev.documents.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const data = {
      ...formData,
      contract_value: formData.contract_value ? Number(formData.contract_value) : 0,
      monthly_value: formData.monthly_value ? Number(formData.monthly_value) : undefined,
      deposit_amount: formData.deposit_amount ? Number(formData.deposit_amount) : undefined,
      commission_amount: formData.commission_amount ? Number(formData.commission_amount) : undefined,
    };

    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{contract ? "Editar Contrato" : "Novo Contrato"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Basic Info */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Tipo de Contrato *</Label>
              <Select value={formData.contract_type} onValueChange={(v) => setFormData({...formData, contract_type: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sale">Venda</SelectItem>
                  <SelectItem value="purchase">Compra</SelectItem>
                  <SelectItem value="lease">Arrendamento</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Estado</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Rascunho</SelectItem>
                  <SelectItem value="pending_signature">Pendente Assinatura</SelectItem>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="completed">Concluído</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2">
              <Label>Imóvel *</Label>
              <Select value={formData.property_id} onValueChange={handlePropertyChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o imóvel" />
                </SelectTrigger>
                <SelectContent>
                  {properties.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Party A */}
          <div className="border-t pt-4">
            <h3 className="font-semibold text-lg mb-3">Parte A (Vendedor/Senhorio)</h3>
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
            <h3 className="font-semibold text-lg mb-3">Parte B (Comprador/Inquilino)</h3>
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

          {/* Financial */}
          <div className="border-t pt-4">
            <h3 className="font-semibold text-lg mb-3">Valores</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Valor do Contrato (€) *</Label>
                <Input
                  type="number"
                  required
                  value={formData.contract_value}
                  onChange={(e) => setFormData({...formData, contract_value: e.target.value})}
                />
              </div>
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
            <h3 className="font-semibold text-lg mb-3">Datas Importantes</h3>
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
                <>
                  <div>
                    <Label>Data de Fim</Label>
                    <Input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Data de Renovação</Label>
                    <Input
                      type="date"
                      value={formData.renewal_date}
                      onChange={(e) => setFormData({...formData, renewal_date: e.target.value})}
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Documents */}
          <div className="border-t pt-4">
            <h3 className="font-semibold text-lg mb-3">Documentos</h3>
            
            {formData.documents.length > 0 && (
              <div className="grid gap-2 mb-4">
                {formData.documents.map((doc, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-slate-600" />
                      <span className="text-sm font-medium">{doc.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <a href={doc.url} target="_blank" rel="noopener noreferrer">
                        <Button type="button" variant="ghost" size="sm">Ver</Button>
                      </a>
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeDocument(idx)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center">
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                multiple
                onChange={handleDocumentUpload}
                className="hidden"
                id="doc-upload"
                disabled={uploading}
              />
              <label htmlFor="doc-upload" className="cursor-pointer">
                {uploading ? (
                  <Loader2 className="w-10 h-10 text-slate-400 mx-auto mb-3 animate-spin" />
                ) : (
                  <Upload className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                )}
                <p className="text-slate-700 font-medium">
                  {uploading ? "A carregar..." : "Clique para carregar documentos"}
                </p>
                <p className="text-sm text-slate-500">PDF, DOC, DOCX</p>
              </label>
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label>Notas</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              rows={4}
              placeholder="Observações adicionais sobre o contrato..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending} className="flex-1 bg-slate-900 hover:bg-slate-800">
              {mutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  A guardar...
                </>
              ) : (
                contract ? "Atualizar" : "Criar Contrato"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}