import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  FileText, Calendar, DollarSign, User, Phone, Mail, 
  CreditCard, Edit, Download, ExternalLink
} from "lucide-react";

export default function ContractDetailsDialog({ contract, open, onOpenChange, onEdit, onStatusChange }) {
  if (!contract) return null;

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Detalhes do Contrato</DialogTitle>
            <Button variant="outline" size="sm" onClick={() => onEdit(contract)}>
              <Edit className="w-4 h-4 mr-2" />
              Editar
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Header */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">{contract.property_title}</h2>
                  <p className="text-slate-600">{contract.property_address}</p>
                </div>
                <div className="text-right">
                  <Badge className={`mb-2 ${statusColors[contract.status]}`}>
                    {statusLabels[contract.status]}
                  </Badge>
                  <div>
                    <Badge variant="outline">{typeLabels[contract.contract_type]}</Badge>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-3xl font-bold text-slate-900">
                <DollarSign className="w-8 h-8" />
                €{contract.contract_value?.toLocaleString()}
              </div>
              {contract.monthly_value && (
                <p className="text-slate-600 mt-1">Mensal: €{contract.monthly_value?.toLocaleString()}</p>
              )}
            </CardContent>
          </Card>

          {/* Parties */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-lg mb-4 text-slate-900">
                  Parte A (Vendedor/Senhorio)
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-500" />
                    <span className="font-medium">{contract.party_a_name}</span>
                  </div>
                  {contract.party_a_email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-slate-500" />
                      <a href={`mailto:${contract.party_a_email}`} className="text-blue-600 hover:underline">
                        {contract.party_a_email}
                      </a>
                    </div>
                  )}
                  {contract.party_a_phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-slate-500" />
                      <span>{contract.party_a_phone}</span>
                    </div>
                  )}
                  {contract.party_a_nif && (
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-slate-500" />
                      <span>NIF: {contract.party_a_nif}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-lg mb-4 text-slate-900">
                  Parte B (Comprador/Inquilino)
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-500" />
                    <span className="font-medium">{contract.party_b_name}</span>
                  </div>
                  {contract.party_b_email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-slate-500" />
                      <a href={`mailto:${contract.party_b_email}`} className="text-blue-600 hover:underline">
                        {contract.party_b_email}
                      </a>
                    </div>
                  )}
                  {contract.party_b_phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-slate-500" />
                      <span>{contract.party_b_phone}</span>
                    </div>
                  )}
                  {contract.party_b_nif && (
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-slate-500" />
                      <span>NIF: {contract.party_b_nif}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Financial Details */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold text-lg mb-4 text-slate-900">Detalhes Financeiros</h3>
              <div className="grid md:grid-cols-2 gap-4">
                {contract.deposit_amount > 0 && (
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Caução/Sinal</p>
                    <p className="text-lg font-bold text-slate-900">€{contract.deposit_amount?.toLocaleString()}</p>
                  </div>
                )}
                {contract.commission_amount > 0 && (
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Comissão</p>
                    <p className="text-lg font-bold text-slate-900">€{contract.commission_amount?.toLocaleString()}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Dates */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold text-lg mb-4 text-slate-900">Datas Importantes</h3>
              <div className="grid md:grid-cols-2 gap-4">
                {contract.signature_date && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-500" />
                    <div>
                      <p className="text-sm text-slate-600">Assinatura</p>
                      <p className="font-medium">{new Date(contract.signature_date).toLocaleDateString('pt-PT')}</p>
                    </div>
                  </div>
                )}
                {contract.deed_date && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-500" />
                    <div>
                      <p className="text-sm text-slate-600">Escritura</p>
                      <p className="font-medium">{new Date(contract.deed_date).toLocaleDateString('pt-PT')}</p>
                    </div>
                  </div>
                )}
                {contract.start_date && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-500" />
                    <div>
                      <p className="text-sm text-slate-600">Início</p>
                      <p className="font-medium">{new Date(contract.start_date).toLocaleDateString('pt-PT')}</p>
                    </div>
                  </div>
                )}
                {contract.end_date && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-500" />
                    <div>
                      <p className="text-sm text-slate-600">Fim</p>
                      <p className="font-medium">{new Date(contract.end_date).toLocaleDateString('pt-PT')}</p>
                    </div>
                  </div>
                )}
                {contract.renewal_date && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-500" />
                    <div>
                      <p className="text-sm text-slate-600">Renovação</p>
                      <p className="font-medium">{new Date(contract.renewal_date).toLocaleDateString('pt-PT')}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Documents */}
          {contract.documents?.length > 0 && (
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-lg mb-4 text-slate-900">Documentos</h3>
                <div className="space-y-2">
                  {contract.documents.map((doc, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-600" />
                        <span className="font-medium">{doc.name}</span>
                      </div>
                      <a href={doc.url} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm">
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Abrir
                        </Button>
                      </a>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {contract.notes && (
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-lg mb-4 text-slate-900">Notas</h3>
                <p className="text-slate-700 whitespace-pre-line">{contract.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Status Actions */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold text-lg mb-4 text-slate-900">Alterar Estado</h3>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={contract.status === 'pending_signature' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onStatusChange(contract.id, 'pending_signature')}
                >
                  Pendente Assinatura
                </Button>
                <Button
                  variant={contract.status === 'active' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onStatusChange(contract.id, 'active')}
                >
                  Ativar
                </Button>
                <Button
                  variant={contract.status === 'completed' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onStatusChange(contract.id, 'completed')}
                >
                  Concluir
                </Button>
                <Button
                  variant={contract.status === 'cancelled' ? 'destructive' : 'outline'}
                  size="sm"
                  onClick={() => onStatusChange(contract.id, 'cancelled')}
                >
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}