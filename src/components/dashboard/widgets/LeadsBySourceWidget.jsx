import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Loader2 } from "lucide-react";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

const SOURCE_LABELS = {
  facebook_ads: 'Facebook Ads',
  website: 'Website',
  referral: 'Referência',
  direct_contact: 'Contacto Direto',
  real_estate_portal: 'Portal Imobiliário',
  networking: 'Networking',
  google_ads: 'Google Ads',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  email_marketing: 'Email Marketing',
  other: 'Outros'
};

export default function LeadsBySourceWidget({ config }) {
  const chartType = config.chart_type || 'pie';
  const showPercentage = config.show_percentage !== false;

  const { data: sourceData, isLoading } = useQuery({
    queryKey: ['leadsBySource'],
    queryFn: async () => {
      const opportunities = await base44.entities.Opportunity.list();
      
      const sourceCounts = {};
      opportunities.forEach(o => {
        const source = o.lead_source || 'other';
        sourceCounts[source] = (sourceCounts[source] || 0) + 1;
      });

      const total = opportunities.length;
      return Object.entries(sourceCounts)
        .map(([source, count]) => ({
          name: SOURCE_LABELS[source] || source,
          value: count,
          percentage: total > 0 ? ((count / total) * 100).toFixed(1) : 0
        }))
        .sort((a, b) => b.value - a.value);
    }
  });

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!sourceData || sourceData.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-slate-400">
        Sem dados de origem de leads
      </div>
    );
  }

  if (chartType === 'bar') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={sourceData} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis type="number" stroke="#64748b" fontSize={12} />
          <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={11} width={100} />
          <Tooltip 
            formatter={(value, name, props) => [
              showPercentage ? `${value} (${props.payload.percentage}%)` : value,
              'Leads'
            ]}
            contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
          />
          <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]}>
            {sourceData.map((_, idx) => (
              <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={sourceData}
          cx="50%"
          cy="50%"
          outerRadius="70%"
          innerRadius="40%"
          dataKey="value"
          label={({ name, percentage }) => showPercentage ? `${percentage}%` : name}
          labelLine={false}
        >
          {sourceData.map((_, idx) => (
            <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip 
          formatter={(value, name, props) => [
            showPercentage ? `${value} (${props.payload.percentage}%)` : value,
            props.payload.name
          ]}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}