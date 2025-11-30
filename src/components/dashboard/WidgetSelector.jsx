import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  BarChart3, PieChart, LineChart, Users, Building2, Target, 
  Bell, Sparkles, TrendingUp, Activity, FileText, Calendar
} from "lucide-react";

const AVAILABLE_WIDGETS = [
  { id: 'metrics', name: 'Métricas Principais', icon: BarChart3, category: 'Essencial', default: true },
  { id: 'activity', name: 'Atividade Diária', icon: LineChart, category: 'Gráficos', default: true },
  { id: 'propertyStatus', name: 'Estado dos Imóveis', icon: PieChart, category: 'Gráficos', default: true },
  { id: 'leadStatus', name: 'Estado dos Leads', icon: BarChart3, category: 'Gráficos', default: true },
  { id: 'propertyTypes', name: 'Tipos de Imóveis', icon: Building2, category: 'Gráficos', default: false },
  { id: 'teamPerformance', name: 'Desempenho da Equipa', icon: Users, category: 'Equipa', default: true },
  { id: 'agentChart', name: 'Gráfico por Agente', icon: BarChart3, category: 'Equipa', default: false },
  { id: 'notifications', name: 'Notificações', icon: Bell, category: 'Alertas', default: true },
  { id: 'aiSuggestions', name: 'Sugestões IA', icon: Sparkles, category: 'Alertas', default: true },
  { id: 'importQuality', name: 'Qualidade de Importação', icon: TrendingUp, category: 'Estatísticas', default: false },
  { id: 'salesStats', name: 'Estatísticas de Vendas', icon: Target, category: 'Estatísticas', default: true },
  { id: 'pipelineStats', name: 'Pipeline de Leads', icon: Activity, category: 'Estatísticas', default: true },
];

export default function WidgetSelector({ 
  open, 
  onOpenChange, 
  activeWidgets = [], 
  onWidgetsChange 
}) {
  const [selectedWidgets, setSelectedWidgets] = React.useState(activeWidgets);

  React.useEffect(() => {
    setSelectedWidgets(activeWidgets);
  }, [activeWidgets]);

  const toggleWidget = (widgetId) => {
    setSelectedWidgets(prev => 
      prev.includes(widgetId) 
        ? prev.filter(id => id !== widgetId)
        : [...prev, widgetId]
    );
  };

  const handleSave = () => {
    onWidgetsChange(selectedWidgets);
    onOpenChange(false);
  };

  const handleReset = () => {
    const defaults = AVAILABLE_WIDGETS.filter(w => w.default).map(w => w.id);
    setSelectedWidgets(defaults);
  };

  const categories = [...new Set(AVAILABLE_WIDGETS.map(w => w.category))];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Personalizar Dashboard</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {categories.map(category => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">{category}</h3>
              <div className="space-y-2">
                {AVAILABLE_WIDGETS.filter(w => w.category === category).map(widget => {
                  const Icon = widget.icon;
                  const isActive = selectedWidgets.includes(widget.id);
                  
                  return (
                    <div 
                      key={widget.id}
                      className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                        isActive ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                        <Label htmlFor={widget.id} className="cursor-pointer">
                          {widget.name}
                        </Label>
                      </div>
                      <Switch
                        id={widget.id}
                        checked={isActive}
                        onCheckedChange={() => toggleWidget(widget.id)}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 mt-6 pt-4 border-t">
          <Button variant="outline" onClick={handleReset} className="flex-1">
            Repor Padrão
          </Button>
          <Button onClick={handleSave} className="flex-1">
            Guardar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { AVAILABLE_WIDGETS };