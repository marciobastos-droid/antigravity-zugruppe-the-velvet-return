import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Save, Database, Download, Upload, Trash2, Clock,
  CheckCircle, XCircle, Loader2, HardDrive, Calendar,
  AlertTriangle, RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import moment from "moment";

export default function BackupManager() {
  const queryClient = useQueryClient();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState(null);
  const [backupNotes, setBackupNotes] = useState("");
  const [restoreMode, setRestoreMode] = useState("merge");
  const [selectedEntities, setSelectedEntities] = useState([
    'ClientContact',
    'Opportunity',
    'Property',
    'BuyerProfile',
    'Contract',
    'LeaseAgreement',
    'Appointment'
  ]);

  const entities = [
    { id: 'ClientContact', label: 'Contactos de Clientes', icon: '👤' },
    { id: 'Opportunity', label: 'Oportunidades', icon: '💼' },
    { id: 'Property', label: 'Imóveis', icon: '🏠' },
    { id: 'BuyerProfile', label: 'Perfis de Compradores', icon: '🎯' },
    { id: 'Contract', label: 'Contratos', icon: '📄' },
    { id: 'LeaseAgreement', label: 'Arrendamentos', icon: '📋' },
    { id: 'Appointment', label: 'Agendamentos', icon: '📅' }
  ];

  const { data: backups = [], isLoading, refetch } = useQuery({
    queryKey: ['dataBackups'],
    queryFn: () => base44.entities.DataBackup.list('-created_date')
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const result = await base44.functions.invoke('createBackup', {
        entities: selectedEntities,
        backupType: 'manual',
        notes: backupNotes
      });
      return result.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['dataBackups'] });
      setCreateDialogOpen(false);
      setBackupNotes("");
      
      const successCount = data.backups.filter(b => !b.error).length;
      toast.success(`Backup criado! ${successCount} entidades guardadas.`);
    },
    onError: (error) => {
      toast.error(`Erro ao criar backup: ${error.message}`);
    }
  });

  const restoreMutation = useMutation({
    mutationFn: async (backupId) => {
      const result = await base44.functions.invoke('restoreBackup', {
        backupId,
        restoreMode
      });
      return result.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries();
      setRestoreDialogOpen(false);
      setSelectedBackup(null);
      toast.success(`Restauro concluído! ${data.restored} registos restaurados.`);
    },
    onError: (error) => {
      toast.error(`Erro ao restaurar: ${error.message}`);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.DataBackup.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dataBackups'] });
      toast.success("Backup eliminado");
    }
  });

  const toggleEntity = (entityId) => {
    setSelectedEntities(prev =>
      prev.includes(entityId) 
        ? prev.filter(e => e !== entityId)
        : [...prev, entityId]
    );
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Group backups by entity
  const backupsByEntity = backups.reduce((acc, backup) => {
    if (!acc[backup.entity_name]) {
      acc[backup.entity_name] = [];
    }
    acc[backup.entity_name].push(backup);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-green-300 bg-gradient-to-r from-green-50 to-emerald-50">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="w-6 h-6 text-green-600" />
              <span>Gestor de Backups</span>
            </div>
            <Button onClick={() => setCreateDialogOpen(true)} className="bg-green-600 hover:bg-green-700">
              <Save className="w-4 h-4 mr-2" />
              Criar Backup Manual
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="bg-blue-50 border-blue-200">
            <AlertTriangle className="w-4 h-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <strong>Proteção de Dados:</strong> Os backups são criados automaticamente. 
              São mantidos os últimos 30 backups. Use restauro com cuidado.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Database className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Total de Backups</p>
                <p className="text-2xl font-bold text-slate-900">{backups.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <HardDrive className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Espaço Utilizado</p>
                <p className="text-2xl font-bold text-slate-900">
                  {formatBytes(backups.reduce((sum, b) => sum + (b.backup_size_bytes || 0), 0))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Último Backup</p>
                <p className="text-sm font-semibold text-slate-900">
                  {backups.length > 0 ? moment(backups[0].created_date).fromNow() : 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Backups List by Entity */}
      {isLoading ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-green-500" />
            <p className="text-slate-600">A carregar backups...</p>
          </CardContent>
        </Card>
      ) : Object.keys(backupsByEntity).length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Database className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <h3 className="font-semibold text-slate-900 mb-1">Nenhum backup encontrado</h3>
            <p className="text-sm text-slate-600 mb-4">Crie o primeiro backup manual</p>
            <Button onClick={() => setCreateDialogOpen(true)} className="bg-green-600 hover:bg-green-700">
              <Save className="w-4 h-4 mr-2" />
              Criar Agora
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(backupsByEntity).map(([entityName, entityBackups]) => {
            const entityInfo = entities.find(e => e.id === entityName);
            return (
              <Card key={entityName}>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span className="text-2xl">{entityInfo?.icon || '📦'}</span>
                    {entityInfo?.label || entityName}
                    <Badge variant="outline" className="ml-2">{entityBackups.length} backups</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {entityBackups.slice(0, 5).map((backup) => (
                      <div key={backup.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={
                              backup.backup_type === 'automatic' ? 'bg-blue-100 text-blue-800' :
                              backup.backup_type === 'manual' ? 'bg-green-100 text-green-800' :
                              'bg-purple-100 text-purple-800'
                            }>
                              {backup.backup_type === 'automatic' ? 'Automático' :
                               backup.backup_type === 'manual' ? 'Manual' : 'Agendado'}
                            </Badge>
                            <span className="text-sm text-slate-600">
                              {moment(backup.created_date).format('DD/MM/YYYY HH:mm')}
                            </span>
                            <span className="text-xs text-slate-500">
                              ({moment(backup.created_date).fromNow()})
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-slate-600">
                            <span className="flex items-center gap-1">
                              <Database className="w-3 h-3" />
                              {backup.records_count} registos
                            </span>
                            <span className="flex items-center gap-1">
                              <HardDrive className="w-3 h-3" />
                              {formatBytes(backup.backup_size_bytes)}
                            </span>
                          </div>
                          {backup.notes && (
                            <p className="text-xs text-slate-500 mt-1 italic">📝 {backup.notes}</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedBackup(backup);
                              setRestoreDialogOpen(true);
                            }}
                            className="text-blue-600 hover:bg-blue-50"
                          >
                            <Upload className="w-4 h-4 mr-1" />
                            Restaurar
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteMutation.mutate(backup.id)}
                            disabled={deleteMutation.isPending}
                            className="text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {entityBackups.length > 5 && (
                      <p className="text-sm text-slate-500 text-center pt-2">
                        + {entityBackups.length - 5} backups mais antigos
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Backup Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Save className="w-5 h-5 text-green-600" />
              Criar Backup Manual
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Alert className="bg-yellow-50 border-yellow-200">
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800 text-sm">
                O backup irá guardar todos os registos das entidades selecionadas. 
                Isto pode demorar alguns segundos.
              </AlertDescription>
            </Alert>

            <div>
              <Label className="mb-3 block">Selecione as entidades para backup:</Label>
              <div className="grid grid-cols-2 gap-2">
                {entities.map((entity) => (
                  <div key={entity.id} className="flex items-center space-x-2 p-2 border rounded hover:bg-slate-50">
                    <Checkbox
                      id={entity.id}
                      checked={selectedEntities.includes(entity.id)}
                      onCheckedChange={() => toggleEntity(entity.id)}
                    />
                    <label htmlFor={entity.id} className="text-sm cursor-pointer flex items-center gap-2 flex-1">
                      <span>{entity.icon}</span>
                      {entity.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label>Notas (opcional)</Label>
              <Textarea
                value={backupNotes}
                onChange={(e) => setBackupNotes(e.target.value)}
                placeholder="Ex: Backup antes de importação em massa..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending || selectedEntities.length === 0}
              className="bg-green-600 hover:bg-green-700"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  A criar backup...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Criar Backup
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore Dialog */}
      <Dialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-blue-600" />
              Restaurar Backup
            </DialogTitle>
          </DialogHeader>

          {selectedBackup && (
            <div className="space-y-4">
              <Alert className="bg-red-50 border-red-200">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <AlertDescription className="text-red-800 text-sm">
                  <strong>Atenção:</strong> Restaurar dados pode sobrescrever registos existentes. 
                  Esta ação não pode ser desfeita.
                </AlertDescription>
              </Alert>

              <div className="p-3 bg-slate-50 rounded-lg border">
                <p className="text-sm font-semibold text-slate-900 mb-2">Detalhes do Backup:</p>
                <div className="space-y-1 text-sm text-slate-600">
                  <p><strong>Entidade:</strong> {selectedBackup.entity_name}</p>
                  <p><strong>Registos:</strong> {selectedBackup.records_count}</p>
                  <p><strong>Data:</strong> {moment(selectedBackup.created_date).format('DD/MM/YYYY HH:mm')}</p>
                  <p><strong>Tamanho:</strong> {formatBytes(selectedBackup.backup_size_bytes)}</p>
                </div>
              </div>

              <div>
                <Label>Modo de Restauro</Label>
                <Select value={restoreMode} onValueChange={setRestoreMode}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="merge">
                      Fundir (manter existentes, adicionar em falta)
                    </SelectItem>
                    <SelectItem value="replace">
                      Substituir (apagar e recriar)
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500 mt-1">
                  {restoreMode === 'merge' 
                    ? 'Restaura apenas registos que não existem atualmente'
                    : 'ATENÇÃO: Remove todos os registos existentes e recria do backup'}
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setRestoreDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={() => restoreMutation.mutate(selectedBackup.id)}
              disabled={restoreMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {restoreMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  A restaurar...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Confirmar Restauro
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}