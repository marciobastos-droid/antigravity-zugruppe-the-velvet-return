import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Lock, Plus, X, Mail, Shield, User } from "lucide-react";
import { toast } from "sonner";

export default function PermissionsManager({ document, contract, open, onOpenChange }) {
  const queryClient = useQueryClient();
  const [newUserEmail, setNewUserEmail] = useState("");
  const [permissions, setPermissions] = useState([]);

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  useEffect(() => {
    if (contract) {
      setPermissions(contract.access_permissions || []);
    }
  }, [contract]);

  const updatePermissionsMutation = useMutation({
    mutationFn: (newPermissions) => 
      base44.entities.Contract.update(contract.id, { access_permissions: newPermissions }),
    onSuccess: () => {
      toast.success("Permissões atualizadas");
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
    },
  });

  const addUser = () => {
    const email = newUserEmail.trim().toLowerCase();
    
    if (!email) {
      toast.error("Introduza um email válido");
      return;
    }

    if (permissions.includes(email)) {
      toast.error("Utilizador já tem acesso");
      return;
    }

    const userExists = users.some(u => u.email === email);
    if (!userExists) {
      toast.error("Utilizador não encontrado");
      return;
    }

    const newPermissions = [...permissions, email];
    setPermissions(newPermissions);
    updatePermissionsMutation.mutate(newPermissions);
    setNewUserEmail("");
  };

  const removeUser = (email) => {
    const newPermissions = permissions.filter(e => e !== email);
    setPermissions(newPermissions);
    updatePermissionsMutation.mutate(newPermissions);
  };

  if (!contract) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Gerir Permissões de Acesso
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-blue-900 mb-1">Documento: {document?.name}</h4>
                <p className="text-sm text-blue-700">Contrato: {contract.property_title}</p>
              </div>
            </div>
          </div>

          {/* Default Access */}
          <div>
            <h3 className="font-semibold text-slate-900 mb-3">Acesso Automático</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-600" />
                  <span className="text-sm font-medium">{contract.created_by}</span>
                  <Badge variant="outline" className="text-xs">Criador</Badge>
                </div>
                <Badge className="bg-green-100 text-green-800 text-xs">Acesso Total</Badge>
              </div>
              {contract.assigned_agent && (
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-600" />
                    <span className="text-sm font-medium">{contract.assigned_agent}</span>
                    <Badge variant="outline" className="text-xs">Agente Responsável</Badge>
                  </div>
                  <Badge className="bg-green-100 text-green-800 text-xs">Acesso Total</Badge>
                </div>
              )}
            </div>
          </div>

          {/* Additional Users */}
          <div>
            <h3 className="font-semibold text-slate-900 mb-3">Utilizadores Adicionais</h3>
            
            <div className="flex gap-2 mb-4">
              <div className="flex-1">
                <Input
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="Email do utilizador..."
                  onKeyPress={(e) => e.key === 'Enter' && addUser()}
                />
              </div>
              <Button onClick={addUser}>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar
              </Button>
            </div>

            {permissions.length > 0 ? (
              <div className="space-y-2">
                {permissions.map((email) => (
                  <div key={email} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-slate-600" />
                      <span className="text-sm font-medium">{email}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeUser(email)}
                      className="text-red-600 hover:bg-red-50"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-lg">
                <p className="text-slate-600">Nenhum utilizador adicional com acesso</p>
              </div>
            )}
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-sm text-amber-900">
              <strong>ℹ️ Nota:</strong> Administradores e gestores têm acesso a todos os documentos automaticamente.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}