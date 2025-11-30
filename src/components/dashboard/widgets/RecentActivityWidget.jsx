import React from "react";
import { Badge } from "@/components/ui/badge";
import { 
  Phone, Mail, MessageSquare, Calendar, Users, Building2, 
  FileText, CheckCircle2, Clock 
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const activityIcons = {
  phone_call: Phone,
  email: Mail,
  whatsapp: MessageSquare,
  meeting: Calendar,
  site_visit: Building2,
  property_match: Users,
  document: FileText,
  task_completed: CheckCircle2,
  default: Clock
};

const activityColors = {
  phone_call: "text-green-600 bg-green-50",
  email: "text-blue-600 bg-blue-50",
  whatsapp: "text-emerald-600 bg-emerald-50",
  meeting: "text-purple-600 bg-purple-50",
  site_visit: "text-amber-600 bg-amber-50",
  property_match: "text-pink-600 bg-pink-50",
  document: "text-slate-600 bg-slate-50",
  task_completed: "text-green-600 bg-green-50",
  default: "text-slate-500 bg-slate-50"
};

export default function RecentActivityWidget({ data, config }) {
  // Combine different activity sources
  const activities = [];
  
  // Add communications
  if (data?.recentCommunications) {
    data.recentCommunications.forEach(comm => {
      activities.push({
        id: comm.id,
        type: comm.communication_type || 'default',
        title: comm.subject || comm.contact_name || 'Comunicação',
        subtitle: comm.summary || comm.outcome || '',
        date: comm.communication_date || comm.created_date,
        entity: 'communication'
      });
    });
  }

  // Add from lists
  if (data?.lists?.leads) {
    data.lists.leads.slice(0, 3).forEach(lead => {
      activities.push({
        id: `lead-${lead.id}`,
        type: 'users',
        title: `Novo lead: ${lead.name || lead.title}`,
        subtitle: lead.subtitle || '',
        date: lead.created_date,
        entity: 'lead'
      });
    });
  }

  if (data?.lists?.properties) {
    data.lists.properties.slice(0, 2).forEach(prop => {
      activities.push({
        id: `prop-${prop.id}`,
        type: 'building',
        title: `Imóvel: ${prop.title}`,
        subtitle: prop.subtitle || '',
        date: prop.created_date,
        entity: 'property'
      });
    });
  }

  // Sort by date
  const sortedActivities = activities
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, config?.limit || 6);

  if (sortedActivities.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-slate-400 text-sm">
        Sem atividades recentes
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto space-y-2 pr-1">
      {sortedActivities.map((activity) => {
        const Icon = activityIcons[activity.type] || activityIcons.default;
        const colorClass = activityColors[activity.type] || activityColors.default;
        const [textColor, bgColor] = colorClass.split(' ');

        return (
          <div 
            key={activity.id} 
            className="flex items-start gap-2 p-2 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <div className={`w-7 h-7 rounded-full ${bgColor} flex items-center justify-center flex-shrink-0`}>
              <Icon className={`w-3.5 h-3.5 ${textColor}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">
                {activity.title}
              </p>
              {activity.subtitle && (
                <p className="text-xs text-slate-500 truncate">{activity.subtitle}</p>
              )}
              <p className="text-[10px] text-slate-400 mt-0.5">
                {formatDistanceToNow(new Date(activity.date), { addSuffix: true, locale: ptBR })}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}