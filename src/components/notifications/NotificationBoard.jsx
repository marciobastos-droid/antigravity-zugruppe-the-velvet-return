import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Check, Trash2, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function NotificationBoard({ user }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', user?.email],
    queryFn: async () => {
      if (!user) return [];
      const notifs = await base44.entities.Notification.filter(
        { user_email: user.email },
        '-created_date',
        10
      );
      return notifs;
    },
    enabled: !!user,
    refetchInterval: 10000,
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.update(id, { is_read: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const handleNotificationClick = (notification) => {
    markAsReadMutation.mutate(notification.id);
    
    if (notification.action_url) {
      navigate(notification.action_url);
    } else if (notification.related_type === 'Opportunity' && notification.related_id) {
      navigate(createPageUrl('Opportunities'));
    }
  };

  const getNotificationIcon = (type) => {
    const icons = {
      lead: "👤",
      opportunity: "💼",
      appointment: "📅",
      contract: "📄",
      system: "ℹ️"
    };
    return icons[type] || "🔔";
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notificações Recentes
            {unreadCount > 0 && (
              <Badge className="bg-red-500">{unreadCount}</Badge>
            )}
          </div>
          {notifications.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(createPageUrl('Opportunities'))}
            >
              Ver todas
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {notifications.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <Bell className="w-12 h-12 mx-auto mb-2 opacity-20" />
            <p>Sem notificações</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.slice(0, 5).map((notif) => (
              <div
                key={notif.id}
                className={`p-3 rounded-lg border transition-all cursor-pointer hover:shadow-md ${
                  !notif.is_read 
                    ? 'bg-blue-50 border-blue-200' 
                    : 'bg-slate-50 border-slate-200'
                }`}
                onClick={() => handleNotificationClick(notif)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <span className="text-2xl">{getNotificationIcon(notif.type)}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-sm text-slate-900">
                          {notif.title}
                        </p>
                        {!notif.is_read && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full" />
                        )}
                      </div>
                      <p className="text-sm text-slate-600 mb-1">
                        {notif.message}
                      </p>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-slate-400">
                          {format(new Date(notif.created_date), "dd/MM/yyyy HH:mm")}
                        </p>
                        {notif.priority === 'high' && (
                          <Badge variant="destructive" className="text-xs">
                            Urgente
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {!notif.is_read && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsReadMutation.mutate(notif.id);
                        }}
                        className="p-1 hover:bg-slate-200 rounded"
                        title="Marcar como lida"
                      >
                        <Check className="w-4 h-4 text-green-600" />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteMutation.mutate(notif.id);
                      }}
                      className="p-1 hover:bg-red-100 rounded"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}