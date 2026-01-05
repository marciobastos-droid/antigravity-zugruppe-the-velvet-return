import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Search, Image, Users, DollarSign, CheckCircle, 
  Loader2, AlertCircle, ArrowRight, ArrowLeft, Instagram
} from "lucide-react";
import { toast } from "sonner";

export default function MetaAdsCreator() {
  const [currentStep, setCurrentStep] = React.useState(1);
  const [formData, setFormData] = React.useState({
    propertyId: "",
    selectedProperty: null,
    adCopy: "",
    audience: "",
    budget: "20",
    duration: "7"
  });

  // Fetch properties
  const { data: properties = [], isLoading: loadingProperties } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list('-created_date')
  });

  // Create Meta Ad mutation
  const createAdMutation = useMutation({
    mutationFn: async (data) => {
      const response = await base44.functions.invoke('createMetaCampaign', data);
      return response.data;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Campanha criada com sucesso!');
        // Reset form
        setFormData({
          propertyId: "",
          selectedProperty: null,
          adCopy: "",
          audience: "",
          budget: "20",
          duration: "7"
        });
        setCurrentStep(1);
      } else {
        toast.error(data.error || 'Erro ao criar campanha');
      }
    },
    onError: (error) => {
      toast.error('Erro ao criar campanha: ' + error.message);
    }
  });

  // Search property by ID or ref_id
  const handleSearchProperty = () => {
    const found = properties.find(p => 
      p.id === formData.propertyId || 
      p.ref_id === formData.propertyId
    );
    
    if (found) {
      // Generate default ad copy
      const defaultCopy = `${found.title}\n\n📍 ${found.city}\n💰 €${found.price?.toLocaleString()}\n🛏️ ${found.bedrooms ? `T${found.bedrooms}` : ''}\n\n✨ Descubra mais em zuhaus.pt`;
      
      setFormData(prev => ({
        ...prev,
        selectedProperty: found,
        adCopy: defaultCopy
      }));
      toast.success('Imóvel encontrado!');
    } else {
      toast.error('Imóvel não encontrado');
    }
  };

  // Audience options
  const audiences = [
    { value: "lisboa_buyers", label: "Compradores Lisboa", description: "Pessoas interessadas em comprar imóveis em Lisboa" },
    { value: "lisboa_renters", label: "Arrendatários Lisboa", description: "Pessoas interessadas em arrendar em Lisboa" },
    { value: "students", label: "Estudantes", description: "Estudantes universitários procurando alojamento" }
  ];

  // Handle form submission
  const handleSubmit = () => {
    if (!formData.selectedProperty) {
      toast.error('Selecione um imóvel primeiro');
      return;
    }

    if (!formData.audience) {
      toast.error('Selecione um público-alvo');
      return;
    }

    // Validate zuhaus.pt link
    const propertyLink = `https://zuhaus.pt/property/${formData.selectedProperty.id}`;
    if (!propertyLink.startsWith('https://zuhaus.pt/')) {
      toast.error('Link inválido - deve começar com https://zuhaus.pt/');
      return;
    }

    createAdMutation.mutate({
      property: formData.selectedProperty,
      imageUrl: formData.selectedProperty.images?.[0],
      adCopy: formData.adCopy,
      audience: formData.audience,
      budget: parseFloat(formData.budget),
      duration: parseInt(formData.duration),
      link: propertyLink
    });
  };

  const steps = [
    { number: 1, title: "Selecionar Imóvel", icon: Search },
    { number: 2, title: "Preview do Anúncio", icon: Image },
    { number: 3, title: "Público-Alvo", icon: Users },
    { number: 4, title: "Orçamento", icon: DollarSign }
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Criar Campanha Instagram/Facebook
          </h1>
          <p className="text-slate-600">
            Sistema automatizado de criação de anúncios para imóveis Zuhaus
          </p>
        </div>

        {/* Steps Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <React.Fragment key={step.number}>
                <div className="flex flex-col items-center">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all ${
                    currentStep >= step.number
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-white border-slate-300 text-slate-400'
                  }`}>
                    {currentStep > step.number ? (
                      <CheckCircle className="w-6 h-6" />
                    ) : (
                      <step.icon className="w-6 h-6" />
                    )}
                  </div>
                  <span className={`mt-2 text-sm font-medium ${
                    currentStep >= step.number ? 'text-slate-900' : 'text-slate-400'
                  }`}>
                    {step.title}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-4 transition-all ${
                    currentStep > step.number ? 'bg-blue-600' : 'bg-slate-200'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <Card>
          <CardHeader>
            <CardTitle>{steps[currentStep - 1].title}</CardTitle>
            <CardDescription>
              Passo {currentStep} de {steps.length}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Step 1: Property Selection */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div>
                  <Label>ID ou Referência do Imóvel</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      placeholder="Ex: ZH-001 ou ID do imóvel"
                      value={formData.propertyId}
                      onChange={(e) => setFormData(prev => ({ ...prev, propertyId: e.target.value }))}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearchProperty()}
                    />
                    <Button onClick={handleSearchProperty} disabled={loadingProperties}>
                      {loadingProperties ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                      Buscar
                    </Button>
                  </div>
                </div>

                {formData.selectedProperty && (
                  <Alert>
                    <CheckCircle className="w-4 h-4" />
                    <AlertDescription>
                      <div className="flex items-start gap-4">
                        {formData.selectedProperty.images?.[0] && (
                          <img 
                            src={formData.selectedProperty.images[0]} 
                            alt={formData.selectedProperty.title}
                            className="w-24 h-24 object-cover rounded"
                          />
                        )}
                        <div>
                          <div className="font-semibold">{formData.selectedProperty.title}</div>
                          <div className="text-sm text-slate-600">
                            {formData.selectedProperty.city} • €{formData.selectedProperty.price?.toLocaleString()}
                          </div>
                          <Badge className="mt-1">{formData.selectedProperty.ref_id}</Badge>
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {/* Step 2: Ad Preview */}
            {currentStep === 2 && formData.selectedProperty && (
              <div className="space-y-4">
                <div className="bg-slate-100 rounded-lg p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Instagram className="w-5 h-5 text-pink-600" />
                    <span className="font-semibold">Preview Instagram Feed</span>
                  </div>
                  
                  <div className="bg-white rounded-lg overflow-hidden shadow-lg max-w-md mx-auto">
                    {/* Instagram Post Header */}
                    <div className="p-3 flex items-center gap-2 border-b">
                      <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-orange-500 rounded-full" />
                      <span className="font-semibold text-sm">zuhaus.pt</span>
                    </div>
                    
                    {/* Image */}
                    {formData.selectedProperty.images?.[0] && (
                      <img 
                        src={formData.selectedProperty.images[0]} 
                        alt={formData.selectedProperty.title}
                        className="w-full aspect-square object-cover"
                      />
                    )}
                    
                    {/* Caption */}
                    <div className="p-3">
                      <div className="text-sm whitespace-pre-wrap">{formData.adCopy}</div>
                    </div>
                  </div>
                </div>

                <div>
                  <Label>Texto do Anúncio</Label>
                  <Textarea
                    value={formData.adCopy}
                    onChange={(e) => setFormData(prev => ({ ...prev, adCopy: e.target.value }))}
                    rows={6}
                    className="mt-2"
                    placeholder="Escreva o texto do anúncio..."
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Dica: Use emojis e seja direto na mensagem
                  </p>
                </div>
              </div>
            )}

            {/* Step 3: Audience Selection */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <Label>Selecione o Público-Alvo</Label>
                <div className="grid gap-3">
                  {audiences.map((aud) => (
                    <div
                      key={aud.value}
                      onClick={() => setFormData(prev => ({ ...prev, audience: aud.value }))}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        formData.audience === aud.value
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-semibold">{aud.label}</div>
                          <div className="text-sm text-slate-600 mt-1">{aud.description}</div>
                        </div>
                        {formData.audience === aud.value && (
                          <CheckCircle className="w-5 h-5 text-blue-600" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 4: Budget */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div>
                  <Label>Orçamento Diário (€)</Label>
                  <Input
                    type="number"
                    value={formData.budget}
                    onChange={(e) => setFormData(prev => ({ ...prev, budget: e.target.value }))}
                    min="5"
                    step="5"
                    className="mt-2"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Orçamento mínimo: €5/dia
                  </p>
                </div>

                <div>
                  <Label>Duração da Campanha (dias)</Label>
                  <Select 
                    value={formData.duration} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, duration: value }))}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 dias</SelectItem>
                      <SelectItem value="14">14 dias</SelectItem>
                      <SelectItem value="30">30 dias</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Alert>
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>
                    <div className="font-semibold mb-1">Resumo da Campanha</div>
                    <div className="text-sm space-y-1">
                      <div>• Orçamento total: €{(parseFloat(formData.budget) * parseInt(formData.duration)).toFixed(2)}</div>
                      <div>• Alcance estimado: {Math.floor(parseFloat(formData.budget) * parseInt(formData.duration) * 50)} - {Math.floor(parseFloat(formData.budget) * parseInt(formData.duration) * 100)} pessoas</div>
                      <div>• Duração: {formData.duration} dias</div>
                      <div>• Status inicial: PAUSADO (requer aprovação)</div>
                    </div>
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
            disabled={currentStep === 1 || createAdMutation.isPending}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Anterior
          </Button>

          {currentStep < 4 ? (
            <Button
              onClick={() => setCurrentStep(prev => Math.min(4, prev + 1))}
              disabled={
                (currentStep === 1 && !formData.selectedProperty) ||
                (currentStep === 2 && !formData.adCopy) ||
                (currentStep === 3 && !formData.audience)
              }
            >
              Próximo
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={createAdMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {createAdMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Criando Campanha...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Criar Campanha
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}