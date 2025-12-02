import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, Eye, Trash2, X, UserPlus, Target, Phone, Mail, MapPin, Euro, Clock, ChevronRight, CheckCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function NotificationBell({ user }) {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', user?.email],
    queryFn: async () => {
      if (!user) return [];
      const notifs = await base44.entities.Notification.filter(
        { user_email: user.email },
        '-created_date',
        50
      );
      return notifs;
    },
    enabled: !!user,
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Fetch new leads (last 24h)
  const isAdmin = user && (user.role === 'admin' || user.user_type === 'admin' || user.user_type === 'gestor');
  
  const { data: newLeads = [] } = useQuery({
    queryKey: ['newLeads', user?.email],
    queryFn: async () => {
      if (!user) return [];
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const allOpps = await base44.entities.Opportunity.filter(
        { status: 'new' },
        '-created_date',
        20
      );
      
      // Filter by user if not admin
      const filtered = isAdmin ? allOpps : allOpps.filter(o => 
        o.assigned_to === user.email || o.created_by === user.email
      );
      
      return filtered;
    },
    enabled: !!user,
    refetchInterval: 30000, // Refresh every 30 seconds
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

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const unreadNotifs = notifications.filter(n => !n.is_read);
      await Promise.all(unreadNotifs.map(n => 
        base44.entities.Notification.update(n.id, { is_read: true })
      ));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const totalAlerts = unreadCount + newLeads.length;
  const [activeTab, setActiveTab] = useState("leads");

  const handleNotificationClick = (notification) => {
    markAsReadMutation.mutate(notification.id);
    
    if (notification.action_url) {
      navigate(notification.action_url);
      setIsOpen(false);
    } else if (notification.related_type === 'Opportunity' && notification.related_id) {
      navigate(createPageUrl('Opportunities'));
      setIsOpen(false);
    }
  };

  const getNotificationIcon = (type) => {
    const icons = {
      lead: "👤",
      opportunity: "💼",
      appointment: "📅",
      contract: "📄",
      matching: "🎯",
      ai_tool: "🤖",
      system: "ℹ️"
    };
    return icons[type] || "🔔";
  };

  const getPriorityColor = (priority) => {
    const colors = {
      urgent: "border-l-4 border-l-red-600 bg-red-100",
      high: "border-l-4 border-l-red-500 bg-red-50",
      medium: "border-l-4 border-l-yellow-500 bg-yellow-50",
      low: "border-l-4 border-l-blue-500 bg-blue-50"
    };
    return colors[priority] || "";
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors"
      >
        <Bell className="w-5 h-5 text-slate-600" />
        {totalAlerts > 0 && (
          <Badge className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center bg-red-500 text-white text-xs px-1">
            {totalAlerts > 9 ? "9+" : totalAlerts}
          </Badge>
        )}
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-[420px] bg-white rounded-lg shadow-xl border border-slate-200 z-50">
            <div className="flex items-center justify-between p-3 border-b">
              <h3 className="font-semibold text-slate-900">Notificações</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-slate-100 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full grid grid-cols-2 p-1 mx-2 mt-2" style={{ width: 'calc(100% - 16px)' }}>
                <TabsTrigger value="leads" className="text-xs">
                  <UserPlus className="w-3 h-3 mr-1" />
                  Novos Leads
                  {newLeads.length > 0 && (
                    <Badge className="ml-1 h-4 px-1 bg-green-500 text-white text-xs">
                      {newLeads.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="notifications" className="text-xs">
                  <Bell className="w-3 h-3 mr-1" />
                  Notificações
                  {unreadCount > 0 && (
                    <Badge className="ml-1 h-4 px-1 bg-blue-500 text-white text-xs">
                      {unreadCount}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="leads" className="mt-0">
                <ScrollArea className="h-80">
                  {newLeads.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">
                      <Target className="w-12 h-12 mx-auto mb-2 opacity-20" />
                      <p>Sem novos leads</p>
                      <p className="text-xs mt-1">Os novos leads aparecerão aqui</p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {newLeads.map((lead) => (
                        <div
                          key={lead.id}
                          className="p-3 hover:bg-green-50 transition-colors cursor-pointer border-l-4 border-l-green-500"
                          onClick={() => {
                            navigate(createPageUrl('CRMAdvanced') + '?tab=opportunities');
                            setIsOpen(false);
                          }}
                        >
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-full bg-green-100">
                              <UserPlus className="w-4 h-4 text-green-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-semibold text-sm text-slate-900 truncate">
                                  {lead.buyer_name || 'Novo Lead'}
                                </p>
                                <Badge className="bg-green-100 text-green-700 text-xs h-5">
                                  Novo
                                </Badge>
                              </div>
                              
                              <div className="flex flex-wrap gap-2 text-xs text-slate-600 mb-1">
                                {lead.buyer_email && (
                                  <span className="flex items-center gap-1">
                                    <Mail className="w-3 h-3" />
                                    {lead.buyer_email}
                                  </span>
                                )}
                                {lead.buyer_phone && (
                                  <span className="flex items-center gap-1">
                                    <Phone className="w-3 h-3" />
                                    {lead.buyer_phone}
                                  </span>
                                )}
                              </div>
                              
                              <div className="flex flex-wrap gap-2 text-xs">
                                {lead.location && (
                                  <Badge variant="outline" className="h-5">
                                    <MapPin className="w-3 h-3 mr-1" />
                                    {lead.location}
                                  </Badge>
                                )}
                                {lead.budget && (
                                  <Badge variant="outline" className="h-5">
                                    <Euro className="w-3 h-3 mr-1" />
                                    {typeof lead.budget === 'number' 
                                      ? `€${lead.budget.toLocaleString()}`
                                      : lead.budget}
                                  </Badge>
                                )}
                                {lead.lead_source && (
                                  <Badge className="bg-purple-100 text-purple-700 h-5 text-xs">
                                    {lead.lead_source === 'facebook_ads' ? 'Facebook' :
                                     lead.lead_source === 'website' ? 'Website' :
                                     lead.lead_source === 'referral' ? 'Indicação' :
                                     lead.lead_source}
                                  </Badge>
                                )}
                              </div>

                              <div className="flex items-center justify-between mt-2">
                                <span className="text-xs text-slate-400 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {formatDistanceToNow(new Date(lead.created_date), { addSuffix: true, locale: ptBR })}
                                </span>
                                <ChevronRight className="w-4 h-4 text-slate-400" />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
                
                {newLeads.length > 0 && (
                  <div className="p-2 border-t text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        navigate(createPageUrl('CRMAdvanced') + '?tab=opportunities');
                        setIsOpen(false);
                      }}
                      className="text-xs text-green-600 hover:text-green-700"
                    >
                      Ver todos os leads ({newLeads.length})
                    </Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="notifications" className="mt-0">
                <div className="flex items-center justify-end px-3 py-1 border-b">
                  {unreadCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markAllAsReadMutation.mutate()}
                      className="text-xs h-7"
                    >
                      <Check className="w-3 h-3 mr-1" />
                      Marcar todas
                    </Button>
                  )}
                </div>
                
                <ScrollArea className="h-72">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">
                      <Bell className="w-12 h-12 mx-auto mb-2 opacity-20" />
                      <p>Sem notificações</p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {notifications.map((notif) => (
                        <div
                          key={notif.id}
                          className={`p-3 hover:bg-slate-50 transition-colors cursor-pointer ${
                            !notif.is_read ? 'bg-blue-50/50' : ''
                          } ${getPriorityColor(notif.priority)}`}
                          onClick={() => handleNotificationClick(notif)}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-lg">{getNotificationIcon(notif.type)}</span>
                                <p className="font-semibold text-sm text-slate-900">
                                  {notif.title}
                                </p>
                                {!notif.is_read && (
                                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                                )}
                              </div>
                              <p className="text-sm text-slate-600 mb-2">
                                {notif.message}
                              </p>
                              <p className="text-xs text-slate-400">
                                {format(new Date(notif.created_date), "dd/MM/yyyy HH:mm")}
                              </p>
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
                                  <Eye className="w-3 h-3 text-slate-500" />
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
                                <Trash2 className="w-3 h-3 text-red-500" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>
        </>
      )}
    </div>
  );
}