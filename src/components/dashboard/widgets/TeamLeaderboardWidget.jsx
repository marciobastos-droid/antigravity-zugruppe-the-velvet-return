import React from "react";
import { Badge } from "@/components/ui/badge";
import { Award, Medal, TrendingUp, Target, Building2 } from "lucide-react";

export default function TeamLeaderboardWidget({ data, config }) {
  const agentStats = data?.agentStats || [];
  
  if (agentStats.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-slate-400 text-sm">
        Sem dados de equipa
      </div>
    );
  }

  const metric = config?.metric || 'leads';
  const limit = config?.limit || 5;

  const sortedAgents = [...agentStats]
    .sort((a, b) => (b[metric] || 0) - (a[metric] || 0))
    .slice(0, limit);

  const getRankIcon = (index) => {
    if (index === 0) return <Award className="w-4 h-4 text-amber-500" />;
    if (index === 1) return <Medal className="w-4 h-4 text-slate-400" />;
    if (index === 2) return <Medal className="w-4 h-4 text-amber-700" />;
    return <span className="w-4 h-4 flex items-center justify-center text-xs font-bold text-slate-400">{index + 1}</span>;
  };

  const getMetricLabel = () => {
    switch (metric) {
      case 'leads': return 'leads';
      case 'closed': return 'fechados';
      case 'properties': return 'imóveis';
      case 'conversionRate': return '%';
      default: return '';
    }
  };

  return (
    <div className="h-full overflow-y-auto space-y-2">
      {sortedAgents.map((agent, index) => (
        <div 
          key={agent.email}
          className={`flex items-center gap-3 p-2 rounded-lg ${
            index === 0 ? 'bg-amber-50 border border-amber-200' : 'bg-slate-50'
          }`}
        >
          <div className="flex-shrink-0">
            {getRankIcon(index)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">
              {agent.shortName || agent.name}
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="flex items-center gap-0.5">
                <Target className="w-3 h-3" />
                {agent.leads || 0}
              </span>
              <span className="flex items-center gap-0.5">
                <TrendingUp className="w-3 h-3 text-green-500" />
                {agent.closed || 0}
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className={`text-lg font-bold ${index === 0 ? 'text-amber-600' : 'text-slate-700'}`}>
              {agent[metric] || 0}
            </p>
            <p className="text-[10px] text-slate-400">{getMetricLabel()}</p>
          </div>
        </div>
      ))}
    </div>
  );
}