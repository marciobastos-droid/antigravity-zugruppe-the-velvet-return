import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Bell, BellOff, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function PushNotificationManager({ user }) {
  const queryClient = useQueryClient();
  const [permissionStatus, setPermissionStatus] = React.useState('default');
  const [isSubscribed, setIsSubscribed] = React.useState(false);
  const [isSupported, setIsSupported] = React.useState(true);

  const { data: subscription } = useQuery({
    queryKey: ['pushSubscription', user?.email],
    queryFn: async () => {
      if (!user) return null;
      const subs = await base44.entities.PushSubscription.filter({ user_email: user.email });
      return subs[0] || null;
    },
    enabled: !!user
  });

  const [preferences, setPreferences] = React.useState({
    new_leads: true,
    follow_up_reminders: true,
    property_matches: true,
    appointments: true
  });

  React.useEffect(() => {
    if (subscription?.notification_preferences) {
      setPreferences(subscription.notification_preferences);
    }
  }, [subscription]);

  React.useEffect(() => {
    // Check if notifications are supported
    const notificationsSupported = 'Notification' in window;
    setIsSupported(notificationsSupported);
    
    if (notificationsSupported) {
      setPermissionStatus(Notification.permission);
    }
    
    // Check if already subscribed
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.ready.then(registration => {
        registration.pushManager.getSubscription().then(sub => {
          setIsSubscribed(!!sub);
        });
      }).catch(() => {});
    }
  }, []);

  const updatePreferencesMutation = useMutation({
    mutationFn: async (newPreferences) => {
      if (subscription) {
        return await base44.entities.PushSubscription.update(subscription.id, {
          notification_preferences: newPreferences
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pushSubscription'] });
      toast.success("Preferências atualizadas");
    }
  });

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      toast.error("Este browser não suporta notificações");
      return;
    }

    const permission = await Notification.requestPermission();
    setPermissionStatus(permission);

    if (permission === 'granted') {
      toast.success("Notificações ativadas!");
      // Subscribe to push notifications
      await subscribeToPush();
    } else if (permission === 'denied') {
      toast.error("Permissão de notificações negada");
    }
  };

  const subscribeToPush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      // Fallback: save preference without actual push subscription
      await base44.entities.PushSubscription.create({
        user_email: user.email,
        endpoint: 'browser-fallback',
        keys: {},
        notification_preferences: preferences
      });
      setIsSubscribed(true);
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      
      // For demo purposes, we'll just save the preference
      // Real implementation would need VAPID keys
      await base44.entities.PushSubscription.create({
        user_email: user.email,
        endpoint: 'web-push-enabled',
        keys: {},
        notification_preferences: preferences
      });
      
      setIsSubscribed(true);
      queryClient.invalidateQueries({ queryKey: ['pushSubscription'] });
    } catch (error) {
      console.error('Push subscription failed:', error);
      toast.error("Erro ao ativar notificações");
    }
  };

  const handlePreferenceChange = (key, value) => {
    const newPreferences = { ...preferences, [key]: value };
    setPreferences(newPreferences);
    if (subscription) {
      updatePreferencesMutation.mutate(newPreferences);
    }
  };

  const testNotification = () => {
    if (permissionStatus === 'granted') {
      new Notification("Teste de Notificação", {
        body: "As notificações estão a funcionar corretamente!",
        icon: "/favicon.ico"
      });
    } else {
      toast.info("Ative as notificações primeiro");
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Bell className="w-5 h-5 text-amber-600" />
          Notificações Push
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Not Supported Message */}
        {!isSupported && (
          <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div>
              <p className="font-medium text-amber-900">Navegador não suportado</p>
              <p className="text-xs text-amber-700">
                O seu navegador não suporta notificações push. Utilize Chrome, Firefox, Edge ou Safari para ativar esta funcionalidade.
              </p>
            </div>
          </div>
        )}

        {/* Permission Status */}
        {isSupported && (
        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
          <div className="flex items-center gap-3">
            {permissionStatus === 'granted' ? (
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            ) : permissionStatus === 'denied' ? (
              <BellOff className="w-5 h-5 text-red-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-600" />
            )}
            <div>
              <p className="font-medium text-slate-900">
                {permissionStatus === 'granted' ? 'Notificações Ativas' :
                 permissionStatus === 'denied' ? 'Notificações Bloqueadas' :
                 'Notificações Desativadas'}
              </p>
              <p className="text-xs text-slate-500">
                {permissionStatus === 'denied' 
                  ? 'Altere nas definições do browser'
                  : 'Receba alertas importantes em tempo real'}
              </p>
            </div>
          </div>
          {permissionStatus !== 'granted' && permissionStatus !== 'denied' && (
            <Button onClick={requestPermission} size="sm">
              Ativar
            </Button>
          )}
          {permissionStatus === 'granted' && (
            <Button onClick={testNotification} variant="outline" size="sm">
              Testar
            </Button>
          )}
        </div>
        )}

        {/* Notification Preferences */}
        {(permissionStatus === 'granted' || subscription) && (
          <div className="space-y-3 pt-2">
            <p className="text-sm font-medium text-slate-700">Preferências de Notificação</p>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="new_leads" className="text-sm">Novos Leads</Label>
              <Switch
                id="new_leads"
                checked={preferences.new_leads}
                onCheckedChange={(v) => handlePreferenceChange('new_leads', v)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="follow_ups" className="text-sm">Lembretes de Follow-up</Label>
              <Switch
                id="follow_ups"
                checked={preferences.follow_up_reminders}
                onCheckedChange={(v) => handlePreferenceChange('follow_up_reminders', v)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="matches" className="text-sm">Matches de Imóveis</Label>
              <Switch
                id="matches"
                checked={preferences.property_matches}
                onCheckedChange={(v) => handlePreferenceChange('property_matches', v)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="appointments" className="text-sm">Visitas Agendadas</Label>
              <Switch
                id="appointments"
                checked={preferences.appointments}
                onCheckedChange={(v) => handlePreferenceChange('appointments', v)}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}