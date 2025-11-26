import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Users, Calendar, MessageSquare, TrendingUp, 
  Clock, Phone, Mail, CheckCircle2, AlertCircle
} from "lucide-react";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, isToday, isTomorrow, addDays, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function CRMDashboard() {
  const { data: clients = [] } = useQuery({
    queryKey: ['clientContacts'],
    queryFn: () => base44.entities.ClientContact.list('-created_date')
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ['appointments'],
    queryFn: () => base44.entities.Appointment.list('-appointment_date')
  });

  const { data: communications = [] } = useQuery({
    queryKey: ['communicationLogs'],
    queryFn: () => base44.entities.CommunicationLog.list('-communication_date')
  });

  const { data: opportunities = [] } = useQuery({
    queryKey: ['opportunities'],
    queryFn: () => base44.entities.Opportunity.list('-created_date')
  });

  // Stats
  const totalClients = clients.length;
  const activeClients = clients.filter(c => c.status === 'active').length;
  const todayAppointments = appointments.filter(a => 
    a.appointment_date && isToday(new Date(a.appointment_date)) && a.status !== 'cancelled'
  );
  const upcomingAppointments = appointments.filter(a => 
    new Date(a.appointment_date) >= new Date() && a.status !== 'cancelled'
  ).slice(0, 5);
  const recentCommunications = communications.slice(0, 5);

  // Communications by type
  const commByType = communications.reduce((acc, comm) => {
    const type = comm.communication_type || 'other';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  const commTypeData = Object.entries(commByType).map(([name, value]) => ({
    name: name === 'phone_call' ? 'Chamadas' : 
          name === 'email' ? 'Emails' :
          name === 'whatsapp' ? 'WhatsApp' :
          name === 'meeting' ? 'Reuniões' :
          name === 'site_visit' ? 'Visitas' : 'Outros',
    value
  }));

  // Clients by type
  const clientsByType = clients.reduce((acc, client) => {
    const type = client.contact_type || 'other';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  const clientTypeData = Object.entries(clientsByType).map(([name, value]) => ({
    name: name === 'client' ? 'Clientes' : 
          name === 'partner' ? 'Parceiros' :
          name === 'investor' ? 'Investidores' :
          name === 'vendor' ? 'Fornecedores' : 'Outros',
    value
  }));

  // Follow-ups pendentes
  const pendingFollowUps = communications.filter(c => 
    c.follow_up_required && 
    c.follow_up_date && 
    new Date(c.follow_up_date) >= subDays(new Date(), 1)
  );

  const typeLabels = {
    phone_call: "Chamada",
    email: "Email",
    whatsapp: "WhatsApp",
    meeting: "Reunião",
    site_visit: "Visita",
    other: "Outro"
  };

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-slate-600 mb-1">Total Contactos</p>
                <p className="text-3xl font-bold text-slate-900">{totalClients}</p>
                <p className="text-xs text-slate-500 mt-1">{activeClients} ativos</p>
              </div>
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-slate-600 mb-1">Visitas Hoje</p>
                <p className="text-3xl font-bold text-slate-900">{todayAppointments.length}</p>
                <p className="text-xs text-slate-500 mt-1">{upcomingAppointments.length} próximas</p>
              </div>
              <Calendar className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-slate-600 mb-1">Comunicações</p>
                <p className="text-3xl font-bold text-slate-900">{communications.length}</p>
                <p className="text-xs text-slate-500 mt-1">registadas</p>
              </div>
              <MessageSquare className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-slate-600 mb-1">Follow-ups</p>
                <p className="text-3xl font-bold text-slate-900">{pendingFollowUps.length}</p>
                <p className="text-xs text-slate-500 mt-1">pendentes</p>
              </div>
              <Clock className="w-8 h-8 text-amber-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Charts */}
        <Card>
          <CardHeader>
            <CardTitle>Comunicações por Tipo</CardTitle>
          </CardHeader>
          <CardContent>
            {commTypeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={commTypeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {commTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-slate-500">
                Sem dados de comunicações
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contactos por Tipo</CardTitle>
          </CardHeader>
          <CardContent>
            {clientTypeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={clientTypeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-slate-500">
                Sem dados de contactos
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Today's Appointments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-green-600" />
              Visitas de Hoje
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todayAppointments.length === 0 ? (
              <div className="text-center py-6 text-slate-500">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>Nenhuma visita agendada para hoje</p>
              </div>
            ) : (
              <div className="space-y-3">
                {todayAppointments.map((appt) => (
                  <div key={appt.id} className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="text-center min-w-[50px]">
                      <div className="text-lg font-bold text-green-700">
                        {format(new Date(appt.appointment_date), 'HH:mm')}
                      </div>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-slate-900">{appt.title}</h4>
                      <p className="text-sm text-slate-600">{appt.client_name}</p>
                    </div>
                    <Badge className="bg-green-100 text-green-800">
                      {appt.status === 'confirmed' ? 'Confirmada' : 'Agendada'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Follow-ups */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              Follow-ups Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendingFollowUps.length === 0 ? (
              <div className="text-center py-6 text-slate-500">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>Nenhum follow-up pendente</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingFollowUps.slice(0, 5).map((comm) => (
                  <div key={comm.id} className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <div className="text-center min-w-[50px]">
                      <div className="text-sm font-bold text-amber-700">
                        {format(new Date(comm.follow_up_date), 'd MMM', { locale: ptBR })}
                      </div>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-slate-900">{comm.contact_name}</h4>
                      <p className="text-sm text-slate-600">{comm.follow_up_notes || comm.summary}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Communications */}
      <Card>
        <CardHeader>
          <CardTitle>Comunicações Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {recentCommunications.length === 0 ? (
            <div className="text-center py-6 text-slate-500">
              <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>Nenhuma comunicação registada</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentCommunications.map((comm) => (
                <div key={comm.id} className="flex items-center gap-4 p-3 border rounded-lg hover:bg-slate-50">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    {comm.communication_type === 'phone_call' ? <Phone className="w-4 h-4 text-blue-600" /> :
                     comm.communication_type === 'email' ? <Mail className="w-4 h-4 text-blue-600" /> :
                     <MessageSquare className="w-4 h-4 text-blue-600" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900">{comm.contact_name}</span>
                      <Badge variant="outline">{typeLabels[comm.communication_type]}</Badge>
                    </div>
                    <p className="text-sm text-slate-600 truncate">{comm.summary}</p>
                  </div>
                  <div className="text-xs text-slate-500">
                    {format(new Date(comm.communication_date || comm.created_date), "d MMM, HH:mm", { locale: ptBR })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}