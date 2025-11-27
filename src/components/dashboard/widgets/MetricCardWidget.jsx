import React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

const colorClasses = {
  blue: "from-blue-500 to-blue-600",
  green: "from-green-500 to-green-600",
  purple: "from-purple-500 to-purple-600",
  amber: "from-amber-500 to-amber-600",
  red: "from-red-500 to-red-600"
};

export default function MetricCardWidget({ config, data }) {
  const { metric, show_trend, color = "blue" } = config;
  const metricData = data?.metrics?.[metric] || { value: 0, trend: 0, label: "Métrica" };
  
  const TrendIcon = metricData.trend > 0 ? TrendingUp : metricData.trend < 0 ? TrendingDown : Minus;
  const trendColor = metricData.trend > 0 ? "text-green-400" : metricData.trend < 0 ? "text-red-400" : "text-slate-400";

  const formatValue = (val) => {
    if (typeof val !== 'number') return val;
    if (val >= 1000000) return `€${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
    return val.toLocaleString();
  };

  return (
    <div className={`h-full bg-gradient-to-br ${colorClasses[color]} rounded-xl p-4 text-white flex flex-col justify-between`}>
      <div className="text-sm font-medium opacity-90">{metricData.label}</div>
      <div className="text-3xl font-bold">{formatValue(metricData.value)}</div>
      {show_trend && (
        <div className={`flex items-center gap-1 text-sm ${trendColor}`}>
          <TrendIcon className="w-4 h-4" />
          <span>{Math.abs(metricData.trend)}% vs período anterior</span>
        </div>
      )}
    </div>
  );
}