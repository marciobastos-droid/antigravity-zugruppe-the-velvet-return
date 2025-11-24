import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, UserPlus, Shield, User } from "lucide-react";
import { toast } from "sonner";

export default function DocumentPermissionsDialog({ document, open, onOpenChange }) {
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = React.useState("");

  const contract = document?.contract;
  const currentPermissions = contract?.access_permissions || [];

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
    enabled: open,
  });

  const updatePermissionsMutation = useMutation({
    mutationFn: (newPermissions) => 
      base44.entities.Contract.update(contract.id, { access_permissions: newPermissions }),
    onSuccess: () => {
      toast.success("Permissões atualizadas");
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      setSelectedUser("");
    },
  });

  const handleAddUser = () => {
    if (!selectedUser) return;
    if (currentPermissions.includes(selectedUser)) {
      toast.error("Utilizador já tem acesso");
      return;
    }
    const newPermissions = [...currentPermissions, selectedUser];
    updatePermissionsMutation.mutate(newPermissions);
  };

  const handleRemoveUser = (email) => {
    const newPermissions = currentPermissions.filter(e => e !== email);
    updatePermissionsMutation.mutate(newPermissions);
  };

  // Filter users who are not already in the permissions list and are not the creator/agent
  const availableUsers = users.filter(u => 
    !currentPermissions.includes(u.email) && 
    u.email !== contract?.created_by &&
    u.email !== contract?.assigned_agent
  );

  if (!document || !contract) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Permissões de Acesso</DialogTitle>
          <DialogDescription>
            Gerir quem pode ver o contrato "{contract.property_title}" e seus documentos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Add User Section */}
          <div className="flex gap-2">
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Selecionar utilizador..." />
              </SelectTrigger>
              <SelectContent>
                {availableUsers.map((u) => (
                  <SelectItem key={u.id} value={u.email}>
                    {u.full_name || u.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleAddUser} disabled={!selectedUser || updatePermissionsMutation.isPending}>
              <UserPlus className="w-4 h-4" />
            </Button>
          </div>

          {/* Current Permissions List */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-slate-900">Com Acesso</h4>
            
            <div className="space-y-2">
              {/* Always has access: Creator and Agent */}
              {contract.created_by && (
                <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-amber-500" />
                    <span className="text-sm">{users.find(u => u.email === contract.created_by)?.full_name || contract.created_by}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">Criador</Badge>
                </div>
              )}
              
              {contract.assigned_agent && contract.assigned_agent !== contract.created_by && (
                <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-blue-500" />
                    <span className="text-sm">{users.find(u => u.email === contract.assigned_agent)?.full_name || contract.assigned_agent}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">Agente</Badge>
                </div>
              )}

              {/* Explicit Permissions */}
              {currentPermissions.map((email) => (
                <div key={email} className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-400" />
                    <span className="text-sm">{users.find(u => u.email === email)?.full_name || email}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveUser(email)}
                    className="h-6 w-6 p-0 text-slate-400 hover:text-red-600"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              
              {currentPermissions.length === 0 && !contract.created_by && !contract.assigned_agent && (
                <p className="text-sm text-slate-500 italic">Nenhum utilizador com acesso explícito.</p>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}