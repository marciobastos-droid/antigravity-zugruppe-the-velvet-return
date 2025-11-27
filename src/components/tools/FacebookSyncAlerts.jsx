import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Bell, AlertTriangle, CheckCircle2, XCircle, Mail, Clock } from "lucide-react";
import { toast } from "sonner";

export default function FacebookSyncAlerts({ 
  settings = {}, 
  onSaveSettings,
  recentErrors = []
}) {
  const [alertSettings, setAlertSettings] = React.useState({
    emailOnError: settings.emailOnError || false,
    emailOnNewLeads: settings.emailOnNewLeads || false,
    alertEmail: settings.alertEmail || '',
    maxHoursWithoutSync: settings.maxHoursWithoutSync || 24,
    ...settings
  });

  const handleSave = () => {
    onSaveSettings(alertSettings);
    toast.success("Configurações de alertas guardadas");
  };

  return (
    <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-white">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="w-5 h-5 text-amber-600" />
          Alertas de Sincronização
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Recent Errors Alert */}
        {recentErrors.length > 0 && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-red-900 text-sm">
                  {recentErrors.length} erro(s) recente(s) de sincronização
                </p>
                <div className="mt-2 space-y-1">
                  {recentErrors.slice(0, 3).map((error, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-red-700">
                      <XCircle className="w-3 h-3" />
                      <span>{error.form_name || error.form_id}:</span>
                      <span className="truncate">{error.error_message}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Alert Settings */}
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <Label className="font-medium text-slate-900">Alertar em erros</Label>
                <p className="text-xs text-slate-500">Receber email quando uma sincronização falhar</p>
              </div>
            </div>
            <Switch
              checked={alertSettings.emailOnError}
              onCheckedChange={(checked) => setAlertSettings({...alertSettings, emailOnError: checked})}
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <Label className="font-medium text-slate-900">Alertar novos leads</Label>
                <p className="text-xs text-slate-500">Receber email quando novos leads forem importados</p>
              </div>
            </div>
            <Switch
              checked={alertSettings.emailOnNewLeads}
              onCheckedChange={(checked) => setAlertSettings({...alertSettings, emailOnNewLeads: checked})}
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Clock className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <Label className="font-medium text-slate-900">Alerta de inatividade</Label>
                <p className="text-xs text-slate-500">Alertar se não houver sync por X horas</p>
              </div>
            </div>
            <Input
              type="number"
              min={1}
              max={168}
              value={alertSettings.maxHoursWithoutSync}
              onChange={(e) => setAlertSettings({...alertSettings, maxHoursWithoutSync: parseInt(e.target.value) || 24})}
              className="w-20 h-8 text-center"
            />
          </div>
        </div>

        {/* Email for alerts */}
        {(alertSettings.emailOnError || alertSettings.emailOnNewLeads) && (
          <div>
            <Label className="text-sm text-slate-700 mb-1.5 flex items-center gap-1">
              <Mail className="w-3 h-3" />
              Email para alertas
            </Label>
            <Input
              type="email"
              value={alertSettings.alertEmail}
              onChange={(e) => setAlertSettings({...alertSettings, alertEmail: e.target.value})}
              placeholder="seu@email.com"
              className="h-9"
            />
          </div>
        )}

        <Button onClick={handleSave} className="w-full" size="sm">
          Guardar Configurações
        </Button>
      </CardContent>
    </Card>
  );
}