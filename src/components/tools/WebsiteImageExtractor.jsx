import React from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Image as ImageIcon, Link2, Download, Copy, CheckCircle2, 
  Sparkles, Loader2, ExternalLink, Filter, Grid3X3, List
} from "lucide-react";
import { toast } from "sonner";

const categoryLabels = {
  property: { label: "Imóvel", color: "bg-blue-100 text-blue-800" },
  logo: { label: "Logo", color: "bg-purple-100 text-purple-800" },
  icon: { label: "Ícone", color: "bg-gray-100 text-gray-800" },
  banner: { label: "Banner", color: "bg-orange-100 text-orange-800" },
  content: { label: "Conteúdo", color: "bg-green-100 text-green-800" },
  irrelevant: { label: "Irrelevante", color: "bg-red-100 text-red-800" }
};

const typeLabels = {
  img_tag: "Tag <img>",
  background: "CSS Background",
  meta: "Meta Tag"
};

export default function WebsiteImageExtractor() {
  const [url, setUrl] = React.useState("");
  const [useAI, setUseAI] = React.useState(false);
  const [extracting, setExtracting] = React.useState(false);
  const [results, setResults] = React.useState(null);
  const [selectedImages, setSelectedImages] = React.useState(new Set());
  const [filterCategory, setFilterCategory] = React.useState("all");
  const [viewMode, setViewMode] = React.useState("grid");

  const handleExtract = async () => {
    if (!url) {
      toast.error("Insira uma URL");
      return;
    }

    setExtracting(true);
    setResults(null);
    setSelectedImages(new Set());

    try {
      const response = await base44.functions.invoke('extractWebsiteImages', {
        url,
        use_ai: useAI
      });

      if (response.data.success) {
        setResults(response.data);
        toast.success(`${response.data.total_images} imagens extraídas`);
      } else {
        toast.error(response.data.error || "Erro ao extrair imagens");
      }
    } catch (error) {
      toast.error("Erro: " + (error.message || "Erro desconhecido"));
    }

    setExtracting(false);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado!");
  };

  const downloadImage = async (imageUrl, filename) => {
    try {
      // Use proxy to avoid CORS issues
      const response = await fetch(imageUrl, { mode: 'cors' });
      if (!response.ok) throw new Error('Falha ao descarregar');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || 'image.jpg';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast.success("Download iniciado");
    } catch (error) {
      console.error('Download error:', error);
      // Fallback: open in new tab
      window.open(imageUrl, '_blank');
      toast.info("A abrir imagem em nova aba");
    }
  };

  const toggleImageSelection = (imageUrl) => {
    const newSelected = new Set(selectedImages);
    if (newSelected.has(imageUrl)) {
      newSelected.delete(imageUrl);
    } else {
      newSelected.add(imageUrl);
    }
    setSelectedImages(newSelected);
  };

  const selectAllImages = () => {
    const filtered = getFilteredImages();
    setSelectedImages(new Set(filtered.map(img => img.url)));
  };

  const clearSelection = () => {
    setSelectedImages(new Set());
  };

  const downloadSelected = async () => {
    if (selectedImages.size === 0) {
      toast.error("Nenhuma imagem selecionada");
      return;
    }

    toast.info(`A descarregar ${selectedImages.size} imagens...`);
    
    for (const imageUrl of selectedImages) {
      const filename = imageUrl.split('/').pop().split('?')[0];
      await downloadImage(imageUrl, filename);
      await new Promise(resolve => setTimeout(resolve, 500)); // Delay between downloads
    }
  };

  const copySelectedUrls = () => {
    if (selectedImages.size === 0) {
      toast.error("Nenhuma imagem selecionada");
      return;
    }

    const urls = Array.from(selectedImages).join('\n');
    copyToClipboard(urls);
    toast.success(`${selectedImages.size} URLs copiados`);
  };

  const getFilteredImages = () => {
    if (!results?.images) return [];
    
    if (filterCategory === "all") {
      return results.images;
    }
    
    return results.images.filter(img => img.category === filterCategory);
  };

  const filteredImages = getFilteredImages();

  const categoryStats = React.useMemo(() => {
    if (!results?.images) return {};
    
    const stats = {};
    results.images.forEach(img => {
      const cat = img.category || 'content';
      stats[cat] = (stats[cat] || 0) + 1;
    });
    return stats;
  }, [results]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <ImageIcon className="w-7 h-7 text-blue-600" />
          Extrator de Imagens de Website
        </h2>
        <p className="text-slate-600 mt-1">Extraia todas as imagens de qualquer website</p>
      </div>

      {/* Input Form */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div>
              <Label>URL do Website</Label>
              <div className="flex gap-2 mt-2">
                <div className="relative flex-1">
                  <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://exemplo.com"
                    className="pl-10"
                    onKeyDown={(e) => e.key === 'Enter' && handleExtract()}
                  />
                </div>
                <Button 
                  onClick={handleExtract} 
                  disabled={extracting || !url}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {extracting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Extraindo...
                    </>
                  ) : (
                    <>
                      <ImageIcon className="w-4 h-4 mr-2" />
                      Extrair Imagens
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="use-ai"
                checked={useAI}
                onCheckedChange={setUseAI}
              />
              <Label htmlFor="use-ai" className="cursor-pointer flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600" />
                Usar IA para categorizar imagens (mais lento, mas organiza melhor)
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {results && (
        <>
          {/* Stats & Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="text-base px-3 py-1">
                {filteredImages.length} imagens
              </Badge>
              
              {results.analyzed_with_ai && (
                <div className="flex gap-2">
                  {Object.entries(categoryStats).map(([cat, count]) => {
                    const catInfo = categoryLabels[cat] || categoryLabels.content;
                    return (
                      <button
                        key={cat}
                        onClick={() => setFilterCategory(filterCategory === cat ? "all" : cat)}
                        className={`px-2 py-1 rounded text-xs transition-all ${
                          filterCategory === cat 
                            ? catInfo.color 
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {catInfo.label}: {count}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {selectedImages.size > 0 && (
                <>
                  <Badge className="bg-blue-600">
                    {selectedImages.size} selecionadas
                  </Badge>
                  <Button size="sm" variant="outline" onClick={downloadSelected}>
                    <Download className="w-4 h-4 mr-1" />
                    Descarregar
                  </Button>
                  <Button size="sm" variant="outline" onClick={copySelectedUrls}>
                    <Copy className="w-4 h-4 mr-1" />
                    Copiar URLs
                  </Button>
                  <Button size="sm" variant="ghost" onClick={clearSelection}>
                    Limpar
                  </Button>
                </>
              )}
              
              {selectedImages.size === 0 && filteredImages.length > 0 && (
                <Button size="sm" variant="outline" onClick={selectAllImages}>
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                  Selecionar Todas
                </Button>
              )}

              <div className="border rounded-lg overflow-hidden flex">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className="rounded-none"
                >
                  <Grid3X3 className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className="rounded-none"
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Images Grid/List */}
          {filteredImages.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Filter className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-600">Nenhuma imagem nesta categoria</p>
              </CardContent>
            </Card>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredImages.map((image, idx) => (
                <Card 
                  key={idx} 
                  className={`overflow-hidden cursor-pointer transition-all ${
                    selectedImages.has(image.url) 
                      ? "ring-2 ring-blue-500 shadow-lg" 
                      : "hover:shadow-md"
                  }`}
                  onClick={() => toggleImageSelection(image.url)}
                >
                  <div className="aspect-square bg-slate-100 relative group">
                    <img
                      src={image.url}
                      alt={image.alt || `Imagem ${idx + 1}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="%23f1f5f9"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="%2394a3b8">Erro</text></svg>';
                      }}
                    />
                    {selectedImages.has(image.url) && (
                      <div className="absolute top-2 right-2 bg-blue-600 text-white rounded-full p-1">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(image.url);
                        }}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(image.url, '_blank');
                        }}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      {image.category && (
                        <Badge className={`${categoryLabels[image.category]?.color || 'bg-slate-100 text-slate-800'} text-xs`}>
                          {categoryLabels[image.category]?.label || image.category}
                        </Badge>
                      )}
                      <span className="text-xs text-slate-500">{typeLabels[image.type]}</span>
                    </div>
                    {image.alt && (
                      <p className="text-xs text-slate-600 truncate" title={image.alt}>
                        {image.alt}
                      </p>
                    )}
                    {image.width && image.height && (
                      <p className="text-xs text-slate-500 mt-1">
                        {image.width} × {image.height}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredImages.map((image, idx) => (
                <Card 
                  key={idx}
                  className={`cursor-pointer transition-all ${
                    selectedImages.has(image.url) ? "ring-2 ring-blue-500" : ""
                  }`}
                  onClick={() => toggleImageSelection(image.url)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-20 bg-slate-100 rounded overflow-hidden flex-shrink-0">
                        <img
                          src={image.url}
                          alt={image.alt || `Imagem ${idx + 1}`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {image.category && (
                            <Badge className={categoryLabels[image.category]?.color || 'bg-slate-100'}>
                              {categoryLabels[image.category]?.label}
                            </Badge>
                          )}
                          <Badge variant="outline">{typeLabels[image.type]}</Badge>
                          {image.width && image.height && (
                            <span className="text-xs text-slate-500">
                              {image.width} × {image.height}
                            </span>
                          )}
                        </div>
                        {image.alt && <p className="text-sm text-slate-700 mb-1">{image.alt}</p>}
                        <p className="text-xs text-slate-500 truncate">{image.url}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(image.url);
                          }}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadImage(image.url, `image-${idx + 1}.jpg`);
                          }}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}