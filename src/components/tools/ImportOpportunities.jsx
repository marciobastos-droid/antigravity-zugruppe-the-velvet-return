import React from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Upload, FileText, Loader2, CheckCircle2, AlertCircle, ArrowRight, Target, Users, Euro, MapPin } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

const fieldLabels = {
  buyer_name: "Nome do Contacto",
  buyer_email: "Email",
  buyer_phone: "Telefone",
  lead_type: "Tipo de Lead",
  status: "Estado",
  priority: "Prioridade",
  qualification_status: "Qualificação",
  lead_source: "Origem",
  budget: "Orçamento",
  estimated_value: "Valor Estimado",
  location: "Localização",
  property_type_interest: "Tipo de Imóvel",
  message: "Mensagem/Notas",
  expected_close_date: "Data Fecho Prevista"
};

const leadTypeOptions = {
  comprador: "Comprador",
  vendedor: "Vendedor",
  parceiro_comprador: "Parceiro Comprador",
  parceiro_vendedor: "Parceiro Vendedor"
};

const statusOptions = {
  new: "Novo",
  contacted: "Contactado",
  qualified: "Qualificado",
  proposal: "Proposta",
  negotiation: "Negociação",
  won: "Ganho",
  lost: "Perdido"
};

const priorityOptions = {
  low: "Baixa",
  medium: "Média",
  high: "Alta"
};

const qualificationOptions = {
  hot: "Quente",
  warm: "Morno",
  cold: "Frio",
  unqualified: "Não Qualificado"
};

const sourceOptions = {
  facebook_ads: "Facebook Ads",
  website: "Website",
  referral: "Indicação",
  direct_contact: "Contacto Direto",
  real_estate_portal: "Portal Imobiliário",
  networking: "Networking",
  google_ads: "Google Ads",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  email_marketing: "Email Marketing",
  other: "Outro"
};

