import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sparkles, Loader2, Building2, MapPin, Euro, Bed, Bath,
  Maximize, FileText, Download, Send, Check, Star,
  Target, Brain, Save, Printer, Mail, Settings, Home, TrendingUp
} from "lucide-react";
import { toast } from "sonner";
import moment from "moment";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Legend } from "recharts";
import ReportCustomizer, { DEFAULT_CONFIG } from "./ReportCustomizer";

// Visual Summary Component
function MatchingSummary({ matches, contact, properties }) {
  const req = contact?.property_requirements || {};
  
  // Calculate metrics
  const metrics = useMemo(() => {
    const budgetMatches = properties.filter(p => {
      if (!req.budget_min && !req.budget_max) return true;
      const price = p.price || 0;
      return price >= (req.budget_min || 0) && price <= (req.budget_max || Infinity);
    }).length;

    const locationMatches = properties.filter(p => {
      if (!req.locations?.length) return true;
      return req.locations.some(loc => 
        p.city?.toLowerCase().includes(loc.toLowerCase()) ||
        p.state?.toLowerCase().includes(loc.toLowerCase())
      );
    }).length;

    const typeMatches = properties.filter(p => {
      if (!req.property_types?.length) return true;
      return req.property_types.includes(p.property_type);
    }).length;

    const bedroomMatches = properties.filter(p => {
      if (!req.bedrooms_min) return true;
      return (p.bedrooms || 0) >= req.bedrooms_min;
    }).length;

    return { budgetMatches, locationMatches, typeMatches, bedroomMatches };
  }, [properties, req]);

  // Radar chart data for top 3
  const top3 = matches.slice(0, 3);
  const radarData = useMemo(() => {
    const categories = [
      { key: 'price', label: 'Preço', max: 30 },
      { key: 'location', label: 'Localização', max: 25 },
      { key: 'type', label: 'Tipo', max: 20 },
      { key: 'bedrooms', label: 'Quartos', max: 15 },
      { key: 'listing', label: 'Negócio', max: 10 }
    ];

    return categories.map(cat => {
      const dataPoint = { category: cat.label };
      top3.forEach((match, idx) => {
        const detail = match.details?.find(d => {
          if (cat.key === 'price') return d.factor.toLowerCase().includes('preço') || d.factor.toLowerCase().includes('orçamento');
          if (cat.key === 'location') return d.factor.toLowerCase().includes('localização');
          if (cat.key === 'type') return d.factor.toLowerCase().includes('tipo');
          if (cat.key === 'bedrooms') return d.factor.toLowerCase().includes('quarto');
          if (cat.key === 'listing') return d.factor.toLowerCase().includes('negócio');
          return false;
        });
        dataPoint[`property${idx + 1}`] = detail ? Math.round((detail.points / cat.max) * 100) : 50;
      });
      return dataPoint;
    });
  }, [top3]);

  const chartColors = ['#6366f1', '#10b981', '#f59e0b'];

  // Average score
  const avgScore = matches.length > 0 
    ? Math.round(matches.reduce((sum, m) => sum + m.score, 0) / matches.length)
    : 0;

  return (
    <div className="mt-4 space-y-4">
      {/* Hero Stats Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-white">{matches.length}</div>
              <div className="text-xs text-slate-400 uppercase tracking-wide">Matches</div>
            </div>
            <div className="w-px h-12 bg-slate-700" />
            <div className="text-center">
              <div className="text-4xl font-bold bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent">
                {avgScore}%
              </div>
              <div className="text-xs text-slate-400 uppercase tracking-wide">Média</div>
            </div>
            <div className="w-px h-12 bg-slate-700" />
            <div className="text-center">
              <div className="text-4xl font-bold text-amber-400">{properties.length}</div>
              <div className="text-xs text-slate-400 uppercase tracking-wide">Portfolio</div>
            </div>
          </div>
          
          {/* Client Summary */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl px-5 py-3">
            <div className="text-sm text-slate-300">Cliente</div>
            <div className="font-semibold text-lg">{contact?.full_name}</div>
            {req.budget_max && (
              <div className="text-xs text-emerald-400">até €{req.budget_max.toLocaleString()}</div>
            )}
          </div>
        </div>
      </div>

      {/* Metrics Cards - More visual */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 p-5 text-white shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-300 hover:-translate-y-1">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <Euro className="w-8 h-8 mb-2 opacity-80" />
          <div className="text-3xl font-bold">{metrics.budgetMatches}</div>
          <div className="text-sm text-blue-100">No Orçamento</div>
        </div>
        
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 p-5 text-white shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30 transition-all duration-300 hover:-translate-y-1">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <MapPin className="w-8 h-8 mb-2 opacity-80" />
          <div className="text-3xl font-bold">{metrics.locationMatches}</div>
          <div className="text-sm text-emerald-100">Localização</div>
        </div>
        
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 p-5 text-white shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/30 transition-all duration-300 hover:-translate-y-1">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <Home className="w-8 h-8 mb-2 opacity-80" />
          <div className="text-3xl font-bold">{metrics.typeMatches}</div>
          <div className="text-sm text-purple-100">Tipo Imóvel</div>
        </div>
        
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 p-5 text-white shadow-lg shadow-amber-500/25 hover:shadow-xl hover:shadow-amber-500/30 transition-all duration-300 hover:-translate-y-1">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <Bed className="w-8 h-8 mb-2 opacity-80" />
          <div className="text-3xl font-bold">{metrics.bedroomMatches}</div>
          <div className="text-sm text-amber-100">Quartos</div>
        </div>
      </div>

      {/* Top 3 Compatibility Chart */}
      {top3.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 px-6 py-4 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-600 rounded-lg">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Análise Comparativa Top 3</h3>
                <p className="text-xs text-slate-500">Compatibilidade por critério</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="flex gap-6">
              {/* Radar Chart */}
              <div className="flex-1 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} margin={{ top: 20, right: 40, bottom: 20, left: 40 }}>
                    <PolarGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <PolarAngleAxis 
                      dataKey="category" 
                      tick={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }} 
                    />
                    <PolarRadiusAxis 
                      angle={30} 
                      domain={[0, 100]} 
                      tick={{ fontSize: 9, fill: '#94a3b8' }}
                      tickCount={5}
                    />
                    {top3.map((match, idx) => (
                      <Radar
                        key={match.property.id}
                        name={match.property.title?.substring(0, 20) || `Imóvel ${idx + 1}`}
                        dataKey={`property${idx + 1}`}
                        stroke={chartColors[idx]}
                        fill={chartColors[idx]}
                        fillOpacity={0.2}
                        strokeWidth={2.5}
                      />
                    ))}
                    <Legend 
                      wrapperStyle={{ fontSize: 11, paddingTop: 10 }} 
                      iconType="circle"
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              {/* Top 3 Podium */}
              <div className="w-56 flex flex-col gap-3">
                {top3.map((match, idx) => (
                  <div
                    key={match.property.id}
                    className={`relative overflow-hidden rounded-xl p-4 transition-all duration-300 hover:scale-[1.02] ${
                      idx === 0 ? 'bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-300 shadow-md' :
                      idx === 1 ? 'bg-gradient-to-r from-slate-50 to-gray-100 border-2 border-slate-300' :
                      'bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-200'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-lg font-bold shadow-lg ${
                          idx === 0 ? 'bg-gradient-to-br from-amber-400 to-amber-600' :
                          idx === 1 ? 'bg-gradient-to-br from-slate-400 to-slate-600' :
                          'bg-gradient-to-br from-orange-400 to-orange-600'
                        }`}
                      >
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {match.property.title}
                        </p>
                        <p className="text-xs text-slate-500">{match.property.city}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <div 
                            className="h-1.5 flex-1 bg-slate-200 rounded-full overflow-hidden"
                          >
                            <div 
                              className={`h-full rounded-full ${
                                idx === 0 ? 'bg-amber-500' :
                                idx === 1 ? 'bg-slate-500' :
                                'bg-orange-500'
                              }`}
                              style={{ width: `${match.score}%` }}
                            />
                          </div>
                          <span className="text-sm font-bold text-slate-900">{match.score}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MatchingReport({ contact, open, onOpenChange }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [matches, setMatches] = useState([]);
  const [selectedProperties, setSelectedProperties] = useState([]);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [reportConfig, setReportConfig] = useState(DEFAULT_CONFIG);
  const [activeReportTab, setActiveReportTab] = useState("matches");

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
          const logoMaxWidth = 50;
          const logoMaxHeight = 18;
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
    if (score >= 85) return 'bg-emerald-500 text-white';
    if (score >= 70) return 'bg-green-500 text-white';
    if (score >= 55) return 'bg-blue-500 text-white';
    return 'bg-amber-500 text-white';
  };

  const getScoreLabel = (score) => {
    if (score >= 85) return 'Excelente';
    if (score >= 70) return 'Muito Bom';
    if (score >= 55) return 'Bom';
    return 'Razoável';
  };

  const getScoreGradient = (score) => {
    if (score >= 85) return 'from-emerald-500 to-green-600';
    if (score >= 70) return 'from-green-500 to-teal-600';
    if (score >= 55) return 'from-blue-500 to-indigo-600';
    return 'from-amber-500 to-orange-600';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden flex flex-col p-0">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 px-6 py-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <Brain className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Relatório de Matching Imobiliário</h2>
                <p className="text-indigo-200 text-sm">
                  Análise inteligente para {contact?.full_name}
                </p>
              </div>
            </div>
            
            {/* Action Buttons in Header */}
            <div className="flex items-center gap-3">
              <Button
                onClick={runMatching}
                disabled={analyzing}
                className="bg-white/20 hover:bg-white/30 backdrop-blur-sm border-0 text-white"
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
                <>
                  <Button
                    variant="outline"
                    onClick={saveSelectedProperties}
                    disabled={saving || selectedProperties.length === 0}
                    className="bg-white/10 hover:bg-white/20 border-white/30 text-white"
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
                    className="bg-white text-indigo-700 hover:bg-indigo-50"
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
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col px-6 py-4">

          {/* Progress */}
          {analyzing && (
            <div className="py-4">
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-slate-500 mt-2 text-center">
                A analisar compatibilidade com IA...
              </p>
            </div>
          )}

          {/* Customizer Panel */}
          {showCustomizer && matches.length > 0 && (
            <div className="mt-4 p-4 bg-slate-50 rounded-xl border">
              <ReportCustomizer
                config={reportConfig}
                onConfigChange={setReportConfig}
                onSave={(config) => {
                  setReportConfig(config);
                  setShowCustomizer(false);
                  toast.success("Configurações do relatório guardadas!");
                }}
              />
            </div>
          )}

          {/* Visual Summary - Metrics and Top 3 Chart */}
          {!analyzing && matches.length > 0 && !showCustomizer && (
            <MatchingSummary matches={matches} contact={contact} properties={activeProperties} />
          )}

          {/* Results */}
          {!analyzing && matches.length > 0 && !showCustomizer && (
            <div className="flex-1 mt-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 450px)', minHeight: '300px' }}>
              <div className="space-y-4 pr-2">
                {matches.map((match, idx) => (
                  <div
                    key={match.property.id}
                    className={`relative overflow-hidden rounded-xl border-2 transition-all duration-200 ${
                      selectedProperties.includes(match.property.id)
                        ? 'border-indigo-500 bg-gradient-to-r from-indigo-50 to-white shadow-lg shadow-indigo-100'
                        : 'border-slate-200 hover:border-slate-300 hover:shadow-md bg-white'
                    }`}
                  >
                    {/* Top Score Bar */}
                    <div className={`h-1.5 w-full bg-gradient-to-r ${getScoreGradient(match.score)}`} />
                    
                    <div className="p-4">
                      <div className="flex gap-4">
                        {/* Checkbox & Rank */}
                        <div className="flex flex-col items-center gap-2">
                          <Checkbox
                            checked={selectedProperties.includes(match.property.id)}
                            onCheckedChange={() => toggleProperty(match.property.id)}
                            className="h-5 w-5"
                          />
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg shadow-sm ${
                            idx === 0 ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-white' :
                            idx === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-500 text-white' :
                            idx === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-white' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {idx + 1}
                          </div>
                        </div>

                        {/* Image with Score Overlay */}
                        <div className="relative w-36 h-28 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0 shadow-sm">
                          {match.property.images?.[0] ? (
                            <img 
                              src={match.property.images[0]} 
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
                              <Building2 className="w-10 h-10 text-slate-400" />
                            </div>
                          )}
                          {/* Score Badge Overlay */}
                          <div className="absolute top-2 right-2">
                            <div className={`px-2.5 py-1 rounded-full text-xs font-bold shadow-lg bg-gradient-to-r ${getScoreGradient(match.score)}`}>
                              {match.score}%
                            </div>
                          </div>
                          {match.isSaved && (
                            <div className="absolute bottom-2 left-2">
                              <div className="bg-white/90 backdrop-blur-sm rounded-full p-1.5 shadow">
                                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <h4 className="font-semibold text-slate-900 text-lg line-clamp-1">
                                {match.property.title}
                              </h4>
                              <div className="flex items-center gap-1.5 text-sm text-slate-500 mt-0.5">
                                <MapPin className="w-3.5 h-3.5" />
                                {match.property.city}, {match.property.state}
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <div className="text-xl font-bold text-slate-900">
                                €{match.property.price?.toLocaleString()}
                              </div>
                              <Badge className={`mt-1 text-xs ${getScoreColor(match.score)}`}>
                                {getScoreLabel(match.score)}
                              </Badge>
                            </div>
                          </div>

                          {/* Property Details */}
                          <div className="flex items-center gap-4 mt-3 text-sm">
                            {match.property.bedrooms > 0 && (
                              <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-lg">
                                <Bed className="w-4 h-4 text-slate-500" />
                                <span className="font-medium">T{match.property.bedrooms}</span>
                              </div>
                            )}
                            {match.property.bathrooms > 0 && (
                              <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-lg">
                                <Bath className="w-4 h-4 text-slate-500" />
                                <span className="font-medium">{match.property.bathrooms}</span>
                              </div>
                            )}
                            {(match.property.useful_area || match.property.square_feet) > 0 && (
                              <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-lg">
                                <Maximize className="w-4 h-4 text-slate-500" />
                                <span className="font-medium">{match.property.useful_area || match.property.square_feet}m²</span>
                              </div>
                            )}
                          </div>

                          {/* Match Details */}
                          {match.details?.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-3">
                              {match.details.slice(0, 4).map((d, i) => (
                                <span key={i} className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                  <Check className="w-3 h-3" />
                                  {d.factor}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Sales Pitch */}
                          {match.salesPitch && (
                            <div className="mt-3 p-3 bg-gradient-to-r from-emerald-50 to-green-50 border border-green-200 rounded-lg">
                              <div className="flex items-start gap-2">
                                <div className="p-1 bg-green-500 rounded-full flex-shrink-0 mt-0.5">
                                  <Sparkles className="w-3 h-3 text-white" />
                                </div>
                                <p className="text-sm text-green-800 leading-relaxed">{match.salesPitch}</p>
                              </div>
                            </div>
                          )}

                          {/* Highlights */}
                          {match.highlights?.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-3">
                              {match.highlights.slice(0, 4).map((h, i) => (
                                <Badge key={i} variant="outline" className="text-xs bg-white border-indigo-200 text-indigo-700">
                                  ✨ {h}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {!analyzing && matches.length === 0 && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center py-12 px-8">
                <div className="relative inline-block">
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full blur-2xl opacity-20 animate-pulse" />
                  <div className="relative bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full p-6">
                    <Brain className="w-16 h-16 text-indigo-600" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-2">
                  Análise Inteligente de Matching
                </h3>
                <p className="text-slate-500 mb-6 max-w-sm mx-auto">
                  A IA vai analisar os requisitos do cliente e encontrar os imóveis mais compatíveis da sua carteira.
                </p>
                <Button 
                  onClick={runMatching} 
                  size="lg"
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg shadow-indigo-200"
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  Iniciar Matching com IA
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}