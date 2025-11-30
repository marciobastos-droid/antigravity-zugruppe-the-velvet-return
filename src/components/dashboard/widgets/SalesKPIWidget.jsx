import React from "react";
import { TrendingUp, TrendingDown, DollarSign, Target, Percent, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function SalesKPIWidget({ data, config }) {
  const metrics = data?.metrics || {};
  
  const kpis = [
    {
      id: "total_value",
      label: "Valor Portfolio",
      value: metrics.total_value?.value || 0,
      format: "currency",
      trend: metrics.total_value?.trend || 0,
      icon: DollarSign,
      color: "text-emerald-600",
      bg: "bg-emerald-50"
    },
    {
      id: "conversion_rate",
      label: "Taxa Conversão",
      value: metrics.conversion_rate?.value || 0,
      format: "percent",
      trend: metrics.conversion_rate?.trend || 0,
      icon: Percent,
      color: "text-blue-600",
      bg: "bg-blue-50"
    },
    {
      id: "avg_deal_value",
      label: "Valor Médio",
      value: metrics.avg_price?.value || 0,
      format: "currency",
      trend: metrics.avg_price?.trend || 0,
      icon: Target,
      color: "text-purple-600",
      bg: "bg-purple-50"
    },
    {
      id: "deals_this_month",
      label: "Negócios (Mês)",
      value: metrics.deals_this_month?.value || 0,
      format: "number",
      trend: metrics.deals_this_month?.trend || 0,
      icon: Calendar,
      color: "text-amber-600",
      bg: "bg-amber-50"
    }
  ];

  const formatValue = (value, format) => {
    if (format === "currency") {
      if (value >= 1000000) return `€${(value / 1000000).toFixed(1)}M`;
      if (value >= 1000) return `€${(value / 1000).toFixed(0)}K`;
      return `€${value.toLocaleString()}`;
    }
    if (format === "percent") return `${value}%`;
    return value.toLocaleString();
  };

  const selectedKPIs = config?.kpis 
    ? kpis.filter(k => config.kpis.includes(k.id))
    : kpis.slice(0, 4);

  return (
    <div className="h-full grid grid-cols-2 gap-2">
      {selectedKPIs.map((kpi) => {
        const Icon = kpi.icon;
        const isPositive = kpi.trend >= 0;
        
        return (
          <div key={kpi.id} className={`${kpi.bg} rounded-lg p-3 flex flex-col`}>
            <div className="flex items-center justify-between mb-1">
              <Icon className={`w-4 h-4 ${kpi.color}`} />
              {kpi.trend !== 0 && (
                <div className={`flex items-center gap-0.5 text-xs ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                  {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {Math.abs(kpi.trend)}%
                </div>
              )}
            </div>
            <p className={`text-lg font-bold ${kpi.color}`}>
              {formatValue(kpi.value, kpi.format)}
            </p>
            <p className="text-[10px] text-slate-500 truncate">{kpi.label}</p>
          </div>
        );
      })}
    </div>
  );
}