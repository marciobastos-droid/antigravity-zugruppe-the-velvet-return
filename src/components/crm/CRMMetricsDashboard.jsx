import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users, UserCheck, UserX, TrendingUp, Target, Building2,
  Mail, MessageSquare, Phone, Award, Sparkles, BarChart3,
  PieChart, Activity, Calendar, Euro, MapPin, Bed
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RechartsPie, Pie, Cell, LineChart, Line, Legend
} from "recharts";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export default function CRMMetricsDashboard() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const isAdmin = user && (user.role === 'admin' || user.user_type === 'admin' || user.user_type === 'gestor');

  const { data: allContacts = [] } = useQuery({
    queryKey: ['clientContacts'],
    queryFn: () => base44.entities.ClientContact.list()
  });

  const { data: allOpportunities = [] } = useQuery({
    queryKey: ['opportunities'],
    queryFn: () => base44.entities.Opportunity.list()
  });

  const { data: allCommunications = [] } = useQuery({
    queryKey: ['communicationLogs'],
    queryFn: () => base44.entities.CommunicationLog.list()
  });

  const { data: allSentMatches = [] } = useQuery({
    queryKey: ['sentMatches'],
    queryFn: () => base44.entities.SentMatch.list()
  });

  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list()
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list()
  });

  // Filter data by current user if not admin
  const contacts = React.useMemo(() => {
    if (!user) return [];
    if (isAdmin) return allContacts;
    return allContacts.filter(c => 
      c.assigned_agent === user.email || 
      c.created_by === user.email
    );
  }, [allContacts, user, isAdmin]);

  const opportunities = React.useMemo(() => {
    if (!user) return [];
    if (isAdmin) return allOpportunities;
    return allOpportunities.filter(o => 
      o.assigned_to === user.email || 
      o.seller_email === user.email ||
      o.created_by === user.email
    );
  }, [allOpportunities, user, isAdmin]);

  const communications = React.useMemo(() => {
    if (!user) return [];
    if (isAdmin) return allCommunications;
    return allCommunications.filter(c => 
      c.agent_email === user.email || 
      c.created_by === user.email
    );
  }, [allCommunications, user, isAdmin]);

  const sentMatches = React.useMemo(() => {
    if (!user) return [];
    if (isAdmin) return allSentMatches;
    return allSentMatches.filter(m => 
      m.sent_by === user.email || 
      m.created_by === user.email
    );
  }, [allSentMatches, user, isAdmin]);

  // === MÉTRICAS DE CONTACTOS ===
  const activeContacts = contacts.filter(c => c.status === 'active').length;
  const inactiveContacts = contacts.filter(c => c.status === 'inactive').length;
  const prospectContacts = contacts.filter(c => c.status === 'prospect').length;

  const contactStatusData = [
    { name: 'Ativos', value: activeContacts, color: '#10b981' },
    { name: 'Inativos', value: inactiveContacts, color: '#94a3b8' },
    { name: 'Prospects', value: prospectContacts, color: '#f59e0b' }
  ];

  // === ORIGEM DOS LEADS ===
  const leadSourceStats = {};
  const sourceLabels = {
    facebook_ads: 'Facebook Ads',
    website: 'Website',
    referral: 'Indicação',
    direct_contact: 'Contacto Direto',
    networking: 'Networking',
    google_ads: 'Google Ads',
    instagram: 'Instagram',
    real_estate_portal: 'Portal Imobiliário',
    other: 'Outro'
  };

  [...contacts, ...opportunities].forEach(item => {
    const source = item.source || item.lead_source || 'other';
    if (!leadSourceStats[source]) {
      leadSourceStats[source] = { leads: 0, converted: 0, value: 0 };
    }
    leadSourceStats[source].leads++;
  });

  opportunities.filter(o => o.status === 'won' || o.status === 'negotiation').forEach(opp => {
    const source = opp.lead_source || 'other';
    if (leadSourceStats[source]) {
      leadSourceStats[source].converted++;
      leadSourceStats[source].value += opp.estimated_value || 0;
    }
  });

  const leadSourceData = Object.entries(leadSourceStats)
    .map(([source, stats]) => ({
      source: sourceLabels[source] || source,
      leads: stats.leads,
      converted: stats.converted,
      rate: stats.leads > 0 ? Math.round((stats.converted / stats.leads) * 100) : 0,
      value: stats.value
    }))
    .sort((a, b) => b.leads - a.leads)
    .slice(0, 8);

  // === CONVERSÃO DE MATCHES ===
  const totalMatches = sentMatches.length;
  const matchesWithResponse = sentMatches.filter(m => m.client_response && m.client_response !== 'pending' && m.client_response !== 'saved');
  const interestedMatches = sentMatches.filter(m => ['interested', 'visited', 'negotiating', 'closed'].includes(m.client_response));
  const closedMatches = sentMatches.filter(m => m.client_response === 'closed');

  const matchConversionRate = totalMatches > 0 ? Math.round((interestedMatches.length / totalMatches) * 100) : 0;
  const matchCloseRate = totalMatches > 0 ? Math.round((closedMatches.length / totalMatches) * 100) : 0;

  const matchFunnelData = [
    { stage: 'Enviados', value: totalMatches },
    { stage: 'Interessados', value: interestedMatches.length },
    { stage: 'Visitados', value: sentMatches.filter(m => m.client_response === 'visited').length },
    { stage: 'Negociando', value: sentMatches.filter(m => m.client_response === 'negotiating').length },
    { stage: 'Fechados', value: closedMatches.length }
  ];

  // === DESEMPENHO DE AGENTES ===
  const agentStats = {};
  
  contacts.forEach(c => {
    const agent = c.assigned_agent || c.created_by || 'Não atribuído';
    if (!agentStats[agent]) {
      agentStats[agent] = { contacts: 0, emails: 0, calls: 0, whatsapp: 0, opportunities: 0, matches: 0, won: 0 };
    }
    agentStats[agent].contacts++;
  });

  communications.forEach(comm => {
    const agent = comm.agent_email || 'Não atribuído';
    if (!agentStats[agent]) {
      agentStats[agent] = { contacts: 0, emails: 0, calls: 0, whatsapp: 0, opportunities: 0, matches: 0, won: 0 };
    }
    if (comm.communication_type === 'email') agentStats[agent].emails++;
    if (comm.communication_type === 'phone_call') agentStats[agent].calls++;
    if (comm.communication_type === 'whatsapp') agentStats[agent].whatsapp++;
  });

  opportunities.forEach(opp => {
    const agent = opp.assigned_to || opp.created_by || 'Não atribuído';
    if (!agentStats[agent]) {
      agentStats[agent] = { contacts: 0, emails: 0, calls: 0, whatsapp: 0, opportunities: 0, matches: 0, won: 0 };
    }
    agentStats[agent].opportunities++;
    if (opp.status === 'won') agentStats[agent].won++;
  });

  sentMatches.forEach(match => {
    const agent = match.sent_by || 'Não atribuído';
    if (!agentStats[agent]) {
      agentStats[agent] = { contacts: 0, emails: 0, calls: 0, whatsapp: 0, opportunities: 0, matches: 0, won: 0 };
    }
    agentStats[agent].matches++;
  });

  const agentData = Object.entries(agentStats)
    .filter(([email]) => email !== 'Não atribuído' && email.includes('@'))
    .map(([email, stats]) => {
      const user = users.find(u => u.email === email);
      return {
        name: user?.full_name || email.split('@')[0],
        email,
        ...stats,
        total: stats.emails + stats.calls + stats.whatsapp,
        conversionRate: stats.opportunities > 0 ? Math.round((stats.won / stats.opportunities) * 100) : 0
      };
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  // === IMÓVEIS MAIS POPULARES ===
  const propertyMatchCount = {};
  sentMatches.forEach(match => {
    if (match.property_id) {
      if (!propertyMatchCount[match.property_id]) {
        propertyMatchCount[match.property_id] = {
          id: match.property_id,
          title: match.property_title,
          city: match.property_city,
          price: match.property_price,
          image: match.property_image,
          matches: 0,
          interested: 0
        };
      }
      propertyMatchCount[match.property_id].matches++;
      if (['interested', 'visited', 'negotiating', 'closed'].includes(match.client_response)) {
        propertyMatchCount[match.property_id].interested++;
      }
    }
  });

  const popularProperties = Object.values(propertyMatchCount)
    .sort((a, b) => b.matches - a.matches)
    .slice(0, 8);

  // === MÉTRICAS RÁPIDAS ===
  const last30Days = new Date();
  last30Days.setDate(last30Days.getDate() - 30);
  
  const newContactsThisMonth = contacts.filter(c => new Date(c.created_date) >= last30Days).length;
  const newOppsThisMonth = opportunities.filter(o => new Date(o.created_date) >= last30Days).length;
  const commsThisMonth = communications.filter(c => new Date(c.communication_date || c.created_date) >= last30Days).length;
  const matchesThisMonth = sentMatches.filter(m => new Date(m.sent_date || m.created_date) >= last30Days).length;

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Contactos Totais</p>
                <p className="text-3xl font-bold text-blue-700">{contacts.length}</p>
                <p className="text-xs text-blue-500 mt-1">+{newContactsThisMonth} este mês</p>
              </div>
              <Users className="w-10 h-10 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Oportunidades</p>
                <p className="text-3xl font-bold text-green-700">{opportunities.length}</p>
                <p className="text-xs text-green-500 mt-1">+{newOppsThisMonth} este mês</p>
              </div>
              <Target className="w-10 h-10 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">Matches Enviados</p>
                <p className="text-3xl font-bold text-purple-700">{totalMatches}</p>
                <p className="text-xs text-purple-500 mt-1">+{matchesThisMonth} este mês</p>
              </div>
              <Sparkles className="w-10 h-10 text-purple-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-600 font-medium">Comunicações</p>
                <p className="text-3xl font-bold text-amber-700">{communications.length}</p>
                <p className="text-xs text-amber-500 mt-1">+{commsThisMonth} este mês</p>
              </div>
              <MessageSquare className="w-10 h-10 text-amber-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* a) Contactos Ativos vs Inativos */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Estado dos Contactos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="w-40 h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPie>
                    <Pie
                      data={contactStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={35}
                      outerRadius={60}
                      dataKey="value"
                      label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {contactStatusData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPie>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-3">
                {contactStatusData.map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-sm text-slate-600">{item.name}</span>
                    </div>
                    <span className="font-bold text-slate-900">{item.value}</span>
                  </div>
                ))}
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Taxa de Atividade</span>
                    <span className="font-bold text-green-600">
                      {contacts.length > 0 ? Math.round((activeContacts / contacts.length) * 100) : 0}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* c) Taxa de Conversão de Matches */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              Funil de Conversão de Matches
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {matchFunnelData.map((item, i) => {
                const percentage = totalMatches > 0 ? (item.value / totalMatches) * 100 : 0;
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-slate-600">{item.stage}</span>
                      <span className="font-medium">{item.value} ({percentage.toFixed(1)}%)</span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                );
              })}
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t">
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{matchConversionRate}%</p>
                <p className="text-xs text-green-700">Taxa de Interesse</p>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{matchCloseRate}%</p>
                <p className="text-xs text-blue-700">Taxa de Fecho</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* b) Origem dos Leads */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-purple-600" />
            Origem dos Leads - Eficácia
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={leadSourceData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                <XAxis type="number" />
                <YAxis dataKey="source" type="category" width={100} tick={{ fontSize: 12 }} />
                <Tooltip 
                  formatter={(value, name) => [
                    value,
                    name === 'leads' ? 'Total Leads' : name === 'converted' ? 'Convertidos' : name
                  ]}
                />
                <Legend />
                <Bar dataKey="leads" name="Total Leads" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                <Bar dataKey="converted" name="Convertidos" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-4 border-t">
            {leadSourceData.slice(0, 4).map((source, i) => (
              <div key={i} className="text-center p-2 bg-slate-50 rounded-lg">
                <p className="text-lg font-bold" style={{ color: COLORS[i] }}>{source.rate}%</p>
                <p className="text-xs text-slate-600 truncate">{source.source}</p>
                <p className="text-xs text-slate-400">conversão</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* d) Desempenho de Agentes */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-600" />
            Desempenho de Agentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {agentData.length > 0 ? (
            <div className="space-y-3">
              {agentData.map((agent, i) => (
                <div key={i} className="p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center">
                        <span className="text-white font-bold text-xs">
                          {agent.name[0]?.toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{agent.name}</p>
                        <p className="text-xs text-slate-500">{agent.email}</p>
                      </div>
                    </div>
                    {i < 3 && (
                      <Badge className={
                        i === 0 ? 'bg-amber-100 text-amber-700' :
                        i === 1 ? 'bg-slate-200 text-slate-700' :
                        'bg-orange-100 text-orange-700'
                      }>
                        #{i + 1}
                      </Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-5 gap-2 text-center">
                    <div className="p-2 bg-white rounded">
                      <p className="text-lg font-bold text-blue-600">{agent.contacts}</p>
                      <p className="text-xs text-slate-500">Contactos</p>
                    </div>
                    <div className="p-2 bg-white rounded">
                      <p className="text-lg font-bold text-green-600">{agent.emails}</p>
                      <p className="text-xs text-slate-500">Emails</p>
                    </div>
                    <div className="p-2 bg-white rounded">
                      <p className="text-lg font-bold text-purple-600">{agent.matches}</p>
                      <p className="text-xs text-slate-500">Matches</p>
                    </div>
                    <div className="p-2 bg-white rounded">
                      <p className="text-lg font-bold text-amber-600">{agent.opportunities}</p>
                      <p className="text-xs text-slate-500">Opor.</p>
                    </div>
                    <div className="p-2 bg-white rounded">
                      <p className="text-lg font-bold text-emerald-600">{agent.conversionRate}%</p>
                      <p className="text-xs text-slate-500">Conv.</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <Award className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>Sem dados de agentes disponíveis</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* e) Imóveis Mais Populares */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-600" />
            Imóveis Mais Populares nos Matches
          </CardTitle>
        </CardHeader>
        <CardContent>
          {popularProperties.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {popularProperties.map((prop, i) => (
                <div key={i} className="p-3 border rounded-lg hover:shadow-md transition-shadow bg-white">
                  <div className="flex flex-col gap-2">
                    {prop.image ? (
                      <img 
                        src={prop.image} 
                        alt={prop.title}
                        className="w-full h-24 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-full h-24 rounded-lg bg-slate-100 flex items-center justify-center">
                        <Building2 className="w-8 h-8 text-slate-300" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900 text-sm line-clamp-2 leading-tight">{prop.title || 'Sem título'}</p>
                      <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{prop.city || 'N/A'}</span>
                      </div>
                      {prop.price > 0 && (
                        <p className="text-sm font-bold text-slate-700 mt-1">
                          €{prop.price.toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-2 border-t">
                    <div className="flex items-center gap-1 text-purple-600">
                      <Sparkles className="w-3 h-3" />
                      <span className="text-sm font-medium">{prop.matches}</span>
                    </div>
                    <div className="flex items-center gap-1 text-green-600">
                      <Target className="w-3 h-3" />
                      <span className="text-sm font-medium">{prop.interested}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <Building2 className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>Ainda não há matches enviados</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}