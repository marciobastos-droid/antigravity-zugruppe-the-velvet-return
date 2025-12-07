import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Bell, BellOff, BellRing, Smartphone, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { 
  subscribeToPush, 
  unsubscribeFromPush, 
  checkPushSubscription,
  NOTIFICATION_TYPES 
} from "./NotificationService";

const PREFERENCE_LABELS = {
  new_leads: { label: "Novos Leads Atribuídos", icon: "👤", description: "Quando um novo lead é atribuído a si" },
  opportunity_expiring: { label: "Oportunidades em Risco", icon: "⚠️", description: "Leads que precisam de follow-up urgente" },
  appointments: { label: "Agendamentos Confirmados", icon: "📅", description: "Confirmação de reuniões e visitas" },
  property_matches: { label: "Alertas de Matching", icon: "🎯", description: "Quando propriedades correspondem a clientes" },
  ai_tools: { label: "Ferramentas de IA", icon: "🤖", description: "Quando tarefas de IA são concluídas" },
  follow_up_reminders: { label: "Lembretes de Follow-up", icon: "🔔", description: "Lembretes de acompanhamento de leads" },
  contract_alerts: { label: "Alertas de Contratos", icon: "📄", description: "Assinaturas, escrituras e renovações" },
  team_broadcasts: { label: "Anúncios de Equipa", icon: "📢", description: "Comunicações e alertas da gestão" },
  urgent_leads: { label: "Leads Urgentes", icon: "🔥", description: "Leads que requerem ação imediata" }
};

export default function NotificationPreferences({ user }) {
  const queryClient = useQueryClient();
  const [pushStatus, setPushStatus] = useState({ supported: false, subscribed: false, permission: 'default' });
  const [isSubscribing, setIsSubscribing] = useState(false);

  const { data: subscriptions = [] } = useQuery({
    queryKey: ['pushSubscriptions', user?.email],
    queryFn: () => base44.entities.PushSubscription.filter({ user_email: user?.email, is_active: true }),
    enabled: !!user
  });

  const currentSubscription = subscriptions[0];
  const preferences = currentSubscription?.notification_preferences || {};

  useEffect(() => {
    checkPushSubscription().then(setPushStatus);
  }, []);

  const updatePreferencesMutation = useMutation({
    mutationFn: async (newPreferences) => {
      if (currentSubscription) {
        return base44.entities.PushSubscription.update(currentSubscription.id, {
          notification_preferences: newPreferences
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pushSubscriptions'] });
      toast.success("Preferências guardadas");
    }
  });

  const handleTogglePreference = (key, enabled) => {
    const newPrefs = { ...preferences, [key]: enabled };
    updatePreferencesMutation.mutate(newPrefs);
  };

  const handleSubscribe = async () => {
    setIsSubscribing(true);
    try {
      // Request permission first
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        await subscribeToPush(user.email);
        toast.success("Notificações push ativadas!");
        queryClient.invalidateQueries({ queryKey: ['pushSubscriptions'] });
        setPushStatus({ supported: true, subscribed: true, permission: 'granted' });
      } else {
        toast.error("Permissão para notificações negada");
      }
    } catch (error) {
      toast.error("Erro ao ativar notificações");
    }
    setIsSubscribing(false);
  };

  const handleUnsubscribe = async () => {
    setIsSubscribing(true);
    try {
      await unsubscribeFromPush(user.email);
      toast.success("Notificações push desativadas");
      queryClient.invalidateQueries({ queryKey: ['pushSubscriptions'] });
      setPushStatus(prev => ({ ...prev, subscribed: false }));
    } catch (error) {
      toast.error("Erro ao desativar notificações");
    }
    setIsSubscribing(false);
  };

  return (
    <div className="space-y-6">
      {/* Push Notification Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellRing className="w-5 h-5" />
            Notificações Push
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!pushStatus.supported ? (
            <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              <div>
                <p className="font-medium text-amber-900">Não suportado</p>
                <p className="text-sm text-amber-700">
                  O seu navegador não suporta notificações push.
                </p>
              </div>
            </div>
          ) : pushStatus.permission === 'denied' ? (
            <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg border border-red-200">
              <BellOff className="w-5 h-5 text-red-600" />
              <div>
                <p className="font-medium text-red-900">Notificações Bloqueadas</p>
                <p className="text-sm text-red-700">
                  As notificações foram bloqueadas. Altere nas definições do navegador.
                </p>
              </div>
            </div>
          ) : pushStatus.subscribed || currentSubscription ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-900">Notificações Ativas</p>
                    <p className="text-sm text-green-700">
                      Receberá alertas em tempo real neste dispositivo.
                    </p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleUnsubscribe}
                  disabled={isSubscribing}
                >
                  {isSubscribing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Desativar"}
                </Button>
              </div>

              {currentSubscription?.device_info && (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Smartphone className="w-4 h-4" />
                  <span className="truncate">{currentSubscription.device_info.substring(0, 50)}...</span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-slate-600" />
                <div>
                  <p className="font-medium text-slate-900">Notificações Desativadas</p>
                  <p className="text-sm text-slate-600">
                    Ative para receber alertas importantes em tempo real.
                  </p>
                </div>
              </div>
              <Button 
                onClick={handleSubscribe}
                disabled={isSubscribing}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isSubscribing ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Bell className="w-4 h-4 mr-2" />
                )}
                Ativar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      {(pushStatus.subscribed || currentSubscription) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Preferências de Notificação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(PREFERENCE_LABELS).map(([key, config]) => (
                <div 
                  key={key} 
                  className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                    preferences[key] !== false ? 'bg-blue-50/50 border-blue-200' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{config.icon}</span>
                    <div>
                      <p className="font-medium text-slate-900">{config.label}</p>
                      <p className="text-sm text-slate-500">{config.description}</p>
                    </div>
                  </div>
                  <Switch
                    checked={preferences[key] !== false}
                    onCheckedChange={(checked) => handleTogglePreference(key, checked)}
                    disabled={updatePreferencesMutation.isPending}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notification Types Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-slate-600">Tipos de Notificação</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {Object.entries(NOTIFICATION_TYPES).map(([type, config]) => (
              <Badge key={type} variant="outline" className="text-xs">
                {config.icon} {config.label}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}