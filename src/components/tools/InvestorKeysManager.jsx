import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Key, Plus, Copy, Eye, EyeOff, Trash2, Calendar, 
  CheckCircle2, XCircle, Loader2, ExternalLink, Clock 
} from "lucide-react";
import { toast } from "sonner";
import { format, addDays, addMonths, addYears } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function InvestorKeysManager() {
  const queryClient = useQueryClient();
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [selectedClient, setSelectedClient] = React.useState(null);
  const [expiryDays, setExpiryDays] = React.useState(30);
  const [notes, setNotes] = React.useState("");
  
  const { data: accessKeys = [], isLoading } = useQuery({
    queryKey: ['investorAccessKeys'],
    queryFn: () => base44.entities.InvestorAccessKey.list('-created_date'),
  });
  
  const { data: clients = [] } = useQuery({
    queryKey: ['clientContacts'],
    queryFn: async () => {
      const contacts = await base44.entities.ClientContact.list();
      return contacts.filter(c => c.is_active !== false);
    },
  });
  
  const createKeyMutation = useMutation({
    mutationFn: async () => {
      if (!selectedClient) throw new Error("Selecione um cliente");
      
      // Generate unique key
      const keyString = Math.random().toString(36).substring(2, 15) + 
                       Math.random().toString(36).substring(2, 15);
      
      const expiresAt = addDays(new Date(), expiryDays);
      
      return await base44.entities.InvestorAccessKey.create({
        access_key: keyString,
        client_id: selectedClient.id,
        client_name: selectedClient.full_name,
        client_email: selectedClient.email,
        expires_at: expiresAt.toISOString(),
        is_active: true,
        access_count: 0,
        notes: notes
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investorAccessKeys'] });
      toast.success("Chave de acesso criada!");
      setCreateDialogOpen(false);
      setSelectedClient(null);
      setExpiryDays(30);
      setNotes("");
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao criar chave");
    }
  });
  
  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }) => 
      base44.entities.InvestorAccessKey.update(id, { is_active: !isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investorAccessKeys'] });
      toast.success("Estado atualizado");
    },
  });
  
  const deleteKeyMutation = useMutation({
    mutationFn: (id) => base44.entities.InvestorAccessKey.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investorAccessKeys'] });
      toast.success("Chave eliminada");
    },
  });
  
  const copyAccessUrl = (key) => {
    const url = `${window.location.origin}${window.location.pathname}#/InvestorSection?key=${key}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  };
  
  const isExpired = (expiresAt) => new Date(expiresAt) < new Date();
  
  const activeKeys = accessKeys.filter(k => k.is_active && !isExpired(k.expires_at));
  const expiredKeys = accessKeys.filter(k => isExpired(k.expires_at));
  const inactiveKeys = accessKeys.filter(k => !k.is_active && !isExpired(k.expires_at));
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                Gestão de Acessos - Secção de Investidores
              </CardTitle>
              <p className="text-sm text-slate-600 mt-1">
                Crie chaves de acesso com expiração para clientes visualizarem imóveis exclusivos
              </p>
            </div>
            <Button 
              onClick={() => setCreateDialogOpen(true)}
              className="bg-green-600 hover:bg-green-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nova Chave
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="text-2xl font-bold text-green-900">{activeKeys.length}</div>
              <div className="text-sm text-green-700">Chaves Ativas</div>
            </div>
            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
              <div className="text-2xl font-bold text-amber-900">{expiredKeys.length}</div>
              <div className="text-sm text-amber-700">Expiradas</div>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="text-2xl font-bold text-slate-900">{inactiveKeys.length}</div>
              <div className="text-sm text-slate-700">Inativas</div>
            </div>
          </div>
          
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : accessKeys.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Key className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nenhuma chave de acesso criada</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Criada</TableHead>
                  <TableHead>Expira</TableHead>
                  <TableHead>Acessos</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accessKeys.map((key) => {
                  const expired = isExpired(key.expires_at);
                  const daysUntilExpiry = Math.ceil(
                    (new Date(key.expires_at) - new Date()) / (1000 * 60 * 60 * 24)
                  );
                  
                  return (
                    <TableRow key={key.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{key.client_name}</div>
                          <div className="text-xs text-slate-500">{key.client_email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {format(new Date(key.created_date), "d MMM yyyy", { locale: ptBR })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {format(new Date(key.expires_at), "d MMM yyyy", { locale: ptBR })}
                          {!expired && daysUntilExpiry <= 7 && (
                            <Badge className="ml-2 bg-amber-100 text-amber-800">
                              <Clock className="w-3 h-3 mr-1" />
                              {daysUntilExpiry}d
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{key.access_count || 0}</Badge>
                      </TableCell>
                      <TableCell>
                        {expired ? (
                          <Badge className="bg-red-100 text-red-800">
                            <XCircle className="w-3 h-3 mr-1" />
                            Expirada
                          </Badge>
                        ) : key.is_active ? (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Ativa
                          </Badge>
                        ) : (
                          <Badge className="bg-slate-100 text-slate-800">
                            <EyeOff className="w-3 h-3 mr-1" />
                            Inativa
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyAccessUrl(key.access_key)}
                            title="Copiar link"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          <a
                            href={`#/InvestorSection?key=${key.access_key}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button size="sm" variant="ghost" title="Abrir">
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          </a>
                          {!expired && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => toggleActiveMutation.mutate({ 
                                id: key.id, 
                                isActive: key.is_active 
                              })}
                              title={key.is_active ? "Desativar" : "Ativar"}
                            >
                              {key.is_active ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              if (window.confirm("Eliminar esta chave?")) {
                                deleteKeyMutation.mutate(key.id);
                              }
                            }}
                            className="text-red-600 hover:text-red-700"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      
      {/* Create Key Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Nova Chave de Acesso</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Cliente *</Label>
              <Select
                value={selectedClient?.id || ""}
                onValueChange={(id) => {
                  const client = clients.find(c => c.id === id);
                  setSelectedClient(client);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o cliente..." />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.full_name} - {client.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Válido por (dias)</Label>
              <div className="grid grid-cols-4 gap-2 mt-2">
                <Button
                  variant={expiryDays === 7 ? "default" : "outline"}
                  size="sm"
                  onClick={() => setExpiryDays(7)}
                >
                  7 dias
                </Button>
                <Button
                  variant={expiryDays === 30 ? "default" : "outline"}
                  size="sm"
                  onClick={() => setExpiryDays(30)}
                >
                  30 dias
                </Button>
                <Button
                  variant={expiryDays === 90 ? "default" : "outline"}
                  size="sm"
                  onClick={() => setExpiryDays(90)}
                >
                  90 dias
                </Button>
                <Button
                  variant={expiryDays === 365 ? "default" : "outline"}
                  size="sm"
                  onClick={() => setExpiryDays(365)}
                >
                  1 ano
                </Button>
              </div>
              <Input
                type="number"
                value={expiryDays}
                onChange={(e) => setExpiryDays(parseInt(e.target.value) || 30)}
                className="mt-2"
                min="1"
              />
              <p className="text-xs text-slate-500 mt-1">
                Expira em: {format(addDays(new Date(), expiryDays), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
            </div>
            
            <div>
              <Label>Notas (opcional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Informações adicionais sobre esta chave..."
                rows={3}
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setCreateDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={() => createKeyMutation.mutate()}
                disabled={!selectedClient || createKeyMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                {createKeyMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    A criar...
                  </>
                ) : (
                  <>
                    <Key className="w-4 h-4 mr-2" />
                    Criar Chave
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}