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
      
      // Aguardar que todas as imagens carreguem
      const images = element.querySelectorAll('img');
      await Promise.all(
        Array.from(images).map(img => {
          if (img.complete) return Promise.resolve();
          return new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = resolve; // Continuar mesmo com erro
            setTimeout(resolve, 3000); // Timeout de 3s
          });
        })
      );

      // Aguardar um pouco mais para garantir renderização
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Capture the content com configurações otimizadas
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 1200,
        windowHeight: element.scrollHeight,
        imageTimeout: 15000,
        removeContainer: true,
        letterRendering: true,
        onclone: (clonedDoc) => {
          // Garantir que todos os estilos sejam aplicados no clone
          const clonedElement = clonedDoc.querySelector('[data-brochure="true"]');
          if (clonedElement) {
            clonedElement.style.width = '1200px';
          }
        }
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      // Add first page
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add additional pages if content is longer
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const fileName = `Brochura_${property.ref_id || property.id.slice(0,8)}_${property.city}.pdf`;
      pdf.save(fileName);
      
      toast.success("Brochura gerada com sucesso!");
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error("Erro ao gerar PDF", { description: error.message });
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
        <div ref={brochureRef} data-brochure="true" className="bg-white p-8" style={{ width: '1200px', maxWidth: '1200px' }}>
          <style>
            {`
              @page {
                margin: 0;
              }
              [data-brochure="true"] * {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
                letter-spacing: 0 !important;
                line-height: 1.5 !important;
              }
              [data-brochure="true"] h1, 
              [data-brochure="true"] h2, 
              [data-brochure="true"] h3 {
                margin-bottom: 0.5em !important;
                line-height: 1.3 !important;
              }
              [data-brochure="true"] p {
                margin-bottom: 0.75em !important;
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
          <div className="mb-8">
            <h1 style={{ fontSize: '36px', fontWeight: 'bold', color: '#0f172a', marginBottom: '16px', lineHeight: '1.2' }}>
              {propertyTypeLabels[property.property_type] || property.property_type}
              {property.bedrooms > 0 && ` T${property.bedrooms}`}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#2563eb' }}>
                €{property.price?.toLocaleString()}
              </div>
              {property.listing_type === 'rent' && (
                <span style={{ fontSize: '16px', color: '#64748b', padding: '4px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}>
                  por mês
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#475569', fontSize: '18px' }}>
              <MapPin className="w-5 h-5" />
              <span>
                {property.address && `${property.address}, `}
                {property.city}, {property.state}
              </span>
            </div>
          </div>

          {/* Key Features Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px', backgroundColor: '#f8fafc', padding: '24px', borderRadius: '12px' }}>
            {property.bedrooms && property.bedrooms > 0 && (
              <div style={{ textAlign: 'center' }}>
                <Bed style={{ width: '32px', height: '32px', color: '#2563eb', margin: '0 auto 8px' }} />
                <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a', marginBottom: '4px' }}>{property.bedrooms}</p>
                <p style={{ fontSize: '14px', color: '#475569' }}>Quartos</p>
              </div>
            )}
            {property.bathrooms && property.bathrooms > 0 && (
              <div style={{ textAlign: 'center' }}>
                <Bath style={{ width: '32px', height: '32px', color: '#2563eb', margin: '0 auto 8px' }} />
                <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a', marginBottom: '4px' }}>{property.bathrooms}</p>
                <p style={{ fontSize: '14px', color: '#475569' }}>WC</p>
              </div>
            )}
            {((property.useful_area && property.useful_area > 0) || (property.gross_area && property.gross_area > 0)) && (
              <div style={{ textAlign: 'center' }}>
                <Maximize style={{ width: '32px', height: '32px', color: '#2563eb', margin: '0 auto 8px' }} />
                <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a', marginBottom: '4px' }}>{property.useful_area || property.gross_area}</p>
                <p style={{ fontSize: '14px', color: '#475569' }}>m²</p>
              </div>
            )}
            {property.energy_certificate && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: '32px', height: '32px', backgroundColor: '#16a34a', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px', fontWeight: 'bold', fontSize: '14px' }}>
                  {property.energy_certificate}
                </div>
                <p style={{ fontSize: '14px', color: '#475569' }}>Cert. Energético</p>
              </div>
            )}
          </div>

          {/* Description */}
          {property.description && (
            <div style={{ marginBottom: '32px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Home className="w-6 h-6 text-blue-600" />
                Descrição
              </h2>
              <p style={{ color: '#334155', lineHeight: '1.75', whiteSpace: 'pre-wrap', fontSize: '15px' }}>
                {property.description}
              </p>
            </div>
          )}

          {/* Additional Details */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '32px' }}>
            <div>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#0f172a', marginBottom: '16px' }}>Características</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', color: '#334155', fontSize: '14px' }}>
                {property.year_built && property.year_built > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Ano de Construção:</span>
                    <span style={{ fontWeight: '600' }}>{property.year_built}</span>
                  </div>
                )}
                {property.garage && property.garage !== 'none' && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Garagem:</span>
                    <span style={{ fontWeight: '600' }}>{property.garage} lugar(es)</span>
                  </div>
                )}
                {property.sun_exposure && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Exposição Solar:</span>
                    <span style={{ fontWeight: '600', textTransform: 'capitalize' }}>{property.sun_exposure.replace(/_/g, '/')}</span>
                  </div>
                )}
                {property.gross_area && property.gross_area > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Área Bruta:</span>
                    <span style={{ fontWeight: '600' }}>{property.gross_area}m²</span>
                  </div>
                )}
                {property.useful_area && property.useful_area > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Área Útil:</span>
                    <span style={{ fontWeight: '600' }}>{property.useful_area}m²</span>
                  </div>
                )}
              </div>
            </div>

            {/* Amenities */}
            {property.amenities && property.amenities.length > 0 && (
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#0f172a', marginBottom: '16px' }}>Comodidades</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {property.amenities.slice(0, 10).map((amenity, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <CheckCircle2 className="w-4 h-4 text-green-600" style={{ flexShrink: 0 }} />
                      <span style={{ fontSize: '13px', color: '#334155' }}>{amenity}</span>
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
          <div style={{ background: 'linear-gradient(to right, #eff6ff, #eef2ff)', borderRadius: '12px', padding: '24px', marginBottom: '32px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#0f172a', marginBottom: '16px' }}>Informações de Contacto</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
              {(property.assigned_consultant_photo || consultant?.photo_url) && (
                <img 
                  src={property.assigned_consultant_photo || consultant?.photo_url}
                  alt="Consultor"
                  style={{ width: '96px', height: '96px', borderRadius: '50%', objectFit: 'cover', border: '4px solid white', boxShadow: '0 10px 15px rgba(0,0,0,0.1)' }}
                  crossOrigin="anonymous"
                />
              )}
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '18px', fontWeight: '600', color: '#0f172a', marginBottom: '12px' }}>
                  {property.assigned_consultant_name || consultant?.full_name || 'ZuGruppe'}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(property.assigned_consultant_phone || consultant?.phone) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#334155' }}>
                      <Phone className="w-5 h-5 text-blue-600" style={{ flexShrink: 0 }} />
                      <span style={{ fontWeight: '500', fontSize: '14px' }}>{property.assigned_consultant_phone || consultant?.phone}</span>
                    </div>
                  )}
                  {(property.assigned_consultant || consultant?.email) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#334155' }}>
                      <Mail className="w-5 h-5 text-blue-600" style={{ flexShrink: 0 }} />
                      <span style={{ fontWeight: '500', fontSize: '14px' }}>{property.assigned_consultant || consultant?.email}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ borderTop: '4px solid #2563eb', paddingTop: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <img 
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6915a593b6edd8435f5838bd/359538617_Zugruppe01.jpg"
                  alt="ZuGruppe Logo"
                  style={{ height: '48px' }}
                />
              </div>
              <div style={{ textAlign: 'right', fontSize: '13px', color: '#475569' }}>
                <p style={{ fontWeight: 'bold', color: '#0f172a', marginBottom: '4px' }}>IMPIC 11355 | Privileged Approach Unipessoal Lda</p>
                <p style={{ marginBottom: '2px' }}>📞 234 026 223 | ✉️ info@zugruppe.com</p>
                <p>🌐 www.zugruppe.com</p>
              </div>
            </div>
            <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '11px', color: '#94a3b8' }}>
              Brochura gerada em {new Date().toLocaleDateString('pt-PT')}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}