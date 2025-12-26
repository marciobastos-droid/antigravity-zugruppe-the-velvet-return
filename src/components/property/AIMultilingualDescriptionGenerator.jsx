import React from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Loader2, Globe, Check, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

export default function AIMultilingualDescriptionGenerator({ property, onUpdate }) {
  const [selectedLanguages, setSelectedLanguages] = React.useState(['en', 'es', 'fr', 'de']);
  const queryClient = useQueryClient();

  const languages = [
    { code: 'en', name: 'Inglês', flag: '🇬🇧' },
    { code: 'es', name: 'Espanhol', flag: '🇪🇸' },
    { code: 'fr', name: 'Francês', flag: '🇫🇷' },
    { code: 'de', name: 'Alemão', flag: '🇩🇪' }
  ];

  const generateMutation = useMutation({
    mutationFn: async () => {
      const { data } = await base44.functions.invoke('generateMultilingualDescription', {
        propertyId: property.id,
        targetLanguages: selectedLanguages
      });
      return data;
    },
    onSuccess: async (result) => {
      if (result.success) {
        // Preparar translations object
        const translations = {};
        
        for (const [lang, description] of Object.entries(result.descriptions)) {
          if (lang !== 'pt') {
            translations[lang] = {
              title: property.title, // Manter título original por agora
              description: description,
              amenities: property.amenities || []
            };
          }
        }

        // Atualizar propriedade com descrição PT (se gerada) e traduções
        const updateData = {
          translations: {
            ...(property.translations || {}),
            ...translations
          }
        };

        // Se gerou descrição PT nova, adicionar também
        if (result.descriptions.pt && !property.description) {
          updateData.description = result.descriptions.pt;
        }

        await base44.entities.Property.update(property.id, updateData);
        
        queryClient.invalidateQueries(['properties']);
        onUpdate?.();
        
        toast.success('Descrições multilíngues geradas com sucesso!', {
          description: `Gerado em ${selectedLanguages.length} idiomas`
        });
      }
    },
    onError: (error) => {
      toast.error('Erro ao gerar descrições', {
        description: error.message
      });
    }
  });

  const toggleLanguage = (langCode) => {
    setSelectedLanguages(prev => 
      prev.includes(langCode) 
        ? prev.filter(l => l !== langCode)
        : [...prev, langCode]
    );
  };

  const existingTranslations = property.translations || {};

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-slate-700 mb-2">Selecione os idiomas para geração:</h3>
        <div className="grid grid-cols-2 gap-2">
          {languages.map(lang => (
            <div key={lang.code} className="flex items-center space-x-2">
              <Checkbox 
                id={`lang-${lang.code}`}
                checked={selectedLanguages.includes(lang.code)}
                onCheckedChange={() => toggleLanguage(lang.code)}
                disabled={generateMutation.isPending}
              />
              <label 
                htmlFor={`lang-${lang.code}`}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2 cursor-pointer"
              >
                <span>{lang.flag}</span>
                <span>{lang.name}</span>
                {existingTranslations[lang.code]?.description && (
                  <Check className="w-3 h-3 text-green-600" />
                )}
              </label>
            </div>
          ))}
        </div>
      </div>

      {existingTranslations && Object.keys(existingTranslations).length > 0 && (
        <Card className="p-3 bg-green-50 border-green-200">
          <div className="flex items-start gap-2">
            <Check className="w-4 h-4 text-green-600 mt-0.5" />
            <div>
              <p className="text-sm text-green-900 font-medium">Traduções existentes:</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {Object.keys(existingTranslations).map(lang => {
                  const langInfo = languages.find(l => l.code === lang);
                  return langInfo ? (
                    <Badge key={lang} variant="outline" className="bg-white text-xs">
                      {langInfo.flag} {langInfo.name}
                    </Badge>
                  ) : null;
                })}
              </div>
            </div>
          </div>
        </Card>
      )}

      {!property.description && (
        <Card className="p-3 bg-blue-50 border-blue-200">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5" />
            <p className="text-sm text-blue-900">
              Não existe descrição em português. A IA irá gerar automaticamente uma descrição base em PT e depois traduzir.
            </p>
          </div>
        </Card>
      )}

      <Button
        onClick={() => generateMutation.mutate()}
        disabled={generateMutation.isPending || selectedLanguages.length === 0}
        className="w-full"
      >
        {generateMutation.isPending ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            A gerar descrições...
          </>
        ) : (
          <>
            <Globe className="w-4 h-4 mr-2" />
            Gerar Descrições em {selectedLanguages.length} Idioma{selectedLanguages.length !== 1 ? 's' : ''}
          </>
        )}
      </Button>

      <p className="text-xs text-slate-500 text-center">
        💡 As descrições serão otimizadas para cada mercado internacional
      </p>
    </div>
  );
}