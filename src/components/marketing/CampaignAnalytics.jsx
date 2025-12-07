import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, Users, DollarSign, Target } from "lucide-react";

export default function CampaignAnalytics({ campaigns, opportunities }) {
  // Attribution analysis
  const attributionData = campaigns.map(campaign => ({
    name: campaign.name,
    leads: campaign.attributedLeads || 0,
    spent: campaign.spent || 0,
    cpl: campaign.attributedLeads > 0 ? (campaign.spent / campaign.attributedLeads).toFixed(2) : 0
  })).filter(c => c.leads > 0);

  // Campaign performance by type
  const performanceByType = campaigns.reduce((acc, campaign) => {
    const type = campaign.campaign_type;
    if (!acc[type]) {
      acc[type] = { type, leads: 0, spent: 0, count: 0 };
    }
    acc[type].leads += campaign.attributedLeads || 0;
    acc[type].spent += campaign.spent || 0;
    acc[type].count += 1;
    return acc;
  }, {});

  const typeData = Object.values(performanceByType);

  // Lead source breakdown
  const leadSourceData = opportunities.reduce((acc, opp) => {
    const source = opp.lead_source || "direct";
    acc[source] = (acc[source] || 0) + 1;
    return acc;
  }, {});

  const pieData = Object.entries(leadSourceData).map(([name, value]) => ({ name, value }));

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  // Total metrics
  const totalLeads = attributionData.reduce((sum, c) => sum + c.leads, 0);
  const totalSpent = attributionData.reduce((sum, c) => sum + c.spent, 0);
  const avgCPL = totalLeads > 0 ? (totalSpent / totalLeads).toFixed(2) : 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Leads</p>
                <p className="text-2xl font-bold">{totalLeads}</p>
              </div>
              <Users className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Gasto</p>
                <p className="text-2xl font-bold">€{totalSpent}</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">CPL Médio</p>
                <p className="text-2xl font-bold">€{avgCPL}</p>
              </div>
              <Target className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Campanhas Ativas</p>
                <p className="text-2xl font-bold">{campaigns.filter(c => c.status === "active").length}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Attribution Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Atribuição de Leads por Campanha</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={attributionData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="leads" fill="#3b82f6" name="Leads" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Performance by Type */}
      <Card>
        <CardHeader>
          <CardTitle>Performance por Tipo de Campanha</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={typeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="type" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="leads" fill="#10b981" name="Leads" />
              <Bar yAxisId="right" dataKey="spent" fill="#f59e0b" name="Gasto (€)" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Lead Source Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Distribuição de Origens de Leads</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top Performing Campaigns */}
      <Card>
        <CardHeader>
          <CardTitle>Top Campanhas por ROI</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {attributionData
              .sort((a, b) => a.cpl - b.cpl)
              .slice(0, 5)
              .map((campaign, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <p className="font-medium">{campaign.name}</p>
                    <p className="text-sm text-slate-600">{campaign.leads} leads gerados</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">€{campaign.cpl} CPL</p>
                    <p className="text-sm text-slate-600">€{campaign.spent} gasto</p>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}