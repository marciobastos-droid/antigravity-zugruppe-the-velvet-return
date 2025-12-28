import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bug, TrendingUp, Activity } from "lucide-react";
import ErrorLogViewer from "../errors/ErrorLogViewer";
import { getErrorStats } from "../errors/ErrorLogger";

/**
 * Admin panel for viewing and managing error logs
 */
export default function ErrorLogsAdmin() {
  const [stats, setStats] = React.useState(null);

  React.useEffect(() => {
    const errorStats = getErrorStats();
    setStats(errorStats);

    // Refresh every 30 seconds
    const interval = setInterval(() => {
      const updated = getErrorStats();
      setStats(updated);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Logs de Erro</h2>
        <p className="text-slate-600">Monitorização e análise de erros da aplicação</p>
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-100 rounded-full">
                  <Bug className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
                  <p className="text-sm text-slate-600">Total de Erros</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-orange-100 rounded-full">
                  <Activity className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900">
                    {stats.bySeverity?.critical || 0}
                  </div>
                  <p className="text-sm text-slate-600">Erros Críticos</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 rounded-full">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900">
                    {stats.byType?.api || 0}
                  </div>
                  <p className="text-sm text-slate-600">Erros de API</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="logs" className="w-full">
        <TabsList>
          <TabsTrigger value="logs">Logs de Erro</TabsTrigger>
          <TabsTrigger value="stats">Estatísticas</TabsTrigger>
        </TabsList>

        <TabsContent value="logs" className="mt-6">
          <ErrorLogViewer />
        </TabsContent>

        <TabsContent value="stats" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Análise de Erros</CardTitle>
            </CardHeader>
            <CardContent>
              {stats && (
                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-3">Por Tipo</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {Object.entries(stats.byType).map(([type, count]) => (
                        <div key={type} className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                          <div className="text-lg font-bold text-slate-900">{count}</div>
                          <p className="text-sm text-slate-600 capitalize">{type}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-slate-900 mb-3">Por Severidade</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {Object.entries(stats.bySeverity).map(([severity, count]) => (
                        <div key={severity} className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                          <div className="text-lg font-bold text-slate-900">{count}</div>
                          <p className="text-sm text-slate-600 capitalize">{severity}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}