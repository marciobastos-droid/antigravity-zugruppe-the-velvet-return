import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, Loader2, AlertTriangle, CheckCircle2, 
  Copy, Trash2, Eye, MapPin, Euro, Bed, 
  Sparkles, RefreshCw, ChevronDown, ChevronUp,
  Building2, ExternalLink, Merge, Users, Mail, Phone
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function DuplicateChecker() {
  const [activeTab, setActiveTab] = React.useState("properties");
  const [analyzing, setAnalyzing] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [progressText, setProgressText] = React.useState("");
  const [duplicateGroups, setDuplicateGroups] = React.useState([]);
  const [expandedGroups, setExpandedGroups] = React.useState({});
  const [selectedForDeletion, setSelectedForDeletion] = React.useState([]);
  const [lastAnalysis, setLastAnalysis] = React.useState(null);

  const { data: properties = [], isLoading: loadingProperties, refetch: refetchProperties } = useQuery({
    queryKey: ['properties-duplicates'],
    queryFn: () => base44.entities.Property.list('-created_date')
  });

  const { data: contacts = [], isLoading: loadingContacts, refetch: refetchContacts } = useQuery({
    queryKey: ['contacts-duplicates'],
    queryFn: () => base44.entities.ClientContact.list('-created_date')
  });

  const [contactDuplicateGroups, setContactDuplicateGroups] = React.useState([]);
  const [selectedContactsForDeletion, setSelectedContactsForDeletion] = React.useState([]);
  const [lastContactAnalysis, setLastContactAnalysis] = React.useState(null);
  const [analyzingContacts, setAnalyzingContacts] = React.useState(false);
  const [contactProgress, setContactProgress] = React.useState(0);
  const [contactProgressText, setContactProgressText] = React.useState("");
  const [expandedContactGroups, setExpandedContactGroups] = React.useState({});

  // Normalize text for comparison
  const normalizeText = (text) => {
    if (!text) return "";
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove accents
      .replace(/[^a-z0-9\s]/g, "") // Remove special chars
      .replace(/\s+/g, " ")
      .trim();
  };

  // Calculate similarity between two strings (0-100)
  const calculateSimilarity = (str1, str2) => {
    const s1 = normalizeText(str1);
    const s2 = normalizeText(str2);
    if (!s1 || !s2) return 0;
    if (s1 === s2) return 100;
    
    const words1 = s1.split(" ");
    const words2 = s2.split(" ");
    const commonWords = words1.filter(w => words2.includes(w));
    return Math.round((commonWords.length * 2 / (words1.length + words2.length)) * 100);
  };

  // Check if two prices are similar (within percentage)
  const pricesAreSimilar = (p1, p2, threshold = 0.05) => {
    if (!p1 || !p2) return false;
    const diff = Math.abs(p1 - p2) / Math.max(p1, p2);
    return diff <= threshold;
  };

  // Check if two areas are similar
  const areasAreSimilar = (a1, a2, threshold = 0.1) => {
    if (!a1 || !a2) return false;
    const diff = Math.abs(a1 - a2) / Math.max(a1, a2);
    return diff <= threshold;
  };

  // Pre-filter to find potential duplicates based on multiple criteria
  const findPotentialDuplicatePairs = (properties) => {
    const pairs = [];
    const checked = new Set();

    for (let i = 0; i < properties.length; i++) {
      for (let j = i + 1; j < properties.length; j++) {
        const p1 = properties[i];
        const p2 = properties[j];
        const pairKey = `${p1.id}-${p2.id}`;
        if (checked.has(pairKey)) continue;
        checked.add(pairKey);

        let matchScore = 0;
        const matchReasons = [];

        // Check external_id (strongest indicator)
        if (p1.external_id && p2.external_id && p1.external_id === p2.external_id) {
          matchScore += 50;
          matchReasons.push("mesmo ID externo");
        }

        // Check source_url similarity
        if (p1.source_url && p2.source_url) {
          const url1 = p1.source_url.replace(/https?:\/\//, "").split("?")[0];
          const url2 = p2.source_url.replace(/https?:\/\//, "").split("?")[0];
          if (url1 === url2) {
            matchScore += 40;
            matchReasons.push("mesmo URL de origem");
          }
        }

        // Check exact price match
        if (p1.price && p2.price && p1.price === p2.price) {
          matchScore += 20;
          matchReasons.push("preço idêntico");
        } else if (pricesAreSimilar(p1.price, p2.price, 0.03)) {
          matchScore += 10;
          matchReasons.push("preço similar (±3%)");
        }

        // Check bedrooms and bathrooms
        if (p1.bedrooms === p2.bedrooms && p1.bedrooms > 0) {
          matchScore += 10;
          matchReasons.push("mesma tipologia");
        }
        if (p1.bathrooms === p2.bathrooms && p1.bathrooms > 0) {
          matchScore += 5;
        }

        // Check areas
        const area1 = p1.useful_area || p1.square_feet;
        const area2 = p2.useful_area || p2.square_feet;
        if (area1 && area2 && area1 === area2) {
          matchScore += 15;
          matchReasons.push("área idêntica");
        } else if (areasAreSimilar(area1, area2, 0.05)) {
          matchScore += 8;
          matchReasons.push("área similar (±5%)");
        }

        // Check city
        if (normalizeText(p1.city) === normalizeText(p2.city)) {
          matchScore += 10;
        }

        // Check address similarity
        const addressSim = calculateSimilarity(p1.address, p2.address);
        if (addressSim >= 80) {
          matchScore += 25;
          matchReasons.push("endereço muito similar");
        } else if (addressSim >= 50) {
          matchScore += 10;
          matchReasons.push("endereço parcialmente similar");
        }

        // Check title similarity
        const titleSim = calculateSimilarity(p1.title, p2.title);
        if (titleSim >= 70) {
          matchScore += 15;
          matchReasons.push("título similar");
        }

        // Check property type
        if (p1.property_type === p2.property_type) {
          matchScore += 5;
        }

        // Only consider pairs with score >= 40
        if (matchScore >= 40) {
          pairs.push({
            properties: [p1, p2],
            score: matchScore,
            reasons: matchReasons
          });
        }
      }
    }

    return pairs;
  };

  // Group overlapping pairs into clusters
  const clusterPairs = (pairs) => {
    const clusters = [];
    const propertyToCluster = new Map();

    pairs.sort((a, b) => b.score - a.score);

    for (const pair of pairs) {
      const [p1, p2] = pair.properties;
      const cluster1 = propertyToCluster.get(p1.id);
      const cluster2 = propertyToCluster.get(p2.id);

      if (cluster1 && cluster2 && cluster1 !== cluster2) {
        // Merge clusters
        cluster1.properties = [...new Set([...cluster1.properties, ...cluster2.properties])];
        cluster1.reasons = [...new Set([...cluster1.reasons, ...pair.reasons])];
        cluster1.minScore = Math.min(cluster1.minScore, pair.score);
        cluster2.properties.forEach(p => propertyToCluster.set(p.id, cluster1));
        const idx = clusters.indexOf(cluster2);
        if (idx > -1) clusters.splice(idx, 1);
      } else if (cluster1) {
        if (!cluster1.properties.find(p => p.id === p2.id)) {
          cluster1.properties.push(p2);
        }
        cluster1.reasons = [...new Set([...cluster1.reasons, ...pair.reasons])];
        cluster1.minScore = Math.min(cluster1.minScore, pair.score);
        propertyToCluster.set(p2.id, cluster1);
      } else if (cluster2) {
        if (!cluster2.properties.find(p => p.id === p1.id)) {
          cluster2.properties.push(p1);
        }
        cluster2.reasons = [...new Set([...cluster2.reasons, ...pair.reasons])];
        cluster2.minScore = Math.min(cluster2.minScore, pair.score);
        propertyToCluster.set(p1.id, cluster2);
      } else {
        const newCluster = {
          properties: [p1, p2],
          reasons: pair.reasons,
          minScore: pair.score
        };
        clusters.push(newCluster);
        propertyToCluster.set(p1.id, newCluster);
        propertyToCluster.set(p2.id, newCluster);
      }
    }

    return clusters;
  };

  const analyzeDuplicates = async () => {
    setAnalyzing(true);
    setProgress(0);
    setProgressText("A preparar análise...");
    setDuplicateGroups([]);
    setSelectedForDeletion([]);

    try {
      setProgressText("A analisar características dos imóveis...");
      setProgress(20);

      // Step 1: Find potential duplicate pairs using multiple criteria
      const pairs = findPotentialDuplicatePairs(properties);
      
      setProgress(40);
      setProgressText(`Encontrados ${pairs.length} pares potenciais...`);

      if (pairs.length === 0) {
        setDuplicateGroups([]);
        setLastAnalysis(new Date());
        toast.success("Nenhum duplicado potencial encontrado!");
        setAnalyzing(false);
        return;
      }

      // Step 2: Cluster overlapping pairs
      setProgress(50);
      setProgressText("A agrupar duplicados...");
      const clusters = clusterPairs(pairs);

      // Step 3: Use AI to verify high-confidence clusters
      setProgress(60);
      setProgressText(`A verificar ${clusters.length} grupos com IA...`);

      const confirmedDuplicates = [];
      
      for (let i = 0; i < clusters.length; i++) {
        const cluster = clusters[i];
        setProgress(60 + Math.round((i / clusters.length) * 30));

        // For very high score matches, skip AI verification
        if (cluster.minScore >= 80) {
          confirmedDuplicates.push({
            properties: cluster.properties.sort((a, b) => new Date(a.created_date) - new Date(b.created_date)),
            confidence: Math.min(99, cluster.minScore),
            reason: cluster.reasons.join(", ")
          });
          continue;
        }

        // Use AI to verify medium confidence matches
        const propertiesData = cluster.properties.map(p => ({
          id: p.id,
          ref_id: p.ref_id,
          title: p.title,
          address: p.address,
          city: p.city,
          state: p.state,
          price: p.price,
          bedrooms: p.bedrooms,
          bathrooms: p.bathrooms,
          square_feet: p.square_feet,
          useful_area: p.useful_area,
          gross_area: p.gross_area,
          external_id: p.external_id,
          source_url: p.source_url,
          description: p.description?.substring(0, 300)
        }));

        try {
          const result = await base44.integrations.Core.InvokeLLM({
            prompt: `Analisa RIGOROSAMENTE se estes imóveis são DUPLICADOS (o mesmo imóvel físico listado múltiplas vezes).

IMÓVEIS A ANALISAR:
${JSON.stringify(propertiesData, null, 2)}

INDICADORES PRÉ-DETETADOS: ${cluster.reasons.join(", ")}

CRITÉRIOS RIGOROSOS PARA CONFIRMAR DUPLICADO:
1. ENDEREÇO: Deve ser o mesmo local físico (mesmo que escrito diferente)
2. CARACTERÍSTICAS: Área, quartos e WCs devem coincidir ou ser muito próximos
3. PREÇO: Preços iguais ou muito próximos (< 5% diferença)
4. TIPO: Mesmo tipo de imóvel
5. DESCRIÇÃO: Descrições referindo o mesmo imóvel

NÃO SÃO DUPLICADOS se:
- Estão em andares/frações diferentes do mesmo prédio
- São imóveis similares mas em localizações diferentes
- Têm áreas significativamente diferentes (> 10%)
- São unidades diferentes de um empreendimento

Responde com confidence >= 85 APENAS se tens certeza que é o mesmo imóvel físico.`,
            response_json_schema: {
              type: "object",
              properties: {
                is_duplicate: { type: "boolean" },
                confidence: { type: "number" },
                reason: { type: "string" },
                duplicate_ids: { type: "array", items: { type: "string" } }
              }
            }
          });

          if (result.is_duplicate && result.confidence >= 80) {
            const duplicateProperties = result.duplicate_ids?.length > 0
              ? cluster.properties.filter(p => result.duplicate_ids.includes(p.id))
              : cluster.properties;

            if (duplicateProperties.length > 1) {
              confirmedDuplicates.push({
                properties: duplicateProperties.sort((a, b) => new Date(a.created_date) - new Date(b.created_date)),
                confidence: result.confidence,
                reason: result.reason || cluster.reasons.join(", ")
              });
            }
          }
        } catch (error) {
          console.error("Error verifying cluster:", error);
          // On error, only include very high score matches
          if (cluster.minScore >= 70) {
            confirmedDuplicates.push({
              properties: cluster.properties.sort((a, b) => new Date(a.created_date) - new Date(b.created_date)),
              confidence: cluster.minScore,
              reason: cluster.reasons.join(", ") + " (não verificado por IA)"
            });
          }
        }
      }

      setProgress(95);
      setProgressText("A finalizar análise...");

      // Remove any remaining overlaps
      const uniqueGroups = [];
      const usedIds = new Set();

      confirmedDuplicates
        .sort((a, b) => b.confidence - a.confidence)
        .forEach(group => {
          const newProperties = group.properties.filter(p => !usedIds.has(p.id));
          if (newProperties.length > 1) {
            uniqueGroups.push({
              ...group,
              properties: newProperties
            });
            newProperties.forEach(p => usedIds.add(p.id));
          }
        });

      setDuplicateGroups(uniqueGroups);
      setLastAnalysis(new Date());
      setProgress(100);

      if (uniqueGroups.length > 0) {
        const totalDuplicates = uniqueGroups.reduce((sum, g) => sum + g.properties.length - 1, 0);
        toast.warning(`Encontrados ${uniqueGroups.length} grupos com ${totalDuplicates} duplicados!`);
      } else {
        toast.success("Nenhum duplicado confirmado!");
      }

    } catch (error) {
      console.error("Error analyzing duplicates:", error);
      toast.error("Erro ao analisar duplicados");
    }

    setAnalyzing(false);
  };

  const toggleGroup = (index) => {
    setExpandedGroups(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const toggleSelection = (propertyId) => {
    setSelectedForDeletion(prev => 
      prev.includes(propertyId)
        ? prev.filter(id => id !== propertyId)
        : [...prev, propertyId]
    );
  };

  const selectAllExceptFirst = (group) => {
    const idsToSelect = group.properties.slice(1).map(p => p.id);
    setSelectedForDeletion(prev => {
      const newSelection = [...prev];
      idsToSelect.forEach(id => {
        if (!newSelection.includes(id)) {
          newSelection.push(id);
        }
      });
      return newSelection;
    });
  };

  const deleteSelected = async () => {
    if (selectedForDeletion.length === 0) {
      toast.error("Nenhum imóvel selecionado");
      return;
    }

    if (!window.confirm(`Tem certeza que deseja eliminar ${selectedForDeletion.length} imóvel(is)?`)) {
      return;
    }

    try {
      for (const id of selectedForDeletion) {
        await base44.entities.Property.delete(id);
      }
      toast.success(`${selectedForDeletion.length} imóveis eliminados!`);
      setSelectedForDeletion([]);
      refetchProperties();
      analyzeDuplicates();
    } catch (error) {
      toast.error("Erro ao eliminar imóveis");
    }
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

  // Contact duplicate analysis
  const findContactDuplicatePairs = (contacts) => {
    const pairs = [];
    const checked = new Set();

    for (let i = 0; i < contacts.length; i++) {
      for (let j = i + 1; j < contacts.length; j++) {
        const c1 = contacts[i];
        const c2 = contacts[j];
        const pairKey = `${c1.id}-${c2.id}`;
        if (checked.has(pairKey)) continue;
        checked.add(pairKey);

        let matchScore = 0;
        const matchReasons = [];

        // Check email (strongest indicator)
        if (c1.email && c2.email && normalizeText(c1.email) === normalizeText(c2.email)) {
          matchScore += 60;
          matchReasons.push("mesmo email");
        }

        // Check phone
        const phone1 = (c1.phone || "").replace(/\D/g, "");
        const phone2 = (c2.phone || "").replace(/\D/g, "");
        if (phone1 && phone2 && phone1.length >= 9 && phone2.length >= 9) {
          if (phone1 === phone2 || phone1.endsWith(phone2.slice(-9)) || phone2.endsWith(phone1.slice(-9))) {
            matchScore += 50;
            matchReasons.push("mesmo telefone");
          }
        }

        // Check secondary phone
        const secPhone1 = (c1.secondary_phone || "").replace(/\D/g, "");
        const secPhone2 = (c2.secondary_phone || "").replace(/\D/g, "");
        if (secPhone1 && secPhone2 && secPhone1.length >= 9 && secPhone2.length >= 9) {
          if (secPhone1 === secPhone2 || secPhone1.endsWith(secPhone2.slice(-9)) || secPhone2.endsWith(secPhone1.slice(-9))) {
            matchScore += 30;
            matchReasons.push("mesmo telefone secundário");
          }
        }

        // Cross-check phones
        if (phone1 && secPhone2 && (phone1 === secPhone2 || phone1.endsWith(secPhone2.slice(-9)))) {
          matchScore += 25;
          matchReasons.push("telefones cruzados");
        }
        if (phone2 && secPhone1 && (phone2 === secPhone1 || phone2.endsWith(secPhone1.slice(-9)))) {
          matchScore += 25;
          matchReasons.push("telefones cruzados");
        }

        // Check name similarity
        const nameSim = calculateSimilarity(c1.full_name, c2.full_name);
        if (nameSim >= 90) {
          matchScore += 30;
          matchReasons.push("nome idêntico");
        } else if (nameSim >= 70) {
          matchScore += 15;
          matchReasons.push("nome similar");
        }

        // Check NIF
        if (c1.nif && c2.nif && c1.nif === c2.nif) {
          matchScore += 60;
          matchReasons.push("mesmo NIF");
        }

        // Check company
        if (c1.company_name && c2.company_name) {
          const companySim = calculateSimilarity(c1.company_name, c2.company_name);
          if (companySim >= 80) {
            matchScore += 15;
            matchReasons.push("mesma empresa");
          }
        }

        if (matchScore >= 50) {
          pairs.push({
            contacts: [c1, c2],
            score: matchScore,
            reasons: matchReasons
          });
        }
      }
    }

    return pairs;
  };

  const clusterContactPairs = (pairs) => {
    const clusters = [];
    const contactToCluster = new Map();

    pairs.sort((a, b) => b.score - a.score);

    for (const pair of pairs) {
      const [c1, c2] = pair.contacts;
      const cluster1 = contactToCluster.get(c1.id);
      const cluster2 = contactToCluster.get(c2.id);

      if (cluster1 && cluster2 && cluster1 !== cluster2) {
        cluster1.contacts = [...new Set([...cluster1.contacts, ...cluster2.contacts])];
        cluster1.reasons = [...new Set([...cluster1.reasons, ...pair.reasons])];
        cluster1.minScore = Math.min(cluster1.minScore, pair.score);
        cluster2.contacts.forEach(c => contactToCluster.set(c.id, cluster1));
        const idx = clusters.indexOf(cluster2);
        if (idx > -1) clusters.splice(idx, 1);
      } else if (cluster1) {
        if (!cluster1.contacts.find(c => c.id === c2.id)) {
          cluster1.contacts.push(c2);
        }
        cluster1.reasons = [...new Set([...cluster1.reasons, ...pair.reasons])];
        cluster1.minScore = Math.min(cluster1.minScore, pair.score);
        contactToCluster.set(c2.id, cluster1);
      } else if (cluster2) {
        if (!cluster2.contacts.find(c => c.id === c1.id)) {
          cluster2.contacts.push(c1);
        }
        cluster2.reasons = [...new Set([...cluster2.reasons, ...pair.reasons])];
        cluster2.minScore = Math.min(cluster2.minScore, pair.score);
        contactToCluster.set(c1.id, cluster2);
      } else {
        const newCluster = {
          contacts: [c1, c2],
          reasons: pair.reasons,
          minScore: pair.score
        };
        clusters.push(newCluster);
        contactToCluster.set(c1.id, newCluster);
        contactToCluster.set(c2.id, newCluster);
      }
    }

    return clusters;
  };

  const analyzeContactDuplicates = async () => {
    setAnalyzingContacts(true);
    setContactProgress(0);
    setContactProgressText("A preparar análise de contactos...");
    setContactDuplicateGroups([]);
    setSelectedContactsForDeletion([]);

    try {
      setContactProgressText("A analisar contactos...");
      setContactProgress(30);

      const pairs = findContactDuplicatePairs(contacts);
      
      setContactProgress(50);
      setContactProgressText(`Encontrados ${pairs.length} pares potenciais...`);

      if (pairs.length === 0) {
        setContactDuplicateGroups([]);
        setLastContactAnalysis(new Date());
        toast.success("Nenhum contacto duplicado encontrado!");
        setAnalyzingContacts(false);
        return;
      }

      setContactProgress(70);
      setContactProgressText("A agrupar duplicados...");
      const clusters = clusterContactPairs(pairs);

      // Convert clusters to groups
      const confirmedDuplicates = clusters.map(cluster => ({
        contacts: cluster.contacts.sort((a, b) => new Date(a.created_date) - new Date(b.created_date)),
        confidence: Math.min(99, cluster.minScore),
        reason: cluster.reasons.join(", ")
      }));

      setContactProgress(90);
      setContactProgressText("A finalizar...");

      // Remove overlaps
      const uniqueGroups = [];
      const usedIds = new Set();

      confirmedDuplicates
        .sort((a, b) => b.confidence - a.confidence)
        .forEach(group => {
          const newContacts = group.contacts.filter(c => !usedIds.has(c.id));
          if (newContacts.length > 1) {
            uniqueGroups.push({
              ...group,
              contacts: newContacts
            });
            newContacts.forEach(c => usedIds.add(c.id));
          }
        });

      setContactDuplicateGroups(uniqueGroups);
      setLastContactAnalysis(new Date());
      setContactProgress(100);

      if (uniqueGroups.length > 0) {
        const totalDuplicates = uniqueGroups.reduce((sum, g) => sum + g.contacts.length - 1, 0);
        toast.warning(`Encontrados ${uniqueGroups.length} grupos com ${totalDuplicates} contactos duplicados!`);
      } else {
        toast.success("Nenhum contacto duplicado encontrado!");
      }

    } catch (error) {
      console.error("Error analyzing contact duplicates:", error);
      toast.error("Erro ao analisar contactos duplicados");
    }

    setAnalyzingContacts(false);
  };

  const toggleContactGroup = (index) => {
    setExpandedContactGroups(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const toggleContactSelection = (contactId) => {
    setSelectedContactsForDeletion(prev => 
      prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  const selectAllContactsExceptFirst = (group) => {
    const idsToSelect = group.contacts.slice(1).map(c => c.id);
    setSelectedContactsForDeletion(prev => {
      const newSelection = [...prev];
      idsToSelect.forEach(id => {
        if (!newSelection.includes(id)) {
          newSelection.push(id);
        }
      });
      return newSelection;
    });
  };

  const deleteSelectedContacts = async () => {
    if (selectedContactsForDeletion.length === 0) {
      toast.error("Nenhum contacto selecionado");
      return;
    }

    if (!window.confirm(`Tem certeza que deseja eliminar ${selectedContactsForDeletion.length} contacto(s)?`)) {
      return;
    }

    try {
      for (const id of selectedContactsForDeletion) {
        await base44.entities.ClientContact.delete(id);
      }
      toast.success(`${selectedContactsForDeletion.length} contactos eliminados!`);
      setSelectedContactsForDeletion([]);
      refetchContacts();
      analyzeContactDuplicates();
    } catch (error) {
      toast.error("Erro ao eliminar contactos");
    }
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 90) return "bg-red-100 text-red-800 border-red-200";
    if (confidence >= 80) return "bg-orange-100 text-orange-800 border-orange-200";
    return "bg-yellow-100 text-yellow-800 border-yellow-200";
  };

  const contactTypeLabels = {
    client: "Cliente",
    partner: "Parceiro",
    investor: "Investidor",
    vendor: "Fornecedor",
    other: "Outro"
  };

  const isLoading = loadingProperties || loadingContacts;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Sparkles className="w-5 h-5 text-purple-600" />
            </div>
            Verificador de Duplicados com IA
          </CardTitle>
          <p className="text-sm text-slate-600">
            Analisa automaticamente a base de dados para encontrar imóveis e contactos duplicados.
          </p>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="properties" className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Imóveis ({properties.length})
              </TabsTrigger>
              <TabsTrigger value="contacts" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Contactos ({contacts.length})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {activeTab === "properties" && (
        <React.Fragment>
          {/* Properties Analysis Card */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-slate-900">{properties.length}</div>
                    <div className="text-xs text-slate-600">Total de Imóveis</div>
                  </div>
                  {lastAnalysis && (
                    <div className="text-center">
                      <div className="text-3xl font-bold text-purple-600">{duplicateGroups.length}</div>
                      <div className="text-xs text-slate-600">Grupos Duplicados</div>
                    </div>
                  )}
                </div>
                
                <Button
                  onClick={analyzeDuplicates}
                  disabled={analyzing || properties.length === 0}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {analyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      A analisar...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4 mr-2" />
                      Analisar Imóveis
                    </>
                  )}
                </Button>
              </div>

              {analyzing && (
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">{progressText}</span>
                    <span className="font-medium">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              )}

              {lastAnalysis && (
                <p className="text-xs text-slate-500 mt-4">
                  Última análise: {lastAnalysis.toLocaleString('pt-PT')}
                </p>
              )}
            </CardContent>
          </Card>

      {/* Action Bar */}
      {selectedForDeletion.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <span className="font-medium text-red-900">
                  {selectedForDeletion.length} imóvel(is) selecionado(s) para eliminação
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedForDeletion([])}
                >
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={deleteSelected}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Eliminar Selecionados
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {duplicateGroups.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">
              Grupos de Duplicados Encontrados
            </h3>
            <Badge variant="outline" className="text-purple-600 border-purple-200">
              {duplicateGroups.reduce((sum, g) => sum + g.properties.length - 1, 0)} duplicados
            </Badge>
          </div>

          {duplicateGroups.map((group, index) => (
            <Card key={index} className="overflow-hidden">
              <div 
                className="p-4 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => toggleGroup(index)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg shadow-sm">
                      <Copy className="w-4 h-4 text-slate-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900">
                        Grupo #{index + 1} - {group.properties.length} imóveis
                      </h4>
                      <p className="text-sm text-slate-600">{group.reason}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={getConfidenceColor(group.confidence)}>
                      {group.confidence}% confiança
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); selectAllExceptFirst(group); }}
                    >
                      <Merge className="w-4 h-4 mr-1" />
                      Manter 1º
                    </Button>
                    {expandedGroups[index] ? (
                      <ChevronUp className="w-5 h-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                </div>
              </div>

              {expandedGroups[index] && (
                <CardContent className="p-4 border-t">
                  <div className="space-y-3">
                    {group.properties.map((property, pIndex) => (
                      <div 
                        key={property.id}
                        className={`flex items-start gap-4 p-3 rounded-lg border transition-colors ${
                          selectedForDeletion.includes(property.id)
                            ? 'bg-red-50 border-red-200'
                            : pIndex === 0
                            ? 'bg-green-50 border-green-200'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <Checkbox
                          checked={selectedForDeletion.includes(property.id)}
                          onCheckedChange={() => toggleSelection(property.id)}
                          className="mt-1"
                        />
                        
                        {/* Image */}
                        <div className="w-20 h-20 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                          {property.images?.[0] ? (
                            <img 
                              src={property.images[0]} 
                              alt={property.title}
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
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                {pIndex === 0 && (
                                  <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">
                                    Original
                                  </Badge>
                                )}
                                {property.ref_id && (
                                  <Badge variant="outline" className="text-xs">
                                    {property.ref_id}
                                  </Badge>
                                )}
                              </div>
                              <h5 className="font-medium text-slate-900 line-clamp-1 mt-1">
                                {property.title}
                              </h5>
                            </div>
                            <Link
                              to={`${createPageUrl("PropertyDetails")}?id=${property.id}`}
                              target="_blank"
                              className="p-1.5 hover:bg-slate-100 rounded"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink className="w-4 h-4 text-slate-400" />
                            </Link>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-slate-600">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5" />
                              {property.city}
                            </span>
                            <span className="flex items-center gap-1">
                              <Euro className="w-3.5 h-3.5" />
                              {property.price?.toLocaleString()}
                            </span>
                            {property.bedrooms > 0 && (
                              <span className="flex items-center gap-1">
                                <Bed className="w-3.5 h-3.5" />
                                T{property.bedrooms}
                              </span>
                            )}
                            <Badge variant="outline" className="text-xs">
                              {propertyTypeLabels[property.property_type] || property.property_type}
                            </Badge>
                          </div>

                          {property.external_id && (
                            <p className="text-xs text-slate-500 mt-1">
                              ID Externo: {property.external_id}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      ) : lastAnalysis && !analyzing ? (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-green-900 mb-2">
              Sem Duplicados Encontrados
            </h3>
            <p className="text-green-700">
              A sua base de dados está limpa! Não foram encontrados imóveis duplicados.
            </p>
          </CardContent>
        </Card>
      ) : !analyzing && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Search className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-700 mb-2">
              Pronto para Analisar
            </h3>
            <p className="text-slate-500 mb-4">
              Clique no botão acima para iniciar a análise de duplicados com IA.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Tips for Properties */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <h4 className="font-medium text-blue-900 mb-2">💡 Dicas - Imóveis</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• A IA analisa títulos, endereços, preços e características para identificar duplicados</li>
            <li>• O primeiro imóvel de cada grupo é marcado como "Original" - geralmente o mais antigo</li>
            <li>• Use "Manter 1º" para selecionar rapidamente todos os duplicados exceto o original</li>
            <li>• Revise sempre os resultados antes de eliminar - a IA pode errar em casos complexos</li>
          </ul>
        </CardContent>
      </Card>
        </React.Fragment>
      )}

      {activeTab === "contacts" && (
        <React.Fragment>
          {/* Contacts Analysis Card */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-slate-900">{contacts.length}</div>
                    <div className="text-xs text-slate-600">Total de Contactos</div>
                  </div>
                  {lastContactAnalysis && (
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600">{contactDuplicateGroups.length}</div>
                      <div className="text-xs text-slate-600">Grupos Duplicados</div>
                    </div>
                  )}
                </div>
                
                <Button
                  onClick={analyzeContactDuplicates}
                  disabled={analyzingContacts || contacts.length === 0}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {analyzingContacts ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      A analisar...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4 mr-2" />
                      Analisar Contactos
                    </>
                  )}
                </Button>
              </div>

              {analyzingContacts && (
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">{contactProgressText}</span>
                    <span className="font-medium">{contactProgress}%</span>
                  </div>
                  <Progress value={contactProgress} className="h-2" />
                </div>
              )}

              {lastContactAnalysis && (
                <p className="text-xs text-slate-500 mt-4">
                  Última análise: {lastContactAnalysis.toLocaleString('pt-PT')}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Contact Action Bar */}
          {selectedContactsForDeletion.length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    <span className="font-medium text-red-900">
                      {selectedContactsForDeletion.length} contacto(s) selecionado(s) para eliminação
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedContactsForDeletion([])}
                    >
                      Cancelar
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={deleteSelectedContacts}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Eliminar Selecionados
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Contact Results */}
          {contactDuplicateGroups.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">
                  Grupos de Contactos Duplicados
                </h3>
                <Badge variant="outline" className="text-green-600 border-green-200">
                  {contactDuplicateGroups.reduce((sum, g) => sum + g.contacts.length - 1, 0)} duplicados
                </Badge>
              </div>

              {contactDuplicateGroups.map((group, index) => (
                <Card key={index} className="overflow-hidden">
                  <div 
                    className="p-4 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => toggleContactGroup(index)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-lg shadow-sm">
                          <Users className="w-4 h-4 text-slate-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-900">
                            Grupo #{index + 1} - {group.contacts.length} contactos
                          </h4>
                          <p className="text-sm text-slate-600">{group.reason}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={getConfidenceColor(group.confidence)}>
                          {group.confidence}% confiança
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); selectAllContactsExceptFirst(group); }}
                        >
                          <Merge className="w-4 h-4 mr-1" />
                          Manter 1º
                        </Button>
                        {expandedContactGroups[index] ? (
                          <ChevronUp className="w-5 h-5 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                    </div>
                  </div>

                  {expandedContactGroups[index] && (
                    <CardContent className="p-4 border-t">
                      <div className="space-y-3">
                        {group.contacts.map((contact, cIndex) => (
                          <div 
                            key={contact.id}
                            className={`flex items-start gap-4 p-3 rounded-lg border transition-colors ${
                              selectedContactsForDeletion.includes(contact.id)
                                ? 'bg-red-50 border-red-200'
                                : cIndex === 0
                                ? 'bg-green-50 border-green-200'
                                : 'bg-white border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <Checkbox
                              checked={selectedContactsForDeletion.includes(contact.id)}
                              onCheckedChange={() => toggleContactSelection(contact.id)}
                              className="mt-1"
                            />
                            
                            {/* Avatar */}
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center flex-shrink-0">
                              <span className="text-lg font-semibold text-slate-600">
                                {contact.full_name?.[0]?.toUpperCase() || "?"}
                              </span>
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {cIndex === 0 && (
                                      <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">
                                        Original
                                      </Badge>
                                    )}
                                    {contact.ref_id && (
                                      <Badge variant="outline" className="text-xs">
                                        {contact.ref_id}
                                      </Badge>
                                    )}
                                    <Badge variant="outline" className="text-xs">
                                      {contactTypeLabels[contact.contact_type] || contact.contact_type}
                                    </Badge>
                                  </div>
                                  <h5 className="font-medium text-slate-900 mt-1">
                                    {contact.full_name}
                                  </h5>
                                </div>
                              </div>
                              
                              <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-slate-600">
                                {contact.email && (
                                  <span className="flex items-center gap-1">
                                    <Mail className="w-3.5 h-3.5" />
                                    {contact.email}
                                  </span>
                                )}
                                {contact.phone && (
                                  <span className="flex items-center gap-1">
                                    <Phone className="w-3.5 h-3.5" />
                                    {contact.phone}
                                  </span>
                                )}
                                {contact.city && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-3.5 h-3.5" />
                                    {contact.city}
                                  </span>
                                )}
                              </div>

                              {contact.company_name && (
                                <p className="text-xs text-slate-500 mt-1">
                                  Empresa: {contact.company_name}
                                </p>
                              )}
                              {contact.nif && (
                                <p className="text-xs text-slate-500">
                                  NIF: {contact.nif}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          ) : lastContactAnalysis && !analyzingContacts ? (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="py-12 text-center">
                <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-green-900 mb-2">
                  Sem Contactos Duplicados
                </h3>
                <p className="text-green-700">
                  A sua base de dados de contactos está limpa!
                </p>
              </CardContent>
            </Card>
          ) : !analyzingContacts && (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-700 mb-2">
                  Pronto para Analisar Contactos
                </h3>
                <p className="text-slate-500 mb-4">
                  Clique no botão acima para iniciar a análise de contactos duplicados.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Tips for Contacts */}
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4">
              <h4 className="font-medium text-green-900 mb-2">💡 Dicas - Contactos</h4>
              <ul className="text-sm text-green-800 space-y-1">
                <li>• A análise compara emails, telefones, nomes e NIFs para identificar duplicados</li>
                <li>• O primeiro contacto é marcado como "Original" - geralmente o mais antigo</li>
                <li>• Antes de eliminar, verifique se os contactos têm oportunidades ou histórico associado</li>
                <li>• Considere mesclar os dados manualmente antes de eliminar duplicados</li>
              </ul>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}