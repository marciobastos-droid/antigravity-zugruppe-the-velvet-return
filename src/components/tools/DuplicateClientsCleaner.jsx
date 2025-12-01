import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Trash2, Search, AlertTriangle, CheckCircle2, Users, 
  RefreshCw, Mail, Phone, Calendar
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function DuplicateClientsCleaner() {
  const [scanning, setScanning] = useState(false);
  const [duplicates, setDuplicates] = useState(null);
  const [selectedItems, setSelectedItems] = useState({});
  const [cleaning, setCleaning] = useState(false);
  const queryClient = useQueryClient();

  // Fetch all contacts
  const { data: contacts = [] } = useQuery({
    queryKey: ['clientContacts'],
    queryFn: () => base44.entities.ClientContact.list()
  });

  // Scan for duplicates
  const scanForDuplicates = async () => {
    setScanning(true);
    setDuplicates(null);
    setSelectedItems({});

    try {
      // Group by email
      const byEmail = {};
      const byPhone = {};
      const byName = {};

      contacts.forEach(contact => {
        // By email
        if (contact.email) {
          const emailKey = contact.email.toLowerCase().trim();
          if (!byEmail[emailKey]) byEmail[emailKey] = [];
          byEmail[emailKey].push(contact);
        }

        // By phone
        if (contact.phone) {
          const phoneKey = contact.phone.replace(/\D/g, '');
          if (phoneKey.length >= 9) {
            if (!byPhone[phoneKey]) byPhone[phoneKey] = [];
            byPhone[phoneKey].push(contact);
          }
        }

        // By full name (exact match)
        if (contact.full_name) {
          const nameKey = contact.full_name.toLowerCase().trim();
          if (!byName[nameKey]) byName[nameKey] = [];
          byName[nameKey].push(contact);
        }
      });

      // Find duplicates
      const duplicateGroups = [];
      const processedIds = new Set();

      // Email duplicates (highest priority)
      Object.entries(byEmail).forEach(([email, group]) => {
        if (group.length > 1) {
          const ids = group.map(c => c.id);
          if (!ids.some(id => processedIds.has(id))) {
            duplicateGroups.push({
              type: 'email',
              key: email,
              contacts: group.sort((a, b) => new Date(a.created_date) - new Date(b.created_date))
            });
            ids.forEach(id => processedIds.add(id));
          }
        }
      });

      // Phone duplicates
      Object.entries(byPhone).forEach(([phone, group]) => {
        if (group.length > 1) {
          const unprocessed = group.filter(c => !processedIds.has(c.id));
          if (unprocessed.length > 1) {
            duplicateGroups.push({
              type: 'phone',
              key: phone,
              contacts: unprocessed.sort((a, b) => new Date(a.created_date) - new Date(b.created_date))
            });
            unprocessed.forEach(c => processedIds.add(c.id));
          }
        }
      });

      // Name duplicates (only if not already found by email/phone)
      Object.entries(byName).forEach(([name, group]) => {
        if (group.length > 1) {
          const unprocessed = group.filter(c => !processedIds.has(c.id));
          if (unprocessed.length > 1) {
            duplicateGroups.push({
              type: 'name',
              key: name,
              contacts: unprocessed.sort((a, b) => new Date(a.created_date) - new Date(b.created_date))
            });
            unprocessed.forEach(c => processedIds.add(c.id));
          }
        }
      });

      setDuplicates(duplicateGroups);

      if (duplicateGroups.length === 0) {
        toast.success("Nenhum cliente duplicado encontrado!");
      } else {
        const totalDuplicates = duplicateGroups.reduce((sum, g) => sum + g.contacts.length - 1, 0);
        toast.info(`Encontrados ${duplicateGroups.length} grupos com ${totalDuplicates} duplicados`);
      }
    } catch (error) {
      console.error(error);
      toast.error("Erro ao analisar clientes");
    }

    setScanning(false);
  };

  // Toggle selection
  const toggleSelection = (contactId) => {
    setSelectedItems(prev => ({
      ...prev,
      [contactId]: !prev[contactId]
    }));
  };

  // Select all duplicates in a group (except the first/original)
  const selectDuplicatesInGroup = (group) => {
    const newSelected = { ...selectedItems };
    // Skip the first one (original), select all others
    group.contacts.slice(1).forEach(contact => {
      newSelected[contact.id] = true;
    });
    setSelectedItems(newSelected);
  };

  // Select all duplicates (keep first of each group)
  const selectAllDuplicates = () => {
    const newSelected = {};
    duplicates.forEach(group => {
      group.contacts.slice(1).forEach(contact => {
        newSelected[contact.id] = true;
      });
    });
    setSelectedItems(newSelected);
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedItems({});
  };

  // Delete selected duplicates
  const deleteSelected = async () => {
    const toDelete = Object.entries(selectedItems)
      .filter(([_, selected]) => selected)
      .map(([id]) => id);

    if (toDelete.length === 0) {
      toast.error("Nenhum cliente selecionado");
      return;
    }

    if (!window.confirm(`Tem certeza que deseja eliminar ${toDelete.length} cliente(s) duplicado(s)?`)) {
      return;
    }

    setCleaning(true);
    let deleted = 0;

    try {
      for (const id of toDelete) {
        await base44.entities.ClientContact.delete(id);
        deleted++;
      }

      toast.success(`${deleted} cliente(s) duplicado(s) eliminado(s)!`);
      queryClient.invalidateQueries({ queryKey: ['clientContacts'] });
      setSelectedItems({});
      
      // Re-scan
      setTimeout(() => scanForDuplicates(), 500);

    } catch (error) {
      console.error(error);
      toast.error("Erro ao eliminar clientes");
    }

    setCleaning(false);
  };

  const selectedCount = Object.values(selectedItems).filter(Boolean).length;
  const totalDuplicates = duplicates 
    ? duplicates.reduce((sum, g) => sum + g.contacts.length - 1, 0)
    : 0;

  const typeConfig = {
    email: { icon: Mail, label: 'Email duplicado', color: 'bg-blue-100 text-blue-700' },
    phone: { icon: Phone, label: 'Telefone duplicado', color: 'bg-green-100 text-green-700' },
    name: { icon: Users, label: 'Nome duplicado', color: 'bg-amber-100 text-amber-700' }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-600" />
          Eliminar Clientes Duplicados
        </CardTitle>
        <p className="text-sm text-slate-600">
          Identifica clientes duplicados por email, telefone ou nome
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <Button 
            onClick={scanForDuplicates} 
            disabled={scanning}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {scanning ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Search className="w-4 h-4 mr-2" />
            )}
            {scanning ? 'A analisar...' : 'Analisar Clientes'}
          </Button>

          {duplicates && duplicates.length > 0 && (
            <>
              <Button 
                variant="outline"
                onClick={selectAllDuplicates}
              >
                Selecionar Todos Duplicados ({totalDuplicates})
              </Button>
              
              {selectedCount > 0 && (
                <>
                  <Button 
                    variant="outline"
                    onClick={clearSelection}
                  >
                    Limpar Seleção
                  </Button>
                  <Button 
                    onClick={deleteSelected}
                    disabled={cleaning}
                    variant="destructive"
                  >
                    {cleaning ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4 mr-2" />
                    )}
                    Eliminar {selectedCount} selecionado(s)
                  </Button>
                </>
              )}
            </>
          )}
        </div>

        {/* Results */}
        {duplicates && (
          <>
            {duplicates.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-slate-900 mb-2">Sem Duplicados!</h3>
                <p className="text-slate-600">Não foram encontrados clientes duplicados.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  <span className="text-amber-800">
                    Encontrados <strong>{duplicates.length}</strong> grupos com <strong>{totalDuplicates}</strong> clientes duplicados
                  </span>
                </div>

                <ScrollArea className="max-h-[500px]">
                  <div className="space-y-4">
                    {duplicates.map((group, groupIndex) => {
                      const config = typeConfig[group.type];
                      const Icon = config.icon;

                      return (
                        <Card key={groupIndex} className="border-slate-200">
                          <CardHeader className="py-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Badge className={config.color}>
                                  <Icon className="w-3 h-3 mr-1" />
                                  {config.label}
                                </Badge>
                                <span className="text-sm text-slate-600">
                                  {group.key}
                                </span>
                                <Badge variant="outline">
                                  {group.contacts.length} registos
                                </Badge>
                              </div>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => selectDuplicatesInGroup(group)}
                              >
                                Selecionar Duplicados
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="space-y-2">
                              {group.contacts.map((contact, idx) => (
                                <div 
                                  key={contact.id}
                                  className={`flex items-start gap-3 p-3 rounded-lg ${
                                    idx === 0 
                                      ? 'bg-green-50 border border-green-200' 
                                      : 'bg-slate-50 hover:bg-slate-100'
                                  }`}
                                >
                                  {idx === 0 ? (
                                    <Badge className="bg-green-100 text-green-700 mt-1">
                                      Original
                                    </Badge>
                                  ) : (
                                    <Checkbox
                                      checked={selectedItems[contact.id] || false}
                                      onCheckedChange={() => toggleSelection(contact.id)}
                                      className="mt-1"
                                    />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-slate-900">
                                      {contact.full_name || 'Sem nome'}
                                    </p>
                                    <div className="flex flex-wrap gap-3 text-sm text-slate-600 mt-1">
                                      {contact.email && (
                                        <span className="flex items-center gap-1">
                                          <Mail className="w-3 h-3" />
                                          {contact.email}
                                        </span>
                                      )}
                                      {contact.phone && (
                                        <span className="flex items-center gap-1">
                                          <Phone className="w-3 h-3" />
                                          {contact.phone}
                                        </span>
                                      )}
                                      <span className="flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        {format(new Date(contact.created_date), 'dd/MM/yyyy')}
                                      </span>
                                    </div>
                                    {contact.status && (
                                      <Badge variant="outline" className="mt-1 text-xs">
                                        {contact.status}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
            )}
          </>
        )}

        {!duplicates && !scanning && (
          <div className="text-center py-8 text-slate-500">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Clique em "Analisar Clientes" para identificar duplicados</p>
            <p className="text-xs mt-1">Total de contactos: {contacts.length}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}