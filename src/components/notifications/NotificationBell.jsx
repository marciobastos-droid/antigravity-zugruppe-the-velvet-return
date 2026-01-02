import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, Eye, Trash2, X, UserPlus, Target, Phone, Mail, MapPin, Euro, Clock, ChevronRight, CheckCheck, Loader2, Circle, CheckCircle, Filter, Volume2, VolumeX, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function NotificationBell({ user }) {
  const [isOpen, setIsOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem('notificationSoundEnabled');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [typeFilter, setTypeFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const previousCountRef = useRef(0);
  const audioRef = useRef(null);

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', user?.email],
    queryFn: async () => {
      if (!user || typeof base44 === 'undefined') return [];
      const notifs = await base44.entities.Notification.filter(
        { user_email: user.email },
        '-created_date',
        50
      );
      return notifs;
    },
    enabled: !!user && typeof base44 !== 'undefined',
    refetchInterval: 5000, // Refresh every 5 seconds (real-time simulation)
  });

  // Play sound and vibrate on new notifications
  useEffect(() => {
    if (!notifications || notifications.length === 0) return;
    
    const currentUnreadCount = notifications.filter(n => !n.is_read).length;
    
    if (currentUnreadCount > previousCountRef.current && previousCountRef.current > 0) {
      // New notification arrived
      if (soundEnabled) {
        // Play notification sound
        try {
          if (!audioRef.current) {
            audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZRA0PVqzn77BdGAg+ltzy0H4qBCp+zPLaizsIGGS57OihUBELTKXh8bllHAU2jtHz1YU2Bhxqve7mnEoPD1Om5O+zYhsGPJPY8tGAKwUnfsvx3Y4+CRZiuevsn08PC0yj4/K8aB8FM4nU8tiIOQcZaLrr7aJNDQ5TpuXvtGMeCjyS1/HQfywFKH3L8dyNPgkWYrjr7J9OEAtMo+PyvmccBTOJ1PLYiDkHGWi76+2iTQ0OU6Xl77RjHgo8ktfx0H8sBSh9y/HcjT4JFmK46+yfThALTKPj8r5nHAUzidTy2Ig5Bxlouer');
            audioRef.current.volume = 0.5;
          }
          audioRef.current.play().catch(() => {});
        } catch (error) {
          console.error('Error playing notification sound:', error);
        }
        
        // Vibrate on mobile devices
        if ('vibrate' in navigator) {
          navigator.vibrate([200, 100, 200]);
        }
      }
    }
    
    previousCountRef.current = currentUnreadCount;
  }, [notifications, soundEnabled]);

  // Fetch new leads (last 24h)
  const isAdmin = React.useMemo(() => {
    return user && (user.role === 'admin' || user.user_type === 'admin' || user.user_type === 'gestor');
  }, [user]);
  
  const { data: newLeads = [] } = useQuery({
    queryKey: ['newLeads', user?.email],
    queryFn: async () => {
      if (!user || typeof base44 === 'undefined') return [];
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const allOpps = await base44.entities.Opportunity.filter(
        { status: 'new' },
        '-created_date',
        50
      );
      
      // Filter by user if not admin
      const filtered = isAdmin ? allOpps : allOpps.filter(o => 
        o.assigned_to === user.email || o.created_by === user.email
      );
      
      return filtered;
    },
    enabled: !!user && typeof base44 !== 'undefined',
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch unread leads (is_read = false)
  const { data: unreadLeads = [] } = useQuery({
    queryKey: ['unreadLeads', user?.email],
    queryFn: async () => {
      if (!user || typeof base44 === 'undefined') return [];
      
      const allOpps = await base44.entities.Opportunity.filter(
        { is_read: false },
        '-created_date',
        50
      );
      
      // Filter by user if not admin
      const filtered = isAdmin ? allOpps : allOpps.filter(o => 
        o.assigned_to === user.email || o.created_by === user.email
      );
      
      return filtered;
    },
    enabled: !!user && typeof base44 !== 'undefined',
    refetchInterval: 30000,
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

  // Mark all leads as contacted (effectively "read")
  const markAllLeadsAsReadMutation = useMutation({
    mutationFn: async () => {
      await Promise.all(newLeads.map(lead => 
        base44.entities.Opportunity.update(lead.id, { status: 'contacted' })
      ));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['newLeads'] });
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
    },
  });

  // Mark single lead as read
  const markLeadAsReadMutation = useMutation({
    mutationFn: async (leadId) => {
      await base44.entities.Opportunity.update(leadId, { 
        is_read: true,
        read_at: new Date().toISOString(),
        read_by: user?.email
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unreadLeads'] });
      queryClient.invalidateQueries({ queryKey: ['newLeads'] });
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
    },
  });

  // Mark all unread leads as read
  const markAllUnreadLeadsAsReadMutation = useMutation({
    mutationFn: async () => {
      await Promise.all(unreadLeads.map(lead => 
        base44.entities.Opportunity.update(lead.id, { 
          is_read: true,
          read_at: new Date().toISOString(),
          read_by: user?.email
        })
      ));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unreadLeads'] });
      queryClient.invalidateQueries({ queryKey: ['newLeads'] });
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
    },
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const unreadLeadsCount = unreadLeads.length;
  const totalAlerts = unreadCount + newLeads.length + unreadLeadsCount;
  const [activeTab, setActiveTab] = useState("leads");

  // Toggle sound
  const toggleSound = () => {
    const newValue = !soundEnabled;
    setSoundEnabled(newValue);
    localStorage.setItem('notificationSoundEnabled', JSON.stringify(newValue));
  };

  // Group notifications by type and similarity
  const groupedNotifications = React.useMemo(() => {
    const groups = {};
    
    notifications.forEach(notif => {
      // Create a grouping key based on type and similar content
      const groupKey = `${notif.type}_${notif.title}`;
      
      if (!groups[groupKey]) {
        groups[groupKey] = {
          ...notif,
          count: 1,
          items: [notif],
          latestDate: notif.created_date
        };
      } else {
        groups[groupKey].count++;
        groups[groupKey].items.push(notif);
        if (new Date(notif.created_date) > new Date(groups[groupKey].latestDate)) {
          groups[groupKey].latestDate = notif.created_date;
        }
      }
    });
    
    return Object.values(groups).sort((a, b) => 
      new Date(b.latestDate) - new Date(a.latestDate)
    );
  }, [notifications]);

  // Apply filters to notifications
  const filteredNotifications = React.useMemo(() => {
    return groupedNotifications.filter(group => {
      const typeMatch = typeFilter === "all" || group.type === typeFilter;
      const priorityMatch = priorityFilter === "all" || group.priority === priorityFilter;
      return typeMatch && priorityMatch;
    });
  }, [groupedNotifications, typeFilter, priorityFilter]);

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
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleSound}
                  className="p-1.5 hover:bg-slate-100 rounded transition-colors"
                  title={soundEnabled ? "Desativar sons" : "Ativar sons"}
                >
                  {soundEnabled ? (
                    <Volume2 className="w-4 h-4 text-slate-600" />
                  ) : (
                    <VolumeX className="w-4 h-4 text-slate-400" />
                  )}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 hover:bg-slate-100 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full grid grid-cols-3 p-1 mx-2 mt-2" style={{ width: 'calc(100% - 16px)' }}>
                <TabsTrigger value="leads" className="text-xs">
                  <UserPlus className="w-3 h-3 mr-1" />
                  Novos
                  {newLeads.length > 0 && (
                    <Badge className="ml-1 h-4 px-1 bg-green-500 text-white text-xs">
                      {newLeads.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="unread" className="text-xs">
                  <Circle className="w-3 h-3 mr-1" />
                  Não Lidas
                  {unreadLeadsCount > 0 && (
                    <Badge className="ml-1 h-4 px-1 bg-amber-500 text-white text-xs">
                      {unreadLeadsCount}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="notifications" className="text-xs">
                  <Bell className="w-3 h-3 mr-1" />
                  Notif.
                  {unreadCount > 0 && (
                    <Badge className="ml-1 h-4 px-1 bg-blue-500 text-white text-xs">
                      {unreadCount}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="leads" className="mt-0">
                {newLeads.length > 0 && (
                  <div className="flex items-center justify-end px-3 py-1 border-b">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markAllLeadsAsReadMutation.mutate()}
                      disabled={markAllLeadsAsReadMutation.isPending}
                      className="text-xs h-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                    >
                      {markAllLeadsAsReadMutation.isPending ? (
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      ) : (
                        <CheckCheck className="w-3 h-3 mr-1" />
                      )}
                      Marcar todos como contactados
                    </Button>
                  </div>
                )}
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

              <TabsContent value="unread" className="mt-0">
                {unreadLeads.length > 0 && (
                  <div className="flex items-center justify-end px-3 py-1 border-b">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markAllUnreadLeadsAsReadMutation.mutate()}
                      disabled={markAllUnreadLeadsAsReadMutation.isPending}
                      className="text-xs h-7 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                    >
                      {markAllUnreadLeadsAsReadMutation.isPending ? (
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      ) : (
                        <CheckCheck className="w-3 h-3 mr-1" />
                      )}
                      Marcar todas como lidas
                    </Button>
                  </div>
                )}
                <ScrollArea className="h-80">
                  {unreadLeads.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">
                      <CheckCircle className="w-12 h-12 mx-auto mb-2 opacity-20" />
                      <p>Todas as leads foram lidas</p>
                      <p className="text-xs mt-1">Bom trabalho!</p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {unreadLeads.map((lead) => (
                        <div
                          key={lead.id}
                          className="p-3 hover:bg-amber-50 transition-colors cursor-pointer border-l-4 border-l-amber-500"
                          onClick={() => {
                            navigate(createPageUrl('CRMAdvanced') + '?tab=opportunities');
                            setIsOpen(false);
                          }}
                        >
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-full bg-amber-100">
                              <Circle className="w-4 h-4 text-amber-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-semibold text-sm text-slate-900 truncate">
                                  {lead.buyer_name || 'Lead'}
                                </p>
                                <Badge className="bg-amber-100 text-amber-700 text-xs h-5">
                                  Não lida
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
                              </div>

                              <div className="flex items-center justify-between mt-2">
                                <span className="text-xs text-slate-400 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {formatDistanceToNow(new Date(lead.created_date), { addSuffix: true, locale: ptBR })}
                                </span>
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-2 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-100"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      markLeadAsReadMutation.mutate(lead.id);
                                    }}
                                    disabled={markLeadAsReadMutation.isPending}
                                  >
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Marcar lida
                                  </Button>
                                  <ChevronRight className="w-4 h-4 text-slate-400" />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="notifications" className="mt-0">
                <div className="flex items-center justify-between px-3 py-2 border-b bg-slate-50">
                  <div className="flex items-center gap-2">
                    <Filter className="w-3 h-3 text-slate-500" />
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger className="h-7 w-28 text-xs">
                        <SelectValue placeholder="Tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="lead">Leads</SelectItem>
                        <SelectItem value="opportunity">Oportunidades</SelectItem>
                        <SelectItem value="appointment">Reuniões</SelectItem>
                        <SelectItem value="contract">Contratos</SelectItem>
                        <SelectItem value="matching">Matching</SelectItem>
                        <SelectItem value="ai_tool">IA</SelectItem>
                        <SelectItem value="system">Sistema</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                      <SelectTrigger className="h-7 w-28 text-xs">
                        <SelectValue placeholder="Prioridade" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        <SelectItem value="urgent">Urgente</SelectItem>
                        <SelectItem value="high">Alta</SelectItem>
                        <SelectItem value="medium">Média</SelectItem>
                        <SelectItem value="low">Baixa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {unreadCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markAllAsReadMutation.mutate()}
                      className="text-xs h-7"
                    >
                      <CheckCheck className="w-3 h-3 mr-1" />
                      Marcar todas
                    </Button>
                  )}
                </div>
                
                <ScrollArea className="h-72">
                  {filteredNotifications.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">
                      <Bell className="w-12 h-12 mx-auto mb-2 opacity-20" />
                      <p>Sem notificações</p>
                      {(typeFilter !== "all" || priorityFilter !== "all") && (
                        <p className="text-xs mt-1">Ajuste os filtros</p>
                      )}
                    </div>
                  ) : (
                    <div className="divide-y">
                      {filteredNotifications.map((group) => (
                        <div
                          key={group.id}
                          className={`p-3 hover:bg-slate-50 transition-colors ${
                            group.items.some(n => !n.is_read) ? 'bg-blue-50/50' : ''
                          } ${getPriorityColor(group.priority)}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-lg">{getNotificationIcon(group.type)}</span>
                                <p className="font-semibold text-sm text-slate-900">
                                  {group.title}
                                  {group.count > 1 && (
                                    <Badge className="ml-2 bg-blue-600 text-white text-xs h-4 px-1.5">
                                      {group.count}
                                    </Badge>
                                  )}
                                </p>
                                {group.items.some(n => !n.is_read) && (
                                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                                )}
                              </div>
                              <p className="text-sm text-slate-600 mb-2">
                                {group.count > 1 
                                  ? `${group.count} notificações similares`
                                  : group.message}
                              </p>
                              <p className="text-xs text-slate-400">
                                {formatDistanceToNow(new Date(group.latestDate), { addSuffix: true, locale: ptBR })}
                              </p>
                            </div>
                            <div className="flex flex-col gap-1">
                              {group.action_url && (
                                <button
                                  onClick={() => {
                                    group.items.forEach(n => {
                                      if (!n.is_read) markAsReadMutation.mutate(n.id);
                                    });
                                    navigate(group.action_url);
                                    setIsOpen(false);
                                  }}
                                  className="p-1 hover:bg-blue-100 rounded"
                                  title="Ver detalhes"
                                >
                                  <ExternalLink className="w-3 h-3 text-blue-500" />
                                </button>
                              )}
                              {group.items.some(n => !n.is_read) && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    group.items.forEach(n => {
                                      if (!n.is_read) markAsReadMutation.mutate(n.id);
                                    });
                                  }}
                                  className="p-1 hover:bg-slate-200 rounded"
                                  title="Marcar como lida"
                                >
                                  <CheckCircle className="w-3 h-3 text-slate-500" />
                                </button>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  group.items.forEach(n => deleteMutation.mutate(n.id));
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