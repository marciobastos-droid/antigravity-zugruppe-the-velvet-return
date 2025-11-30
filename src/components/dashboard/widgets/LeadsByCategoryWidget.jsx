import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Flame, ThermometerSun, Snowflake, AlertTriangle, TrendingUp } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const categoryConfig = {
  hot: { label: "Hot", icon: Flame, color: "#ef4444", bg: "bg-red-50", text: "text-red-700" },
  warm: { label: "Warm", icon: ThermometerSun, color: "#f59e0b", bg: "bg-amber-50", text: "text-amber-700" },
  cold: { label: "Cold", icon: Snowflake, color: "#3b82f6", bg: "bg-blue-50", text: "text-blue-700" },
  unqualified: { label: "Não Qualificado", icon: AlertTriangle, color: "#94a3b8", bg: "bg-slate-50", text: "text-slate-600" }
};

export default function LeadsByCategoryWidget({ data, config }) {
  const opportunities = data?.lists?.leads || [];
  
  // Get full opportunities data from metrics if available
  const counts = {
    hot: data?.metrics?.hot_leads?.value || 0,
    warm: data?.metrics?.warm_leads?.value || 0,
    cold: data?.metrics?.cold_leads?.value || 0,
    unqualified: data?.metrics?.unqualified_leads?.value || 0
  };

  const total = counts.hot + counts.warm + counts.cold + counts.unqualified;

  const chartData = [
    { name: "Hot", value: counts.hot, color: categoryConfig.hot.color },
    { name: "Warm", value: counts.warm, color: categoryConfig.warm.color },
    { name: "Cold", value: counts.cold, color: categoryConfig.cold.color },
    { name: "Não Qualificado", value: counts.unqualified, color: categoryConfig.unqualified.color }
  ].filter(d => d.value > 0);

  if (total === 0) {
    return (
      <div className="h-full flex items-center justify-center text-slate-400 text-sm">
        Sem dados de leads
      </div>
    );
  }

  const showChart = config?.showChart !== false;

  return (
    <div className="h-full flex flex-col">
      {showChart && chartData.length > 0 ? (
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={30}
                outerRadius={50}
                paddingAngle={2}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value, name) => [`${value} leads`, name]}
                contentStyle={{ fontSize: '12px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2 mt-2">
        {Object.entries(categoryConfig).map(([key, cfg]) => {
          const Icon = cfg.icon;
          const count = counts[key];
          const percentage = total > 0 ? ((count / total) * 100).toFixed(0) : 0;
          
          return (
            <div key={key} className={`${cfg.bg} rounded-lg p-2 flex items-center gap-2`}>
              <Icon className={`w-4 h-4 ${cfg.text}`} />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-bold ${cfg.text}`}>{count}</p>
                <p className="text-[10px] text-slate-500 truncate">{cfg.label}</p>
              </div>
              <span className="text-xs text-slate-400">{percentage}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}