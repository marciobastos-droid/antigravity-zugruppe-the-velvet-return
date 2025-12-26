import React from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Languages, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function AutoTranslateButton({ property, onTranslated }) {
  const [translating, setTranslating] = React.useState(false);
  const [translated, setTranslated] = React.useState(false);

  const hasTranslations = property?.translations && Object.keys(property.translations).length > 0;
  const translatedLanguages = property?.translations ? Object.keys(property.translations) : [];

  const handleTranslate = async () => {
    setTranslating(true);
    
    try {
      const { data } = await base44.functions.invoke('translatePropertyContent', {
        property_id: property.id,
        target_languages: ['en', 'es', 'fr', 'de']
      });

      if (data.success) {
        toast.success('Imóvel traduzido com sucesso!');
        setTranslated(true);
        onTranslated?.(data.translations);
      } else {
        throw new Error(data.error || 'Erro ao traduzir');
      }
    } catch (error) {
      console.error('Translation error:', error);
      toast.error('Erro ao traduzir imóvel');
    } finally {
      setTranslating(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <Button
        onClick={handleTranslate}
        disabled={translating}
        variant={hasTranslations ? "outline" : "default"}
        size="sm"
        className="gap-2"
      >
        {translating ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Traduzindo...
          </>
        ) : hasTranslations ? (
          <>
            <Languages className="w-4 h-4" />
            Atualizar Traduções
          </>
        ) : (
          <>
            <Languages className="w-4 h-4" />
            Traduzir Automaticamente
          </>
        )}
      </Button>

      {hasTranslations && (
        <div className="flex gap-1">
          {translatedLanguages.map(lang => (
            <Badge key={lang} variant="secondary" className="text-xs">
              {lang.toUpperCase()}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}