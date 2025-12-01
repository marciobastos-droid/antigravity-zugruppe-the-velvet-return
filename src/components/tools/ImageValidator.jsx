import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Image, AlertTriangle, CheckCircle, XCircle, Trash2, 
  RefreshCw, Eye, Download, Search, Filter, Zap
} from "lucide-react";
import { toast } from "sonner";

export default function ImageValidator() {
  const queryClient = useQueryClient();
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState({ current: 0, total: 0 });
  const [scanResults, setScanResults] = useState(null);
  const [selectedImages, setSelectedImages] = useState([]);
  const [previewImage, setPreviewImage] = useState(null);
  const [filterType, setFilterType] = useState("all");

  // Fetch properties with images
  const { data: properties = [], isLoading } = useQuery({
    queryKey: ['propertiesWithImages'],
    queryFn: () => base44.entities.Property.list('-created_date', 500)
  });

  // Image validation function
  const validateImage = async (imageUrl) => {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.crossOrigin = "anonymous";
      
      const timeout = setTimeout(() => {
        resolve({
          url: imageUrl,
          valid: false,
          error: 'timeout',
          errorMessage: 'Timeout ao carregar imagem'
        });
      }, 10000);

      img.onload = () => {
        clearTimeout(timeout);
        const issues = [];
        
        // Check dimensions
        if (img.width < 400 || img.height < 300) {
          issues.push({ type: 'low_resolution', message: `Resolucao baixa: ${img.width}x${img.height}` });
        }
        
        // Check aspect ratio (too extreme ratios)
        const ratio = img.width / img.height;
        if (ratio > 3 || ratio < 0.3) {
          issues.push({ type: 'bad_ratio', message: `Proporcao incomum: ${ratio.toFixed(2)}` });
        }

        // Check if very small file (likely placeholder)
        if (img.width < 100 && img.height < 100) {
          issues.push({ type: 'placeholder', message: 'Possivelmente uma imagem placeholder' });
        }

        resolve({
          url: imageUrl,
          valid: issues.length === 0,
          width: img.width,
          height: img.height,
          ratio: ratio.toFixed(2),
          issues,
          quality: issues.length === 0 ? 'good' : issues.some(i => i.type === 'low_resolution') ? 'low' : 'medium'
        });
      };

      img.onerror = () => {
        clearTimeout(timeout);
        resolve({
          url: imageUrl,
          valid: false,
          error: 'load_error',
          errorMessage: 'Erro ao carregar imagem (link quebrado ou inacessivel)'
        });
      };

      img.src = imageUrl;
    });
  };

  // Check for duplicate images using simple URL comparison
  const findDuplicates = (allImages) => {
    const urlMap = new Map();
    const duplicates = [];

    allImages.forEach(({ propertyId, propertyTitle, url }) => {
      // Normalize URL for comparison
      const normalizedUrl = url.toLowerCase().replace(/\?.*$/, '').replace(/#.*$/, '');
      
      if (urlMap.has(normalizedUrl)) {
        const existing = urlMap.get(normalizedUrl);
        duplicates.push({
          url,
          normalizedUrl,
          properties: [
            { id: existing.propertyId, title: existing.propertyTitle },
            { id: propertyId, title: propertyTitle }
          ]
        });
      } else {
        urlMap.set(normalizedUrl, { propertyId, propertyTitle, url });
      }
    });

    return duplicates;
  };

  // Scan all images
  const runScan = async () => {
    setScanning(true);
    setScanResults(null);
    setSelectedImages([]);

    // Collect all images
    const allImages = [];
    properties.forEach(property => {
      (property.images || []).forEach((url, idx) => {
        allImages.push({
          propertyId: property.id,
          propertyTitle: property.title,
          propertyRef: property.ref_id,
          url,
          index: idx
        });
      });
    });

    setScanProgress({ current: 0, total: allImages.length });

    // Validate images in batches
    const validationResults = [];
    const batchSize = 10;

    for (let i = 0; i < allImages.length; i += batchSize) {
      const batch = allImages.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(async (img) => {
          const validation = await validateImage(img.url);
          return { ...img, ...validation };
        })
      );
      validationResults.push(...batchResults);
      setScanProgress({ current: Math.min(i + batchSize, allImages.length), total: allImages.length });
    }

    // Find duplicates
    const duplicates = findDuplicates(allImages);

    // Categorize results
    const broken = validationResults.filter(r => r.error);
    const lowQuality = validationResults.filter(r => !r.error && r.quality === 'low');
    const mediumQuality = validationResults.filter(r => !r.error && r.quality === 'medium');
    const good = validationResults.filter(r => !r.error && r.quality === 'good');

    setScanResults({
      total: allImages.length,
      broken,
      lowQuality,
      mediumQuality,
      good,
      duplicates,
      all: validationResults
    });

    setScanning(false);
    toast.success(`Scan concluido: ${allImages.length} imagens analisadas`);
  };

  // Remove selected images
  const removeMutation = useMutation({
    mutationFn: async (imagesToRemove) => {
      const propertyUpdates = new Map();

      imagesToRemove.forEach(img => {
        if (!propertyUpdates.has(img.propertyId)) {
          const property = properties.find(p => p.id === img.propertyId);
          propertyUpdates.set(img.propertyId, {
            property,
            imagesToRemove: []
          });
        }
        propertyUpdates.get(img.propertyId).imagesToRemove.push(img.url);
      });

      for (const [propertyId, data] of propertyUpdates) {
        const currentImages = data.property.images || [];
        const newImages = currentImages.filter(url => !data.imagesToRemove.includes(url));
        await base44.entities.Property.update(propertyId, { images: newImages });
      }
    },
    onSuccess: () => {
      toast.success('Imagens removidas com sucesso');
      queryClient.invalidateQueries({ queryKey: ['propertiesWithImages'] });
      setSelectedImages([]);
      setScanResults(null);
    }
  });

  const toggleSelectImage = (img) => {
    const key = `${img.propertyId}-${img.url}`;
    setSelectedImages(prev => 
      prev.some(i => `${i.propertyId}-${i.url}` === key)
        ? prev.filter(i => `${i.propertyId}-${i.url}` !== key)
        : [...prev, img]
    );
  };

  const selectAllInCategory = (category) => {
    if (!scanResults) return;
    const images = scanResults[category] || [];
    setSelectedImages(prev => {
      const existingKeys = new Set(prev.map(i => `${i.propertyId}-${i.url}`));
      const newImages = images.filter(img => !existingKeys.has(`${img.propertyId}-${img.url}`));
      return [...prev, ...newImages];
    });
  };

  const filteredResults = useMemo(() => {
    if (!scanResults) return [];
    switch (filterType) {
      case 'broken': return scanResults.broken;
      case 'low': return scanResults.lowQuality;
      case 'medium': return scanResults.mediumQuality;
      case 'good': return scanResults.good;
      default: return scanResults.all;
    }
  }, [scanResults, filterType]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" />
      </div>
    );
  }

  const totalImages = properties.reduce((sum, p) => sum + (p.images?.length || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Validador de Imagens</h2>
          <p className="text-slate-600">
            {properties.length} imoveis com {totalImages} imagens no total
          </p>
        </div>
        <Button 
          onClick={runScan} 
          disabled={scanning}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {scanning ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              A analisar...
            </>
          ) : (
            <>
              <Search className="w-4 h-4 mr-2" />
              Iniciar Scan
            </>
          )}
        </Button>
      </div>

      {/* Progress */}
      {scanning && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-3">
              <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
              <span className="font-medium">A analisar imagens...</span>
            </div>
            <Progress value={(scanProgress.current / scanProgress.total) * 100} className="h-2" />
            <p className="text-sm text-slate-500 mt-2">
              {scanProgress.current} de {scanProgress.total} imagens processadas
            </p>
          </CardContent>
        </Card>
      )}

      {/* Results Summary */}
      {scanResults && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card 
              className={`cursor-pointer transition-all ${filterType === 'all' ? 'ring-2 ring-blue-500' : ''}`}
              onClick={() => setFilterType('all')}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Image className="w-5 h-5 text-blue-600" />
                  <span className="font-medium">Total</span>
                </div>
                <p className="text-2xl font-bold">{scanResults.total}</p>
              </CardContent>
            </Card>

            <Card 
              className={`cursor-pointer transition-all ${filterType === 'broken' ? 'ring-2 ring-red-500' : ''}`}
              onClick={() => setFilterType('broken')}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <XCircle className="w-5 h-5 text-red-600" />
                  <span className="font-medium">Quebradas</span>
                </div>
                <p className="text-2xl font-bold text-red-600">{scanResults.broken.length}</p>
              </CardContent>
            </Card>

            <Card 
              className={`cursor-pointer transition-all ${filterType === 'low' ? 'ring-2 ring-amber-500' : ''}`}
              onClick={() => setFilterType('low')}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  <span className="font-medium">Baixa Qual.</span>
                </div>
                <p className="text-2xl font-bold text-amber-600">{scanResults.lowQuality.length}</p>
              </CardContent>
            </Card>

            <Card 
              className={`cursor-pointer transition-all ${filterType === 'medium' ? 'ring-2 ring-yellow-500' : ''}`}
              onClick={() => setFilterType('medium')}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-5 h-5 text-yellow-600" />
                  <span className="font-medium">Media</span>
                </div>
                <p className="text-2xl font-bold text-yellow-600">{scanResults.mediumQuality.length}</p>
              </CardContent>
            </Card>

            <Card 
              className={`cursor-pointer transition-all ${filterType === 'good' ? 'ring-2 ring-green-500' : ''}`}
              onClick={() => setFilterType('good')}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-medium">Boas</span>
                </div>
                <p className="text-2xl font-bold text-green-600">{scanResults.good.length}</p>
              </CardContent>
            </Card>
          </div>

          {/* Duplicates Alert */}
          {scanResults.duplicates.length > 0 && (
            <Card className="border-purple-300 bg-purple-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-purple-600" />
                  <span className="font-semibold text-purple-800">
                    {scanResults.duplicates.length} imagens duplicadas detetadas
                  </span>
                </div>
                <p className="text-sm text-purple-700">
                  Existem imagens identicas em diferentes imoveis.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Bulk Actions */}
          {selectedImages.length > 0 && (
            <Card className="border-blue-300 bg-blue-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-blue-800">
                    {selectedImages.length} imagens selecionadas
                  </span>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedImages([])}
                    >
                      Limpar
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => removeMutation.mutate(selectedImages)}
                      disabled={removeMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Remover Selecionadas
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Select Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => selectAllInCategory('broken')}
              disabled={scanResults.broken.length === 0}
            >
              Selecionar Quebradas ({scanResults.broken.length})
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => selectAllInCategory('lowQuality')}
              disabled={scanResults.lowQuality.length === 0}
            >
              Selecionar Baixa Qualidade ({scanResults.lowQuality.length})
            </Button>
          </div>

          {/* Image Grid */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {filterType === 'all' ? 'Todas as Imagens' : 
                 filterType === 'broken' ? 'Imagens Quebradas' :
                 filterType === 'low' ? 'Baixa Qualidade' :
                 filterType === 'medium' ? 'Qualidade Media' : 'Boas Imagens'}
                ({filteredResults.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {filteredResults.slice(0, 60).map((img, idx) => {
                  const isSelected = selectedImages.some(i => 
                    i.propertyId === img.propertyId && i.url === img.url
                  );
                  
                  return (
                    <div 
                      key={`${img.propertyId}-${idx}`}
                      className={`relative group rounded-lg overflow-hidden border-2 ${
                        isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-slate-200'
                      }`}
                    >
                      <div className="aspect-square bg-slate-100 relative">
                        {img.error ? (
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-50">
                            <XCircle className="w-8 h-8 text-red-400 mb-1" />
                            <span className="text-xs text-red-600 text-center px-2">Link quebrado</span>
                          </div>
                        ) : (
                          <img 
                            src={img.url} 
                            alt=""
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        )}
                        
                        {/* Quality Badge */}
                        <div className="absolute top-1 right-1">
                          {img.error && <Badge className="bg-red-500 text-xs">Erro</Badge>}
                          {img.quality === 'low' && <Badge className="bg-amber-500 text-xs">Baixa</Badge>}
                          {img.quality === 'medium' && <Badge className="bg-yellow-500 text-xs">Media</Badge>}
                        </div>

                        {/* Checkbox */}
                        <div 
                          className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => { e.stopPropagation(); toggleSelectImage(img); }}
                        >
                          <Checkbox checked={isSelected} />
                        </div>

                        {/* Overlay on Hover */}
                        <div 
                          className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 cursor-pointer"
                          onClick={() => setPreviewImage(img)}
                        >
                          <Eye className="w-5 h-5 text-white" />
                        </div>
                      </div>
                      
                      <div className="p-2 bg-white">
                        <p className="text-xs font-medium truncate" title={img.propertyTitle}>
                          {img.propertyRef || img.propertyTitle}
                        </p>
                        {img.width && (
                          <p className="text-xs text-slate-500">{img.width}x{img.height}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {filteredResults.length > 60 && (
                <p className="text-center text-slate-500 mt-4">
                  A mostrar 60 de {filteredResults.length} imagens
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Empty State */}
      {!scanning && !scanResults && (
        <Card>
          <CardContent className="py-12 text-center">
            <Image className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="font-semibold text-slate-900 mb-2">Validar Imagens dos Imoveis</h3>
            <p className="text-slate-500 mb-4">
              Analisa todas as imagens para detetar links quebrados, baixa resolucao e duplicados.
            </p>
            <Button onClick={runScan} className="bg-blue-600 hover:bg-blue-700">
              <Search className="w-4 h-4 mr-2" />
              Iniciar Scan
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Preview Dialog */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{previewImage?.propertyTitle}</DialogTitle>
          </DialogHeader>
          {previewImage && (
            <div className="space-y-4">
              {previewImage.error ? (
                <div className="aspect-video bg-red-50 rounded-lg flex flex-col items-center justify-center">
                  <XCircle className="w-16 h-16 text-red-400 mb-2" />
                  <p className="text-red-600 font-medium">{previewImage.errorMessage}</p>
                </div>
              ) : (
                <img 
                  src={previewImage.url} 
                  alt=""
                  className="w-full rounded-lg"
                />
              )}
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-slate-500">Dimensoes</p>
                  <p className="font-medium">
                    {previewImage.width ? `${previewImage.width}x${previewImage.height}` : 'N/A'}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-slate-500">Proporcao</p>
                  <p className="font-medium">{previewImage.ratio || 'N/A'}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-slate-500">Qualidade</p>
                  <p className="font-medium capitalize">
                    {previewImage.error ? 'Erro' : previewImage.quality}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-slate-500">Imovel</p>
                  <p className="font-medium">{previewImage.propertyRef}</p>
                </div>
              </div>

              {previewImage.issues?.length > 0 && (
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="font-medium text-amber-800 mb-2">Problemas Detetados:</p>
                  <ul className="list-disc list-inside text-sm text-amber-700">
                    {previewImage.issues.map((issue, i) => (
                      <li key={i}>{issue.message}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}