import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, Home, MapPin, Euro, Bed, Bath, 
  Square, Sparkles, Send, Check, ExternalLink,
  Heart, Star, Filter, ChevronDown, ChevronUp, 
  Bell, BellOff, Save, Trash2, X, ThumbsDown,
  Eye, Clock, Bookmark, AlertCircle, Target, Zap,
  TrendingUp, RefreshCw, Loader2, MessageCircle, Mail, Settings, FileText
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import ContactRequirements from "./ContactRequirements";
import MessagePreviewDialog from "../matching/MessagePreviewDialog";
import MessageTemplatesManager from "../matching/MessageTemplatesManager";
import MatchingWeightsConfig from "../matching/MatchingWeightsConfig";

const propertyTypeLabels = {
  apartment: "Apartamento",
  house: "Moradia",
  townhouse: "Casa Geminada",
  condo: "Condomínio",
  land: "Terreno",
  commercial: "Comercial",
  building: "Prédio"
};

export default function ContactMatching({ contact }) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = React.useState("requirements");
  const [matchResults, setMatchResults] = React.useState([]);
  const [analyzing, setAnalyzing] = React.useState(false);
  const [selectedProperties, setSelectedProperties] = React.useState([]);
  const [sortBy, setSortBy] = React.useState("score");
  const [sendingEmail, setSendingEmail] = React.useState(false);
  const [sendingWhatsApp, setSendingWhatsApp] = React.useState(false);
  const [saveSearchDialogOpen, setSaveSearchDialogOpen] = React.useState(false);
  const [searchName, setSearchName] = React.useState("");
  const [alertsEnabled, setAlertsEnabled] = React.useState(false);
  const [alertFrequency, setAlertFrequency] = React.useState("daily");
  const [savingForLater, setSavingForLater] = React.useState(null);
  const [sendMethod, setSendMethod] = React.useState("email");
  const [addPropertyDialogOpen, setAddPropertyDialogOpen] = React.useState(false);
  const [propertySearch, setPropertySearch] = React.useState("");
  const [addingPropertyId, setAddingPropertyId] = React.useState(null);
  const [previewDialogOpen, setPreviewDialogOpen] = React.useState(false);
  const [previewMessage, setPreviewMessage] = React.useState("");
  const [previewSubject, setPreviewSubject] = React.useState("");
  const [templatesDialogOpen, setTemplatesDialogOpen] = React.useState(false);
  const [weightsDialogOpen, setWeightsDialogOpen] = React.useState(false);
  const [customWeights, setCustomWeights] = React.useState(null);

  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list('-created_date')
  });

  const { data: savedSearches = [], refetch: refetchSearches } = useQuery({
    queryKey: ['savedSearches', contact?.id],
    queryFn: async () => {
      if (!contact?.id) return [];
      return await base44.entities.SavedSearchCriteria.filter({ contact_id: contact.id });
    },
    enabled: !!contact?.id
  });

  const { data: propertyFeedback = [], refetch: refetchFeedback } = useQuery({
    queryKey: ['propertyFeedback', contact?.id],
    queryFn: async () => {
      if (!contact?.id) return [];
      return await base44.entities.PropertyFeedback.filter({ contact_id: contact.id });
    },
    enabled: !!contact?.id
  });

  const { data: sentMatches = [], refetch: refetchSentMatches } = useQuery({
    queryKey: ['sentMatches', contact?.id],
    queryFn: async () => {
      if (!contact?.id) return [];
      return await base44.entities.SentMatch.filter({ contact_id: contact.id });
    },
    enabled: !!contact?.id
  });

  const { data: messageTemplates = [] } = useQuery({
    queryKey: ['messageTemplates'],
    queryFn: () => base44.entities.MessageTemplate.list('-created_date')
  });

  const { data: weightProfiles = [] } = useQuery({
    queryKey: ['matchingWeights'],
    queryFn: () => base44.entities.MatchingWeights.list('-created_date')
  });

  const saveSearchMutation = useMutation({
    mutationFn: (data) => base44.entities.SavedSearchCriteria.create(data),
    onSuccess: () => {
      toast.success("Pesquisa guardada!");
      refetchSearches();
      setSaveSearchDialogOpen(false);
      setSearchName("");
    }
  });

  const deleteSearchMutation = useMutation({
    mutationFn: (id) => base44.entities.SavedSearchCriteria.delete(id),
    onSuccess: () => {
      toast.success("Pesquisa eliminada");
      refetchSearches();
    }
  });

  const toggleAlertMutation = useMutation({
    mutationFn: ({ id, enabled }) => base44.entities.SavedSearchCriteria.update(id, { alerts_enabled: enabled }),
    onSuccess: (_, { enabled }) => {
      toast.success(enabled ? "Alertas ativados!" : "Alertas desativados");
      refetchSearches();
    }
  });

  const saveFeedbackMutation = useMutation({
    mutationFn: async (data) => {
      const existing = propertyFeedback.find(f => f.property_id === data.property_id);
      if (existing) {
        return await base44.entities.PropertyFeedback.update(existing.id, data);
      }
      return await base44.entities.PropertyFeedback.create(data);
    },
    onSuccess: () => {
      refetchFeedback();
    }
  });

  const activeProperties = properties.filter(p => p.status === 'active');
  const favoriteIds = propertyFeedback.filter(f => f.feedback_type === 'favorite').map(f => f.property_id);
  const rejectedIds = propertyFeedback.filter(f => f.feedback_type === 'rejected').map(f => f.property_id);
  const savedForLaterIds = sentMatches.filter(sm => sm.client_response === 'saved').map(sm => sm.property_id);
  const alreadySentIds = sentMatches.filter(sm => sm.client_response !== 'saved').map(sm => sm.property_id);

  // Get requirements from contact
  const req = contact?.property_requirements || {};

  const calculateMatchScore = (property, weights = null) => {
    if (!req || Object.keys(req).length === 0) {
      return favoriteIds.includes(property.id) ? 80 : 50;
    }

    // Use custom weights or default weights
    const w = weights || customWeights?.weights || {
      location: 30,
      price: 25,
      bedrooms: 15,
      bathrooms: 10,
      area: 15,
      property_type: 10,
      listing_type: 15,
      amenities: 10
    };

    let score = 0;
    let maxScore = 0;

    // Country match (if specified, it's mandatory)
    if (req.countries?.length > 0) {
      if (!req.countries.includes(property.country || 'Portugal')) {
        return 0; // No match if country doesn't match
      }
    }

    // Location match
    if (req.locations?.length > 0) {
      maxScore += w.location;
      if (req.locations.some(loc => 
        property.city?.toLowerCase().includes(loc.toLowerCase()) ||
        loc.toLowerCase().includes(property.city?.toLowerCase() || '')
      )) {
        score += w.location;
      }
    }

    // Listing type match
    if (req.listing_type) {
      maxScore += w.listing_type;
      if (req.listing_type === 'both' || property.listing_type === req.listing_type) {
        score += w.listing_type;
      }
    }

    // Price match
    if (req.budget_min || req.budget_max) {
      maxScore += w.price;
      const price = property.price || 0;
      const min = req.budget_min || 0;
      const max = req.budget_max || Infinity;
      
      if (price >= min && price <= max) {
        score += w.price;
      } else if (price >= min * 0.85 && price <= max * 1.15) {
        score += w.price * 0.6;
      } else if (price >= min * 0.7 && price <= max * 1.3) {
        score += w.price * 0.3;
      }
    }

    // Bedrooms match
    if (req.bedrooms_min || req.bedrooms_max) {
      maxScore += w.bedrooms;
      const beds = property.bedrooms || 0;
      const minBeds = req.bedrooms_min || 0;
      const maxBeds = req.bedrooms_max || Infinity;
      
      if (beds >= minBeds && beds <= maxBeds) {
        score += w.bedrooms;
      } else if (beds >= minBeds - 1 && beds <= maxBeds + 1) {
        score += w.bedrooms * 0.5;
      }
    }

    // Bathrooms match
    if (req.bathrooms_min) {
      maxScore += w.bathrooms;
      if (property.bathrooms >= req.bathrooms_min) {
        score += w.bathrooms;
      } else if (property.bathrooms >= req.bathrooms_min - 1) {
        score += w.bathrooms * 0.5;
      }
    }

    // Area match
    if (req.area_min || req.area_max) {
      maxScore += w.area;
      const area = property.useful_area || property.square_feet || 0;
      const minArea = req.area_min || 0;
      const maxArea = req.area_max || Infinity;
      
      if (area >= minArea && area <= maxArea) {
        score += w.area;
      } else if (area >= minArea * 0.85) {
        score += w.area * 0.5;
      }
    }

    // Property type match
    if (req.property_types?.length > 0) {
      maxScore += w.property_type;
      if (req.property_types.includes(property.property_type)) {
        score += w.property_type;
      }
    }

    // Amenities match
    if (req.desired_amenities?.length > 0 && property.amenities?.length > 0) {
      maxScore += w.amenities;
      const matchCount = req.desired_amenities.filter(a => 
        property.amenities.some(pa => pa.toLowerCase().includes(a.toLowerCase()))
      ).length;
      const matchRatio = matchCount / req.desired_amenities.length;
      score += w.amenities * matchRatio;
    }

    // Featured bonus
    if (property.featured) {
      score += 5;
    }

    // Favorite bonus
    if (favoriteIds.includes(property.id)) {
      score += 10;
    }

    return maxScore > 0 ? Math.min(100, Math.round((score / maxScore) * 100)) : 50;
  };

  const handleAutoMatch = () => {
    if (!req || Object.keys(req).length === 0) {
      toast.error("Defina primeiro os requisitos do cliente");
      setActiveTab("requirements");
      return;
    }

    setAnalyzing(true);
    
    setTimeout(() => {
      let filtered = activeProperties.filter(p => !rejectedIds.includes(p.id));

      const scored = filtered.map(property => ({
        ...property,
        matchScore: calculateMatchScore(property),
        isFavorite: favoriteIds.includes(property.id)
      }));

      // Only include properties with score > 30
      let sorted = scored.filter(p => p.matchScore > 30);
      
      sorted = sorted.sort((a, b) => b.matchScore - a.matchScore);

      setMatchResults(sorted.slice(0, 30));
      setActiveTab("results");
      setAnalyzing(false);
      toast.success(`Encontrados ${sorted.length} imóveis compatíveis`);
    }, 300);
  };

  const handleAIMatch = async () => {
    if (!req || Object.keys(req).length === 0) {
      toast.error("Defina primeiro os requisitos do cliente");
      setActiveTab("requirements");
      return;
    }

    setAnalyzing(true);
    try {
      const prompt = `
        És um consultor imobiliário experiente. Analisa os seguintes imóveis e encontra os melhores matches.

        PERFIL DO CLIENTE:
        - Nome: ${contact?.full_name || "Cliente"}
        - Tipo de Negócio: ${req.listing_type === 'sale' ? 'Compra' : req.listing_type === 'rent' ? 'Arrendamento' : 'Ambos'}
        - Localizações: ${req.locations?.join(", ") || "Qualquer"}
        - Tipos de imóvel: ${req.property_types?.map(t => propertyTypeLabels[t]).join(", ") || "Qualquer"}
        - Orçamento: €${req.budget_min?.toLocaleString() || 0} - €${req.budget_max?.toLocaleString() || "sem limite"}
        - Quartos: ${req.bedrooms_min || "0"} a ${req.bedrooms_max || "sem limite"}
        - Área mínima: ${req.area_min || "Qualquer"}m²
        - Notas: ${req.additional_notes || "Nenhuma"}

        IMÓVEIS FAVORITOS DO CLIENTE: ${favoriteIds.length} imóveis
        IMÓVEIS REJEITADOS (excluir): ${rejectedIds.length} imóveis

        IMÓVEIS DISPONÍVEIS:
        ${activeProperties.filter(p => !rejectedIds.includes(p.id)).slice(0, 40).map(p => `
          ID: ${p.id}, Título: ${p.title}, Cidade: ${p.city}, Tipo: ${p.property_type}, Preço: €${p.price?.toLocaleString()}, Quartos: ${p.bedrooms || 'N/A'}, Área: ${p.useful_area || p.square_feet || 'N/A'}m², Favorito: ${favoriteIds.includes(p.id) ? 'Sim' : 'Não'}
        `).join('\n')}

        Retorna os melhores matches ordenados por compatibilidade. Inclui uma justificação breve para cada.
      `;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            matches: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  score: { type: "number" },
                  reason: { type: "string" }
                }
              }
            }
          }
        }
      });

      if (result.matches) {
        const aiMatches = result.matches.map(m => {
          const property = activeProperties.find(p => p.id === m.id);
          if (property) {
            return { 
              ...property, 
              matchScore: Math.min(100, m.score), 
              aiReason: m.reason,
              isFavorite: favoriteIds.includes(property.id)
            };
          }
          return null;
        }).filter(Boolean);
        
        setMatchResults(aiMatches);
        setActiveTab("results");
        toast.success(`IA encontrou ${aiMatches.length} matches`);
      }
    } catch (error) {
      toast.error("Erro na análise AI");
      handleAutoMatch();
    }
    setAnalyzing(false);
  };

  const togglePropertySelection = (propertyId) => {
    setSelectedProperties(prev => 
      prev.includes(propertyId) 
        ? prev.filter(id => id !== propertyId)
        : [...prev, propertyId]
    );
  };

  const handleFeedback = (propertyId, type) => {
    saveFeedbackMutation.mutate({
      contact_id: contact.id,
      property_id: propertyId,
      feedback_type: type
    }, {
      onSuccess: () => {
        toast.success(type === 'favorite' ? '💖 Adicionado aos favoritos' : '👎 Marcado como rejeitado');
        if (type === 'rejected') {
          setMatchResults(prev => prev.filter(p => p.id !== propertyId));
        } else {
          setMatchResults(prev => prev.map(p => 
            p.id === propertyId ? { ...p, isFavorite: true } : p
          ));
        }
      }
    });
  };

  const handleSaveForLater = async (property) => {
    setSavingForLater(property.id);
    try {
      const user = await base44.auth.me();
      await base44.entities.SentMatch.create({
        contact_id: contact.id,
        contact_name: contact.full_name,
        contact_email: contact.email,
        property_id: property.id,
        property_title: property.title,
        property_price: property.price,
        property_city: property.city,
        property_image: property.images?.[0] || null,
        match_score: property.matchScore || 50,
        compatibility_level: property.matchScore >= 80 ? 'excellent' : property.matchScore >= 60 ? 'good' : 'moderate',
        sent_date: new Date().toISOString(),
        sent_by: user?.email,
        client_response: 'saved',
        notes: 'Guardado para enviar mais tarde'
      });
      toast.success("Imóvel guardado para enviar mais tarde!");
      refetchSentMatches();
    } catch (error) {
      toast.error("Erro ao guardar");
    }
    setSavingForLater(null);
  };

  const handleSaveSearch = () => {
    if (!searchName.trim()) {
      toast.error("Introduza um nome para a pesquisa");
      return;
    }

    saveSearchMutation.mutate({
      contact_id: contact.id,
      contact_name: contact.full_name,
      contact_email: contact.email,
      name: searchName,
      criteria: req,
      alerts_enabled: alertsEnabled,
      alert_frequency: alertFrequency,
      matched_properties_sent: []
    });
  };

  const buildMessage = (selectedProps, template = null) => {
    const baseUrl = window.location.origin;
    
    if (template) {
      // Use template with variable replacement
      const propertiesList = selectedProps.map((p, idx) => {
        if (sendMethod === 'whatsapp') {
          return `*#${idx + 1} - ${p.title}* (${p.matchScore}% compatível)

📍 ${p.city}
💰 €${p.price?.toLocaleString()}${p.listing_type === 'rent' ? '/mês' : ''}
🏠 T${p.bedrooms || 0} | ${p.bathrooms || 0} WC | ${p.useful_area || p.square_feet || 'N/A'}m²
${p.aiReason ? `\n🎯 _${p.aiReason}_` : ''}
🔗 ${baseUrl}${createPageUrl("PropertyDetails")}?id=${p.id}`;
        } else {
          return `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#${idx + 1} - ${p.title} (Match: ${p.matchScore}%)

📍 Localização: ${p.city}${p.address ? `, ${p.address}` : ''}
💰 Preço: €${p.price?.toLocaleString()}${p.listing_type === 'rent' ? '/mês' : ''}
🏠 Tipologia: ${p.bedrooms ? `T${p.bedrooms}` : 'N/A'} | ${p.bathrooms || 'N/A'} WC
📏 Área: ${p.useful_area || p.square_feet || 'N/A'}m²
${p.amenities?.length ? `✨ Comodidades: ${p.amenities.slice(0, 5).join(', ')}` : ''}
${p.aiReason ? `\n🎯 Porque é ideal: ${p.aiReason}` : ''}
🔗 Ver imóvel: ${baseUrl}${createPageUrl("PropertyDetails")}?id=${p.id}`;
        }
      }).join(sendMethod === 'whatsapp' ? '\n---\n' : '\n');

      return template.content
        .replace(/{contact_name}/g, contact.full_name)
        .replace(/{property_count}/g, selectedProps.length)
        .replace(/{properties_list}/g, propertiesList);
    }

    // Default message
    const propertiesList = selectedProps.map((p, idx) => {
      if (sendMethod === 'whatsapp') {
        return `*#${idx + 1} - ${p.title}* (${p.matchScore}% compatível)

📍 ${p.city}
💰 €${p.price?.toLocaleString()}${p.listing_type === 'rent' ? '/mês' : ''}
🏠 T${p.bedrooms || 0} | ${p.bathrooms || 0} WC | ${p.useful_area || p.square_feet || 'N/A'}m²
${p.aiReason ? `\n🎯 _${p.aiReason}_` : ''}
🔗 ${baseUrl}${createPageUrl("PropertyDetails")}?id=${p.id}`;
      } else {
        return `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#${idx + 1} - ${p.title} (Match: ${p.matchScore}%)

📍 Localização: ${p.city}${p.address ? `, ${p.address}` : ''}
💰 Preço: €${p.price?.toLocaleString()}${p.listing_type === 'rent' ? '/mês' : ''}
🏠 Tipologia: ${p.bedrooms ? `T${p.bedrooms}` : 'N/A'} | ${p.bathrooms || 'N/A'} WC
📏 Área: ${p.useful_area || p.square_feet || 'N/A'}m²
${p.amenities?.length ? `✨ Comodidades: ${p.amenities.slice(0, 5).join(', ')}` : ''}
${p.aiReason ? `\n🎯 Porque é ideal: ${p.aiReason}` : ''}
🔗 Ver imóvel: ${baseUrl}${createPageUrl("PropertyDetails")}?id=${p.id}`;
      }
    }).join(sendMethod === 'whatsapp' ? '\n---\n' : '\n');

    if (sendMethod === 'whatsapp') {
      return `Olá ${contact.full_name}! 👋

Encontrei ${selectedProps.length} imóvel(is) perfeitos para si:

${propertiesList}

Quer agendar visitas? Responda aqui! 😊`;
    } else {
      return `Olá ${contact.full_name},

Encontrámos ${selectedProps.length} imóvel(is) que correspondem perfeitamente aos seus critérios:

${propertiesList}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Entre em contacto connosco para agendar visitas ou obter mais informações.

Cumprimentos,
Zugruppe - Privileged Approach`;
    }
  };

  const handlePreviewMessage = () => {
    if (selectedProperties.length === 0) {
      toast.error("Selecione pelo menos um imóvel");
      return;
    }

    const selectedProps = matchResults.filter(p => selectedProperties.includes(p.id));
    
    // Get default template if exists
    const defaultTemplate = messageTemplates.find(t => 
      t.type === sendMethod && t.is_default && t.category === 'matching'
    );
    
    const message = buildMessage(selectedProps, defaultTemplate);
    const subject = defaultTemplate?.subject || `🏠 ${selectedProps.length} Imóveis Selecionados Para Si`;
    
    setPreviewMessage(message);
    setPreviewSubject(subject);
    setPreviewDialogOpen(true);
  };

  const handleSendMatches = async () => {
    if (selectedProperties.length === 0) {
      toast.error("Selecione pelo menos um imóvel");
      return;
    }

    const selectedProps = matchResults.filter(p => selectedProperties.includes(p.id));
    const user = await base44.auth.me();

    if (sendMethod === 'email') {
      if (!contact.email) {
        toast.error("Contacto não tem email");
        return;
      }

      setSendingEmail(true);
      try {
        await base44.integrations.Core.SendEmail({
          to: contact.email,
          subject: previewSubject,
          body: previewMessage
        });

        // Create SentMatch records
        for (const prop of selectedProps) {
          await base44.entities.SentMatch.create({
            contact_id: contact.id,
            contact_name: contact.full_name,
            contact_email: contact.email,
            property_id: prop.id,
            property_title: prop.title,
            property_price: prop.price,
            property_city: prop.city,
            property_image: prop.images?.[0] || null,
            match_score: prop.matchScore || 50,
            compatibility_level: prop.matchScore >= 80 ? 'excellent' : prop.matchScore >= 60 ? 'good' : 'moderate',
            sales_pitch: prop.aiReason || '',
            sent_date: new Date().toISOString(),
            sent_by: user?.email,
            client_response: 'pending'
          });
        }

        toast.success(`Email enviado para ${contact.email}`);
        setSelectedProperties([]);

        await base44.entities.CommunicationLog.create({
          contact_id: contact.id,
          contact_name: contact.full_name,
          communication_type: 'email',
          direction: 'outbound',
          subject: `Envio de ${selectedProps.length} imóveis por matching IA`,
          summary: `Enviados ${selectedProps.length} imóveis por email com scores de ${selectedProps[0].matchScore}% a ${selectedProps[selectedProps.length - 1].matchScore}%`,
          outcome: 'successful',
          communication_date: new Date().toISOString()
        });
        
        queryClient.invalidateQueries({ queryKey: ['communicationLogs', 'sentMatches'] });

      } catch (error) {
        toast.error("Erro ao enviar email");
      }
      setSendingEmail(false);

    } else if (sendMethod === 'whatsapp') {
      if (!contact.phone) {
        toast.error("Contacto não tem telefone");
        return;
      }

      setSendingWhatsApp(true);
      try {
        const whatsappUrl = `https://wa.me/${contact.phone.replace(/\D/g, '')}?text=${encodeURIComponent(previewMessage)}`;
        window.open(whatsappUrl, '_blank');

        // Create SentMatch records
        for (const prop of selectedProps) {
          await base44.entities.SentMatch.create({
            contact_id: contact.id,
            contact_name: contact.full_name,
            contact_email: contact.email,
            property_id: prop.id,
            property_title: prop.title,
            property_price: prop.price,
            property_city: prop.city,
            property_image: prop.images?.[0] || null,
            match_score: prop.matchScore || 50,
            compatibility_level: prop.matchScore >= 80 ? 'excellent' : prop.matchScore >= 60 ? 'good' : 'moderate',
            sales_pitch: prop.aiReason || '',
            sent_date: new Date().toISOString(),
            sent_by: user?.email,
            client_response: 'pending'
          });
        }

        await base44.entities.CommunicationLog.create({
          contact_id: contact.id,
          contact_name: contact.full_name,
          communication_type: 'whatsapp',
          direction: 'outbound',
          subject: `Envio de ${selectedProps.length} imóveis via WhatsApp`,
          summary: `Enviados ${selectedProps.length} imóveis por WhatsApp`,
          outcome: 'successful',
          communication_date: new Date().toISOString()
        });

        toast.success("WhatsApp aberto com mensagem!");
        setSelectedProperties([]);
        queryClient.invalidateQueries({ queryKey: ['communicationLogs', 'sentMatches'] });

      } catch (error) {
        toast.error("Erro ao preparar WhatsApp");
      }
      setSendingWhatsApp(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return "text-green-600 bg-green-100 border-green-200";
    if (score >= 60) return "text-blue-600 bg-blue-100 border-blue-200";
    if (score >= 40) return "text-amber-600 bg-amber-100 border-amber-200";
    return "text-slate-600 bg-slate-100 border-slate-200";
  };

  const getScoreLabel = (score) => {
    if (score >= 80) return "Excelente";
    if (score >= 60) return "Bom";
    if (score >= 40) return "Regular";
    return "Baixo";
  };

  const hasRequirements = req && (req.listing_type || req.locations?.length || req.budget_min || req.budget_max || req.property_types?.length);

  // Get favorite properties
  const favoriteProperties = activeProperties.filter(p => favoriteIds.includes(p.id));

  return (
    <div className="space-y-4">
      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-2">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-blue-700">{activeProperties.length}</div>
            <div className="text-xs text-blue-600">Disponíveis</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-green-700">{matchResults.length}</div>
            <div className="text-xs text-green-600">Matches</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-pink-50 to-pink-100 border-pink-200">
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-pink-700">{favoriteIds.length}</div>
            <div className="text-xs text-pink-600">Favoritos</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-purple-700">{savedSearches.length}</div>
            <div className="text-xs text-purple-600">Pesquisas</div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <Button 
            onClick={handleAutoMatch} 
            disabled={analyzing || !hasRequirements}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            <Zap className="w-4 h-4 mr-2" />
            {analyzing ? "A analisar..." : "Match Automático"}
          </Button>
          <Button 
            onClick={handleAIMatch} 
            disabled={analyzing || !hasRequirements}
            variant="outline"
            className="flex-1 border-purple-300 text-purple-700 hover:bg-purple-50"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {analyzing ? "..." : "Match IA"}
          </Button>
        </div>
        
        <div className="flex gap-2">
          <Button 
            onClick={() => setWeightsDialogOpen(true)}
            variant="outline"
            size="sm"
            className="flex-1"
          >
            <Settings className="w-3 h-3 mr-2" />
            Ponderação{customWeights ? `: ${customWeights.name}` : ''}
          </Button>
          <Button 
            onClick={() => setTemplatesDialogOpen(true)}
            variant="outline"
            size="sm"
            className="flex-1"
          >
            <FileText className="w-3 h-3 mr-2" />
            Templates
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="requirements" className="text-xs">
            <Target className="w-3 h-3 mr-1" />
            Requisitos
          </TabsTrigger>
          <TabsTrigger value="results" className="text-xs">
            <TrendingUp className="w-3 h-3 mr-1" />
            Resultados
          </TabsTrigger>
          <TabsTrigger value="favorites" className="text-xs">
            <Heart className="w-3 h-3 mr-1" />
            Favoritos
          </TabsTrigger>
          <TabsTrigger value="searches" className="text-xs">
            <Bookmark className="w-3 h-3 mr-1" />
            Guardados
          </TabsTrigger>
        </TabsList>

        {/* Requirements Tab */}
        <TabsContent value="requirements" className="mt-4">
          <ContactRequirements 
            contact={contact} 
            onUpdate={(updatedContact) => {
              queryClient.invalidateQueries({ queryKey: ['clientContacts'] });
              // Force re-fetch to get latest data
              queryClient.refetchQueries({ queryKey: ['clientContacts'] });
            }}
          />
        </TabsContent>

        {/* Results Tab */}
        <TabsContent value="results" className="mt-4 space-y-3">
          {/* Selected Actions */}
          {selectedProperties.length > 0 && (
            <Card className="border-green-300 bg-green-50">
              <CardContent className="p-3">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-green-800">
                      {selectedProperties.length} selecionado(s)
                    </span>
                    <Button variant="outline" size="sm" onClick={() => setSelectedProperties([])}>
                      Limpar
                    </Button>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Select value={sendMethod} onValueChange={setSendMethod}>
                      <SelectTrigger className="w-32 h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">
                          <Mail className="w-4 h-4 inline mr-2" />
                          Email
                        </SelectItem>
                        <SelectItem value="whatsapp">
                          <MessageCircle className="w-4 h-4 inline mr-2" />
                          WhatsApp
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Button 
                      onClick={handlePreviewMessage}
                      disabled={sendingEmail || sendingWhatsApp}
                      size="sm"
                      className={`flex-1 ${sendMethod === 'whatsapp' ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Pré-visualizar e Enviar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Results Header */}
          {matchResults.length > 0 && (
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-slate-900">
                {matchResults.length} imóveis encontrados
              </h4>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={handleAutoMatch}>
                  <RefreshCw className="w-4 h-4" />
                </Button>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-32 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="score">Melhor Match</SelectItem>
                    <SelectItem value="price_asc">Preço ↑</SelectItem>
                    <SelectItem value="price_desc">Preço ↓</SelectItem>
                    <SelectItem value="date">Recentes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Property Results */}
          {matchResults.length > 0 ? (
            <div className="space-y-3">
              {matchResults
                .sort((a, b) => {
                  if (sortBy === "score") return b.matchScore - a.matchScore;
                  if (sortBy === "price_asc") return (a.price || 0) - (b.price || 0);
                  if (sortBy === "price_desc") return (b.price || 0) - (a.price || 0);
                  return new Date(b.created_date) - new Date(a.created_date);
                })
                .map((property) => {
                  const isSelected = selectedProperties.includes(property.id);
                  
                  return (
                    <Card 
                      key={property.id} 
                      className={`overflow-hidden transition-all ${
                        isSelected ? 'ring-2 ring-green-500 bg-green-50/50' : 'hover:shadow-md'
                      } ${property.isFavorite ? 'border-pink-300' : ''}`}
                    >
                      <CardContent className="p-0">
                        <div className="flex">
                          {/* Image */}
                          <div 
                            className="w-32 h-28 relative cursor-pointer flex-shrink-0"
                            onClick={() => togglePropertySelection(property.id)}
                          >
                            {property.images?.[0] ? (
                              <img 
                                src={property.images[0]} 
                                alt={property.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                                <Home className="w-8 h-8 text-slate-300" />
                              </div>
                            )}
                            
                            {isSelected && (
                              <div className="absolute inset-0 bg-green-500/30 flex items-center justify-center">
                                <Check className="w-8 h-8 text-white" />
                              </div>
                            )}

                            {property.isFavorite && (
                              <div className="absolute top-2 left-2">
                                <Heart className="w-5 h-5 text-pink-500 fill-pink-500 drop-shadow" />
                              </div>
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 p-3">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-slate-900 line-clamp-1">{property.title}</h4>
                                <div className="flex items-center gap-1 text-sm text-slate-600">
                                  <MapPin className="w-3 h-3" />
                                  {property.city}
                                </div>
                              </div>
                              <div className="text-right flex-shrink-0 ml-2">
                                <div className="font-bold text-slate-900">
                                  €{property.price?.toLocaleString()}
                                  {property.listing_type === 'rent' && <span className="text-xs font-normal">/mês</span>}
                                </div>
                                <Badge className={`${getScoreColor(property.matchScore)} border text-xs`}>
                                  {property.matchScore}% - {getScoreLabel(property.matchScore)}
                                </Badge>
                              </div>
                            </div>

                            {/* Details */}
                            <div className="flex items-center gap-3 text-sm text-slate-600 mb-2">
                              {property.bedrooms && (
                                <span className="flex items-center gap-1">
                                  <Bed className="w-4 h-4" />
                                  T{property.bedrooms}
                                </span>
                              )}
                              {property.bathrooms && (
                                <span className="flex items-center gap-1">
                                  <Bath className="w-4 h-4" />
                                  {property.bathrooms}
                                </span>
                              )}
                              {(property.useful_area || property.square_feet) && (
                                <span className="flex items-center gap-1">
                                  <Square className="w-4 h-4" />
                                  {property.useful_area || property.square_feet}m²
                                </span>
                              )}
                              <Badge variant="outline" className="text-xs">
                                {propertyTypeLabels[property.property_type] || property.property_type}
                              </Badge>
                            </div>

                            {property.aiReason && (
                              <p className="text-xs text-purple-600 bg-purple-50 rounded px-2 py-1 mb-2">
                                ✨ {property.aiReason}
                              </p>
                            )}

                            {/* Actions */}
                            <div className="flex items-center gap-2">
                              <Button 
                                variant={isSelected ? "default" : "outline"}
                                size="sm" 
                                className="h-7 text-xs"
                                onClick={() => togglePropertySelection(property.id)}
                              >
                                <Check className="w-3 h-3 mr-1" />
                                {isSelected ? "Selecionado" : "Selecionar"}
                              </Button>
                              
                              <a 
                                href={`${createPageUrl("PropertyDetails")}?id=${property.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Button variant="outline" size="sm" className="h-7 text-xs">
                                  <Eye className="w-3 h-3 mr-1" />
                                  Ver
                                </Button>
                              </a>

                              <div className="flex items-center gap-1 ml-auto">
                                {/* Save for later */}
                                {savedForLaterIds.includes(property.id) ? (
                                  <Badge variant="outline" className="text-xs text-amber-600 border-amber-300 h-7">
                                    <Bookmark className="w-3 h-3 mr-1 fill-amber-500" />
                                    Guardado
                                  </Badge>
                                ) : alreadySentIds.includes(property.id) ? (
                                  <Badge variant="outline" className="text-xs text-green-600 border-green-300 h-7">
                                    <Check className="w-3 h-3 mr-1" />
                                    Enviado
                                  </Badge>
                                ) : (
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-7 px-2 text-amber-600 hover:bg-amber-50"
                                    onClick={() => handleSaveForLater(property)}
                                    disabled={savingForLater === property.id}
                                  >
                                    {savingForLater === property.id ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <>
                                        <Bookmark className="w-4 h-4 mr-1" />
                                        <span className="text-xs">Guardar</span>
                                      </>
                                    )}
                                  </Button>
                                )}
                                {!property.isFavorite && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-7 w-7 p-0 text-pink-500 hover:bg-pink-50"
                                    onClick={() => handleFeedback(property.id, 'favorite')}
                                  >
                                    <Heart className="w-4 h-4" />
                                  </Button>
                                )}
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-7 w-7 p-0 text-slate-400 hover:bg-red-50 hover:text-red-500"
                                  onClick={() => handleFeedback(property.id, 'rejected')}
                                >
                                  <ThumbsDown className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          ) : (
            <Card className="text-center py-8">
              <CardContent>
                <Search className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="font-semibold text-slate-900 mb-1">Sem resultados</h3>
                <p className="text-sm text-slate-600 mb-4">
                  {hasRequirements 
                    ? "Clique em 'Match Automático' para encontrar imóveis" 
                    : "Defina os requisitos do cliente primeiro"}
                </p>
                {!hasRequirements && (
                  <Button variant="outline" onClick={() => setActiveTab("requirements")}>
                    <Target className="w-4 h-4 mr-2" />
                    Definir Requisitos
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Favorites Tab */}
        <TabsContent value="favorites" className="mt-4">
          <div className="mb-4">
            <Button 
              onClick={() => setAddPropertyDialogOpen(true)}
              className="w-full bg-amber-500 hover:bg-amber-600"
            >
              <Star className="w-4 h-4 mr-2" />
              Adicionar Imóvel Eleito Manualmente
            </Button>
          </div>
          
          {favoriteProperties.length > 0 ? (
            <div className="space-y-3">
              {favoriteProperties.map((property) => (
                <Card key={property.id} className="border-pink-200 bg-pink-50/30">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      {property.images?.[0] ? (
                        <img 
                          src={property.images[0]} 
                          alt={property.title}
                          className="w-16 h-16 object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center">
                          <Home className="w-6 h-6 text-slate-300" />
                        </div>
                      )}
                      <div className="flex-1">
                        <h4 className="font-semibold text-slate-900">{property.title}</h4>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <MapPin className="w-3 h-3" />
                          {property.city}
                          <span className="font-medium">€{property.price?.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                          {property.bedrooms && <span>T{property.bedrooms}</span>}
                          {property.useful_area && <span>• {property.useful_area}m²</span>}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <a 
                          href={`${createPageUrl("PropertyDetails")}?id=${property.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button variant="outline" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </a>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="text-red-500 hover:bg-red-50"
                          onClick={() => handleFeedback(property.id, 'rejected')}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="text-center py-8">
              <CardContent>
                <Star className="w-12 h-12 text-amber-200 mx-auto mb-3" />
                <h3 className="font-semibold text-slate-900 mb-1">Sem imóveis eleitos</h3>
                <p className="text-sm text-slate-600">
                  Adicione imóveis eleitos manualmente ou marque durante a pesquisa
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Saved Searches Tab */}
        <TabsContent value="searches" className="mt-4 space-y-3">
          {/* Saved Properties for Later */}
          {savedForLaterIds.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold text-amber-800 flex items-center gap-2">
                <Bookmark className="w-4 h-4" />
                Imóveis Guardados para Enviar ({savedForLaterIds.length})
              </h4>
              {sentMatches.filter(sm => sm.client_response === 'saved').map(match => {
                const property = activeProperties.find(p => p.id === match.property_id);
                return (
                  <Card key={match.id} className="border-amber-200 bg-amber-50/30">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        {match.property_image ? (
                          <img 
                            src={match.property_image} 
                            alt={match.property_title}
                            className="w-16 h-16 object-cover rounded-lg"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center">
                            <Home className="w-6 h-6 text-slate-300" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-slate-900 truncate">{match.property_title}</h4>
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <MapPin className="w-3 h-3" />
                            {match.property_city}
                            <span className="font-medium">€{match.property_price?.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={`${getScoreColor(match.match_score)} border text-xs`}>
                              {match.match_score}%
                            </Badge>
                            <span className="text-xs text-slate-500">
                              Guardado em {new Date(match.sent_date).toLocaleDateString('pt-PT')}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <a 
                            href={`${createPageUrl("PropertyDetails")}?id=${match.property_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button variant="outline" size="sm" className="h-8">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </a>
                          {property && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-8 text-green-600 hover:bg-green-50"
                              onClick={() => {
                                setSelectedProperties([match.property_id]);
                                setMatchResults([{ ...property, matchScore: match.match_score }]);
                                setActiveTab("results");
                              }}
                            >
                              <Send className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Saved Searches Section */}
          <div className="pt-4 border-t">
            <Button 
              variant="outline" 
              className="w-full mb-3"
              onClick={() => setSaveSearchDialogOpen(true)}
              disabled={!hasRequirements}
            >
              <Save className="w-4 h-4 mr-2" />
              Guardar Pesquisa Atual
            </Button>

            {savedSearches.length > 0 ? (
              <div className="space-y-2">
                <h4 className="font-semibold text-purple-800 flex items-center gap-2">
                  <Search className="w-4 h-4" />
                  Pesquisas Guardadas ({savedSearches.length})
                </h4>
                {savedSearches.map(search => (
                  <Card key={search.id} className="border-purple-200">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-slate-900">{search.name}</h4>
                          <p className="text-xs text-slate-500">
                            Criado em {new Date(search.created_date).toLocaleDateString('pt-PT')}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`h-8 w-8 p-0 ${search.alerts_enabled ? 'text-amber-500' : 'text-slate-400'}`}
                            onClick={() => toggleAlertMutation.mutate({ id: search.id, enabled: !search.alerts_enabled })}
                          >
                            {search.alerts_enabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-red-400 hover:text-red-600"
                            onClick={() => deleteSearchMutation.mutate(search.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : savedForLaterIds.length === 0 && (
              <Card className="text-center py-6">
                <CardContent>
                  <Bookmark className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-600">Nenhum item guardado</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Message Preview Dialog */}
      <MessagePreviewDialog
        open={previewDialogOpen}
        onOpenChange={setPreviewDialogOpen}
        sendMethod={sendMethod}
        contact={contact}
        properties={matchResults.filter(p => selectedProperties.includes(p.id))}
        message={previewMessage}
        subject={previewSubject}
        onConfirmSend={handleSendMatches}
      />

      {/* Message Templates Manager */}
      <MessageTemplatesManager
        open={templatesDialogOpen}
        onOpenChange={setTemplatesDialogOpen}
        onSelectTemplate={(template) => {
          const selectedProps = matchResults.filter(p => selectedProperties.includes(p.id));
          if (selectedProps.length > 0) {
            const message = buildMessage(selectedProps, template);
            setPreviewMessage(message);
            setPreviewSubject(template.subject || `🏠 ${selectedProps.length} Imóveis`);
            toast.success(`Template "${template.name}" aplicado`);
          }
        }}
      />

      {/* Matching Weights Config */}
      <MatchingWeightsConfig
        open={weightsDialogOpen}
        onOpenChange={setWeightsDialogOpen}
        onSelectWeights={(weights) => {
          setCustomWeights(weights);
          toast.success(`Ponderação "${weights.name}" aplicada`);
          // Recalculate matches with new weights
          if (matchResults.length > 0) {
            const recalculated = matchResults.map(p => ({
              ...p,
              matchScore: calculateMatchScore(p, weights.weights)
            })).sort((a, b) => b.matchScore - a.matchScore);
            setMatchResults(recalculated);
          }
        }}
      />

      {/* Add Elected Property Dialog */}
      <Dialog open={addPropertyDialogOpen} onOpenChange={setAddPropertyDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500" />
              Adicionar Imóvel Eleito
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                value={propertySearch}
                onChange={(e) => setPropertySearch(e.target.value)}
                placeholder="Pesquisar por título, cidade, referência..."
                className="pl-10"
              />
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {activeProperties
                .filter(p => {
                  if (!propertySearch) return true;
                  const search = propertySearch.toLowerCase();
                  return (
                    p.title?.toLowerCase().includes(search) ||
                    p.city?.toLowerCase().includes(search) ||
                    p.ref_id?.toLowerCase().includes(search) ||
                    p.address?.toLowerCase().includes(search)
                  );
                })
                .slice(0, 20)
                .map(property => {
                  const isAlreadyFavorite = favoriteIds.includes(property.id);
                  const isAlreadySent = alreadySentIds.includes(property.id);
                  
                  return (
                    <Card 
                      key={property.id} 
                      className={`cursor-pointer hover:shadow-md transition-shadow ${
                        isAlreadyFavorite ? 'border-pink-300 bg-pink-50/50' : ''
                      }`}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center gap-3">
                          {property.images?.[0] ? (
                            <img 
                              src={property.images[0]} 
                              alt={property.title}
                              className="w-20 h-16 object-cover rounded-lg flex-shrink-0"
                            />
                          ) : (
                            <div className="w-20 h-16 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Home className="w-6 h-6 text-slate-300" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-slate-900 truncate">{property.title}</h4>
                              {property.ref_id && (
                                <Badge variant="outline" className="text-xs font-mono">{property.ref_id}</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <MapPin className="w-3 h-3" />
                              {property.city}
                              <span className="font-medium">€{property.price?.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                              {property.bedrooms && <span>T{property.bedrooms}</span>}
                              {property.useful_area && <span>• {property.useful_area}m²</span>}
                              <Badge variant="outline" className="text-xs">
                                {propertyTypeLabels[property.property_type] || property.property_type}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex flex-col gap-1">
                            {isAlreadyFavorite ? (
                              <Badge className="bg-pink-100 text-pink-700 border-pink-300">
                                <Heart className="w-3 h-3 mr-1 fill-pink-500" />
                                Eleito
                              </Badge>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => {
                                  setAddingPropertyId(property.id);
                                  handleFeedback(property.id, 'favorite');
                                  setTimeout(() => {
                                    setAddingPropertyId(null);
                                    toast.success(`"${property.title}" adicionado como imóvel eleito!`);
                                  }, 500);
                                }}
                                disabled={addingPropertyId === property.id}
                                className="bg-amber-500 hover:bg-amber-600"
                              >
                                {addingPropertyId === property.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <>
                                    <Star className="w-4 h-4 mr-1" />
                                    Eleger
                                  </>
                                )}
                              </Button>
                            )}
                            {isAlreadySent && (
                              <Badge variant="outline" className="text-xs text-green-600 border-green-300">
                                <Check className="w-3 h-3 mr-1" />
                                Enviado
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              
              {propertySearch && activeProperties.filter(p => {
                const search = propertySearch.toLowerCase();
                return (
                  p.title?.toLowerCase().includes(search) ||
                  p.city?.toLowerCase().includes(search) ||
                  p.ref_id?.toLowerCase().includes(search)
                );
              }).length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  <Search className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                  <p>Nenhum imóvel encontrado</p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t">
              <Button variant="outline" onClick={() => setAddPropertyDialogOpen(false)}>
                Fechar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Save Search Dialog */}
      <Dialog open={saveSearchDialogOpen} onOpenChange={setSaveSearchDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Guardar Pesquisa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Nome da Pesquisa</Label>
              <Input
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                placeholder="Ex: T3 Lisboa até 300k"
              />
            </div>

            <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
              <div className="flex items-center gap-2">
                <Checkbox 
                  id="enableAlerts"
                  checked={alertsEnabled}
                  onCheckedChange={setAlertsEnabled}
                />
                <Label htmlFor="enableAlerts" className="cursor-pointer">
                  <Bell className="w-4 h-4 inline mr-1 text-amber-600" />
                  Ativar alertas
                </Label>
              </div>
              {alertsEnabled && (
                <Select value={alertFrequency} onValueChange={setAlertFrequency}>
                  <SelectTrigger className="w-28 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="instant">Imediato</SelectItem>
                    <SelectItem value="daily">Diário</SelectItem>
                    <SelectItem value="weekly">Semanal</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>

            {alertsEnabled && contact?.email && (
              <p className="text-xs text-slate-600">
                <AlertCircle className="w-3 h-3 inline mr-1" />
                Alertas serão enviados para: {contact.email}
              </p>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setSaveSearchDialogOpen(false)} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={handleSaveSearch} className="flex-1" disabled={saveSearchMutation.isPending}>
                <Save className="w-4 h-4 mr-1" />
                {saveSearchMutation.isPending ? "..." : "Guardar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}