import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  TrendingUp, TrendingDown, Users, Building2, Target, 
  DollarSign, Calendar, Clock, ArrowUpRight, ArrowDownRight,
  BarChart3, PieChart as PieChartIcon, LineChart as LineChartIcon
} from "lucide-react";
import { 
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from "date-fns";
import { pt } from "date-fns/locale";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function InteractiveMetricsWidget({ 
  opportunities = [], 
  properties = [], 
  dateRange = 30,
  isAdmin = false 
}) {
  const [activeChart, setActiveChart] = useState("trends");
  const [selectedMetric, setSelectedMetric] = useState(null);

  // Calculate trends
  const cutoffDate = subDays(new Date(), dateRange);
  const previousCutoff = subDays(cutoffDate, dateRange);

  const currentPeriodLeads = opportunities.filter(o => new Date(o.created_date) >= cutoffDate);
  const previousPeriodLeads = opportunities.filter(o => 
    new Date(o.created_date) >= previousCutoff && new Date(o.created_date) < cutoffDate
  );

  const currentPeriodProperties = properties.filter(p => new Date(p.created_date) >= cutoffDate);
  const previousPeriodProperties = properties.filter(p => 
    new Date(p.created_date) >= previousCutoff && new Date(p.created_date) < cutoffDate
  );

  const calculateTrend = (current, previous) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous * 100).toFixed(1);
  };

  const leadsTrend = calculateTrend(currentPeriodLeads.length, previousPeriodLeads.length);
  const propertiesTrend = calculateTrend(currentPeriodProperties.length, previousPeriodProperties.length);

  // Won deals
  const wonDeals = opportunities.filter(o => o.status === 'won');
  const currentWon = wonDeals.filter(o => new Date(o.actual_close_date || o.updated_date) >= cutoffDate);
  const previousWon = wonDeals.filter(o => {
    const date = new Date(o.actual_close_date || o.updated_date);
    return date >= previousCutoff && date < cutoffDate;
  });
  const wonTrend = calculateTrend(currentWon.length, previousWon.length);

  // Revenue estimation
  const currentRevenue = currentWon.reduce((sum, o) => sum + (o.estimated_value || 0), 0);
  const previousRevenue = previousWon.reduce((sum, o) => sum + (o.estimated_value || 0), 0);
  const revenueTrend = calculateTrend(currentRevenue, previousRevenue);

  // Generate timeline data
  const generateTimelineData = () => {
    const days = eachDayOfInterval({
      start: subDays(new Date(), dateRange - 1),
      end: new Date()
    });

    return days.map(day => {
      const leads = opportunities.filter(o => isSameDay(new Date(o.created_date), day)).length;
      const props = properties.filter(p => isSameDay(new Date(p.created_date), day)).length;
      const won = opportunities.filter(o => 
        o.status === 'won' && isSameDay(new Date(o.actual_close_date || o.updated_date), day)
      ).length;

      return {
        date: format(day, 'dd/MM'),
        leads,
        imoveis: props,
        fechados: won
      };
    });
  };

  const timelineData = generateTimelineData();

  // Lead sources distribution
  const leadSourceData = opportunities.reduce((acc, o) => {
    const source = o.lead_source || 'other';
    acc[source] = (acc[source] || 0) + 1;
    return acc;
  }, {});

  const sourceLabels = {
    facebook_ads: 'Facebook',
    website: 'Website',
    referral: 'Referência',
    direct_contact: 'Direto',
    real_estate_portal: 'Portal',
    google_ads: 'Google',
    instagram: 'Instagram',
    other: 'Outros'
  };

  const pieData = Object.entries(leadSourceData)
    .map(([name, value]) => ({
      name: sourceLabels[name] || name,
      value
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  // Pipeline distribution
  const pipelineData = [
    { name: 'Novos', value: opportunities.filter(o => o.status === 'new').length, color: '#3b82f6' },
    { name: 'Contactados', value: opportunities.filter(o => o.status === 'contacted').length, color: '#8b5cf6' },
    { name: 'Qualificados', value: opportunities.filter(o => o.status === 'visit_scheduled').length, color: '#f59e0b' },
    { name: 'Proposta', value: opportunities.filter(o => o.status === 'proposal').length, color: '#10b981' },
    { name: 'Negociação', value: opportunities.filter(o => o.status === 'negotiation').length, color: '#ec4899' },
    { name: 'Ganhos', value: opportunities.filter(o => o.status === 'won').length, color: '#22c55e' },
  ].filter(item => item.value > 0);

  const metrics = [
    {
      id: 'leads',
      label: 'Novos Leads',
      value: currentPeriodLeads.length,
      trend: parseFloat(leadsTrend),
      icon: Users,
      color: 'blue'
    },
    {
      id: 'properties',
      label: 'Novos Imóveis',
      value: currentPeriodProperties.length,
      trend: parseFloat(propertiesTrend),
      icon: Building2,
      color: 'green'
    },
    {
      id: 'won',
      label: 'Negócios Fechados',
      value: currentWon.length,
      trend: parseFloat(wonTrend),
      icon: Target,
      color: 'purple'
    },
    {
      id: 'revenue',
      label: 'Valor Estimado',
      value: `€${(currentRevenue / 1000).toFixed(0)}k`,
      trend: parseFloat(revenueTrend),
      icon: DollarSign,
      color: 'amber'
    }
  ];

  const getColorClasses = (color) => {
    const colors = {
      blue: 'bg-blue-50 border-blue-200 text-blue-700',
      green: 'bg-green-50 border-green-200 text-green-700',
      purple: 'bg-purple-50 border-purple-200 text-purple-700',
      amber: 'bg-amber-50 border-amber-200 text-amber-700'
    };
    return colors[color] || colors.blue;
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border">
          <p className="font-medium text-slate-900">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            Métricas Interativas
          </CardTitle>
          <div className="flex gap-1">
            <Button 
              variant={activeChart === 'trends' ? 'default' : 'ghost'} 
              size="sm"
              onClick={() => setActiveChart('trends')}
              className="h-7 px-2"
            >
              <LineChartIcon className="w-4 h-4" />
            </Button>
            <Button 
              variant={activeChart === 'pipeline' ? 'default' : 'ghost'} 
              size="sm"
              onClick={() => setActiveChart('pipeline')}
              className="h-7 px-2"
            >
              <BarChart3 className="w-4 h-4" />
            </Button>
            <Button 
              variant={activeChart === 'sources' ? 'default' : 'ghost'} 
              size="sm"
              onClick={() => setActiveChart('sources')}
              className="h-7 px-2"
            >
              <PieChartIcon className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {metrics.map(metric => (
            <div 
              key={metric.id}
              onClick={() => setSelectedMetric(selectedMetric === metric.id ? null : metric.id)}
              className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                selectedMetric === metric.id ? 'ring-2 ring-blue-500' : ''
              } ${getColorClasses(metric.color)}`}
            >
              <div className="flex items-center justify-between mb-1">
                <metric.icon className="w-4 h-4" />
                <div className={`flex items-center text-xs ${
                  metric.trend >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {metric.trend >= 0 ? (
                    <ArrowUpRight className="w-3 h-3" />
                  ) : (
                    <ArrowDownRight className="w-3 h-3" />
                  )}
                  {Math.abs(metric.trend)}%
                </div>
              </div>
              <div className="text-xl font-bold">{metric.value}</div>
              <div className="text-xs opacity-75">{metric.label}</div>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="h-[250px]">
          {activeChart === 'trends' && (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineData}>
                <defs>
                  <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorProps" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" stroke="#64748b" style={{ fontSize: '11px' }} />
                <YAxis stroke="#64748b" style={{ fontSize: '11px' }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="leads" 
                  name="Leads"
                  stroke="#3b82f6" 
                  fillOpacity={1} 
                  fill="url(#colorLeads)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="imoveis" 
                  name="Imóveis"
                  stroke="#10b981" 
                  fillOpacity={1} 
                  fill="url(#colorProps)" 
                />
                <Line 
                  type="monotone" 
                  dataKey="fechados" 
                  name="Fechados"
                  stroke="#8b5cf6" 
                  strokeWidth={2}
                  dot={{ fill: '#8b5cf6', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}

          {activeChart === 'pipeline' && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pipelineData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" stroke="#64748b" style={{ fontSize: '11px' }} />
                <YAxis type="category" dataKey="name" stroke="#64748b" style={{ fontSize: '11px' }} width={80} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                  {pipelineData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}

          {activeChart === 'sources' && (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  fill="#8884d8"
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={{ stroke: '#64748b', strokeWidth: 1 }}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Legend for sources */}
        {activeChart === 'sources' && (
          <div className="flex flex-wrap gap-2 justify-center">
            {pieData.map((entry, index) => (
              <Badge 
                key={entry.name} 
                variant="outline" 
                className="text-xs"
                style={{ borderColor: COLORS[index % COLORS.length], color: COLORS[index % COLORS.length] }}
              >
                {entry.name}: {entry.value}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}