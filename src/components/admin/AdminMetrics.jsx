import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Crown, TrendingUp, DollarSign, UserPlus, CheckCircle, Clock, XCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";

export default function AdminMetrics() {
  const { data: users = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list()
  });

  const { data: subscriptions = [] } = useQuery({
    queryKey: ['allSubscriptions'],
    queryFn: () => base44.asServiceRole.entities.Subscription.list()
  });

  const { data: properties = [] } = useQuery({
    queryKey: ['allProperties'],
    queryFn: () => base44.entities.Property.list()
  });

  // Calculate metrics
  const metrics = React.useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const newUsers = users.filter(u => new Date(u.created_date) > thirtyDaysAgo).length;
    const activeSubscriptions = subscriptions.filter(s => s.status === 'active').length;
    const pendingPayments = subscriptions.filter(s => s.status === 'pending_payment').length;
    const totalRevenue = subscriptions
      .filter(s => s.status === 'active')
      .reduce((sum, s) => {
        const price = s.plan === 'premium' ? 49 : s.plan === 'enterprise' ? 149 : 0;
        return sum + price;
      }, 0);

    return {
      totalUsers: users.length,
      newUsers,
      activeSubscriptions,
      pendingPayments,
      totalRevenue,
      totalProperties: properties.length
    };
  }, [users, subscriptions, properties]);

  // Subscription by plan
  const subscriptionsByPlan = React.useMemo(() => {
    const planCounts = { free: 0, premium: 0, enterprise: 0 };
    subscriptions
      .filter(s => s.status === 'active')
      .forEach(s => {
        planCounts[s.plan] = (planCounts[s.plan] || 0) + 1;
      });

    return [
      { name: 'Free', value: planCounts.free, color: '#94a3b8' },
      { name: 'Premium', value: planCounts.premium, color: '#3b82f6' },
      { name: 'Enterprise', value: planCounts.enterprise, color: '#8b5cf6' }
    ];
  }, [subscriptions]);

  // Users by month (last 6 months)
  const usersByMonth = React.useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const count = users.filter(u => {
        const createdDate = new Date(u.created_date);
        return createdDate.getFullYear() === date.getFullYear() && 
               createdDate.getMonth() === date.getMonth();
      }).length;
      months.push({
        month: date.toLocaleDateString('pt-PT', { month: 'short' }),
        users: count
      });
    }
    return months;
  }, [users]);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total de Utilizadores</CardTitle>
            <Users className="w-4 h-4 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{metrics.totalUsers}</div>
            <p className="text-xs text-green-600 mt-1">
              +{metrics.newUsers} nos últimos 30 dias
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Subscrições Ativas</CardTitle>
            <Crown className="w-4 h-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{metrics.activeSubscriptions}</div>
            <p className="text-xs text-slate-600 mt-1">
              {metrics.pendingPayments} pagamentos pendentes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Receita Mensal (MRR)</CardTitle>
            <DollarSign className="w-4 h-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">€{metrics.totalRevenue}</div>
            <p className="text-xs text-slate-600 mt-1">
              Receita recorrente mensal
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Users Growth */}
        <Card>
          <CardHeader>
            <CardTitle>Crescimento de Utilizadores</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={usersByMonth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="users" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Subscriptions Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição de Planos</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={subscriptionsByPlan}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {subscriptionsByPlan.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Imóveis Totais</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{metrics.totalProperties}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Taxa de Conversão</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {metrics.totalUsers > 0 
                ? Math.round((metrics.activeSubscriptions / metrics.totalUsers) * 100)
                : 0}%
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Utilizadores com subscrição paga
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Valor Médio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              €{metrics.activeSubscriptions > 0 
                ? Math.round(metrics.totalRevenue / metrics.activeSubscriptions)
                : 0}
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Por subscrição ativa
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}