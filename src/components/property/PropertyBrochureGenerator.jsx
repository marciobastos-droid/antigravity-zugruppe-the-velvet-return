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
          return new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
            setTimeout(resolve, 3000);
          });
        })
      );

      // Aguardar renderização completa - crítico para fontes
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Forçar reflow para garantir que estilos são aplicados
      element.offsetHeight;
      
      // Capture the content com configurações otimizadas
      const canvas = await html2canvas(element, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 1200,
        windowHeight: element.scrollHeight,
        imageTimeout: 15000,
        removeContainer: false,
        letterRendering: 1,
        foreignObjectRendering: false,
        onclone: (clonedDoc) => {
          const clonedElement = clonedDoc.querySelector('[data-brochure="true"]');
          if (clonedElement) {
            clonedElement.style.width = '1200px';
            clonedElement.style.fontFamily = 'Arial, Helvetica, sans-serif';
            clonedElement.style.letterSpacing = 'normal';
            clonedElement.style.wordSpacing = 'normal';
            
            // Aplicar estilos a todos os elementos de texto
            const textElements = clonedElement.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6');
            textElements.forEach(el => {
              el.style.fontFamily = 'Arial, Helvetica, sans-serif';
              el.style.letterSpacing = 'normal';
              el.style.wordSpacing = 'normal';
              el.style.whiteSpace = 'pre-wrap';
            });
          }
        }
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      // Adicionar margens para evitar corte
      const margin = 5; // 5mm de margem
      const imgWidth = pageWidth - (2 * margin);
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      // Add first page
      pdf.addImage(imgData, 'JPEG', margin, position + margin, imgWidth, imgHeight);
      heightLeft -= (pageHeight - 2 * margin);

      // Add additional pages if content is longer
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', margin, position + margin, imgWidth, imgHeight);
        heightLeft -= (pageHeight - 2 * margin);
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
        <div ref={brochureRef} data-brochure="true" className="bg-white" style={{ 
          width: '1200px', 
          maxWidth: '1200px',
          padding: '48px',
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontSize: '16px',
          lineHeight: '1.6',
          letterSpacing: 'normal',
          wordSpacing: 'normal'
        }}>
          <style>
            {`
              @page {
                margin: 0;
              }
              [data-brochure="true"] {
                font-family: Arial, Helvetica, sans-serif !important;
                -webkit-font-smoothing: antialiased !important;
                -moz-osx-font-smoothing: grayscale !important;
              }
              [data-brochure="true"] * {
                font-family: Arial, Helvetica, sans-serif !important;
                letter-spacing: normal !important;
                word-spacing: normal !important;
                line-height: 1.6 !important;
                box-sizing: border-box !important;
              }
              [data-brochure="true"] h1 {
                font-size: 36px !important;
                line-height: 1.3 !important;
                margin-bottom: 16px !important;
                font-weight: bold !important;
              }
              [data-brochure="true"] h2 {
                font-size: 24px !important;
                line-height: 1.4 !important;
                margin-bottom: 12px !important;
                font-weight: bold !important;
              }
              [data-brochure="true"] h3 {
                font-size: 20px !important;
                line-height: 1.4 !important;
                margin-bottom: 12px !important;
                font-weight: bold !important;
              }
              [data-brochure="true"] p,
              [data-brochure="true"] span,
              [data-brochure="true"] div {
                letter-spacing: 0.01em !important;
                word-spacing: 0.05em !important;
              }
            `}
          </style>

          {/* Header with Logo */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            marginBottom: '32px', 
            paddingBottom: '24px', 
            borderBottom: '4px solid #2563eb',
            pageBreakInside: 'avoid'
          }}>
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6915a593b6edd8435f5838bd/359538617_Zugruppe01.jpg"
              alt="ZuGruppe"
              style={{ height: '64px', maxWidth: '200px', objectFit: 'contain' }}
            />
            <div style={{ textAlign: 'right' }}>
              <span style={{ 
                backgroundColor: '#2563eb', 
                color: 'white', 
                fontSize: '18px', 
                padding: '8px 16px',
                borderRadius: '6px',
                fontFamily: 'Arial, Helvetica, sans-serif',
                fontWeight: 'bold',
                letterSpacing: 'normal'
              }}>
                {property.listing_type === 'sale' ? 'VENDA' : 'ARRENDAMENTO'}
              </span>
              {property.ref_id && (
                <p style={{ 
                  fontSize: '13px', 
                  color: '#64748b', 
                  marginTop: '8px',
                  fontFamily: 'Arial, Helvetica, sans-serif',
                  letterSpacing: 'normal'
                }}>Ref: {property.ref_id}</p>
              )}
            </div>
          </div>

          {/* Main Image */}
          {property.images?.[0] && (
            <div style={{ marginBottom: '24px', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
              <img 
                src={property.images[0]} 
                alt={property.title}
                style={{ 
                  width: '100%', 
                  height: 'auto',
                  maxHeight: '500px',
                  objectFit: 'contain',
                  backgroundColor: '#f8fafc'
                }}
                crossOrigin="anonymous"
              />
            </div>
          )}

          {/* Title and Price */}
          <div style={{ marginBottom: '32px' }}>
            <h1 style={{ 
              fontSize: '36px', 
              fontWeight: 'bold', 
              color: '#0f172a', 
              marginBottom: '16px', 
              lineHeight: '1.3',
              fontFamily: 'Arial, Helvetica, sans-serif',
              letterSpacing: 'normal',
              wordSpacing: 'normal'
            }}>
              {propertyTypeLabels[property.property_type] || property.property_type}
              {property.bedrooms > 0 && ` T${property.bedrooms}`}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
              <div style={{ 
                fontSize: '32px', 
                fontWeight: 'bold', 
                color: '#2563eb',
                fontFamily: 'Arial, Helvetica, sans-serif',
                letterSpacing: 'normal'
              }}>
                €{property.price?.toLocaleString()}
              </div>
              {property.listing_type === 'rent' && (
                <span style={{ 
                  fontSize: '16px', 
                  color: '#64748b', 
                  padding: '4px 12px', 
                  border: '1px solid #cbd5e1', 
                  borderRadius: '6px',
                  fontFamily: 'Arial, Helvetica, sans-serif',
                  letterSpacing: 'normal'
                }}>
                  por mês
                </span>
              )}
            </div>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              color: '#475569', 
              fontSize: '18px',
              fontFamily: 'Arial, Helvetica, sans-serif',
              letterSpacing: '0.01em',
              wordSpacing: '0.05em'
            }}>
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
              <h2 style={{ 
                fontSize: '24px', 
                fontWeight: 'bold', 
                color: '#0f172a', 
                marginBottom: '16px', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                fontFamily: 'Arial, Helvetica, sans-serif',
                letterSpacing: 'normal',
                wordSpacing: 'normal'
              }}>
                <Home className="w-6 h-6 text-blue-600" />
                Descrição
              </h2>
              <p style={{ 
                color: '#334155', 
                lineHeight: '1.75', 
                whiteSpace: 'pre-wrap', 
                fontSize: '15px',
                fontFamily: 'Arial, Helvetica, sans-serif',
                letterSpacing: '0.01em',
                wordSpacing: '0.05em',
                textAlign: 'justify'
              }}>
                {property.description}
              </p>
            </div>
          )}

          {/* Additional Details */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '32px' }}>
            <div>
              <h3 style={{ 
                fontSize: '20px', 
                fontWeight: 'bold', 
                color: '#0f172a', 
                marginBottom: '16px',
                fontFamily: 'Arial, Helvetica, sans-serif',
                letterSpacing: 'normal'
              }}>Características</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
                {property.year_built && property.year_built > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#334155', fontFamily: 'Arial, sans-serif', letterSpacing: '0.01em', wordSpacing: '0.05em' }}>
                    <span>Ano de Construção:</span>
                    <span style={{ fontWeight: '600' }}>{property.year_built}</span>
                  </div>
                )}
                {property.garage && property.garage !== 'none' && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#334155', fontFamily: 'Arial, sans-serif', letterSpacing: '0.01em', wordSpacing: '0.05em' }}>
                    <span>Garagem:</span>
                    <span style={{ fontWeight: '600' }}>{property.garage} lugar(es)</span>
                  </div>
                )}
                {property.sun_exposure && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#334155', fontFamily: 'Arial, sans-serif', letterSpacing: '0.01em', wordSpacing: '0.05em' }}>
                    <span>Exposição Solar:</span>
                    <span style={{ fontWeight: '600', textTransform: 'capitalize' }}>{property.sun_exposure.replace(/_/g, '/')}</span>
                  </div>
                )}
                {property.gross_area && property.gross_area > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#334155', fontFamily: 'Arial, sans-serif', letterSpacing: '0.01em', wordSpacing: '0.05em' }}>
                    <span>Área Bruta:</span>
                    <span style={{ fontWeight: '600' }}>{property.gross_area}m²</span>
                  </div>
                )}
                {property.useful_area && property.useful_area > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#334155', fontFamily: 'Arial, sans-serif', letterSpacing: '0.01em', wordSpacing: '0.05em' }}>
                    <span>Área Útil:</span>
                    <span style={{ fontWeight: '600' }}>{property.useful_area}m²</span>
                  </div>
                )}
              </div>
            </div>

            {/* Amenities */}
            {property.amenities && property.amenities.length > 0 && (
              <div>
                <h3 style={{ 
                  fontSize: '20px', 
                  fontWeight: 'bold', 
                  color: '#0f172a', 
                  marginBottom: '16px',
                  fontFamily: 'Arial, Helvetica, sans-serif',
                  letterSpacing: 'normal'
                }}>Comodidades</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {property.amenities.slice(0, 10).map((amenity, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <CheckCircle2 className="w-4 h-4 text-green-600" style={{ flexShrink: 0 }} />
                      <span style={{ 
                        fontSize: '13px', 
                        color: '#334155',
                        fontFamily: 'Arial, Helvetica, sans-serif',
                        letterSpacing: '0.01em',
                        wordSpacing: '0.05em'
                      }}>{amenity}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Additional Images */}
          {property.images && property.images.length > 1 && (
            <div style={{ marginBottom: '32px', pageBreakInside: 'avoid' }}>
              <h2 style={{ 
                fontSize: '24px', 
                fontWeight: 'bold', 
                color: '#0f172a', 
                marginBottom: '16px',
                fontFamily: 'Arial, Helvetica, sans-serif',
                letterSpacing: 'normal'
              }}>Galeria de Imagens</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                {property.images.slice(1, 7).map((img, idx) => (
                  <div key={idx} style={{ 
                    aspectRatio: '16/9', 
                    borderRadius: '8px', 
                    overflow: 'hidden',
                    backgroundColor: '#f8fafc'
                  }}>
                    <img 
                      src={img} 
                      alt={`Imagem ${idx + 2}`}
                      style={{ 
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'contain'
                      }}
                      crossOrigin="anonymous"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Consultant Info */}
          <div style={{ background: 'linear-gradient(to right, #eff6ff, #eef2ff)', borderRadius: '12px', padding: '24px', marginBottom: '32px' }}>
            <h3 style={{ 
              fontSize: '20px', 
              fontWeight: 'bold', 
              color: '#0f172a', 
              marginBottom: '16px',
              fontFamily: 'Arial, Helvetica, sans-serif',
              letterSpacing: 'normal'
            }}>Informações de Contacto</h3>
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
                <p style={{ 
                  fontSize: '18px', 
                  fontWeight: '600', 
                  color: '#0f172a', 
                  marginBottom: '12px',
                  fontFamily: 'Arial, Helvetica, sans-serif',
                  letterSpacing: 'normal',
                  wordSpacing: 'normal'
                }}>
                  {property.assigned_consultant_name || consultant?.full_name || 'ZuGruppe'}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(property.assigned_consultant_phone || consultant?.phone) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#334155' }}>
                      <Phone className="w-5 h-5 text-blue-600" style={{ flexShrink: 0 }} />
                      <span style={{ 
                        fontWeight: '500', 
                        fontSize: '14px',
                        fontFamily: 'Arial, Helvetica, sans-serif',
                        letterSpacing: '0.01em'
                      }}>{property.assigned_consultant_phone || consultant?.phone}</span>
                    </div>
                  )}
                  {(property.assigned_consultant || consultant?.email) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#334155' }}>
                      <Mail className="w-5 h-5 text-blue-600" style={{ flexShrink: 0 }} />
                      <span style={{ 
                        fontWeight: '500', 
                        fontSize: '14px',
                        fontFamily: 'Arial, Helvetica, sans-serif',
                        letterSpacing: '0.01em'
                      }}>{property.assigned_consultant || consultant?.email}</span>
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
              <div style={{ textAlign: 'right', fontSize: '13px' }}>
                <p style={{ 
                  fontWeight: 'bold', 
                  color: '#0f172a', 
                  marginBottom: '4px',
                  fontFamily: 'Arial, Helvetica, sans-serif',
                  letterSpacing: '0.01em',
                  wordSpacing: '0.05em'
                }}>IMPIC 11355 | Privileged Approach Unipessoal Lda</p>
                <p style={{ 
                  marginBottom: '2px', 
                  color: '#475569',
                  fontFamily: 'Arial, Helvetica, sans-serif',
                  letterSpacing: '0.01em',
                  wordSpacing: '0.05em'
                }}>📞 234 026 223 | ✉️ info@zugruppe.com</p>
                <p style={{ 
                  color: '#475569',
                  fontFamily: 'Arial, Helvetica, sans-serif',
                  letterSpacing: '0.01em',
                  wordSpacing: '0.05em'
                }}>🌐 www.zugruppe.com</p>
              </div>
            </div>
            <div style={{ 
              textAlign: 'center', 
              marginTop: '16px', 
              fontSize: '11px', 
              color: '#94a3b8',
              fontFamily: 'Arial, Helvetica, sans-serif',
              letterSpacing: 'normal'
            }}>
              Brochura gerada em {new Date().toLocaleDateString('pt-PT')}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}