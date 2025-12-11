import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Download, Upload, FileSpreadsheet, Loader2, CheckCircle, AlertCircle, Table } from "lucide-react";

export default function ExcelImportExport() {
  const queryClient = useQueryClient();
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportEntity, setExportEntity] = useState("Property");
  const [importEntity, setImportEntity] = useState("Property");
  const [importFormat, setImportFormat] = useState("xlsx");
  const [exportFormat, setExportFormat] = useState("xlsx");
  const [importResults, setImportResults] = useState(null);

  const entities = [
    { value: "Property", label: "Imóveis", icon: "🏠" },
    { value: "Opportunity", label: "Oportunidades", icon: "💼" },
    { value: "ClientContact", label: "Contactos", icon: "👤" },
    { value: "Appointment", label: "Visitas", icon: "📅" },
    { value: "Contract", label: "Contratos", icon: "📄" }
  ];

  const handleExport = async () => {
    setExporting(true);
    try {
      // Buscar dados da entidade
      const data = await base44.entities[exportEntity].list();
      
      if (data.length === 0) {
        toast.error(`Nenhum registo de ${entities.find(e => e.value === exportEntity)?.label} para exportar`);
        setExporting(false);
        return;
      }

      // Gerar CSV (Excel pode abrir CSVs)
      if (exportFormat === "csv" || exportFormat === "xlsx") {
        const headers = Object.keys(data[0]).filter(key => 
          !['id', 'created_by', 'updated_date'].includes(key)
        );
        
        const csvContent = [
          headers.join(','),
          ...data.map(row => 
            headers.map(header => {
              const value = row[header];
              // Handle arrays and objects
              if (Array.isArray(value)) return `"${value.join('; ')}"`;
              if (typeof value === 'object' && value !== null) return `"${JSON.stringify(value)}"`;
              if (typeof value === 'string' && value.includes(',')) return `"${value}"`;
              return value || '';
            }).join(',')
          )
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${exportEntity}_${new Date().toISOString().split('T')[0]}.${exportFormat === 'xlsx' ? 'csv' : 'csv'}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast.success(`${data.length} registos exportados!`);
      }

      // JSON export
      if (exportFormat === "json") {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${exportEntity}_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast.success(`${data.length} registos exportados em JSON!`);
      }

    } catch (error) {
      toast.error("Erro ao exportar: " + error.message);
    }
    setExporting(false);
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportResults(null);

    try {
      // Upload file
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Get entity schema
      const schema = await base44.entities[importEntity].schema();

      // Extract data using AI
      const extraction = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          properties: {
            records: {
              type: "array",
              items: schema
            }
          }
        }
      });

      if (extraction.status === 'error') {
        throw new Error(extraction.details || 'Erro ao processar ficheiro');
      }

      const records = extraction.output?.records || [];

      if (records.length === 0) {
        toast.error("Nenhum registo encontrado no ficheiro");
        setImporting(false);
        return;
      }

      // Import records to database
      await base44.entities[importEntity].bulkCreate(records);

      setImportResults({
        success: true,
        count: records.length,
        entity: importEntity
      });

      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['myProperties'] });
      
      toast.success(`${records.length} registos importados com sucesso!`);

    } catch (error) {
      console.error(error);
      setImportResults({
        success: false,
        error: error.message
      });
      toast.error("Erro ao importar: " + error.message);
    }

    setImporting(false);
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-green-600 rounded-xl">
          <FileSpreadsheet className="w-8 h-8 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Importação/Exportação Excel & JSON</h2>
          <p className="text-slate-600">Importe e exporte dados em formatos estruturados</p>
        </div>
      </div>

      <Tabs defaultValue="export">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="export">Exportar Dados</TabsTrigger>
          <TabsTrigger value="import">Importar Dados</TabsTrigger>
        </TabsList>

        {/* Export Tab */}
        <TabsContent value="export" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="w-5 h-5 text-green-600" />
                Exportar Dados
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Selecionar Entidade</Label>
                  <Select value={exportEntity} onValueChange={setExportEntity}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {entities.map(entity => (
                        <SelectItem key={entity.value} value={entity.value}>
                          {entity.icon} {entity.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Formato</Label>
                  <Select value={exportFormat} onValueChange={setExportFormat}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="xlsx">Excel (.csv)</SelectItem>
                      <SelectItem value="csv">CSV (.csv)</SelectItem>
                      <SelectItem value="json">JSON (.json)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Formato Excel/CSV</p>
                    <p className="text-blue-700">
                      Os ficheiros CSV podem ser abertos diretamente no Excel, Google Sheets ou LibreOffice.
                      Arrays e objetos serão convertidos para texto formatado.
                    </p>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleExport}
                disabled={exporting}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {exporting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    A exportar...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Exportar {entities.find(e => e.value === exportEntity)?.label}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Import Tab */}
        <TabsContent value="import" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-blue-600" />
                Importar Dados
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Selecionar Entidade</Label>
                  <Select value={importEntity} onValueChange={setImportEntity}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {entities.map(entity => (
                        <SelectItem key={entity.value} value={entity.value}>
                          {entity.icon} {entity.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Formato do Ficheiro</Label>
                  <Select value={importFormat} onValueChange={setImportFormat}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="xlsx">Excel (.xlsx, .csv)</SelectItem>
                      <SelectItem value="csv">CSV (.csv)</SelectItem>
                      <SelectItem value="json">JSON (.json)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-amber-800">
                    <p className="font-medium mb-1">Como funciona</p>
                    <ul className="text-amber-700 space-y-1 list-disc list-inside">
                      <li>Carregue ficheiros Excel, CSV ou JSON</li>
                      <li>A IA extrai e valida os dados automaticamente</li>
                      <li>Os registos são importados diretamente para a base de dados</li>
                      <li>Suporta formatação, fórmulas e múltiplas folhas (Excel)</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="import-file">Selecionar Ficheiro</Label>
                <div className="mt-2">
                  <label htmlFor="import-file" className="block">
                    <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-blue-400 hover:bg-blue-50 transition-all cursor-pointer">
                      {importing ? (
                        <div>
                          <Loader2 className="w-12 h-12 text-blue-600 mx-auto mb-3 animate-spin" />
                          <p className="text-slate-600">A processar ficheiro...</p>
                          <p className="text-xs text-slate-500 mt-1">A IA está a extrair e validar os dados</p>
                        </div>
                      ) : (
                        <div>
                          <FileSpreadsheet className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                          <p className="text-slate-600 font-medium">Clique para selecionar ficheiro</p>
                          <p className="text-xs text-slate-500 mt-1">
                            Suporta .xlsx, .csv, .json
                          </p>
                        </div>
                      )}
                    </div>
                    <input
                      id="import-file"
                      type="file"
                      accept=".xlsx,.xls,.csv,.json"
                      onChange={handleImport}
                      disabled={importing}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Import Results */}
              {importResults && (
                <Card className={importResults.success ? "border-green-300 bg-green-50" : "border-red-300 bg-red-50"}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      {importResults.success ? (
                        <CheckCircle className="w-6 h-6 text-green-600" />
                      ) : (
                        <AlertCircle className="w-6 h-6 text-red-600" />
                      )}
                      <div className="flex-1">
                        {importResults.success ? (
                          <div>
                            <p className="font-semibold text-green-900">Importação Concluída!</p>
                            <p className="text-sm text-green-700">
                              {importResults.count} registo(s) de {entities.find(e => e.value === importResults.entity)?.label} importado(s)
                            </p>
                          </div>
                        ) : (
                          <div>
                            <p className="font-semibold text-red-900">Erro na Importação</p>
                            <p className="text-sm text-red-700">{importResults.error}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}