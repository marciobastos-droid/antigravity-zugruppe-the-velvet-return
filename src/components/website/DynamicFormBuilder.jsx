import React from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FileText, Plus, Trash2, GripVertical, Sparkles, Eye, Code } from "lucide-react";
import { toast } from "sonner";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

export default function DynamicFormBuilder() {
  const [formName, setFormName] = React.useState("");
  const [fields, setFields] = React.useState([]);
  const [previewMode, setPreviewMode] = React.useState(false);
  const [formSubmissions, setFormSubmissions] = React.useState({});

  const addField = (type) => {
    const newField = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      label: `Novo ${type === 'text' ? 'Campo' : type === 'email' ? 'Email' : type === 'phone' ? 'Telefone' : type === 'select' ? 'Seleção' : 'Campo'}`,
      name: `field_${fields.length + 1}`,
      required: false,
      placeholder: "",
      options: type === 'select' ? ["Opção 1", "Opção 2"] : undefined,
      conditional_on: null,
      conditional_value: null
    };
    setFields([...fields, newField]);
  };

  const removeField = (id) => {
    setFields(fields.filter(f => f.id !== id));
  };

  const updateField = (id, updates) => {
    setFields(fields.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(fields);
    const [reordered] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reordered);

    setFields(items);
  };

  const generateCode = () => {
    const code = `// Formulário: ${formName}
const [formData, setFormData] = React.useState({
${fields.map(f => `  ${f.name}: ""`).join(',\n')}
});

const handleSubmit = async (e) => {
  e.preventDefault();
  await base44.entities.Opportunity.create({
    buyer_name: formData.name,
    buyer_email: formData.email,
    buyer_phone: formData.phone,
    message: formData.message,
    lead_source: "landing_page",
    status: "new"
  });
  toast.success("Formulário enviado!");
};

return (
  <form onSubmit={handleSubmit} className="space-y-4">
${fields.map(f => {
  if (f.type === 'text' || f.type === 'email' || f.type === 'phone') {
    return `    <div>
      <Label>${f.label}${f.required ? ' *' : ''}</Label>
      <Input
        type="${f.type}"
        ${f.required ? 'required' : ''}
        value={formData.${f.name}}
        onChange={(e) => setFormData({...formData, ${f.name}: e.target.value})}
        placeholder="${f.placeholder}"
      />
    </div>`;
  } else if (f.type === 'textarea') {
    return `    <div>
      <Label>${f.label}${f.required ? ' *' : ''}</Label>
      <Textarea
        ${f.required ? 'required' : ''}
        value={formData.${f.name}}
        onChange={(e) => setFormData({...formData, ${f.name}: e.target.value})}
        placeholder="${f.placeholder}"
        rows={3}
      />
    </div>`;
  } else if (f.type === 'select') {
    return `    <div>
      <Label>${f.label}${f.required ? ' *' : ''}</Label>
      <Select value={formData.${f.name}} onValueChange={(v) => setFormData({...formData, ${f.name}: v})}>
        <SelectTrigger>
          <SelectValue placeholder="${f.placeholder}" />
        </SelectTrigger>
        <SelectContent>
${f.options?.map(opt => `          <SelectItem value="${opt}">${opt}</SelectItem>`).join('\n')}
        </SelectContent>
      </Select>
    </div>`;
  }
  return '';
}).join('\n')}
    <Button type="submit" className="w-full">Enviar</Button>
  </form>
);`;

    navigator.clipboard.writeText(code);
    toast.success("Código copiado!");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Construtor de Formulários Dinâmicos
              </CardTitle>
              <p className="text-sm text-slate-600 mt-1">Crie formulários que se adaptam ao utilizador</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setPreviewMode(!previewMode)} size="sm">
                <Eye className="w-4 h-4 mr-2" />
                {previewMode ? 'Editar' : 'Pré-visualizar'}
              </Button>
              {fields.length > 0 && (
                <Button variant="outline" onClick={generateCode} size="sm">
                  <Code className="w-4 h-4 mr-2" />
                  Copiar Código
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!previewMode ? (
            <>
              <div className="mb-6">
                <Label>Nome do Formulário</Label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Formulário de Contacto de Campanha"
                  className="max-w-md"
                />
              </div>

              <div className="flex gap-2 mb-6 flex-wrap">
                <Button onClick={() => addField('text')} variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Texto
                </Button>
                <Button onClick={() => addField('email')} variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Email
                </Button>
                <Button onClick={() => addField('phone')} variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Telefone
                </Button>
                <Button onClick={() => addField('textarea')} variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Texto Longo
                </Button>
                <Button onClick={() => addField('select')} variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Seleção
                </Button>
              </div>

              {fields.length === 0 ? (
                <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-lg">
                  <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">Adicione campos ao formulário</p>
                </div>
              ) : (
                <DragDropContext onDragEnd={onDragEnd}>
                  <Droppable droppableId="form-fields">
                    {(provided) => (
                      <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                        {fields.map((field, index) => (
                          <Draggable key={field.id} draggableId={field.id} index={index}>
                            {(provided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className="bg-slate-50 border border-slate-200 rounded-lg p-4"
                              >
                                <div className="flex items-start gap-3">
                                  <div {...provided.dragHandleProps} className="pt-2">
                                    <GripVertical className="w-5 h-5 text-slate-400 cursor-grab active:cursor-grabbing" />
                                  </div>
                                  <div className="flex-1 grid md:grid-cols-2 gap-4">
                                    <div>
                                      <Label className="text-xs">Label</Label>
                                      <Input
                                        value={field.label}
                                        onChange={(e) => updateField(field.id, { label: e.target.value })}
                                        size="sm"
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-xs">Nome (variável)</Label>
                                      <Input
                                        value={field.name}
                                        onChange={(e) => updateField(field.id, { name: e.target.value })}
                                        size="sm"
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-xs">Placeholder</Label>
                                      <Input
                                        value={field.placeholder}
                                        onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
                                        size="sm"
                                      />
                                    </div>
                                    <div className="flex items-center gap-4">
                                      <label className="flex items-center gap-2 text-sm">
                                        <input
                                          type="checkbox"
                                          checked={field.required}
                                          onChange={(e) => updateField(field.id, { required: e.target.checked })}
                                          className="rounded"
                                        />
                                        Obrigatório
                                      </label>
                                      <Badge variant="outline">{field.type}</Badge>
                                    </div>
                                    {field.type === 'select' && (
                                      <div className="md:col-span-2">
                                        <Label className="text-xs">Opções (uma por linha)</Label>
                                        <Textarea
                                          value={field.options?.join('\n')}
                                          onChange={(e) => updateField(field.id, { options: e.target.value.split('\n').filter(Boolean) })}
                                          rows={3}
                                          size="sm"
                                        />
                                      </div>
                                    )}
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeField(field.id)}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              )}
            </>
          ) : (
            <div className="max-w-md mx-auto">
              <h3 className="text-lg font-bold text-slate-900 mb-4">{formName || "Pré-visualização"}</h3>
              <form className="space-y-4">
                {fields.map(field => {
                  const shouldShow = !field.conditional_on || 
                    formSubmissions[field.conditional_on] === field.conditional_value;

                  if (!shouldShow) return null;

                  return (
                    <div key={field.id}>
                      <Label>
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </Label>
                      {field.type === 'textarea' ? (
                        <Textarea
                          placeholder={field.placeholder}
                          value={formSubmissions[field.name] || ''}
                          onChange={(e) => setFormSubmissions({...formSubmissions, [field.name]: e.target.value})}
                          rows={3}
                        />
                      ) : field.type === 'select' ? (
                        <Select 
                          value={formSubmissions[field.name] || ''} 
                          onValueChange={(v) => setFormSubmissions({...formSubmissions, [field.name]: v})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={field.placeholder} />
                          </SelectTrigger>
                          <SelectContent>
                            {field.options?.map(opt => (
                              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          type={field.type}
                          placeholder={field.placeholder}
                          value={formSubmissions[field.name] || ''}
                          onChange={(e) => setFormSubmissions({...formSubmissions, [field.name]: e.target.value})}
                        />
                      )}
                    </div>
                  );
                })}
                <Button type="button" className="w-full" disabled>
                  Enviar (Pré-visualização)
                </Button>
              </form>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}