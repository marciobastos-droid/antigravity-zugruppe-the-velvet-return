import React from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Image, Upload, X, Loader2, Camera, Search } from "lucide-react";
import { toast } from "sonner";
import PropertyCard from "../browse/PropertyCard";

export default function ImageSearch({ properties }) {
  const [open, setOpen] = React.useState(false);
  const [uploadedImage, setUploadedImage] = React.useState(null);
  const [results, setResults] = React.useState([]);
  const fileInputRef = React.useRef(null);

  const searchMutation = useMutation({
    mutationFn: async (imageFile) => {
      // Upload image
      const uploadResult = await base44.integrations.Core.UploadFile({ file: imageFile });
      const imageUrl = uploadResult.file_url;

      // Use AI to analyze the image and find similar properties
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Analisa esta imagem de um imóvel e extrai as características principais visíveis:
        - Tipo de propriedade (apartamento, moradia, terreno, etc.)
        - Estilo arquitetônico
        - Características exteriores visíveis (piscina, jardim, varanda, etc.)
        - Acabamentos e materiais visíveis
        - Ambiente (urbano, rural, praia, montanha)
        - Qualquer outro detalhe relevante
        
        Responde em formato JSON estruturado.`,
        file_urls: [imageUrl],
        response_json_schema: {
          type: "object",
          properties: {
            property_type: { type: "string" },
            style: { type: "string" },
            features: { 
              type: "array", 
              items: { type: "string" } 
            },
            environment: { type: "string" },
            description: { type: "string" }
          }
        }
      });

      return { imageUrl, analysis: response };
    },
    onSuccess: ({ imageUrl, analysis }) => {
      setUploadedImage(imageUrl);

      // Find matching properties based on AI analysis
      const matches = properties.filter(p => {
        // Match by property type
        if (analysis.property_type && p.property_type) {
          const typeMatch = p.property_type.toLowerCase().includes(analysis.property_type.toLowerCase()) ||
                           analysis.property_type.toLowerCase().includes(p.property_type.toLowerCase());
          if (!typeMatch) return false;
        }

        // Match by features/amenities
        if (analysis.features && analysis.features.length > 0 && p.amenities && p.amenities.length > 0) {
          const hasMatchingFeature = analysis.features.some(feature => 
            p.amenities.some(amenity => 
              amenity.toLowerCase().includes(feature.toLowerCase()) ||
              feature.toLowerCase().includes(amenity.toLowerCase())
            )
          );
          if (hasMatchingFeature) return true;
        }

        // Match by description keywords
        if (analysis.description && p.description) {
          const keywords = analysis.description.toLowerCase().split(' ').filter(w => w.length > 3);
          const descriptionMatches = keywords.filter(keyword => 
            p.description.toLowerCase().includes(keyword)
          ).length;
          if (descriptionMatches > 2) return true;
        }

        return false;
      });

      setResults(matches.slice(0, 12));
      
      if (matches.length === 0) {
        toast.info("Nenhum imóvel semelhante encontrado. Tente outra imagem.");
      } else {
        toast.success(`${matches.length} imóveis semelhantes encontrados!`);
      }
    },
    onError: (error) => {
      console.error("Image search error:", error);
      toast.error("Erro ao processar imagem");
    }
  });

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error("Por favor selecione uma imagem");
      return;
    }

    searchMutation.mutate(file);
  };

  const handleReset = () => {
    setUploadedImage(null);
    setResults([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) handleReset();
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-purple-300 text-purple-600">
          <Camera className="w-4 h-4 mr-2" />
          Busca por Imagem
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Busca por Imagem
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Upload Area */}
          {!uploadedImage && (
            <Card className="border-2 border-dashed">
              <CardContent className="p-8">
                <label className="flex flex-col items-center gap-4 cursor-pointer">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={searchMutation.isPending}
                  />
                  <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center">
                    {searchMutation.isPending ? (
                      <Loader2 className="w-10 h-10 text-purple-600 animate-spin" />
                    ) : (
                      <Upload className="w-10 h-10 text-purple-600" />
                    )}
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-slate-900 mb-1">
                      {searchMutation.isPending ? "A analisar imagem..." : "Carregar imagem de imóvel"}
                    </p>
                    <p className="text-sm text-slate-500">
                      Clique para selecionar uma foto de um imóvel semelhante ao que procura
                    </p>
                  </div>
                  {!searchMutation.isPending && (
                    <Button type="button" variant="outline">
                      <Image className="w-4 h-4 mr-2" />
                      Selecionar Imagem
                    </Button>
                  )}
                </label>
              </CardContent>
            </Card>
          )}

          {/* Uploaded Image & Results */}
          {uploadedImage && (
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="relative group">
                  <img 
                    src={uploadedImage} 
                    alt="Imagem de referência" 
                    className="w-48 h-48 object-cover rounded-lg border-2 border-purple-200"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute top-2 right-2 bg-white/90 hover:bg-white"
                    onClick={handleReset}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900 mb-2">Resultados da Busca</h3>
                  <p className="text-sm text-slate-600 mb-3">
                    Encontrados {results.length} imóveis semelhantes à imagem carregada
                  </p>
                  <Button onClick={handleReset} variant="outline" size="sm">
                    <Search className="w-4 h-4 mr-2" />
                    Nova Busca
                  </Button>
                </div>
              </div>

              {results.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {results.map((property) => (
                    <PropertyCard 
                      key={property.id} 
                      property={property}
                      hideMetadata={true}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}