import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Upload, FileJson, Sparkles, Loader2, Check, AlertTriangle, 
  Download, Copy, FileText, Building2, Users, Target,
  Search, Tag, CheckCircle, XCircle
} from "lucide-react";
import { toast } from "sonner";

const processingTypes = [
  { 
    value: "extract", 
    label: "Extrair Dados", 
    description: "Extrai campos relevantes do JSON para importação",
    icon: Search
  },
  { 
    value: "summarize", 
    label: "Sumarizar", 
    description: "Analisa e resume o conteúdo do JSON",
    icon: FileText
  },
  { 
    value: "validate", 
    label: "Validar", 
    description: "Verifica consistência e erros nos dados",
    icon: CheckCircle
  },
  { 
    value: "categorize", 
    label: "Categorizar", 
    description: "Classifica e agrupa os registos",
    icon: Tag
  },
  { 
    value: "enrich", 
    label: "Enriquecer", 
    description: "Adiciona informação e normaliza dados",
    icon: Sparkles
  }
];

const targetEntities = [
  { value: "Property", label: "Imóveis", icon: Building2 },
  { value: "Contact", label: "Contactos", icon: Users },
  { value: "Opportunity", label: "Oportunidades", icon: Target }
];

export default function JSONProcessor() {
  const [jsonInput, setJsonInput] = useState("");
  const [processingType, setProcessingType] = useState("extract");
  const [targetEntity, setTargetEntity] = useState("Property");
  const [result, setResult] = useState(null);
  const [activeTab, setActiveTab] = useState("input");

  const processMutation = useMutation({
    mutationFn: async () => {
      let jsonData;
      try {
        jsonData = JSON.parse(jsonInput);
      } catch (e) {
        throw new Error("JSON inválido. Verifique a formatação.");
      }

      const response = await base44.functions.invoke('processJsonWithAI', {
        jsonData,
        processingType,
        targetEntity
      });

      return response.data;
    },
    onSuccess: (data) => {
      setResult(data);
      setActiveTab("result");
      toast.success("JSON processado com sucesso!");
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao processar JSON");
    }
  });

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target.result;
        // Validate JSON
        JSON.parse(content);
        setJsonInput(content);
        toast.success("Ficheiro carregado com sucesso");
      } catch (error) {
        toast.error("Ficheiro JSON inválido");
      }
    };
    reader.readAsText(file);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(result?.result, null, 2));
    toast.success("Copiado para a área de transferência");
  };

  const downloadResult = () => {
    const blob = new Blob([JSON.stringify(result?.result, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `processed_${processingType}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatJson = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      setJsonInput(JSON.stringify(parsed, null, 2));
    } catch (e) {
      toast.error("JSON inválido");
    }
  };

  const renderResultContent = () => {
    if (!result?.result) return null;

    const data = result.result;

    // Render based on processing type
    if (processingType === "validate") {
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            {data.is_valid ? (
              <Badge className="bg-green-100 text-green-800 text-lg px-4 py-2">
                <CheckCircle className="w-5 h-5 mr-2" />
                Dados Válidos
              </Badge>
            ) : (
              <Badge className="bg-red-100 text-red-800 text-lg px-4 py-2">
                <XCircle className="w-5 h-5 mr-2" />
                Problemas Encontrados
              </Badge>
            )}
          </div>

          {data.errors?.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>
                <strong>Erros ({data.errors.length}):</strong>
                <ul className="list-disc ml-4 mt-2">
                  {data.errors.map((err, i) => <li key={i}>{err}</li>)}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {data.warnings?.length > 0 && (
            <Alert>
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>
                <strong>Avisos ({data.warnings.length}):</strong>
                <ul className="list-disc ml-4 mt-2">
                  {data.warnings.map((warn, i) => <li key={i}>{warn}</li>)}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold text-green-600">{data.valid_records || 0}</p>
                <p className="text-sm text-slate-500">Registos Válidos</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold text-red-600">{data.invalid_records || 0}</p>
                <p className="text-sm text-slate-500">Registos Inválidos</p>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }

    if (processingType === "summarize") {
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold text-blue-600">{data.total_records || 0}</p>
                <p className="text-sm text-slate-500">Total Registos</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold text-purple-600">{data.quality_score || 0}%</p>
                <p className="text-sm text-slate-500">Qualidade</p>
              </CardContent>
            </Card>
          </div>

          {data.fields?.length > 0 && (
            <div>
              <Label className="mb-2 block">Campos Identificados:</Label>
              <div className="flex flex-wrap gap-2">
                {data.fields.map((field, i) => (
                  <Badge key={i} variant="secondary">{field}</Badge>
                ))}
              </div>
            </div>
          )}

          {data.recommendations?.length > 0 && (
            <div>
              <Label className="mb-2 block">Recomendações:</Label>
              <ul className="list-disc ml-4 space-y-1">
                {data.recommendations.map((rec, i) => (
                  <li key={i} className="text-slate-600">{rec}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      );
    }

    // Default: show raw JSON
    return (
      <div className="bg-slate-900 rounded-lg p-4 overflow-auto max-h-96">
        <pre className="text-green-400 text-sm whitespace-pre-wrap">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileJson className="w-6 h-6 text-blue-600" />
          Processador de JSON com IA
        </CardTitle>
        <CardDescription>
          Utilize inteligência artificial para processar, validar e extrair dados de ficheiros JSON
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="input">Entrada</TabsTrigger>
            <TabsTrigger value="result" disabled={!result}>Resultado</TabsTrigger>
          </TabsList>

          <TabsContent value="input" className="space-y-6 mt-6">
            {/* Processing Type Selection */}
            <div>
              <Label className="mb-3 block">Tipo de Processamento</Label>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {processingTypes.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setProcessingType(type.value)}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      processingType === type.value
                        ? "border-blue-500 bg-blue-50"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <type.icon className={`w-5 h-5 mb-2 ${
                      processingType === type.value ? "text-blue-600" : "text-slate-400"
                    }`} />
                    <p className="font-medium text-sm">{type.label}</p>
                    <p className="text-xs text-slate-500 mt-1">{type.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Target Entity */}
            <div>
              <Label className="mb-2 block">Entidade de Destino</Label>
              <Select value={targetEntity} onValueChange={setTargetEntity}>
                <SelectTrigger className="w-full md:w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {targetEntities.map((entity) => (
                    <SelectItem key={entity.value} value={entity.value}>
                      <span className="flex items-center gap-2">
                        <entity.icon className="w-4 h-4" />
                        {entity.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* JSON Input */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Dados JSON</Label>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={formatJson}>
                    Formatar
                  </Button>
                  <label>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <Button variant="outline" size="sm" asChild>
                      <span>
                        <Upload className="w-4 h-4 mr-2" />
                        Carregar Ficheiro
                      </span>
                    </Button>
                  </label>
                </div>
              </div>
              <Textarea
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                placeholder='Cole o seu JSON aqui ou carregue um ficheiro...\n\nExemplo:\n[\n  {"title": "Apartamento T2", "price": 250000, "city": "Lisboa"},\n  {"title": "Moradia T4", "price": 450000, "city": "Porto"}\n]'
                className="font-mono text-sm min-h-64"
              />
            </div>

            {/* Process Button */}
            <Button
              onClick={() => processMutation.mutate()}
              disabled={!jsonInput || processMutation.isPending}
              className="w-full bg-blue-600 hover:bg-blue-700"
              size="lg"
            >
              {processMutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  A processar com IA...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Processar JSON
                </>
              )}
            </Button>
          </TabsContent>

          <TabsContent value="result" className="mt-6">
            {result && (
              <div className="space-y-4">
                {/* Result Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge className="bg-green-100 text-green-800">
                      <Check className="w-3 h-3 mr-1" />
                      Processado
                    </Badge>
                    <Badge variant="outline">
                      {processingTypes.find(t => t.value === result.processingType)?.label}
                    </Badge>
                    <Badge variant="outline">
                      {targetEntities.find(e => e.value === result.targetEntity)?.label}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={copyToClipboard}>
                      <Copy className="w-4 h-4 mr-2" />
                      Copiar
                    </Button>
                    <Button variant="outline" size="sm" onClick={downloadResult}>
                      <Download className="w-4 h-4 mr-2" />
                      Exportar
                    </Button>
                  </div>
                </div>

                {/* Result Content */}
                {renderResultContent()}

                {/* Back Button */}
                <Button
                  variant="outline"
                  onClick={() => setActiveTab("input")}
                  className="w-full"
                >
                  Processar Outro JSON
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}