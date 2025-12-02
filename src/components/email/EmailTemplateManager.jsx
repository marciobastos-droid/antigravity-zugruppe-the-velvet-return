import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, Edit, Trash2, Copy, Mail, FileText, Eye, 
  Code, User, Building2, Euro, MapPin, Phone, Calendar
} from "lucide-react";
import { toast } from "sonner";

const DYNAMIC_FIELDS = {
  client: [
    { key: "{{nome_completo}}", label: "Nome Completo", icon: User },
    { key: "{{primeiro_nome}}", label: "Primeiro Nome", icon: User },
    { key: "{{email}}", label: "Email", icon: Mail },
    { key: "{{telefone}}", label: "Telefone", icon: Phone },
    { key: "{{cidade}}", label: "Cidade", icon: MapPin },
    { key: "{{empresa}}", label: "Empresa", icon: Building2 },
  ],
  opportunity: [
    { key: "{{nome_completo}}", label: "Nome Completo", icon: User },
    { key: "{{primeiro_nome}}", label: "Primeiro Nome", icon: User },
    { key: "{{email}}", label: "Email", icon: Mail },
    { key: "{{telefone}}", label: "Telefone", icon: Phone },
    { key: "{{imovel}}", label: "Imóvel", icon: Building2 },
    { key: "{{orcamento}}", label: "Orçamento", icon: Euro },
    { key: "{{localizacao}}", label: "Localização", icon: MapPin },
  ],
  general: [
    { key: "{{data_atual}}", label: "Data Atual", icon: Calendar },
    { key: "{{agente_nome}}", label: "Nome Agente", icon: User },
    { key: "{{agente_email}}", label: "Email Agente", icon: Mail },
    { key: "{{agente_telefone}}", label: "Tel. Agente", icon: Phone },
  ]
};

// Templates pré-definidos profissionais
const DEFAULT_TEMPLATES = [
  {
    name: "Boas-vindas Novo Cliente",
    category: "client",
    subject: "Bem-vindo à Zugruppe, {{primeiro_nome}}!",
    body: `Olá {{nome_completo}},

É com muito prazer que o recebemos na Zugruppe!

O meu nome é {{agente_nome}} e serei o seu consultor dedicado. Estou aqui para ajudá-lo a encontrar o imóvel perfeito para as suas necessidades.

Nos próximos dias entrarei em contacto para conhecer melhor as suas preferências e apresentar-lhe as melhores opções disponíveis no mercado.

Entretanto, se tiver alguma questão, não hesite em contactar-me:
📧 {{agente_email}}
📱 {{agente_telefone}}

Com os melhores cumprimentos,
{{agente_nome}}
Consultor Imobiliário | Zugruppe`
  },
  {
    name: "Apresentação de Imóvel",
    category: "opportunity",
    subject: "{{primeiro_nome}}, temos o imóvel ideal para si!",
    body: `Olá {{nome_completo}},

Espero que esteja bem!

Tenho excelentes notícias - encontrei um imóvel que corresponde exatamente aos critérios que me indicou:

🏠 {{imovel}}
📍 {{localizacao}}
💰 {{orcamento}}

Este imóvel destaca-se pela sua localização privilegiada e excelente relação qualidade-preço.

Gostaria de agendar uma visita para que possa conhecer pessoalmente este espaço? Tenho disponibilidade nos próximos dias.

Aguardo o seu feedback!

Com os melhores cumprimentos,
{{agente_nome}}
📱 {{agente_telefone}}`
  },
  {
    name: "Follow-up Após Visita",
    category: "opportunity",
    subject: "{{primeiro_nome}}, como correu a visita?",
    body: `Olá {{nome_completo}},

Foi um prazer acompanhá-lo na visita ao imóvel {{imovel}}.

Gostaria de saber as suas impressões e se tem alguma questão adicional sobre o imóvel ou o processo de aquisição.

Caso este imóvel não seja exatamente o que procura, tenho outras opções interessantes que posso apresentar-lhe.

Fico a aguardar o seu feedback para podermos avançar da melhor forma.

Com os melhores cumprimentos,
{{agente_nome}}
{{agente_email}} | {{agente_telefone}}`
  },
  {
    name: "Agradecimento Reunião",
    category: "general",
    subject: "Obrigado pela reunião, {{primeiro_nome}}!",
    body: `Olá {{nome_completo}},

Agradeço a sua disponibilidade para a nossa reunião de hoje, {{data_atual}}.

Foi muito útil compreender melhor as suas necessidades e objetivos. Irei trabalhar para lhe apresentar as melhores soluções.

Qualquer dúvida, estou inteiramente ao seu dispor.

Com os melhores cumprimentos,
{{agente_nome}}
Zugruppe`
  },
  {
    name: "Lembrete de Visita",
    category: "opportunity",
    subject: "Lembrete: Visita agendada - {{imovel}}",
    body: `Olá {{nome_completo}},

Este é um lembrete amigável da visita que temos agendada:

🏠 Imóvel: {{imovel}}
📍 Localização: {{localizacao}}

Por favor confirme a sua presença respondendo a este email.

Se precisar reagendar, contacte-me através do {{agente_telefone}}.

Até breve!

{{agente_nome}}`
  }
];

