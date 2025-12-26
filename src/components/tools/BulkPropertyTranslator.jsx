import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Languages, Loader2, Check, AlertCircle, Globe } from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";

export default function BulkPropertyTranslator() {
  const [selectedProperties, setSelectedProperties] = React.useState([]);
  const [translating, setTranslating] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [results, setResults] = React.useState([]);
  const queryClient = useQueryClient();

  const { data: properties = [], isLoading } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list('-created_date')
  });

  const propertiesWithoutTranslations = properties.filter(p => !p.translations || Object.keys(p.translations).length === 0);
  const propertiesWithTranslations = properties.filter(p => p.translations && Object.keys(p.translations).length > 0);

  const handleSelectAll = () => {
    if (selectedProperties.length === propertiesWithoutTranslations.length) {
      setSelectedProperties([]);
    } else {
      setSelectedProperties(propertiesWithoutTranslations.map(p => p.id));
    }
  };

  const toggleProperty = (id) => {
    setSelectedProperties(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleBulkTranslate = async () => {
    if (selectedProperties.length === 0) {
      toast.error('Selecione pelo menos um imóvel');
      return;
    }

    setTranslating(true);
    setProgress(0);
    setResults([]);

    const total = selectedProperties.length;
    let completed = 0;
    const newResults = [];

    for (const propertyId of selectedProperties) {
      const property = properties.find(p => p.id === propertyId);
      
      try {
        const { data } = await base44.functions.invoke('translatePropertyContent', {
          property_id: propertyId,
          target_languages: ['en', 'es', 'fr', 'de']
        });

        if (data.success) {
          newResults.push({ 
            id: propertyId, 
            title: property.title,
            status: 'success' 
          });
        } else {
          newResults.push({ 
            id: propertyId, 
            title: property.title,
            status: 'error', 
            error: data.error 
          });
        }
      } catch (error) {
        newResults.push({ 
          id: propertyId, 
          title: property.title,
          status: 'error', 
          error: error.message 
        });
      }

      completed++;
      setProgress(Math.round((completed / total) * 100));
      setResults([...newResults]);
    }

    setTranslating(false);
    queryClient.invalidateQueries({ queryKey: ['properties'] });
    
    const successCount = newResults.filter(r => r.status === 'success').length;
    toast.success(`${successCount}/${total} imóveis traduzidos com sucesso!`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Languages className="w-5 h-5" />
            Tradução Automática em Massa
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-2xl font-bold text-blue-900">{properties.length}</div>
              <div className="text-sm text-blue-700">Total de Imóveis</div>
            </div>
            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
              <div className="text-2xl font-bold text-amber-900">{propertiesWithoutTranslations.length}</div>
              <div className="text-sm text-amber-700">Sem Traduções</div>
            </div>
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="text-2xl font-bold text-green-900">{propertiesWithTranslations.length}</div>
              <div className="text-sm text-green-700">Traduzidos</div>
            </div>
          </div>

          {/* Language info */}
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="w-4 h-4 text-slate-600" />
              <span className="font-semibold text-slate-900">Idiomas Disponíveis:</span>
            </div>
            <div className="flex gap-2">
              <Badge variant="secondary">🇬🇧 English</Badge>
              <Badge variant="secondary">🇪🇸 Español</Badge>
              <Badge variant="secondary">🇫🇷 Français</Badge>
              <Badge variant="secondary">🇩🇪 Deutsch</Badge>
            </div>
          </div>

          {/* Selection */}
          {propertiesWithoutTranslations.length > 0 && (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={selectedProperties.length === propertiesWithoutTranslations.length}
                    onCheckedChange={handleSelectAll}
                  />
                  <span className="text-sm font-medium">
                    Selecionar Todos ({selectedProperties.length}/{propertiesWithoutTranslations.length})
                  </span>
                </div>
                <Button
                  onClick={handleBulkTranslate}
                  disabled={translating || selectedProperties.length === 0}
                  className="gap-2"
                >
                  {translating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Traduzindo...
                    </>
                  ) : (
                    <>
                      <Languages className="w-4 h-4" />
                      Traduzir {selectedProperties.length} Imóveis
                    </>
                  )}
                </Button>
              </div>

              {/* Progress */}
              {translating && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progresso</span>
                    <span className="font-semibold">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              )}

              {/* Properties List */}
              <div className="max-h-96 overflow-y-auto space-y-2 border rounded-lg p-3">
                {propertiesWithoutTranslations.map((property) => (
                  <div
                    key={property.id}
                    className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-lg cursor-pointer"
                    onClick={() => toggleProperty(property.id)}
                  >
                    <Checkbox
                      checked={selectedProperties.includes(property.id)}
                      onCheckedChange={() => toggleProperty(property.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{property.title}</div>
                      <div className="text-xs text-slate-500">{property.city}</div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {property.ref_id}
                    </Badge>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Results */}
          {results.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Resultados:</h4>
              <div className="max-h-64 overflow-y-auto space-y-2 border rounded-lg p-3">
                {results.map((result) => (
                  <div
                    key={result.id}
                    className={`flex items-center gap-2 p-2 rounded ${
                      result.status === 'success' ? 'bg-green-50' : 'bg-red-50'
                    }`}
                  >
                    {result.status === 'success' ? (
                      <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{result.title}</div>
                      {result.error && (
                        <div className="text-xs text-red-600">{result.error}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {propertiesWithoutTranslations.length === 0 && (
            <div className="text-center py-8">
              <Check className="w-12 h-12 text-green-600 mx-auto mb-3" />
              <h3 className="font-semibold text-slate-900 mb-1">Todos os imóveis estão traduzidos!</h3>
              <p className="text-sm text-slate-600">Todos os imóveis ativos já têm traduções disponíveis.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Already Translated Properties */}
      {propertiesWithTranslations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Imóveis Traduzidos ({propertiesWithTranslations.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-64 overflow-y-auto space-y-2">
              {propertiesWithTranslations.slice(0, 10).map((property) => (
                <div key={property.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{property.title}</div>
                    <div className="text-xs text-slate-500">{property.city}</div>
                  </div>
                  <div className="flex gap-1">
                    {Object.keys(property.translations || {}).map(lang => (
                      <Badge key={lang} variant="secondary" className="text-xs">
                        {lang.toUpperCase()}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
              {propertiesWithTranslations.length > 10 && (
                <p className="text-xs text-slate-500 text-center pt-2">
                  ...e mais {propertiesWithTranslations.length - 10} imóveis
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}