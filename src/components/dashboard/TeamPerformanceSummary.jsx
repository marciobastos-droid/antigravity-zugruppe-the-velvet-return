import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, TrendingUp, TrendingDown, Users, Target, Building2, Star } from "lucide-react";
import { useAgentNames } from "../common/useAgentNames";

export default function TeamPerformanceSummary({ 
  users = [], 
  opportunities = [], 
  properties = [] 
}) {
  const { getAgentName } = useAgentNames();

  // Calculate agent performance
  const agentStats = users
    .filter(u => u.user_type === 'agente' || u.user_type === 'gestor')
    .map(u => {
      const agentLeads = opportunities.filter(o => o.assigned_to === u.email);
      const closedLeads = agentLeads.filter(o => o.status === 'won' || o.status === 'closed');
      const agentProperties = properties.filter(p => p.assigned_consultant === u.email || p.created_by === u.email);
      const conversionRate = agentLeads.length > 0 ? (closedLeads.length / agentLeads.length * 100) : 0;
      
      return {
        email: u.email,
        name: getAgentName(u.email),
        shortName: getAgentName(u.email, true),
        leads: agentLeads.length,
        closed: closedLeads.length,
        properties: agentProperties.length,
        conversionRate: conversionRate.toFixed(1),
        score: closedLeads.length * 10 + agentLeads.length * 2 + agentProperties.length
      };
    })
    .filter(a => a.leads > 0 || a.properties > 0)
    .sort((a, b) => b.score - a.score);

  // Team totals
  const teamTotals = {
    totalLeads: opportunities.length,
    totalClosed: opportunities.filter(o => o.status === 'won' || o.status === 'closed').length,
    totalProperties: properties.length,
    avgConversion: agentStats.length > 0 
      ? (agentStats.reduce((sum, a) => sum + parseFloat(a.conversionRate), 0) / agentStats.length).toFixed(1)
      : 0
  };

  const topPerformer = agentStats[0];

  if (agentStats.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="w-5 h-5 text-blue-600" />
          Desempenho da Equipa
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Team Summary */}
        <div className="grid grid-cols-4 gap-2 p-3 bg-slate-50 rounded-lg">
          <div className="text-center">
            <p className="text-xl font-bold text-slate-900">{teamTotals.totalLeads}</p>
            <p className="text-[10px] text-slate-500">Leads</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-green-600">{teamTotals.totalClosed}</p>
            <p className="text-[10px] text-slate-500">Fechados</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-blue-600">{teamTotals.totalProperties}</p>
            <p className="text-[10px] text-slate-500">Imóveis</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-amber-600">{teamTotals.avgConversion}%</p>
            <p className="text-[10px] text-slate-500">Conv. Média</p>
          </div>
        </div>

        {/* Top Performer */}
        {topPerformer && (
          <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-lg border border-amber-200">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-full flex items-center justify-center">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-900 truncate">{topPerformer.name}</p>
              <p className="text-xs text-slate-600">
                {topPerformer.closed} fechados • {topPerformer.conversionRate}% conversão
              </p>
            </div>
            <Badge className="bg-amber-100 text-amber-800 text-xs">
              <Star className="w-3 h-3 mr-1" />
              Top
            </Badge>
          </div>
        )}

        {/* Agent Rankings */}
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {agentStats.slice(0, 5).map((agent, idx) => (
            <div 
              key={agent.email}
              className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg transition-colors"
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                idx === 0 ? 'bg-amber-100 text-amber-700' :
                idx === 1 ? 'bg-slate-200 text-slate-600' :
                idx === 2 ? 'bg-orange-100 text-orange-700' :
                'bg-slate-100 text-slate-500'
              }`}>
                {idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{agent.shortName}</p>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Target className="w-3 h-3" />
                    {agent.leads}
                  </span>
                  <span className="flex items-center gap-1 text-green-600">
                    <TrendingUp className="w-3 h-3" />
                    {agent.closed}
                  </span>
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3 h-3" />
                    {agent.properties}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-sm font-semibold ${
                  parseFloat(agent.conversionRate) >= 30 ? 'text-green-600' :
                  parseFloat(agent.conversionRate) >= 15 ? 'text-amber-600' :
                  'text-slate-600'
                }`}>
                  {agent.conversionRate}%
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}