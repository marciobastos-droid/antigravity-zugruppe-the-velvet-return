import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getStoredErrors, clearStoredErrors, getErrorStats, ErrorSeverity, ErrorType } from "./ErrorLogger";
import { AlertTriangle, Trash2, RefreshCw, Copy, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * Error Log Viewer Component (for admins/debugging)
 */
export default function ErrorLogViewer() {
  const [errors, setErrors] = React.useState([]);
  const [stats, setStats] = React.useState(null);
  const [selectedError, setSelectedError] = React.useState(null);

  const loadErrors = React.useCallback(() => {
    const storedErrors = getStoredErrors();
    const errorStats = getErrorStats();
    setErrors(storedErrors);
    setStats(errorStats);
  }, []);

  React.useEffect(() => {
    loadErrors();
  }, [loadErrors]);

  const handleClear = () => {
    if (window.confirm('Limpar todos os logs de erro?')) {
      clearStoredErrors();
      loadErrors();
      toast.success('Logs limpos com sucesso');
    }
  };

  const handleCopyError = (error) => {
    const errorText = JSON.stringify(error, null, 2);
    navigator.clipboard.writeText(errorText);
    toast.success('Erro copiado para clipboard');
  };

  const getSeverityColor = (severity) => {
    const colors = {
      [ErrorSeverity.LOW]: 'bg-blue-100 text-blue-800',
      [ErrorSeverity.MEDIUM]: 'bg-yellow-100 text-yellow-800',
      [ErrorSeverity.HIGH]: 'bg-orange-100 text-orange-800',
      [ErrorSeverity.CRITICAL]: 'bg-red-100 text-red-800'
    };
    return colors[severity] || 'bg-slate-100 text-slate-800';
  };

  const getTypeIcon = (type) => {
    const icons = {
      [ErrorType.API]: '🌐',
      [ErrorType.RUNTIME]: '⚙️',
      [ErrorType.VALIDATION]: '✅',
      [ErrorType.NETWORK]: '📡',
      [ErrorType.PERMISSION]: '🔒',
      [ErrorType.UNKNOWN]: '❓'
    };
    return icons[type] || '❓';
  };

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
              <p className="text-sm text-slate-600">Total de Erros</p>
            </CardContent>
          </Card>
          
          {Object.entries(stats.bySeverity).map(([severity, count]) => (
            <Card key={severity}>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-slate-900">{count}</div>
                <Badge className={`${getSeverityColor(severity)} mt-2`}>
                  {severity.toUpperCase()}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Error List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              <CardTitle>Logs de Erro</CardTitle>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={loadErrors}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Atualizar
              </Button>
              <Button variant="destructive" size="sm" onClick={handleClear}>
                <Trash2 className="w-4 h-4 mr-2" />
                Limpar Tudo
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {errors.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <p className="text-slate-600">Sem erros registados</p>
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="space-y-3">
                {errors.map((error) => (
                  <div
                    key={error.id}
                    className="border rounded-lg p-4 hover:bg-slate-50 cursor-pointer transition-colors"
                    onClick={() => setSelectedError(selectedError?.id === error.id ? null : error)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">{getTypeIcon(error.type)}</span>
                          <Badge className={getSeverityColor(error.severity)}>
                            {error.severity}
                          </Badge>
                          <Badge variant="outline">{error.type}</Badge>
                          <span className="text-xs text-slate-500">
                            {format(new Date(error.timestamp), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                          </span>
                        </div>
                        
                        <p className="font-medium text-slate-900 mb-1 truncate">
                          {error.message}
                        </p>
                        
                        {error.endpoint && (
                          <p className="text-xs text-slate-600 mb-1">
                            Endpoint: {error.endpoint}
                          </p>
                        )}
                        
                        <p className="text-xs text-slate-500 font-mono">
                          ID: {error.id}
                        </p>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyError(error);
                        }}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>

                    {selectedError?.id === error.id && (
                      <div className="mt-4 pt-4 border-t">
                        <div className="space-y-3">
                          {error.url && (
                            <div>
                              <p className="text-xs font-medium text-slate-700 mb-1">URL:</p>
                              <p className="text-xs text-slate-600 break-all">{error.url}</p>
                            </div>
                          )}
                          
                          {error.stack && (
                            <div>
                              <p className="text-xs font-medium text-slate-700 mb-1">Stack Trace:</p>
                              <pre className="text-xs text-slate-600 bg-slate-50 p-2 rounded overflow-auto max-h-40">
                                {error.stack}
                              </pre>
                            </div>
                          )}
                          
                          {error.componentStack && (
                            <div>
                              <p className="text-xs font-medium text-slate-700 mb-1">Component Stack:</p>
                              <pre className="text-xs text-slate-600 bg-slate-50 p-2 rounded overflow-auto max-h-40">
                                {error.componentStack}
                              </pre>
                            </div>
                          )}
                          
                          {error.responseData && (
                            <div>
                              <p className="text-xs font-medium text-slate-700 mb-1">Response Data:</p>
                              <pre className="text-xs text-slate-600 bg-slate-50 p-2 rounded overflow-auto max-h-40">
                                {JSON.stringify(error.responseData, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}