const categoryLabels = {
  client: "Clientes",
  opportunity: "Oportunidades",
  property: "Imóveis",
  general: "Geral"
};

export default function EmailTemplateManager() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState("all");
  
  const [formData, setFormData] = useState({
    name: "",
    subject: "",
    body: "",
    category: "general",
    is_active: true
  });

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['emailTemplates'],
    queryFn: () => base44.entities.EmailTemplate.list('-created_date')
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.EmailTemplate.create(data),
    onSuccess: () => {
      toast.success("Template criado");
      queryClient.invalidateQueries({ queryKey: ['emailTemplates'] });
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.EmailTemplate.update(id, data),
    onSuccess: () => {
      toast.success("Template atualizado");
      queryClient.invalidateQueries({ queryKey: ['emailTemplates'] });
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.EmailTemplate.delete(id),
    onSuccess: () => {
      toast.success("Template eliminado");
      queryClient.invalidateQueries({ queryKey: ['emailTemplates'] });
    }
  });

  const resetForm = () => {
    setFormData({ name: "", subject: "", body: "", category: "general", is_active: true });
    setEditingTemplate(null);
    setDialogOpen(false);
  };

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      subject: template.subject,
      body: template.body,
      category: template.category || "general",
      is_active: template.is_active !== false
    });
    setDialogOpen(true);
  };

  const handleDuplicate = (template) => {
    setFormData({
      name: `${template.name} (Cópia)`,
      subject: template.subject,
      body: template.body,
      category: template.category || "general",
      is_active: true
    });
    setEditingTemplate(null);
    setDialogOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingTemplate) {
      updateMutation.mutate({ id: editingTemplate.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const insertField = (field) => {
    setFormData(prev => ({
      ...prev,
      body: prev.body + field
    }));
  };

  const filteredTemplates = templates.filter(t => 
    categoryFilter === "all" || t.category === categoryFilter
  );

  const getPreviewHtml = (template) => {
    let html = template.body || "";
    // Replace fields with sample data
    html = html.replace(/\{\{nome_completo\}\}/g, "João Silva");
    html = html.replace(/\{\{nome\}\}/g, "João Silva"); // backwards compatibility
    html = html.replace(/\{\{email\}\}/g, "joao@exemplo.com");
    html = html.replace(/\{\{telefone\}\}/g, "+351 912 345 678");
    html = html.replace(/\{\{cidade\}\}/g, "Lisboa");
    html = html.replace(/\{\{empresa\}\}/g, "Empresa ABC");
    html = html.replace(/\{\{imovel\}\}/g, "Apartamento T3 em Lisboa");
    html = html.replace(/\{\{orcamento\}\}/g, "€350.000");
    html = html.replace(/\{\{localizacao\}\}/g, "Lisboa");
    html = html.replace(/\{\{data_atual\}\}/g, new Date().toLocaleDateString('pt-PT'));
    html = html.replace(/\{\{agente_nome\}\}/g, "Maria Santos");
    html = html.replace(/\{\{agente_email\}\}/g, "maria@zugruppe.com");
    html = html.replace(/\{\{agente_telefone\}\}/g, "+351 910 000 000");
    return html;
  };

  if (isLoading) {
    return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Templates de Email</h3>
          <p className="text-sm text-slate-600">{templates.length} templates disponíveis</p>
        </div>
        <div className="flex gap-2">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="client">Clientes</SelectItem>
              <SelectItem value="opportunity">Oportunidades</SelectItem>
              <SelectItem value="property">Imóveis</SelectItem>
              <SelectItem value="general">Geral</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setDialogOpen(open); }}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Novo Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingTemplate ? "Editar Template" : "Novo Template"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Nome do Template *</Label>
                    <Input
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="Ex: Boas-vindas Novo Cliente"
                    />
                  </div>
                  <div>
                    <Label>Categoria</Label>
                    <Select value={formData.category} onValueChange={(v) => setFormData({...formData, category: v})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="client">Clientes</SelectItem>
                        <SelectItem value="opportunity">Oportunidades</SelectItem>
                        <SelectItem value="property">Imóveis</SelectItem>
                        <SelectItem value="general">Geral</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Assunto *</Label>
                  <Input
                    required
                    value={formData.subject}
                    onChange={(e) => setFormData({...formData, subject: e.target.value})}
                    placeholder="Ex: Olá {{nome_completo}}, bem-vindo à Zugruppe!"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <Label>Corpo do Email *</Label>
                    <div className="flex gap-1">
                      <Badge variant="outline" className="text-xs">Suporta HTML</Badge>
                    </div>
                  </div>
                  
                  {/* Dynamic Fields */}
                  <div className="mb-2 p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-600 mb-2">Campos Dinâmicos (clique para inserir):</p>
                    <Tabs defaultValue="client" className="w-full">
                      <TabsList className="h-8">
                        <TabsTrigger value="client" className="text-xs">Contacto</TabsTrigger>
                        <TabsTrigger value="opportunity" className="text-xs">Oportunidade</TabsTrigger>
                        <TabsTrigger value="general" className="text-xs">Geral</TabsTrigger>
                      </TabsList>
                      {Object.entries(DYNAMIC_FIELDS).map(([key, fields]) => (
                        <TabsContent key={key} value={key} className="mt-2">
                          <div className="flex flex-wrap gap-1">
                            {fields.map((field) => (
                              <Button
                                key={field.key}
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => insertField(field.key)}
                              >
                                <field.icon className="w-3 h-3 mr-1" />
                                {field.label}
                              </Button>
                            ))}
                          </div>
                        </TabsContent>
                      ))}
                    </Tabs>
                  </div>

                  <Textarea
                    required
                    value={formData.body}
                    onChange={(e) => setFormData({...formData, body: e.target.value})}
                    placeholder="Olá {{nome_completo}},&#10;&#10;Obrigado pelo seu interesse...&#10;&#10;Com os melhores cumprimentos,&#10;{{agente_nome}}"
                    rows={12}
                    className="font-mono text-sm"
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={resetForm} className="flex-1">
                    Cancelar
                  </Button>
                  <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700">
                    {editingTemplate ? "Atualizar" : "Criar Template"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {filteredTemplates.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="font-semibold text-slate-900 mb-2">Nenhum template encontrado</h3>
            <p className="text-slate-600">Crie o primeiro template para começar</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template) => (
            <Card key={template.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base truncate">{template.name}</CardTitle>
                    <p className="text-xs text-slate-500 mt-1 truncate">{template.subject}</p>
                  </div>
                  <Badge variant={template.is_active ? "default" : "secondary"} className="ml-2 text-xs">
                    {template.is_active ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="outline" className="text-xs">
                    {categoryLabels[template.category] || "Geral"}
                  </Badge>
                  {template.usage_count > 0 && (
                    <span className="text-xs text-slate-500">
                      Usado {template.usage_count}x
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-600 line-clamp-2 mb-4">
                  {template.body?.replace(/<[^>]*>/g, '').substring(0, 100)}...
                </p>
                <div className="flex gap-1">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0"
                    onClick={() => { setPreviewTemplate(template); setPreviewOpen(true); }}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleEdit(template)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleDuplicate(template)}>
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                    onClick={() => {
                      if (window.confirm(`Eliminar template "${template.name}"?`)) {
                        deleteMutation.mutate(template.id);
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Pré-visualização: {previewTemplate?.name}</DialogTitle>
          </DialogHeader>
          {previewTemplate && (
            <div className="mt-4 space-y-4">
              <div className="p-3 bg-slate-100 rounded-lg">
                <p className="text-sm text-slate-600">Assunto:</p>
                <p className="font-medium">{previewTemplate.subject?.replace(/\{\{nome_completo\}\}/g, "João Silva").replace(/\{\{nome\}\}/g, "João Silva")}</p>
              </div>
              <div className="border rounded-lg p-4 bg-white min-h-[200px]">
                <div 
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: getPreviewHtml(previewTemplate) }}
                />
              </div>
              <p className="text-xs text-slate-500 italic">
                * Os campos dinâmicos foram substituídos por dados de exemplo
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}