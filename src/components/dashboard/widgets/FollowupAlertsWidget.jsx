import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Badge } from "@/components/ui/badge";
import { Clock, AlertTriangle } from "lucide-react";
import { format, isPast, isToday } from "date-fns";

export default function FollowupAlertsWidget({ config, data }) {
  const { show_overdue_only = false } = config;
  let followups = data?.followups || [];

  if (show_overdue_only) {
    followups = followups.filter(f => isPast(new Date(f.date)) && !isToday(new Date(f.date)));
  }

  if (followups.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-400">
        <Clock className="w-8 h-8 mb-2" />
        <p className="text-sm">Sem follow-ups pendentes</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto space-y-2 p-1">
      {followups.slice(0, 5).map((followup, idx) => {
        const isOverdue = isPast(new Date(followup.date)) && !isToday(new Date(followup.date));
        const isTodayFollowup = isToday(new Date(followup.date));
        
        return (
          <Link
            key={idx}
            to={createPageUrl("CRMAdvanced")}
            className={`block p-2 rounded-lg border transition-colors ${
              isOverdue ? 'bg-red-50 border-red-200 hover:bg-red-100' :
              isTodayFollowup ? 'bg-amber-50 border-amber-200 hover:bg-amber-100' :
              'bg-slate-50 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-start gap-2">
              {isOverdue && <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{followup.client_name}</p>
                <p className="text-xs text-slate-500">
                  {format(new Date(followup.date), 'dd/MM HH:mm')}
                </p>
              </div>
              <Badge variant="outline" className="text-xs flex-shrink-0">
                {followup.type}
              </Badge>
            </div>
          </Link>
        );
      })}
    </div>
  );
}