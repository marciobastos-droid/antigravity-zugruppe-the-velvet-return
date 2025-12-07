import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Megaphone, Users, Bell, Send, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function TeamAlertsBroadcaster() {
  const queryClient = useQueryClient();
  const [broadcastData, setBroadcastData] = useState({
    title: "",
    message: "",
    type: "announcement",
    priority: "medium",
    broadcast_type: "all_users",
    target_team: ""
  });
  const [sending, setSending] = useState(false);
  const [sentCount, setSentCount] = useState(0);

  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsersForBroadcast'],
    queryFn: () => base44.entities.User.list()
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const broadcastMutation = useMutation({
    mutationFn: async (data) => {
      let targetUsers = [];
      
      switch (data.broadcast_type) {
        case "all_users":
          targetUsers = allUsers;
          break;
        case "admins_only":
          targetUsers = allUsers.filter(u => u.role === 'admin' || u.user_type?.toLowerCase() === 'admin');
          break;
        case "sales_team":
          targetUsers = allUsers.filter(u => 
            u.user_type?.toLowerCase() === 'gestor' || 
            u.user_type?.toLowerCase() === 'agente' ||
            u.role === 'admin'
          );
          break;
        case "agents_only":
          targetUsers = allUsers.filter(u => u.user_type?.toLowerCase() === 'agente');
          break;
        case "team":
          if (data.target_team) {
            targetUsers = allUsers.filter(u => 
              u.team === data.target_team || 
              u.department === data.target_team
            );
          }
          break;
        default:
          targetUsers = allUsers;
      }

      const notifications = targetUsers.map(user => ({
        title: data.title,
        message: data.message,
        type: data.type,
        priority: data.priority,
        broadcast_type: data.broadcast_type,
        target_team: data.target_team,
        user_email: user.email,
        assigned_to: user.email,
        metadata: {
          sender: currentUser?.email,
          sender_name: currentUser?.full_name,
          sent_at: new Date().toISOString()
        }
      }));

      await base44.entities.Notification.bulkCreate(notifications);
      return { count: notifications.length, users: targetUsers };
    },
    onSuccess: (result) => {
      setSentCount(result.count);
      toast.success(`Notificação enviada para ${result.count} utilizadores!`);
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      
      // Reset form
      setBroadcastData({
        title: "",
        message: "",
        type: "announcement",
        priority: "medium",
        broadcast_type: "all_users",
        target_team: ""
      });
    },
    onError: () => {
      toast.error("Erro ao enviar notificações");
    }
  });

  const handleBroadcast = async () => {
    if (!broadcastData.title || !broadcastData.message) {
      toast.error("Preencha o título e mensagem");
      return;
    }

    if (broadcastData.broadcast_type === "team" && !broadcastData.target_team) {
      toast.error("Selecione a equipa alvo");
      return;
    }

    setSending(true);
    try {
      await broadcastMutation.mutateAsync(broadcastData);
    } catch (error) {
      console.error(error);
    }
    setSending(false);
  };

  const getTargetCount = () => {
    switch (broadcastData.broadcast_type) {
      case "all_users":
        return allUsers.length;
      case "admins_only":
        return allUsers.filter(u => u.role === 'admin' || u.user_type?.toLowerCase() === 'admin').length;
      case "sales_team":
        return allUsers.filter(u => 
          u.user_type?.toLowerCase() === 'gestor' || 
          u.user_type?.toLowerCase() === 'agente' ||
          u.role === 'admin'
        ).length;
      case "agents_only":
        return allUsers.filter(u => u.user_type?.toLowerCase() === 'agente').length;
      default:
        return 0;
    }
  };

  const isAdmin = currentUser && (
    currentUser.role === 'admin' || 
    currentUser.user_type?.toLowerCase() === 'admin' ||
    currentUser.user_type?.toLowerCase() === 'gestor'
  );

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <p className="text-slate-600">Apenas administradores podem enviar alertas de equipa</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-blue-600" />
            Difusão de Alertas de Equipa
          </CardTitle>
          <p className="text-sm text-slate-600">
            Envie anúncios, alertas e avisos importantes para toda a equipa ou grupos específicos
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Broadcast Type */}
          <div>
            <Label>Destinatários</Label>
            <Select 
              value={broadcastData.broadcast_type} 
              onValueChange={(v) => setBroadcastData({...broadcastData, broadcast_type: v})}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_users">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Todos os Utilizadores ({allUsers.length})
                  </div>
                </SelectItem>
                <SelectItem value="admins_only">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Apenas Administradores ({allUsers.filter(u => u.role === 'admin' || u.user_type?.toLowerCase() === 'admin').length})
                  </div>
                </SelectItem>
                <SelectItem value="sales_team">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Equipa Comercial ({allUsers.filter(u => 
                      u.user_type?.toLowerCase() === 'gestor' || 
                      u.user_type?.toLowerCase() === 'agente' ||
                      u.role === 'admin'
                    ).length})
                  </div>
                </SelectItem>
                <SelectItem value="agents_only">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Apenas Agentes ({allUsers.filter(u => u.user_type?.toLowerCase() === 'agente').length})
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500 mt-1">
              Será enviado para {getTargetCount()} utilizador{getTargetCount() !== 1 ? 'es' : ''}
            </p>
          </div>

          {/* Type & Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tipo</Label>
              <Select 
                value={broadcastData.type} 
                onValueChange={(v) => setBroadcastData({...broadcastData, type: v})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="announcement">📢 Anúncio</SelectItem>
                  <SelectItem value="team_alert">⚠️ Alerta de Equipa</SelectItem>
                  <SelectItem value="system">⚙️ Sistema</SelectItem>
                  <SelectItem value="contract">📄 Contrato</SelectItem>
                  <SelectItem value="urgent_lead">🔥 Lead Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Prioridade</Label>
              <Select 
                value={broadcastData.priority} 
                onValueChange={(v) => setBroadcastData({...broadcastData, priority: v})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="urgent">Urgente 🚨</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Title */}
          <div>
            <Label>Título *</Label>
            <Input
              value={broadcastData.title}
              onChange={(e) => setBroadcastData({...broadcastData, title: e.target.value})}
              placeholder="Ex: Nova funcionalidade disponível, Reunião de equipa, etc."
            />
          </div>

          {/* Message */}
          <div>
            <Label>Mensagem *</Label>
            <Textarea
              value={broadcastData.message}
              onChange={(e) => setBroadcastData({...broadcastData, message: e.target.value})}
              placeholder="Escreva a mensagem do alerta..."
              rows={5}
            />
          </div>

          {/* Send Button */}
          <Button
            onClick={handleBroadcast}
            disabled={sending || !broadcastData.title || !broadcastData.message}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {sending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                A enviar para {getTargetCount()} utilizadores...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Enviar Notificação para {getTargetCount()} Utilizador{getTargetCount() !== 1 ? 'es' : ''}
              </>
            )}
          </Button>

          {sentCount > 0 && (
            <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <p className="text-sm text-green-900">
                Última difusão enviada para {sentCount} utilizadores
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Templates */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Modelos Rápidos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBroadcastData({
                ...broadcastData,
                title: "Nova Funcionalidade Disponível",
                message: "Acabámos de lançar uma nova funcionalidade no sistema. Confira as atualizações!",
                type: "announcement",
                priority: "medium"
              })}
            >
              📢 Nova Funcionalidade
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBroadcastData({
                ...broadcastData,
                title: "Reunião de Equipa",
                message: "Reunião de equipa agendada. Por favor, confirme a sua presença.",
                type: "team_alert",
                priority: "high",
                broadcast_type: "sales_team"
              })}
            >
              📅 Reunião
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBroadcastData({
                ...broadcastData,
                title: "Lead Urgente - Ação Necessária",
                message: "Novo lead de alta prioridade requer atenção imediata da equipa.",
                type: "urgent_lead",
                priority: "urgent",
                broadcast_type: "sales_team"
              })}
            >
              🔥 Lead Urgente
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBroadcastData({
                ...broadcastData,
                title: "Atualização de Política",
                message: "Atualização importante nas políticas da empresa. Leia atentamente.",
                type: "announcement",
                priority: "high"
              })}
            >
              📋 Política
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Broadcasts */}
      <RecentBroadcasts />
    </div>
  );
}

