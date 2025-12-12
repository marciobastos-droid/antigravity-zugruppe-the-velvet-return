import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Award, TrendingUp, Users, DollarSign, Loader2 } from "lucide-react";

export default function TopAgentsWidget({ config }) {
  const metric = config.metric || 'leads';
  const limit = config.limit || 5;

  const { data: agentsData, isLoading } = useQuery({
    queryKey: ['topAgents', metric],
    queryFn: async () => {
      const [users, opportunities, commissions] = await Promise.all([
        base44.entities.User.list(),
        base44.entities.Opportunity.list(),
        base44.entities.Commission.list()
      ]);

      const agents = users.filter(u => 
        u.user_type === 'agente' || u.user_type === 'gestor' || u.user_type === 'admin'
      );

      const agentStats = agents.map(agent => {
        const agentLeads = opportunities.filter(o => o.assigned_to === agent.email);
        const agentConversions = agentLeads.filter(o => o.status === 'won');
        const agentCommissions = commissions.filter(c => c.agent_email === agent.email);
        const totalValue = agentCommissions.reduce((sum, c) => sum + (c.deal_value || 0), 0);

        return {
          email: agent.email,
          name: agent.display_name || agent.full_name || agent.email.split('@')[0],
          leads: agentLeads.length,
          conversions: agentConversions.length,
          conversionRate: agentLeads.length > 0 ? ((agentConversions.length / agentLeads.length) * 100).toFixed(1) : 0,
          value: totalValue,
          commissionValue: agentCommissions.reduce((sum, c) => sum + (c.agent_commission || 0), 0)
        };
      });

      // Sort by selected metric
      return agentStats
        .sort((a, b) => b[metric] - a[metric])
        .slice(0, limit);
    }
  });

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!agentsData || agentsData.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-slate-400">
        Sem dados de agentes
      </div>
    );
  }

  const getRankColor = (index) => {
    if (index === 0) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    if (index === 1) return 'bg-slate-100 text-slate-700 border-slate-300';
    if (index === 2) return 'bg-amber-100 text-amber-800 border-amber-300';
    return 'bg-slate-50 text-slate-600';
  };

  return (
    <div className="h-full overflow-auto space-y-2">
      {agentsData.map((agent, idx) => (
        <div 
          key={agent.email} 
          className={`flex items-center gap-3 p-2 rounded-lg border ${getRankColor(idx)}`}
        >
          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center font-bold text-sm border">
            {idx === 0 ? <Award className="w-4 h-4 text-yellow-600" /> : idx + 1}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{agent.name}</p>
            <div className="flex gap-2 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {agent.leads} leads
              </span>
              <span className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                {agent.conversionRate}%
              </span>
            </div>
          </div>
          <div className="text-right">
            {metric === 'value' ? (
              <p className="font-semibold text-green-600 text-sm">€{agent.value.toLocaleString()}</p>
            ) : metric === 'conversions' ? (
              <Badge variant="outline" className="bg-green-50 text-green-700">{agent.conversions}</Badge>
            ) : (
              <Badge variant="outline">{agent.leads}</Badge>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}