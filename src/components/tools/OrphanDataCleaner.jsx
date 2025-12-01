import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Trash2, Search, AlertTriangle, CheckCircle2, User, Building2, 
  Target, MessageSquare, Users, RefreshCw, Sparkles, FileText
} from "lucide-react";
import { toast } from "sonner";

export default function OrphanDataCleaner() {
  const [scanning, setScanning] = useState(false);
  const [orphanData, setOrphanData] = useState(null);
  const [selectedItems, setSelectedItems] = useState({});
  const [cleaning, setCleaning] = useState(false);
  const queryClient = useQueryClient();

  // Fetch all users
  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list()
  });

  const validEmails = new Set(users.map(u => u.email));

  // Scan for orphan data
  const scanForOrphans = async () => {
    setScanning(true);
    setOrphanData(null);
    setSelectedItems({});

    try {
      const [opportunities, contacts, properties, communications, sentMatches, appointments] = await Promise.all([
        base44.entities.Opportunity.list(),
        base44.entities.ClientContact.list(),
        base44.entities.Property.list(),
        base44.entities.CommunicationLog.list(),
        base44.entities.SentMatch.list(),
        base44.entities.Appointment.list()
      ]);

      const orphans = {
        opportunities: [],
        contacts: [],
        properties: [],
        communications: [],
        sentMatches: [],
        appointments: []
      };

      // Check opportunities
      opportunities.forEach(opp => {
        const orphanFields = [];
        if (opp.assigned_to && !validEmails.has(opp.assigned_to)) {
          orphanFields.push({ field: 'assigned_to', value: opp.assigned_to });
        }
        if (opp.seller_email && !validEmails.has(opp.seller_email)) {
          orphanFields.push({ field: 'seller_email', value: opp.seller_email });
        }
        if (opp.created_by && !validEmails.has(opp.created_by)) {
          orphanFields.push({ field: 'created_by', value: opp.created_by });
        }
        if (orphanFields.length > 0) {
          orphans.opportunities.push({
            id: opp.id,
            name: opp.buyer_name || opp.ref_id || 'Sem nome',
            orphanFields
          });
        }
      });

      // Check contacts
      contacts.forEach(contact => {
        const orphanFields = [];
        if (contact.assigned_agent && !validEmails.has(contact.assigned_agent)) {
          orphanFields.push({ field: 'assigned_agent', value: contact.assigned_agent });
        }
        if (contact.created_by && !validEmails.has(contact.created_by)) {
          orphanFields.push({ field: 'created_by', value: contact.created_by });
        }
        if (orphanFields.length > 0) {
          orphans.contacts.push({
            id: contact.id,
            name: contact.full_name || contact.email || 'Sem nome',
            orphanFields
          });
        }
      });

      // Check properties
      properties.forEach(prop => {
        const orphanFields = [];
        if (prop.assigned_consultant && !validEmails.has(prop.assigned_consultant)) {
          orphanFields.push({ field: 'assigned_consultant', value: prop.assigned_consultant });
        }
        if (prop.agent_id && !validEmails.has(prop.agent_id)) {
          orphanFields.push({ field: 'agent_id', value: prop.agent_id });
        }
        if (prop.created_by && !validEmails.has(prop.created_by)) {
          orphanFields.push({ field: 'created_by', value: prop.created_by });
        }
        if (orphanFields.length > 0) {
          orphans.properties.push({
            id: prop.id,
            name: prop.title || prop.ref_id || 'Sem título',
            orphanFields
          });
        }
      });

      // Check communications
      communications.forEach(comm => {
        const orphanFields = [];
        if (comm.agent_email && !validEmails.has(comm.agent_email)) {
          orphanFields.push({ field: 'agent_email', value: comm.agent_email });
        }
        if (comm.created_by && !validEmails.has(comm.created_by)) {
          orphanFields.push({ field: 'created_by', value: comm.created_by });
        }
        if (orphanFields.length > 0) {
          orphans.communications.push({
            id: comm.id,
            name: comm.subject || comm.contact_name || 'Comunicação',
            orphanFields
          });
        }
      });

      // Check sent matches
      sentMatches.forEach(match => {
        const orphanFields = [];
        if (match.sent_by && !validEmails.has(match.sent_by)) {
          orphanFields.push({ field: 'sent_by', value: match.sent_by });
        }
        if (match.created_by && !validEmails.has(match.created_by)) {
          orphanFields.push({ field: 'created_by', value: match.created_by });
        }
        if (orphanFields.length > 0) {
          orphans.sentMatches.push({
            id: match.id,
            name: match.property_title || 'Match',
            orphanFields
          });
        }
      });

      // Check appointments
      appointments.forEach(apt => {
        const orphanFields = [];
        if (apt.assigned_agent && !validEmails.has(apt.assigned_agent)) {
          orphanFields.push({ field: 'assigned_agent', value: apt.assigned_agent });
        }
        if (apt.created_by && !validEmails.has(apt.created_by)) {
          orphanFields.push({ field: 'created_by', value: apt.created_by });
        }
        if (orphanFields.length > 0) {
          orphans.appointments.push({
            id: apt.id,
            name: apt.title || 'Visita',
            orphanFields
          });
        }
      });

      setOrphanData(orphans);
      
      const totalOrphans = Object.values(orphans).reduce((sum, arr) => sum + arr.length, 0);
      if (totalOrphans === 0) {
        toast.success("Nenhum dado órfão encontrado!");
      } else {
        toast.info(`Encontrados ${totalOrphans} registos com referências a utilizadores apagados`);
      }
    } catch (error) {
      console.error(error);
      toast.error("Erro ao analisar dados");
    }

    setScanning(false);
  };

  // Toggle selection
  const toggleSelection = (entityType, id) => {
    setSelectedItems(prev => ({
      ...prev,
      [`${entityType}_${id}`]: !prev[`${entityType}_${id}`]
    }));
  };

  // Select all in category
  const selectAllInCategory = (entityType, items) => {
    const newSelected = { ...selectedItems };
    const allSelected = items.every(item => selectedItems[`${entityType}_${item.id}`]);
    items.forEach(item => {
      newSelected[`${entityType}_${item.id}`] = !allSelected;
    });
    setSelectedItems(newSelected);
  };

  // Clean selected orphan references
  const cleanSelected = async () => {
    setCleaning(true);
    let cleaned = 0;

    try {
      // Group by entity type
      const toClean = {
        Opportunity: [],
        ClientContact: [],
        Property: [],
        CommunicationLog: [],
        SentMatch: [],
        Appointment: []
      };

      Object.entries(selectedItems).forEach(([key, selected]) => {
        if (!selected) return;
        const [entityType, id] = key.split('_');
        const entityMap = {
          opportunities: 'Opportunity',
          contacts: 'ClientContact',
          properties: 'Property',
          communications: 'CommunicationLog',
          sentMatches: 'SentMatch',
          appointments: 'Appointment'
        };
        const entity = entityMap[entityType];
        if (entity) {
          const item = orphanData[entityType]?.find(i => i.id === id);
          if (item) {
            toClean[entity].push(item);
          }
        }
      });

      // Clean each entity type
      for (const [entity, items] of Object.entries(toClean)) {
        for (const item of items) {
          const updateData = {};
          item.orphanFields.forEach(f => {
            updateData[f.field] = null;
          });
          
          await base44.entities[entity].update(item.id, updateData);
          cleaned++;
        }
      }

      toast.success(`${cleaned} referências órfãs limpas com sucesso!`);
      
      // Refresh data
      queryClient.invalidateQueries();
      setSelectedItems({});
      scanForOrphans();

    } catch (error) {
      console.error(error);
      toast.error("Erro ao limpar dados órfãos");
    }

    setCleaning(false);
  };

  const totalOrphans = orphanData 
    ? Object.values(orphanData).reduce((sum, arr) => sum + arr.length, 0)
    : 0;

  const selectedCount = Object.values(selectedItems).filter(Boolean).length;

  const entityConfig = {
    opportunities: { icon: Target, label: 'Oportunidades', color: 'text-purple-600' },
    contacts: { icon: Users, label: 'Contactos', color: 'text-blue-600' },
    properties: { icon: Building2, label: 'Imóveis', color: 'text-green-600' },
    communications: { icon: MessageSquare, label: 'Comunicações', color: 'text-amber-600' },
    sentMatches: { icon: Sparkles, label: 'Matches Enviados', color: 'text-pink-600' },
    appointments: { icon: FileText, label: 'Visitas', color: 'text-indigo-600' }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trash2 className="w-5 h-5 text-red-600" />
          Limpar Dados Órfãos
        </CardTitle>
        <p className="text-sm text-slate-600">
          Identifica e limpa referências a utilizadores que já não existem no sistema
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <Button 
            onClick={scanForOrphans} 
            disabled={scanning}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {scanning ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Search className="w-4 h-4 mr-2" />
            )}
            {scanning ? 'A analisar...' : 'Analisar Dados'}
          </Button>

          {selectedCount > 0 && (
            <Button 
              onClick={cleanSelected}
              disabled={cleaning}
              variant="destructive"
            >
              {cleaning ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Limpar {selectedCount} selecionado(s)
            </Button>
          )}
        </div>

        {/* Results */}
        {orphanData && (
          <>
            {totalOrphans === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-slate-900 mb-2">Tudo Limpo!</h3>
                <p className="text-slate-600">Não foram encontradas referências a utilizadores apagados.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  <span className="text-amber-800">
                    Encontrados <strong>{totalOrphans}</strong> registos com referências a utilizadores apagados
                  </span>
                </div>

                {Object.entries(orphanData).map(([entityType, items]) => {
                  if (items.length === 0) return null;
                  const config = entityConfig[entityType];
                  const Icon = config.icon;
                  const allSelected = items.every(item => selectedItems[`${entityType}_${item.id}`]);

                  return (
                    <Card key={entityType} className="border-slate-200">
                      <CardHeader className="py-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Icon className={`w-5 h-5 ${config.color}`} />
                            <span className="font-semibold">{config.label}</span>
                            <Badge variant="outline">{items.length}</Badge>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => selectAllInCategory(entityType, items)}
                          >
                            {allSelected ? 'Desmarcar Todos' : 'Selecionar Todos'}
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <ScrollArea className="max-h-60">
                          <div className="space-y-2">
                            {items.map(item => (
                              <div 
                                key={item.id}
                                className="flex items-start gap-3 p-2 bg-slate-50 rounded-lg hover:bg-slate-100"
                              >
                                <Checkbox
                                  checked={selectedItems[`${entityType}_${item.id}`] || false}
                                  onCheckedChange={() => toggleSelection(entityType, item.id)}
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-slate-900 truncate">{item.name}</p>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {item.orphanFields.map((field, idx) => (
                                      <Badge 
                                        key={idx} 
                                        variant="outline" 
                                        className="text-xs bg-red-50 text-red-700 border-red-200"
                                      >
                                        <User className="w-3 h-3 mr-1" />
                                        {field.field}: {field.value}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        )}

        {!orphanData && !scanning && (
          <div className="text-center py-8 text-slate-500">
            <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Clique em "Analisar Dados" para identificar referências órfãs</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}