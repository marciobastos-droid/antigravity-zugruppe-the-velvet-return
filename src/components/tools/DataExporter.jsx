import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { FileDown, Loader2, Table } from "lucide-react";
import { toast } from "sonner";

export default function DataExporter() {
  const [entityType, setEntityType] = React.useState("Property");
  const [exporting, setExporting] = React.useState(false);

  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list()
  });

  const { data: developments = [] } = useQuery({
    queryKey: ['developments'],
    queryFn: () => base44.entities.Development.list()
  });

  const { data: opportunities = [] } = useQuery({
    queryKey: ['opportunities'],
    queryFn: () => base44.entities.Opportunity.list()
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ['clientContacts'],
    queryFn: () => base44.entities.ClientContact.list()
  });

  const getDataForExport = () => {
    switch (entityType) {
      case "Property":
        return properties;
      case "Development":
        return developments;
      case "Opportunity":
        return opportunities;
      case "ClientContact":
        return contacts;
      default:
        return [];
    }
  };

  const exportToCSV = () => {
    const data = getDataForExport();

    if (data.length === 0) {
      toast.error("Não há dados para exportar");
      return;
    }

    setExporting(true);

    try {
      // Get all unique keys from the data
      const keys = new Set();
      data.forEach(item => {
        Object.keys(item).forEach(key => {
          // Exclude complex objects and arrays for CSV
          if (typeof item[key] !== 'object' || item[key] === null) {
            keys.add(key);
          }
        });
      });

      const headers = Array.from(keys);
      
      // Create CSV content
      let csv = headers.join(',') + '\n';
      
      data.forEach(item => {
        const row = headers.map(header => {
          let value = item[header];
          
          // Handle null/undefined
          if (value === null || value === undefined) {
            return '';
          }
          
          // Convert to string and escape quotes
          value = String(value).replace(/"/g, '""');
          
          // Wrap in quotes if contains comma, newline, or quote
          if (value.includes(',') || value.includes('\n') || value.includes('"')) {
            return `"${value}"`;
          }
          
          return value;
        });
        
        csv += row.join(',') + '\n';
      });

      // Create blob and download
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${entityType}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`${data.length} registos exportados para CSV`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error("Erro ao exportar dados");
    }

    setExporting(false);
  };

  const exportToExcel = () => {
    const data = getDataForExport();

    if (data.length === 0) {
      toast.error("Não há dados para exportar");
      return;
    }

    setExporting(true);

    try {
      // Get all unique keys
      const keys = new Set();
      data.forEach(item => {
        Object.keys(item).forEach(key => {
          if (typeof item[key] !== 'object' || item[key] === null) {
            keys.add(key);
          }
        });
      });

      const headers = Array.from(keys);

      // Create HTML table for Excel
      let html = '<table><thead><tr>';
      headers.forEach(header => {
        html += `<th>${header}</th>`;
      });
      html += '</tr></thead><tbody>';

      data.forEach(item => {
        html += '<tr>';
        headers.forEach(header => {
          let value = item[header];
          if (value === null || value === undefined) {
            value = '';
          }
          html += `<td>${String(value).replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td>`;
        });
        html += '</tr>';
      });

      html += '</tbody></table>';

      // Create blob with Excel format
      const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${entityType}_${new Date().toISOString().split('T')[0]}.xls`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`${data.length} registos exportados para Excel`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error("Erro ao exportar dados");
    }

    setExporting(false);
  };

  const dataCount = getDataForExport().length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileDown className="w-5 h-5" />
          Exportar Dados
        </CardTitle>
        <CardDescription>
          Exporte imóveis, empreendimentos, oportunidades ou contactos para CSV ou Excel
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Tipo de Dados</Label>
          <Select value={entityType} onValueChange={setEntityType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Property">
                Imóveis ({properties.length})
              </SelectItem>
              <SelectItem value="Development">
                Empreendimentos ({developments.length})
              </SelectItem>
              <SelectItem value="Opportunity">
                Oportunidades ({opportunities.length})
              </SelectItem>
              <SelectItem value="ClientContact">
                Contactos ({contacts.length})
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Table className="w-4 h-4" />
            <span>{dataCount} registos prontos para exportar</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={exportToCSV}
            disabled={exporting || dataCount === 0}
            variant="outline"
            className="w-full"
          >
            {exporting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <FileDown className="w-4 h-4 mr-2" />
            )}
            Exportar CSV
          </Button>
          <Button
            onClick={exportToExcel}
            disabled={exporting || dataCount === 0}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            {exporting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <FileDown className="w-4 h-4 mr-2" />
            )}
            Exportar Excel
          </Button>
        </div>

        <p className="text-xs text-slate-500 text-center">
          Os dados serão exportados conforme estão na base de dados, incluindo todos os campos disponíveis
        </p>
      </CardContent>
    </Card>
  );
}