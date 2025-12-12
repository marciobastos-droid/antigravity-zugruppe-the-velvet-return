import React, { useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { 
  FileDown, Loader2, Home, Bed, Bath, Maximize, MapPin, 
  Euro, Calendar, Mail, Phone, Share2, CheckCircle2
} from "lucide-react";
import { toast } from "sonner";

export default function PropertyBrochureGenerator({ property, open, onOpenChange }) {
  const brochureRef = useRef();
  const [generating, setGenerating] = useState(false);

  const { data: consultant } = useQuery({
    queryKey: ['consultant', property?.assigned_consultant],
    queryFn: async () => {
      if (!property?.assigned_consultant) return null;
      const agents = await base44.entities.Agent.filter({ email: property.assigned_consultant });
      return agents[0] || null;
    },
    enabled: !!property?.assigned_consultant && open
  });

  const generatePDF = async () => {
    setGenerating(true);
    try {
      const element = brochureRef.current;
      
      // Capture the content
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 1200
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      // Add first page
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add additional pages if content is longer
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const fileName = `Brochura_${property.ref_id || property.id.slice(0,8)}_${property.city}.pdf`;
      pdf.save(fileName);
      
      toast.success("Brochura gerada com sucesso!");
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error("Erro ao gerar PDF");
    }
    setGenerating(false);
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

  const energyCertLabels = {
    "A+": "A+", "A": "A", "B": "B", "B-": "B-",
    "C": "C", "D": "D", "E": "E", "F": "F",
    "isento": "Isento"
  };

  if (!property) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto p-0">
        <div className="sticky top-0 z-10 bg-white border-b p-4 flex items-center justify-between">
          <DialogTitle>Brochura do Imóvel</DialogTitle>
          <div className="flex gap-2">
            <Button
              onClick={generatePDF}
              disabled={generating}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  A gerar...
                </>
              ) : (
                <>
                  <FileDown className="w-4 h-4 mr-2" />
                  Descarregar PDF
                </>
              )}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </div>
        </div>

        {/* Brochure Content */}
        <div ref={brochureRef} className="bg-white p-8">
          <style>
            {`
              @page {
                margin: 0;
              }
            `}
          </style>

          {/* Header with Logo */}
          <div className="flex items-center justify-between mb-8 pb-6 border-b-4 border-blue-600">
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6915a593b6edd8435f5838bd/359538617_Zugruppe01.jpg"
              alt="ZuGruppe"
              className="h-16"
            />
            <div className="text-right">
              <Badge className="bg-blue-600 text-white text-lg px-4 py-2">
                {property.listing_type === 'sale' ? 'VENDA' : 'ARRENDAMENTO'}
              </Badge>
              {property.ref_id && (
                <p className="text-sm text-slate-500 mt-2">Ref: {property.ref_id}</p>
              )}
            </div>
          </div>

          {/* Main Image */}
          {property.images?.[0] && (
            <div className="mb-6 rounded-xl overflow-hidden shadow-2xl">
              <img 
                src={property.images[0]} 
                alt={property.title}
                className="w-full h-96 object-cover"
                crossOrigin="anonymous"
              />
            </div>
          )}

          {/* Title and Price */}
          <div className="mb-6">
            <h1 className="text-4xl font-bold text-slate-900 mb-3">
              {propertyTypeLabels[property.property_type] || property.property_type}
              {property.bedrooms > 0 && ` T${property.bedrooms}`}
            </h1>
            <div className="flex items-center gap-4 mb-2">
              <div className="text-3xl font-bold text-blue-600">
                €{property.price?.toLocaleString()}
              </div>
              {property.listing_type === 'rent' && (
                <Badge variant="outline" className="text-lg">por mês</Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <MapPin className="w-5 h-5" />
              <span className="text-lg">
                {property.address && `${property.address}, `}
                {property.city}, {property.state}
              </span>
            </div>
          </div>

          {/* Key Features Grid */}
          <div className="grid grid-cols-4 gap-4 mb-8 bg-slate-50 p-6 rounded-xl">
            {property.bedrooms && property.bedrooms > 0 && (
              <div className="text-center">
                <Bed className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-slate-900">{property.bedrooms}</p>
                <p className="text-sm text-slate-600">Quartos</p>
              </div>
            )}
            {property.bathrooms && property.bathrooms > 0 && (
              <div className="text-center">
                <Bath className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-slate-900">{property.bathrooms}</p>
                <p className="text-sm text-slate-600">WC</p>
              </div>
            )}
            {((property.useful_area && property.useful_area > 0) || (property.gross_area && property.gross_area > 0)) && (
              <div className="text-center">
                <Maximize className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-slate-900">{property.useful_area || property.gross_area}</p>
                <p className="text-sm text-slate-600">m²</p>
              </div>
            )}
            {property.energy_certificate && (
              <div className="text-center">
                <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center mx-auto mb-2 font-bold">
                  {property.energy_certificate}
                </div>
                <p className="text-sm text-slate-600">Cert. Energético</p>
              </div>
            )}
          </div>

          {/* Description */}
          {property.description && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Home className="w-6 h-6 text-blue-600" />
                Descrição
              </h2>
              <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                {property.description}
              </p>
            </div>
          )}

          {/* Additional Details */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="text-xl font-bold text-slate-900 mb-4">Características</h3>
              <div className="space-y-2 text-slate-700">
                {property.year_built && property.year_built > 0 && (
                  <div className="flex justify-between">
                    <span>Ano de Construção:</span>
                    <span className="font-semibold">{property.year_built}</span>
                  </div>
                )}
                {property.garage && property.garage !== 'none' && (
                  <div className="flex justify-between">
                    <span>Garagem:</span>
                    <span className="font-semibold">{property.garage} lugar(es)</span>
                  </div>
                )}
                {property.sun_exposure && (
                  <div className="flex justify-between">
                    <span>Exposição Solar:</span>
                    <span className="font-semibold capitalize">{property.sun_exposure.replace(/_/g, '/')}</span>
                  </div>
                )}
                {property.gross_area && property.gross_area > 0 && (
                  <div className="flex justify-between">
                    <span>Área Bruta:</span>
                    <span className="font-semibold">{property.gross_area}m²</span>
                  </div>
                )}
                {property.useful_area && property.useful_area > 0 && (
                  <div className="flex justify-between">
                    <span>Área Útil:</span>
                    <span className="font-semibold">{property.useful_area}m²</span>
                  </div>
                )}
              </div>
            </div>

            {/* Amenities */}
            {property.amenities && property.amenities.length > 0 && (
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-4">Comodidades</h3>
                <div className="grid grid-cols-2 gap-2">
                  {property.amenities.slice(0, 10).map((amenity, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-slate-700">{amenity}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Additional Images */}
          {property.images && property.images.length > 1 && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Galeria de Imagens</h2>
              <div className="grid grid-cols-3 gap-3">
                {property.images.slice(1, 7).map((img, idx) => (
                  <div key={idx} className="aspect-video rounded-lg overflow-hidden">
                    <img 
                      src={img} 
                      alt={`Imagem ${idx + 2}`}
                      className="w-full h-full object-cover"
                      crossOrigin="anonymous"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Consultant Info */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 mb-8">
            <h3 className="text-xl font-bold text-slate-900 mb-4">Informações de Contacto</h3>
            <div className="flex items-center gap-6">
              {(property.assigned_consultant_photo || consultant?.photo_url) && (
                <img 
                  src={property.assigned_consultant_photo || consultant?.photo_url}
                  alt="Consultor"
                  className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
                  crossOrigin="anonymous"
                />
              )}
              <div className="flex-1">
                <p className="text-lg font-semibold text-slate-900 mb-3">
                  {property.assigned_consultant_name || consultant?.full_name || 'ZuGruppe'}
                </p>
                <div className="space-y-2">
                  {(property.assigned_consultant_phone || consultant?.phone) && (
                    <div className="flex items-center gap-2 text-slate-700">
                      <Phone className="w-5 h-5 text-blue-600" />
                      <span className="font-medium">{property.assigned_consultant_phone || consultant?.phone}</span>
                    </div>
                  )}
                  {(property.assigned_consultant || consultant?.email) && (
                    <div className="flex items-center gap-2 text-slate-700">
                      <Mail className="w-5 h-5 text-blue-600" />
                      <span className="font-medium">{property.assigned_consultant || consultant?.email}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t-4 border-blue-600 pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <img 
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6915a593b6edd8435f5838bd/359538617_Zugruppe01.jpg"
                  alt="ZuGruppe Logo"
                  className="h-12"
                />
              </div>
              <div className="text-right text-sm text-slate-600">
                <p className="font-bold text-slate-900">IMPIC 11355 | Privileged Approach Unipessoal Lda</p>
                <p>📞 234 026 223 | ✉️ info@zugruppe.com</p>
                <p>🌐 www.zugruppe.com</p>
              </div>
            </div>
            <div className="text-center mt-4 text-xs text-slate-500">
              Brochura gerada em {new Date().toLocaleDateString('pt-PT')}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}