function RecentBroadcasts() {
  const { data: recentBroadcasts = [] } = useQuery({
    queryKey: ['recentBroadcasts'],
    queryFn: async () => {
      const notifications = await base44.entities.Notification.list('-created_date', 20);
      // Group by unique title+message to show broadcasts
      const broadcasts = [];
      const seen = new Set();
      
      for (const notif of notifications) {
        const key = `${notif.title}-${notif.broadcast_type}`;
        if (!seen.has(key) && notif.broadcast_type && notif.broadcast_type !== 'individual') {
          seen.add(key);
          broadcasts.push(notif);
        }
      }
      
      return broadcasts.slice(0, 5);
    }
  });

  const priorityColors = {
    low: "bg-slate-100 text-slate-700",
    medium: "bg-blue-100 text-blue-700",
    high: "bg-orange-100 text-orange-700",
    urgent: "bg-red-100 text-red-700"
  };

  if (recentBroadcasts.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Difusões Recentes</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {recentBroadcasts.map((broadcast, idx) => (
            <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-start justify-between mb-1">
                <p className="font-medium text-sm text-slate-900">{broadcast.title}</p>
                <Badge className={priorityColors[broadcast.priority]}>
                  {broadcast.priority}
                </Badge>
              </div>
              <p className="text-xs text-slate-600 mb-2 line-clamp-2">{broadcast.message}</p>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Badge variant="outline" className="text-xs">
                  {broadcast.broadcast_type === 'all_users' ? 'Todos' : 
                   broadcast.broadcast_type === 'admins_only' ? 'Admins' :
                   broadcast.broadcast_type === 'sales_team' ? 'Equipa Comercial' :
                   broadcast.broadcast_type === 'agents_only' ? 'Agentes' : broadcast.broadcast_type}
                </Badge>
                <span>•</span>
                <span>{new Date(broadcast.created_date).toLocaleDateString('pt-PT')}</span>
                {broadcast.metadata?.sender_name && (
                  <>
                    <span>•</span>
                    <span>Por: {broadcast.metadata.sender_name}</span>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}