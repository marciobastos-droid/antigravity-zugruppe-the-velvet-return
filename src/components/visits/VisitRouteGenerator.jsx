import React, { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  MapPin, Calendar, Clock, User, Phone, Mail, Printer, 
  FileText, CheckSquare, Home, Bed, Bath, Maximize, Star,
  Navigation, Download, Send, Loader2, FileDown, Map as MapIcon, Route
} from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix Leaflet default icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom numbered markers
const createNumberedIcon = (number, isActive = false) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      background: ${isActive ? '#3b82f6' : '#ef4444'};
      border: 3px solid white;
      border-radius: 50%;
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      color: white;
      font-size: 16px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    ">${number}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18]
  });
};

// Map bounds component
function MapBounds({ properties }) {
  const map = useMap();
  
  React.useEffect(() => {
    if (properties.length > 0) {
      const validProperties = properties.filter(p => p.latitude && p.longitude);
      if (validProperties.length > 0) {
        const bounds = L.latLngBounds(
          validProperties.map(p => [p.latitude, p.longitude])
        );
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [properties, map]);
  
  return null;
}

export default function VisitRouteGenerator({ properties, opportunityId, open, onOpenChange }) {
  const printRef = useRef();
  const [visitDate, setVisitDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState("09:00");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [agentName, setAgentName] = useState("");
  const [notes, setNotes] = useState("");
  const [creating, setCreating] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [selectedPropertyIndex, setSelectedPropertyIndex] = useState(0);

  // Buscar dados da oportunidade se fornecido
  const { data: opportunity } = useQuery({
    queryKey: ['opportunity', opportunityId],
    queryFn: async () => {
      if (!opportunityId) return null;
      const opps = await base44.entities.Opportunity.filter({ id: opportunityId });
      return opps[0] || null;
    },
    enabled: !!opportunityId && open
  });

  // Preencher dados do cliente automaticamente da oportunidade
  React.useEffect(() => {
    if (opportunity && open) {
      setClientName(opportunity.buyer_name || "");
      setClientEmail(opportunity.buyer_email || "");
      setClientPhone(opportunity.buyer_phone || "");
    }
  }, [opportunity, open]);

  // Buscar dados do consultor do primeiro imóvel
  React.useEffect(() => {
    if (properties && properties.length > 0 && open) {
      const firstProperty = properties[0];
      if (firstProperty.assigned_consultant_name) {
        setAgentName(firstProperty.assigned_consultant_name);
      }
    }
  }, [properties, open]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    try {
      toast.info("A gerar PDF...");
      
      const element = printRef.current;
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      // Render entire content as single page
      const canvas = await html2canvas(element, {
        scale: 1.5,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 1200,
        windowHeight: element.scrollHeight
      });
      
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = pageWidth - 20;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Se altura exceder página, ajustar escala
      if (imgHeight > pageHeight - 20) {
        const scale = (pageHeight - 20) / imgHeight;
        const scaledWidth = imgWidth * scale;
        const scaledHeight = imgHeight * scale;
        pdf.addImage(imgData, 'PNG', 10, 10, scaledWidth, scaledHeight);
      } else {
        pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
      }
      
      const fileName = `Ficha_Visita_${properties[0]?.ref_id || 'Imoveis'}_${format(new Date(), 'yyyyMMdd')}.pdf`;
      pdf.save(fileName);
      
      toast.success("PDF gerado com sucesso!");
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error("Erro ao gerar PDF");
    }
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

  // Filter properties with valid coordinates
  const propertiesWithCoords = properties.filter(p => p.latitude && p.longitude);
  
  // Calculate route coordinates
  const routeCoordinates = propertiesWithCoords.map(p => [p.latitude, p.longitude]);

  // Calculate total distance (rough estimation)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const totalDistance = propertiesWithCoords.reduce((acc, prop, idx) => {
    if (idx === 0) return 0;
    const prev = propertiesWithCoords[idx - 1];
    return acc + calculateDistance(prev.latitude, prev.longitude, prop.latitude, prop.longitude);
  }, 0);

  const navigateToProperty = (index) => {
    const property = propertiesWithCoords[index];
    if (property && property.latitude && property.longitude) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${property.latitude},${property.longitude}`;
      window.open(url, '_blank');
    }
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
            <Button 
              onClick={() => setShowMap(!showMap)} 
              variant={showMap ? "default" : "outline"}
              className={showMap ? "flex-1 bg-blue-600 hover:bg-blue-700" : "flex-1"}
            >
              <MapIcon className="w-4 h-4 mr-2" />
              {showMap ? 'Ocultar' : 'Ver'} Mapa
            </Button>
            <Button onClick={handlePrint} variant="outline">
              <Printer className="w-4 h-4 mr-2" />
              Imprimir
            </Button>
            <Button onClick={handleDownloadPDF} variant="outline" className="bg-blue-50 hover:bg-blue-100 border-blue-300 text-blue-700">
              <Download className="w-4 h-4 mr-2" />
              PDF
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </div>

          {/* Interactive Map */}
          {showMap && propertiesWithCoords.length > 0 && (
            <Card className="mt-6 overflow-hidden">
              <CardContent className="p-0">
                <div className="h-[500px] relative">
                  <MapContainer
                    center={[propertiesWithCoords[0].latitude, propertiesWithCoords[0].longitude]}
                    zoom={12}
                    style={{ height: '100%', width: '100%' }}
                    key={propertiesWithCoords.map(p => p.id).join('-')}
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    />
                    
                    {/* Property Markers */}
                    {propertiesWithCoords.map((property, index) => (
                      <Marker
                        key={property.id}
                        position={[property.latitude, property.longitude]}
                        icon={createNumberedIcon(index + 1, index === selectedPropertyIndex)}
                      >
                        <Popup maxWidth={300}>
                          <div className="p-2">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge className="bg-blue-600 text-white">
                                Visita #{index + 1}
                              </Badge>
                              {property.featured && (
                                <Badge className="bg-amber-400 text-slate-900">
                                  <Star className="w-3 h-3 mr-1 fill-current" />
                                  Destaque
                                </Badge>
                              )}
                            </div>
                            <h4 className="font-bold text-slate-900 mb-1">
                              {propertyTypeLabels[property.property_type]} {property.bedrooms && `T${property.bedrooms}`}
                            </h4>
                            <p className="text-sm text-slate-600 mb-2">
                              {property.address}, {property.city}
                            </p>
                            <div className="text-sm font-bold text-blue-600 mb-3">
                              €{property.price?.toLocaleString()}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedPropertyIndex(index);
                                  navigateToProperty(index);
                                }}
                                className="flex-1 bg-green-600 hover:bg-green-700"
                              >
                                <Navigation className="w-3 h-3 mr-1" />
                                Navegar
                              </Button>
                              {index < propertiesWithCoords.length - 1 && (
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setSelectedPropertyIndex(index + 1);
                                  }}
                                  variant="outline"
                                  className="flex-1"
                                >
                                  Próximo
                                </Button>
                              )}
                            </div>
                          </div>
                        </Popup>
                      </Marker>
                    ))}

                    {/* Route Line */}
                    {routeCoordinates.length > 1 && (
                      <Polyline
                        positions={routeCoordinates}
                        color="#3b82f6"
                        weight={3}
                        opacity={0.7}
                        dashArray="10, 10"
                      />
                    )}

                    <MapBounds properties={propertiesWithCoords} />
                  </MapContainer>

                  {/* Map Overlay Stats */}
                  <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-3 z-[1000]">
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2 font-semibold text-slate-900">
                        <Route className="w-4 h-4 text-blue-600" />
                        Rota da Visita
                      </div>
                      <div className="text-slate-600">
                        <span className="font-medium">{propertiesWithCoords.length}</span> imóveis
                      </div>
                      {totalDistance > 0 && (
                        <div className="text-slate-600">
                          <span className="font-medium">{totalDistance.toFixed(1)} km</span> total
                        </div>
                      )}
                      <div className="text-slate-600">
                        ~{Math.ceil(propertiesWithCoords.length * 1.5)} horas
                      </div>
                    </div>
                  </div>

                  {/* Current Stop Indicator */}
                  <div className="absolute bottom-4 left-4 right-4 bg-white rounded-lg shadow-lg p-3 z-[1000]">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="text-xs text-slate-500 mb-1">Próxima Visita</div>
                        <div className="font-semibold text-slate-900">
                          #{selectedPropertyIndex + 1} - {propertiesWithCoords[selectedPropertyIndex]?.title || propertiesWithCoords[selectedPropertyIndex]?.address}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => navigateToProperty(selectedPropertyIndex)}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Navigation className="w-4 h-4 mr-1" />
                        Ir
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {showMap && propertiesWithCoords.length === 0 && (
            <Card className="mt-6">
              <CardContent className="p-6 text-center">
                <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-600">
                  Nenhum imóvel com coordenadas GPS disponível para mostrar no mapa.
                </p>
              </CardContent>
            </Card>
          )}
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
            .print-checkbox {
              width: 14px;
              height: 14px;
              border: 2px solid #000;
              display: inline-block;
              margin-right: 8px;
              vertical-align: middle;
              flex-shrink: 0;
            }
            .signature-line {
              border-top: 2px solid #000;
              margin-top: 80px;
              padding-top: 10px;
            }
            @page {
              margin: 15mm 20mm;
              size: A4;
            }
            html, body {
              width: 210mm;
              height: 297mm;
            }
            .print-content {
              width: 100%;
              max-width: none;
              font-size: 12px;
              line-height: 1.5;
            }
            h1 { 
              font-size: 22px !important; 
              line-height: 1.3 !important;
              margin-bottom: 10px !important;
            }
            h2 { 
              font-size: 17px !important; 
              line-height: 1.4 !important;
              margin-bottom: 6px !important;
            }
            h4 { 
              font-size: 14px !important; 
              line-height: 1.4 !important;
            }
            .text-xs { 
              font-size: 10px !important; 
              line-height: 1.4 !important;
            }
            .text-sm { 
              font-size: 11px !important; 
              line-height: 1.5 !important;
            }
            .space-y-0\.5 > * + * {
              margin-top: 0.25rem !important;
            }
            .space-y-1 > * + * {
              margin-top: 0.5rem !important;
            }
            .space-y-2 > * + * {
              margin-top: 0.75rem !important;
            }
            .gap-2 {
              gap: 0.5rem !important;
            }
            .gap-4 {
              gap: 1rem !important;
            }
            .gap-6 {
              gap: 1.5rem !important;
            }
            .p-8 {
              padding: 1.5rem !important;
            }
            .pb-4 {
              padding-bottom: 1rem !important;
            }
            .mb-2 {
              margin-bottom: 0.5rem !important;
            }
            .mb-3 {
              margin-bottom: 0.75rem !important;
            }
            .mt-2 {
              margin-top: 0.5rem !important;
            }
            .mt-4 {
              margin-top: 1rem !important;
            }
            .mt-24 {
              margin-top: 4rem !important;
            }
            .leading-relaxed {
              line-height: 1.7 !important;
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
              <div key={property.id} className={`no-break ${index > 0 ? 'page-break' : ''}`}>
                <Card className="border-2 border-slate-200">
                  <CardContent className="p-8 space-y-6">
                    {/* Property Header - Referência, Responsável, Oportunidade */}
                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <div>
                        <span className="font-semibold">Referência:</span> {property.ref_id || property.id.slice(0, 8).toUpperCase()}
                      </div>
                      <div className="text-center">
                        <span className="font-semibold">Responsável da visita:</span> {agentName || 'ZuGruppe'}
                      </div>
                      <div>
                        <span className="font-semibold">Oportunidade:</span> {opportunity?.ref_id || '-'}
                      </div>
                    </div>

                    {/* Property Details with Image */}
                    <div className="flex gap-4 pb-4 border-b-2 border-slate-200">
                     {/* Property Image */}
                     {property.images && property.images[0] && (
                       <div className="w-36 h-36 rounded-lg overflow-hidden border-2 border-slate-200 flex-shrink-0">
                         <img 
                           src={property.images[0]} 
                           alt={property.title}
                           className="w-full h-full object-cover"
                         />
                       </div>
                     )}

                     {/* Property Info */}
                     <div className="flex-1 min-w-0">
                       <div className="flex items-center gap-2 mb-2">
                         {property.featured && (
                           <Badge className="bg-amber-400 text-slate-900 text-xs">
                             <Star className="w-3 h-3 mr-1 fill-current" />
                             Destaque
                           </Badge>
                         )}
                       </div>
                       <h2 className="text-lg font-bold text-slate-900 mb-2 leading-tight">
                         {propertyTypeLabels[property.property_type] || property.property_type} {property.bedrooms && `T${property.bedrooms}`} {property.ref_id && `- ${property.ref_id}`}
                       </h2>
                       <div className="text-sm text-slate-700 space-y-1 leading-normal">
                         {property.address && <div className="break-words">{property.address}</div>}
                         <div className="break-words">{property.zip_code && `${property.zip_code}, `}{property.city}, {property.state}</div>
                         {property.latitude && property.longitude && (
                           <div className="text-xs text-slate-600 mt-1">
                             {property.latitude.toFixed(6)}° N {property.longitude.toFixed(6)}° W
                           </div>
                         )}
                       </div>
                       <div className="mt-3">
                         <Badge className="bg-blue-100 text-blue-800 font-bold text-sm px-3 py-1">
                           {property.listing_type === 'sale' ? 'Venda' : 'Arrendamento'} €{property.price?.toLocaleString()}
                         </Badge>
                       </div>
                     </div>

                     {/* Owner Info */}
                     <div className="text-right text-xs flex-shrink-0 w-48">
                       <div className="font-semibold text-slate-900 mb-2">Proprietário</div>
                       <div className="text-slate-700 space-y-1.5 leading-normal">
                         <div className="break-words"><span className="font-medium">Nome:</span> {property.owner_name || '-'}</div>
                         <div className="break-words"><span className="font-medium">Email:</span> {property.owner_email ? property.owner_email.replace(/(.{4}).*(@.*)/, '$1***$2') : '-'}</div>
                         <div className="break-words"><span className="font-medium">Tel:</span> {property.owner_phone ? property.owner_phone.replace(/(\d{3})(\d{3})(\d{3})/, '***$2***') : '-'}</div>
                       </div>
                     </div>
                    </div>

                    {/* Client Info */}
                    <div className="pb-4 border-b border-slate-200">
                      <div className="font-semibold text-slate-900 mb-3">Potencial cliente</div>
                      <div className="grid grid-cols-3 gap-4 text-sm text-slate-700 leading-normal">
                        <div className="break-words"><span className="font-medium">Nome:</span> {clientName || '_______________________'}</div>
                        <div className="break-words"><span className="font-medium">Email:</span> {clientEmail ? clientEmail.replace(/(.{5}).*(@.*)/, '$1***$2') : '_______________________'}</div>
                        <div className="break-words"><span className="font-medium">Telefone:</span> {clientPhone ? clientPhone.replace(/(\d{3})(\d{3})(\d{3})/, '***$2$3') : '_____________'}</div>
                      </div>
                    </div>

                    {/* Interest Assessment */}
                    <div className="pb-4 border-b border-slate-200">
                      <div className="font-semibold text-slate-900 mb-2">Interesse no imóvel</div>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="print-checkbox"></span>
                          <span>Muito Interessado</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="print-checkbox"></span>
                          <span>Interessado</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="print-checkbox"></span>
                          <span>Pouco Interessado</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="print-checkbox"></span>
                          <span>Não Interessado</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="print-checkbox"></span>
                          <span>Bom preço</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="print-checkbox"></span>
                          <span>Preço elevado</span>
                        </div>
                        <div className="flex items-center gap-2 col-span-2">
                          <span className="print-checkbox"></span>
                          <span>Vem fazer nova visita</span>
                        </div>
                      </div>
                    </div>

                    {/* Business Feedback */}
                    <div className="pb-4 border-b border-slate-200">
                      <div className="font-semibold text-slate-900 mb-2">Sobre o negócio</div>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="print-checkbox"></span>
                          <span>Dá feedback mais tarde</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="print-checkbox"></span>
                          <span>Está a ver outros imóveis</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="print-checkbox"></span>
                          <span>Não Gosta do Local</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="print-checkbox"></span>
                          <span>Não é opção</span>
                        </div>
                        <div className="flex items-center gap-2 col-span-2">
                          <span className="print-checkbox"></span>
                          <span>Apresentação de Proposta</span>
                        </div>
                      </div>
                    </div>

                    {/* Negative and Positive Points */}
                    <div className="grid grid-cols-2 gap-8 pb-4 border-b border-slate-200">
                      {/* Negative Points */}
                      <div>
                        <div className="font-semibold text-slate-900 mb-3">Pontos negativos</div>
                        <div className="space-y-2.5 text-sm">
                          <div className="flex items-start gap-2">
                            <span className="print-checkbox"></span>
                            <span className="leading-normal">Má condição/estado do imóvel</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="print-checkbox"></span>
                            <span className="leading-normal">Divisões Pequenas</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="print-checkbox"></span>
                            <span className="leading-normal">Não gosta da localização</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="print-checkbox"></span>
                            <span className="leading-normal">Necessidade de obras</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="print-checkbox"></span>
                            <span className="leading-normal">Ano de construção</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="print-checkbox"></span>
                            <span className="leading-normal">Preço Alto</span>
                          </div>
                          <div className="mt-3 border border-slate-300 rounded p-2" style={{ minHeight: "45px" }}></div>
                        </div>
                      </div>

                      {/* Positive Points */}
                      <div>
                        <div className="font-semibold text-slate-900 mb-3">Pontos positivos</div>
                        <div className="space-y-2.5 text-sm">
                          <div className="flex items-start gap-2">
                            <span className="print-checkbox"></span>
                            <span className="leading-normal">Boas áreas</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="print-checkbox"></span>
                            <span className="leading-normal">Boa localização</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="print-checkbox"></span>
                            <span className="leading-normal">Qualidade de construção</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="print-checkbox"></span>
                            <span className="leading-normal">Estado do imóvel</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="print-checkbox"></span>
                            <span className="leading-normal">Mobilado</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="print-checkbox"></span>
                            <span className="leading-normal">Cozinha equipada</span>
                          </div>
                          <div className="mt-3 border border-slate-300 rounded p-2" style={{ minHeight: "45px" }}></div>
                        </div>
                      </div>
                    </div>

                    {/* Observations */}
                    <div className="pb-6 border-b border-slate-200">
                      <div className="font-semibold text-slate-900 mb-3">Observações</div>
                      <div className="border border-slate-300 rounded-lg p-4" style={{ minHeight: "120px" }}></div>
                    </div>

                    {/* Terms and Conditions */}
                    <div className="pb-6 border-b border-slate-200">
                      <div className="font-semibold text-slate-900 mb-3 text-sm">Termos e Condições</div>
                      <div className="text-[11px] text-slate-700 leading-relaxed space-y-2">
                        <p>
                          O Potencial Comprador reconhece que realizou esta visita no âmbito de um contrato de mediação imobiliária entre a 
                          Privileged Approach Unipessoal Lda e o proprietário pelo que se compromete a comunicar à Privileged Approach 
                          Unipessoal Lda caso venha a adquirir o imóvel ou caso apresente o mesmo a terceiros que tenham interesse na sua 
                          aquisição. O Proprietário reconhece que as obrigações que assumiu através do contrato de mediação imobiliária 
                          celebrado com a Privileged Approach Unipessoal Lda serão efectivas caso venha a vender o imóvel ao potencial 
                          comprador e também a terceiro apresentado pelo potencial comprador, independentemente da data em que a venda seja 
                          concretizada. O Proprietário e o Potencial Comprador reconhecem que o incumprimento das obrigações ora assumidas 
                          implicará o dever de indemnizar a Privileged Approach Unipessoal Lda pelos prejuízos causados nos termos gerais da 
                          responsabilidade civil regulada nos artigos 483.º e seguintes do Código Civil.
                        </p>
                        <p className="font-medium mt-4">
                          Declaro que li, compreendi e aceito os Termos e Condições e a Política de Privacidade.
                        </p>
                      </div>
                    </div>

                    {/* Signatures */}
                    <div className="grid grid-cols-3 gap-12 mt-20 mb-6">
                      <div className="signature-line text-center text-sm font-semibold">
                        O(A) Cliente
                      </div>
                      <div className="signature-line text-center text-sm font-semibold">
                        O(A) Proprietário(a)
                      </div>
                      <div className="signature-line text-center text-sm font-semibold">
                        A Mediadora
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}

            {/* Footer */}
            <div className="mt-8 pt-4 border-t-2 border-blue-600 text-xs text-slate-600 no-break">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img 
                    src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6915a593b6edd8435f5838bd/359538617_Zugruppe01.jpg"
                    alt="ZuGruppe Logo"
                    className="h-8"
                  />
                </div>
                <div className="text-right">
                  <div className="font-semibold text-slate-900">AMI 11355 | Privileged Approach Unipessoal Lda</div>
                  <div>Contactos: Telefone: 234026223 (Chamada para rede fixa nacional) | Email: info@zugruppe.com | https://zugruppe.com</div>
                  <div>Morada: Praça Marquês de Pombal 2, 3800-166 Glória e Vera Cruz</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}