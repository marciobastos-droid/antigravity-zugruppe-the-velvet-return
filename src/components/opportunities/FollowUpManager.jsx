import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Phone, Mail, MessageSquare, Users, Plus, Check, Clock, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const followUpIcons = {
  call: Phone,
  email: Mail,
  meeting: Users,
  whatsapp: MessageSquare,
  other: Clock
};

const followUpLabels = {
  call: "Chamada",
  email: "Email",
  meeting: "Reunião",
  whatsapp: "WhatsApp",
  other: "Outro"
};

export default function FollowUpManager({ opportunity, onUpdate }) {
  const [showForm, setShowForm] = useState(false);
  const [newFollowUp, setNewFollowUp] = useState({
    date: "",
    type: "call",
    notes: "",
    completed: false
  });

  const handleAdd = () => {
    if (!newFollowUp.date || !newFollowUp.notes) {
      return;
    }

    const updatedFollowUps = [
      ...(opportunity.follow_ups || []),
      { ...newFollowUp, date: new Date(newFollowUp.date).toISOString() }
    ];

    onUpdate({ follow_ups: updatedFollowUps });
    
    setNewFollowUp({
      date: "",
      type: "call",
      notes: "",
      completed: false
    });
    setShowForm(false);
  };

  const handleToggleComplete = (index) => {
    const updatedFollowUps = [...(opportunity.follow_ups || [])];
    updatedFollowUps[index].completed = !updatedFollowUps[index].completed;
    onUpdate({ follow_ups: updatedFollowUps });
  };

  const handleDelete = (index) => {
    const updatedFollowUps = (opportunity.follow_ups || []).filter((_, i) => i !== index);
    onUpdate({ follow_ups: updatedFollowUps });
  };

  const followUps = opportunity.follow_ups || [];
  const sortedFollowUps = [...followUps].sort((a, b) => 
    new Date(a.date) - new Date(b.date)
  );

  const upcomingFollowUps = sortedFollowUps.filter(f => 
    !f.completed && new Date(f.date) >= new Date()
  );
  const pastFollowUps = sortedFollowUps.filter(f => 
    f.completed || new Date(f.date) < new Date()
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-slate-900">Follow-ups</h4>
        <Button
          size="sm"
          onClick={() => setShowForm(!showForm)}
          variant="outline"
        >
          <Plus className="w-4 h-4 mr-2" />
          Agendar Follow-up
        </Button>
      </div>

      {showForm && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-700 mb-1 block">Data/Hora</label>
                <Input
                  type="datetime-local"
                  value={newFollowUp.date}
                  onChange={(e) => setNewFollowUp({ ...newFollowUp, date: e.target.value })}
                  className="text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 mb-1 block">Tipo</label>
                <Select
                  value={newFollowUp.type}
                  onValueChange={(value) => setNewFollowUp({ ...newFollowUp, type: value })}
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="call">Chamada</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="meeting">Reunião</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="other">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 mb-1 block">Notas</label>
              <Textarea
                value={newFollowUp.notes}
                onChange={(e) => setNewFollowUp({ ...newFollowUp, notes: e.target.value })}
                placeholder="Detalhes do follow-up..."
                rows={2}
                className="text-sm"
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAdd} className="bg-blue-600 hover:bg-blue-700">
                Adicionar
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Follow-ups */}
      {upcomingFollowUps.length > 0 && (
        <div className="space-y-2">
          <h5 className="text-sm font-medium text-slate-700">Agendados ({upcomingFollowUps.length})</h5>
          {upcomingFollowUps.map((followUp, index) => {
            const Icon = followUpIcons[followUp.type];
            const originalIndex = followUps.indexOf(followUp);
            return (
              <Card key={originalIndex} className="border-blue-200">
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          {followUpLabels[followUp.type]}
                        </Badge>
                        <span className="text-xs text-slate-600">
                          {format(new Date(followUp.date), "d MMM, HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700">{followUp.notes}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleToggleComplete(originalIndex)}
                        className="h-8 w-8 p-0"
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(originalIndex)}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Past Follow-ups */}
      {pastFollowUps.length > 0 && (
        <div className="space-y-2">
          <h5 className="text-sm font-medium text-slate-700">Histórico ({pastFollowUps.length})</h5>
          {pastFollowUps.map((followUp, index) => {
            const Icon = followUpIcons[followUp.type];
            const originalIndex = followUps.indexOf(followUp);
            return (
              <Card key={originalIndex} className="border-slate-200 bg-slate-50">
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-slate-200 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-slate-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          {followUpLabels[followUp.type]}
                        </Badge>
                        <span className="text-xs text-slate-600">
                          {format(new Date(followUp.date), "d MMM, HH:mm", { locale: ptBR })}
                        </span>
                        {followUp.completed && (
                          <Badge className="text-xs bg-green-100 text-green-800">
                            Concluído
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-600">{followUp.notes}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(originalIndex)}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {followUps.length === 0 && (
        <p className="text-sm text-slate-500 text-center py-4">
          Nenhum follow-up agendado
        </p>
      )}
    </div>
  );
}