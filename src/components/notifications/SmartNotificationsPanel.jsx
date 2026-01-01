import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Bell, Flame, AlertCircle, Clock, Home, Target, 
  MessageCircle, Mail, Calendar, Brain, Zap, 
  ChevronRight, RefreshCw, Sparkles, Check
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";

const priorityConfig = {
  urgent: { color: 'bg-red-100 text-red-800 border-red-300', icon: Flame, label: 'Urgente' },
  high: { color: 'bg-orange-100 text-orange-800 border-orange-300', icon: AlertCircle, label: 'Alta' },
  medium: { color: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: Clock, label: 'Média' },
  low: { color: 'bg-blue-100 text-blue-800 border-blue-300', icon: Bell, label: 'Baixa' }
};

const typeConfig = {
  urgent_lead: { icon: Flame, color: 'text-red-600' },
  property_match: { icon: Home, color: 'text-green-600' },
  task_due: { icon: Clock, color: 'text-amber-600' },
  followup_due: { icon: Target, color: 'text-purple-600' },
  stale_opportunities: { icon: AlertCircle, color: 'text-orange-600' },
  tool_suggestion: { icon: Zap, color: 'text-blue-600' },
  investor_opportunity: { icon: Sparkles, color: 'text-indigo-600' }
};

const toolConfig = {
  whatsapp: { icon: MessageCircle, label: 'WhatsApp', color: 'bg-green-100 text-green-700' },
  emailHub: { icon: Mail, label: 'Email', color: 'bg-blue-100 text-blue-700' },
  calendar: { icon: Calendar, label: 'Calendário', color: 'bg-purple-100 text-purple-700' },
  aiMatching: { icon: Brain, label: 'AI Matching', color: 'bg-indigo-100 text-indigo-700' },
  leadManagement: { icon: Target, label: 'Leads', color: 'bg-amber-100 text-amber-700' }
};

export default function SmartNotificationsPanel({ user, compact = false }) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dismissedNotifications, setDismissedNotifications] = useState(new Set());
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['smartNotifications', user?.email],
    queryFn: async () => {
      const response = await base44.functions.invoke('processSmartNotifications', {
        agent_email: user?.email
      });
      return response.data;
    },
    enabled: !!user?.email,
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
    staleTime: 2 * 60 * 1000
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  const handleMarkAsRead = (idx) => {
    setDismissedNotifications(prev => new Set([...prev, idx]));
    toast.success("Notificação marcada como lida");
  };

  const allNotifications = data?.notifications || [];
  const notifications = allNotifications.filter((_, idx) => !dismissedNotifications.has(idx));
  const summary = data?.summary || { total: 0, urgent: 0, high: 0 };

  if (compact) {
    return (
      <Card className="border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-600" />
              <span className="font-semibold text-amber-900">Alertas Inteligentes</span>
            </div>
            {summary.urgent > 0 && (
              <Badge className="bg-red-500 text-white animate-pulse">
                {summary.urgent} urgente{summary.urgent > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
          
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <RefreshCw className="w-5 h-5 animate-spin text-amber-600" />
            </div>
          ) : notifications.length === 0 ? (
            <p className="text-sm text-amber-700">Nenhum alerta no momento</p>
          ) : (
            <div className="space-y-2">
              {notifications.slice(0, 3).map((notif, idx) => {
                const TypeIcon = typeConfig[notif.type]?.icon || Bell;
                const priority = priorityConfig[notif.priority];
                
                return (
                  <Link
                    key={idx}
                    to={notif.action_url?.startsWith('/') ? createPageUrl(notif.action_url.split('/')[1].split('?')[0]) + (notif.action_url.includes('?') ? '?' + notif.action_url.split('?')[1] : '') : '#'}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-amber-100/50 transition-colors"
                  >
                    <TypeIcon className={`w-4 h-4 ${typeConfig[notif.type]?.color || 'text-slate-600'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{notif.title}</p>
                      <p className="text-xs text-slate-600 truncate">{notif.message}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </Link>
                );
              })}
              {notifications.length > 3 && (
                <p className="text-xs text-center text-amber-600 pt-1">
                  +{notifications.length - 3} mais alertas
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-500" />
          Notificações Inteligentes
        </CardTitle>
        <div className="flex items-center gap-2">
          {summary.urgent > 0 && (
            <Badge className="bg-red-500 text-white">
              {summary.urgent} urgente{summary.urgent > 1 ? 's' : ''}
            </Badge>
          )}
          {summary.high > 0 && (
            <Badge className="bg-orange-500 text-white">
              {summary.high} alta{summary.high > 1 ? 's' : ''}
            </Badge>
          )}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Nenhum alerta no momento</p>
            <p className="text-sm">Está tudo em dia!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notif, idx) => {
              const TypeIcon = typeConfig[notif.type]?.icon || Bell;
              const priority = priorityConfig[notif.priority];
              const PriorityIcon = priority.icon;
              const tool = notif.suggested_tool ? toolConfig[notif.suggested_tool] : null;
              
              return (
                <div
                  key={idx}
                  className={`p-3 rounded-lg border ${
                    notif.priority === 'urgent' ? 'border-red-200 bg-red-50' :
                    notif.priority === 'high' ? 'border-orange-200 bg-orange-50' :
                    'border-slate-200 bg-slate-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${
                      notif.priority === 'urgent' ? 'bg-red-100' :
                      notif.priority === 'high' ? 'bg-orange-100' : 'bg-slate-100'
                    }`}>
                      <TypeIcon className={`w-5 h-5 ${typeConfig[notif.type]?.color || 'text-slate-600'}`} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-slate-900">{notif.title}</span>
                        <Badge className={`${priority.color} text-xs`}>
                          <PriorityIcon className="w-3 h-3 mr-1" />
                          {priority.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-600 mb-2">{notif.message}</p>
                      
                      <div className="flex items-center gap-2 flex-wrap">
                        {tool && (
                          <Link to={createPageUrl('Tools') + `?tab=${notif.suggested_tool}`}>
                            <Badge className={`${tool.color} cursor-pointer hover:opacity-80`}>
                              <tool.icon className="w-3 h-3 mr-1" />
                              Usar {tool.label}
                            </Badge>
                          </Link>
                        )}
                        {notif.action_url && (
                          <Link 
                            to={notif.action_url?.startsWith('/') ? createPageUrl(notif.action_url.split('/')[1].split('?')[0]) + (notif.action_url.includes('?') ? '?' + notif.action_url.split('?')[1] : '') : '#'}
                          >
                            <Button variant="outline" size="sm" className="h-6 text-xs">
                              Ver detalhes
                              <ChevronRight className="w-3 h-3 ml-1" />
                            </Button>
                          </Link>
                        )}
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 text-xs text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={(e) => {
                            e.preventDefault();
                            handleMarkAsRead(idx);
                          }}
                        >
                          <Check className="w-3 h-3 mr-1" />
                          Marcar como lida
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}