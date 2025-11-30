import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Line, ComposedChart } from "recharts";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2 } from "lucide-react";

export default function SalesByMonthWidget({ config }) {
  const monthsCount = parseInt(config.months) || 6;
  const showValue = config.show_value !== false;
  const showCount = config.show_count !== false;

  const { data: salesData, isLoading } = useQuery({
    queryKey: ['salesByMonth', monthsCount],
    queryFn: async () => {
      const [opportunities, commissions] = await Promise.all([
        base44.entities.Opportunity.filter({ status: 'won' }),
        base44.entities.Commission.list()
      ]);

      const months = [];
      for (let i = monthsCount - 1; i >= 0; i--) {
        const date = subMonths(new Date(), i);
        const monthStart = startOfMonth(date);
        const monthEnd = endOfMonth(date);
        const monthKey = format(date, 'yyyy-MM');
        const monthLabel = format(date, 'MMM', { locale: ptBR });

        const monthOps = opportunities.filter(o => {
          const closeDate = o.actual_close_date || o.created_date;
          return closeDate && closeDate >= monthStart.toISOString() && closeDate <= monthEnd.toISOString();
        });

        const monthComms = commissions.filter(c => {
          return c.close_date && c.close_date >= format(monthStart, 'yyyy-MM-dd') && c.close_date <= format(monthEnd, 'yyyy-MM-dd');
        });

        const totalValue = monthComms.reduce((sum, c) => sum + (c.deal_value || 0), 0) ||
                          monthOps.reduce((sum, o) => sum + (o.estimated_value || 0), 0);

        months.push({
          month: monthLabel,
          vendas: monthOps.length + monthComms.length,
          valor: totalValue
        });
      }

      return months;
    }
  });

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={salesData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
        <YAxis yAxisId="left" stroke="#64748b" fontSize={12} />
        {showValue && <YAxis yAxisId="right" orientation="right" stroke="#64748b" fontSize={12} />}
        <Tooltip 
          formatter={(value, name) => [
            name === 'valor' ? `€${value.toLocaleString()}` : value,
            name === 'valor' ? 'Valor' : 'Vendas'
          ]}
          contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
        />
        <Legend />
        {showCount && <Bar yAxisId="left" dataKey="vendas" fill="#3b82f6" name="Vendas" radius={[4, 4, 0, 0]} />}
        {showValue && <Line yAxisId="right" type="monotone" dataKey="valor" stroke="#10b981" name="Valor (€)" strokeWidth={2} />}
      </ComposedChart>
    </ResponsiveContainer>
  );
}