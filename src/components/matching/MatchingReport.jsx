import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Sparkles, Loader2, Building2, MapPin, Euro, Bed, Bath,
  Maximize, FileText, Download, Send, Check, Star,
  Target, Brain, Save, Printer, Mail
} from "lucide-react";
import { toast } from "sonner";
import moment from "moment";

export default function MatchingReport({ contact, open, onOpenChange }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [matches, setMatches] = useState([]);
  const [selectedProperties, setSelectedProperties] = useState([]);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list('-created_date')
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['buyerProfiles'],
    queryFn: () => base44.entities.BuyerProfile.list()
  });

  const { data: savedProperties = [], refetch: refetchSaved } = useQuery({
    queryKey: ['savedPropertiesForContact', contact?.id],
    queryFn: async () => {
      if (!contact?.id) return [];
      const all = await base44.entities.SavedProperty.list();
      return all.filter(sp => sp.user_email === contact.email);
    },
    enabled: !!contact?.id
  });

  const activeProperties = properties.filter(p => 
    p.status === 'active' && p.availability_status === 'available'
  );

  // Find or create profile from contact requirements
  const getProfileFromContact = () => {
    // Check if contact has linked profile
    if (contact?.linked_buyer_profile_id) {
      return profiles.find(p => p.id === contact.linked_buyer_profile_id);
    }
    
    // Create virtual profile from contact requirements
    const req = contact?.property_requirements || {};
    return {
      buyer_name: contact?.full_name,
      buyer_email: contact?.email,
      listing_type: req.listing_type || 'sale',
      property_types: req.property_types || [],
      locations: req.locations || [],
      budget_min: req.budget_min,
      budget_max: req.budget_max,
      bedrooms_min: req.bedrooms_min,
      square_feet_min: req.area_min
    };
  };

  const calculateMatchScore = (profile, property) => {
    let score = 0;
    let maxScore = 0;
    const details = [];

    // Price (30 points)
    maxScore += 30;
    if (profile.budget_min || profile.budget_max) {
      const price = property.price || 0;
      const min = profile.budget_min || 0;
      const max = profile.budget_max || Infinity;
      
      if (price >= min && price <= max) {
        score += 30;
        details.push({ factor: "Preço dentro do orçamento", points: 30 });
      } else if (price >= min * 0.9 && price <= max * 1.1) {
        score += 15;
        details.push({ factor: "Preço próximo do orçamento", points: 15 });
      }
    } else {
      score += 20;
    }

    // Location (25 points)
    maxScore += 25;
    if (profile.locations?.length > 0) {
      const loc = (property.city || '').toLowerCase();
      const state = (property.state || '').toLowerCase();
      const matched = profile.locations.some(l => 
        loc.includes(l.toLowerCase()) || state.includes(l.toLowerCase())
      );
      if (matched) {
        score += 25;
        details.push({ factor: "Localização preferida", points: 25 });
      }
    } else {
      score += 15;
    }

    // Property type (20 points)
    maxScore += 20;
    if (profile.property_types?.length > 0) {
      if (profile.property_types.includes(property.property_type)) {
        score += 20;
        details.push({ factor: "Tipo de imóvel preferido", points: 20 });
      }
    } else {
      score += 12;
    }

    // Bedrooms (15 points)
    maxScore += 15;
    if (profile.bedrooms_min) {
      if (property.bedrooms >= profile.bedrooms_min) {
        score += 15;
        details.push({ factor: "Quartos suficientes", points: 15 });
      }
    } else {
      score += 10;
    }

    // Listing type (10 points)
    maxScore += 10;
    if (profile.listing_type && profile.listing_type !== 'both') {
      if (property.listing_type === profile.listing_type) {
        score += 10;
        details.push({ factor: "Tipo de negócio correto", points: 10 });
      }
    } else {
      score += 10;
    }

    return {
      score: Math.round((score / maxScore) * 100),
      details
    };
  };

  const runMatching = async () => {
    setAnalyzing(true);
    setProgress(0);
    setMatches([]);
    setSelectedProperties([]);

    try {
      const profile = getProfileFromContact();
      setProgress(20);

      // Calculate scores
      const matchResults = activeProperties.map(property => ({
        property,
        ...calculateMatchScore(profile, property),
        isSaved: savedProperties.some(sp => sp.property_id === property.id)
      })).filter(m => m.score >= 40)
        .sort((a, b) => b.score - a.score)
        .slice(0, 20);

      setProgress(60);

      // AI enhancement for top matches
      if (matchResults.length > 0) {
        const topMatches = matchResults.slice(0, 10);
        
        const aiResult = await base44.integrations.Core.InvokeLLM({
          prompt: `Analisa a compatibilidade entre este cliente e os imóveis candidatos.

CLIENTE: ${contact?.full_name}
- Email: ${contact?.email}
- Orçamento: €${profile.budget_min?.toLocaleString() || 0} - €${profile.budget_max?.toLocaleString() || 'sem limite'}
- Localizações: ${profile.locations?.join(', ') || 'Qualquer'}
- Tipos: ${profile.property_types?.join(', ') || 'Qualquer'}
- Quartos: ${profile.bedrooms_min || 'N/A'}+

IMÓVEIS:
${topMatches.map((m, i) => `
#${i+1}: ${m.property.title} (${m.score}%)
- €${m.property.price?.toLocaleString()} | ${m.property.city} | T${m.property.bedrooms || 0} | ${m.property.useful_area || m.property.square_feet || 0}m²
`).join('')}

Para cada imóvel, dá um pitch de venda curto e personalizado para este cliente.`,
          response_json_schema: {
            type: "object",
            properties: {
              matches: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    index: { type: "number" },
                    sales_pitch: { type: "string" },
                    highlights: { type: "array", items: { type: "string" } }
                  }
                }
              }
            }
          }
        });

        // Merge AI results
        topMatches.forEach((match, idx) => {
          const aiData = aiResult.matches?.find(m => m.index === idx + 1);
          if (aiData) {
            match.salesPitch = aiData.sales_pitch;
            match.highlights = aiData.highlights;
          }
        });
      }

      setProgress(100);
      setMatches(matchResults);
      
      // Pre-select saved properties
      const savedIds = savedProperties.map(sp => sp.property_id);
      setSelectedProperties(savedIds.filter(id => 
        matchResults.some(m => m.property.id === id)
      ));

    } catch (error) {
      console.error("Matching error:", error);
      toast.error("Erro ao analisar matches");
    }

    setAnalyzing(false);
  };

  const toggleProperty = (propertyId) => {
    setSelectedProperties(prev => 
      prev.includes(propertyId)
        ? prev.filter(id => id !== propertyId)
        : [...prev, propertyId]
    );
  };

  const saveSelectedProperties = async () => {
    setSaving(true);
    try {
      // Get current saved for this contact
      const existingIds = savedProperties.map(sp => sp.property_id);
      
      // Properties to add
      const toAdd = selectedProperties.filter(id => !existingIds.includes(id));
      
      // Properties to remove
      const toRemove = savedProperties.filter(sp => 
        existingIds.includes(sp.property_id) && !selectedProperties.includes(sp.property_id)
      );

      // Add new
      for (const propertyId of toAdd) {
        const property = properties.find(p => p.id === propertyId);
        await base44.entities.SavedProperty.create({
          property_id: propertyId,
          property_title: property?.title,
          property_image: property?.images?.[0],
          user_email: contact.email,
          notes: `Sugerido via matching automático`
        });
      }

      // Remove deselected
      for (const saved of toRemove) {
        await base44.entities.SavedProperty.delete(saved.id);
      }

      await refetchSaved();
      toast.success(`${toAdd.length} imóveis guardados para ${contact.full_name}`);

    } catch (error) {
      toast.error("Erro ao guardar imóveis");
    }
    setSaving(false);
  };

  const generateReport = async (format = 'pdf') => {
    setGenerating(true);
    try {
      const selectedMatches = matches.filter(m => 
        selectedProperties.includes(m.property.id)
      );

      if (selectedMatches.length === 0) {
        toast.error("Selecione pelo menos um imóvel");
        setGenerating(false);
        return;
      }

      // Corporate Identity Colors
      const brandColors = {
        primary: '#0f172a',      // Slate 900
        accent: '#d4af37',       // Gold
        secondary: '#1e293b',    // Slate 800
        lightBg: '#f8fafc',
        text: '#334155'
      };

      const logoUrl = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6915a593b6edd8435f5838bd/359538617_Zugruppe01.jpg";

      if (format === 'pdf') {
        // Dynamic import jsPDF
        const { jsPDF } = await import('jspdf');
        const doc = new jsPDF('p', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 20;
        let yPos = 20;

        // Helper function to add new page if needed
        const checkNewPage = (neededHeight) => {
          if (yPos + neededHeight > pageHeight - 30) {
            doc.addPage();
            yPos = 20;
            return true;
          }
          return false;
        };

        // Header with logo - maintain aspect ratio
        try {
          const img = new Image();
          img.crossOrigin = 'Anonymous';
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = logoUrl;
          });
          // Calculate proper dimensions maintaining aspect ratio
          const logoMaxWidth = 35;
          const logoMaxHeight = 12;
          const imgRatio = img.width / img.height;
          let logoWidth = logoMaxWidth;
          let logoHeight = logoWidth / imgRatio;
          if (logoHeight > logoMaxHeight) {
            logoHeight = logoMaxHeight;
            logoWidth = logoHeight * imgRatio;
          }
          doc.addImage(img, 'JPEG', margin, yPos, logoWidth, logoHeight);
        } catch (e) {
          // If logo fails, just add text
          doc.setFontSize(16);
          doc.setTextColor(brandColors.primary);
          doc.text('ZUGRUPPE', margin, yPos + 10);
        }

        // Header line
        doc.setDrawColor(brandColors.accent);
        doc.setLineWidth(1);
        doc.line(margin, yPos + 20, pageWidth - margin, yPos + 20);
        yPos += 30;

        // Title
        doc.setFontSize(22);
        doc.setTextColor(brandColors.primary);
        doc.text('Relatório de Matching Imobiliário', margin, yPos);
        yPos += 8;

        doc.setFontSize(10);
        doc.setTextColor(brandColors.text);
        doc.text(`Gerado em ${moment().format('DD/MM/YYYY [às] HH:mm')}`, margin, yPos);
        yPos += 15;

        // Client Info Box
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 35, 3, 3, 'F');
        
        doc.setFontSize(14);
        doc.setTextColor(brandColors.primary);
        doc.text(contact.full_name, margin + 5, yPos + 10);
        
        doc.setFontSize(10);
        doc.setTextColor(brandColors.text);
        let clientY = yPos + 18;
        if (contact.email) {
          doc.text(`Email: ${contact.email}`, margin + 5, clientY);
          clientY += 6;
        }
        if (contact.phone) {
          doc.text(`Telefone: ${contact.phone}`, margin + 5, clientY);
        }
        
        // Requirements on right side
        const req = contact.property_requirements;
        if (req) {
          let reqY = yPos + 10;
          doc.setFontSize(9);
          if (req.budget_max) {
            doc.text(`Orçamento: até €${req.budget_max.toLocaleString()}`, pageWidth - margin - 60, reqY);
            reqY += 5;
          }
          if (req.locations?.length) {
            doc.text(`Localizações: ${req.locations.slice(0, 3).join(', ')}`, pageWidth - margin - 60, reqY);
          }
        }
        
        yPos += 45;

        // Properties Section Title
        doc.setFontSize(14);
        doc.setTextColor(brandColors.primary);
        doc.text(`Imóveis Recomendados (${selectedMatches.length})`, margin, yPos);
        yPos += 10;

        // Properties
        for (let i = 0; i < selectedMatches.length; i++) {
          const m = selectedMatches[i];
          checkNewPage(55);

          // Property card
          doc.setDrawColor(226, 232, 240);
          doc.setLineWidth(0.3);
          doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 50, 2, 2, 'S');

          // Score badge
          const scoreX = pageWidth - margin - 25;
          doc.setFillColor(brandColors.accent);
          doc.roundedRect(scoreX, yPos + 5, 20, 10, 2, 2, 'F');
          doc.setFontSize(10);
          doc.setTextColor(255, 255, 255);
          doc.text(`${m.score}%`, scoreX + 10, yPos + 11.5, { align: 'center' });

          // Property title
          doc.setFontSize(12);
          doc.setTextColor(brandColors.primary);
          const title = `#${i + 1} - ${m.property.title}`;
          doc.text(title.substring(0, 60) + (title.length > 60 ? '...' : ''), margin + 5, yPos + 10);

          // Location
          doc.setFontSize(9);
          doc.setTextColor(brandColors.text);
          doc.text(`${m.property.city || ''}, ${m.property.state || ''}`, margin + 5, yPos + 17);

          // Details row
          let detailsY = yPos + 25;
          doc.setFontSize(10);
          doc.text(`€${m.property.price?.toLocaleString() || 'N/A'}`, margin + 5, detailsY);
          if (m.property.bedrooms) {
            doc.text(`T${m.property.bedrooms}`, margin + 45, detailsY);
          }
          if (m.property.bathrooms) {
            doc.text(`${m.property.bathrooms} WC`, margin + 60, detailsY);
          }
          if (m.property.useful_area || m.property.square_feet) {
            doc.text(`${m.property.useful_area || m.property.square_feet}m²`, margin + 80, detailsY);
          }

          // Sales pitch
          if (m.salesPitch) {
            doc.setFillColor(240, 253, 244);
            doc.roundedRect(margin + 5, yPos + 30, pageWidth - 2 * margin - 10, 15, 1, 1, 'F');
            doc.setFontSize(8);
            doc.setTextColor(34, 197, 94);
            const pitch = m.salesPitch.substring(0, 120) + (m.salesPitch.length > 120 ? '...' : '');
            doc.text(pitch, margin + 8, yPos + 38, { maxWidth: pageWidth - 2 * margin - 20 });
          }

          yPos += 55;
        }

        // Footer
        checkNewPage(20);
        doc.setDrawColor(brandColors.accent);
        doc.setLineWidth(0.5);
        doc.line(margin, pageHeight - 25, pageWidth - margin, pageHeight - 25);
        
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text('Privileged Approach Unipessoal Lda | Relatório gerado automaticamente pelo sistema de Matching com IA', pageWidth / 2, pageHeight - 18, { align: 'center' });
        doc.text(`© ${new Date().getFullYear()} Zugruppe - Todos os direitos reservados`, pageWidth / 2, pageHeight - 12, { align: 'center' });

        // Save PDF
        doc.save(`Matching_${contact.full_name.replace(/\s+/g, '_')}_${moment().format('YYYYMMDD')}.pdf`);
        toast.success("PDF gerado com sucesso!");

      } else {
        // HTML format fallback
        const reportHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Relatório de Matching - ${contact.full_name}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
    .header { border-bottom: 3px solid #d4af37; padding-bottom: 20px; margin-bottom: 30px; display: flex; align-items: center; gap: 20px; }
    .header img { height: 50px; }
    .header h1 { margin: 0; color: #0f172a; }
    .header p { margin: 5px 0; color: #666; }
    .client-info { background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
    .client-info h2 { margin-top: 0; color: #1e293b; }
    .property { border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 20px; page-break-inside: avoid; }
    .property-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px; }
    .property h3 { margin: 0; color: #1e293b; }
    .score { background: #d4af37; color: #0f172a; padding: 5px 15px; border-radius: 20px; font-weight: bold; }
    .property-details { display: flex; gap: 20px; margin-bottom: 15px; color: #64748b; }
    .pitch { background: #f0fdf4; border-left: 4px solid #22c55e; padding: 15px; margin-top: 15px; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #d4af37; text-align: center; color: #94a3b8; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <img src="${logoUrl}" alt="Zugruppe" />
    <div>
      <h1>Relatório de Matching Imobiliário</h1>
      <p>Gerado em ${moment().format('DD/MM/YYYY HH:mm')}</p>
    </div>
  </div>
  
  <div class="client-info">
    <h2>${contact.full_name}</h2>
    <p><strong>Email:</strong> ${contact.email || 'N/A'}</p>
    <p><strong>Telefone:</strong> ${contact.phone || 'N/A'}</p>
  </div>

  <h2>Imóveis Recomendados (${selectedMatches.length})</h2>
  
  ${selectedMatches.map((m, idx) => `
    <div class="property">
      <div class="property-header">
        <div>
          <h3>#${idx + 1} - ${m.property.title}</h3>
          <p style="color: #64748b; margin: 5px 0;">${m.property.city}, ${m.property.state}</p>
        </div>
        <div class="score">${m.score}%</div>
      </div>
      <div class="property-details">
        <span>€${m.property.price?.toLocaleString()}</span>
        ${m.property.bedrooms ? `<span>T${m.property.bedrooms}</span>` : ''}
        ${m.property.useful_area || m.property.square_feet ? `<span>${m.property.useful_area || m.property.square_feet}m²</span>` : ''}
      </div>
      ${m.salesPitch ? `<div class="pitch"><strong>Porque é ideal:</strong> ${m.salesPitch}</div>` : ''}
    </div>
  `).join('')}

  <div class="footer">
    <p>Privileged Approach Unipessoal Lda</p>
    <p>© ${new Date().getFullYear()} Zugruppe - Todos os direitos reservados</p>
  </div>
</body>
</html>`;

        const blob = new Blob([reportHtml], { type: 'text/html' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Matching_${contact.full_name.replace(/\s+/g, '_')}_${moment().format('YYYYMMDD')}.html`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        toast.success("Relatório HTML gerado!");
      }

    } catch (error) {
      console.error("Error generating report:", error);
      toast.error("Erro ao gerar relatório");
    }
    setGenerating(false);
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'bg-green-100 text-green-800 border-green-200';
    if (score >= 60) return 'bg-blue-100 text-blue-800 border-blue-200';
    return 'bg-amber-100 text-amber-800 border-amber-200';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-indigo-600" />
            Relatório de Matching - {contact?.full_name}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Action Bar */}
          <div className="flex items-center justify-between gap-4 pb-4 border-b">
            <div className="flex items-center gap-2">
              <Button
                onClick={runMatching}
                disabled={analyzing}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {analyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    A analisar...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    {matches.length > 0 ? 'Re-analisar' : 'Iniciar Matching'}
                  </>
                )}
              </Button>
              
              {matches.length > 0 && (
                <Badge variant="outline">
                  {matches.length} imóveis compatíveis
                </Badge>
              )}
            </div>

            {matches.length > 0 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={saveSelectedProperties}
                  disabled={saving || selectedProperties.length === 0}
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Guardar ({selectedProperties.length})
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => generateReport('pdf')}
                  disabled={generating || selectedProperties.length === 0}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {generating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Gerar PDF
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* Progress */}
          {analyzing && (
            <div className="py-4">
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-slate-500 mt-2 text-center">
                A analisar compatibilidade com IA...
              </p>
            </div>
          )}

          {/* Results */}
          {!analyzing && matches.length > 0 && (
            <ScrollArea className="flex-1 mt-4">
              <div className="space-y-3 pr-4">
                {matches.map((match, idx) => (
                  <div
                    key={match.property.id}
                    className={`p-4 border rounded-lg transition-all ${
                      selectedProperties.includes(match.property.id)
                        ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex gap-4">
                      {/* Checkbox */}
                      <div className="flex items-start pt-1">
                        <Checkbox
                          checked={selectedProperties.includes(match.property.id)}
                          onCheckedChange={() => toggleProperty(match.property.id)}
                        />
                      </div>

                      {/* Rank */}
                      <div className="flex flex-col items-center w-12">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                          idx === 0 ? 'bg-amber-100 text-amber-700' :
                          idx === 1 ? 'bg-slate-200 text-slate-700' :
                          idx === 2 ? 'bg-orange-100 text-orange-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          #{idx + 1}
                        </div>
                        <Badge className={`mt-2 text-xs ${getScoreColor(match.score)}`}>
                          {match.score}%
                        </Badge>
                      </div>

                      {/* Image */}
                      <div className="w-32 h-24 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                        {match.property.images?.[0] ? (
                          <img 
                            src={match.property.images[0]} 
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Building2 className="w-8 h-8 text-slate-300" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold text-slate-900 line-clamp-1">
                              {match.property.title}
                            </h4>
                            <div className="flex items-center gap-2 text-sm text-slate-600 mt-1">
                              <MapPin className="w-3.5 h-3.5" />
                              {match.property.city}
                              <span className="font-semibold text-slate-900">
                                €{match.property.price?.toLocaleString()}
                              </span>
                            </div>
                          </div>
                          {match.isSaved && (
                            <Badge variant="secondary" className="text-xs">
                              <Star className="w-3 h-3 mr-1" />
                              Guardado
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-3 mt-2 text-sm text-slate-600">
                          {match.property.bedrooms > 0 && (
                            <span className="flex items-center gap-1">
                              <Bed className="w-3.5 h-3.5" />
                              T{match.property.bedrooms}
                            </span>
                          )}
                          {match.property.bathrooms > 0 && (
                            <span className="flex items-center gap-1">
                              <Bath className="w-3.5 h-3.5" />
                              {match.property.bathrooms}
                            </span>
                          )}
                          {(match.property.useful_area || match.property.square_feet) > 0 && (
                            <span className="flex items-center gap-1">
                              <Maximize className="w-3.5 h-3.5" />
                              {match.property.useful_area || match.property.square_feet}m²
                            </span>
                          )}
                        </div>

                        {/* Sales Pitch */}
                        {match.salesPitch && (
                          <div className="mt-2 p-2 bg-green-50 border-l-2 border-green-500 rounded text-sm text-green-800">
                            💡 {match.salesPitch}
                          </div>
                        )}

                        {/* Highlights */}
                        {match.highlights?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {match.highlights.slice(0, 4).map((h, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                <Check className="w-3 h-3 mr-1" />
                                {h}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          {/* Empty State */}
          {!analyzing && matches.length === 0 && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center py-12">
                <Target className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-700 mb-2">
                  Iniciar Análise de Matching
                </h3>
                <p className="text-slate-500 mb-4">
                  Clique em "Iniciar Matching" para encontrar imóveis compatíveis
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}