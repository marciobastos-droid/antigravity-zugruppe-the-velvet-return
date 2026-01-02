import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Search, Crown, User, Mail, Calendar, Shield } from "lucide-react";

export default function AdminUsersManager() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState("all");
  const [editingUser, setEditingUser] = React.useState(null);
  const [newSubscription, setNewSubscription] = React.useState({ plan: 'free', duration_days: 30 });

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list()
  });

  const { data: subscriptions = [], isLoading: subsLoading } = useQuery({
    queryKey: ['allSubscriptions'],
    queryFn: () => base44.entities.Subscription.list()
  });

  const updateSubscriptionMutation = useMutation({
    mutationFn: async ({ userEmail, plan, durationDays }) => {
      // Buscar subscrição existente
      const existing = subscriptions.find(s => s.user_email === userEmail && s.status === 'active');
      
      const now = new Date();
      const periodEnd = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

      if (existing) {
        // Atualizar subscrição existente
        await base44.entities.Subscription.update(existing.id, {
          plan: plan,
          status: 'active',
          current_period_end: periodEnd.toISOString()
        });
      } else {
        // Criar nova subscrição
        await base44.entities.Subscription.create({
          user_email: userEmail,
          plan: plan,
          status: 'active',
          payment_method: 'admin_granted',
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString()
        });
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allSubscriptions'] });
      toast.success("Subscrição atualizada!");
      setEditingUser(null);
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    }
  });

  const filteredUsers = React.useMemo(() => {
    return users.filter(u => {
      const matchesSearch = !searchTerm ||
        u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesRole = roleFilter === "all" || u.role === roleFilter;

      return matchesSearch && matchesRole;
    });
  }, [users, searchTerm, roleFilter]);

  const getUserSubscription = (userEmail) => {
    return subscriptions.find(s => s.user_email === userEmail && s.status === 'active');
  };

  if (usersLoading || subsLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Gestão de Utilizadores
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Pesquisar por nome ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="user">User</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
              <div className="text-2xl font-bold text-blue-900">{users.length}</div>
              <div className="text-sm text-blue-700">Total Utilizadores</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
              <div className="text-2xl font-bold text-purple-900">
                {subscriptions.filter(s => s.status === 'active' && s.plan !== 'free').length}
              </div>
              <div className="text-sm text-purple-700">Subscrições Pagas</div>
            </div>
            <div className="bg-green-50 rounded-lg p-3 border border-green-200">
              <div className="text-2xl font-bold text-green-900">{filteredUsers.length}</div>
              <div className="text-sm text-green-700">Filtrados</div>
            </div>
          </div>

          {/* Users List */}
          <div className="space-y-2">
            {filteredUsers.map((user) => {
              const subscription = getUserSubscription(user.email);
              const plan = subscription?.plan || 'free';

              return (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-lg hover:border-slate-300 transition-all"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center flex-shrink-0">
                      {user.role === 'admin' ? (
                        <Shield className="w-5 h-5 text-slate-700" />
                      ) : (
                        <User className="w-5 h-5 text-slate-700" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-slate-900 truncate">{user.full_name || user.email}</h4>
                        <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                          {user.role}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-3 text-sm text-slate-600">
                        <span className="flex items-center gap-1 truncate">
                          <Mail className="w-3 h-3 flex-shrink-0" />
                          {user.email}
                        </span>
                        <span className="flex items-center gap-1">
                          <Crown className="w-3 h-3 flex-shrink-0" />
                          Plano: <span className="font-medium capitalize">{plan}</span>
                        </span>
                        {subscription?.current_period_end && (
                          <span className="flex items-center gap-1 text-xs">
                            <Calendar className="w-3 h-3 flex-shrink-0" />
                            Válido até {new Date(subscription.current_period_end).toLocaleDateString('pt-PT')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingUser(user);
                      setNewSubscription({
                        plan: plan,
                        duration_days: 30
                      });
                    }}
                  >
                    Gerir Subscrição
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Edit Subscription Dialog */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerir Subscrição</DialogTitle>
            <DialogDescription>
              Alterar o plano de subscrição de {editingUser?.full_name || editingUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Plano</Label>
              <Select 
                value={newSubscription.plan} 
                onValueChange={(value) => setNewSubscription({ ...newSubscription, plan: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Gratuito</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {newSubscription.plan !== 'free' && (
              <div>
                <Label>Duração (dias)</Label>
                <Select 
                  value={String(newSubscription.duration_days)} 
                  onValueChange={(value) => setNewSubscription({ ...newSubscription, duration_days: Number(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 dias (Trial)</SelectItem>
                    <SelectItem value="30">30 dias (1 mês)</SelectItem>
                    <SelectItem value="90">90 dias (3 meses)</SelectItem>
                    <SelectItem value="180">180 dias (6 meses)</SelectItem>
                    <SelectItem value="365">365 dias (1 ano)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => updateSubscriptionMutation.mutate({
                userEmail: editingUser.email,
                plan: newSubscription.plan,
                durationDays: newSubscription.duration_days
              })}
              disabled={updateSubscriptionMutation.isPending}
            >
              {updateSubscriptionMutation.isPending ? "A guardar..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}