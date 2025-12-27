import React from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Link2, Loader2, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

export default function ImageUrlImporter({ open, onOpenChange, onImagesImported }) {
  const [urls, setUrls] = React.useState("");
  const [importing, setImporting] = React.useState(false);
  const [results, setResults] = React.useState([]);

  const handleImport = async () => {
    const urlList = urls
      .split('\n')
      .map(u => u.trim())
      .filter(u => u && u.startsWith('http'));

    if (urlList.length === 0) {
      toast.error("Adicione pelo menos uma URL válida");
      return;
    }

    setImporting(true);
    setResults([]);

    const importedUrls = [];
    const importResults = [];

    for (const url of urlList) {
      try {
        const { data } = await base44.functions.invoke('importImageFromUrl', {
          imageUrl: url
        });

        if (data.success) {
          importedUrls.push(data.file_url);
          importResults.push({ url, success: true, file_url: data.file_url });
        } else {
          importResults.push({ url, success: false, error: data.error });
        }
      } catch (error) {
        importResults.push({ url, success: false, error: error.message });
      }
    }

    setResults(importResults);
    setImporting(false);

    if (importedUrls.length > 0) {
      toast.success(`${importedUrls.length} imagens importadas com sucesso`);
      if (onImagesImported) {
        onImagesImported(importedUrls);
      }
    } else {
      toast.error("Nenhuma imagem foi importada");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5" />
            Importar Imagens de URLs
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>URLs das Imagens (uma por linha)</Label>
            <textarea
              value={urls}
              onChange={(e) => setUrls(e.target.value)}
              placeholder="https://example.com/image1.jpg&#10;https://example.com/image2.jpg&#10;https://example.com/image3.jpg"
              className="w-full min-h-[200px] p-3 border border-slate-200 rounded-lg text-sm"
              disabled={importing}
            />
            <p className="text-xs text-slate-500 mt-1">
              Cole URLs de imagens (JPG, PNG, etc.). Uma URL por linha.
            </p>
          </div>

          {results.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Resultados da Importação</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[200px] overflow-y-auto">
                {results.map((result, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-sm">
                    {result.success ? (
                      <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-slate-600">{result.url}</p>
                      {!result.success && (
                        <p className="text-xs text-red-600">{result.error}</p>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setUrls("");
                setResults([]);
                onOpenChange(false);
              }}
              className="flex-1"
              disabled={importing}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleImport}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              disabled={importing}
            >
              {importing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  A importar...
                </>
              ) : (
                <>
                  <Link2 className="w-4 h-4 mr-2" />
                  Importar Imagens
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}