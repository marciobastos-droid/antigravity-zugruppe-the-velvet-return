import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, FileText, ExternalLink, X } from "lucide-react";
import { toast } from "sonner";

export default function DocumentSearch({ documents, onClose }) {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState([]);

  const handleSearch = async () => {
    if (!query.trim()) {
      toast.error("Introduza um termo de pesquisa");
      return;
    }

    setSearching(true);
    setResults([]);

    try {
      // Filter only PDF documents
      const pdfDocs = documents.filter(doc => 
        doc.name?.toLowerCase().endsWith('.pdf')
      );

      if (pdfDocs.length === 0) {
        toast.error("Nenhum documento PDF disponível para pesquisa");
        setSearching(false);
        return;
      }

      // Search within each PDF using AI
      const searchPromises = pdfDocs.map(async (doc) => {
        try {
          const response = await base44.integrations.Core.InvokeLLM({
            prompt: `Analisa o documento PDF em ${doc.url} e procura por informação relacionada com: "${query}".
            
            Retorna APENAS se encontraste informação relevante, extratos específicos do texto, e a relevância (0-100).
            Se não encontrares nada relevante, retorna found: false.`,
            file_urls: [doc.url],
            response_json_schema: {
              type: "object",
              properties: {
                found: { type: "boolean" },
                relevance: { type: "number" },
                excerpts: { 
                  type: "array",
                  items: { type: "string" }
                },
                summary: { type: "string" }
              }
            }
          });

          if (response.found && response.relevance > 30) {
            return {
              document: doc,
              ...response
            };
          }
        } catch (error) {
          console.error(`Error searching ${doc.name}:`, error);
        }
        return null;
      });

      const searchResults = (await Promise.all(searchPromises))
        .filter(r => r !== null)
        .sort((a, b) => b.relevance - a.relevance);

      setResults(searchResults);

      if (searchResults.length === 0) {
        toast.info("Nenhum resultado encontrado nos documentos");
      } else {
        toast.success(`${searchResults.length} documento(s) encontrado(s)`);
      }
    } catch (error) {
      toast.error("Erro ao pesquisar documentos");
      console.error(error);
    }

    setSearching(false);
  };

  return (
    <Card className="mb-6 border-blue-500">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Search className="w-5 h-5 text-blue-600" />
          Pesquisa Avançada em PDF
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-4">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ex: cláusula de renovação, valor de caução, data de início..."
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Button onClick={handleSearch} disabled={searching}>
            {searching ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                A pesquisar...
              </>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                Pesquisar
              </>
            )}
          </Button>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-blue-900">
            <strong>ℹ️ Pesquisa Inteligente:</strong> Esta ferramenta usa IA para pesquisar dentro dos documentos PDF e encontrar informação relevante, mesmo que não seja uma correspondência exata.
          </p>
        </div>

        {results.length > 0 && (
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-900">Resultados ({results.length})</h3>
            {results.map((result, idx) => (
              <div key={idx} className="border border-slate-200 rounded-lg p-4 bg-white">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <FileText className="w-6 h-6 text-blue-600" />
                    <div>
                      <h4 className="font-semibold text-slate-900">{result.document.name}</h4>
                      <p className="text-sm text-slate-600">{result.document.property_title}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-100 text-green-800">
                      {result.relevance}% relevante
                    </Badge>
                    <a href={result.document.url} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm">
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </a>
                  </div>
                </div>

                {result.summary && (
                  <div className="mb-3">
                    <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg">
                      <strong>Resumo:</strong> {result.summary}
                    </p>
                  </div>
                )}

                {result.excerpts && result.excerpts.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-slate-700 mb-2">Excertos encontrados:</p>
                    <div className="space-y-2">
                      {result.excerpts.map((excerpt, i) => (
                        <div key={i} className="text-sm text-slate-600 bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded">
                          "{excerpt}"
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}