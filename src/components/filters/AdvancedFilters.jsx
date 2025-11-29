import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Filter, Save, Trash2, ChevronDown, ChevronUp, X, 
  Calendar, Search, Star, Plus, Check, Settings2
} from "lucide-react";
import { toast } from "sonner";

// Tipos de filtros suportados
export const FILTER_TYPES = {
  text: "text",
  select: "select",
  multiSelect: "multiSelect",
  dateRange: "dateRange",
  numberRange: "numberRange",
  boolean: "boolean"
};

// Componente para filtro de intervalo de datas
function DateRangeFilter({ label, value, onChange }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium text-slate-600">{label}</Label>
      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            type="date"
            value={value?.from || ""}
            onChange={(e) => onChange({ ...value, from: e.target.value })}
            className="text-sm"
            placeholder="De"
          />
        </div>
        <div className="flex-1">
          <Input
            type="date"
            value={value?.to || ""}
            onChange={(e) => onChange({ ...value, to: e.target.value })}
            className="text-sm"
            placeholder="Até"
          />
        </div>
      </div>
    </div>
  );
}

// Componente para filtro de intervalo numérico
function NumberRangeFilter({ label, value, onChange, prefix = "", suffix = "" }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium text-slate-600">{label}</Label>
      <div className="flex gap-2 items-center">
        <div className="flex-1 relative">
          {prefix && <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-sm">{prefix}</span>}
          <Input
            type="number"
            value={value?.min || ""}
            onChange={(e) => onChange({ ...value, min: e.target.value ? Number(e.target.value) : null })}
            className={`text-sm ${prefix ? "pl-6" : ""}`}
            placeholder="Min"
          />
        </div>
        <span className="text-slate-400">-</span>
        <div className="flex-1 relative">
          {prefix && <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-sm">{prefix}</span>}
          <Input
            type="number"
            value={value?.max || ""}
            onChange={(e) => onChange({ ...value, max: e.target.value ? Number(e.target.value) : null })}
            className={`text-sm ${prefix ? "pl-6" : ""}`}
            placeholder="Max"
          />
        </div>
      </div>
    </div>
  );
}

// Componente de seleção múltipla
function MultiSelectFilter({ label, value = [], onChange, options }) {
  const [open, setOpen] = React.useState(false);
  
  const toggleOption = (optionValue) => {
    const newValue = value.includes(optionValue)
      ? value.filter(v => v !== optionValue)
      : [...value, optionValue];
    onChange(newValue);
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium text-slate-600">{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full justify-between text-sm h-9">
            {value.length === 0 
              ? "Selecionar..." 
              : `${value.length} selecionado${value.length > 1 ? 's' : ''}`}
            <ChevronDown className="w-4 h-4 ml-2 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2" align="start">
          <div className="max-h-48 overflow-y-auto space-y-1">
            {options.map((option) => (
              <div
                key={option.value}
                onClick={() => toggleOption(option.value)}
                className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-slate-100 ${
                  value.includes(option.value) ? "bg-blue-50" : ""
                }`}
              >
                <div className={`w-4 h-4 border rounded flex items-center justify-center ${
                  value.includes(option.value) ? "bg-blue-600 border-blue-600" : "border-slate-300"
                }`}>
                  {value.includes(option.value) && <Check className="w-3 h-3 text-white" />}
                </div>
                <span className="text-sm">{option.label}</span>
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

// Componente principal de filtros avançados
export default function AdvancedFilters({
  filterConfig,
  filters,
  onFiltersChange,
  savedFiltersKey,
  totalCount,
  filteredCount,
  showSavedFilters = true,
  showLogicToggle = true,
  className = ""
}) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = React.useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = React.useState(false);
  const [filterName, setFilterName] = React.useState("");
  const [filterLogic, setFilterLogic] = React.useState("AND");

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const savedFilters = user?.saved_filters?.[savedFiltersKey] || [];

  const saveFilterMutation = useMutation({
    mutationFn: async (filterData) => {
      const currentSavedFilters = user?.saved_filters || {};
      const entityFilters = currentSavedFilters[savedFiltersKey] || [];
      
      const newFilter = {
        id: Date.now().toString(),
        name: filterData.name,
        filters: filterData.filters,
        logic: filterData.logic,
        created_date: new Date().toISOString()
      };

      await base44.auth.updateMe({
        saved_filters: {
          ...currentSavedFilters,
          [savedFiltersKey]: [...entityFilters, newFilter]
        }
      });

      return newFilter;
    },
    onSuccess: () => {
      toast.success("Filtro guardado!");
      queryClient.invalidateQueries({ queryKey: ['user'] });
      setSaveDialogOpen(false);
      setFilterName("");
    }
  });

  const deleteFilterMutation = useMutation({
    mutationFn: async (filterId) => {
      const currentSavedFilters = user?.saved_filters || {};
      const entityFilters = currentSavedFilters[savedFiltersKey] || [];

      await base44.auth.updateMe({
        saved_filters: {
          ...currentSavedFilters,
          [savedFiltersKey]: entityFilters.filter(f => f.id !== filterId)
        }
      });
    },
    onSuccess: () => {
      toast.success("Filtro eliminado");
      queryClient.invalidateQueries({ queryKey: ['user'] });
    }
  });

  const applyFilter = (savedFilter) => {
    onFiltersChange(savedFilter.filters);
    if (savedFilter.logic) {
      setFilterLogic(savedFilter.logic);
    }
    toast.success(`Filtro "${savedFilter.name}" aplicado`);
  };

  const clearAllFilters = () => {
    const clearedFilters = {};
    Object.keys(filterConfig).forEach(key => {
      clearedFilters[key] = filterConfig[key].type === "multiSelect" ? [] : 
                            filterConfig[key].type === "dateRange" ? {} :
                            filterConfig[key].type === "numberRange" ? {} :
                            filterConfig[key].type === "boolean" ? null :
                            "";
    });
    onFiltersChange(clearedFilters);
  };

  const hasActiveFilters = Object.entries(filters).some(([key, value]) => {
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object' && value !== null) {
      return Object.values(value).some(v => v !== null && v !== "" && v !== undefined);
    }
    return value !== "" && value !== "all" && value !== null && value !== undefined;
  });

  const activeFilterCount = Object.entries(filters).filter(([key, value]) => {
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object' && value !== null) {
      return Object.values(value).some(v => v !== null && v !== "" && v !== undefined);
    }
    return value !== "" && value !== "all" && value !== null && value !== undefined;
  }).length;

  const handleSaveFilter = () => {
    if (!filterName.trim()) {
      toast.error("Introduza um nome para o filtro");
      return;
    }
    saveFilterMutation.mutate({
      name: filterName,
      filters: filters,
      logic: filterLogic
    });
  };

  const renderFilter = (key, config) => {
    switch (config.type) {
      case FILTER_TYPES.text:
        return (
          <div key={key} className="space-y-2">
            <Label className="text-xs font-medium text-slate-600">{config.label}</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={filters[key] || ""}
                onChange={(e) => onFiltersChange({ ...filters, [key]: e.target.value })}
                placeholder={config.placeholder || "Pesquisar..."}
                className="pl-8 text-sm h-9"
              />
            </div>
          </div>
        );

      case FILTER_TYPES.select:
        return (
          <div key={key} className="space-y-2">
            <Label className="text-xs font-medium text-slate-600">{config.label}</Label>
            <Select
              value={filters[key] || "all"}
              onValueChange={(v) => onFiltersChange({ ...filters, [key]: v })}
            >
              <SelectTrigger className="text-sm h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{config.allLabel || "Todos"}</SelectItem>
                {config.options.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case FILTER_TYPES.multiSelect:
        return (
          <MultiSelectFilter
            key={key}
            label={config.label}
            value={filters[key] || []}
            onChange={(v) => onFiltersChange({ ...filters, [key]: v })}
            options={config.options}
          />
        );

      case FILTER_TYPES.dateRange:
        return (
          <DateRangeFilter
            key={key}
            label={config.label}
            value={filters[key] || {}}
            onChange={(v) => onFiltersChange({ ...filters, [key]: v })}
          />
        );

      case FILTER_TYPES.numberRange:
        return (
          <NumberRangeFilter
            key={key}
            label={config.label}
            value={filters[key] || {}}
            onChange={(v) => onFiltersChange({ ...filters, [key]: v })}
            prefix={config.prefix}
            suffix={config.suffix}
          />
        );

      case FILTER_TYPES.boolean:
        return (
          <div key={key} className="space-y-2">
            <Label className="text-xs font-medium text-slate-600">{config.label}</Label>
            <Select
              value={filters[key] === true ? "true" : filters[key] === false ? "false" : "all"}
              onValueChange={(v) => onFiltersChange({ 
                ...filters, 
                [key]: v === "true" ? true : v === "false" ? false : null 
              })}
            >
              <SelectTrigger className="text-sm h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="true">{config.trueLabel || "Sim"}</SelectItem>
                <SelectItem value="false">{config.falseLabel || "Não"}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );

      default:
        return null;
    }
  };

  const basicFilters = Object.entries(filterConfig).filter(([_, config]) => !config.advanced);
  const advancedFilters = Object.entries(filterConfig).filter(([_, config]) => config.advanced);

  return (
    <Card className={className}>
      <CardContent className="p-4">
        {showSavedFilters && savedFilters.length > 0 && (
          <div className="mb-4 pb-4 border-b">
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-medium text-slate-600">Filtros Guardados</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {savedFilters.map((sf) => (
                <div key={sf.id} className="flex items-center">
                  <Badge
                    variant="outline"
                    className="cursor-pointer hover:bg-slate-100 pr-1"
                    onClick={() => applyFilter(sf)}
                  >
                    {sf.name}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteFilterMutation.mutate(sf.id);
                      }}
                      className="ml-1 p-0.5 hover:bg-red-100 rounded"
                    >
                      <X className="w-3 h-3 text-slate-400 hover:text-red-600" />
                    </button>
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {basicFilters.map(([key, config]) => renderFilter(key, config))}
        </div>

        {advancedFilters.length > 0 && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="mt-3 text-slate-600"
            >
              {expanded ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
              {expanded ? "Menos Filtros" : "Mais Filtros"}
              {activeFilterCount > basicFilters.length && !expanded && (
                <Badge className="ml-2 h-5 min-w-5" variant="secondary">
                  +{activeFilterCount - basicFilters.filter(([k]) => {
                    const v = filters[k];
                    if (Array.isArray(v)) return v.length > 0;
                    if (typeof v === 'object' && v !== null) {
                      return Object.values(v).some(val => val !== null && val !== "" && val !== undefined);
                    }
                    return v !== "" && v !== "all" && v !== null && v !== undefined;
                  }).length}
                </Badge>
              )}
            </Button>

            {expanded && (
              <div className="mt-4 pt-4 border-t">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {advancedFilters.map(([key, config]) => renderFilter(key, config))}
                </div>

                {showLogicToggle && (
                  <div className="mt-4 pt-4 border-t flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Settings2 className="w-4 h-4 text-slate-500" />
                      <span className="text-sm text-slate-600">Combinar filtros:</span>
                    </div>
                    <div className="flex border rounded-lg overflow-hidden">
                      <Button
                        variant={filterLogic === "AND" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setFilterLogic("AND")}
                        className="rounded-none text-xs"
                      >
                        E (todos)
                      </Button>
                      <Button
                        variant={filterLogic === "OR" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setFilterLogic("OR")}
                        className="rounded-none text-xs"
                      >
                        OU (qualquer)
                      </Button>
                    </div>
                    <span className="text-xs text-slate-500">
                      {filterLogic === "AND" 
                        ? "Mostra itens que correspondem a TODOS os filtros" 
                        : "Mostra itens que correspondem a QUALQUER filtro"}
                    </span>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        <div className="flex items-center justify-between mt-4 pt-4 border-t">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">
              {filteredCount !== undefined && totalCount !== undefined ? (
                <>
                  <strong>{filteredCount}</strong> de <strong>{totalCount}</strong> resultados
                </>
              ) : null}
            </span>
            {hasActiveFilters && (
              <Badge variant="secondary" className="text-xs">
                {activeFilterCount} filtro{activeFilterCount > 1 ? 's' : ''} ativo{activeFilterCount > 1 ? 's' : ''}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <>
                <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                  <X className="w-4 h-4 mr-1" />
                  Limpar
                </Button>
                
                {showSavedFilters && (
                  <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Save className="w-4 h-4 mr-1" />
                        Guardar Filtro
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-sm">
                      <DialogHeader>
                        <DialogTitle>Guardar Filtro</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 mt-4">
                        <div>
                          <Label>Nome do Filtro</Label>
                          <Input
                            value={filterName}
                            onChange={(e) => setFilterName(e.target.value)}
                            placeholder="Ex: Apartamentos Lisboa"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" onClick={() => setSaveDialogOpen(false)} className="flex-1">
                            Cancelar
                          </Button>
                          <Button 
                            onClick={handleSaveFilter} 
                            disabled={saveFilterMutation.isPending}
                            className="flex-1"
                          >
                            {saveFilterMutation.isPending ? "A guardar..." : "Guardar"}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}