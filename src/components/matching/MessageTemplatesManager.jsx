import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Mail, MessageCircle, Edit, Trash2, Star, Copy } from "lucide-react";
import { toast } from "sonner";

export default function MessageTemplatesManager({ 
  open, 
  onOpenChange, 
  onSelectTemplate 
}) {
  const queryClient = useQueryClient();
  const [editingTemplate, setEditingTemplate] = React.useState(null);
  const [formData, setFormData] = React.useState({
    name: "",
    type: "email",
    subject: "",
    content: "",
    is_default: false,
    category: "matching"
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['messageTemplates'],
    queryFn: () => base44.entities.MessageTemplate.list('-created_date')
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.MessageTemplate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messageTemplates'] });
      toast.success("Template criado!");
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MessageTemplate.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messageTemplates'] });
      toast.success("Template atualizado!");
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.MessageTemplate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messageTemplates'] });
      toast.success("Template eliminado");
    }
  });

  const resetForm = () => {
    setEditingTemplate(null);
    setFormData({
      name: "",
      type: "email",
      subject: "",
      content: "",
      is_default: false,
      category: "matching"
    });
  };

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      type: template.type,
      subject: template.subject || "",
      content: template.content,
      is_default: template.is_default,
      category: template.category
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const variables = ["contact_name", "property_count", "properties_list"];
    
    if (editingTemplate) {
      updateMutation.mutate({
        id: editingTemplate.id,
        data: { ...formData, variables }
      });
    } else {
      createMutation.mutate({ ...formData, variables });
    }
  };

  const defaultEmailTemplate = `Olá {contact_name},

Encontrámos {property_count} imóvel(is) que correspondem aos seus critérios:

{properties_list}

Entre em contacto para agendar visitas.

Cumprimentos,
Zugruppe`;

  const defaultWhatsAppTemplate = `Olá {contact_name}! 👋

Encontrei {property_count} imóvel(is) perfeitos para si:

{properties_list}

Quer agendar visitas? Responda aqui! 😊`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Gestão de Templates de Mensagens
          </DialogTitle>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-6 mt-4">
          {/* Form */}
          <div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Nome do Template *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Ex: Match Standard"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Tipo *</Label>
                  <Select value={formData.type} onValueChange={(v) => setFormData({...formData, type: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">
                        <Mail className="w-4 h-4 inline mr-2" />
                        Email
                      </SelectItem>
                      <SelectItem value="whatsapp">
                        <MessageCircle className="w-4 h-4 inline mr-2" />
                        WhatsApp
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Categoria</Label>
                  <Select value={formData.category} onValueChange={(v) => setFormData({...formData, category: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="matching">Matching</SelectItem>
                      <SelectItem value="follow_up">Follow-up</SelectItem>
                      <SelectItem value="viewing">Visitas</SelectItem>
                      <SelectItem value="general">Geral</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {formData.type === 'email' && (
                <div>
                  <Label>Assunto *</Label>
                  <Input
                    value={formData.subject}
                    onChange={(e) => setFormData({...formData, subject: e.target.value})}
                    placeholder="Ex: 🏠 Imóveis Selecionados Para Si"
                    required={formData.type === 'email'}
                  />
                </div>
              )}

              <div>
                <Label>Conteúdo *</Label>
                <Textarea
                  value={formData.content}
                  onChange={(e) => setFormData({...formData, content: e.target.value})}
                  placeholder={formData.type === 'email' ? defaultEmailTemplate : defaultWhatsAppTemplate}
                  rows={12}
                  className="font-mono text-sm"
                  required
                />
                <p className="text-xs text-slate-500 mt-1">
                  Variáveis disponíveis: {"{contact_name}"}, {"{property_count}"}, {"{properties_list}"}
                </p>
              </div>

              <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
                <Switch
                  id="default"
                  checked={formData.is_default}
                  onCheckedChange={(checked) => setFormData({...formData, is_default: checked})}
                />
                <Label htmlFor="default" className="cursor-pointer">
                  <Star className="w-4 h-4 inline mr-1 text-amber-600" />
                  Template padrão
                </Label>
              </div>

              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={resetForm} className="flex-1">
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1">
                  {editingTemplate ? "Atualizar" : "Criar"} Template
                </Button>
              </div>
            </form>
          </div>

          {/* Templates List */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-slate-900">
                Templates Guardados ({templates.length})
              </h4>
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
              {templates.map(template => (
                <Card key={template.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h5 className="font-semibold text-slate-900">{template.name}</h5>
                          {template.is_default && (
                            <Badge className="bg-amber-100 text-amber-800 border-amber-300">
                              <Star className="w-3 h-3 mr-1 fill-amber-500" />
                              Padrão
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="text-xs">
                            {template.type === 'email' ? (
                              <><Mail className="w-3 h-3 mr-1" /> Email</>
                            ) : (
                              <><MessageCircle className="w-3 h-3 mr-1" /> WhatsApp</>
                            )}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {template.category}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-600 line-clamp-2">{template.content}</p>
                      </div>
                      <div className="flex flex-col gap-1 ml-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (onSelectTemplate) {
                              onSelectTemplate(template);
                              onOpenChange(false);
                            }
                          }}
                          className="h-7 w-7 p-0 text-green-600 hover:bg-green-50"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(template)}
                          className="h-7 w-7 p-0"
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteMutation.mutate(template.id)}
                          className="h-7 w-7 p-0 text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {templates.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  <Mail className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                  <p className="text-sm">Nenhum template criado</p>
                  <p className="text-xs mt-1">Crie o primeiro template</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}