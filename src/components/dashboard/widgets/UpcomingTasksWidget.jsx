import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { format, addDays, isToday, isTomorrow, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, CheckSquare, Clock, MapPin, User, Loader2, AlertCircle } from "lucide-react";

const TASK_TYPE_ICONS = {
  follow_up: Clock,
  visit: MapPin,
  call: Clock,
  email: Clock,
  meeting: Calendar,
  default: CheckSquare
};

export default function UpcomingTasksWidget({ config }) {
  const showTasks = config.show_tasks !== false;
  const showAppointments = config.show_appointments !== false;
  const daysAhead = config.days_ahead || 7;

  const { data: items, isLoading } = useQuery({
    queryKey: ['upcomingTasks', daysAhead, showTasks, showAppointments],
    queryFn: async () => {
      const endDate = addDays(new Date(), daysAhead);
      const results = [];

      if (showTasks) {
        const tasks = await base44.entities.Task.list();
        const upcomingTasks = tasks
          .filter(t => t.status !== 'completed' && t.status !== 'cancelled')
          .filter(t => {
            if (!t.due_date) return false;
            const dueDate = new Date(t.due_date);
            return dueDate <= endDate;
          })
          .map(t => ({
            id: t.id,
            type: 'task',
            taskType: t.task_type,
            title: t.title,
            date: t.due_date,
            relatedName: t.related_lead_name || t.related_contact_name || t.related_property_title,
            assignedTo: t.assigned_to_name,
            priority: t.priority,
            isOverdue: isPast(new Date(t.due_date)) && !isToday(new Date(t.due_date))
          }));
        results.push(...upcomingTasks);
      }

      if (showAppointments) {
        const appointments = await base44.entities.Appointment.list();
        const upcomingAppts = appointments
          .filter(a => a.status !== 'cancelled' && a.status !== 'completed')
          .filter(a => {
            if (!a.appointment_date) return false;
            const apptDate = new Date(a.appointment_date);
            return apptDate <= endDate && apptDate >= new Date();
          })
          .map(a => ({
            id: a.id,
            type: 'appointment',
            title: a.title || 'Visita',
            date: a.appointment_date,
            relatedName: a.client_name,
            property: a.property_title,
            assignedTo: a.assigned_agent,
            isOverdue: false
          }));
        results.push(...upcomingAppts);
      }

      return results.sort((a, b) => new Date(a.date) - new Date(b.date)).slice(0, 10);
    }
  });

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-400">
        <Calendar className="w-8 h-8 mb-2" />
        <p className="text-sm">Sem tarefas ou visitas agendadas</p>
      </div>
    );
  }

  const getDateLabel = (date) => {
    const d = new Date(date);
    if (isToday(d)) return 'Hoje';
    if (isTomorrow(d)) return 'Amanhã';
    return format(d, 'dd/MM', { locale: ptBR });
  };

  const getTimeLabel = (date) => {
    return format(new Date(date), 'HH:mm');
  };

  return (
    <div className="h-full overflow-auto space-y-2">
      {items.map((item) => {
        const Icon = item.type === 'appointment' ? MapPin : (TASK_TYPE_ICONS[item.taskType] || TASK_TYPE_ICONS.default);
        
        return (
          <div 
            key={`${item.type}-${item.id}`} 
            className={`flex items-start gap-3 p-2 rounded-lg border ${
              item.isOverdue ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'
            }`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              item.type === 'appointment' ? 'bg-blue-100' : 'bg-amber-100'
            }`}>
              <Icon className={`w-4 h-4 ${
                item.type === 'appointment' ? 'text-blue-600' : 'text-amber-600'
              }`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-sm truncate">{item.title}</p>
                {item.isOverdue && (
                  <Badge variant="destructive" className="text-xs py-0">Atrasado</Badge>
                )}
                {item.priority === 'high' && (
                  <Badge className="bg-red-100 text-red-700 text-xs py-0">Alta</Badge>
                )}
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500 mt-1">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {getDateLabel(item.date)} às {getTimeLabel(item.date)}
                </span>
                {item.relatedName && (
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {item.relatedName}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}