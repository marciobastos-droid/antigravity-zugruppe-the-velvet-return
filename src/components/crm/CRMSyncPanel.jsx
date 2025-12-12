import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, Download, Upload, CheckCircle2, AlertCircle, Loader2, Database } from "lucide-react";
import { toast } from "sonner";

export default function CRMSyncPanel() {
  const [syncMode, setSyncMode] = useState("from_external");
  const [externalData, setExternalData] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [results, setResults] = useState(null);

  const handleSync = async () => {
    setSyncing(true);
    setResults(null);

    try {
      let parsedData = null;
      
      if (syncMode === 'from_external' && externalData) {
        try {
          parsedData = JSON.parse(externalData);
        } catch {
          toast.error("JSON inválido");
          setSyncing(false);
          return;
        }
      }

      const response = await base44.functions.invoke('syncCRMData', {
        action: syncMode === 'from_external' ? 'sync_from_external' : 
                syncMode === 'to_external' ? 'sync_to_external' : 'bidirectional_sync',
        data: syncMode === 'from_external' ? parsedData : null
      });

      if (response.data?.success) {
        setResults(response.data.results || response.data);
        toast.success("Sincronização concluída!");
      } else {
        toast.error(response.data?.error || "Erro na sincronização");
      }

    } catch (error) {
      toast.error("Erro ao sincronizar");
      console.error(error);
    }

    setSyncing(false);
  };

  const handleExportContacts = async () => {
    try {
      const response = await base44.functions.invoke('syncCRMData', {
        action: 'sync_to_external',
        data: { entity_type: 'contacts' }
      });

      const exportData = JSON.stringify(response.data.entities, null, 2);
      const blob = new Blob([exportData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contacts_export_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      toast.success("Contactos exportados!");
    } catch (error) {
      toast.error("Erro ao exportar");
    }
  };

  const handleExportOpportunities = async () => {
    try {
      const response = await base44.functions.invoke('syncCRMData', {
        action: 'sync_to_external',
        data: { entity_type: 'opportunities' }
      });

      const exportData = JSON.stringify(response.data.entities, null, 2);
      const blob = new Blob([exportData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `opportunities_export_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      toast.success("Oportunidades exportadas!");
    } catch (error) {
      toast.error("Erro ao exportar");
    }
  };

  const handleExportProperties = async () => {
    try {
      const response = await base44.functions.invoke('syncCRMData', {
        action: 'sync_to_external',
        data: { entity_type: 'properties' }
      });

      const exportData = JSON.stringify(response.data.entities, null, 2);
      const blob = new Blob([exportData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `properties_export_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      toast.success("Imóveis exportados!");
    } catch (error) {
      toast.error("Erro ao exportar");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5" />
          Sincronização CRM
        </CardTitle>
        <p className="text-sm text-slate-600">
          Sincronize contactos e leads com sistemas externos
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Modo de Sincronização</Label>
          <Select value={syncMode} onValueChange={setSyncMode}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="from_external">
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Importar de CRM Externo
                </div>
              </SelectItem>
              <SelectItem value="to_external">
                <div className="flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  Exportar para CRM Externo
                </div>
              </SelectItem>
              <SelectItem value="bidirectional">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Sincronização Bidirecional
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {syncMode === 'from_external' && (
          <div>
            <Label>Dados JSON do CRM Externo</Label>
            <Textarea
              value={externalData}
              onChange={(e) => setExternalData(e.target.value)}
              placeholder={`{
  "external_contacts": [
    {
      "name": "João Silva",
      "email": "joao@example.com",
      "phone": "+351912345678",
      "company": "Empresa XYZ",
      "external_id": "EXT-123"
    }
  ],
  "external_leads": [
    {
      "name": "Maria Santos",
      "email": "maria@example.com",
      "phone": "+351923456789",
      "type": "comprador",
      "budget": 250000,
      "external_id": "LEAD-456"
    }
  ]
}`}
              rows={12}
              className="font-mono text-xs"
            />
            <p className="text-xs text-slate-500 mt-1">
              Cole os dados no formato JSON acima
            </p>
          </div>
        )}

        {syncMode === 'to_external' && (
          <div className="space-y-3">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900 mb-3">
                Exporte os seus dados para integração com CRMs externos
              </p>
              <div className="grid grid-cols-3 gap-2">
                <Button onClick={handleExportContacts} variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Exportar Contactos
                </Button>
                <Button onClick={handleExportOpportunities} variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Exportar Oportunidades
                </Button>
                <Button onClick={handleExportProperties} variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Exportar Imóveis
                </Button>
              </div>
            </div>
          </div>
        )}

        <Button 
          onClick={handleSync} 
          disabled={syncing || (syncMode === 'from_external' && !externalData)}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          {syncing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              A sincronizar...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              Sincronizar
            </>
          )}
        </Button>

        {results && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start gap-2 mb-3">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <div>
                <p className="font-semibold text-green-900">Sincronização Concluída</p>
                <p className="text-sm text-green-700 mt-1">
                  {results.contacts?.length || 0} contactos processados
                  <br />
                  {results.opportunities?.length || 0} oportunidades processadas
                  <br />
                  {results.properties?.length || 0} imóveis processados
                </p>
              </div>
            </div>
            
            {results.errors && results.errors.length > 0 && (
              <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded">
                <p className="text-xs font-semibold text-red-900 mb-1">Erros:</p>
                {results.errors.slice(0, 3).map((err, idx) => (
                  <p key={idx} className="text-xs text-red-700">• {err.error}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}