import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Mail } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function TemplateSelector({ 
  category = "all", 
  onSelectTemplate, 
  selectedTemplateId,
  showPreview = true 
}) {
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [previewTemplate, setPreviewTemplate] = React.useState(null);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['emailTemplates', category],
    queryFn: async () => {
      const all = await base44.entities.EmailTemplate.filter({ is_active: true });
      if (category === "all") return all;
      return all.filter(t => t.category === category);
    }
  });

  const handlePreview = (template) => {
    setPreviewTemplate(template);
    setPreviewOpen(true);
  };

  const getPreviewHtml = (template) => {
    let html = template?.body || "";
    // Replace with sample data
    html = html.replace(/\{\{nome_completo\}\}/g, "João Silva");
    html = html.replace(/\{\{primeiro_nome\}\}/g, "João");
    html = html.replace(/\{\{email\}\}/g, "joao@exemplo.com");
    html = html.replace(/\{\{telefone\}\}/g, "+351 912 345 678");
    html = html.replace(/\{\{cidade\}\}/g, "Lisboa");
    html = html.replace(/\{\{data_atual\}\}/g, new Date().toLocaleDateString('pt-PT'));
    html = html.replace(/\{\{agente_nome\}\}/g, "Maria Santos");
    html = html.replace(/\n/g, '<br>');
    return html;
  };

  if (isLoading) {
    return <div className="h-10 bg-slate-100 animate-pulse rounded" />;
  }

  return (
    <>
      <div className="flex gap-2">
        <Select 
          value={selectedTemplateId || ""} 
          onValueChange={onSelectTemplate}
        >
          <SelectTrigger className="flex-1">
            <Mail className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Selecionar template de email..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={null}>Nenhum (email personalizado)</SelectItem>
            {templates.map(template => (
              <SelectItem key={template.id} value={template.id}>
                <div className="flex items-center gap-2">
                  <span>{template.name}</span>
                  {template.category && (
                    <Badge variant="outline" className="text-xs">
                      {template.category}
                    </Badge>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {showPreview && selectedTemplateId && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => {
              const template = templates.find(t => t.id === selectedTemplateId);
              if (template) handlePreview(template);
            }}
          >
            <Eye className="w-4 h-4" />
          </Button>
        )}
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Pré-visualização: {previewTemplate?.name}</DialogTitle>
          </DialogHeader>
          {previewTemplate && (
            <div className="mt-4 space-y-4">
              <div className="p-3 bg-slate-100 rounded-lg">
                <p className="text-sm text-slate-600">Assunto:</p>
                <p className="font-medium">
                  {previewTemplate.subject
                    ?.replace(/\{\{nome_completo\}\}/g, "João Silva")
                    ?.replace(/\{\{primeiro_nome\}\}/g, "João")}
                </p>
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
    </>
  );
}