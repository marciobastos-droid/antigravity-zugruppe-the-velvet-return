import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Calendar, Clock, CheckCircle2, AlertCircle, TrendingUp, 
  Users, Building2, Phone, Mail, MessageSquare, Target,
  ArrowRight, Bell, ListTodo, Flame
} from "lucide-react";
import { format, isToday, isTomorrow, isThisWeek, subDays, startOfWeek, endOfWeek, differenceInDays } from "date-fns";
import { pt } from "date-fns/locale";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function ActivitySummary({ user }) {
  const [period, setPeriod] = useState("today");

  const { data: opportunities = [] } = useQuery({
    queryKey: ['opportunities'],
    queryFn: () => base44.entities.Opportunity.list('-created_date')
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('-created_date')
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ['appointments'],
    queryFn: () => base44.entities.Appointment.list('-appointment_date')
  });

  const { data: communications = [] } = useQuery({
    queryKey: ['communicationLogs'],
    queryFn: () => base44.entities.CommunicationLog.list('-communication_date', 100)
  });

  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list('-created_date')
  });

  // Filter by user if not admin
  const isAdmin = user?.role === 'admin' || user?.user_type === 'admin' || user?.user_type === 'gestor';
  
  const userOpportunities = isAdmin ? opportunities : opportunities.filter(o => 
    o.assigned_to === user?.email || o.created_by === user?.email
  );

  const userTasks = isAdmin ? tasks : tasks.filter(t => 
    t.assigned_to === user?.email || t.created_by === user?.email
  );

  const userAppointments = isAdmin ? appointments : appointments.filter(a => 
    a.assigned_agent === user?.email || a.created_by === user?.email
  );

  // Today's data
  const todayAppointments = userAppointments.filter(a => 
    a.appointment_date && isToday(new Date(a.appointment_date)) && a.status !== 'cancelled'
  );

  const tomorrowAppointments = userAppointments.filter(a => 
    a.appointment_date && isTomorrow(new Date(a.appointment_date)) && a.status !== 'cancelled'
  );

  const thisWeekAppointments = userAppointments.filter(a => 
    a.appointment_date && isThisWeek(new Date(a.appointment_date), { weekStartsOn: 1 }) && a.status !== 'cancelled'
  );

  // Pending tasks
  const pendingTasks = userTasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled');
  const overdueTasks = pendingTasks.filter(t => t.due_date && new Date(t.due_date) < new Date());
  const todayTasks = pendingTasks.filter(t => t.due_date && isToday(new Date(t.due_date)));

  // Follow-ups
  const overdueFollowups = userOpportunities.filter(o => 
    o.next_followup_date && new Date(o.next_followup_date) < new Date() && 
    !['won', 'lost'].includes(o.status)
  );

  const todayFollowups = userOpportunities.filter(o => 
    o.next_followup_date && isToday(new Date(o.next_followup_date)) && 
    !['won', 'lost'].includes(o.status)
  );

  // Hot leads
  const hotLeads = userOpportunities.filter(o => 
    o.qualification_status === 'hot' && !['won', 'lost'].includes(o.status)
  );

  // New leads today
  const newLeadsToday = userOpportunities.filter(o => 
    isToday(new Date(o.created_date)) && o.status === 'new'
  );

  // Recent communications
  const todayCommunications = communications.filter(c => 
    isToday(new Date(c.communication_date || c.created_date))
  );

  // Weekly stats
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });

  const weeklyStats = {
    newLeads: userOpportunities.filter(o => new Date(o.created_date) >= weekStart).length,
    closedDeals: userOpportunities.filter(o => 
      o.status === 'won' && o.actual_close_date && new Date(o.actual_close_date) >= weekStart
    ).length,
    communications: communications.filter(c => 
      new Date(c.communication_date || c.created_date) >= weekStart
    ).length,
    appointments: userAppointments.filter(a => 
      a.appointment_date && new Date(a.appointment_date) >= weekStart && a.status === 'completed'
    ).length
  };

  // Priority items
  const priorityItems = [
    ...overdueFollowups.map(o => ({
      type: 'followup_overdue',
      title: `Follow-up em atraso: ${o.buyer_name}`,
      subtitle: `Desde ${format(new Date(o.next_followup_date), "d MMM", { locale: pt })}`,
      priority: 'high',
      link: createPageUrl("CRMAdvanced"),
      icon: AlertCircle
    })),
    ...overdueTasks.map(t => ({
      type: 'task_overdue',
      title: `Tarefa em atraso: ${t.title}`,
      subtitle: `Prazo: ${format(new Date(t.due_date), "d MMM", { locale: pt })}`,
      priority: 'high',
      link: createPageUrl("TeamManagement"),
      icon: ListTodo
    })),
    ...hotLeads.slice(0, 3).map(o => ({
      type: 'hot_lead',
      title: `Lead Hot: ${o.buyer_name}`,
      subtitle: o.property_title || 'Sem imóvel associado',
      priority: 'high',
      link: createPageUrl("CRMAdvanced"),
      icon: Flame
    })),
    ...todayFollowups.map(o => ({
      type: 'followup_today',
      title: `Follow-up hoje: ${o.buyer_name}`,
      subtitle: o.buyer_phone || o.buyer_email,
      priority: 'medium',
      link: createPageUrl("CRMAdvanced"),
      icon: Phone
    })),
    ...newLeadsToday.map(o => ({
      type: 'new_lead',
      title: `Novo lead: ${o.buyer_name}`,
      subtitle: o.lead_source || 'Origem desconhecida',
      priority: 'medium',
      link: createPageUrl("CRMAdvanced"),
      icon: Users
    }))
  ].slice(0, 8);

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-amber-100 text-amber-800 border-amber-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            Resumo de Atividades
          </CardTitle>
          <Tabs value={period} onValueChange={setPeriod} className="w-auto">
            <TabsList className="h-8">
              <TabsTrigger value="today" className="text-xs px-3">Hoje</TabsTrigger>
              <TabsTrigger value="week" className="text-xs px-3">Semana</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {period === "today" ? (
          <>
            {/* Today's Quick Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="p-3 bg-blue-50 rounded-lg text-center">
                <div className="text-xl font-bold text-blue-700">{todayAppointments.length}</div>
                <div className="text-xs text-blue-600">Visitas Hoje</div>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg text-center">
                <div className="text-xl font-bold text-purple-700">{todayFollowups.length}</div>
                <div className="text-xs text-purple-600">Follow-ups</div>
              </div>
              <div className="p-3 bg-green-50 rounded-lg text-center">
                <div className="text-xl font-bold text-green-700">{newLeadsToday.length}</div>
                <div className="text-xs text-green-600">Novos Leads</div>
              </div>
              <div className="p-3 bg-amber-50 rounded-lg text-center">
                <div className="text-xl font-bold text-amber-700">{todayCommunications.length}</div>
                <div className="text-xs text-amber-600">Comunicações</div>
              </div>
            </div>

            {/* Alerts */}
            {(overdueFollowups.length > 0 || overdueTasks.length > 0) && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 text-red-800 font-medium text-sm mb-2">
                  <AlertCircle className="w-4 h-4" />
                  Atenção Urgente
                </div>
                <div className="space-y-1 text-sm">
                  {overdueFollowups.length > 0 && (
                    <p className="text-red-700">• {overdueFollowups.length} follow-ups em atraso</p>
                  )}
                  {overdueTasks.length > 0 && (
                    <p className="text-red-700">• {overdueTasks.length} tarefas em atraso</p>
                  )}
                </div>
              </div>
            )}

            {/* Priority Items */}
            {priorityItems.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-slate-700 mb-2">Prioridades</h4>
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2">
                    {priorityItems.map((item, idx) => (
                      <Link key={idx} to={item.link}>
                        <div className={`p-3 rounded-lg border flex items-center gap-3 hover:shadow-sm transition-shadow ${getPriorityColor(item.priority)}`}>
                          <item.icon className="w-4 h-4 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{item.title}</p>
                            <p className="text-xs opacity-75 truncate">{item.subtitle}</p>
                          </div>
                          <ArrowRight className="w-4 h-4 flex-shrink-0 opacity-50" />
                        </div>
                      </Link>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Today's Schedule */}
            {todayAppointments.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-slate-700 mb-2">Agenda de Hoje</h4>
                <div className="space-y-2">
                  {todayAppointments.slice(0, 3).map(appt => (
                    <div key={appt.id} className="flex items-center gap-3 p-2 bg-green-50 rounded-lg border border-green-200">
                      <div className="text-center min-w-[45px]">
                        <div className="text-sm font-bold text-green-700">
                          {format(new Date(appt.appointment_date), 'HH:mm')}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-slate-900 truncate">{appt.title}</p>
                        <p className="text-xs text-slate-600 truncate">{appt.client_name}</p>
                      </div>
                      <Badge variant="outline" className="text-xs bg-white">
                        {appt.status === 'confirmed' ? 'Confirmada' : 'Agendada'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {priorityItems.length === 0 && todayAppointments.length === 0 && (
              <div className="text-center py-8 text-slate-500">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhuma atividade pendente para hoje!</p>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Weekly Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">Novos Leads</span>
                </div>
                <div className="text-3xl font-bold text-blue-900">{weeklyStats.newLeads}</div>
                <p className="text-xs text-blue-600 mt-1">Esta semana</p>
              </div>

              <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-green-800">Fechados</span>
                </div>
                <div className="text-3xl font-bold text-green-900">{weeklyStats.closedDeals}</div>
                <p className="text-xs text-green-600 mt-1">Negócios ganhos</p>
              </div>

              <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="w-5 h-5 text-purple-600" />
                  <span className="text-sm font-medium text-purple-800">Comunicações</span>
                </div>
                <div className="text-3xl font-bold text-purple-900">{weeklyStats.communications}</div>
                <p className="text-xs text-purple-600 mt-1">Registadas</p>
              </div>

              <div className="p-4 bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-5 h-5 text-amber-600" />
                  <span className="text-sm font-medium text-amber-800">Visitas</span>
                </div>
                <div className="text-3xl font-bold text-amber-900">{weeklyStats.appointments}</div>
                <p className="text-xs text-amber-600 mt-1">Realizadas</p>
              </div>
            </div>

            {/* Week Appointments */}
            {thisWeekAppointments.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-slate-700 mb-2">Próximas Visitas</h4>
                <div className="space-y-2">
                  {thisWeekAppointments.slice(0, 4).map(appt => (
                    <div key={appt.id} className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg border">
                      <div className="text-center min-w-[55px]">
                        <div className="text-xs text-slate-500">
                          {format(new Date(appt.appointment_date), 'EEE', { locale: pt })}
                        </div>
                        <div className="text-sm font-bold text-slate-700">
                          {format(new Date(appt.appointment_date), 'd MMM', { locale: pt })}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-slate-900 truncate">{appt.title}</p>
                        <p className="text-xs text-slate-600 truncate">{appt.client_name} • {format(new Date(appt.appointment_date), 'HH:mm')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Hot Leads */}
            {hotLeads.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-1">
                  <Flame className="w-4 h-4 text-red-500" />
                  Leads Hot ({hotLeads.length})
                </h4>
                <div className="space-y-2">
                  {hotLeads.slice(0, 3).map(lead => (
                    <Link key={lead.id} to={createPageUrl("CRMAdvanced")}>
                      <div className="flex items-center gap-3 p-2 bg-red-50 rounded-lg border border-red-200 hover:bg-red-100 transition-colors">
                        <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                          <Flame className="w-4 h-4 text-red-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-slate-900 truncate">{lead.buyer_name}</p>
                          <p className="text-xs text-slate-600 truncate">
                            {lead.estimated_value ? `€${lead.estimated_value.toLocaleString()}` : lead.property_title || 'Sem valor'}
                          </p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-red-400" />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}