export default function ImportOpportunities() {
  const queryClient = useQueryClient();
  const [file, setFile] = React.useState(null);
  const [importing, setImporting] = React.useState(false);
  const [progress, setProgress] = React.useState("");
  const [results, setResults] = React.useState(null);
  const [importProgress, setImportProgress] = React.useState({ current: 0, total: 0, isRunning: false });
  
  const [csvPreview, setCsvPreview] = React.useState(null);
  const [columnMapping, setColumnMapping] = React.useState({});
  const [previewData, setPreviewData] = React.useState([]);
  const [selectedRows, setSelectedRows] = React.useState([]);
  const [showPreview, setShowPreview] = React.useState(false);

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const parseCSV = (text) => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length === 0) return { headers: [], rows: [] };
    
    let delimiter = ',';
    if (lines[0].includes(';')) delimiter = ';';
    else if (lines[0].includes('\t')) delimiter = '\t';

    const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''));
    const rows = lines.slice(1).map(line => {
      const values = line.split(delimiter).map(v => v.trim().replace(/^"|"$/g, ''));
      const row = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx] || '';
      });
      return row;
    });
    
    return { headers, rows };
  };

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    const extension = selectedFile.name.split('.').pop().toLowerCase();
    if (extension !== 'csv') {
      toast.error("Apenas ficheiros CSV são suportados");
      return;
    }

    setFile(selectedFile);
    setResults(null);

    try {
      const text = await selectedFile.text();
      const { headers, rows } = parseCSV(text);
      
      if (headers.length === 0 || rows.length === 0) {
        toast.error("CSV vazio ou inválido");
        return;
      }

      // Auto-detect column mappings
      const autoMapping = {};
      const commonMappings = {
        'buyer_name': ['nome', 'name', 'contacto', 'cliente', 'lead'],
        'buyer_email': ['email', 'e-mail', 'correio'],
        'buyer_phone': ['telefone', 'phone', 'telemovel', 'contacto'],
        'lead_type': ['tipo', 'type', 'lead_type'],
        'status': ['estado', 'status', 'fase'],
        'priority': ['prioridade', 'priority', 'urgencia'],
        'qualification_status': ['qualificacao', 'qualification', 'temperatura'],
        'lead_source': ['origem', 'source', 'fonte', 'canal'],
        'budget': ['orcamento', 'budget', 'valor'],
        'estimated_value': ['valor_estimado', 'estimated_value', 'deal_value'],
        'location': ['localizacao', 'location', 'cidade', 'zona'],
        'property_type_interest': ['tipo_imovel', 'property_type', 'interesse'],
        'message': ['mensagem', 'message', 'notas', 'notes', 'observacoes'],
        'expected_close_date': ['data_fecho', 'close_date', 'previsao']
      };

      headers.forEach(header => {
        const lowerHeader = header.toLowerCase().replace(/[_\s-]/g, '');
        for (const [field, variants] of Object.entries(commonMappings)) {
          if (variants.some(v => lowerHeader.includes(v.replace(/[_\s-]/g, '')))) {
            autoMapping[header] = field;
            break;
          }
        }
      });

      setCsvPreview({ headers, rows });
      setColumnMapping(autoMapping);
      setPreviewData(rows.slice(0, 10));
      setSelectedRows(rows.map((_, idx) => idx));
      setShowPreview(true);
      
      toast.success(`CSV carregado: ${rows.length} linhas`);
    } catch (error) {
      toast.error("Erro ao ler CSV");
      console.error(error);
    }
  };

  const processMappedData = () => {
    if (!csvPreview) return [];
    
    const selectedData = csvPreview.rows.filter((_, idx) => selectedRows.includes(idx));
    
    return selectedData.map(row => {
      const opportunity = {};
      
      Object.entries(columnMapping).forEach(([csvCol, oppField]) => {
        if (!oppField || !row[csvCol]) return;
        
        let value = row[csvCol];
        
        // Process specific fields
        if (['budget', 'estimated_value'].includes(oppField)) {
          value = value.toString().replace(/[€\s]/g, '').replace(/\./g, '').replace(/,/g, '.');
          value = parseFloat(value) || 0;
        } else if (oppField === 'lead_type') {
          const lowerVal = value.toLowerCase();
          if (lowerVal.includes('compra') || lowerVal.includes('buyer')) value = 'comprador';
          else if (lowerVal.includes('vend') || lowerVal.includes('seller')) value = 'vendedor';
          else if (lowerVal.includes('parceiro')) {
            value = lowerVal.includes('compra') ? 'parceiro_comprador' : 'parceiro_vendedor';
          } else value = 'comprador';
        } else if (oppField === 'status') {
          const lowerVal = value.toLowerCase();
          if (lowerVal.includes('nov') || lowerVal.includes('new')) value = 'new';
          else if (lowerVal.includes('contact')) value = 'contacted';
          else if (lowerVal.includes('qualif')) value = 'qualified';
          else if (lowerVal.includes('propos')) value = 'proposal';
          else if (lowerVal.includes('negoc')) value = 'negotiation';
          else if (lowerVal.includes('ganh') || lowerVal.includes('won')) value = 'won';
          else if (lowerVal.includes('perd') || lowerVal.includes('lost')) value = 'lost';
          else value = 'new';
        } else if (oppField === 'priority') {
          const lowerVal = value.toLowerCase();
          if (lowerVal.includes('alt') || lowerVal.includes('high')) value = 'high';
          else if (lowerVal.includes('baix') || lowerVal.includes('low')) value = 'low';
          else value = 'medium';
        } else if (oppField === 'qualification_status') {
          const lowerVal = value.toLowerCase();
          if (lowerVal.includes('quent') || lowerVal.includes('hot')) value = 'hot';
          else if (lowerVal.includes('morn') || lowerVal.includes('warm')) value = 'warm';
          else if (lowerVal.includes('fri') || lowerVal.includes('cold')) value = 'cold';
          else value = 'unqualified';
        } else if (oppField === 'lead_source') {
          const lowerVal = value.toLowerCase();
          if (lowerVal.includes('facebook')) value = 'facebook_ads';
          else if (lowerVal.includes('website') || lowerVal.includes('site')) value = 'website';
          else if (lowerVal.includes('indica') || lowerVal.includes('referr')) value = 'referral';
          else if (lowerVal.includes('direct') || lowerVal.includes('direc')) value = 'direct_contact';
          else if (lowerVal.includes('portal')) value = 'real_estate_portal';
          else if (lowerVal.includes('google')) value = 'google_ads';
          else if (lowerVal.includes('instagram')) value = 'instagram';
          else if (lowerVal.includes('linkedin')) value = 'linkedin';
          else value = 'other';
        }
        
        opportunity[oppField] = value;
      });
      
      // Set defaults
      opportunity.lead_type = opportunity.lead_type || 'comprador';
      opportunity.status = opportunity.status || 'new';
      opportunity.priority = opportunity.priority || 'medium';
      
      return opportunity;
    });
  };

  const handleImport = async () => {
    setImporting(true);
    setProgress("A processar dados...");
    setImportProgress({ current: 0, total: 100, isRunning: true });
    
    try {
      const opportunities = processMappedData();
      
      if (opportunities.length === 0) {
        throw new Error("Nenhum dado válido para importar");
      }

      setImportProgress({ current: 20, total: 100, isRunning: true });

      // Validate - must have at least buyer_name
      const validOpportunities = opportunities.filter(o => o.buyer_name && o.buyer_name.trim().length > 0);
      const invalidCount = opportunities.length - validOpportunities.length;

      if (validOpportunities.length === 0) {
        throw new Error("Nenhuma oportunidade tem nome de contacto válido");
      }

      setImportProgress({ current: 40, total: 100, isRunning: true });
      setProgress(`A gerar referências para ${validOpportunities.length} oportunidades...`);

      // Generate ref_ids
      const { data: refData } = await base44.functions.invoke('generateRefId', { 
        entity_type: 'Opportunity', 
        count: validOpportunities.length 
      });
      const refIds = refData.ref_ids || [refData.ref_id];

      const opportunitiesWithRefIds = validOpportunities.map((o, index) => ({
        ...o,
        ref_id: refIds[index],
        assigned_to: user?.email
      }));

      setImportProgress({ current: 70, total: 100, isRunning: true });
      setProgress(`A guardar ${opportunitiesWithRefIds.length} oportunidades...`);

      const created = await base44.entities.Opportunity.bulkCreate(opportunitiesWithRefIds);
      
      setImportProgress({ current: 100, total: 100, isRunning: false });
      
      setResults({
        success: true,
        count: created.length,
        opportunities: created,
        invalidCount,
        message: `✅ ${created.length} oportunidades importadas com sucesso!${invalidCount > 0 ? `\n⚠️ ${invalidCount} rejeitadas (sem nome)` : ''}`
      });
      
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      toast.success(`${created.length} oportunidades importadas com sucesso!`);
      setShowPreview(false);

    } catch (error) {
      setResults({ success: false, message: error.message || "Erro ao processar CSV" });
      toast.error("Erro na importação");
      setImportProgress({ current: 0, total: 0, isRunning: false });
    }
    
    setImporting(false);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Importar Oportunidades de CSV
          </CardTitle>
          <p className="text-sm text-slate-500">Importe leads e oportunidades a partir de ficheiros CSV</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-slate-400 transition-colors">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
              id="opp-file-upload"
              disabled={importing}
            />
            <label htmlFor="opp-file-upload" className="cursor-pointer">
              <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-700 font-medium mb-1">
                {file ? file.name : "Clique para carregar CSV"}
              </p>
              <p className="text-sm text-slate-500">Ficheiro CSV com dados de oportunidades/leads</p>
            </label>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900 font-medium mb-2">📋 Colunas suportadas:</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(fieldLabels).map(([key, label]) => (
                <Badge key={key} variant="outline" className="text-xs">
                  {label}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CSV Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Pré-visualização e Mapeamento de Colunas</DialogTitle>
          </DialogHeader>
          
          {csvPreview && (
            <div className="space-y-4 overflow-y-auto pr-2 flex-1">
              {/* Column Mapping */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Mapeamento de Colunas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {csvPreview.headers.map((header) => (
                      <div key={header}>
                        <Label className="text-xs mb-1 block truncate" title={header}>{header}</Label>
                        <Select
                          value={columnMapping[header] || ""}
                          onValueChange={(value) => setColumnMapping({...columnMapping, [header]: value === 'null' ? null : value})}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder="Ignorar" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="null">Ignorar</SelectItem>
                            {Object.entries(fieldLabels).map(([field, label]) => (
                              <SelectItem key={field} value={field}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Data Preview */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>Dados ({csvPreview.rows.length} linhas, {selectedRows.length} selecionadas)</span>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setSelectedRows(csvPreview.rows.map((_, i) => i))}>
                        Selecionar Todas
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setSelectedRows([])}>
                        Limpar
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto max-h-64">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">
                            <Checkbox 
                              checked={selectedRows.length === csvPreview.rows.length && csvPreview.rows.length > 0}
                              onCheckedChange={(checked) => {
                                setSelectedRows(checked ? csvPreview.rows.map((_, i) => i) : []);
                              }}
                            />
                          </TableHead>
                          {csvPreview.headers.map((header) => (
                            <TableHead key={header} className="text-xs whitespace-nowrap">
                              {header}
                              {columnMapping[header] && (
                                <div className="text-xs text-blue-600 mt-0.5">
                                  → {fieldLabels[columnMapping[header]]}
                                </div>
                              )}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewData.map((row, rowIdx) => (
                          <TableRow key={rowIdx}>
                            <TableCell>
                              <Checkbox
                                checked={selectedRows.includes(rowIdx)}
                                onCheckedChange={(checked) => {
                                  setSelectedRows(checked 
                                    ? [...selectedRows, rowIdx]
                                    : selectedRows.filter(i => i !== rowIdx)
                                  );
                                }}
                              />
                            </TableCell>
                            {csvPreview.headers.map((header) => (
                              <TableCell key={header} className="text-xs max-w-[150px] truncate">
                                {row[header]}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {csvPreview.rows.length > 10 && (
                    <p className="text-xs text-slate-500 mt-2 text-center">
                      A mostrar 10 de {csvPreview.rows.length} linhas
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Progress Bar */}
              {importProgress.isRunning && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-700">A importar oportunidades...</span>
                    <span className="text-sm font-bold text-blue-700">
                      {importProgress.current}%
                    </span>
                  </div>
                  <Progress value={importProgress.current} className="h-2" />
                  <p className="text-xs text-blue-600 mt-1">
                    {progress}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 justify-end pt-2">
                <Button variant="outline" onClick={() => setShowPreview(false)} disabled={importProgress.isRunning}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleImport}
                  disabled={importing || selectedRows.length === 0 || !columnMapping['buyer_name'] || importProgress.isRunning}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {importing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {importProgress.isRunning ? `${importProgress.current}%` : progress}
                    </>
                  ) : (
                    <>
                      <ArrowRight className="w-4 h-4 mr-2" />
                      Importar {selectedRows.length} Oportunidades
                    </>
                  )}
                </Button>
              </div>
              
              {!columnMapping['buyer_name'] && (
                <p className="text-sm text-amber-600 text-center">
                  ⚠️ Mapeie a coluna "Nome do Contacto" para poder importar
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Results */}
      {results && (
        <Card className={results.success ? "border-green-500" : "border-red-500"}>
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              {results.success ? (
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              ) : (
                <AlertCircle className="w-6 h-6 text-red-600" />
              )}
              <div className="flex-1">
                <h3 className={`font-semibold mb-1 ${results.success ? "text-green-900" : "text-red-900"}`}>
                  {results.success ? "Sucesso!" : "Erro"}
                </h3>
                <p className="text-slate-700 whitespace-pre-line mb-4">{results.message}</p>
                
                {results.success && results.opportunities?.length > 0 && (
                  <div className="space-y-2 mt-4">
                    <h4 className="font-semibold text-slate-900">Oportunidades Importadas:</h4>
                    {results.opportunities.slice(0, 5).map((opp, idx) => (
                      <div key={idx} className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-center gap-3">
                        <div className="flex-1">
                          <p className="font-medium text-slate-900">{opp.buyer_name}</p>
                          <div className="flex flex-wrap gap-2 text-xs mt-1">
                            <Badge variant="outline">{leadTypeOptions[opp.lead_type]}</Badge>
                            <Badge variant="outline">{statusOptions[opp.status]}</Badge>
                            {opp.budget > 0 && <Badge variant="outline">€{opp.budget.toLocaleString()}</Badge>}
                            {opp.location && (
                              <span className="flex items-center gap-1 text-slate-500">
                                <MapPin className="w-3 h-3" />
                                {opp.location}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {results.count > 5 && (
                      <p className="text-sm text-slate-500 text-center">
                        E mais {results.count - 5} oportunidades...
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}