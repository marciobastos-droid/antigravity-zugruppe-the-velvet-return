import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Database, Trash2, RefreshCw, AlertTriangle, CheckCircle2,
  FileX, Users, Building2, Calendar, FileText, Loader2,
  HardDrive, Clock, Zap
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { format, subDays, subMonths } from "date-fns";

export default function AdminMaintenanceTab() {
  const queryClient = useQueryClient();
  const [cleanupDialog, setCleanupDialog] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch all data
  const { data: properties = [] } = useQuery({
    queryKey: ['maintenanceProperties'],
    queryFn: () => base44.entities.Property.list(),
  });

  const { data: opportunities = [] } = useQuery({
    queryKey: ['maintenanceOpportunities'],
    queryFn: () => base44.entities.Opportunity.list(),
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ['maintenanceAppointments'],
    queryFn: () => base44.entities.Appointment.list(),
  });

  const { data: documents = [] } = useQuery({
    queryKey: ['maintenanceDocuments'],
    queryFn: () => base44.entities.PropertyDocument.list(),
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ['maintenanceNotifications'],
    queryFn: () => base44.entities.Notification.list(),
  });

  // Identificar dados obsoletos
  const now = new Date();
  const sixMonthsAgo = subMonths(now, 6);
  const threeMonthsAgo = subMonths(now, 3);
  const oneMonthAgo = subMonths(now, 1);

  const obsoleteData = {
    // Imóveis sem imagens há mais de 3 meses
    propertiesWithoutImages: properties.filter(p => 
      (!p.images || p.images.length === 0) && 
      new Date(p.created_date) < threeMonthsAgo
    ),
    
    // Imóveis inativos há mais de 6 meses
    inactiveProperties: properties.filter(p => 
      (p.status === 'off_market' || p.availability_status === 'withdrawn') &&
      new Date(p.updated_date || p.created_date) < sixMonthsAgo
    ),
    
    // Oportunidades perdidas/antigas
    oldLostOpportunities: opportunities.filter(o => 
      o.status === 'lost' && 
      new Date(o.updated_date || o.created_date) < threeMonthsAgo
    ),
    
    // Visitas passadas há mais de 3 meses
    oldAppointments: appointments.filter(a => 
      a.status === 'completed' && 
      new Date(a.appointment_date) < threeMonthsAgo
    ),
    
    // Notificações lidas há mais de 1 mês
    oldNotifications: notifications.filter(n => 
      n.is_read && 
      new Date(n.created_date) < oneMonthAgo
    ),
    
    // Documentos expirados
    expiredDocuments: documents.filter(d => 
      d.expiry_date && new Date(d.expiry_date) < now
    ),

    // Imóveis duplicados (mesmo título e cidade)
    duplicateProperties: properties.filter((p, idx) => 
      properties.findIndex(x => 
        x.title === p.title && 
        x.city === p.city && 
        x.id !== p.id
      ) < idx
    )
  };

  const totalObsolete = Object.values(obsoleteData).reduce((sum, arr) => sum + arr.length, 0);

  // Cleanup mutations
  const cleanupMutation = useMutation({
    mutationFn: async ({ type, items }) => {
      setIsProcessing(true);
      const entityMap = {
        propertiesWithoutImages: 'Property',
        inactiveProperties: 'Property',
        duplicateProperties: 'Property',
        oldLostOpportunities: 'Opportunity',
        oldAppointments: 'Appointment',
        oldNotifications: 'Notification',
        expiredDocuments: 'PropertyDocument'
      };
      
      const entity = entityMap[type];
      if (!entity) throw new Error("Tipo desconhecido");
      
      for (const item of items) {
        await base44.entities[entity].delete(item.id);
      }
      
      return items.length;
    },
    onSuccess: (count) => {
      toast.success(`${count} registos removidos com sucesso`);
      queryClient.invalidateQueries();
      setCleanupDialog(null);
      setSelectedItems([]);
      setIsProcessing(false);
    },
    onError: (error) => {
      toast.error("Erro: " + error.message);
      setIsProcessing(false);
    }
  });

  const openCleanupDialog = (type, items, title, description) => {
    setCleanupDialog({ type, items, title, description });
    setSelectedItems(items.map(i => i.id));
  };

  const handleCleanup = () => {
    const itemsToDelete = cleanupDialog.items.filter(i => selectedItems.includes(i.id));
    cleanupMutation.mutate({ type: cleanupDialog.type, items: itemsToDelete });
  };

  const cleanupCategories = [
    {
      id: 'propertiesWithoutImages',
      title: 'Imóveis sem Imagens',
      description: 'Imóveis criados há mais de 3 meses sem fotos',
      icon: FileX,
      color: 'text-amber-600',
      bgColor: 'bg-amber-100',
      items: obsoleteData.propertiesWithoutImages
    },
    {
      id: 'inactiveProperties',
      title: 'Imóveis Inativos',
      description: 'Imóveis retirados ou inativos há mais de 6 meses',
      icon: Building2,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      items: obsoleteData.inactiveProperties
    },
    {
      id: 'duplicateProperties',
      title: 'Imóveis Duplicados',
      description: 'Imóveis com mesmo título e cidade',
      icon: Building2,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      items: obsoleteData.duplicateProperties
    },
    {
      id: 'oldLostOpportunities',
      title: 'Oportunidades Perdidas',
      description: 'Leads marcados como perdidos há mais de 3 meses',
      icon: Users,
      color: 'text-slate-600',
      bgColor: 'bg-slate-100',
      items: obsoleteData.oldLostOpportunities
    },
    {
      id: 'oldAppointments',
      title: 'Visitas Antigas',
      description: 'Visitas concluídas há mais de 3 meses',
      icon: Calendar,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      items: obsoleteData.oldAppointments
    },
    {
      id: 'oldNotifications',
      title: 'Notificações Antigas',
      description: 'Notificações lidas há mais de 1 mês',
      icon: Zap,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      items: obsoleteData.oldNotifications
    },
    {
      id: 'expiredDocuments',
      title: 'Documentos Expirados',
      description: 'Documentos com data de validade ultrapassada',
      icon: FileText,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      items: obsoleteData.expiredDocuments
    }
  ];

  return (
    <div className="space-y-6">
      {/* Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Manutenção da Base de Dados
              </CardTitle>
              <CardDescription>
                Limpe dados obsoletos e otimize o sistema
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              onClick={() => queryClient.invalidateQueries()}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-slate-50 rounded-lg">
              <HardDrive className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-2xl font-bold">{properties.length}</p>
              <p className="text-sm text-slate-500">Imóveis</p>
            </div>
            <div className="text-center p-4 bg-slate-50 rounded-lg">
              <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-2xl font-bold">{opportunities.length}</p>
              <p className="text-sm text-slate-500">Oportunidades</p>
            </div>
            <div className="text-center p-4 bg-slate-50 rounded-lg">
              <FileText className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-2xl font-bold">{documents.length}</p>
              <p className="text-sm text-slate-500">Documentos</p>
            </div>
            <div className="text-center p-4 bg-amber-50 rounded-lg">
              <AlertTriangle className="w-8 h-8 text-amber-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-amber-600">{totalObsolete}</p>
              <p className="text-sm text-slate-500">Para Limpar</p>
            </div>
          </div>

          {totalObsolete > 0 && (
            <Alert className="mb-6">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Dados Obsoletos Detetados</AlertTitle>
              <AlertDescription>
                Foram encontrados {totalObsolete} registos que podem ser removidos para otimizar o sistema.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Cleanup Categories */}
      <div className="grid md:grid-cols-2 gap-4">
        {cleanupCategories.map((category) => (
          <Card key={category.id} className={category.items.length > 0 ? "border-amber-200" : ""}>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg ${category.bgColor}`}>
                  <category.icon className={`w-6 h-6 ${category.color}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold">{category.title}</h3>
                    <Badge variant={category.items.length > 0 ? "destructive" : "secondary"}>
                      {category.items.length}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-500 mb-3">{category.description}</p>
                  
                  {category.items.length > 0 ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => openCleanupDialog(
                        category.id, 
                        category.items, 
                        category.title,
                        category.description
                      )}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Limpar
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2 text-green-600 text-sm">
                      <CheckCircle2 className="w-4 h-4" />
                      Tudo limpo
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ações Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={() => {
                const allObsolete = Object.entries(obsoleteData)
                  .flatMap(([type, items]) => items.map(i => ({ ...i, _type: type })));
                if (allObsolete.length === 0) {
                  toast.info("Não há dados obsoletos para limpar");
                  return;
                }
                if (confirm(`Tem certeza que deseja remover todos os ${allObsolete.length} registos obsoletos?`)) {
                  toast.info("Esta operação pode demorar alguns minutos...");
                }
              }}
              disabled={totalObsolete === 0}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Limpar Tudo ({totalObsolete})
            </Button>
            
            <Button
              variant="outline"
              onClick={() => {
                queryClient.invalidateQueries();
                toast.success("Cache limpo com sucesso");
              }}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Limpar Cache
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Cleanup Dialog */}
      <Dialog open={!!cleanupDialog} onOpenChange={(o) => !o && setCleanupDialog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-600" />
              {cleanupDialog?.title}
            </DialogTitle>
            <DialogDescription>{cleanupDialog?.description}</DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto py-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-slate-500">
                {selectedItems.length} de {cleanupDialog?.items?.length || 0} selecionados
              </span>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedItems(cleanupDialog.items.map(i => i.id))}
                >
                  Selecionar Todos
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedItems([])}
                >
                  Limpar Seleção
                </Button>
              </div>
            </div>
            
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {cleanupDialog?.items?.map((item) => (
                <div 
                  key={item.id}
                  className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg"
                >
                  <Checkbox
                    checked={selectedItems.includes(item.id)}
                    onCheckedChange={(checked) => {
                      setSelectedItems(prev => 
                        checked 
                          ? [...prev, item.id]
                          : prev.filter(id => id !== item.id)
                      );
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {item.title || item.buyer_name || item.document_name || item.message?.slice(0, 50) || item.id}
                    </p>
                    <p className="text-xs text-slate-500">
                      {item.city && `${item.city} • `}
                      {item.created_date && format(new Date(item.created_date), 'dd/MM/yyyy')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCleanupDialog(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleCleanup}
              disabled={selectedItems.length === 0 || isProcessing}
            >
              {isProcessing ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />A processar...</>
              ) : (
                <><Trash2 className="w-4 h-4 mr-2" />Remover {selectedItems.length}</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}