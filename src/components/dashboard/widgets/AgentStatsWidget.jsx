import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Building2, Target, TrendingUp, Phone, Mail } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];

export default function AgentStatsWidget({ config, data }) {
  const { properties = [], opportunities = [], users = [] } = data;
  
  // Filter only agents
  const agents = users.filter(u => 
    u.user_type === 'agente' || u.user_type === 'gestor' || u.role === 'admin'
  );

  // Calculate stats per agent
  const agentStats = agents.map(agent => {
    const agentProperties = properties.filter(p => 
      p.assigned_consultant === agent.email || p.agent_id === agent.id
    );
    const agentOpportunities = opportunities.filter(o => o.assigned_to === agent.email);
    const wonOpportunities = agentOpportunities.filter(o => o.status === 'won');
    const activeOpportunities = agentOpportunities.filter(o => 
      !['won', 'lost'].includes(o.status)
    );
    
    const conversionRate = agentOpportunities.length > 0 
      ? ((wonOpportunities.length / agentOpportunities.length) * 100).toFixed(1)
      : 0;

    const totalValue = wonOpportunities.reduce((sum, o) => sum + (o.estimated_value || 0), 0);

    return {
      id: agent.id,
      name: agent.full_name || agent.email,
      email: agent.email,
      properties: agentProperties.length,
      opportunities: agentOpportunities.length,
      active: activeOpportunities.length,
      won: wonOpportunities.length,
      conversionRate: parseFloat(conversionRate),
      totalValue
    };
  }).sort((a, b) => b.opportunities - a.opportunities);

  const displayMode = config?.displayMode || 'cards';

  if (displayMode === 'chart') {
    const chartData = agentStats.slice(0, 8).map(agent => ({
      name: agent.name.split(' ')[0],
      leads: agent.opportunities,
      ganhos: agent.won,
      imoveis: agent.properties
    }));

    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" />
            Performance por Agente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: '11px' }} />
              <YAxis stroke="#64748b" style={{ fontSize: '11px' }} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
              />
              <Bar dataKey="leads" fill="#3b82f6" name="Leads" radius={[4, 4, 0, 0]} />
              <Bar dataKey="ganhos" fill="#10b981" name="Ganhos" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="w-4 h-4 text-blue-600" />
          Estatísticas por Agente
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {agentStats.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">Nenhum agente encontrado</p>
          ) : (
            agentStats.map((agent, idx) => (
              <div key={agent.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold"
                      style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                    >
                      {agent.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 text-sm">{agent.name}</p>
                      <p className="text-xs text-slate-500">{agent.email}</p>
                    </div>
                  </div>
                  {agent.conversionRate > 0 && (
                    <Badge className="bg-green-100 text-green-800 text-xs">
                      {agent.conversionRate}% conversão
                    </Badge>
                  )}
                </div>
                
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="p-2 bg-white rounded border">
                    <div className="text-lg font-bold text-blue-600">{agent.opportunities}</div>
                    <div className="text-xs text-slate-500">Leads</div>
                  </div>
                  <div className="p-2 bg-white rounded border">
                    <div className="text-lg font-bold text-amber-600">{agent.active}</div>
                    <div className="text-xs text-slate-500">Ativos</div>
                  </div>
                  <div className="p-2 bg-white rounded border">
                    <div className="text-lg font-bold text-green-600">{agent.won}</div>
                    <div className="text-xs text-slate-500">Ganhos</div>
                  </div>
                  <div className="p-2 bg-white rounded border">
                    <div className="text-lg font-bold text-purple-600">{agent.properties}</div>
                    <div className="text-xs text-slate-500">Imóveis</div>
                  </div>
                </div>

                {agent.totalValue > 0 && (
                  <div className="mt-2 text-xs text-slate-600 text-right">
                    Volume: €{agent.totalValue.toLocaleString()}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}