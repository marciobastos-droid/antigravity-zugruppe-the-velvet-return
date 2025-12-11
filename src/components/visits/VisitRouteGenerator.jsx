import React, { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  MapPin, Calendar, Clock, User, Phone, Mail, Printer, 
  FileText, CheckSquare, Home, Bed, Bath, Maximize, Star,
  Navigation, Download, Send, Loader2
} from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

export default function VisitRouteGenerator({ properties, open, onOpenChange }) {
  const printRef = useRef();
  const [visitDate, setVisitDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState("09:00");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [agentName, setAgentName] = useState("");
  const [notes, setNotes] = useState("");
  const [creating, setCreating] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleCreateAppointments = async () => {
    if (!clientName || !clientEmail) {
      toast.error("Preencha o nome e email do cliente");
      return;
    }

    setCreating(true);
    
    try {
      const user = await base44.auth.me();
      const appointmentDateTime = `${visitDate}T${startTime}:00`;
      let currentTime = new Date(appointmentDateTime);

      for (let i = 0; i < properties.length; i++) {
        const property = properties[i];
        
        const appointment = await base44.entities.Appointment.create({
          title: `Visita: ${property.title}`,
          property_id: property.id,
          property_title: property.title,
          property_address: `${property.address || ''}, ${property.city}`,
          client_name: clientName,
          client_email: clientEmail,
          client_phone: clientPhone,
          assigned_agent: user.email,
          appointment_date: currentTime.toISOString(),
          duration_minutes: 60,
          notes: notes,
          status: "scheduled"
        });

        // Send notifications
        await base44.functions.invoke('scheduleVisit', {
          appointmentId: appointment.id,
          clientEmail: clientEmail,
          clientPhone: clientPhone,
          agentEmail: user.email,
          propertyOwnerEmail: property.created_by,
          sendCalendarInvite: true
        });

        // Increment time for next visit (60min + 30min travel)
        currentTime = new Date(currentTime.getTime() + 90 * 60000);
      }

      toast.success(`${properties.length} visitas criadas e notificações enviadas!`);
    } catch (error) {
      console.error('Error creating appointments:', error);
      toast.error("Erro ao criar visitas");
    }
    
    setCreating(false);
  };

  const propertyTypeLabels = {
    apartment: "Apartamento",
    house: "Moradia",
    land: "Terreno",
    building: "Prédio",
    farm: "Quinta",
    store: "Loja",
    warehouse: "Armazém",
    office: "Escritório"
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto p-0">
        <div className="print:hidden p-6 border-b bg-white sticky top-0 z-10">
          <DialogHeader>
            <DialogTitle className="text-xl">Roteiro de Visita</DialogTitle>
            <p className="text-sm text-slate-600 mt-1">
              {properties.length} imóveis selecionados para visita
            </p>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div>
              <Label className="text-xs">Data da Visita</Label>
              <Input 
                type="date" 
                value={visitDate} 
                onChange={(e) => setVisitDate(e.target.value)}
                className="text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Hora de Início</Label>
              <Input 
                type="time" 
                value={startTime} 
                onChange={(e) => setStartTime(e.target.value)}
                className="text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Agente Responsável</Label>
              <Input 
                value={agentName} 
                onChange={(e) => setAgentName(e.target.value)}
                placeholder="Nome do agente"
                className="text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Nome do Cliente</Label>
              <Input 
                value={clientName} 
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Nome completo"
                className="text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Telefone</Label>
              <Input 
                value={clientPhone} 
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="+351 912 345 678"
                className="text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Email</Label>
              <Input 
                type="email"
                value={clientEmail} 
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="email@exemplo.com"
                className="text-sm"
              />
            </div>
          </div>

          <div className="mt-4">
            <Label className="text-xs">Notas Gerais</Label>
            <Textarea 
              value={notes} 
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observações sobre a visita..."
              rows={2}
              className="text-sm resize-none"
            />
          </div>

          <div className="flex gap-2 mt-6">
            <Button 
              onClick={handleCreateAppointments} 
              disabled={creating || !clientName || !clientEmail}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  A criar visitas...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Criar {properties.length} Visita(s) e Enviar
                </>
              )}
            </Button>
            <Button onClick={handlePrint} variant="outline" className="flex-1">
              <Printer className="w-4 h-4 mr-2" />
              Imprimir
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </div>
        </div>

        {/* Printable Content */}
        <div ref={printRef} className="p-6 sm:p-8 bg-white">
          <style>
            {`
              @media print {
                body * {
                  visibility: hidden;
                }
                .print-content, .print-content * {
                  visibility: visible;
                }
                .print-content {
                  position: absolute;
                  left: 0;
                  top: 0;
                  width: 100%;
                }
                .page-break {
                  page-break-before: always;
                }
                .no-break {
                  page-break-inside: avoid;
                }
              }
            `}
          </style>

          <div className="print-content">
            {/* Header */}
            <div className="border-b-4 border-slate-900 pb-4 mb-6 no-break">
              <h1 className="text-3xl font-bold text-slate-900 mb-2">Roteiro de Visita</h1>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-slate-700">
                    <Calendar className="w-4 h-4" />
                    <strong>Data:</strong> {new Date(visitDate).toLocaleDateString('pt-PT', { 
                      day: '2-digit', 
                      month: 'long', 
                      year: 'numeric' 
                    })}
                  </div>
                  <div className="flex items-center gap-2 text-slate-700">
                    <Clock className="w-4 h-4" />
                    <strong>Hora:</strong> {startTime}
                  </div>
                  {agentName && (
                    <div className="flex items-center gap-2 text-slate-700">
                      <User className="w-4 h-4" />
                      <strong>Agente:</strong> {agentName}
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  {clientName && (
                    <div className="flex items-center gap-2 text-slate-700">
                      <User className="w-4 h-4" />
                      <strong>Cliente:</strong> {clientName}
                    </div>
                  )}
                  {clientPhone && (
                    <div className="flex items-center gap-2 text-slate-700">
                      <Phone className="w-4 h-4" />
                      {clientPhone}
                    </div>
                  )}
                  {clientEmail && (
                    <div className="flex items-center gap-2 text-slate-700">
                      <Mail className="w-4 h-4" />
                      {clientEmail}
                    </div>
                  )}
                </div>
              </div>
              {notes && (
                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded text-sm">
                  <strong className="text-amber-900">Notas:</strong>
                  <p className="text-slate-700 mt-1 whitespace-pre-line">{notes}</p>
                </div>
              )}
            </div>

            {/* Property Cards */}
            {properties.map((property, index) => (
              <div key={property.id} className={`no-break mb-8 ${index > 0 ? 'page-break' : ''}`}>
                <Card className="border-2 border-slate-200">
                  <CardContent className="p-6">
                    {/* Property Header */}
                    <div className="flex items-start justify-between mb-4 pb-4 border-b-2 border-slate-200">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className="bg-slate-900 text-white font-bold text-base px-3 py-1">
                            #{index + 1}
                          </Badge>
                          {property.ref_id && (
                            <Badge variant="outline" className="font-mono text-xs">
                              {property.ref_id}
                            </Badge>
                          )}
                          {property.featured && (
                            <Badge className="bg-amber-400 text-slate-900">
                              <Star className="w-3 h-3 mr-1 fill-current" />
                              Destaque
                            </Badge>
                          )}
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-2">
                          {property.title}
                        </h2>
                        <div className="flex items-start gap-2 text-slate-600">
                          <MapPin className="w-5 h-5 mt-0.5 flex-shrink-0" />
                          <div>
                            {property.address && <div className="font-medium">{property.address}</div>}
                            <div>{property.city}, {property.state}</div>
                            {property.zip_code && <div className="text-sm">{property.zip_code}</div>}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-slate-900 mb-1">
                          €{property.price?.toLocaleString()}
                        </div>
                        <Badge className="bg-blue-100 text-blue-800">
                          {property.listing_type === 'sale' ? 'Venda' : 'Arrendamento'}
                        </Badge>
                      </div>
                    </div>

                    {/* Property Image */}
                    {property.images && property.images[0] && (
                      <div className="mb-4 rounded-lg overflow-hidden border-2 border-slate-200">
                        <img 
                          src={property.images[0]} 
                          alt={property.title}
                          className="w-full h-64 object-cover"
                        />
                      </div>
                    )}

                    {/* Property Features */}
                    <div className="grid grid-cols-4 gap-4 mb-4 p-4 bg-slate-50 rounded-lg">
                      <div className="text-center">
                        <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center mx-auto mb-2 shadow-sm">
                          <Bed className="w-6 h-6 text-slate-700" />
                        </div>
                        <div className="text-2xl font-bold text-slate-900">{property.bedrooms || 0}</div>
                        <div className="text-xs text-slate-600">Quartos</div>
                      </div>
                      <div className="text-center">
                        <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center mx-auto mb-2 shadow-sm">
                          <Bath className="w-6 h-6 text-slate-700" />
                        </div>
                        <div className="text-2xl font-bold text-slate-900">{property.bathrooms || 0}</div>
                        <div className="text-xs text-slate-600">WCs</div>
                      </div>
                      <div className="text-center">
                        <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center mx-auto mb-2 shadow-sm">
                          <Maximize className="w-6 h-6 text-slate-700" />
                        </div>
                        <div className="text-2xl font-bold text-slate-900">
                          {property.useful_area || property.square_feet || 0}
                        </div>
                        <div className="text-xs text-slate-600">m²</div>
                      </div>
                      <div className="text-center">
                        <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center mx-auto mb-2 shadow-sm">
                          <Home className="w-6 h-6 text-slate-700" />
                        </div>
                        <div className="text-lg font-bold text-slate-900">
                          {propertyTypeLabels[property.property_type] || property.property_type}
                        </div>
                        <div className="text-xs text-slate-600">Tipo</div>
                      </div>
                    </div>

                    {/* Description */}
                    {property.description && (
                      <div className="mb-4">
                        <h3 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          Descrição
                        </h3>
                        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                          {property.description}
                        </p>
                      </div>
                    )}

                    {/* Additional Details */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      {property.year_built && (
                        <div className="text-sm">
                          <span className="text-slate-600">Ano:</span>{" "}
                          <span className="font-semibold">{property.year_built}</span>
                        </div>
                      )}
                      {property.energy_certificate && (
                        <div className="text-sm">
                          <span className="text-slate-600">Cert. Energético:</span>{" "}
                          <Badge className="ml-1">{property.energy_certificate}</Badge>
                        </div>
                      )}
                      {property.garage && property.garage !== 'none' && (
                        <div className="text-sm">
                          <span className="text-slate-600">Garagem:</span>{" "}
                          <span className="font-semibold">{property.garage}</span>
                        </div>
                      )}
                      {property.sun_exposure && (
                        <div className="text-sm">
                          <span className="text-slate-600">Exposição Solar:</span>{" "}
                          <span className="font-semibold">{property.sun_exposure}</span>
                        </div>
                      )}
                    </div>

                    {/* Amenities */}
                    {property.amenities && property.amenities.length > 0 && (
                      <div className="mb-4">
                        <h3 className="font-semibold text-slate-900 mb-2 text-sm">Comodidades</h3>
                        <div className="flex flex-wrap gap-1">
                          {property.amenities.map((amenity, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {amenity}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Visit Notes Section */}
                    <div className="mt-6 pt-4 border-t-2 border-dashed border-slate-300">
                      <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                        <CheckSquare className="w-4 h-4" />
                        Notas da Visita
                      </h3>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <input type="checkbox" className="w-4 h-4" />
                          <span className="text-slate-600">Chaves recolhidas</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <input type="checkbox" className="w-4 h-4" />
                          <span className="text-slate-600">Cliente gostou do imóvel</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <input type="checkbox" className="w-4 h-4" />
                          <span className="text-slate-600">Agendar segunda visita</span>
                        </div>
                        <div className="mt-3 border border-slate-300 rounded-lg p-2" style={{ minHeight: "80px" }}>
                          <p className="text-xs text-slate-500 mb-1">Observações:</p>
                        </div>
                      </div>
                    </div>

                    {/* Contact Info if assigned */}
                    {(property.assigned_consultant_name || property.agent_name) && (
                      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-xs font-semibold text-blue-900 mb-1">
                          Contacto do Responsável
                        </p>
                        <p className="text-sm text-blue-800">
                          {property.assigned_consultant_name || property.agent_name}
                        </p>
                        {property.assigned_consultant_phone && (
                          <p className="text-sm text-blue-700">
                            {property.assigned_consultant_phone}
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ))}

            {/* Footer */}
            <div className="mt-8 pt-4 border-t-2 border-slate-200 text-center text-xs text-slate-500 no-break">
              <p>Roteiro gerado em {new Date().toLocaleDateString('pt-PT')} às {new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}</p>
              <p className="mt-1">Zugruppe - Soluções Imobiliárias</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}